import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Add01Icon, Cancel01Icon, Loading02Icon, Calendar01Icon,
 LockPasswordIcon, CircleUnlock01Icon, Tick01Icon,
 ArrowDown01Icon, ArrowUp01Icon, Settings01Icon,
 Delete02Icon,
} from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
 getFiscalYears,
 createFiscalYear,
 closeFiscalYear,
 reopenFiscalYear,
 updateFiscalYearTaxConfig,
 getFiscalYearOpeningBalances,
 importFiscalYearOpeningBalances,
 getAccounts,
} from '../../api/accounting/api';
import type { FiscalYear } from '../../api/accounting/types';

/* ------------------------------------------------------------------ */
/* Helpers */
/* ------------------------------------------------------------------ */

const formatDate = (dateStr: string | null | undefined) => {
 if (!dateStr) return '--';
 return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtNum = (n: number) =>
 n === 0 ? '0' : n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';
const numInputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-3 py-2 text-sm text-right text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';

/* ------------------------------------------------------------------ */
/* Shared constants */
/* ------------------------------------------------------------------ */

const DEFAULT_RATES = {
 pvidEmployeeRate: 0.042,
 pvidEmployerRate: 0.042,
 pvidMonthlyCap: 31500,
 pfEmployerRate: 0.07,
 cnpsCeiling: 750000,
 atmpClass1: 0.0175,
 atmpClass2: 0.025,
 atmpClass3: 0.05,
 cfcEmployeeRate: 0.01,
 cfcEmployerRate: 0.015,
 fneEmployerRate: 0.01,
 irppAbattementRate: 0.30,
 irppAbattementAnnualCap: 4800000,
 irppFixedAbattementAnnual: 500000,
 cacRate: 0.10,
};

type RatesState = typeof DEFAULT_RATES;

const ratesFromTaxConfig = (tc: Record<string, any> | undefined): RatesState => ({
 pvidEmployeeRate:         tc?.pvidEmployeeRate         ?? DEFAULT_RATES.pvidEmployeeRate,
 pvidEmployerRate:         tc?.pvidEmployerRate         ?? DEFAULT_RATES.pvidEmployerRate,
 pvidMonthlyCap:           tc?.pvidMonthlyCap           ?? DEFAULT_RATES.pvidMonthlyCap,
 pfEmployerRate:           tc?.pfEmployerRate           ?? DEFAULT_RATES.pfEmployerRate,
 cnpsCeiling:              tc?.cnpsCeiling              ?? DEFAULT_RATES.cnpsCeiling,
 atmpClass1:               tc?.atmpRates?.[1]           ?? DEFAULT_RATES.atmpClass1,
 atmpClass2:               tc?.atmpRates?.[2]           ?? DEFAULT_RATES.atmpClass2,
 atmpClass3:               tc?.atmpRates?.[3]           ?? DEFAULT_RATES.atmpClass3,
 cfcEmployeeRate:          tc?.cfcEmployeeRate          ?? DEFAULT_RATES.cfcEmployeeRate,
 cfcEmployerRate:          tc?.cfcEmployerRate          ?? DEFAULT_RATES.cfcEmployerRate,
 fneEmployerRate:          tc?.fneEmployerRate          ?? DEFAULT_RATES.fneEmployerRate,
 irppAbattementRate:       tc?.irppAbattementRate       ?? DEFAULT_RATES.irppAbattementRate,
 irppAbattementAnnualCap:  tc?.irppAbattementAnnualCap  ?? DEFAULT_RATES.irppAbattementAnnualCap,
 irppFixedAbattementAnnual:tc?.irppFixedAbattementAnnual?? DEFAULT_RATES.irppFixedAbattementAnnual,
 cacRate:                  tc?.cacRate                  ?? DEFAULT_RATES.cacRate,
});

/* ------------------------------------------------------------------ */
/* RateField */
/* ------------------------------------------------------------------ */

const RateField = ({
 label, hint, value, onChange, isPercent = true,
}: { label: string; hint?: string; value: number; onChange: (v: number) => void; isPercent?: boolean }) => (
 <div>
  <label className={labelCls}>{label}{hint && <span className="text-[9px] normal-case text-gray-400 ml-1">({hint})</span>}</label>
  <div className="relative">
   <input
    type="number"
    step={isPercent ? '0.001' : '1'}
    min="0"
    value={isPercent ? (value * 100).toFixed(3).replace(/\.?0+$/, '') : value}
    onChange={(e) => onChange(isPercent ? parseFloat(e.target.value) / 100 : parseFloat(e.target.value))}
    className={inputCls + ' pr-10'}
   />
   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
    {isPercent ? '%' : 'XAF'}
   </span>
  </div>
 </div>
);

/* ------------------------------------------------------------------ */
/* TaxRatesForm — shared between create modal and detail modal */
/* ------------------------------------------------------------------ */

const TaxRatesForm = ({ rates, setRates }: { rates: RatesState; setRates: (r: RatesState) => void }) => {
 const setRate = (key: keyof RatesState) => (v: number) => setRates({ ...rates, [key]: v });
 return (
  <div className="space-y-4">
   <p className="text-[11px] text-[#8892a4]">
    Les taux ci-dessous seront utilisés pour tous les calculs de paie de cet exercice. Les valeurs par défaut correspondent à la Loi de Finances 2026.
   </p>
   {/* CNPS */}
   <div>
    <p className="text-[10px] font-bold text-[#33cbcc] uppercase tracking-wider mb-2">CNPS — Cotisations sociales</p>
    <div className="grid grid-cols-2 gap-3">
     <RateField label="PVID Salarial" hint="employé" value={rates.pvidEmployeeRate} onChange={setRate('pvidEmployeeRate')} />
     <RateField label="PVID Patronal" hint="employeur" value={rates.pvidEmployerRate} onChange={setRate('pvidEmployerRate')} />
     <RateField label="Prestations Familiales" hint="patronal" value={rates.pfEmployerRate} onChange={setRate('pfEmployerRate')} />
     <RateField label="Plafond PVID mensuel" isPercent={false} value={rates.pvidMonthlyCap} onChange={setRate('pvidMonthlyCap')} />
     <RateField label="Plafond cotisable CNPS" isPercent={false} value={rates.cnpsCeiling} onChange={setRate('cnpsCeiling')} />
    </div>
   </div>
   {/* AT/MP */}
   <div>
    <p className="text-[10px] font-bold text-[#33cbcc] uppercase tracking-wider mb-2">AT/MP — Accidents du Travail (patronal)</p>
    <div className="grid grid-cols-3 gap-3">
     <RateField label="Classe 1 (faible)" value={rates.atmpClass1} onChange={setRate('atmpClass1')} />
     <RateField label="Classe 2 (moyen)" value={rates.atmpClass2} onChange={setRate('atmpClass2')} />
     <RateField label="Classe 3 (élevé)" value={rates.atmpClass3} onChange={setRate('atmpClass3')} />
    </div>
   </div>
   {/* CFC & FNE */}
   <div>
    <p className="text-[10px] font-bold text-[#33cbcc] uppercase tracking-wider mb-2">CFC & FNE</p>
    <div className="grid grid-cols-3 gap-3">
     <RateField label="CFC Salarial" hint="employé" value={rates.cfcEmployeeRate} onChange={setRate('cfcEmployeeRate')} />
     <RateField label="CFC Patronal" hint="employeur" value={rates.cfcEmployerRate} onChange={setRate('cfcEmployerRate')} />
     <RateField label="FNE" hint="patronal" value={rates.fneEmployerRate} onChange={setRate('fneEmployerRate')} />
    </div>
   </div>
   {/* IRPP */}
   <div>
    <p className="text-[10px] font-bold text-[#33cbcc] uppercase tracking-wider mb-2">IRPP & Fiscalité</p>
    <div className="grid grid-cols-2 gap-3">
     <RateField label="Abattement frais pro" value={rates.irppAbattementRate} onChange={setRate('irppAbattementRate')} />
     <RateField label="Plafond abattement/an" isPercent={false} value={rates.irppAbattementAnnualCap} onChange={setRate('irppAbattementAnnualCap')} />
     <RateField label="Abattement forfaitaire/an" isPercent={false} value={rates.irppFixedAbattementAnnual} onChange={setRate('irppFixedAbattementAnnual')} />
     <RateField label="CAC (sur IRPP)" value={rates.cacRate} onChange={setRate('cacRate')} />
    </div>
   </div>
   <button type="button" onClick={() => setRates({ ...DEFAULT_RATES })} className="text-xs text-[#8892a4] hover:text-[#283852] transition-colors underline">
    Réinitialiser aux valeurs 2026
   </button>
  </div>
 );
};

/* ------------------------------------------------------------------ */
/* Fiscal Year Detail Modal */
/* ------------------------------------------------------------------ */

type BalanceRow = { _id: number; accountCode: string; accountName: string; debit: number; credit: number };

const FiscalYearDetailModal = ({ fy, onClose }: { fy: FiscalYear; onClose: () => void }) => {
 const qc = useQueryClient();
 const [tab, setTab] = useState<'balances' | 'taxes'>('balances');
 const [rates, setRates] = useState<RatesState>(ratesFromTaxConfig(fy.taxConfig));
 const [rows, setRows] = useState<BalanceRow[]>([]);
 const [search, setSearch] = useState('');
 const nextId = useRef(0);

 useEffect(() => {
  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handleKey);
  document.body.style.overflow = 'hidden';
  return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
 }, [onClose]);

 // Fetch accounts for the account selector
 const { data: allAccounts = [] } = useQuery<any[]>({
  queryKey: ['accounts'],
  queryFn: getAccounts,
 });

 // Fetch existing opening balances
 const { data: existingBalances, isLoading: loadingBalances } = useQuery<any[]>({
  queryKey: ['opening-balances', fy.id],
  queryFn: () => getFiscalYearOpeningBalances(fy.id),
 });

 useEffect(() => {
  if (existingBalances && existingBalances.length > 0) {
   setRows(existingBalances.map(b => ({
    _id: nextId.current++,
    accountCode: b.accountCode,
    accountName: b.accountName,
    debit: b.debit,
    credit: b.credit,
   })));
  }
 }, [existingBalances]);

 // Filter accounts for dropdown (balance sheet: classes 1-5 = ASSET/LIABILITY/EQUITY, or all)
 const accountOptions = allAccounts.filter(a => {
  const code = String(a.code || '');
  const inBilan = ['1','2','3','4','5'].includes(code[0]);
  if (!inBilan) return false;
  if (!search) return true;
  return code.startsWith(search) || (a.name || '').toLowerCase().includes(search.toLowerCase());
 });

 const addRow = () => {
  setRows(prev => [...prev, { _id: nextId.current++, accountCode: '', accountName: '', debit: 0, credit: 0 }]);
 };

 const removeRow = (id: number) => setRows(prev => prev.filter(r => r._id !== id));

 const updateRow = (id: number, field: Partial<BalanceRow>) => {
  setRows(prev => prev.map(r => r._id === id ? { ...r, ...field } : r));
 };

 const handleAccountSelect = (id: number, code: string) => {
  const acc = allAccounts.find(a => a.code === code);
  updateRow(id, { accountCode: code, accountName: acc?.name || '' });
 };

 const totalDebit  = rows.reduce((s, r) => s + (Number(r.debit)  || 0), 0);
 const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
 const isBalanced  = Math.abs(totalDebit - totalCredit) < 1;

 // Mutations
 const saveBalances = useMutation({
  mutationFn: () => {
   const valid = rows.filter(r => r.accountCode && (r.debit > 0 || r.credit > 0));
   return importFiscalYearOpeningBalances(fy.id, valid.map(r => ({
    accountCode: r.accountCode,
    debit: Number(r.debit) || 0,
    credit: Number(r.credit) || 0,
   })));
  },
  onSuccess: () => {
   toast.success('Soldes d\'ouverture enregistrés');
   qc.invalidateQueries({ queryKey: ['opening-balances', fy.id] });
   qc.invalidateQueries({ queryKey: ['six-column-balance'] });
  },
  onError: () => toast.error('Erreur lors de l\'enregistrement'),
 });

 const saveTaxConfig = useMutation({
  mutationFn: () => {
   const taxConfig = {
    pvidEmployeeRate:          rates.pvidEmployeeRate,
    pvidEmployerRate:          rates.pvidEmployerRate,
    pvidMonthlyCap:            rates.pvidMonthlyCap,
    pfEmployerRate:            rates.pfEmployerRate,
    cnpsCeiling:               rates.cnpsCeiling,
    atmpRates:                 { 1: rates.atmpClass1, 2: rates.atmpClass2, 3: rates.atmpClass3 },
    cfcEmployeeRate:           rates.cfcEmployeeRate,
    cfcEmployerRate:           rates.cfcEmployerRate,
    fneEmployerRate:           rates.fneEmployerRate,
    irppAbattementRate:        rates.irppAbattementRate,
    irppAbattementAnnualCap:   rates.irppAbattementAnnualCap,
    irppFixedAbattementAnnual: rates.irppFixedAbattementAnnual,
    cacRate:                   rates.cacRate,
   };
   return updateFiscalYearTaxConfig(fy.id, taxConfig);
  },
  onSuccess: () => {
   toast.success('Taux mis à jour');
   qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
  },
  onError: () => toast.error('Erreur lors de la mise à jour'),
 });

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   onClick={onClose}
   className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
   <motion.div
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    onClick={e => e.stopPropagation()}
    className="bg-white w-full max-w-2xl h-full flex flex-col border-l border-[#e5e8ef]"
   >
    {/* Header */}
    <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#33cbcc]/10 flex items-center justify-center">
       <Settings01Icon size={20} className="text-[#33cbcc]" />
      </div>
      <div>
       <h2 className="text-lg font-bold text-[#1c2b3a]">{fy.name}</h2>
       <p className="text-xs text-[#8892a4]">{formatDate(fy.startDate)} — {formatDate(fy.endDate)}</p>
      </div>
     </div>
     <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
      <Cancel01Icon size={18} />
     </button>
    </div>

    {/* Tabs */}
    <div className="flex border-b border-[#e5e8ef] shrink-0">
     {([['balances', 'Soldes d\'ouverture'], ['taxes', 'Taux & Cotisations']] as const).map(([key, label]) => (
      <button
       key={key}
       onClick={() => setTab(key)}
       className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
        tab === key
         ? 'border-[#33cbcc] text-[#33cbcc]'
         : 'border-transparent text-[#8892a4] hover:text-[#283852]'
       }`}
      >
       {label}
      </button>
     ))}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-6">

     {/* ── TAB: Soldes d'ouverture ── */}
     {tab === 'balances' && (
      <div className="space-y-4">
       <div className="bg-[#f8f9fc] border border-[#e5e8ef] p-4 text-sm text-[#8892a4]">
        Saisissez les soldes de début d'exercice pour les comptes de bilan (classes 1–5).
        Ces soldes apparaîtront dans la colonne <strong className="text-[#283852]">Solde d'ouverture (SI)</strong> de la balance à 6 colonnes.
       </div>

       {/* Account search */}
       <div>
        <label className={labelCls}>Filtrer les comptes</label>
        <input
         type="text"
         placeholder="Rechercher par code ou libellé..."
         value={search}
         onChange={e => setSearch(e.target.value)}
         className={inputCls}
        />
       </div>

       {/* Rows */}
       {loadingBalances ? (
        <div className="flex items-center gap-2 text-sm text-[#8892a4]">
         <Loading02Icon size={16} className="animate-spin" /> Chargement...
        </div>
       ) : (
        <div className="space-y-2">
         {/* Header */}
         <div className="grid grid-cols-[1fr_130px_130px_36px] gap-2 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider px-1">
          <span>Compte</span>
          <span className="text-right">Débit (XAF)</span>
          <span className="text-right">Crédit (XAF)</span>
          <span />
         </div>

         {rows.map(row => (
          <div key={row._id} className="grid grid-cols-[1fr_130px_130px_36px] gap-2 items-center">
           {/* Account selector */}
           <select
            value={row.accountCode}
            onChange={e => handleAccountSelect(row._id, e.target.value)}
            className="bg-[#f8f9fc] border border-[#e5e8ef] px-3 py-2 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
           >
            <option value="">-- Choisir un compte --</option>
            {accountOptions.map(a => (
             <option key={a.id} value={a.code}>{a.code} — {a.name}</option>
            ))}
            {/* Keep selected if not in filtered list */}
            {row.accountCode && !accountOptions.find(a => a.code === row.accountCode) && (
             <option value={row.accountCode}>{row.accountCode} — {row.accountName}</option>
            )}
           </select>
           <input
            type="number" min="0" step="1"
            value={row.debit || ''}
            onChange={e => updateRow(row._id, { debit: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className={numInputCls}
           />
           <input
            type="number" min="0" step="1"
            value={row.credit || ''}
            onChange={e => updateRow(row._id, { credit: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            className={numInputCls}
           />
           <button
            onClick={() => removeRow(row._id)}
            className="w-9 h-9 flex items-center justify-center text-[#b0bac9] hover:text-red-500 hover:bg-red-50 transition-colors"
           >
            <Delete02Icon size={16} />
           </button>
          </div>
         ))}

         <button
          onClick={addRow}
          className="flex items-center gap-2 text-sm text-[#33cbcc] hover:text-[#2bb5b6] font-semibold py-2 transition-colors"
         >
          <Add01Icon size={14} /> Ajouter un compte
         </button>
        </div>
       )}

       {/* Totals */}
       {rows.length > 0 && (
        <div className={`border p-4 space-y-2 ${isBalanced ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
         <div className="flex justify-between text-sm">
          <span className="font-semibold text-[#283852]">Total Débit</span>
          <span className="font-mono font-bold text-[#1c2b3a]">{fmtNum(totalDebit)} XAF</span>
         </div>
         <div className="flex justify-between text-sm">
          <span className="font-semibold text-[#283852]">Total Crédit</span>
          <span className="font-mono font-bold text-[#1c2b3a]">{fmtNum(totalCredit)} XAF</span>
         </div>
         <div className={`text-xs font-semibold pt-1 border-t ${isBalanced ? 'border-green-200 text-green-700' : 'border-amber-200 text-amber-700'}`}>
          {isBalanced ? '✓ Balance équilibrée' : `⚠ Écart : ${fmtNum(Math.abs(totalDebit - totalCredit))} XAF`}
         </div>
        </div>
       )}
      </div>
     )}

     {/* ── TAB: Taux & Cotisations ── */}
     {tab === 'taxes' && (
      <TaxRatesForm rates={rates} setRates={setRates} />
     )}
    </div>

    {/* Footer */}
    <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
     <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
      Fermer
     </button>
     {tab === 'balances' && (
      <button
       onClick={() => saveBalances.mutate()}
       disabled={saveBalances.isPending}
       className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
      >
       {saveBalances.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Tick01Icon size={16} />}
       Enregistrer les soldes
      </button>
     )}
     {tab === 'taxes' && (
      <button
       onClick={() => saveTaxConfig.mutate()}
       disabled={saveTaxConfig.isPending}
       className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
      >
       {saveTaxConfig.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Tick01Icon size={16} />}
       Enregistrer les taux
      </button>
     )}
    </div>
   </motion.div>
  </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Create Modal */
