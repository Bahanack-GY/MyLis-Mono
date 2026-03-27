import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, X,
    CheckCircle2, Phone, Mail, MapPin, Building2, Clock,
    MessageSquare, ArrowRightCircle, User, ListTodo, FileText,
    PhoneCall, ScanSearch, MailOpen, Users, Monitor, RefreshCw, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUpdateLead, useLead, useLeadActivities, useCreateLeadActivity } from '../../api/commercial/hooks';
import { useTasksByLead } from '../../api/tasks/hooks';
import type { Lead, CreateLeadActivityDto, SaleStage, ActivityType } from '../../api/commercial/types';
import { useAuth } from '../../contexts/AuthContext';
import ConvertToClientModal from '../../components/ConvertToClientModal';

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    PROSPECTION: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-400' },
    QUALIFICATION: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-400' },
    PROPOSITION: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-400' },
    NEGOCIATION: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-400' },
    CLOSING: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-400' },
    GAGNE: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-400' },
    PERDU: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-400' },
};
const PIPELINE_STAGES: SaleStage[] = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'CLOSING'];
const ALL_STAGES: SaleStage[] = [...PIPELINE_STAGES, 'GAGNE', 'PERDU'];

const priorityColors: Record<string, string> = {
    HOT: 'bg-red-100 text-red-700',
    WARM: 'bg-orange-100 text-orange-700',
    COLD: 'bg-blue-100 text-blue-700',
};

const ACTIVITY_TYPE_ICONS: Record<string, LucideIcon> = {
    VISITE_CLIENT: Building2,
    VISITE_PROSPECT: ScanSearch,
    APPEL: PhoneCall,
    EMAIL: MailOpen,
    REUNION: Users,
    DEMO: Monitor,
    RELANCE: RefreshCw,
    AUTRE: FileText,
};

const ActivityTypeIcon = ({ type, size = 16 }: { type: string; size?: number }) => {
    const Icon = ACTIVITY_TYPE_ICONS[type] ?? MoreHorizontal;
    return <Icon size={size} />;
};

const ACTIVITY_TYPES: ActivityType[] = [
    'VISITE_CLIENT', 'VISITE_PROSPECT', 'APPEL', 'EMAIL', 'REUNION', 'DEMO', 'RELANCE', 'AUTRE',
];

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

