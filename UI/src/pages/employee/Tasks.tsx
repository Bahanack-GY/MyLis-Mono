import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    ClipboardList,
    Loader2,
    Briefcase,
    Play,
    Ban,
    CalendarDays,
    Plus,
    Zap,
    Pencil,
    History,
    Save,
    Tag,
    ListTodo,
    Trash2,
    Target,
    Paperclip,
    Download,
    FileText,
    AlertTriangle,
    Star,
} from 'lucide-react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    useDroppable,
    useDraggable,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import { useMyTasks, useUpdateTaskState, useSelfAssignTask, useUpdateTask, useTaskHistory, useCreateSubtask, useToggleSubtask, useDeleteSubtask } from '../../api/tasks/hooks';
import { tasksApi } from '../../api/tasks/api';
import type { Task, TaskState, TaskDifficulty, GamificationResult, Subtask, TaskAttachment } from '../../api/tasks/types';
import { useMyProjects } from '../../api/projects/hooks';
import { useTaskNatures } from '../../api/task-natures/hooks';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { leadsApi } from '../../api/commercial/api';
import { useCreateLeadActivity } from '../../api/commercial/hooks';
import type { ActivityType } from '../../api/commercial/types';
import PointsEarnedModal from '../../components/PointsEarnedModal';
import BadgeEarnedModal from '../../components/BadgeEarnedModal';
import { UserTasksSkeleton } from '../../components/Skeleton';
import RichTextEditor from '../../components/RichTextEditor';
import RichTextDisplay, { stripHtml } from '../../components/RichTextDisplay';

/* ─── Types ─────────────────────────────────────────────── */

type DateFilterKey = 'all' | 'today' | 'week' | 'month' | 'custom';
type MappedStatus = 'todo' | 'in_progress' | 'done';

interface MappedTask {
    id: string;
    title: string;
    description: string;
    status: MappedStatus;
    state: TaskState;
    difficulty: TaskDifficulty;
    startDate: string;
    endDate: string;
    dueDate: string;
    startTime: string;
    projectName: string;
    projectId: string;
    blockReason: string;
    selfAssigned: boolean;
    startedAt: string | null;
    completedAt: string | null;
    natureId: string;
    natureName: string;
    natureColor: string;
    leadId: string;
    leadCode: string;
    leadCompany: string;
    urgent?: boolean;
    important?: boolean;
    subtasks?: Subtask[];
    attachments?: TaskAttachment[];
}

/* ─── State mapping ──────────────────────────────────────── */

const STATE_TO_STATUS: Record<TaskState, MappedStatus> = {
    CREATED: 'todo',
    ASSIGNED: 'todo',
    IN_PROGRESS: 'in_progress',
    BLOCKED: 'in_progress',
    COMPLETED: 'done',
    REVIEWED: 'done',
};

/* ─── Kanban constants ───────────────────────────────────── */

const COLUMNS: MappedStatus[] = ['todo', 'in_progress', 'done'];

const ALLOWED_TRANSITIONS: Record<MappedStatus, MappedStatus[]> = {
    todo: ['in_progress'],
    in_progress: ['done'],
    done: [],
};

const DROP_TARGET_STATE: Record<MappedStatus, TaskState> = {
    todo: 'CREATED',
    in_progress: 'IN_PROGRESS',
    done: 'COMPLETED',
};

const COLUMN_COLORS: Record<MappedStatus, { headerBg: string; headerText: string; dropRing: string }> = {
    todo: { headerBg: 'bg-[#283852]/10', headerText: 'text-[#283852]', dropRing: 'ring-[#283852]/30 bg-[#283852]/5' },
    in_progress: { headerBg: 'bg-[#33cbcc]/10', headerText: 'text-[#33cbcc]', dropRing: 'ring-[#33cbcc]/30 bg-[#33cbcc]/5' },
    done: { headerBg: 'bg-gray-100', headerText: 'text-gray-500', dropRing: 'ring-gray-300 bg-gray-50' },
};

const canTransition = (from: MappedStatus, to: MappedStatus) =>
    ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;

/* ─── Helpers ────────────────────────────────────────────── */

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

const isOverdue = (task: MappedTask) => {
    if (task.status === 'done') return false;
    const due = task.dueDate || task.endDate;
    if (!due) return false;
    return new Date(due) < new Date();
};

const getDateRange = (key: DateFilterKey): [Date, Date] | null => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (key) {
        case 'today':
            return [startOfDay, new Date(startOfDay.getTime() + 86_400_000 - 1)];
        case 'week': {
            const day = startOfDay.getDay();
            const monday = new Date(startOfDay.getTime() - ((day === 0 ? 6 : day - 1) * 86_400_000));
            const sunday = new Date(monday.getTime() + 7 * 86_400_000 - 1);
            return [monday, sunday];
        }
        case 'month': {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return [firstDay, lastDay];
        }
        default:
            return null;
    }
};

