import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Bell,
    Search,
    Settings,
    ListChecks,
    Briefcase,
    Calendar,
    FileText,
    Ticket,
    CheckCheck,
    Circle,
    Clock,
    CalendarDays,
    MessageSquare,
} from 'lucide-react';

import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../../api/notifications/hooks';
import type { NotificationType } from '../../api/notifications/types';

/* ─── Constants ─────────────────────────────────────────── */

const TYPE_COLORS: Record<NotificationType, string> = {
    system: '#6b7280',
    task: '#f59e0b',
    project: '#3b82f6',
    meeting: '#8b5cf6',
    document: '#33cbcc',
    ticket: '#ef4444',
    message: '#10b981',
    chat: '#10b981',
};

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
    system: Settings,
    task: ListChecks,
    project: Briefcase,
    meeting: Calendar,
    document: FileText,
    ticket: Ticket,
    message: MessageSquare,
    chat: MessageSquare,
};

const NOTIFICATION_TYPES: NotificationType[] = ['system', 'task', 'project', 'meeting', 'document', 'ticket', 'message', 'chat'];


/* ─── Helper ────────────────────────────────────────────── */

function getRelativeTime(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
}


/* ─── Component ─────────────────────────────────────────── */

const Notifications = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: notifications = [] } = useNotifications();
    const markAsReadMut = useMarkAsRead();
    const markAllAsReadMut = useMarkAllAsRead();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
    const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');

    /* Filtered */
    const filteredNotifications = notifications.filter(n => {
        const matchesSearch =
            n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.body.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === 'all' || n.type === filterType;
        const matchesRead = filterRead === 'all' ||
            (filterRead === 'read' && n.read) ||
            (filterRead === 'unread' && !n.read);
        return matchesSearch && matchesType && matchesRead;
    });

    /* Stats */
    const unreadCount = notifications.filter(n => !n.read).length;
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = notifications.filter(n => n.createdAt.startsWith(todayStr)).length;
    const thisWeekCount = notifications.filter(n => {
        const diff = Date.now() - new Date(n.createdAt).getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const stats = [
        { label: t('notifications.stats.total'), value: notifications.length, icon: Bell, color: '#33cbcc' },
        { label: t('notifications.stats.unread'), value: unreadCount, icon: Circle, color: '#ef4444' },
        { label: t('notifications.stats.today'), value: todayCount, icon: CalendarDays, color: '#3b82f6' },
        { label: t('notifications.stats.thisWeek'), value: thisWeekCount, icon: Clock, color: '#8b5cf6' },
    ];

    /* Type filter pills */
    const typeFilters: { key: NotificationType | 'all'; label: string }[] = [
        { key: 'all', label: t('notifications.filterAll') },
        ...NOTIFICATION_TYPES.map(tp => ({ key: tp as NotificationType, label: t(`notifications.types.${tp}`) })),
    ];

    /* Read filter pills */
    const readFilters: { key: 'all' | 'read' | 'unread'; label: string }[] = [
        { key: 'all', label: t('notifications.filterAll') },
        { key: 'unread', label: t('notifications.filterUnread') },
        { key: 'read', label: t('notifications.filterRead') },
    ];

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('notifications.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('notifications.subtitle')}</p>
                </div>
                <button
                    onClick={() => markAllAsReadMut.mutate()}
                    disabled={unreadCount === 0}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        unreadCount > 0
                            ? 'bg-[#33cbcc] text-white hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                >
                    <CheckCheck size={16} />
                    {t('notifications.markAllRead')}
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Search + Read/Unread Toggle ── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('notifications.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                </div>
                <div className="flex bg-white rounded-xl border border-gray-100 p-1">
                    {readFilters.map(rf => (
                        <button
                            key={rf.key}
                            onClick={() => setFilterRead(rf.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                filterRead === rf.key
                                    ? 'bg-[#33cbcc] text-white'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {rf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Type Filter Pills ── */}
            <div className="flex gap-2 flex-wrap">
                {typeFilters.map(tf => (
                    <button
                        key={tf.key}
                        onClick={() => setFilterType(tf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterType === tf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {tf.key !== 'all' && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterType === tf.key ? '#fff' : TYPE_COLORS[tf.key] }} />
                        )}
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* ── Notification List ── */}
            {filteredNotifications.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {filteredNotifications.map((notif, i) => {
                        const TypeIcon = TYPE_ICONS[notif.type as NotificationType] || Bell;
                        const typeColor = TYPE_COLORS[notif.type as NotificationType] || '#6b7280';
                        return (
                            <motion.div
                                key={notif.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => {
                                    if (!notif.read) markAsReadMut.mutate(notif.id);
                                    if (notif.type === 'message' || notif.type === 'chat') {
                                        navigate(notif.meta?.channelId ? `/messages?channel=${notif.meta.channelId}` : '/messages');
                                    }
                                }}
                                className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50/50 ${
                                    !notif.read ? 'bg-[#33cbcc]/5' : ''
                                }`}
                            >
                                {/* Unread dot */}
                                <div className="pt-2.5 shrink-0 w-2">
                                    {!notif.read && (
                                        <span className="block w-2 h-2 rounded-full bg-[#33cbcc]" />
                                    )}
                                </div>

                                {/* Type icon */}
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${typeColor}15` }}>
                                    <TypeIcon size={16} style={{ color: typeColor }} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className={`text-sm truncate ${!notif.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-sm text-gray-500 truncate mt-0.5">{notif.body}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${typeColor}15`, color: typeColor }}>
                                                    {t(`notifications.types.${notif.type}`)}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
                                            {getRelativeTime(notif.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredNotifications.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <Bell size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">
                        {unreadCount === 0 && filterRead === 'unread'
                            ? t('notifications.allRead')
                            : t('notifications.noResults')
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default Notifications;
