import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from "react";
import type { SelfUser as User } from "@shared/schema";
import { AUTH_EXPIRED_EVENT, queryClient } from "./queryClient";

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
    };

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        queryClient.clear();
    }, []);

    // Token scaduto o non più valido: esco subito invece di lasciare l'app bloccata.
    useEffect(() => {
        window.addEventListener(AUTH_EXPIRED_EVENT, logout);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
    }, [logout]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
