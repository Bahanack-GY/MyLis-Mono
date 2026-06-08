import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen01Icon, JusticeScale01Icon, PieChartIcon, ArrowUpRight01Icon, Calendar01Icon, Tick01Icon, Alert02Icon, ArrowUp01Icon, ArrowDown01Icon, Loading02Icon, ArrowRight01Icon } from 'hugeicons-react';
import { useQuery } from '@tanstack/react-query';
import {
 getFiscalYears,
 getGrandLivre,
 getTrialBalance,
 getBalanceSheet,
 getIncomeStatement,
 getSixColumnBalance,
 getAuxiliaryBalance,
} from '../../api/accounting/api';
import { useDepartments } from '../../api/departments/hooks';
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

const SECTION_RAPPORTS = [
 { key: 'grand-livre', label: 'Grand Livre', icon: BookOpen01Icon },
 { key: 'balance', label: 'Balance', icon: JusticeScale01Icon },
] as const;

const SECTION_ETATS = [
 { key: 'bilan', label: 'Bilan', icon: PieChartIcon },
 { key: 'resultat', label: 'Compte de Résultat', icon: ArrowUpRight01Icon },
] as const;

type TabKey = 'grand-livre' | 'balance' | 'bilan' | 'resultat';

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useFiscalYears = () =>
 useQuery<FiscalYear[]>({
 queryKey: ['accounting', 'fiscal-years'],
 queryFn: getFiscalYears,
 });

const useGrandLivre = (fiscalYearId: string, departmentId?: string) =>
 useQuery<any[]>({
 queryKey: ['accounting', 'reports', 'grand-livre', fiscalYearId, departmentId],
 queryFn: () => getGrandLivre(fiscalYearId, undefined, departmentId),
 enabled: !!fiscalYearId,
 });

