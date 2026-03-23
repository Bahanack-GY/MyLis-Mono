import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Search,
    Shield,
    Calendar,
    Loader2,
    X,
} from 'lucide-react';
import { useMySanctions } from '../api/sanctions/hooks';
import type { Sanction, SanctionSeverity } from '../api/sanctions/types';

/* ─── Helpers ──────────────────────────────────────────── */

const SEVERITY_STYLES: Record<SanctionSeverity, { bg: string; text: string; border: string }> = {
    LEGER: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
    MOYEN: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
    GRAVE: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
};

const TYPE_ICONS: Record<string, string> = {
    AVERTISSEMENT: '⚠️',
    BLAME: '📝',
    MISE_A_PIED: '🚫',
    LICENCIEMENT: '❌',
};

/* ─── Detail Modal ─────────────────────────────────────── */

const SanctionDetailModal = ({ sanction, onClose, t }: { sanction: Sanction; onClose: () => void; t: (k: string) => string }) => {
    const sev = SEVERITY_STYLES[sanction.severity] || SEVERITY_STYLES.LEGER;

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${sev.bg} flex items-center justify-center`}>
                            <AlertTriangle size={20} className={sev.text} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{t(`sanctions.types.${sanction.type.toLowerCase()}`)}</h2>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                                {t(`sanctions.severity.${sanction.severity.toLowerCase()}`)}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {sanction.reason && (
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('sanctions.detail.reason')}</p>
                            <p className="text-sm text-gray-700 leading-relaxed">{sanction.reason}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('sanctions.detail.date')}</p>
                            <p className="text-sm text-gray-700">
                                {sanction.date ? new Date(sanction.date).toLocaleDateString() : new Date(sanction.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                        {sanction.issuedBy && (
                            <div>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{t('sanctions.detail.issuedBy')}</p>
                                <p className="text-sm text-gray-700">{sanction.issuedBy.email}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('sanctions.detail.close')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Sanctions = () => {
    const { t } = useTranslation();
    const { data: sanctions = [], isLoading } = useMySanctions();
    const [search, setSearch] = useState('');
    const [filterSeverity, setFilterSeverity] = useState<string>('all');
    const [selected, setSelected] = useState<Sanction | null>(null);

    const filtered = sanctions.filter(s => {
        const matchesSearch =
            s.reason?.toLowerCase().includes(search.toLowerCase()) ||
            s.type?.toLowerCase().includes(search.toLowerCase());
        const matchesSeverity = filterSeverity === 'all' || s.severity === filterSeverity;
        return matchesSearch && matchesSeverity;
    });

    const severityCounts = {
        leger: sanctions.filter(s => s.severity === 'LEGER').length,
        moyen: sanctions.filter(s => s.severity === 'MOYEN').length,
        grave: sanctions.filter(s => s.severity === 'GRAVE').length,
    };

    const stats = [
        { label: t('sanctions.stats.total'), value: sanctions.length, icon: AlertTriangle },
        { label: t('sanctions.stats.light'), value: severityCounts.leger, icon: Shield },
        { label: t('sanctions.stats.medium'), value: severityCounts.moyen, icon: Shield },
        { label: t('sanctions.stats.severe'), value: severityCounts.grave, icon: Shield },
    ];

    const severityFilters = [
        { key: 'all', label: t('sanctions.filterAll') },
        { key: 'LEGER', label: t('sanctions.severity.leger') },
        { key: 'MOYEN', label: t('sanctions.severity.moyen') },
        { key: 'GRAVE', label: t('sanctions.severity.grave') },
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
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('sanctions.title')}</h1>
                <p className="text-gray-500 text-sm mt-1">{t('sanctions.subtitle')}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out text-[#33cbcc]">
                            <stat.icon size={80} strokeWidth={1.5} className="md:hidden" />
                            <stat.icon size={100} strokeWidth={1.5} className="hidden md:block" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={t('sanctions.searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {severityFilters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilterSeverity(f.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                filterSeverity === f.key
                                    ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Sanctions List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-12 text-center"
                    >
                        <AlertTriangle size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-gray-400 text-sm">{t('sanctions.noResults')}</p>
                    </motion.div>
                ) : (
                    filtered.map((sanction, i) => {
                        const sev = SEVERITY_STYLES[sanction.severity] || SEVERITY_STYLES.LEGER;
                        return (
                            <motion.div
                                key={sanction.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelected(sanction)}
                                className={`bg-white rounded-2xl border ${sev.border} p-4 md:p-5 cursor-pointer hover:shadow-md transition-all group`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`w-11 h-11 rounded-xl ${sev.bg} flex items-center justify-center shrink-0`}>
                                        <span className="text-lg">{TYPE_ICONS[sanction.type] || '⚠️'}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-semibold text-gray-800">
                                                {t(`sanctions.types.${sanction.type.toLowerCase()}`)}
                                            </h3>
                                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                                                {t(`sanctions.severity.${sanction.severity.toLowerCase()}`)}
                                            </span>
                                        </div>
                                        {sanction.reason && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sanction.reason}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                <Calendar size={12} />
                                                {sanction.date
                                                    ? new Date(sanction.date).toLocaleDateString()
                                                    : new Date(sanction.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <SanctionDetailModal
                    sanction={selected}
                    onClose={() => setSelected(null)}
                    t={t}
                />
            )}
        </div>
    );
};

export default Sanctions;
