import { eq, and, or, desc, sql, like } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  workspaces,
  workspaceMembers,
  channels,
  channelMembers,
  messages,
  directMessages,
  type User,
  type InsertUser,
  type Workspace,
  type InsertWorkspace,
  type Channel,
  type InsertChannel,
  type Message,
  type InsertMessage,
  type DirectMessage,
  type InsertDirectMessage,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User | undefined>;

  // Workspaces
  getWorkspacesByUserId(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  createWorkspace(workspace: Omit<InsertWorkspace, "ownerId">, ownerId: string): Promise<Workspace>;
  getWorkspaceMembers(workspaceId: string): Promise<User[]>;
  addWorkspaceMember(workspaceId: string, userId: string, role?: string): Promise<void>;

  // Channels
  getChannelsByWorkspaceId(workspaceId: string): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | undefined>;
  createChannel(channel: Omit<InsertChannel, "createdById">, createdById: string): Promise<Channel>;
  addChannelMember(channelId: string, userId: string): Promise<void>;
  getChannelMembers(channelId: string): Promise<User[]>;

  // Messages
  getMessagesByChannelId(channelId: string, limit?: number): Promise<(Message & { user: User })[]>;
  createMessage(message: Omit<InsertMessage, "userId">, userId: string): Promise<Message>;

  // Direct Messages
  getDirectMessages(userId1: string, userId2: string, limit?: number): Promise<(DirectMessage & { sender: User; receiver: User })[]>;
  createDirectMessage(message: Omit<InsertDirectMessage, "senderId">, senderId: string): Promise<DirectMessage>;

  // Search
  searchMessages(workspaceId: string, query: string): Promise<(Message & { user: User; channel: Channel })[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Omit<User, "id" | "createdAt">>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Workspaces
  async getWorkspacesByUserId(userId: string): Promise<Workspace[]> {
    const result = await db
      .select({ workspace: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));
    return result.map((r) => r.workspace);
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace || undefined;
  }

  async createWorkspace(workspace: Omit<InsertWorkspace, "ownerId">, ownerId: string): Promise<Workspace> {
    const [newWorkspace] = await db
      .insert(workspaces)
      .values({ ...workspace, ownerId })
      .returning();

    // Add owner as member
    await this.addWorkspaceMember(newWorkspace.id, ownerId, "admin");

    return newWorkspace;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
    return result.map((r) => r.user);
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role: string = "member"): Promise<void> {
    await db.insert(workspaceMembers).values({ workspaceId, userId, role }).onConflictDoNothing();
  }

  // Channels
  async getChannelsByWorkspaceId(workspaceId: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.workspaceId, workspaceId))
      .orderBy(channels.name);
  }

  async getChannel(id: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async createChannel(channel: Omit<InsertChannel, "createdById">, createdById: string): Promise<Channel> {
    const [newChannel] = await db
      .insert(channels)
      .values({ ...channel, createdById })
      .returning();

    // Add creator as member
    await this.addChannelMember(newChannel.id, createdById);

    return newChannel;
  }

  async addChannelMember(channelId: string, userId: string): Promise<void> {
    await db.insert(channelMembers).values({ channelId, userId }).onConflictDoNothing();
  }

  async getChannelMembers(channelId: string): Promise<User[]> {
    const result = await db
      .select({ user: users })
      .from(channelMembers)
      .innerJoin(users, eq(channelMembers.userId, users.id))
      .where(eq(channelMembers.channelId, channelId));
    return result.map((r) => r.user);
  }

  // Messages
  async getMessagesByChannelId(channelId: string, limit: number = 100): Promise<(Message & { user: User })[]> {
    const result = await db
      .select({
        message: messages,
        user: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(limit);

    return result.map((r) => ({ ...r.message, user: r.user })).reverse();
  }

  async createMessage(message: Omit<InsertMessage, "userId">, userId: string): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values({ ...message, userId })
      .returning();
    return newMessage;
  }

  // Direct Messages
  async getDirectMessages(userId1: string, userId2: string, limit: number = 100): Promise<(DirectMessage & { sender: User; receiver: User })[]> {
    const result = await db
      .select({
        dm: directMessages,
        sender: users,
        receiver: users,
      })
      .from(directMessages)
      .innerJoin(
        users,
        or(
          and(eq(directMessages.senderId, users.id), eq(users.id, userId1)),
          and(eq(directMessages.senderId, users.id), eq(users.id, userId2))
        )!
      )
      .where(
        or(
          and(eq(directMessages.senderId, userId1), eq(directMessages.receiverId, userId2)),
          and(eq(directMessages.senderId, userId2), eq(directMessages.receiverId, userId1))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(limit);

    // Fetch complete user data separately for sender and receiver
    const dms = await db
      .select()
      .from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId1), eq(directMessages.receiverId, userId2)),
          and(eq(directMessages.senderId, userId2), eq(directMessages.receiverId, userId1))
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(limit);

    const enriched = await Promise.all(
      dms.map(async (dm) => {
        const sender = await this.getUser(dm.senderId);
        const receiver = await this.getUser(dm.receiverId);
        return { ...dm, sender: sender!, receiver: receiver! };
      })
    );

    return enriched.reverse();
  }

  async createDirectMessage(message: Omit<InsertDirectMessage, "senderId">, senderId: string): Promise<DirectMessage> {
    const [newDM] = await db
      .insert(directMessages)
      .values({ ...message, senderId })
      .returning();
    return newDM;
  }

  // Search
  async searchMessages(workspaceId: string, query: string): Promise<(Message & { user: User; channel: Channel })[]> {
    const result = await db
      .select({
        message: messages,
        user: users,
        channel: channels,
      })
      .from(messages)
      .innerJoin(users, eq(messages.userId, users.id))
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .where(
        and(
          eq(channels.workspaceId, workspaceId),
          like(messages.content, `%${query}%`)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);

    return result.map((r) => ({ ...r.message, user: r.user, channel: r.channel }));
  }
}

export const storage = new DatabaseStorage();
