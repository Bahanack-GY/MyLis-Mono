import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { File01Icon, Search01Icon, Add01Icon, Cancel01Icon, ArrowUpRight01Icon, Clock01Icon, Alert02Icon, Loading02Icon, Calendar01Icon, Delete02Icon, SentIcon, Tick01Icon, CancelCircleIcon, Download01Icon, ViewIcon, Briefcase01Icon, AlignLeftIcon, Image01Icon, Invoice01Icon } from 'hugeicons-react';

import lisdevImg from '../assets/entete/lisdev.png';
import lisappImg from '../assets/entete/lisapp.png';
import liscreaImg from '../assets/entete/liscrea.png';
import liscarwashImg from '../assets/entete/liscarwash.png';
import rennovaImg from '../assets/entete/rennova.png';
import signatureImgSrc from '../assets/invoice/Signature.png';
import cachetImgSrc from '../assets/invoice/cachet.png';

const LETTERHEADS: { key: string; label: string; src: string }[] = [
    { key: 'lisdev', label: 'LIS Dev', src: lisdevImg },
    { key: 'lisapp', label: 'LIS App', src: lisappImg },
    { key: 'liscrea', label: 'LIS Crea', src: liscreaImg },
    { key: 'liscarwash', label: 'LIS Car Wash', src: liscarwashImg },
    { key: 'rennova', label: 'Rennova', src: rennovaImg },
];
import {
    useInvoices,
    useInvoiceStats,
    useSendInvoice,
    usePayInvoice,
    useRejectInvoice,
    useDeleteInvoice,
    useValidateProforma,
    useUpdateInvoice,
    useCreateAcompte,
} from '../api/invoices/hooks';
import { InvoicesSkeleton } from '../components/Skeleton';
import type { Invoice, InvoiceStatus } from '../api/invoices/types';
import { useInvoiceTemplate } from '../api/invoices/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';
import { CreateInvoiceModal } from '../components/modals/CreateInvoiceModal';
import { exportInvoicePdf } from '../utils/exportInvoicePdf';
import { exportReceiptPdf } from '../utils/exportReceiptPdf';
import {
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/* ─── Constants ─────────────────────────────────────────── */

const STATUS_COLORS: Record<InvoiceStatus, string> = {
    CREATED: '#283852',
    SENT: '#283852',
    PAID: '#33cbcc',
    REJECTED: '#283852',
};

const STATUS_KEYS: InvoiceStatus[] = ['CREATED', 'SENT', 'PAID', 'REJECTED'];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


/* ─── Invoice Detail Modal ──────────────────────────────── */

const imgToBase64 = (url: string): Promise<string> =>
    fetch(url)
        .then(r => r.blob())
        .then(blob => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        }));

