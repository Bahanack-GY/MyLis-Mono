import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
 BookOpen,
 Scale,
 PieChart,
 TrendingUp,
 Calendar,
 CheckCircle,
 AlertTriangle,
 ArrowUp,
 ArrowDown,
 Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
 getFiscalYears,
 getGrandLivre,
 getTrialBalance,
 getBalanceSheet,
 getIncomeStatement,
} from '../../api/accounting/api';
import type {
 FiscalYear,
 TrialBalance,
 TrialBalanceAccount,
 BalanceSheet,
 IncomeStatement,
} from '../../api/accounting/types';

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

const TABS = [
 { key: 'grand-livre', label: 'Grand Livre', icon: BookOpen },
 { key: 'balance', label: 'Balance', icon: Scale },
 { key: 'bilan', label: 'Bilan', icon: PieChart },
 { key: 'resultat', label: 'Compte de Resultat', icon: TrendingUp },
] as const;

type TabKey = (typeof TABS)[number]['key'];

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useFiscalYears = () =>
 useQuery<FiscalYear[]>({
 queryKey: ['accounting', 'fiscal-years'],
 queryFn: getFiscalYears,
 });

const useGrandLivre = (fiscalYearId: string) =>
 useQuery<any[]>({
 queryKey: ['accounting', 'reports', 'grand-livre', fiscalYearId],
 queryFn: () => getGrandLivre(fiscalYearId),
 enabled: !!fiscalYearId,
 });

const useTrialBalance = (fiscalYearId: string) =>
 useQuery<TrialBalance>({
 queryKey: ['accounting', 'reports', 'trial-balance', fiscalYearId],
 queryFn: () => getTrialBalance(fiscalYearId),
 enabled: !!fiscalYearId,
 });

const useBalanceSheet = (fiscalYearId: string) =>
 useQuery<BalanceSheet>({
 queryKey: ['accounting', 'reports', 'balance-sheet', fiscalYearId],
 queryFn: () => getBalanceSheet(fiscalYearId),
 enabled: !!fiscalYearId,
 });

const useIncomeStatement = (fiscalYearId: string) =>
 useQuery<IncomeStatement>({
 queryKey: ['accounting', 'reports', 'income-statement', fiscalYearId],
 queryFn: () => getIncomeStatement(fiscalYearId),
 enabled: !!fiscalYearId,
 });

/* ------------------------------------------------------------------ */
/* Grand Livre Tab */
/* ------------------------------------------------------------------ */

