import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, type TFunction } from 'react-i18next';
import { Notification01Icon, Cancel01Icon, Tick01Icon, Delete01Icon, Add01Icon, Calendar01Icon, AlignLeftIcon, Loading02Icon, Alert01Icon, CheckmarkCircle01Icon, Clock01Icon, RepeatIcon } from 'hugeicons-react';
import { useReminders, useCreateReminder, useMarkReminderDone, useDeleteReminder } from '../api/reminders/hooks';
import type { Reminder } from '../api/reminders/api';

/* ─── Recurrence helpers ───────────────────────────────────── */

const RECURRENCE_OPTIONS = [
  { value: 'none',   label: 'remindersPage.recurrence.none',   fallback: 'One-time' },
  { value: 'daily',   label: 'remindersPage.recurrence.daily',   fallback: 'Daily' },
  { value: 'weekly',  label: 'remindersPage.recurrence.weekly',  fallback: 'Weekly' },
  { value: 'monthly', label: 'remindersPage.recurrence.monthly', fallback: 'Monthly' },
  { value: 'yearly',  label: 'remindersPage.recurrence.yearly',  fallback: 'Yearly' },
  { value: 'custom',  label: 'remindersPage.recurrence.custom',  fallback: 'Custom' },
];

const recurrenceLabel = (recurrence?: string, interval?: number | null, t?: TFunction): string | null => {
  if (!recurrence || recurrence === 'none') return null;
  if (recurrence === 'custom') return t ? t('remindersPage.recurrence.everyNDays', 'Every {{n}} days', { n: interval || 1 }) : `Every ${interval || 1} days`;
  const opt = RECURRENCE_OPTIONS.find(o => o.value === recurrence);
  return t ? t(opt?.label ?? '', opt?.fallback ?? '') : (opt?.fallback ?? recurrence);
};

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
  badgeClass: string;
}

const getUrgency = (dueDate: string, isCompleted: boolean, t: TFunction): UrgencyInfo => {
  if (isCompleted) return {
  label: t('remindersPage.urgency.done', 'Done'),
  badgeClass: 'bg-gray-100 text-gray-400',
  };
  const d = daysUntil(dueDate);
  if (d < 0) return {
  label: t('remindersPage.urgency.overdue', '{{days}}d overdue', { days: Math.abs(d) }),
  badgeClass: 'bg-gray-200 text-gray-700 font-semibold',
  };
  if (d === 0) return {
  label: t('remindersPage.urgency.today', 'Today'),
  badgeClass: 'bg-gray-200 text-gray-700 font-semibold',
  };
  if (d === 1) return {
  label: t('remindersPage.urgency.tomorrow', 'Tomorrow'),
  badgeClass: 'bg-gray-100 text-gray-600 font-medium',
  };
  return {
  label: t('remindersPage.urgency.inDays', 'In {{days}} days', { days: d }),
  badgeClass: 'bg-gray-100 text-gray-500',
  };
};

/* ─── Create Modal ─────────────────────────────────────────── */

const CreateModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const create = useCreateReminder();
  const [form, setForm] = useState({
  title: '',
  description: '',
  dueDate: '',
  dueTime: '',
  recurrence: 'none',
  recurrenceInterval: 7,
  });
  const isValid = form.title.trim().length > 0 && form.dueDate.length > 0;

  const handleSubmit = async () => {
  if (!isValid) return;
  await create.mutateAsync({
  title: form.title.trim(),
  description: form.description.trim() || undefined,
  dueDate: form.dueDate,
  dueTime: form.dueTime || undefined,
  recurrence: form.recurrence !== 'none' ? form.recurrence : undefined,
  recurrenceInterval: form.recurrence === 'custom' ? form.recurrenceInterval : undefined,
  });
  onClose();
  };

  const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';

  return (
  <motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e8ef]">
  <div className="flex items-center gap-3">
  <div className="w-8 h-8  bg-[#f8f9fc] flex items-center justify-center">
  <Notification01Icon size={16} className="text-[#1c2b3a]" />
  </div>
  <h3 className="text-sm font-bold text-[#1c2b3a]">{t('remindersPage.newReminder', 'New Reminder')}</h3>
  </div>
  <button onClick={onClose} className="p-1.5  hover:bg-[#f8f9fc] text-[#8892a4] transition-colors">
  <Cancel01Icon size={16} />
  </button>
  </div>

  {/* Body */}
  <div className="px-6 py-5 space-y-4">
  <div>
  <label className="block text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  {t('remindersPage.title', 'Title')} *
  </label>
  <input
  autoFocus
  type="text"
  value={form.title}
  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
  onKeyDown={e => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
  placeholder={t('remindersPage.titlePlaceholder', 'What do you want to be reminded of?')}
  className={inputCls}
  />
  </div>

  <div>
  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  <AlignLeftIcon size={10} />
  {t('remindersPage.description', 'Description')}
  </label>
  <textarea
  value={form.description}
  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
  placeholder={t('remindersPage.descriptionPlaceholder', 'Additional details (optional)...')}
  rows={2}
  className={`${inputCls} resize-none`}
  />
  </div>

  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  <Calendar01Icon size={10} />
  {t('remindersPage.dueDate', 'Date')} *
  </label>
  <input
  type="date"
  value={form.dueDate}
  min={today()}
  onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
  className={inputCls}
  />
  </div>
  <div>
  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  <Clock01Icon size={10} />
  {t('remindersPage.dueTime', 'Time')}
  </label>
  <input
  type="time"
  value={form.dueTime}
  onChange={e => setForm(p => ({ ...p, dueTime: e.target.value }))}
  className={inputCls}
  />
  </div>
  </div>

  <div>
  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  <RepeatIcon size={10} />
  {t('remindersPage.recurrence.label', 'Repeat')}
  </label>
  <select
  value={form.recurrence}
  onChange={e => setForm(p => ({ ...p, recurrence: e.target.value }))}
  className={inputCls}
  >
  {RECURRENCE_OPTIONS.map(o => (
  <option key={o.value} value={o.value}>{t(o.label, o.fallback)}</option>
  ))}
  </select>
  </div>

  {form.recurrence === 'custom' && (
  <div>
  <label className="block text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">
  {t('remindersPage.recurrence.intervalLabel', 'Every (days)')}
  </label>
  <input
  type="number"
  min={1}
  max={365}
  value={form.recurrenceInterval}
  onChange={e => setForm(p => ({ ...p, recurrenceInterval: Math.max(1, parseInt(e.target.value) || 1) }))}
  className={inputCls}
  />
  </div>
  )}
  </div>

  {/* Footer */}
  <div className="flex gap-2 px-6 py-4 border-t border-[#e5e8ef]">
  <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
  {t('common.cancel', 'Cancel')}
  </button>
  <button
  onClick={handleSubmit}
  disabled={!isValid || create.isPending}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
  const recLabel = recurrenceLabel(reminder.recurrence, reminder.recurrenceInterval, t);

  return (
  <motion.div
  layout
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8 }}
  className={`flex items-start gap-4 bg-white  border border-gray-100 shadow-sm p-4 transition-all ${reminder.isCompleted ? 'opacity-50' : ''}`}
  >
  <div className="flex-1 min-w-0">
  <div className="flex items-start justify-between gap-3">
  <p className={`text-sm font-semibold text-gray-800 leading-snug ${reminder.isCompleted ? 'line-through' : ''}`}>
  {reminder.title}
  </p>
  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${urgency.badgeClass}`}>
  {urgency.label}
  </span>
  </div>

  {reminder.description && (
  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{reminder.description}</p>
  )}

  <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2.5">
  <span className="flex items-center gap-1 text-[11px] text-gray-400">
  <Calendar01Icon size={11} />
  {fmtDate(reminder.dueDate)}
  </span>
  {reminder.dueTime && (
  <span className="flex items-center gap-1 text-[11px] text-gray-400">
  <Clock01Icon size={11} />
  {reminder.dueTime}
  </span>
  )}
  {recLabel && (
  <span className="flex items-center gap-1 text-[11px] text-gray-400">
  <RepeatIcon size={11} />
  {recLabel}
  </span>
  )}
  </div>

  {reminder.isCompleted && reminder.completedAt && (
  <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-1">
  <CheckmarkCircle01Icon size={10} />
  {t('remindersPage.completedOn', 'Done')} — {fmtDate(reminder.completedAt.slice(0, 10))}
  </p>
  )}
  </div>

  <div className="flex items-center gap-1 shrink-0 mt-0.5">
  {!reminder.isCompleted && (
  <button
  onClick={() => markDone.mutate(reminder.id)}
  disabled={markDone.isPending}
  title={t('remindersPage.markDone', 'Mark as done')}
  className="p-2  hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
  >
  {markDone.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Tick01Icon size={16} />}
  </button>
  )}
  <button
  onClick={() => del.mutate(reminder.id)}
  disabled={del.isPending}
  title={t('common.delete', 'Delete')}
  className="p-2  hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors"
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
  const urgent = pending.filter(r => daysUntil(r.dueDate) <= 0);

  const displayed = filter === 'pending' ? pending : filter === 'done' ? done : reminders;

  return (
  <div className="min-h-screen bg-gray-50 p-4 md:p-6">
  <div className="max-w-2xl mx-auto">

  {/* Header */}
  <div className="flex items-center justify-between mb-6">
  <div>
  <h1 className="text-xl font-bold text-gray-800">
  {t('remindersPage.pageTitle', 'Reminders')}
  </h1>
  <p className="text-xs text-gray-400 mt-0.5">
  {pending.length} {t('remindersPage.pending', 'pending')}
  {urgent.length > 0 && ` · ${urgent.length} ${t('remindersPage.urgent', 'overdue')}`}
  </p>
  </div>
  <button
  onClick={() => setShowCreate(true)}
  className="flex items-center gap-2 px-4 py-2  text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d40] transition-colors"
  >
  <Add01Icon size={15} />
  {t('remindersPage.new', 'New')}
  </button>
  </div>

  {/* Overdue notice */}
  {urgent.length > 0 && filter !== 'done' && (
  <motion.div
  initial={{ opacity: 0, y: -6 }}
  animate={{ opacity: 1, y: 0 }}
  className="flex items-center gap-3 bg-white border border-gray-200  px-4 py-3 mb-4 shadow-sm"
  >
  <Alert01Icon size={16} className="text-gray-500 shrink-0" />
  <p className="text-sm text-gray-600">
  {urgent.length === 1
  ? t('remindersPage.urgentBanner1', '1 reminder is overdue')
  : t('remindersPage.urgentBannerN', '{{count}} reminders are overdue', { count: urgent.length })}
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
  ? 'bg-[#283852] text-white'
  : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300'
  }`}
  >
  {f === 'pending' ? t('remindersPage.filterPending', 'Pending') : f === 'done' ? t('remindersPage.filterDone', 'Done') : t('remindersPage.filterAll', 'All')}
  <span className="ml-1.5 opacity-60">
  {f === 'pending' ? pending.length : f === 'done' ? done.length : reminders.length}
  </span>
  </button>
  ))}
  </div>

  {/* List */}
  {isLoading ? (
  <div className="flex justify-center py-16">
  <Loading02Icon size={24} className="animate-spin text-gray-300" />
  </div>
  ) : displayed.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-20 text-center">
  <div className="w-14 h-14  bg-gray-100 flex items-center justify-center mb-3">
  <Notification01Icon size={24} className="text-gray-300" />
  </div>
  <p className="text-sm text-gray-400">
  {filter === 'done'
  ? t('remindersPage.noDone', 'No completed reminders yet')
  : t('remindersPage.noPending', 'You\'re all caught up!')}
  </p>
  {filter === 'pending' && (
  <button
  onClick={() => setShowCreate(true)}
  className="mt-3 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
  >
  <Add01Icon size={13} />
  {t('remindersPage.createFirst', 'Create your first reminder')}
  </button>
  )}
  </div>
  ) : (
  <div className="space-y-2">
  <AnimatePresence mode="popLayout">
  {displayed.map(r => <ReminderCard key={r.id} reminder={r} />)}
  </AnimatePresence>
  </div>
  )}
  </div>

  {/* Create Modal */}
  <AnimatePresence>
  {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
  </AnimatePresence>
  </div>
  );
}
