import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket as TicketIcon,
    Search,
    Plus,
    X,
    AlertCircle,
    Clock,
    CircleDot,
    Bug,
    Lightbulb,
    HelpCircle,
    MessageSquare,
    User,
    AlignLeft,
    Loader2,
    Calendar,
    Building2,
    Check,
} from 'lucide-react';
import { useMyTickets, useCreateTicket, useDepartmentTickets, useAcceptTicket } from '../api/tickets/hooks';
import { useDepartments } from '../api/departments/hooks';
import type { Ticket, CreateTicketDto, TicketPriority } from '../api/tickets/types';
import { UserTicketsSkeleton } from '../components/Skeleton';

/* ─── Display Types ──────────────────────────────────────── */

type DisplayPriority = 'low' | 'medium' | 'high' | 'critical';
type DisplayStatus = 'open' | 'accepted' | 'in_progress' | 'completed' | 'closed';
type TicketCategory = 'bug' | 'feature' | 'support' | 'question';
type TabKey = 'my' | 'department';

interface TicketDisplay {
    id: string;
    title: string;
    description: string;
    status: DisplayStatus;
    priority: DisplayPriority;
    category: TicketCategory;
    reporter: { name: string; avatar: string };
    assignedTo: { name: string; avatar: string } | null;
    department: string;
    dueDate: string;
    dueDateRaw: string;
    isOverdue: boolean;
    createdAt: string;
    createdAtRaw: string;
    updatedAt: string;
    closedAt: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const STATUS_STYLES: Record<DisplayStatus, string> = {
    open: 'bg-[#283852]/10 text-[#283852]',
    accepted: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-[#33cbcc]/10 text-[#33cbcc]',
    completed: 'bg-emerald-100 text-emerald-700',
    closed: 'bg-gray-100 text-gray-500',
};

const STATUS_ICON_STYLES: Record<DisplayStatus, string> = {
    open: 'bg-[#283852]/10',
    accepted: 'bg-amber-50',
    in_progress: 'bg-[#33cbcc]/10',
    completed: 'bg-emerald-50',
    closed: 'bg-gray-100',
};

const STATUS_ICON_TEXT: Record<DisplayStatus, string> = {
    open: 'text-[#283852]',
    accepted: 'text-amber-600',
    in_progress: 'text-[#33cbcc]',
    completed: 'text-emerald-600',
    closed: 'text-gray-400',
};

const PRIORITY_OPACITY: Record<DisplayPriority, string> = {
    low: 'opacity-50',
    medium: 'opacity-70',
    high: 'opacity-90',
    critical: 'opacity-100',
};

const CATEGORY_ICONS: Record<TicketCategory, React.ComponentType<{ size?: number; className?: string }>> = {
    bug: Bug,
    feature: Lightbulb,
    support: HelpCircle,
    question: MessageSquare,
};

const PRIORITIES: DisplayPriority[] = ['low', 'medium', 'high', 'critical'];
const DISPLAY_STATUSES: DisplayStatus[] = ['open', 'accepted', 'in_progress', 'completed', 'closed'];
const CATEGORIES: TicketCategory[] = ['bug', 'feature', 'support', 'question'];

/* ─── Status / Priority maps ────────────────────────────── */

const STATUS_MAP: Record<string, DisplayStatus> = {
    'OPEN': 'open',
    'ACCEPTED': 'accepted',
    'IN_PROGRESS': 'in_progress',
    'COMPLETED': 'completed',
    'CLOSED': 'closed',
};

const PRIORITY_MAP_DISPLAY: Record<string, DisplayPriority> = {
    'LOW': 'low',
    'MEDIUM': 'medium',
    'HIGH': 'high',
    'URGENT': 'critical',
};

const PRIORITY_MAP_API: Record<DisplayPriority, TicketPriority> = {
    low: 'LOW',
    medium: 'MEDIUM',
    high: 'HIGH',
    critical: 'URGENT',
};

/* ─── Helpers ────────────────────────────────────────────── */

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateFull = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

const mapTicket = (tk: Ticket): TicketDisplay => ({
    id: tk.id,
    title: tk.title,
    description: tk.description || '',
    status: STATUS_MAP[tk.status] || 'open',
    priority: PRIORITY_MAP_DISPLAY[tk.priority] || 'medium',
    category: 'support' as TicketCategory,
    reporter: tk.createdBy ? { name: tk.createdBy.email, avatar: '' } : { name: '', avatar: '' },
    assignedTo: tk.assignedTo ? { name: `${tk.assignedTo.firstName} ${tk.assignedTo.lastName}`, avatar: tk.assignedTo.avatarUrl || '' } : null,
    department: tk.targetDepartment?.name || '',
    dueDate: tk.dueDate ? formatDate(tk.dueDate) : '',
    dueDateRaw: tk.dueDate || '',
    isOverdue: tk.dueDate ? new Date(tk.dueDate) < new Date() && tk.status !== 'CLOSED' : false,
    createdAt: formatDate(tk.createdAt),
    createdAtRaw: tk.createdAt,
    updatedAt: formatDate(tk.updatedAt),
    closedAt: tk.closedAt ? formatDate(tk.closedAt) : '',
});

/* ─── Create Ticket Modal ────────────────────────────────── */

const CreateTicketModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createTicket = useCreateTicket();
    const { data: departments } = useDepartments();
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: '' as DisplayPriority | '',
        category: '' as TicketCategory | '',
        dueDate: '',
        targetDepartmentId: '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const isValid = form.title.trim().length > 0 && form.priority !== '' && form.targetDepartmentId !== '';

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
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
                <div className="px-5 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <TicketIcon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('tickets.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
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
                            <AlignLeft size={12} />
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

                    {/* Department */}
                    <div>
                        <label className={labelCls}>
                            <Building2 size={12} />
                            {t('tickets.create.department')}
                        </label>
                        <select
                            value={form.targetDepartmentId}
                            onChange={e => setForm(prev => ({ ...prev, targetDepartmentId: e.target.value }))}
                            className={selectCls}
                        >
                            <option value="">{t('tickets.create.departmentPlaceholder')}</option>
                            {(departments || []).map(dept => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Priority */}
                    <div>
                        <label className={labelCls}>
                            <AlertCircle size={12} />
                            {t('tickets.create.priority')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRIORITIES.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                        form.priority === p
                                            ? 'bg-[#283852] text-white shadow-lg shadow-[#283852]/20'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <span className={`text-[#283852] ${form.priority === p ? '!text-white' : PRIORITY_OPACITY[p]}`}>
                                        {t(`tickets.priority.${p}`)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelCls}>
                            <CircleDot size={12} />
                            {t('tickets.create.category')}
                        </label>
                        <div className="flex flex-wrap gap-2">
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

                    {/* Due Date */}
                    <div>
                        <label className={labelCls}>
                            <Calendar size={12} />
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
                <div className="px-5 md:px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tickets.create.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createTicket.isPending}
                        onClick={() => {
                            if (isValid && form.priority) {
                                const dto: CreateTicketDto = {
                                    title: form.title,
                                    description: form.description || undefined,
                                    priority: PRIORITY_MAP_API[form.priority],
                                    targetDepartmentId: form.targetDepartmentId || undefined,
                                    dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
                                };
                                createTicket.mutate(dto, { onSuccess: () => onClose() });
                            }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createTicket.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('tickets.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Ticket Card ────────────────────────────────────────── */

const TicketCard = ({
    ticket,
    index,
    showAccept,
    onAccept,
    isAccepting,
    onClick,
}: {
    ticket: TicketDisplay;
    index: number;
    showAccept?: boolean;
    onAccept?: () => void;
    isAccepting?: boolean;
    onClick: () => void;
}) => {
    const { t } = useTranslation();
    const CatIcon = CATEGORY_ICONS[ticket.category];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            onClick={onClick}
            className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all cursor-pointer"
        >
            {/* Icon area */}
            <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${STATUS_ICON_STYLES[ticket.status]}`}>
                    <CatIcon size={20} className={STATUS_ICON_TEXT[ticket.status]} />
                </div>
                {ticket.dueDate && (
                    <div className={`flex items-center gap-1 text-xs ${ticket.isOverdue ? 'text-[#283852] font-semibold' : 'text-gray-400'}`}>
                        <Calendar size={12} />
                        <span>{ticket.dueDate}</span>
                    </div>
                )}
            </div>

            {/* Title */}
            <h3 className="font-medium text-gray-800 text-sm truncate mb-3">{ticket.title}</h3>

            {/* Status + Priority */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                    {t(`tickets.status.${ticket.status}`)}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-[#283852]/5 text-[#283852] ${PRIORITY_OPACITY[ticket.priority]}`}>
                    {t(`tickets.priority.${ticket.priority}`)}
                </span>
                {ticket.department && (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#33cbcc]/10 text-[#33cbcc]">
                        {ticket.department}
                    </span>
                )}
            </div>

            {/* Reporter + Date + Accept */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                    {ticket.reporter.name ? (
                        <>
                            {ticket.reporter.avatar ? (
                                <img src={ticket.reporter.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                            ) : (
                                <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                    <User size={12} className="text-gray-400" />
                                </div>
                            )}
                            <span className="text-xs text-gray-500 truncate max-w-[120px]">{ticket.reporter.name.split('@')[0]}</span>
                        </>
                    ) : (
                        <span className="text-xs text-gray-400 italic">{t('tickets.unassigned')}</span>
                    )}
                </div>
                {showAccept ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAccept?.(); }}
                        disabled={isAccepting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors shadow-sm"
                    >
                        {isAccepting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        {t('tickets.accept')}
                    </button>
                ) : (
                    <span className="text-xs text-gray-400">{ticket.createdAt}</span>
                )}
            </div>
        </motion.div>
    );
};

/* ─── Ticket Detail Modal ─────────────────────────────────── */

const TicketDetailModal = ({
    ticket,
    onClose,
    showAccept,
    onAccept,
    isAccepting,
}: {
    ticket: TicketDisplay;
    onClose: () => void;
    showAccept?: boolean;
    onAccept?: () => void;
    isAccepting?: boolean;
}) => {
    const { t } = useTranslation();
    const CatIcon = CATEGORY_ICONS[ticket.category];

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const rowCls = 'flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0';
    const labelCls = 'text-sm text-gray-400 font-medium';

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${STATUS_ICON_STYLES[ticket.status]}`}>
                            <CatIcon size={20} className={STATUS_ICON_TEXT[ticket.status]} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{ticket.title}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[ticket.status]}`}>
                                    {t(`tickets.status.${ticket.status}`)}
                                </span>
                                <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-[#283852]/5 text-[#283852] ${PRIORITY_OPACITY[ticket.priority]}`}>
                                    {t(`tickets.priority.${ticket.priority}`)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                    {/* Description */}
                    {ticket.description && (
                        <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {t('tickets.detail.description')}
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
                                {ticket.description}
                            </p>
                        </div>
                    )}

                    {/* Info rows */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className={rowCls}>
                            <span className={labelCls}>{t('tickets.detail.department')}</span>
                            {ticket.department ? (
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#33cbcc]/10 text-[#33cbcc]">
                                    {ticket.department}
                                </span>
                            ) : (
                                <span className="text-sm text-gray-300">—</span>
                            )}
                        </div>

                        <div className={rowCls}>
                            <span className={labelCls}>{t('tickets.detail.reporter')}</span>
                            <div className="flex items-center gap-2">
                                {ticket.reporter.avatar ? (
                                    <img src={ticket.reporter.avatar} alt="" className="w-6 h-6 rounded-full" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User size={12} className="text-gray-400" />
                                    </div>
                                )}
                                <span className="text-sm text-gray-700 font-medium">
                                    {ticket.reporter.name ? ticket.reporter.name.split('@')[0] : t('tickets.unassigned')}
                                </span>
                            </div>
                        </div>

                        <div className={rowCls}>
                            <span className={labelCls}>{t('tickets.detail.assignedTo')}</span>
                            {ticket.assignedTo ? (
                                <div className="flex items-center gap-2">
                                    {ticket.assignedTo.avatar ? (
                                        <img src={ticket.assignedTo.avatar} alt="" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User size={12} className="text-gray-400" />
                                        </div>
                                    )}
                                    <span className="text-sm text-gray-700 font-medium">{ticket.assignedTo.name}</span>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-300 italic">{t('tickets.unassigned')}</span>
                            )}
                        </div>

                        <div className={rowCls}>
                            <span className={labelCls}>{t('tickets.detail.createdAt')}</span>
                            <span className="text-sm text-gray-700">{formatDateFull(ticket.createdAtRaw)}</span>
                        </div>

                        {ticket.dueDateRaw && (
                            <div className={rowCls}>
                                <span className={labelCls}>{t('tickets.detail.dueDate')}</span>
                                <span className={`text-sm font-medium ${ticket.isOverdue ? 'text-red-500' : 'text-gray-700'}`}>
                                    {formatDateFull(ticket.dueDateRaw)}
                                    {ticket.isOverdue && (
                                        <span className="ml-2 text-[10px] bg-red-100 text-red-500 px-2 py-0.5 rounded-full font-semibold">
                                            {t('tickets.overdue')}
                                        </span>
                                    )}
                                </span>
                            </div>
                        )}

                        {ticket.closedAt && (
                            <div className={rowCls}>
                                <span className={labelCls}>{t('tickets.detail.closedAt')}</span>
                                <span className="text-sm text-gray-700">{ticket.closedAt}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                {showAccept && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                        <button
                            onClick={() => { onAccept?.(); onClose(); }}
                            disabled={isAccepting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors shadow-lg shadow-[#33cbcc]/20"
                        >
                            {isAccepting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {t('tickets.accept')}
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

const Tickets = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<DisplayStatus | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<TicketDisplay | null>(null);
    const [activeTab, setActiveTab] = useState<TabKey>('my');

    /* ── API data ── */
    const { data: apiMyTickets, isLoading: isLoadingMy } = useMyTickets();
    const { data: apiDeptTickets, isLoading: isLoadingDept } = useDepartmentTickets();
    const acceptTicket = useAcceptTicket();

    /* ── Map tickets ── */
    const myTickets: TicketDisplay[] = (apiMyTickets || []).map(mapTicket);
    const deptTickets: TicketDisplay[] = (apiDeptTickets || []).map(mapTicket);

    const isLoading = activeTab === 'my' ? isLoadingMy : isLoadingDept;
    const currentTickets = activeTab === 'my' ? myTickets : deptTickets;

    /* ── Filtered ── */
    const filteredTickets = currentTickets.filter(ticket => {
        const matchesSearch =
            ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.reporter.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    /* ── Stats (based on current tab data) ── */
    const openCount = currentTickets.filter(t => t.status === 'open').length;
    const acceptedCount = currentTickets.filter(t => t.status === 'accepted').length;
    const inProgressCount = currentTickets.filter(t => t.status === 'in_progress').length;
    const stats = [
        { label: t('tickets.stats.total'), value: currentTickets.length, icon: TicketIcon },
        { label: t('tickets.stats.open'), value: openCount, icon: CircleDot },
        { label: t('tickets.stats.accepted'), value: acceptedCount, icon: Check },
        { label: t('tickets.stats.inProgress'), value: inProgressCount, icon: Clock },
    ];

    /* ── Status filters ── */
    const statusFilters: { key: DisplayStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('tickets.filterAll') },
        ...DISPLAY_STATUSES.map(s => ({ key: s as DisplayStatus, label: t(`tickets.status.${s}`) })),
    ];

    /* ── Tabs ── */
    const tabs: { key: TabKey; label: string }[] = [
        { key: 'my', label: t('tickets.tabs.myTickets') },
        { key: 'department', label: t('tickets.tabs.departmentTickets') },
    ];

    if (isLoading) {
        return <UserTicketsSkeleton />;
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('tickets.title')}</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">{t('tickets.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center justify-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 w-full md:w-auto"
                >
                    <Plus size={16} />
                    {t('tickets.newTicket')}
                </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => { setActiveTab(tab.key); setFilterStatus('all'); setSearchQuery(''); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === tab.key
                                ? 'bg-white text-gray-800 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out text-[#33cbcc]">
                            <stat.icon size={80} strokeWidth={1.5} className="md:hidden" />
                            <stat.icon size={100} strokeWidth={1.5} className="hidden md:block" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Search Bar ── */}
            <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                <Search className="text-gray-400 ml-3" size={20} />
                <input
                    type="text"
                    placeholder={t('tickets.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                />
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
                            {sf.label}
                        </button>
                    ))}
                </div>

            {/* ── Ticket Grid ── */}
            {filteredTickets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredTickets.map((ticket, i) => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            index={i}
                            showAccept={activeTab === 'department' && ticket.status === 'open'}
                            onAccept={() => acceptTicket.mutate(ticket.id)}
                            isAccepting={acceptTicket.isPending}
                            onClick={() => setSelectedTicket(ticket)}
                        />
                    ))}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredTickets.length === 0 && (
                <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-12 text-center">
                    <TicketIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">
                        {activeTab === 'department' ? t('tickets.departmentEmpty') : t('tickets.noResults')}
                    </p>
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
                    <TicketDetailModal
                        ticket={selectedTicket}
                        onClose={() => setSelectedTicket(null)}
                        showAccept={activeTab === 'department' && selectedTicket.status === 'open'}
                        onAccept={() => acceptTicket.mutate(selectedTicket.id)}
                        isAccepting={acceptTicket.isPending}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tickets;
