import type { IncomingMessage, Server } from "http";
import type { Duplex } from "stream";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { Channel } from "@shared/schema";
import { verifyToken } from "./auth";
import { getAccessibleChannel } from "./access";
import { logError } from "./http-utils";
import { storage } from "./storage";

/**
 * Canale in tempo reale su /ws.
 *
 * Il token non viaggia nella URL (finirebbe nei log di proxy e server): il client apre
 * la connessione e manda come primo messaggio `{ type: "auth", token }`.
 * Le connessioni vivono in memoria, quindi il server gira su una sola istanza.
 */

const AUTH_TIMEOUT_MS = 5_000;
const HEARTBEAT_MS = 30_000;
const ACCESS_CACHE_MS = 60_000;
const MAX_PAYLOAD_BYTES = 16 * 1024;

const connections = new Map<string, Set<WebSocket>>();

function send(ws: WebSocket, type: string, payload: unknown) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
}

export function sendToUser(userId: string, type: string, payload: unknown) {
    connections.get(userId)?.forEach((ws) => send(ws, type, payload));
}

function sendToUsers(userIds: string[], type: string, payload: unknown, excludeUserId?: string) {
    for (const id of userIds) {
        if (id !== excludeUserId) sendToUser(id, type, payload);
    }
}

export async function broadcastToWorkspace(
    workspaceId: string,
    type: string,
    payload: unknown,
    excludeUserId?: string,
) {
    sendToUsers(await storage.getWorkspaceMemberIds(workspaceId), type, payload, excludeUserId);
}

/** Un canale privato arriva solo ai suoi membri, uno pubblico a tutto il workspace. */
export async function broadcastToChannel(
    channel: Channel,
    type: string,
    payload: unknown,
    excludeUserId?: string,
) {
    const recipients = channel.isPrivate
        ? await storage.getChannelMemberIds(channel.id)
        : await storage.getWorkspaceMemberIds(channel.workspaceId);
    sendToUsers(recipients, type, payload, excludeUserId);
}

async function announcePresence(userId: string, status: "online" | "offline") {
    await storage.updatePresence(userId, status);
    // Workspace letti al momento: se l'utente ne ha raggiunto uno nuovo, lo avvisa comunque.
    for (const workspace of await storage.getWorkspacesByUser(userId)) {
        await broadcastToWorkspace(workspace.id, "presence:update", { userId, status }, userId);
    }
}

type ClientMessage = { type?: unknown; token?: unknown; payload?: Record<string, unknown> };

function parseMessage(data: RawData): ClientMessage | undefined {
    try {
        const parsed = JSON.parse(data.toString());
        return typeof parsed === "object" && parsed !== null ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function onAuthenticated(ws: WebSocket, userId: string, userName: string) {
    if (!connections.has(userId)) connections.set(userId, new Set());
    const userConnections = connections.get(userId)!;
    const wasOffline = userConnections.size === 0;
    userConnections.add(ws);
    send(ws, "auth:ok", { userId });

    if (wasOffline) {
        announcePresence(userId, "online").catch((error) => logError("Presenza online", error));
    }

    // "Sta scrivendo" arriva spesso: ricordo per un minuto a quali canali l'utente ha accesso.
    const channelAccess = new Map<string, { channel: Channel; until: number }>();
    async function accessibleChannel(channelId: unknown) {
        if (typeof channelId !== "string") return undefined;
        const cached = channelAccess.get(channelId);
        if (cached && cached.until > Date.now()) return cached.channel;
        const channel = await getAccessibleChannel(channelId, userId);
        if (channel) channelAccess.set(channelId, { channel, until: Date.now() + ACCESS_CACHE_MS });
        return channel;
    }

    ws.on("message", async (data) => {
        const message = parseMessage(data);
        if (!message) return;
        try {
            switch (message.type) {
                case "typing:start":
                case "typing:stop": {
                    const channel = await accessibleChannel(message.payload?.channelId);
                    if (channel) {
                        await broadcastToChannel(
                            channel,
                            message.type,
                            { channelId: channel.id, userId, userName },
                            userId,
                        );
                    }
                    break;
                }
                case "dm:typing:start":
                case "dm:typing:stop": {
                    const receiverId = message.payload?.receiverId;
                    if (
                        typeof receiverId === "string" &&
                        (await storage.shareWorkspace(userId, receiverId))
                    ) {
                        sendToUser(receiverId, message.type, {
                            senderId: userId,
                            receiverId,
                            senderName: userName,
                        });
                    }
                    break;
                }
            }
        } catch (error) {
            logError("Messaggio WebSocket", error);
        }
    });

    ws.on("close", () => {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
            connections.delete(userId);
            announcePresence(userId, "offline").catch((error) =>
                logError("Presenza offline", error),
            );
        }
    });
}

export function setupRealtime(httpServer: Server) {
    const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
    const alive = new WeakMap<WebSocket, boolean>();

    // Gestisco solo /ws: gli altri upgrade (es. l'HMR di Vite in sviluppo) restano a chi li aspetta.
    httpServer.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
        const { pathname } = new URL(req.url ?? "/", "http://localhost");
        if (pathname !== "/ws") return;
        wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
    });

    wss.on("connection", (ws) => {
        alive.set(ws, true);
        ws.on("pong", () => alive.set(ws, true));
        ws.on("error", (error) => logError("Connessione WebSocket", error));

        const authTimer = setTimeout(
            () => ws.close(1008, "Autenticazione mancante"),
            AUTH_TIMEOUT_MS,
        );

        ws.once("message", async (data) => {
            clearTimeout(authTimer);
            const message = parseMessage(data);
            const tokenUser = message?.type === "auth" ? verifyToken(message.token) : undefined;
            if (!tokenUser) {
                ws.close(1008, "Token non valido");
                return;
            }
            try {
                const user = await storage.getUser(tokenUser.id);
                if (!user) {
                    ws.close(1008, "Utente non trovato");
                    return;
                }
                onAuthenticated(ws, user.id, user.name);
            } catch (error) {
                logError("Autenticazione WebSocket", error);
                ws.close(1011, "Errore del server");
            }
        });
    });

    // Chiudo le connessioni morte (rete caduta senza chiusura), altrimenti l'utente resta "online".
    const heartbeat = setInterval(() => {
        for (const ws of wss.clients) {
            if (alive.get(ws) === false) {
                ws.terminate();
                continue;
            }
            alive.set(ws, false);
            ws.ping();
        }
    }, HEARTBEAT_MS);
    wss.on("close", () => clearInterval(heartbeat));

    return wss;
}
