import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Search, Pencil, Trash2, X, Filter, ChevronLeft, ChevronRight,
    Eye, CheckCircle2, Phone, Mail, MapPin, Building2, Clock,
    MessageSquare, ArrowRightCircle, User, ListTodo,
    PhoneCall, ScanSearch, MailOpen, Users, Monitor, RefreshCw, FileText, MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLeads, useCreateLead, useUpdateLead, useDeleteLead, useLead, useLeadActivities, useCreateLeadActivity } from '../../api/commercial/hooks';
import { useTasksByLead } from '../../api/tasks/hooks';
import type { Lead, CreateLeadDto, CreateLeadActivityDto, LeadPriority, LeadStatus, LeadType, ActivityType } from '../../api/commercial/types';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../api/employees/hooks';
import ConvertToClientModal from '../../components/ConvertToClientModal';
import LeadProfileSidebar from './LeadProfileSidebar';

const priorityColors: Record<string, string> = {
    HOT: 'bg-red-100 text-red-700',
    WARM: 'bg-orange-100 text-orange-700',
    COLD: 'bg-blue-100 text-blue-700',
};

const statusColors: Record<string, string> = {
    NOUVEAU: 'bg-gray-100 text-gray-700',
    CONTACTE: 'bg-blue-100 text-blue-700',
    QUALIFIE: 'bg-purple-100 text-purple-700',
    PROPOSITION_ENVOYEE: 'bg-amber-100 text-amber-700',
    NEGOCIATION: 'bg-cyan-100 text-cyan-700',
    GAGNE: 'bg-green-100 text-green-700',
    PERDU: 'bg-red-100 text-red-700',
    EN_ATTENTE: 'bg-yellow-100 text-yellow-700',
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

const leadStatuses: LeadStatus[] = ['NOUVEAU', 'CONTACTE', 'QUALIFIE', 'PROPOSITION_ENVOYEE', 'NEGOCIATION', 'GAGNE', 'PERDU', 'EN_ATTENTE'];
const leadPriorities: LeadPriority[] = ['HOT', 'WARM', 'COLD'];
const leadTypes: LeadType[] = ['PROSPECT', 'CLIENT_EXISTANT', 'RECOMMANDATION', 'APPEL_ENTRANT', 'SALON', 'SITE_WEB', 'RESEAU_SOCIAL', 'PARTENAIRE'];

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const emptyForm: CreateLeadDto = {
    company: '',
    activitySector: '',
    clientNeeds: '',
    potentialRevenue: 0,
    source: '',
    leadType: 'PROSPECT',
    country: '',
    region: '',
    city: '',
    commune: '',
    postalCode: '',
    address: '',
    contact1Name: '',
    contact1Role: '',
    contact1Email: '',
    contact1Phone: '',
    contact2Name: '',
    contact2Role: '',
    contact2Email: '',
    contact2Phone: '',
    assignedToId: '',
    paymentDelay: 30,
    priority: 'WARM',
    leadStatus: 'NOUVEAU',
};



interface LeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
}

