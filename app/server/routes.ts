import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, toPublicUser, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./storage";
import { config } from "./config";
import { hash, hashSync, compare } from "bcrypt";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { loginSchema, registerSchema, type Channel } from "@shared/schema";

const JWT_SECRET = config.JWT_SECRET;
const JWT_OPTIONS: jwt.VerifyOptions = { algorithms: ["HS256"] };
const BCRYPT_COST = 10;
// Hash di una stringa casuale con lo stesso costo: i tempi del login non cambiano.
const DUMMY_HASH = hashSync(randomUUID(), BCRYPT_COST);

function signToken(user: { id: string; email: string; name: string }) {
    return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: "7d",
    });
}

interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string; name: string };
}

// JWT middleware
function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, JWT_OPTIONS) as {
            id: string;
            email: string;
            name: string;
        };
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// WebSocket connections by user ID
const wsConnections = new Map<string, Set<WebSocket>>();
// Track user workspaces for targeted broadcasts
const userWorkspaces = new Map<string, Set<string>>();

function broadcastToUser(userId: string, type: string, payload: any) {
    const connections = wsConnections.get(userId);
    if (connections) {
        const message = JSON.stringify({ type, payload });
        connections.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
}

function sendToUsers(userIds: string[], type: string, payload: unknown, excludeUserId?: string) {
    const message = JSON.stringify({ type, payload });
    for (const id of userIds) {
        if (id === excludeUserId) continue;
        wsConnections.get(id)?.forEach((ws) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
            }
        });
    }
}

async function broadcastToWorkspaceMembers(
    workspaceId: string,
    type: string,
    payload: unknown,
    excludeUserId?: string,
) {
    sendToUsers(await storage.getWorkspaceMemberIds(workspaceId), type, payload, excludeUserId);
}

