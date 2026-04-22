import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../api/auth/types';

// Roles that see admin-level content via RolePageSwitch
export const ADMIN_ROLES: Role[] = ['CEO', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'];

// Roles that have BOTH a management view AND an employee view and can toggle between them.
// MANAGER always stays in admin view (no toggle needed).
// COMMERCIAL and EMPLOYEE have a single fixed view (no toggle).
export const TOGGLEABLE_ROLES: Role[] = ['HEAD_OF_DEPARTMENT', 'ACCOUNTANT'];

export function useIsAdmin(): boolean {
    const { role, viewMode } = useAuth();
    if (role === null || !ADMIN_ROLES.includes(role)) return false;
    return viewMode !== 'employee';
}

export function useHasRole(allowedRoles: Role[]): boolean {
    const { role } = useAuth();
    return role !== null && allowedRoles.includes(role);
}
