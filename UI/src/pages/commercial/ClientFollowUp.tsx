import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, BookOpen, FileText, CreditCard, ChevronDown, AlertCircle, CheckCircle2, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useClientStatement, useSalesSummary, useCreatePayment, useClientHealthMetrics } from '../../api/commercial/hooks';
import type { CreatePaymentDto, PaymentMethod, ClientStatement, HealthStatus } from '../../api/commercial/types';
import { useClients } from '../../api/clients/hooks';
import { useInvoices } from '../../api/invoices/hooks';
import type { Invoice } from '../../api/invoices/types';
import ClientActivitiesPanel from '../../components/ClientActivitiesPanel';

/* ─── Constants ─────────────────────────────────────────── */

const PAYMENT_METHODS: PaymentMethod[] = ['CHEQUE', 'VIREMENT', 'ESPECES', 'MOBILE_MONEY', 'CARTE', 'AUTRE'];

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const LEDGER_MIN_ROWS = 20;

const getHealthBadgeStyles = (status: HealthStatus) => {
    const styles = {
        HEALTHY: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', icon: CheckCircle2, border: 'border-gray-200' },
        GOOD: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', icon: CheckCircle2, border: 'border-gray-200' },
        NEEDS_FOLLOWUP: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: Clock, border: 'border-gray-200' },
        ATTENTION_NEEDED: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: AlertCircle, border: 'border-gray-200' },
        AT_RISK: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: AlertCircle, border: 'border-gray-200' },
        NEW: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: TrendingUp, border: 'border-gray-200' },
    };
    return styles[status] || styles.NEW;
};

/* ─── Payment Modal ─────────────────────────────────────── */

