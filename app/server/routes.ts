import type { Express, Response } from "express";
import { compare, hash } from "bcrypt";
import { createHash, randomBytes } from "crypto";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import {
    channelSchema,
    loginSchema,
    messageSchema,
    profileSchema,
    registerSchema,
    workspaceSchema,
} from "@shared/validation";
import {
    authenticateToken,
    BCRYPT_COST,
    currentUserId,
    DUMMY_HASH,
    signToken,
    type AuthenticatedRequest,
} from "./auth";
import { canManageWorkspace, getAccessibleChannel } from "./access";
import { HttpError, isUniqueViolation, parseOrThrow, route } from "./http-utils";
import { broadcastToChannel, broadcastToWorkspace, sendToUser } from "./realtime";
import { config } from "./config";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, storage, toSelfUser } from "./storage";

type AuthedRoute = (req: AuthenticatedRequest, res: Response) => Promise<unknown>;
const authed = (handler: AuthedRoute) => route<AuthenticatedRequest>(handler);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashInviteToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

/** Parametri di paginazione: `?limit=50&before=<id messaggio>`. */
const pageQuerySchema = z.object({
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    before: z.uuid().optional(),
});

const idParam = z.uuid("Identificativo non valido");

const limiterOptions = {
    standardHeaders: "draft-8" as const,
    legacyHeaders: false,
    message: { message: "Troppe richieste: riprova tra qualche minuto" },
    skip: () => config.DISABLE_RATE_LIMITS && config.NODE_ENV !== "production",
};

/**
 * Login: 10 tentativi falliti ogni 15 minuti per coppia IP + email.
 * Così chi indovina password su un account si ferma, ma un'aula dietro lo stesso
 * IP non resta bloccata per gli errori di una sola persona.
 */
const loginLimiter = rateLimit({
    ...limiterOptions,
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
        const email =
            typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
        return `${ipKeyGenerator(req.ip ?? "")}:${email}`;
    },
});

/** Registrazioni e uso degli inviti: limiti larghi per un uso normale, stretti per i bot. */
const signupLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 60 * 1000, limit: 30 });
const inviteLimiter = rateLimit({ ...limiterOptions, windowMs: 15 * 60 * 1000, limit: 30 });

/** Tetto generale sulle API autenticate. */
const apiLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 1000, limit: 300 });

async function requireWorkspaceManager(workspaceId: string, userId: string) {
    const role = await storage.getWorkspaceRole(workspaceId, userId);
    // 404 anche per chi non è membro: non rivela che il workspace esiste.
    if (!role) throw new HttpError(404, "Workspace non trovato");
    if (!canManageWorkspace(role)) {
        throw new HttpError(403, "Solo proprietari e amministratori possono farlo");
    }
}

async function requireWorkspaceMember(workspaceId: string, userId: string) {
    if (!(await storage.isWorkspaceMember(workspaceId, userId))) {
        throw new HttpError(404, "Workspace non trovato");
    }
}

async function requireChannel(channelId: string, userId: string) {
    const channel = await getAccessibleChannel(channelId, userId);
    if (!channel) throw new HttpError(404, "Canale non trovato");
    return channel;
}

/** I DM sono possibili solo tra persone che condividono un workspace; per gli altri l'utente non esiste. */
async function requireDmPartner(userId: string, otherId: string) {
    const other = idParam.safeParse(otherId);
    if (!other.success || !(await storage.shareWorkspace(userId, other.data))) {
        throw new HttpError(404, "Utente non trovato");
    }
    return other.data;
}

