import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Check, Copy, Loader2, Link2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

interface InviteDialogProps {
    workspaceId: string;
    workspaceName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function InviteDialog({
    workspaceId,
    workspaceName,
    open,
    onOpenChange,
}: InviteDialogProps) {
    const [copied, setCopied] = useState(false);

    const create = useMutation({
        mutationFn: () =>
            apiRequest<CreatedInvite>("POST", `/api/workspaces/${workspaceId}/invites`),
    });

    const revoke = useMutation({
        mutationFn: (inviteId: string) =>
            apiRequest("DELETE", `/api/workspaces/${workspaceId}/invites/${inviteId}`),
        onSuccess: () => create.reset(),
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
            // Il link si mostra una sola volta: chiudendo, se ne genera uno nuovo la prossima volta.
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
                        Chi apre il link entra nel workspace e nel canale #general. Il link vale 7
                        giorni e puoi revocarlo in qualsiasi momento.
                    </DialogDescription>
                </DialogHeader>

                {!create.data ? (
                    <div className="space-y-3">
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
                        {create.isError && (
                            <p className="text-sm text-destructive" role="alert">
                                {create.error.message}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-2">
                            <Label htmlFor="invite-link">Link di invito</Label>
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
                                Scade il{" "}
                                {format(new Date(create.data.expiresAt), "d MMMM 'alle' HH:mm", {
                                    locale: it,
                                })}
                                . Mandalo solo a chi deve entrare: chiunque lo abbia può usarlo.
                            </p>
                        </div>
                        <div className="flex justify-between gap-2">
                            <Button
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => revoke.mutate(create.data.id)}
                                disabled={revoke.isPending}
                            >
                                Revoca link
                            </Button>
                            <Button variant="outline" onClick={() => handleOpenChange(false)}>
                                Fatto
                            </Button>
                        </div>
                        {revoke.isError && (
                            <p className="text-sm text-destructive" role="alert">
                                {revoke.error.message}
                            </p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
