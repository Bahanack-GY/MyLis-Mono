import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { CallIcon, Mail01Icon, Location01Icon, UserGroupIcon, ComputerIcon, RefreshIcon, Activity01Icon, Add01Icon, Search01Icon, ArrowLeft01Icon, ArrowRight01Icon, Clock01Icon, Alert02Icon, Tick01Icon, ArrowUpRight01Icon, Calendar01Icon, Message02Icon, Cancel01Icon, Loading02Icon } from 'hugeicons-react';
import { useLeads } from '../../api/commercial/hooks';
import { useLeadActivities, useCreateLeadActivity } from '../../api/commercial/hooks';
import { useAuth } from '../../contexts/AuthContext';
import type { Lead, LeadActivity, ActivityType, ActivityStatus, HealthStatus } from '../../api/commercial/types';
import { STAGE_COLORS } from '../../components/commercial/StageChangeModal';

/* ── Constants ──────────────────────────────────────────── */

const ACTIVITY_TYPE_META: Record<ActivityType, { icon: any; label: string; color: string }> = {
    VISITE_PROSPECT: { icon: Location01Icon,       label: 'Visite Prospect',  color: '#33cbcc' },
    VISITE_CLIENT:   { icon: UserGroupIcon,        label: 'Visite Client',    color: '#33cbcc' },
    APPEL:           { icon: CallIcon,        label: 'Appel',            color: '#283852' },
    EMAIL:           { icon: Mail01Icon,         label: 'Email',            color: '#283852' },
    REUNION:         { icon: UserGroupIcon,        label: 'Réunion',          color: '#283852' },
    DEMO:            { icon: ComputerIcon,      label: 'Démo',             color: '#33cbcc' },
    RELANCE:         { icon: RefreshIcon,    label: 'Relance',          color: '#283852' },
    AUTRE:           { icon: Activity01Icon,     label: 'Autre',            color: '#6b7280' },
};

const HEALTH_META: Record<HealthStatus, { label: string; color: string; dot: string }> = {
    HEALTHY:          { label: 'Actif',           color: 'text-[#33cbcc]',  dot: 'bg-[#33cbcc]' },
    GOOD:             { label: 'Bien',            color: 'text-[#33cbcc]',  dot: 'bg-[#33cbcc]' },
    NEEDS_FOLLOWUP:   { label: 'À relancer',      color: 'text-[#283852]',  dot: 'bg-[#283852]' },
    ATTENTION_NEEDED: { label: 'Attention',       color: 'text-[#283852]',  dot: 'bg-[#283852]' },
    AT_RISK:          { label: 'Urgent',          color: 'text-[#283852]',  dot: 'bg-[#283852]' },
    NEW:              { label: 'Nouveau',         color: 'text-[#283852]',  dot: 'bg-[#283852]/60' },
};

const HEALTH_ORDER: Record<HealthStatus, number> = {
    AT_RISK: 0, ATTENTION_NEEDED: 1, NEEDS_FOLLOWUP: 2, GOOD: 3, HEALTHY: 4, NEW: 5,
};

const STAGE_LABEL: Record<string, string> = {
    PROSPECTION: 'Prospection', QUALIFICATION: 'Qualification',
    PROPOSITION: 'Proposition', NEGOCIATION: 'Négociation',
    CLOSING: 'Closing', GAGNE: 'Gagné', PERDU: 'Perdu',
};

/* ── Helpers ────────────────────────────────────────────── */

function getLeadHealth(lead: Lead): HealthStatus {
    const now = new Date();
    if (lead.nextActionDeadline && new Date(lead.nextActionDeadline) < now) return 'AT_RISK';
    if (!lead.lastActionDate) return 'NEW';
    const days = Math.floor((now.getTime() - new Date(lead.lastActionDate).getTime()) / 86400000);
    if (days > 30) return 'ATTENTION_NEEDED';
    if (days > 14) return 'NEEDS_FOLLOWUP';
    if (days <= 7) return 'HEALTHY';
    return 'GOOD';
}

