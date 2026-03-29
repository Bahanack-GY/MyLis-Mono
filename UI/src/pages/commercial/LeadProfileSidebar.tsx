import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Pencil, X, Check, Trophy, Frown,
    CheckCircle2, Phone, Mail, MapPin, Building2, Clock,
    MessageSquare, User, ListTodo, FileText,
    PhoneCall, ScanSearch, MailOpen, Users, Monitor, RefreshCw, MoreHorizontal,
    ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUpdateLead, useLead, useLeadActivities, useCreateLeadActivity } from '../../api/commercial/hooks';
import { useTasksByLead } from '../../api/tasks/hooks';
import type { Lead, CreateLeadActivityDto, SaleStage, ActivityType } from '../../api/commercial/types';
import { useAuth } from '../../contexts/AuthContext';
import ConvertToClientModal from '../../components/ConvertToClientModal';
import StageChangeModal, { isForwardMove, STAGE_ORDER } from '../../components/commercial/StageChangeModal';

/* ── Constants ─────────────────────────────────────────────── */

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; ring: string }> = {
    PROSPECTION: { bg: 'bg-indigo-500',  text: 'text-indigo-700',  border: 'border-indigo-300',  ring: 'ring-indigo-200'  },
    QUALIFICATION:{ bg: 'bg-purple-500', text: 'text-purple-700',  border: 'border-purple-300',  ring: 'ring-purple-200'  },
    PROPOSITION:  { bg: 'bg-amber-500',  text: 'text-amber-700',   border: 'border-amber-300',   ring: 'ring-amber-200'   },
    NEGOCIATION:  { bg: 'bg-blue-500',   text: 'text-blue-700',    border: 'border-blue-300',    ring: 'ring-blue-200'    },
    CLOSING:      { bg: 'bg-emerald-500',text: 'text-emerald-700', border: 'border-emerald-300', ring: 'ring-emerald-200' },
    GAGNE:        { bg: 'bg-green-500',  text: 'text-green-700',   border: 'border-green-300',   ring: 'ring-green-200'   },
    PERDU:        { bg: 'bg-red-500',    text: 'text-red-700',     border: 'border-red-300',     ring: 'ring-red-200'     },
};

const PIPELINE_STAGES: SaleStage[] = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'CLOSING'];

const priorityColors: Record<string, string> = {
    HOT: 'bg-red-100 text-red-700',
    WARM: 'bg-orange-100 text-orange-700',
    COLD: 'bg-blue-100 text-blue-700',
};

const ACTIVITY_TYPES: ActivityType[] = [
    'VISITE_CLIENT', 'VISITE_PROSPECT', 'APPEL', 'EMAIL', 'REUNION', 'DEMO', 'RELANCE', 'AUTRE',
];

const ACTIVITY_TYPE_ICONS: Record<string, LucideIcon> = {
    VISITE_CLIENT: Building2, VISITE_PROSPECT: ScanSearch, APPEL: PhoneCall,
    EMAIL: MailOpen, REUNION: Users, DEMO: Monitor, RELANCE: RefreshCw, AUTRE: FileText,
};

const ActivityTypeIcon = ({ type, size = 16 }: { type: string; size?: number }) => {
    const Icon = ACTIVITY_TYPE_ICONS[type] ?? MoreHorizontal;
    return <Icon size={size} />;
};

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

/* ── Stage Roadmap ─────────────────────────────────────────── */

