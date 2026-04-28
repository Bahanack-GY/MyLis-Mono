import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft01Icon, ArrowRight01Icon, Add01Icon, Calendar01Icon, Clock01Icon, Briefcase01Icon, Tag01Icon, ZapIcon, Cancel01Icon, Loading02Icon, PlayIcon, Tick01Icon, PencilIcon, Time01Icon, FloppyDiskIcon, Delete02Icon, Task01Icon, Attachment01Icon, Download01Icon, File01Icon, Target01Icon, RefreshIcon, Alert01Icon } from 'hugeicons-react';
import {
    useMyWeekTasks,
    useSelfAssignTask,
    useUpdateTaskState,
    useUpdateTask,
    useTaskHistory,
    useCreateSubtask,
    useToggleSubtask,
    useDeleteSubtask,
    useTransferTask,
} from '../../api/tasks/hooks';
import { useMyProjects } from '../../api/projects/hooks';
import { useTaskNatures } from '../../api/task-natures/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../../api/commercial/api';
import { useCreateLeadActivity } from '../../api/commercial/hooks';
import type { ActivityType } from '../../api/commercial/types';
import type { Task, TaskDifficulty, TaskState } from '../../api/tasks/types';
import { tasksApi } from '../../api/tasks/api';

/* ─── Helper Functions ───────────────────────────────────── */

const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return formatDate(date1) === formatDate(date2);
};

