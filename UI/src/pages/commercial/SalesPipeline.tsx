import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Pencil, X, Filter, ChevronLeft, ChevronRight, ArrowRight,
    Clock, MessageSquare, ListTodo, Building2, MapPin, User, Phone, Mail,
    ArrowRightCircle, CheckCircle2, LayoutDashboard, Table2, TrendingUp,
    Target, Award, DollarSign, Users, BarChart3, ChevronRight as ChevronRightIcon, Calendar
} from 'lucide-react';
import { useLeads, useUpdateLead, useLeadStats, useCreateLeadActivity, useLead, useLeadActivities } from '../../api/commercial/hooks';
import type { Lead, SaleStage, CreateLeadActivityDto, ActivityType } from '../../api/commercial/types';
import StageChangeModal, { isForwardMove, STAGE_ORDER } from '../../components/commercial/StageChangeModal';
import { useTasksByLead } from '../../api/tasks/hooks';
import { useEmployees } from '../../api/employees/hooks';
import { useAuth } from '../../contexts/AuthContext';
import ConvertToClientModal from '../../components/ConvertToClientModal';
import LeadProfileSidebar from './LeadProfileSidebar';

/* ─── Constants ─────────────────────────────────────────── */

const PIPELINE_STAGES: SaleStage[] = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'CLOSING'];
const ALL_STAGES: SaleStage[] = [...PIPELINE_STAGES, 'GAGNE', 'PERDU'];

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    PROSPECTION: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-300' },
    QUALIFICATION: { bg: 'bg-[#283852]/15', text: 'text-[#283852]', border: 'border-gray-300' },
    PROPOSITION: { bg: 'bg-[#283852]/20', text: 'text-[#283852]', border: 'border-gray-300' },
    NEGOCIATION: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', border: 'border-gray-300' },
    CLOSING: { bg: 'bg-[#33cbcc]/20', text: 'text-[#33cbcc]', border: 'border-gray-300' },
    GAGNE: { bg: 'bg-[#33cbcc]', text: 'text-white', border: 'border-gray-300' },
    PERDU: { bg: 'bg-gray-200', text: 'text-gray-500', border: 'border-gray-300' },
};

const ACTIVITY_TYPES: ActivityType[] = [
    'VISITE_CLIENT', 'VISITE_PROSPECT', 'APPEL', 'EMAIL', 'REUNION', 'DEMO', 'RELANCE', 'AUTRE',
];

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const isOverdue = (lead: Lead): boolean => {
    if (!lead.nextActionDeadline) return false;
    if (lead.saleStage === 'GAGNE' || lead.saleStage === 'PERDU') return false;
    return new Date(lead.nextActionDeadline) < new Date(new Date().toDateString());
};

/* ─── Pipeline Edit Modal ───────────────────────────────── */