export default function LeadProfileSidebar({
    leadId,
    onClose,
    onEdit,
}: {
    leadId: string;
    onClose: () => void;
    onEdit: (lead: Lead) => void;
}) {
    const { t } = useTranslation();
    const { role, user } = useAuth();
    const isManager = role === 'MANAGER';
    const updateLead = useUpdateLead();
    const createActivity = useCreateLeadActivity();

    const { data: lead, isLoading } = useLead(leadId);
    const { data: activitiesData } = useLeadActivities({ leadId, limit: 50 });
    const activities = activitiesData?.data || [];
    const { data: linkedTasks } = useTasksByLead(leadId);

    const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'tasks'>('details');
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [showConvertModal, setShowConvertModal] = useState(false);
    
    const [actForm, setActForm] = useState({
        type: 'APPEL' as ActivityType,
        date: new Date().toISOString().slice(0, 10),
        description: '',
        result: '',
        activityStatus: 'COMPLETED' as 'PLANNED' | 'COMPLETED' | 'CANCELLED',
        cost: '',
        location: '',
    });

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const handleLogActivity = () => {
        if (!actForm.description.trim() || !lead) return;
        const dto: CreateLeadActivityDto = {
            leadId: lead.id,
            employeeId: user?.employeeId || lead.assignedToId || '',
            type: actForm.type,
            date: actForm.date,
            description: actForm.description,
            result: actForm.result,
            activityStatus: actForm.activityStatus,
            cost: actForm.cost ? Number(actForm.cost) : undefined,
            location: actForm.location || undefined,
        };
        createActivity.mutate(dto, {
            onSuccess: () => {
                setActForm({ type: 'APPEL', date: new Date().toISOString().slice(0, 10), description: '', result: '', activityStatus: 'COMPLETED', cost: '', location: '' });
                setShowActivityForm(false);
            },
        });
    };

    const handleStageChange = (stage: SaleStage) => {
        if (!lead || stage === lead.saleStage) return;
        if (lead.saleStage === 'GAGNE') return;
        if (stage === 'GAGNE') {
            setShowConvertModal(true);
            return;
        }
        updateLead.mutate({ id: lead.id, data: { saleStage: stage } });
    };

    const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all';
    const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 h-full w-full max-w-xl bg-white 2xl z-50 flex flex-col"
            >
                {isLoading || !lead ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex flex-col shrink-0 gap-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono text-[#33cbcc] font-bold">{lead.code}</span>
                                        {lead.clientId && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                                <CheckCircle2 size={10} />
                                                {t('commercial.leads.converted', 'Converted')}
                                            </span>
                                        )}
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[lead.priority] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {t(`commercial.leads.priorities.${lead.priority}`)}
                                        </span>
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-800 mt-0.5">{lead.company}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => { onClose(); onEdit(lead); }}
                                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                        title={t('commercial.leads.editLead')}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Main Stage UI */}
                            {lead.saleStage === 'GAGNE' ? (
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${STAGE_COLORS.GAGNE.bg} ${STAGE_COLORS.GAGNE.text} ring-2 ring-offset-1 ${STAGE_COLORS.GAGNE.border}`}>
                                        {t('commercial.pipeline.stages.GAGNE')}
                                    </span>
                                    <span className="text-[10px] text-gray-400">{t('commercial.convert.stageLocked', 'Stage locked after conversion')}</span>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {ALL_STAGES.map(stage => {
                                        const colors = STAGE_COLORS[stage];
                                        const isActive = lead.saleStage === stage;
                                        return (
                                            <button
                                                key={stage}
                                                onClick={() => handleStageChange(stage)}
                                                disabled={updateLead.isPending}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                    isActive
                                                        ? `${colors.bg} ${colors.text} ring-2 ring-offset-1 border-transparent shadow [${colors.border}]/50`
                                                        : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-100'
                                                }`}
                                            >
                                                {t(`commercial.pipeline.stages.${stage}`)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="flex items-center border-b border-gray-200 mt-2">
                                <button
                                    onClick={() => setActiveTab('details')}
                                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'details' ? 'border-[#33cbcc] text-[#33cbcc]' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <FileText size={16} /> {t('common.details', 'Details')}
                                </button>
                                <button
                                    onClick={() => setActiveTab('activities')}
                                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'activities' ? 'border-[#33cbcc] text-[#33cbcc]' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <MessageSquare size={16} /> {t('commercial.detail.activities', 'Activities')} <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[10px]">{activities.length}</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('tasks')}
                                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-colors ${
                                        activeTab === 'tasks' ? 'border-[#33cbcc] text-[#33cbcc]' : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <ListTodo size={16} /> {t('commercial.leads.linkedTasks', 'Tasks')} <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-[10px]">{linkedTasks?.length || 0}</span>
                                </button>
                            </div>
                        </div>

                        {/* Content area */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {activeTab === 'details' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{t('commercial.leads.potentialRevenue')}</p>
                                            <p className="text-lg font-bold text-gray-800 mt-1">{formatFCFA(lead.potentialRevenue || 0)}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">{t('commercial.pipeline.successRate')}</p>
                                            <p className="text-lg font-bold text-gray-800 mt-1">{lead.successRate ?? 0}%</p>
                                        </div>
                                    </div>

                                    {/* Company & Contact Info */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.sectionCompany', 'Company')}</h3>
                                        {lead.activitySector && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Building2 size={14} className="text-gray-400" />
                                                {lead.activitySector}
                                            </div>
                                        )}
                                        {(lead.city || lead.country) && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <MapPin size={14} className="text-gray-400" />
                                                {[lead.address, lead.city, lead.region, lead.country].filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        {lead.clientNeeds && (
                                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">{t('commercial.leads.clientNeeds')}</p>
                                                <p className="text-sm text-gray-700">{lead.clientNeeds}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contacts */}
                                    {lead.contact1Name && (
                                        <div className="space-y-2">
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.sectionContact1')}</h3>
                                            <div className="bg-white border border-gray-100 sm rounded-xl p-4 space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                                    <User size={14} className="text-[#33cbcc]" />
                                                    {lead.contact1Name} {lead.contact1Role && <span className="text-gray-400 font-normal">({lead.contact1Role})</span>}
                                                </div>
                                                {lead.contact1Phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Phone size={14} className="text-gray-400" />
                                                        {lead.contact1Phone}
                                                    </div>
                                                )}
                                                {lead.contact1Email && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Mail size={14} className="text-gray-400" />
                                                        {lead.contact1Email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Assigned To + Competitor */}
                                    {(lead.assignedTo || lead.competitor) && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {lead.assignedTo && (
                                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('commercial.leads.assignedTo')}</p>
                                                    <p className="text-sm font-medium text-gray-800 mt-1">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p>
                                                </div>
                                            )}
                                            {lead.competitor && (
                                                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                                    <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">{t('commercial.pipeline.competitor')}</p>
                                                    <p className="text-sm font-medium text-red-800 mt-1">{lead.competitor}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Comment */}
                                    {lead.comment && (
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('commercial.pipeline.comment')}</p>
                                            <p className="text-sm text-gray-700">{lead.comment}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'activities' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                    <button
                                        onClick={() => setShowActivityForm(!showActivityForm)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#33cbcc] text-[#33cbcc] font-medium hover:bg-[#33cbcc]/5 transition-colors"
                                    >
                                        <Plus size={16} />
                                        {t('commercial.detail.logActivity', 'Log new activity')}
                                    </button>

                                    <AnimatePresence>
                                        {showActivityForm && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 overflow-hidden sm"
                                            >
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className={labelCls}>{t('commercial.pipeline.activityType')}</label>
                                                        <select value={actForm.type} onChange={e => setActForm(p => ({ ...p, type: e.target.value as ActivityType }))} className={inputCls}>
                                                            {ACTIVITY_TYPES.map(at => <option key={at} value={at}>{t(`commercial.pipeline.activityTypes.${at}`)}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={labelCls}>{t('commercial.pipeline.activityDate')}</label>
                                                        <input type="date" value={actForm.date} onChange={e => setActForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>{t('commercial.pipeline.activityDescription')}</label>
                                                    <textarea value={actForm.description} onChange={e => setActForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder={t('commercial.pipeline.activityDescriptionPlaceholder')} className={inputCls + ' resize-none'} />
                                                </div>
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                        {t('common.cancel', 'Cancel')}
                                                    </button>
                                                    <button
                                                        onClick={handleLogActivity}
                                                        disabled={!actForm.description.trim() || createActivity.isPending}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#33cbcc] rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors md [#33cbcc]/20"
                                                    >
                                                        {createActivity.isPending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MessageSquare size={12} />}
                                                        {t('commercial.detail.save', 'Save Activity')}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-3 pt-2">
                                        {activities.length === 0 ? (
                                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                                <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-400">{t('commercial.detail.noActivities', 'No activities yet')}</p>
                                            </div>
                                        ) : (
                                            activities.map(act => (
                                                <div key={act.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl sm hover:border-[#33cbcc]/30 transition-colors">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 text-gray-500">
                                                        <ActivityTypeIcon type={act.type} size={18} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-gray-800">
                                                                    {t(`commercial.pipeline.activityTypes.${act.type}`)}
                                                                </span>
                                                                <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                                                                    {new Date(act.date).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{act.description}</p>
                                                        {act.result && <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100"><span className="font-semibold">{t('commercial.pipeline.activityResult', 'Result')}:</span> {act.result}</div>}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'tasks' && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                    {linkedTasks && linkedTasks.length > 0 ? (
                                        <div className="grid gap-3">
                                            {linkedTasks.map((task: any) => {
                                                const stateColors: Record<string, string> = {
                                                    CREATED: 'bg-gray-100 text-gray-600',
                                                    ASSIGNED: 'bg-blue-50 text-blue-600',
                                                    IN_PROGRESS: 'bg-amber-50 text-amber-600',
                                                    BLOCKED: 'bg-red-50 text-red-600',
                                                    COMPLETED: 'bg-green-50 text-green-600',
                                                    REVIEWED: 'bg-indigo-50 text-indigo-600',
                                                };
                                                return (
                                                    <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl sm">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border border-current ${stateColors[task.state] || 'bg-gray-100 text-gray-600'}`}>
                                                                {task.state}
                                                            </span>
                                                            <span className="text-sm font-medium text-gray-800 truncate">{task.title}</span>
                                                        </div>
                                                        {task.dueDate && (
                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                                                                <Clock size={12} />
                                                                {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                            <ListTodo size={24} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-400">{t('commercial.leads.noLinkedTasks', 'Aucune tache liee')}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0">
                            {isManager && !lead.clientId && lead.saleStage !== 'GAGNE' && lead.saleStage !== 'PERDU' && (
                                <button
                                    onClick={() => setShowConvertModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors md green-500/20"
                                >
                                    <CheckCircle2 size={16} />
                                    {t('commercial.leads.convert')}
                                </button>
                            )}
                        </div>
                    </>
                )}

                {/* Convert Modal */}
                <AnimatePresence>
                    {showConvertModal && lead && (
                        <ConvertToClientModal
                            lead={lead}
                            onClose={() => setShowConvertModal(false)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
}
