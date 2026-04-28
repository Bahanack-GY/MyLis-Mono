import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet01Icon, Search01Icon, Cancel01Icon, Tick01Icon, Loading02Icon, Settings01Icon, ViewIcon, Calendar01Icon } from 'hugeicons-react';
import {
    useBusinessExpenses,
    useBusinessExpenseStats,
    useBusinessExpenseTypes,
    useValidateBusinessExpense,
    useRejectBusinessExpense,
} from '../../api/business-expenses/hooks';
import BusinessExpenseTypeManager from '../../components/BusinessExpenseTypeManager';
import type { BusinessExpense, BusinessExpenseStatus } from '../../api/business-expenses/types';

/* ─── Constants ─────────────────────────────────────────── */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3025';

const STATUS_BG: Record<BusinessExpenseStatus, string> = {
    PENDING: 'bg-[#283852]/10 text-[#283852]/70',
    VALIDATED: 'bg-[#33cbcc]/10 text-[#33cbcc]',
    REJECTED: 'bg-gray-100 text-gray-400',
};

const STATUS_ICON: Record<BusinessExpenseStatus, typeof Loading02Icon> = {
    PENDING: Loading02Icon,
    VALIDATED: Tick01Icon,
    REJECTED: Cancel01Icon,
};

const formatFCFA = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('fr-FR');

const resolveFileUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path}`;
};

/* ─── Validation Confirmation Modal ────────────────────── */

const ValidationModal = ({
    expense,
    onConfirm,
    onCancel,
    isLoading,
}: {
    expense: BusinessExpense;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}) => {
    const { t } = useTranslation();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Tick01Icon size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">
                            {t('businessExpenses.confirmValidate')}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('businessExpenses.table.employee')}</span>
                            <span className="text-sm font-medium text-gray-700">
                                {expense.employee ? `${expense.employee.firstName} ${expense.employee.lastName}` : '\u2014'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('businessExpenses.amount')}</span>
                            <span className="text-sm font-bold text-gray-800">{formatFCFA(expense.amount)}</span>
                        </div>
                        {expense.expenseType && (
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">{t('businessExpenses.type')}</span>
                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: expense.expenseType.color || '#33cbcc' }} />
                                    {expense.expenseType.name}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 uppercase tracking-wider">{t('businessExpenses.date')}</span>
                            <span className="text-sm text-gray-600">{formatDate(expense.date)}</span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 text-center">
                        {t('businessExpenses.confirmValidateMessage')}
                    </p>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t('businessExpenses.cancel')}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loading02Icon size={16} className="animate-spin" />
                            ) : (
                                <Tick01Icon size={16} />
                            )}
                            {t('businessExpenses.validate')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Detail Modal ─────────────────────────────────────── */

const DetailModal = ({
    expense,
    onClose,
}: {
    expense: BusinessExpense;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const receiptUrl = resolveFileUrl(expense.receiptPath);
    const StatusIcon = STATUS_ICON[expense.status as BusinessExpenseStatus];

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Wallet01Icon size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">
                            {t('businessExpenses.detail')}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Employee */}
                    <div className="flex items-center gap-3">
                        {expense.employee?.avatarUrl ? (
                            <img src={expense.employee.avatarUrl} alt="" className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <span className="text-sm font-semibold text-gray-400">
                                    {expense.employee ? expense.employee.firstName[0] + expense.employee.lastName[0] : '?'}
                                </span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-gray-800">
                                {expense.employee ? `${expense.employee.firstName} ${expense.employee.lastName}` : '\u2014'}
                            </p>
                            <p className="text-xs text-gray-400">{t('businessExpenses.requestedBy')}</p>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('businessExpenses.amount')}</p>
                            <p className="text-lg font-bold text-gray-800">{formatFCFA(expense.amount)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('businessExpenses.date')}</p>
                            <p className="text-lg font-bold text-gray-800">{formatDate(expense.date)}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('businessExpenses.type')}</p>
                            {expense.expenseType ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: expense.expenseType.color || '#33cbcc' }} />
                                    {expense.expenseType.name}
                                </span>
                            ) : (
                                <span className="text-sm text-gray-400">{'\u2014'}</span>
                            )}
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{t('businessExpenses.table.status')}</p>
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BG[expense.status as BusinessExpenseStatus]}`}>
                                <StatusIcon size={12} />
                                {t(`businessExpenses.status.${expense.status.toLowerCase()}`)}
                            </span>
                        </div>
                    </div>

                    {/* Description */}
                    {expense.description && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('businessExpenses.description')}</p>
                            <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{expense.description}</p>
                        </div>
                    )}

                    {/* Rejection reason */}
                    {expense.status === 'REJECTED' && expense.rejectionReason && (
                        <div>
                            <p className="text-[10px] font-semibold text-[#283852] uppercase tracking-wider mb-1.5">{t('businessExpenses.rejectionReason')}</p>
                            <p className="text-sm text-[#283852] leading-relaxed bg-[#283852]/10 rounded-xl p-3">{expense.rejectionReason}</p>
                        </div>
                    )}

                    {/* Receipt */}
                    {receiptUrl && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('businessExpenses.receipt')}</p>
                            <a
                                href={receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
                            >
                                <ViewIcon size={16} />
                                {t('businessExpenses.viewReceipt')}
                            </a>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Rejection Modal ──────────────────────────────────── */

const RejectionModal = ({
    onConfirm,
    onCancel,
    isLoading,
}: {
    onConfirm: (reason: string) => void;
    onCancel: () => void;
    isLoading: boolean;
}) => {
    const { t } = useTranslation();
    const [reason, setReason] = useState('');

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
                            <Cancel01Icon size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">
                            {t('businessExpenses.reject')}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block">
                            {t('businessExpenses.rejectionReason')}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t('businessExpenses.rejectionReasonPlaceholder')}
                            rows={3}
                            className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t('businessExpenses.cancel')}
                        </button>
                        <button
                            onClick={() => onConfirm(reason)}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors shadow-lg shadow-[#283852]/20 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loading02Icon size={16} className="animate-spin" />
                            ) : (
                                <Cancel01Icon size={16} />
                            )}
                            {t('businessExpenses.confirmReject')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Main Component ───────────────────────────────────── */

const BusinessExpenses = () => {
    const { t } = useTranslation();

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<BusinessExpenseStatus | 'all'>('all');
    const [filterTypeId, setFilterTypeId] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Modals
    const [showTypeManager, setShowTypeManager] = useState(false);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [validatingExpense, setValidatingExpense] = useState<BusinessExpense | null>(null);
    const [detailExpense, setDetailExpense] = useState<BusinessExpense | null>(null);

    // Data
    const queryParams = useMemo(() => {
        const p: Record<string, string> = {};
        if (filterStatus !== 'all') p.status = filterStatus;
        if (filterTypeId !== 'all') p.typeId = filterTypeId;
        if (dateFrom) p.from = dateFrom;
        if (dateTo) p.to = dateTo;
        return Object.keys(p).length > 0 ? p : undefined;
    }, [filterStatus, filterTypeId, dateFrom, dateTo]);

    const { data: expenses = [], isLoading } = useBusinessExpenses(queryParams);
    const { data: stats } = useBusinessExpenseStats();
    const { data: types = [] } = useBusinessExpenseTypes();
    const validateExpense = useValidateBusinessExpense();
    const rejectExpense = useRejectBusinessExpense();

    // Client-side search filtering (by employee name)
    const filteredExpenses = useMemo(() => {
        if (!searchQuery) return expenses;
        const q = searchQuery.toLowerCase();
        return expenses.filter((e: BusinessExpense) => {
            const name = e.employee
                ? `${e.employee.firstName} ${e.employee.lastName}`.toLowerCase()
                : '';
            return name.includes(q);
        });
    }, [expenses, searchQuery]);

    // Stat cards
    const statCards = [
        {
            label: t('businessExpenses.stats.pending'),
            value: stats?.totalPending ?? 0,
            icon: Loading02Icon,
            color: '#283852',
            bgColor: 'bg-[#283852]/10',
        },
        {
            label: t('businessExpenses.stats.validated'),
            value: stats?.totalValidated ?? 0,
            icon: Tick01Icon,
            color: '#33cbcc',
            bgColor: 'bg-[#33cbcc]/10',
        },
        {
            label: t('businessExpenses.stats.rejected'),
            value: stats?.totalRejected ?? 0,
            icon: Cancel01Icon,
            color: '#283852',
            bgColor: 'bg-gray-100',
        },
        {
            label: t('businessExpenses.stats.totalAmount'),
            value: formatFCFA(stats?.totalAmount ?? 0),
            icon: Wallet01Icon,
            color: '#33cbcc',
            bgColor: 'bg-[#33cbcc]/5',
        },
    ];

    const handleReject = (reason: string) => {
        if (!rejectingId) return;
        rejectExpense.mutate(
            { id: rejectingId, reason },
            { onSuccess: () => setRejectingId(null) },
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 animate-pulse">
                            <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                            <div className="h-7 w-16 bg-gray-200 rounded" />
                        </div>
                    ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-100 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {t('businessExpenses.title')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('businessExpenses.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">
                        {stats?.total ?? 0} {t('businessExpenses.stats.total')}
                    </span>
                    <button
                        onClick={() => setShowTypeManager(true)}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-[#33cbcc]/40 text-gray-500 hover:text-[#33cbcc] transition-colors"
                        title={t('businessExpenses.settings')}
                    >
                        <Settings01Icon size={18} />
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs font-medium">
                                {stat.label}
                            </h3>
                            <h2 className="text-2xl font-bold text-gray-800 mt-1">
                                {stat.value}
                            </h2>
                        </div>
                        <div
                            className="absolute -right-3 -bottom-3 opacity-5 transition-transform  duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                <div className="flex flex-col lg:flex-row gap-3">
                    {/* Search01Icon */}
                    <div className="flex-1 relative">
                        <Search01Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                        <input
                            type="text"
                            placeholder={t('businessExpenses.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-[#e5e8ef] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
                        />
                    </div>

                    {/* Status filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) =>
                            setFilterStatus(e.target.value as BusinessExpenseStatus | 'all')
                        }
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all bg-white"
                    >
                        <option value="all">{t('businessExpenses.filterAll')}</option>
                        <option value="PENDING">{t('businessExpenses.status.pending')}</option>
                        <option value="VALIDATED">{t('businessExpenses.status.validated')}</option>
                        <option value="REJECTED">{t('businessExpenses.status.rejected')}</option>
                    </select>

                    {/* Type filter */}
                    <select
                        value={filterTypeId}
                        onChange={(e) => setFilterTypeId(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all bg-white"
                    >
                        <option value="all">{t('businessExpenses.filterAll')}</option>
                        {types.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </select>

                    {/* Date range */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar01Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all bg-white"
                            />
                        </div>
                        <span className="text-gray-400 text-xs">-</span>
                        <div className="relative">
                            <Calendar01Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all bg-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            >
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-gray-400 text-xs uppercase tracking-wider border-b border-gray-100">
                                <th className="pb-3 pt-4 pl-6 font-medium">
                                    {t('businessExpenses.table.employee')}
                                </th>
                                <th className="pb-3 pt-4 font-medium">
                                    {t('businessExpenses.table.type')}
                                </th>
                                <th className="pb-3 pt-4 font-medium">
                                    {t('businessExpenses.table.amount')}
                                </th>
                                <th className="pb-3 pt-4 font-medium">
                                    {t('businessExpenses.table.date')}
                                </th>
                                <th className="pb-3 pt-4 font-medium">
                                    {t('businessExpenses.table.status')}
                                </th>
                                <th className="pb-3 pt-4 font-medium">
                                    {t('businessExpenses.table.receipt')}
                                </th>
                                <th className="pb-3 pt-4 pr-6 font-medium text-center">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredExpenses.map((expense: BusinessExpense) => {
                                const StatusIcon =
                                    STATUS_ICON[expense.status as BusinessExpenseStatus];
                                const receiptUrl = resolveFileUrl(expense.receiptPath);

                                return (
                                    <tr
                                        key={expense.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setDetailExpense(expense)}
                                    >
                                        {/* Employee */}
                                        <td className="py-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                {expense.employee?.avatarUrl ? (
                                                    <img
                                                        src={expense.employee.avatarUrl}
                                                        alt=""
                                                        className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                        <span className="text-xs font-semibold text-gray-400">
                                                            {expense.employee
                                                                ? expense.employee.firstName[0] +
                                                                  expense.employee.lastName[0]
                                                                : '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                <span className="text-sm font-medium text-gray-700">
                                                    {expense.employee
                                                        ? `${expense.employee.firstName} ${expense.employee.lastName}`
                                                        : '\u2014'}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Type */}
                                        <td className="py-4">
                                            {expense.expenseType ? (
                                                <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                                                    <span
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{
                                                            backgroundColor:
                                                                expense.expenseType.color ||
                                                                '#33cbcc',
                                                        }}
                                                    />
                                                    {expense.expenseType.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    \u2014
                                                </span>
                                            )}
                                        </td>

                                        {/* Amount */}
                                        <td className="py-4">
                                            <span className="text-sm font-bold text-gray-800">
                                                {formatFCFA(expense.amount)}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="py-4">
                                            <span className="text-sm text-gray-600 whitespace-nowrap">
                                                {formatDate(expense.date)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4">
                                            <span
                                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                    STATUS_BG[
                                                        expense.status as BusinessExpenseStatus
                                                    ]
                                                }`}
                                            >
                                                <StatusIcon size={12} />
                                                {t(
                                                    `businessExpenses.status.${expense.status.toLowerCase()}`,
                                                )}
                                            </span>
                                        </td>

                                        {/* Receipt */}
                                        <td className="py-4">
                                            {receiptUrl ? (
                                                <a
                                                    href={receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
                                                    title={t('businessExpenses.viewReceipt')}
                                                >
                                                    <ViewIcon size={14} />
                                                    {t('businessExpenses.viewReceipt')}
                                                </a>
                                            ) : (
                                                <span className="text-xs text-gray-400">
                                                    \u2014
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 pr-6">
                                            {expense.status === 'PENDING' ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setValidatingExpense(expense);
                                                        }}
                                                        className="p-2 rounded-lg text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
                                                        title={t('businessExpenses.validate')}
                                                    >
                                                        <Tick01Icon size={15} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRejectingId(expense.id);
                                                        }}
                                                        className="p-2 rounded-lg text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors"
                                                        title={t('businessExpenses.reject')}
                                                    >
                                                        <Cancel01Icon size={15} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    <span className="text-xs text-gray-400">
                                                        \u2014
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* Empty state */}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                                <Wallet01Icon
                                                    size={24}
                                                    className="text-gray-300"
                                                />
                                            </div>
                                            <p className="text-sm font-medium text-gray-500">
                                                {t('businessExpenses.noResults')}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Validation Confirmation Modal */}
            <AnimatePresence>
                {validatingExpense && (
                    <ValidationModal
                        expense={validatingExpense}
                        onConfirm={() => {
                            validateExpense.mutate(validatingExpense.id, {
                                onSuccess: () => setValidatingExpense(null),
                            });
                        }}
                        onCancel={() => setValidatingExpense(null)}
                        isLoading={validateExpense.isPending}
                    />
                )}
            </AnimatePresence>

            {/* Rejection Modal */}
            <AnimatePresence>
                {rejectingId && (
                    <RejectionModal
                        onConfirm={handleReject}
                        onCancel={() => setRejectingId(null)}
                        isLoading={rejectExpense.isPending}
                    />
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <AnimatePresence>
                {detailExpense && (
                    <DetailModal
                        expense={detailExpense}
                        onClose={() => setDetailExpense(null)}
                    />
                )}
            </AnimatePresence>

            {/* Type Manager Modal */}
            <AnimatePresence>
                {showTypeManager && (
                    <BusinessExpenseTypeManager
                        onClose={() => setShowTypeManager(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default BusinessExpenses;
