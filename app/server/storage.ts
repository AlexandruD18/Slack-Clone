import {
    users,
    workspaces,
    workspaceMembers,
    channels,
    channelMembers,
    messages,
    directMessages,
    type User,
    type PublicUser,
    type InsertUser,
    type Workspace,
    type InsertWorkspace,
    type WorkspaceMember,
    type InsertWorkspaceMember,
    type Channel,
    type InsertChannel,
    type ChannelMember,
    type InsertChannelMember,
    type Message,
    type InsertMessage,
    type DirectMessage,
    type InsertDirectMessage,
    type MessageWithSender,
    type DirectMessageWithUsers,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, asc, desc, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

/** Pagina di messaggi: gli ultimi `limit` prima del messaggio `before` (escluso). */
export interface PageOptions {
    /** Id di un messaggio già validato con get*Cursor. */
    before?: string;
    limit?: number;
}

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

/**
 * Condizione keyset su (created_at, id), stabile anche con più messaggi nello stesso istante.
 * Il timestamp del cursore resta nel database: passando da un Date di JavaScript
 * si perderebbero i microsecondi e con loro i messaggi dello stesso millisecondo.
 */
function olderThan(
    table: PgTable,
    createdAt: PgColumn,
    id: PgColumn,
    beforeId: string | undefined,
): SQL | undefined {
    if (!beforeId) return undefined;
    return sql`(${createdAt}, ${id}) < (select cur.created_at, cur.id from ${table} as cur where cur.id = ${beforeId})`;
}

/**
 * Colonne dell'utente che possono uscire dal server.
 * L'hash della password non deve mai comparire in una risposta o in un evento.
 */
export const publicUserColumns = {
    id: users.id,
    email: users.email,
    name: users.name,
    avatar: users.avatar,
    status: users.status,
    statusMessage: users.statusMessage,
    lastSeenAt: users.lastSeenAt,
    createdAt: users.createdAt,
};

export function toPublicUser(user: User): PublicUser {
    const { password, ...rest } = user;
    return rest;
}

export interface IStorage {
    // Utenti
    getUser(id: string): Promise<PublicUser | undefined>;
    /** Unico metodo che restituisce l'hash della password: serve solo al login. */
    getUserWithPasswordByEmail(email: string): Promise<User | undefined>;
    emailExists(email: string): Promise<boolean>;
    createUser(user: InsertUser): Promise<PublicUser>;
    updateUser(
        id: string,
        data: Partial<Pick<User, "name" | "avatar" | "statusMessage">>,
    ): Promise<PublicUser | undefined>;

    // Workspace
    getWorkspace(id: string): Promise<Workspace | undefined>;
    getWorkspacesByUser(userId: string): Promise<Workspace[]>;
    createWorkspace(workspace: InsertWorkspace): Promise<Workspace>;

    // Membri dei workspace
    getWorkspaceMembers(workspaceId: string): Promise<{ user: PublicUser }[]>;
    getWorkspaceMemberIds(workspaceId: string): Promise<string[]>;
    addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember>;
    isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean>;

    // Canali
    getChannel(id: string): Promise<Channel | undefined>;
    getChannelsVisibleToUser(workspaceId: string, userId: string): Promise<Channel[]>;
    createChannel(channel: InsertChannel): Promise<Channel>;

    // Membri dei canali
    addChannelMember(member: InsertChannelMember): Promise<ChannelMember>;
    isChannelMember(channelId: string, userId: string): Promise<boolean>;
    getChannelMemberIds(channelId: string): Promise<string[]>;

    // Messaggi
    getMessages(channelId: string, page?: PageOptions): Promise<MessageWithSender[]>;
    getMessageCursor(channelId: string, messageId: string): Promise<string | undefined>;
    createMessage(message: InsertMessage): Promise<Message>;

    // Messaggi diretti
    getDirectMessages(
        userId1: string,
        userId2: string,
        page?: PageOptions,
    ): Promise<DirectMessageWithUsers[]>;
    getDirectMessageCursor(
        userId1: string,
        userId2: string,
        messageId: string,
    ): Promise<string | undefined>;
    createDirectMessage(message: InsertDirectMessage): Promise<DirectMessage>;

    // Presenza
    updatePresence(userId: string, status: string): Promise<void>;
    resetPresence(): Promise<void>;
}

function conversation(userId1: string, userId2: string) {
    return or(
        and(eq(directMessages.senderId, userId1), eq(directMessages.receiverId, userId2)),
        and(eq(directMessages.senderId, userId2), eq(directMessages.receiverId, userId1)),
    );
}

export class DatabaseStorage implements IStorage {
    // Utenti
    async getUser(id: string): Promise<PublicUser | undefined> {
        const [user] = await db.select(publicUserColumns).from(users).where(eq(users.id, id));
        return user;
    }

    async getUserWithPasswordByEmail(email: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
    }

    async emailExists(email: string): Promise<boolean> {
        const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
        return !!row;
    }

    async createUser(insertUser: InsertUser): Promise<PublicUser> {
        const [user] = await db.insert(users).values(insertUser).returning(publicUserColumns);
        return user;
    }

    async updateUser(
        id: string,
        data: Partial<Pick<User, "name" | "avatar" | "statusMessage">>,
    ): Promise<PublicUser | undefined> {
        const [user] = await db
            .update(users)
            .set(data)
            .where(eq(users.id, id))
            .returning(publicUserColumns);
        return user;
    }

    // Workspace
    async getWorkspace(id: string): Promise<Workspace | undefined> {
        const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
        return workspace;
    }

    async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
        const memberWorkspaces = await db
            .select({ workspace: workspaces })
            .from(workspaceMembers)
            .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
            .where(eq(workspaceMembers.userId, userId));
        return memberWorkspaces.map((m) => m.workspace);
    }

    async createWorkspace(insertWorkspace: InsertWorkspace): Promise<Workspace> {
        const [workspace] = await db.insert(workspaces).values(insertWorkspace).returning();
        return workspace;
    }

    // Membri dei workspace
    async getWorkspaceMembers(workspaceId: string): Promise<{ user: PublicUser }[]> {
        return db
            .select({ user: publicUserColumns })
            .from(workspaceMembers)
            .innerJoin(users, eq(workspaceMembers.userId, users.id))
            .where(eq(workspaceMembers.workspaceId, workspaceId));
    }

    async getWorkspaceMemberIds(workspaceId: string): Promise<string[]> {
        const rows = await db
            .select({ userId: workspaceMembers.userId })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, workspaceId));
        return rows.map((r) => r.userId);
    }

    async addWorkspaceMember(member: InsertWorkspaceMember): Promise<WorkspaceMember> {
        const [workspaceMember] = await db.insert(workspaceMembers).values(member).returning();
        return workspaceMember;
    }

    async isWorkspaceMember(workspaceId: string, userId: string): Promise<boolean> {
        const [member] = await db
            .select({ id: workspaceMembers.id })
            .from(workspaceMembers)
            .where(
                and(
                    eq(workspaceMembers.workspaceId, workspaceId),
                    eq(workspaceMembers.userId, userId),
                ),
            );
        return !!member;
    }

    // Canali
    async getChannel(id: string): Promise<Channel | undefined> {
        const [channel] = await db.select().from(channels).where(eq(channels.id, id));
        return channel;
    }

    /** Canali pubblici del workspace più i privati di cui l'utente è membro. */
    async getChannelsVisibleToUser(workspaceId: string, userId: string): Promise<Channel[]> {
        const memberOf = db
            .select({ channelId: channelMembers.channelId })
            .from(channelMembers)
            .where(eq(channelMembers.userId, userId));

        return db
            .select()
            .from(channels)
            .where(
                and(
                    eq(channels.workspaceId, workspaceId),
                    or(eq(channels.isPrivate, false), inArray(channels.id, memberOf)),
                ),
            )
            .orderBy(asc(channels.createdAt));
    }

    async createChannel(insertChannel: InsertChannel): Promise<Channel> {
        const [channel] = await db.insert(channels).values(insertChannel).returning();
        return channel;
    }

    // Membri dei canali
    async addChannelMember(member: InsertChannelMember): Promise<ChannelMember> {
        const [channelMember] = await db.insert(channelMembers).values(member).returning();
        return channelMember;
    }

    async isChannelMember(channelId: string, userId: string): Promise<boolean> {
        const [member] = await db
            .select({ id: channelMembers.id })
            .from(channelMembers)
            .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userId, userId)));
        return !!member;
    }

    async getChannelMemberIds(channelId: string): Promise<string[]> {
        const rows = await db
            .select({ userId: channelMembers.userId })
            .from(channelMembers)
            .where(eq(channelMembers.channelId, channelId));
        return rows.map((r) => r.userId);
    }

    // Messaggi
    async getMessages(channelId: string, page: PageOptions = {}): Promise<MessageWithSender[]> {
        const rows = await db
            .select({
                id: messages.id,
                channelId: messages.channelId,
                senderId: messages.senderId,
                content: messages.content,
                createdAt: messages.createdAt,
                sender: publicUserColumns,
            })
            .from(messages)
            .innerJoin(users, eq(messages.senderId, users.id))
            .where(
                and(
                    eq(messages.channelId, channelId),
                    olderThan(messages, messages.createdAt, messages.id, page.before),
                ),
            )
            .orderBy(desc(messages.createdAt), desc(messages.id))
            .limit(page.limit ?? DEFAULT_PAGE_SIZE);
        // Letti dal più recente per prendere gli ultimi N, restituiti in ordine cronologico.
        return rows.reverse();
    }

    async getMessageCursor(channelId: string, messageId: string) {
        const [row] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(eq(messages.id, messageId), eq(messages.channelId, channelId)));
        return row?.id;
    }

    async createMessage(insertMessage: InsertMessage): Promise<Message> {
        const [message] = await db.insert(messages).values(insertMessage).returning();
        return message;
    }

    // Messaggi diretti
    async getDirectMessages(
        userId1: string,
        userId2: string,
        page: PageOptions = {},
    ): Promise<DirectMessageWithUsers[]> {
        const rows = await db
            .select()
            .from(directMessages)
            .where(
                and(
                    conversation(userId1, userId2),
                    olderThan(
                        directMessages,
                        directMessages.createdAt,
                        directMessages.id,
                        page.before,
                    ),
                ),
            )
            .orderBy(desc(directMessages.createdAt), desc(directMessages.id))
            .limit(page.limit ?? DEFAULT_PAGE_SIZE);
        const result = rows.reverse();

        if (result.length === 0) return [];

        const usersList = await db
            .select(publicUserColumns)
            .from(users)
            .where(inArray(users.id, [userId1, userId2]));
        const usersMap = new Map(usersList.map((u) => [u.id, u]));

        return result.map((dm) => ({
            ...dm,
            sender: usersMap.get(dm.senderId)!,
            receiver: usersMap.get(dm.receiverId)!,
        }));
    }

    async getDirectMessageCursor(userId1: string, userId2: string, messageId: string) {
        const [row] = await db
            .select({ id: directMessages.id })
            .from(directMessages)
            .where(and(eq(directMessages.id, messageId), conversation(userId1, userId2)));
        return row?.id;
    }

    async createDirectMessage(insertMessage: InsertDirectMessage): Promise<DirectMessage> {
        const [message] = await db.insert(directMessages).values(insertMessage).returning();
        return message;
    }

    // Presenza
    /**
     * All'avvio nessuno è connesso: dopo un crash gli stati "online" sarebbero falsi.
     * Vale finché il server gira su una sola istanza.
     */
    async resetPresence(): Promise<void> {
        await db.update(users).set({ status: "offline" }).where(eq(users.status, "online"));
    }

    async updatePresence(userId: string, status: string): Promise<void> {
        await db
            .update(users)
            .set({ status, lastSeenAt: sql`now()` })
            .where(eq(users.id, userId));
    }
}

export const storage = new DatabaseStorage();
