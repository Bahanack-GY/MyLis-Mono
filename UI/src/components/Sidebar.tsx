import { useState, useMemo } from 'react';
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
    CalendarRange,
    MessageSquare,
    HandCoins,
    Wallet,
    GraduationCap,
    AlertTriangle,
    MoreHorizontal,
    X,
    BookOpen,
    FileSpreadsheet,
    Calculator,
    CalendarCheck,
    PieChart,
    Scale,
    FileCheck,
    Target,
    Database,
    TrendingUp,
    Banknote,
    ArrowLeftRight,
    FileBarChart,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '../api/auth/hooks';
import { useAuth } from '../contexts/AuthContext';
import { TOGGLEABLE_ROLES } from '../hooks/useRoleAccess';
import type { Role } from '../api/auth/types';
import logo from '../assets/Logo.png';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

type MenuItem = {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    path: string;
    roles?: Role[];
};

type Section = {
    key: string;
    items: MenuItem[];
    roles?: Role[];
};

const ALL_SECTIONS: Section[] = [
    {
        key: 'work',
        items: [
            { icon: LayoutDashboard, label: 'dashboard', path: '/dashboard' },
            { icon: ListChecks, label: 'tasks', path: '/tasks', roles: ['EMPLOYEE', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL'] },
            { icon: CalendarRange, label: 'planning', path: '/planning', roles: ['EMPLOYEE', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL'] },
            { icon: Briefcase, label: 'projects', path: '/projects', roles: ['EMPLOYEE', 'MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL'] },
            { icon: FileText, label: 'documents', path: '/documents', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
            { icon: FileCheck, label: 'myPayslips', path: '/my-payslips' },
            { icon: FileBarChart, label: 'reports', path: '/reports' },
        ],
    },
    {
        key: 'people',
        roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'],
        items: [
            { icon: Users, label: 'employees', path: '/employees', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
            { icon: Building, label: 'departments', path: '/departments', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
            { icon: UserCircle, label: 'clients', path: '/clients', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
        ],
    },
    {
        key: 'requests',
        roles: ['EMPLOYEE', 'COMMERCIAL'],
        items: [
            { icon: Ticket, label: 'tickets', path: '/tickets' },
            { icon: HandCoins, label: 'demands', path: '/demands' },
            { icon: Banknote, label: 'businessExpenses', path: '/business-expenses' },
            { icon: GraduationCap, label: 'formations', path: '/formations' },
        ],
    },
    {
        key: 'finance',
        roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'],
        items: [
            { icon: Receipt, label: 'invoices', path: '/invoices' },
            { icon: Wallet, label: 'expenses', path: '/expenses', roles: ['MANAGER', 'ACCOUNTANT'] },
            { icon: HandCoins, label: 'demands', path: '/demands' },
            { icon: Banknote, label: 'businessExpenses', path: '/business-expenses' },
        ],
    },
    {
        key: 'commercial',
        roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'COMMERCIAL'],
        items: [
            { icon: Target, label: 'commercialDashboard', path: '/commercial' },
            { icon: Database, label: 'leadsDatabase', path: '/commercial/leads' },
            { icon: TrendingUp, label: 'salesPipeline', path: '/commercial/pipeline' },
            { icon: BookOpen, label: 'clientFollowUp', path: '/commercial/follow-up', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT'] },
        ],
    },
    {
        key: 'accounting',
        roles: ['MANAGER', 'ACCOUNTANT'],
        items: [
            { icon: PieChart, label: 'accountingDashboard', path: '/accounting' },
            { icon: BookOpen, label: 'chartOfAccounts', path: '/accounting/accounts' },
            { icon: FileSpreadsheet, label: 'journalEntries', path: '/accounting/entries' },
            { icon: Scale, label: 'reports', path: '/accounting/reports' },
            { icon: FileBarChart, label: 'aiReports', path: '/accounting/ai-reports' },
            { icon: CalendarCheck, label: 'fiscalYears', path: '/accounting/fiscal-years' },
            { icon: Calculator, label: 'payroll', path: '/accounting/payroll' },
            { icon: Receipt, label: 'taxDeclarations', path: '/accounting/tax' },
        ],
    },
    {
        key: 'comms',
        items: [
            { icon: MessageSquare, label: 'messages', path: '/messages' },
            { icon: Calendar, label: 'meetings', path: '/meetings' },
            { icon: Ticket, label: 'tickets', path: '/tickets', roles: ['MANAGER', 'HEAD_OF_DEPARTMENT', 'ACCOUNTANT'] },
            { icon: FileText, label: 'documents', path: '/documents', roles: ['EMPLOYEE', 'COMMERCIAL'] },
            { icon: AlertTriangle, label: 'sanctions', path: '/sanctions', roles: ['EMPLOYEE', 'COMMERCIAL'] },
            { icon: Activity, label: 'activity', path: '/activity', roles: ['MANAGER'] },
        ],
    },
];

function filterSections(sections: Section[], role: Role | null): Section[] {
    if (!role) return [];

    return sections
        .filter(section => !section.roles || section.roles.includes(role))
        .map(section => ({
            ...section,
            items: section.items.filter(item => !item.roles || item.roles.includes(role)),
        }))
        .filter(section => section.items.length > 0);
}

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useLogout();
    const { role, viewMode, setViewMode } = useAuth();
    const [moreOpen, setMoreOpen] = useState(false);

    const canToggleView = role !== null && TOGGLEABLE_ROLES.includes(role);
    const effectiveRole: Role | null = canToggleView && viewMode === 'employee' ? 'EMPLOYEE' : role;

    // Label for the "management" side of the toggle, specific to each toggleable role
    const mgmtViewLabel = role === 'ACCOUNTANT'
        ? t('sidebar.accountingView', 'Comptabilité')
        : t('sidebar.hodView', 'Chef de département');

    const sections = useMemo(() => filterSections(ALL_SECTIONS, effectiveRole), [effectiveRole]);

    const allItems = useMemo(() => sections.flatMap(s => s.items), [sections]);

    // Mobile bottom nav: first 4 items + "More" button
    const mobileMainItems = allItems.slice(0, 4);
    const mobileMoreItems = allItems.slice(4);

    const isActive = (path: string) => location.pathname.startsWith(path);
    const isMoreActive = mobileMoreItems.some(item => isActive(item.path));

    const renderItem = (item: MenuItem) => {
        const active = isActive(item.path);
        const label = t(`sidebar.${item.label}`);
        return (
            <button
                key={item.path}
                onClick={() => navigate(item.path)}
                aria-label={!isSidebarOpen ? label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`
                    w-full text-left flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group relative
                    ${active
                        ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }
                `}
            >
                <item.icon size={20} aria-hidden="true" className={`min-w-[20px] ${!active ? 'group-hover:text-[#33cbcc]' : ''}`} />

                <AnimatePresence>
                    {isSidebarOpen && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden"
                        >
                            {label}
                        </motion.span>
                    )}
                </AnimatePresence>

                {/* Tooltip for collapsed state (aria-hidden: label already on button) */}
                {!isSidebarOpen && (
                    <div aria-hidden="true" className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                        {label}
                    </div>
                )}
            </button>
        );
    };

    // ── Desktop Sidebar (>= md) ──
    const DesktopSidebar = (
        <motion.div
            animate={{ width: isSidebarOpen ? 260 : 72 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
            className="hidden md:flex h-screen bg-[#283852] text-white flex-col relative shadow-2xl z-50"
        >
            {/* Header */}
            <div className="h-16 flex items-center justify-center px-4 border-b border-white/5">
                <div className="flex items-center gap-3 w-full overflow-hidden">
                    <img src={logo} alt="Logo" className="w-8 h-8 object-contain min-w-[32px]" />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="font-bold text-lg whitespace-nowrap overflow-hidden tracking-tight"
                            >
                                MyLIS
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? t('sidebar.collapse', 'Collapse sidebar') : t('sidebar.expand', 'Expand sidebar')}
                aria-expanded={isSidebarOpen}
                className="absolute -right-3 top-[52px] bg-[#33cbcc] p-1 rounded-full shadow-lg hover:bg-[#2bb5b6] transition-colors z-50"
            >
                {isSidebarOpen ? <ChevronLeft size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
            </button>

            {/* Navigation */}
            <nav aria-label={t('sidebar.mainNav', 'Main navigation')} className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
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
            </nav>

            {/* Footer / Logout */}
            <div className="p-3 border-t border-white/5 space-y-0.5">
                {/* View toggle — admin roles only */}
                {canToggleView && (
                    <button
                        onClick={() => setViewMode(viewMode === 'admin' ? 'employee' : 'admin')}
                        aria-label={!isSidebarOpen ? (viewMode === 'admin' ? t('sidebar.switchToEmployeeView', 'Vue employé') : t('sidebar.switchToMgmtView', 'Vue gestion')) : undefined}
                        className="w-full text-left flex items-center p-3 rounded-xl cursor-pointer transition-colors group relative text-gray-400 hover:bg-white/5 hover:text-[#33cbcc]"
                    >
                        <ArrowLeftRight size={20} aria-hidden="true" className="min-w-[20px]" />
                        <AnimatePresence>
                            {isSidebarOpen && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: 'auto' }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="ml-3 overflow-hidden"
                                >
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                        {t('sidebar.viewMode', 'Vue active')}
                                    </p>
                                    <p className="text-sm font-medium whitespace-nowrap text-white">
                                        {viewMode === 'admin'
                                            ? mgmtViewLabel
                                            : t('sidebar.employeeView', 'Employé')}
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {!isSidebarOpen && (
                            <div aria-hidden="true" className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                {viewMode === 'admin'
                                    ? t('sidebar.switchToEmployeeView', 'Passer en vue employé')
                                    : t('sidebar.switchToMgmtView', 'Passer en vue gestion')}
                            </div>
                        )}
                    </button>
                )}

                <button
                    onClick={logout}
                    aria-label={!isSidebarOpen ? t('sidebar.logout') : undefined}
                    className="w-full text-left flex items-center p-3 rounded-xl cursor-pointer text-gray-500 hover:bg-red-400/10 hover:text-red-400 transition-colors group relative"
                >
                    <LogOut size={20} aria-hidden="true" className="min-w-[20px]" />
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
                        <div aria-hidden="true" className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                            {t('sidebar.logout')}
                        </div>
                    )}
                </button>
            </div>
        </motion.div>
    );

    // ── Mobile Bottom Nav (< md) ──
    const MobileBottomNav = (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* "More" overlay menu */}
            <AnimatePresence>
                {moreOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setMoreOpen(false)}
                        />
                        {/* More panel */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-full left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 pb-2"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <span className="text-sm font-semibold text-[#283852]">{t('sidebar.more')}</span>
                                <button
                                    onClick={() => setMoreOpen(false)}
                                    aria-label={t('common.close', 'Close')}
                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} aria-hidden="true" className="text-gray-500" />
                                </button>
                            </div>
                            <div className="px-3 py-2 space-y-1">
                                {mobileMoreItems.map((item) => {
                                    const active = isActive(item.path);
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setMoreOpen(false);
                                            }}
                                            aria-current={active ? 'page' : undefined}
                                            className={`
                                                w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                                                ${active
                                                    ? 'bg-[#33cbcc]/10 text-[#283852]'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <item.icon
                                                size={20}
                                                aria-hidden="true"
                                                className={active ? 'text-[#33cbcc]' : 'text-gray-400'}
                                            />
                                            <span className="text-sm font-medium">{t(`sidebar.${item.label}`)}</span>
                                        </button>
                                    );
                                })}
                                {/* View toggle in more menu — admin roles only */}
                                {canToggleView && (
                                    <button
                                        onClick={() => {
                                            setViewMode(viewMode === 'admin' ? 'employee' : 'admin');
                                            setMoreOpen(false);
                                        }}
                                        className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 border-t border-gray-100 mt-1 pt-3 text-[#283852] hover:bg-[#33cbcc]/10"
                                    >
                                        <ArrowLeftRight size={20} aria-hidden="true" className="text-[#33cbcc]" />
                                        <div>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                                {t('sidebar.viewMode', 'Vue active')}
                                            </p>
                                            <p className="text-sm font-medium">
                                                {viewMode === 'admin'
                                                    ? t('sidebar.switchToEmployeeView', 'Passer en vue employé')
                                                    : t('sidebar.switchToMgmtView', 'Passer en vue gestion')}
                                            </p>
                                        </div>
                                    </button>
                                )}

                                {/* Logout in more menu */}
                                <button
                                    onClick={() => {
                                        setMoreOpen(false);
                                        logout();
                                    }}
                                    className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-gray-600 hover:bg-gray-50 transition-all duration-200 border-t border-gray-100 mt-1 pt-3"
                                >
                                    <LogOut size={20} aria-hidden="true" className="text-gray-400" />
                                    <span className="text-sm font-medium">{t('sidebar.logout')}</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom bar */}
            <nav aria-label={t('sidebar.mainNav', 'Main navigation')} className="bg-white border-t border-gray-200 px-2 py-2 flex items-center justify-around safe-bottom">
                {mobileMainItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            aria-current={active ? 'page' : undefined}
                            className={`
                                flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]
                                ${active ? 'text-[#33cbcc]' : 'text-gray-400'}
                            `}
                        >
                            <item.icon size={22} aria-hidden="true" />
                            <span className="text-[10px] font-medium leading-tight">
                                {t(`sidebar.${item.label}`)}
                            </span>
                        </button>
                    );
                })}
                {/* More button */}
                {mobileMoreItems.length > 0 && (
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        aria-expanded={moreOpen}
                        aria-haspopup="menu"
                        className={`
                            flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]
                            ${isMoreActive || moreOpen ? 'text-[#33cbcc]' : 'text-gray-400'}
                        `}
                    >
                        <MoreHorizontal size={22} aria-hidden="true" />
                        <span className="text-[10px] font-medium leading-tight">
                            {t('sidebar.more')}
                        </span>
                    </button>
                )}
            </nav>
        </div>
    );

    return (
        <>
            {DesktopSidebar}
            {MobileBottomNav}
        </>
    );
};

export default Sidebar;
