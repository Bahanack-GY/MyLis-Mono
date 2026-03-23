import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    GraduationCap,
    Search,
    Plus,
    X,
    BookOpen,
    Award,
    Clock,
    CheckCircle,
    Calendar,
    Building,
    Loader2,
    Eye,
} from 'lucide-react';
import { useFormations, useCreateFormation } from '../api/formations/hooks';
import { useAuth } from '../contexts/AuthContext';
import type { Formation } from '../api/formations/types';

/* ─── Status helper ─────────────────────────────────────── */

const getFormationStatus = (f: Formation): 'ongoing' | 'completed' | 'upcoming' => {
    const now = new Date();
    const start = f.startDate ? new Date(f.startDate) : null;
    const end = f.endDate ? new Date(f.endDate) : null;
    if (end && end < now) return 'completed';
    if (start && start > now) return 'upcoming';
    return 'ongoing';
};

/* ─── Create Modal ──────────────────────────────────────── */

const CreateFormationModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const create = useCreateFormation();
    const [form, setForm] = useState({
        title: '',
        organization: '',
        startDate: '',
        endDate: '',
        certificateDetails: '',
    });

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    const handleSubmit = () => {
        if (!form.title.trim()) return;
        create.mutate(
            {
                title: form.title,
                organization: form.organization || undefined,
                startDate: form.startDate || undefined,
                endDate: form.endDate || undefined,
                certificateDetails: form.certificateDetails || undefined,
                employeeId: user?.userId || '',
            },
            { onSuccess: () => onClose() },
        );
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
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Plus size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('formations.create.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className={labelCls}>
                            <BookOpen size={12} />
                            {t('formations.create.formationTitle')}
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('formations.create.titlePlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            <Building size={12} />
                            {t('formations.create.organization')}
                        </label>
                        <input
                            type="text"
                            value={form.organization}
                            onChange={e => setForm(prev => ({ ...prev, organization: e.target.value }))}
                            placeholder={t('formations.create.organizationPlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('formations.create.startDate')}
                            </label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('formations.create.endDate')}
                            </label>
                            <input
                                type="date"
                                value={form.endDate}
                                onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>
                            <Award size={12} />
                            {t('formations.create.certificate')}
                        </label>
                        <input
                            type="text"
                            value={form.certificateDetails}
                            onChange={e => setForm(prev => ({ ...prev, certificateDetails: e.target.value }))}
                            placeholder={t('formations.create.certificatePlaceholder')}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('formations.create.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={create.isPending || !form.title.trim()}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20 transition-colors disabled:opacity-50"
                    >
                        <Plus size={16} />
                        {create.isPending ? '...' : t('formations.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Detail Modal ──────────────────────────────────────── */

const FormationDetailModal = ({ formation, onClose }: { formation: Formation; onClose: () => void }) => {
    const { t } = useTranslation();
    const status = getFormationStatus(formation);

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">{formation.title}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            status === 'completed' ? 'bg-[#283852]/10 text-[#283852]' :
                            status === 'ongoing' ? 'bg-[#33cbcc]/10 text-[#33cbcc]' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {t(`formations.status.${status}`)}
                        </span>
                    </div>

                    {formation.organization && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('formations.detail.organization')}</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">{formation.organization}</p>
                        </div>
                    )}

                    {(formation.startDate || formation.endDate) && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('formations.detail.period')}</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">
                                {formation.startDate ? new Date(formation.startDate).toLocaleDateString() : '--'}
                                {' - '}
                                {formation.endDate ? new Date(formation.endDate).toLocaleDateString() : '--'}
                            </p>
                        </div>
                    )}

                    {formation.certificateDetails && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('formations.detail.certificate')}</p>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">{formation.certificateDetails}</p>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('formations.detail.close')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Main Component ────────────────────────────────────── */

const Formations = () => {
    const { t } = useTranslation();
    const { data: formations, isLoading } = useFormations();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);

    const filtered = (formations || [])
        .filter(f => {
            if (search) {
                const q = search.toLowerCase();
                if (!f.title.toLowerCase().includes(q) && !f.organization?.toLowerCase().includes(q)) return false;
            }
            if (statusFilter !== 'all') {
                if (getFormationStatus(f) !== statusFilter) return false;
            }
            return true;
        });

    const ongoing = (formations || []).filter(f => getFormationStatus(f) === 'ongoing').length;
    const completed = (formations || []).filter(f => getFormationStatus(f) === 'completed').length;
    const certificates = (formations || []).filter(f => f.certificateDetails).length;

    const stats = [
        { label: t('formations.stats.total'), value: formations?.length || 0, icon: GraduationCap },
        { label: t('formations.stats.ongoing'), value: ongoing, icon: Clock },
        { label: t('formations.stats.completed'), value: completed, icon: CheckCircle },
        { label: t('formations.stats.certificates'), value: certificates, icon: Award },
    ];

    const filters = [
        { key: 'all', label: t('formations.filterAll') },
        { key: 'ongoing', label: t('formations.status.ongoing') },
        { key: 'completed', label: t('formations.status.completed') },
        { key: 'upcoming', label: t('formations.status.upcoming') },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('formations.title')}</h1>
                    <p className="text-gray-500 mt-1 text-sm">{t('formations.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center justify-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 w-full md:w-auto"
                >
                    <Plus size={18} />
                    {t('formations.addFormation')}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out text-[#283852]">
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('formations.searchPlaceholder')}
                        className="w-full bg-white rounded-xl border border-gray-200 py-3 px-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                statusFilter === f.key
                                    ? 'bg-[#283852] text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                    <GraduationCap size={40} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 text-sm">{t('formations.noResults')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((formation, i) => {
                        const status = getFormationStatus(formation);
                        return (
                            <motion.div
                                key={formation.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 hover:border-[#33cbcc]/30 transition-all cursor-pointer"
                                onClick={() => setSelectedFormation(formation)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 ${
                                            status === 'completed' ? 'bg-[#283852]/10' :
                                            status === 'ongoing' ? 'bg-[#33cbcc]/10' :
                                            'bg-gray-100'
                                        }`}>
                                            <GraduationCap size={20} className={
                                                status === 'completed' ? 'text-[#283852]' :
                                                status === 'ongoing' ? 'text-[#33cbcc]' :
                                                'text-gray-400'
                                            } />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-semibold text-gray-800 text-sm md:text-base truncate">{formation.title}</h3>
                                            {formation.organization && (
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <Building size={12} />
                                                    {formation.organization}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                                    status === 'completed' ? 'bg-[#283852]/10 text-[#283852]' :
                                                    status === 'ongoing' ? 'bg-[#33cbcc]/10 text-[#33cbcc]' :
                                                    'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {t(`formations.status.${status}`)}
                                                </span>
                                                {formation.certificateDetails && (
                                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                        <Award size={10} />
                                                        {formation.certificateDetails}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                                        <Eye size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showCreate && <CreateFormationModal onClose={() => setShowCreate(false)} />}
                {selectedFormation && <FormationDetailModal formation={selectedFormation} onClose={() => setSelectedFormation(null)} />}
            </AnimatePresence>
        </div>
    );
};

export default Formations;
