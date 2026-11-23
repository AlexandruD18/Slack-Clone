import { sql } from "drizzle-orm";
import {
    pgTable,
    text,
    varchar,
    timestamp,
    boolean,
    index,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
    // Unica fonte della presenza: "online" o "offline", aggiornata dal WebSocket.
    status: text("status").default("offline").notNull(),
    lastSeenAt: timestamp("last_seen_at"),
    statusMessage: text("status_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
    id: varchar("id", { length: 36 })
        .primaryKey()
        .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    ownerId: varchar("owner_id", { length: 36 })
        .notNull()
        .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
    "workspace_members",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        workspaceId: varchar("workspace_id", { length: 36 })
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        role: text("role").default("member").notNull(),
        joinedAt: timestamp("joined_at").defaultNow().notNull(),
    },
    (t) => [
        uniqueIndex("workspace_members_workspace_user_idx").on(t.workspaceId, t.userId),
        index("workspace_members_user_idx").on(t.userId),
    ],
);

export const channels = pgTable(
    "channels",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        workspaceId: varchar("workspace_id", { length: 36 })
            .notNull()
            .references(() => workspaces.id, { onDelete: "cascade" }),
        name: text("name").notNull(),
        description: text("description"),
        isPrivate: boolean("is_private").default(false).notNull(),
        createdById: varchar("created_by_id", { length: 36 })
            .notNull()
            .references(() => users.id),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [uniqueIndex("channels_workspace_name_idx").on(t.workspaceId, t.name)],
);

export const channelMembers = pgTable(
    "channel_members",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        channelId: varchar("channel_id", { length: 36 })
            .notNull()
            .references(() => channels.id, { onDelete: "cascade" }),
        userId: varchar("user_id", { length: 36 })
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        joinedAt: timestamp("joined_at").defaultNow().notNull(),
    },
    (t) => [
        uniqueIndex("channel_members_channel_user_idx").on(t.channelId, t.userId),
        index("channel_members_user_idx").on(t.userId),
    ],
);

export const messages = pgTable(
    "messages",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        channelId: varchar("channel_id", { length: 36 })
            .notNull()
            .references(() => channels.id, { onDelete: "cascade" }),
        senderId: varchar("sender_id", { length: 36 })
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [index("messages_channel_created_idx").on(t.channelId, t.createdAt)],
);

export const directMessages = pgTable(
    "direct_messages",
    {
        id: varchar("id", { length: 36 })
            .primaryKey()
            .default(sql`gen_random_uuid()`),
        senderId: varchar("sender_id", { length: 36 })
            .notNull()
            .references(() => users.id),
        receiverId: varchar("receiver_id", { length: 36 })
            .notNull()
            .references(() => users.id),
        content: text("content").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (t) => [
        // Una conversazione si legge in entrambe le direzioni: un indice per verso.
        index("direct_messages_pair_created_idx").on(t.senderId, t.receiverId, t.createdAt),
        index("direct_messages_receiver_idx").on(t.receiverId, t.senderId, t.createdAt),
    ],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    workspacesOwned: many(workspaces),
    workspaceMemberships: many(workspaceMembers),
    channelMemberships: many(channelMembers),
    messagesSent: many(messages),
    directMessagesSent: many(directMessages, { relationName: "sender" }),
    directMessagesReceived: many(directMessages, { relationName: "receiver" }),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
    members: many(workspaceMembers),
    channels: many(channels),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
    workspace: one(workspaces, {
        fields: [workspaceMembers.workspaceId],
        references: [workspaces.id],
    }),
    user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
    workspace: one(workspaces, { fields: [channels.workspaceId], references: [workspaces.id] }),
    createdBy: one(users, { fields: [channels.createdById], references: [users.id] }),
    members: many(channelMembers),
    messages: many(messages),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
    channel: one(channels, { fields: [channelMembers.channelId], references: [channels.id] }),
    user: one(users, { fields: [channelMembers.userId], references: [users.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    channel: one(channels, { fields: [messages.channelId], references: [channels.id] }),
    sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
    sender: one(users, {
        fields: [directMessages.senderId],
        references: [users.id],
        relationName: "sender",
    }),
    receiver: one(users, {
        fields: [directMessages.receiverId],
        references: [users.id],
        relationName: "receiver",
    }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
    id: true,
    createdAt: true,
});
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers).omit({
    id: true,
    joinedAt: true,
});
export const insertChannelSchema = createInsertSchema(channels).omit({ id: true, createdAt: true });
export const insertChannelMemberSchema = createInsertSchema(channelMembers).omit({
    id: true,
    joinedAt: true,
});
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
    id: true,
    createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
});

// Types
export type User = typeof users.$inferSelect;
/** Utente senza hash della password: l'unica forma che lascia il server. */
export type PublicUser = Omit<User, "password">;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Extended types with relations
export type MessageWithSender = Message & { sender: PublicUser };
export type DirectMessageWithUsers = DirectMessage & { sender: PublicUser; receiver: PublicUser };