const useTrialBalance = (fiscalYearId: string, departmentId?: string) =>
 useQuery<TrialBalance>({
 queryKey: ['accounting', 'reports', 'trial-balance', fiscalYearId, departmentId],
 queryFn: () => getTrialBalance(fiscalYearId, departmentId),
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

const GrandLivreTab = ({ fiscalYearId, departmentId }: { fiscalYearId: string; departmentId?: string }) => {
 const { data, isLoading } = useGrandLivre(fiscalYearId, departmentId);

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data || data.length === 0) {
 return (
 <div className="text-center py-16">
 <BookOpen01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnee pour cet exercice</p>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {data.map((accountGroup: any) => {
 const lines: any[] = accountGroup.lines || [];
 return (
 <div key={accountGroup.account?.id} className="bg-white  overflow-hidden">
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
 {lines.length} écriture{lines.length !== 1 ? 's' : ''}
 </span>
 </div>

 {/* Lines table */}
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <th className="px-6 py-2">Date</th>
 <th className="px-6 py-2">N° Pièce</th>
 <th className="px-6 py-2">Libellé</th>
 <th className="px-6 py-2">Référence</th>
 <th className="px-6 py-2 text-right">Débit</th>
 <th className="px-6 py-2 text-right">Crédit</th>
 <th className="px-6 py-2 text-right">Solde</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {lines.map((line: any, idx: number) => {
 const balance = line.runningBalance;
 return (
 <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-sm">
 <td className="px-6 py-2.5 text-gray-500 text-xs whitespace-nowrap">
 {formatDate(line.date)}
 </td>
 <td className="px-6 py-2.5 font-mono text-xs text-[#283852]">
 {line.entryNumber || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-700">
 {line.label || line.description || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-400 text-xs">
 {line.reference || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {line.debit > 0 ? formatXAF(line.debit) : ''}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {line.credit > 0 ? formatXAF(line.credit) : ''}
 </td>
 <td className={`px-6 py-2.5 text-right font-bold ${balance >= 0 ? 'text-[#33cbcc]' : 'text-[#283852]'}`}>
 {formatXAF(Math.abs(balance))}
 {balance < 0 && <span className="text-xs ml-1">(Cr)</span>}
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200 text-sm">
 <td colSpan={4} className="px-6 py-2.5 font-bold text-gray-700">Total</td>
 <td className="px-6 py-2.5 text-right font-bold text-gray-800">{formatXAF(accountGroup.totalDebit)}</td>
 <td className="px-6 py-2.5 text-right font-bold text-gray-800">{formatXAF(accountGroup.totalCredit)}</td>
 <td className={`px-6 py-2.5 text-right font-bold ${accountGroup.balance >= 0 ? 'text-[#33cbcc]' : 'text-[#283852]'}`}>
 {formatXAF(Math.abs(accountGroup.balance))}
 {accountGroup.balance < 0 && <span className="text-xs ml-1">(Cr)</span>}
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 );
 })}
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Balance à 6 colonnes SYSCOHADA Tab */
/* ------------------------------------------------------------------ */

const EquilibriumBadge = ({ ok, label }: { ok: boolean; label: string }) => (
 <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${ok ? 'text-[#33cbcc] bg-[#33cbcc]/10' : 'text-red-500 bg-red-50'}`}>
 {ok ? <Tick01Icon size={10} /> : <Alert02Icon size={10} />}
 {label}
 </span>
);

const AuxiliaryDrillDown = ({ fiscalYearId, accountId, accountName, onClose }: { fiscalYearId: string; accountId: string; accountName: string; onClose: () => void }) => {
 const { data, isLoading } = useQuery<any>({
 queryKey: ['accounting', 'reports', 'auxiliary-balance', fiscalYearId, accountId],
 queryFn: () => getAuxiliaryBalance(fiscalYearId, accountId),
 enabled: !!fiscalYearId && !!accountId,
 });

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
 <div className="bg-white w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden shadow-xl">
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
 <div>
 <h3 className="text-sm font-bold text-gray-800">Auxiliaires — {accountName}</h3>
 {data && (
 <span className={`text-xs ${data.concordant ? 'text-[#33cbcc]' : 'text-red-500'}`}>
 {data.concordant ? '✓ Concordant' : '⚠ Écart collectif/auxiliaires'}
 </span>
 )}
 </div>
 <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg font-bold">×</button>
 </div>
 <div className="overflow-y-auto flex-1 p-6">
 {isLoading ? (
 <div className="flex justify-center py-8"><Loading02Icon size={20} className="animate-spin text-[#33cbcc]" /></div>
 ) : !data || data.auxiliaries.length === 0 ? (
 <p className="text-center text-gray-400 py-8">Aucun auxiliaire enregistré pour ce compte</p>
 ) : (
 <table className="w-full text-left text-sm">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase border-b border-gray-100">
 <th className="py-2 pr-4">Code</th>
 <th className="py-2 pr-4">Tiers</th>
 <th className="py-2 text-right pr-4">Débit</th>
 <th className="py-2 text-right pr-4">Crédit</th>
 <th className="py-2 text-right">Solde</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {data.auxiliaries.map((aux: any) => (
 <tr key={aux.auxiliaryAccountId} className="hover:bg-gray-50">
 <td className="py-2 pr-4 font-mono text-xs text-[#33cbcc]">{aux.code}</td>
 <td className="py-2 pr-4 text-gray-700">{aux.name}</td>
 <td className="py-2 pr-4 text-right">{aux.totalDebit > 0 ? formatXAF(aux.totalDebit) : ''}</td>
 <td className="py-2 pr-4 text-right">{aux.totalCredit > 0 ? formatXAF(aux.totalCredit) : ''}</td>
 <td className={`py-2 text-right font-bold ${aux.balance >= 0 ? 'text-[#33cbcc]' : 'text-[#283852]'}`}>
 {formatXAF(Math.abs(aux.balance))}{aux.balance < 0 ? ' Cr' : ''}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 );
};

const BalanceTab = ({ fiscalYearId, departmentId }: { fiscalYearId: string; departmentId?: string }) => {
 const [drillDown, setDrillDown] = useState<{ id: string; name: string } | null>(null);
 const { data, isLoading } = useQuery<any>({
 queryKey: ['accounting', 'reports', 'six-column-balance', fiscalYearId, departmentId],
 queryFn: () => getSixColumnBalance(fiscalYearId, undefined, undefined, departmentId),
 enabled: !!fiscalYearId,
 });

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data || !data.accounts || data.accounts.length === 0) {
 return (
 <div className="text-center py-16">
 <JusticeScale01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune donnée pour cet exercice</p>
 </div>
 );
 }

 const { totals, equilibrium } = data;

 return (
 <div className="bg-white overflow-hidden">
 {drillDown && (
 <AuxiliaryDrillDown
 fiscalYearId={fiscalYearId}
 accountId={drillDown.id}
 accountName={drillDown.name}
 onClose={() => setDrillDown(null)}
 />
 )}

 {/* Header: 3 equilibrium checks */}
 <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
 <h3 className="text-sm font-bold text-gray-800">Balance à 6 colonnes — SYSCOHADA</h3>
 <div className="flex gap-2 flex-wrap">
 <EquilibriumBadge ok={equilibrium.openingBalanced} label="Soldes ouverture" />
 <EquilibriumBadge ok={equilibrium.movementsBalanced} label="Mouvements" />
 <EquilibriumBadge ok={equilibrium.closingBalanced} label="Soldes clôture" />
 </div>
 </div>

 <div className="overflow-x-auto">
 <table className="w-full text-left min-w-[900px]">
 <thead>
 <tr className="bg-gray-50 border-b border-gray-100">
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase" rowSpan={2}>Code</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase" rowSpan={2}>Libellé</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase text-center border-l border-gray-200" colSpan={2}>Soldes d'Ouverture</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase text-center border-l border-gray-200" colSpan={2}>Mouvements</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase text-center border-l border-gray-200" colSpan={2}>Soldes de Clôture</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase text-center border-l border-gray-200" rowSpan={2}></th>
 </tr>
 <tr className="bg-gray-50 border-b-2 border-gray-200">
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase text-right border-l border-gray-200">Débit</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Crédit</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase text-right border-l border-gray-200">Débit</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase text-right">Crédit</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-[#33cbcc] uppercase text-right border-l border-gray-200">Débit</th>
 <th className="px-3 py-2 text-[10px] font-semibold text-[#283852] uppercase text-right">Crédit</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {data.accounts.map((row: any, idx: number) => {
 const isCollective = row.account?.isCollective;
 return (
 <tr key={idx} className={`hover:bg-gray-50/50 transition-colors text-sm ${isCollective ? 'font-semibold bg-gray-50/30' : ''}`}>
 <td className="px-3 py-2 font-mono text-xs text-[#33cbcc] whitespace-nowrap">{row.account?.code}</td>
 <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{row.account?.name}</td>
 <td className="px-3 py-2 text-right text-gray-600 border-l border-gray-100">{row.siDebit > 0 ? formatXAF(row.siDebit) : ''}</td>
 <td className="px-3 py-2 text-right text-gray-600">{row.siCredit > 0 ? formatXAF(row.siCredit) : ''}</td>
 <td className="px-3 py-2 text-right text-gray-800 border-l border-gray-100">{row.mvtDebit > 0 ? formatXAF(row.mvtDebit) : ''}</td>
 <td className="px-3 py-2 text-right text-gray-800">{row.mvtCredit > 0 ? formatXAF(row.mvtCredit) : ''}</td>
 <td className="px-3 py-2 text-right font-bold text-[#33cbcc] border-l border-gray-100">{row.sfDebit > 0 ? formatXAF(row.sfDebit) : ''}</td>
 <td className="px-3 py-2 text-right font-bold text-[#283852]">{row.sfCredit > 0 ? formatXAF(row.sfCredit) : ''}</td>
 <td className="px-3 py-2 text-center border-l border-gray-100">
 {isCollective && (
 <button
 onClick={() => setDrillDown({ id: row.account.id, name: row.account.name })}
 className="text-[#33cbcc] hover:text-[#283852] transition-colors"
 title="Voir les auxiliaires"
 >
 <ArrowRight01Icon size={14} />
 </button>
 )}
 </td>
 </tr>
 );
 })}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
 <td className="px-3 py-3 text-gray-800" colSpan={2}>TOTAUX</td>
 <td className="px-3 py-3 text-right text-gray-800 border-l border-gray-200">{formatXAF(totals.siDebit)}</td>
 <td className="px-3 py-3 text-right text-gray-800">{formatXAF(totals.siCredit)}</td>
 <td className="px-3 py-3 text-right text-gray-800 border-l border-gray-200">{formatXAF(totals.mvtDebit)}</td>
 <td className="px-3 py-3 text-right text-gray-800">{formatXAF(totals.mvtCredit)}</td>
 <td className="px-3 py-3 text-right text-[#33cbcc] border-l border-gray-200">{formatXAF(totals.sfDebit)}</td>
 <td className="px-3 py-3 text-right text-[#283852]">{formatXAF(totals.sfCredit)}</td>
 <td></td>
 </tr>
 </tfoot>
 </table>
 </div>
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
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-16">
 <PieChartIcon size={48} className="mx-auto text-gray-300 mb-4"/>
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
 <div className="bg-white  overflow-hidden">
 <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50">
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
 {item.account?.code || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-700">
 {item.account?.name || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {formatXAF(item.amount || 0)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200">
 <td className="px-6 py-3 font-bold text-gray-800" colSpan={2}>
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
 <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-4 py-2 rounded-full">
 <Tick01Icon size={16} />
 Bilan équilibré
 </span>
 ) : (
 <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#283852] bg-[#283852]/10 px-4 py-2 rounded-full">
 <Alert02Icon size={16} />
 Bilan déséquilibré — écart : {formatXAF(Math.abs(data.totalAssets - data.totalLiabilities))}
 </span>
 )}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <SideTable title="Actif" items={data.assets || []} total={data.totalAssets} color="blue"/>
 <SideTable
 title="Passif & Capitaux propres"
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
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 if (!data) {
 return (
 <div className="text-center py-16">
 <ArrowUpRight01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
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
 <div className="bg-white  overflow-hidden">
 <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
 <Icon size={16} className="text-[#33cbcc]" />
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
 {item.account?.code || '--'}
 </td>
 <td className="px-6 py-2.5 text-gray-700">
 {item.account?.name || '--'}
 </td>
 <td className="px-6 py-2.5 text-right font-medium text-gray-800">
 {formatXAF(item.amount || 0)}
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200">
 <td className="px-6 py-3 font-bold text-gray-800" colSpan={2}>
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
 icon={ArrowUp01Icon}
 color="emerald"
 />

 <SectionTable
 title="Charges (Depenses)"
 items={data.expenses || []}
 total={data.totalExpenses}
 icon={ArrowDown01Icon}
 color="red"
 />

 {/* Net Income */}
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className={` p-6 ${
 isPositive ? 'bg-[#33cbcc]/10 border-2 border-gray-200' : 'bg-[#283852]/10 border-2 border-gray-200'
 }`}
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div
 className={`w-12 h-12  flex items-center justify-center ${
 isPositive ? 'bg-[#33cbcc]/20' : 'bg-[#283852]/20'
 }`}
 >
 {isPositive ? (
 <ArrowUp01Icon size={24} className="text-[#33cbcc]"/>
 ) : (
 <ArrowDown01Icon size={24} className="text-[#283852]"/>
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
 className={`text-2xl font-bold ${isPositive ? 'text-[#33cbcc]' : 'text-[#283852]'}`}
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
 const [selectedDeptId, setSelectedDeptId] = useState('');

 const { data: fiscalYears, isLoading: fyLoading } = useFiscalYears();
 const { data: departments = [] } = useDepartments();

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
 <h1 className="text-2xl font-bold text-gray-800">Rapports Comptables</h1>
 <p className="text-sm text-gray-500 mt-1">
 Etats financiers et rapports de l'exercice
 </p>
 </div>

 {/* Fiscal Year + Department Selector */}
 <div className="bg-white  p-4 flex items-center gap-6 flex-wrap">
 <div className="flex items-center gap-2">
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
 </div>
 <div className="flex items-center gap-2">
 <span className="text-sm font-semibold text-gray-600">Departement</span>
 <select
 value={selectedDeptId}
 onChange={(e) => setSelectedDeptId(e.target.value)}
 className="bg-gray-50  border-0 px-4 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 appearance-none cursor-pointer"
 >
 <option value="">Tous les departements</option>
 {(departments as any[]).map((d: any) => (
 <option key={d.id} value={d.id}>{d.name}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Tab sections */}
 <div className="flex gap-4">
  {/* Rapports section */}
  <div className="flex-1 bg-white  p-3">
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Rapports</p>
  <div className="flex gap-1">
  {SECTION_RAPPORTS.map((tab) => {
  const isActive = activeTab === tab.key;
  const Icon = tab.icon;
  return (
  <button
  key={tab.key}
  onClick={() => setActiveTab(tab.key)}
  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5  text-sm font-semibold transition-colors ${
  isActive ? 'bg-[#33cbcc] text-white' : 'text-gray-500 hover:bg-gray-50'
  }`}
  >
  <Icon size={16} />
  {tab.label}
  </button>
  );
  })}
  </div>
  </div>

  {/* Etats section */}
  <div className="flex-1 bg-white  p-3">
  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Etats financiers</p>
  <div className="flex gap-1">
  {SECTION_ETATS.map((tab) => {
  const isActive = activeTab === tab.key;
  const Icon = tab.icon;
  return (
  <button
  key={tab.key}
  onClick={() => setActiveTab(tab.key)}
  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5  text-sm font-semibold transition-colors ${
  isActive ? 'bg-[#283852] text-white' : 'text-gray-500 hover:bg-gray-50'
  }`}
  >
  <Icon size={16} />
  {tab.label}
  </button>
  );
  })}
  </div>
  </div>
 </div>

 {/* Tab Content */}
 {selectedFiscalYearId ? (
 <motion.div
 key={activeTab + selectedFiscalYearId}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.2 }}
 >
 {activeTab === 'grand-livre' && <GrandLivreTab fiscalYearId={selectedFiscalYearId} departmentId={selectedDeptId || undefined} />}
 {activeTab === 'balance' && <BalanceTab fiscalYearId={selectedFiscalYearId} departmentId={selectedDeptId || undefined} />}
 {activeTab === 'bilan' && <BilanTab fiscalYearId={selectedFiscalYearId} />}
 {activeTab === 'resultat' && <ResultatTab fiscalYearId={selectedFiscalYearId} />}
 </motion.div>
 ) : (
 <div className="bg-white  p-12 text-center">
 <Calendar01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">
 Selectionnez un exercice fiscal pour afficher les rapports
 </p>
 </div>
 )}
 </div>
 );
}
