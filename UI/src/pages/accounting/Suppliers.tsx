import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Search01Icon, ArrowDown01Icon, ArrowUp01Icon, Cancel01Icon, DeliveryTruck01Icon, File01Icon, Tick01Icon, Clock01Icon, Alert01Icon, ViewIcon, PencilIcon, Delete02Icon, Building02Icon, CallIcon, Mail01Icon, CreditCardIcon, Calendar01Icon } from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useDepartments } from '../../api/departments/hooks';

const API = import.meta.env.VITE_API_URL || '';

/* ─── Types ─── */
interface Supplier {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    rccm: string | null;
    niu: string | null;
    paymentTermsDays: number;
    notes: string | null;
    isActive: boolean;
}

interface InvoiceItem {
    id?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    totalHT?: number;
    totalTTC?: number;
}

interface SupplierInvoice {
    id: string;
    invoiceNumber: string;
    supplierId: string;
    supplier: { id: string; name: string; email: string | null; phone: string | null };
    departmentId: string | null;
    department: { id: string; name: string } | null;
    date: string;
    dueDate: string;
    status: 'DRAFT' | 'VALIDATED' | 'PAID' | 'CANCELLED';
    totalHT: number;
    taxAmount: number;
    totalTTC: number;
    notes: string | null;
    paidAt: string | null;
    items: InvoiceItem[];
}

interface InvoiceStats {
    totalDraft: number;
    totalValidated: number;
    totalPaid: number;
    totalOverdue: number;
    countDraft: number;
    countValidated: number;
    countPaid: number;
    countOverdue: number;
}

/* ─── API ─── */
const suppliersApi = {
    getSuppliers: () => axios.get(`${API}/suppliers`).then(r => r.data as Supplier[]),
    createSupplier: (dto: any) => axios.post(`${API}/suppliers`, dto).then(r => r.data),
    updateSupplier: (id: string, dto: any) => axios.patch(`${API}/suppliers/${id}`, dto).then(r => r.data),
    deleteSupplier: (id: string) => axios.delete(`${API}/suppliers/${id}`).then(r => r.data),

    getInvoices: (params?: { supplierId?: string; status?: string; departmentId?: string }) =>
        axios.get(`${API}/suppliers/invoices/list`, { params }).then(r => r.data as SupplierInvoice[]),
    getStats: (departmentId?: string) =>
        axios.get(`${API}/suppliers/invoices/stats`, { params: { departmentId } }).then(r => r.data as InvoiceStats),
    createInvoice: (dto: any) => axios.post(`${API}/suppliers/invoices`, dto).then(r => r.data),
    updateInvoice: (id: string, dto: any) => axios.patch(`${API}/suppliers/invoices/${id}`, dto).then(r => r.data),
    validateInvoice: (id: string) => axios.post(`${API}/suppliers/invoices/${id}/validate`).then(r => r.data),
    payInvoice: (id: string, paidAt?: string) => axios.post(`${API}/suppliers/invoices/${id}/pay`, { paidAt }).then(r => r.data),
    cancelInvoice: (id: string) => axios.post(`${API}/suppliers/invoices/${id}/cancel`).then(r => r.data),
};

/* ─── Hooks ─── */
function useSuppliers() {
    return useQuery({ queryKey: ['suppliers'], queryFn: suppliersApi.getSuppliers });
}
function useInvoices(params?: { supplierId?: string; status?: string }) {
    return useQuery({ queryKey: ['supplier-invoices', params], queryFn: () => suppliersApi.getInvoices(params) });
}
function useInvoiceStats() {
    return useQuery({ queryKey: ['supplier-invoice-stats'], queryFn: () => suppliersApi.getStats() });
}