const InvoiceDetailModal = ({ invoice: initialInvoice, onClose }: { invoice: Invoice; onClose: () => void }) => {
    const { t } = useTranslation();
    const [invoice, setInvoice] = useState(initialInvoice);
    const isProforma = invoice.type === 'PROFORMA';
    const isAcompte = invoice.type === 'ACOMPTE';
    const sendInvoice = useSendInvoice();
    const payInvoice = usePayInvoice();
    const rejectInvoice = useRejectInvoice();
    const deleteInvoice = useDeleteInvoice();
    const validateProforma = useValidateProforma();
    const updateInvoice = useUpdateInvoice();
    const createAcompte = useCreateAcompte();
    const { data: template } = useInvoiceTemplate(invoice.departmentId || '');
    const [selectedLetterhead, setSelectedLetterhead] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingReceipt, setIsExportingReceipt] = useState(false);
    const [showConfirmPay, setShowConfirmPay] = useState(false);
    const [showConfirmValidate, setShowConfirmValidate] = useState(false);
    const [showAcompteModal, setShowAcompteModal] = useState(false);
    const [acompteAmount, setAcompteAmount] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editNotes, setEditNotes] = useState(invoice.notes || '');
    const [editItems, setEditItems] = useState(invoice.items.map(it => ({
        description: it.description,
        quantity: String(it.quantity),
        unitPrice: String(it.unitPrice),
    })));

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const addEditItem = () => setEditItems(prev => [...prev, { description: '', quantity: '1', unitPrice: '' }]);
    const removeEditItem = (idx: number) => setEditItems(prev => prev.filter((_, i) => i !== idx));
    const updateEditItem = (idx: number, field: string, value: string) =>
        setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

    const editSubtotal = editItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);

    const handleSaveEdit = () => {
        updateInvoice.mutate({
            id: invoice.id,
            dto: {
                notes: editNotes || undefined,
                taxRate: Number(invoice.taxRate),
                items: editItems
                    .filter(it => it.description.trim() && Number(it.unitPrice) > 0)
                    .map(it => ({ description: it.description, quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) })),
            },
        }, {
            onSuccess: (updated) => {
                setInvoice(updated);
                setIsEditing(false);
            },
        });
    };

    const handleExportPdf = useCallback(async () => {
        setIsExporting(true);
        try {
            let letterheadBase64: string | undefined;
            if (selectedLetterhead) {
                const entry = LETTERHEADS.find(l => l.key === selectedLetterhead);
                if (entry) letterheadBase64 = await imgToBase64(entry.src);
            }
            const [sigBase64, cachetBase64] = await Promise.all([
                imgToBase64(signatureImgSrc),
                imgToBase64(cachetImgSrc),
            ]);
            exportInvoicePdf(invoice, template, letterheadBase64, sigBase64, cachetBase64, isProforma);
            if (!isProforma && invoice.status === 'CREATED') {
                sendInvoice.mutate(invoice.id, { onSuccess: onClose });
            }
        } finally {
            setIsExporting(false);
        }
    }, [invoice, template, selectedLetterhead, sendInvoice, onClose, isProforma]);

    const handleExportReceipt = useCallback(async () => {
        setIsExportingReceipt(true);
        try {
            let letterheadBase64: string | undefined;
            if (selectedLetterhead) {
                const entry = LETTERHEADS.find(l => l.key === selectedLetterhead);
                if (entry) letterheadBase64 = await imgToBase64(entry.src);
            }
            const [sigBase64, cachetBase64] = await Promise.all([
                imgToBase64(signatureImgSrc),
                imgToBase64(cachetImgSrc),
            ]);
            exportReceiptPdf(invoice, template, letterheadBase64, sigBase64, cachetBase64);
        } finally {
            setIsExportingReceipt(false);
        }
    }, [invoice, template, selectedLetterhead]);

    const isOverdue = invoice.status === 'SENT' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
    const displayNumber = isProforma ? invoice.proformaNumber : invoice.invoiceNumber;

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: isProforma ? '#f59e0b15' : `${STATUS_COLORS[invoice.status]}15` }}>
                            <File01Icon size={20} style={{ color: isProforma ? '#f59e0b' : STATUS_COLORS[invoice.status] }} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                {isProforma && (
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc]">Proforma</span>
                                )}
                                <h2 className="text-lg font-bold text-gray-800">{displayNumber || '—'}</h2>
                            </div>
                            {!isProforma && (
                                <span className="text-[10px] font-semibold" style={{ color: STATUS_COLORS[invoice.status] }}>
                                    {t(`invoices.status.${invoice.status.toLowerCase()}`)}
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.table.project')}</p>
                            <p className="text-sm font-medium text-gray-800 mt-1 truncate">{invoice.project?.name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.table.client')}</p>
                            <p className="text-sm font-medium text-gray-800 mt-1 truncate">{invoice.client?.name || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.detail.issuedOn')}</p>
                            <p className="text-sm text-gray-600 mt-1">{formatDate(invoice.issueDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.detail.dueOn')}</p>
                            <p className={`text-sm mt-1 ${isOverdue ? 'text-[#283852] font-semibold' : 'text-gray-600'}`}>
                                {formatDate(invoice.dueDate)}
                                {isOverdue && <span className="ml-2 text-[10px] bg-[#283852]/10 text-[#283852] px-1.5 py-0.5 rounded-full">Overdue</span>}
                            </p>
                        </div>
                        {invoice.sentAt && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.detail.sentOn')}</p>
                                <p className="text-sm text-gray-600 mt-1">{formatDate(invoice.sentAt)}</p>
                            </div>
                        )}
                        {invoice.paidAt && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.detail.paidOn')}</p>
                                <p className="text-sm text-[#33cbcc] font-medium mt-1">{formatDate(invoice.paidAt)}</p>
                            </div>
                        )}
                    </div>

                    {/* Items table (view or edit mode) */}
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('invoices.detail.items')}</p>
                            {isProforma && !isEditing && (
                                <button
                                    onClick={() => { setIsEditing(true); setEditItems(invoice.items.map(it => ({ description: it.description, quantity: String(it.quantity), unitPrice: String(it.unitPrice) }))); setEditNotes(invoice.notes || ''); }}
                                    className="text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                                >
                                    Modifier
                                </button>
                            )}
                        </div>

                        {isEditing ? (
                            <div className="space-y-2">
                                {editItems.map((it, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={it.description}
                                            onChange={e => updateEditItem(idx, 'description', e.target.value)}
                                            placeholder="Description"
                                            className="flex-1 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                        />
                                        <input
                                            type="number"
                                            value={it.quantity}
                                            onChange={e => updateEditItem(idx, 'quantity', e.target.value)}
                                            className="w-16 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                        />
                                        <input
                                            type="number"
                                            value={it.unitPrice}
                                            onChange={e => updateEditItem(idx, 'unitPrice', e.target.value)}
                                            placeholder="Prix"
                                            className="w-28 bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                        />
                                        <span className="w-24 text-xs font-medium text-gray-600 text-right shrink-0">
                                            {formatCurrency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                                        </span>
                                        {editItems.length > 1 && (
                                            <button onClick={() => removeEditItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                                <Delete02Icon size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={addEditItem} className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] mt-1">
                                    <Add01Icon size={12} /> Ajouter une ligne
                                </button>
                                <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 border-t border-gray-200">
                                    <span>Sous-total</span>
                                    <span>{formatCurrency(editSubtotal)}</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                                    <textarea
                                        value={editNotes}
                                        onChange={e => setEditNotes(e.target.value)}
                                        rows={2}
                                        className="w-full bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] resize-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                                    <div className="col-span-5">{t('invoices.create.description')}</div>
                                    <div className="col-span-2 text-right">{t('invoices.create.quantity')}</div>
                                    <div className="col-span-2 text-right">{t('invoices.create.unitPrice')}</div>
                                    <div className="col-span-3 text-right">{t('invoices.create.amount')}</div>
                                </div>
                                {(invoice.items || []).map((item, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm">
                                        <div className="col-span-5 text-gray-800">{item.description}</div>
                                        <div className="col-span-2 text-right text-gray-600">{item.quantity}</div>
                                        <div className="col-span-2 text-right text-gray-600">{formatCurrency(item.unitPrice)}</div>
                                        <div className="col-span-3 text-right font-medium text-gray-800">{formatCurrency(item.amount)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    {!isEditing && (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{t('invoices.detail.subtotal')}</span>
                                <span>{formatCurrency(Number(invoice.subtotal))}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{t('invoices.detail.tax')} ({invoice.taxRate}%)</span>
                                <span>{formatCurrency(Number(invoice.taxAmount))}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                                <span>{t('invoices.detail.total')}</span>
                                <span>{formatCurrency(Number(invoice.total))}</span>
                            </div>
                        </div>
                    )}

                    {/* Notes (view mode) */}
                    {!isEditing && invoice.notes && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('invoices.detail.notes')}</p>
                            <p className="text-sm text-gray-600">{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
                    {isEditing ? (
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={updateInvoice.isPending}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
                            >
                                {updateInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                Enregistrer
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Letterhead selector */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                                    <Image01Icon size={12} />
                                    {t('invoices.detail.letterhead')}
                                </div>
                                <button
                                    onClick={() => setSelectedLetterhead(null)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        selectedLetterhead === null
                                            ? 'bg-[#33cbcc] text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {t('invoices.detail.letterheadNone')}
                                </button>
                                {LETTERHEADS.map(lh => (
                                    <button
                                        key={lh.key}
                                        onClick={() => setSelectedLetterhead(lh.key)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            selectedLetterhead === lh.key
                                                ? 'bg-[#33cbcc] text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {lh.label}
                                    </button>
                                ))}
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleExportPdf}
                                        disabled={isExporting || sendInvoice.isPending}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        {(isExporting || sendInvoice.isPending) ? <Loading02Icon size={14} className="animate-spin" /> : <Download01Icon size={14} />}
                                        {isProforma ? 'Télécharger proforma' : t('invoices.detail.exportPdf')}
                                    </button>
                                    {invoice.status === 'PAID' && (
                                        <button
                                            onClick={handleExportReceipt}
                                            disabled={isExportingReceipt}
                                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
                                        >
                                            {isExportingReceipt ? <Loading02Icon size={14} className="animate-spin" /> : <Invoice01Icon size={14} />}
                                            {t('invoices.detail.exportReceipt')}
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    {isProforma && (
                                        <>
                                            <button
                                                onClick={() => deleteInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                                disabled={deleteInvoice.isPending}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
                                            >
                                                {deleteInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Delete02Icon size={14} />}
                                                Supprimer
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmValidate(true)}
                                                disabled={validateProforma.isPending}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                                            >
                                                {validateProforma.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                                Valider en facture
                                            </button>
                                        </>
                                    )}
                                    {!isProforma && invoice.status === 'CREATED' && (
                                        <>
                                            <button
                                                onClick={() => deleteInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                                disabled={deleteInvoice.isPending}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
                                            >
                                                {deleteInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Delete02Icon size={14} />}
                                                {t('invoices.detail.delete')}
                                            </button>
                                            <button
                                                onClick={() => sendInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                                disabled={sendInvoice.isPending}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852]/80 transition-colors shadow-lg shadow-[#283852]/20 disabled:opacity-50"
                                            >
                                                {sendInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <SentIcon size={14} />}
                                                {t('invoices.detail.send')}
                                            </button>
                                        </>
                                    )}
                                    {!isProforma && !isAcompte && invoice.status === 'SENT' && (
                                        <>
                                            <button
                                                onClick={() => setShowAcompteModal(true)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
                                            >
                                                <Add01Icon size={14} />
                                                Acompte
                                            </button>
                                            <button
                                                onClick={() => rejectInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                                disabled={rejectInvoice.isPending}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
                                            >
                                                {rejectInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <CancelCircleIcon size={14} />}
                                                {t('invoices.detail.reject')}
                                            </button>
                                            <button
                                                onClick={() => setShowConfirmPay(true)}
                                                disabled={payInvoice.isPending}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                                            >
                                                {payInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                                {t('invoices.detail.pay')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Acompte Modal */}
            <AnimatePresence>
                {showAcompteModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowAcompteModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1f2e] border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-[#33cbcc]/10">
                                    <Add01Icon size={20} className="text-[#33cbcc]" />
                                </div>
                                <h3 className="text-base font-semibold text-white">Facture d'acompte</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-4">
                                Montant total de la facture : <span className="text-white font-semibold">{formatCurrency(Number(invoice.total))}</span>
                            </p>
                            <div className="mb-6">
                                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Montant de l'acompte</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={Number(invoice.total)}
                                    value={acompteAmount}
                                    onChange={e => setAcompteAmount(e.target.value)}
                                    placeholder="Ex: 150000"
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setShowAcompteModal(false); setAcompteAmount(''); }} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors">
                                    Annuler
                                </button>
                                <button
                                    disabled={!acompteAmount || Number(acompteAmount) <= 0 || Number(acompteAmount) > Number(invoice.total) || createAcompte.isPending}
                                    onClick={() => {
                                        createAcompte.mutate({ id: invoice.id, amount: Number(acompteAmount) }, {
                                            onSuccess: () => { setShowAcompteModal(false); setAcompteAmount(''); onClose(); },
                                        });
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createAcompte.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                    Générer
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pay Confirmation Modal */}
            <AnimatePresence>
                {showConfirmPay && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConfirmPay(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1f2e] border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-[#33cbcc]/10">
                                    <Tick01Icon size={20} className="text-[#33cbcc]" />
                                </div>
                                <h3 className="text-base font-semibold text-white">{t('invoices.detail.pay')}</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-6">{t('invoices.detail.confirmPay')}</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirmPay(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                                >
                                    {t('invoices.create.cancel')}
                                </button>
                                <button
                                    onClick={() => { payInvoice.mutate(invoice.id, { onSuccess: onClose }); setShowConfirmPay(false); }}
                                    disabled={payInvoice.isPending}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                                >
                                    {payInvoice.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                    {t('invoices.detail.pay')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
                {showConfirmValidate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowConfirmValidate(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-[#1a1f2e] border border-gray-700/50 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2.5 rounded-xl bg-[#33cbcc]/10">
                                    <Tick01Icon size={20} className="text-[#33cbcc]" />
                                </div>
                                <h3 className="text-base font-semibold text-white">Valider la proforma</h3>
                            </div>
                            <p className="text-sm text-gray-400 mb-6">Cette proforma sera convertie en facture avec un numéro de facture définitif. Cette action est irréversible.</p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setShowConfirmValidate(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => { validateProforma.mutate(invoice.id, { onSuccess: onClose }); setShowConfirmValidate(false); }}
                                    disabled={validateProforma.isPending}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                                >
                                    {validateProforma.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                                    Valider
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ─── Shared invoice table ──────────────────────────────── */

const InvoiceTable = ({ rows, onSelect }: { rows: Invoice[]; onSelect: (inv: Invoice) => void }) => {
    const { t } = useTranslation();
    const isProformaTab = rows.length > 0 && rows[0].type === 'PROFORMA';
    if (rows.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                <File01Icon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-400 font-medium">{t('invoices.noResults')}</p>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-2">{isProformaTab ? 'N° Proforma' : t('invoices.table.invoiceNumber')}</div>
                <div className="col-span-2">{t('invoices.table.client')}</div>
                <div className="col-span-2">{t('invoices.table.project')}</div>
                <div className="col-span-2 text-right">{t('invoices.table.amount')}</div>
                <div className="col-span-1">{t('invoices.table.status')}</div>
                <div className="col-span-2">{t('invoices.table.dueDate')}</div>
                <div className="col-span-1 text-right">{t('invoices.table.actions')}</div>
            </div>
            {rows.map((invoice, i) => {
                const isOverdue = invoice.status === 'SENT' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
                return (
                    <motion.div
                        key={invoice.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => onSelect(invoice)}
                        className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                        <div className="col-span-2 text-sm font-medium text-gray-800">
                            {invoice.type === 'PROFORMA' ? invoice.proformaNumber : invoice.type === 'ACOMPTE' ? invoice.acompteNumber : invoice.invoiceNumber}
                        </div>
                        <div className="col-span-2 text-sm text-gray-600 truncate">{invoice.client?.name || '—'}</div>
                        <div className="col-span-2 text-sm text-gray-600 truncate">{invoice.project?.name || '—'}</div>
                        <div className="col-span-2 text-sm font-semibold text-gray-800 text-right">{formatCurrency(Number(invoice.total))}</div>
                        <div className="col-span-1">
                            {invoice.type === 'PROFORMA' ? (
                                <span className="text-[10px] font-semibold text-[#33cbcc]">En attente</span>
                            ) : invoice.type === 'ACOMPTE' ? (
                                <span className="text-[10px] font-semibold text-[#33cbcc]">Payé</span>
                            ) : (
                                <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: STATUS_COLORS[invoice.status] }}>
                                    {t(`invoices.status.${invoice.status.toLowerCase()}`)}
                                </span>
                            )}
                        </div>
                        <div className={`col-span-2 flex items-center gap-1.5 text-xs ${isOverdue ? 'text-[#283852] font-semibold' : 'text-gray-400'}`}>
                            <Calendar01Icon size={12} />
                            {formatDate(invoice.dueDate)}
                            {isOverdue && <Alert02Icon size={12} className="text-[#283852]" />}
                        </div>
                        <div className="col-span-1 flex justify-end">
                            <button
                                onClick={e => { e.stopPropagation(); onSelect(invoice); }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <ViewIcon size={14} />
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Invoices = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'invoices' | 'proformas' | 'acomptes'>('invoices');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showCreateProformaModal, setShowCreateProformaModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const deptScope = useDepartmentScope();
    const { data: invoices, isLoading } = useInvoices(deptScope);
    const { data: stats } = useInvoiceStats(deptScope);

    const onlyInvoices = useMemo(() => (invoices || []).filter(inv => inv.type === 'INVOICE'), [invoices]);
    const onlyProformas = useMemo(() => (invoices || []).filter(inv => inv.type === 'PROFORMA'), [invoices]);
    const onlyAcomptes = useMemo(() => (invoices || []).filter(inv => inv.type === 'ACOMPTE'), [invoices]);

    const filteredAcomptes = useMemo(() => {
        return onlyAcomptes.filter(inv =>
            !searchQuery ||
            (inv.acompteNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [onlyAcomptes, searchQuery]);

    const filteredInvoices = useMemo(() => {
        return onlyInvoices.filter(inv => {
            const matchesSearch = !searchQuery ||
                (inv.invoiceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [onlyInvoices, searchQuery, filterStatus]);

    const filteredProformas = useMemo(() => {
        return onlyProformas.filter(inv =>
            !searchQuery ||
            (inv.proformaNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [onlyProformas, searchQuery]);

    /* Chart data */
    const monthlyRevenueData = useMemo(() => {
        const acomptesByParent = onlyAcomptes.reduce((map, a) => {
            if (a.parentInvoiceId) map[a.parentInvoiceId] = (map[a.parentInvoiceId] || 0) + Number(a.total);
            return map;
        }, {} as Record<string, number>);

        return MONTHS.map((month, i) => {
            const acompteTotal = onlyAcomptes
                .filter(a => new Date(a.issueDate).getMonth() === i)
                .reduce((sum, a) => sum + Number(a.total), 0);
            const invoiceTotal = onlyInvoices
                .filter(inv => inv.status === 'PAID' && inv.paidAt && new Date(inv.paidAt).getMonth() === i)
                .reduce((sum, inv) => sum + Math.max(0, Number(inv.total) - (acomptesByParent[inv.id] || 0)), 0);
            return { month, total: acompteTotal + invoiceTotal };
        });
    }, [onlyInvoices, onlyAcomptes]);

    const statusDistribution = useMemo(() => {
        return STATUS_KEYS.map(status => ({
            name: t(`invoices.status.${status.toLowerCase()}`),
            value: onlyInvoices.filter(inv => inv.status === status).length,
            color: STATUS_COLORS[status],
        }));
    }, [onlyInvoices, t]);

    /* Reset search when switching tabs */
    const switchTab = (tab: 'invoices' | 'proformas' | 'acomptes') => {
        setActiveTab(tab);
        setSearchQuery('');
        setFilterStatus('all');
    };

    if (isLoading) return <InvoicesSkeleton />;

    const statCards = [
        { label: t('invoices.stats.total'), value: stats?.total || 0, icon: File01Icon, color: '#33cbcc', isCurrency: false },
        { label: t('invoices.stats.revenue'), value: stats?.totalRevenue || 0, icon: ArrowUpRight01Icon, color: '#33cbcc', isCurrency: true },
        { label: t('invoices.stats.pending'), value: stats?.totalPending || 0, icon: Clock01Icon, color: '#283852', isCurrency: true },
        { label: t('invoices.stats.overdue'), value: stats?.overdue || 0, icon: Alert02Icon, color: '#283852', isCurrency: false },
    ];

    const statusFilters: { key: InvoiceStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('invoices.filterAll') },
        ...STATUS_KEYS.map(s => ({ key: s, label: t(`invoices.status.${s.toLowerCase()}`) })),
    ];

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('invoices.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('invoices.subtitle')}</p>
                </div>
                {activeTab === 'invoices' && (
                    <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20">
                        <Add01Icon size={16} />{t('invoices.newInvoice')}
                    </button>
                )}
                {activeTab === 'proformas' && (
                    <button onClick={() => setShowCreateProformaModal(true)} className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20">
                        <Add01Icon size={16} />Nouvelle Proforma
                    </button>
                )}
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                <button
                    onClick={() => switchTab('invoices')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'invoices'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <File01Icon size={14} />
                    Factures
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'invoices' ? 'bg-[#33cbcc]/10 text-[#33cbcc]' : 'bg-gray-200 text-gray-500'}`}>
                        {onlyInvoices.length}
                    </span>
                </button>
                <button
                    onClick={() => switchTab('proformas')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === 'proformas'
                            ? 'bg-white text-gray-800 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Briefcase01Icon size={14} />
                    Proformas
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'proformas' ? 'text-[#33cbcc]' : 'bg-gray-200 text-gray-500'}`}>
                        {onlyProformas.length}
                    </span>
                </button>
                <button
                    onClick={() => switchTab('acomptes')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'acomptes' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Invoice01Icon size={14} />
                    Acomptes
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'acomptes' ? 'text-[#33cbcc]' : 'bg-gray-200 text-gray-500'}`}>
                        {onlyAcomptes.length}
                    </span>
                </button>
            </div>

            {activeTab === 'invoices' && (
                <>
                    {/* ── Stat Cards ── */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                        {statCards.map((stat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden"
                            >
                                <div className="relative z-10">
                                    <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                                    <h2 className="text-2xl font-bold text-gray-800 mt-2">
                                        {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                                    </h2>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-5" style={{ color: stat.color }}>
                                    <stat.icon size={100} strokeWidth={1.5} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* ── Charts ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-white p-6 rounded-3xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">{t('invoices.charts.monthlyRevenue')}</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <BarChart data={monthlyRevenueData} barSize={28}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} formatter={(v) => [formatCurrency(v as number), 'Revenue']} />
                                        <Bar dataKey="total" fill="#33cbcc" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-3xl border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-6">{t('invoices.charts.statusDistribution')}</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                                    <PieChart>
                                        <Pie data={statusDistribution.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                            {statusDistribution.filter(d => d.value > 0).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                                {statusDistribution.map(item => (
                                    <div key={item.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                        {item.name} ({item.value})
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* ── Search01Icon ── */}
                    <div className="flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                        <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                        <input type="text" placeholder={t('invoices.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]" />
                    </div>

                    {/* ── Status Filters ── */}
                    <div className="flex gap-2 flex-wrap">
                        {statusFilters.map(sf => (
                            <button
                                key={sf.key}
                                onClick={() => setFilterStatus(sf.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filterStatus === sf.key ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20' : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'}`}
                            >
                                {sf.key !== 'all' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterStatus === sf.key ? '#fff' : STATUS_COLORS[sf.key] }} />}
                                {sf.label}
                            </button>
                        ))}
                    </div>

                    <InvoiceTable rows={filteredInvoices} onSelect={setSelectedInvoice} />
                </>
            )}

            {activeTab === 'proformas' && (
                <>
                    <div className="flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                        <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                        <input type="text" placeholder="Rechercher une proforma..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]" />
                    </div>
                    <InvoiceTable rows={filteredProformas} onSelect={setSelectedInvoice} />
                </>
            )}

            {activeTab === 'acomptes' && (
                <>
                    <div className="flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                        <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                        <input type="text" placeholder="Rechercher un acompte..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]" />
                    </div>
                    <InvoiceTable rows={filteredAcomptes} onSelect={setSelectedInvoice} />
                </>
            )}

            {/* ── Modals ── */}
            <AnimatePresence>
                {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} />}
                {showCreateProformaModal && <CreateInvoiceModal onClose={() => setShowCreateProformaModal(false)} isProforma />}
                {selectedInvoice && <InvoiceDetailModal invoice={selectedInvoice} onClose={() => setSelectedInvoice(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default Invoices;
