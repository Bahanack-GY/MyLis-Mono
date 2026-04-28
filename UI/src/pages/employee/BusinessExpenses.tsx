import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Wallet01Icon, Cancel01Icon, Delete02Icon, Loading02Icon, Attachment01Icon, Calendar01Icon, ViewIcon, Upload01Icon } from 'hugeicons-react';
import {
    useMyBusinessExpenses,
    useBusinessExpenseTypes,
    useCreateBusinessExpense,
    useDeleteBusinessExpense,
    useUploadReceipt,
} from '../../api/business-expenses/hooks';
import type { CreateBusinessExpenseDto } from '../../api/business-expenses/types';

/* ─── Constants ──────────────────────────────────────────── */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3025';

const resolveFileUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path}`;
};

const formatFCFA = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const STATUS_BG: Record<string, string> = {
    PENDING: 'bg-[#283852]/10 text-[#283852]/70',
    VALIDATED: 'bg-[#33cbcc]/10 text-[#33cbcc]',
    REJECTED: 'bg-gray-100 text-gray-400',
};

/* ─── Create Modal ───────────────────────────────────────── */

const CreateExpenseModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createExpense = useCreateBusinessExpense();
    const uploadReceipt = useUploadReceipt();
    const { data: expenseTypes = [] } = useBusinessExpenseTypes();

    const today = new Date().toISOString().split('T')[0];

    const [form, setForm] = useState({
        amount: '',
        date: today,
        typeId: '',
        description: '',
    });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPath, setReceiptPath] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const canSubmit = Number(form.amount) > 0 && form.typeId && form.date;
    const isSubmitting = createExpense.isPending || isUploading;

    const handleFileChange = async (file: File | null) => {
        if (!file) {
            setReceiptFile(null);
            setReceiptPath(null);
            return;
        }
        setReceiptFile(file);
        setIsUploading(true);
        try {
            const result = await uploadReceipt.mutateAsync(file);
            setReceiptPath(result.filePath);
        } catch {
            setReceiptFile(null);
            setReceiptPath(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async () => {
        if (!canSubmit || isSubmitting) return;

        const dto: CreateBusinessExpenseDto = {
            amount: Number(form.amount),
            date: form.date,
            typeId: form.typeId,
            description: form.description.trim() || undefined,
            receiptPath: receiptPath || undefined,
        };

        await createExpense.mutateAsync(dto);
        onClose();
    };

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
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Wallet01Icon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('businessExpenses.newExpense')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Amount */}
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            {t('businessExpenses.amount')}
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={form.amount}
                            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                            placeholder="0 FCFA"
                            autoFocus
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                            <Calendar01Icon size={10} />
                            {t('businessExpenses.date')}
                        </label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            {t('businessExpenses.type')}
                        </label>
                        <select
                            value={form.typeId}
                            onChange={(e) => setForm((f) => ({ ...f, typeId: e.target.value }))}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
                        >
                            <option value="">{t('businessExpenses.typePlaceholder')}</option>
                            {(expenseTypes as any[]).map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            {t('businessExpenses.description')}
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            placeholder={t('businessExpenses.descriptionPlaceholder')}
                            rows={3}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all resize-none"
                        />
                    </div>

                    {/* Receipt Upload01Icon */}
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            {t('businessExpenses.receipt')}
                        </label>
                        {receiptFile ? (
                            <div className="flex items-center gap-3 p-3 bg-[#33cbcc]/5 border border-[#33cbcc]/20 rounded-xl">
                                <Attachment01Icon size={18} className="text-[#33cbcc] shrink-0" />
                                <span className="text-sm text-gray-700 font-medium flex-1 truncate">
                                    {receiptFile.name}
                                </span>
                                {isUploading ? (
                                    <Loading02Icon size={16} className="animate-spin text-[#33cbcc] shrink-0" />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleFileChange(null)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors shrink-0"
                                    >
                                        <Cancel01Icon size={14} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all">
                                <Upload01Icon size={20} className="text-gray-400" />
                                <span className="text-sm text-gray-500">{t('businessExpenses.uploadReceipt')}</span>
                                <span className="text-xs text-gray-400 ml-auto">PDF, PNG, JPG</span>
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('businessExpenses.cancel')}
                    </button>
                    <button
                        disabled={!canSubmit || isSubmitting}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {t('businessExpenses.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Main Component ─────────────────────────────────────── */

const BusinessExpenses = () => {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { data: expenses = [], isLoading } = useMyBusinessExpenses();
    const deleteExpense = useDeleteBusinessExpense();

    const expenseList = expenses as any[];

    const pendingCount = expenseList.filter((e) => e.status === 'PENDING').length;
    const validatedCount = expenseList.filter((e) => e.status === 'VALIDATED').length;
    const rejectedCount = expenseList.filter((e) => e.status === 'REJECTED').length;

    const handleDelete = (id: string) => {
        if (window.confirm(t('businessExpenses.deleteConfirm'))) {
            deleteExpense.mutate(id);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('businessExpenses.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('businessExpenses.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-all shadow-lg shadow-[#33cbcc]/20"
                >
                    <Add01Icon size={18} />
                    {t('businessExpenses.newExpense')}
                </button>
            </div>

            {/* Stats Badges */}
            <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#283852]/10 border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-[#283852]" />
                    <span className="text-sm font-semibold text-[#283852]">{pendingCount}</span>
                    <span className="text-xs text-[#283852]/60">{t('businessExpenses.status.pending')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#33cbcc]/10 border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-[#33cbcc]" />
                    <span className="text-sm font-semibold text-[#33cbcc]">{validatedCount}</span>
                    <span className="text-xs text-[#33cbcc]/60">{t('businessExpenses.status.validated')}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 border border-gray-200">
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-sm font-semibold text-gray-500">{rejectedCount}</span>
                    <span className="text-xs text-gray-400">{t('businessExpenses.status.rejected')}</span>
                </div>
            </div>

            {/* Loading State */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loading02Icon size={28} className="animate-spin text-[#33cbcc]" />
                </div>
            ) : expenseList.length === 0 ? (
                /* Empty State */
                <div className="text-center py-16">
                    <Wallet01Icon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">{t('businessExpenses.empty')}</p>
                    <p className="text-gray-400 text-sm mt-1">{t('businessExpenses.emptyHint')}</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-all shadow-lg shadow-[#33cbcc]/20"
                    >
                        <Add01Icon size={16} />
                        {t('businessExpenses.newExpense')}
                    </button>
                </div>
            ) : (
                /* Expense List */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {expenseList.map((expense, i) => (
                        <motion.div
                            key={expense.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="bg-white rounded-2xl border border-gray-100  transition-all overflow-hidden"
                        >
                            <div className="p-5">
                                {/* Top row: type badge + status */}
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {expense.expenseType && (
                                            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 truncate">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: expense.expenseType.color || '#33cbcc' }}
                                                />
                                                {expense.expenseType.name}
                                            </span>
                                        )}
                                    </div>
                                    <span
                                        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                                            STATUS_BG[expense.status] || 'bg-gray-100 text-gray-500'
                                        }`}
                                    >
                                        {t(`businessExpenses.status.${expense.status.toLowerCase()}`)}
                                    </span>
                                </div>

                                {/* Amount */}
                                <p className="text-xl font-bold text-gray-800 mb-2">
                                    {formatFCFA(expense.amount)}
                                </p>

                                {/* Date */}
                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                                    <Calendar01Icon size={12} />
                                    <span>
                                        {new Date(expense.date).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </span>
                                </div>

                                {/* Description */}
                                {expense.description && (
                                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                                        {expense.description}
                                    </p>
                                )}

                                {/* Receipt + Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        {expense.receiptPath && (
                                            <a
                                                href={resolveFileUrl(expense.receiptPath)!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-[#33cbcc] hover:text-[#2ab5b6] font-medium transition-colors"
                                            >
                                                <Attachment01Icon size={12} />
                                                <ViewIcon size={12} />
                                                {t('businessExpenses.viewReceipt')}
                                            </a>
                                        )}
                                    </div>

                                    {expense.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            disabled={deleteExpense.isPending}
                                            className="p-2 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors disabled:opacity-50"
                                        >
                                            {deleteExpense.isPending ? (
                                                <Loading02Icon size={14} className="animate-spin" />
                                            ) : (
                                                <Delete02Icon size={14} />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Rejection reason */}
                                {expense.status === 'REJECTED' && expense.rejectionReason && (
                                    <div className="mt-3 bg-[#283852]/10 border border-gray-200 rounded-lg p-3">
                                        <p className="text-[10px] font-semibold text-[#283852] uppercase tracking-wider mb-1">
                                            {t('businessExpenses.rejectionReason')}
                                        </p>
                                        <p className="text-xs text-[#283852]">{expense.rejectionReason}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateExpenseModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default BusinessExpenses;