/* ─── Helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));
const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR');

const STATUS_CONFIG = {
    DRAFT:      { label: 'Brouillon',  color: 'bg-[#283852]/10 text-[#283852]/70', icon: Clock01Icon },
    VALIDATED:  { label: 'Validée',    color: 'bg-[#33cbcc]/10 text-[#33cbcc]',   icon: Tick01Icon },
    PAID:       { label: 'Payée',      color: 'bg-[#283852] text-white',           icon: Tick01Icon },
    CANCELLED:  { label: 'Annulée',    color: 'bg-gray-100 text-gray-400',         icon: Cancel01Icon },
};

/* ─── SupplierModal ─── */
function SupplierModal({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({
        name: supplier?.name ?? '',
        email: supplier?.email ?? '',
        phone: supplier?.phone ?? '',
        address: supplier?.address ?? '',
        rccm: supplier?.rccm ?? '',
        niu: supplier?.niu ?? '',
        paymentTermsDays: supplier?.paymentTermsDays ?? 30,
        notes: supplier?.notes ?? '',
    });

    const mutation = useMutation({
        mutationFn: (dto: any) => supplier
            ? suppliersApi.updateSupplier(supplier.id, dto)
            : suppliersApi.createSupplier(dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
    });

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-semibold">{supplier ? 'Modifier fournisseur' : 'Nouveau fournisseur'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><Cancel01Icon size={18} /></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium mb-1">Nom *</label>
                        <input value={form.name} onChange={e => set('name', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input value={form.email} onChange={e => set('email', e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Téléphone</label>
                            <input value={form.phone} onChange={e => set('phone', e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Adresse</label>
                        <input value={form.address} onChange={e => set('address', e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">RCCM</label>
                            <input value={form.rccm} onChange={e => set('rccm', e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">NIU</label>
                            <input value={form.niu} onChange={e => set('niu', e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Délai de paiement (jours)</label>
                        <input type="number" value={form.paymentTermsDays} onChange={e => set('paymentTermsDays', +e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                    <button onClick={() => mutation.mutate(form)} disabled={!form.name || mutation.isPending}
                        className="px-4 py-2 text-sm bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50">
                        {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ─── InvoiceFormModal ─── */
function InvoiceFormModal({ invoice, suppliers, onClose }: {
    invoice: SupplierInvoice | null;
    suppliers: Supplier[];
    onClose: () => void;
}) {
    const qc = useQueryClient();
    const { data: departments = [] } = useDepartments();
    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        supplierId: invoice?.supplierId ?? (suppliers[0]?.id ?? ''),
        departmentId: invoice?.departmentId ?? '',
        invoiceNumber: invoice?.invoiceNumber ?? '',
        date: invoice?.date ?? today,
        dueDate: invoice?.dueDate ?? today,
        notes: invoice?.notes ?? '',
    });
    const [items, setItems] = useState<InvoiceItem[]>(
        invoice?.items?.length
            ? invoice.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, taxRate: i.taxRate }))
            : [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    );

    const computedItems = useMemo(() => items.map(i => {
        const totalHT = Math.round(i.quantity * i.unitPrice * 100) / 100;
        const totalTTC = Math.round(totalHT * (1 + i.taxRate / 100) * 100) / 100;
        return { ...i, totalHT, totalTTC };
    }), [items]);

    const totalHT = computedItems.reduce((s, i) => s + i.totalHT, 0);
    const totalTTC = computedItems.reduce((s, i) => s + i.totalTTC, 0);
    const taxAmount = totalTTC - totalHT;

    const mutation = useMutation({
        mutationFn: (dto: any) => invoice
            ? suppliersApi.updateInvoice(invoice.id, dto)
            : suppliersApi.createInvoice(dto),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-invoices'] }); onClose(); },
    });

    const setItem = (idx: number, k: string, v: any) =>
        setItems(its => its.map((it, i) => i === idx ? { ...it, [k]: v } : it));

    const addItem = () => setItems(its => [...its, { description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]);
    const removeItem = (idx: number) => setItems(its => its.filter((_, i) => i !== idx));

    const submit = () => mutation.mutate({
        ...form,
        departmentId: form.departmentId || null,
        items: computedItems,
    });

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-lg font-semibold">{invoice ? 'Modifier la facture' : 'Nouvelle facture fournisseur'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><Cancel01Icon size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    {/* Header fields */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Fournisseur *</label>
                            <select value={form.supplierId} onChange={e => setForm(f => ({ ...f, supplierId: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30">
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Département</label>
                            <select value={form.departmentId} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30">
                                <option value="">Aucun</option>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">N° Facture (auto si vide)</label>
                            <input value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                                placeholder="FINV-2025-0001"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                        <div />
                        <div>
                            <label className="block text-sm font-medium mb-1">Date facture *</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Date d'échéance *</label>
                            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-sm">Lignes</h3>
                            <button onClick={addItem} className="text-xs text-[#283852] hover:underline flex items-center gap-1">
                                <Add01Icon size={14} /> Ajouter une ligne
                            </button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">Qté</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">P.U. HT</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 w-20">TVA %</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 w-28">Total TTC</th>
                                        <th className="w-10" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {computedItems.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-3 py-2">
                                                <input value={item.description} onChange={e => setItem(idx, 'description', e.target.value)}
                                                    placeholder="Description..."
                                                    className="w-full focus:outline-none text-sm" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" value={item.quantity} onChange={e => setItem(idx, 'quantity', +e.target.value)}
                                                    className="w-full text-right focus:outline-none text-sm" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" value={item.unitPrice} onChange={e => setItem(idx, 'unitPrice', +e.target.value)}
                                                    className="w-full text-right focus:outline-none text-sm" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" value={item.taxRate} onChange={e => setItem(idx, 'taxRate', +e.target.value)}
                                                    className="w-full text-right focus:outline-none text-sm" />
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">{fmt(item.totalTTC)}</td>
                                            <td className="px-3 py-2">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(idx)} className="text-gray-400 hover:text-[#283852]">
                                                        <Cancel01Icon size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end mt-2 gap-6 text-sm pr-12">
                            <span className="text-gray-500">Sous-total HT: <span className="font-medium text-gray-800">{fmt(totalHT)} FCFA</span></span>
                            <span className="text-gray-500">TVA: <span className="font-medium text-gray-800">{fmt(taxAmount)} FCFA</span></span>
                            <span className="text-gray-500 font-semibold">Total TTC: <span className="text-[#283852] text-base font-bold">{fmt(totalTTC)} FCFA</span></span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Notes</label>
                        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
                    <button onClick={submit} disabled={!form.supplierId || !form.date || !form.dueDate || mutation.isPending}
                        className="px-4 py-2 text-sm bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50">
                        {mutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/* ─── InvoiceDetailModal ─── */
function InvoiceDetailModal({ invoice, onClose }: { invoice: SupplierInvoice; onClose: () => void }) {
    const qc = useQueryClient();
    const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
    const [showPayDate, setShowPayDate] = useState(false);

    const validate = useMutation({
        mutationFn: () => suppliersApi.validateInvoice(invoice.id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-invoices'] }); qc.invalidateQueries({ queryKey: ['supplier-invoice-stats'] }); },
    });
    const pay = useMutation({
        mutationFn: () => suppliersApi.payInvoice(invoice.id, payDate),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-invoices'] }); qc.invalidateQueries({ queryKey: ['supplier-invoice-stats'] }); setShowPayDate(false); },
    });
    const cancel = useMutation({
        mutationFn: () => suppliersApi.cancelInvoice(invoice.id),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-invoices'] }); qc.invalidateQueries({ queryKey: ['supplier-invoice-stats'] }); },
    });

    const cfg = STATUS_CONFIG[invoice.status];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-semibold">{invoice.invoiceNumber}</h2>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                <cfg.icon size={12} /> {cfg.label}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{invoice.supplier.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><Cancel01Icon size={18} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><span className="text-gray-500">Date:</span> <span className="font-medium ml-1">{fmtDate(invoice.date)}</span></div>
                        <div><span className="text-gray-500">Échéance:</span> <span className="font-medium ml-1">{fmtDate(invoice.dueDate)}</span></div>
                        {invoice.department && <div><span className="text-gray-500">Département:</span> <span className="font-medium ml-1">{invoice.department.name}</span></div>}
                        {invoice.paidAt && <div><span className="text-gray-500">Payée le:</span> <span className="font-medium ml-1 text-[#33cbcc]">{fmtDate(invoice.paidAt)}</span></div>}
                    </div>

                    {invoice.items?.length > 0 && (
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-3 py-2 font-medium text-gray-600">Description</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">Qté</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">P.U. HT</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">TVA</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600">Total TTC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.items.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-3 py-2">{item.description}</td>
                                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                                            <td className="px-3 py-2 text-right">{fmt(item.unitPrice)}</td>
                                            <td className="px-3 py-2 text-right">{item.taxRate}%</td>
                                            <td className="px-3 py-2 text-right font-medium">{fmt(item.totalTTC ?? 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-6 text-sm">
                        <span className="text-gray-500">HT: <span className="font-medium">{fmt(Number(invoice.totalHT))} FCFA</span></span>
                        <span className="text-gray-500">TVA: <span className="font-medium">{fmt(Number(invoice.taxAmount))} FCFA</span></span>
                        <span className="font-bold text-[#283852] text-base">{fmt(Number(invoice.totalTTC))} FCFA</span>
                    </div>

                    {invoice.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>}

                    {/* Pay date picker */}
                    <AnimatePresence>
                        {showPayDate && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="bg-[#283852]/10 rounded-lg p-4 flex items-center gap-3">
                                <Calendar01Icon size={16} className="text-[#283852]" />
                                <label className="text-sm font-medium text-[#283852]">Date de paiement:</label>
                                <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                                <button onClick={() => pay.mutate()} disabled={pay.isPending}
                                    className="ml-auto px-3 py-1.5 bg-[#33cbcc] text-white text-sm rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50">
                                    {pay.isPending ? '...' : 'Confirmer paiement'}
                                </button>
                                <button onClick={() => setShowPayDate(false)} className="text-gray-400 hover:text-gray-600"><Cancel01Icon size={16} /></button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                <div className="flex items-center justify-between gap-3 p-6 border-t">
                    <div className="flex gap-2">
                        {invoice.status === 'DRAFT' && (
                            <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                                className="px-3 py-1.5 text-sm border border-gray-200 text-[#283852] rounded-lg hover:bg-[#283852]/10 disabled:opacity-50">
                                Annuler
                            </button>
                        )}
                        {invoice.status === 'VALIDATED' && (
                            <button onClick={() => cancel.mutate()} disabled={cancel.isPending}
                                className="px-3 py-1.5 text-sm border border-gray-200 text-[#283852] rounded-lg hover:bg-[#283852]/10 disabled:opacity-50">
                                Annuler
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {invoice.status === 'DRAFT' && (
                            <button onClick={() => validate.mutate()} disabled={validate.isPending}
                                className="px-4 py-2 text-sm bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] disabled:opacity-50">
                                {validate.isPending ? '...' : 'Valider'}
                            </button>
                        )}
                        {invoice.status === 'VALIDATED' && !showPayDate && (
                            <button onClick={() => setShowPayDate(true)}
                                className="px-4 py-2 text-sm bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6]">
                                Payer
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/* ─── Main Page ─── */
export default function Suppliers() {
    const [tab, setTab] = useState<'invoices' | 'suppliers'>('invoices');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [supplierFilter, setSupplierFilter] = useState('');
    const [editSupplier, setEditSupplier] = useState<Supplier | null | 'new'>(null);
    const [editInvoice, setEditInvoice] = useState<SupplierInvoice | null | 'new'>(null);
    const [viewInvoice, setViewInvoice] = useState<SupplierInvoice | null>(null);

    const { data: suppliers = [] } = useSuppliers();
    const { data: invoices = [] } = useInvoices({ status: statusFilter || undefined, supplierId: supplierFilter || undefined });
    const { data: stats } = useInvoiceStats();
    const qc = useQueryClient();

    const deleteSupplier = useMutation({
        mutationFn: suppliersApi.deleteSupplier,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
    });

    const filteredSuppliers = useMemo(() =>
        suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase())),
        [suppliers, search]
    );

    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                            <DeliveryTruck01Icon size={18} className="text-[#283852]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
                            <p className="text-xs text-gray-500">Gestion des fournisseurs et factures d'achat</p>
                        </div>
                    </div>
                    <button onClick={() => tab === 'invoices' ? setEditInvoice('new') : setEditSupplier('new')}
                        className="flex items-center gap-2 px-4 py-2 bg-[#33cbcc] text-white rounded-xl text-sm hover:bg-[#2bb5b6]">
                        <Add01Icon size={16} />
                        {tab === 'invoices' ? 'Nouvelle facture' : 'Nouveau fournisseur'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4">
                    {[
                        { key: 'invoices', label: 'Factures', icon: File01Icon },
                        { key: 'suppliers', label: 'Fournisseurs', icon: Building02Icon },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-[#283852]/10 text-[#283852]' : 'text-gray-600 hover:bg-gray-100'}`}>
                            <t.icon size={15} /> {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats (invoices tab only) */}
            {tab === 'invoices' && stats && (
                <div className="grid grid-cols-4 gap-4 px-6 py-4">
                    {[
                        { label: 'Brouillons', count: stats.countDraft, total: stats.totalDraft, color: 'gray' },
                        { label: 'À payer', count: stats.countValidated, total: stats.totalValidated, color: 'blue' },
                        { label: 'Payées', count: stats.countPaid, total: stats.totalPaid, color: 'green' },
                        { label: 'En retard', count: stats.countOverdue, total: stats.totalOverdue, color: 'red' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border p-4">
                            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                            <p className={`text-xl font-bold text-${s.color}-600`}>{fmt(s.total)}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.count} facture{s.count > 1 ? 's' : ''}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {tab === 'invoices' ? (
                    <>
                        {/* Filters */}
                        <div className="flex gap-3 mb-4">
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 bg-white">
                                <option value="">Tous les statuts</option>
                                <option value="DRAFT">Brouillon</option>
                                <option value="VALIDATED">Validée</option>
                                <option value="PAID">Payée</option>
                                <option value="CANCELLED">Annulée</option>
                            </select>
                            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
                                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 bg-white">
                                <option value="">Tous les fournisseurs</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Invoice list */}
                        <div className="bg-white rounded-2xl border overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">N° Facture</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Fournisseur</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                                        <th className="text-left px-4 py-3 font-medium text-gray-600">Échéance</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-600">Montant TTC</th>
                                        <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                                        <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">Aucune facture</td></tr>
                                    ) : invoices.map(inv => {
                                        const cfg = STATUS_CONFIG[inv.status];
                                        const overdue = inv.status === 'VALIDATED' && inv.dueDate < today;
                                        return (
                                            <tr key={inv.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setViewInvoice(inv)}>
                                                <td className="px-4 py-3 font-mono font-medium text-[#283852]">{inv.invoiceNumber}</td>
                                                <td className="px-4 py-3">{inv.supplier.name}</td>
                                                <td className="px-4 py-3 text-gray-600">{fmtDate(inv.date)}</td>
                                                <td className={`px-4 py-3 ${overdue ? 'text-[#283852] font-medium' : 'text-gray-600'}`}>
                                                    {fmtDate(inv.dueDate)}
                                                    {overdue && <Alert01Icon size={12} className="inline ml-1" />}
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold">{fmt(Number(inv.totalTTC))} FCFA</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                                        <cfg.icon size={11} /> {cfg.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => setViewInvoice(inv)}
                                                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Voir">
                                                        <ViewIcon size={15} />
                                                    </button>
                                                    {inv.status === 'DRAFT' && (
                                                        <button onClick={() => setEditInvoice(inv)}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 ml-1" title="Modifier">
                                                            <PencilIcon size={15} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Search01Icon */}
                        <div className="relative mb-4 max-w-xs">
                            <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                                className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors" />
                        </div>

                        {/* Supplier cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredSuppliers.map(s => (
                                <div key={s.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                                                <DeliveryTruck01Icon size={18} className="text-[#283852]" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                                                {!s.isActive && <span className="text-xs text-[#283852]/60">Inactif</span>}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditSupplier(s)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><PencilIcon size={14} /></button>
                                            <button onClick={() => { if (confirm('Supprimer ce fournisseur ?')) deleteSupplier.mutate(s.id); }}
                                                className="p-1.5 hover:bg-[#283852]/10 rounded-lg text-gray-400 hover:text-[#283852]"><Delete02Icon size={14} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 text-sm text-gray-600">
                                        {s.email && <div className="flex items-center gap-2"><Mail01Icon size={13} className="text-gray-400" />{s.email}</div>}
                                        {s.phone && <div className="flex items-center gap-2"><CallIcon size={13} className="text-gray-400" />{s.phone}</div>}
                                        {s.niu && <div className="flex items-center gap-2"><CreditCardIcon size={13} className="text-gray-400" />NIU: {s.niu}</div>}
                                        <div className="flex items-center gap-2 text-gray-400 text-xs mt-2">
                                            <Calendar01Icon size={12} />Délai paiement: {s.paymentTermsDays}j
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {filteredSuppliers.length === 0 && (
                                <div className="col-span-3 py-16 text-center text-gray-400">
                                    <DeliveryTruck01Icon size={40} className="mx-auto mb-3 opacity-30" />
                                    <p>Aucun fournisseur</p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <AnimatePresence>
                {(editSupplier === 'new' || (editSupplier && editSupplier !== 'new')) && (
                    <SupplierModal
                        supplier={editSupplier === 'new' ? null : editSupplier}
                        onClose={() => setEditSupplier(null)}
                    />
                )}
                {(editInvoice === 'new' || (editInvoice && editInvoice !== 'new')) && (
                    <InvoiceFormModal
                        invoice={editInvoice === 'new' ? null : editInvoice as SupplierInvoice}
                        suppliers={suppliers}
                        onClose={() => setEditInvoice(null)}
                    />
                )}
                {viewInvoice && (
                    <InvoiceDetailModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
                )}
            </AnimatePresence>
        </div>
    );
}
