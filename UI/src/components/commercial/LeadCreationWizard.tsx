import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Building02Icon, Location01Icon, UserGroupIcon, Task01Icon, BarChartIcon, Add01Icon, Delete02Icon, StarIcon, ArrowLeft01Icon, ArrowRight01Icon, Loading02Icon, CallIcon, Mail01Icon, Briefcase01Icon } from 'hugeicons-react';
import { useCreateLead } from '../../api/commercial/hooks';
import { useDepartmentServices } from '../../api/departments/hooks';
import type { CreateLeadContactDto, CreateLeadNeedDto, LeadType, SaleStage } from '../../api/commercial/types';

/* ── Types ───────────────────────────────────────────────── */

interface WizardForm {
    // Step 1 — Entreprise
    company: string;
    activitySector: string;
    leadType: LeadType;
    source: string;
    potentialRevenue: string;
    paymentDelay: string;
    // Step 2 — Localisation
    country: string;
    region: string;
    city: string;
    commune: string;
    postalCode: string;
    address: string;
    // Step 3 — Contacts
    contacts: CreateLeadContactDto[];
    // Step 4 — Besoins
    needs: CreateLeadNeedDto[];
    // Step 5 — Commercial
    saleStage: SaleStage;
    competitor: string;
    competitorOffer: string;
    comment: string;
}

const emptyContact = (): CreateLeadContactDto => ({
    name: '', role: '', email: '', phone: '', isPrimary: false,
});

const emptyNeed = (): CreateLeadNeedDto => ({ description: '', serviceId: null });

const LEAD_TYPES: LeadType[] = [
    'PROSPECT', 'CLIENT_EXISTANT', 'RECOMMANDATION', 'APPEL_ENTRANT',
    'SALON', 'SITE_WEB', 'RESEAU_SOCIAL', 'PARTENAIRE',
];

const SALE_STAGES: SaleStage[] = [
    'PROSPECTION', 'QUALIFICATION', 'PROPOSITION', 'NEGOCIATION', 'CLOSING',
];

/* ── Step definitions ────────────────────────────────────── */

const STEPS = [
    { key: 'company',    labelKey: 'wizard.steps.company',    Icon: Building02Icon   },
    { key: 'location',   labelKey: 'wizard.steps.location',   Icon: Location01Icon      },
    { key: 'contacts',   labelKey: 'wizard.steps.contacts',   Icon: UserGroupIcon       },
    { key: 'needs',      labelKey: 'wizard.steps.needs',      Icon: Task01Icon  },
    { key: 'commercial', labelKey: 'wizard.steps.commercial', Icon: BarChartIcon   },
] as const;

/* ── Styles ──────────────────────────────────────────────── */

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm';
const labelCls = 'block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide';
const sectionTitle = 'text-sm font-bold text-gray-700 mb-4';

/* ── Wizard ──────────────────────────────────────────────── */

