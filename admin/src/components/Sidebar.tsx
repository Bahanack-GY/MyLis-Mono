import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  Building,
  ListChecks,
  Ticket,
  Receipt,
  UserCircle,
  Activity,
  Calendar,
  MessageSquare,
  HandCoins,
  Wallet,
  Banknote,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '../api/auth/hooks';
import { useAuth } from '../contexts/AuthContext';
import logo from '../assets/Logo.png';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

type MenuItem = { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; path: string; managerOnly?: boolean };
type Section = { key: string; items: MenuItem[] };

const ALL_SECTIONS: Section[] = [
  {
    key: 'work',
    items: [
      { icon: LayoutDashboard, label: 'dashboard',  path: '/dashboard' },
      { icon: ListChecks,      label: 'tasks',      path: '/tasks' },
      { icon: Briefcase,       label: 'projects',   path: '/projects' },
      { icon: FileText,        label: 'documents',  path: '/documents' },
    ],
  },
  {
    key: 'people',
    items: [
      { icon: Users,       label: 'employees',   path: '/employees' },
      { icon: Building,    label: 'departments', path: '/departments' },
      { icon: UserCircle,  label: 'clients',     path: '/clients' },
    ],
  },
  {
    key: 'finance',
    items: [
      { icon: Receipt,    label: 'invoices',  path: '/invoices' },
      { icon: Wallet,     label: 'expenses',  path: '/expenses',  managerOnly: true },
      { icon: Banknote,   label: 'salaries',  path: '/salaries' },
      { icon: HandCoins,  label: 'demands',   path: '/demands' },
    ],
  },
  {
    key: 'comms',
    items: [
      { icon: MessageSquare, label: 'messages', path: '/messages' },
      { icon: Calendar,      label: 'meetings', path: '/meetings' },
      { icon: Ticket,        label: 'tickets',  path: '/tickets' },
      { icon: Activity,      label: 'activity', path: '/activity', managerOnly: true },
    ],
  },
];

const ACCOUNTANT_SECTIONS: Section[] = [
  {
    key: 'work',
    items: [
      { icon: LayoutDashboard, label: 'dashboard', path: '/dashboard' },
      { icon: FileText,        label: 'documents', path: '/documents' },
    ],
  },
  {
    key: 'people',
    items: [
      { icon: UserCircle, label: 'clients', path: '/clients' },
    ],
  },
  {
    key: 'finance',
    items: [
      { icon: Receipt,   label: 'invoices',  path: '/invoices' },
      { icon: Wallet,    label: 'expenses',  path: '/expenses' },
      { icon: Banknote,  label: 'salaries',  path: '/salaries' },
      { icon: HandCoins, label: 'demands',   path: '/demands' },
    ],
  },
  {
    key: 'comms',
    items: [
      { icon: MessageSquare, label: 'messages',  path: '/messages' },
      { icon: Calendar,      label: 'meetings',  path: '/meetings' },
      { icon: Ticket,        label: 'tickets',   path: '/tickets' },
    ],
  },
];

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useLogout();
  const { role } = useAuth();
  const isHOD = role === 'HEAD_OF_DEPARTMENT';
  const isAccountant = role === 'ACCOUNTANT';

  const rawSections = isAccountant ? ACCOUNTANT_SECTIONS : ALL_SECTIONS;

  // For HOD: filter out managerOnly items from each section, remove empty sections
  const sections = rawSections
    .map(section => ({
      ...section,
      items: isHOD ? section.items.filter(i => !i.managerOnly) : section.items,
    }))
    .filter(section => section.items.length > 0);

  const renderItem = (item: MenuItem) => {
    const isActive = location.pathname.startsWith(item.path);
    return (
      <div
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`
          flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group relative
          ${isActive
            ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }
        `}
      >
        <item.icon size={20} className={`min-w-[20px] ${!isActive ? 'group-hover:text-[#33cbcc]' : ''}`} />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
            >
              {t(`sidebar.${item.label}`)}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Tooltip when collapsed */}
        {!isSidebarOpen && (
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {t(`sidebar.${item.label}`)}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      animate={{ width: isSidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
      className="h-screen bg-[#283852] text-white flex flex-col relative shadow-2xl z-50"
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-white/5">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain min-w-[32px]" />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-lg whitespace-nowrap overflow-hidden tracking-tight"
              >
                MyLIS
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="absolute -right-3 top-[52px] bg-[#33cbcc] p-1 rounded-full shadow-lg hover:bg-[#2bb5b6] transition-colors z-50"
      >
        {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
        {sections.map((section, si) => (
          <div key={section.key}>
            {/* Section divider */}
            {si > 0 && (
              isSidebarOpen
                ? <div className="pt-4 pb-1 px-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {t(`sidebar.sections.${section.key}`)}
                    </span>
                  </div>
                : <div className="my-3 mx-2 border-t border-white/5" />
            )}
            {/* First section label (only when open) */}
            {si === 0 && isSidebarOpen && (
              <div className="pb-1 px-1">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {t(`sidebar.sections.${section.key}`)}
                </span>
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(renderItem)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-white/5">
        <div
          onClick={logout}
          className="flex items-center p-3 rounded-xl cursor-pointer text-gray-500 hover:bg-red-400/10 hover:text-red-400 transition-colors group relative"
        >
          <LogOut size={20} className="min-w-[20px]" />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
              >
                {t('sidebar.logout')}
              </motion.span>
            )}
          </AnimatePresence>
          {!isSidebarOpen && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {t('sidebar.logout')}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;
