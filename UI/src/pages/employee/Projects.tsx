import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    Briefcase,
    Loader2,
    Building,
} from 'lucide-react';
import { useMyProjects, useMyProjectDetail } from '../../api/projects/hooks';
import type { Project as ApiProject } from '../../api/projects/types';
import { UserProjectsSkeleton } from '../../components/Skeleton';

/* ─── Types ─────────────────────────────────────────────── */

type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'overdue';

interface MappedProject {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    progress: number;
    startDate: string;
    endDate: string;
    department: string;
    tasksTotal: number;
    tasksDone: number;
    members: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
}

/* ─── Status i18n mapping ────────────────────────────────── */

const STATUS_I18N: Record<ProjectStatus, string> = {
    active: 'statusActive',
    completed: 'statusCompleted',
    on_hold: 'statusOnHold',
    overdue: 'statusOverdue',
};

/* ─── Helpers ────────────────────────────────────────────── */

const fmtDate = (d: string | undefined) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

/* ─── Project Detail Modal ───────────────────────────────── */

const TASK_STATE_STYLES: Record<string, { dot: string; text: string }> = {
    COMPLETED: { dot: 'bg-green-400', text: 'text-green-600' },
    REVIEWED: { dot: 'bg-green-400', text: 'text-green-600' },
    IN_PROGRESS: { dot: 'bg-[#33cbcc]', text: 'text-[#33cbcc]' },
    TODO: { dot: 'bg-gray-300', text: 'text-gray-500' },
    BLOCKED: { dot: 'bg-red-400', text: 'text-red-500' },
};