/** Un canale privato arriva solo ai suoi membri, uno pubblico a tutto il workspace. */
async function broadcastToChannel(
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

/**
 * Restituisce il canale solo se l'utente può vederlo: membro del workspace e,
 * per i canali privati, anche membro del canale. Altrimenti undefined, così
 * le route rispondono 404 senza rivelare che il canale esiste.
 */
async function getAccessibleChannel(channelId: unknown, userId: string) {
    if (typeof channelId !== "string") return undefined;
    const channel = await storage.getChannel(channelId);
    if (!channel) return undefined;
    if (!(await storage.isWorkspaceMember(channel.workspaceId, userId))) return undefined;
    if (channel.isPrivate && !(await storage.isChannelMember(channel.id, userId))) return undefined;
    return channel;
}

/** Errore Postgres 23505: violazione di un vincolo di unicità. */
function isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

/** Parametri di paginazione: `?limit=50&before=<id messaggio>`. */
const pageQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    before: z.string().uuid().optional(),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
    // WebSocket server
    const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

    wss.on("connection", async (ws, req) => {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const token = url.searchParams.get("token");

        if (!token) {
            ws.close(1008, "No token provided");
            return;
        }

        let userId: string;
        try {
            const decoded = jwt.verify(token, JWT_SECRET, JWT_OPTIONS) as { id: string };
            userId = decoded.id;
        } catch {
            ws.close(1008, "Invalid token");
            return;
        }

        // Add connection
        if (!wsConnections.has(userId)) {
            wsConnections.set(userId, new Set());
        }
        wsConnections.get(userId)!.add(ws);

        // Update presence to online
        await storage.updatePresence(userId, "online");
        const user = await storage.getUser(userId);

        // Get user's workspaces and notify members
        const workspaces = await storage.getWorkspacesByUser(userId);
        const workspaceIds = new Set(workspaces.map((w) => w.id));
        userWorkspaces.set(userId, workspaceIds);

        // Notify workspace members that user is online
        for (const workspace of workspaces) {
            await broadcastToWorkspaceMembers(
                workspace.id,
                "presence:update",
                {
                    userId,
                    userName: user?.name,
                    status: "online",
                },
                userId,
            );
        }

        ws.on("message", async (data) => {
            try {
                const { type, payload } = JSON.parse(data.toString());

                switch (type) {
                    case "typing:start":
                    case "typing:stop": {
                        const channel = await getAccessibleChannel(payload?.channelId, userId);
                        if (channel) {
                            await broadcastToChannel(
                                channel,
                                type,
                                { channelId: channel.id, userId, userName: user?.name },
                                userId,
                            );
                        }
                        break;
                    }

                    case "dm:typing:start":
                        broadcastToUser(payload.receiverId, "dm:typing:start", {
                            senderId: userId,
                            receiverId: payload.receiverId,
                            senderName: user?.name,
                        });
                        break;

                    case "dm:typing:stop":
                        broadcastToUser(payload.receiverId, "dm:typing:stop", {
                            senderId: userId,
                            receiverId: payload.receiverId,
                        });
                        break;
                }
            } catch (error) {
                console.error("WebSocket message error:", error);
            }
        });

        ws.on("close", async () => {
            const connections = wsConnections.get(userId);
            if (connections) {
                connections.delete(ws);
                if (connections.size === 0) {
                    wsConnections.delete(userId);
                    // Update presence to offline
                    await storage.updatePresence(userId, "offline");

                    // Notify workspace members
                    const userWs = userWorkspaces.get(userId);
                    if (userWs) {
                        for (const workspaceId of userWs) {
                            await broadcastToWorkspaceMembers(
                                workspaceId,
                                "presence:update",
                                {
                                    userId,
                                    userName: user?.name,
                                    status: "offline",
                                },
                                userId,
                            );
                        }
                        userWorkspaces.delete(userId);
                    }
                }
            }
        });
    });

    // Auth routes
    app.post("/api/auth/register", async (req, res) => {
        try {
            const data = registerSchema.parse(req.body);

            if (await storage.emailExists(data.email)) {
                return res.status(400).json({ message: "Email already registered" });
            }

            const hashedPassword = await hash(data.password, BCRYPT_COST);
            const user = await storage.createUser({
                email: data.email,
                password: hashedPassword,
                name: data.name,
            });

            const token = signToken(user);

            res.json({ token, user });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Registration error:", error);
            res.status(500).json({ message: "Failed to register" });
        }
    });

    app.post("/api/auth/login", async (req, res) => {
        try {
            const data = loginSchema.parse(req.body);

            const user = await storage.getUserWithPasswordByEmail(data.email);
            // Confronto anche se l'utente non esiste, così i tempi di risposta
            // non rivelano quali email sono registrate.
            const validPassword = await compare(data.password, user?.password ?? DUMMY_HASH);
            if (!user || !validPassword) {
                return res.status(401).json({ message: "Invalid email or password" });
            }

            const token = signToken(user);

            res.json({ token, user: toPublicUser(user) });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ message: error.errors[0].message });
            }
            console.error("Login error:", error);
            res.status(500).json({ message: "Failed to login" });
        }
    });

    app.get("/api/auth/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const user = await storage.getUser(req.user!.id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            res.json(user);
        } catch (error) {
            console.error("Get user error:", error);
            res.status(500).json({ message: "Failed to get user" });
        }
    });

    // Workspace routes
    app.get("/api/workspaces", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const workspaces = await storage.getWorkspacesByUser(req.user!.id);
            res.json(workspaces);
        } catch (error) {
            console.error("Get workspaces error:", error);
            res.status(500).json({ message: "Failed to get workspaces" });
        }
    });

    app.post("/api/workspaces", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const { name } = req.body;
            if (!name || typeof name !== "string" || name.length < 2) {
                return res
                    .status(400)
                    .json({ message: "Workspace name must be at least 2 characters" });
            }

            const workspace = await storage.createWorkspace({
                name,
                ownerId: req.user!.id,
            });

            // Add creator as member
            await storage.addWorkspaceMember({
                workspaceId: workspace.id,
                userId: req.user!.id,
                role: "owner",
            });

            // Create a default general channel
            const generalChannel = await storage.createChannel({
                workspaceId: workspace.id,
                name: "general",
                description: "This is the general channel for team discussions",
                isPrivate: false,
                createdById: req.user!.id,
            });

            // Add creator as channel member
            await storage.addChannelMember({
                channelId: generalChannel.id,
                userId: req.user!.id,
            });

            res.status(201).json(workspace);
        } catch (error) {
            console.error("Create workspace error:", error);
            res.status(500).json({ message: "Failed to create workspace" });
        }
    });

    app.get("/api/workspaces/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const workspace = await storage.getWorkspace(req.params.id);
            if (!workspace) {
                return res.status(404).json({ message: "Workspace not found" });
            }

            // Check membership
            const isMember = await storage.isWorkspaceMember(workspace.id, req.user!.id);
            if (!isMember) {
                return res.status(403).json({ message: "Not a member of this workspace" });
            }

            res.json(workspace);
        } catch (error) {
            console.error("Get workspace error:", error);
            res.status(500).json({ message: "Failed to get workspace" });
        }
    });

    app.get(
        "/api/workspaces/:id/members",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                // Check membership
                const isMember = await storage.isWorkspaceMember(req.params.id, req.user!.id);
                if (!isMember) {
                    return res.status(403).json({ message: "Not a member of this workspace" });
                }

                const members = await storage.getWorkspaceMembers(req.params.id);
                res.json(members);
            } catch (error) {
                console.error("Get workspace members error:", error);
                res.status(500).json({ message: "Failed to get workspace members" });
            }
        },
    );

    // Channel routes
    app.get(
        "/api/workspaces/:workspaceId/channels",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                // Check workspace membership
                const isMember = await storage.isWorkspaceMember(
                    req.params.workspaceId,
                    req.user!.id,
                );
                if (!isMember) {
                    return res.status(403).json({ message: "Not a member of this workspace" });
                }

                const channels = await storage.getChannelsVisibleToUser(
                    req.params.workspaceId,
                    req.user!.id,
                );
                res.json(channels);
            } catch (error) {
                console.error("Get channels error:", error);
                res.status(500).json({ message: "Failed to get channels" });
            }
        },
    );

    app.post(
        "/api/workspaces/:workspaceId/channels",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                // Check workspace membership
                const isMember = await storage.isWorkspaceMember(
                    req.params.workspaceId,
                    req.user!.id,
                );
                if (!isMember) {
                    return res.status(403).json({ message: "Not a member of this workspace" });
                }

                const { name, description, isPrivate } = req.body;
                if (!name || typeof name !== "string" || name.length < 2) {
                    return res
                        .status(400)
                        .json({ message: "Channel name must be at least 2 characters" });
                }

                const channel = await storage.createChannel({
                    workspaceId: req.params.workspaceId,
                    name: name.toLowerCase().replace(/\s+/g, "-"),
                    description: description || null,
                    isPrivate: isPrivate || false,
                    createdById: req.user!.id,
                });

                // Add creator as member
                await storage.addChannelMember({
                    channelId: channel.id,
                    userId: req.user!.id,
                });

                res.status(201).json(channel);
            } catch (error) {
                if (isUniqueViolation(error)) {
                    return res
                        .status(409)
                        .json({ message: "A channel with this name already exists" });
                }
                console.error("Create channel error:", error);
                res.status(500).json({ message: "Failed to create channel" });
            }
        },
    );

    // Message routes
    app.get(
        "/api/channels/:channelId/messages",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const channel = await getAccessibleChannel(req.params.channelId, req.user!.id);
                if (!channel) {
                    return res.status(404).json({ message: "Channel not found" });
                }

                const query = pageQuerySchema.safeParse(req.query);
                if (!query.success) {
                    return res.status(400).json({ message: "Invalid pagination parameters" });
                }
                const before = query.data.before
                    ? await storage.getMessageCursor(channel.id, query.data.before)
                    : undefined;
                if (query.data.before && !before) {
                    return res.status(400).json({ message: "Unknown message cursor" });
                }

                const messages = await storage.getMessages(channel.id, {
                    before,
                    limit: query.data.limit,
                });
                res.json(messages);
            } catch (error) {
                console.error("Get messages error:", error);
                res.status(500).json({ message: "Failed to get messages" });
            }
        },
    );

    app.post(
        "/api/channels/:channelId/messages",
        authenticateToken,
        async (req: AuthenticatedRequest, res) => {
            try {
                const channel = await getAccessibleChannel(req.params.channelId, req.user!.id);
                if (!channel) {
                    return res.status(404).json({ message: "Channel not found" });
                }

                const { content } = req.body;
                if (!content || typeof content !== "string" || content.trim().length === 0) {
                    return res.status(400).json({ message: "Message content is required" });
                }

                const message = await storage.createMessage({
                    channelId: req.params.channelId,
                    senderId: req.user!.id,
                    content: content.trim(),
                });

                const user = await storage.getUser(req.user!.id);

                await broadcastToChannel(
                    channel,
                    "message:new",
                    {
                        ...message,
                        channelId: req.params.channelId,
                        sender: user,
                    },
                    req.user!.id,
                );

                res.status(201).json(message);
            } catch (error) {
                console.error("Create message error:", error);
                res.status(500).json({ message: "Failed to create message" });
            }
        },
    );

    // Direct message routes
    app.get("/api/dm/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            // Verify the other user exists
            const otherUser = await storage.getUser(req.params.userId);
            if (!otherUser) {
                return res.status(404).json({ message: "User not found" });
            }

            const query = pageQuerySchema.safeParse(req.query);
            if (!query.success) {
                return res.status(400).json({ message: "Invalid pagination parameters" });
            }
            const before = query.data.before
                ? await storage.getDirectMessageCursor(
                      req.user!.id,
                      req.params.userId,
                      query.data.before,
                  )
                : undefined;
            if (query.data.before && !before) {
                return res.status(400).json({ message: "Unknown message cursor" });
            }

            const messages = await storage.getDirectMessages(req.user!.id, req.params.userId, {
                before,
                limit: query.data.limit,
            });
            res.json(messages);
        } catch (error) {
            console.error("Get DMs error:", error);
            res.status(500).json({ message: "Failed to get direct messages" });
        }
    });

    app.post("/api/dm/:userId", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const receiver = await storage.getUser(req.params.userId);
            if (!receiver) {
                return res.status(404).json({ message: "User not found" });
            }

            const { content } = req.body;
            if (!content || typeof content !== "string" || content.trim().length === 0) {
                return res.status(400).json({ message: "Message content is required" });
            }

            const message = await storage.createDirectMessage({
                senderId: req.user!.id,
                receiverId: req.params.userId,
                content: content.trim(),
            });

            const sender = await storage.getUser(req.user!.id);

            // Notify receiver only
            broadcastToUser(req.params.userId, "dm:new", {
                ...message,
                sender,
                receiver,
            });

            res.status(201).json(message);
        } catch (error) {
            console.error("Create DM error:", error);
            res.status(500).json({ message: "Failed to send direct message" });
        }
    });

    // User profile routes
    app.patch("/api/users/me", authenticateToken, async (req: AuthenticatedRequest, res) => {
        try {
            const { name, avatar, statusMessage } = req.body;

            const updateData: Parameters<typeof storage.updateUser>[1] = {};
            if (name) updateData.name = name;
            if (avatar !== undefined) updateData.avatar = avatar;
            if (statusMessage !== undefined) updateData.statusMessage = statusMessage;

            const user = await storage.updateUser(req.user!.id, updateData);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json(user);
        } catch (error) {
            console.error("Update user error:", error);
            res.status(500).json({ message: "Failed to update profile" });
        }
    });

    return httpServer;
}
