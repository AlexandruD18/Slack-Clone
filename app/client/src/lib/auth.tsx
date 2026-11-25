import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";
import type { SelfUser as User } from "@shared/schema";
import { AUTH_EXPIRED_EVENT, apiRequest, queryClient } from "./queryClient";

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readStorage(key: string) {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function readStoredUser(): User | null {
    try {
        const raw = readStorage("user");
        return raw ? (JSON.parse(raw) as User) : null;
    } catch {
        return null;
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    // Lettura sincrona: al primo render l'app sa già se c'è una sessione, senza un passaggio a vuoto.
    const [token, setToken] = useState<string | null>(() => readStorage("token"));
    const [user, setUser] = useState<User | null>(() =>
        readStorage("token") ? readStoredUser() : null,
    );
    // Aspetto il server solo se non ho nemmeno una copia locale dell'utente da mostrare.
    const [isLoading, setIsLoading] = useState(() => !!readStorage("token") && !readStoredUser());

    const logout = useCallback(() => {
        try {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
        } catch {
            // Storage non disponibile: basta svuotare lo stato.
        }
        setToken(null);
        setUser(null);
        queryClient.clear();
    }, []);

    const login = useCallback((newToken: string, newUser: User) => {
        try {
            localStorage.setItem("token", newToken);
            localStorage.setItem("user", JSON.stringify(newUser));
        } catch {
            // Senza storage la sessione dura finché la scheda resta aperta.
        }
        setToken(newToken);
        setUser(newUser);
        setIsLoading(false);
    }, []);

    // All'avvio verifico il token col server e aggiorno i dati dell'utente (nome, avatar…).
    // Un 401 fa scattare AUTH_EXPIRED_EVENT e quindi il logout.
    useEffect(() => {
        if (!readStorage("token")) return;
        let cancelled = false;
        apiRequest<User>("GET", "/api/auth/me")
            .then((fresh) => {
                if (cancelled) return;
                setUser(fresh);
                try {
                    localStorage.setItem("user", JSON.stringify(fresh));
                } catch {
                    // Ignoro: la copia locale è solo una cache.
                }
            })
            .catch(() => {
                // Errore di rete: tengo la copia locale, l'app riproverà alla prossima richiesta.
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Token scaduto o non più valido: esco subito invece di lasciare l'app bloccata.
    useEffect(() => {
        window.addEventListener(AUTH_EXPIRED_EVENT, logout);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
    }, [logout]);

    const value = useMemo(
        () => ({ user, token, login, logout, isLoading }),
        [user, token, login, logout, isLoading],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
