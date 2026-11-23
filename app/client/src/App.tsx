import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { SocketProvider } from "@/lib/socket";
import { WorkspaceProvider } from "@/lib/workspace";
import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import NotFound from "@/pages/not-found";
import InvitePage from "@/pages/invite";

function Router() {
    return (
        <Switch>
            <Route path="/" component={HomePage} />
            <Route path="/auth" component={AuthPage} />
            <Route path="/invito/:token" component={InvitePage} />
            <Route component={NotFound} />
        </Switch>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <SocketProvider>
                    <WorkspaceProvider>
                        <TooltipProvider>
                            <Toaster />
                            <Router />
                        </TooltipProvider>
                    </WorkspaceProvider>
                </SocketProvider>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
