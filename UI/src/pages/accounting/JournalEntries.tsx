import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Search,
 Plus,
 X,
 Loader2,
 BookOpen,
 FileText,
 CheckCircle,
 Trash2,
 Eye,
 Calendar,
 Filter,
 AlertTriangle,
 MinusCircle,
 PlusCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
 getJournalEntries,
 getJournals,
 getAccounts,
 createJournalEntry,
 validateJournalEntry,
 deleteJournalEntry,
} from '../../api/accounting/api';
import type { JournalEntry, JournalEntryLine, Journal, Account } from '../../api/accounting/types';
import { CreateInvoiceModal } from '../../components/modals/CreateInvoiceModal';
import { useClients } from '../../api/clients/hooks';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';
const useSuppliersList = () =>
 useQuery({ queryKey: ['suppliers'], queryFn: () => axios.get(`${API}/suppliers`).then(r => r.data as { id: string; name: string }[]) });

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
 DRAFT: { bg: 'bg-[#283852]/10', text: 'text-[#283852]/70' },
 VALIDATED: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]' },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
 MANUAL: { bg: 'bg-[#283852]/10', text: 'text-[#283852]' },
 INVOICE: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]' },
 EXPENSE: { bg: 'bg-[#283852]/10', text: 'text-[#283852]' },
 SALARY: { bg: 'bg-[#283852]/10', text: 'text-[#283852]' },
 TAX: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]' },
 CREDIT_NOTE: { bg: 'bg-[#283852]/10', text: 'text-[#283852]' },
};

const formatXAF = (amount: number) =>
 new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + ' XAF';

const formatDate = (dateStr: string | undefined) => {
 if (!dateStr) return '--';
 return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const inputCls =
 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
const labelCls =
 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useJournalEntries = (params?: any) =>
 useQuery<JournalEntry[]>({
 queryKey: ['accounting', 'entries', params],
 queryFn: () => getJournalEntries(params),
 });

const useJournals = () =>
 useQuery<Journal[]>({
 queryKey: ['accounting', 'journals'],
 queryFn: getJournals,
 });

const useAccounts = () =>
 useQuery<Account[]>({
 queryKey: ['accounting', 'accounts'],
 queryFn: getAccounts,
 });

const useCreateJournalEntry = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => createJournalEntry(data),
 onSuccess: () => {
 toast.success('Ecriture creee avec succes');
 qc.invalidateQueries({ queryKey: ['accounting', 'entries'] });
 },
 onError: () => toast.error('Erreur lors de la creation'),
 });
};

const useValidateJournalEntry = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => validateJournalEntry(id),
 onSuccess: () => {
 toast.success('Ecriture validee');
 qc.invalidateQueries({ queryKey: ['accounting', 'entries'] });
 },
 onError: () => toast.error('Erreur lors de la validation'),
 });
};

const useDeleteJournalEntry = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => deleteJournalEntry(id),
 onSuccess: () => {
 toast.success('Ecriture supprimee');
 qc.invalidateQueries({ queryKey: ['accounting', 'entries'] });
 },
 onError: () => toast.error('Erreur lors de la suppression'),
 });
};

/* ------------------------------------------------------------------ */
/* Create Entry Modal */
/* ------------------------------------------------------------------ */

interface EntryLine {
 accountId: string;
 debit: string;
 credit: string;
 label: string;
}