const taskMatchesDateFilter = (
    task: MappedTask,
    filterKey: DateFilterKey,
    customFrom: string,
    customTo: string,
): boolean => {
    if (filterKey === 'all') return true;

    const taskDate = task.startDate || task.dueDate || task.endDate;
    if (!taskDate) return false;
    const d = new Date(taskDate);

    if (filterKey === 'custom') {
        if (!customFrom && !customTo) return true;
        if (customFrom && d < new Date(customFrom)) return false;
        if (customTo && d > new Date(customTo + 'T23:59:59')) return false;
        return true;
    }

    const range = getDateRange(filterKey);
    if (!range) return true;
    return d >= range[0] && d <= range[1];
};

const getDifficultyBorder = (difficulty: TaskDifficulty) => {
    switch (difficulty) {
        case 'EASY':
            return 'border-l-4 border-l-[#33cbcc]';
        case 'MEDIUM':
            return 'border-l-4 border-l-[#283852]';
        case 'HARD':
            return 'border-l-4 border-l-[#283852] bg-[#283852]/5';
        default:
            return 'border-l-4 border-l-gray-300';
    }
};

const fmtDuration = (ms: number, t: (k: string) => string) => {
    const totalMins = Math.floor(ms / 60_000);
    const days = Math.floor(totalMins / 1440);
    const hours = Math.floor((totalMins % 1440) / 60);
    const mins = totalMins % 60;
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}${t('tasks.detail.dayShort')}`);
    if (hours > 0) parts.push(`${hours}${t('tasks.detail.hourShort')}`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}${t('tasks.detail.minShort')}`);
    return parts.join(' ');
};

/* ─── Kanban Card (Draggable) ────────────────────────────── */

const KanbanCard = ({
    task,
    onClick,
    onEdit,
}: {
    task: MappedTask;
    onClick: () => void;
    onEdit?: () => void;
}) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
    });

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white rounded-xl p-4 border border-gray-100 hover:border-[#33cbcc]/30 transition-all cursor-pointer group relative ${getDifficultyBorder(task.difficulty)} ${isDragging ? 'shadow-lg z-50' : 'shadow-sm'}`}
            onClick={onClick}
        >
            {/* Title + project */}
            <div className="mb-2">
                <div className="flex items-start justify-between gap-1">
                    <h3 className="text-sm font-bold text-gray-800 truncate group-hover:text-[#283852] transition-colors">
                        {task.title}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                        {task.selfAssigned && (
                            <span className="flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#33cbcc]/10 text-[#33cbcc]">
                                <Zap size={9} />
                            </span>
                        )}
                        {task.urgent && (
                            <span className="flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                <AlertTriangle size={9} />
                            </span>
                        )}
                        {task.important && (
                            <span className="flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                <Star size={9} />
                            </span>
                        )}
                        {task.selfAssigned && onEdit && (
                            <button
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); onEdit(); }}
                                className="p-1 rounded hover:bg-[#33cbcc]/10 text-gray-300 hover:text-[#33cbcc] transition-colors"
                            >
                                <Pencil size={11} />
                            </button>
                        )}
                    </div>
                </div>
                {task.projectName && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{task.projectName}</p>
                )}
                {task.natureName && (
                    <span
                        className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: (task.natureColor || '#33cbcc') + '1A', color: task.natureColor || '#33cbcc' }}
                    >
                        {task.natureName}
                    </span>
                )}
                {task.leadCode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#283852]/10 text-[#283852] rounded-md text-[10px] font-semibold mt-1">
                        <Target size={9} />
                        {task.leadCode}
                    </span>
                )}
            </div>

            {/* Description */}
            {task.description && (
                <RichTextDisplay content={task.description} truncate maxLines={2} className="text-xs text-gray-500 mb-3 leading-relaxed" />
            )}

            {/* Subtasks progress */}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                        <span className="flex items-center gap-1">
                            <ListTodo size={10} />
                            Subtasks
                        </span>
                        <span className="font-medium">
                            {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#33cbcc] transition-all duration-300"
                            style={{ width: `${(task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100}%` }}
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

            {/* Due date */}
            {(task.dueDate || task.endDate) && (
                <div className={`flex items-center gap-1 text-[11px] mt-auto pt-2 border-t border-gray-50 ${isOverdue(task) ? 'text-[#283852] font-semibold' : 'text-gray-400'}`}>
                    <Calendar size={12} />
                    <span>{fmtDate(task.dueDate || task.endDate)}</span>
                </div>
            )}
        </div>
    );
};