export function registerRoutes(app: Express) {
    // Autenticazione
    app.post(
        "/api/auth/register",
        signupLimiter,
        route(async (req, res) => {
            const data = parseOrThrow(registerSchema, req.body);
            // Dire che l'email esiste aiuta chi si è dimenticato di avere un account;
            // il limite sulle registrazioni rende costoso usarlo per scoprire le email.
            if (await storage.emailExists(data.email)) {
                throw new HttpError(409, "Esiste già un account con questa email");
            }
            try {
                const user = await storage.createUser({
                    email: data.email,
                    password: await hash(data.password, BCRYPT_COST),
                    name: data.name,
                });
                res.status(201).json({ token: signToken(user), user });
            } catch (error) {
                if (isUniqueViolation(error)) {
                    throw new HttpError(409, "Esiste già un account con questa email");
                }
                throw error;
            }
        }),
    );

    app.post(
        "/api/auth/login",
        loginLimiter,
        route(async (req, res) => {
            const data = parseOrThrow(loginSchema, req.body);
            const user = await storage.getUserWithPasswordByEmail(data.email);
            // Confronto anche se l'utente non esiste, così i tempi non rivelano chi è registrato.
            const validPassword = await compare(data.password, user?.password ?? DUMMY_HASH);
            if (!user || !validPassword) {
                throw new HttpError(401, "Email o password non corrette");
            }
            res.json({ token: signToken(user), user: toSelfUser(user) });
        }),
    );

    app.use("/api", authenticateToken, apiLimiter);

    app.get(
        "/api/auth/me",
        authed(async (req, res) => {
            const user = await storage.getSelf(currentUserId(req));
            if (!user) throw new HttpError(401, "Sessione scaduta: accedi di nuovo");
            res.json(user);
        }),
    );

    app.patch(
        "/api/users/me",
        authed(async (req, res) => {
            const data = parseOrThrow(profileSchema, req.body);
            const user = await storage.updateUser(currentUserId(req), data);
            if (!user) throw new HttpError(401, "Sessione scaduta: accedi di nuovo");
            res.json(user);
        }),
    );

    // Workspace
    app.get(
        "/api/workspaces",
        authed(async (req, res) => {
            res.json(await storage.getWorkspacesByUser(currentUserId(req)));
        }),
    );

    app.post(
        "/api/workspaces",
        authed(async (req, res) => {
            const { name } = parseOrThrow(workspaceSchema, req.body);
            const workspace = await storage.createWorkspaceWithGeneral(name, currentUserId(req));
            res.status(201).json(workspace);
        }),
    );

    app.get(
        "/api/workspaces/:workspaceId",
        authed(async (req, res) => {
            await requireWorkspaceMember(req.params.workspaceId, currentUserId(req));
            const workspace = await storage.getWorkspace(req.params.workspaceId);
            if (!workspace) throw new HttpError(404, "Workspace non trovato");
            res.json(workspace);
        }),
    );

    app.get(
        "/api/workspaces/:workspaceId/members",
        authed(async (req, res) => {
            await requireWorkspaceMember(req.params.workspaceId, currentUserId(req));
            res.json(await storage.getWorkspaceMembers(req.params.workspaceId));
        }),
    );

    // Canali
    app.get(
        "/api/workspaces/:workspaceId/channels",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            await requireWorkspaceMember(req.params.workspaceId, userId);
            res.json(await storage.getChannelsVisibleToUser(req.params.workspaceId, userId));
        }),
    );

    app.post(
        "/api/workspaces/:workspaceId/channels",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            await requireWorkspaceMember(req.params.workspaceId, userId);
            const data = parseOrThrow(channelSchema, req.body);
            try {
                const channel = await storage.createChannelWithCreator({
                    workspaceId: req.params.workspaceId,
                    name: data.name,
                    description: data.description,
                    isPrivate: data.isPrivate,
                    createdById: userId,
                });
                res.status(201).json(channel);
            } catch (error) {
                if (isUniqueViolation(error)) {
                    throw new HttpError(409, "Esiste già un canale con questo nome");
                }
                throw error;
            }
        }),
    );

    app.get(
        "/api/channels/:channelId/members",
        authed(async (req, res) => {
            const channel = await requireChannel(req.params.channelId, currentUserId(req));
            res.json(await storage.getChannelMembers(channel.id));
        }),
    );

    app.post(
        "/api/channels/:channelId/members",
        authed(async (req, res) => {
            const channel = await requireChannel(req.params.channelId, currentUserId(req));
            const { userId } = parseOrThrow(z.object({ userId: idParam }), req.body);
            // Si può aggiungere solo chi fa già parte del workspace.
            if (!(await storage.isWorkspaceMember(channel.workspaceId, userId))) {
                throw new HttpError(400, "Questa persona non fa parte del workspace");
            }
            await storage.addChannelMember({ channelId: channel.id, userId });
            sendToUser(userId, "channel:added", { workspaceId: channel.workspaceId, channel });
            res.status(204).end();
        }),
    );

    // Messaggi
    app.get(
        "/api/channels/:channelId/messages",
        authed(async (req, res) => {
            const channel = await requireChannel(req.params.channelId, currentUserId(req));
            const page = parseOrThrow(pageQuerySchema, req.query);
            const before = page.before
                ? await storage.getMessageCursor(channel.id, page.before)
                : undefined;
            if (page.before && !before) throw new HttpError(400, "Cursore non valido");
            res.json(await storage.getMessages(channel.id, { before, limit: page.limit }));
        }),
    );

    app.post(
        "/api/channels/:channelId/messages",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            const channel = await requireChannel(req.params.channelId, userId);
            const { content } = parseOrThrow(messageSchema, req.body);
            const message = await storage.createMessage({
                channelId: channel.id,
                senderId: userId,
                content,
            });
            const sender = await storage.getUser(userId);
            const payload = { ...message, sender };
            await broadcastToChannel(channel, "message:new", payload, userId);
            res.status(201).json(payload);
        }),
    );

    // Messaggi diretti
    app.get(
        "/api/dm/:userId",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            const otherId = await requireDmPartner(userId, req.params.userId);
            const page = parseOrThrow(pageQuerySchema, req.query);
            const before = page.before
                ? await storage.getDirectMessageCursor(userId, otherId, page.before)
                : undefined;
            if (page.before && !before) throw new HttpError(400, "Cursore non valido");
            res.json(
                await storage.getDirectMessages(userId, otherId, { before, limit: page.limit }),
            );
        }),
    );

    app.post(
        "/api/dm/:userId",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            const otherId = await requireDmPartner(userId, req.params.userId);
            const { content } = parseOrThrow(messageSchema, req.body);
            const message = await storage.createDirectMessage({
                senderId: userId,
                receiverId: otherId,
                content,
            });
            const [sender, receiver] = await Promise.all([
                storage.getUser(userId),
                storage.getUser(otherId),
            ]);
            const payload = { ...message, sender, receiver };
            sendToUser(otherId, "dm:new", payload);
            res.status(201).json(payload);
        }),
    );

    // Inviti
    app.get(
        "/api/workspaces/:workspaceId/invites",
        authed(async (req, res) => {
            await requireWorkspaceManager(req.params.workspaceId, currentUserId(req));
            res.json(await storage.listActiveInvites(req.params.workspaceId));
        }),
    );

    app.post(
        "/api/workspaces/:workspaceId/invites",
        authed(async (req, res) => {
            const userId = currentUserId(req);
            await requireWorkspaceManager(req.params.workspaceId, userId);
            const token = randomBytes(24).toString("base64url");
            const invite = await storage.createInvite({
                workspaceId: req.params.workspaceId,
                tokenHash: hashInviteToken(token),
                createdById: userId,
                expiresAt: new Date(Date.now() + INVITE_TTL_MS),
            });
            // Il token in chiaro esce una volta sola, in questa risposta.
            res.status(201).json({
                id: invite.id,
                token,
                path: `/invito/${token}`,
                expiresAt: invite.expiresAt,
            });
        }),
    );

    app.delete(
        "/api/workspaces/:workspaceId/invites/:inviteId",
        authed(async (req, res) => {
            await requireWorkspaceManager(req.params.workspaceId, currentUserId(req));
            const revoked = await storage.revokeInvite(req.params.workspaceId, req.params.inviteId);
            if (!revoked) throw new HttpError(404, "Invito non trovato");
            res.status(204).end();
        }),
    );

    app.get(
        "/api/invites/:token",
        inviteLimiter,
        authed(async (req, res) => {
            const found = await storage.getValidInvite(hashInviteToken(req.params.token));
            if (!found) throw new HttpError(404, "Invito non valido o scaduto");
            res.json({
                workspace: { id: found.workspace.id, name: found.workspace.name },
                alreadyMember: await storage.isWorkspaceMember(
                    found.workspace.id,
                    currentUserId(req),
                ),
            });
        }),
    );

    app.post(
        "/api/invites/:token/accept",
        inviteLimiter,
        authed(async (req, res) => {
            const userId = currentUserId(req);
            const found = await storage.acceptInvite(hashInviteToken(req.params.token), userId);
            if (!found) throw new HttpError(404, "Invito non valido o scaduto");
            if (found.joined) {
                const user = await storage.getUser(userId);
                await broadcastToWorkspace(
                    found.workspace.id,
                    "member:joined",
                    { workspaceId: found.workspace.id, user },
                    userId,
                );
            }
            res.json(found.workspace);
        }),
    );
}
