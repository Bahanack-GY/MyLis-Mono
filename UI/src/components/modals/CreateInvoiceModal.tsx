import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    FileText,
    X,
    Plus,
    Trash2,
    Calendar,
    Briefcase,
    AlignLeft,
    Loader2,
    Layers,
} from 'lucide-react';
import { useCreateInvoice } from '../../api/invoices/hooks';
import { useDepartmentScope } from '../../contexts/AuthContext';
import { useProjects } from '../../api/projects/hooks';
import { useDepartments } from '../../api/departments/hooks';

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const inputCls =
    'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
const labelCls =
    'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

export const CreateInvoiceModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createInvoice = useCreateInvoice();
    const deptScope = useDepartmentScope();
    const { data: departments } = useDepartments();
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(deptScope || '');
    const { data: projects } = useProjects(selectedDepartmentId || undefined);

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
                    {/* Department filter (hidden if user is scoped to a department) */}
                    {!deptScope && (
                        <div>
                            <label className={labelCls}>
                                <Layers size={12} />
                                {t('invoices.create.department')}
                            </label>
                            <select
                                value={selectedDepartmentId}
                                onChange={e => {
                                    setSelectedDepartmentId(e.target.value);
                                    setForm(prev => ({ ...prev, projectId: '' }));
                                }}
                                className={inputCls + ' appearance-none cursor-pointer'}
                            >
                                <option value="">{t('invoices.create.departmentPlaceholder', 'All departments')}</option>
                                {(departments || []).map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

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

                    {/* Auto-filled client info */}
                    {selectedProject && (
                        <div>
                            <label className={labelCls}>{t('invoices.create.client')}</label>
                            <div className="px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-600">
                                {selectedProject.client?.name || '—'}
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

                        <div className="overflow-x-auto">
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
                                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-[#283852] transition-all shrink-0"
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
                                                        className="p-1.5 rounded-lg text-gray-400 hover:bg-[#283852]/10 hover:text-[#283852] transition-colors"
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
                                clientId: selectedProject.clientId!,
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