const PipelineEditModal = ({
    lead,
    onClose,
}: {
    lead: Lead;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const updateLead = useUpdateLead();
    const createActivity = useCreateLeadActivity();
    const { data: linkedTasks } = useTasksByLead(lead.id);

    const [form, setForm] = useState({
        saleStage: lead.saleStage,
        successRate: lead.successRate ?? 0,
        priority: lead.priority,
        competitor: lead.competitor || '',
        competitorOffer: lead.competitorOffer || '',
        lastAction: lead.lastAction || '',
        lastActionDate: lead.lastActionDate ? lead.lastActionDate.slice(0, 10) : '',
        lastActionResult: lead.lastActionResult || '',
        nextAction: lead.nextAction || '',
        nextActionDeadline: lead.nextActionDeadline ? lead.nextActionDeadline.slice(0, 10) : '',
        comment: lead.comment || '',
    });

    const [activity, setActivity] = useState({
        type: 'APPEL' as ActivityType,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        result: '',
        activityStatus: 'COMPLETED' as 'PLANNED' | 'COMPLETED' | 'CANCELLED',
        cost: '',
        location: '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleSave = () => {
        updateLead.mutate(
            { id: lead.id, data: form },
            { onSuccess: () => onClose() },
        );
    };

    const handleLogActivity = () => {
        if (!activity.description.trim()) return;
        const dto: CreateLeadActivityDto = {
            leadId: lead.id,
            employeeId: user?.employeeId || lead.assignedToId || '',
            type: activity.type,
            date: activity.date,
            description: activity.description,
            result: activity.result,
            activityStatus: activity.activityStatus,
            cost: activity.cost ? Number(activity.cost) : undefined,
            location: activity.location || undefined,
        };
        createActivity.mutate(dto);
        setActivity({ type: 'APPEL', date: new Date().toISOString().slice(0, 10), description: '', result: '', activityStatus: 'COMPLETED', cost: '', location: '' });
    };

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block';
    const sectionCls = 'border-t border-gray-100 pt-5';

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
                className="bg-white rounded-2xl 2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <ArrowRight size={20} className="text-[#33cbcc]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {t('commercial.pipeline.editTitle')}
                            </h2>
                            <p className="text-xs text-gray-400">{lead.code} - {lead.company}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Section: Pipeline */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">{t('commercial.pipeline.sectionPipeline')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.saleStage')}</label>
                                <select
                                    value={form.saleStage}
                                    onChange={e => setForm(prev => ({ ...prev, saleStage: e.target.value as SaleStage }))}
                                    className={selectCls}
                                >
                                    {ALL_STAGES.map(s => {
                                        const reachable = s === form.saleStage || isForwardMove(lead.saleStage, s);
                                        return (
                                            <option key={s} value={s} disabled={!reachable}>
                                                {t(`commercial.pipeline.stages.${s}`)}
                                                {!reachable ? ' ✕' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.successRate')}</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={form.successRate}
                                    onChange={e => setForm(prev => ({ ...prev, successRate: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.priority')}</label>
                                <select
                                    value={form.priority}
                                    onChange={e => setForm(prev => ({ ...prev, priority: e.target.value as any }))}
                                    className={selectCls}
                                >
                                    {['HOT', 'WARM', 'COLD'].map(p => (
                                        <option key={p} value={p}>{t(`commercial.pipeline.priorities.${p}`)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Section: Concurrence */}
                    <div className={sectionCls}>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">{t('commercial.pipeline.sectionCompetition')}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.competitor')}</label>
                                <input
                                    type="text"
                                    value={form.competitor}
                                    onChange={e => setForm(prev => ({ ...prev, competitor: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.competitorOffer')}</label>
                                <textarea
                                    value={form.competitorOffer}
                                    onChange={e => setForm(prev => ({ ...prev, competitorOffer: e.target.value }))}
                                    rows={2}
                                    className={inputCls + ' resize-none'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Actions */}
                    <div className={sectionCls}>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">{t('commercial.pipeline.sectionActions')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.lastAction')}</label>
                                <input
                                    type="text"
                                    value={form.lastAction}
                                    onChange={e => setForm(prev => ({ ...prev, lastAction: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.lastActionDate')}</label>
                                <input
                                    type="date"
                                    value={form.lastActionDate}
                                    onChange={e => setForm(prev => ({ ...prev, lastActionDate: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className={labelCls}>{t('commercial.pipeline.lastActionResult')}</label>
                            <textarea
                                value={form.lastActionResult}
                                onChange={e => setForm(prev => ({ ...prev, lastActionResult: e.target.value }))}
                                rows={2}
                                className={inputCls + ' resize-none'}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.nextAction')}</label>
                                <input
                                    type="text"
                                    value={form.nextAction}
                                    onChange={e => setForm(prev => ({ ...prev, nextAction: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.nextActionDeadline')}</label>
                                <input
                                    type="date"
                                    value={form.nextActionDeadline}
                                    onChange={e => setForm(prev => ({ ...prev, nextActionDeadline: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className={labelCls}>{t('commercial.pipeline.comment')}</label>
                            <textarea
                                value={form.comment}
                                onChange={e => setForm(prev => ({ ...prev, comment: e.target.value }))}
                                rows={2}
                                className={inputCls + ' resize-none'}
                            />
                        </div>
                    </div>

                    {/* Section: Quick Activity Log */}
                    <div className={sectionCls}>
                        <h3 className="text-sm font-bold text-gray-700 mb-4">{t('commercial.pipeline.sectionQuickActivity')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.activityType')}</label>
                                <select
                                    value={activity.type}
                                    onChange={e => setActivity(prev => ({ ...prev, type: e.target.value as ActivityType }))}
                                    className={selectCls}
                                >
                                    {ACTIVITY_TYPES.map(at => (
                                        <option key={at} value={at}>{t(`commercial.pipeline.activityTypes.${at}`)}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.activityDate')}</label>
                                <input
                                    type="date"
                                    value={activity.date}
                                    onChange={e => setActivity(prev => ({ ...prev, date: e.target.value }))}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.activityStatusLabel')}</label>
                                <select
                                    value={activity.activityStatus}
                                    onChange={e => setActivity(prev => ({ ...prev, activityStatus: e.target.value as any }))}
                                    className={selectCls}
                                >
                                    <option value="COMPLETED">{t('commercial.pipeline.activityStatuses.COMPLETED')}</option>
                                    <option value="PLANNED">{t('commercial.pipeline.activityStatuses.PLANNED')}</option>
                                    <option value="CANCELLED">{t('commercial.pipeline.activityStatuses.CANCELLED')}</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>{t('commercial.pipeline.activityLocation')}</label>
                                <input
                                    type="text"
                                    value={activity.location}
                                    onChange={e => setActivity(prev => ({ ...prev, location: e.target.value }))}
                                    placeholder={t('commercial.pipeline.activityLocationPlaceholder')}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                        {['VISITE_CLIENT', 'VISITE_PROSPECT'].includes(activity.type) && (
                            <div className="mt-4">
                                <label className={labelCls}>{t('commercial.pipeline.activityCost')}</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={activity.cost}
                                    onChange={e => setActivity(prev => ({ ...prev, cost: e.target.value }))}
                                    placeholder={t('commercial.pipeline.activityCostPlaceholder')}
                                    className={inputCls}
                                />
                            </div>
                        )}
                        <div className="mt-4">
                            <label className={labelCls}>{t('commercial.pipeline.activityDescription')}</label>
                            <textarea
                                value={activity.description}
                                onChange={e => setActivity(prev => ({ ...prev, description: e.target.value }))}
                                rows={2}
                                placeholder={t('commercial.pipeline.activityDescriptionPlaceholder')}
                                className={inputCls + ' resize-none'}
                            />
                        </div>
                        <div className="mt-4">
                            <label className={labelCls}>{t('commercial.pipeline.activityResult')}</label>
                            <textarea
                                value={activity.result}
                                onChange={e => setActivity(prev => ({ ...prev, result: e.target.value }))}
                                rows={2}
                                className={inputCls + ' resize-none'}
                            />
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleLogActivity}
                                disabled={!activity.description.trim() || createActivity.isPending}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                                    activity.description.trim()
                                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                <MessageSquare size={14} />
                                {t('commercial.pipeline.logActivity')}
                            </button>
                        </div>
                    </div>

                    {/* ── Linked Tasks ── */}
                    <div className={sectionCls}>
                        <label className={labelCls}>
                            <ListTodo size={10} />
                            {t('commercial.leads.linkedTasks', 'Taches liees')}
                        </label>
                        {linkedTasks && linkedTasks.length > 0 ? (
                            <div className="space-y-2">
                                {linkedTasks.map((task: any) => {
                                    const stateColors: Record<string, string> = {
                                        CREATED: 'bg-gray-100 text-gray-600',
                                        ASSIGNED: 'bg-[#283852]/10 text-[#283852]',
                                        IN_PROGRESS: 'bg-[#283852]/10 text-[#283852]',
                                        BLOCKED: 'bg-[#283852]/10 text-[#283852]',
                                        COMPLETED: 'bg-[#283852] text-white',
                                        REVIEWED: 'bg-[#33cbcc]/10 text-[#33cbcc]',
                                    };
                                    return (
                                        <div key={task.id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${stateColors[task.state] || 'bg-gray-100 text-gray-600'}`}>
                                                    {task.state}
                                                </span>
                                                <span className="text-sm text-gray-700 truncate">{task.title}</span>
                                            </div>
                                            {task.dueDate && (
                                                <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                                                    {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400">{t('commercial.leads.noLinkedTasks', 'Aucune tache liee')}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('commercial.pipeline.cancel')}
                    </button>
                    <button
                        disabled={updateLead.isPending}
                        onClick={handleSave}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors lg [#33cbcc]/20"
                    >
                        {updateLead.isPending ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Plus size={16} />
                        )}
                        {t('commercial.pipeline.save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};


/* ─── Quick Log Activity Modal ─────────────────────────── */

function QuickLogActivityModal({ lead, type, onClose }: { lead: Lead, type: ActivityType, onClose: () => void }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const createActivity = useCreateLeadActivity();
    const [desc, setDesc] = useState('');

    const handleLog = () => {
        if (!desc.trim()) return;
        createActivity.mutate({
            leadId: lead.id,
            employeeId: user?.employeeId || lead.assignedToId || '',
            type,
            date: new Date().toISOString().slice(0, 10),
            description: desc,
            activityStatus: 'COMPLETED'
        }, { onSuccess: onClose });
    };

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">
                        {t('commercial.pipeline.logActivity')} ({t(`commercial.pipeline.activityTypes.${type}`)}) - {lead.company}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <textarea
                        autoFocus
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        placeholder={t('commercial.pipeline.activityDescriptionPlaceholder')}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all resize-none"
                    />
                    <div className="flex justify-end gap-2 mt-2">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleLog}
                            disabled={!desc.trim() || createActivity.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-[#33cbcc] rounded-xl hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {createActivity.isPending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {t('commercial.detail.save')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Quick Stage Dropdown ──────────────────────────────── */

const QuickStageDropdown = ({
    lead,
    onClose,
    onConvert,
}: {
    lead: Lead;
    onClose: () => void;
    onConvert: (lead: Lead) => void;
}) => {
    const { t } = useTranslation();
    const updateLead = useUpdateLead();
    const [pendingStage, setPendingStage] = useState<SaleStage | null>(null);

    const handleChange = (stage: SaleStage) => {
        if (stage === lead.saleStage) { onClose(); return; }
        // Open confirmation modal (it blocks backward moves internally)
        setPendingStage(stage);
    };

    const confirmChange = () => {
        if (!pendingStage) return;
        if (pendingStage === 'GAGNE') {
            setPendingStage(null);
            onClose();
            onConvert(lead);
            return;
        }
        updateLead.mutate(
            { id: lead.id, data: { saleStage: pendingStage } },
            { onSuccess: () => { setPendingStage(null); onClose(); } },
        );
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute z-40 top-full left-0 mt-1 bg-white rounded-xl border border-gray-100 py-1 min-w-[160px] shadow-lg"
            >
                {ALL_STAGES.map(s => {
                    const colors = STAGE_COLORS[s];
                    const isActive = s === lead.saleStage;
                    const canReach = !isActive && isForwardMove(lead.saleStage, s);
                    return (
                        <button
                            key={s}
                            onClick={() => handleChange(s)}
                            disabled={isActive}
                            className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors flex items-center gap-2 ${
                                isActive ? 'bg-gray-50 cursor-default' :
                                canReach ? 'hover:bg-gray-50' :
                                'opacity-40 cursor-not-allowed'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border`} />
                            <span className={colors.text}>{t(`commercial.pipeline.stages.${s}`)}</span>
                        </button>
                    );
                })}
            </motion.div>

            {pendingStage && (
                <StageChangeModal
                    from={lead.saleStage}
                    to={pendingStage}
                    companyName={lead.company}
                    isPending={updateLead.isPending}
                    onConfirm={confirmChange}
                    onCancel={() => setPendingStage(null)}
                />
            )}
        </>
    );
};

/* ─── Pipeline Dashboard ────────────────────────────────── */

const TIME_PERIODS = ['week', 'month', 'quarter', 'year', 'all'] as const;
type TimePeriod = typeof TIME_PERIODS[number];

const getDateRange = (period: TimePeriod): { dateFrom?: string; dateTo?: string } => {
    if (period === 'all') return {};
    const now = new Date();
    const to = now.toISOString().split('T')[0];
    let from: Date;
    switch (period) {
        case 'week': from = new Date(now); from.setDate(now.getDate() - 7); break;
        case 'month': from = new Date(now); from.setMonth(now.getMonth() - 1); break;
        case 'quarter': from = new Date(now); from.setMonth(now.getMonth() - 3); break;
        case 'year': from = new Date(now); from.setFullYear(now.getFullYear() - 1); break;
    }
    return { dateFrom: from!.toISOString().split('T')[0], dateTo: to };
};

const PipelineDashboard = ({
    onStageClick,
}: {
    onStageClick: (stage: SaleStage) => void;
}) => {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isManager = role === 'MANAGER';

    const [period, setPeriod] = useState<TimePeriod>('all');
    const [commercialId, setCommercialId] = useState('');

    const { data: employees } = useEmployees();
    const commercials = (employees || []).filter((e: any) => e.user?.role === 'COMMERCIAL' || e.user?.role === 'MANAGER');

    const statsFilters: any = { ...getDateRange(period) };
    if (commercialId) statsFilters.assignedToId = commercialId;

    const { data: stats, isLoading } = useLeadStats(statsFilters);

    if (isLoading || !stats) return (
        <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const kpis = [
        {
            label: t('commercial.pipeline.dashboard.pipelineValue'),
            value: formatFCFA(stats.totalPipelineValue || 0),
            icon: DollarSign,
            bgLight: 'bg-[#283852]/10',
            textColor: 'text-[#283852]',
        },
        {
            label: t('commercial.pipeline.dashboard.weightedValue'),
            value: formatFCFA(stats.weightedPipelineValue || 0),
            icon: Target,
            bgLight: 'bg-[#283852]/10',
            textColor: 'text-[#283852]',
        },
        {
            label: t('commercial.pipeline.dashboard.winRate'),
            value: `${stats.winRate || 0}%`,
            icon: Award,
            bgLight: 'bg-[#33cbcc]/10',
            textColor: 'text-[#33cbcc]',
            sub: `${stats.wonCount || 0} / ${(stats.wonCount || 0) + (stats.lostCount || 0)}`,
        },
        {
            label: t('commercial.pipeline.dashboard.avgDealSize'),
            value: formatFCFA(stats.averageDealSize || 0),
            icon: TrendingUp,
            bgLight: 'bg-[#283852]/10',
            textColor: 'text-[#283852]',
        },
    ];

    // Build funnel data
    const funnelStages = PIPELINE_STAGES.map((stage, i) => {
        const s = stats.byStage?.[stage] || { count: 0, value: 0 };
        const nextStage = PIPELINE_STAGES[i + 1];
        const nextCount = nextStage ? (stats.byStage?.[nextStage]?.count || 0) : (stats.wonCount || 0);
        const conversionRate = s.count > 0 ? Math.round((nextCount / s.count) * 100) : 0;
        return { stage, count: s.count, value: s.value, conversionRate };
    });

    const maxCount = Math.max(...funnelStages.map(s => s.count), 1);

    // Revenue trend (mini bar chart)
    const revenueTrend = stats.revenueTrend || [];
    const maxTrendRevenue = Math.max(...revenueTrend.map((r: any) => r.revenue), 1);

    // Source distribution (bySource = leadType counts)
    const bySource = stats.bySource || {};
    const sourceEntries = Object.entries(bySource).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6);
    const totalSourceCount = sourceEntries.reduce((sum: number, [, count]: any) => sum + count, 0) || 1;

    const sourceColors = [
        'bg-[#33cbcc]', 'bg-[#283852]', 'bg-[#33cbcc99]', 'bg-[#28385280]', 'bg-[#33cbcc50]', 'bg-gray-400',
    ];

    const periodLabels: Record<TimePeriod, string> = {
        week: t('commercial.pipeline.dashboard.periodWeek', 'Week'),
        month: t('commercial.pipeline.dashboard.periodMonth', 'Month'),
        quarter: t('commercial.pipeline.dashboard.periodQuarter', 'Quarter'),
        year: t('commercial.pipeline.dashboard.periodYear', 'Year'),
        all: t('commercial.pipeline.dashboard.periodAll', 'All'),
    };

    const selectCls = 'px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all appearance-none cursor-pointer';

    return (
        <div className="space-y-6">
            {/* ── Filters ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Time period */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    {TIME_PERIODS.map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                period === p
                                    ? 'bg-white text-gray-800 sm'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {periodLabels[p]}
                        </button>
                    ))}
                </div>

                {/* Commercial filter (manager only) */}
                {isManager && (
                    <select
                        value={commercialId}
                        onChange={e => setCommercialId(e.target.value)}
                        className={selectCls}
                    >
                        <option value="">{t('commercial.pipeline.dashboard.allCommercials', 'All Commercials')}</option>
                        {commercials.map((emp: any) => (
                            <option key={emp.id} value={emp.id}>
                                {emp.firstName} {emp.lastName}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <motion.div
                        key={kpi.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white rounded-2xl sm border border-gray-100 p-5  transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2.5 rounded-xl ${kpi.bgLight}`}>
                                <kpi.icon size={18} className={kpi.textColor} />
                            </div>
                        </div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{kpi.label}</p>
                        <p className="text-2xl font-bold text-gray-800 mt-1">{kpi.value}</p>
                        {kpi.sub && <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>}
                    </motion.div>
                ))}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="bg-white rounded-2xl sm border border-gray-100 p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-gray-50">
                        <Users size={20} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('commercial.pipeline.dashboard.totalLeads')}</p>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalLeads || 0}</p>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white rounded-2xl sm border border-gray-100 p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-[#33cbcc]/10">
                        <CheckCircle2 size={20} className="text-[#33cbcc]" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('commercial.pipeline.dashboard.wonDeals')}</p>
                        <p className="text-2xl font-bold text-[#33cbcc]">{stats.wonCount || 0}</p>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="bg-white rounded-2xl sm border border-gray-100 p-5 flex items-center gap-4"
                >
                    <div className="p-3 rounded-xl bg-gray-100">
                        <X size={20} className="text-gray-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{t('commercial.pipeline.dashboard.lostDeals')}</p>
                        <p className="text-2xl font-bold text-gray-500">{stats.lostCount || 0}</p>
                    </div>
                </motion.div>
            </div>

            {/* Pipeline Funnel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl sm border border-gray-100 p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={18} className="text-gray-400" />
                        <h3 className="text-sm font-semibold text-gray-700">{t('commercial.pipeline.dashboard.funnelTitle')}</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#33cbcc]" />
                            {t('commercial.pipeline.dashboard.stageCount')}
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#33cbcc]/30" />
                            {t('commercial.pipeline.dashboard.stageValue')}
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    {funnelStages.map((fs, i) => {
                        const colors = STAGE_COLORS[fs.stage];
                        const countPct = (fs.count / maxCount) * 100;

                        return (
                            <div key={fs.stage}>
                                <button
                                    onClick={() => onStageClick(fs.stage as SaleStage)}
                                    className="w-full group"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Stage label */}
                                        <div className="w-32 shrink-0 text-right">
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${colors.text} group-hover:underline`}>
                                                {t(`commercial.pipeline.stages.${fs.stage}`)}
                                            </span>
                                        </div>

                                        {/* Bars */}
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.max(countPct, 2)}%` }}
                                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                                        className={`h-full rounded-full flex items-center px-3 ${colors.bg} border ${colors.border}`}
                                                    >
                                                        <span className={`text-xs font-bold ${colors.text} whitespace-nowrap`}>{fs.count}</span>
                                                    </motion.div>
                                                </div>
                                                <span className="text-xs text-gray-400 w-24 shrink-0 text-right">{formatFCFA(fs.value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>

                                {/* Conversion arrow between stages */}
                                {i < funnelStages.length - 1 && (
                                    <div className="flex items-center gap-4 my-1.5">
                                        <div className="w-32" />
                                        <div className="flex-1 flex items-center gap-2 pl-1">
                                            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                                                <ChevronRightIcon size={10} className="rotate-90" />
                                                <span className={fs.conversionRate >= 50 ? 'text-[#33cbcc]' : fs.conversionRate >= 25 ? 'text-[#283852]' : 'text-gray-400'}>
                                                    {t('commercial.pipeline.dashboard.conversionToNext', { rate: fs.conversionRate })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Won stage at the bottom */}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100 mt-2">
                        <div className="w-32 shrink-0 text-right">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#33cbcc]">
                                {t('commercial.pipeline.stages.GAGNE')}
                            </span>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.max(((stats.wonCount || 0) / maxCount) * 100, 2)}%` }}
                                        transition={{ duration: 0.8, delay: 0.5 }}
                                        className="h-full rounded-full flex items-center px-3 bg-[#33cbcc]/10 border border-gray-200"
                                    >
                                        <span className="text-xs font-bold text-[#33cbcc] whitespace-nowrap">{stats.wonCount || 0}</span>
                                    </motion.div>
                                </div>
                                <span className="text-xs text-gray-400 w-24 shrink-0 text-right">
                                    {formatFCFA(stats.byStage?.GAGNE?.value || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Bottom Row: Revenue Trend + Source Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue Trend */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white rounded-2xl sm border border-gray-100 p-6"
                >
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('commercial.pipeline.dashboard.revenueTrend')}</h3>
                    <div className="flex items-end gap-1.5 h-32">
                        {revenueTrend.map((r: any, i: number) => {
                            const pct = (r.revenue / maxTrendRevenue) * 100;
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: `${Math.max(pct, 2)}%` }}
                                        transition={{ duration: 0.6, delay: i * 0.05 }}
                                        className="w-full rounded-t-md bg-gradient-to-t from-[#33cbcc] to-[#33cbcc]/60 hover:from-[#2bb5b6] hover:to-[#33cbcc] transition-colors cursor-default"
                                        title={formatFCFA(r.revenue)}
                                    />
                                    <span className="text-[9px] text-gray-400 font-medium">{r.month}</span>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Source Distribution (leadType) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65 }}
                    className="bg-white rounded-2xl sm border border-gray-100 p-6"
                >
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">{t('commercial.pipeline.dashboard.revenueBySource')}</h3>
                    <div className="space-y-3">
                        {sourceEntries.map(([source, count]: any, i: number) => {
                            const pct = Math.round((count / totalSourceCount) * 100);
                            return (
                                <div key={source}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-gray-600">
                                            {t(`commercial.leads.types.${source}`, { defaultValue: source.replace(/_/g, ' ') })}
                                        </span>
                                        <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, delay: i * 0.08 }}
                                            className={`h-full rounded-full ${sourceColors[i] || 'bg-gray-400'}`}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {sourceEntries.length === 0 && (
                            <p className="text-sm text-gray-400 text-center py-4">{t('commercial.pipeline.noResults')}</p>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ─── Main Component ────────────────────────────────────── */

const SalesPipeline = () => {
    const { t } = useTranslation();
    const { role, user } = useAuth();
    const isManager = role === 'MANAGER';
    const isCommercial = role === 'COMMERCIAL';

    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<SaleStage | 'ALL'>('ALL');
    const [page, setPage] = useState(1);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [quickStageLeadId, setQuickStageLeadId] = useState<string | null>(null);
    const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
    const [quickLog, setQuickLog] = useState<{lead: Lead, type: ActivityType} | null>(null);
    const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
    const [view, setView] = useState<'table' | 'dashboard'>('table');
    const limit = 15;

    // Reset page when filters change
    useEffect(() => { setPage(1); }, [search, stageFilter]);

    const filters: any = { page, limit };
    if (search) filters.search = search;
    if (stageFilter !== 'ALL') filters.saleStage = stageFilter;
    if (isCommercial && user?.employeeId) filters.assignedToId = user.employeeId;

    const { data: leadsData, isLoading } = useLeads(filters);
    const { data: stats } = useLeadStats();

    const leads = leadsData?.data || [];
    const totalPages = leadsData?.totalPages || 1;
    const total = leadsData?.total || 0;

    // Close quick stage dropdown on outside click
    useEffect(() => {
        if (!quickStageLeadId) return;
        const handleClick = () => setQuickStageLeadId(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [quickStageLeadId]);

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('commercial.pipeline.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('commercial.pipeline.subtitle')}</p>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                    <button
                        onClick={() => setView('table')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            view === 'table'
                                ? 'bg-white text-gray-800 sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Table2 size={16} />
                        {t('commercial.pipeline.viewTable')}
                    </button>
                    <button
                        onClick={() => setView('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            view === 'dashboard'
                                ? 'bg-white text-gray-800 sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <LayoutDashboard size={16} />
                        {t('commercial.pipeline.viewDashboard')}
                    </button>
                </div>
            </div>

            {view === 'dashboard' ? (
                <PipelineDashboard
                    onStageClick={(stage) => { setStageFilter(stage); setView('table'); }}
                />
            ) : (
            <>
            {/* ── Pipeline Summary Cards (clickable stage filters) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {ALL_STAGES.map((stage, i) => {
                    const stageStats = stats?.byStage?.[stage] || { count: 0, value: 0 };
                    const colors = STAGE_COLORS[stage];
                    const isActive = stageFilter === stage;
                    return (
                        <motion.button
                            key={stage}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            onClick={() => setStageFilter(isActive ? 'ALL' : stage)}
                            className={`bg-white rounded-2xl sm border p-4 text-left transition-all  ${
                                isActive ? 'ring-2 ring-[#33cbcc]/40 border-[#33cbcc]/30' : 'border-gray-100'
                            }`}
                        >
                            <div className={`h-1 w-10 rounded-full mb-2.5 ${colors.border} border ${colors.bg}`} />
                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${colors.text}`}>
                                {t(`commercial.pipeline.stages.${stage}`)}
                            </p>
                            <p className="text-xl font-bold text-gray-800">{stageStats.count}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{formatFCFA(stageStats.value)}</p>
                        </motion.button>
                    );
                })}
            </div>

            {/* ── Search + Active Filter ── */}
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('commercial.pipeline.searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                </div>
                {stageFilter !== 'ALL' && (
                    <button
                        onClick={() => setStageFilter('ALL')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors shrink-0"
                    >
                        <X size={14} />
                        {t(`commercial.pipeline.stages.${stageFilter}`)}
                    </button>
                )}
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl sm border border-gray-100 overflow-hidden">
                {/* Table Header */}
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px]">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colCode')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colCompany')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colNeeds')}</th>
                                <th className="px-4 py-3 text-right">{t('commercial.pipeline.colRevenue')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colSeller')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colCompetitor')}</th>
                                <th className="px-4 py-3 text-center">{t('commercial.pipeline.colSuccess')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colStage')}</th>
                                <th className="px-4 py-3 text-left">{t('commercial.pipeline.colNextAction')}</th>
                                <th className="px-4 py-3 text-center">{t('commercial.pipeline.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        {Array.from({ length: 10 }).map((_, j) => (
                                            <td key={j} className="px-4 py-4">
                                                <div className="h-4 bg-gray-100 rounded-lg animate-pulse" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center">
                                        <Filter size={32} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-400 font-medium">{t('commercial.pipeline.noResults')}</p>
                                    </td>
                                </tr>
                            ) : (
                                leads.map((lead, i) => {
                                    const colors = STAGE_COLORS[lead.saleStage] || STAGE_COLORS.PROSPECTION;
                                    const overdue = isOverdue(lead);
                                    const successColor =
                                        lead.successRate > 70 ? 'text-[#33cbcc]' :
                                        lead.successRate >= 30 ? 'text-[#283852]' :
                                        'text-gray-400';

                                    return (
                                        <motion.tr
                                            key={lead.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                            onClick={() => setDetailLeadId(lead.id)}
                                        >
                                            {/* Code */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono text-gray-600">{lead.code}</span>
                                            </td>

                                            {/* Societe */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-medium text-gray-800">{lead.company}</span>
                                            </td>

                                            {/* Besoin Client */}
                                            <td className="px-4 py-3 max-w-[180px]">
                                                <span className="text-sm text-gray-500 truncate block" title={lead.clientNeeds}>
                                                    {lead.clientNeeds
                                                        ? lead.clientNeeds.length > 50
                                                            ? lead.clientNeeds.slice(0, 50) + '...'
                                                            : lead.clientNeeds
                                                        : '-'}
                                                </span>
                                            </td>

                                            {/* CA Potentiel */}
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-sm font-semibold text-gray-800">
                                                    {formatFCFA(lead.potentialRevenue || 0)}
                                                </span>
                                            </td>

                                            {/* Vendeur */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-600">
                                                    {lead.assignedTo
                                                        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                                                        : '-'}
                                                </span>
                                            </td>

                                            {/* Concurrent */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-500">{lead.competitor || '-'}</span>
                                            </td>

                                            {/* % Succes */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-sm font-bold ${successColor}`}>
                                                    {lead.successRate ?? 0}%
                                                </span>
                                            </td>

                                            {/* Etape (stage badge, clickable) */}
                                            <td className="px-4 py-3">
                                                <div className="relative">
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            if (lead.saleStage === 'GAGNE') return;
                                                            setQuickStageLeadId(
                                                                quickStageLeadId === lead.id ? null : lead.id,
                                                            );
                                                        }}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${lead.saleStage === 'GAGNE' ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} ${colors.bg} ${colors.text}`}
                                                    >
                                                        {t(`commercial.pipeline.stages.${lead.saleStage}`)}
                                                        {lead.saleStage !== 'GAGNE' && <ArrowRight size={10} />}
                                                    </button>
                                                    <AnimatePresence>
                                                        {quickStageLeadId === lead.id && (
                                                            <QuickStageDropdown
                                                                lead={lead}
                                                                onClose={() => setQuickStageLeadId(null)}
                                                                onConvert={(l) => setConvertingLead(l)}
                                                            />
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </td>

                                            {/* Prochaine Action */}
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm ${overdue ? 'text-[#283852] font-semibold' : 'text-gray-600'}`}>
                                                        {lead.nextAction || '-'}
                                                    </span>
                                                    {lead.nextActionDeadline && (
                                                        <span className={`text-xs flex items-center gap-1 mt-0.5 ${overdue ? 'text-[#283852]' : 'text-gray-400'}`}>
                                                            <Clock size={10} />
                                                            {new Date(lead.nextActionDeadline).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setQuickLog({ lead, type: 'APPEL' }); }}
                                                        className="p-1.5 rounded-lg hover:bg-[#33cbcc]/10 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                                        title={t('commercial.pipeline.activityTypes.APPEL')}
                                                    >
                                                        <Phone size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setQuickLog({ lead, type: 'EMAIL' }); }}
                                                        className="p-1.5 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                                        title={t('commercial.pipeline.activityTypes.EMAIL')}
                                                    >
                                                        <Mail size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setQuickLog({ lead, type: 'REUNION' }); }}
                                                        className="p-1.5 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                                        title={t('commercial.pipeline.activityTypes.REUNION')}
                                                    >
                                                        <Calendar size={14} />
                                                    </button>
                                                    <div className="w-px h-4 bg-gray-200 mx-1" />
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setEditingLead(lead); }}
                                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                                        title={t('commercial.pipeline.editPipeline')}
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-sm text-gray-400">
                            {t('commercial.pipeline.showing', {
                                from: (page - 1) * limit + 1,
                                to: Math.min(page * limit, total),
                                total,
                            })}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .reduce<(number | string)[]>((acc, p, i, arr) => {
                                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, i) =>
                                    typeof p === 'string' ? (
                                        <span key={`ellipsis-${i}`} className="text-gray-300 text-sm px-1">...</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                                                page === p
                                                    ? 'bg-[#33cbcc] text-white lg [#33cbcc]/20'
                                                    : 'text-gray-500 hover:bg-gray-100'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ),
                                )}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            </>
            )}

            {/* ── Modals ── */}
            <AnimatePresence>
                {editingLead && (
                    <PipelineEditModal
                        lead={editingLead}
                        onClose={() => setEditingLead(null)}
                    />
                )}
                {detailLeadId && (
                    <LeadProfileSidebar
                        leadId={detailLeadId}
                        onClose={() => setDetailLeadId(null)}
                        onEdit={(lead) => { setDetailLeadId(null); setEditingLead(lead); }}
                    />
                )}
                {quickLog && (
                    <QuickLogActivityModal
                        lead={quickLog.lead}
                        type={quickLog.type}
                        onClose={() => setQuickLog(null)}
                    />
                )}
                {convertingLead && (
                    <ConvertToClientModal
                        lead={convertingLead}
                        onClose={() => setConvertingLead(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default SalesPipeline;
