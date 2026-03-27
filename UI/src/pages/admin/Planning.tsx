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
    X,
    Loader2,
    AlertCircle,
    User,
    Paperclip,
    FileText,
    Target,
    RotateCcw,
    Flag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
    useAllWeekTasks,
    useWeekTasksByEmployee,
    useCreateTask,
    useWeeklyCheckForEmployee,
    useUploadTaskAttachment,
} from '../../api/tasks/hooks';
import { useEmployees } from '../../api/employees/hooks';
import { useProjects } from '../../api/projects/hooks';
import { useTaskNatures } from '../../api/task-natures/hooks';
import { leadsApi } from '../../api/commercial/api';
import type { Task, TaskDifficulty, CreateTaskDto } from '../../api/tasks/types';
import { useDepartmentScope } from '../../contexts/AuthContext';

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

/* ─── Add Task Modal ─────────────────────────────────────── */

const DIFFICULTY_OPTIONS: TaskDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];

const AddTaskModal = ({
    onClose,
    prefilledDate,
    prefilledEmployeeId,
    employees,
}: {
    onClose: () => void;
    prefilledDate?: string;
    prefilledEmployeeId?: string;
    employees: any[];
}) => {
    const { t } = useTranslation();
    const createTask = useCreateTask();
    const uploadAttachment = useUploadTaskAttachment();
    const deptScope = useDepartmentScope();
    const { data: projects } = useProjects(deptScope);
    const { data: taskNatures } = useTaskNatures();

    const [form, setForm] = useState({
        title: '',
        description: '',
        difficulty: 'MEDIUM' as TaskDifficulty,
        projectId: '',
        natureId: '',
        leadId: '',
        assignedToId: prefilledEmployeeId || '',
        startDate: prefilledDate || '',
        endDate: prefilledDate || '',
        startTime: '',
        urgent: false,
        important: false,
    });
    const [files, setFiles] = useState<File[]>([]);

    const selectedEmp = employees.find(e => e.id === form.assignedToId);
    const { data: compliance, isLoading: complianceLoading } = useWeeklyCheckForEmployee(
        form.assignedToId || null
    );
    const isNonCompliant = compliance && !compliance.canCreate;

    const selectedEmpRole = selectedEmp?.position?.name || selectedEmp?.position?.title || '';
    const isSelectedCommercial = selectedEmpRole.toLowerCase().includes('commercial');
    const { data: leadsData } = useQuery({
        queryKey: ['leads', 'for-planning', form.assignedToId],
        queryFn: () => leadsApi.getAll({ assignedToId: form.assignedToId }),
        enabled: isSelectedCommercial && !!form.assignedToId,
    });
    const leads = (leadsData as any)?.data || [];

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

    const isValid = form.title.trim().length > 0 && form.assignedToId;

    const difficultyColors: Record<TaskDifficulty, string> = {
        EASY: 'border-[#33cbcc] bg-[#33cbcc]/10 text-[#33cbcc]',
        MEDIUM: 'border-[#283852] bg-[#283852]/10 text-[#283852]',
        HARD: 'border-red-400 bg-red-50 text-red-500',
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Plus size={16} className="sm:w-[18px] sm:h-[18px] text-[#33cbcc]" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-800">
                            {t('tasksPage.addTask')}
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
                    {/* Employee selector */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <User size={10} />
                            {t('tasksPage.assignee')}
                        </label>
                        <div className="relative">
                            {selectedEmp?.photoUrl && (
                                <img
                                    src={selectedEmp.photoUrl}
                                    alt=""
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-gray-200 pointer-events-none object-cover"
                                />
                            )}
                            <select
                                value={form.assignedToId}
                                onChange={e => update('assignedToId', e.target.value)}
                                className={`w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer ${
                                    selectedEmp?.photoUrl ? 'pl-11' : ''
                                }`}
                            >
                                <option value="">{t('tasksPage.selectEmployee')}</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} — {emp.position?.name || ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Weekly compliance warning */}
                    {complianceLoading && form.assignedToId && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                            <Loader2 size={12} className="animate-spin" />
                            {t('tasks.weeklyCompliance.checking')}
                        </div>
                    )}
                    {isNonCompliant && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className="text-red-500 shrink-0" />
                                <p className="text-sm font-semibold text-red-700">
                                    {t('tasks.weeklyCompliance.adminWarningTitle')}
                                </p>
                            </div>
                            <p className="text-xs text-red-600">
                                {t('tasks.weeklyCompliance.adminWarningMessage', {
                                    name: `${selectedEmp?.firstName} ${selectedEmp?.lastName}` || '',
                                })}
                            </p>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {compliance!.pendingTasks.map(pt => (
                                    <div
                                        key={pt.id}
                                        className="flex items-center justify-between bg-white border border-red-100 rounded-lg px-3 py-2"
                                    >
                                        <span className="text-xs font-medium text-gray-700 truncate">
                                            {pt.title}
                                        </span>
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 shrink-0">
                                            {pt.state}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {/* Difficulty */}
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

                    {/* Project */}
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

                    {/* Lead (commercial employees only) */}
                    {isSelectedCommercial && leads.length > 0 && (
                        <div>
                            <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                <Target size={10} />
                                {t('tasksPage.lead', 'Lead')}
                            </label>
                            <select
                                value={form.leadId}
                                onChange={e => update('leadId', e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                            >
                                <option value="">{t('tasksPage.leadNone', 'No lead')}</option>
                                {leads.map((lead: any) => (
                                    <option key={lead.id} value={lead.id}>{lead.code} — {lead.company}</option>
                                ))}
                            </select>
                        </div>
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
                                className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400"
                            />
                            <AlertCircle size={14} className="text-red-400" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.urgent')}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={form.important}
                                onChange={e => update('important', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                            />
                            <Flag size={14} className="text-amber-400" />
                            <span className="text-xs font-medium text-gray-600">{t('tasksPage.important')}</span>
                        </label>
                    </div>

                    {/* File attachments */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <Paperclip size={10} />
                            {t('tasksPage.attachments', 'Attachments')}
                        </label>
                        <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:text-[#33cbcc] hover:border-[#33cbcc]/30 transition-colors cursor-pointer">
                            <Plus size={14} />
                            {t('tasksPage.addFiles', 'Add files')}
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={e => {
                                    const newFiles = Array.from(e.target.files || []);
                                    if (newFiles.length > 0) setFiles(prev => [...prev, ...newFiles]);
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        {files.length > 0 && (
                            <div className="mt-2 space-y-1.5">
                                {files.map((file, fi) => (
                                    <div key={fi} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                        <FileText size={14} className="text-gray-400 shrink-0" />
                                        <span className="flex-1 text-sm text-gray-700 truncate">{file.name}</span>
                                        <span className="text-[10px] text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                                        <button
                                            type="button"
                                            onClick={() => setFiles(prev => prev.filter((_, i) => i !== fi))}
                                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex justify-end gap-2 sm:gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('tasks.selfAssign.cancel')}
                    </button>
                    <button
                        onClick={async () => {
                            if (!isValid) return;
                            const dto: CreateTaskDto = {
                                title: form.title,
                                description: form.description || undefined,
                                difficulty: form.difficulty,
                                assignedToId: form.assignedToId,
                                projectId: form.projectId || undefined,
                                natureId: form.natureId || undefined,
                                leadId: form.leadId || undefined,
                                startDate: form.startDate || undefined,
                                endDate: form.endDate || undefined,
                                dueDate: form.endDate || undefined,
                                startTime: form.startTime || undefined,
                                urgent: form.urgent,
                                important: form.important,
                            };
                            try {
                                const created = await createTask.mutateAsync(dto);
                                if (files.length > 0 && created?.id) {
                                    for (const file of files) {
                                        await uploadAttachment.mutateAsync({ taskId: created.id, file });
                                    }
                                }
                                onClose();
                            } catch { /* handled by mutation */ }
                        }}
                        disabled={!isValid || createTask.isPending}
                        className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createTask.isPending ? (
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

const TaskCard = ({ task }: { task: Task }) => {
    const difficultyColors: Record<TaskDifficulty, string> = {
        EASY: 'bg-[#33cbcc]/10 text-[#33cbcc] border-[#33cbcc]/20',
        MEDIUM: 'bg-[#283852]/10 text-[#283852] border-[#283852]/20',
        HARD: 'bg-red-50 text-red-500 border-red-200',
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-lg border border-gray-200 p-3  transition-shadow cursor-pointer"
        >
            {/* Employee info */}
            {task.assignedTo && (
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                    <img
                        src={task.assignedTo.photoUrl || '/default-avatar.png'}
                        alt=""
                        className="w-5 h-5 rounded-full border border-gray-200 object-cover"
                    />
                    <span className="text-[10px] font-medium text-gray-600 truncate">
                        {task.assignedTo.firstName} {task.assignedTo.lastName}
                    </span>
                </div>
            )}

            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 line-clamp-2">{task.title}</h4>
                    {task.transferredFromWeek && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 mt-1">
                            <RotateCcw size={8} />
                            TR
                        </span>
                    )}
                </div>
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
}: {
    date: Date;
    tasks: Task[];
    isToday: boolean;
    onAddTask: () => void;
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
                        <TaskCard key={task.id} task={task} />
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
    const deptScope = useDepartmentScope();
    const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | undefined>();

    const { data: employees = [] } = useEmployees(deptScope);

    const weekStartISO = formatDate(currentMonday);

    // Fetch tasks based on employee selection
    const { data: allTasks = [], isLoading: isLoadingAll } = useAllWeekTasks(weekStartISO);
    const { data: employeeTasks = [], isLoading: isLoadingEmployee } = useWeekTasksByEmployee(
        selectedEmployeeId,
        weekStartISO
    );

    const tasks = selectedEmployeeId ? employeeTasks : allTasks;
    const isLoading = selectedEmployeeId ? isLoadingEmployee : isLoadingAll;

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

    const handleAddTask = (date: string) => {
        setSelectedDate(date);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedDate(undefined);
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-2">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
                                <Calendar className="text-[#33cbcc]" size={24} className="sm:w-8 sm:h-8" />
                                <span>{t('planning.title')}</span>
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1 hidden sm:block">{t('planning.subtitle')}</p>
                        </div>

                        {/* Employee Filter */}
                        <div className="w-full sm:w-64">
                            <select
                                value={selectedEmployeeId}
                                onChange={e => setSelectedEmployeeId(e.target.value)}
                                className="w-full bg-white rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                            >
                                <option value="">{t('planning.allEmployees')}</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName}
                                    </option>
                                ))}
                            </select>
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
                                    />
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Add Task Modal */}
            <AnimatePresence>
                {showModal && (
                    <AddTaskModal
                        onClose={handleCloseModal}
                        prefilledDate={selectedDate}
                        prefilledEmployeeId={selectedEmployeeId}
                        employees={employees}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
