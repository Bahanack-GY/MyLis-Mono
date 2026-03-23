import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Flag, Search, X,
    ArrowLeft, Clock, Plus, CalendarDays,
    AlignLeft, Briefcase, BarChart3, RefreshCw, Loader2, Zap,
    Pencil, Trash2, History, Save, CalendarRange, Columns3,
} from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, useTaskHistory } from '../api/tasks/hooks';
import { TasksAdminSkeleton } from '../components/Skeleton';
import { useEmployees } from '../api/employees/hooks';
import { useProjects } from '../api/projects/hooks';
import { useDepartments } from '../api/departments/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';

/* ─── Types ───────────────────────────────────────────────── */

type ColorKey = keyof typeof TASK_COLORS;
type ViewMode = 'day' | 'week' | 'month' | 'year';

interface GanttTask {
    id: number;
    apiId?: string;
    title: string;
    subtitle: string;
    startDate: Date;
    endDate: Date;
    color: ColorKey;
    hasFlag?: boolean;
    description?: string;
    status?: 'todo' | 'in_progress' | 'done';
    lane?: number;
    projectId?: string;
    difficulty?: string;
    selfAssigned?: boolean;
}

interface EmployeeRow {
    id: number;
    apiId: string;
    name: string;
    role: string;
    avatar: string;
    departmentId: string;
    departmentName: string;
    tasks: GanttTask[];
    laneCount?: number;
}

/* ─── 4-Color palette ────────────────────────────────────── */

const TASK_COLORS = {
    teal:  { bg: '#CCFBF1', text: '#134E4A', border: '#5EEAD4' },
    blue:  { bg: '#DBEAFE', text: '#1E3A8A', border: '#93C5FD' },
    amber: { bg: '#FEF3C7', text: '#78350F', border: '#FCD34D' },
    rose:  { bg: '#FFE4E6', text: '#881337', border: '#FDA4AF' },
};

/* ─── Date helpers ────────────────────────────────────────── */

const diffDays = (a: Date, b: Date) =>
    Math.round((b.getTime() - a.getTime()) / 86_400_000);

const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
};

const startOfWeek = (d: Date) => {
    const r = new Date(d);
    const day = r.getDay();
    r.setDate(r.getDate() - day + (day === 0 ? -6 : 1));
    r.setHours(0, 0, 0, 0);
    return r;
};

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

const numDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

const DAY_NAMES_FULL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── Layout constants ────────────────────────────────────── */

const ROW_H = 72; // Base row height (min height)
const TASK_H = 40; // Height of a single task
const TASK_GAP = 8; // Vertical gap between tasks
const HEADER_H = 64;
const DAY_PX: Record<ViewMode, number> = { day: 600, week: 100, month: 52, year: 7 };

/* ─── Lane Helper ─────────────────────────────────────────── */

const assignLanes = (tasks: GanttTask[]): GanttTask[] => {
    if (!tasks.length) return [];
    
    // Sort by start date
    const sorted = [...tasks].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    const lanes: Date[] = [];
    
    return sorted.map(task => {
        let laneIndex = -1;
        // Find first lane where this task fits (start date > lane end date, since end date is inclusive)
        for (let i = 0; i < lanes.length; i++) {
            if (task.startDate.getTime() > lanes[i].getTime()) {
                laneIndex = i;
                lanes[i] = task.endDate;
                break;
            }
        }
        if (laneIndex === -1) {
            laneIndex = lanes.length;
            lanes.push(task.endDate);
        }
        return { ...task, lane: laneIndex };
    });
};

/* ─── (no mock data — uses API only) ──────────────────────── */

/* ─── Task Detail Modal ───────────────────────────────────── */

