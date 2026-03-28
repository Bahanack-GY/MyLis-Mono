import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import React, { useState } from 'react';
import {
    TrendingUp,
    CheckCircle,
    Wallet,
    Clock,
    Building,
    Calendar,
    Upload,
    FileText,
    Download,
    Eye,
    CircleDot,
    Circle,
    Users,
    Pencil,
    Plus,
    Trash2,
    Loader2
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';
import type { ProjectTab } from '../components/ProjectDetailSidebar';
import type { ProjectData } from '../layouts/ProjectDetailLayout';
import { useProjectExpenses, useCreateExpense, useDeleteExpense } from '../api/expenses/hooks';
import type { CreateExpenseDto } from '../api/expenses/types';

interface ProjectDetailProps {
    project: ProjectData;
    activeTab: ProjectTab;
    onEdit: () => void;
}

/* ─── Status config ─────────────────────────────────────── */

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: 'bg-emerald-50',  text: 'text-emerald-600',  dot: 'bg-emerald-500' },
    completed: { bg: 'bg-blue-50',     text: 'text-blue-600',     dot: 'bg-blue-500' },
    on_hold:   { bg: 'bg-amber-50',    text: 'text-amber-600',    dot: 'bg-amber-500' },
    overdue:   { bg: 'bg-rose-50',     text: 'text-rose-600',     dot: 'bg-rose-500' },
};