function LeadModal({ isOpen, onClose, lead }: LeadModalProps) {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isCommercial = role === 'COMMERCIAL';
    const createLead = useCreateLead();
    const updateLead = useUpdateLead();
    const { data: employees } = useEmployees();
    const [form, setForm] = useState<CreateLeadDto>(emptyForm);

    useEffect(() => {
        if (isOpen) {
            if (lead) {
                setForm({
                    company: lead.company,
                    activitySector: lead.activitySector ?? '',
                    clientNeeds: lead.clientNeeds ?? '',
                    potentialRevenue: lead.potentialRevenue ?? 0,
                    source: lead.source ?? '',
                    leadType: lead.leadType ?? 'PROSPECT',
                    country: lead.country ?? '',
                    region: lead.region ?? '',
                    city: lead.city ?? '',
                    commune: lead.commune ?? '',
                    postalCode: lead.postalCode ?? '',
                    address: lead.address ?? '',
                    contact1Name: lead.contact1Name ?? '',
                    contact1Role: lead.contact1Role ?? '',
                    contact1Email: lead.contact1Email ?? '',
                    contact1Phone: lead.contact1Phone ?? '',
                    contact2Name: lead.contact2Name ?? '',
                    contact2Role: lead.contact2Role ?? '',
                    contact2Email: lead.contact2Email ?? '',
                    contact2Phone: lead.contact2Phone ?? '',
                    assignedToId: lead.assignedToId ?? '',
                    paymentDelay: lead.paymentDelay ?? 30,
                    priority: lead.priority ?? 'WARM',
                    leadStatus: lead.leadStatus ?? 'NOUVEAU',
                });
            } else {
                setForm(emptyForm);
            }
        }
    }, [isOpen, lead]);

    const set = (key: keyof CreateLeadDto, value: any) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (lead) {
            updateLead.mutate({ id: lead.id, data: form }, { onSuccess: onClose });
        } else {
            createLead.mutate(form, { onSuccess: onClose });
        }
    };

    const inputCls =
        'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm';
    const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl 2xl z-50 p-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-gray-900">
                                {lead
                                    ? t('commercial.leads.editLead')
                                    : t('commercial.leads.addLead')}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* ── Section 1: Informations Entreprise ── */}
                            <fieldset>
                                <legend className="text-sm font-semibold text-gray-800 mb-3">
                                    {t('commercial.leads.sectionCompany')}
                                </legend>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.company')} *
                                        </label>
                                        <input
                                            required
                                            value={form.company}
                                            onChange={e => set('company', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.activitySector')}
                                        </label>
                                        <input
                                            value={form.activitySector}
                                            onChange={e => set('activitySector', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>
                                            {t('commercial.leads.clientNeeds')}
                                        </label>
                                        <textarea
                                            value={form.clientNeeds}
                                            onChange={e => set('clientNeeds', e.target.value)}
                                            rows={2}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.potentialRevenue')}
                                        </label>
                                        <input
                                            type="number"
                                            value={form.potentialRevenue}
                                            onChange={e =>
                                                set('potentialRevenue', Number(e.target.value))
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.leadType')}
                                        </label>
                                        <select
                                            value={form.leadType}
                                            onChange={e =>
                                                set('leadType', e.target.value as LeadType)
                                            }
                                            className={inputCls}
                                        >
                                            {leadTypes.map(lt => (
                                                <option key={lt} value={lt}>
                                                    {t(`commercial.leads.types.${lt}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section 2: Localisation ── */}
                            <fieldset>
                                <legend className="text-sm font-semibold text-gray-800 mb-3">
                                    {t('commercial.leads.sectionLocation')}
                                </legend>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.country')}
                                        </label>
                                        <input
                                            value={form.country}
                                            onChange={e => set('country', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.region')}
                                        </label>
                                        <input
                                            value={form.region}
                                            onChange={e => set('region', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.city')}
                                        </label>
                                        <input
                                            value={form.city}
                                            onChange={e => set('city', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.commune')}
                                        </label>
                                        <input
                                            value={form.commune}
                                            onChange={e => set('commune', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.postalCode')}
                                        </label>
                                        <input
                                            value={form.postalCode}
                                            onChange={e => set('postalCode', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className={labelCls}>
                                            {t('commercial.leads.address')}
                                        </label>
                                        <textarea
                                            value={form.address}
                                            onChange={e => set('address', e.target.value)}
                                            rows={2}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section 3: Contact Principal ── */}
                            <fieldset>
                                <legend className="text-sm font-semibold text-gray-800 mb-3">
                                    {t('commercial.leads.sectionContact1')}
                                </legend>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact1Name')}
                                        </label>
                                        <input
                                            value={form.contact1Name}
                                            onChange={e => set('contact1Name', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact1Role')}
                                        </label>
                                        <input
                                            value={form.contact1Role}
                                            onChange={e => set('contact1Role', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact1Email')}
                                        </label>
                                        <input
                                            type="email"
                                            value={form.contact1Email}
                                            onChange={e => set('contact1Email', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact1Phone')}
                                        </label>
                                        <input
                                            value={form.contact1Phone}
                                            onChange={e => set('contact1Phone', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section 4: Contact Secondaire ── */}
                            <fieldset>
                                <legend className="text-sm font-semibold text-gray-800 mb-3">
                                    {t('commercial.leads.sectionContact2')}
                                </legend>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact2Name')}
                                        </label>
                                        <input
                                            value={form.contact2Name}
                                            onChange={e => set('contact2Name', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact2Role')}
                                        </label>
                                        <input
                                            value={form.contact2Role}
                                            onChange={e => set('contact2Role', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact2Email')}
                                        </label>
                                        <input
                                            type="email"
                                            value={form.contact2Email}
                                            onChange={e => set('contact2Email', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.contact2Phone')}
                                        </label>
                                        <input
                                            value={form.contact2Phone}
                                            onChange={e => set('contact2Phone', e.target.value)}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </fieldset>

                            {/* ── Section 5: Commercial ── */}
                            <fieldset>
                                <legend className="text-sm font-semibold text-gray-800 mb-3">
                                    {t('commercial.leads.sectionCommercial')}
                                </legend>
                                <div className="grid grid-cols-2 gap-4">
                                    {!isCommercial && (
                                        <div>
                                            <label className={labelCls}>
                                                {t('commercial.leads.assignedTo')}
                                            </label>
                                            <select
                                                value={form.assignedToId}
                                                onChange={e => set('assignedToId', e.target.value)}
                                                className={inputCls}
                                            >
                                                <option value="">{t('commercial.leads.assignedToPlaceholder')}</option>
                                                {(employees || []).map(emp => (
                                                    <option key={emp.id} value={emp.id}>
                                                        {emp.firstName} {emp.lastName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.paymentDelay')}
                                        </label>
                                        <input
                                            type="number"
                                            value={form.paymentDelay}
                                            onChange={e =>
                                                set('paymentDelay', Number(e.target.value))
                                            }
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>
                                            {t('commercial.leads.priority')}
                                        </label>
                                        <select
                                            value={form.priority}
                                            onChange={e =>
                                                set('priority', e.target.value as LeadPriority)
                                            }
                                            className={inputCls}
                                        >
                                            {leadPriorities.map(p => (
                                                <option key={p} value={p}>
                                                    {t(`commercial.leads.priorities.${p}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </fieldset>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLead.isPending || updateLead.isPending}
                                    className="px-4 py-2.5 bg-[#33cbcc] text-white rounded-xl hover:bg-[#2bb5b6] transition-colors text-sm disabled:opacity-50"
                                >
                                    {lead
                                        ? t('common.save')
                                        : t('commercial.leads.addLead')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

/* ────────────────────────────────────────────── Page ── */

export default function LeadsDatabase() {
    const { t } = useTranslation();
    const { role } = useAuth();
    const isManager = role === 'MANAGER';

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterType, setFilterType] = useState('');
    const [page, setPage] = useState(1);
    const limit = 20;

    // Modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);

    // Detail drawer
    const [detailLeadId, setDetailLeadId] = useState<string | null>(null);

    // Delete confirm
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const deleteLead = useDeleteLead();

    // Build server-side filters
    const filters: Record<string, any> = { page, limit };
    if (filterStatus) filters.leadStatus = filterStatus;
    if (filterPriority) filters.priority = filterPriority;
    if (filterType) filters.leadType = filterType;
    if (search) filters.search = search;

    const { data, isLoading } = useLeads(filters);

    const leads = data?.data ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    // Client-side search filtering (backup for fields not covered server-side)
    const filteredLeads = search
        ? leads.filter(l => {
              const q = search.toLowerCase();
              return (
                  l.code?.toLowerCase().includes(q) ||
                  l.company?.toLowerCase().includes(q) ||
                  l.city?.toLowerCase().includes(q) ||
                  l.contact1Name?.toLowerCase().includes(q) ||
                  l.activitySector?.toLowerCase().includes(q)
              );
          })
        : leads;

    const handleEdit = (lead: Lead) => {
        setDetailLeadId(null);
        setEditingLead(lead);
        setModalOpen(true);
    };

    const handleAdd = () => {
        setEditingLead(null);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingLead(null);
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-gray-900">
                    {t('commercial.leads.title')}
                </h1>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#33cbcc] text-white rounded-xl hover:bg-[#2bb5b6] transition-colors text-sm"
                >
                    <Plus size={16} />
                    {t('commercial.leads.addLead')}
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="bg-white rounded-2xl sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder={t('commercial.leads.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-gray-400">
                        <Filter size={16} />
                    </div>

                    <select
                        value={filterStatus}
                        onChange={e => {
                            setFilterStatus(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                    >
                        <option value="">{t('commercial.leads.allStatuses')}</option>
                        {leadStatuses.map(s => (
                            <option key={s} value={s}>
                                {t(`commercial.leads.statuses.${s}`)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterPriority}
                        onChange={e => {
                            setFilterPriority(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                    >
                        <option value="">{t('commercial.leads.allPriorities')}</option>
                        {leadPriorities.map(p => (
                            <option key={p} value={p}>
                                {t(`commercial.leads.priorities.${p}`)}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterType}
                        onChange={e => {
                            setFilterType(e.target.value);
                            setPage(1);
                        }}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                    >
                        <option value="">{t('commercial.leads.allTypes')}</option>
                        {leadTypes.map(lt => (
                            <option key={lt} value={lt}>
                                {t(`commercial.leads.types.${lt}`)}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Table ── */}
            <div className="bg-white rounded-2xl sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/80">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.code')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.company')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.activitySector')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.potentialRevenue')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.city')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.contact1')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.status')}
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.priority')}
                                </th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {t('commercial.leads.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                                        {t('commercial.leads.noLeads')}
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map(lead => (
                                    <tr
                                        key={lead.id}
                                        onClick={() => setDetailLeadId(lead.id)}
                                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3 text-sm font-bold text-[#33cbcc]">
                                            <div className="flex items-center gap-1.5">
                                                {lead.code}
                                                {lead.clientId && (
                                                    <CheckCircle2 size={13} className="text-green-500" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {lead.company}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {lead.activitySector}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-800">
                                            {lead.potentialRevenue
                                                ? formatFCFA(lead.potentialRevenue)
                                                : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {lead.city}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="text-gray-800">
                                                {lead.contact1Name || '-'}
                                            </div>
                                            {lead.contact1Phone && (
                                                <div className="text-xs text-gray-400">
                                                    {lead.contact1Phone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[lead.leadStatus] ?? 'bg-gray-100 text-gray-700'}`}
                                            >
                                                {t(`commercial.leads.statuses.${lead.leadStatus}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${priorityColors[lead.priority] ?? 'bg-gray-100 text-gray-700'}`}
                                            >
                                                {t(`commercial.leads.priorities.${lead.priority}`)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {confirmDeleteId === lead.id ? (
                                                <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            deleteLead.mutate(lead.id);
                                                            setConfirmDeleteId(null);
                                                        }}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                                    >
                                                        &#10003;
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                                    >
                                                        &#10005;
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => setDetailLeadId(lead.id)}
                                                        className="p-1.5 text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 rounded-lg"
                                                        title={t('commercial.detail.view')}
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(lead)}
                                                        className="p-1.5 text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 rounded-lg"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    {isManager && (
                                                        <button
                                                            onClick={() =>
                                                                setConfirmDeleteId(lead.id)
                                                            }
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            {t('commercial.leads.showing', {
                                from: (page - 1) * limit + 1,
                                to: Math.min(page * limit, total),
                                total,
                            })}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(
                                    p =>
                                        p === 1 ||
                                        p === totalPages ||
                                        Math.abs(p - page) <= 1,
                                )
                                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                                        acc.push('...');
                                    acc.push(p);
                                    return acc;
                                }, [])
                                .map((p, idx) =>
                                    typeof p === 'string' ? (
                                        <span
                                            key={`dots-${idx}`}
                                            className="px-2 text-gray-400 text-sm"
                                        >
                                            ...
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => setPage(p)}
                                            className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                                                p === page
                                                    ? 'bg-[#33cbcc] text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ),
                                )}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            <LeadModal isOpen={modalOpen} onClose={handleCloseModal} lead={editingLead} />

            {/* ── Detail Drawer ── */}
            <AnimatePresence>
                {detailLeadId && (
                    <LeadProfileSidebar
                        leadId={detailLeadId}
                        onClose={() => setDetailLeadId(null)}
                        onEdit={handleEdit}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
