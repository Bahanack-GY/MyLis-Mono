import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Search,
    Plus,
    X,
    TrendingUp,
    Clock,
    AlertTriangle,
    Loader2,
    Calendar,
    Trash2,
    Send,
    CheckCircle,
    XCircle,
    Download,
    Eye,
    Briefcase,
    AlignLeft,
    Image,
    Receipt,
} from 'lucide-react';

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
    useCreateInvoice,
    useSendInvoice,
    usePayInvoice,
    useRejectInvoice,
    useDeleteInvoice,
} from '../api/invoices/hooks';
import { InvoicesSkeleton } from '../components/Skeleton';
import type { Invoice, InvoiceStatus } from '../api/invoices/types';
import { useInvoiceTemplate } from '../api/invoices/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';
import { useProjects } from '../api/projects/hooks';
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
    CREATED: '#6B7280',
    SENT: '#3B82F6',
    PAID: '#10B981',
    REJECTED: '#EF4444',
};

const STATUS_KEYS: InvoiceStatus[] = ['CREATED', 'SENT', 'PAID', 'REJECTED'];

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ─── Create Invoice Modal ──────────────────────────────── */

const CreateInvoiceModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createInvoice = useCreateInvoice();
    const deptScope = useDepartmentScope();
    const { data: projects } = useProjects(deptScope);

    const [customColumns, setCustomColumns] = useState<{ id: string; label: string }[]>([]);
    const [form, setForm] = useState({
        projectId: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        taxRate: '19.25',
        notes: '',
        items: [{ description: '', quantity: '1', unitPrice: '', customFields: {} as Record<string, string> }],
    });

    const selectedProject = (projects || []).find(p => p.id === form.projectId);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, { description: '', quantity: '1', unitPrice: '', customFields: {} as Record<string, string> }] }));
    const removeItem = (idx: number) => setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
    const updateItem = (idx: number, field: string, value: string) => {
        setForm(prev => ({ ...prev, items: prev.items.map((item, i) => i === idx ? { ...item, [field]: value } : item) }));
    };
    const updateCustomField = (itemIdx: number, colId: string, value: string) => {
        setForm(prev => ({
            ...prev,
            items: prev.items.map((item, i) => i === itemIdx ? { ...item, customFields: { ...item.customFields, [colId]: value } } : item),
        }));
    };

    const addCustomColumn = () => {
        const id = `col_${Date.now()}`;
        setCustomColumns(prev => [...prev, { id, label: 'Column' }]);
    };
    const updateColumnLabel = (id: string, label: string) => {
        setCustomColumns(prev => prev.map(c => c.id === id ? { ...c, label } : c));
    };
    const removeCustomColumn = (id: string) => {
        setCustomColumns(prev => prev.filter(c => c.id !== id));
        setForm(prev => ({
            ...prev,
            items: prev.items.map(item => {
                const { [id]: _removed, ...rest } = item.customFields;
                return { ...item, customFields: rest };
            }),
        }));
    };

    const subtotal = form.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
    const taxAmount = Math.round(subtotal * (Number(form.taxRate) || 0)) / 100;
    const total = subtotal + taxAmount;

    const isValid = form.projectId && form.dueDate && form.items.some(item => item.description.trim() && Number(item.unitPrice) > 0);

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <FileText size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('invoices.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Project */}
                    <div>
                        <label className={labelCls}>
                            <Briefcase size={12} />
                            {t('invoices.create.project')}
                        </label>
                        <select
                            value={form.projectId}
                            onChange={e => setForm(prev => ({ ...prev, projectId: e.target.value }))}
                            className={inputCls + ' appearance-none cursor-pointer'}
                        >
                            <option value="">{t('invoices.create.projectPlaceholder')}</option>
                            {(projects || []).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Auto-filled client + department */}
                    {selectedProject && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>{t('invoices.create.client')}</label>
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
                                    {selectedProject.client?.name || '—'}
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>{t('invoices.create.department')}</label>
                                <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
                                    {selectedProject.department?.name || '—'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('invoices.create.issueDate')}
                            </label>
                            <input
                                type="date"
                                value={form.issueDate}
                                onChange={e => setForm(prev => ({ ...prev, issueDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('invoices.create.dueDate')}
                            </label>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={e => setForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Line Items */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <label className={labelCls + ' mb-0'}>
                                <FileText size={12} />
                                {t('invoices.create.items')}
                            </label>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={addCustomColumn}
                                    className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-2.5 py-1"
                                >
                                    <Plus size={12} />
                                    {t('invoices.create.addColumn', 'Add column')}
                                </button>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                                >
                                    <Plus size={14} />
                                    {t('invoices.create.addItem')}
                                </button>
                            </div>
                        </div>

                        {/* Scrollable table */}
                        <div className="overflow-x-auto">
                            {/* Items header */}
                            <div className="flex gap-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 min-w-max">
                                <div className="w-48 shrink-0">{t('invoices.create.description')}</div>
                                <div className="w-16 shrink-0">{t('invoices.create.quantity')}</div>
                                <div className="w-24 shrink-0">{t('invoices.create.unitPrice')}</div>
                                {customColumns.map(col => (
                                    <div key={col.id} className="w-32 shrink-0 flex items-center gap-1 group">
                                        <input
                                            type="text"
                                            value={col.label}
                                            onChange={e => updateColumnLabel(col.id, e.target.value)}
                                            className="w-full bg-transparent border-b border-dashed border-gray-300 focus:border-[#33cbcc] focus:outline-none text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-0.5 transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeCustomColumn(col.id)}
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all shrink-0"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                                <div className="w-24 shrink-0">{t('invoices.create.amount')}</div>
                                <div className="w-8 shrink-0"></div>
                            </div>

                            <div className="space-y-2">
                                {form.items.map((item, idx) => {
                                    const lineAmount = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                                    const cellCls = "w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all";
                                    return (
                                        <div key={idx} className="flex gap-2 items-center min-w-max">
                                            <div className="w-48 shrink-0">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                                    placeholder={t('invoices.create.descriptionPlaceholder')}
                                                    className={cellCls}
                                                />
                                            </div>
                                            <div className="w-16 shrink-0">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                                    className={cellCls}
                                                />
                                            </div>
                                            <div className="w-24 shrink-0">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={e => updateItem(idx, 'unitPrice', e.target.value)}
                                                    placeholder="0"
                                                    className={cellCls}
                                                />
                                            </div>
                                            {customColumns.map(col => (
                                                <div key={col.id} className="w-32 shrink-0">
                                                    <input
                                                        type="text"
                                                        value={item.customFields[col.id] || ''}
                                                        onChange={e => updateCustomField(idx, col.id, e.target.value)}
                                                        placeholder="—"
                                                        className={cellCls}
                                                    />
                                                </div>
                                            ))}
                                            <div className="w-24 shrink-0 text-xs font-medium text-gray-700 px-1">
                                                {formatCurrency(lineAmount)}
                                            </div>
                                            <div className="w-8 shrink-0 flex justify-end">
                                                {form.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Tax + Totals */}
                    <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center gap-4 mb-4">
                            <label className={labelCls + ' mb-0 whitespace-nowrap'}>{t('invoices.create.taxRate')}</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={form.taxRate}
                                onChange={e => setForm(prev => ({ ...prev, taxRate: e.target.value }))}
                                className="w-24 bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{t('invoices.create.subtotal')}</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{t('invoices.create.tax')} ({form.taxRate}%)</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
                                <span>{t('invoices.create.total')}</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={labelCls}>
                            <AlignLeft size={12} />
                            {t('invoices.create.notes')}
                        </label>
                        <textarea
                            value={form.notes}
                            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder={t('invoices.create.notesPlaceholder')}
                            rows={2}
                            className={inputCls + ' resize-none'}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('invoices.create.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createInvoice.isPending}
                        onClick={() => {
                            if (!isValid || !selectedProject) return;
                            createInvoice.mutate({
                                projectId: form.projectId,
                                departmentId: selectedProject.departmentId,
                                clientId: selectedProject.clientId,
                                issueDate: form.issueDate,
                                dueDate: form.dueDate,
                                taxRate: Number(form.taxRate) || 0,
                                notes: form.notes || undefined,
                                customColumns: customColumns.length > 0 ? customColumns : undefined,
                                items: form.items
                                    .filter(item => item.description.trim() && Number(item.unitPrice) > 0)
                                    .map(item => ({
                                        description: item.description,
                                        quantity: Number(item.quantity) || 1,
                                        unitPrice: Number(item.unitPrice),
                                        metadata: Object.keys(item.customFields).length > 0 ? item.customFields : undefined,
                                    })),
                            }, { onSuccess: () => onClose() });
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid && !createInvoice.isPending
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createInvoice.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('invoices.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Invoice Detail Modal ──────────────────────────────── */

const imgToBase64 = (url: string): Promise<string> =>
    fetch(url)
        .then(r => r.blob())
        .then(blob => new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        }));

const InvoiceDetailModal = ({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) => {
    const { t } = useTranslation();
    const sendInvoice = useSendInvoice();
    const payInvoice = usePayInvoice();
    const rejectInvoice = useRejectInvoice();
    const deleteInvoice = useDeleteInvoice();
    const { data: template } = useInvoiceTemplate(invoice.departmentId || '');
    const [selectedLetterhead, setSelectedLetterhead] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isExportingReceipt, setIsExportingReceipt] = useState(false);
    const [showConfirmPay, setShowConfirmPay] = useState(false);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

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
            exportInvoicePdf(invoice, template, letterheadBase64, sigBase64, cachetBase64);
            if (invoice.status === 'CREATED') {
                sendInvoice.mutate(invoice.id, { onSuccess: onClose });
            }
        } finally {
            setIsExporting(false);
        }
    }, [invoice, template, selectedLetterhead, sendInvoice, onClose]);

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
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${STATUS_COLORS[invoice.status]}15` }}>
                            <FileText size={20} style={{ color: STATUS_COLORS[invoice.status] }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{invoice.invoiceNumber}</h2>
                            <span
                                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: `${STATUS_COLORS[invoice.status]}15`, color: STATUS_COLORS[invoice.status] }}
                            >
                                {t(`invoices.status.${invoice.status.toLowerCase()}`)}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
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
                            <p className={`text-sm mt-1 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-600'}`}>
                                {formatDate(invoice.dueDate)}
                                {isOverdue && <span className="ml-2 text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded-full">Overdue</span>}
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
                                <p className="text-sm text-green-600 font-medium mt-1">{formatDate(invoice.paidAt)}</p>
                            </div>
                        )}
                    </div>

                    {/* Items table */}
                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t('invoices.detail.items')}</p>
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
                    </div>

                    {/* Totals */}
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

                    {/* Notes */}
                    {invoice.notes && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('invoices.detail.notes')}</p>
                            <p className="text-sm text-gray-600">{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
                    {/* Letterhead selector */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">
                            <Image size={12} />
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
                                {(isExporting || sendInvoice.isPending) ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                {t('invoices.detail.exportPdf')}
                            </button>
                            {invoice.status === 'PAID' && (
                                <button
                                    onClick={handleExportReceipt}
                                    disabled={isExportingReceipt}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                >
                                    {isExportingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                                    {t('invoices.detail.exportReceipt')}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {invoice.status === 'CREATED' && (
                                <>
                                    <button
                                        onClick={() => deleteInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                        disabled={deleteInvoice.isPending}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        {deleteInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                        {t('invoices.detail.delete')}
                                    </button>
                                    <button
                                        onClick={() => sendInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                        disabled={sendInvoice.isPending}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                    >
                                        {sendInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {t('invoices.detail.send')}
                                    </button>
                                </>
                            )}
                            {invoice.status === 'SENT' && (
                                <>
                                    <button
                                        onClick={() => rejectInvoice.mutate(invoice.id, { onSuccess: onClose })}
                                        disabled={rejectInvoice.isPending}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-red-500 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    >
                                        {rejectInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                        {t('invoices.detail.reject')}
                                    </button>
                                    <button
                                        onClick={() => setShowConfirmPay(true)}
                                        disabled={payInvoice.isPending}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                    >
                                        {payInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                        {t('invoices.detail.pay')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

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
                                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                                    <CheckCircle size={20} className="text-emerald-400" />
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
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {payInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                    {t('invoices.detail.pay')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Invoices = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    const deptScope = useDepartmentScope();
    const { data: invoices, isLoading } = useInvoices(deptScope);
    const { data: stats } = useInvoiceStats(deptScope);
    const sendInvoice = useSendInvoice();
    const payInvoice = usePayInvoice();

    const filteredInvoices = useMemo(() => {
        return (invoices || []).filter(inv => {
            const matchesSearch = !searchQuery ||
                inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [invoices, searchQuery, filterStatus]);

    /* Chart data */
    const monthlyRevenueData = useMemo(() => {
        const paid = (invoices || []).filter(inv => inv.status === 'PAID');
        return MONTHS.map((month, i) => {
            const total = paid
                .filter(inv => inv.paidAt && new Date(inv.paidAt).getMonth() === i)
                .reduce((sum, inv) => sum + Number(inv.total), 0);
            return { month, total };
        });
    }, [invoices]);

    const statusDistribution = useMemo(() => {
        return STATUS_KEYS.map(status => ({
            name: t(`invoices.status.${status.toLowerCase()}`),
            value: (invoices || []).filter(inv => inv.status === status).length,
            color: STATUS_COLORS[status],
        }));
    }, [invoices, t]);

    if (isLoading) {
        return <InvoicesSkeleton />;
    }

    const statCards = [
        { label: t('invoices.stats.total'), value: stats?.total || 0, icon: FileText, color: '#33cbcc', isCurrency: false },
        { label: t('invoices.stats.revenue'), value: stats?.totalRevenue || 0, icon: TrendingUp, color: '#10B981', isCurrency: true },
        { label: t('invoices.stats.pending'), value: stats?.totalPending || 0, icon: Clock, color: '#F59E0B', isCurrency: true },
        { label: t('invoices.stats.overdue'), value: stats?.overdue || 0, icon: AlertTriangle, color: '#EF4444', isCurrency: false },
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
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Plus size={16} />
                    {t('invoices.newInvoice')}
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl font-bold text-gray-800 mt-2">
                                {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                            </h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Monthly Revenue */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('invoices.charts.monthlyRevenue')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyRevenueData} barSize={28}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                                />
                                <Bar dataKey="total" fill="#33cbcc" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Status Distribution */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('invoices.charts.statusDistribution')}</h3>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusDistribution.filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                >
                                    {statusDistribution.filter(d => d.value > 0).map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Legend */}
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

            {/* ── Search ── */}
            <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                <Search className="text-gray-400 ml-3" size={20} />
                <input
                    type="text"
                    placeholder={t('invoices.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                />
            </div>

            {/* ── Status Filters ── */}
            <div className="flex gap-2 flex-wrap">
                {statusFilters.map(sf => (
                    <button
                        key={sf.key}
                        onClick={() => setFilterStatus(sf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterStatus === sf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {sf.key !== 'all' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: filterStatus === sf.key ? '#fff' : STATUS_COLORS[sf.key] }}
                            />
                        )}
                        {sf.label}
                    </button>
                ))}
            </div>

            {/* ── Invoice Table ── */}
            {filteredInvoices.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-2">{t('invoices.table.invoiceNumber')}</div>
                        <div className="col-span-2">{t('invoices.table.client')}</div>
                        <div className="col-span-2">{t('invoices.table.project')}</div>
                        <div className="col-span-2 text-right">{t('invoices.table.amount')}</div>
                        <div className="col-span-1">{t('invoices.table.status')}</div>
                        <div className="col-span-2">{t('invoices.table.dueDate')}</div>
                        <div className="col-span-1 text-right">{t('invoices.table.actions')}</div>
                    </div>
                    {/* Rows */}
                    {filteredInvoices.map((invoice, i) => {
                        const isOverdue = invoice.status === 'SENT' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
                        return (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => setSelectedInvoice(invoice)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                                {/* Invoice # */}
                                <div className="col-span-2 text-sm font-medium text-gray-800">
                                    {invoice.invoiceNumber}
                                </div>
                                {/* Client */}
                                <div className="col-span-2 text-sm text-gray-600 truncate">
                                    {invoice.client?.name || '—'}
                                </div>
                                {/* Project */}
                                <div className="col-span-2 text-sm text-gray-600 truncate">
                                    {invoice.project?.name || '—'}
                                </div>
                                {/* Amount */}
                                <div className="col-span-2 text-sm font-semibold text-gray-800 text-right">
                                    {formatCurrency(Number(invoice.total))}
                                </div>
                                {/* Status */}
                                <div className="col-span-1">
                                    <span
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                        style={{ backgroundColor: `${STATUS_COLORS[invoice.status]}15`, color: STATUS_COLORS[invoice.status] }}
                                    >
                                        {t(`invoices.status.${invoice.status.toLowerCase()}`)}
                                    </span>
                                </div>
                                {/* Due Date */}
                                <div className={`col-span-2 flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                                    <Calendar size={12} />
                                    {formatDate(invoice.dueDate)}
                                    {isOverdue && <AlertTriangle size={12} className="text-red-500" />}
                                </div>
                                {/* Actions */}
                                <div className="col-span-1 flex justify-end gap-1">
                                    {invoice.status === 'CREATED' && (
                                        <button
                                            onClick={e => { e.stopPropagation(); sendInvoice.mutate(invoice.id); }}
                                            disabled={sendInvoice.isPending}
                                            title={t('invoices.detail.send')}
                                            className="p-1.5 rounded-lg text-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {sendInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        </button>
                                    )}
                                    {invoice.status === 'SENT' && (
                                        <button
                                            onClick={e => { e.stopPropagation(); payInvoice.mutate(invoice.id); }}
                                            disabled={payInvoice.isPending}
                                            title={t('invoices.detail.pay')}
                                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            {payInvoice.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                        </button>
                                    )}
                                    <button
                                        onClick={e => { e.stopPropagation(); setSelectedInvoice(invoice); }}
                                        title={t('invoices.detail.title')}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Eye size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredInvoices.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('invoices.noResults')}</p>
                </div>
            )}

            {/* ── Modals ── */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateInvoiceModal onClose={() => setShowCreateModal(false)} />
                )}
                {selectedInvoice && (
                    <InvoiceDetailModal
                        invoice={selectedInvoice}
                        onClose={() => setSelectedInvoice(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Invoices;