/* ─── Drag Overlay Card ──────────────────────────────────── */

const DragOverlayCard = ({ task }: { task: MappedTask }) => (
    <div className={`bg-white rounded-xl p-4 border border-[#33cbcc]/50 shadow-2xl w-65 rotate-2 ${getDifficultyBorder(task.difficulty)}`}>
        <div className="mb-2">
            <h3 className="text-sm font-bold text-gray-800 truncate">{task.title}</h3>
            {task.projectName && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.projectName}</p>}
        </div>
        {task.description && <RichTextDisplay content={task.description} truncate maxLines={2} className="text-xs text-gray-500" />}
    </div>
);

/* ─── Kanban Column (Droppable) ──────────────────────────── */

const PAGE_SIZE = 10;

const KanbanColumn = ({
    status,
    tasks,
    isOver,
    canDrop,
    isDragging,
    onTaskClick,
    onEditTask,
}: {
    status: MappedStatus;
    tasks: MappedTask[];
    isOver: boolean;
    canDrop: boolean;
    isDragging: boolean;
    onTaskClick: (task: MappedTask) => void;
    onEditTask?: (task: MappedTask) => void;
}) => {
    const { t } = useTranslation();
    const { setNodeRef } = useDroppable({ id: status });
    const col = COLUMN_COLORS[status];
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Reset when tasks list changes (filter/search applied)
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [tasks]);

    // Intersection observer to load more on scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setVisibleCount((c) => Math.min(c + PAGE_SIZE, tasks.length));
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [tasks.length]);

    const visibleTasks = tasks.slice(0, visibleCount);
    const hasMore = visibleCount < tasks.length;

    const statusIcons: Record<MappedStatus, React.ReactNode> = {
        todo: <ClipboardList size={16} />,
        in_progress: <Clock size={16} />,
        done: <CheckCircle size={16} />,
    };

    let dropClass = '';
    if (isDragging && isOver) {
        dropClass = canDrop ? `ring-2 ${col.dropRing}` : 'ring-2 ring-[#283852]/30 bg-[#283852]/5';
    }

    return (
        <div
            ref={setNodeRef}
            className={`flex flex-col rounded-2xl bg-gray-50/80 border border-gray-100 min-h-100 transition-all duration-200 ${dropClass}`}
        >
            {/* Column header */}
            <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${col.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className={col.headerText}>{statusIcons[status]}</span>
                    <h3 className={`text-sm font-bold ${col.headerText}`}>
                        {t(`tasks.status.${status}`)}
                    </h3>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${col.headerBg} ${col.headerText}`}>
                    {tasks.length}
                </span>
            </div>

            {/* Card list */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-350px)]">
                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-gray-300 text-sm gap-2">
                        <ClipboardList size={24} className="text-gray-200" />
                        <span>{t('tasks.kanban.emptyColumn')}</span>
                    </div>
                ) : (
                    <>
                        {visibleTasks.map((task) => (
                            <KanbanCard
                                key={task.id}
                                task={task}
                                onClick={() => onTaskClick(task)}
                                onEdit={onEditTask ? () => onEditTask(task) : undefined}
                            />
                        ))}
                        {hasMore && (
                            <div ref={sentinelRef} className="flex items-center justify-center py-3">
                                <Loader2 size={16} className="animate-spin text-gray-300" />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/* ─── Subtasks Section ───────────────────────────────────── */

const SubtasksSection = ({ task, onAllCompleted }: { task: MappedTask; onAllCompleted?: () => void }) => {
    const { t } = useTranslation();
    const createSubtask = useCreateSubtask();
    const toggleSubtask = useToggleSubtask(onAllCompleted);
    const deleteSubtask = useDeleteSubtask();
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.completed).length;
    const totalSubtasks = subtasks.length;
    const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

    const handleAddSubtask = () => {
        if (!newSubtaskTitle.trim()) return;
        createSubtask.mutate(
            { taskId: task.id, title: newSubtaskTitle.trim() },
            {
                onSuccess: () => setNewSubtaskTitle(''),
            }
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubtask();
        }
    };

    if (totalSubtasks === 0 && !newSubtaskTitle) {
        return (
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('subtasks.title', 'Subtasks')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('subtasks.addPlaceholder', 'Add a subtask...')}
                        className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                    />
                    <button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                        className="p-2 rounded-lg bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {createSubtask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('subtasks.title', 'Subtasks')}</p>
                <span className="text-xs font-medium text-gray-500">
                    {completedSubtasks}/{totalSubtasks}
                </span>
            </div>

            {/* Progress bar */}
            {totalSubtasks > 0 && (
                <div className="mb-3">
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#33cbcc] transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Subtasks list */}
            <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {subtasks.map((subtask) => (
                    <div key={subtask.id} className="flex items-center gap-2 group">
                        <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={() => toggleSubtask.mutate(subtask.id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#33cbcc] focus:ring-[#33cbcc]/30 cursor-pointer"
                        />
                        <span className={`flex-1 text-sm ${subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {subtask.title}
                        </span>
                        <button
                            onClick={() => deleteSubtask.mutate(subtask.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add new subtask */}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('subtasks.addPlaceholder', 'Add a subtask...')}
                    className="flex-1 text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                />
                <button
                    onClick={handleAddSubtask}
                    disabled={!newSubtaskTitle.trim() || createSubtask.isPending}
                    className="p-2 rounded-lg bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {createSubtask.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                </button>
            </div>
        </div>
    );
};

/* ─── Task Detail Modal ──────────────────────────────────── */

const NEXT_STATE: Partial<Record<TaskState, TaskState>> = {
    CREATED: 'IN_PROGRESS',
    ASSIGNED: 'IN_PROGRESS',
    IN_PROGRESS: 'COMPLETED',
    BLOCKED: 'IN_PROGRESS',
};

const TaskDetailModal = ({
    task,
    onClose,
    onUpdateState,
    onBlockTask,
    isUpdating,
    onEdit,
    onHistory,
}: {
    task: MappedTask;
    onClose: () => void;
    onUpdateState: (taskId: string, state: TaskState) => void;
    onBlockTask: (taskId: string, reason: string) => void;
    isUpdating: boolean;
    onEdit?: () => void;
    onHistory?: () => void;
}) => {
    const { t } = useTranslation();
    const nextState = NEXT_STATE[task.state];
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockReason, setBlockReason] = useState('');
    const [blockError, setBlockError] = useState(false);
    const [showCompletePrompt, setShowCompletePrompt] = useState(false);
    const totalTimeMs = task.startedAt && task.completedAt
        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime() - (task.totalBlockedMs ?? 0)
        : null;

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

    const statusStyles: Record<MappedStatus, { cls: string; label: string }> = {
        todo: { cls: 'bg-[#283852]/10 text-[#283852]', label: t('tasks.status.todo') },
        in_progress: { cls: 'bg-[#33cbcc]/10 text-[#33cbcc]', label: t('tasks.status.in_progress') },
        done: { cls: 'bg-gray-100 text-gray-500', label: t('tasks.status.done') },
    };
    const st = statusStyles[task.status];

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="h-1.5 shrink-0" style={{ backgroundColor: dotColor }} />

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                <h3 className="text-lg font-bold text-gray-800 break-words">{task.title}</h3>
                                {task.urgent && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852] shrink-0">
                                        <AlertTriangle size={10} />
                                        {t('tasksPage.urgent')}
                                    </span>
                                )}
                                {task.important && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852] shrink-0">
                                        <Star size={10} />
                                        {t('tasksPage.important')}
                                    </span>
                                )}
                            </div>
                            {task.projectName && (
                                <p className="text-sm text-gray-500 pl-5">{task.projectName}</p>
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
                            <RichTextDisplay content={task.description} className="text-sm text-gray-600 leading-relaxed" />
                        </div>
                    )}

                    {task.projectName && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasks.detail.project')}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-700">
                                <Briefcase size={14} className="text-[#283852]" />
                                <span className="font-medium">{task.projectName}</span>
                            </div>
                        </div>
                    )}

                    {task.natureName && (
                        <div className="flex items-center gap-2">
                            <Tag size={12} className="text-gray-400" />
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasksPage.nature')}</span>
                            <span
                                className="text-sm font-medium"
                                style={{ color: task.natureColor || '#33cbcc' }}
                            >
                                {task.natureName}
                            </span>
                        </div>
                    )}

                    {task.leadCode && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Target size={14} className="text-[#283852]" />
                            <span className="font-medium">{task.leadCode}</span>
                            <span className="text-gray-400">&mdash;</span>
                            <span>{task.leadCompany}</span>
                        </div>
                    )}

                    {/* Subtasks section */}
                    <SubtasksSection
                        task={task}
                        onAllCompleted={task.status !== 'done' ? () => setShowCompletePrompt(true) : undefined}
                    />

                    {/* Complete task prompt */}
                    {showCompletePrompt && task.status !== 'done' && (
                        <div className="flex items-center gap-3 bg-[#33cbcc]/8 border border-[#33cbcc]/30 rounded-xl p-3">
                            <CheckCircle size={16} className="text-[#33cbcc] shrink-0" />
                            <p className="text-sm text-gray-700 flex-1">{t('subtasks.allDonePrompt', 'All subtasks done! Mark task as complete?')}</p>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setShowCompletePrompt(false)}
                                    className="px-3 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    {t('subtasks.later', 'Later')}
                                </button>
                                <button
                                    disabled={isUpdating}
                                    onClick={() => { setShowCompletePrompt(false); onUpdateState(task.id, 'COMPLETED'); }}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating ? <Loader2 size={12} className="animate-spin" /> : t('subtasks.complete', 'Complete')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Complete task prompt */}
                    {showCompletePrompt && task.status !== 'done' && (
                        <div className="flex items-center gap-3 bg-[#33cbcc]/8 border border-[#33cbcc]/30 rounded-xl p-3">
                            <CheckCircle size={16} className="text-[#33cbcc] shrink-0" />
                            <p className="text-sm text-gray-700 flex-1">{t('subtasks.allDonePrompt', 'All subtasks done! Mark task as complete?')}</p>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setShowCompletePrompt(false)}
                                    className="px-3 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors"
                                >
                                    {t('subtasks.later', 'Later')}
                                </button>
                                <button
                                    disabled={isUpdating}
                                    onClick={() => { setShowCompletePrompt(false); onUpdateState(task.id, 'COMPLETED'); }}
                                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                >
                                    {isUpdating ? <Loader2 size={12} className="animate-spin" /> : t('subtasks.complete', 'Complete')}
                                </button>
                            </div>
                        </div>
                    )}

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
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2 shrink-0">
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
    task: MappedTask;
    onClose: () => void;
    onSave: (dto: any) => void;
    isSaving: boolean;
}) => {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isCommercial = role === 'COMMERCIAL';
    const { data: projects } = useMyProjects();
    const { data: taskNatures } = useTaskNatures();
    const { data: leadsData } = useQuery({
        queryKey: ['leads', 'list', 'edit-task'],
        queryFn: () => leadsApi.getAll({}),
        enabled: isCommercial,
    });
    const leads = (leadsData as any)?.data || [];
    const [form, setForm] = useState({
        title: task.title,
        description: task.description,
        difficulty: task.difficulty as string,
        endDate: task.endDate ? task.endDate.split('T')[0] : '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        startTime: task.startTime || '',
        projectId: task.projectId || '',
        natureId: task.natureId || '',
        leadId: task.leadId || '',
        urgent: task.urgent || false,
        important: task.important || false,
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Pencil size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.edit.modalTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tasks.selfAssign.titleLabel')}</label>
                        <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('tasks.selfAssign.descriptionLabel')}</label>
                        <RichTextEditor value={form.description} onChange={html => setForm(f => ({ ...f, description: html }))} />
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
                    {isCommercial && leads.length > 0 && (
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5"><Target size={10} />{t('tasks.selfAssign.leadLabel', 'Lead')}</label>
                            <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
                                className={`${inputCls} appearance-none cursor-pointer`}>
                                <option value="">{t('tasks.selfAssign.leadNone', 'Aucun lead')}</option>
                                {leads.map((lead: any) => <option key={lead.id} value={lead.id}>{lead.code} — {lead.company}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-6 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={form.urgent} onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30" />
                            <AlertTriangle size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.urgent')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={form.important} onChange={e => setForm(f => ({ ...f, important: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30" />
                            <Star size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.important')}</span>
                        </label>
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
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('tasks.selfAssign.cancel')}</button>
                    <button
                        onClick={() => onSave({ title: form.title, description: form.description || undefined, difficulty: form.difficulty, projectId: form.projectId || undefined, natureId: form.natureId || undefined, leadId: form.leadId || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, startTime: form.startTime || undefined, urgent: form.urgent, important: form.important })}
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
                            <History size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.history.title')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5">
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

const DIFFICULTY_OPTIONS: TaskDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const SelfAssignModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isCommercial = role === 'COMMERCIAL';
    const selfAssign = useSelfAssignTask();
    const createActivity = useCreateLeadActivity();
    const { data: projects } = useMyProjects();
    const { data: taskNatures } = useTaskNatures();
    const { data: leadsData } = useQuery({
        queryKey: ['leads', 'list', 'self-assign'],
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
        startDate: '',
        endDate: '',
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
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Calendar size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasks.selfAssign.modalTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
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
                        <RichTextEditor value={form.description} onChange={html => update('description', html)} placeholder={t('tasks.selfAssign.descriptionPlaceholder')} />
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
                                <option key={p.id} value={p.id}>{p.name}</option>
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
                                <option key={n.id} value={n.id}>{n.name}</option>
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

                    {/* Urgent and Important checkboxes */}
                    <div className="flex items-center gap-6 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={form.urgent} onChange={e => setForm(f => ({ ...f, urgent: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30" />
                            <AlertTriangle size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.urgent')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={form.important} onChange={e => setForm(f => ({ ...f, important: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-[#283852] focus:ring-[#33cbcc]/30" />
                            <Star size={14} className="text-[#283852]" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.important')}</span>
                        </label>
                    </div>

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

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tasks.selfAssign.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            if (!isValid) return;
                            const hasActivity = isCommercial && !!form.activityType;
                            selfAssign.mutate({
                                title: form.title.trim(),
                                description: form.description.trim() || undefined,
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
                        }}
                        disabled={!isValid || selfAssign.isPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
                            isValid ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {selfAssign.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('tasks.selfAssign.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

const Tasks = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<MappedStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState<DateFilterKey>('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const customPickerRef = useRef<HTMLDivElement>(null);
    const [showSelfAssign, setShowSelfAssign] = useState(false);
    const [showComplianceBlock, setShowComplianceBlock] = useState(false);
    const [compliancePendingTasks, setCompliancePendingTasks] = useState<Task[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [activeDragTask, setActiveDragTask] = useState<MappedTask | null>(null);
    const [overColumnId, setOverColumnId] = useState<MappedStatus | null>(null);
    const [gamificationData, setGamificationData] = useState<GamificationResult | null>(null);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [editingTask, setEditingTask] = useState<MappedTask | null>(null);
    const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);

    const { user } = useAuth();
    const employeeId = user?.employeeId ?? '';

    /* ── API data ── */
    const { data: apiTasks, isLoading } = useMyTasks();
    const updateTaskState = useUpdateTaskState();
    const updateTask = useUpdateTask();

    /* ── Sensors ── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor),
    );

    /* ── Map API tasks ── */
    const tasks: MappedTask[] = useMemo(
        () =>
            (apiTasks || []).map((t: Task) => ({
                id: t.id,
                title: t.title,
                description: t.description || '',
                status: STATE_TO_STATUS[t.state] || 'todo',
                state: t.state,
                difficulty: t.difficulty || 'MEDIUM',
                startDate: t.startDate || '',
                endDate: t.endDate || '',
                dueDate: t.dueDate || '',
                startTime: t.startTime || '',
                projectName: t.project?.name || '',
                projectId: t.projectId || '',
                blockReason: t.blockReason || '',
                selfAssigned: t.selfAssigned || false,
                startedAt: t.startedAt || null,
                completedAt: t.completedAt || null,
                natureId: t.natureId || '',
                natureName: t.nature?.name || '',
                natureColor: t.nature?.color || '',
                leadId: (t as any).lead?.id || '',
                leadCode: (t as any).lead?.code || '',
                leadCompany: (t as any).lead?.company || '',
                subtasks: t.subtasks || [],
                attachments: t.attachments || [],
            })),
        [apiTasks],
    );

    /* ── Selected task (live — always reflects latest cache) ── */
    const selectedTask = selectedTaskId ? (tasks.find(t => t.id === selectedTaskId) ?? null) : null;

    /* ── Filtering (search + date) ── */
    const filteredTasks = useMemo(() =>
        tasks.filter((task) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (
                    !task.title.toLowerCase().includes(q) &&
                    !task.projectName.toLowerCase().includes(q) &&
                    !stripHtml(task.description).toLowerCase().includes(q)
                ) return false;
            }
            if (!taskMatchesDateFilter(task, dateFilter, customFrom, customTo)) return false;
            return true;
        }),
        [tasks, searchQuery, dateFilter, customFrom, customTo],
    );

    /* ── Group by column ── */
    const tasksByColumn = useMemo(() => {
        const grouped: Record<MappedStatus, MappedTask[]> = { todo: [], in_progress: [], done: [] };
        filteredTasks.forEach((task) => grouped[task.status].push(task));
        return grouped;
    }, [filteredTasks]);

    /* ── Visible columns ── */
    const visibleColumns = filterStatus === 'all'
        ? COLUMNS
        : COLUMNS.filter((c) => c === filterStatus);

    /* ── DnD handlers ── */
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = event.active.data.current?.task as MappedTask | undefined;
        if (task) {
            setActiveDragTask(task);
            setSelectedTaskId(null);
        }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const overId = event.over?.id as MappedStatus | undefined;
        setOverColumnId(overId && COLUMNS.includes(overId) ? overId : null);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragTask(null);
        setOverColumnId(null);

        if (!over) return;
        const task = active.data.current?.task as MappedTask;
        const targetColumn = over.id as MappedStatus;

        if (!task || !COLUMNS.includes(targetColumn)) return;

        // Allow unblocking: blocked tasks live in in_progress column,
        // dropping them back on in_progress should unblock (→ IN_PROGRESS)
        const isUnblock = task.state === 'BLOCKED' && targetColumn === 'in_progress';

        if (!isUnblock) {
            if (task.status === targetColumn) return;
            if (!canTransition(task.status, targetColumn)) return;
        }

        const newState = isUnblock ? 'IN_PROGRESS' as TaskState : DROP_TARGET_STATE[targetColumn];
        updateTaskState.mutate(
            { taskId: task.id, state: newState },
            {
                onSuccess: (data) => {
                    if (data.gamification) {
                        setGamificationData(data.gamification);
                        setShowPointsModal(true);
                    }
                },
            },
        );
    }, [updateTaskState]);

    const handleDragCancel = useCallback(() => {
        setActiveDragTask(null);
        setOverColumnId(null);
    }, []);

    /* ── Loading state ── */
    if (isLoading) {
        return <UserTasksSkeleton />;
    }

    /* ── Stats ── */
    const stats = [
        { label: t('tasks.stats.total'), value: tasks.length, icon: ClipboardList, color: '#283852' },
        { label: t('tasks.stats.inProgress'), value: tasks.filter((t) => t.status === 'in_progress').length, icon: Clock, color: '#33cbcc' },
        { label: t('tasks.stats.completed'), value: tasks.filter((t) => t.status === 'done').length, icon: CheckCircle, color: '#283852' },
        { label: t('tasks.stats.overdue'), value: tasks.filter((t) => isOverdue(t)).length, icon: AlertCircle, color: '#33cbcc' },
    ];

    /* ── Status filters ── */
    const statusFilters: { key: MappedStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('tasks.filterAll') },
        { key: 'todo', label: t('tasks.status.todo') },
        { key: 'in_progress', label: t('tasks.status.in_progress') },
        { key: 'done', label: t('tasks.status.done') },
    ];

    /* ════════════════════════ JSX ════════════════════════ */

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ═══ Page header ═══ */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('tasks.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('tasks.subtitle')}</p>
                </div>
                <button
                    onClick={async () => {
                        try {
                            const result = await tasksApi.weeklyCheck();
                            if (!result.canCreate) {
                                setCompliancePendingTasks(result.pendingTasks);
                                setShowComplianceBlock(true);
                            } else {
                                setShowSelfAssign(true);
                            }
                        } catch {
                            setShowSelfAssign(true);
                        }
                    }}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 shrink-0"
                >
                    <Plus size={16} />
                    {t('tasks.selfAssign.createButton')}
                </button>
            </div>

            {/* ═══ Stats ═══ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-[#33cbcc]/50 transition-colors"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>


            {/* ═══ Search + Filters ═══ */}
            <div className="space-y-4">
                <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('tasks.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mr-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={16} />
                        </button>
                    )}
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {/* Status filters — left */}
                    <div className="flex gap-2 flex-wrap">
                        {statusFilters.map((sf) => (
                            <button
                                key={sf.key}
                                onClick={() => setFilterStatus(sf.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    filterStatus === sf.key
                                        ? 'bg-[#283852] text-white'
                                        : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                                }`}
                            >
                                {sf.label}
                            </button>
                        ))}
                    </div>

                    {/* Date filters — right */}
                    <div className="flex gap-2 flex-wrap items-center">
                        <CalendarDays size={14} className="text-gray-400" />
                        {([
                            { key: 'all' as DateFilterKey, label: t('tasks.dateFilter.all') },
                            { key: 'today' as DateFilterKey, label: t('tasks.dateFilter.today') },
                            { key: 'week' as DateFilterKey, label: t('tasks.dateFilter.thisWeek') },
                            { key: 'month' as DateFilterKey, label: t('tasks.dateFilter.thisMonth') },
                            { key: 'custom' as DateFilterKey, label: t('tasks.dateFilter.custom') },
                        ]).map((df) => (
                            <button
                                key={df.key}
                                onClick={() => {
                                    setDateFilter(df.key);
                                    if (df.key === 'custom') {
                                        setShowCustomPicker(true);
                                    } else {
                                        setShowCustomPicker(false);
                                        setCustomFrom('');
                                        setCustomTo('');
                                    }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    dateFilter === df.key
                                        ? 'bg-[#33cbcc] text-white'
                                        : 'bg-white text-gray-500 border border-gray-100 hover:border-[#33cbcc]/30'
                                }`}
                            >
                                {df.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom date picker — full width below */}
                {showCustomPicker && dateFilter === 'custom' && (
                    <div ref={customPickerRef} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 w-fit ml-auto">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="text-xs text-gray-700 border-none bg-transparent focus:outline-none focus:ring-0"
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="text-xs text-gray-700 border-none bg-transparent focus:outline-none focus:ring-0"
                        />
                        {(customFrom || customTo) && (
                            <button
                                onClick={() => { setCustomFrom(''); setCustomTo(''); }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ═══ Kanban Board ═══ */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <div className={`grid gap-4 md:gap-5 ${
                    visibleColumns.length === 1
                        ? 'grid-cols-1 max-w-lg mx-auto'
                        : 'grid-cols-1 md:grid-cols-3'
                }`}>
                    {visibleColumns.map((status) => (
                        <KanbanColumn
                            key={status}
                            status={status}
                            tasks={tasksByColumn[status]}
                            isOver={overColumnId === status}
                            canDrop={activeDragTask ? (canTransition(activeDragTask.status, status) || (activeDragTask.state === 'BLOCKED' && status === 'in_progress')) : false}
                            isDragging={!!activeDragTask}
                            onTaskClick={(task) => setSelectedTaskId(task.id)}
                            onEditTask={(task) => task.selfAssigned && task.status !== 'done' ? setEditingTask(task) : undefined}
                        />
                    ))}
                </div>

                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                    {activeDragTask ? <DragOverlayCard task={activeDragTask} /> : null}
                </DragOverlay>
            </DndContext>

            {/* ═══ Task Detail Modal ═══ */}
            <AnimatePresence>
                {selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTaskId(null)}
                        isUpdating={updateTaskState.isPending}
                        onUpdateState={(taskId, state) => {
                            updateTaskState.mutate(
                                { taskId, state },
                                {
                                    onSuccess: (data) => {
                                        setSelectedTaskId(null);
                                        if (data.gamification) {
                                            setGamificationData(data.gamification);
                                            setShowPointsModal(true);
                                        }
                                    },
                                },
                            );
                        }}
                        onBlockTask={(taskId, reason) => {
                            updateTaskState.mutate(
                                { taskId, state: 'BLOCKED', blockReason: reason },
                                { onSuccess: () => setSelectedTaskId(null) },
                            );
                        }}
                        onEdit={selectedTask.selfAssigned && selectedTask.status !== 'done' ? () => setEditingTask(selectedTask) : undefined}
                        onHistory={() => setHistoryTaskId(selectedTask.id)}
                    />
                )}
            </AnimatePresence>

            {/* ═══ Edit Task Modal ═══ */}
            <AnimatePresence>
                {editingTask && (
                    <EditSelfTaskModal
                        task={editingTask}
                        onClose={() => setEditingTask(null)}
                        isSaving={updateTask.isPending}
                        onSave={(dto) => {
                            updateTask.mutate({ id: editingTask.id, dto }, { onSuccess: () => setEditingTask(null) });
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ═══ History Modal ═══ */}
            <AnimatePresence>
                {historyTaskId && (
                    <TaskHistoryModal
                        taskId={historyTaskId}
                        onClose={() => setHistoryTaskId(null)}
                    />
                )}
            </AnimatePresence>

            {/* Weekly Compliance Block Modal */}
            <AnimatePresence>
                {showComplianceBlock && (
                    <WeeklyComplianceBlockModal
                        pendingTasks={compliancePendingTasks}
                        onClose={() => setShowComplianceBlock(false)}
                    />
                )}
            </AnimatePresence>

            {/* Self-Assign Modal */}
            <AnimatePresence>
                {showSelfAssign && (
                    <SelfAssignModal onClose={() => setShowSelfAssign(false)} />
                )}
            </AnimatePresence>

            {/* Gamification Modals */}
            <AnimatePresence>
                {showPointsModal && gamificationData && (
                    <PointsEarnedModal
                        pointsEarned={gamificationData.pointsEarned}
                        totalPoints={gamificationData.totalPoints}
                        onClose={() => {
                            setShowPointsModal(false);
                            if (gamificationData.newBadge) {
                                setTimeout(() => setShowBadgeModal(true), 300);
                            } else {
                                setGamificationData(null);
                            }
                        }}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showBadgeModal && gamificationData?.newBadge && (
                    <BadgeEarnedModal
                        badgeNumber={gamificationData.newBadge.badgeNumber}
                        title={gamificationData.newBadge.title}
                        milestone={gamificationData.newBadge.milestone}
                        onClose={() => {
                            setShowBadgeModal(false);
                            setGamificationData(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tasks;
