import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useAuth } from "./auth";
import { AUTH_EXPIRED_EVENT } from "./queryClient";

/* eslint-disable @typescript-eslint/no-explicit-any -- i payload degli eventi variano per tipo */
type Listener = (payload: any) => void;

interface SocketContextType {
    isConnected: boolean;
    sendMessage: (type: string, payload: unknown) => void;
    subscribe: (type: string, callback: Listener) => () => void;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Connessione in tempo reale. Il token non va nella URL: lo mando come primo messaggio.
 * Se la connessione cade riprovo con attese crescenti (1 s, 2 s, 4 s… fino a 30 s).
 */
export function SocketProvider({ children }: { children: ReactNode }) {
    const { token } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<WebSocket | null>(null);
    // I listener stanno in un ref: aggiungerli o toglierli non deve ridisegnare l'app.
    const listenersRef = useRef(new Map<string, Set<Listener>>());

    useEffect(() => {
        if (!token) return;

        let closedByUs = false;
        let attempt = 0;
        let retryTimer: ReturnType<typeof setTimeout> | undefined;

        const connect = () => {
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
            socketRef.current = ws;

            ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token }));

            ws.onmessage = (event) => {
                let data: { type?: string; payload?: unknown };
                try {
                    data = JSON.parse(event.data);
                } catch {
                    return;
                }
                if (data.type === "auth:ok") {
                    attempt = 0;
                    setIsConnected(true);
                    // Dopo una riconnessione possono essere arrivati messaggi: lo segnalo a chi ascolta.
                    listenersRef.current.get("socket:ready")?.forEach((listener) => listener({}));
                    return;
                }
                if (data.type) {
                    listenersRef.current
                        .get(data.type)
                        ?.forEach((listener) => listener(data.payload));
                }
            };

            ws.onclose = (event) => {
                setIsConnected(false);
                if (socketRef.current === ws) socketRef.current = null;
                if (closedByUs) return;
                // 1008: il server ha rifiutato il token (scaduto o firmato con un altro segreto).
                if (event.code === 1008) {
                    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
                    return;
                }
                const delay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
                attempt += 1;
                retryTimer = setTimeout(connect, delay);
            };
        };

        connect();

        return () => {
            closedByUs = true;
            clearTimeout(retryTimer);
            socketRef.current?.close();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [token]);

    const sendMessage = useCallback((type: string, payload: unknown) => {
        const ws = socketRef.current;
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type, payload }));
        }
    }, []);

    const subscribe = useCallback((type: string, callback: Listener) => {
        const listeners = listenersRef.current;
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(callback);
        return () => {
            listeners.get(type)?.delete(callback);
        };
    }, []);

    const value = useMemo(
        () => ({ isConnected, sendMessage, subscribe }),
        [isConnected, sendMessage, subscribe],
    );

    return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