const STATUS_I18N: Record<string, string> = {
    active: 'statusActive',
    completed: 'statusCompleted',
    on_hold: 'statusOnHold',
    overdue: 'statusOverdue',
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtCurrency = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════ */

const DONUT_COLORS = ['#f59e0b', '#33cbcc', '#3b82f6'];

const OverviewView = ({ project, onEdit }: { project: ProjectData; onEdit: () => void }) => {
    const { t } = useTranslation();

    const daysRemaining = project.endDate
        ? Math.max(0, Math.ceil((new Date(project.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const tasksInProgress = project.tasks.filter(tk =>
        tk.state === 'IN_PROGRESS' || tk.state === 'BLOCKED'
    ).length;
    const tasksTodo = project.tasksTotal - project.tasksDone - tasksInProgress;

    const donutData = [
        { name: t('projectDetail.overview.todo'), value: Math.max(0, tasksTodo) },
        { name: t('projectDetail.overview.inProgress'), value: Math.max(0, tasksInProgress) },
        { name: t('projectDetail.overview.done'), value: project.tasksDone },
    ];

    // Task status distribution bar chart
    const STATE_LABELS: Record<string, string> = {
        CREATED: 'Created',
        ASSIGNED: 'Assigned',
        IN_PROGRESS: 'In Progress',
        BLOCKED: 'Blocked',
        COMPLETED: 'Completed',
        REVIEWED: 'Reviewed',
    };
    const STATE_COLORS: Record<string, string> = {
        CREATED: '#6B7280',
        ASSIGNED: '#8B5CF6',
        IN_PROGRESS: '#33cbcc',
        BLOCKED: '#F59E0B',
        COMPLETED: '#3B82F6',
        REVIEWED: '#10B981',
    };
    const statusBarData = Object.keys(STATE_LABELS).map(state => ({
        name: STATE_LABELS[state],
        count: project.tasks.filter(tk => tk.state === state).length,
        fill: STATE_COLORS[state],
    })).filter(d => d.count > 0);

    const profit = project.revenue - project.budget;
    const stats = [
        { label: t('projectDetail.overview.progress'), value: `${project.progress}%`, icon: TrendingUp, color: '#33cbcc' },
        { label: t('projectDetail.overview.tasksDone'), value: `${project.tasksDone}/${project.tasksTotal}`, icon: CheckCircle, color: '#3b82f6' },
        { label: t('projects.formCost'), value: project.budget > 0 ? fmtCurrency(project.budget) : '—', icon: Wallet, color: '#8b5cf6' },
        { label: t('projects.formRevenue'), value: project.revenue > 0 ? fmtCurrency(project.revenue) : '—', icon: TrendingUp, color: profit >= 0 ? '#22c55e' : '#f43f5e' },
        { label: t('projectDetail.overview.daysLeft'), value: `${daysRemaining}`, icon: Clock, color: project.status === 'overdue' ? '#f43f5e' : '#f59e0b' },
    ];

    const style = STATUS_STYLES[project.status] || STATUS_STYLES.active;

    return (
        <div className="space-y-8">
            {/* Project header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-bold text-gray-800">{project.name}</h1>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${style.bg} ${style.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                            {t(`projects.${STATUS_I18N[project.status]}`)}
                        </span>
                    </div>
                    <p className="text-gray-500">{project.description}</p>
                </div>
                <button
                    onClick={onEdit}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#33cbcc] text-white text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 shrink-0"
                >
                    <Pencil size={15} />
                    {t('projects.editTitle')}
                </button>
                {/* Members avatars */}
                {project.members.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-gray-400" />
                        <div className="flex -space-x-2">
                            {project.members.slice(0, 5).map(m => (
                                <img
                                    key={m.id}
                                    src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.firstName}+${m.lastName}`}
                                    alt={`${m.firstName} ${m.lastName}`}
                                    title={`${m.firstName} ${m.lastName}`}
                                    className="w-8 h-8 rounded-full border-2 border-white"
                                />
                            ))}
                            {project.members.length > 5 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500">
                                    +{project.members.length - 5}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Task status distribution */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 lg:col-span-2"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t('projectDetail.overview.weeklyActivity')}</h3>
                    <div className="h-64">
                        {statusBarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <BarChart data={statusBarData} barSize={36}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                        {statusBarData.map((entry, i) => (
                                            <Cell key={i} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                {t('projectDetail.tasks.noTasks')}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Task status donut */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t('projectDetail.overview.taskBreakdown')}</h3>
                    <div className="h-50 relative">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {donutData.map((_, i) => (
                                        <Cell key={i} fill={DONUT_COLORS[i]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-gray-400">{t('projectDetail.overview.total')}</p>
                                <p className="text-2xl font-bold text-gray-800">{project.tasksTotal}</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 mt-4">
                        {donutData.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
                                    <span className="text-gray-600">{entry.name}</span>
                                </div>
                                <span className="font-semibold text-gray-800">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <Building size={14} />
                        {t('projects.formDepartment')}
                    </div>
                    <p className="font-semibold text-gray-800">{project.department || '—'}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <Calendar size={14} />
                        {t('projects.startDate')}
                    </div>
                    <p className="font-semibold text-gray-800">{fmtDate(project.startDate)}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <Calendar size={14} />
                        {t('projects.formDueDate')}
                    </div>
                    <p className="font-semibold text-gray-800">{fmtDate(project.endDate)}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <TrendingUp size={14} />
                        {t('projects.progress')}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ delay: 0.8, duration: 1 }}
                                className="h-full rounded-full bg-[#33cbcc]"
                            />
                        </div>
                        <span className="text-sm font-bold text-gray-800">{project.progress}%</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   TASKS TAB
   ═══════════════════════════════════════════════════════════ */

const DIFFICULTY_STYLES: Record<string, { bg: string; text: string }> = {
    EASY:   { bg: 'bg-emerald-50', text: 'text-emerald-600' },
    MEDIUM: { bg: 'bg-blue-50',    text: 'text-blue-600' },
    HARD:   { bg: 'bg-rose-50',    text: 'text-rose-600' },
};

type KanbanStatus = 'todo' | 'in_progress' | 'done';

const STATE_TO_KANBAN: Record<string, KanbanStatus> = {
    CREATED: 'todo',
    ASSIGNED: 'todo',
    IN_PROGRESS: 'in_progress',
    BLOCKED: 'in_progress',
    COMPLETED: 'done',
    REVIEWED: 'done',
};

const TasksView = ({ project }: { project: ProjectData }) => {
    const { t } = useTranslation();

    const columns: { key: KanbanStatus; label: string; icon: typeof Circle; color: string }[] = [
        { key: 'todo',        label: t('projectDetail.tasks.todo'),       icon: Circle,      color: '#f59e0b' },
        { key: 'in_progress', label: t('projectDetail.tasks.inProgress'), icon: CircleDot,   color: '#33cbcc' },
        { key: 'done',        label: t('projectDetail.tasks.done'),       icon: CheckCircle, color: '#3b82f6' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{t('projectDetail.tasks.title')}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {columns.map((col) => {
                    const colTasks = project.tasks.filter(tk => STATE_TO_KANBAN[tk.state] === col.key);
                    return (
                        <div key={col.key} className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <col.icon size={18} style={{ color: col.color }} />
                                <h3 className="font-semibold text-gray-700">{col.label}</h3>
                                <span className="text-xs font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                            </div>
                            <div className="space-y-3">
                                {colTasks.map((task, i) => {
                                    const dStyle = DIFFICULTY_STYLES[task.difficulty || 'MEDIUM'] || DIFFICULTY_STYLES.MEDIUM;
                                    const assignee = task.assignedTo;
                                    const avatarUrl = assignee?.avatarUrl || (assignee ? `https://ui-avatars.com/api/?name=${assignee.firstName}+${assignee.lastName}` : '');
                                    return (
                                        <motion.div
                                            key={task.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="bg-white rounded-2xl p-4 border border-gray-100 hover:border-[#33cbcc]/30 transition-colors"
                                        >
                                            <p className="font-medium text-gray-800 text-sm mb-3">{task.title}</p>
                                            <div className="flex items-center justify-between">
                                                {assignee ? (
                                                    <div className="flex items-center gap-2">
                                                        <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                                        <span className="text-xs text-gray-500">{assignee.firstName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">{t('projectDetail.tasks.unassigned')}</span>
                                                )}
                                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dStyle.bg} ${dStyle.text}`}>
                                                    {task.difficulty || 'MEDIUM'}
                                                </span>
                                            </div>
                                            {task.dueDate && (
                                                <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                                                    <Calendar size={12} />
                                                    <span>{fmtDate(task.dueDate)}</span>
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                                {colTasks.length === 0 && (
                                    <div className="text-center text-sm text-gray-400 py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                        {t('projectDetail.tasks.noTasks')}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   BUDGET TAB
   ═══════════════════════════════════════════════════════════ */

const EXPENSE_CATEGORIES = ['Loyer', 'Salaire', 'Facture', 'Fourniture', 'Licence/Logiciel', 'Demande', 'Autre'];

const emptyExpenseForm = (): CreateExpenseDto => ({
    title: '',
    amount: 0,
    category: EXPENSE_CATEGORIES[0],
    type: 'ONE_TIME',
    frequency: null,
    date: new Date().toISOString().split('T')[0],
});

const BudgetView = ({ project }: { project: ProjectData }) => {
    const { t } = useTranslation();
    const { data: expenses = [], isLoading: expensesLoading } = useProjectExpenses(project.id);
    const createExpense = useCreateExpense();
    const deleteExpense = useDeleteExpense();

    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState<CreateExpenseDto>(emptyExpenseForm());

    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const revenue = project.revenue;
    const profit = revenue - totalExpenses;

    const summaryStats = [
        { label: t('projects.formRevenue'), value: revenue > 0 ? fmtCurrency(revenue) : '—', color: '#33cbcc', icon: TrendingUp },
        { label: t('projectDetail.budget.expenses'), value: totalExpenses > 0 ? fmtCurrency(totalExpenses) : '—', color: '#f43f5e', icon: Wallet },
        { label: t('projectDetail.budget.profit'), value: (revenue > 0 || totalExpenses > 0) ? fmtCurrency(profit) : '—', color: profit >= 0 ? '#22c55e' : '#f43f5e', icon: TrendingUp },
    ];

    const donutData = [
        { name: t('projectDetail.budget.expenses'), value: totalExpenses },
        { name: t('projects.formRevenue'), value: Math.max(0, revenue - totalExpenses) },
    ];
    const PIE_COLORS = ['#f43f5e', '#33cbcc'];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(prev => {
            const next = { ...prev, [name]: name === 'amount' ? Number(value) : value };
            if (name === 'type' && value === 'ONE_TIME') next.frequency = null;
            if (name === 'type' && value === 'RECURRENT' && !prev.frequency) next.frequency = 'MONTHLY';
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createExpense.mutateAsync({ ...form, projectId: project.id });
        setForm(emptyExpenseForm());
        setShowForm(false);
    };

    const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none text-gray-800 text-sm transition-colors';

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">{t('projectDetail.budget.title')}</h2>

            {/* Summary stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {summaryStats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Donut chart + expenses list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t('projectDetail.budget.expenseBreakdown')}</h3>
                    <div className="h-64 relative">
                        {revenue === 0 && totalExpenses === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">—</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {donutData.map((_, i) => (
                                            <Cell key={i} fill={PIE_COLORS[i]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => fmtCurrency(value as number)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                        {(revenue > 0 || totalExpenses > 0) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <p className="text-xs text-gray-400">{t('projectDetail.budget.utilization')}</p>
                                    <p className="text-2xl font-bold text-gray-800">
                                        {revenue > 0 ? `${Math.min(100, Math.round((totalExpenses / revenue) * 100))}%` : '—'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Expenses list */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-800">{t('projectDetail.budget.expenses')}</h3>
                        <button
                            onClick={() => setShowForm(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] rounded-lg transition-colors"
                        >
                            <Plus size={13} />
                            {t('projectDetail.budget.addExpense')}
                        </button>
                    </div>

                    {/* Inline add form */}
                    <AnimatePresence>
                        {showForm && (
                            <motion.form
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                onSubmit={handleSubmit}
                                className="mb-4 space-y-3 overflow-hidden"
                            >
                                <input type="text" name="title" required placeholder="Titre / Description" value={form.title} onChange={handleChange} className={inputCls} />
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="number" name="amount" required min="0" placeholder="Montant (FCFA)" value={form.amount || ''} onChange={handleChange} className={inputCls} />
                                    <input type="date" name="date" required value={form.date} onChange={handleChange} className={inputCls} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <select name="category" value={form.category} onChange={handleChange} className={inputCls}>
                                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select name="type" value={form.type} onChange={handleChange} className={inputCls}>
                                        <option value="ONE_TIME">Ponctuelle</option>
                                        <option value="RECURRENT">Récurrente</option>
                                    </select>
                                </div>
                                {form.type === 'RECURRENT' && (
                                    <select name="frequency" value={form.frequency || 'MONTHLY'} onChange={handleChange} className={inputCls}>
                                        <option value="DAILY">Quotidienne</option>
                                        <option value="WEEKLY">Hebdomadaire</option>
                                        <option value="MONTHLY">Mensuelle</option>
                                        <option value="YEARLY">Annuelle</option>
                                    </select>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                        Annuler
                                    </button>
                                    <button type="submit" disabled={createExpense.isPending} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] rounded-lg transition-colors disabled:opacity-50">
                                        {createExpense.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                        Enregistrer
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto space-y-2 max-h-64">
                        {expensesLoading ? (
                            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#33cbcc]" /></div>
                        ) : expenses.length === 0 ? (
                            <div className="flex items-center justify-center h-20 text-gray-400 text-sm">{t('projectDetail.tasks.noTasks')}</div>
                        ) : (
                            expenses.map(exp => (
                                <div key={exp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{exp.title}</p>
                                        <p className="text-xs text-gray-400">{exp.category} · {new Date(exp.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3 ml-2 shrink-0">
                                        <span className="text-sm font-semibold text-gray-800">{fmtCurrency(Number(exp.amount))}</span>
                                        <button
                                            onClick={() => deleteExpense.mutate(exp.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-all"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   DOCUMENTS TAB
   ═══════════════════════════════════════════════════════════ */

interface DocItem {
    id: number;
    name: string;
    type: string;
    size: string;
    date: string;
}

const DOC_COLORS: Record<string, string> = {
    Contract: '#33cbcc',
    SRS: '#3b82f6',
    Design: '#8b5cf6',
    Technical: '#f59e0b',
    Notes: '#6b7280',
    Brief: '#ec4899',
    Planning: '#22c55e',
};

const DocumentsView = ({ project: _project }: { project: ProjectData }) => {
    const { t } = useTranslation();
    const docs: DocItem[] = [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{t('projectDetail.documents.title')}</h2>
                <label className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors cursor-pointer shadow-lg shadow-[#33cbcc]/20">
                    <Upload size={16} />
                    {t('projectDetail.documents.upload')}
                    <input type="file" className="hidden" multiple />
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {docs.map((doc, i) => (
                    <motion.div
                        key={doc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 group hover:border-[#33cbcc]/30 transition-colors"
                    >
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${DOC_COLORS[doc.type] || '#6b7280'}15` }}
                        >
                            <FileText size={22} style={{ color: DOC_COLORS[doc.type] || '#6b7280' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{doc.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-400">{doc.size}</span>
                                <span className="text-xs text-gray-300">|</span>
                                <span className="text-xs text-gray-400">{doc.date}</span>
                                <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: `${DOC_COLORS[doc.type] || '#6b7280'}15`,
                                        color: DOC_COLORS[doc.type] || '#6b7280',
                                    }}
                                >
                                    {doc.type}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <Eye size={16} />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <Download size={16} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {docs.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('projectDetail.documents.empty')}</p>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   TIMELINE TAB
   ═══════════════════════════════════════════════════════════ */

type MilestoneStatus = 'completed' | 'in_progress' | 'upcoming';

const MILESTONE_STYLES: Record<MilestoneStatus, { ring: string; dot: string; line: string; badge: string; badgeText: string }> = {
    completed:   { ring: 'ring-blue-500',    dot: 'bg-blue-500',    line: 'bg-blue-500',    badge: 'bg-blue-50',    badgeText: 'text-blue-600' },
    in_progress: { ring: 'ring-[#33cbcc]',   dot: 'bg-[#33cbcc]',   line: 'bg-gray-200',    badge: 'bg-emerald-50', badgeText: 'text-emerald-600' },
    upcoming:    { ring: 'ring-gray-300',     dot: 'bg-gray-300',    line: 'bg-gray-200',    badge: 'bg-gray-50',    badgeText: 'text-gray-500' },
};

const MILESTONE_STATUS_I18N: Record<string, string> = {
    completed: 'completed',
    in_progress: 'inProgress',
    upcoming: 'upcoming',
};

const TimelineView = ({ project }: { project: ProjectData }) => {
    const { t } = useTranslation();

    // Derive milestones from tasks, sorted by start/due date
    const milestones = project.tasks
        .map(tk => {
            let msStatus: MilestoneStatus = 'upcoming';
            if (tk.state === 'COMPLETED' || tk.state === 'REVIEWED') msStatus = 'completed';
            else if (tk.state === 'IN_PROGRESS' || tk.state === 'BLOCKED' || tk.state === 'ASSIGNED') msStatus = 'in_progress';

            return {
                id: tk.id,
                title: tk.title,
                description: tk.assignedTo
                    ? `${tk.assignedTo.firstName} ${tk.assignedTo.lastName}`
                    : '',
                date: tk.dueDate || tk.endDate || tk.startDate || '',
                status: msStatus,
            };
        })
        .sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('projectDetail.timeline.title')}</h2>

            <div className="relative">
                {milestones.map((ms, i) => {
                    const style = MILESTONE_STYLES[ms.status];
                    const isLast = i === milestones.length - 1;

                    return (
                        <motion.div
                            key={ms.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-6 relative"
                        >
                            {/* Timeline line + dot */}
                            <div className="flex flex-col items-center">
                                <div className={`w-5 h-5 rounded-full ring-4 ${style.ring} ${style.dot} z-10 shrink-0 mt-1`} />
                                {!isLast && (
                                    <div className={`w-0.5 flex-1 ${style.line} min-h-16`} />
                                )}
                            </div>

                            {/* Content card */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 flex-1 mb-6 hover:border-[#33cbcc]/30 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{ms.title}</h4>
                                        {ms.description && (
                                            <p className="text-sm text-gray-500 mt-1">{ms.description}</p>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${style.badge} ${style.badgeText}`}>
                                        {t(`projectDetail.timeline.${MILESTONE_STATUS_I18N[ms.status]}`)}
                                    </span>
                                </div>
                                {ms.date && (
                                    <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                                        <Calendar size={12} />
                                        <span>{fmtDate(ms.date)}</span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {milestones.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Clock size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('projectDetail.timeline.empty')}</p>
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

const ProjectDetail = ({ project, activeTab, onEdit }: ProjectDetailProps) => {
    switch (activeTab) {
        case 'overview':
            return <OverviewView project={project} onEdit={onEdit} />;
        case 'tasks':
            return <TasksView project={project} />;
        case 'budget':
            return <BudgetView project={project} />;
        case 'documents':
            return <DocumentsView project={project} />;
        case 'timeline':
            return <TimelineView project={project} />;
        default:
            return <OverviewView project={project} onEdit={onEdit} />;
    }
};

export default ProjectDetail;
