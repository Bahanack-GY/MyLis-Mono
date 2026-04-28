import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search01Icon, Cancel01Icon, Calendar01Icon, Tick01Icon, Clock01Icon, Alert01Icon, Briefcase01Icon, Loading02Icon, Building01Icon } from 'hugeicons-react';
import { useMyProjects, useMyProjectDetail, useToggleMilestone } from '../../api/projects/hooks';
import type { Project as ApiProject } from '../../api/projects/types';
import { UserProjectsSkeleton } from '../../components/Skeleton';
import { useHasRole } from '../../hooks/useRoleAccess';

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

/* ─── Status helpers ─────────────────────────────────────── */

const STATUS_I18N: Record<ProjectStatus, string> = {
    active:    'statusActive',
    completed: 'statusCompleted',
    on_hold:   'statusOnHold',
    overdue:   'statusOverdue',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
    active:    '#33cbcc',
    completed: '#b0bac9',
    on_hold:   '#283852',
    overdue:   '#e05e5e',
};

const STATUS_TEXT: Record<ProjectStatus, string> = {
    active:    'text-[#33cbcc]',
    completed: 'text-[#b0bac9]',
    on_hold:   'text-[#283852]',
    overdue:   'text-[#e05e5e]',
};

/* ─── Helpers ────────────────────────────────────────────── */

