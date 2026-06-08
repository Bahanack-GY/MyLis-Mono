import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Alert02Icon, Search01Icon, Shield01Icon, Calendar01Icon, Loading02Icon, Cancel01Icon } from 'hugeicons-react';
import { useMySanctions } from '../api/sanctions/hooks';
import type { Sanction, SanctionSeverity } from '../api/sanctions/types';

/* ─── Helpers ──────────────────────────────────────────── */

const SEVERITY_STYLES: Record<SanctionSeverity, { bg: string; text: string; border: string }> = {
  LEGER: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
  MOYEN: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
  GRAVE: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', border: 'border-gray-200' },
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
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className={`w-10 h-10  ${sev.bg} flex items-center justify-center`}>
  <Alert02Icon size={20} className={sev.text} />
  </div>
  <div>
  <h2 className="text-lg font-bold text-[#1c2b3a]">{t(`sanctions.types.${sanction.type.toLowerCase()}`)}</h2>
  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
  {t(`sanctions.severity.${sanction.severity.toLowerCase()}`)}
  </span>
  </div>
  </div>
  <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
  <Cancel01Icon size={18} />
  </button>
  </div>

  {/* Body */}
  <div className="p-6 space-y-5 flex-1 overflow-y-auto">
  {sanction.reason && (
  <div>
  <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">{t('sanctions.detail.reason')}</p>
  <p className="text-sm text-[#1c2b3a] leading-relaxed">{sanction.reason}</p>
  </div>
  )}

  <div className="grid grid-cols-2 gap-4">
  <div>
  <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">{t('sanctions.detail.date')}</p>
  <p className="text-sm text-[#1c2b3a]">
  {sanction.date ? new Date(sanction.date).toLocaleDateString() : new Date(sanction.createdAt!).toLocaleDateString()}
  </p>
  </div>
  {sanction.issuedBy && (
  <div>
  <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5">{t('sanctions.detail.issuedBy')}</p>
  <p className="text-sm text-[#1c2b3a]">{sanction.issuedBy.email}</p>
  </div>
  )}
  </div>
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex justify-end">
  <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
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
  { label: t('sanctions.stats.total'), value: sanctions.length, icon: Alert02Icon, color: '#283852' },
  { label: t('sanctions.stats.light'), value: severityCounts.leger, icon: Shield01Icon, color: '#33cbcc' },
  { label: t('sanctions.stats.medium'), value: severityCounts.moyen, icon: Shield01Icon, color: '#f59e0b' },
  { label: t('sanctions.stats.severe'), value: severityCounts.grave, icon: Shield01Icon, color: '#ef4444' },
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
  <Loading02Icon className="w-8 h-8 animate-spin text-[#33cbcc]" />
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
  className="border border-gray-100  overflow-hidden cursor-pointer"
  >
  <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
  <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
  </div>
  <div className="p-5 bg-white relative overflow-hidden">
  <h2 className="text-3xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
  <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
  <stat.icon size={110} strokeWidth={1.2} />
  </div>
  </div>
  </motion.div>
  ))}
  </div>

  {/* Search01Icon + Filters */}
  <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
  <div className="relative flex-1 max-w-sm">
  <Search01Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input
  type="text"
  placeholder={t('sanctions.searchPlaceholder')}
  value={search}
  onChange={e => setSearch(e.target.value)}
  className="w-full bg-white border border-[#e5e8ef]  py-3.5 pl-11 pr-4 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
  />
  </div>
  <div className="flex gap-2 flex-wrap">
  {severityFilters.map(f => (
  <button
  key={f.key}
  onClick={() => setFilterSeverity(f.key)}
  className={`px-4 py-2  text-xs font-semibold transition-all ${
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
  className="bg-white   border border-gray-100 p-12 text-center"
  >
  <Alert02Icon size={40} className="mx-auto text-gray-200 mb-3" />
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
  className={`bg-white  border ${sev.border} p-4 md:p-5 cursor-pointer  transition-all group`}
  >
  <div className="flex items-start gap-4">
  <div className={`w-11 h-11  ${sev.bg} flex items-center justify-center shrink-0`}>
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
  <Calendar01Icon size={12} />
  {sanction.date
  ? new Date(sanction.date).toLocaleDateString()
  : new Date(sanction.createdAt!).toLocaleDateString()}
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
