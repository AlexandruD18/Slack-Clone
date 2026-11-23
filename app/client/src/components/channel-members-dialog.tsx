import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, UserPlus } from "lucide-react";
import type { Channel, PublicUser, WorkspaceMemberWithUser } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ChannelMembersDialogProps {
    channel: Channel;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function PersonRow({ person, action }: { person: PublicUser; action?: React.ReactNode }) {
    return (
        <li className="flex items-center gap-3 py-2">
            <Avatar className="w-8 h-8">
                <AvatarImage src={person.avatar || undefined} alt="" />
                <AvatarFallback className="text-xs">
                    {person.name.charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <span className="flex-1 min-w-0 truncate text-sm">{person.name}</span>
            {action}
        </li>
    );
}

/** Chi fa parte di un canale privato e chi si può aggiungere tra i membri del workspace. */
export function ChannelMembersDialog({ channel, open, onOpenChange }: ChannelMembersDialogProps) {
    const membersKey = ["/api/channels", channel.id, "members"];

    const { data: members, isLoading } = useQuery<PublicUser[]>({
        queryKey: membersKey,
        enabled: open,
    });
    const { data: workspaceMembers } = useQuery<WorkspaceMemberWithUser[]>({
        queryKey: ["/api/workspaces", channel.workspaceId, "members"],
        enabled: open,
    });

    const add = useMutation({
        mutationFn: (userId: string) =>
            apiRequest("POST", `/api/channels/${channel.id}/members`, { userId }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: membersKey }),
    });

    const memberIds = new Set(members?.map((m) => m.id));
    const candidates = (workspaceMembers ?? [])
        .map((m) => m.user)
        .filter((person) => !memberIds.has(person.id));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Persone in #{channel.name}</DialogTitle>
                    <DialogDescription>
                        Il canale è privato: solo i membri lo vedono e ne leggono i messaggi.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-4" role="status">
                        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                        <span className="sr-only">Caricamento dei membri</span>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        <section aria-labelledby="channel-members-title">
                            <h3
                                id="channel-members-title"
                                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            >
                                Membri ({members?.length ?? 0})
                            </h3>
                            <ul className="divide-y">
                                {members?.map((person) => (
                                    <PersonRow key={person.id} person={person} />
                                ))}
                            </ul>
                        </section>

                        <section aria-labelledby="channel-candidates-title">
                            <h3
                                id="channel-candidates-title"
                                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                            >
                                Aggiungi dal workspace
                            </h3>
                            {candidates.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">
                                    Tutte le persone del workspace sono già nel canale. Per
                                    aggiungerne altre, invitale prima nel workspace.
                                </p>
                            ) : (
                                <ul className="divide-y">
                                    {candidates.map((person) => (
                                        <PersonRow
                                            key={person.id}
                                            person={person}
                                            action={
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => add.mutate(person.id)}
                                                    disabled={add.isPending}
                                                    aria-label={`Aggiungi ${person.name} al canale`}
                                                >
                                                    <UserPlus
                                                        className="w-4 h-4 mr-1"
                                                        aria-hidden="true"
                                                    />
                                                    Aggiungi
                                                </Button>
                                            }
                                        />
                                    ))}
                                </ul>
                            )}
                            {add.isError && (
                                <p className="text-sm text-destructive" role="alert">
                                    {add.error.message}
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