const formatDisplayDate = (dateStr: string | undefined, lang: string) => {
    if (!dateStr) return '--';
    try {
        return new Date(dateStr).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const formatDisplayTime = (timeStr: string | undefined) => {
    if (!timeStr) return '';
    return timeStr.split(':').slice(0, 2).join(':');
};

const diffDays = (a: Date, b: Date) =>
    Math.round((b.getTime() - a.getTime()) / 86_400_000);

const fmtDuration = (ms: number, t: (k: string) => string) => {
    const totalMins = Math.floor(ms / 60_000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}${t('tasks.detail.dayShort')}`);
    if (hours > 0) parts.push(`${hours}${t('tasks.detail.hourShort')}`);
    if (mins > 0) parts.push(`${mins}${t('tasks.detail.minShort')}`);
    return parts.join(' ') || `0${t('tasks.detail.minShort')}`;
};

/* ─── Constants ──────────────────────────────────────────── */

const DIFFICULTY_OPTIONS: TaskDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const NEXT_STATE: Partial<Record<TaskState, TaskState>> = {
    CREATED: 'IN_PROGRESS',
    ASSIGNED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    BLOCKED: 'IN_PROGRESS',
};

type MappedStatus = 'todo' | 'in_progress' | 'done';

const STATE_TO_STATUS: Record<TaskState, MappedStatus> = {
    CREATED: 'todo',
    ASSIGNED: 'todo',
    IN_PROGRESS: 'in_progress',
    BLOCKED: 'in_progress',
    COMPLETED: 'done',
    REVIEWED: 'done',
};

const STATE_DOT_COLOR: Record<TaskState, string> = {
    CREATED:    '#b0bac9',
    ASSIGNED:   '#3b82f6',
    IN_PROGRESS:'#33cbcc',
    BLOCKED:    '#e05e5e',
    COMPLETED:  '#22c55e',
    REVIEWED:   '#8b5cf6',
};

const getDifficultyDot = (d: TaskDifficulty) =>
    d === 'EASY' ? '#33cbcc' : d === 'HARD' ? '#e05e5e' : '#f59e0b';

/* ─── Shared input styles ────────────────────────────────── */

const INPUT  = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
const SELECT = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors appearance-none cursor-pointer';
const LABEL  = 'block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1.5';

/* ─── Slide-in Panel wrapper ─────────────────────────────── */

const Panel = ({ onClose, children }: { onClose: () => void; children: React.ReactNode }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex justify-end bg-black/30"
    >
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
        >
            {children}
        </motion.div>
    </motion.div>
);

const PanelHeader = ({ label, title, onClose }: { label: string; title: string; onClose: () => void }) => (
    <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-start justify-between shrink-0">
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">{label}</p>
            <h2 className="text-lg font-bold text-[#1c2b3a] leading-tight">{title}</h2>
        </div>
        <button onClick={onClose} className="text-[#b0bac9] hover:text-[#283852] transition-colors mt-0.5">
            <Cancel01Icon size={20} />
        </button>
    </div>
);

/* ─── Task Detail Panel ──────────────────────────────────── */

const TaskDetailModal = ({
    task,
    onClose,
    onUpdateState,
    onBlockTask,
    isUpdating,
    onEdit,
    onHistory,
    onTransfer,
}: {
    task: Task;
    onClose: () => void;
    onUpdateState: (taskId: string, state: TaskState) => void;
    onBlockTask: (taskId: string, reason: string) => void;
    isUpdating: boolean;
    onEdit?: () => void;
    onHistory?: () => void;
    onTransfer?: (taskId: string) => void;
}) => {
    const { t, i18n } = useTranslation();
    const nextState = NEXT_STATE[task.state];
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [blockError, setBlockError] = useState(false);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const createSubtask = useCreateSubtask();
    const toggleSubtask = useToggleSubtask();
    const deleteSubtask = useDeleteSubtask();

    const totalTimeMs = task.startedAt && task.completedAt
        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime() - (task.totalBlockedMs ?? 0)
        : null;

    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    const handleAddSubtask = () => {
        if (newSubtaskTitle.trim()) {
            createSubtask.mutate(
                { taskId: task.id, title: newSubtaskTitle.trim() },
                { onSuccess: () => setNewSubtaskTitle('') }
            );
        }
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showBlockForm) { setShowBlockForm(false); setBlockReason(''); setBlockError(false); }
                else onClose();
            }
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose, showBlockForm]);

    const statusStyles: Record<MappedStatus, { label: string; color: string }> = {
        todo:        { label: t('tasks.status.todo'),        color: '#8892a4' },
        in_progress: { label: t('tasks.status.in_progress'), color: '#33cbcc' },
        done:        { label: t('tasks.status.done'),        color: '#22c55e' },
    };
    const status = STATE_TO_STATUS[task.state];
    const st = statusStyles[status];
    const duration = task.startDate && task.endDate
        ? diffDays(new Date(task.startDate), new Date(task.endDate)) + 1
        : null;
    const dotColor = STATE_DOT_COLOR[task.state];

    return (
        <Panel onClose={onClose}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#e5e8ef] shrink-0">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: dotColor }}>
                                {task.state.replace('_', ' ')}
                            </p>
                            {task.transferredFromWeek && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold text-[#8892a4]">
                                    <RefreshIcon size={9} />
                                    {t('tasks.transferred')}
                                </span>
                            )}
                        </div>
                        <h2 className="text-base font-bold text-[#1c2b3a] leading-tight">{task.title}</h2>
                        {task.project && <p className="text-xs text-[#8892a4] mt-0.5">{task.project.name}</p>}
                    </div>
                    <button onClick={onClose} className="text-[#b0bac9] hover:text-[#283852] transition-colors shrink-0">
                        <Cancel01Icon size={20} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {/* Dates row */}
                <div className="grid grid-cols-2 gap-px bg-[#e5e8ef] border border-[#e5e8ef]">
                    {task.startDate && (
                        <div className="bg-white p-3">
                            <p className={LABEL}>{t('tasks.detail.startDate')}</p>
                            <p className="text-sm font-semibold text-[#1c2b3a]">{formatDisplayDate(task.startDate, i18n.language)}</p>
                            {task.startTime && <p className="text-xs text-[#b0bac9] mt-0.5">{formatDisplayTime(task.startTime)}</p>}
                        </div>
                    )}
                    {task.endDate && (
                        <div className="bg-white p-3">
                            <p className={LABEL}>{t('tasks.detail.endDate')}</p>
                            <p className="text-sm font-semibold text-[#1c2b3a]">{formatDisplayDate(task.endDate, i18n.language)}</p>
                            {task.endTime && <p className="text-xs text-[#b0bac9] mt-0.5">{formatDisplayTime(task.endTime)}</p>}
                        </div>
                    )}
                    {duration !== null && (
                        <div className="bg-white p-3">
                            <p className={LABEL}>{t('tasks.detail.duration')}</p>
                            <p className="text-sm font-semibold text-[#1c2b3a]">{duration} {duration === 1 ? t('tasks.detail.day') : t('tasks.detail.days')}</p>
                        </div>
                    )}
                    <div className="bg-white p-3">
                        <p className={LABEL}>{t('tasks.table.status')}</p>
                        <p className="text-sm font-semibold" style={{ color: task.state === 'BLOCKED' ? '#e05e5e' : st.color }}>
                            {task.state === 'BLOCKED' ? t('dashboard.taskStatus.blocked') : st.label}
                        </p>
                    </div>
                </div>

                {/* Timestamps */}
                {(task.startedAt || task.completedAt) && (
                    <div className="grid grid-cols-2 gap-px bg-[#e5e8ef] border border-[#e5e8ef]">
                        {task.startedAt && (
                            <div className="bg-white p-3">
                                <p className={LABEL}>{t('tasks.detail.startedAt')}</p>
                                <p className="text-xs font-semibold text-[#1c2b3a]">{new Date(task.startedAt).toLocaleString()}</p>
                            </div>
                        )}
                        {task.completedAt && (
                            <div className="bg-white p-3">
                                <p className={LABEL}>{t('tasks.detail.completedAt')}</p>
                                <p className="text-xs font-semibold text-[#1c2b3a]">{new Date(task.completedAt).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Total time */}
                {totalTimeMs !== null && totalTimeMs > 0 && (
                    <div className="flex items-center justify-between border border-[#e5e8ef] px-4 py-3">
                        <div className="flex items-center gap-2">
                            <Clock01Icon size={13} className="text-[#33cbcc]" />
                            <p className={LABEL + ' mb-0'}>{t('tasks.detail.totalTime')}</p>
                        </div>
                        <p className="text-sm font-bold text-[#1c2b3a]">{fmtDuration(totalTimeMs, t)}</p>
                    </div>
                )}

                {/* Block reason */}
                {task.state === 'BLOCKED' && task.blockReason && (
                    <div className="border-l-2 border-[#e05e5e] pl-3 py-1">
                        <p className="text-[11px] font-semibold text-[#e05e5e] uppercase tracking-wider mb-1">{t('tasks.block.blockedReason')}</p>
                        <p className="text-sm text-[#1c2b3a]">{task.blockReason}</p>
                    </div>
                )}

                {/* Description */}
                {task.description && (
                    <div>
                        <p className={LABEL}>{t('tasks.detail.description')}</p>
                        <p className="text-sm text-[#8892a4] leading-relaxed">{task.description}</p>
                    </div>
                )}

                {/* Nature */}
                {task.nature && (
                    <div className="flex items-center gap-2">
                        <Tag01Icon size={12} className="text-[#b0bac9]" />
                        <span className="text-sm font-medium" style={{ color: task.nature.color || '#33cbcc' }}>{task.nature.name}</span>
                    </div>
                )}

                {/* Subtasks */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Task01Icon size={12} className="text-[#b0bac9]" />
                            <span className={LABEL + ' mb-0'}>{t('tasks.subtasks.title')}</span>
                            <span className="text-xs font-semibold text-[#1c2b3a]">{completedSubtasks}/{totalSubtasks}</span>
                        </div>
                    </div>

                    {totalSubtasks > 0 && (
                        <div>
                            <div className="w-full h-1.5 bg-[#e5e8ef] overflow-hidden mb-1">
                                <div className="h-full bg-[#33cbcc] transition-all duration-300" style={{ width: `${progressPercentage}%` }} />
                            </div>
                            <p className="text-[11px] text-[#b0bac9] text-right">{Math.round(progressPercentage)}%</p>
                        </div>
                    )}

                    {subtasks.length > 0 && (
                        <div className="space-y-0 divide-y divide-[#f0f2f5] max-h-48 overflow-y-auto border border-[#e5e8ef]">
                            {subtasks.map(sub => (
                                <div key={sub.id} className="flex items-center gap-2 px-3 py-2 hover:bg-[#f8f9fc] transition-colors group">
                                    <input
                                        type="checkbox"
                                        checked={sub.completed}
                                        onChange={() => toggleSubtask.mutate(sub.id)}
                                        className="w-4 h-4 border-gray-300 text-[#33cbcc] cursor-pointer"
                                    />
                                    <span className={`flex-1 text-sm ${sub.completed ? 'text-[#b0bac9] line-through' : 'text-[#1c2b3a]'}`}>
                                        {sub.title}
                                    </span>
                                    <button
                                        onClick={() => deleteSubtask.mutate(sub.id)}
                                        className="opacity-0 group-hover:opacity-100 text-[#b0bac9] hover:text-[#e05e5e] transition-all"
                                    >
                                        <Delete02Icon size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-0 border border-[#e5e8ef]">
                        <input
                            type="text"
                            value={newSubtaskTitle}
                            onChange={e => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                            placeholder={t('tasks.subtasks.addPlaceholder')}
                            className="flex-1 px-3 py-2 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none bg-transparent"
                        />
                        <button
                            onClick={handleAddSubtask}
                            disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                            className="px-3 py-2 bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {createSubtask.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Add01Icon size={14} />}
                        </button>
                    </div>
                </div>

                {/* Attachments */}
                {task.attachments && task.attachments.length > 0 && (
                    <div>
                        <p className={LABEL}>{t('tasksPage.attachments', 'Attachments')} ({task.attachments.length})</p>
                        <div className="space-y-0 divide-y divide-[#f0f2f5] border border-[#e5e8ef] max-h-40 overflow-y-auto">
                            {task.attachments.map(att => (
                                <div key={att.id} className="flex items-center gap-2 px-3 py-2">
                                    <File01Icon size={13} className="text-[#b0bac9] shrink-0" />
                                    <span className="flex-1 text-sm text-[#1c2b3a] truncate">{att.fileName}</span>
                                    <span className="text-[10px] text-[#b0bac9] shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
                                    <a href={att.filePath} download={att.fileName} target="_blank" rel="noopener noreferrer"
                                        className="text-[#b0bac9] hover:text-[#33cbcc] transition-colors shrink-0">
                                        <Download01Icon size={13} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Block form */}
                {showBlockForm && (
                    <div className="space-y-3 border border-[#e5e8ef] p-4">
                        <p className={LABEL}>{t('tasks.block.reasonLabel')}</p>
                        <textarea
                            value={blockReason}
                            onChange={e => { setBlockReason(e.target.value); setBlockError(false); }}
                            placeholder={t('tasks.block.reasonPlaceholder')}
                            className={`w-full border ${blockError ? 'border-[#e05e5e]' : 'border-[#e5e8ef]'} p-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] resize-none bg-[#f8f9fc]`}
                            rows={3}
                            autoFocus
                        />
                        {blockError && <p className="text-xs text-[#e05e5e]">{t('tasks.block.reasonRequired')}</p>}
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setShowBlockForm(false); setBlockReason(''); setBlockError(false); }}
                                className="flex-1 py-2.5 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
                            >
                                {t('tasks.block.cancel')}
                            </button>
                            <button
                                onClick={() => { if (!blockReason.trim()) { setBlockError(true); return; } onBlockTask(task.id, blockReason.trim()); }}
                                disabled={isUpdating}
                                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isUpdating ? <Loading02Icon size={13} className="animate-spin" /> : <Cancel01Icon size={13} />}
                                {t('tasks.block.confirm')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            {!showBlockForm && (
                <div className="px-6 py-4 border-t border-[#e5e8ef] flex flex-col gap-2 shrink-0">
                    <div className="flex gap-2">
                        {(task.state === 'CREATED' || task.state === 'ASSIGNED') && onTransfer && (
                            <button onClick={() => { onClose(); onTransfer(task.id); }}
                                className="flex-1 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors flex items-center justify-center gap-1.5">
                                <RefreshIcon size={12} />
                                {t('tasks.actions.transferToThisWeek')}
                            </button>
                        )}
                        {task.selfAssigned && onEdit && (
                            <button onClick={() => { onClose(); onEdit(); }}
                                className="flex-1 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#33cbcc] hover:text-[#33cbcc] transition-colors flex items-center justify-center gap-1.5">
                                <PencilIcon size={12} />
                                {t('tasks.actions.edit')}
                            </button>
                        )}
                        {onHistory && (
                            <button onClick={() => { onClose(); onHistory(); }}
                                className="flex-1 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors flex items-center justify-center gap-1.5">
                                <Time01Icon size={12} />
                                {t('tasks.actions.history')}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {nextState && (
                            <button
                                onClick={() => onUpdateState(task.id, nextState)}
                                disabled={isUpdating}
                                className="flex-1 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {isUpdating ? <Loading02Icon size={14} className="animate-spin" /> : nextState === 'IN_PROGRESS' ? <PlayIcon size={14} /> : <Tick01Icon size={14} />}
                                {nextState === 'IN_PROGRESS'
                                    ? (task.state === 'BLOCKED' ? t('tasks.actions.resumeProgress') : t('tasks.actions.startProgress'))
                                    : t('tasks.actions.markCompleted')}
                            </button>
                        )}
                        {task.state === 'IN_PROGRESS' && (
                            <button onClick={() => setShowBlockForm(true)}
                                className="py-3 px-4 text-sm font-semibold text-[#e05e5e] border border-[#e5e8ef] hover:border-[#e05e5e] transition-colors flex items-center gap-1.5">
                                <Cancel01Icon size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Panel>
    );
};

/* ─── Edit Self-Assigned Task Panel ──────────────────────── */

const EditSelfTaskModal = ({ task, onClose, onSave, isSaving }: {
    task: Task; onClose: () => void; onSave: (dto: any) => void; isSaving: boolean;
}) => {
    const { t } = useTranslation();
    const { data: projects } = useMyProjects();
    const { data: taskNatures } = useTaskNatures();
    const [form, setForm] = useState({
        title: task.title,
        description: task.description || '',
        difficulty: task.difficulty as string,
        endDate: task.endDate ? task.endDate.split('T')[0] : '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        startTime: task.startTime || '',
        projectId: task.project?.id || '',
        natureId: task.nature?.id || '',
    });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    return (
        <Panel onClose={onClose}>
            <PanelHeader label={t('tasks.edit.modalTitle')} title={form.title || '—'} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.titleLabel')}</label>
                    <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={INPUT} />
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.descriptionLabel')}</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={INPUT + ' resize-none'} />
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.difficultyLabel')}</label>
                    <div className="flex border border-[#e5e8ef] overflow-hidden">
                        {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                            <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r last:border-r-0 border-[#e5e8ef] ${
                                    form.difficulty === d ? 'bg-[#283852] text-white' : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-[#f0f2f5]'
                                }`}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.difficulty === d ? 'white' : getDifficultyDot(d as TaskDifficulty) }} />
                                {d}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.projectLabel')}</label>
                    <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))} className={SELECT}>
                        <option value="">{t('tasks.selfAssign.projectNone')}</option>
                        {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.natureLabel')}</label>
                    <select value={form.natureId} onChange={e => setForm(f => ({ ...f, natureId: e.target.value }))} className={SELECT}>
                        <option value="">{t('tasks.selfAssign.natureNone')}</option>
                        {(taskNatures || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.startDateLabel')}</label>
                        <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={INPUT} />
                    </div>
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.endDateLabel')}</label>
                        <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={INPUT} />
                    </div>
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.timeLabel')}</label>
                    <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={INPUT} />
                </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
                <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
                    {t('tasks.selfAssign.cancel')}
                </button>
                <button
                    onClick={() => onSave({ title: form.title, description: form.description || undefined, difficulty: form.difficulty, projectId: form.projectId || undefined, natureId: form.natureId || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, startTime: form.startTime || undefined })}
                    disabled={!form.title.trim() || isSaving}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${form.title.trim() && !isSaving ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-[#b0bac9] cursor-not-allowed'}`}
                >
                    {isSaving ? <Loading02Icon size={15} className="animate-spin" /> : <FloppyDiskIcon size={15} />}
                    {t('tasks.edit.save')}
                </button>
            </div>
        </Panel>
    );
};

/* ─── Task History Panel ─────────────────────────────────── */

const TaskHistoryModal = ({ taskId, onClose }: { taskId: string; onClose: () => void }) => {
    const { t } = useTranslation();
    const { data: history = [], isLoading } = useTaskHistory(taskId);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    return (
        <Panel onClose={onClose}>
            <PanelHeader label="Journal" title={t('tasks.history.title')} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-6 py-5">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loading02Icon size={22} className="animate-spin text-[#33cbcc]" /></div>
                ) : (history as any[]).length === 0 ? (
                    <p className="text-center text-sm text-[#b0bac9] py-12">{t('tasks.history.empty')}</p>
                ) : (
                    <div className="divide-y divide-[#e5e8ef]">
                        {(history as any[]).map((entry: any) => (
                            <div key={entry.id} className="py-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-[#283852]">{entry.changedByName}</span>
                                    <span className="text-[11px] text-[#b0bac9]">{new Date(entry.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="space-y-1">
                                    {Object.entries(entry.changes).map(([field, change]: [string, any]) => (
                                        <div key={field} className="text-[11px] text-[#8892a4]">
                                            <span className="font-semibold text-[#1c2b3a] capitalize">{field}:</span>{' '}
                                            <span className="line-through">{String(change.from ?? '—')}</span>
                                            {' → '}
                                            <span className="text-[#33cbcc] font-semibold">{String(change.to ?? '—')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Panel>
    );
};

/* ─── Weekly Compliance Block ────────────────────────────── */

const WeeklyComplianceBlockModal = ({ pendingTasks, onClose }: { pendingTasks: Task[]; onClose: () => void }) => {
    const { t } = useTranslation();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    return (
        <Panel onClose={onClose}>
            <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-start justify-between shrink-0">
                <div className="flex items-start gap-3">
                    <div className="w-1 self-stretch bg-[#e05e5e] shrink-0" />
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#e05e5e] mb-0.5">Attention</p>
                        <h2 className="text-base font-bold text-[#1c2b3a]">{t('tasks.weeklyCompliance.title')}</h2>
                    </div>
                </div>
                <button onClick={onClose} className="text-[#b0bac9] hover:text-[#283852] transition-colors">
                    <Cancel01Icon size={20} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <p className="text-sm text-[#8892a4]">{t('tasks.weeklyCompliance.message')}</p>
                <div className="divide-y divide-[#e5e8ef] border border-[#e5e8ef]">
                    {pendingTasks.map(task => (
                        <div key={task.id} className="px-4 py-3">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold text-[#1c2b3a] truncate">{task.title}</h4>
                                <span className="text-[10px] font-bold text-[#8892a4] shrink-0">{task.state.replace('_', ' ')}</span>
                            </div>
                            {(task.startDate || task.endDate) && (
                                <p className="text-[11px] text-[#b0bac9] mt-0.5 flex items-center gap-1">
                                    <Calendar01Icon size={10} />
                                    {task.startDate ? new Date(task.startDate).toLocaleDateString() : '--'} – {task.endDate ? new Date(task.endDate).toLocaleDateString() : '--'}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <p className="text-xs text-[#b0bac9] italic">{t('tasks.weeklyCompliance.hint')}</p>
            </div>
            <div className="px-6 py-4 border-t border-[#e5e8ef] shrink-0">
                <button onClick={onClose} className="w-full py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors">
                    {t('tasks.weeklyCompliance.understood')}
                </button>
            </div>
        </Panel>
    );
};

/* ─── Self-Assign Panel ──────────────────────────────────── */

const SelfAssignModal = ({ onClose, prefilledDate }: { onClose: () => void; prefilledDate?: string }) => {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isCommercial = role === 'COMMERCIAL';
    const selfAssign = useSelfAssignTask();
    const createActivity = useCreateLeadActivity();
    const { data: projects } = useMyProjects();
    const { data: taskNatures } = useTaskNatures();
    const { data: leadsData } = useQuery({
        queryKey: ['leads', 'list', 'planning-self-assign'],
        queryFn: () => leadsApi.getAll({}),
        enabled: isCommercial,
    });
    const leads = (leadsData as any)?.data || [];

    const [form, setForm] = useState({
        title: '',
        description: '',
        difficulty: 'MEDIUM' as TaskDifficulty,
        projectId: '',
        natureId: '',
        leadId: '',
        activityType: '' as ActivityType | '',
        startDate: prefilledDate || '',
        endDate: prefilledDate || '',
        startTime: '',
        urgent: false,
        important: false,
    });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const isValid = form.title.trim().length > 0 &&
        (!isCommercial || (!!form.activityType && !!form.natureId));

    const handleSubmit = () => {
        if (!isValid) return;
        const hasActivity = isCommercial && !!form.activityType;
        selfAssign.mutate({
            title: form.title,
            description: form.description || undefined,
            difficulty: form.difficulty,
            projectId: form.projectId || undefined,
            natureId: form.natureId || undefined,
            leadId: form.leadId || undefined,
            startDate: form.startDate || undefined,
            endDate: form.endDate || undefined,
            dueDate: form.endDate || undefined,
            startTime: form.startTime || undefined,
            urgent: form.urgent,
            important: form.important,
        }, {
            onSuccess: () => {
                if (hasActivity) {
                    createActivity.mutate({
                        type: form.activityType as ActivityType,
                        date: form.startDate || new Date().toISOString().split('T')[0],
                        leadId: form.leadId || undefined,
                    });
                }
                onClose();
            },
        });
    };

    return (
        <Panel onClose={onClose}>
            <PanelHeader label={t('tasks.selfAssign.modalTitle')} title={t('tasks.selfAssign.titlePlaceholder')} onClose={onClose} />
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.titleLabel')}</label>
                    <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
                        placeholder={t('tasks.selfAssign.titlePlaceholder')} autoFocus className={INPUT} />
                </div>
                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.descriptionLabel')}</label>
                    <textarea value={form.description} onChange={e => update('description', e.target.value)}
                        placeholder={t('tasks.selfAssign.descriptionPlaceholder')} rows={3} className={INPUT + ' resize-none'} />
                </div>

                {!isCommercial && (
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.difficultyLabel')}</label>
                        <div className="flex border border-[#e5e8ef] overflow-hidden">
                            {DIFFICULTY_OPTIONS.map(d => (
                                <button key={d} type="button" onClick={() => update('difficulty', d)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-r last:border-r-0 border-[#e5e8ef] ${
                                        form.difficulty === d ? 'bg-[#283852] text-white' : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-[#f0f2f5]'
                                    }`}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: form.difficulty === d ? 'white' : getDifficultyDot(d) }} />
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!isCommercial && (
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.projectLabel')}</label>
                        <select value={form.projectId} onChange={e => update('projectId', e.target.value)} className={SELECT}>
                            <option value="">{t('tasks.selfAssign.projectNone')}</option>
                            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}

                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.natureLabel')}</label>
                    <select value={form.natureId} onChange={e => update('natureId', e.target.value)} className={SELECT}>
                        <option value="">{t('tasks.selfAssign.natureNone')}</option>
                        {(taskNatures || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                    </select>
                </div>

                {isCommercial && (
                    <>
                        <div>
                            <label className={LABEL}>{t('tasks.selfAssign.leadLabel', 'Lead')}</label>
                            <select value={form.leadId} onChange={e => update('leadId', e.target.value)} className={SELECT}>
                                <option value="">{t('tasks.selfAssign.leadNone', 'Aucun lead')}</option>
                                {leads.map((lead: any) => <option key={lead.id} value={lead.id}>{lead.code} — {lead.company}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={LABEL}>{t('tasks.selfAssign.activityTypeLabel', "Type d'activité")}</label>
                            <select value={form.activityType} onChange={e => update('activityType', e.target.value as ActivityType | '')} className={SELECT}>
                                <option value="">{t('tasks.selfAssign.activityTypeNone', 'Aucune activité')}</option>
                                {(['VISITE_CLIENT','VISITE_PROSPECT','APPEL','EMAIL','REUNION','DEMO','RELANCE','AUTRE'] as ActivityType[]).map(at => (
                                    <option key={at} value={at}>{at.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.startDateLabel')}</label>
                        <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={INPUT} />
                    </div>
                    <div>
                        <label className={LABEL}>{t('tasks.selfAssign.endDateLabel')}</label>
                        <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} className={INPUT} />
                    </div>
                </div>

                <div>
                    <label className={LABEL}>{t('tasks.selfAssign.timeLabel')}</label>
                    <input type="time" value={form.startTime} onChange={e => update('startTime', e.target.value)} className={INPUT} />
                </div>

                <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.urgent} onChange={e => update('urgent', e.target.checked)} className="w-4 h-4 border-gray-300" />
                        <span className="text-xs font-medium text-[#1c2b3a]">{t('tasksPage.urgent')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={form.important} onChange={e => update('important', e.target.checked)} className="w-4 h-4 border-gray-300" />
                        <span className="text-xs font-medium text-[#1c2b3a]">{t('tasksPage.important')}</span>
                    </label>
                </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
                <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
                    {t('tasks.selfAssign.cancel')}
                </button>
                <button onClick={handleSubmit} disabled={!isValid || selfAssign.isPending}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${isValid && !selfAssign.isPending ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-[#b0bac9] cursor-not-allowed'}`}>
                    {selfAssign.isPending ? <Loading02Icon size={15} className="animate-spin" /> : <Add01Icon size={15} />}
                    {t('tasks.selfAssign.submit')}
                </button>
            </div>
        </Panel>
    );
};

/* ─── Task Card ──────────────────────────────────────────── */

const TaskCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const pct = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
    const dotColor = STATE_DOT_COLOR[task.state];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={onClick}
            className="bg-white border border-[#e5e8ef] hover:border-[#33cbcc]/40 transition-colors cursor-pointer"
        >
            {/* State accent line */}
            <div className="h-0.5" style={{ backgroundColor: dotColor }} />

            <div className="p-3">
                <h4 className="text-sm font-semibold text-[#1c2b3a] line-clamp-2 mb-2">{task.title}</h4>

                {task.startTime && (
                    <div className="flex items-center gap-1 text-xs text-[#b0bac9] mb-2">
                        <Clock01Icon size={11} />
                        <span>{formatDisplayTime(task.startTime)}</span>
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    {task.project && (
                        <div className="flex items-center gap-1.5 text-xs text-[#8892a4]">
                            <Briefcase01Icon size={11} className="text-[#b0bac9] shrink-0" />
                            <span className="truncate">{task.project.name}</span>
                        </div>
                    )}
                    {task.nature && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <Tag01Icon size={11} className="text-[#b0bac9] shrink-0" />
                            <span className="truncate" style={{ color: task.nature.color || '#33cbcc' }}>{task.nature.name}</span>
                        </div>
                    )}
                </div>

                {totalSubtasks > 0 && (
                    <div className="mt-3 pt-2 border-t border-[#f0f2f5]">
                        <div className="flex items-center justify-between text-[10px] text-[#b0bac9] mb-1.5">
                            <span className="flex items-center gap-1"><Task01Icon size={9} /> Subtasks</span>
                            <span className="font-semibold text-[#1c2b3a]">{completedSubtasks}/{totalSubtasks}</span>
                        </div>
                        <div className="w-full h-1 bg-[#e5e8ef] overflow-hidden">
                            <div className="h-full bg-[#33cbcc] transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getDifficultyDot(task.difficulty) }} title={task.difficulty} />
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="flex items-center gap-0.5 text-[10px] text-[#b0bac9]">
                            <Attachment01Icon size={9} />
                            <span>{task.attachments.length}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

/* ─── Day Column ─────────────────────────────────────────── */

const DayColumn = ({ date, tasks, isToday, onAddTask, onTaskClick }: {
    date: Date; tasks: Task[]; isToday: boolean; onAddTask: () => void; onTaskClick: (task: Task) => void;
}) => {
    const { i18n, t } = useTranslation();
    const dayName = date.toLocaleDateString(i18n.language, { weekday: 'short' });
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString(i18n.language, { month: 'short' });

    return (
        <div className="flex flex-col min-w-[220px] md:min-w-0 flex-1">
            {/* Day header */}
            <div className={`py-3 px-2 text-center border-b-2 ${isToday ? 'border-[#33cbcc] bg-[#33cbcc]/5' : 'border-[#e5e8ef] bg-white'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${isToday ? 'text-[#33cbcc]' : 'text-[#8892a4]'}`}>{dayName}</p>
                <p className={`text-2xl font-black leading-tight mt-0.5 ${isToday ? 'text-[#33cbcc]' : 'text-[#1c2b3a]'}`}>{dayNumber}</p>
                <p className="text-[10px] text-[#b0bac9]">{month}</p>
            </div>

            {/* Tasks */}
            <div className="flex-1 bg-[#f8f9fc] border border-t-0 border-[#e5e8ef] divide-y divide-[#e5e8ef] min-h-[300px] md:min-h-[420px] max-h-[500px] md:max-h-none overflow-y-auto flex flex-col">
                <AnimatePresence mode="popLayout">
                    {tasks.map(task => (
                        <div key={task.id} className="p-2">
                            <TaskCard task={task} onClick={() => onTaskClick(task)} />
                        </div>
                    ))}
                </AnimatePresence>

                <button
                    onClick={onAddTask}
                    className="mt-auto mx-2 mb-2 py-2.5 border border-dashed border-[#d4d8e1] text-[#b0bac9] hover:border-[#33cbcc] hover:text-[#33cbcc] hover:bg-white transition-colors flex items-center justify-center gap-1.5 text-xs font-medium"
                >
                    <Add01Icon size={13} />
                    <span className="hidden sm:inline">{t('planning.addTask')}</span>
                    <span className="sm:hidden">+</span>
                </button>
            </div>
        </div>
    );
};

/* ─── Main Planning Component ────────────────────────────── */

export default function Planning() {
    const { t, i18n } = useTranslation();
    const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
    const [showModal, setShowModal] = useState(false);
    const [showComplianceBlock, setShowComplianceBlock] = useState(false);
    const [compliancePendingTasks, setCompliancePendingTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState<string | undefined>();
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [viewingHistoryTaskId, setViewingHistoryTaskId] = useState<string | null>(null);

    const weekStartISO = formatDate(currentMonday);
    const { data: tasks = [], isLoading } = useMyWeekTasks(weekStartISO);

    const updateTaskState = useUpdateTaskState();
    const updateTask = useUpdateTask();
    const transferTask = useTransferTask();

    const tasksByDay = new Map<string, Task[]>();
    for (let i = 0; i < 7; i++) {
        tasksByDay.set(formatDate(addDays(currentMonday, i)), []);
    }
    tasks.forEach(task => {
        const dateSource = (task.state === 'COMPLETED' || task.state === 'REVIEWED') && task.completedAt
            ? task.completedAt : task.startDate;
        if (dateSource) {
            const key = formatDate(new Date(dateSource));
            const existing = tasksByDay.get(key) || [];
            tasksByDay.set(key, [...existing, task]);
        }
    });

    const goToPrevWeek = () => setCurrentMonday(prev => addDays(prev, -7));
    const goToNextWeek = () => setCurrentMonday(prev => addDays(prev, 7));
    const goToToday   = () => setCurrentMonday(getMonday(new Date()));

    const handleAddTask = async (date: string) => {
        try {
            const result = await tasksApi.weeklyCheck();
            if (!result.canCreate) { setCompliancePendingTasks(result.pendingTasks); setShowComplianceBlock(true); }
            else { setSelectedDate(date); setShowModal(true); }
        } catch {
            setSelectedDate(date); setShowModal(true);
        }
    };

    const handleUpdateState = (taskId: string, state: TaskState) => {
        updateTaskState.mutate({ taskId, state }, { onSuccess: () => setSelectedTask(null) });
    };

    const handleBlockTask = (taskId: string, reason: string) => {
        updateTaskState.mutate({ taskId, state: 'BLOCKED', blockReason: reason }, { onSuccess: () => setSelectedTask(null) });
    };

    const handleTransferTask = (taskId: string) => {
        transferTask.mutate({ taskId, targetWeekStart: weekStartISO }, { onSuccess: () => setSelectedTask(null) });
    };

    const handleSaveEdit = (dto: any) => {
        if (editingTask) {
            updateTask.mutate({ id: editingTask.id, dto }, { onSuccess: () => setEditingTask(null) });
        }
    };

    const weekEnd = addDays(currentMonday, 6);
    const weekRange = `${currentMonday.getDate()} ${currentMonday.toLocaleDateString(i18n.language, { month: 'short' })} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString(i18n.language, { month: 'short' })} ${weekEnd.getFullYear()}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#33cbcc] mb-1">
                    {i18n.language === 'fr' ? 'Semaine' : 'Week'}
                </p>
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b3a] leading-none tracking-tight">
                        {t('planning.title')}
                    </h1>

                    {/* Week navigation */}
                    <div className="flex items-center gap-0 border border-[#e5e8ef]">
                        <button onClick={goToPrevWeek} className="p-2.5 text-[#8892a4] hover:text-[#283852] hover:bg-[#f0f2f5] transition-colors border-r border-[#e5e8ef]">
                            <ArrowLeft01Icon size={16} />
                        </button>
                        <span className="px-4 text-sm font-semibold text-[#1c2b3a] whitespace-nowrap">{weekRange}</span>
                        <button onClick={goToToday} className="px-3 py-2.5 text-xs font-semibold text-[#8892a4] hover:text-[#283852] hover:bg-[#f0f2f5] transition-colors border-x border-[#e5e8ef]">
                            {t('planning.today')}
                        </button>
                        <button onClick={goToNextWeek} className="p-2.5 text-[#8892a4] hover:text-[#283852] hover:bg-[#f0f2f5] transition-colors">
                            <ArrowRight01Icon size={16} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {!isLoading && totalTasks > 0 && (
                    <div className="mt-5 flex items-center gap-4">
                        <div className="flex-1 h-3 bg-[#e5e8ef] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercentage}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut' }}
                                className="h-full bg-[#33cbcc]"
                            />
                        </div>
                        <p className="text-xs font-semibold text-[#8892a4] whitespace-nowrap shrink-0">
                            {completedTasks}/{totalTasks} {t('planning.tasksCompleted')} · <span className="text-[#33cbcc]">{Math.round(progressPercentage)}%</span>
                        </p>
                    </div>
                )}

                {/* State legend */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                    {(Object.entries(STATE_DOT_COLOR) as [TaskState, string][]).map(([state, color]) => (
                        <div key={state} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-[11px] text-[#8892a4]">{state.replace('_', ' ')}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Week grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-80">
                    <Loading02Icon size={24} className="animate-spin text-[#33cbcc]" />
                </div>
            ) : (
                <>
                    {/* Mobile: horizontal scroll */}
                    <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4">
                        <div className="flex gap-0 border border-[#e5e8ef] min-w-max">
                            {[...Array(7)].map((_, i) => {
                                const date = addDays(currentMonday, i);
                                const dateKey = formatDate(date);
                                return (
                                    <DayColumn key={dateKey} date={date} tasks={tasksByDay.get(dateKey) || []}
                                        isToday={isSameDay(date, today)} onAddTask={() => handleAddTask(dateKey)}
                                        onTaskClick={setSelectedTask} />
                                );
                            })}
                        </div>
                    </div>

                    {/* Desktop: grid */}
                    <div className="hidden md:flex border border-[#e5e8ef]">
                        {[...Array(7)].map((_, i) => {
                            const date = addDays(currentMonday, i);
                            const dateKey = formatDate(date);
                            return (
                                <DayColumn key={dateKey} date={date} tasks={tasksByDay.get(dateKey) || []}
                                    isToday={isSameDay(date, today)} onAddTask={() => handleAddTask(dateKey)}
                                    onTaskClick={setSelectedTask} />
                            );
                        })}
                    </div>
                </>
            )}

            {/* Panels */}
            <AnimatePresence>
                {showComplianceBlock && (
                    <WeeklyComplianceBlockModal pendingTasks={compliancePendingTasks} onClose={() => setShowComplianceBlock(false)} />
                )}
                {showModal && (
                    <SelfAssignModal onClose={() => { setShowModal(false); setSelectedDate(undefined); }} prefilledDate={selectedDate} />
                )}
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdateState={handleUpdateState}
                        onBlockTask={handleBlockTask}
                        isUpdating={updateTaskState.isPending}
                        onEdit={selectedTask.selfAssigned ? () => { setEditingTask(selectedTask); setSelectedTask(null); } : undefined}
                        onHistory={() => { setViewingHistoryTaskId(selectedTask.id); setSelectedTask(null); }}
                        onTransfer={handleTransferTask}
                    />
                )}
                {editingTask && (
                    <EditSelfTaskModal task={editingTask} onClose={() => setEditingTask(null)} onSave={handleSaveEdit} isSaving={updateTask.isPending} />
                )}
                {viewingHistoryTaskId && (
                    <TaskHistoryModal taskId={viewingHistoryTaskId} onClose={() => setViewingHistoryTaskId(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