export default function LeadCreationWizard({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const createLead = useCreateLead();
    const { data: allServices } = useDepartmentServices();

    const [step, setStep] = useState(0);
    const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

    const [form, setForm] = useState<WizardForm>({
        company: '', activitySector: '', leadType: 'PROSPECT', source: '',
        potentialRevenue: '', paymentDelay: '30',
        country: '', region: '', city: '', commune: '', postalCode: '', address: '',
        contacts: [{ ...emptyContact(), isPrimary: true }],
        needs: [emptyNeed()],
        saleStage: 'PROSPECTION', competitor: '', competitorOffer: '', comment: '',
    });

    const set = <K extends keyof WizardForm>(key: K, value: WizardForm[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const goTo = (idx: number) => {
        setDirection(idx > step ? 1 : -1);
        setStep(idx);
    };
    const goNext = () => goTo(Math.min(STEPS.length - 1, step + 1));
    const goPrev = () => goTo(Math.max(0, step - 1));

    /* ── Contact helpers ── */
    const addContact = () =>
        set('contacts', [...form.contacts, emptyContact()]);

    const removeContact = (i: number) =>
        set('contacts', form.contacts.filter((_, idx) => idx !== i));

    const updateContact = (i: number, field: keyof CreateLeadContactDto, value: string | boolean) =>
        set('contacts', form.contacts.map((c, idx) => idx === i ? { ...c, [field]: value } : c));

    const setPrimary = (i: number) =>
        set('contacts', form.contacts.map((c, idx) => ({ ...c, isPrimary: idx === i })));

    /* ── Need helpers ── */
    const addNeed = () => set('needs', [...form.needs, emptyNeed()]);

    const removeNeed = (i: number) =>
        set('needs', form.needs.filter((_, idx) => idx !== i));

    const updateNeed = (i: number, field: keyof CreateLeadNeedDto, value: string | null) =>
        set('needs', form.needs.map((n, idx) => idx === i ? { ...n, [field]: value } : n));

    /* ── Submit ── */
    const isValid = form.company.trim().length > 0;

    const handleCreate = () => {
        if (!isValid) return;
        const validContacts = form.contacts.filter(c => c.name.trim());
        const validNeeds = form.needs.filter(n => n.description.trim());
        createLead.mutate({
            company: form.company.trim(),
            activitySector: form.activitySector || undefined,
            leadType: form.leadType,
            source: form.source || undefined,
            potentialRevenue: form.potentialRevenue ? parseFloat(form.potentialRevenue) : undefined,
            paymentDelay: form.paymentDelay ? parseInt(form.paymentDelay) : undefined,
            country: form.country || undefined,
            region: form.region || undefined,
            city: form.city || undefined,
            commune: form.commune || undefined,
            postalCode: form.postalCode || undefined,
            address: form.address || undefined,
            saleStage: form.saleStage,
            competitor: form.competitor || undefined,
            competitorOffer: form.competitorOffer || undefined,
            comment: form.comment || undefined,
            priority: 'COLD',
            contacts: validContacts.length ? validContacts : undefined,
            needs: validNeeds.length ? validNeeds : undefined,
        }, { onSuccess: onClose });
    };

    /* ── Slide animation variants ── */
    const variants = {
        enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
        center: { opacity: 1, x: 0 },
        exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40 }),
    };

    const activeServices = (allServices || []).filter(s => s.isActive);

    return (
        <>
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60]"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="fixed inset-x-0 bottom-16 sm:bottom-auto sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl max-h-[calc(100vh-4rem)] sm:max-h-[92vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl z-[60] flex flex-col overflow-hidden"
            >
                {/* ── Header ── */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-gray-900">
                            {t('commercial.leads.wizard.title', 'Nouveau lead')}
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('commercial.leads.wizard.subtitle', 'Étape')} {step + 1} / {STEPS.length}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* ── Step tabs ── */}
                <div className="px-3 pt-3 pb-0 sm:px-6 sm:pt-4 shrink-0">
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                        {STEPS.map((s, i) => {
                            const Icon = s.Icon;
                            const isActive = i === step;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => goTo(i)}
                                    className={`flex-1 flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                                        isActive
                                            ? 'bg-white text-[#33cbcc] shadow-sm'
                                            : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                                    }`}
                                >
                                    <Icon size={14} />
                                    <span className="hidden sm:block leading-none">
                                        {t(s.labelKey, s.key)}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {/* progress bar */}
                    <div className="mt-3 h-0.5 bg-gray-100 rounded-full">
                        <motion.div
                            className="h-0.5 bg-[#33cbcc] rounded-full"
                            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                            transition={{ duration: 0.3 }}
                        />
                    </div>
                </div>

                {/* ── Step content ── */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={step}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                            className="px-4 py-4 sm:px-6 sm:py-5"
                        >
                            {/* ── Step 1: Entreprise ── */}
                            {step === 0 && (
                                <div className="space-y-4">
                                    <p className={sectionTitle}>{t('commercial.leads.sectionCompany')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className={labelCls}>
                                                {t('commercial.leads.company')} <span className="text-[#283852]">*</span>
                                            </label>
                                            <input
                                                autoFocus
                                                value={form.company}
                                                onChange={e => set('company', e.target.value)}
                                                placeholder="Nom de l'entreprise"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.activitySector')}</label>
                                            <input
                                                value={form.activitySector}
                                                onChange={e => set('activitySector', e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.leadType')}</label>
                                            <select value={form.leadType} onChange={e => set('leadType', e.target.value as LeadType)} className={inputCls}>
                                                {LEAD_TYPES.map(lt => (
                                                    <option key={lt} value={lt}>{t(`commercial.leads.types.${lt}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.source', 'Source')}</label>
                                            <input
                                                value={form.source}
                                                onChange={e => set('source', e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.potentialRevenue')}</label>
                                            <input
                                                type="number"
                                                value={form.potentialRevenue}
                                                onChange={e => set('potentialRevenue', e.target.value)}
                                                placeholder="0"
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.paymentDelay', 'Délai paiement (jours)')}</label>
                                            <input
                                                type="number"
                                                value={form.paymentDelay}
                                                onChange={e => set('paymentDelay', e.target.value)}
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 2: Localisation ── */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <p className={sectionTitle}>{t('commercial.leads.sectionLocation', 'Localisation')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.country', 'Pays')}</label>
                                            <input value={form.country} onChange={e => set('country', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.region', 'Région')}</label>
                                            <input value={form.region} onChange={e => set('region', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.city', 'Ville')}</label>
                                            <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.commune', 'Commune')}</label>
                                            <input value={form.commune} onChange={e => set('commune', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.postalCode', 'Code postal')}</label>
                                            <input value={form.postalCode} onChange={e => set('postalCode', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className={labelCls}>{t('commercial.leads.address', 'Adresse')}</label>
                                            <textarea
                                                value={form.address}
                                                onChange={e => set('address', e.target.value)}
                                                rows={2}
                                                className={inputCls + ' resize-none'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── Step 3: Contacts ── */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className={sectionTitle + ' mb-0'}>{t('commercial.leads.wizard.steps.contacts', 'Contacts')}</p>
                                        <button
                                            onClick={addContact}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:bg-[#33cbcc]/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <Add01Icon size={13} />
                                            {t('commercial.leads.wizard.addContact', 'Ajouter un contact')}
                                        </button>
                                    </div>

                                    {form.contacts.map((c, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`rounded-xl border p-4 space-y-3 ${c.isPrimary ? 'border-[#33cbcc]/40 bg-[#33cbcc]/5' : 'border-gray-200 bg-white'}`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-500">
                                                        {t('commercial.leads.wizard.contact', 'Contact')} {i + 1}
                                                    </span>
                                                    {c.isPrimary && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#33cbcc]/15 text-[#33cbcc]">
                                                            {t('commercial.leads.wizard.primary', 'Principal')}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setPrimary(i)}
                                                        title={t('commercial.leads.wizard.setPrimary', 'Définir comme principal')}
                                                        className={`p-1.5 rounded-lg transition-colors ${c.isPrimary ? 'text-[#33cbcc]' : 'text-gray-300 hover:text-[#33cbcc]'}`}
                                                    >
                                                        <StarIcon size={13} fill={c.isPrimary ? 'currentColor' : 'none'} />
                                                    </button>
                                                    {form.contacts.length > 1 && (
                                                        <button
                                                            onClick={() => removeContact(i)}
                                                            className="p-1.5 text-gray-300 hover:text-[#283852] hover:bg-[#283852]/10 rounded-lg transition-colors"
                                                        >
                                                            <Delete02Icon size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className={labelCls}>
                                                        <span className="flex items-center gap-1"><UserGroupIcon size={10} />{t('commercial.leads.contactName', 'Nom')}</span>
                                                    </label>
                                                    <input
                                                        value={c.name}
                                                        onChange={e => updateContact(i, 'name', e.target.value)}
                                                        placeholder="Nom complet"
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>
                                                        <span className="flex items-center gap-1"><Briefcase01Icon size={10} />{t('commercial.leads.contactRole', 'Poste')}</span>
                                                    </label>
                                                    <input
                                                        value={c.role ?? ''}
                                                        onChange={e => updateContact(i, 'role', e.target.value)}
                                                        placeholder="Directeur, Manager..."
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>
                                                        <span className="flex items-center gap-1"><CallIcon size={10} />{t('commercial.leads.contactPhone', 'Téléphone')}</span>
                                                    </label>
                                                    <input
                                                        value={c.phone ?? ''}
                                                        onChange={e => updateContact(i, 'phone', e.target.value)}
                                                        placeholder="+237..."
                                                        className={inputCls}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelCls}>
                                                        <span className="flex items-center gap-1"><Mail01Icon size={10} />{t('commercial.leads.contactEmail', 'Email')}</span>
                                                    </label>
                                                    <input
                                                        type="email"
                                                        value={c.email ?? ''}
                                                        onChange={e => updateContact(i, 'email', e.target.value)}
                                                        placeholder="email@example.com"
                                                        className={inputCls}
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* ── Step 4: Besoins ── */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className={sectionTitle + ' mb-0'}>{t('commercial.leads.wizard.steps.needs', 'Besoins')}</p>
                                        <button
                                            onClick={addNeed}
                                            className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:bg-[#33cbcc]/10 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <Add01Icon size={13} />
                                            {t('commercial.leads.wizard.addNeed', 'Ajouter un besoin')}
                                        </button>
                                    </div>

                                    {form.needs.map((n, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-500">
                                                    {t('commercial.leads.wizard.need', 'Besoin')} {i + 1}
                                                </span>
                                                {form.needs.length > 1 && (
                                                    <button
                                                        onClick={() => removeNeed(i)}
                                                        className="p-1.5 text-gray-300 hover:text-[#283852] hover:bg-[#283852]/10 rounded-lg transition-colors"
                                                    >
                                                        <Delete02Icon size={13} />
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('commercial.leads.wizard.needDescription', 'Description')}</label>
                                                <textarea
                                                    value={n.description}
                                                    onChange={e => updateNeed(i, 'description', e.target.value)}
                                                    rows={2}
                                                    placeholder={t('commercial.leads.wizard.needPlaceholder', 'Décrivez le besoin...')}
                                                    className={inputCls + ' resize-none'}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelCls}>{t('commercial.leads.wizard.assignedService', 'Service associé')} <span className="text-gray-300 font-normal normal-case">(optionnel)</span></label>
                                                {n.serviceId ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex-1 px-3 py-2 rounded-xl bg-[#33cbcc]/10 text-[#33cbcc] text-sm font-medium">
                                                            {activeServices.find(s => s.id === n.serviceId)?.name ?? n.serviceId}
                                                        </span>
                                                        <button
                                                            onClick={() => updateNeed(i, 'serviceId', null)}
                                                            className="p-2 text-gray-400 hover:text-[#283852] rounded-lg transition-colors"
                                                        >
                                                            <Cancel01Icon size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value=""
                                                        onChange={e => updateNeed(i, 'serviceId', e.target.value || null)}
                                                        className={inputCls}
                                                    >
                                                        <option value="">{t('commercial.leads.wizard.noService', '— Aucun service —')}</option>
                                                        {activeServices.map(s => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.name}{s.price ? ` — ${new Intl.NumberFormat('fr-FR').format(s.price)} FCFA` : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            {/* ── Step 5: Commercial ── */}
                            {step === 4 && (
                                <div className="space-y-4">
                                    <p className={sectionTitle}>{t('commercial.leads.wizard.steps.commercial', 'Informations commerciales')}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.saleStage', 'Stade')}</label>
                                            <select value={form.saleStage} onChange={e => set('saleStage', e.target.value as SaleStage)} className={inputCls}>
                                                {SALE_STAGES.map(s => (
                                                    <option key={s} value={s}>{t(`commercial.pipeline.stages.${s}`)}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.priority', 'Priorité')}</label>
                                            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#283852]/10 border border-gray-200 rounded-xl">
                                                <span className="w-2 h-2 rounded-full bg-[#283852] shrink-0" />
                                                <span className="text-sm font-semibold text-[#283852]">
                                                    {t('commercial.leads.priorities.COLD', 'Froide')}
                                                </span>
                                                <span className="text-xs text-[#283852]/60 ml-auto">{t('commercial.leads.wizard.defaultCold', 'par défaut')}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.pipeline.competitor', 'Concurrent')}</label>
                                            <input value={form.competitor} onChange={e => set('competitor', e.target.value)} className={inputCls} />
                                        </div>
                                        <div>
                                            <label className={labelCls}>{t('commercial.leads.competitorOffer', 'Offre concurrente')}</label>
                                            <input value={form.competitorOffer} onChange={e => set('competitorOffer', e.target.value)} className={inputCls} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className={labelCls}>{t('commercial.pipeline.comment', 'Commentaire')}</label>
                                            <textarea
                                                value={form.comment}
                                                onChange={e => set('comment', e.target.value)}
                                                rows={3}
                                                className={inputCls + ' resize-none'}
                                            />
                                        </div>
                                    </div>

                                    {/* Summary card */}
                                    <div className="mt-2 bg-gray-50 rounded-xl border border-gray-100 p-4">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                                            {t('commercial.leads.wizard.summary', 'Récapitulatif')}
                                        </p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">{t('commercial.leads.company')}</span>
                                                <span className="font-semibold text-gray-800">{form.company || '—'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">{t('commercial.leads.wizard.contactCount', 'Contacts')}</span>
                                                <span className="font-semibold text-gray-800">
                                                    {form.contacts.filter(c => c.name.trim()).length}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">{t('commercial.leads.wizard.needCount', 'Besoins')}</span>
                                                <span className="font-semibold text-gray-800">
                                                    {form.needs.filter(n => n.description.trim()).length}
                                                </span>
                                            </div>
                                            {form.city && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">{t('commercial.leads.city', 'Ville')}</span>
                                                    <span className="font-semibold text-gray-800">{form.city}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* ── Footer navigation ── */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button
                        onClick={goPrev}
                        disabled={step === 0}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <ArrowLeft01Icon size={15} />
                        <span className="hidden sm:inline">{t('commercial.leads.wizard.previous', 'Précédent')}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className={`rounded-full transition-all ${
                                    i === step ? 'w-5 h-2 bg-[#33cbcc]' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                                }`}
                            />
                        ))}
                    </div>

                    {step < STEPS.length - 1 ? (
                        <button
                            onClick={goNext}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                        >
                            <span className="hidden sm:inline">{t('commercial.leads.wizard.next', 'Suivant')}</span>
                            <ArrowRight01Icon size={15} />
                        </button>
                    ) : (
                        <button
                            onClick={handleCreate}
                            disabled={!isValid || createLead.isPending}
                            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
                                isValid && !createLead.isPending
                                    ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
                                    : 'bg-gray-300 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {createLead.isPending
                                ? <Loading02Icon size={15} className="animate-spin" />
                                : <Add01Icon size={15} />
                            }
                            <span className="hidden sm:inline">{t('commercial.leads.wizard.createLead', 'Créer le lead')}</span>
                            <span className="sm:hidden">{t('commercial.leads.wizard.create', 'Créer')}</span>
                        </button>
                    )}
                </div>
            </motion.div>
        </>
    );
}
