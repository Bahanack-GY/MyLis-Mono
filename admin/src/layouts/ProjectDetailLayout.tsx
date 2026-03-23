import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Loader2, Pencil, X, Briefcase, AlignLeft, Building, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ProjectDetailSidebar, { type ProjectTab } from '../components/ProjectDetailSidebar';
import Header from '../components/Header';
import ProjectDetail from '../pages/ProjectDetail';
import { useProject, useUpdateProject } from '../api/projects/hooks';
import { useDepartments } from '../api/departments/hooks';
import { useClients } from '../api/clients/hooks';
import type { Project } from '../api/projects/types';

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'overdue';

export interface ProjectData {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    progress: number;
    startDate: string;
    endDate: string;
    department: string;
    client: string;
    tasksTotal: number;
    tasksDone: number;
    budget: number;
    revenue: number;
    members: { id: string; firstName: string; lastName: string; avatarUrl: string }[];
    tasks: {
        id: string;
        title: string;
        state: string;
        difficulty?: string;
        dueDate?: string;
        startDate?: string;
        endDate?: string;
        description?: string;
        assignedTo?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
    }[];
}

function deriveStatus(endDate?: string, tasks?: { state: string }[]): ProjectStatus {
    const t = tasks || [];
    const allDone = t.length > 0 && t.every(tk => tk.state === 'COMPLETED' || tk.state === 'REVIEWED');
    if (allDone && t.length > 0) return 'completed';
    if (endDate && new Date(endDate) < new Date() && !allDone) return 'overdue';
    return 'active';
}

/* ─── Edit Project Modal ─────────────────────────────────── */

const EditProjectModal = ({ project, onClose }: { project: Project; onClose: () => void }) => {
    const { t } = useTranslation();
    const updateProject = useUpdateProject();
    const { data: apiDepartments } = useDepartments();
    const { data: allClients } = useClients();

    const [form, setForm] = useState({
        name: project.name || '',
        description: project.description || '',
        departmentId: project.departmentId || '',
        clientId: project.clientId || '',
        cost: project.budget ? String(project.budget) : '',
        revenue: project.revenue ? String(project.revenue) : '',
        startDate: project.startDate ? project.startDate.slice(0, 10) : '',
        dueDate: project.endDate ? project.endDate.slice(0, 10) : '',
    });

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
    }, [onClose]);

    const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const isValid = form.name.trim().length > 0;

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
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                            <Pencil size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('projects.editTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Project name */}
                    <div>
                        <label className={labelCls}><Briefcase size={12} />{t('projects.formName')}</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => update('name', e.target.value)}
                            placeholder={t('projects.formNamePlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}><AlignLeft size={12} />{t('projects.description')}</label>
                        <textarea
                            value={form.description}
                            onChange={e => update('description', e.target.value)}
                            placeholder={t('projects.formDescriptionPlaceholder')}
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className={labelCls}><Building size={12} />{t('projects.formDepartment')}</label>
                        <select value={form.departmentId} onChange={e => update('departmentId', e.target.value)} className={selectCls}>
                            <option value="">{t('projects.formDepartmentPlaceholder')}</option>
                            {(apiDepartments || []).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Client */}
                    <div>
                        <label className={labelCls}><Users size={12} />{t('projects.formClient')}</label>
                        <select value={form.clientId} onChange={e => update('clientId', e.target.value)} className={selectCls}>
                            <option value="">{t('projects.formClientPlaceholder')}</option>
                            {(allClients || []).map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Cost + Revenue */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}><DollarSign size={12} />{t('projects.formCost')}</label>
                            <input
                                type="text"
                                value={form.cost}
                                onChange={e => update('cost', e.target.value)}
                                placeholder="0 FCFA"
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}><TrendingUp size={12} />{t('projects.formRevenue')}</label>
                            <input
                                type="text"
                                value={form.revenue}
                                onChange={e => update('revenue', e.target.value)}
                                placeholder="0 FCFA"
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Start date + Due date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}><Calendar size={12} />{t('projects.startDate')}</label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => update('startDate', e.target.value)}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}><Calendar size={12} />{t('projects.formDueDate')}</label>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={e => update('dueDate', e.target.value)}
                                className={inputCls}
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
                        {t('projects.formCancel')}
                    </button>
                    <button
                        onClick={() => {
                            if (isValid) {
                                updateProject.mutate({
                                    id: project.id,
                                    dto: {
                                        name: form.name,
                                        description: form.description || undefined,
                                        departmentId: form.departmentId || undefined,
                                        clientId: form.clientId || undefined,
                                        budget: form.cost ? parseFloat(form.cost) : undefined,
                                        revenue: form.revenue ? parseFloat(form.revenue) : undefined,
                                        startDate: form.startDate || undefined,
                                        endDate: form.dueDate || undefined,
                                    },
                                }, { onSuccess: () => onClose() });
                            }
                        }}
                        disabled={!isValid || updateProject.isPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
                            isValid ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {updateProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                        {t('projects.formSave')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Layout ─────────────────────────────────────────────── */

const ProjectDetailLayout = () => {
    const { id } = useParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
    const [showEdit, setShowEdit] = useState(false);

    const { data: apiProject, isLoading } = useProject(id || '');

    if (isLoading) {
        return (
            <div className="flex h-screen bg-blue-100 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    if (!apiProject) {
        return <Navigate to="/projects" replace />;
    }

    const tasks = apiProject.tasks || [];
    const tasksDone = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;

    const project: ProjectData = {
        id: apiProject.id,
        name: apiProject.name,
        description: apiProject.description || '',
        status: deriveStatus(apiProject.endDate, tasks),
        progress: tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0,
        startDate: apiProject.startDate || '',
        endDate: apiProject.endDate || '',
        department: apiProject.department?.name || '',
        client: apiProject.client?.name || '',
        tasksTotal: tasks.length,
        tasksDone,
        budget: apiProject.budget || 0,
        revenue: apiProject.revenue || 0,
        members: apiProject.members || [],
        tasks,
    };

    return (
        <div className="flex h-screen bg-blue-100 overflow-hidden">
            <ProjectDetailSidebar
                project={project}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
                onEdit={() => setShowEdit(true)}
            />
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50/50">
                    <div className="container mx-auto px-6 py-8">
<ProjectDetail project={project} activeTab={activeTab} onEdit={() => setShowEdit(true)} />
                    </div>
                </main>
            </div>

            <AnimatePresence>
                {showEdit && (
                    <EditProjectModal project={apiProject} onClose={() => setShowEdit(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectDetailLayout;