const fmtDate = (d: string | undefined) => {
    if (!d) return '--';
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const LABEL = 'block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1';

const TASK_STATE_STYLES: Record<string, { dot: string; text: string }> = {
    COMPLETED:   { dot: 'bg-[#283852]', text: 'text-[#283852]' },
    REVIEWED:    { dot: 'bg-[#283852]', text: 'text-[#283852]' },
    IN_PROGRESS: { dot: 'bg-[#33cbcc]', text: 'text-[#33cbcc]' },
    TODO:        { dot: 'bg-[#b0bac9]', text: 'text-[#b0bac9]' },
    BLOCKED:     { dot: 'bg-[#e05e5e]', text: 'text-[#e05e5e]' },
};

/* ─── Panel ─────────────────────────────────────────────── */

const Panel = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
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

/* ─── Project Detail Panel ───────────────────────────────── */

const ProjectDetailPanel = ({
    project,
    onClose,
    isHOD,
}: {
    project: MappedProject;
    onClose: () => void;
    isHOD: boolean;
}) => {
    const { t } = useTranslation();
    const { data: detail, isLoading: detailLoading } = useMyProjectDetail(project.id);
    const toggleMs = useToggleMilestone(project.id);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    const taskProgress = project.tasksTotal > 0
        ? Math.round((project.tasksDone / project.tasksTotal) * 100)
        : 0;

    const detailTasks = detail?.tasks || [];
    const detailMembers = detail?.members || [];
    const detailMilestones = (detail?.milestones || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const milestonesDone = detailMilestones.filter(m => m.completedAt != null).length;

    return (
        <Panel onClose={onClose}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#e5e8ef] flex items-start justify-between shrink-0">
                <div className="flex-1 min-w-0 pr-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-1">
                        {t('projects.title')}
                    </p>
                    <h2 className="text-sm font-bold text-[#1c2b3a] leading-snug">{project.name}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: STATUS_DOT[project.status] }} />
                        <span className={`text-xs font-medium ${STATUS_TEXT[project.status]}`}>
                            {t(`projects.${STATUS_I18N[project.status]}`)}
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors shrink-0">
                    <Cancel01Icon size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">

                {/* Description */}
                {project.description && (
                    <div className="px-5 py-4 border-b border-[#e5e8ef]">
                        <p className={LABEL}>{t('projects.description')}</p>
                        <p className="text-sm text-[#8892a4] leading-relaxed">{project.description}</p>
                    </div>
                )}

                {/* Info mosaic */}
                <div className="border-b border-[#e5e8ef]">
                    <div className="grid grid-cols-2 gap-px bg-[#e5e8ef]">
                        <div className="bg-white px-4 py-3">
                            <p className={LABEL}>{t('projects.startDate')}</p>
                            <p className="text-sm font-semibold text-[#1c2b3a]">{fmtDate(project.startDate)}</p>
                        </div>
                        <div className="bg-white px-4 py-3">
                            <p className={LABEL}>{t('projects.endDate')}</p>
                            <p className="text-sm font-semibold text-[#1c2b3a]">{fmtDate(project.endDate)}</p>
                        </div>
                        {project.department && (
                            <div className="bg-white px-4 py-3 col-span-2">
                                <p className={LABEL}>{t('projects.department')}</p>
                                <p className="text-sm font-semibold text-[#1c2b3a]">{project.department}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress */}
                <div className="px-5 py-4 border-b border-[#e5e8ef] space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className={LABEL}>{t('projects.progress')}</span>
                            <span className="text-xs font-bold text-[#1c2b3a]">{project.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#e5e8ef] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${project.progress}%` }}
                                transition={{ duration: 0.8 }}
                                className="h-full"
                                style={{ backgroundColor: project.status === 'completed' ? '#b0bac9' : '#33cbcc' }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className={LABEL}>{t('projects.tasks')}</span>
                            <span className="text-xs text-[#8892a4]">
                                {project.tasksDone}/{project.tasksTotal} ({taskProgress}%)
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${taskProgress}%` }}
                                transition={{ delay: 0.2, duration: 0.8 }}
                                className="h-full bg-[#283852]"
                            />
                        </div>
                    </div>
                </div>

                {detailLoading ? (
                    <div className="flex justify-center py-8">
                        <Loading02Icon className="w-5 h-5 animate-spin text-[#33cbcc]" />
                    </div>
                ) : (
                    <>
                        {/* Milestones */}
                        {detailMilestones.length > 0 && (
                            <div className="border-b border-[#e5e8ef]">
                                <div className="px-5 py-3 flex items-center justify-between border-b border-[#e5e8ef]">
                                    <p className={LABEL}>{t('projectSidebar.milestones')}</p>
                                    <span className="text-[10px] font-semibold text-[#8892a4]">
                                        {milestonesDone}/{detailMilestones.length}
                                    </span>
                                </div>
                                <div className="px-5 pt-2 pb-3">
                                    <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                                        <div
                                            className="h-full bg-[#33cbcc] transition-all duration-700"
                                            style={{ width: `${detailMilestones.length > 0 ? Math.round((milestonesDone / detailMilestones.length) * 100) : 0}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="divide-y divide-[#e5e8ef] max-h-52 overflow-y-auto">
                                    {detailMilestones.map(ms => {
                                        const isDone = ms.completedAt != null;
                                        const isToggling = toggleMs.isPending && (toggleMs.variables as string) === ms.id;
                                        return (
                                            <div key={ms.id} className="flex items-start gap-3 px-5 py-3">
                                                {isHOD ? (
                                                    <button
                                                        onClick={() => toggleMs.mutate(ms.id)}
                                                        disabled={isToggling}
                                                        className="shrink-0 mt-0.5 transition-transform active:scale-90"
                                                    >
                                                        {isToggling
                                                            ? <Loading02Icon size={15} className="animate-spin text-[#33cbcc]" />
                                                            : isDone
                                                                ? <Tick01Icon size={15} className="text-[#33cbcc]" />
                                                                : <Tick01Icon size={15} className="text-[#b0bac9] hover:text-[#33cbcc] transition-colors" />
                                                        }
                                                    </button>
                                                ) : (
                                                    <span className={`w-2 h-2 shrink-0 mt-1.5 ${isDone ? 'bg-[#33cbcc]' : 'bg-[#b0bac9]'}`} />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isDone ? 'text-[#b0bac9] line-through' : 'text-[#1c2b3a]'}`}>
                                                        {ms.title}
                                                    </p>
                                                    {isDone && ms.completedByName && (
                                                        <p className="text-[11px] text-[#33cbcc] mt-0.5">
                                                            {t('projectDetail.milestones.completedBy', 'By')} {ms.completedByName}
                                                        </p>
                                                    )}
                                                    {ms.dueDate && !isDone && (
                                                        <p className="text-[11px] text-[#b0bac9] mt-0.5">{fmtDate(ms.dueDate)}</p>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-semibold shrink-0 ${isDone ? 'text-[#33cbcc]' : 'text-[#b0bac9]'}`}>
                                                    {isDone ? t('projectDetail.milestones.completed') : t('projectDetail.milestones.upcoming')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Members */}
                        {detailMembers.length > 0 && (
                            <div className="border-b border-[#e5e8ef]">
                                <div className="px-5 py-3 border-b border-[#e5e8ef]">
                                    <p className={LABEL}>{t('projects.members', 'Members')}</p>
                                </div>
                                <div className="divide-y divide-[#e5e8ef]">
                                    {detailMembers.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 px-5 py-2.5">
                                            {m.avatarUrl ? (
                                                <img src={m.avatarUrl} alt="" className="w-7 h-7 object-cover border border-[#e5e8ef] shrink-0" />
                                            ) : (
                                                <div className="w-7 h-7 bg-[#283852] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                                    {m.firstName?.[0]}{m.lastName?.[0]}
                                                </div>
                                            )}
                                            <span className="text-sm text-[#1c2b3a] truncate">{m.firstName} {m.lastName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tasks */}
                        {detailTasks.length > 0 && (
                            <div>
                                <div className="px-5 py-3 border-b border-[#e5e8ef]">
                                    <p className={LABEL}>{t('projects.taskList', 'Task list')}</p>
                                </div>
                                <div className="divide-y divide-[#e5e8ef] max-h-60 overflow-y-auto">
                                    {detailTasks.map(task => {
                                        const style = TASK_STATE_STYLES[task.state] || TASK_STATE_STYLES.TODO;
                                        return (
                                            <div key={task.id} className="flex items-center gap-3 px-5 py-2.5">
                                                <span className={`w-1.5 h-1.5 shrink-0 ${style.dot}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#1c2b3a] truncate">{task.title}</p>
                                                    {task.assignedTo && (
                                                        <p className="text-[11px] text-[#b0bac9]">
                                                            {task.assignedTo.firstName} {task.assignedTo.lastName}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className={`text-[10px] font-semibold uppercase shrink-0 ${style.text}`}>
                                                    {task.state.replace('_', ' ')}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-[#e5e8ef] px-5 py-3 shrink-0">
                <button
                    onClick={onClose}
                    className="w-full py-2.5 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
                >
                    {t('projects.close')}
                </button>
            </div>
        </Panel>
    );
};

/* ═══════════════════════════════════════════════════════════ */
/*  Main Component                                           */
/* ═══════════════════════════════════════════════════════════ */

const Projects = () => {
    const { t } = useTranslation();
    const isHOD = useHasRole(['HEAD_OF_DEPARTMENT']);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
    const [selectedProject, setSelectedProject] = useState<MappedProject | null>(null);

    const { data: apiProjects, isLoading } = useMyProjects();

    const projects: MappedProject[] = useMemo(
        () =>
            (apiProjects || []).map((p: ApiProject) => {
                const tasks = p.tasks || [];
                const tasksDone = tasks.filter(
                    (t) => t.state === 'COMPLETED' || t.state === 'REVIEWED',
                ).length;
                const milestones = p.milestones || [];
                const milestonesDone = milestones.filter(m => m.completedAt != null).length;
                const progress = milestones.length > 0
                    ? Math.round((milestonesDone / milestones.length) * 100)
                    : 0;

                let status: ProjectStatus = 'active';
                if (milestones.length > 0 && milestones.every(m => m.completedAt != null)) {
                    status = 'completed';
                } else if (p.endDate && new Date(p.endDate) < new Date()) {
                    status = 'overdue';
                }

                return {
                    id: p.id,
                    name: p.name,
                    description: p.description || '',
                    status,
                    progress,
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

    if (isLoading) return <UserProjectsSkeleton />;

    const filteredProjects = projects.filter((p) => {
        const matchesSearch =
            !searchQuery ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.department.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = [
        { label: t('projects.stats.total'),     value: projects.length,                                        icon: Briefcase01Icon, color: '#283852' },
        { label: t('projects.stats.active'),    value: projects.filter(p => p.status === 'active').length,     icon: Clock01Icon,     color: '#33cbcc' },
        { label: t('projects.stats.completed'), value: projects.filter(p => p.status === 'completed').length,  icon: Tick01Icon,      color: '#283852' },
        { label: t('projects.stats.overdue'),   value: projects.filter(p => p.status === 'overdue').length,    icon: Alert01Icon,     color: '#e05e5e' },
    ];

    const statusFilters: { key: ProjectStatus | 'all'; label: string }[] = [
        { key: 'all',       label: t('projects.filterAll') },
        { key: 'active',    label: t('projects.statusActive') },
        { key: 'completed', label: t('projects.statusCompleted') },
        { key: 'on_hold',   label: t('projects.statusOnHold') },
        { key: 'overdue',   label: t('projects.statusOverdue') },
    ];

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Page header */}
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-1">
                    {t('projects.subtitle')}
                </p>
                <h1 className="text-2xl font-bold text-[#1c2b3a]">{t('projects.title')}</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="border border-gray-100 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-[#33cbcc]/50"
                    >
                        <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">
                                {stat.label}
                            </h3>
                        </div>
                        <div className="p-5 bg-white relative overflow-hidden">
                            <h2 className="text-4xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                <stat.icon size={110} strokeWidth={1.2} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search + filters */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white border border-[#e5e8ef] px-4 py-3 focus-within:border-[#33cbcc] transition-colors">
                    <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                    <input
                        type="text"
                        placeholder={t('projects.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
                            <Cancel01Icon size={16} />
                        </button>
                    )}
                </div>

                <div className="flex gap-2 flex-wrap">
                    {statusFilters.map((sf) => (
                        <button
                            key={sf.key}
                            onClick={() => setFilterStatus(sf.key)}
                            className={`px-4 py-2 text-xs font-semibold border transition-colors ${
                                filterStatus === sf.key
                                    ? 'bg-[#283852] text-white border-[#283852]'
                                    : 'bg-white text-[#8892a4] border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852]'
                            }`}
                        >
                            {sf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Project cards */}
            {filteredProjects.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-[#e5e8ef] p-12 text-center"
                >
                    <Briefcase01Icon size={40} className="mx-auto text-[#b0bac9] mb-4" />
                    <p className="text-[#8892a4] font-medium">{t('projects.noResults')}</p>
                    <p className="text-[#b0bac9] text-sm mt-1">{t('projects.noResultsHint')}</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {filteredProjects.map((project, index) => (
                        <motion.div
                            key={project.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                            onClick={() => setSelectedProject(project)}
                            className="bg-white p-5 border border-[#e5e8ef] hover:border-[#33cbcc]/40 transition-colors cursor-pointer group"
                        >
                            {/* Status accent line */}
                            <div className="h-0.5 w-full mb-4" style={{ backgroundColor: STATUS_DOT[project.status] }} />

                            {/* Name + status */}
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h3 className="text-sm font-bold text-[#1c2b3a] truncate group-hover:text-[#283852] transition-colors">
                                    {project.name}
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: STATUS_DOT[project.status] }} />
                                    <span className={`text-xs font-medium whitespace-nowrap ${STATUS_TEXT[project.status]}`}>
                                        {t(`projects.${STATUS_I18N[project.status]}`)}
                                    </span>
                                </div>
                            </div>

                            {project.description && (
                                <p className="text-xs text-[#8892a4] line-clamp-2 mb-4 leading-relaxed">
                                    {project.description}
                                </p>
                            )}

                            {/* Progress */}
                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-1.5 text-xs">
                                    <span className="text-[#b0bac9]">{t('projects.progress')}</span>
                                    <span className="font-bold text-[#1c2b3a]">{project.progress}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${project.progress}%` }}
                                        transition={{ delay: 0.2 + index * 0.06, duration: 0.8 }}
                                        className="h-full"
                                        style={{ backgroundColor: project.status === 'completed' ? '#b0bac9' : '#33cbcc' }}
                                    />
                                </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-3 border-t border-[#e5e8ef] text-[11px] text-[#b0bac9]">
                                {project.department && (
                                    <div className="flex items-center gap-1">
                                        <Building01Icon size={11} />
                                        <span className="font-medium">{project.department}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1">
                                    <Tick01Icon size={11} />
                                    <span>{project.tasksDone}/{project.tasksTotal}</span>
                                </div>
                                {project.endDate && (
                                    <div className="flex items-center gap-1">
                                        <Calendar01Icon size={11} />
                                        <span>{fmtDate(project.endDate)}</span>
                                    </div>
                                )}

                                {project.members.length > 0 && (
                                    <div className="flex items-center gap-0.5 ml-auto">
                                        {project.members.slice(0, 3).map((m) => (
                                            m.avatarUrl ? (
                                                <img
                                                    key={m.id}
                                                    src={m.avatarUrl}
                                                    alt=""
                                                    className="w-5 h-5 object-cover border border-white -ml-1 first:ml-0"
                                                />
                                            ) : (
                                                <div
                                                    key={m.id}
                                                    className="w-5 h-5 bg-[#283852] flex items-center justify-center text-white text-[8px] font-bold border border-white -ml-1 first:ml-0"
                                                >
                                                    {m.firstName?.[0]}{m.lastName?.[0]}
                                                </div>
                                            )
                                        ))}
                                        {project.members.length > 3 && (
                                            <span className="text-[10px] text-[#b0bac9] ml-1">+{project.members.length - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Detail panel */}
            <AnimatePresence>
                {selectedProject && (
                    <ProjectDetailPanel
                        project={selectedProject}
                        onClose={() => setSelectedProject(null)}
                        isHOD={isHOD}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Projects;
