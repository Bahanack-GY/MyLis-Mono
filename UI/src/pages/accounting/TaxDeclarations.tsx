import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Cancel01Icon, Loading02Icon, Calendar01Icon, Tick01Icon, File01Icon, ViewIcon, Invoice01Icon, Building02Icon, UserGroupIcon, Clock01Icon, Alert02Icon, Shield01Icon } from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api/config';
import { getFiscalYears } from '../../api/accounting/api';
import type { FiscalYear } from '../../api/accounting/types';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface TaxDeclaration {
 id: string;
 type: 'TVA_MONTHLY' | 'IS_ANNUAL' | 'IS_QUARTERLY_ADVANCE' | 'IRPP_ANNUAL' | 'CNPS_MONTHLY' | 'DSF';
 fiscalYearId: string;
 period: string;
 totalAmount: number;
 dueDate: string;
 status: 'DRAFT' | 'VALIDATED' | 'FILED';
 filedAt: string | null;
 data?: any;
 createdAt: string;
}

interface UpcomingObligation {
 type: string;
 description: string;
 dueDate: string;
 daysUntilDue: number;
}

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const formatXAF = (amount: number) =>
 new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + ' XAF';

const formatDate = (dateStr: string | null | undefined) => {
 if (!dateStr) return '--';
 return new Date(dateStr).toLocaleDateString('fr-FR', {
 day: '2-digit',
 month: 'short',
 year: 'numeric',
 });
};

