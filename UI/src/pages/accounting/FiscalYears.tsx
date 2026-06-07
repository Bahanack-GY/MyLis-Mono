import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Cancel01Icon, Loading02Icon, Calendar01Icon, LockPasswordIcon, CircleUnlock01Icon, Alert02Icon, Tick01Icon } from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
 getFiscalYears,
 createFiscalYear,
 closeFiscalYear,
 reopenFiscalYear,
} from '../../api/accounting/api';
import type { FiscalYear } from '../../api/accounting/types';

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const formatDate = (dateStr: string | null | undefined) => {
 if (!dateStr) return '--';
 return new Date(dateStr).toLocaleDateString('fr-FR', {
 day: '2-digit',
 month: 'long',
 year: 'numeric',
 });
};

const inputCls =
 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
const labelCls =
 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const useFiscalYears = () =>
 useQuery<FiscalYear[]>({
 queryKey: ['accounting', 'fiscal-years'],
 queryFn: getFiscalYears,
 });

const useCreateFiscalYear = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => createFiscalYear(data),
 onSuccess: () => {
 toast.success('Exercice fiscal cree avec succes');
 qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
 },
 onError: () => toast.error('Erreur lors de la creation'),
 });
};

const useCloseFiscalYear = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => closeFiscalYear(id),
 onSuccess: () => {
 toast.success('Exercice cloture avec succes');
 qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
 },
 onError: () => toast.error('Erreur lors de la cloture'),
 });
};

const useReopenFiscalYear = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => reopenFiscalYear(id),
 onSuccess: () => {
 toast.success('Exercice reouvert avec succes');
 qc.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
 },
 onError: () => toast.error('Erreur lors de la reouverture'),
 });
};

/* ------------------------------------------------------------------ */
/* Create Modal */
/* ------------------------------------------------------------------ */

