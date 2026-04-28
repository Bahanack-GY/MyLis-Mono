import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, type TFunction } from 'react-i18next';
import { Notification01Icon, Cancel01Icon, Tick01Icon, Delete01Icon, Add01Icon, Calendar01Icon, AlignLeftIcon, Loading02Icon, Alert01Icon, CheckmarkCircle01Icon, Clock01Icon } from 'hugeicons-react';
import { useReminders, useCreateReminder, useMarkReminderDone, useDeleteReminder } from '../api/reminders/hooks';
import type { Reminder } from '../api/reminders/api';

/* ─── Helpers ─────────────────────────────────────────────── */

const today = () => new Date().toISOString().slice(0, 10);

const daysUntil = (dueDate: string): number => {
    const due = new Date(dueDate).getTime();
    const now = new Date(today()).getTime();
    return Math.round((due - now) / 86400000);
};

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

interface UrgencyInfo {
    label: string;
    labelClass: string;
    cardClass: string;
    dotClass: string;
}

const getUrgency = (dueDate: string, isCompleted: boolean, t: TFunction): UrgencyInfo => {
    if (isCompleted) return {
        label: t('remindersPage.urgency.done', 'Done'),
        labelClass: 'text-gray-400',
        cardClass: 'bg-gray-50 border-gray-100 opacity-60',
        dotClass: 'bg-gray-300',
    };
    const d = daysUntil(dueDate);
    if (d < 0) return {
        label: t('remindersPage.urgency.overdue', '{{days}}d overdue', { days: Math.abs(d) }),
        labelClass: 'text-red-600 font-semibold',
        cardClass: 'bg-red-50 border-red-200',
        dotClass: 'bg-red-500',
    };
    if (d === 0) return {
        label: t('remindersPage.urgency.today', 'Today'),
        labelClass: 'text-orange-600 font-semibold',
        cardClass: 'bg-orange-50 border-orange-200',
        dotClass: 'bg-orange-500',
    };
    if (d === 1) return {
        label: t('remindersPage.urgency.tomorrow', 'Tomorrow'),
        labelClass: 'text-yellow-600 font-semibold',
        cardClass: 'bg-yellow-50 border-yellow-200',
        dotClass: 'bg-yellow-500',
    };
    if (d <= 5) return {
        label: t('remindersPage.urgency.inDays', 'In {{days}} days', { days: d }),
        labelClass: 'text-[#33cbcc] font-medium',
        cardClass: 'bg-[#33cbcc]/5 border-[#33cbcc]/20',
        dotClass: 'bg-[#33cbcc]',
    };
    if (d <= 10) return {
        label: t('remindersPage.urgency.inDays', 'In {{days}} days', { days: d }),
        labelClass: 'text-[#283852]',
        cardClass: 'bg-[#283852]/5 border-[#283852]/15',
        dotClass: 'bg-[#283852]',
    };
    return {
        label: t('remindersPage.urgency.inDays', 'In {{days}} days', { days: d }),
        labelClass: 'text-gray-500',
        cardClass: 'bg-gray-50 border-gray-100',
        dotClass: 'bg-gray-400',
    };
};

/* ─── Create Modal ─────────────────────────────────────────── */

const CreateModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const create = useCreateReminder();
    const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
    const isValid = form.title.trim().length > 0 && form.dueDate.length > 0;

    const handleSubmit = async () => {
        if (!isValid) return;
        await create.mutateAsync({ title: form.title.trim(), description: form.description.trim() || undefined, dueDate: form.dueDate });
        onClose();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Notification01Icon size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('remindersPage.newReminder', 'New Reminder')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            {t('remindersPage.title', 'Title')} *
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
                            placeholder={t('remindersPage.titlePlaceholder', 'What do you want to be reminded of?')}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <AlignLeftIcon size={10} />
                            {t('remindersPage.description', 'Description')}
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            placeholder={t('remindersPage.descriptionPlaceholder', 'Additional details (optional)...')}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all resize-none"
                        />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <Calendar01Icon size={10} />
                            {t('remindersPage.dueDate', 'Due Date')} *
                        </label>
                        <input
                            type="date"
                            value={form.dueDate}
                            min={today()}
                            onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || create.isPending}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#33cbcc]/20"
                    >
                        {create.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {t('remindersPage.create', 'Create')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Reminder Card ─────────────────────────────────────────── */

const ReminderCard = ({ reminder }: { reminder: Reminder }) => {
    const { t } = useTranslation();
    const markDone = useMarkReminderDone();
    const del = useDeleteReminder();
    const urgency = getUrgency(reminder.dueDate, reminder.isCompleted, t);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`flex items-start gap-4 rounded-2xl border p-4 transition-all ${urgency.cardClass}`}
        >
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${urgency.dotClass}`} />

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-gray-800 ${reminder.isCompleted ? 'line-through text-gray-400' : ''}`}>
                    {reminder.title}
                </p>
                {reminder.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{reminder.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Calendar01Icon size={11} />
                        {fmtDate(reminder.dueDate)}
                    </span>
                    <span className={`text-[11px] ${urgency.labelClass}`}>{urgency.label}</span>
                </div>
                {reminder.isCompleted && reminder.completedAt && (
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <CheckmarkCircle01Icon size={10} />
                        {t('remindersPage.completedOn', 'Done')} — {fmtDate(reminder.completedAt.slice(0, 10))}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {!reminder.isCompleted && (
                    <button
                        onClick={() => markDone.mutate(reminder.id)}
                        disabled={markDone.isPending}
                        title={t('remindersPage.markDone', 'Mark as done')}
                        className="p-2 rounded-xl hover:bg-[#33cbcc]/10 text-gray-400 hover:text-[#33cbcc] transition-colors"
                    >
                        {markDone.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Tick01Icon size={16} />}
                    </button>
                )}
                <button
                    onClick={() => del.mutate(reminder.id)}
                    disabled={del.isPending}
                    title={t('common.delete', 'Delete')}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                >
                    {del.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Delete01Icon size={16} />}
                </button>
            </div>
        </motion.div>
    );
};

/* ─── Main Page ─────────────────────────────────────────────── */

export default function Reminders() {
    const { t } = useTranslation();
    const { data: reminders = [], isLoading } = useReminders();
    const [showCreate, setShowCreate] = useState(false);
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

    const pending = reminders.filter(r => !r.isCompleted);
    const done = reminders.filter(r => r.isCompleted);
    const urgent = pending.filter(r => daysUntil(r.dueDate) <= 1);

    const displayed = filter === 'pending' ? pending : filter === 'done' ? done : reminders;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <Notification01Icon size={28} className="text-[#33cbcc]" />
                            {t('remindersPage.pageTitle', 'Reminders')}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {pending.length} {t('remindersPage.pending', 'pending')}
                            {urgent.length > 0 && (
                                <span className="ml-2 text-red-500 font-semibold">
                                    · {urgent.length} {t('remindersPage.urgent', 'urgent')}
                                </span>
                            )}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d40] transition-colors shadow-lg"
                    >
                        <Add01Icon size={16} />
                        {t('remindersPage.new', 'New')}
                    </button>
                </div>

                {/* Urgent banner */}
                {urgent.length > 0 && filter !== 'done' && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 mb-4"
                    >
                        <Alert01Icon size={18} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-700 font-medium">
                            {urgent.length === 1
                                ? t('remindersPage.urgentBanner1', '1 reminder is due today or overdue')
                                : t('remindersPage.urgentBannerN', '{{count}} reminders are due today or overdue', { count: urgent.length })}
                        </p>
                    </motion.div>
                )}

                {/* Filter tabs */}
                <div className="flex gap-2 mb-4">
                    {(['pending', 'all', 'done'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                filter === f
                                    ? 'bg-[#283852] text-white shadow'
                                    : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                        >
                            {f === 'pending' ? t('remindersPage.filterPending', 'Pending') : f === 'done' ? t('remindersPage.filterDone', 'Done') : t('remindersPage.filterAll', 'All')}
                            <span className="ml-1.5 text-[10px] opacity-70">
                                {f === 'pending' ? pending.length : f === 'done' ? done.length : reminders.length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* List */}
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loading02Icon size={28} className="animate-spin text-[#33cbcc]" />
                    </div>
                ) : displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                            <Notification01Icon size={28} className="text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium">
                            {filter === 'done'
                                ? t('remindersPage.noDone', 'No completed reminders yet')
                                : t('remindersPage.noPending', 'No reminders — you\'re all caught up!')}
                        </p>
                        {filter === 'pending' && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="mt-4 flex items-center gap-1.5 text-sm text-[#33cbcc] font-medium hover:underline"
                            >
                                <Add01Icon size={14} />
                                {t('remindersPage.createFirst', 'Create your first reminder')}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence mode="popLayout">
                            {displayed.map(r => <ReminderCard key={r.id} reminder={r} />)}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Timeline legend */}
            {!isLoading && displayed.length > 0 && (
                <div className="max-w-3xl mx-auto mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('remindersPage.legendTitle', 'Legend:')}</span>
                    {[
                        { dot: 'bg-red-500', label: t('remindersPage.legend.overdue', 'Overdue') },
                        { dot: 'bg-orange-500', label: t('remindersPage.legend.today', 'Today') },
                        { dot: 'bg-yellow-500', label: t('remindersPage.legend.tomorrow', 'Tomorrow') },
                        { dot: 'bg-[#33cbcc]', label: t('remindersPage.legend.leq5Days', '≤ 5 days') },
                        { dot: 'bg-[#283852]', label: t('remindersPage.legend.leq10Days', '≤ 10 days') },
                        { dot: 'bg-gray-400', label: t('remindersPage.legend.later', 'Later') },
                    ].map(({ dot, label }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${dot}`} />
                            <span className="text-[10px] text-gray-500">{label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
            </AnimatePresence>
        </div>
    );
}
