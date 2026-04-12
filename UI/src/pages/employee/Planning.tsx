import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar,
    Clock,
    Briefcase,
    Tag,
    Zap,
    X,
    Loader2,
    Ban,
    Play,
    CheckCircle,
    Pencil,
    History,
    Save,
    Trash2,
    ListTodo,
    Paperclip,
    Download,
    FileText,
    Target,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';
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

const fmtDate = (d: string | undefined) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
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

/* ─── Task Detail Modal ──────────────────────────────────── */

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
    const { t } = useTranslation();
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

    const handleToggleSubtask = (subtaskId: string) => {
        toggleSubtask.mutate(subtaskId);
    };

    const handleDeleteSubtask = (subtaskId: string) => {
        deleteSubtask.mutate(subtaskId);
    };

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (showBlockForm) {
                    setShowBlockForm(false);
                    setBlockReason('');
                    setBlockError(false);
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose, showBlockForm]);

    const handleBlockSubmit = () => {
        if (!blockReason.trim()) {
            setBlockError(true);
            return;
        }
        onBlockTask(task.id, blockReason.trim());
    };

    const canBlock = task.state === 'IN_PROGRESS';
    const status = STATE_TO_STATUS[task.state];

    const statusStyles: Record<MappedStatus, { cls: string; label: string }> = {
        todo: { cls: 'bg-[#283852]/10 text-[#283852]', label: t('tasks.status.todo') },
        in_progress: { cls: 'bg-[#33cbcc]/10 text-[#33cbcc]', label: t('tasks.status.in_progress') },
        done: { cls: 'bg-gray-100 text-gray-500', label: t('tasks.status.done') },
    };
    const st = statusStyles[status];

    const dotColor = task.state === 'BLOCKED' ? '#283852' : task.difficulty === 'EASY' ? '#33cbcc' : '#283852';

    const duration =
        task.startDate && task.endDate
            ? diffDays(new Date(task.startDate), new Date(task.endDate)) + 1
            : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="h-1.5" style={{ backgroundColor: dotColor }} />

                <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                <h3 className="text-lg font-bold text-gray-800 truncate">{task.title}</h3>
                                {task.transferredFromWeek && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852] shrink-0">
                                        <RotateCcw size={10} />
                                        {t('tasks.transferred')}
                                    </span>
                                )}
                            </div>
                            {task.project && (
                                <p className="text-sm text-gray-500 pl-5">{task.project.name}</p>
                            )}
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {task.startDate && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.detail.startDate')}</p>
                                <p className="text-sm font-semibold text-gray-800">{fmtDate(task.startDate)}</p>
                            </div>
                        )}
                        {task.endDate && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.detail.endDate')}</p>
                                <p className="text-sm font-semibold text-gray-800">{fmtDate(task.endDate)}</p>
                            </div>
                        )}
                        {duration !== null && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Clock size={11} className="text-gray-400" />
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasks.detail.duration')}</p>
                                </div>
                                <p className="text-sm font-semibold text-gray-800">
                                    {duration} {duration === 1 ? t('tasks.detail.day') : t('tasks.detail.days')}
                                </p>
                            </div>
                        )}
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasks.table.status')}</p>
                            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${task.state === 'BLOCKED' ? 'bg-[#283852]/10 text-[#283852]' : st.cls}`}>
                                {task.state === 'BLOCKED' ? t('dashboard.taskStatus.blocked') : st.label}
                            </span>
                        </div>
                    </div>

                    {/* Timestamps */}
                    {(task.startedAt || task.completedAt) && (
                        <div className="grid grid-cols-2 gap-3">
                            {task.startedAt && (
                                <div className="bg-[#283852]/10 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-[#283852] uppercase tracking-wider mb-1">{t('tasks.detail.startedAt')}</p>
                                    <p className="text-sm font-semibold text-gray-800">{new Date(task.startedAt).toLocaleString()}</p>
                                </div>
                            )}
                            {task.completedAt && (
                                <div className="bg-[#33cbcc]/10 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-[#33cbcc] uppercase tracking-wider mb-1">{t('tasks.detail.completedAt')}</p>
                                    <p className="text-sm font-semibold text-gray-800">{new Date(task.completedAt).toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    )}
                    {totalTimeMs !== null && totalTimeMs > 0 && (
                        <div className="bg-[#33cbcc]/5 border border-[#33cbcc]/15 rounded-xl p-3 flex items-center gap-2">
                            <Clock size={14} className="text-[#33cbcc]" />
                            <p className="text-[10px] font-semibold text-[#33cbcc] uppercase tracking-wider">{t('tasks.detail.totalTime')}</p>
                            <p className="text-sm font-bold text-gray-800 ml-auto">{fmtDuration(totalTimeMs, t)}</p>
                        </div>
                    )}

                    {/* Block reason display */}
                    {task.state === 'BLOCKED' && task.blockReason && (
                        <div className="bg-[#283852]/10 border border-gray-200 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Ban size={11} className="text-[#283852]" />
                                <p className="text-[10px] font-semibold text-[#283852] uppercase tracking-wider">{t('tasks.block.blockedReason')}</p>
                            </div>
                            <p className="text-sm text-[#283852]">{task.blockReason}</p>
                        </div>
                    )}

                    {task.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.detail.description')}</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
                        </div>
                    )}

                    {task.project && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.detail.project')}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Briefcase size={14} className="text-[#283852]" />
                                <span className="font-medium">{task.project.name}</span>
                            </div>
                        </div>
                    )}

                    {task.nature && (
                        <div className="flex items-center gap-2">
                            <Tag size={12} className="text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasksPage.nature')}</span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: task.nature.color || '#33cbcc' }}
                            >
                                {task.nature.name}
                            </span>
                        </div>
                    )}

                    {/* Subtasks Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ListTodo size={12} className="text-gray-400" />
                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                    {t('tasks.subtasks.title')}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                    {completedSubtasks}/{totalSubtasks}
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {totalSubtasks > 0 && (
                            <div className="space-y-1">
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#33cbcc] transition-all duration-300 ease-out"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 text-right font-medium">
                                    {Math.round(progressPercentage)}% {t('tasks.subtasks.complete')}
                                </p>
                            </div>
                        )}

                        {/* Subtask List */}
                        {subtasks.length > 0 && (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {subtasks.map((subtask) => (
                                    <div
                                        key={subtask.id}
                                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={subtask.completed}
                                            onChange={() => handleToggleSubtask(subtask.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-[#33cbcc] focus:ring-[#33cbcc] focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span
                                            className={`flex-1 text-sm ${
                                                subtask.completed
                                                    ? 'text-gray-400 line-through'
                                                    : 'text-gray-700'
                                            }`}
                                        >
                                            {subtask.title}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteSubtask(subtask.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add Subtask Input */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubtask();
                                    }
                                }}
                                placeholder={t('tasks.subtasks.addPlaceholder')}
                                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc]"
                            />
                            <button
                                onClick={handleAddSubtask}
                                disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                                className="p-2 rounded-lg bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {createSubtask.isPending ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Plus size={16} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Attachments */}
                    {task.attachments && task.attachments.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Paperclip size={12} className="text-gray-400" />
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasksPage.attachments', 'Attachments')}</p>
                                <span className="text-xs font-medium text-gray-500">{task.attachments.length}</span>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                {task.attachments.map(att => (
                                    <div key={att.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <FileText size={14} className="text-gray-400 shrink-0" />
                                        <span className="flex-1 text-sm text-gray-700 truncate">{att.fileName}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
                                        <a
                                            href={att.filePath}
                                            download={att.fileName}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-[#33cbcc] transition-colors shrink-0"
                                        >
                                            <Download size={14} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Block reason form */}
                    {showBlockForm && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-semibold text-[#283852] uppercase tracking-wider">{t('tasks.block.reasonLabel')}</p>
                            <textarea
                                value={blockReason}
                                onChange={(e) => { setBlockReason(e.target.value); setBlockError(false); }}
                                placeholder={t('tasks.block.reasonPlaceholder')}
                                className={`w-full rounded-xl border ${blockError ? 'border-[#283852]/30 ring-2 ring-[#283852]/10' : 'border-gray-200'} p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] resize-none`}
                                rows={3}
                                autoFocus
                            />
                            {blockError && (
                                <p className="text-xs text-[#283852]">{t('tasks.block.reasonRequired')}</p>
                            )}
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => { setShowBlockForm(false); setBlockReason(''); setBlockError(false); }}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    {t('tasks.block.cancel')}
                                </button>
                                <button
                                    onClick={handleBlockSubmit}
                                    disabled={!blockReason.trim() || isUpdating}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#283852] hover:bg-[#283852]/80 disabled:opacity-50 transition-colors flex items-center gap-2"
                                >
                                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                                    {t('tasks.block.confirm')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {!showBlockForm && (
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                        {(task.state === 'CREATED' || task.state === 'ASSIGNED') && onTransfer && (
                            <button
                                onClick={() => { onClose(); onTransfer(task.id); }}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors flex items-center gap-1.5"
                            >
                                <RotateCcw size={13} />
                                {t('tasks.actions.transferToThisWeek')}
                            </button>
                        )}
                        {task.selfAssigned && onEdit && (
                            <button
                                onClick={() => { onClose(); onEdit(); }}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors flex items-center gap-1.5"
                            >
                                <Pencil size={13} />
                                {t('tasks.actions.edit')}
                            </button>
                        )}
                        {onHistory && (
                            <button
                                onClick={() => { onClose(); onHistory(); }}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors flex items-center gap-1.5"
                            >
                                <History size={13} />
                                {t('tasks.actions.history')}
                            </button>
                        )}
                        <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            {t('tasks.detail.close')}
                        </button>
                        {canBlock && (
                            <button
                                onClick={() => setShowBlockForm(true)}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors flex items-center gap-2"
                            >
                                <Ban size={14} />
                                {t('tasks.actions.markBlocked')}
                            </button>
                        )}
                        {nextState && (
                            <button
                                onClick={() => onUpdateState(task.id, nextState)}
                                disabled={isUpdating}
                                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#283852] hover:bg-[#1e2d42] disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isUpdating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : nextState === 'IN_PROGRESS' ? (
                                    <Play size={14} />
                                ) : (
                                    <CheckCircle size={14} />
                                )}
                                {nextState === 'IN_PROGRESS'
                                    ? (task.state === 'BLOCKED' ? t('tasks.actions.resumeProgress') : t('tasks.actions.startProgress'))
                                    : t('tasks.actions.markCompleted')}
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
};

/* ─── Edit Self-Assigned Task Modal ─────────────────────── */

const EditSelfTaskModal = ({
    task,
    onClose,
    onSave,
    isSaving,
}: {
    task: Task;
    onClose: () => void;
    onSave: (dto: any) => void;
    isSaving: boolean;
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

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const difficultyColors: Record<string, string> = {
        EASY: 'border-[#33cbcc] bg-[#33cbcc]/10 text-[#33cbcc]',
        MEDIUM: 'border-[#283852] bg-[#283852]/10 text-[#283852]',
        HARD: 'border-[#283852]/30 bg-[#283852]/10 text-[#283852]',
    };

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Pencil size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.edit.modalTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tasks.selfAssign.titleLabel')}</label>
                        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tasks.selfAssign.descriptionLabel')}</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.selfAssign.difficultyLabel')}</label>
                        <div className="flex gap-2">
                            {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                                <button key={d} type="button" onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${form.difficulty === d ? difficultyColors[d] : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'}`}>
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Briefcase size={10} />{t('tasks.selfAssign.projectLabel')}</label>
                        <select value={form.projectId} onChange={e => setForm(f => ({ ...f, projectId: e.target.value }))}
                            className={`${inputCls} appearance-none cursor-pointer`}>
                            <option value="">{t('tasks.selfAssign.projectNone')}</option>
                            {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Tag size={10} />{t('tasks.selfAssign.natureLabel')}</label>
                        <select value={form.natureId} onChange={e => setForm(f => ({ ...f, natureId: e.target.value }))}
                            className={`${inputCls} appearance-none cursor-pointer`}>
                            <option value="">{t('tasks.selfAssign.natureNone')}</option>
                            {(taskNatures || []).map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Calendar size={10} />{t('tasks.selfAssign.startDateLabel')}</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Calendar size={10} />{t('tasks.selfAssign.endDateLabel')}</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Clock size={10} />{t('tasks.selfAssign.timeLabel')}</label>
                            <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inputCls} />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('tasks.selfAssign.cancel')}</button>
                    <button
                        onClick={() => onSave({ title: form.title, description: form.description || undefined, difficulty: form.difficulty, projectId: form.projectId || undefined, natureId: form.natureId || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, startTime: form.startTime || undefined })}
                        disabled={!form.title.trim() || isSaving}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${form.title.trim() ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {t('tasks.edit.save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Task History Modal ──────────────────────────────────── */

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
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
                            <History size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.history.title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
                    ) : (history as any[]).length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">{t('tasks.history.empty')}</p>
                    ) : (
                        <div className="space-y-4">
                            {(history as any[]).map((entry: any) => (
                                <div key={entry.id} className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#283852]">{entry.changedByName}</span>
                                        <span className="text-[11px] text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(entry.changes).map(([field, change]: [string, any]) => (
                                            <div key={field} className="text-[11px] text-gray-600">
                                                <span className="font-medium text-gray-700 capitalize">{field}:</span>{' '}
                                                <span className="line-through text-gray-400">{String(change.from ?? '—')}</span>
                                                {' → '}
                                                <span className="text-[#33cbcc] font-medium">{String(change.to ?? '—')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Weekly Compliance Block Modal ─────────────────────── */

const WeeklyComplianceBlockModal = ({ pendingTasks, onClose }: { pendingTasks: Task[]; onClose: () => void }) => {
    const { t } = useTranslation();

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    const fmtDate = (d: string) => new Date(d).toLocaleDateString();

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="h-1.5 bg-[#283852] shrink-0" />

                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
                            <AlertCircle size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.weeklyCompliance.title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-600">{t('tasks.weeklyCompliance.message')}</p>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {pendingTasks.map(task => (
                            <div key={task.id} className="bg-[#283852]/5 border border-gray-200 rounded-xl p-3">
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-gray-800 truncate">{task.title}</h4>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852] shrink-0">
                                        {task.state}
                                    </span>
                                </div>
                                {(task.startDate || task.endDate) && (
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                                        <Calendar size={10} />
                                        <span>{task.startDate ? fmtDate(task.startDate) : '--'} - {task.endDate ? fmtDate(task.endDate) : '--'}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-gray-400 italic">{t('tasks.weeklyCompliance.hint')}</p>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors"
                    >
                        {t('tasks.weeklyCompliance.understood')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Self-Assign Modal ──────────────────────────────────── */

const SelfAssignModal = ({
    onClose,
    prefilledDate,
}: {
    onClose: () => void;
    prefilledDate?: string;
}) => {
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
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handler);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const isValid = form.title.trim().length > 0 &&
        (!isCommercial || (!!form.activityType && !!form.natureId));

    const difficultyColors: Record<TaskDifficulty, string> = {
        EASY: 'border-[#33cbcc] bg-[#33cbcc]/10 text-[#33cbcc]',
        MEDIUM: 'border-[#283852] bg-[#283852]/10 text-[#283852]',
        HARD: 'border-[#283852]/30 bg-[#283852]/10 text-[#283852]',
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Zap size={16} className="sm:w-[18px] sm:h-[18px] text-[#33cbcc]" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800">
                            {t('tasks.selfAssign.modalTitle')}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={16} className="sm:w-[18px] sm:h-[18px]" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                    {/* Title */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            {t('tasks.selfAssign.titleLabel')}
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => update('title', e.target.value)}
                            placeholder={t('tasks.selfAssign.titlePlaceholder')}
                            autoFocus
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            {t('tasks.selfAssign.descriptionLabel')}
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => update('description', e.target.value)}
                            placeholder={t('tasks.selfAssign.descriptionPlaceholder')}
                            rows={3}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all resize-none"
                        />
                    </div>

                    {/* Difficulty (non-commercial only) */}
                    {!isCommercial && (
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('tasks.selfAssign.difficultyLabel')}
                        </label>
                        <div className="flex gap-2">
                            {DIFFICULTY_OPTIONS.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => update('difficulty', d)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                                        form.difficulty === d
                                            ? difficultyColors[d]
                                            : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                                    }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Project (non-commercial only) */}
                    {!isCommercial && (
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <Briefcase size={10} />
                            {t('tasks.selfAssign.projectLabel')}
                        </label>
                        <select
                            value={form.projectId}
                            onChange={e => update('projectId', e.target.value)}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                        >
                            <option value="">{t('tasks.selfAssign.projectNone')}</option>
                            {(projects || []).map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    )}

                    {/* Nature */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <Tag size={10} />
                            {t('tasks.selfAssign.natureLabel')}
                        </label>
                        <select
                            value={form.natureId}
                            onChange={e => update('natureId', e.target.value)}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                        >
                            <option value="">{t('tasks.selfAssign.natureNone')}</option>
                            {(taskNatures || []).map(n => (
                                <option key={n.id} value={n.id}>
                                    {n.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Lead + Activity type (COMMERCIAL only) */}
                    {isCommercial && (
                        <>
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <Target size={10} />
                                    {t('tasks.selfAssign.leadLabel', 'Lead')}
                                </label>
                                <select
                                    value={form.leadId}
                                    onChange={e => update('leadId', e.target.value)}
                                    className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">{t('tasks.selfAssign.leadNone', 'Aucun lead')}</option>
                                    {leads.map((lead: any) => (
                                        <option key={lead.id} value={lead.id}>{lead.code} — {lead.company}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <Target size={10} />
                                    {t('tasks.selfAssign.activityTypeLabel', "Type d'activité")}
                                </label>
                                <select
                                    value={form.activityType}
                                    onChange={e => update('activityType', e.target.value as ActivityType | '')}
                                    className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">{t('tasks.selfAssign.activityTypeNone', 'Aucune activité')}</option>
                                    {(['VISITE_CLIENT','VISITE_PROSPECT','APPEL','EMAIL','REUNION','DEMO','RELANCE','AUTRE'] as ActivityType[]).map(at => (
                                        <option key={at} value={at}>{at.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    {/* Start date + End date + Time */}
                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                <Calendar size={10} />
                                {t('tasks.selfAssign.startDateLabel')}
                            </label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => update('startDate', e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                <Calendar size={10} />
                                {t('tasks.selfAssign.endDateLabel')}
                            </label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={e => update('endDate', e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                        </div>
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                <Clock size={10} />
                                {t('tasks.selfAssign.timeLabel')}
                            </label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={e => update('startTime', e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                        </div>
                    </div>

                    {/* Urgent / Important */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.urgent}
                                onChange={e => update('urgent', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30"
                            />
                            <AlertCircle size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.urgent')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.important}
                                onChange={e => update('important', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30"
                            />
                            <Zap size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.important')}</span>
                        </label>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex justify-end gap-2 sm:gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tasks.selfAssign.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            if (!isValid) return;
                            const hasActivity = isCommercial && !!form.activityType;
                            selfAssign.mutate(
                                {
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
                                },
                                {
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
                                }
                            );
                        }}
                        disabled={!isValid || selfAssign.isPending}
                        className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {selfAssign.isPending ? (
                            <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                        ) : (
                            <Plus size={14} className="sm:w-4 sm:h-4" />
                        )}
                        {t('tasks.selfAssign.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Task Card Component ────────────────────────────────── */

const TaskCard = ({ task, onClick }: { task: Task; onClick: () => void }) => {
    const difficultyColors: Record<TaskDifficulty, string> = {
        EASY: 'bg-[#33cbcc]/10 text-[#33cbcc] border-[#33cbcc]/20',
        MEDIUM: 'bg-[#283852]/10 text-[#283852] border-[#283852]/20',
        HARD: 'bg-[#283852]/10 text-[#283852] border-gray-200',
    };

    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={onClick}
            className="bg-white rounded-lg border border-gray-200 p-3  transition-shadow cursor-pointer"
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{task.title}</h4>
                <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        difficultyColors[task.difficulty]
                    }`}
                >
                    {task.difficulty}
                </span>
            </div>

            {task.startTime && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                    <Clock size={12} />
                    <span>{task.startTime}</span>
                </div>
            )}

            <div className="flex flex-col gap-1">
                {task.project && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Briefcase size={12} className="text-gray-400" />
                        <span className="truncate">{task.project.name}</span>
                    </div>
                )}

                {task.nature && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <Tag size={12} className="text-gray-400" />
                        <span
                            className="truncate"
                            style={{
                                color: task.nature.color || '#6b7280',
                            }}
                        >
                            {task.nature.name}
                        </span>
                    </div>
                )}

                {/* Subtask Progress */}
                {totalSubtasks > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span className="flex items-center gap-1">
                                <ListTodo size={10} />
                                Subtasks
                            </span>
                            <span className="font-medium">
                                {completedSubtasks}/{totalSubtasks}
                            </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#33cbcc] transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Attachments badge */}
                {task.attachments && task.attachments.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                        <Paperclip size={10} />
                        <span>{task.attachments.length}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

/* ─── Day Column Component ───────────────────────────────── */

const DayColumn = ({
    date,
    tasks,
    isToday,
    onAddTask,
    onTaskClick,
}: {
    date: Date;
    tasks: Task[];
    isToday: boolean;
    onAddTask: () => void;
    onTaskClick: (task: Task) => void;
}) => {
    const { t, i18n } = useTranslation();

    const dayName = date.toLocaleDateString(i18n.language, { weekday: 'long' });
    const dayShortName = date.toLocaleDateString(i18n.language, { weekday: 'short' });
    const dayNumber = date.getDate();
    const month = date.toLocaleDateString(i18n.language, { month: 'short' });

    return (
        <div className="flex flex-col min-w-[280px] sm:min-w-[240px] md:min-w-0 flex-1">
            {/* Day Header */}
            <div
                className={`flex flex-col items-center p-2 sm:p-3 rounded-t-xl border-b-2 ${
                    isToday
                        ? 'bg-[#33cbcc]/10 border-[#33cbcc]'
                        : 'bg-gray-50 border-gray-200'
                }`}
            >
                <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <span className="hidden sm:inline">{dayName}</span>
                    <span className="sm:hidden">{dayShortName}</span>
                </span>
                <span className="text-xl sm:text-2xl font-bold text-gray-800 mt-0.5 sm:mt-1">{dayNumber}</span>
                <span className="text-[10px] sm:text-xs text-gray-500">{month}</span>
            </div>

            {/* Tasks Container */}
            <div className="flex-1 bg-gray-50/50 rounded-b-xl border border-gray-200 border-t-0 p-2 sm:p-3 space-y-2 min-h-[300px] sm:min-h-[400px] max-h-[500px] sm:max-h-none overflow-y-auto">
                <AnimatePresence mode="popLayout">
                    {tasks.map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                    ))}
                </AnimatePresence>

                {/* Add Task Button */}
                <button
                    onClick={onAddTask}
                    className="w-full py-2 sm:py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#33cbcc] hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium"
                >
                    <Plus size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{t('planning.addTask')}</span>
                    <span className="sm:hidden">+</span>
                </button>
            </div>
        </div>
    );
};

/* ─── Main Planning Component ────────────────────────────── */

export default function Planning() {
    const { t } = useTranslation();
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

    // Group tasks by day
    const tasksByDay = new Map<string, Task[]>();
    for (let i = 0; i < 7; i++) {
        const day = addDays(currentMonday, i);
        const dayKey = formatDate(day);
        tasksByDay.set(dayKey, []);
    }

    tasks.forEach(task => {
        if (task.startDate) {
            const taskDate = formatDate(new Date(task.startDate));
            const existing = tasksByDay.get(taskDate) || [];
            tasksByDay.set(taskDate, [...existing, task]);
        }
    });

    const goToPrevWeek = () => {
        setCurrentMonday(prev => addDays(prev, -7));
    };

    const goToNextWeek = () => {
        setCurrentMonday(prev => addDays(prev, 7));
    };

    const goToToday = () => {
        setCurrentMonday(getMonday(new Date()));
    };

    const handleAddTask = async (date: string) => {
        try {
            const result = await tasksApi.weeklyCheck();
            if (!result.canCreate) {
                setCompliancePendingTasks(result.pendingTasks);
                setShowComplianceBlock(true);
            } else {
                setSelectedDate(date);
                setShowModal(true);
            }
        } catch {
            setSelectedDate(date);
            setShowModal(true);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedDate(undefined);
    };

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
    };

    const handleUpdateState = (taskId: string, state: TaskState) => {
        updateTaskState.mutate(
            { taskId, state },
            {
                onSuccess: () => {
                    setSelectedTask(null);
                },
            }
        );
    };

    const handleBlockTask = (taskId: string, reason: string) => {
        updateTaskState.mutate(
            { taskId, state: 'BLOCKED', blockReason: reason },
            {
                onSuccess: () => {
                    setSelectedTask(null);
                },
            }
        );
    };

    const handleTransferTask = (taskId: string) => {
        transferTask.mutate(
            { taskId, targetWeekStart: weekStartISO },
            {
                onSuccess: () => {
                    setSelectedTask(null);
                },
            }
        );
    };

    const handleEditTask = () => {
        if (selectedTask) {
            setEditingTask(selectedTask);
            setSelectedTask(null);
        }
    };

    const handleSaveEdit = (dto: any) => {
        if (editingTask) {
            updateTask.mutate(
                { id: editingTask.id, dto },
                {
                    onSuccess: () => {
                        setEditingTask(null);
                    },
                }
            );
        }
    };

    const handleViewHistory = () => {
        if (selectedTask) {
            setViewingHistoryTaskId(selectedTask.id);
            setSelectedTask(null);
        }
    };

    const weekEnd = addDays(currentMonday, 6);
    const weekRange = `${currentMonday.getDate()} ${currentMonday.toLocaleDateString('en', {
        month: 'short',
    })} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString('en', { month: 'short' })} ${weekEnd.getFullYear()}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate progress
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
        task => task.state === 'COMPLETED' || task.state === 'REVIEWED'
    ).length;
    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="mb-4 sm:mb-6">
                    <div className="flex items-start sm:items-center justify-between mb-2 sm:mb-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                                <Calendar className="text-[#33cbcc] sm:w-8 sm:h-8" size={24} />
                                <span>{t('planning.title')}</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">{t('planning.subtitle')}</p>
                        </div>
                    </div>

                    {/* Week Navigation */}
                    <div className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <button
                            onClick={goToPrevWeek}
                            className="p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={18} className="sm:w-5 sm:h-5 text-gray-600" />
                        </button>

                        <div className="flex-1 text-center">
                            <span className="text-sm sm:text-base md:text-lg font-semibold text-gray-800">{weekRange}</span>
                        </div>

                        <button
                            onClick={goToToday}
                            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-xs sm:text-sm font-medium text-gray-700"
                        >
                            {t('planning.today')}
                        </button>

                        <button
                            onClick={goToNextWeek}
                            className="p-1.5 sm:p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronRight size={18} className="sm:w-5 sm:h-5 text-gray-600" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {!isLoading && totalTasks > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 bg-white rounded-xl border border-gray-200 p-3 sm:p-4"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs sm:text-sm font-semibold text-gray-700">
                                        {t('planning.weekProgress')}
                                    </span>
                                    <span className="text-xs sm:text-sm text-gray-500">
                                        {completedTasks}/{totalTasks} {t('planning.tasksCompleted')}
                                    </span>
                                </div>
                                <span className="text-sm sm:text-base font-bold text-[#33cbcc]">
                                    {Math.round(progressPercentage)}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-2.5 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full bg-gradient-to-r from-[#33cbcc] to-[#2bb5b6] rounded-full"
                                />
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Week Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-64 sm:h-96">
                        <Loader2 size={28} className="sm:w-8 sm:h-8 animate-spin text-[#33cbcc]" />
                    </div>
                ) : (
                    <>
                        {/* Mobile/Tablet: Horizontal Scroll */}
                        <div className="md:hidden overflow-x-auto pb-4 -mx-3 px-3">
                            <div className="flex gap-3 min-w-max">
                                {[...Array(7)].map((_, i) => {
                                    const date = addDays(currentMonday, i);
                                    const dateKey = formatDate(date);
                                    const dayTasks = tasksByDay.get(dateKey) || [];
                                    const isToday = isSameDay(date, today);

                                    return (
                                        <DayColumn
                                            key={dateKey}
                                            date={date}
                                            tasks={dayTasks}
                                            isToday={isToday}
                                            onAddTask={() => handleAddTask(dateKey)}
                                            onTaskClick={handleTaskClick}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Desktop: Grid */}
                        <div className="hidden md:grid md:grid-cols-7 gap-3 lg:gap-4">
                            {[...Array(7)].map((_, i) => {
                                const date = addDays(currentMonday, i);
                                const dateKey = formatDate(date);
                                const dayTasks = tasksByDay.get(dateKey) || [];
                                const isToday = isSameDay(date, today);

                                return (
                                    <DayColumn
                                        key={dateKey}
                                        date={date}
                                        tasks={dayTasks}
                                        isToday={isToday}
                                        onAddTask={() => handleAddTask(dateKey)}
                                        onTaskClick={handleTaskClick}
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showComplianceBlock && (
                    <WeeklyComplianceBlockModal
                        pendingTasks={compliancePendingTasks}
                        onClose={() => setShowComplianceBlock(false)}
                    />
                )}
                {showModal && (
                    <SelfAssignModal onClose={handleCloseModal} prefilledDate={selectedDate} />
                )}
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTask(null)}
                        onUpdateState={handleUpdateState}
                        onBlockTask={handleBlockTask}
                        isUpdating={updateTaskState.isPending}
                        onEdit={selectedTask.selfAssigned ? handleEditTask : undefined}
                        onHistory={handleViewHistory}
                        onTransfer={handleTransferTask}
                    />
                )}
                {editingTask && (
                    <EditSelfTaskModal
                        task={editingTask}
                        onClose={() => setEditingTask(null)}
                        onSave={handleSaveEdit}
                        isSaving={updateTask.isPending}
                    />
                )}
                {viewingHistoryTaskId && (
                    <TaskHistoryModal
                        taskId={viewingHistoryTaskId}
                        onClose={() => setViewingHistoryTaskId(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
