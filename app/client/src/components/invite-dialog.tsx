import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CreatedInvite {
    id: string;
    path: string;
    expiresAt: string;
}

interface ActiveInvite {
    id: string;
    createdAt: string;
    expiresAt: string;
    uses: number;
    createdByName: string;
}

interface InviteDialogProps {
    workspaceId: string;
    workspaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formatDate = (value: string) => format(new Date(value), "d MMM 'alle' HH:mm", { locale: it });

export function InviteDialog({
    workspaceId,
    workspaceName,
    open,
    onOpenChange,
}: InviteDialogProps) {
    const [copied, setCopied] = useState(false);
    const invitesKey = ["/api/workspaces", workspaceId, "invites"];

    const { data: activeInvites } = useQuery<ActiveInvite[]>({
        queryKey: invitesKey,
        enabled: open,
    });

    const create = useMutation({
        mutationFn: () =>
            apiRequest<CreatedInvite>("POST", `/api/workspaces/${workspaceId}/invites`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey }),
    });

    const revoke = useMutation({
        mutationFn: (inviteId: string) =>
            apiRequest("DELETE", `/api/workspaces/${workspaceId}/invites/${inviteId}`),
        onSuccess: (_data, inviteId) => {
            if (create.data?.id === inviteId) create.reset();
            return queryClient.invalidateQueries({ queryKey: invitesKey });
        },
    });

    const link = create.data ? `${window.location.origin}${create.data.path}` : "";

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Senza permesso per gli appunti il campo resta selezionabile a mano.
        }
    };

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            // Il link in chiaro si mostra una volta sola; l'invito resta nell'elenco sotto.
            create.reset();
            revoke.reset();
            setCopied(false);
        }
        onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invita persone in {workspaceName}</DialogTitle>
                    <DialogDescription>
                        Chi apre il link entra nel workspace e nel canale #general. Ogni link vale 7
                        giorni; puoi revocarlo dall'elenco qui sotto.
                    </DialogDescription>
                </DialogHeader>

                {create.data ? (
                    <div className="space-y-2">
                        <Label htmlFor="invite-link">Nuovo link di invito</Label>
                        <div className="flex gap-2">
                            <Input
                                id="invite-link"
                                readOnly
                                value={link}
                                onFocus={(e) => e.currentTarget.select()}
                                className="font-mono text-xs"
                            />
                            <Button type="button" variant="outline" onClick={copy}>
                                {copied ? (
                                    <Check className="w-4 h-4 mr-2" aria-hidden="true" />
                                ) : (
                                    <Copy className="w-4 h-4 mr-2" aria-hidden="true" />
                                )}
                                {copied ? "Copiato" : "Copia"}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Copialo ora: per sicurezza non lo potrai più rivedere. Mandalo solo a
                            chi deve entrare, perché chiunque lo abbia può usarlo.
                        </p>
                    </div>
                ) : (
                    <Button
                        onClick={() => create.mutate()}
                        disabled={create.isPending}
                        className="w-full"
                    >
                        {create.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        ) : (
                            <Link2 className="w-4 h-4 mr-2" aria-hidden="true" />
                        )}
                        Crea link di invito
                    </Button>
                )}
                {create.isError && (
                    <p className="text-sm text-destructive" role="alert">
                        {create.error.message}
                    </p>
                )}

                <section aria-labelledby="active-invites-title" className="space-y-2">
                    <h3
                        id="active-invites-title"
                        className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                        Link attivi ({activeInvites?.length ?? 0})
                    </h3>
                    {activeInvites?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nessun link attivo.</p>
                    ) : (
                        <ul className="divide-y max-h-56 overflow-y-auto">
                            {activeInvites?.map((invite) => (
                                <li key={invite.id} className="flex items-center gap-3 py-2">
                                    <div className="flex-1 min-w-0 text-sm">
                                        <p className="truncate">
                                            Creato da {invite.createdByName} il{" "}
                                            {formatDate(invite.createdAt)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Scade il {formatDate(invite.expiresAt)} ·{" "}
                                            {invite.uses === 1
                                                ? "usato 1 volta"
                                                : `usato ${invite.uses} volte`}
                                        </p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive"
                                        onClick={() => revoke.mutate(invite.id)}
                                        disabled={revoke.isPending}
                                    >
                                        Revoca
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {revoke.isError && (
                        <p className="text-sm text-destructive" role="alert">
                            {revoke.error.message}
                        </p>
                    )}
                </section>
            </DialogContent>
        </Dialog>
    );
}