function PaymentModal({
    open,
    onClose,
    clientId,
    clientInvoices,
}: {
    open: boolean;
    onClose: () => void;
    clientId: string;
    clientInvoices: Invoice[];
}) {
    const { t } = useTranslation();
    const createPayment = useCreatePayment();

    const [form, setForm] = useState<{
        invoiceId: string;
        amount: string;
        date: string;
        reference: string;
        method: PaymentMethod;
        notes: string;
    }>({
        invoiceId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference: '',
        method: 'VIREMENT',
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.invoiceId || !form.amount) return;
        const dto: CreatePaymentDto = {
            invoiceId: form.invoiceId,
            clientId,
            amount: parseFloat(form.amount),
            date: form.date,
            reference: form.reference || undefined,
            method: form.method,
            notes: form.notes || undefined,
        };
        createPayment.mutate(dto, {
            onSuccess: () => {
                setForm({ invoiceId: '', amount: '', date: new Date().toISOString().split('T')[0], reference: '', method: 'VIREMENT', notes: '' });
                onClose();
            },
        });
    };

    const unpaidInvoices = clientInvoices.filter(inv => inv.status !== 'PAID');

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-white rounded-2xl xl w-full max-w-lg mx-4 overflow-hidden"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <CreditCard size={20} className="text-[#33cbcc]" />
                                <h3 className="text-lg font-semibold text-gray-800">
                                    {t('commercial.followUp.recordPayment')}
                                </h3>
                            </div>
                            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Invoice selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.invoice')}
                                </label>
                                <select
                                    value={form.invoiceId}
                                    onChange={e => setForm(f => ({ ...f, invoiceId: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc]"
                                    required
                                >
                                    <option value="">{t('commercial.followUp.selectInvoice')}</option>
                                    {unpaidInvoices.map(inv => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoiceNumber} - {formatFCFA(inv.total)} FCFA
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.amount')}
                                </label>
                                <input
                                    type="number"
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc]"
                                    placeholder="0"
                                    min="0"
                                    step="1"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.date')}
                                </label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc]"
                                    required
                                />
                            </div>

                            {/* Reference */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.reference')}
                                </label>
                                <input
                                    type="text"
                                    value={form.reference}
                                    onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc]"
                                    placeholder={t('commercial.followUp.referencePlaceholder')}
                                />
                            </div>

                            {/* Method */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.method')}
                                </label>
                                <select
                                    value={form.method}
                                    onChange={e => setForm(f => ({ ...f, method: e.target.value as PaymentMethod }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc]"
                                >
                                    {PAYMENT_METHODS.map(m => (
                                        <option key={m} value={m}>
                                            {t(`commercial.followUp.methods.${m}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t('commercial.followUp.notes')}
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc] resize-none"
                                    rows={3}
                                    placeholder={t('commercial.followUp.notesPlaceholder')}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    {t('commercial.followUp.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={createPayment.isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-[#33cbcc] rounded-xl hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
                                >
                                    {createPayment.isPending ? '...' : t('commercial.followUp.save')}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ─── Client Follow-Up Page ─────────────────────────────── */

export default function ClientFollowUp() {
    const { t } = useTranslation();

    // State
    const [selectedClientId, setSelectedClientId] = useState('');
    const [clientSearch, setClientSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'ledger' | 'activities'>('ledger');

    // Data hooks
    const { data: clients = [], isLoading: clientsLoading } = useClients();
    const { data: statement, isLoading: statementLoading } = useClientStatement(selectedClientId);
    const { data: salesSummary, isLoading: summaryLoading } = useSalesSummary();
    const { data: allInvoices = [] } = useInvoices();
    const { data: clientHealth } = useClientHealthMetrics(selectedClientId);

    // Filter clients for search
    const filteredClients = useMemo(() => {
        if (!clientSearch.trim()) return clients;
        const q = clientSearch.toLowerCase();
        return clients.filter((c: any) => c.name?.toLowerCase().includes(q));
    }, [clients, clientSearch]);

    // Get selected client object
    const selectedClient = useMemo(
        () => clients.find((c: any) => c.id === selectedClientId),
        [clients, selectedClientId],
    );

    // Get invoices for the selected client
    const clientInvoices = useMemo(
        () => (allInvoices as Invoice[]).filter(inv => inv.clientId === selectedClientId),
        [allInvoices, selectedClientId],
    );

    // Build ledger rows with empty padding
    const ledgerRows = useMemo(() => {
        const rows = statement?.rows ?? [];
        const padCount = Math.max(0, LEDGER_MIN_ROWS - rows.length);
        return { dataRows: rows, padCount };
    }, [statement]);

    const handleSelectClient = (id: string) => {
        setSelectedClientId(id);
        setDropdownOpen(false);
        setClientSearch('');
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <BookOpen size={24} className="text-[#33cbcc]" />
                <h1 className="text-2xl font-bold text-gray-800">{t('commercial.followUp.title')}</h1>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

                {/* ── Left: Client Statement ── */}
                <div className="bg-white rounded-2xl sm border border-gray-100 overflow-hidden">
                    {/* Client Selector */}
                    <div className="p-4 border-b border-gray-100">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                            {t('commercial.followUp.selectClient')}
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(o => !o)}
                                className="w-full flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40 focus:border-[#33cbcc] transition-colors"
                            >
                                <span className={selectedClient ? 'text-gray-800' : 'text-gray-400'}>
                                    {selectedClient ? (selectedClient as any).name : t('commercial.followUp.chooseClient')}
                                </span>
                                <ChevronDown size={16} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {dropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl lg max-h-60 overflow-hidden"
                                    >
                                        {/* Search input */}
                                        <div className="p-2 border-b border-gray-100">
                                            <div className="relative">
                                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={clientSearch}
                                                    onChange={e => setClientSearch(e.target.value)}
                                                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40"
                                                    placeholder={t('commercial.followUp.searchClient')}
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        {/* Options */}
                                        <div className="max-h-48 overflow-y-auto">
                                            {clientsLoading ? (
                                                <div className="px-3 py-4 text-sm text-gray-400 text-center">...</div>
                                            ) : filteredClients.length === 0 ? (
                                                <div className="px-3 py-4 text-sm text-gray-400 text-center">
                                                    {t('commercial.followUp.noClients')}
                                                </div>
                                            ) : (
                                                filteredClients.map((c: any) => (
                                                    <button
                                                        key={c.id}
                                                        onClick={() => handleSelectClient(c.id)}
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-[#33cbcc]/10 transition-colors ${
                                                            c.id === selectedClientId ? 'bg-[#33cbcc]/10 text-[#33cbcc] font-medium' : 'text-gray-700'
                                                        }`}
                                                    >
                                                        {c.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Content */}
                    {!selectedClientId ? (
                        /* No client selected prompt */
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <FileText size={48} strokeWidth={1.2} className="mb-4" />
                            <p className="text-sm">{t('commercial.followUp.selectClientPrompt')}</p>
                        </div>
                    ) : statementLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Client Info Header */}
                            <div className="mx-4 mt-4 border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-[#283852]/10 px-4 py-2 flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[#283852] uppercase tracking-wide">
                                        {t('commercial.followUp.clientInfo')}
                                    </h3>
                                    {clientHealth && (() => {
                                        const healthStyles = getHealthBadgeStyles(clientHealth.healthStatus);
                                        const HealthIcon = healthStyles.icon;
                                        return (
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${healthStyles.bg} ${healthStyles.text} ${healthStyles.border}`}>
                                                <HealthIcon size={14} />
                                                <span className="text-xs font-medium">
                                                    {t(`commercial.clientActivities.healthStatuses.${clientHealth.healthStatus}`)}
                                                </span>
                                                {clientHealth.daysSinceLastContact != null && (
                                                    <span className="text-xs opacity-75">
                                                        ({clientHealth.daysSinceLastContact} {t('commercial.clientActivities.daysAgo', 'jours')})
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span className="text-gray-500">{t('commercial.followUp.clientNo')}: </span>
                                        <span className="font-medium text-gray-800">{selectedClient?.id?.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('commercial.followUp.company')}: </span>
                                        <span className="font-medium text-gray-800">{(selectedClient as any)?.name ?? '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('commercial.followUp.payment')}: </span>
                                        <span className="font-medium text-gray-800">
                                            {(selectedClient as any)?.paymentDelay
                                                ? `${(selectedClient as any).paymentDelay} ${t('commercial.followUp.days')}`
                                                : '-'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <span className="text-gray-500">{t('commercial.followUp.address')}: </span>
                                        <span className="font-medium text-gray-800">{(selectedClient as any)?.address ?? '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">{t('commercial.followUp.contact')}: </span>
                                        <span className="font-medium text-gray-800">{(selectedClient as any)?.contact1Phone ?? (selectedClient as any)?.phone ?? '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="mx-4 mt-4 border-b border-gray-200">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setActiveTab('ledger')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'ledger'
                                                ? 'border-[#33cbcc] text-[#33cbcc]'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} />
                                            {t('commercial.followUp.ledgerTab', 'Grand Livre')}
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('activities')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            activeTab === 'activities'
                                                ? 'border-[#33cbcc] text-[#33cbcc]'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Activity size={16} />
                                            {t('commercial.followUp.activitiesTab', 'Activités Client')}
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            {activeTab === 'ledger' ? (
                                <>
                                    {/* Ledger Table */}
                                    <div className="mx-4 mt-4 mb-4 overflow-x-auto">
                                <table className="w-full text-sm border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-[#283852]/10 border border-gray-300">
                                            <th className="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.dateFacture')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.numFacture')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.datePaiement')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.refPaiement')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-left font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.produitsServices')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-center font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.qty')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-right font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.facture')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-right font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.paiements')}
                                            </th>
                                            <th className="px-2 py-2 border border-gray-300 text-right font-semibold text-gray-700 whitespace-nowrap">
                                                {t('commercial.followUp.table.solde')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerRows.dataRows.map((row, idx) => (
                                            <tr key={idx} className="border border-gray-200 hover:bg-gray-50">
                                                <td className="px-2 py-1.5 border border-gray-200 whitespace-nowrap">
                                                    {row.type === 'invoice' && row.dateFacture
                                                        ? new Date(row.dateFacture).toLocaleDateString('fr-FR')
                                                        : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 whitespace-nowrap">
                                                    {row.type === 'invoice' ? row.numeroFacture : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 whitespace-nowrap">
                                                    {row.type === 'payment' && row.datePaiement
                                                        ? new Date(row.datePaiement).toLocaleDateString('fr-FR')
                                                        : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 whitespace-nowrap">
                                                    {row.type === 'payment' ? row.refPaiement ?? '' : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200">
                                                    {row.produitsServices ?? ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 text-center">
                                                    {row.quantite != null ? row.quantite : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 text-right whitespace-nowrap">
                                                    {row.type === 'invoice' && row.montantFacture
                                                        ? formatFCFA(row.montantFacture)
                                                        : ''}
                                                </td>
                                                <td className="px-2 py-1.5 border border-gray-200 text-right whitespace-nowrap">
                                                    {row.type === 'payment' && row.montantPaiement
                                                        ? formatFCFA(row.montantPaiement)
                                                        : ''}
                                                </td>
                                                <td className={`px-2 py-1.5 border border-gray-200 text-right whitespace-nowrap font-medium ${
                                                    row.solde < 0 ? 'text-[#283852]' : 'text-gray-800'
                                                }`}>
                                                    {formatFCFA(row.solde)}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Empty padding rows for ledger look */}
                                        {Array.from({ length: ledgerRows.padCount }).map((_, idx) => (
                                            <tr key={`pad-${idx}`} className="border border-gray-200">
                                                {Array.from({ length: 9 }).map((_, ci) => (
                                                    <td key={ci} className="px-2 py-1.5 border border-gray-200">&nbsp;</td>
                                                ))}
                                            </tr>
                                        ))}
                                        {/* Totals Row */}
                                        <tr className="bg-[#283852]/10 border-2 border-gray-400 font-bold">
                                            <td className="px-2 py-2 border border-gray-300" colSpan={6}>
                                                {t('commercial.followUp.table.total')}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-300 text-right whitespace-nowrap">
                                                {statement ? formatFCFA(statement.totals.factures) : '0'}
                                            </td>
                                            <td className="px-2 py-2 border border-gray-300 text-right whitespace-nowrap">
                                                {statement ? formatFCFA(statement.totals.paiements) : '0'}
                                            </td>
                                            <td className={`px-2 py-2 border border-gray-300 text-right whitespace-nowrap ${
                                                (statement?.totals.solde ?? 0) < 0 ? 'text-[#283852]' : ''
                                            }`}>
                                                {statement ? formatFCFA(statement.totals.solde) : '0'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Record Payment Button */}
                            <div className="px-4 pb-4">
                                <button
                                    onClick={() => setPaymentModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#33cbcc] rounded-xl hover:bg-[#2bb5b6] transition-colors sm"
                                >
                                    <Plus size={16} />
                                    {t('commercial.followUp.recordPayment')}
                                </button>
                            </div>
                        </>
                            ) : (
                                /* Activities Tab */
                                <div className="p-4">
                                    <ClientActivitiesPanel clientId={selectedClientId} />
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ── Right: Sales Summary ── */}
                <div className="bg-white rounded-2xl sm border border-gray-100 overflow-hidden h-fit">
                    {/* Header */}
                    <div className="bg-[#33cbcc] px-4 py-3">
                        <h2 className="text-sm font-bold text-white uppercase tracking-wide text-center">
                            {t('commercial.followUp.salesSummary')}
                        </h2>
                    </div>

                    {summaryLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-5 h-5 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="px-3 py-2 text-left font-semibold text-gray-700">
                                            {t('commercial.followUp.summary.clients')}
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                            {t('commercial.followUp.summary.factures')}
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                            {t('commercial.followUp.summary.paiements')}
                                        </th>
                                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                            {t('commercial.followUp.summary.soldes')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(salesSummary?.clients ?? []).map((item) => (
                                        <tr
                                            key={item.clientId}
                                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                                item.clientId === selectedClientId ? 'bg-[#33cbcc]/5' : ''
                                            }`}
                                            onClick={() => handleSelectClient(item.clientId)}
                                        >
                                            <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">
                                                {item.clientName}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                                                {formatFCFA(item.factures)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-600 whitespace-nowrap">
                                                {formatFCFA(item.paiements)}
                                            </td>
                                            <td className={`px-3 py-2 text-right whitespace-nowrap font-medium ${
                                                item.solde < 0 ? 'text-[#283852]' : 'text-gray-800'
                                            }`}>
                                                {formatFCFA(item.solde)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(salesSummary?.clients ?? []).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-sm">
                                                {t('commercial.followUp.noData')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                                {/* Totals */}
                                {salesSummary && (
                                    <tfoot>
                                        <tr className="bg-gray-50 border-t-2 border-gray-300 font-bold">
                                            <td className="px-3 py-2 text-gray-800">
                                                {t('commercial.followUp.table.total')}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-800 whitespace-nowrap">
                                                {formatFCFA(salesSummary.totals.factures)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-800 whitespace-nowrap">
                                                {formatFCFA(salesSummary.totals.paiements)}
                                            </td>
                                            <td className={`px-3 py-2 text-right whitespace-nowrap ${
                                                salesSummary.totals.solde < 0 ? 'text-[#283852]' : 'text-gray-800'
                                            }`}>
                                                {formatFCFA(salesSummary.totals.solde)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                clientId={selectedClientId}
                clientInvoices={clientInvoices}
            />
        </div>
    );
}
