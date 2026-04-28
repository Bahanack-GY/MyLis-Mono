import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Activity01Icon as ActivityIcon, Search01Icon, Login01Icon, Add01Icon, RefreshIcon, Delete02Icon, ViewIcon, Download01Icon, Upload01Icon, Message02Icon, UserGroupIcon, ZapIcon, Calendar01Icon, ArrowLeft01Icon, ArrowRight01Icon } from 'hugeicons-react';
import { useLogs, useLogsStats } from '../api/logs/hooks';
import { ActivitySkeleton } from '../components/Skeleton';
import type { Log } from '../api/logs/types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */

type ActionType = 'login' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'upload' | 'comment';
type UserRole = 'MANAGER' | 'EMPLOYEE' | 'HEAD_OF_DEPARTMENT';

interface ActivityItem {
    id: number;
    user: { name: string; avatar: string; role: UserRole };
    action: ActionType;
    target: string;
    timestamp: string;
}

/* ─── Constants ─────────────────────────────────────────── */

const ACTION_COLORS: Record<ActionType, string> = {
    login: '#3b82f6',
    create: '#22c55e',
    update: '#f59e0b',
    delete: '#ef4444',
    view: '#6b7280',
    export: '#8b5cf6',
    upload: '#33cbcc',
    comment: '#ec4899',
};

const ACTION_ICONS: Record<ActionType, React.ComponentType<{ size?: number; className?: string }>> = {
    login: Login01Icon,
    create: Add01Icon,
    update: RefreshIcon,
    delete: Delete02Icon,
    view: ViewIcon,
    export: Download01Icon,
    upload: Upload01Icon,
    comment: Message02Icon,
};

const ROLE_COLORS: Record<UserRole, string> = {
    MANAGER: '#3b82f6',
    EMPLOYEE: '#22c55e',
    HEAD_OF_DEPARTMENT: '#ef4444',
};

const ACTION_TYPES: ActionType[] = ['login', 'create', 'update', 'delete', 'view', 'export', 'upload', 'comment'];
const ROLES: UserRole[] = ['MANAGER', 'EMPLOYEE', 'HEAD_OF_DEPARTMENT'];

const ACTION_TYPE_MAP: Record<string, ActionType> = {
    'LOGIN': 'login', 'CREATE': 'create', 'UPDATE': 'update', 'DELETE': 'delete',
    'VIEW': 'view', 'EXPORT': 'export', 'UPLOAD': 'upload', 'COMMENT': 'comment',
    'SEND': 'export', 'PAY': 'update', 'REJECT': 'delete', 'ASSIGN': 'update', 'CLOSE': 'update',
};

/* ─── Helpers ───────────────────────────────────────────── */

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