function formatDate(d: string | null | undefined) {
    if (!d) return null;
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysAgo(d: string | null | undefined): string | null {
    if (!d) return null;
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    return `il y a ${days}j`;
}

/* ── Log Activity01Icon Modal ─────────────────────────────────── */

function LogActivityModal({
    lead,
    employeeId,
    onClose,
}: {
    lead: Lead;
    employeeId: string;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    const create = useCreateLeadActivity();

    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        type: 'APPEL' as ActivityType,
        activityStatus: 'COMPLETED' as ActivityStatus,
        date: today,
        description: '',
        result: '',
        nextAction: '',
        nextActionDeadline: '',
        cost: '',
        location: '',
    });

    const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

    const submit = () => {
        create.mutate({
            leadId: lead.id,
            employeeId,
            type: form.type,
            activityStatus: form.activityStatus,
            date: form.date,
            description: form.description || undefined,
            result: form.result || undefined,
            nextAction: form.nextAction || undefined,
            cost: form.cost ? Number(form.cost) : undefined,
            location: form.location || undefined,
        }, { onSuccess: onClose });
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
            />
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                onClick={e => e.stopPropagation()}
                className="fixed inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-[60] overflow-hidden"
            >
                <div className="h-1.5 bg-[#33cbcc]" />
                <div className="p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">Enregistrer une activité</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{lead.company}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                            <Cancel01Icon size={16} />
                        </button>
                    </div>

                    {/* Type + Status row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Type</label>
                            <select value={form.type} onChange={e => set('type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc]">
                                {(Object.keys(ACTIVITY_TYPE_META) as ActivityType[]).map(t => (
                                    <option key={t} value={t}>{ACTIVITY_TYPE_META[t].label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Statut</label>
                            <select value={form.activityStatus} onChange={e => set('activityStatus', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc]">
                                <option value="COMPLETED">Réalisé</option>
                                <option value="PLANNED">Planifié</option>
                                <option value="CANCELLED">Annulé</option>
                            </select>
                        </div>
                    </div>

                    {/* Date + Location row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Date</label>
                            <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc]" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Lieu</label>
                            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
                                placeholder="ex: Bureau client"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc] placeholder-gray-300" />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Description</label>
                        <textarea value={form.description} onChange={e => set('description', e.target.value)}
                            rows={2} placeholder="Décrivez l'activité..."
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc] placeholder-gray-300 resize-none" />
                    </div>

                    {/* Result (only if completed) */}
                    {form.activityStatus === 'COMPLETED' && (
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Résultat</label>
                            <textarea value={form.result} onChange={e => set('result', e.target.value)}
                                rows={2} placeholder="Quel a été le résultat ?"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc] placeholder-gray-300 resize-none" />
                        </div>
                    )}

                    {/* Next action + deadline */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Prochaine action</label>
                            <input type="text" value={form.nextAction} onChange={e => set('nextAction', e.target.value)}
                                placeholder="ex: Envoyer proposition"
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc] placeholder-gray-300" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Échéance</label>
                            <input type="date" value={form.nextActionDeadline} onChange={e => set('nextActionDeadline', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc]" />
                        </div>
                    </div>

                    {/* Cost */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Coût (FCFA)</label>
                        <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                            min="0" placeholder="0"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#33cbcc] placeholder-gray-300" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                        <button onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            Annuler
                        </button>
                        <button onClick={submit} disabled={create.isPending || !form.date}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {create.isPending && <Loading02Icon size={14} className="animate-spin" />}
                            Enregistrer
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

/* ── Activity01Icon Item ──────────────────────────────────────── */

function ActivityItem({ activity }: { activity: LeadActivity }) {
    const meta = ACTIVITY_TYPE_META[activity.type] || ACTIVITY_TYPE_META.AUTRE;
    const Icon = meta.icon;
    const isCompleted = activity.activityStatus === 'COMPLETED';
    const isPlanned = activity.activityStatus === 'PLANNED';

    return (
        <div className="flex gap-3">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.color + '20' }}>
                    <Icon size={14} style={{ color: meta.color }} />
                </div>
                <div className="w-px flex-1 bg-gray-100 mt-1" />
            </div>
            <div className="pb-4 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-gray-700">{meta.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            isCompleted ? 'bg-[#283852] text-white' :
                            isPlanned   ? 'bg-[#283852]/10 text-[#283852]' :
                                          'bg-gray-100 text-gray-500'
                        }`}>
                            {isCompleted ? 'Réalisé' : isPlanned ? 'Planifié' : 'Annulé'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatDate(activity.date)}</span>
                    </div>
                </div>
                {activity.description && (
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{activity.description}</p>
                )}
                {activity.result && (
                    <p className="text-xs text-gray-500 mt-1 italic">→ {activity.result}</p>
                )}
                {activity.nextAction && (
                    <p className="text-xs text-[#33cbcc] mt-1 font-medium">↪ {activity.nextAction}</p>
                )}
                {activity.employee && (
                    <p className="text-[10px] text-gray-400 mt-1">
                        {activity.employee.firstName} {activity.employee.lastName}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ── Lead Card ──────────────────────────────────────────── */

function LeadCard({
    lead,
    selected,
    onSelect,
    onLog,
}: {
    lead: Lead;
    selected: boolean;
    onSelect: () => void;
    onLog: (e: React.MouseEvent) => void;
}) {
    const health = getLeadHealth(lead);
    const healthMeta = HEALTH_META[health];
    const stageColors = STAGE_COLORS[lead.saleStage];
    const isOverdue = lead.nextActionDeadline && new Date(lead.nextActionDeadline) < new Date();
    const isTerminal = lead.saleStage === 'GAGNE' || lead.saleStage === 'PERDU';

    return (
        <motion.button
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSelect}
            className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                selected ? 'bg-[#33cbcc]/5 border-l-2 border-l-[#33cbcc]' : 'border-l-2 border-l-transparent'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${healthMeta.dot}`} />
                        <span className="text-sm font-semibold text-gray-800 truncate">{lead.company}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${stageColors?.bg} ${stageColors?.text} ${stageColors?.border}`}>
                            {STAGE_LABEL[lead.saleStage] || lead.saleStage}
                        </span>
                        <span className={`text-[10px] font-semibold ${healthMeta.color}`}>{healthMeta.label}</span>
                    </div>
                </div>
                {!isTerminal && (
                    <button
                        onClick={onLog}
                        className="shrink-0 w-7 h-7 rounded-lg bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 text-[#33cbcc] flex items-center justify-center transition-colors"
                        title="Enregistrer une activité"
                    >
                        <Add01Icon size={13} />
                    </button>
                )}
            </div>

            {lead.nextAction && (
                <div className={`flex items-center gap-1 mt-2 text-[11px] ${isOverdue ? 'text-[#283852]' : 'text-gray-500'}`}>
                    {isOverdue ? <Alert02Icon size={10} className="shrink-0" /> : <Calendar01Icon size={10} className="shrink-0" />}
                    <span className="truncate">{lead.nextAction}</span>
                    {lead.nextActionDeadline && (
                        <span className="shrink-0 font-medium ml-auto">{formatDate(lead.nextActionDeadline)}</span>
                    )}
                </div>
            )}

            {lead.lastActionDate && (
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock01Icon size={9} className="shrink-0" />
                    Dernier contact : {daysAgo(lead.lastActionDate)}
                </p>
            )}
        </motion.button>
    );
}

/* ── Activity01Icon Panel ─────────────────────────────────────── */

function ActivityPanel({
    lead,
    employeeId,
    onBack,
    onLog,
}: {
    lead: Lead;
    employeeId: string;
    onBack: () => void;
    onLog: () => void;
}) {
    const { data: activitiesData, isLoading } = useLeadActivities({ leadId: lead.id, limit: 50 });
    const activities: LeadActivity[] = activitiesData?.data || [];
    const health = getLeadHealth(lead);
    const healthMeta = HEALTH_META[health];
    const stageColors = STAGE_COLORS[lead.saleStage];
    const isTerminal = lead.saleStage === 'GAGNE' || lead.saleStage === 'PERDU';

    const primaryContact = lead.contacts?.[0];

    return (
        <div className="flex flex-col h-full">
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <ArrowLeft01Icon size={16} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900 truncate">{lead.company}</h3>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0 ${stageColors?.bg} ${stageColors?.text} ${stageColors?.border}`}>
                                {STAGE_LABEL[lead.saleStage]}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs font-medium ${healthMeta.color}`}>{healthMeta.label}</span>
                            {lead.city && <span className="text-xs text-gray-400">· {lead.city}</span>}
                        </div>
                    </div>
                    {!isTerminal && (
                        <button
                            onClick={onLog}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#33cbcc] text-white text-xs font-semibold hover:bg-[#2bb5b6] transition-colors"
                        >
                            <Add01Icon size={13} />
                            <span className="hidden sm:inline">Activité</span>
                        </button>
                    )}
                </div>

                {/* Quick contact links */}
                {primaryContact && (
                    <div className="flex items-center gap-3 mt-3">
                        {primaryContact.phone && (
                            <a href={`tel:${primaryContact.phone}`}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc] transition-colors">
                                <CallIcon size={11} />
                                {primaryContact.phone}
                            </a>
                        )}
                        {primaryContact.email && (
                            <a href={`mailto:${primaryContact.email}`}
                                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#33cbcc] transition-colors">
                                <Mail01Icon size={11} />
                                <span className="truncate max-w-[140px]">{primaryContact.email}</span>
                            </a>
                        )}
                    </div>
                )}

                {/* Next action banner */}
                {lead.nextAction && (
                    <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${
                        lead.nextActionDeadline && new Date(lead.nextActionDeadline) < new Date()
                            ? 'bg-[#283852]/10 text-[#283852]'
                            : 'bg-[#33cbcc]/10 text-[#33cbcc]'
                    }`}>
                        {lead.nextActionDeadline && new Date(lead.nextActionDeadline) < new Date()
                            ? <Alert02Icon size={12} className="shrink-0" />
                            : <Calendar01Icon size={12} className="shrink-0" />
                        }
                        <span className="font-medium truncate">{lead.nextAction}</span>
                        {lead.nextActionDeadline && (
                            <span className="shrink-0 font-semibold ml-auto">{formatDate(lead.nextActionDeadline)}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Activity01Icon timeline */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loading02Icon size={22} className="animate-spin text-[#33cbcc]" />
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                            <Message02Icon size={22} className="text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-400">Aucune activité enregistrée</p>
                        {!isTerminal && (
                            <button onClick={onLog}
                                className="text-sm text-[#33cbcc] font-semibold hover:underline">
                                Enregistrer la première activité
                            </button>
                        )}
                    </div>
                ) : (
                    <div>
                        {activities.map(act => (
                            <ActivityItem key={act.id} activity={act} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ── Main Page ──────────────────────────────────────────── */

export default function LeadFollowUp() {
    const { t } = useTranslation();
    const { user, role } = useAuth();
    const employeeId = user?.employeeId ?? '';

    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [logFor, setLogFor] = useState<Lead | null>(null);
    const [mobileShowPanel, setMobileShowPanel] = useState(false);

    const isCommercial = role === 'COMMERCIAL';

    const filters = useMemo(() => ({
        page,
        limit: 10,
        ...(stageFilter ? { saleStage: stageFilter } : {}),
        ...(search ? { search } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
    }), [page, stageFilter, search, dateFrom, dateTo]);

    const { data: leadsData, isLoading } = useLeads(filters);

    const leads: Lead[] = leadsData?.data || [];
    const totalPages = leadsData?.totalPages ?? 1;
    const total = leadsData?.total ?? 0;

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [stageFilter, search, dateFrom, dateTo]);

    const sortedLeads = useMemo(() => {
        return [...leads].sort((a, b) => {
            const ha = HEALTH_ORDER[getLeadHealth(a)];
            const hb = HEALTH_ORDER[getLeadHealth(b)];
            if (ha !== hb) return ha - hb;
            const da = a.lastActionDate ? new Date(a.lastActionDate).getTime() : 0;
            const db = b.lastActionDate ? new Date(b.lastActionDate).getTime() : 0;
            return da - db;
        });
    }, [leads]);

    const urgentCount = sortedLeads.filter(l => {
        const h = getLeadHealth(l);
        return h === 'AT_RISK' || h === 'ATTENTION_NEEDED';
    }).length;

    const selectLead = (lead: Lead) => {
        setSelectedLead(lead);
        setMobileShowPanel(true);
    };

    const openLog = (lead: Lead) => setLogFor(lead);

    const stages = ['PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'CLOSING', 'GAGNE', 'PERDU'];

    return (
        <div className="h-[calc(100vh-4rem)] md:h-screen flex flex-col bg-gray-50">
            {/* ── Header ── */}
            <div className="bg-white border-b border-gray-100 px-5 py-3 shrink-0 space-y-2">
                <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-bold text-gray-800 truncate">
                            {t('commercial.followUp.title', 'Suivi des leads')}
                        </h1>
                        {urgentCount > 0 && (
                            <p className="text-xs text-[#283852] font-medium mt-0.5">
                                {urgentCount} lead{urgentCount > 1 ? 's' : ''} nécessite{urgentCount > 1 ? 'nt' : ''} attention
                            </p>
                        )}
                    </div>
                    {/* Stage filter */}
                    <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                        className="hidden sm:block px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors">
                        <option value="">Tous les stades</option>
                        {stages.map(s => (
                            <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                        ))}
                    </select>
                </div>
                {/* Date filters */}
                <div className="flex items-center gap-2">
                    <Calendar01Icon size={12} className="text-gray-400 shrink-0" />
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700 focus:outline-none focus:border-[#33cbcc] transition-colors"
                    />
                    {(dateFrom || dateTo) && (
                        <button
                            onClick={() => { setDateFrom(''); setDateTo(''); }}
                            className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Effacer les dates"
                        >
                            <Cancel01Icon size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* ── Lead List ── */}
                <div className={`${mobileShowPanel ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-80 lg:w-96 shrink-0 bg-white border-r border-gray-100 overflow-hidden`}>
                    {/* Search01Icon */}
                    <div className="px-4 py-3 border-b border-gray-50">
                        <div className="relative">
                            <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Rechercher un lead..."
                                className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Stage filter mobile */}
                    <div className="sm:hidden px-4 py-2 border-b border-gray-50">
                        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc]">
                            <option value="">Tous les stades</option>
                            {stages.map(s => (
                                <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lead count */}
                    <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between">
                        <p className="text-[11px] text-gray-400 font-medium">{total} lead{total !== 1 ? 's' : ''}</p>
                        {totalPages > 1 && (
                            <p className="text-[11px] text-gray-400">Page {page}/{totalPages}</p>
                        )}
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex justify-center py-16">
                                <Loading02Icon size={22} className="animate-spin text-[#33cbcc]" />
                            </div>
                        ) : sortedLeads.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
                                <ArrowUpRight01Icon size={28} className="text-gray-200" />
                                <p className="text-sm text-gray-400">Aucun lead trouvé</p>
                            </div>
                        ) : (
                            <motion.div layout>
                                {sortedLeads.map(lead => (
                                    <LeadCard
                                        key={lead.id}
                                        lead={lead}
                                        selected={selectedLead?.id === lead.id}
                                        onSelect={() => selectLead(lead)}
                                        onLog={e => { e.stopPropagation(); openLog(lead); }}
                                    />
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="shrink-0 px-4 py-2 border-t border-gray-100 flex items-center justify-between gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ArrowLeft01Icon size={13} />
                                Préc.
                            </button>
                            <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Suiv.
                                <ArrowRight01Icon size={13} />
                            </button>
                        </div>
                    )}

                </div>

                {/* ── Activity01Icon Panel ── */}
                <div className={`${!mobileShowPanel ? 'hidden' : 'flex'} md:flex flex-1 flex-col overflow-hidden bg-white`}>
                    {selectedLead ? (
                        <ActivityPanel
                            lead={selectedLead}
                            employeeId={employeeId}
                            onBack={() => setMobileShowPanel(false)}
                            onLog={() => openLog(selectedLead)}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <Tick01Icon size={28} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">Sélectionner un lead</p>
                            <p className="text-xs text-gray-400">Cliquez sur un lead pour voir ses activités et enregistrer un suivi</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Log Activity01Icon Modal ── */}
            {logFor && (
                <LogActivityModal
                    lead={logFor}
                    employeeId={employeeId}
                    onClose={() => setLogFor(null)}
                />
            )}
        </div>
    );
}
