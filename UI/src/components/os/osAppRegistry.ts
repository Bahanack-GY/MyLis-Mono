import {
  Compass,
  Contact,
  CheckSquare,
  Rocket,
  Landmark,
  Library,
  LifeBuoy,
  CreditCard,
  Inbox,
  Coins,
  Users,
  Orbit,
  CalendarClock,
  GraduationCap,
  AlertTriangle,
  Megaphone,
  Mail,
  CircleUser,
} from 'lucide-react';
import type { AppDefinition } from './types';

export type RoleAwareAppDefinition = AppDefinition & {
  roles: string[];
};

const ALL_ROLES = ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT', 'EMPLOYEE'] as const;

export const appRegistry: RoleAwareAppDefinition[] = [
  // ── Common to most roles ──────────────────────────────────────────────
  { id: 'dashboard',     label: 'Dashboard',     icon: Compass,       gradient: 'linear-gradient(135deg, #007AFF 0%, #0056D4 100%)',  route: '/embed/dashboard',     defaultWidth: 1000, defaultHeight: 700, roles: [...ALL_ROLES] },
  { id: 'tasks',         label: 'Tasks',         icon: CheckSquare,   gradient: 'linear-gradient(135deg, #34C759 0%, #24A247 100%)',  route: '/embed/tasks',         defaultWidth: 900,  defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'projects',      label: 'Projects',      icon: Rocket,        gradient: 'linear-gradient(135deg, #AF52DE 0%, #8D32B8 100%)',  route: '/embed/projects',      defaultWidth: 960,  defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'tickets',       label: 'Tickets',       icon: LifeBuoy,      gradient: 'linear-gradient(135deg, #FF3B30 0%, #D82117 100%)',  route: '/embed/tickets',       defaultWidth: 900,  defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'meetings',      label: 'Meetings',      icon: CalendarClock, gradient: 'linear-gradient(135deg, #30CBD8 0%, #007AFF 100%)',  route: '/embed/meetings',      defaultWidth: 960,  defaultHeight: 650, roles: [...ALL_ROLES] },
  { id: 'documents',     label: 'Documents',     icon: Library,       gradient: 'linear-gradient(135deg, #FFCC00 0%, #E0A800 100%)',  route: '/embed/documents',     defaultWidth: 900,  defaultHeight: 620, roles: [...ALL_ROLES] },
  { id: 'demands',       label: 'Demands',       icon: Inbox,         gradient: 'linear-gradient(135deg, #FF2D55 0%, #D41A40 100%)',  route: '/embed/demands',       defaultWidth: 900,  defaultHeight: 620, roles: [...ALL_ROLES] },
  { id: 'notifications', label: 'Notifications', icon: Megaphone,     gradient: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)',  route: '/embed/notifications', defaultWidth: 800,  defaultHeight: 560, roles: [...ALL_ROLES] },
  { id: 'messages',      label: 'Messages',      icon: Mail,          gradient: 'linear-gradient(135deg, #34C759 0%, #30CBD8 100%)',  route: '/embed/messages',      defaultWidth: 960,  defaultHeight: 700, roles: [...ALL_ROLES] },
  { id: 'profile',       label: 'Profile',       icon: CircleUser,    gradient: 'linear-gradient(135deg, #8E8E93 0%, #6D6D72 100%)',  route: '/embed/profile',       defaultWidth: 900,  defaultHeight: 650, roles: [...ALL_ROLES] },

  // ── Admin-only apps ───────────────────────────────────────────────────
  { id: 'employees',   label: 'Employees',   icon: Contact,    gradient: 'linear-gradient(135deg, #FF9500 0%, #E07300 100%)',  route: '/embed/employees',   defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
  { id: 'departments', label: 'Departments', icon: Landmark,   gradient: 'linear-gradient(135deg, #1C1C1E 0%, #0A0A0C 100%)',  route: '/embed/departments', defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
  { id: 'invoices',    label: 'Invoices',    icon: CreditCard, gradient: 'linear-gradient(135deg, #30CBD8 0%, #22A0AA 100%)',  route: '/embed/invoices',    defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
  { id: 'expenses',    label: 'Expenses',    icon: Coins,      gradient: 'linear-gradient(135deg, #34C759 0%, #24A247 100%)',  route: '/embed/expenses',    defaultWidth: 900, defaultHeight: 620, roles: ['MANAGER', 'ACCOUNTANT'] },
  { id: 'clients',     label: 'Clients',     icon: Users,      gradient: 'linear-gradient(135deg, #5856D6 0%, #4644B3 100%)',  route: '/embed/clients',     defaultWidth: 960, defaultHeight: 650, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
  { id: 'activity',    label: 'Activity',    icon: Orbit,      gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',  route: '/embed/activity',    defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER'] },

  // ── User / employee apps ──────────────────────────────────────────────
  { id: 'formations', label: 'Formations', icon: GraduationCap, gradient: 'linear-gradient(135deg, #5856D6 0%, #4644B3 100%)',  route: '/embed/formations', defaultWidth: 900, defaultHeight: 620, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
  { id: 'sanctions',  label: 'Sanctions',  icon: AlertTriangle, gradient: 'linear-gradient(135deg, #FF9500 0%, #E07300 100%)',  route: '/embed/sanctions',  defaultWidth: 900, defaultHeight: 600, roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'EMPLOYEE'] },
];

/**
 * Returns the subset of apps visible to a given role.
 * If the role is not recognised, an empty array is returned.
 */
export function getAppsForRole(role: string): RoleAwareAppDefinition[] {
  return appRegistry.filter((app) => app.roles.includes(role));
}
