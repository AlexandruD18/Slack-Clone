import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import type { Workspace } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

interface InvitePreview {
    workspace: { id: string; name: string };
    alreadyMember: boolean;
}

export default function InvitePage() {
    const { token } = useParams<{ token: string }>();
    const [location, setLocation] = useLocation();
    const { user, isLoading: authLoading } = useAuth();
    const { setCurrentWorkspace, setCurrentChannel } = useWorkspace();

    // Senza login si passa dalla pagina di accesso e poi si torna qui.
    useEffect(() => {
        if (!authLoading && !user) {
            setLocation(`/auth?next=${encodeURIComponent(location)}`, { replace: true });
        }
    }, [authLoading, user, location, setLocation]);

    const preview = useQuery<InvitePreview>({
        queryKey: ["/api/invites", token],
        enabled: !!user && !!token,
    });

    const openWorkspace = (workspace: Workspace) => {
        setCurrentChannel(null);
        setCurrentWorkspace(workspace);
        setLocation("/", { replace: true });
    };

    const accept = useMutation({
        mutationFn: () => apiRequest<Workspace>("POST", `/api/invites/${token}/accept`),
        onSuccess: async (workspace) => {
            await queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
            openWorkspace(workspace);
        },
    });

    const workspaceName = preview.data?.workspace.name;

    return (
        <main className="min-h-screen flex items-center justify-center p-6 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-1">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center">
                            <MessageSquare
                                className="w-7 h-7 text-primary-foreground"
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold leading-none tracking-tight">
                        {preview.isError
                            ? "Invito non valido"
                            : workspaceName
                              ? `Unisciti a ${workspaceName}`
                              : "Invito"}
                    </h1>
                    <CardDescription>
                        {preview.isError
                            ? "Il link è scaduto, è stato revocato oppure è stato copiato male. Chiedi un nuovo invito a chi te l'ha mandato."
                            : preview.data?.alreadyMember
                              ? "Fai già parte di questo workspace."
                              : preview.data
                                ? "Entrando potrai leggere i canali pubblici e scrivere alle persone del workspace."
                                : null}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {(authLoading || preview.isLoading) && (
                        <div className="flex justify-center py-2" role="status">
                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                            <span className="sr-only">Caricamento dell'invito</span>
                        </div>
                    )}

                    {preview.data && !preview.data.alreadyMember && (
                        <Button
                            className="w-full"
                            onClick={() => accept.mutate()}
                            disabled={accept.isPending}
                        >
                            {accept.isPending && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                            )}
                            Entra in {workspaceName}
                        </Button>
                    )}

                    {preview.data?.alreadyMember && (
                        <Button
                            className="w-full"
                            onClick={
                                () => accept.mutate() /* idempotente: restituisce il workspace */
                            }
                            disabled={accept.isPending}
                        >
                            Apri {workspaceName}
                        </Button>
                    )}

                    {accept.isError && (
                        <p className="text-sm text-destructive" role="alert">
                            Non è stato possibile entrare: {accept.error.message}
                        </p>
                    )}

                    {preview.isError && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setLocation("/")}
                        >
                            Vai ai tuoi workspace
                        </Button>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