const ProjectDetailModal = ({
    project,
    onClose,
}: {
    project: MappedProject;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const { data: detail, isLoading: detailLoading } = useMyProjectDetail(project.id);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const taskProgress =
        project.tasksTotal > 0
            ? Math.round((project.tasksDone / project.tasksTotal) * 100)
            : 0;

    const getStatusDot = (status: ProjectStatus) => {
        switch (status) {
            case 'active':
                return 'bg-[#33cbcc]';
            case 'completed':
                return 'bg-gray-400';
            case 'on_hold':
                return 'bg-[#283852]';
            case 'overdue':
                return 'bg-[#283852]';
        }
    };

    const getStatusText = (status: ProjectStatus) => {
        switch (status) {
            case 'active':
                return 'text-[#33cbcc]';
            case 'completed':
                return 'text-gray-500';
            case 'on_hold':
                return 'text-[#283852]';
            case 'overdue':
                return 'text-[#283852] font-semibold';
        }
    };

    const detailTasks = detail?.tasks || [];
    const detailMembers = detail?.members || [];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
            >
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-[#283852] flex items-center justify-center shrink-0">
                                    <Briefcase size={20} className="text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-xl font-bold text-gray-800 truncate">
                                        {project.name}
                                    </h2>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span
                                            className={`w-2 h-2 rounded-full ${getStatusDot(project.status)}`}
                                        />
                                        <span
                                            className={`text-xs font-medium ${getStatusText(project.status)}`}
                                        >
                                            {t(`projects.${STATUS_I18N[project.status]}`)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors shrink-0"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
                    {/* Description */}
                    {project.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {t('projects.description')}
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                {project.description}
                            </p>
                        </div>
                    )}

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">
                                {t('projects.startDate')}
                            </p>
                            <p className="font-semibold text-gray-800 text-sm">
                                {fmtDate(project.startDate)}
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs text-gray-400 mb-1">
                                {t('projects.endDate')}
                            </p>
                            <p className="font-semibold text-gray-800 text-sm">
                                {fmtDate(project.endDate)}
                            </p>
                        </div>
                        {project.department && (
                            <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                                <p className="text-xs text-gray-400 mb-1">
                                    {t('projects.department')}
                                </p>
                                <p className="font-semibold text-gray-800 text-sm">
                                    {project.department}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Overall Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-500">
                                {t('projects.progress')}
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                                {project.progress}%
                            </span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 1 }}
                                className="h-full rounded-full"
                                style={{
                                    backgroundColor:
                                        project.status === 'completed'
                                            ? '#9ca3af'
                                            : '#33cbcc',
                                }}
                            />
                        </div>
                    </div>

                    {/* Tasks Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-500">
                                {t('projects.tasks')}
                            </span>
                            <span className="text-sm text-gray-400">
                                {project.tasksDone}/{project.tasksTotal} (
                                {taskProgress}%)
                            </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${taskProgress}%` }}
                                transition={{ delay: 0.3, duration: 1 }}
                                className="h-full rounded-full bg-[#283852]"
                            />
                        </div>
                    </div>

                    {/* Members */}
                    {detailLoading ? (
                        <div className="flex justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-[#33cbcc]" />
                        </div>
                    ) : (
                        <>
                            {detailMembers.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                        {t('projects.members', 'Members')}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {detailMembers.map((m) => (
                                            <div
                                                key={m.id}
                                                className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2"
                                            >
                                                {m.avatarUrl ? (
                                                    <img
                                                        src={m.avatarUrl}
                                                        alt=""
                                                        className="w-6 h-6 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-[#283852] flex items-center justify-center text-white text-[10px] font-bold">
                                                        {m.firstName?.[0]}{m.lastName?.[0]}
                                                    </div>
                                                )}
                                                <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                                                    {m.firstName} {m.lastName}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Task list */}
                            {detailTasks.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                        {t('projects.taskList', 'Task list')}
                                    </p>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {detailTasks.map((task) => {
                                            const style = TASK_STATE_STYLES[task.state] || TASK_STATE_STYLES.TODO;
                                            return (
                                                <div
                                                    key={task.id}
                                                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3"
                                                >
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate">
                                                            {task.title}
                                                        </p>
                                                        {task.assignedTo && (
                                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                                {task.assignedTo.firstName} {task.assignedTo.lastName}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold uppercase ${style.text}`}>
                                                        {task.state.replace('_', ' ')}
                                                    </span>
                                                    {task.dueDate && (
                                                        <span className="text-[10px] text-gray-400 shrink-0">
                                                            {fmtDate(task.dueDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('projects.close')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

const Projects = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>(
        'all',
    );
    const [selectedProject, setSelectedProject] =
        useState<MappedProject | null>(null);

    /* ── API data ── */
    const { data: apiProjects, isLoading } = useMyProjects();

    /* ── Map API projects ── */
    const projects: MappedProject[] = useMemo(
        () =>
            (apiProjects || []).map((p: ApiProject) => {
                const tasks = p.tasks || [];
                const tasksDone = tasks.filter(
                    (t) =>
                        t.state === 'COMPLETED' || t.state === 'REVIEWED',
                ).length;
                const allDone = tasks.length > 0 && tasksDone === tasks.length;

                let status: ProjectStatus = 'active';
                if (allDone && tasks.length > 0) status = 'completed';
                else if (
                    p.endDate &&
                    new Date(p.endDate) < new Date() &&
                    !allDone
                )
                    status = 'overdue';

                return {
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    status,
                    progress:
                        tasks.length > 0
                            ? Math.round((tasksDone / tasks.length) * 100)
                            : 0,
                    startDate: p.startDate || '',
                    endDate: p.endDate || '',
                    department: p.department?.name || '',
                    tasksTotal: tasks.length,
                    tasksDone,
                    members: p.members || [],
                };
            }),
        [apiProjects],
    );

    /* ── Loading state ── */
    if (isLoading) {
        return <UserProjectsSkeleton />;
    }

    /* ── Filtering ── */
    const filteredProjects = projects.filter((p) => {
        const matchesSearch =
            !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    /* ── Stats ── */
    const stats = [
        {
            label: t('projects.stats.total'),
            value: projects.length,
            icon: Briefcase,
            color: '#283852',
        },
        {
            label: t('projects.stats.active'),
            value: projects.filter((p) => p.status === 'active').length,
            icon: Clock,
            color: '#33cbcc',
        },
        {
            label: t('projects.stats.completed'),
            value: projects.filter((p) => p.status === 'completed').length,
            icon: CheckCircle,
            color: '#283852',
        },
        {
            label: t('projects.stats.overdue'),
            value: projects.filter((p) => p.status === 'overdue').length,
            icon: AlertCircle,
            color: '#33cbcc',
        },
    ];

    /* ── Status filters ── */
    const statusFilters: { key: ProjectStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('projects.filterAll') },
        { key: 'active', label: t('projects.statusActive') },
        { key: 'completed', label: t('projects.statusCompleted') },
        { key: 'on_hold', label: t('projects.statusOnHold') },
        { key: 'overdue', label: t('projects.statusOverdue') },
    ];

    /* ── Status display helpers ── */
    const getStatusDot = (status: ProjectStatus) => {
        switch (status) {
            case 'active':
                return 'bg-[#33cbcc]';
            case 'completed':
                return 'bg-gray-400';
            case 'on_hold':
                return 'bg-[#283852]';
            case 'overdue':
                return 'bg-[#283852]';
        }
    };

    const getStatusText = (status: ProjectStatus) => {
        switch (status) {
            case 'active':
                return 'text-[#33cbcc]';
            case 'completed':
                return 'text-gray-500';
            case 'on_hold':
                return 'text-[#283852]';
            case 'overdue':
                return 'text-[#283852] font-semibold';
        }
    };

    /* ════════════════════════ JSX ════════════════════════ */

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ═══ Page header ═══ */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    {t('projects.title')}
                </h1>
                <p className="text-gray-500 mt-1">{t('projects.subtitle')}</p>
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
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">
                                {stat.label}
                            </h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">
                                {stat.value}
                            </h2>
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
                {/* Search bar */}
                <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('projects.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mr-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Status filter pills */}
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
            </div>

            {/* ═══ Project cards ═══ */}
            {filteredProjects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
                >
                    <Briefcase
                        size={48}
                        className="mx-auto text-gray-300 mb-4"
                    />
                    <p className="text-gray-400 font-medium">
                        {t('projects.noResults')}
                    </p>
                    <p className="text-gray-300 text-sm mt-1">{t('projects.noResultsHint')}</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {filteredProjects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08 }}
                            onClick={() => setSelectedProject(project)}
                            className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 hover:border-[#33cbcc]/30 transition-all cursor-pointer group"
                        >
                            {/* Header: name + status */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-base font-bold text-gray-800 truncate group-hover:text-[#283852] transition-colors">
                                    {project.name}
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                        className={`w-2 h-2 rounded-full ${getStatusDot(project.status)}`}
                                    />
                                    <span
                                        className={`text-xs font-medium whitespace-nowrap ${getStatusText(project.status)}`}
                                    >
                                        {t(
                                            `projects.${STATUS_I18N[project.status]}`,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            {project.description && (
                                <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                                    {project.description}
                                </p>
                            )}

                            {/* Progress bar */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1.5 text-xs">
                                    <span className="text-gray-400">
                                        {t('projects.progress')}
                                    </span>
                                    <span className="font-bold text-gray-700">
                                        {project.progress}%
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${project.progress}%`,
                                        }}
                                        transition={{
                                            delay: 0.3 + index * 0.08,
                                            duration: 1,
                                        }}
                                        className="h-full rounded-full"
                                        style={{
                                            backgroundColor:
                                                project.status === 'completed'
                                                    ? '#9ca3af'
                                                    : '#33cbcc',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
                                {/* Department */}
                                {project.department && (
                                    <div className="flex items-center gap-1">
                                        <Building size={12} />
                                        <span className="font-medium">
                                            {project.department}
                                        </span>
                                    </div>
                                )}

                                {/* Tasks count */}
                                <div className="flex items-center gap-1">
                                    <CheckCircle size={12} />
                                    <span>
                                        {project.tasksDone}/{project.tasksTotal}
                                    </span>
                                </div>

                                {/* End date */}
                                {project.endDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        <span>{fmtDate(project.endDate)}</span>
                                    </div>
                                )}

                                {/* Members */}
                                {project.members.length > 0 && (
                                    <div className="flex items-center gap-0.5 ml-auto">
                                        {project.members.slice(0, 3).map((m) => (
                                            m.avatarUrl ? (
                                                <img
                                                    key={m.id}
                                                    src={m.avatarUrl}
                                                    alt=""
                                                    className="w-5 h-5 rounded-full object-cover border border-white -ml-1 first:ml-0"
                                                />
                                            ) : (
                                                <div
                                                    key={m.id}
                                                    className="w-5 h-5 rounded-full bg-[#283852] flex items-center justify-center text-white text-[8px] font-bold border border-white -ml-1 first:ml-0"
                                                >
                                                    {m.firstName?.[0]}{m.lastName?.[0]}
                                                </div>
                                            )
                                        ))}
                                        {project.members.length > 3 && (
                                            <span className="text-[10px] text-gray-400 ml-1">
                                                +{project.members.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ═══ Project Detail Modal ═══ */}
            <AnimatePresence>
                {selectedProject && (
                    <ProjectDetailModal
                        project={selectedProject}
                        onClose={() => setSelectedProject(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Projects;
