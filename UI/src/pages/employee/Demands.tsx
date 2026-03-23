import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    HandCoins,
    Plus,
    X,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Filter,
    Loader2,
    Trash2,
    FileText,
    Upload,
    Package,
    AlertTriangle,
    Camera,
} from 'lucide-react';
import { useMyDemands, useCreateDemand, useUploadProforma, useUploadImage } from '../../api/demands/hooks';
import type { Demand, DemandImportance } from '../../api/demands/types';
import { UserDemandsSkeleton } from '../../components/Skeleton';

/* ─── Constants ─────────────────────────────────────────── */

type DemandStatusKey = 'PENDING' | 'VALIDATED' | 'REJECTED';

const STATUS_BG: Record<DemandStatusKey, string> = {
    PENDING: 'bg-amber-50 text-amber-600',
    VALIDATED: 'bg-green-50 text-green-600',
    REJECTED: 'bg-red-50 text-red-600',
};

const STATUS_ICON: Record<DemandStatusKey, typeof Clock> = {
    PENDING: Clock,
    VALIDATED: CheckCircle,
    REJECTED: XCircle,
};

const IMPORTANCE_COLORS: Record<DemandImportance, string> = {
    BARELY: 'bg-gray-100 text-gray-500',
    IMPORTANT: 'bg-blue-50 text-blue-600',
    VERY_IMPORTANT: 'bg-orange-50 text-orange-600',
    URGENT: 'bg-red-50 text-red-600',
};

const IMPORTANCE_OPTIONS: DemandImportance[] = ['BARELY', 'IMPORTANT', 'VERY_IMPORTANT', 'URGENT'];

const formatFCFA = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3025';

const resolveFileUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `${API_URL}${path}`;
};

/* ─── Item Row Type ─────────────────────────────────────── */

interface ItemRow {
    name: string;
    quantity: number;
    unitPrice: number;
    imageFile: File | null;
    imagePreview: string | null;
}

const emptyItem = (): ItemRow => ({ name: '', quantity: 1, unitPrice: 0, imageFile: null, imagePreview: null });

/* ─── Create Modal ──────────────────────────────────────── */

const CreateDemandModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createDemand = useCreateDemand();
    const uploadProforma = useUploadProforma();
    const uploadImage = useUploadImage();

    const [items, setItems] = useState<ItemRow[]>([emptyItem()]);
    const [proformaFile, setProformaFile] = useState<File | null>(null);
    const [importance, setImportance] = useState<DemandImportance>('IMPORTANT');
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const updateItem = (index: number, field: keyof ItemRow, value: string | number | File | null) => {
        setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    };

    const handleItemImage = (index: number, file: File | null) => {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setItems(prev => prev.map((item, i) =>
                    i === index ? { ...item, imageFile: file, imagePreview: e.target?.result as string } : item
                ));
            };
            reader.readAsDataURL(file);
        } else {
            setItems(prev => prev.map((item, i) =>
                i === index ? { ...item, imageFile: null, imagePreview: null } : item
            ));
        }
    };

    const addItem = () => setItems(prev => [...prev, emptyItem()]);

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalPrice = items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);

    const canSubmit = items.every(item => item.name.trim() && item.unitPrice > 0);

    const handleSubmit = async () => {
        if (!canSubmit) return;

        let proformaUrl: string | undefined;

        if (proformaFile) {
            const uploaded = await uploadProforma.mutateAsync(proformaFile);
            proformaUrl = uploaded.filePath;
        }

        // Upload per-item images
        const itemsPayload = await Promise.all(
            items.map(async (item) => {
                let imageUrl: string | undefined;
                if (item.imageFile) {
                    const uploaded = await uploadImage.mutateAsync(item.imageFile);
                    imageUrl = uploaded.filePath;
                }
                return {
                    name: item.name.trim(),
                    quantity: item.quantity || 1,
                    unitPrice: Number(item.unitPrice),
                    imageUrl,
                };
            })
        );

        await createDemand.mutateAsync({
            items: itemsPayload,
            proformaUrl,
            importance,
        });

        onClose();
    };

    const isSubmitting = createDemand.isPending || uploadProforma.isPending || uploadImage.isPending;

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
                        <h2 className="text-lg font-bold text-gray-800">{t('demands.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Importance */}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('demands.create.importance')}</p>
                        <div className="flex gap-2 flex-wrap">
                            {IMPORTANCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setImportance(opt)}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                                        importance === opt
                                            ? `${IMPORTANCE_COLORS[opt]} border-current shadow-sm`
                                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                                    }`}
                                >
                                    {opt === 'URGENT' && <AlertTriangle size={12} />}
                                    {t(`demands.importance.${opt.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-gray-700">{t('demands.create.items')}</p>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1.5 text-xs font-medium text-[#33cbcc] hover:text-[#2ab5b6] transition-colors"
                            >
                                <Plus size={14} />
                                {t('demands.create.addItem')}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="p-3 bg-gray-50 rounded-xl border border-gray-100"
                                >
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">{t('demands.create.itemName')}</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                placeholder={t('demands.create.itemNamePlaceholder')}
                                                className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 transition-all"
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">{t('demands.create.quantity')}</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 transition-all text-center"
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 block">{t('demands.create.unitPrice')}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={item.unitPrice || ''}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 transition-all text-right"
                                            />
                                        </div>
                                        <div className="pt-5">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                disabled={items.length === 1}
                                                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Per-item image */}
                                    <div className="mt-2">
                                        {item.imagePreview ? (
                                            <div className="relative rounded-lg overflow-hidden border border-gray-200 h-24">
                                                <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleItemImage(index, null)}
                                                    className="absolute top-1 right-1 p-1 bg-white/90 rounded text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[index]?.click()}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-[#33cbcc] border border-dashed border-gray-200 hover:border-[#33cbcc]/40 rounded-lg transition-all"
                                            >
                                                <Camera size={12} />
                                                {t('demands.create.addImage')}
                                            </button>
                                        )}
                                        <input
                                            ref={(el) => { fileInputRefs.current[index] = el; }}
                                            type="file"
                                            accept=".png,.jpg,.jpeg,.webp"
                                            onChange={(e) => handleItemImage(index, e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-linear-to-r from-[#283852] to-[#3a5175] rounded-2xl p-4 text-white flex items-center justify-between">
                        <span className="text-sm font-medium text-white/70">{t('demands.create.total')}</span>
                        <span className="text-xl font-bold">{formatFCFA(totalPrice)}</span>
                    </div>

                    {/* Proforma Upload */}
                    <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">{t('demands.create.proforma')}</p>
                        {proformaFile ? (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                <FileText size={18} className="text-blue-500" />
                                <span className="text-sm text-blue-700 font-medium flex-1 truncate">{proformaFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setProformaFile(null)}
                                    className="p-1.5 rounded-lg text-blue-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all">
                                <Upload size={20} className="text-gray-400" />
                                <span className="text-sm text-gray-500">{t('demands.create.uploadProforma')}</span>
                                <span className="text-xs text-gray-400 ml-auto">{t('demands.create.proformaFormats')}</span>
                                <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                                    onChange={(e) => setProformaFile(e.target.files?.[0] || null)}
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
                        {t('demands.create.cancel')}
                    </button>
                    <button
                        disabled={!canSubmit || isSubmitting}
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('demands.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Main Component ────────────────────────────────────── */

const STATUS_TABS: ('ALL' | DemandStatusKey)[] = ['ALL', 'PENDING', 'VALIDATED', 'REJECTED'];

const Demands = () => {
    const { t } = useTranslation();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { data: demands = [], isLoading } = useMyDemands();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | DemandStatusKey>('ALL');
    const [importanceFilter, setImportanceFilter] = useState<DemandImportance | ''>('');

    const filteredDemands = useMemo(() => {
        let result = demands as Demand[];

        // Search – match against item names
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((d) =>
                d.items?.some((item) => item.name.toLowerCase().includes(q))
            );
        }

        // Status filter
        if (statusFilter !== 'ALL') {
            result = result.filter((d) => d.status === statusFilter);
        }

        // Importance filter
        if (importanceFilter) {
            result = result.filter((d) => d.importance === importanceFilter);
        }

        return result;
    }, [demands, searchQuery, statusFilter, importanceFilter]);

    if (isLoading) {
        return <UserDemandsSkeleton />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('demands.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('demands.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-all shadow-lg shadow-[#33cbcc]/20"
                >
                    <Plus size={18} />
                    {t('demands.newDemand')}
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('demands.searchPlaceholder', 'Search demands...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors mr-1">
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Importance filter */}
                <div className="relative">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    <select
                        value={importanceFilter}
                        onChange={(e) => setImportanceFilter(e.target.value as DemandImportance | '')}
                        className="bg-white rounded-2xl p-3 pl-10 pr-8 border border-gray-100 shadow-sm min-w-44 text-sm text-gray-600 appearance-none cursor-pointer hover:border-[#33cbcc]/30 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 transition-all"
                    >
                        <option value="">{t('demands.allImportance', 'All importance')}</option>
                        {IMPORTANCE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{t(`demands.importance.${opt.toLowerCase()}`)}</option>
                        ))}
                    </select>
                </div>

                {(searchQuery || importanceFilter || statusFilter !== 'ALL') && (
                    <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); setImportanceFilter(''); }}
                        className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors"
                        title={t('demands.clearFilters', 'Clear all filters')}
                    >
                        <X size={20} />
                    </button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 flex-wrap">
                {STATUS_TABS.map((tab) => {
                    const isActive = statusFilter === tab;
                    const count = tab === 'ALL'
                        ? demands.length
                        : (demands as Demand[]).filter((d) => d.status === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-[#33cbcc] text-white shadow-sm'
                                    : 'bg-white text-gray-500 border border-gray-100 hover:border-[#33cbcc]/30'
                            }`}
                        >
                            {tab === 'ALL' ? t('demands.filterAll', 'All') : t(`demands.status.${tab.toLowerCase()}`)}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Demands List */}
            {filteredDemands.length === 0 ? (
                <div className="text-center py-16">
                    <HandCoins size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">
                        {searchQuery || statusFilter !== 'ALL' || importanceFilter
                            ? t('demands.noResults', 'No demands match your filters')
                            : t('demands.empty')}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {searchQuery || statusFilter !== 'ALL' || importanceFilter
                            ? t('demands.tryDifferentFilter', 'Try adjusting your search or filters')
                            : t('demands.emptyHint')}
                    </p>
                    {(statusFilter === 'ALL' || statusFilter === 'PENDING') && !searchQuery && !importanceFilter && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-all shadow-lg shadow-[#33cbcc]/20"
                        >
                            <Plus size={16} />
                            {t('demands.newDemand')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDemands.map((demand: Demand, i: number) => {
                        const StatusIcon = STATUS_ICON[demand.status as DemandStatusKey];
                        const itemCount = demand.items?.length || 0;
                        const firstItem = demand.items?.[0]?.name || '—';

                        return (
                            <motion.div
                                key={demand.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl border border-gray-100 hover:shadow-md transition-all overflow-hidden"
                            >
                                <div className="p-6">
                                    {/* Status + Importance badges */}
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${STATUS_BG[demand.status as DemandStatusKey]}`}>
                                                <StatusIcon size={12} />
                                                {t(`demands.status.${demand.status.toLowerCase()}`)}
                                            </span>
                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${IMPORTANCE_COLORS[demand.importance]}`}>
                                                {t(`demands.importance.${demand.importance.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {new Date(demand.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate">
                                        {itemCount === 1 ? firstItem : `${firstItem} +${itemCount - 1}`}
                                    </h3>

                                    {/* Items count + Proforma badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Package size={12} />
                                            {itemCount} {t('demands.items')}
                                        </span>
                                        {demand.proformaUrl && (
                                            <span className="text-xs text-blue-500 flex items-center gap-1">
                                                <FileText size={10} />
                                                {t('demands.proforma')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items preview with images */}
                                    <div className="space-y-2 mb-4">
                                        {demand.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                {item.imageUrl && (
                                                    <img
                                                        src={resolveFileUrl(item.imageUrl)!}
                                                        alt=""
                                                        className="w-8 h-8 rounded object-cover border border-gray-200 shrink-0"
                                                    />
                                                )}
                                                <span className="text-gray-500 truncate flex-1">{item.name}</span>
                                                <span className="text-gray-400 ml-2">{item.quantity}x</span>
                                                <span className="text-gray-600 font-medium ml-2">{formatFCFA(item.unitPrice)}</span>
                                            </div>
                                        ))}
                                        {(demand.items?.length || 0) > 3 && (
                                            <p className="text-xs text-gray-400">+{(demand.items?.length || 0) - 3} {t('demands.moreItems')}</p>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-xs text-gray-400 uppercase tracking-wider">{t('demands.total')}</span>
                                        <span className="text-lg font-bold text-gray-800">{formatFCFA(demand.totalPrice)}</span>
                                    </div>

                                    {/* Rejection reason */}
                                    {demand.status === 'REJECTED' && demand.rejectionReason && (
                                        <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
                                            <p className="text-xs text-red-600">{demand.rejectionReason}</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateDemandModal onClose={() => setShowCreateModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Demands;
