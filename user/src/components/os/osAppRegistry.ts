import {
  Compass,
  CheckSquare,
  Rocket,
  LifeBuoy,
  CalendarClock,
  Library,
  GraduationCap,
  AlertTriangle,
  Inbox,
  Megaphone,
  Mail,
  CircleUser,
} from 'lucide-react';
import type { AppDefinition } from './types';

export const appRegistry: AppDefinition[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Compass, gradient: 'linear-gradient(135deg, #007AFF 0%, #0056D4 100%)', route: '/embed/dashboard', defaultWidth: 1000, defaultHeight: 700 },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, gradient: 'linear-gradient(135deg, #34C759 0%, #24A247 100%)', route: '/embed/tasks', defaultWidth: 900, defaultHeight: 620 },
  { id: 'projects', label: 'Projects', icon: Rocket, gradient: 'linear-gradient(135deg, #AF52DE 0%, #8D32B8 100%)', route: '/embed/projects', defaultWidth: 960, defaultHeight: 650 },
  { id: 'tickets', label: 'Tickets', icon: LifeBuoy, gradient: 'linear-gradient(135deg, #FF3B30 0%, #D82117 100%)', route: '/embed/tickets', defaultWidth: 900, defaultHeight: 620 },
  { id: 'meetings', label: 'Meetings', icon: CalendarClock, gradient: 'linear-gradient(135deg, #30CBD8 0%, #007AFF 100%)', route: '/embed/meetings', defaultWidth: 960, defaultHeight: 650 },
  { id: 'documents', label: 'Documents', icon: Library, gradient: 'linear-gradient(135deg, #FFCC00 0%, #E0A800 100%)', route: '/embed/documents', defaultWidth: 900, defaultHeight: 620 },
  { id: 'formations', label: 'Formations', icon: GraduationCap, gradient: 'linear-gradient(135deg, #5856D6 0%, #4644B3 100%)', route: '/embed/formations', defaultWidth: 900, defaultHeight: 620 },
  { id: 'sanctions', label: 'Sanctions', icon: AlertTriangle, gradient: 'linear-gradient(135deg, #FF9500 0%, #E07300 100%)', route: '/embed/sanctions', defaultWidth: 900, defaultHeight: 600 },
  { id: 'demands', label: 'Demands', icon: Inbox, gradient: 'linear-gradient(135deg, #FF2D55 0%, #D41A40 100%)', route: '/embed/demands', defaultWidth: 900, defaultHeight: 620 },
  { id: 'notifications', label: 'Notifications', icon: Megaphone, gradient: 'linear-gradient(135deg, #FFCC00 0%, #FF9500 100%)', route: '/embed/notifications', defaultWidth: 800, defaultHeight: 560 },
  { id: 'messages', label: 'Messages', icon: Mail, gradient: 'linear-gradient(135deg, #34C759 0%, #30CBD8 100%)', route: '/embed/messages', defaultWidth: 960, defaultHeight: 700 },
  { id: 'profile', label: 'Profile', icon: CircleUser, gradient: 'linear-gradient(135deg, #8E8E93 0%, #6D6D72 100%)', route: '/embed/profile', defaultWidth: 900, defaultHeight: 650 },
];