/* ------------------------------------------------------------------ */

const CreateFiscalYearModal = ({ onClose }: { onClose: () => void }) => {
 const qc = useQueryClient();
 const createMut = useMutation({
  mutationFn: (data: any) => createFiscalYear(data),
  onSuccess: () => { toast.success('Exercice fiscal créé avec succès'); qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] }); },
  onError: () => toast.error('Erreur lors de la création'),
 });

 const currentYear = new Date().getFullYear();
 const [showRates, setShowRates] = useState(false);
 const [form, setForm] = useState({ name: `Exercice ${currentYear}`, startDate: `${currentYear}-01-01`, endDate: `${currentYear}-12-31` });
 const [rates, setRates] = useState<RatesState>({ ...DEFAULT_RATES });

 useEffect(() => {
  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handleKey);
  document.body.style.overflow = 'hidden';
  return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
 }, [onClose]);

 const isValid = form.name.trim() && form.startDate && form.endDate && form.startDate < form.endDate;

 const handleSubmit = () => {
  if (!isValid || createMut.isPending) return;
  const taxConfig = {
   pvidEmployeeRate:          rates.pvidEmployeeRate,
   pvidEmployerRate:          rates.pvidEmployerRate,
   pvidMonthlyCap:            rates.pvidMonthlyCap,
   pfEmployerRate:            rates.pfEmployerRate,
   cnpsCeiling:               rates.cnpsCeiling,
   atmpRates:                 { 1: rates.atmpClass1, 2: rates.atmpClass2, 3: rates.atmpClass3 },
   cfcEmployeeRate:           rates.cfcEmployeeRate,
   cfcEmployerRate:           rates.cfcEmployerRate,
   fneEmployerRate:           rates.fneEmployerRate,
   irppAbattementRate:        rates.irppAbattementRate,
   irppAbattementAnnualCap:   rates.irppAbattementAnnualCap,
   irppFixedAbattementAnnual: rates.irppFixedAbattementAnnual,
   cacRate:                   rates.cacRate,
  };
  createMut.mutate({ name: form.name.trim(), startDate: form.startDate, endDate: form.endDate, taxConfig }, { onSuccess: onClose });
 };

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   onClick={onClose}
   className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
   <motion.div
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    onClick={e => e.stopPropagation()}
    className="bg-white w-full max-w-lg h-full flex flex-col border-l border-[#e5e8ef]"
   >
    <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#33cbcc]/10 flex items-center justify-center">
       <Calendar01Icon size={20} className="text-[#33cbcc]" />
      </div>
      <h2 className="text-lg font-bold text-[#1c2b3a]">Nouvel exercice fiscal</h2>
     </div>
     <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
      <Cancel01Icon size={18} />
     </button>
    </div>

    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
     <div>
      <label className={labelCls}>Nom de l'exercice</label>
      <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Exercice 2026" className={inputCls} />
     </div>
     <div className="grid grid-cols-2 gap-4">
      <div>
       <label className={labelCls}><Calendar01Icon size={12} />Date de début</label>
       <input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className={inputCls} />
      </div>
      <div>
       <label className={labelCls}><Calendar01Icon size={12} />Date de fin</label>
       <input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className={inputCls} />
      </div>
     </div>

     {/* Collapsible rates */}
     <div className="border border-[#e5e8ef]">
      <button
       type="button"
       onClick={() => setShowRates(v => !v)}
       className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[#283852] hover:bg-[#f8f9fc] transition-colors"
      >
       <span>Taux & Cotisations (Cameroun 2026)</span>
       {showRates ? <ArrowUp01Icon size={16} className="text-[#8892a4]" /> : <ArrowDown01Icon size={16} className="text-[#8892a4]" />}
      </button>
      <AnimatePresence>
       {showRates && (
        <motion.div
         initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
         transition={{ duration: 0.18 }}
         className="overflow-hidden"
        >
         <div className="px-4 pb-4 border-t border-[#e5e8ef] pt-4">
          <TaxRatesForm rates={rates} setRates={setRates} />
         </div>
        </motion.div>
       )}
      </AnimatePresence>
     </div>
    </div>

    <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
     <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
      Annuler
     </button>
     <button
      disabled={!isValid || createMut.isPending}
      onClick={handleSubmit}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${isValid && !createMut.isPending ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed'}`}
     >
      {createMut.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
      Créer
     </button>
    </div>
   </motion.div>
  </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Confirm Modal */
/* ------------------------------------------------------------------ */

const ConfirmModal = ({
 title, message, icon: Icon, iconBg, iconColor, confirmLabel, confirmColor, onClose, onConfirm, isPending,
}: {
 title: string; message: string; icon: any; iconBg: string; iconColor: string;
 confirmLabel: string; confirmColor: string; onClose: () => void; onConfirm: () => void; isPending: boolean;
}) => {
 useEffect(() => {
  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
 }, [onClose]);

 return (
  <motion.div
   initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
   onClick={onClose}
   className="fixed inset-0 z-60 flex justify-end bg-black/30"
  >
   <motion.div
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    onClick={e => e.stopPropagation()}
    className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
   >
    <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
     <div className="flex items-center gap-3">
      <div className={`p-2.5 ${iconBg}`}><Icon size={20} className={iconColor} /></div>
      <h3 className="text-base font-semibold text-[#1c2b3a]">{title}</h3>
     </div>
     <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
      <Cancel01Icon size={18} />
     </button>
    </div>
    <div className="p-6 flex-1 overflow-y-auto">
     <p className="text-sm text-[#8892a4]">{message}</p>
    </div>
    <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
     <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
      Annuler
     </button>
     <button
      onClick={onConfirm}
      disabled={isPending}
      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmColor}`}
     >
      {isPending && <Loading02Icon size={14} className="animate-spin" />}
      {confirmLabel}
     </button>
    </div>
   </motion.div>
  </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function FiscalYears() {
 useTranslation();
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [selectedFy, setSelectedFy]           = useState<FiscalYear | null>(null);
 const [closingId, setClosingId]             = useState<string | null>(null);
 const [reopeningId, setReopeningId]         = useState<string | null>(null);

 const { data: fiscalYears, isLoading } = useQuery<FiscalYear[]>({
  queryKey: ['accounting', 'fiscal-years'],
  queryFn: getFiscalYears,
 });

 const qc = useQueryClient();
 const closeMut = useMutation({
  mutationFn: (id: string) => closeFiscalYear(id),
  onSuccess: () => { toast.success('Exercice clôturé avec succès'); qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] }); },
  onError: () => toast.error('Erreur lors de la clôture'),
 });
 const reopenMut = useMutation({
  mutationFn: (id: string) => reopenFiscalYear(id),
  onSuccess: () => { toast.success('Exercice réouvert avec succès'); qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] }); },
  onError: () => toast.error('Erreur lors de la réouverture'),
 });

 if (isLoading) {
  return (
   <div className="space-y-6">
    <div className="h-8 bg-gray-200 w-64 animate-pulse" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-gray-100 animate-pulse" />)}
    </div>
   </div>
  );
 }

 const years = fiscalYears || [];

 return (
  <div className="space-y-6">
   {/* Header */}
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
     <h1 className="text-2xl font-bold text-gray-800">Exercices Fiscaux</h1>
     <p className="text-sm text-gray-500 mt-1">Gestion des exercices comptables</p>
    </div>
    <button
     onClick={() => setShowCreateModal(true)}
     className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
    >
     <Add01Icon size={16} />
     Nouvel Exercice
    </button>
   </div>

   {/* Cards */}
   {years.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
     {years.map((fy, i) => {
      const isOpen = fy.status === 'OPEN';
      return (
       <motion.div
        key={fy.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
        className={`bg-white p-6 border-2 transition-colors ${isOpen ? 'border-[#33cbcc]/30' : 'border-gray-100'}`}
       >
        {/* Status */}
        <div className="flex items-center justify-between mb-4">
         <h3 className="text-lg font-bold text-gray-800">{fy.name}</h3>
         <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isOpen ? 'bg-[#33cbcc]/10 text-[#33cbcc]' : 'bg-gray-100 text-gray-500'}`}>
          {isOpen ? 'Ouvert' : 'Clôturé'}
         </span>
        </div>

        {/* Period */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
         <Calendar01Icon size={14} className="text-gray-400" />
         <span>{formatDate(fy.startDate)} — {formatDate(fy.endDate)}</span>
        </div>

        {/* Closed info */}
        {!isOpen && fy.closedAt && (
         <div className="bg-gray-50 p-3 mb-4 space-y-1">
          <p className="text-xs text-gray-400">Clôturé le {formatDate(fy.closedAt)}</p>
          {fy.closedBy && <p className="text-xs text-gray-400">Par {fy.closedBy.email}</p>}
         </div>
        )}

        {isOpen && (
         <div className="flex items-center gap-2 bg-[#33cbcc]/5 p-3 mb-4">
          <Tick01Icon size={14} className="text-[#33cbcc]" />
          <span className="text-xs font-semibold text-[#33cbcc]">Exercice en cours</span>
         </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
         {isOpen ? (
          <button
           onClick={() => setClosingId(fy.id)}
           className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors"
          >
           <LockPasswordIcon size={14} />
           Clôturer
          </button>
         ) : (
          <button
           onClick={() => setReopeningId(fy.id)}
           className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
          >
           <CircleUnlock01Icon size={14} />
           Réouvrir
          </button>
         )}
         <button
          onClick={() => setSelectedFy(fy)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#33cbcc] hover:text-[#33cbcc] transition-colors"
         >
          <Settings01Icon size={14} />
          Configurer
         </button>
        </div>
       </motion.div>
      );
     })}
    </div>
   ) : (
    <div className="bg-white p-12 text-center">
     <Calendar01Icon size={48} className="mx-auto text-gray-300 mb-4" />
     <p className="text-gray-500 font-medium mb-2">Aucun exercice fiscal</p>
     <p className="text-sm text-gray-400">Créez votre premier exercice fiscal pour commencer.</p>
    </div>
   )}

   {/* Modals */}
   <AnimatePresence>
    {showCreateModal && <CreateFiscalYearModal onClose={() => setShowCreateModal(false)} />}
    {selectedFy && <FiscalYearDetailModal fy={selectedFy} onClose={() => setSelectedFy(null)} />}
    {closingId && (
     <ConfirmModal
      title="Clôturer l'exercice"
      message="Êtes-vous sûr de vouloir clôturer cet exercice fiscal ? Les écritures ne pourront plus être modifiées."
      icon={LockPasswordIcon} iconBg="bg-[#283852]/10" iconColor="text-[#283852]"
      confirmLabel="Clôturer" confirmColor="bg-[#283852] hover:bg-[#283852]/90"
      onClose={() => setClosingId(null)}
      onConfirm={() => closeMut.mutate(closingId, { onSuccess: () => setClosingId(null) })}
      isPending={closeMut.isPending}
     />
    )}
    {reopeningId && (
     <ConfirmModal
      title="Réouvrir l'exercice"
      message="Êtes-vous sûr de vouloir réouvrir cet exercice fiscal ? Les écritures pourront à nouveau être modifiées."
      icon={CircleUnlock01Icon} iconBg="bg-[#33cbcc]/10" iconColor="text-[#33cbcc]"
      confirmLabel="Réouvrir" confirmColor="bg-[#33cbcc] hover:bg-[#2bb5b6]"
      onClose={() => setReopeningId(null)}
      onConfirm={() => reopenMut.mutate(reopeningId, { onSuccess: () => setReopeningId(null) })}
      isPending={reopenMut.isPending}
     />
    )}
   </AnimatePresence>
  </div>
 );
}