const CreateEntryModal = ({
 onClose,
 journals,
 accounts,
}: {
 onClose: () => void;
 journals: Journal[];
 accounts: Account[];
}) => {
 const createMut = useCreateJournalEntry();
 const { data: clients = [] } = useClients();
 const { data: suppliers = [] } = useSuppliersList();

 const [form, setForm] = useState({
 journalId: '',
 date: new Date().toISOString().split('T')[0],
 description: '',
 reference: '',
 });
 const [thirdPartyId, setThirdPartyId] = useState('');

 const selectedJournal = journals.find(j => j.id === form.journalId);
 const journalCode = selectedJournal?.code ?? '';
 const isVente = journalCode === 'VTE';
 const isAchat = journalCode === 'ACH';
 const showThirdParty = isVente || isAchat;

 const handleThirdPartyChange = (id: string) => {
  setThirdPartyId(id);
  if (!id) return;
  const name = isVente
   ? clients.find((c: any) => c.id === id)?.name
   : suppliers.find((s: any) => s.id === id)?.name;
  if (name && !form.description.trim()) {
   setForm(p => ({ ...p, description: isVente ? `Vente - ${name}` : `Achat - ${name}` }));
  }
 };

 const [lines, setLines] = useState<EntryLine[]>([
 { accountId: '', debit: '', credit: '', label: '' },
 { accountId: '', debit: '', credit: '', label: '' },
 ]);

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

 const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
 const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
 const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

 const addLine = () => setLines((prev) => [...prev, { accountId: '', debit: '', credit: '', label: '' }]);
 const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
 const updateLine = (idx: number, field: keyof EntryLine, value: string) => {
 setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
 };

 const isValid =
 form.journalId &&
 form.date &&
 form.description.trim() &&
 isBalanced &&
 lines.every((l) => l.accountId);

 const handleSubmit = () => {
 if (!isValid || createMut.isPending) return;
 createMut.mutate(
 {
 journalId: form.journalId,
 date: form.date,
 description: form.description.trim(),
 reference: form.reference.trim() || null,
 lines: lines
 .filter((l) => l.accountId && (Number(l.debit) > 0 || Number(l.credit) > 0))
 .map((l) => ({
 accountId: l.accountId,
 debit: Number(l.debit) || 0,
 credit: Number(l.credit) || 0,
 label: l.label.trim() || null,
 })),
 },
 { onSuccess: onClose },
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
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
 <BookOpen size={20} className="text-[#33cbcc]"/>
 </div>
 <h2 className="text-lg font-bold text-gray-800">Nouvelle ecriture comptable</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-5 overflow-y-auto flex-1">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Journal</label>
 <select
 value={form.journalId}
 onChange={(e) => { setForm((p) => ({ ...p, journalId: e.target.value })); setThirdPartyId(''); }}
 className={inputCls + ' appearance-none cursor-pointer'}
 >
 <option value="">-- Selectionner --</option>
 {journals.map((j) => (
 <option key={j.id} value={j.id}>
 {j.code} - {j.name}
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className={labelCls}>
 <Calendar size={12} />
 Date
 </label>
 <input
 type="date"
 value={form.date}
 onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
 className={inputCls}
 />
 </div>
 </div>

 {showThirdParty && (
  <div>
   <label className={labelCls}>
    {isVente ? '🧑‍💼 Client' : '🏭 Fournisseur'}
   </label>
   <select
    value={thirdPartyId}
    onChange={(e) => handleThirdPartyChange(e.target.value)}
    className={inputCls + ' appearance-none cursor-pointer'}
   >
    <option value="">-- {isVente ? 'Sélectionner un client' : 'Sélectionner un fournisseur'} --</option>
    {isVente
     ? clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)
     : suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)
    }
   </select>
  </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>Description</label>
 <input
 type="text"
 value={form.description}
 onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
 placeholder="Libelle de l'ecriture"
 className={inputCls}
 />
 </div>
 <div>
 <label className={labelCls}>Reference</label>
 <input
 type="text"
 value={form.reference}
 onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
 placeholder="Ref. facture, bon..."
 className={inputCls}
 />
 </div>
 </div>

 {/* Lines */}
 <div className="border-t border-gray-100 pt-5">
 <div className="flex items-center justify-between mb-3">
 <label className={labelCls + ' mb-0'}>
 <FileText size={12} />
 Lignes d'ecriture
 </label>
 <button
 type="button"
 onClick={addLine}
 className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
 >
 <PlusCircle size={14} />
 Ajouter une ligne
 </button>
 </div>

 {/* Lines header */}
 <div className="grid grid-cols-12 gap-2 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">
 <div className="col-span-5">Compte</div>
 <div className="col-span-2">Debit</div>
 <div className="col-span-2">Credit</div>
 <div className="col-span-2">Libelle</div>
 <div className="col-span-1"></div>
 </div>

 <div className="space-y-2">
 {lines.map((line, idx) => (
 <div key={idx} className="grid grid-cols-12 gap-2 items-center">
 <div className="col-span-5">
 <select
 value={line.accountId}
 onChange={(e) => updateLine(idx, 'accountId', e.target.value)}
 className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer"
 >
 <option value="">Selectionner un compte</option>
 {accounts.map((a) => (
 <option key={a.id} value={a.id}>
 {a.code} - {a.name}
 </option>
 ))}
 </select>
 </div>
 <div className="col-span-2">
 <input
 type="number"
 min="0"
 value={line.debit}
 onChange={(e) => updateLine(idx, 'debit', e.target.value)}
 placeholder="0"
 className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
 />
 </div>
 <div className="col-span-2">
 <input
 type="number"
 min="0"
 value={line.credit}
 onChange={(e) => updateLine(idx, 'credit', e.target.value)}
 placeholder="0"
 className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
 />
 </div>
 <div className="col-span-2">
 <input
 type="text"
 value={line.label}
 onChange={(e) => updateLine(idx, 'label', e.target.value)}
 placeholder="Libelle"
 className="w-full bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
 />
 </div>
 <div className="col-span-1 flex justify-center">
 {lines.length > 2 && (
 <button
 type="button"
 onClick={() => removeLine(idx)}
 className="p-1.5 rounded-lg text-gray-400 hover:bg-[#283852]/10 hover:text-[#283852] transition-colors"
 >
 <MinusCircle size={14} />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>

 {/* Totals */}
 <div className="mt-4 bg-gray-50 rounded-xl p-4">
 <div className="grid grid-cols-12 gap-2">
 <div className="col-span-5 text-sm font-semibold text-gray-700">Totaux</div>
 <div className="col-span-2">
 <span className="text-sm font-bold text-gray-800">{formatXAF(totalDebit)}</span>
 </div>
 <div className="col-span-2">
 <span className="text-sm font-bold text-gray-800">{formatXAF(totalCredit)}</span>
 </div>
 <div className="col-span-3">
 {totalDebit > 0 || totalCredit > 0 ? (
 isBalanced ? (
 <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-2 py-1 rounded-full">
 <CheckCircle size={12} />
 Equilibre
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#283852] bg-[#283852]/10 px-2 py-1 rounded-full">
 <AlertTriangle size={12} />
 Desequilibre: {formatXAF(Math.abs(totalDebit - totalCredit))}
 </span>
 )
 ) : null}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
 <button
 onClick={onClose}
 className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={!isValid || createMut.isPending}
 onClick={handleSubmit}
 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
 isValid && !createMut.isPending
 ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] '
 : 'bg-gray-300 cursor-not-allowed shadow-none'
 }`}
 >
 {createMut.isPending ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16} />}
 Creer l'ecriture
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Entry Detail Modal */
/* ------------------------------------------------------------------ */

const EntryDetailModal = ({
 entry,
 onClose,
}: {
 entry: JournalEntry;
 onClose: () => void;
}) => {
 const validateMut = useValidateJournalEntry();
 const deleteMut = useDeleteJournalEntry();

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

 const statusStyle = STATUS_COLORS[entry.status] || STATUS_COLORS.DRAFT;
 const sourceStyle = SOURCE_COLORS[entry.sourceType] || SOURCE_COLORS.MANUAL;

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
 className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
 <FileText size={20} className="text-[#33cbcc]"/>
 </div>
 <div>
 <h2 className="text-lg font-bold text-gray-800">{entry.entryNumber}</h2>
 <div className="flex items-center gap-2 mt-0.5">
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
 >
 {entry.status === 'DRAFT' ? 'Brouillon' : 'Validee'}
 </span>
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceStyle.bg} ${sourceStyle.text}`}
 >
 {entry.sourceType}
 </span>
 </div>
 </div>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-5 overflow-y-auto flex-1">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Journal</p>
 <p className="text-sm font-medium text-gray-800 mt-1">
 {entry.journal?.code} - {entry.journal?.name}
 </p>
 </div>
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date</p>
 <p className="text-sm text-gray-600 mt-1">{formatDate(entry.date)}</p>
 </div>
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
 Description
 </p>
 <p className="text-sm text-gray-600 mt-1">{entry.description}</p>
 </div>
 {entry.reference && (
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
 Reference
 </p>
 <p className="text-sm text-gray-600 mt-1">{entry.reference}</p>
 </div>
 )}
 {entry.createdBy && (
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
 Créé par
 </p>
 <p className="text-sm text-gray-600 mt-1">{entry.createdBy.email}</p>
 </div>
 )}
 </div>

 {/* Lines */}
 <div className="border-t border-gray-100 pt-4">
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
 Lignes d'ecriture
 </p>
 <div className="bg-gray-50 rounded-xl overflow-hidden">
 <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
 <div className="col-span-2">Code</div>
 <div className="col-span-4">Compte</div>
 <div className="col-span-2 text-right">Debit</div>
 <div className="col-span-2 text-right">Credit</div>
 <div className="col-span-2">Libelle</div>
 </div>
 {(entry.lines || []).map((line, i) => (
 <div
 key={line.id || i}
 className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-gray-100 last:border-0 text-sm"
 >
 <div className="col-span-2 font-mono text-gray-600 text-xs">
 {line.account?.code || '--'}
 </div>
 <div className="col-span-4 text-gray-800">{line.account?.name || '--'}</div>
 <div className="col-span-2 text-right font-medium text-gray-800">
 {line.debit > 0 ? formatXAF(line.debit) : ''}
 </div>
 <div className="col-span-2 text-right font-medium text-gray-800">
 {line.credit > 0 ? formatXAF(line.credit) : ''}
 </div>
 <div className="col-span-2 text-gray-500 text-xs truncate">
 {line.label || ''}
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Totals */}
 <div className="bg-gray-50 rounded-xl p-4">
 <div className="flex justify-between text-sm">
 <span className="font-semibold text-gray-700">Total Debit</span>
 <span className="font-bold text-gray-800">{formatXAF(entry.totalDebit)}</span>
 </div>
 <div className="flex justify-between text-sm mt-1">
 <span className="font-semibold text-gray-700">Total Credit</span>
 <span className="font-bold text-gray-800">{formatXAF(entry.totalCredit)}</span>
 </div>
 </div>
 </div>

 {/* Footer */}
 {entry.status === 'DRAFT' && (
 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
 <button
 onClick={() => deleteMut.mutate(entry.id, { onSuccess: onClose })}
 disabled={deleteMut.isPending}
 className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
 >
 {deleteMut.isPending ? (
 <Loader2 size={14} className="animate-spin"/>
 ) : (
 <Trash2 size={14} />
 )}
 Supprimer
 </button>
 <button
 onClick={() => validateMut.mutate(entry.id, { onSuccess: onClose })}
 disabled={validateMut.isPending}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {validateMut.isPending ? (
 <Loader2 size={14} className="animate-spin"/>
 ) : (
 <CheckCircle size={14} />
 )}
 Valider
 </button>
 </div>
 )}
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function JournalEntries() {
 const { t } = useTranslation();
 const [search, setSearch] = useState('');
 const [filterJournal, setFilterJournal] = useState('');
 const [filterStatus, setFilterStatus] = useState('');
 const [dateFrom, setDateFrom] = useState('');
 const [dateTo, setDateTo] = useState('');
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
 const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

 const params = useMemo(() => {
 const p: any = {};
 if (filterJournal) p.journalId = filterJournal;
 if (filterStatus) p.status = filterStatus;
 if (dateFrom) p.dateFrom = dateFrom;
 if (dateTo) p.dateTo = dateTo;
 return p;
 }, [filterJournal, filterStatus, dateFrom, dateTo]);

 const { data: entries, isLoading } = useJournalEntries(params);
 const { data: journals } = useJournals();
 const { data: accounts } = useAccounts();
 const validateMut = useValidateJournalEntry();
 const deleteMut = useDeleteJournalEntry();

 const filteredEntries = useMemo(() => {
 if (!entries) return [];
 if (!search) return entries;
 const q = search.toLowerCase();
 return entries.filter(
 (e) =>
 e.entryNumber.toLowerCase().includes(q) ||
 e.description.toLowerCase().includes(q) ||
 (e.reference || '').toLowerCase().includes(q),
 );
 }, [entries, search]);

 if (isLoading) {
 return (
 <div className="space-y-6">
 <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"/>
 <div className="h-4 bg-gray-100 rounded w-48 animate-pulse"/>
 <div className="space-y-3">
 {[...Array(6)].map((_, i) => (
 <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse"/>
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Ecritures Comptables</h1>
 <p className="text-sm text-gray-500 mt-1">
 Journal des ecritures comptables
 </p>
 </div>
 <div className="flex items-center gap-3">
 <button
 onClick={() => setShowCreateInvoiceModal(true)}
 className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
 >
 <FileText size={16} className="text-[#33cbcc]"/>
 Nouvelle Facture
 </button>
 <button
 onClick={() => setShowCreateModal(true)}
 className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
 >
 <Plus size={16} />
 Nouvelle Ecriture
 </button>
 </div>
 </div>

 {/* Filters */}
 <div className="bg-white rounded-2xl p-4">
 <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
 <Filter size={12} />
 Filtres
 </div>
 <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
 {/* Search */}
 <div className="md:col-span-2 bg-gray-50 rounded-xl p-2 flex items-center focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
 <Search className="text-gray-400 ml-2"size={16} />
 <input
 type="text"
 placeholder="Rechercher..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-2 text-sm"
 />
 </div>

 {/* Journal filter */}
 <select
 value={filterJournal}
 onChange={(e) => setFilterJournal(e.target.value)}
 className="bg-gray-50 rounded-xl border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 appearance-none cursor-pointer"
 >
 <option value="">Tous les journaux</option>
 {(journals || []).map((j) => (
 <option key={j.id} value={j.id}>
 {j.code} - {j.name}
 </option>
 ))}
 </select>

 {/* Status filter */}
 <select
 value={filterStatus}
 onChange={(e) => setFilterStatus(e.target.value)}
 className="bg-gray-50 rounded-xl border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 appearance-none cursor-pointer"
 >
 <option value="">Tous les statuts</option>
 <option value="DRAFT">Brouillon</option>
 <option value="VALIDATED">Validee</option>
 </select>

 {/* Date range */}
 <div className="flex gap-2">
 <input
 type="date"
 value={dateFrom}
 onChange={(e) => setDateFrom(e.target.value)}
 className="flex-1 bg-gray-50 rounded-xl border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20"
 placeholder="Du"
 />
 <input
 type="date"
 value={dateTo}
 onChange={(e) => setDateTo(e.target.value)}
 className="flex-1 bg-gray-50 rounded-xl border-0 px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20"
 placeholder="Au"
 />
 </div>
 </div>
 </div>

 {/* Entries Table */}
 {filteredEntries.length > 0 ? (
 <div className="bg-white rounded-2xl overflow-hidden">
 {/* Table header */}
 <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
 <div className="col-span-1">N</div>
 <div className="col-span-1">Date</div>
 <div className="col-span-2">Journal</div>
 <div className="col-span-3">Description</div>
 <div className="col-span-1 text-right">Debit</div>
 <div className="col-span-1 text-right">Credit</div>
 <div className="col-span-1">Statut</div>
 <div className="col-span-1">Source</div>
 <div className="col-span-1 text-right">Actions</div>
 </div>

 {filteredEntries.map((entry, i) => {
 const statusStyle = STATUS_COLORS[entry.status] || STATUS_COLORS.DRAFT;
 const sourceStyle = SOURCE_COLORS[entry.sourceType] || SOURCE_COLORS.MANUAL;

 return (
 <motion.div
 key={entry.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.02 }}
 onClick={() => setSelectedEntry(entry)}
 className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
 >
 <div className="col-span-1 text-sm font-mono font-semibold text-gray-800">
 {entry.entryNumber}
 </div>
 <div className="col-span-1 text-xs text-gray-500">{formatDate(entry.date)}</div>
 <div className="col-span-2 text-sm text-gray-600 truncate">
 {entry.journal?.name || '--'}
 </div>
 <div className="col-span-3 text-sm text-gray-700 truncate">
 {entry.description}
 {entry.reference && (
 <span className="text-xs text-gray-400 ml-1">({entry.reference})</span>
 )}
 </div>
 <div className="col-span-1 text-sm font-semibold text-gray-800 text-right">
 {formatXAF(entry.totalDebit)}
 </div>
 <div className="col-span-1 text-sm font-semibold text-gray-800 text-right">
 {formatXAF(entry.totalCredit)}
 </div>
 <div className="col-span-1">
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}
 >
 {entry.status === 'DRAFT' ? 'Brouillon' : 'Validee'}
 </span>
 </div>
 <div className="col-span-1">
 <span
 className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sourceStyle.bg} ${sourceStyle.text}`}
 >
 {entry.sourceType}
 </span>
 </div>
 <div className="col-span-1 flex justify-end gap-1">
 {entry.status === 'DRAFT' && (
 <>
 <button
 onClick={(e) => {
 e.stopPropagation();
 validateMut.mutate(entry.id);
 }}
 disabled={validateMut.isPending}
 title="Valider"
 className="p-1.5 rounded-lg text-[#33cbcc] hover:text-[#2bb5b6] hover:bg-[#33cbcc]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <CheckCircle size={14} />
 </button>
 <button
 onClick={(e) => {
 e.stopPropagation();
 deleteMut.mutate(entry.id);
 }}
 disabled={deleteMut.isPending}
 title="Supprimer"
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Trash2 size={14} />
 </button>
 </>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedEntry(entry);
 }}
 title="Details"
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Eye size={14} />
 </button>
 </div>
 </motion.div>
 );
 })}
 </div>
 ) : (
 <div className="bg-white rounded-2xl p-12 text-center">
 <BookOpen size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucune ecriture trouvee</p>
 </div>
 )}

 {/* Modals */}
 <AnimatePresence>
 {showCreateModal && (
 <CreateEntryModal
 onClose={() => setShowCreateModal(false)}
 journals={journals || []}
 accounts={accounts || []}
 />
 )}
 {showCreateInvoiceModal && (
 <CreateInvoiceModal onClose={() => setShowCreateInvoiceModal(false)} />
 )}
 {selectedEntry && (
 <EntryDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
 )}
 </AnimatePresence>
 </div>
 );
}
