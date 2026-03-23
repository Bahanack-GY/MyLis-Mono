import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../api/auth/types';

export const ADMIN_ROLES: Role[] = ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'];

export function useIsAdmin(): boolean {
    const { role } = useAuth();
    return role !== null && ADMIN_ROLES.includes(role);
}

export function useHasRole(allowedRoles: Role[]): boolean {
    const { role } = useAuth();
    return role !== null && allowedRoles.includes(role);
}
