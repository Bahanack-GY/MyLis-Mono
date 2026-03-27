import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HandCoins,
    Search,
    X,
    Clock,
    CheckCircle,
    XCircle,
    Loader2,
    Building,
    User,
    DollarSign,
    LayoutGrid,
    List,
    FileText,
    Package,
    ExternalLink,
    AlertTriangle,
    MessageSquare,
} from 'lucide-react';
import { useDemands, useDemandStats, useValidateDemand, useRejectDemand } from '../../api/demands/hooks';
import { DemandsAdminSkeleton } from '../../components/Skeleton';
import { useCreateDM, useSendMessage } from '../../api/chat/hooks';
import { useDepartmentScope } from '../../contexts/AuthContext';
import type { Demand, DemandImportance } from '../../api/demands/types';

/* ─── Constants ─────────────────────────────────────────── */

type DemandStatusKey = 'PENDING' | 'VALIDATED' | 'REJECTED';

const STATUS_COLORS: Record<DemandStatusKey, string> = {
    PENDING: '#f59e0b',
    VALIDATED: '#22c55e',
    REJECTED: '#ef4444',
};

const STATUS_BG: Record<DemandStatusKey, string> = {
    PENDING: 'bg-amber-50 text-amber-600',
    VALIDATED: 'bg-green-50 text-green-600',
    REJECTED: 'bg-red-50 text-red-600',
};

const IMPORTANCE_COLORS: Record<DemandImportance, string> = {
    BARELY: 'bg-gray-100 text-gray-500',
    IMPORTANT: 'bg-blue-50 text-blue-600',
    VERY_IMPORTANT: 'bg-orange-50 text-orange-600',
    URGENT: 'bg-red-50 text-red-600',
};

const formatFCFA = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3025';

const resolveFileUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path}`;
};

/* ─── Detail Modal ──────────────────────────────────────── */

const DemandDetailModal = ({
    demand,
    onClose,
}: {
    demand: Demand;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const validateDemand = useValidateDemand();
    const rejectDemand = useRejectDemand();
    const createDM = useCreateDM();
    const sendMessage = useSendMessage();
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [startingChat, setStartingChat] = useState(false);

    const isPending = demand.status === 'PENDING';
    const itemCount = demand.items?.length || 0;
    const firstItemName = demand.items?.[0]?.name || '—';

    const handleStartChat = async () => {
        if (!demand.employee?.userId) return;
        setStartingChat(true);
        try {
            const channel = await createDM.mutateAsync(demand.employee.userId);
            // Build a structured demand card message
            const cardPayload = JSON.stringify({
                demandId: demand.id,
                items: (demand.items || []).map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                })),
                totalPrice: demand.totalPrice,
                importance: demand.importance,
                status: demand.status,
            });
            sendMessage(channel.id, `[DEMAND_CARD:${cardPayload}]`);
            onClose();
            navigate('/messages');
        } catch {
            // silent
        } finally {
            setStartingChat(false);
        }
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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <HandCoins size={20} className="text-[#33cbcc]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {itemCount === 1 ? firstItemName : `${itemCount} ${t('demands.items')}`}
                            </h2>
                            <p className="text-xs text-gray-400">#{demand.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_BG[demand.status as DemandStatusKey]}`}>
                            {t(`demands.status.${demand.status.toLowerCase()}`)}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${IMPORTANCE_COLORS[demand.importance]}`}>
                            {demand.importance === 'URGENT' && <AlertTriangle size={10} />}
                            {t(`demands.importance.${demand.importance.toLowerCase()}`)}
                        </span>
                        {demand.department && (
                            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                                <Building size={12} />
                                {demand.department.name}
                            </span>
                        )}
                    </div>

                    {/* Total Price */}
                    <div className="bg-linear-to-r from-[#283852] to-[#3a5175] rounded-2xl p-5 text-white">
                        <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-1">{t('demands.totalPrice')}</p>
                        <p className="text-2xl font-bold">{formatFCFA(demand.totalPrice)}</p>
                    </div>

                    {/* Items Table */}
                    {demand.items && demand.items.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('demands.itemsList')}</p>
                            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-400 text-xs border-b border-gray-200">
                                            <th className="pb-2 pt-3 pl-4 font-medium">{t('demands.itemName')}</th>
                                            <th className="pb-2 pt-3 font-medium text-center">{t('demands.quantity')}</th>
                                            <th className="pb-2 pt-3 font-medium text-right">{t('demands.unitPrice')}</th>
                                            <th className="pb-2 pt-3 pr-4 font-medium text-right">{t('demands.subtotal')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {demand.items.map((item) => (
                                            <tr key={item.id}>
                                                <td className="py-2.5 pl-4 text-gray-700 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        {item.imageUrl && (
                                                            <img
                                                                src={resolveFileUrl(item.imageUrl)!}
                                                                alt=""
                                                                className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-[#33cbcc]/40 transition-all"
                                                                onClick={() => setLightboxUrl(resolveFileUrl(item.imageUrl))}
                                                            />
                                                        )}
                                                        {item.name}
                                                    </div>
                                                </td>
                                                <td className="py-2.5 text-gray-600 text-center">{item.quantity}</td>
                                                <td className="py-2.5 text-gray-600 text-right">{formatFCFA(item.unitPrice)}</td>
                                                <td className="py-2.5 pr-4 text-gray-800 font-semibold text-right">{formatFCFA(item.quantity * item.unitPrice)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Proforma */}
                    {demand.proformaUrl && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('demands.proforma')}</p>
                            <a
                                href={resolveFileUrl(demand.proformaUrl)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                                <FileText size={18} />
                                <span className="text-sm font-medium">{t('demands.viewProforma')}</span>
                                <ExternalLink size={14} className="ml-auto" />
                            </a>
                        </div>
                    )}

                    {/* Employee */}
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('demands.requestedBy')}</p>
                        <div className="flex items-center gap-2">
                            {demand.employee?.avatarUrl ? (
                                <img src={demand.employee.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-gray-200" />
                            ) : (
                                <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                    <User size={14} className="text-gray-400" />
                                </div>
                            )}
                            <span className="text-sm font-medium text-gray-700">
                                {demand.employee ? `${demand.employee.firstName} ${demand.employee.lastName}` : '—'}
                            </span>
                        </div>
                    </div>

                    {/* Rejection reason */}
                    {demand.status === 'REJECTED' && demand.rejectionReason && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                            <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">{t('demands.rejectionReason')}</p>
                            <p className="text-sm text-red-600">{demand.rejectionReason}</p>
                        </div>
                    )}

                    {/* Validated date */}
                    {demand.status === 'VALIDATED' && demand.validatedAt && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">{t('demands.validatedOn')}</p>
                            <p className="text-sm text-green-700">{new Date(demand.validatedAt).toLocaleDateString()}</p>
                        </div>
                    )}

                    {/* Reject reason input */}
                    {showRejectInput && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('demands.rejectionReason')}</p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder={t('demands.rejectionReasonPlaceholder')}
                                rows={3}
                                className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all resize-none"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0">
                    {/* Start Chat — always available */}
                    {demand.employee?.userId && (
                        <button
                            disabled={startingChat}
                            onClick={handleStartChat}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors mr-auto"
                        >
                            {startingChat ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                            {t('demands.startChat')}
                        </button>
                    )}

                    {isPending && !showRejectInput && (
                        <>
                            <button
                                onClick={() => setShowRejectInput(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                                <XCircle size={16} />
                                {t('demands.reject')}
                            </button>
                            <button
                                disabled={validateDemand.isPending}
                                onClick={() => validateDemand.mutate(demand.id, { onSuccess: () => onClose() })}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20"
                            >
                                {validateDemand.isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                {t('demands.validate')}
                            </button>
                        </>
                    )}
                    {showRejectInput && (
                        <>
                            <button
                                onClick={() => setShowRejectInput(false)}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                {t('demands.cancel')}
                            </button>
                            <button
                                disabled={rejectDemand.isPending}
                                onClick={() => rejectDemand.mutate({ id: demand.id, reason: rejectReason }, { onSuccess: () => onClose() })}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                {rejectDemand.isPending ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                {t('demands.confirmReject')}
                            </button>
                        </>
                    )}
                    {!isPending && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            {t('demands.close')}
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Image Lightbox */}
            <AnimatePresence>
                {lightboxUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxUrl(null)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-60 flex items-center justify-center p-8"
                    >
                        <button
                            onClick={() => setLightboxUrl(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={lightboxUrl}
                            alt=""
                            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Demands = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<DemandStatusKey | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);

    const deptScope = useDepartmentScope();
    const { data: apiDemands, isLoading } = useDemands(deptScope);
    const { data: stats } = useDemandStats(deptScope);

    const demands = apiDemands || [];

    const filteredDemands = useMemo(() => {
        return demands.filter((d) => {
            const itemNames = d.items?.map(i => i.name).join(' ') || '';
            const employeeName = d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : '';
            const matchesSearch =
                itemNames.toLowerCase().includes(searchQuery.toLowerCase()) ||
                employeeName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || d.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [demands, searchQuery, filterStatus]);

    const statCards = [
        { label: t('demands.stats.total'), value: stats?.total ?? 0, icon: HandCoins, color: '#33cbcc' },
        { label: t('demands.stats.pending'), value: stats?.totalPending ?? 0, icon: Clock, color: '#f59e0b' },
        { label: t('demands.stats.validated'), value: stats?.totalValidated ?? 0, icon: CheckCircle, color: '#22c55e' },
        { label: t('demands.stats.rejected'), value: stats?.totalRejected ?? 0, icon: XCircle, color: '#ef4444' },
        { label: t('demands.stats.totalExpense'), value: formatFCFA(stats?.totalExpense ?? 0), icon: DollarSign, color: '#283852' },
    ];

    const statusFilters: { key: DemandStatusKey | 'all'; label: string }[] = [
        { key: 'all', label: t('demands.filterAll') },
        { key: 'PENDING', label: t('demands.status.pending') },
        { key: 'VALIDATED', label: t('demands.status.validated') },
        { key: 'REJECTED', label: t('demands.status.rejected') },
    ];

    if (isLoading) {
        return <DemandsAdminSkeleton />;
    }

    const getDemandLabel = (d: Demand) => {
        if (!d.items || d.items.length === 0) return '—';
        if (d.items.length === 1) return d.items[0].name;
        return `${d.items[0].name} +${d.items.length - 1}`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('demands.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('demands.subtitle')}</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs font-medium">{stat.label}</h3>
                            <h2 className="text-2xl font-bold text-gray-800 mt-1">{stat.value}</h2>
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

            {/* Search + View Toggle */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('demands.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                </div>

                <div className="flex bg-white rounded-xl border border-gray-100 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2 flex-wrap">
                {statusFilters.map((sf) => (
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

            {/* Grid View */}
            {viewMode === 'grid' && filteredDemands.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDemands.map((demand, i) => (
                        <motion.div
                            key={demand.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            onClick={() => setSelectedDemand(demand)}
                            className="bg-white rounded-2xl p-6 border border-gray-100 group hover:border-gray-200  cursor-pointer transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                                    <HandCoins size={20} className="text-[#33cbcc]" />
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BG[demand.status as DemandStatusKey]}`}>
                                    {t(`demands.status.${demand.status.toLowerCase()}`)}
                                </span>
                            </div>

                            <h3 className="font-semibold text-gray-800 text-sm truncate mb-1">{getDemandLabel(demand)}</h3>
                            <div className="flex items-center gap-2 mb-3">
                                <Package size={12} className="text-gray-400" />
                                <span className="text-xs text-gray-400">{demand.items?.length || 0} {t('demands.items')}</span>
                                {demand.proformaUrl && (
                                    <span className="text-xs text-blue-500 flex items-center gap-1">
                                        <FileText size={10} />
                                        {t('demands.proforma')}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    {demand.employee?.avatarUrl ? (
                                        <img src={demand.employee.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                            <User size={12} className="text-gray-400" />
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-500">
                                        {demand.employee ? `${demand.employee.firstName} ${demand.employee.lastName}` : '—'}
                                    </span>
                                </div>
                                <span className="text-sm font-bold text-gray-800">
                                    {formatFCFA(demand.totalPrice)}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && filteredDemands.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                >
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                                    <th className="pb-3 pt-4 pl-6 font-medium">{t('demands.table.items')}</th>
                                    <th className="pb-3 pt-4 font-medium">{t('demands.table.employee')}</th>
                                    <th className="pb-3 pt-4 font-medium">{t('demands.table.department')}</th>
                                    <th className="pb-3 pt-4 font-medium">{t('demands.table.totalPrice')}</th>
                                    <th className="pb-3 pt-4 font-medium">{t('demands.table.status')}</th>
                                    <th className="pb-3 pt-4 pr-6 font-medium">{t('demands.table.date')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredDemands.map((demand) => (
                                    <tr
                                        key={demand.id}
                                        onClick={() => setSelectedDemand(demand)}
                                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                                    >
                                        <td className="py-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-lg bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                                                    <HandCoins size={16} className="text-[#33cbcc]" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{getDemandLabel(demand)}</p>
                                                    <p className="text-xs text-gray-400">{demand.items?.length || 0} {t('demands.items')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex items-center gap-2">
                                                {demand.employee?.avatarUrl ? (
                                                    <img src={demand.employee.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                                                ) : (
                                                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                                                        <User size={14} className="text-gray-400" />
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-700">
                                                    {demand.employee ? `${demand.employee.firstName} ${demand.employee.lastName}` : '—'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span className="text-sm text-gray-600">{demand.department?.name || '—'}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className="text-sm font-bold text-gray-800">{formatFCFA(demand.totalPrice)}</span>
                                        </td>
                                        <td className="py-4">
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BG[demand.status as DemandStatusKey]}`}>
                                                {t(`demands.status.${demand.status.toLowerCase()}`)}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-6 text-sm text-gray-500">
                                            {new Date(demand.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* No Results */}
            {filteredDemands.length === 0 && (
                <div className="text-center py-16">
                    <HandCoins size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">{t('demands.noResults')}</p>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedDemand && (
                    <DemandDetailModal
                        demand={selectedDemand}
                        onClose={() => setSelectedDemand(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Demands;
