import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    LayoutDashboard,
    Receipt,
    Briefcase,
    Settings,
    ChevronLeft,
    ChevronRight,
    UserCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export type ClientTab = 'overview' | 'invoices' | 'projects' | 'settings';

interface ClientDetailSidebarProps {
    client: { id: string; name: string; type: string };
    activeTab: ClientTab;
    onTabChange: (tab: ClientTab) => void;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
    subscription: { bg: 'bg-violet-500/20', text: 'text-violet-400', label: 'Subscription' },
    one_time: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'One-time' },
};

const ClientDetailSidebar = ({ client, activeTab, onTabChange, isOpen, setIsOpen }: ClientDetailSidebarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const tabs: { id: ClientTab; icon: typeof LayoutDashboard; label: string }[] = [
        { id: 'overview', icon: LayoutDashboard, label: t('clientSidebar.overview') },
        { id: 'invoices', icon: Receipt, label: t('clientSidebar.invoices') },
        { id: 'projects', icon: Briefcase, label: t('clientSidebar.projects') },
        { id: 'settings', icon: Settings, label: t('clientSidebar.settings') },
    ];

    const badge = TYPE_BADGE[client.type] || TYPE_BADGE.one_time;

    return (
        <motion.div
            animate={{ width: isOpen ? 280 : 80 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
            className="h-screen bg-[#283852] text-white flex flex-col relative shadow-2xl z-50"
        >
            {/* Back Button */}
            <div className="px-4 pt-5 pb-2">
                <div
                    onClick={() => navigate('/clients')}
                    className="flex items-center gap-2 p-2 rounded-xl cursor-pointer text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                    <ArrowLeft size={20} className="min-w-[20px]" />
                    <AnimatePresence>
                        {isOpen && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="text-sm font-medium whitespace-nowrap overflow-hidden"
                            >
                                {t('clientSidebar.back')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Client Header */}
            <div className="px-4 py-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-11 h-11 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center flex-shrink-0">
                        <UserCircle size={20} className="text-[#33cbcc]" />
                    </div>
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="min-w-0 overflow-hidden"
                            >
                                <p className="font-semibold text-sm truncate">{client.name}</p>
                                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${badge.bg} ${badge.text}`}>
                                    {badge.label}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute -right-3 top-24 bg-[#33cbcc] p-1 rounded-full shadow-lg hover:bg-[#2bb5b6] transition-colors z-50"
            >
                {isOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Navigation Tabs */}
            <div className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                                flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group relative
                                ${isActive
                                    ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }
                            `}
                        >
                            <tab.icon size={22} className={`min-w-[22px] ${!isActive && 'group-hover:text-[#33cbcc]'}`} />

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-4 font-medium text-sm whitespace-nowrap overflow-hidden"
                                    >
                                        {tab.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* Tooltip for collapsed state */}
                            {!isOpen && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {tab.label}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default ClientDetailSidebar;
