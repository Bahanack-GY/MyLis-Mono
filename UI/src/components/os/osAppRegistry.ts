import { CompassIcon, Contact01Icon, Task01Icon, Rocket01Icon, BankIcon, BookOpen01Icon, LifebuoyIcon, CreditCardIcon, InboxIcon, Coins01Icon, UserGroupIcon, Globe02Icon, Calendar01Icon, GraduationScrollIcon, Alert02Icon, Megaphone01Icon, Mail01Icon, UserCircleIcon } from 'hugeicons-react';
import type { AppDefinition } from './types';

export type RoleAwareAppDefinition = AppDefinition & {
  roles: string[];
};

const ALL_ROLES = ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'EMPLOYEE'] as const;

export const appRegistry: RoleAwareAppDefinition[] = [
  // ── Common to most roles ──────────────────────────────────────────────
  { id: 'dashboard',     label: 'Dashboard',     icon: CompassIcon,       gradient: 'linear-gradient(135deg, #007AFF 0%, #0056D4 100%)',  route: '/embed/dashboard',     defaultWidth: 1000, defaultHeight: 700, roles: [...ALL_ROLES] },
  { id: 'tasks',         label: 'Tasks',         icon: Task01Icon,   gradient: 'linear-gradient(135deg, #34C759 0%, #24A247 100%)',  route: '/embed/tasks',         defaultWidth: 900,  defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'projects',      label: 'Projects',      icon: Rocket01Icon,        gradient: 'linear-gradient(135deg, #AF52DE 0%, #8D32B8 100%)',  route: '/embed/projects',      defaultWidth: 960,  defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'tickets',       label: 'Tickets',       icon: LifebuoyIcon,      gradient: 'linear-gradient(135deg, #FF3B30 0%, #D82117 100%)',  route: '/embed/tickets',       defaultWidth: 900,  defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'meetings',      label: 'Meetings',      icon: Calendar01Icon, gradient: 'linear-gradient(135deg, #30CBD8 0%, #007AFF 100%)',  route: '/embed/meetings',      defaultWidth: 960,  defaultHeight: 650, roles: [...ALL_ROLES] },
  { id: 'documents',     label: 'Documents',     icon: BookOpen01Icon,       gradient: 'linear-gradient(135deg, #FFCC00 0%, #E0A800 100%)',  route: '/embed/documents',     defaultWidth: 900,  defaultHeight: 620, roles: [...ALL_ROLES] },
  { id: 'demands',       label: 'Demands',       icon: InboxIcon,         gradient: 'linear-gradient(135deg, #FF2D55 0%, #D41A40 100%)',  route: '/embed/demands',       defaultWidth: 900,  defaultHeight: 620, roles: [...ALL_ROLES] },
  { id: 'notifications', label: 'Notifications', icon: Megaphone01Icon,     gradient: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)',  route: '/embed/notifications', defaultWidth: 800,  defaultHeight: 560, roles: [...ALL_ROLES] },
  { id: 'messages',      label: 'Messages',      icon: Mail01Icon,          gradient: 'linear-gradient(135deg, #34C759 0%, #30CBD8 100%)',  route: '/embed/messages',      defaultWidth: 960,  defaultHeight: 700, roles: [...ALL_ROLES] },
  { id: 'profile',       label: 'Profile',       icon: UserCircleIcon,    gradient: 'linear-gradient(135deg, #8E8E93 0%, #6D6D72 100%)',  route: '/embed/profile',       defaultWidth: 900,  defaultHeight: 650, roles: [...ALL_ROLES] },

  // ── Admin-only apps ───────────────────────────────────────────────────
  { id: 'employees',   label: 'Employees',   icon: Contact01Icon,    gradient: 'linear-gradient(135deg, #FF9500 0%, #E07300 100%)',  route: '/embed/employees',   defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
  { id: 'departments', label: 'Departments', icon: BankIcon,   gradient: 'linear-gradient(135deg, #1C1C1E 0%, #0A0A0C 100%)',  route: '/embed/departments', defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
  { id: 'invoices',    label: 'Invoices',    icon: CreditCardIcon, gradient: 'linear-gradient(135deg, #30CBD8 0%, #22A0AA 100%)',  route: '/embed/invoices',    defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
  { id: 'expenses',    label: 'Expenses',    icon: Coins01Icon,      gradient: 'linear-gradient(135deg, #34C759 0%, #24A247 100%)',  route: '/embed/expenses',    defaultWidth: 900, defaultHeight: 620, roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'clients',     label: 'Clients',     icon: UserGroupIcon,      gradient: 'linear-gradient(135deg, #5856D6 0%, #4644B3 100%)',  route: '/embed/clients',     defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
  { id: 'activity',    label: 'Activity',    icon: Globe02Icon,      gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',  route: '/embed/activity',    defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER'] },

  // ── User / employee apps ──────────────────────────────────────────────
  { id: 'formations', label: 'Formations', icon: GraduationScrollIcon, gradient: 'linear-gradient(135deg, #5856D6 0%, #4644B3 100%)',  route: '/embed/formations', defaultWidth: 900, defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'sanctions',  label: 'Sanctions',  icon: Alert02Icon, gradient: 'linear-gradient(135deg, #FF9500 0%, #E07300 100%)',  route: '/embed/sanctions',  defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
];

/**
 * Returns the subset of apps visible to a given role.
 * If the role is not recognised, an empty array is returned.
 */
export function getAppsForRole(role: string): RoleAwareAppDefinition[] {
  return appRegistry.filter((app) => app.roles.includes(role));
}