const ActivityPage = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAction, setFilterAction] = useState<ActionType | 'all'>('all');
    const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
    const [page, setPage] = useState(1);

    // API data — paginated list
    const backendAction = filterAction !== 'all' ? filterAction.toUpperCase() : undefined;
    const { data: logsPage, isLoading } = useLogs(page, backendAction);

    // Stats / chart — separate lightweight endpoint
    const { data: statsData } = useLogsStats();

    // Map API logs to display shape
    const activities: ActivityItem[] = (logsPage?.data || []).map((log: Log, i: number) => {
        const d = (log.details || {}) as Record<string, string>;
        return {
            id: i + 1,
            user: {
                name: log.user?.employee
                    ? `${log.user.employee.firstName} ${log.user.employee.lastName}`
                    : log.user?.email || d.userEmail || 'Unknown',
                avatar: log.user?.employee?.avatarUrl || '',
                role: (log.user?.role || d.userRole || 'EMPLOYEE') as UserRole,
            },
            action: ACTION_TYPE_MAP[log.action?.toUpperCase()] || 'view',
            target: d.target || '',
            timestamp: log.timestamp,
        };
    });

    const totalPages = logsPage?.totalPages ?? 1;

    // Client-side filters on current page (search + role)
    const filteredActivities = activities.filter(item => {
        const matchesSearch =
            item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.target.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === 'all' || item.user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    // Stats from dedicated endpoint
    const topActionKey = statsData?.topAction
        ? ACTION_TYPE_MAP[statsData.topAction.toUpperCase()] || 'view'
        : 'view';

    const stats = [
        { label: t('activity.stats.total'), value: statsData?.total ?? '—', icon: ActivityIcon, color: '#33cbcc' },
        { label: t('activity.stats.today'), value: statsData?.todayCount ?? '—', icon: Calendar01Icon, color: '#3b82f6' },
        { label: t('activity.stats.activeUsers'), value: statsData?.activeUsers ?? '—', icon: UserGroupIcon, color: '#8b5cf6' },
        { label: t('activity.stats.topAction'), value: statsData?.topAction ? t(`activity.actions.${topActionKey}`) : '—', icon: ZapIcon, color: '#f59e0b' },
    ];

    // Chart data from dedicated endpoint
    const chartData = (statsData?.chartData || []).map(d => ({
        day: new Date(d.day).toLocaleDateString('fr-FR', { weekday: 'short' }),
        count: d.count,
    }));

    const selectCls = 'bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">{t('activity.title')}</h1>
                <p className="text-gray-500 mt-1">{t('activity.subtitle')}</p>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="border border-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                    >
                        <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
                        </div>
                        <div className="p-5 bg-white relative overflow-hidden">
                            <h2 className="text-3xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                <stat.icon size={110} strokeWidth={1.2} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Chart ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-3xl border border-gray-100"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6">{t('activity.chart.title')}</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorActivityCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="count" stroke="#33cbcc" strokeWidth={2} fill="url(#colorActivityCount)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* ── Filters ── */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search01Icon */}
                <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                    <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                    <input
                        type="text"
                        placeholder={t('activity.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                    />
                </div>

                {/* Action filter — sent to backend */}
                <select
                    value={filterAction}
                    onChange={e => { setFilterAction(e.target.value as ActionType | 'all'); setPage(1); }}
                    className={selectCls}
                >
                    <option value="all">{t('activity.filters.allActions')}</option>
                    {ACTION_TYPES.map(a => (
                        <option key={a} value={a}>{t(`activity.actions.${a}`)}</option>
                    ))}
                </select>

                {/* Role filter — client-side on current page */}
                <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value as UserRole | 'all')}
                    className={selectCls}
                >
                    <option value="all">{t('activity.filters.allRoles')}</option>
                    {ROLES.map(r => (
                        <option key={r} value={r}>{t(`activity.roles.${r}`)}</option>
                    ))}
                </select>
            </div>

            {/* ── Activity Log ── */}
            {isLoading ? (
                <ActivitySkeleton />
            ) : filteredActivities.length > 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {filteredActivities.map((item, i) => {
                        const ActionIcon = ACTION_ICONS[item.action];
                        const actionColor = ACTION_COLORS[item.action];
                        const roleColor = ROLE_COLORS[item.user.role] || '#6b7280';

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors"
                            >
                                {/* Avatar */}
                                {item.user.avatar ? (
                                    <img
                                        src={item.user.avatar}
                                        alt=""
                                        className="w-10 h-10 rounded-xl border border-gray-200 object-cover shrink-0"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                                        <UserGroupIcon size={16} className="text-gray-400" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-medium text-gray-800">{item.user.name}</span>
                                        <span
                                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                            style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                                        >
                                            {t(`activity.roles.${item.user.role}`)}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 truncate">
                                        {t(`activity.log.${item.action}`)}
                                        {item.target && (
                                            <span className="font-medium text-gray-700"> {item.target}</span>
                                        )}
                                    </p>
                                </div>

                                {/* Action badge */}
                                <div className="flex items-center gap-3 shrink-0">
                                    <span
                                        className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: `${actionColor}15`, color: actionColor }}
                                    >
                                        <ActionIcon size={12} />
                                        {t(`activity.actions.${item.action}`)}
                                    </span>
                                    <span className="text-xs text-gray-400 whitespace-nowrap w-16 text-right">
                                        {getRelativeTime(item.timestamp)}
                                    </span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <ActivityIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('activity.noResults')}</p>
                </div>
            )}

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <ArrowLeft01Icon size={16} />
                        {t('common.previous')}
                    </button>

                    <span className="text-sm text-gray-500">
                        {page} / {totalPages}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('common.next')}
                        <ArrowRight01Icon size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ActivityPage;