const TaskDetailModal = ({ task, employee, onClose, onEdit, onDelete, onHistory }: { task: GanttTask; employee: EmployeeRow; onClose: () => void; onEdit?: () => void; onDelete?: () => void; onHistory?: () => void }) => {
    const { t } = useTranslation();
    const c = TASK_COLORS[task.color];
    const duration = diffDays(task.startDate, task.endDate) + 1;
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    const statusMap: Record<string, { label: string; cls: string }> = {
        todo:        { label: t('tasksPage.todo'),       cls: 'bg-gray-100 text-gray-600' },
        in_progress: { label: t('tasksPage.inProgress'), cls: 'bg-blue-50 text-blue-700' },
        done:        { label: t('tasksPage.done'),       cls: 'bg-green-50 text-green-700' },
    };
    const st = task.status ? statusMap[task.status] : null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Accent bar */}
                <div className="h-1.5" style={{ backgroundColor: c.border }} />

                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.border }} />
                                <h3 className="text-lg font-bold text-gray-800 truncate">{task.title}</h3>
                                {task.hasFlag && <Flag size={14} className="text-amber-500 shrink-0" />}
                                {task.selfAssigned && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#33cbcc]/10 text-[#33cbcc] shrink-0">
                                        <Zap size={10} />
                                        Self-assigned
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 pl-5">{task.subtitle}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Assigned to */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <img src={employee.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">{employee.name}</p>
                            <p className="text-xs text-gray-500 truncate">{employee.role}</p>
                        </div>
                    </div>

                    {/* Detail cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasksPage.startDate')}</p>
                            <p className="text-sm font-semibold text-gray-800">{fmt(task.startDate)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasksPage.endDate')}</p>
                            <p className="text-sm font-semibold text-gray-800">{fmt(task.endDate)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-1.5 mb-1">
                                <Clock size={11} className="text-gray-400" />
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('tasksPage.duration')}</p>
                            </div>
                            <p className="text-sm font-semibold text-gray-800">{duration} {duration === 1 ? t('tasksPage.day') : t('tasksPage.days')}</p>
                        </div>
                        {st && (
                            <div className="bg-gray-50 rounded-xl p-3">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('tasksPage.status')}</p>
                                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {task.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('tasksPage.description')}</p>
                            <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
                        </div>
                    )}

                    {/* Action buttons */}
                    {(onEdit || onDelete || onHistory) && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            {!task.selfAssigned && onEdit && (
                                <button
                                    onClick={() => { onClose(); onEdit(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors"
                                >
                                    <Pencil size={12} /> {t('tasksPage.editTask')}
                                </button>
                            )}
                            {!task.selfAssigned && onDelete && (
                                <button
                                    onClick={() => { if (window.confirm(t('tasksPage.confirmDelete'))) { onClose(); onDelete(); } }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={12} /> {t('tasksPage.deleteTask')}
                                </button>
                            )}
                            {onHistory && (
                                <button
                                    onClick={() => { onClose(); onHistory(); }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors"
                                >
                                    <History size={12} /> {t('tasksPage.viewHistory')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Edit Gantt Task Modal ─────────────────────────────── */

const EditGanttTaskModal = ({
    task,
    onClose,
    onSave,
    isSaving,
}: {
    task: GanttTask;
    onClose: () => void;
    onSave: (dto: { title?: string; description?: string; difficulty?: string; startDate?: string; endDate?: string }) => void;
    isSaving: boolean;
}) => {
    const { t } = useTranslation();
    const fmtD = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };
    const [form, setForm] = useState({
        title: task.title,
        description: task.description || '',
        difficulty: task.difficulty || 'MEDIUM',
        startDate: fmtD(task.startDate),
        endDate: fmtD(task.endDate),
    });
    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block';
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Pencil size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasksPage.editTask')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className={labelCls}>{t('tasksPage.titlePlaceholder')}</label>
                        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('tasksPage.descriptionPlaceholder')}</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('tasksPage.difficulty')}</label>
                        <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))} className={inputCls}>
                            <option value="EASY">{t('tasksPage.difficultyEasy')}</option>
                            <option value="MEDIUM">{t('tasksPage.difficultyMedium')}</option>
                            <option value="HARD">{t('tasksPage.difficultyHard')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>{t('tasksPage.startDate')}</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{t('tasksPage.endDate')}</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t('tasksPage.cancel')}</button>
                    <button
                        onClick={() => onSave({ title: form.title, description: form.description, difficulty: form.difficulty, startDate: form.startDate || undefined, endDate: form.endDate || undefined })}
                        disabled={!form.title.trim() || isSaving}
                        className="px-5 py-2 bg-[#33cbcc] text-white rounded-xl text-sm font-medium hover:bg-[#2bb5b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t('tasksPage.save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Gantt History Modal ─────────────────────────────────── */

const GanttHistoryModal = ({ taskId, onClose }: { taskId: string; onClose: () => void }) => {
    const { t } = useTranslation();
    const { data: history = [], isLoading } = useTaskHistory(taskId);
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                            <History size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasksPage.historyTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                </div>
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
                    ) : (history as any[]).length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">{t('tasksPage.historyEmpty')}</p>
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

/* ─── Add Task Modal ─────────────────────────────────────── */

let nextTaskId = 100;

const PRIORITY_COLOR: Record<string, ColorKey> = { low: 'teal', medium: 'blue', high: 'amber', urgent: 'rose' };

/* projects are fetched from API inside the modal */

interface TaskForm {
    title: string;
    description: string;
    project: string;
    startDate: string;
    endDate: string;
    time: string;
    difficulty: string;
    priority: string;
    repeat: string;
}

const AddTaskModal = ({
    employees,
    initialEmployee,
    initialDate,
    onClose,
    onAdd,
}: {
    employees: EmployeeRow[];
    initialEmployee?: EmployeeRow;
    initialDate: Date;
    onClose: () => void;
    onAdd: (empId: number, task: GanttTask) => void;
}) => {
    const { t } = useTranslation();
    const deptScope = useDepartmentScope();
    const { data: apiProjectsList } = useProjects(deptScope);
    const [selectedEmpId, setSelectedEmpId] = useState(initialEmployee?.id ?? employees[0]?.id ?? 0);
    const selectedEmp = employees.find(e => e.id === selectedEmpId) ?? employees[0];

    const fmtDate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const makeEmpty = (): TaskForm => ({
        title: '',
        description: '',
        project: '',
        startDate: fmtDate(initialDate),
        endDate: fmtDate(addDays(initialDate, 3)),
        time: '',
        difficulty: 'medium',
        priority: 'medium',
        repeat: 'none',
    });

    const [tasks, setTasks] = useState<TaskForm[]>([makeEmpty()]);

    const update = (idx: number, field: keyof TaskForm, value: string) => {
        setTasks(prev => prev.map((tf, i) => i === idx ? { ...tf, [field]: value } : tf));
    };

    const validCount = tasks.filter(tf => tf.title.trim().length > 0).length;

    const handleSubmit = () => {
        if (validCount === 0 || !selectedEmp) return;
        tasks.forEach(tf => {
            if (!tf.title.trim()) return;
            const project = tf.project ? (apiProjectsList || []).find(p => p.id === tf.project) : null;
            const task: GanttTask = {
                id: nextTaskId++,
                title: tf.title.trim(),
                subtitle: project?.name || tf.description.slice(0, 24) || '',
                startDate: new Date(tf.startDate + 'T00:00:00'),
                endDate: new Date(tf.endDate + 'T00:00:00'),
                color: PRIORITY_COLOR[tf.priority] || 'blue',
                status: 'todo',
                description: tf.description.trim() || undefined,
                projectId: tf.project || undefined,
                difficulty: tf.difficulty.toUpperCase(),
            };
            onAdd(selectedEmpId, task);
        });
        onClose();
    };

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
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
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                            <Plus size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('tasksPage.addTask')}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        {validCount > 0 && (
                            <span className="text-xs font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-2.5 py-1 rounded-full">
                                {validCount} {t('tasksPage.tasksReady')}
                            </span>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Employee selector */}
                    <div>
                        <label className={labelCls}>
                            {t('tasksPage.assignee')}
                        </label>
                        <div className="relative">
                            {selectedEmp && (
                                <img
                                    src={selectedEmp.avatar}
                                    alt=""
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-gray-200 pointer-events-none"
                                />
                            )}
                            <select
                                value={selectedEmpId}
                                onChange={e => setSelectedEmpId(Number(e.target.value))}
                                className={`${selectCls} pl-11`}
                            >
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name} — {emp.role}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {tasks.map((task, idx) => (
                        <div key={idx} className="space-y-4">
                            {tasks.length > 1 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-[#33cbcc]">{t('tasksPage.taskNumber')} {idx + 1}</span>
                                    <div className="flex-1 h-px bg-gray-100" />
                                </div>
                            )}

                            {/* Title */}
                            <input
                                autoFocus={idx === 0}
                                value={task.title}
                                onChange={e => update(idx, 'title', e.target.value)}
                                placeholder={t('tasksPage.titlePlaceholder')}
                                className={inputCls}
                            />

                            {/* Description */}
                            <div className="relative">
                                <AlignLeft size={14} className="absolute left-4 top-3 text-gray-400 pointer-events-none" />
                                <input
                                    value={task.description}
                                    onChange={e => update(idx, 'description', e.target.value)}
                                    placeholder={t('tasksPage.descriptionPlaceholder')}
                                    className={`${inputCls} pl-10`}
                                />
                            </div>

                            {/* Project */}
                            <div>
                                <label className={labelCls}>
                                    <Briefcase size={11} />
                                    {t('tasksPage.project')}
                                </label>
                                <select
                                    value={task.project}
                                    onChange={e => update(idx, 'project', e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">{t('tasksPage.projectNone')}</option>
                                    {(apiProjectsList || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Start date + End date + Time */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>
                                        <CalendarDays size={11} />
                                        {t('tasksPage.startDate')}
                                    </label>
                                    <input
                                        type="date"
                                        value={task.startDate}
                                        onChange={e => update(idx, 'startDate', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        <CalendarDays size={11} />
                                        {t('tasksPage.endDate')}
                                    </label>
                                    <input
                                        type="date"
                                        value={task.endDate}
                                        onChange={e => update(idx, 'endDate', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        <Clock size={11} />
                                        {t('tasksPage.time')}
                                    </label>
                                    <input
                                        type="time"
                                        value={task.time}
                                        onChange={e => update(idx, 'time', e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* Difficulty + Priority + Repeat */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className={labelCls}>
                                        <BarChart3 size={11} />
                                        {t('tasksPage.difficulty')}
                                    </label>
                                    <select
                                        value={task.difficulty}
                                        onChange={e => update(idx, 'difficulty', e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="easy">{t('tasksPage.difficultyEasy')}</option>
                                        <option value="medium">{t('tasksPage.difficultyMedium')}</option>
                                        <option value="hard">{t('tasksPage.difficultyHard')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        <Flag size={11} />
                                        {t('tasksPage.priority')}
                                    </label>
                                    <select
                                        value={task.priority}
                                        onChange={e => update(idx, 'priority', e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="low">{t('tasksPage.priorityLow')}</option>
                                        <option value="medium">{t('tasksPage.priorityMedium')}</option>
                                        <option value="high">{t('tasksPage.priorityHigh')}</option>
                                        <option value="urgent">{t('tasksPage.priorityUrgent')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>
                                        <RefreshCw size={11} />
                                        {t('tasksPage.repeat')}
                                    </label>
                                    <select
                                        value={task.repeat}
                                        onChange={e => update(idx, 'repeat', e.target.value)}
                                        className={selectCls}
                                    >
                                        <option value="none">{t('tasksPage.repeatNone')}</option>
                                        <option value="daily">{t('tasksPage.repeatDaily')}</option>
                                        <option value="weekly">{t('tasksPage.repeatWeekly')}</option>
                                        <option value="monthly">{t('tasksPage.repeatMonthly')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add another task */}
                    <button
                        onClick={() => setTasks(prev => [...prev, makeEmpty()])}
                        className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:text-[#33cbcc] hover:border-[#33cbcc]/30 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        {t('tasksPage.addAnother')}
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        {t('tasksPage.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={validCount === 0}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all
                            ${validCount > 0 ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-sm shadow-[#33cbcc]/20' : 'bg-gray-300 cursor-not-allowed'}`}
                    >
                        {t('tasksPage.createTask')}
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [pageView, setPageView] = useState<'calendar' | 'board'>('calendar');
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [boardFilterEmployee, setBoardFilterEmployee] = useState('');
    const [boardFilterDepartment, setBoardFilterDepartment] = useState('');
    const [boardCurrentDate, setBoardCurrentDate] = useState(() => new Date());
    const [boardViewMode, setBoardViewMode] = useState<'week' | 'month'>('week');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [modalData, setModalData] = useState<{ task: GanttTask; employee: EmployeeRow } | null>(null);
    const [addTaskData, setAddTaskData] = useState<{ employee?: EmployeeRow; date: Date } | null>(null);
    const [editingGanttTask, setEditingGanttTask] = useState<{ task: GanttTask; emp: EmployeeRow } | null>(null);
    const [historyTaskId, setHistoryTaskId] = useState<string | null>(null);

    // API data
    const deptScope = useDepartmentScope();
    const { data: apiTasks, isLoading: loadingTasks } = useTasks(deptScope);
    const { data: apiEmployees, isLoading: loadingEmployees } = useEmployees(deptScope);
    const { data: apiDepartments } = useDepartments();
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();

    // Map API data to display shapes — no mock fallback
    const TASK_COLOR_MAP: Record<string, ColorKey> = {
        'EASY': 'teal', 'MEDIUM': 'blue', 'HARD': 'rose',
    };
    const STATE_STATUS_MAP: Record<string, 'todo' | 'in_progress' | 'done'> = {
        'CREATED': 'todo', 'ASSIGNED': 'todo', 'IN_PROGRESS': 'in_progress',
        'BLOCKED': 'in_progress', 'COMPLETED': 'done', 'REVIEWED': 'done',
    };
    const initialData: EmployeeRow[] = (apiEmployees || []).map((emp, i) => {
        const empTasks = (apiTasks || []).filter(t => t.assignedToId === emp.id);
        
        const mappedTasks = empTasks.map((t, j) => {
            const start = t.startDate ? new Date(t.startDate) : (t.dueDate ? new Date(t.dueDate) : new Date());
            const end = t.endDate ? new Date(t.endDate) : start;
            
            return {
                id: j + 1,
                apiId: t.id,
                title: t.title,
                subtitle: t.project?.name || '',
                startDate: start,
                endDate: end,
                color: (TASK_COLOR_MAP[t.difficulty] || 'blue') as ColorKey,
                status: (STATE_STATUS_MAP[t.state] || 'todo') as 'todo' | 'in_progress' | 'done',
                description: t.description || undefined,
                selfAssigned: t.selfAssigned || false,
            };
        });

        const tasksWithLanes = assignLanes(mappedTasks);
        const laneCount = tasksWithLanes.reduce((max, t) => Math.max(max, (t.lane || 0) + 1), 1);

        return {
            id: i + 1,
            apiId: emp.id,
            name: `${emp.firstName} ${emp.lastName}`,
            role: emp.position?.title || '',
            avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}`,
            departmentId: emp.departmentId || '',
            departmentName: emp.department?.name || '',
            tasks: tasksWithLanes,
            laneCount,
        } as EmployeeRow;
    });

    const [employees, setEmployees] = useState(initialData);

    // Sync when API data changes
    useEffect(() => {
        setEmployees(initialData);
    }, [apiEmployees, apiTasks]);
    const [drag, setDrag] = useState<{
        taskId: number; empId: number;
        type: 'move' | 'resize-start' | 'resize-end';
        startX: number; deltaDays: number;
        origStart: Date; origEnd: Date;
    } | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const wasDragging = useRef(false);
    const dayPxRef = useRef(0);
    const [timelineWidth, setTimelineWidth] = useState(0);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            setTimelineWidth(entries[0]?.contentRect.width ?? 0);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /* ── View range ── */

    let viewStart: Date;
    let viewDays: number;
    const dayPx = viewMode === 'week' && timelineWidth > 0
        ? Math.floor(timelineWidth / 7)
        : DAY_PX[viewMode];
    dayPxRef.current = dayPx;

    if (viewMode === 'day') {
        viewStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        viewDays = 1;
    } else if (viewMode === 'week') {
        viewStart = startOfWeek(currentDate);
        viewDays = 7;
    } else if (viewMode === 'month') {
        viewStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        viewDays = numDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    } else {
        viewStart = new Date(currentDate.getFullYear(), 0, 1);
        const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        viewDays = isLeap(currentDate.getFullYear()) ? 366 : 365;
    }

    const viewEnd = addDays(viewStart, viewDays - 1);
    const totalWidth = viewDays * dayPx;

    /* ── Columns (for week / month header) ── */

    const columns = Array.from({ length: viewDays }, (_, i) => {
        const date = addDays(viewStart, i);
        return {
            index: i,
            date,
            dow: date.getDay(),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            isToday: isSameDay(date, today),
        };
    });

    /* ── Year-view month headers ── */

    const yearMonths = viewMode === 'year'
        ? Array.from({ length: 12 }, (_, m) => {
            const mStart = new Date(currentDate.getFullYear(), m, 1);
            const days = numDaysInMonth(currentDate.getFullYear(), m);
            return { month: m, name: MONTH_NAMES[m], startIdx: diffDays(viewStart, mStart), days, width: days * dayPx };
        })
        : [];

    /* ── Today column index ── */

    const todayIdx = diffDays(viewStart, today);
    const showTodayLine = todayIdx >= 0 && todayIdx < viewDays;

    /* ── Filtering ── */

    const filteredEmployees = employees.filter(e => {
        // Row-click selection takes priority — ignore text search when one employee is pinned
        if (selectedEmployeeId !== null) return e.id === selectedEmployeeId;
        // Text search filters by name or role
        if (!searchQuery) return true;
        return e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               e.role.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const selectedEmployee = selectedEmployeeId !== null
        ? employees.find(e => e.id === selectedEmployeeId)
        : null;

    /* ── Navigation ── */

    const nav = (dir: number) => {
        const d = new Date(currentDate);
        if (viewMode === 'day') d.setDate(d.getDate() + dir);
        else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
        else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
        else d.setFullYear(d.getFullYear() + dir);
        setCurrentDate(d);
    };

    const navLabel = (() => {
        if (viewMode === 'day')
            return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (viewMode === 'week') {
            const ws = startOfWeek(currentDate);
            const we = addDays(ws, 6);
            const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            if (ws.getMonth() !== we.getMonth())
                return `${ws.toLocaleDateString(undefined, o)} – ${we.toLocaleDateString(undefined, { ...o, year: 'numeric' })}`;
            return `${ws.toLocaleDateString(undefined, o)} – ${we.getDate()}, ${we.getFullYear()}`;
        }
        if (viewMode === 'month')
            return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        return `${currentDate.getFullYear()}`;
    })();

    /* ── Board date range ── */

    const boardViewStart = boardViewMode === 'week'
        ? startOfWeek(boardCurrentDate)
        : new Date(boardCurrentDate.getFullYear(), boardCurrentDate.getMonth(), 1);

    const boardViewDays = boardViewMode === 'week'
        ? 7
        : numDaysInMonth(boardCurrentDate.getFullYear(), boardCurrentDate.getMonth());

    const boardViewEnd = addDays(boardViewStart, boardViewDays - 1);

    const boardNavLabel = boardViewMode === 'week'
        ? (() => {
            const we = addDays(boardViewStart, 6);
            const o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
            if (boardViewStart.getMonth() !== we.getMonth())
                return `${boardViewStart.toLocaleDateString(undefined, o)} – ${we.toLocaleDateString(undefined, { ...o, year: 'numeric' })}`;
            return `${boardViewStart.toLocaleDateString(undefined, o)} – ${we.getDate()}, ${we.getFullYear()}`;
        })()
        : boardCurrentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const boardNav = (dir: number) => {
        const d = new Date(boardCurrentDate);
        if (boardViewMode === 'week') d.setDate(d.getDate() + dir * 7);
        else d.setMonth(d.getMonth() + dir);
        setBoardCurrentDate(d);
    };

    /* ── Task bar position ── */

    const getBar = (task: GanttTask) => {
        const ts = new Date(task.startDate); ts.setHours(0, 0, 0, 0);
        const te = new Date(task.endDate);   te.setHours(0, 0, 0, 0);
        const cs = ts < viewStart ? viewStart : ts;
        const ce = te > viewEnd ? viewEnd : te;
        if (cs > viewEnd || ce < viewStart) return null;
        const offset = diffDays(viewStart, cs);
        const span = diffDays(cs, ce) + 1;
        return { left: offset * dayPx + 4, width: span * dayPx - 8 };
    };

    /* ── Drag helpers ── */

    const getPreviewDates = (d: NonNullable<typeof drag>) => {
        const maxD = diffDays(d.origStart, d.origEnd);
        let s = new Date(d.origStart);
        let e = new Date(d.origEnd);
        if (d.type === 'move') {
            s = addDays(s, d.deltaDays);
            e = addDays(e, d.deltaDays);
        } else if (d.type === 'resize-start') {
            s = addDays(s, Math.min(d.deltaDays, maxD));
        } else {
            e = addDays(e, Math.max(d.deltaDays, -maxD));
        }
        return { start: s, end: e };
    };

    const startDrag = (
        e: React.PointerEvent,
        task: GanttTask,
        emp: EmployeeRow,
        type: 'move' | 'resize-start' | 'resize-end',
    ) => {
        e.stopPropagation();
        e.preventDefault();
        const startX = e.clientX;
        const origStart = new Date(task.startDate);
        const origEnd = new Date(task.endDate);
        let currentDelta = 0;
        wasDragging.current = false;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize';

        const onMove = (ev: PointerEvent) => {
            const delta = Math.round((ev.clientX - startX) / dayPxRef.current);
            if (delta !== currentDelta) {
                currentDelta = delta;
                wasDragging.current = true;
                setDrag({ taskId: task.id, empId: emp.id, type, startX, deltaDays: delta, origStart, origEnd });
            }
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';

            if (currentDelta !== 0) {
                const maxD = diffDays(origStart, origEnd);
                let s = new Date(origStart);
                let en = new Date(origEnd);
                if (type === 'move') { s = addDays(s, currentDelta); en = addDays(en, currentDelta); }
                else if (type === 'resize-start') { s = addDays(s, Math.min(currentDelta, maxD)); }
                else { en = addDays(en, Math.max(currentDelta, -maxD)); }

                setEmployees(prev => prev.map(em => {
                    if (em.id !== emp.id) return em;
                    const updatedTasks = em.tasks.map(t => t.id !== task.id ? t : { ...t, startDate: s, endDate: en });
                    const tasksWithLanes = assignLanes(updatedTasks);
                    const laneCount = tasksWithLanes.reduce((max, t) => Math.max(max, (t.lane || 0) + 1), 1);
                    return { ...em, tasks: tasksWithLanes, laneCount };
                }));

                // Persist to backend
                if (task.apiId) {
                    updateTaskMutation.mutate({
                        id: task.apiId,
                        dto: {
                            startDate: s.toISOString(),
                            endDate: en.toISOString(),
                        },
                    });
                }
            }
            setDrag(null);
            setTimeout(() => { wasDragging.current = false; }, 50);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        setDrag({ taskId: task.id, empId: emp.id, type, startX, deltaDays: 0, origStart, origEnd });
    };

    const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    /* ── Add task handler ── */

    const handleAddTask = (empId: number, task: GanttTask) => {
        const emp = employees.find(e => e.id === empId);
        setEmployees(prev => prev.map(em => {
            if (em.id !== empId) return em;
            const newTasks = [...em.tasks, task];
            const tasksWithLanes = assignLanes(newTasks);
            const laneCount = tasksWithLanes.reduce((max, t) => Math.max(max, (t.lane || 0) + 1), 1);
            return { ...em, tasks: tasksWithLanes, laneCount };
        }));
        // Also call API to persist
        createTaskMutation.mutate({
            title: task.title,
            description: task.description || undefined,
            difficulty: (task.difficulty as any) || 'MEDIUM',
            state: 'ASSIGNED',
            assignedToId: emp?.apiId,
            projectId: task.projectId || undefined,
            startDate: task.startDate.toISOString(),
            endDate: task.endDate.toISOString(),
            dueDate: task.endDate.toISOString(),
        });
    };

    const handleRowClick = (e: React.MouseEvent<HTMLDivElement>, emp: EmployeeRow) => {
        if (wasDragging.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const dayOffset = Math.floor(x / dayPx);
        const clickedDate = addDays(viewStart, dayOffset);
        setAddTaskData({ employee: emp, date: clickedDate });
    };

    /* ── Auto-scroll to today ── */

    useEffect(() => {
        if (scrollRef.current && showTodayLine) {
            scrollRef.current.scrollLeft = Math.max(0, todayIdx * dayPx - 200);
        }
    }, [currentDate, viewMode]);

    /* ════════════════════════ JSX ════════════════════════ */

    if (loadingTasks || loadingEmployees) {
        return <TasksAdminSkeleton />;
    }

    return (
        <div className="space-y-5">

            {/* ═══ Page header ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('tasksPage.title')}</h1>
                    <p className="text-sm text-gray-400 mt-1">{t('tasksPage.subtitle')}</p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Calendar / Board toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setPageView('calendar')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pageView === 'calendar' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <CalendarRange size={14} />
                            {t('tasksPage.calendarView')}
                        </button>
                        <button
                            onClick={() => setPageView('board')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${pageView === 'board' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Columns3 size={14} />
                            {t('tasksPage.boardView')}
                        </button>
                    </div>
                    <button
                        onClick={() => setAddTaskData({ date: new Date() })}
                        className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-sm shadow-[#33cbcc]/20"
                    >
                        <Plus size={16} />
                        {t('tasksPage.addTask')}
                    </button>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder={t('tasksPage.searchPlaceholder')}
                            className="bg-white rounded-xl border border-gray-200 pl-9 pr-9 py-2.5 text-sm text-gray-700 placeholder-gray-400 w-52 sm:w-60 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ Board view ═══ */}
            {pageView === 'board' && (() => {
                const selectCls = 'bg-white rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';

                const allTasks = employees.flatMap(emp => {
                    if (boardFilterDepartment && emp.departmentId !== boardFilterDepartment) return [];
                    if (boardFilterEmployee && emp.apiId !== boardFilterEmployee) return [];
                    return emp.tasks
                        .filter(t => {
                            // date range overlap: task overlaps [boardViewStart, boardViewEnd]
                            const ts = new Date(t.startDate); ts.setHours(0, 0, 0, 0);
                            const te = new Date(t.endDate);   te.setHours(23, 59, 59, 999);
                            if (ts > boardViewEnd || te < boardViewStart) return false;
                            // text search: when an employee is already selected via dropdown, only match title
                            // otherwise also match by employee name so typing a name shows their tasks
                            if (searchQuery) {
                                const titleMatch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
                                const nameMatch = !boardFilterEmployee && emp.name.toLowerCase().includes(searchQuery.toLowerCase());
                                if (!titleMatch && !nameMatch) return false;
                            }
                            return true;
                        })
                        .map(t => ({ ...t, employee: emp }));
                });

                const BOARD_COLS = [
                    { key: 'todo',        label: t('tasksPage.todo'),       dot: '#9ca3af' },
                    { key: 'in_progress', label: t('tasksPage.inProgress'), dot: '#f59e0b' },
                    { key: 'done',        label: t('tasksPage.done'),        dot: '#22c55e' },
                ] as const;

                const diffLabel: Record<ColorKey, string> = {
                    teal:  t('tasksPage.difficultyEasy'),
                    blue:  t('tasksPage.difficultyMedium'),
                    amber: t('tasksPage.difficultyHard'),
                    rose:  t('tasksPage.difficultyHard'),
                };

                return (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        {/* Date navigation */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                {/* Week / Month toggle */}
                                <div className="flex bg-gray-100 rounded-xl p-1">
                                    {(['week', 'month'] as const).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setBoardViewMode(v)}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${boardViewMode === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {t(`tasksPage.view_${v}`)}
                                        </button>
                                    ))}
                                </div>

                                {/* Prev / label / Next */}
                                <div className="flex items-center gap-1">
                                    <button onClick={() => boardNav(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                                        <ChevronLeft size={18} />
                                    </button>
                                    <span className="text-sm font-bold text-gray-800 min-w-42 text-center select-none capitalize">{boardNavLabel}</span>
                                    <button onClick={() => boardNav(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </div>

                                {/* Today */}
                                <button
                                    onClick={() => setBoardCurrentDate(new Date())}
                                    className="text-xs font-semibold text-[#33cbcc] px-3 py-1.5 rounded-lg hover:bg-[#33cbcc]/10 transition-colors border border-[#33cbcc]/30"
                                >
                                    {t('tasksPage.today')}
                                </button>
                            </div>

                            <span className="text-xs text-gray-400">
                                {allTasks.length} {allTasks.length === 1 ? t('tasksPage.taskNumber') : t('tasksPage.taskNumber') + 's'}
                            </span>
                        </div>

                        {/* Employee / Department filters */}
                        <div className="flex flex-wrap gap-3">
                            <select
                                value={boardFilterDepartment}
                                onChange={e => { setBoardFilterDepartment(e.target.value); setBoardFilterEmployee(''); }}
                                className={selectCls}
                            >
                                <option value="">{t('tasksPage.allDepartments')}</option>
                                {(apiDepartments || []).map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>

                            <select
                                value={boardFilterEmployee}
                                onChange={e => setBoardFilterEmployee(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">{t('tasksPage.allEmployees')}</option>
                                {employees
                                    .filter(e => !boardFilterDepartment || e.departmentId === boardFilterDepartment)
                                    .map(e => (
                                        <option key={e.apiId} value={e.apiId}>{e.name}</option>
                                    ))}
                            </select>

                            {(boardFilterDepartment || boardFilterEmployee) && (
                                <button
                                    onClick={() => { setBoardFilterDepartment(''); setBoardFilterEmployee(''); }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors"
                                >
                                    <X size={14} />
                                    {t('tasksPage.showAll')}
                                </button>
                            )}
                        </div>

                        {/* Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {BOARD_COLS.map(col => {
                                const colTasks = allTasks.filter(t => t.status === col.key);
                                return (
                                    <div key={col.key} className="flex flex-col gap-3">
                                        {/* Column header */}
                                        <div className="flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.dot }} />
                                                <span className="text-sm font-bold text-gray-700">{col.label}</span>
                                            </div>
                                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                                                {colTasks.length}
                                            </span>
                                        </div>

                                        {/* Cards */}
                                        <div className="flex flex-col gap-3 min-h-40">
                                            {colTasks.map(task => {
                                                const c = TASK_COLORS[task.color];
                                                return (
                                                    <motion.div
                                                        key={task.id}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        onClick={() => setModalData({ task, employee: task.employee })}
                                                        className="bg-white rounded-2xl border border-gray-100 p-4 cursor-pointer hover:border-[#33cbcc]/30 hover:shadow-sm transition-all"
                                                        style={{ borderLeft: `3px solid ${c.border}` }}
                                                    >
                                                        {/* Title + flag */}
                                                        <div className="flex items-start justify-between gap-2 mb-3">
                                                            <p className="text-sm font-semibold text-gray-800 leading-snug">{task.title}</p>
                                                            {task.hasFlag && <Flag size={13} className="shrink-0 mt-0.5 text-rose-400" />}
                                                        </div>

                                                        {/* Project */}
                                                        {task.subtitle && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <Briefcase size={11} className="text-gray-400 shrink-0" />
                                                                <span className="text-[11px] text-gray-400 truncate">{task.subtitle}</span>
                                                            </div>
                                                        )}

                                                        {/* Date range */}
                                                        <div className="flex items-center gap-1.5 mb-3">
                                                            <CalendarDays size={11} className="text-gray-400 shrink-0" />
                                                            <span className="text-[11px] text-gray-400">
                                                                {task.startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                {' – '}
                                                                {task.endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>

                                                        {/* Footer: employee + difficulty */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <img
                                                                    src={task.employee.avatar}
                                                                    alt={task.employee.name}
                                                                    className="w-6 h-6 rounded-full border border-gray-200 shrink-0 object-cover"
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="text-[11px] text-gray-600 font-medium truncate">{task.employee.name}</p>
                                                                    {task.employee.departmentName && (
                                                                        <p className="text-[10px] text-gray-400 truncate">{task.employee.departmentName}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span
                                                                className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                                                style={{ backgroundColor: c.bg, color: c.text }}
                                                            >
                                                                {diffLabel[task.color]}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}

                                            {colTasks.length === 0 && (
                                                <div className="flex-1 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center py-10">
                                                    <p className="text-xs text-gray-300">—</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                );
            })()}

            {pageView === 'calendar' && <>
            {/* ═══ Toolbar: view toggle + nav ═══ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* View mode toggle */}
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {(['day', 'week', 'month', 'year'] as ViewMode[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    viewMode === v
                                        ? 'bg-white text-gray-800 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {t(`tasksPage.view_${v}`)}
                            </button>
                        ))}
                    </div>

                    {/* Prev / label / Next */}
                    <div className="flex items-center gap-1">
                        <button onClick={() => nav(-1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm font-bold text-gray-800 min-w-42.5 text-center capitalize select-none">{navLabel}</span>
                        <button onClick={() => nav(1)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Today */}
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs font-semibold text-[#33cbcc] px-3 py-1.5 rounded-lg hover:bg-[#33cbcc]/10 transition-colors border border-[#33cbcc]/30"
                    >
                        {t('tasksPage.today')}
                    </button>
                </div>

                {/* Priority legend */}
                <div className="hidden sm:flex items-center gap-4">
                    {([
                        { color: 'teal' as ColorKey,  key: 'priorityLow' },
                        { color: 'blue' as ColorKey,  key: 'priorityMedium' },
                        { color: 'amber' as ColorKey, key: 'priorityHigh' },
                        { color: 'rose' as ColorKey,  key: 'priorityUrgent' },
                    ]).map(({ color, key }) => (
                        <div key={key} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: TASK_COLORS[color].border }} />
                            <span className="text-[11px] text-gray-400">{t(`tasksPage.${key}`)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ Selected employee banner ═══ */}
            <AnimatePresence>
                {selectedEmployee && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="flex items-center gap-3 bg-[#33cbcc]/8 rounded-xl px-4 py-3 border border-[#33cbcc]/15">
                            <img src={selectedEmployee.avatar} alt="" className="w-9 h-9 rounded-full border-2 border-[#33cbcc] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{selectedEmployee.name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {selectedEmployee.role} &middot; {selectedEmployee.tasks.length} task{selectedEmployee.tasks.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedEmployeeId(null)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2aa8a9] px-3 py-1.5 rounded-lg hover:bg-[#33cbcc]/10 transition-colors shrink-0"
                            >
                                <ArrowLeft size={14} />
                                <span className="hidden sm:inline">{t('tasksPage.showAll')}</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ═══ Gantt chart ═══ */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="flex">

                    {/* ── Employee column (sticky) ── */}
                    <div className="shrink-0 w-15 sm:w-65 border-r border-gray-100 z-10 bg-white">
                        <div style={{ height: `${HEADER_H}px` }} className="border-b border-gray-100 flex items-center px-3 sm:px-5">
                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider hidden sm:block">
                                {t('tasksPage.employees')}
                            </span>
                        </div>

                        {filteredEmployees.map(emp => {
                            const isActive = selectedEmployeeId === emp.id;
                            const h = Math.max(ROW_H, (emp.laneCount || 1) * (TASK_H + TASK_GAP) + TASK_GAP * 2);
                            return (
                                <div
                                    key={emp.id}
                                    onClick={() => setSelectedEmployeeId(prev => prev === emp.id ? null : emp.id)}
                                    style={{ height: `${h}px` }}
                                    className={`border-b border-gray-50 flex items-center gap-3 px-2 sm:px-5 cursor-pointer transition-all group
                                        ${isActive ? 'bg-[#33cbcc]/5' : 'hover:bg-gray-50/80'}`}
                                >
                                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden shrink-0 border-2 transition-colors
                                        ${isActive ? 'border-[#33cbcc] ring-2 ring-[#33cbcc]/20' : 'border-gray-100 group-hover:border-[#33cbcc]/40'}`}>
                                        <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 hidden sm:block flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-semibold text-gray-800 truncate">{emp.name}</p>
                                            {emp.tasks.length > 0 && (
                                                <span className="shrink-0 text-[10px] font-bold text-[#33cbcc] bg-[#33cbcc]/10 rounded-full px-1.5 py-0.5 leading-none">
                                                    {emp.tasks.length}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">{emp.role}</p>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredEmployees.length === 0 && (
                            <div style={{ height: `${ROW_H}px` }} className="flex items-center justify-center px-4">
                                <p className="text-xs text-gray-400">{t('tasksPage.noResults')}</p>
                            </div>
                        )}
                    </div>

                    {/* ── Timeline (scrollable) ── */}
                    <div ref={scrollRef} className="flex-1 overflow-x-auto">
                        <div style={{ width: `${totalWidth}px` }} className="relative">

                            {/* ── Header row ── */}
                            {viewMode === 'year' ? (
                                /* Year: month-span headers */
                                <div style={{ height: `${HEADER_H}px` }} className="border-b border-gray-100 flex sticky top-0 bg-white z-10">
                                    {yearMonths.map(m => {
                                        const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() && today.getMonth() === m.month;
                                        return (
                                            <div
                                                key={m.month}
                                                style={{ width: `${m.width}px` }}
                                                className={`shrink-0 flex items-center justify-center border-r border-gray-200
                                                    ${isCurrentMonth ? 'bg-[#33cbcc]/5' : m.month % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                                            >
                                                <span className={`text-xs font-semibold ${isCurrentMonth ? 'text-[#33cbcc]' : 'text-gray-600'}`}>{m.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : viewMode === 'day' ? (
                                /* Day: single wide column */
                                <div style={{ height: `${HEADER_H}px` }} className="border-b border-gray-100 flex sticky top-0 bg-white z-10">
                                    <div
                                        style={{ width: `${dayPx}px` }}
                                        className={`shrink-0 flex items-center justify-center gap-3 ${columns[0]?.isToday ? 'bg-red-50/50' : ''}`}
                                    >
                                        <span className={`text-sm font-semibold ${columns[0]?.isToday ? 'text-red-500' : 'text-gray-600'}`}>
                                            {DAY_NAMES_FULL[columns[0]?.dow ?? 0]}
                                        </span>
                                        {columns[0]?.isToday ? (
                                            <span className="w-8 h-8 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center shadow-sm shadow-red-200">
                                                {columns[0]?.date.getDate()}
                                            </span>
                                        ) : (
                                            <span className="text-lg font-bold text-gray-800">{columns[0]?.date.getDate()}</span>
                                        )}
                                        <span className={`text-sm font-medium ${columns[0]?.isToday ? 'text-red-400' : 'text-gray-400'}`}>
                                            {MONTH_NAMES[columns[0]?.date.getMonth() ?? 0]}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* Week / Month: day columns */
                                <div style={{ height: `${HEADER_H}px` }} className="border-b border-gray-100 flex sticky top-0 bg-white z-10">
                                    {columns.map(col => (
                                        <div
                                            key={col.index}
                                            style={{ width: `${dayPx}px` }}
                                            className={`shrink-0 flex flex-col items-center justify-center border-r border-gray-50
                                                ${col.isWeekend ? 'bg-gray-50/50' : ''}`}
                                        >
                                            <span className={`text-[11px] font-medium
                                                ${col.isToday ? 'text-red-500' : col.isWeekend ? 'text-gray-300' : 'text-gray-400'}`}>
                                                {viewMode === 'week' ? DAY_NAMES_FULL[col.dow] : DAY_NAMES_SHORT[col.dow]}
                                            </span>
                                            {col.isToday ? (
                                                <span className="w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center mt-1 shadow-sm shadow-red-200">
                                                    {col.date.getDate()}
                                                </span>
                                            ) : (
                                                <span className={`text-sm font-semibold mt-1 ${col.isWeekend ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    {col.date.getDate()}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Task rows ── */}
                            {filteredEmployees.map(emp => (
                                <div
                                    key={emp.id}
                                    style={{ height: `${Math.max(ROW_H, (emp.laneCount || 1) * (TASK_H + TASK_GAP) + TASK_GAP * 2)}px` }}
                                    className={`border-b border-gray-50 relative flex cursor-pointer ${selectedEmployeeId === emp.id ? 'bg-[#33cbcc]/2' : ''}`}
                                    onClick={e => handleRowClick(e, emp)}
                                >
                                    {/* Background grid */}
                                    {viewMode === 'year'
                                        ? yearMonths.map(m => (
                                            <div
                                                key={m.month}
                                                style={{ width: `${m.width}px` }}
                                                className={`shrink-0 border-r border-gray-100 ${m.month % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                                            />
                                        ))
                                        : columns.map(col => (
                                            <div
                                                key={col.index}
                                                style={{ width: `${dayPx}px` }}
                                                className={`shrink-0 border-r border-gray-50 ${col.isWeekend ? 'bg-gray-50/50' : ''}`}
                                            />
                                        ))
                                    }

                                    {/* Task bars */}
                                    {emp.tasks.map(task => {
                                        const isDrag = drag?.taskId === task.id;
                                        let bar: { left: number; width: number } | null;
                                        let preview: { start: Date; end: Date } | null = null;

                                        if (isDrag && drag) {
                                            preview = getPreviewDates(drag);
                                            bar = getBar({ ...task, startDate: preview.start, endDate: preview.end });
                                        } else {
                                            bar = getBar(task);
                                        }
                                        if (!bar) return null;

                                        const c = TASK_COLORS[task.color];
                                        const narrow = bar.width < 55;
                                        const top = (task.lane || 0) * (TASK_H + TASK_GAP) + TASK_GAP;

                                        return (
                                            <div
                                                key={task.id}
                                                className={`absolute rounded-xl group/task z-6 select-none
                                                    ${isDrag ? 'shadow-lg ring-2 ring-[#33cbcc]/30' : 'hover:shadow-md'}`}
                                                style={{
                                                    left: `${bar.left}px`,
                                                    top: `${top}px`,
                                                    height: `${TASK_H}px`,
                                                    width: `${Math.max(bar.width, 24)}px`,
                                                    backgroundColor: c.bg,
                                                    borderLeft: `4px solid ${c.border}`,
                                                    opacity: isDrag ? 0.92 : 1,
                                                    touchAction: 'none',
                                                    transition: isDrag ? 'none' : 'box-shadow 0.2s, opacity 0.2s',
                                                }}
                                            >
                                                {/* Left resize handle */}
                                                <div
                                                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 rounded-l-xl opacity-0 group-hover/task:opacity-100 bg-black/5 hover:bg-black/15! transition-opacity"
                                                    onPointerDown={ev => { ev.stopPropagation(); startDrag(ev, task, emp, 'resize-start'); }}
                                                />

                                                {/* Content area — move drag + click for modal */}
                                                <div
                                                    className="flex items-center gap-1.5 px-2.5 h-full cursor-grab active:cursor-grabbing"
                                                    onPointerDown={ev => { if (ev.button === 0) startDrag(ev, task, emp, 'move'); }}
                                                    onClick={e => { e.stopPropagation(); if (!wasDragging.current) setModalData({ task, employee: emp }); }}
                                                >
                                                    {!narrow && (
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold truncate" style={{ color: c.text }}>{task.title}</p>
                                                            <p className="text-[10px] truncate opacity-60 mt-0.5" style={{ color: c.text }}>{task.subtitle}</p>
                                                        </div>
                                                    )}
                                                    {!narrow && task.hasFlag && (
                                                        <Flag size={12} className="shrink-0 opacity-50" style={{ color: c.text }} />
                                                    )}
                                                    {!narrow && task.selfAssigned && (
                                                        <Zap size={12} className="shrink-0 opacity-70" style={{ color: c.text }} />
                                                    )}
                                                </div>

                                                {/* Right resize handle */}
                                                <div
                                                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 rounded-r-xl opacity-0 group-hover/task:opacity-100 bg-black/5 hover:bg-black/15! transition-opacity"
                                                    onPointerDown={ev => { ev.stopPropagation(); startDrag(ev, task, emp, 'resize-end'); }}
                                                />

                                                {/* Date tooltip while dragging */}
                                                {isDrag && preview && (
                                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-medium px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-lg z-20">
                                                        {fmtShort(preview.start)} – {fmtShort(preview.end)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Empty state */}
                            {filteredEmployees.length === 0 && (
                                <div style={{ height: `${ROW_H}px` }} className="flex items-center justify-center">
                                    <p className="text-xs text-gray-300">—</p>
                                </div>
                            )}

                            {/* Today vertical line */}
                            {showTodayLine && (
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-400/50 z-5 pointer-events-none"
                                    style={{ left: `${todayIdx * dayPx + dayPx / 2}px` }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
            </>}

            {/* ═══ Task detail modal ═══ */}
            <AnimatePresence>
                {modalData && (
                    <TaskDetailModal
                        task={modalData.task}
                        employee={modalData.employee}
                        onClose={() => setModalData(null)}
                        onEdit={modalData.task.apiId ? () => setEditingGanttTask({ task: modalData!.task, emp: modalData!.employee }) : undefined}
                        onDelete={modalData.task.apiId ? () => {
                            deleteTaskMutation.mutate(modalData!.task.apiId!);
                            setModalData(null);
                        } : undefined}
                        onHistory={modalData.task.apiId ? () => setHistoryTaskId(modalData!.task.apiId!) : undefined}
                    />
                )}
            </AnimatePresence>

            {/* ═══ Edit Gantt Task modal ═══ */}
            <AnimatePresence>
                {editingGanttTask && (
                    <EditGanttTaskModal
                        task={editingGanttTask.task}
                        onClose={() => setEditingGanttTask(null)}
                        isSaving={updateTaskMutation.isPending}
                        onSave={(dto) => {
                            if (!editingGanttTask.task.apiId) return;
                            updateTaskMutation.mutate(
                                { id: editingGanttTask.task.apiId, dto: dto as any },
                                { onSuccess: () => setEditingGanttTask(null) }
                            );
                        }}
                    />
                )}
            </AnimatePresence>

            {/* ═══ History modal ═══ */}
            <AnimatePresence>
                {historyTaskId && (
                    <GanttHistoryModal
                        taskId={historyTaskId}
                        onClose={() => setHistoryTaskId(null)}
                    />
                )}
            </AnimatePresence>

            {/* ═══ Add task modal ═══ */}
            <AnimatePresence>
                {addTaskData && (
                    <AddTaskModal
                        employees={employees}
                        initialEmployee={addTaskData.employee}
                        initialDate={addTaskData.date}
                        onClose={() => setAddTaskData(null)}
                        onAdd={handleAddTask}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Tasks;
