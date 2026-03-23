import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextValue {
    socket: Socket | null;
    isConnected: boolean;
    onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextValue>({
    socket: null,
    isConnected: false,
    onlineUsers: new Set(),
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!isAuthenticated) {
            setSocket(prev => {
                prev?.disconnect();
                return null;
            });
            setIsConnected(false);
            setOnlineUsers(new Set());
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) return;

        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3025';

        const newSocket = io(apiUrl, {
            // Use a function so the latest token is read on every reconnect attempt,
            // not the stale value captured at socket creation time.
            auth: (cb) => cb({ token: localStorage.getItem('access_token') }),
            transports: ['websocket'],
            upgrade: false,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            reconnectionAttempts: Infinity,
        });

        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        // If the server rejects the connection (expired/invalid JWT), stop the
        // infinite reconnect loop — the auth context will handle re-login.
        newSocket.on('connect_error', (err) => {
            setIsConnected(false);
            const msg = (err?.message ?? '').toLowerCase();
            if (msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('auth')) {
                newSocket.disconnect();
            }
        });

        newSocket.on('users:online', (userIds: string[]) => {
            setOnlineUsers(new Set(userIds));
        });

        newSocket.on('user:online', (data: { userId: string }) => {
            setOnlineUsers(prev => new Set([...prev, data.userId]));
        });

        newSocket.on('user:offline', (data: { userId: string }) => {
            setOnlineUsers(prev => {
                const next = new Set(prev);
                next.delete(data.userId);
                return next;
            });
        });

        return () => {
            newSocket.disconnect();
            setSocket(null);
            setIsConnected(false);
        };
    }, [isAuthenticated]);

    return (
        <SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
            {children}
        </SocketContext.Provider>
    );
};