const MONTHS = [
 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const STATUS_COLORS: Record<string, { text: string; label: string }> = {
 DRAFT: { text: 'text-[#283852]/70', label: 'Brouillon' },
 VALIDATED: { text: 'text-[#283852]', label: 'Validee' },
 FILED: { text: 'text-[#33cbcc]', label: 'Deposee' },
};

const TYPE_CONFIG: Record<string, { text: string; icon: any; label: string; full: string }> = {
 TVA_MONTHLY: { text: 'text-gray-600', icon: Invoice01Icon, label: 'TVA', full: 'TVA Mensuelle' },
 IS_ANNUAL: { text: 'text-gray-600', icon: Building02Icon, label: 'IS', full: 'Impot sur les Societes' },
 IS_QUARTERLY_ADVANCE: { text: 'text-gray-600', icon: Building02Icon, label: 'IS-A', full: 'Acompte IS Trimestriel' },
 CNPS_MONTHLY: { text: 'text-gray-600', icon: UserGroupIcon, label: 'CNPS', full: 'CNPS Mensuelle' },
 IRPP_ANNUAL: { text: 'text-gray-600', icon: UserGroupIcon, label: 'IRPP', full: 'Impot sur le Revenu (IRPP)' },
 DSF: { text: 'text-gray-600', icon: Building02Icon, label: 'DSF', full: 'Declaration Statistique et Fiscale' },
};

const parsePeriod = (period: string): string => {
 const monthly = period.match(/^(\d{4})-(\d{2})$/);
 if (monthly) return `${MONTHS[parseInt(monthly[2]) - 1]} ${monthly[1]}`;
 const quarterly = period.match(/^(\d{4})-Q(\d)$/);
 if (quarterly) return `T${quarterly[2]} ${quarterly[1]}`;
 return period;
};

const labelCls =
 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/* API */
/* ------------------------------------------------------------------ */

const taxApi = {
 getDeclarations: (params?: any) =>
 api.get('/tax/declarations', { params }).then((r) => r.data),
 getUpcoming: () =>
 api.get('/tax/declarations/upcoming').then((r) => r.data),
 generateTva: (data: any) =>
 api.post('/tax/declarations/generate/tva', data).then((r) => r.data),
 generateIs: (data: any) =>
 api.post('/tax/declarations/generate/is', data).then((r) => r.data),
 generateCnps: (data: any) =>
 api.post('/tax/declarations/generate/cnps', data).then((r) => r.data),
 generateIrpp: (data: any) =>
 api.post('/tax/declarations/generate/irpp', data).then((r) => r.data),
 generateIsQuarterly: (data: any) =>
 api.post('/tax/declarations/generate/is-quarterly', data).then((r) => r.data),
 generateDsf: (data: any) =>
 api.post('/tax/declarations/generate/dsf', data).then((r) => r.data),
 validate: (id: string) =>
 api.post(`/tax/declarations/${id}/validate`).then((r) => r.data),
 markFiled: (id: string) =>
 api.post(`/tax/declarations/${id}/filed`).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useFiscalYears = () =>
 useQuery<FiscalYear[]>({
 queryKey: ['accounting', 'fiscal-years'],
 queryFn: getFiscalYears,
 });

const useTaxDeclarations = (params?: any) =>
 useQuery<TaxDeclaration[]>({
 queryKey: ['accounting', 'tax-declarations', params],
 queryFn: () => taxApi.getDeclarations(params),
 });

const useUpcomingDeclarations = () =>
 useQuery<UpcomingObligation[]>({
 queryKey: ['accounting', 'tax-declarations', 'upcoming'],
 queryFn: taxApi.getUpcoming,
 });

const useGenerateTva = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateTva(data),
 onSuccess: () => {
 toast.success('Declaration TVA generee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useGenerateIs = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateIs(data),
 onSuccess: () => {
 toast.success('Declaration IS generee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useGenerateCnps = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateCnps(data),
 onSuccess: () => {
 toast.success('Declaration CNPS generee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useGenerateIrpp = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateIrpp(data),
 onSuccess: () => {
 toast.success('Declaration IRPP generee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useGenerateIsQuarterly = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateIsQuarterly(data),
 onSuccess: () => {
 toast.success('4 acomptes IS trimestriels generes');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useGenerateDsf = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => taxApi.generateDsf(data),
 onSuccess: () => {
 toast.success('DSF generee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la generation'),
 });
};

const useValidateDeclaration = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => taxApi.validate(id),
 onSuccess: () => {
 toast.success('Declaration validee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la validation'),
 });
};

const useMarkDeclarationFiled = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => taxApi.markFiled(id),
 onSuccess: () => {
 toast.success('Declaration marquee comme deposee');
 qc.invalidateQueries({ queryKey: ['accounting', 'tax-declarations'] });
 },
 onError: () => toast.error('Erreur lors de la mise a jour'),
 });
};

/* ------------------------------------------------------------------ */
/* Generate Modal */
/* ------------------------------------------------------------------ */

type GenerateType = 'TVA' | 'IS' | 'CNPS' | 'IRPP' | 'IS_QUARTERLY' | 'DSF';

const MODAL_TYPE_TO_CONFIG: Record<GenerateType, string> = {
 TVA: 'TVA_MONTHLY',
 IS: 'IS_ANNUAL',
 CNPS: 'CNPS_MONTHLY',
 IRPP: 'IRPP_ANNUAL',
 IS_QUARTERLY: 'IS_QUARTERLY_ADVANCE',
 DSF: 'DSF',
};

const ANNUAL_NOTES: Record<string, string> = {
 IS: "La declaration IS sera generee pour l'exercice fiscal selectionne.",
 IRPP: "La declaration IRPP agrege toutes les fiches de paie payees sur l'exercice.",
 IS_QUARTERLY: "4 acomptes trimestriels IS seront generes (25% chacun) sur la base de la projection annuelle.",
 DSF: "La DSF agrege les donnees comptables et salariales de l'exercice selectionne.",
};

const GenerateModal = ({
 type,
 fiscalYearId,
 onClose,
}: {
 type: GenerateType;
 fiscalYearId: string;
 onClose: () => void;
}) => {
 const now = new Date();
 const [month, setMonth] = useState(String(now.getMonth() + 1));
 const [year, setYear] = useState(String(now.getFullYear()));

 const generateTva = useGenerateTva();
 const generateIs = useGenerateIs();
 const generateCnps = useGenerateCnps();
 const generateIrpp = useGenerateIrpp();
 const generateIsQuarterly = useGenerateIsQuarterly();
 const generateDsf = useGenerateDsf();

 const config = TYPE_CONFIG[MODAL_TYPE_TO_CONFIG[type]];
 const needsMonth = type === 'TVA' || type === 'CNPS';

 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 document.addEventListener('keydown', handleKey);
 document.body.style.overflow = 'hidden';
 return () => {
 document.removeEventListener('keydown', handleKey);
 document.body.style.overflow = '';
 };
 }, [onClose]);

 const isPending =
 generateTva.isPending || generateIs.isPending || generateCnps.isPending ||
 generateIrpp.isPending || generateIsQuarterly.isPending || generateDsf.isPending;

 const handleGenerate = () => {
 if (isPending) return;
 const monthlyPayload = { fiscalYearId, month: Number(month), year: Number(year) };
 const annualPayload = { fiscalYearId };

 if (type === 'TVA') generateTva.mutate(monthlyPayload, { onSuccess: onClose });
 else if (type === 'IS') generateIs.mutate(annualPayload, { onSuccess: onClose });
 else if (type === 'CNPS') generateCnps.mutate(monthlyPayload, { onSuccess: onClose });
 else if (type === 'IRPP') generateIrpp.mutate(annualPayload, { onSuccess: onClose });
 else if (type === 'IS_QUARTERLY') generateIsQuarterly.mutate(annualPayload, { onSuccess: onClose });
 else generateDsf.mutate(annualPayload, { onSuccess: onClose });
 };

 const Icon = config.icon;

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
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10  bg-[#f8f9fc] flex items-center justify-center">
 <Icon size={20} className="text-[#8892a4]" />
 </div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">Generer {config.full}</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
 >
 <Cancel01Icon size={18} />
 </button>
 </div>

 <div className="p-6 space-y-4 flex-1 overflow-y-auto">
 {needsMonth && (
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Mois</label>
 <select
 value={month}
 onChange={(e) => setMonth(e.target.value)}
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors appearance-none cursor-pointer"
 >
 {MONTHS.map((name, idx) => (
 <option key={idx} value={idx + 1}>
 {name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelCls}>Annee</label>
 <input
 type="number"
 value={year}
 onChange={(e) => setYear(e.target.value)}
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 </div>
 </div>
 )}
 {!needsMonth && (
 <div className="bg-[#f8f9fc] p-4 text-sm text-[#8892a4]">
 {ANNUAL_NOTES[type] || "La declaration sera generee pour l'exercice fiscal selectionne."}
 </div>
 )}
 </div>

 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button
 onClick={onClose}
 className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={isPending}
 onClick={handleGenerate}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors bg-[#283852] hover:bg-[#1e2d3d] disabled:opacity-50"
 >
 {isPending ? <Loading02Icon size={16} className="animate-spin"/> : <Add01Icon size={16} />}
 Generer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Declaration Detail Modal */
/* ------------------------------------------------------------------ */

const DeclarationDetailModal = ({
 declaration,
 onClose,
}: {
 declaration: TaxDeclaration;
 onClose: () => void;
}) => {
 const validateMut = useValidateDeclaration();
 const fileMut = useMarkDeclarationFiled();

 const config = TYPE_CONFIG[declaration.type] || TYPE_CONFIG.TVA_MONTHLY;
 const statusStyle = STATUS_COLORS[declaration.status] || STATUS_COLORS.DRAFT;
 const Icon = config.icon;

 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 document.addEventListener('keydown', handleKey);
 document.body.style.overflow = 'hidden';
 return () => {
 document.removeEventListener('keydown', handleKey);
 document.body.style.overflow = '';
 };
 }, [onClose]);

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
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10  bg-[#f8f9fc] flex items-center justify-center">
 <Icon size={20} className={config.text} />
 </div>
 <div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">{config.full}</h2>
 <div className="flex items-center gap-2 mt-0.5">
 <span className={`text-[10px] font-semibold ${statusStyle.text}`}>
 {statusStyle.label}
 </span>
 <span className={`text-[10px] font-semibold ${config.text}`}>
 {config.label}
 </span>
 </div>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-2  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
 >
 <Cancel01Icon size={18} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-5 overflow-y-auto flex-1">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider">Periode</p>
 <p className="text-sm font-medium text-[#1c2b3a] mt-1">
 {parsePeriod(declaration.period)}
 </p>
 </div>
 <div>
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider">Echeance</p>
 <p className="text-sm text-[#8892a4] mt-1">{formatDate(declaration.dueDate)}</p>
 </div>
 </div>

 {/* Amount */}
 <div className="bg-[#f8f9fc] p-4">
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-2">
 Montant a payer
 </p>
 <p className="text-2xl font-bold text-[#1c2b3a]">{formatXAF(declaration.totalAmount)}</p>
 </div>

 {/* Details */}
 {declaration.data && (
 <div>
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-3">
 Details du calcul
 </p>
 <div className="bg-[#f8f9fc] p-4 space-y-2">
 {Object.entries(declaration.data).map(([key, value]) => (
 <div key={key} className="flex justify-between text-sm">
 <span className="text-[#8892a4] capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
 <span className="font-medium text-[#1c2b3a]">
 {typeof value === 'number' ? formatXAF(value) : String(value)}
 </span>
 </div>
 ))}
 </div>
 </div>
 )}

 {declaration.filedAt && (
 <div className="bg-[#f8f9fc] p-4 flex items-center gap-2">
 <File01Icon size={16} className="text-[#8892a4]"/>
 <span className="text-sm text-[#8892a4]">
 Deposee le {formatDate(declaration.filedAt)}
 </span>
 </div>
 )}
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
 {declaration.status === 'DRAFT' && (
 <button
 onClick={() => validateMut.mutate(declaration.id, { onSuccess: onClose })}
 disabled={validateMut.isPending}
 className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d3d] transition-colors disabled:opacity-50"
 >
 {validateMut.isPending ? (
 <Loading02Icon size={14} className="animate-spin"/>
 ) : (
 <Tick01Icon size={14} />
 )}
 Valider
 </button>
 )}
 {declaration.status === 'VALIDATED' && (
 <button
 onClick={() => fileMut.mutate(declaration.id, { onSuccess: onClose })}
 disabled={fileMut.isPending}
 className="flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d3d] transition-colors disabled:opacity-50"
 >
 {fileMut.isPending ? (
 <Loading02Icon size={14} className="animate-spin"/>
 ) : (
 <File01Icon size={14} />
 )}
 Marquer deposee
 </button>
 )}
 <button
 onClick={onClose}
 className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
 >
 Fermer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function TaxDeclarations() {
 const { t } = useTranslation();
 const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');
 const [generateType, setGenerateType] = useState<GenerateType | null>(null);
 const [selectedDeclaration, setSelectedDeclaration] = useState<TaxDeclaration | null>(null);

 const { data: fiscalYears, isLoading: fyLoading } = useFiscalYears();
 const { data: declarations, isLoading: declLoading } = useTaxDeclarations(
 selectedFiscalYearId ? { fiscalYearId: selectedFiscalYearId } : undefined,
 );
 const { data: upcoming } = useUpcomingDeclarations();
 const validateMut = useValidateDeclaration();
 const fileMut = useMarkDeclarationFiled();

 // Auto-select fiscal year
 useMemo(() => {
 if (fiscalYears && fiscalYears.length > 0 && !selectedFiscalYearId) {
 const open = fiscalYears.find((fy) => fy.status === 'OPEN');
 setSelectedFiscalYearId(open?.id || fiscalYears[0].id);
 }
 }, [fiscalYears, selectedFiscalYearId]);

 if (fyLoading) {
 return (
 <div className="space-y-6">
 <div className="h-8 bg-gray-200  w-64 animate-pulse"/>
 <div className="h-12 bg-gray-100  animate-pulse"/>
 <div className="h-64 bg-gray-100  animate-pulse"/>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Declarations Fiscales</h1>
 <p className="text-sm text-gray-500 mt-1">
 TVA, CNPS, IRPP, IS, DSF
 </p>
 </div>

 {/* Fiscal Year Selector + Generate Buttons */}
 <div className="bg-white  p-4 flex flex-col md:flex-row md:items-center gap-4">
 <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
 <Calendar01Icon size={16} className="text-[#33cbcc]"/>
 Exercice fiscal
 </div>
 <select
 value={selectedFiscalYearId}
 onChange={(e) => setSelectedFiscalYearId(e.target.value)}
 className="bg-gray-50  border-0 px-4 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 appearance-none cursor-pointer"
 >
 {(fiscalYears || []).map((fy) => (
 <option key={fy.id} value={fy.id}>
 {fy.name} ({fy.status === 'OPEN' ? 'Ouvert' : 'Cloture'})
 </option>
 ))}
 </select>

 <div className="md:ml-auto flex gap-2 flex-wrap">
 {([
 { key: 'TVA' as const, configKey: 'TVA_MONTHLY' },
 { key: 'CNPS' as const, configKey: 'CNPS_MONTHLY' },
 { key: 'IRPP' as const, configKey: 'IRPP_ANNUAL' },
 { key: 'IS' as const, configKey: 'IS_ANNUAL' },
 { key: 'IS_QUARTERLY' as const, configKey: 'IS_QUARTERLY_ADVANCE' },
 { key: 'DSF' as const, configKey: 'DSF' },
 ]).map(({ key, configKey }) => {
 const cfg = TYPE_CONFIG[configKey];
 const Icon = cfg.icon;
 return (
 <button
 key={key}
 onClick={() => setGenerateType(key)}
 disabled={!selectedFiscalYearId}
 className="flex items-center gap-2 px-4 py-2.5  text-sm font-semibold text-white transition-colors bg-[#283852] hover:bg-[#1e2d3d] disabled:opacity-40"
 >
 <Icon size={14} />
 {cfg.label}
 </button>
 );
 })}
 </div>
 </div>

 {/* Upcoming Obligations */}
 {upcoming && upcoming.length > 0 && (
 <div className="bg-white  p-6">
 <div className="flex items-center gap-2 mb-4">
 <Clock01Icon size={18} className="text-[#283852]"/>
 <h3 className="text-sm font-bold text-gray-800">Prochaines echeances</h3>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
 {upcoming.map((obl, i) => {
 const isUrgent = obl.daysUntilDue <= 7;
 const isWarning = obl.daysUntilDue <= 15;
 return (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.1 }}
 className={` p-4 border-2 ${
 isUrgent
 ? 'border-gray-200 bg-[#283852]/5'
 : isWarning
 ? 'border-gray-200 bg-[#283852]/5'
 : 'border-gray-100 bg-gray-50/50'
 }`}
 >
 <div className="flex items-center justify-between mb-2">
 <span className={`text-xs font-semibold ${TYPE_CONFIG[obl.type]?.text || 'text-gray-500'}`}>
 {TYPE_CONFIG[obl.type]?.label || obl.type}
 </span>
 {isUrgent && <Alert02Icon size={14} className="text-[#283852]"/>}
 </div>
 <p className="text-sm text-gray-700 mb-1">{obl.description}</p>
 <div className="flex items-center justify-between">
 <span className="text-xs text-gray-400">{formatDate(obl.dueDate)}</span>
 <span
 className={`text-xs font-semibold ${
 isUrgent ? 'text-[#283852]' : isWarning ? 'text-[#283852]/70' : 'text-gray-500'
 }`}
 >
 {obl.daysUntilDue} jour{obl.daysUntilDue > 1 ? 's' : ''}
 </span>
 </div>
 </motion.div>
 );
 })}
 </div>
 </div>
 )}

 {/* Declarations Table */}
 {declLoading ? (
 <div className="flex items-center justify-center py-16">
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 ) : (declarations || []).length > 0 ? (
 <div className="bg-white  overflow-hidden">
 <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <div className="col-span-1">Type</div>
 <div className="col-span-2">Periode</div>
 <div className="col-span-2 text-right">Montant</div>
 <div className="col-span-2">Echeance</div>
 <div className="col-span-1">Statut</div>
 <div className="col-span-2">Deposee le</div>
 <div className="col-span-2 text-right">Actions</div>
 </div>

 {(declarations || []).map((decl, i) => {
 const config = TYPE_CONFIG[decl.type] || TYPE_CONFIG.TVA_MONTHLY;
 const statusStyle = STATUS_COLORS[decl.status] || STATUS_COLORS.DRAFT;
 const Icon = config.icon;
 const isOverdue = decl.status !== 'FILED' && new Date(decl.dueDate) < new Date();

 return (
 <motion.div
 key={decl.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.02 }}
 onClick={() => setSelectedDeclaration(decl)}
 className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
 >
 <div className="col-span-1">
 <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${config.text}`}>
 <Icon size={10} />
 {config.label}
 </span>
 </div>
 <div className="col-span-2 text-sm text-gray-700">
 {parsePeriod(decl.period)}
 </div>
 <div className="col-span-2 text-sm font-semibold text-gray-800 text-right">
 {formatXAF(decl.totalAmount)}
 </div>
 <div className="col-span-2">
 <span className={`text-xs ${isOverdue ? 'text-[#283852] font-semibold' : 'text-gray-500'}`}>
 {formatDate(decl.dueDate)}
 {isOverdue && <Alert02Icon size={10} className="inline ml-1 text-[#283852]"/>}
 </span>
 </div>
 <div className="col-span-1">
 <span className={`text-[10px] font-semibold ${statusStyle.text}`}>
 {statusStyle.label}
 </span>
 </div>
 <div className="col-span-2 text-xs text-gray-400">
 {decl.filedAt ? formatDate(decl.filedAt) : '--'}
 </div>
 <div className="col-span-2 flex justify-end gap-1">
 {decl.status === 'DRAFT' && (
 <button
 onClick={(e) => { e.stopPropagation(); validateMut.mutate(decl.id); }}
 disabled={validateMut.isPending}
 title="Valider"
 className="p-1.5  text-gray-400 hover:text-[#283852] hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Tick01Icon size={14} />
 </button>
 )}
 {decl.status === 'VALIDATED' && (
 <button
 onClick={(e) => { e.stopPropagation(); fileMut.mutate(decl.id); }}
 disabled={fileMut.isPending}
 title="Marquer deposee"
 className="p-1.5  text-gray-400 hover:text-[#283852] hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
 >
 <File01Icon size={14} />
 </button>
 )}
 <button
 onClick={(e) => { e.stopPropagation(); setSelectedDeclaration(decl); }}
 title="Details"
 className="p-1.5  text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors opacity-0 group-hover:opacity-100"
 >
 <ViewIcon size={14} />
 </button>
 </div>
 </motion.div>
 );
 })}
 </div>
 ) : (
 <div className="bg-white  p-12 text-center">
 <Shield01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-500 font-medium mb-2">Aucune declaration fiscale</p>
 <p className="text-sm text-gray-400">
 Utilisez les boutons ci-dessus pour generer vos declarations.
 </p>
 </div>
 )}

 {/* Modals */}
 <AnimatePresence>
 {generateType && selectedFiscalYearId && (
 <GenerateModal
 type={generateType}
 fiscalYearId={selectedFiscalYearId}
 onClose={() => setGenerateType(null)}
 />
 )}
 {selectedDeclaration && (
 <DeclarationDetailModal
 declaration={selectedDeclaration}
 onClose={() => setSelectedDeclaration(null)}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