const GrandLivreTab = ({ fiscalYearId }: { fiscalYearId: string }) => {
 const { data, isLoading } = useGrandLivre(fiscalYearId);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data || data.length === 0) {
 return (
 <div className="text-center py-16">
 <BookOpen size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnee pour cet exercice</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {data.map((accountGroup: any) => {
 let runningBalance = 0;
 return (
 <div key={accountGroup.accountId || accountGroup.account?.id} className="bg-white rounded-2xl overflow-hidden">
 {/* Account header */}
 <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <span className="font-mono text-sm font-bold text-[#33cbcc]">
 {accountGroup.account?.code}
 </span>
 <span className="text-sm font-semibold text-gray-800">
 {accountGroup.account?.name}
 </span>
 </div>
 <span className="text-xs text-gray-400">
 {(accountGroup.entries || []).length} ecritures
 </span>
 </div>

 {/* Entries table */}
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <th className="px-6 py-2">Date</th>
 <th className="px-6 py-2">Libelle</th>
 <th className="px-6 py-2">Reference</th>
 <th className="px-6 py-2 text-right">Debit</th>
 <th className="px-6 py-2 text-right">Credit</th>
 <th className="px-6 py-2 text-right">Solde</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {(accountGroup.entries || []).map((entry: any, idx: number) => {
 runningBalance += (entry.debit || 0) - (entry.credit || 0);
 return (
 <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm">
 <td className="px-6 py-2.5 text-gray-500 text-xs">
 {formatDate(entry.date)}
 </td>
 <td className="px-6 py-2.5 text-gray-700">{entry.description || entry.label || '--'}</td>
 <td className="px-6 py-2.5 text-gray-400 text-xs">
 {entry.reference || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {entry.debit > 0 ? formatXAF(entry.debit) : ''}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {entry.credit > 0 ? formatXAF(entry.credit) : ''}
 </td>
 <td
 className={`px-6 py-2.5 text-right font-bold ${
 runningBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
 }`}
 >
 {formatXAF(Math.abs(runningBalance))}
 {runningBalance < 0 && ' (Cr)'}
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 );
 })}
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Balance (Trial Balance) Tab */
/* ------------------------------------------------------------------ */

const BalanceTab = ({ fiscalYearId }: { fiscalYearId: string }) => {
 const { data, isLoading } = useTrialBalance(fiscalYearId);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data || !data.accounts || data.accounts.length === 0) {
 return (
 <div className="text-center py-16">
 <Scale size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnee pour cet exercice</p>
 </div>
 );
 }

 return (
 <div className="bg-white rounded-2xl overflow-hidden">
 {/* Balanced indicator */}
 <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
 <h3 className="text-sm font-bold text-gray-800">Balance des comptes</h3>
 {data.totals.isBalanced ? (
 <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
 <CheckCircle size={12} />
 Equilibree
 </span>
 ) : (
 <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1 rounded-full">
 <AlertTriangle size={12} />
 Desequilibree
 </span>
 )}
 </div>

 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-gray-50">
 <th className="px-6 py-3">Code</th>
 <th className="px-6 py-3">Nom du compte</th>
 <th className="px-6 py-3 text-right">Debit</th>
 <th className="px-6 py-3 text-right">Credit</th>
 <th className="px-6 py-3 text-right">Solde Debiteur</th>
 <th className="px-6 py-3 text-right">Solde Crediteur</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {data.accounts.map((row: TrialBalanceAccount, idx: number) => (
 <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm">
 <td className="px-6 py-2.5 font-mono text-xs font-semibold text-gray-600">
 {row.account.code}
 </td>
 <td className="px-6 py-2.5 text-gray-700">{row.account.name}</td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {row.totalDebit > 0 ? formatXAF(row.totalDebit) : ''}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {row.totalCredit > 0 ? formatXAF(row.totalCredit) : ''}
 </td>
 <td className="px-6 py-2.5 text-right font-bold text-emerald-600">
 {row.debitBalance > 0 ? formatXAF(row.debitBalance) : ''}
 </td>
 <td className="px-6 py-2.5 text-right font-bold text-blue-600">
 {row.creditBalance > 0 ? formatXAF(row.creditBalance) : ''}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200">
 <td className="px-6 py-3 font-bold text-gray-800"colSpan={2}>
 Totaux
 </td>
 <td className="px-6 py-3 text-right font-bold text-gray-800">
 {formatXAF(data.totals.totalDebit)}
 </td>
 <td className="px-6 py-3 text-right font-bold text-gray-800">
 {formatXAF(data.totals.totalCredit)}
 </td>
 <td className="px-6 py-3 text-right font-bold text-emerald-600">
 {formatXAF(
 data.accounts.reduce(
 (s: number, r: TrialBalanceAccount) => s + r.debitBalance,
 0,
 ),
 )}
 </td>
 <td className="px-6 py-3 text-right font-bold text-blue-600">
 {formatXAF(
 data.accounts.reduce(
 (s: number, r: TrialBalanceAccount) => s + r.creditBalance,
 0,
 ),
 )}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Bilan (Balance Sheet) Tab */
/* ------------------------------------------------------------------ */

const BilanTab = ({ fiscalYearId }: { fiscalYearId: string }) => {
 const { data, isLoading } = useBalanceSheet(fiscalYearId);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-16">
 <PieChart size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnee pour cet exercice</p>
 </div>
 );
 }

 const SideTable = ({
 title,
 items,
 total,
 color,
 }: {
 title: string;
 items: any[];
 total: number;
 color: string;
 }) => (
 <div className="bg-white rounded-2xl overflow-hidden">
 <div className={`px-6 py-3 border-b border-gray-100 bg-${color}-50/30`}>
 <h3 className="text-sm font-bold text-gray-800">{title}</h3>
 </div>
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <th className="px-6 py-2">Code</th>
 <th className="px-6 py-2">Compte</th>
 <th className="px-6 py-2 text-right">Montant</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {items.map((item: any, idx: number) => (
 <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm">
 <td className="px-6 py-2.5 font-mono text-xs font-semibold text-gray-600">
 {item.account?.code || item.code || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-700">
 {item.account?.name || item.name || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {formatXAF(item.balance || item.amount || 0)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200">
 <td className="px-6 py-3 font-bold text-gray-800"colSpan={2}>
 Total {title}
 </td>
 <td className="px-6 py-3 text-right font-bold text-gray-800">{formatXAF(total)}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 );

 return (
 <div className="space-y-4">
 {/* Balanced indicator */}
 <div className="flex justify-center">
 {data.isBalanced ? (
 <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
 <CheckCircle size={16} />
 Bilan equilibre
 </span>
 ) : (
 <span className="inline-flex items-center gap-2 text-sm font-semibold text-red-600 bg-red-50 px-4 py-2 rounded-full">
 <AlertTriangle size={16} />
 Bilan desequilibre (ecart: {formatXAF(Math.abs(data.totalAssets - data.totalLiabilities))})
 </span>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <SideTable title="Actif"items={data.assets || []} total={data.totalAssets} color="blue"/>
 <SideTable
 title="Passif"
 items={data.liabilities || []}
 total={data.totalLiabilities}
 color="orange"
 />
 </div>
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Resultat (Income Statement) Tab */
/* ------------------------------------------------------------------ */

const ResultatTab = ({ fiscalYearId }: { fiscalYearId: string }) => {
 const { data, isLoading } = useIncomeStatement(fiscalYearId);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-16">
 <TrendingUp size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnee pour cet exercice</p>
 </div>
 );
 }

 const isPositive = data.netIncome >= 0;

 const SectionTable = ({
 title,
 items,
 total,
 icon: Icon,
 color,
 }: {
 title: string;
 items: any[];
 total: number;
 icon: any;
 color: string;
 }) => (
 <div className="bg-white rounded-2xl overflow-hidden">
 <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
 <Icon size={16} className={`text-${color}-500`} />
 <h3 className="text-sm font-bold text-gray-800">{title}</h3>
 </div>
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <th className="px-6 py-2">Code</th>
 <th className="px-6 py-2">Compte</th>
 <th className="px-6 py-2 text-right">Montant</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {items.map((item: any, idx: number) => (
 <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm">
 <td className="px-6 py-2.5 font-mono text-xs font-semibold text-gray-600">
 {item.account?.code || item.code || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-700">
 {item.account?.name || item.name || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {formatXAF(item.balance || item.amount || 0)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200">
 <td className="px-6 py-3 font-bold text-gray-800"colSpan={2}>
 Total {title}
 </td>
 <td className="px-6 py-3 text-right font-bold text-gray-800">{formatXAF(total)}</td>
 </tr>
 </tfoot>
 </table>
 </div>
 );

 return (
 <div className="space-y-6">
 <SectionTable
 title="Produits (Revenus)"
 items={data.revenues || []}
 total={data.totalRevenue}
 icon={ArrowUp}
 color="emerald"
 />

 <SectionTable
 title="Charges (Depenses)"
 items={data.expenses || []}
 total={data.totalExpenses}
 icon={ArrowDown}
 color="red"
 />

 {/* Net Income */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className={`rounded-2xl p-6 ${
 isPositive ? 'bg-emerald-50 border-2 ' : 'bg-red-50 border-2 '
 }`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div
 className={`w-12 h-12 rounded-xl flex items-center justify-center ${
 isPositive ? 'bg-emerald-100' : 'bg-red-100'
 }`}
 >
 {isPositive ? (
 <ArrowUp size={24} className="text-emerald-600"/>
 ) : (
 <ArrowDown size={24} className="text-red-600"/>
 )}
 </div>
 <div>
 <p className="text-sm font-semibold text-gray-600">Resultat Net</p>
 <p className="text-xs text-gray-400">
 {isPositive ? 'Benefice' : 'Perte'}
 </p>
 </div>
 </div>
 <span
 className={`text-2xl font-bold ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}
 >
 {isPositive ? '+' : '-'}{formatXAF(Math.abs(data.netIncome))}
 </span>
 </div>
 </motion.div>
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function Reports() {
 const { t } = useTranslation();
 const [activeTab, setActiveTab] = useState<TabKey>('grand-livre');
 const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');

 const { data: fiscalYears, isLoading: fyLoading } = useFiscalYears();

 // Auto-select first open fiscal year
 useMemo(() => {
 if (fiscalYears && fiscalYears.length > 0 && !selectedFiscalYearId) {
 const open = fiscalYears.find((fy) => fy.status === 'OPEN');
 setSelectedFiscalYearId(open?.id || fiscalYears[0].id);
 }
 }, [fiscalYears, selectedFiscalYearId]);

 if (fyLoading) {
 return (
 <div className="space-y-6">
 <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"/>
 <div className="h-12 bg-gray-100 rounded-2xl animate-pulse"/>
 <div className="h-64 bg-gray-100 rounded-2xl animate-pulse"/>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Rapports Comptables</h1>
 <p className="text-sm text-gray-500 mt-1">
 Etats financiers et rapports de l'exercice
 </p>
 </div>

 {/* Fiscal Year Selector */}
 <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
 <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
 <Calendar size={16} className="text-[#33cbcc]"/>
 Exercice fiscal
 </div>
 <select
 value={selectedFiscalYearId}
 onChange={(e) => setSelectedFiscalYearId(e.target.value)}
 className="bg-gray-50 rounded-xl border-0 px-4 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 appearance-none cursor-pointer"
 >
 {(fiscalYears || []).map((fy) => (
 <option key={fy.id} value={fy.id}>
 {fy.name} ({fy.status === 'OPEN' ? 'Ouvert' : 'Cloture'})
 </option>
 ))}
 </select>
 </div>

 {/* Tabs */}
 <div className="bg-white rounded-2xl p-1.5 flex gap-1">
 {TABS.map((tab) => {
 const isActive = activeTab === tab.key;
 const Icon = tab.icon;
 return (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
 isActive
 ? 'bg-[#33cbcc] text-white '
 : 'text-gray-500 hover:bg-gray-50'
 }`}
 >
 <Icon size={16} />
 {tab.label}
 </button>
 );
 })}
 </div>

 {/* Tab Content */}
 {selectedFiscalYearId ? (
 <motion.div
 key={activeTab + selectedFiscalYearId}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.2 }}
 >
 {activeTab === 'grand-livre' && <GrandLivreTab fiscalYearId={selectedFiscalYearId} />}
 {activeTab === 'balance' && <BalanceTab fiscalYearId={selectedFiscalYearId} />}
 {activeTab === 'bilan' && <BilanTab fiscalYearId={selectedFiscalYearId} />}
 {activeTab === 'resultat' && <ResultatTab fiscalYearId={selectedFiscalYearId} />}
 </motion.div>
 ) : (
 <div className="bg-white rounded-2xl p-12 text-center">
 <Calendar size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">
 Selectionnez un exercice fiscal pour afficher les rapports
 </p>
 </div>
 )}
 </div>
 );
}
