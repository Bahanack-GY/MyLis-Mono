import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Bell,
    Search,
    CheckCheck,
    Settings,
    ListChecks,
    FolderOpen,
    CalendarDays,
    FileText,
    Ticket,
    Clock,
    MessageSquare,
} from 'lucide-react';

import { useNotifications, useMarkAsRead, useMarkAllAsRead } from '../api/notifications/hooks';
import { UserNotificationsSkeleton } from '../components/Skeleton';

/* ─── Component ─────────────────────────────────────────── */

const TYPE_ICONS: Record<string, typeof Bell> = {
    system: Settings,
    task: ListChecks,
    project: FolderOpen,
    meeting: CalendarDays,
    document: FileText,
    ticket: Ticket,
    message: MessageSquare,
    chat: MessageSquare,
};

const Notifications = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    const { data: notifications = [], isLoading } = useNotifications();
    const markAsRead = useMarkAsRead();
    const markAllAsRead = useMarkAllAsRead();

    const filtered = notifications.filter(n => {
        if (search) {
            const q = search.toLowerCase();
            if (!n.title.toLowerCase().includes(q) && !n.body.toLowerCase().includes(q)) return false;
        }
        if (filter === 'unread' && n.read) return false;
        if (filter === 'read' && !n.read) return false;
        return true;
    });

    const unread = notifications.filter(n => !n.read).length;
    const today = notifications.filter(n => {
        const d = new Date(n.createdAt);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;
    const thisWeek = notifications.filter(n => {
        const d = new Date(n.createdAt);
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
    }).length;

    const stats = [
        { label: t('notifications.stats.total'), value: notifications.length, icon: Bell },
        { label: t('notifications.stats.unread'), value: unread, icon: Clock },
        { label: t('notifications.stats.today'), value: today, icon: CalendarDays },
        { label: t('notifications.stats.thisWeek'), value: thisWeek, icon: CheckCheck },
    ];

    const filters = [
        { key: 'all' as const, label: t('notifications.filterAll') },
        { key: 'unread' as const, label: t('notifications.filterUnread') },
        { key: 'read' as const, label: t('notifications.filterRead') },
    ];

    if (isLoading) {
        return <UserNotificationsSkeleton />;
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('notifications.title')}</h1>
                    <p className="text-gray-500 mt-1 text-sm">{t('notifications.subtitle')}</p>
                </div>
                {unread > 0 && (
                    <button
                        onClick={() => markAllAsRead.mutate()}
                        className="flex items-center justify-center gap-2 bg-[#283852] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1e2d42] transition-colors w-full md:w-auto"
                    >
                        <CheckCheck size={18} />
                        {t('notifications.markAllRead')}
                    </button>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out text-[#283852]">
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('notifications.searchPlaceholder')}
                        className="w-full bg-white rounded-xl border border-gray-200 py-3 px-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                filter === f.key
                                    ? 'bg-[#283852] text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                    <Bell size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">
                        {filter === 'unread' ? t('notifications.allRead') : t('notifications.noResults')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((notification, i) => {
                        const Icon = TYPE_ICONS[notification.type] || Bell;
                        return (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => {
                                    if (!notification.read) markAsRead.mutate(notification.id);
                                    if (notification.type === 'message' || notification.type === 'chat') {
                                        navigate(notification.meta?.channelId ? `/messages?channel=${notification.meta.channelId}` : '/messages');
                                    }
                                }}
                                className={`bg-white rounded-2xl border p-4 md:p-5 transition-all cursor-pointer hover:border-[#33cbcc]/30 ${
                                    notification.read ? 'border-gray-100' : 'border-[#33cbcc]/20 bg-[#33cbcc]/2'
                                }`}
                            >
                                <div className="flex items-start gap-3 md:gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                        notification.read ? 'bg-gray-100' : 'bg-[#33cbcc]/10'
                                    }`}>
                                        <Icon size={18} className={notification.read ? 'text-gray-400' : 'text-[#33cbcc]'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className={`text-sm font-semibold truncate ${notification.read ? 'text-gray-600' : 'text-gray-800'}`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                                                {new Date(notification.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{notification.body}</p>
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-500">
                                            {t(`notifications.types.${notification.type}`)}
                                        </span>
                                    </div>
                                    {!notification.read && (
                                        <div className="w-2 h-2 rounded-full bg-[#33cbcc] shrink-0 mt-2" />
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Notifications;