const CreateFiscalYearModal = ({ onClose }: { onClose: () => void }) => {
 const createMut = useCreateFiscalYear();
 const currentYear = new Date().getFullYear();

 const [form, setForm] = useState({
 name: `Exercice ${currentYear}`,
 startDate: `${currentYear}-01-01`,
 endDate: `${currentYear}-12-31`,
 });

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

 const isValid = form.name.trim() && form.startDate && form.endDate && form.startDate < form.endDate;

 const handleSubmit = () => {
 if (!isValid || createMut.isPending) return;
 createMut.mutate(
 {
 name: form.name.trim(),
 startDate: form.startDate,
 endDate: form.endDate,
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
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center">
 <Calendar01Icon size={20} className="text-[#33cbcc]"/>
 </div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">Nouvel exercice fiscal</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
 >
 <Cancel01Icon size={18} />
 </button>
 </div>

 {/* Content */}
 <div className="p-6 space-y-4">
 <div>
 <label className={labelCls}>Nom de l'exercice</label>
 <input
 type="text"
 value={form.name}
 onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
 placeholder="Exercice 2026"
 className={inputCls}
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className={labelCls}>
 <Calendar01Icon size={12} />
 Date de debut
 </label>
 <input
 type="date"
 value={form.startDate}
 onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
 className={inputCls}
 />
 </div>
 <div>
 <label className={labelCls}>
 <Calendar01Icon size={12} />
 Date de fin
 </label>
 <input
 type="date"
 value={form.endDate}
 onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
 className={inputCls}
 />
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 mt-auto">
 <button
 onClick={onClose}
 className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={!isValid || createMut.isPending}
 onClick={handleSubmit}
 className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
 isValid && !createMut.isPending
 ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
 : 'bg-gray-300 cursor-not-allowed'
 }`}
 >
 {createMut.isPending ? <Loading02Icon size={16} className="animate-spin"/> : <Add01Icon size={16} />}
 Creer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Confirmation Modal */
/* ------------------------------------------------------------------ */

const ConfirmModal = ({
 title,
 message,
 icon: Icon,
 iconBg,
 iconColor,
 confirmLabel,
 confirmColor,
 onClose,
 onConfirm,
 isPending,
}: {
 title: string;
 message: string;
 icon: any;
 iconBg: string;
 iconColor: string;
 confirmLabel: string;
 confirmColor: string;
 onClose: () => void;
 onConfirm: () => void;
 isPending: boolean;
}) => {
 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => {
 if (e.key === 'Escape') onClose();
 };
 document.addEventListener('keydown', handleKey);
 return () => document.removeEventListener('keydown', handleKey);
 }, [onClose]);

 return (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-60 flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
 >
 {/* Header */}
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className={`p-2.5  ${iconBg}`}>
 <Icon size={20} className={iconColor} />
 </div>
 <h3 className="text-base font-semibold text-[#1c2b3a]">{title}</h3>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
 >
 <Cancel01Icon size={18} />
 </button>
 </div>
 {/* Content */}
 <div className="p-6 flex-1">
 <p className="text-sm text-[#8892a4]">{message}</p>
 </div>
 {/* Footer */}
 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button
 onClick={onClose}
 className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
 >
 Annuler
 </button>
 <button
 onClick={onConfirm}
 disabled={isPending}
 className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${confirmColor}`}
 >
 {isPending && <Loading02Icon size={14} className="animate-spin"/>}
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
 const { t } = useTranslation();
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [closingId, setClosingId] = useState<string | null>(null);
 const [reopeningId, setReopeningId] = useState<string | null>(null);

 const { data: fiscalYears, isLoading } = useFiscalYears();
 const closeMut = useCloseFiscalYear();
 const reopenMut = useReopenFiscalYear();

 if (isLoading) {
 return (
 <div className="space-y-6">
 <div className="h-8 bg-gray-200  w-64 animate-pulse"/>
 <div className="h-4 bg-gray-100 rounded w-48 animate-pulse"/>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="h-48 bg-gray-100  animate-pulse"/>
 ))}
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
 <p className="text-sm text-gray-500 mt-1">
 Gestion des exercices comptables
 </p>
 </div>
 <button
 onClick={() => setShowCreateModal(true)}
 className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5  text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
 >
 <Add01Icon size={16} />
 Nouvel Exercice
 </button>
 </div>

 {/* Fiscal year cards */}
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
 className={`bg-white  p-6 border-2 transition-colors ${
 isOpen ? '' : 'border-gray-100'
 }`}
 >
 {/* Status badge */}
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-lg font-bold text-gray-800">{fy.name}</h3>
 <span
 className={`text-xs font-semibold px-3 py-1 rounded-full ${
 isOpen
 ? 'bg-[#33cbcc]/10 text-[#33cbcc]'
 : 'bg-gray-100 text-gray-500'
 }`}
 >
 {isOpen ? 'Ouvert' : 'Cloture'}
 </span>
 </div>

 {/* Period */}
 <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
 <Calendar01Icon size={14} className="text-gray-400"/>
 <span>
 {formatDate(fy.startDate)} - {formatDate(fy.endDate)}
 </span>
 </div>

 {/* Closed info */}
 {!isOpen && fy.closedAt && (
 <div className="bg-gray-50  p-3 mb-4 space-y-1">
 <p className="text-xs text-gray-400">
 Cloture le {formatDate(fy.closedAt)}
 </p>
 {fy.closedBy && (
 <p className="text-xs text-gray-400">
 Par {fy.closedBy.email}
 </p>
 )}
 </div>
 )}

 {/* Open highlight */}
 {isOpen && (
 <div className="flex items-center gap-2 bg-[#33cbcc]/5  p-3 mb-4">
 <Tick01Icon size={14} className="text-[#33cbcc]"/>
 <span className="text-xs font-semibold text-[#33cbcc]">
 Exercice en cours
 </span>
 </div>
 )}

 {/* Actions */}
 <div className="flex gap-2">
 {isOpen ? (
 <button
 onClick={() => setClosingId(fy.id)}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5  text-sm font-semibold text-[#283852] bg-[#283852]/10 hover:bg-[#283852]/20 transition-colors"
 >
 <LockPasswordIcon size={14} />
 Cloturer
 </button>
 ) : (
 <button
 onClick={() => setReopeningId(fy.id)}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5  text-sm font-semibold text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors"
 >
 <CircleUnlock01Icon size={14} />
 Reouvrir
 </button>
 )}
 </div>
 </motion.div>
 );
 })}
 </div>
 ) : (
 <div className="bg-white  p-12 text-center">
 <Calendar01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-500 font-medium mb-2">Aucun exercice fiscal</p>
 <p className="text-sm text-gray-400">Creez votre premier exercice fiscal pour commencer.</p>
 </div>
 )}

 {/* Modals */}
 <AnimatePresence>
 {showCreateModal && <CreateFiscalYearModal onClose={() => setShowCreateModal(false)} />}
 {closingId && (
 <ConfirmModal
 title="Cloturer l'exercice"
 message="Etes-vous sur de vouloir cloturer cet exercice fiscal ? Les ecritures ne pourront plus etre modifiees."
 icon={LockPasswordIcon}
 iconBg="bg-[#283852]/10"
 iconColor="text-[#283852]"
 confirmLabel="Cloturer"
 confirmColor="bg-[#283852] hover:bg-[#283852]/90"
 onClose={() => setClosingId(null)}
 onConfirm={() =>
 closeMut.mutate(closingId, { onSuccess: () => setClosingId(null) })
 }
 isPending={closeMut.isPending}
 />
 )}
 {reopeningId && (
 <ConfirmModal
 title="Reouvrir l'exercice"
 message="Etes-vous sur de vouloir reouvrir cet exercice fiscal ? Les ecritures pourront a nouveau etre modifiees."
 icon={CircleUnlock01Icon}
 iconBg="bg-[#33cbcc]/10"
 iconColor="text-[#33cbcc]"
 confirmLabel="Reouvrir"
 confirmColor="bg-[#33cbcc] hover:bg-[#2bb5b6]"
 onClose={() => setReopeningId(null)}
 onConfirm={() =>
 reopenMut.mutate(reopeningId, { onSuccess: () => setReopeningId(null) })
 }
 isPending={reopenMut.isPending}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
