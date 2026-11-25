import type { Channel } from "@shared/schema";
import { storage } from "./storage";

/**
 * Restituisce il canale solo se l'utente può vederlo: membro del workspace e,
 * per i canali privati, anche membro del canale. Altrimenti undefined, così
 * le route rispondono 404 senza rivelare che il canale esiste.
 */
export async function getAccessibleChannel(
    channelId: unknown,
    userId: string,
): Promise<Channel | undefined> {
    if (typeof channelId !== "string") return undefined;
    const channel = await storage.getChannel(channelId);
    if (!channel) return undefined;
    if (!(await storage.isWorkspaceMember(channel.workspaceId, userId))) return undefined;
    if (channel.isPrivate && !(await storage.isChannelMember(channel.id, userId))) return undefined;
    return channel;
}

export function canManageWorkspace(role: string | undefined) {
    return role === "owner" || role === "admin";
}