const StageRoadmap = ({
    currentStage,
    onStageClick,
    isPending,
}: {
    currentStage: SaleStage;
    onStageClick: (s: SaleStage) => void;
    isPending: boolean;
}) => {
    const { t } = useTranslation();
    const isTerminal = currentStage === 'GAGNE' || currentStage === 'PERDU';
    const currentIdx = PIPELINE_STAGES.indexOf(currentStage as SaleStage);

    // Short labels for mobile
    const shortLabels: Record<string, string> = {
        PROSPECTION: 'Prosp.', QUALIFICATION: 'Qualif.', PROPOSITION: 'Prop.',
        NEGOCIATION: 'Négo.', CLOSING: 'Closing',
    };

    return (
        <div className="space-y-3">
            {/* ── Main pipeline stepper ── */}
            <div className="flex items-start gap-0">
                {PIPELINE_STAGES.map((stage, i) => {
                    const isDone = currentStage === 'GAGNE' || (!isTerminal && currentIdx > i);
                    const isCurrent = !isTerminal && currentIdx === i;
                    const canClick = !isTerminal && isForwardMove(currentStage, stage);
                    const colors = STAGE_COLORS[stage];

                    return (
                        <div key={stage} className="flex-1 flex flex-col items-center relative">
                            {/* Connector line (before step, except first) */}
                            {i > 0 && (
                                <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 transition-colors ${
                                    isDone || (isCurrent && i > 0) ? 'bg-[#33cbcc]' : 'bg-gray-200'
                                }`} />
                            )}

                            {/* Step circle */}
                            <button
                                onClick={() => canClick && !isPending && onStageClick(stage)}
                                disabled={!canClick || isPending || isCurrent}
                                aria-label={t(`commercial.pipeline.stages.${stage}`)}
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                                    isDone
                                        ? 'bg-[#33cbcc] border-[#33cbcc] text-white'
                                        : isCurrent
                                        ? `bg-white border-[#33cbcc] text-[#33cbcc] ring-4 ${colors.ring} shadow-sm`
                                        : canClick
                                        ? 'bg-white border-gray-300 text-gray-400 hover:border-gray-400 hover:shadow cursor-pointer'
                                        : 'bg-white border-gray-200 text-gray-300 cursor-not-allowed'
                                }`}
                            >
                                {isDone ? <Check size={13} strokeWidth={3} /> : (
                                    <span className="text-[11px] font-bold">{i + 1}</span>
                                )}
                            </button>

                            {/* Label */}
                            <span className={`mt-1.5 text-center leading-tight transition-colors ${
                                isCurrent ? 'text-[#33cbcc] font-bold' :
                                isDone ? 'text-gray-500' : 'text-gray-400'
                            }`}>
                                <span className="text-[9px] sm:hidden block">{shortLabels[stage]}</span>
                                <span className="text-[10px] hidden sm:block">{t(`commercial.pipeline.stages.${stage}`)}</span>
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* ── Terminal outcomes ── */}
            {isTerminal ? (
                <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold ${
                    currentStage === 'GAGNE'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {currentStage === 'GAGNE'
                        ? <><Trophy size={15} /> {t('commercial.pipeline.stages.GAGNE')} — {t('commercial.convert.stageLocked', 'Verrouillé')}</>
                        : <><Frown size={15} /> {t('commercial.pipeline.stages.PERDU')} — {t('commercial.convert.stageLocked', 'Verrouillé')}</>
                    }
                </div>
            ) : (
                <div className="flex gap-2">
                    {/* Next stage shortcut */}
                    {currentIdx < PIPELINE_STAGES.length - 1 && (
                        <button
                            onClick={() => onStageClick(PIPELINE_STAGES[currentIdx + 1])}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#33cbcc]/10 text-[#33cbcc] text-xs font-semibold hover:bg-[#33cbcc]/20 transition-colors border border-[#33cbcc]/20"
                        >
                            <ChevronRight size={13} />
                            {t('commercial.stageModal.advanceTo', 'Avancer →')} {t(`commercial.pipeline.stages.${PIPELINE_STAGES[currentIdx + 1]}`)}
                        </button>
                    )}
                    {currentIdx === PIPELINE_STAGES.length - 1 && (
                        <button
                            onClick={() => onStageClick('GAGNE')}
                            disabled={isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-green-50 text-green-700 text-xs font-semibold hover:bg-green-100 transition-colors border border-green-200"
                        >
                            <Trophy size={13} />
                            {t('commercial.pipeline.stages.GAGNE')}
                        </button>
                    )}
                    {/* Mark as lost */}
                    <button
                        onClick={() => onStageClick('PERDU')}
                        disabled={isPending}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-medium text-red-400 hover:bg-red-50 transition-colors border border-red-100"
                    >
                        <Frown size={13} />
                        <span className="hidden sm:inline">{t('commercial.pipeline.stages.PERDU')}</span>
                    </button>
                </div>
            )}
        </div>
    );
};

/* ── Main component ────────────────────────────────────────── */

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
    const [pendingStage, setPendingStage] = useState<SaleStage | null>(null);

    const [actForm, setActForm] = useState({
        type: 'APPEL' as ActivityType,
        date: new Date().toISOString().slice(0, 10),
        description: '', result: '',
        activityStatus: 'COMPLETED' as 'PLANNED' | 'COMPLETED' | 'CANCELLED',
        cost: '', location: '',
    });

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleLogActivity = () => {
        if (!actForm.description.trim() || !lead) return;
        const dto: CreateLeadActivityDto = {
            leadId: lead.id,
            employeeId: user?.employeeId || lead.assignedToId || '',
            type: actForm.type, date: actForm.date,
            description: actForm.description, result: actForm.result,
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
        setPendingStage(stage);
    };

    const confirmStageChange = () => {
        if (!lead || !pendingStage) return;
        if (pendingStage === 'GAGNE') {
            setPendingStage(null);
            setShowConvertModal(true);
            return;
        }
        updateLead.mutate({ id: lead.id, data: { saleStage: pendingStage } }, {
            onSuccess: () => setPendingStage(null),
        });
    };

    const inputCls = 'w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all';
    const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

    const tabs = [
        { key: 'details',    icon: FileText,     label: t('common.details', 'Détails'),                        count: null },
        { key: 'activities', icon: MessageSquare, label: t('commercial.detail.activities', 'Activités'),        count: activities.length },
        { key: 'tasks',      icon: ListTodo,      label: t('commercial.leads.linkedTasks', 'Tâches'),           count: linkedTasks?.length || 0 },
    ] as const;

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Modal — bottom sheet on mobile, centered on desktop */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
            >
                {isLoading || !lead ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* ── Header ── */}
                        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0 space-y-4">
                            {/* Company + actions */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                        <span className="text-xs font-mono text-[#33cbcc] font-bold">{lead.code}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[lead.priority] ?? 'bg-gray-100 text-gray-700'}`}>
                                            {t(`commercial.leads.priorities.${lead.priority}`)}
                                        </span>
                                        {lead.clientId && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                                <CheckCircle2 size={10} /> {t('commercial.leads.converted', 'Converti')}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="text-lg font-bold text-gray-900 truncate">{lead.company}</h2>
                                    {(lead.city || lead.country) && (
                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={11} />
                                            {[lead.city, lead.country].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {/* Quick call/email if primary contact exists */}
                                    {lead.contacts?.[0]?.phone && (
                                        <a href={`tel:${lead.contacts[0].phone}`}
                                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                            title={lead.contacts[0].phone}>
                                            <Phone size={16} />
                                        </a>
                                    )}
                                    {lead.contacts?.[0]?.email && (
                                        <a href={`mailto:${lead.contacts[0].email}`}
                                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                            title={lead.contacts[0].email}>
                                            <Mail size={16} />
                                        </a>
                                    )}
                                    <button
                                        onClick={() => { onClose(); onEdit(lead); }}
                                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                        title={t('commercial.leads.editLead')}
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Key metrics row */}
                            <div className="flex gap-2">
                                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                    <p className="text-[9px] uppercase font-semibold text-gray-400 tracking-wider">{t('commercial.leads.potentialRevenue')}</p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{formatFCFA(lead.potentialRevenue || 0)}</p>
                                </div>
                                <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                    <p className="text-[9px] uppercase font-semibold text-gray-400 tracking-wider">{t('commercial.pipeline.successRate')}</p>
                                    <p className="text-sm font-bold text-gray-800 mt-0.5">{lead.successRate ?? 0}%</p>
                                </div>
                                {lead.assignedTo && (
                                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 min-w-0">
                                        <p className="text-[9px] uppercase font-semibold text-gray-400 tracking-wider">{t('commercial.leads.assignedTo')}</p>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{lead.assignedTo.firstName} {lead.assignedTo.lastName}</p>
                                    </div>
                                )}
                            </div>

                            {/* Stage roadmap */}
                            <StageRoadmap
                                currentStage={lead.saleStage}
                                onStageClick={handleStageChange}
                                isPending={updateLead.isPending}
                            />
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex border-b border-gray-100 shrink-0 px-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-[#33cbcc] text-[#33cbcc]'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    <tab.icon size={14} />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    {tab.count !== null && tab.count > 0 && (
                                        <span className="bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 text-[10px] leading-none">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* ── Tab content ── */}
                        <div className="flex-1 min-h-0 overflow-y-auto p-5">
                            {/* Details tab */}
                            {activeTab === 'details' && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                                    {/* Needs */}
                                    {lead.needs && lead.needs.length > 0 ? (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.clientNeeds', 'Besoins')}</h3>
                                            {lead.needs.map(n => (
                                                <div key={n.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-3">
                                                    <p className="text-sm text-gray-700 flex-1">{n.description}</p>
                                                    {n.service && (
                                                        <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#33cbcc]/10 text-[#33cbcc] whitespace-nowrap">
                                                            {n.service.name}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : lead.clientNeeds ? (
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1.5">{t('commercial.leads.clientNeeds')}</p>
                                            <p className="text-sm text-gray-700">{lead.clientNeeds}</p>
                                        </div>
                                    ) : null}

                                    {/* Contacts */}
                                    {(lead.contacts && lead.contacts.length > 0) ? (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.sectionContact1', 'Contacts')}</h3>
                                            {lead.contacts.map(c => (
                                                <div key={c.id} className={`border rounded-xl p-3 space-y-2 ${c.isPrimary ? 'border-[#33cbcc]/30 bg-[#33cbcc]/5' : 'border-gray-100 bg-white'}`}>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                                        <User size={13} className="text-[#33cbcc] shrink-0" />
                                                        <span>{c.name}</span>
                                                        {c.role && <span className="text-gray-400 font-normal text-xs">({c.role})</span>}
                                                        {c.isPrimary && (
                                                            <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#33cbcc]/15 text-[#33cbcc]">
                                                                {t('commercial.leads.wizard.primary', 'Principal')}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-3">
                                                        {c.phone && (
                                                            <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc] transition-colors">
                                                                <Phone size={12} className="text-gray-400" />{c.phone}
                                                            </a>
                                                        )}
                                                        {c.email && (
                                                            <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc] transition-colors">
                                                                <Mail size={12} className="text-gray-400" />{c.email}
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : lead.contact1Name ? (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.sectionContact1')}</h3>
                                            <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                                                    <User size={13} className="text-[#33cbcc]" />
                                                    {lead.contact1Name} {lead.contact1Role && <span className="text-gray-400 font-normal text-xs">({lead.contact1Role})</span>}
                                                </div>
                                                {lead.contact1Phone && (
                                                    <a href={`tel:${lead.contact1Phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc]">
                                                        <Phone size={12} />{lead.contact1Phone}
                                                    </a>
                                                )}
                                                {lead.contact1Email && (
                                                    <a href={`mailto:${lead.contact1Email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc]">
                                                        <Mail size={12} />{lead.contact1Email}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : null}

                                    {/* Company info */}
                                    <div className="space-y-2">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('commercial.leads.sectionCompany', 'Entreprise')}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {lead.activitySector && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                                    <Building2 size={13} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{lead.activitySector}</span>
                                                </div>
                                            )}
                                            {lead.leadType && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                                    <User size={13} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{t(`commercial.leads.types.${lead.leadType}`, lead.leadType)}</span>
                                                </div>
                                            )}
                                            {(lead.city || lead.country) && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 sm:col-span-2">
                                                    <MapPin size={13} className="text-gray-400 shrink-0" />
                                                    <span className="truncate">{[lead.address, lead.city, lead.region, lead.country].filter(Boolean).join(', ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Competitor */}
                                    {lead.competitor && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-1">{t('commercial.pipeline.competitor')}</p>
                                            <p className="text-sm font-medium text-red-800">{lead.competitor}</p>
                                            {lead.competitorOffer && <p className="text-xs text-red-600 mt-1">{lead.competitorOffer}</p>}
                                        </div>
                                    )}

                                    {/* Comment */}
                                    {lead.comment && (
                                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('commercial.pipeline.comment')}</p>
                                            <p className="text-sm text-gray-700">{lead.comment}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* Activities tab */}
                            {activeTab === 'activities' && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                                    <button
                                        onClick={() => setShowActivityForm(!showActivityForm)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-[#33cbcc] text-[#33cbcc] font-medium text-sm hover:bg-[#33cbcc]/5 transition-colors"
                                    >
                                        <Plus size={15} />
                                        {t('commercial.detail.logActivity', 'Enregistrer une activité')}
                                    </button>

                                    <AnimatePresence>
                                        {showActivityForm && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 overflow-hidden"
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
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setShowActivityForm(false)} className="px-3 py-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                                        {t('common.cancel', 'Annuler')}
                                                    </button>
                                                    <button
                                                        onClick={handleLogActivity}
                                                        disabled={!actForm.description.trim() || createActivity.isPending}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#33cbcc] rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                                    >
                                                        {createActivity.isPending
                                                            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            : <MessageSquare size={12} />}
                                                        {t('commercial.detail.save', 'Enregistrer')}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="space-y-2 pt-1">
                                        {activities.length === 0 ? (
                                            <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
                                                <p className="text-sm text-gray-400">{t('commercial.detail.noActivities', 'Aucune activité')}</p>
                                            </div>
                                        ) : activities.map(act => (
                                            <div key={act.id} className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-[#33cbcc]/30 transition-colors">
                                                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100 text-gray-500">
                                                    <ActivityTypeIcon type={act.type} size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-sm font-bold text-gray-800">{t(`commercial.pipeline.activityTypes.${act.type}`)}</span>
                                                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md shrink-0 ml-2">
                                                            {new Date(act.date).toLocaleDateString('fr-FR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 leading-relaxed">{act.description}</p>
                                                    {act.result && <p className="mt-1.5 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100"><span className="font-semibold">Résultat:</span> {act.result}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Tasks tab */}
                            {activeTab === 'tasks' && (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                    {linkedTasks && linkedTasks.length > 0 ? linkedTasks.map((task: any) => {
                                        const stateColors: Record<string, string> = {
                                            CREATED: 'bg-gray-100 text-gray-600', ASSIGNED: 'bg-blue-50 text-blue-600',
                                            IN_PROGRESS: 'bg-amber-50 text-amber-600', BLOCKED: 'bg-red-50 text-red-600',
                                            COMPLETED: 'bg-green-50 text-green-600', REVIEWED: 'bg-indigo-50 text-indigo-600',
                                        };
                                        return (
                                            <div key={task.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0 ${stateColors[task.state] || 'bg-gray-100 text-gray-600'}`}>
                                                        {task.state}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-800 truncate">{task.title}</span>
                                                </div>
                                                {task.dueDate && (
                                                    <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 shrink-0 ml-2">
                                                        <Clock size={11} />
                                                        {new Date(task.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <ListTodo size={24} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-sm text-gray-400">{t('commercial.leads.noLinkedTasks', 'Aucune tâche liée')}</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* ── Footer ── */}
                        {isManager && !lead.clientId && lead.saleStage !== 'GAGNE' && lead.saleStage !== 'PERDU' && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                <button
                                    onClick={() => setShowConvertModal(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-sm shadow-green-500/20"
                                >
                                    <CheckCircle2 size={16} />
                                    {t('commercial.leads.convert')}
                                </button>
                            </div>
                        )}
                    </>
                )}

                {/* Convert Modal */}
                <AnimatePresence>
                    {showConvertModal && lead && (
                        <ConvertToClientModal lead={lead} onClose={() => setShowConvertModal(false)} />
                    )}
                </AnimatePresence>

                {/* Stage Change Confirmation Modal */}
                {pendingStage && lead && (
                    <StageChangeModal
                        from={lead.saleStage}
                        to={pendingStage}
                        companyName={lead.company}
                        isPending={updateLead.isPending}
                        onConfirm={confirmStageChange}
                        onCancel={() => setPendingStage(null)}
                    />
                )}
            </motion.div>
        </>
    );
}
