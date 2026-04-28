import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Money01Icon, Add01Icon, Cancel01Icon, Clock01Icon, Tick01Icon, CancelCircleIcon, Search01Icon, FilterIcon, Loading02Icon, Delete02Icon, File01Icon, Upload01Icon, PackageIcon, Alert02Icon, Camera01Icon } from 'hugeicons-react';
import { useMyDemands, useCreateDemand, useUploadProforma, useUploadImage } from '../../api/demands/hooks';
import type { Demand, DemandImportance } from '../../api/demands/types';
import { UserDemandsSkeleton } from '../../components/Skeleton';

/* ─── Constants ─────────────────────────────────────────── */

type DemandStatusKey = 'PENDING' | 'VALIDATED' | 'REJECTED';

const STATUS_BG: Record<DemandStatusKey, string> = {
    PENDING: 'bg-[#283852]/10 text-[#283852]/70',
    VALIDATED: 'bg-[#33cbcc]/10 text-[#33cbcc]',
    REJECTED: 'bg-gray-100 text-gray-400',
};

const STATUS_ICON: Record<DemandStatusKey, typeof Clock01Icon> = {
    PENDING: Clock01Icon,
    VALIDATED: Tick01Icon,
    REJECTED: CancelCircleIcon,
};

const IMPORTANCE_COLORS: Record<DemandImportance, string> = {
    BARELY: 'bg-gray-100 text-gray-500',
    IMPORTANT: 'bg-[#283852]/10 text-[#283852]',
    VERY_IMPORTANT: 'bg-[#283852]/10 text-[#283852]',
    URGENT: 'bg-[#283852]/10 text-[#283852]',
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

        await createDemand.mutateAsync({ items: itemsPayload, proformaUrl, importance });
        onClose();
    };

    const isSubmitting = createDemand.isPending || uploadProforma.isPending || uploadImage.isPending;

    const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
    const labelCls = 'block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex justify-end bg-black/30"
        >
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
                            {t('demands.title')}
                        </p>
                        <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">{t('demands.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="text-[#b0bac9] hover:text-[#283852] transition-colors">
                        <Cancel01Icon size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">

                    {/* Importance */}
                    <div>
                        <label className={labelCls}>{t('demands.create.importance')}</label>
                        <div className="flex border border-[#e5e8ef] overflow-hidden">
                            {IMPORTANCE_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => setImportance(opt)}
                                    className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors border-r last:border-r-0 border-[#e5e8ef] ${
                                        importance === opt
                                            ? 'bg-[#283852] text-white'
                                            : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-[#f0f2f5]'
                                    }`}
                                >
                                    {opt === 'URGENT' && <Alert02Icon size={12} />}
                                    <span>{t(`demands.importance.${opt.toLowerCase()}`)}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Items */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className={labelCls}>{t('demands.create.items')}</label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2ab5b6] transition-colors"
                            >
                                <Add01Icon size={13} />
                                {t('demands.create.addItem')}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -8 }}
                                    className="p-3 bg-[#f8f9fc] border border-[#e5e8ef]"
                                >
                                    <div className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1 block">{t('demands.create.itemName')}</label>
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                placeholder={t('demands.create.itemNamePlaceholder')}
                                                className="w-full bg-white border border-[#e5e8ef] px-3 py-2 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
                                            />
                                        </div>
                                        <div className="w-16">
                                            <label className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1 block">{t('demands.create.quantity')}</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                                className="w-full bg-white border border-[#e5e8ef] px-2 py-2 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] transition-colors text-center"
                                            />
                                        </div>
                                        <div className="w-28">
                                            <label className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1 block">{t('demands.create.unitPrice')}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={item.unitPrice || ''}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                placeholder="0"
                                                className="w-full bg-white border border-[#e5e8ef] px-2 py-2 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors text-right"
                                            />
                                        </div>
                                        <div className="pt-5">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                disabled={items.length === 1}
                                                className="p-1.5 text-[#b0bac9] hover:text-[#283852] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Delete02Icon size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Per-item image */}
                                    <div className="mt-2">
                                        {item.imagePreview ? (
                                            <div className="relative overflow-hidden border border-[#e5e8ef] h-20">
                                                <img src={item.imagePreview} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => handleItemImage(index, null)}
                                                    className="absolute top-1 right-1 p-1 bg-white/90 text-[#8892a4] hover:text-[#283852] transition-colors"
                                                >
                                                    <Cancel01Icon size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRefs.current[index]?.click()}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8892a4] hover:text-[#33cbcc] border border-dashed border-[#e5e8ef] hover:border-[#33cbcc]/40 transition-all"
                                            >
                                                <Camera01Icon size={12} />
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
                    <div className="bg-[#283852] p-4 flex items-center justify-between">
                        <span className="text-sm font-medium text-white/60">{t('demands.create.total')}</span>
                        <span className="text-xl font-bold text-white">{formatFCFA(totalPrice)}</span>
                    </div>

                    {/* Proforma Upload */}
                    <div>
                        <label className={labelCls}>{t('demands.create.proforma')}</label>
                        {proformaFile ? (
                            <div className="flex items-center gap-3 p-3 bg-[#f8f9fc] border border-[#e5e8ef]">
                                <File01Icon size={16} className="text-[#283852]" />
                                <span className="text-sm text-[#1c2b3a] font-medium flex-1 truncate">{proformaFile.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setProformaFile(null)}
                                    className="text-[#b0bac9] hover:text-[#283852] transition-colors"
                                >
                                    <Cancel01Icon size={14} />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-3 p-4 border border-dashed border-[#e5e8ef] cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all">
                                <Upload01Icon size={18} className="text-[#b0bac9]" />
                                <span className="text-sm text-[#8892a4]">{t('demands.create.uploadProforma')}</span>
                                <span className="text-xs text-[#b0bac9] ml-auto">{t('demands.create.proformaFormats')}</span>
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
                <div className="px-6 py-4 border-t border-[#e5e8ef] flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 text-sm font-medium text-[#8892a4] bg-[#f8f9fc] border border-[#e5e8ef] hover:bg-[#f0f2f5] transition-colors"
                    >
                        {t('demands.create.cancel')}
                    </button>
                    <button
                        disabled={!canSubmit || isSubmitting}
                        onClick={handleSubmit}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-colors ${
                            canSubmit ? 'bg-[#33cbcc] hover:bg-[#2ab5b6]' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {isSubmitting ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
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
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((d) =>
                d.items?.some((item) => item.name.toLowerCase().includes(q))
            );
        }
        if (statusFilter !== 'ALL') result = result.filter((d) => d.status === statusFilter);
        if (importanceFilter) result = result.filter((d) => d.importance === importanceFilter);
        return result;
    }, [demands, searchQuery, statusFilter, importanceFilter]);

    if (isLoading) return <UserDemandsSkeleton />;

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
                    className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-colors w-full md:w-auto justify-center"
                >
                    <Add01Icon size={18} />
                    {t('demands.newDemand')}
                </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] px-4 py-3 focus-within:border-[#33cbcc] transition-colors">
                    <Search01Icon size={16} className="text-[#b0bac9] shrink-0" />
                    <input
                        type="text"
                        placeholder={t('demands.searchPlaceholder', 'Search demands...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
                            <Cancel01Icon size={14} />
                        </button>
                    )}
                </div>

                <div className="relative">
                    <FilterIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" size={14} />
                    <select
                        value={importanceFilter}
                        onChange={(e) => setImportanceFilter(e.target.value as DemandImportance | '')}
                        className="bg-white border border-[#e5e8ef] py-3 pl-9 pr-8 min-w-40 text-sm text-[#1c2b3a] appearance-none cursor-pointer focus:outline-none focus:border-[#33cbcc] transition-colors"
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
                        className="bg-white border border-[#e5e8ef] p-3 hover:bg-[#f8f9fc] text-[#b0bac9] hover:text-[#283852] transition-colors"
                        title={t('demands.clearFilters', 'Clear all filters')}
                    >
                        <Cancel01Icon size={16} />
                    </button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex gap-px bg-[#e5e8ef] p-px w-fit">
                {STATUS_TABS.map((tab) => {
                    const isActive = statusFilter === tab;
                    const count = tab === 'ALL'
                        ? demands.length
                        : (demands as Demand[]).filter((d) => d.status === tab).length;
                    return (
                        <button
                            key={tab}
                            onClick={() => setStatusFilter(tab)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                                isActive ? 'bg-white text-[#1c2b3a]' : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-white hover:text-[#1c2b3a]'
                            }`}
                        >
                            {tab === 'ALL' ? t('demands.filterAll', 'All') : t(`demands.status.${tab.toLowerCase()}`)}
                            <span className={`text-xs font-bold px-1.5 py-0.5 transition-colors ${
                                isActive ? 'bg-[#283852] text-white' : 'bg-[#e5e8ef] text-[#8892a4]'
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Demands List */}
            {filteredDemands.length === 0 ? (
                <div className="text-center py-16 border border-[#e5e8ef] bg-white">
                    <Money01Icon size={40} className="mx-auto text-[#b0bac9] mb-3" />
                    <p className="text-[#1c2b3a] font-medium">
                        {searchQuery || statusFilter !== 'ALL' || importanceFilter
                            ? t('demands.noResults', 'No demands match your filters')
                            : t('demands.empty')}
                    </p>
                    <p className="text-[#8892a4] text-sm mt-1">
                        {searchQuery || statusFilter !== 'ALL' || importanceFilter
                            ? t('demands.tryDifferentFilter', 'Try adjusting your search or filters')
                            : t('demands.emptyHint')}
                    </p>
                    {(statusFilter === 'ALL' || statusFilter === 'PENDING') && !searchQuery && !importanceFilter && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2ab5b6] transition-colors"
                        >
                            <Add01Icon size={16} />
                            {t('demands.newDemand')}
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDemands.map((demand: Demand, i: number) => {
                        const StatusIcon = STATUS_ICON[demand.status as DemandStatusKey];
                        const itemCount = demand.items?.length || 0;
                        const firstItem = demand.items?.[0]?.name || '—';

                        return (
                            <motion.div
                                key={demand.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white border border-[#e5e8ef] overflow-hidden"
                            >
                                <div className="p-5">
                                    {/* Status + Importance */}
                                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 ${STATUS_BG[demand.status as DemandStatusKey]}`}>
                                                <StatusIcon size={11} />
                                                {t(`demands.status.${demand.status.toLowerCase()}`)}
                                            </span>
                                            <span className={`text-xs font-semibold px-2.5 py-1 ${IMPORTANCE_COLORS[demand.importance]}`}>
                                                {t(`demands.importance.${demand.importance.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        <span className="text-xs text-[#8892a4]">
                                            {new Date(demand.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="font-semibold text-[#1c2b3a] text-sm mb-1 truncate">
                                        {itemCount === 1 ? firstItem : `${firstItem} +${itemCount - 1}`}
                                    </h3>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-xs text-[#8892a4] flex items-center gap-1">
                                            <PackageIcon size={11} />
                                            {itemCount} {t('demands.items')}
                                        </span>
                                        {demand.proformaUrl && (
                                            <span className="text-xs text-[#283852] flex items-center gap-1">
                                                <File01Icon size={10} />
                                                {t('demands.proforma')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items preview */}
                                    <div className="space-y-1.5 mb-4">
                                        {demand.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs">
                                                {item.imageUrl && (
                                                    <img
                                                        src={resolveFileUrl(item.imageUrl)!}
                                                        alt=""
                                                        className="w-7 h-7 object-cover border border-[#e5e8ef] shrink-0"
                                                    />
                                                )}
                                                <span className="text-[#8892a4] truncate flex-1">{item.name}</span>
                                                <span className="text-[#b0bac9]">{item.quantity}x</span>
                                                <span className="text-[#1c2b3a] font-medium">{formatFCFA(item.unitPrice)}</span>
                                            </div>
                                        ))}
                                        {(demand.items?.length || 0) > 3 && (
                                            <p className="text-xs text-[#b0bac9]">+{(demand.items?.length || 0) - 3} {t('demands.moreItems')}</p>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="pt-3 border-t border-[#e5e8ef] flex items-center justify-between">
                                        <span className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest">{t('demands.total')}</span>
                                        <span className="text-lg font-bold text-[#1c2b3a]">{formatFCFA(demand.totalPrice)}</span>
                                    </div>

                                    {/* Rejection reason */}
                                    {demand.status === 'REJECTED' && demand.rejectionReason && (
                                        <div className="mt-3 bg-[#f8f9fc] border border-[#e5e8ef] p-3">
                                            <p className="text-xs text-[#283852]">{demand.rejectionReason}</p>
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
