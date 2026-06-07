import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import { useProfile } from '../api/auth/hooks';
import type { UserProfile, Role } from '../api/auth/types';

export type ViewMode = 'admin' | 'employee';

interface AuthContextValue {
  user: UserProfile | null;
  role: Role | null;
  departmentId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  role: null,
  departmentId: null,
  isAuthenticated: false,
  isLoading: true,
  viewMode: 'admin',
  setViewMode: () => {},
  setToken: () => {},
});

const VIEW_MODE_KEY = 'view_mode';

function loadViewMode(): ViewMode {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  return saved === 'employee' ? 'employee' : 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem('access_token'));
  const [viewMode, setViewModeState] = useState<ViewMode>(loadViewMode);

  const setToken = (newToken: string | null) => {
  if (newToken) {
  localStorage.setItem('access_token', newToken);
  } else {
  localStorage.removeItem('access_token');
  localStorage.removeItem(VIEW_MODE_KEY);
  }
  setTokenState(newToken);
  setViewModeState('admin'); // reset on login/logout
  };

  const setViewMode = useCallback((mode: ViewMode) => {
  localStorage.setItem(VIEW_MODE_KEY, mode);
  setViewModeState(mode);
  }, []);

  const { data: profile, isLoading } = useProfile(token);

  // CEO's default view is the manager view; apply once when profile first loads
  // and no explicit preference has been saved yet.
  useEffect(() => {
  if (profile?.role === 'CEO' && !localStorage.getItem(VIEW_MODE_KEY)) {
  setViewMode('employee');
  }
  }, [profile?.role, setViewMode]);

  const value = useMemo<AuthContextValue>(() => {
  if (!token) {
  return { user: null, role: null, departmentId: null, isAuthenticated: false, isLoading: false, viewMode: 'admin', setViewMode, setToken };
  }

  if (isLoading) {
  return { user: null, role: null, departmentId: null, isAuthenticated: false, isLoading: true, viewMode, setViewMode, setToken };
  }

  if (profile) {
  return {
  user: profile,
  role: profile.role,
  departmentId: profile.departmentId,
  isAuthenticated: true,
  isLoading: false,
  viewMode,
  setViewMode,
  setToken,
  };
  }

  return { user: null, role: null, departmentId: null, isAuthenticated: false, isLoading: false, viewMode: 'admin', setViewMode, setToken };
  }, [profile, isLoading, token, viewMode, setViewMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function useDepartmentScope(): string | undefined {
  const { role, departmentId } = useAuth();
  return role === 'HEAD_OF_DEPARTMENT' ? (departmentId ?? undefined) : undefined;
}
