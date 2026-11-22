import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./auth";
import { AUTH_EXPIRED_EVENT } from "./queryClient";

interface SocketContextType {
    socket: WebSocket | null;
    isConnected: boolean;
    sendMessage: (type: string, payload: any) => void;
    subscribe: (type: string, callback: (payload: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [listeners, setListeners] = useState<Map<string, Set<(payload: any) => void>>>(new Map());
    const { token } = useAuth();

    useEffect(() => {
        if (!token) {
            if (socket) {
                socket.close();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setIsConnected(true);
        };

        ws.onclose = (event) => {
            setIsConnected(false);
            // 1008: il server ha rifiutato il token (scaduto o firmato con un altro segreto).
            if (event.code === 1008) {
                window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
            }
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const { type, payload } = data;
                const typeListeners = listeners.get(type);
                if (typeListeners) {
                    typeListeners.forEach((callback) => callback(payload));
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };

        setSocket(ws);

        return () => {
            ws.close();
        };
    }, [token]);

    useEffect(() => {
        if (!socket) return;

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const { type, payload } = data;
                const typeListeners = listeners.get(type);
                if (typeListeners) {
                    typeListeners.forEach((callback) => callback(payload));
                }
            } catch (error) {
                console.error("Failed to parse WebSocket message:", error);
            }
        };
    }, [socket, listeners]);

    const sendMessage = (type: string, payload: any) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type, payload }));
        }
    };

    const subscribe = (type: string, callback: (payload: any) => void) => {
        setListeners((prev) => {
            const newListeners = new Map(prev);
            if (!newListeners.has(type)) {
                newListeners.set(type, new Set());
            }
            newListeners.get(type)!.add(callback);
            return newListeners;
        });

        return () => {
            setListeners((prev) => {
                const newListeners = new Map(prev);
                const typeListeners = newListeners.get(type);
                if (typeListeners) {
                    typeListeners.delete(callback);
                    if (typeListeners.size === 0) {
                        newListeners.delete(type);
                    }
                }
                return newListeners;
            });
        };
    };

    return (
        <SocketContext.Provider value={{ socket, isConnected, sendMessage, subscribe }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error("useSocket must be used within a SocketProvider");
    }
    return context;
}
