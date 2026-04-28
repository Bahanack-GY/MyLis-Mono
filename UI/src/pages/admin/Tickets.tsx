import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket01Icon as TicketIcon, Search01Icon, Add01Icon, Cancel01Icon, DashboardSquare01Icon, ListViewIcon, Alert01Icon, Clock01Icon, Tick01Icon, CircleIcon, Bug01Icon, Idea01Icon, HelpCircleIcon, Message02Icon, UserIcon, AlignLeftIcon, Loading02Icon, Building01Icon, UserCheck01Icon, CancelCircleIcon, Calendar01Icon } from 'hugeicons-react';
import { useTickets, useCreateTicket, useTakeTicket, useCloseTicket } from '../../api/tickets/hooks';
import { TicketsAdminSkeleton } from '../../components/Skeleton';
import { useDepartments } from '../../api/departments/hooks';
import { useDepartmentScope } from '../../contexts/AuthContext';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */

type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type TicketStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'resolved' | 'closed';
type TicketCategory = 'bug' | 'feature' | 'support' | 'question';

interface TicketItem {
    id: string;
    title: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    department: string;
    departmentId: string;
    assignee: { name: string; avatar: string };
    reporter: { name: string; avatar: string };
    dueDate: string;
    isOverdue: boolean;
    createdAt: string;
    updatedAt: string;
}

/* ─── Constants ─────────────────────────────────────────── */

const PRIORITY_COLORS: Record<TicketPriority, string> = {
    low: '#6b7280',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
};

const STATUS_COLORS: Record<TicketStatus, string> = {
    open: '#6b7280',
    accepted: '#33cbcc',
    in_progress: '#3b82f6',
    completed: '#22c55e',
    resolved: '#22c55e',
    closed: '#9ca3af',
};

const CATEGORY_ICONS: Record<TicketCategory, React.ComponentType<{ size?: number; className?: string; color?: string; style?: React.CSSProperties }>> = {
    bug: Bug01Icon,
    feature: Idea01Icon,
    support: HelpCircleIcon,
    question: Message02Icon,
};

const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical'];
const STATUSES: TicketStatus[] = ['open', 'accepted', 'in_progress', 'completed', 'resolved', 'closed'];
const CATEGORIES: TicketCategory[] = ['bug', 'feature', 'support', 'question'];


/* ─── Create Ticket Modal ──────────────────────────────── */

const CreateTicketModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createTicket = useCreateTicket();
    const { data: departments } = useDepartments();
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: '' as TicketPriority | '',
        category: '' as TicketCategory | '',
        departmentId: '',
        dueDate: '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const isValid = form.title.trim().length > 0 && form.priority !== '' && form.departmentId !== '';

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';

    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <TicketIcon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('tickets.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Title */}
                    <div>
                        <label className={labelCls}>
                            <TicketIcon size={12} />
                            {t('tickets.create.ticketTitle')}
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('tickets.create.titlePlaceholder')}
                            className={inputCls}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}>
                            <AlignLeftIcon size={12} />
                            {t('tickets.create.description')}
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={t('tickets.create.descriptionPlaceholder')}
                            rows={3}
                            className={inputCls + ' resize-none'}
                        />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className={labelCls}>
                            <Alert01Icon size={12} />
                            {t('tickets.create.priority')}
                        </label>
                        <div className="flex gap-2">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                        form.priority === p
                                            ? 'text-white shadow-lg'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                    }`}
                                    style={form.priority === p ? { backgroundColor: PRIORITY_COLORS[p], boxShadow: `0 4px 14px ${PRIORITY_COLORS[p]}33` } : {}}
                                >
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: form.priority === p ? '#fff' : PRIORITY_COLORS[p] }} />
                                    {t(`tickets.priority.${p}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelCls}>
                            <CircleIcon size={12} />
                            {t('tickets.create.category')}
                        </label>
                        <div className="flex gap-2">
                            {CATEGORIES.map(c => {
                                const CatIcon = CATEGORY_ICONS[c];
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, category: c }))}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                            form.category === c
                                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <CatIcon size={14} />
                                        {t(`tickets.category.${c}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Department */}
                    <div>
                        <label className={labelCls}>
                            <Building01Icon size={12} />
                            {t('tickets.create.department')}
                        </label>
                        <select
                            value={form.departmentId}
                            onChange={e => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                            className={inputCls + ' appearance-none cursor-pointer'}
                        >
                            <option value="">{t('tickets.create.departmentPlaceholder')}</option>
                            {(departments || []).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className={labelCls}>
                            <Calendar01Icon size={12} />
                            {t('tickets.create.dueDate')}
                        </label>
                        <input
                            type="datetime-local"
                            value={form.dueDate}
                            onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tickets.create.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createTicket.isPending}
                        onClick={() => {
                            if (isValid) {
                                const PRIORITY_MAP: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = {
                                    low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'URGENT',
                                };
                                createTicket.mutate({
                                    title: form.title,
                                    description: form.description || undefined,
                                    priority: form.priority ? PRIORITY_MAP[form.priority] : undefined,
                                    targetDepartmentId: form.departmentId || undefined,
                                    dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
                                }, { onSuccess: () => onClose() });
                            }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createTicket.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {t('tickets.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Ticket Detail Modal ─────────────────────────────── */

const TicketDetailModal = ({ ticket, onClose }: { ticket: TicketItem; onClose: () => void }) => {
    const { t } = useTranslation();

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const CatIcon = CATEGORY_ICONS[ticket.category];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${STATUS_COLORS[ticket.status]}15` }}
                        >
                            <CatIcon size={20} style={{ color: STATUS_COLORS[ticket.status] }} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-800 truncate">{ticket.title}</h2>
                            <p className="text-xs text-gray-400">#{ticket.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${PRIORITY_COLORS[ticket.priority]}15`, color: PRIORITY_COLORS[ticket.priority] }}
                        >
                            {t(`tickets.priority.${ticket.priority}`)}
                        </span>
                        <span
                            className="text-xs font-semibold px-3 py-1 rounded-full"
                            style={{ backgroundColor: `${STATUS_COLORS[ticket.status]}15`, color: STATUS_COLORS[ticket.status] }}
                        >
                            {t(`tickets.status.${ticket.status}`)}
                        </span>
                        {ticket.department && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                                <Building01Icon size={12} />
                                {ticket.department}
                            </span>
                        )}
                    </div>

                    {/* Description */}
                    {ticket.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tickets.create.description')}</p>
                            <p className="text-sm text-gray-600 leading-relaxed break-words">{ticket.description}</p>
                        </div>
                    )}

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Assignee */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tickets.table.assignee')}</p>
                            <div className="flex items-center gap-2">
                                {ticket.assignee.name ? (
                                    <>
                                        {ticket.assignee.avatar ? (
                                            <img src={ticket.assignee.avatar} alt="" className="w-7 h-7 rounded-full border border-gray-200" />
                                        ) : (
                                            <div className="w-7 h-7 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                <UserIcon size={14} className="text-gray-400" />
                                            </div>
                                        )}
                                        <span className="text-sm text-gray-700 font-medium">{ticket.assignee.name}</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">{t('tickets.unassigned')}</span>
                                )}
                            </div>
                        </div>

                        {/* Reporter */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tickets.table.created')}</p>
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                    <UserIcon size={14} className="text-gray-400" />
                                </div>
                                <span className="text-sm text-gray-700 font-medium">{ticket.reporter.name || '—'}</span>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tickets.table.dueDate')}</p>
                            {ticket.dueDate ? (
                                <div className={`flex items-center gap-1.5 text-sm ${ticket.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-700'}`}>
                                    <Calendar01Icon size={14} />
                                    <span>{ticket.dueDate}</span>
                                    {ticket.isOverdue && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full ml-1">{t('tickets.overdue')}</span>}
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400">—</span>
                            )}
                        </div>

                        {/* Created */}
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tickets.table.created')}</p>
                            <span className="text-sm text-gray-700">{ticket.createdAt}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tickets.create.cancel')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Tickets = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<TicketStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
    const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);

    // API data
    const deptScope = useDepartmentScope();
    const { data: apiTickets, isLoading } = useTickets(deptScope);
    const { data: departments } = useDepartments();
    const takeTicket = useTakeTicket();
    const closeTicket = useCloseTicket();

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    // Map API tickets to display shape
    const STATUS_MAP: Record<string, TicketStatus> = {
        'OPEN': 'open', 'ACCEPTED': 'accepted', 'IN_PROGRESS': 'in_progress', 'COMPLETED': 'completed', 'CLOSED': 'closed',
    };
    const PRIORITY_MAP_DISPLAY: Record<string, TicketPriority> = {
        'LOW': 'low', 'MEDIUM': 'medium', 'HIGH': 'high', 'URGENT': 'critical',
    };
    const tickets: TicketItem[] = (apiTickets || []).map((tk) => ({
        id: tk.id,
        title: tk.title,
        description: tk.description || '',
        status: STATUS_MAP[tk.status] || 'open',
        priority: PRIORITY_MAP_DISPLAY[tk.priority] || 'medium',
        category: 'support' as TicketCategory,
        department: tk.targetDepartment?.name || '',
        departmentId: tk.targetDepartmentId || '',
        assignee: tk.assignedTo
            ? { name: `${tk.assignedTo.firstName} ${tk.assignedTo.lastName}`, avatar: tk.assignedTo.avatarUrl || '' }
            : { name: '', avatar: '' },
        reporter: tk.createdBy ? { name: tk.createdBy.email, avatar: '' } : { name: '', avatar: '' },
        dueDate: tk.dueDate ? formatDate(tk.dueDate) : '',
        isOverdue: tk.dueDate ? new Date(tk.dueDate) < new Date() && tk.status !== 'CLOSED' : false,
        createdAt: formatDate(tk.createdAt),
        updatedAt: formatDate(tk.updatedAt),
    }));

    // Get employees for a specific department (for the take/assign dropdown)
    const getDepartmentEmployees = (departmentId: string) => {
        const dept = (departments || []).find(d => d.id === departmentId);
        return dept?.employees || [];
    };


    /* Filtered tickets */
    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.reporter.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    /* Stats */
    const openCount = tickets.filter(t => t.status === 'open').length;
    const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
    const resolvedThisWeek = tickets.filter(t => {
        if (t.status !== 'resolved') return false;
        const diff = Date.now() - new Date(t.updatedAt).getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const stats = [
        { label: t('tickets.stats.total'), value: tickets.length, icon: TicketIcon, color: '#33cbcc' },
        { label: t('tickets.stats.open'), value: openCount, icon: CircleIcon, color: '#3b82f6' },
        { label: t('tickets.stats.inProgress'), value: inProgressCount, icon: Clock01Icon, color: '#f59e0b' },
        { label: t('tickets.stats.resolved'), value: resolvedThisWeek, icon: Tick01Icon, color: '#22c55e' },
    ];

    /* Ticket activity data — group tickets by month */
    const ticketActivityData = useMemo(() => {
        const counts: Record<string, number> = {};
        tickets.forEach(t => {
            if (!t.createdAt) return;
            const d = new Date(t.createdAt);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        const months: { month: string; tickets: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            months.push({ month: label, tickets: counts[key] || 0 });
        }
        return months;
    }, [tickets]);

    /* Chart data */
    const priorityChartData = PRIORITIES.map(p => ({
        name: t(`tickets.priority.${p}`),
        count: tickets.filter(ticket => ticket.priority === p).length,
        color: PRIORITY_COLORS[p],
    }));

    /* Status filters */
    const statusFilters: { key: TicketStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('tickets.filterAll') },
        ...STATUSES.map(s => ({ key: s as TicketStatus, label: t(`tickets.status.${s}`) })),
    ];

    if (isLoading) {
        return <TicketsAdminSkeleton />;
    }


    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('tickets.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('tickets.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Add01Icon size={16} />
                    {t('tickets.newTicket')}
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

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tickets by Priority — BarChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('tickets.charts.byPriority')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart data={priorityChartData} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {priorityChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Ticket Activity — AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('tickets.charts.activity')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={ticketActivityData}>
                                <defs>
                                    <linearGradient id="colorTicketActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="tickets" stroke="#33cbcc" strokeWidth={2} fill="url(#colorTicketActivity)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* ── Search01Icon + View Toggle ── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                    <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                    <input
                        type="text"
                        placeholder={t('tickets.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                    />
                </div>

                <div className="flex bg-white rounded-xl border border-gray-100 p-1 self-start">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <DashboardSquare01Icon size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <ListViewIcon size={18} />
                    </button>
                </div>
            </div>

            {/* ── Status Filters ── */}
            <div className="flex gap-2 flex-wrap">
                {statusFilters.map(sf => (
                    <button
                        key={sf.key}
                        onClick={() => setFilterStatus(sf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterStatus === sf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {sf.key !== 'all' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: filterStatus === sf.key ? '#fff' : STATUS_COLORS[sf.key] }}
                            />
                        )}
                        {sf.label}
                    </button>
                ))}
            </div>

            {/* ── Grid View ── */}
            {viewMode === 'grid' && filteredTickets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTickets.map((ticket, i) => {
                        const CatIcon = CATEGORY_ICONS[ticket.category];
                        return (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                onClick={() => setSelectedTicket(ticket)}
                                className="bg-white rounded-3xl p-6 border border-gray-100 group hover:border-gray-200  cursor-pointer transition-all"
                            >
                                {/* Icon + Actions */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                                        <CatIcon size={22} className="text-gray-400" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {ticket.status === 'open' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id); }}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                title={t('tickets.takeTicket')}
                                            >
                                                <UserCheck01Icon size={16} />
                                            </button>
                                        )}
                                        {ticket.status === 'in_progress' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); closeTicket.mutate(ticket.id); }}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                title={t('tickets.closeTicket')}
                                            >
                                                <CancelCircleIcon size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="font-medium text-gray-800 text-sm truncate mb-3">{ticket.title}</h3>

                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: `${PRIORITY_COLORS[ticket.priority]}15`, color: PRIORITY_COLORS[ticket.priority] }}
                                    >
                                        {t(`tickets.priority.${ticket.priority}`)}
                                    </span>
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: `${STATUS_COLORS[ticket.status]}15`, color: STATUS_COLORS[ticket.status] }}
                                    >
                                        {t(`tickets.status.${ticket.status}`)}
                                    </span>
                                    {ticket.department && (
                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1.5">
                                            <Building01Icon size={12} />
                                            {ticket.department}
                                        </span>
                                    )}
                                </div>

                                {/* Due Date */}
                                {ticket.dueDate && (
                                    <div className={`flex items-center gap-1.5 mb-4 text-xs ${ticket.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                        <Calendar01Icon size={12} />
                                        <span>{ticket.dueDate}</span>
                                        {ticket.isOverdue && <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">{t('tickets.overdue')}</span>}
                                    </div>
                                )}

                                {/* Assign employee dropdown */}
                                {assigningTicketId === ticket.id && ticket.departmentId && (
                                    <div className="mb-4 p-3 bg-gray-50 rounded-xl" onClick={e => e.stopPropagation()}>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tickets.selectEmployee')}</p>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {getDepartmentEmployees(ticket.departmentId).map(emp => (
                                                <button
                                                    key={emp.id}
                                                    onClick={() => {
                                                        takeTicket.mutate({ id: ticket.id, dto: { employeeId: emp.id } });
                                                        setAssigningTicketId(null);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white text-sm text-gray-700 transition-colors"
                                                >
                                                    {emp.avatarUrl ? (
                                                        <img src={emp.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <UserIcon size={10} className="text-gray-400" />
                                                        </div>
                                                    )}
                                                    {emp.firstName} {emp.lastName}
                                                </button>
                                            ))}
                                            {getDepartmentEmployees(ticket.departmentId).length === 0 && (
                                                <p className="text-xs text-gray-400 py-1">{t('tickets.noDepartment')}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Assignee + Date */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        {ticket.assignee.name ? (
                                            <>
                                                {ticket.assignee.avatar ? (
                                                    <img src={ticket.assignee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                        <UserIcon size={12} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-xs text-gray-500">{ticket.assignee.name.split(' ')[0]}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">{t('tickets.unassigned')}</span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">{ticket.createdAt}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── ListViewIcon View ── */}
            {viewMode === 'list' && filteredTickets.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-3">{t('tickets.table.title')}</div>
                        <div className="col-span-1">{t('tickets.table.priority')}</div>
                        <div className="col-span-1">{t('tickets.table.status')}</div>
                        <div className="col-span-1">{t('tickets.table.department')}</div>
                        <div className="col-span-2">{t('tickets.table.assignee')}</div>
                        <div className="col-span-1">{t('tickets.table.dueDate')}</div>
                        <div className="col-span-1">{t('tickets.table.created')}</div>
                        <div className="col-span-2">{t('tickets.table.actions')}</div>
                    </div>
                    {/* Rows */}
                    {filteredTickets.map((ticket, i) => {
                        const CatIcon = CATEGORY_ICONS[ticket.category];
                        return (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => setSelectedTicket(ticket)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 cursor-pointer transition-colors"
                            >
                                {/* Title with category icon */}
                                <div className="col-span-3 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                                        <CatIcon size={16} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 truncate">{ticket.title}</span>
                                </div>
                                {/* Priority badge */}
                                <div className="col-span-1">
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: `${PRIORITY_COLORS[ticket.priority]}15`, color: PRIORITY_COLORS[ticket.priority] }}
                                    >
                                        {t(`tickets.priority.${ticket.priority}`)}
                                    </span>
                                </div>
                                {/* Status badge */}
                                <div className="col-span-1">
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{ backgroundColor: `${STATUS_COLORS[ticket.status]}15`, color: STATUS_COLORS[ticket.status] }}
                                    >
                                        {t(`tickets.status.${ticket.status}`)}
                                    </span>
                                </div>
                                {/* Department */}
                                <div className="col-span-1 flex items-center gap-1.5 text-xs text-gray-500">
                                    <Building01Icon size={12} />
                                    <span className="truncate">{ticket.department || t('tickets.noDepartment')}</span>
                                </div>
                                {/* Assignee */}
                                <div className="col-span-2 flex items-center gap-2">
                                    {ticket.assignee.name ? (
                                        <>
                                            {ticket.assignee.avatar ? (
                                                <img src={ticket.assignee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                                    <UserIcon size={12} className="text-gray-400" />
                                                </div>
                                            )}
                                            <span className="text-xs text-gray-500 truncate">{ticket.assignee.name}</span>
                                        </>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">{t('tickets.unassigned')}</span>
                                    )}
                                </div>
                                {/* Due Date */}
                                <div className={`col-span-1 flex items-center gap-1 text-xs ${ticket.isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                    {ticket.dueDate ? (
                                        <>
                                            <Calendar01Icon size={10} />
                                            {ticket.dueDate}
                                        </>
                                    ) : (
                                        <span className="text-gray-300">—</span>
                                    )}
                                </div>
                                {/* Created */}
                                <div className="col-span-1 text-xs text-gray-400">{ticket.createdAt}</div>
                                {/* Actions */}
                                <div className="col-span-2 flex items-center gap-1 relative">
                                    {ticket.status === 'open' && (
                                        <div className="relative">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setAssigningTicketId(assigningTicketId === ticket.id ? null : ticket.id); }}
                                                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                            >
                                                <UserCheck01Icon size={12} />
                                                {t('tickets.takeTicket')}
                                            </button>
                                            {assigningTicketId === ticket.id && ticket.departmentId && (
                                                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 max-h-40 overflow-y-auto" onClick={e => e.stopPropagation()}>
                                                    {getDepartmentEmployees(ticket.departmentId).map(emp => (
                                                        <button
                                                            key={emp.id}
                                                            onClick={() => {
                                                                takeTicket.mutate({ id: ticket.id, dto: { employeeId: emp.id } });
                                                                setAssigningTicketId(null);
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                                                        >
                                                            {emp.avatarUrl ? (
                                                                <img src={emp.avatarUrl} alt="" className="w-5 h-5 rounded-full" />
                                                            ) : (
                                                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
                                                                    <UserIcon size={10} className="text-gray-400" />
                                                                </div>
                                                            )}
                                                            <span className="truncate">{emp.firstName} {emp.lastName}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {ticket.status === 'in_progress' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); closeTicket.mutate(ticket.id); }}
                                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                        >
                                            <CancelCircleIcon size={12} />
                                            {t('tickets.closeTicket')}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredTickets.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <TicketIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('tickets.noResults')}</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-xl hover:bg-[#2bb5b6] transition-colors"
                    >
                        {t('tickets.create.submit')}
                    </button>
                </div>
            )}

            {/* ── Create Modal ── */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateTicketModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>

            {/* ── Detail Modal ── */}
            <AnimatePresence>
                {selectedTicket && (
                    <TicketDetailModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tickets;
