import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useProfile } from '../api/auth/hooks';
import type { UserProfile, Role } from '../api/auth/types';

interface AuthContextValue {
    user: UserProfile | null;
    role: Role | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    role: null,
    isAuthenticated: false,
    isLoading: true,
    setToken: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setTokenState] = useState<string | null>(localStorage.getItem('access_token'));

    const setToken = (newToken: string | null) => {
        if (newToken) {
            localStorage.setItem('access_token', newToken);
        } else {
            localStorage.removeItem('access_token');
        }
        setTokenState(newToken);
    };

    const { data: profile, isLoading } = useProfile(token);

    const value = useMemo<AuthContextValue>(() => {
        if (!token) return { user: null, role: null, isAuthenticated: false, isLoading: false, setToken };
        if (isLoading) return { user: null, role: null, isAuthenticated: false, isLoading: true, setToken };
        if (profile) return { user: profile, role: profile.role, isAuthenticated: true, isLoading: false, setToken };
        return { user: null, role: null, isAuthenticated: false, isLoading: false, setToken };
    }, [profile, isLoading, token]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    return useContext(AuthContext);
}
