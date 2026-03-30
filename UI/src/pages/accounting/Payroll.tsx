import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Plus,
 X,
 Loader2,
 Calendar,
 CheckCircle,
 Calculator,
 CreditCard,
 Eye,
 ArrowLeft,
 Users,
 Wallet,
 TrendingUp,
 AlertTriangle,
 DollarSign,
 Search,
 Pencil,
 Check,
 HandCoins,
 Banknote,
 ChevronDown,
 Download,
 Settings,
 Trash2,
 ListFilter,
 CheckSquare,
 Square,
 MinusSquare,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api/config';
import { exportPayslipPdf } from '../../utils/exportPayslipPdf';
import type { PayslipPdfData } from '../../utils/exportPayslipPdf';
import logoSrc from '../../assets/logo-lis.png';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

interface PayrollRun {
 id: string;
 month: number;
 year: number;
 status: 'DRAFT' | 'CALCULATED' | 'VALIDATED' | 'PAID';
 totalGross: number;
 totalNet: number;
 totalEmployerCharges: number;
 payslips?: Payslip[];
 createdAt: string;
}

interface Payslip {
 id: string;
 payrollRunId: string;
 employeeId: string;
 grossSalary: number;
 cnpsEmployee: number;
 cnpsEmployer: number;
 cfc: number;
 irpp: number;
 communalTax: number;
 totalDeductions: number;
 manualDeductions: number;
 manualDeductionNote: string | null;
 netSalary: number;
 totalEmployerCharges: number;
 includeCnps: boolean;
 includeCfc: boolean;
 includeIrpp: boolean;
 includeCommunalTax: boolean;
 customDeductions: { name: string; amount: number }[];
 paymentDate: string | null;
 employee?: {
 id: string;
 firstName: string;
 lastName: string;
 department?: { name: string };
 };
}

interface PreviewResult {
 grossSalary: number;
 cnpsEmployee: number;
 cnpsEmployer: number;
 cfc: number;
 irpp: number;
 communalTax: number;
 totalDeductions: number;
 netSalary: number;
 totalEmployerCharges: number;
}

interface SalaryEmployee {
 id: string;
 firstName: string;
 lastName: string;
 departmentId: string | null;
 departmentName: string;
 role: string;
 salary: number;
}

interface DeductionType {
 id: string;
 name: string;
 isPercentage: boolean;
 defaultAmount: number;
 isActive: boolean;
}

/* ------------------------------------------------------------------ */
/* Constants */
/* ------------------------------------------------------------------ */

const formatXAF = (amount: number) => {
 const value = Number(amount) || 0;
 return new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(value) + ' XAF';
};

const MONTHS = [
 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
 DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Brouillon' },
 CALCULATED: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', label: 'Calcule' },
 VALIDATED: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', label: 'Valide' },
 PAID: { bg: 'bg-[#283852]', text: 'text-white', label: 'Paye' },
};

const inputCls =
 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
const labelCls =
 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

/* ------------------------------------------------------------------ */
/* Logo helper */
/* ------------------------------------------------------------------ */

let cachedLogoBase64: string | null = null;

function loadLogoBase64(): Promise<string> {
 if (cachedLogoBase64) return Promise.resolve(cachedLogoBase64);
 return new Promise((resolve, reject) => {
 const img = new Image();
 img.crossOrigin = 'anonymous';
 img.onload = () => {
 const canvas = document.createElement('canvas');
 canvas.width = img.naturalWidth;
 canvas.height = img.naturalHeight;
 const ctx = canvas.getContext('2d');
 ctx?.drawImage(img, 0, 0);
 cachedLogoBase64 = canvas.toDataURL('image/png');
 resolve(cachedLogoBase64);
 };
 img.onerror = reject;
 img.src = logoSrc;
 });
}

async function downloadPayslipPdf(ps: Payslip, run: PayrollRun) {
 const logoBase64 = await loadLogoBase64().catch(() => undefined);
 const pdfData: PayslipPdfData = {
 employeeName: ps.employee ? `${ps.employee.firstName} ${ps.employee.lastName}` : 'Employe',
 departmentName: ps.employee?.department?.name || '',
 month: run.month,
 year: run.year,
 grossSalary: Number(ps.grossSalary),
 cnpsEmployee: Number(ps.cnpsEmployee),
 cnpsEmployer: Number(ps.cnpsEmployer),
 cfc: Number(ps.cfc),
 irpp: Number(ps.irpp),
 communalTax: Number(ps.communalTax),
 totalDeductions: Number(ps.totalDeductions),
 totalEmployerCharges: Number(ps.cnpsEmployer),
 manualDeductions: Number(ps.manualDeductions || 0),
 manualDeductionNote: ps.manualDeductionNote,
 customDeductions: ps.customDeductions || [],
 netSalary: Number(ps.netSalary),
 payslipId: ps.id,
 };
 exportPayslipPdf(pdfData, logoBase64);
}

/* ------------------------------------------------------------------ */
/* API */
/* ------------------------------------------------------------------ */

const payrollApi = {
 getRuns: () => api.get('/payroll/runs').then((r) => r.data),
 getRun: (id: string) => api.get(`/payroll/runs/${id}`).then((r) => r.data),
 create: (data: any) => api.post('/payroll/runs', data).then((r) => r.data),
 calculate: (id: string) => api.post(`/payroll/runs/${id}/calculate`).then((r) => r.data),
 validate: (id: string) => api.post(`/payroll/runs/${id}/validate`).then((r) => r.data),
 pay: (id: string) => api.post(`/payroll/runs/${id}/pay`).then((r) => r.data),
 preview: (grossSalary: number) =>
 api.post('/payroll/preview', { grossSalary }).then((r) => r.data),
 updatePayslipDeductions: (id: string, manualDeductions: number, manualDeductionNote?: string) =>
 api.patch(`/payroll/payslips/${id}`, { manualDeductions, manualDeductionNote }).then((r) => r.data),
 getEmployees: () => api.get('/payroll/employees').then((r) => r.data),
 updateSalary: (id: string, salary: number) =>
 api.patch(`/payroll/employees/${id}`, { salary }).then((r) => r.data),
 payAdvance: (id: string, amount: number, note?: string) =>
 api.post(`/payroll/advance/${id}`, { amount, note }).then((r) => r.data),
 updatePayslipToggles: (id: string, data: any) =>
 api.patch(`/payroll/payslips/${id}/toggles`, data).then((r) => r.data),
 getDeductionTypes: () => api.get('/payroll/deduction-types').then((r) => r.data),
 createDeductionType: (data: any) => api.post('/payroll/deduction-types', data).then((r) => r.data),
 updateDeductionType: (id: string, data: any) => api.patch(`/payroll/deduction-types/${id}`, data).then((r) => r.data),
 deleteDeductionType: (id: string) => api.delete(`/payroll/deduction-types/${id}`).then((r) => r.data),
 bulkUpdateToggles: (runId: string, data: any) =>
 api.patch(`/payroll/runs/${runId}/bulk-toggles`, data).then((r) => r.data),
 payOne: (payslipId: string, date: string) =>
 api.post(`/payroll/payslips/${payslipId}/pay`, { date }).then((r) => r.data),
};

/* ------------------------------------------------------------------ */
/* Hooks */
/* ------------------------------------------------------------------ */

const usePayrollRuns = () =>
 useQuery<PayrollRun[]>({
 queryKey: ['accounting', 'payroll'],
 queryFn: payrollApi.getRuns,
 });

const usePayrollRun = (id: string) =>
 useQuery<PayrollRun>({
 queryKey: ['accounting', 'payroll', id],
 queryFn: () => payrollApi.getRun(id),
 enabled: !!id,
 });

const useCreatePayrollRun = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => payrollApi.create(data),
 onSuccess: () => {
 toast.success('Bulletin de paie cree');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors de la creation'),
 });
};

const useCalculatePayrollRun = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => payrollApi.calculate(id),
 onSuccess: () => {
 toast.success('Calcul des salaires effectue');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors du calcul'),
 });
};

const useValidatePayrollRun = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => payrollApi.validate(id),
 onSuccess: () => {
 toast.success('Paie validee');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors de la validation'),
 });
};

const usePayPayrollRun = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => payrollApi.pay(id),
 onSuccess: () => {
 toast.success('Paiement effectue avec succes');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors du paiement'),
 });
};

const usePayOnePayslip = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, date }: { id: string; date: string }) =>
 payrollApi.payOne(id, date),
 onSuccess: () => {
 toast.success('Salaire verse');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors du paiement'),
 });
};

const usePreviewPayroll = (grossSalary: number) =>
 useQuery<PreviewResult>({
 queryKey: ['accounting', 'payroll', 'preview', grossSalary],
 queryFn: () => payrollApi.preview(grossSalary),
 enabled: grossSalary > 0,
 });

const useUpdatePayslipDeductions = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, manualDeductions, note }: { id: string; manualDeductions: number; note?: string }) =>
 payrollApi.updatePayslipDeductions(id, manualDeductions, note),
 onSuccess: () => {
 toast.success('Retenue manuelle enregistree');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors de la mise a jour'),
 });
};

/* ── Employee hooks ── */

const useEmployees = () =>
 useQuery<SalaryEmployee[]>({
 queryKey: ['payroll', 'employees'],
 queryFn: payrollApi.getEmployees,
 });

const useUpdateSalary = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, salary }: { id: string; salary: number }) =>
 payrollApi.updateSalary(id, salary),
 onSuccess: () => {
 toast.success('Salaire mis a jour');
 qc.invalidateQueries({ queryKey: ['payroll', 'employees'] });
 },
 onError: () => toast.error('Erreur lors de la mise a jour'),
 });
};

const usePayAdvance = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
 payrollApi.payAdvance(id, amount, note),
 onSuccess: () => {
 toast.success('Avance sur salaire enregistree');
 qc.invalidateQueries({ queryKey: ['payroll', 'employees'] });
 },
 onError: () => toast.error("Erreur lors de l'avance"),
 });
};

const useUpdatePayslipToggles = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
 payrollApi.updatePayslipToggles(id, data),
 onSuccess: () => {
 toast.success('Retenues mises a jour');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors de la mise a jour'),
 });
};

const useDeductionTypes = () =>
 useQuery<DeductionType[]>({
 queryKey: ['payroll', 'deduction-types'],
 queryFn: payrollApi.getDeductionTypes,
 });

const useCreateDeductionType = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (data: any) => payrollApi.createDeductionType(data),
 onSuccess: () => {
 toast.success('Type de retenue cree');
 qc.invalidateQueries({ queryKey: ['payroll', 'deduction-types'] });
 },
 onError: () => toast.error('Erreur'),
 });
};

const useUpdateDeductionType = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ id, ...data }: { id: string; [key: string]: any }) =>
 payrollApi.updateDeductionType(id, data),
 onSuccess: () => {
 toast.success('Type de retenue modifie');
 qc.invalidateQueries({ queryKey: ['payroll', 'deduction-types'] });
 },
 onError: () => toast.error('Erreur'),
 });
};

const useDeleteDeductionType = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: (id: string) => payrollApi.deleteDeductionType(id),
 onSuccess: () => {
 toast.success('Type de retenue supprime');
 qc.invalidateQueries({ queryKey: ['payroll', 'deduction-types'] });
 },
 onError: () => toast.error('Erreur'),
 });
};

const useBulkUpdateToggles = () => {
 const qc = useQueryClient();
 return useMutation({
 mutationFn: ({ runId, ...data }: { runId: string; [key: string]: any }) =>
 payrollApi.bulkUpdateToggles(runId, data),
 onSuccess: () => {
 toast.success('Retenues mises a jour en masse');
 qc.invalidateQueries({ queryKey: ['accounting', 'payroll'] });
 },
 onError: () => toast.error('Erreur lors de la mise a jour'),
 });
};

/* ------------------------------------------------------------------ */
/* Create Run Modal */
/* ------------------------------------------------------------------ */

const CreateRunModal = ({ onClose }: { onClose: () => void }) => {
 const createMut = useCreatePayrollRun();
 const now = new Date();

 const [form, setForm] = useState({
 month: String(now.getMonth() + 1),
 year: String(now.getFullYear()),
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

 const handleSubmit = () => {
 if (createMut.isPending) return;
 createMut.mutate(
 { month: Number(form.month), year: Number(form.year) },
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
 className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
 >
 <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
 <Wallet size={20} className="text-[#33cbcc]"/>
 </div>
 <h2 className="text-lg font-bold text-gray-800">Nouvelle paie</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <X size={18} />
 </button>
 </div>

 <div className="p-6 space-y-4">
 <div>
 <label className={labelCls}>Mois</label>
 <select
 value={form.month}
 onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
 className={inputCls + ' appearance-none cursor-pointer'}
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
 value={form.year}
 onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
 className={inputCls}
 />
 </div>
 </div>

 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
 <button
 onClick={onClose}
 className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={createMut.isPending}
 onClick={handleSubmit}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {createMut.isPending ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16} />}
 Creer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Pay Confirmation Modal */
/* ------------------------------------------------------------------ */

const PayConfirmModal = ({
 onClose,
 onConfirm,
 isPending,
}: {
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
 className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl p-6 w-full max-w-sm"
 >
 <div className="flex items-center gap-3 mb-4">
 <div className="p-2.5 rounded-xl bg-[#33cbcc]/10">
 <CreditCard size={20} className="text-[#33cbcc]"/>
 </div>
 <h3 className="text-base font-semibold text-gray-800">Confirmer le paiement</h3>
 </div>
 <p className="text-sm text-gray-500 mb-6">
 Etes-vous sur de vouloir proceder au paiement ? Cette action est irreversible.
 </p>
 <div className="flex gap-3 justify-end">
 <button
 onClick={onClose}
 className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
 >
 Annuler
 </button>
 <button
 onClick={onConfirm}
 disabled={isPending}
 className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors disabled:opacity-50"
 >
 {isPending && <Loader2 size={14} className="animate-spin"/>}
 Payer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Bulk Action Bar */
/* ------------------------------------------------------------------ */

const BulkActionBar = ({
 payslips,
 selectedIds,
 setSelectedIds,
 runId,
}: {
 payslips: Payslip[];
 selectedIds: Set<string>;
 setSelectedIds: (ids: Set<string>) => void;
 runId: string;
}) => {
 const bulkMut = useBulkUpdateToggles();
 const { data: deductionTypes = [] } = useDeductionTypes();
 const [showAddDeduction, setShowAddDeduction] = useState(false);
 const [selectedType, setSelectedType] = useState('');
 const [customAmount, setCustomAmount] = useState('');

 // Get unique departments from payslips
 const departments = useMemo(() => {
 const deptMap = new Map<string, string>();
 payslips.forEach((ps) => {
 const deptName = ps.employee?.department?.name;
 if (deptName) deptMap.set(deptName, deptName);
 });
 return Array.from(deptMap.values()).sort();
 }, [payslips]);

 // Get all custom deduction names present on selected payslips
 const existingCustomNames = useMemo(() => {
 const names = new Set<string>();
 payslips
 .filter((ps) => selectedIds.has(ps.id))
 .forEach((ps) => {
 (ps.customDeductions || []).forEach((d) => names.add(d.name));
 });
 return Array.from(names).sort();
 }, [payslips, selectedIds]);

 const selectByDepartment = (deptName: string) => {
 const ids = new Set(
 payslips
 .filter((ps) => ps.employee?.department?.name === deptName)
 .map((ps) => ps.id),
 );
 setSelectedIds(ids);
 };

 const applyToggle = (key: string, value: boolean) => {
 bulkMut.mutate({
 runId,
 payslipIds: Array.from(selectedIds),
 toggles: { [key]: value },
 }, {
 onSuccess: () => setSelectedIds(new Set()),
 });
 };

 const addCustomDeduction = () => {
 const dt = deductionTypes.find((d) => d.id === selectedType);
 if (!dt) return;
 const amount = customAmount
 ? parseFloat(customAmount)
 : dt.isPercentage
 ? 0
 : dt.defaultAmount;
 if (amount <= 0) return;
 bulkMut.mutate({
 runId,
 payslipIds: Array.from(selectedIds),
 customDeductionAction: { type: 'add', deduction: { name: dt.name, amount } },
 }, {
 onSuccess: () => {
 setShowAddDeduction(false);
 setSelectedType('');
 setCustomAmount('');
 setSelectedIds(new Set());
 },
 });
 };

 const removeCustomDeduction = (name: string) => {
 bulkMut.mutate({
 runId,
 payslipIds: Array.from(selectedIds),
 customDeductionAction: { type: 'remove', name },
 }, {
 onSuccess: () => setSelectedIds(new Set()),
 });
 };

 if (selectedIds.size === 0) return null;

 return (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="bg-white rounded-2xl border p-4 space-y-3"
 >
 {/* Top row: selection info + department filter */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 text-sm font-semibold text-[#33cbcc]">
 <CheckSquare size={16} />
 {selectedIds.size} employe{selectedIds.size > 1 ? 's' : ''} selectionne{selectedIds.size > 1 ? 's' : ''}
 </div>
 <button
 onClick={() => setSelectedIds(new Set(payslips.map((ps) => ps.id)))}
 className="text-xs text-gray-500 hover:text-[#33cbcc] transition-colors"
 >
 Tout
 </button>
 <button
 onClick={() => setSelectedIds(new Set())}
 className="text-xs text-gray-500 hover:text-[#283852] transition-colors"
 >
 Aucun
 </button>
 </div>

 {departments.length > 0 && (
 <div className="flex items-center gap-2">
 <ListFilter size={14} className="text-gray-400"/>
 <select
 onChange={(e) => {
 if (e.target.value) selectByDepartment(e.target.value);
 e.target.value = '';
 }}
 className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#33cbcc]/30 cursor-pointer"
 defaultValue=""
 >
 <option value=""disabled>Par departement...</option>
 {departments.map((d) => (
 <option key={d} value={d}>{d}</option>
 ))}
 </select>
 </div>
 )}
 </div>

 {/* Toggle buttons */}
 <div className="flex flex-wrap gap-2">
 <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider self-center mr-1">Retenues:</span>

 {/* All ON/OFF buttons */}
 <div className="flex items-center rounded-lg overflow-hidden border-2 border-[#33cbcc]">
 <button
 onClick={() => {
 bulkMut.mutate({
 runId,
 payslipIds: Array.from(selectedIds),
 toggles: {
 includeCnps: true,
 includeCfc: true,
 includeIrpp: true,
 includeCommunalTax: true,
 },
 }, {
 onSuccess: () => setSelectedIds(new Set()),
 });
 }}
 disabled={bulkMut.isPending}
 className="px-3 py-1.5 text-xs font-bold bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors disabled:opacity-50"
 >
 TOUT ON
 </button>
 <button
 onClick={() => {
 bulkMut.mutate({
 runId,
 payslipIds: Array.from(selectedIds),
 toggles: {
 includeCnps: false,
 includeCfc: false,
 includeIrpp: false,
 includeCommunalTax: false,
 },
 }, {
 onSuccess: () => setSelectedIds(new Set()),
 });
 }}
 disabled={bulkMut.isPending}
 className="px-3 py-1.5 text-xs font-bold bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
 >
 TOUT OFF
 </button>
 </div>

 <div className="border-l border-gray-200 mx-1"/>

 {[
 { key: 'includeCnps', label: 'CNPS' },
 { key: 'includeCfc', label: 'CFC' },
 { key: 'includeIrpp', label: 'IRPP' },
 { key: 'includeCommunalTax', label: 'T.Comm' },
 ].map(({ key, label }) => (
 <div key={key} className="flex items-center rounded-lg overflow-hidden border border-gray-200">
 <button
 onClick={() => applyToggle(key, true)}
 disabled={bulkMut.isPending}
 className="px-2.5 py-1.5 text-xs font-medium bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors disabled:opacity-50"
 >
 {label} ON
 </button>
 <button
 onClick={() => applyToggle(key, false)}
 disabled={bulkMut.isPending}
 className="px-2.5 py-1.5 text-xs font-medium bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
 >
 OFF
 </button>
 </div>
 ))}

 <div className="border-l border-gray-200 mx-1"/>

 {/* Add custom deduction */}
 <div className="relative">
 <button
 onClick={() => setShowAddDeduction(!showAddDeduction)}
 disabled={bulkMut.isPending}
 className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors border border-gray-200 disabled:opacity-50"
 >
 <Plus size={12} />
 Retenue
 </button>
 {showAddDeduction && (
 <div className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-gray-200 p-3 z-10 w-64 space-y-2">
 <select
 value={selectedType}
 onChange={(e) => {
 setSelectedType(e.target.value);
 const dt = deductionTypes.find((d) => d.id === e.target.value);
 if (dt) {
 setCustomAmount(String(dt.isPercentage ? 0 : dt.defaultAmount));
 }
 }}
 className={inputCls + ' !text-xs !py-1.5'}
 >
 <option value="">Choisir un type...</option>
 {deductionTypes.filter((d) => d.isActive).map((dt) => (
 <option key={dt.id} value={dt.id}>{dt.name}</option>
 ))}
 </select>
 <input
 type="number"
 value={customAmount}
 onChange={(e) => setCustomAmount(e.target.value)}
 placeholder="Montant"
 className={inputCls + ' !text-xs !py-1.5'}
 />
 <div className="flex gap-2">
 <button
 onClick={() => setShowAddDeduction(false)}
 className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 onClick={addCustomDeduction}
 disabled={!selectedType || !customAmount || bulkMut.isPending}
 className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-[#283852] text-white hover:bg-[#283852] transition-colors disabled:opacity-50"
 >
 Ajouter
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Remove custom deduction */}
 {existingCustomNames.length > 0 && (
 <select
 onChange={(e) => {
 if (e.target.value) removeCustomDeduction(e.target.value);
 e.target.value = '';
 }}
 className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-[#283852] bg-[#283852]/10 focus:outline-none focus:ring-1 focus:ring-[#33cbcc]/30 cursor-pointer"
 defaultValue=""
 >
 <option value=""disabled>Retirer retenue...</option>
 {existingCustomNames.map((n) => (
 <option key={n} value={n}>{n}</option>
 ))}
 </select>
 )}
 </div>

 {bulkMut.isPending && (
 <div className="flex items-center gap-2 text-xs text-gray-500">
 <Loader2 size={14} className="animate-spin"/>
 Mise a jour en cours...
 </div>
 )}
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Pay One Modal */
/* ------------------------------------------------------------------ */

const PayOneModal = ({
 payslip,
 onClose,
}: {
 payslip: Payslip;
 onClose: () => void;
}) => {
 const payOneMut = usePayOnePayslip();
 const today = new Date().toISOString().split('T')[0];
 const [date, setDate] = useState(today);
 const empName = payslip.employee
 ? `${payslip.employee.firstName} ${payslip.employee.lastName}`
 : '';

 useEffect(() => {
 const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
 document.addEventListener('keydown', handleKey);
 return () => document.removeEventListener('keydown', handleKey);
 }, [onClose]);

 const handleConfirm = () => {
 payOneMut.mutate({ id: payslip.id, date }, { onSuccess: onClose });
 };

 return (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-sm p-6"
 >
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
 <CreditCard size={18} className="text-[#33cbcc]"/>
 </div>
 <div>
 <h3 className="font-bold text-gray-800">Payer le salaire</h3>
 <p className="text-xs text-gray-500">{empName}</p>
 </div>
 </div>

 <div className="bg-gray-50 rounded-xl p-3 mb-4 flex justify-between items-center">
 <span className="text-sm text-gray-600">Net a payer</span>
 <span className="text-lg font-bold text-[#33cbcc]">{formatXAF(payslip.netSalary)}</span>
 </div>

 <div className="mb-5">
 <label className={labelCls}>Date de paiement</label>
 <input
 type="date"
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className={inputCls}
 />
 </div>

 <div className="flex gap-3">
 <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
 Annuler
 </button>
 <button
 onClick={handleConfirm}
 disabled={payOneMut.isPending || !date}
 className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors disabled:opacity-50"
 >
 {payOneMut.isPending ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
 Confirmer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Payroll Detail View */
/* ------------------------------------------------------------------ */

const PayrollDetail = ({
 runId,
 onBack,
}: {
 runId: string;
 onBack: () => void;
}) => {
 const { data: run, isLoading } = usePayrollRun(runId);
 const calculateMut = useCalculatePayrollRun();
 const validateMut = useValidatePayrollRun();
 const payMut = usePayPayrollRun();
 const deductionMut = useUpdatePayslipDeductions();
 const [showPayConfirm, setShowPayConfirm] = useState(false);
 const [editingDeduction, setEditingDeduction] = useState<Payslip | null>(null);
 const [editingPayslip, setEditingPayslip] = useState<Payslip | null>(null);
 const [payingPayslip, setPayingPayslip] = useState<Payslip | null>(null);
 const [showDeductionTypes, setShowDeductionTypes] = useState(false);
 const [downloadingId, setDownloadingId] = useState<string | null>(null);
 const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

 const handleDownloadPdf = async (ps: Payslip) => {
 if (!run) return;
 setDownloadingId(ps.id);
 try { await downloadPayslipPdf(ps, run); } catch { /* ignore */ }
 setDownloadingId(null);
 };

 if (isLoading || !run) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 size={24} className="animate-spin text-[#33cbcc]"/>
 </div>
 );
 }

 const status = STATUS_COLORS[run.status] || STATUS_COLORS.DRAFT;
 const payslips = run.payslips || [];
 const paidCount = payslips.filter(ps => ps.paymentDate).length;
 const unpaidCount = payslips.length - paidCount;
 const hasPartialPayments = paidCount > 0 && unpaidCount > 0;

 const totals = payslips.reduce(
 (acc, ps) => ({
 gross: acc.gross + (Number(ps.grossSalary) || 0),
 cnps: acc.cnps + (Number(ps.cnpsEmployee) || 0),
 cfc: acc.cfc + (Number(ps.cfc) || 0),
 irpp: acc.irpp + (Number(ps.irpp) || 0),
 communal: acc.communal + (Number(ps.communalTax) || 0),
 deductions: acc.deductions + (Number(ps.totalDeductions) || 0),
 custom: acc.custom + (ps.customDeductions || []).reduce((s: number, d: { amount: number }) => s + (Number(d.amount) || 0), 0),
 manual: acc.manual + (Number(ps.manualDeductions) || 0),
 net: acc.net + (Number(ps.netSalary) || 0),
 }),
 { gross: 0, cnps: 0, cfc: 0, irpp: 0, communal: 0, deductions: 0, custom: 0, manual: 0, net: 0 },
 );

 const canEditDeductions = run.status === 'CALCULATED';

 return (
 <div className="space-y-6">
 {/* Back + Header */}
 <div className="flex items-center gap-4">
 <button
 onClick={onBack}
 className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <ArrowLeft size={20} />
 </button>
 <div className="flex-1">
 <h2 className="text-xl font-bold text-gray-800">
 Paie {MONTHS[run.month - 1]} {run.year}
 </h2>
 <div className="flex items-center gap-2 mt-1">
 <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
 {status.label}
 </span>
 </div>
 </div>
 <div className="flex gap-2">
 <button
 onClick={() => setShowDeductionTypes(true)}
 className="p-2.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
 title="Gerer les types de retenues"
 >
 <Settings size={18} />
 </button>
 {(run.status === 'DRAFT' || run.status === 'CALCULATED') && (
 <button
 onClick={() => calculateMut.mutate(run.id)}
 disabled={calculateMut.isPending}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors disabled:opacity-50"
 >
 {calculateMut.isPending ? (
 <Loader2 size={16} className="animate-spin"/>
 ) : (
 <Calculator size={16} />
 )}
 {run.status === 'DRAFT' ? 'Calculer' : 'Re-calculer'}
 </button>
 )}
 {run.status === 'CALCULATED' && (
 <button
 onClick={() => validateMut.mutate(run.id)}
 disabled={validateMut.isPending}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors disabled:opacity-50"
 >
 {validateMut.isPending ? (
 <Loader2 size={16} className="animate-spin"/>
 ) : (
 <CheckCircle size={16} />
 )}
 Valider
 </button>
 )}
 {run.status === 'VALIDATED' && (
 <button
 onClick={() => setShowPayConfirm(true)}
 className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors"
 >
 <CreditCard size={16} />
 {hasPartialPayments ? `Payer le reste (${unpaidCount})` : 'Payer tout'}
 </button>
 )}
 </div>
 </div>

 {/* Summary cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white rounded-2xl p-6">
 <p className="text-sm text-gray-500 mb-1">Total Brut</p>
 <p className="text-xl font-bold text-gray-800">{formatXAF(run.totalGross)}</p>
 </div>
 <div className="bg-white rounded-2xl p-6">
 <p className="text-sm text-gray-500 mb-1">Total Net</p>
 <p className="text-xl font-bold text-[#33cbcc]">{formatXAF(run.totalNet)}</p>
 </div>
 <div className="bg-white rounded-2xl p-6">
 <p className="text-sm text-gray-500 mb-1">Charges Patronales</p>
 <p className="text-xl font-bold text-[#283852]">{formatXAF(run.totalEmployerCharges)}</p>
 </div>
 </div>

 {/* Payment progress (VALIDATED with partial payments) */}
 {run.status === 'VALIDATED' && payslips.length > 0 && (
 <div className="bg-white rounded-2xl p-4 flex items-center gap-4">
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1.5">
 <span className="text-sm font-semibold text-gray-700">Progression des paiements</span>
 <span className="text-sm font-bold text-[#33cbcc]">{paidCount} / {payslips.length} payes</span>
 </div>
 <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
 <div
 className="h-full bg-[#33cbcc] rounded-full transition-all duration-500"
 style={{ width: `${payslips.length > 0 ? (paidCount / payslips.length) * 100 : 0}%` }}
 />
 </div>
 </div>
 {paidCount > 0 && (
 <span className="text-xs text-gray-400 shrink-0">
 {Math.round((paidCount / payslips.length) * 100)}%
 </span>
 )}
 </div>
 )}

 {/* Bulk action bar */}
 {canEditDeductions && (
 <AnimatePresence>
 <BulkActionBar
 payslips={payslips}
 selectedIds={selectedIds}
 setSelectedIds={(ids) => setSelectedIds(ids)}
 runId={run.id}
 />
 </AnimatePresence>
 )}

 {/* Payslips table */}
 {payslips.length > 0 ? (
 <div className="bg-white rounded-2xl overflow-hidden">
 <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
 <h3 className="text-sm font-bold text-gray-800">
 Bulletins de paie ({payslips.length} employes)
 </h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left">
 <thead>
 <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 {canEditDeductions && (
 <th className="pl-4 pr-1 py-3 w-8">
 <button
 onClick={() => {
 if (selectedIds.size === payslips.length) {
 setSelectedIds(new Set());
 } else {
 setSelectedIds(new Set(payslips.map((ps) => ps.id)));
 }
 }}
 className="text-gray-400 hover:text-[#33cbcc] transition-colors"
 >
 {selectedIds.size === payslips.length ? (
 <CheckSquare size={15} />
 ) : selectedIds.size > 0 ? (
 <MinusSquare size={15} />
 ) : (
 <Square size={15} />
 )}
 </button>
 </th>
 )}
 <th className="px-6 py-3">Employe</th>
 <th className="px-4 py-3">Departement</th>
 <th className="px-4 py-3 text-right">Brut</th>
 <th className="px-4 py-3 text-right">CNPS</th>
 <th className="px-4 py-3 text-right">CFC</th>
 <th className="px-4 py-3 text-right">IRPP</th>
 <th className="px-4 py-3 text-right">T. Comm.</th>
 <th className="px-4 py-3 text-right">Retenues</th>
 <th className="px-4 py-3 text-right">Ret. Perso.</th>
 <th className="px-4 py-3 text-right">Ret. Man.</th>
 <th className="px-4 py-3 text-right">Net</th>
 {run.status === 'VALIDATED' && <th className="px-4 py-3 text-center">Paiement</th>}
 <th className="px-3 py-3 text-center w-20"></th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50">
 {payslips.map((ps) => (
 <tr key={ps.id} className={`hover:bg-gray-50/50 transition-colors text-sm group/row ${selectedIds.has(ps.id) ? 'bg-[#33cbcc]/5' : ''}`}>
 {canEditDeductions && (
 <td className="pl-4 pr-1 py-2.5">
 <button
 onClick={() => {
 const next = new Set(selectedIds);
 if (next.has(ps.id)) next.delete(ps.id);
 else next.add(ps.id);
 setSelectedIds(next);
 }}
 className="text-gray-400 hover:text-[#33cbcc] transition-colors"
 >
 {selectedIds.has(ps.id) ? (
 <CheckSquare size={15} className="text-[#33cbcc]"/>
 ) : (
 <Square size={15} />
 )}
 </button>
 </td>
 )}
 <td className="px-6 py-2.5 font-semibold text-gray-800">
 <div className="flex items-center gap-1.5">
 {ps.employee
 ? `${ps.employee.firstName} ${ps.employee.lastName}`
 : '--'}
 {((ps.customDeductions?.length || 0) > 0 || !(ps.includeCnps ?? true) || !(ps.includeCfc ?? true) || !(ps.includeIrpp ?? true) || !(ps.includeCommunalTax ?? true)) && (
 <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] flex-shrink-0"title="Retenues personnalisees"/>
 )}
 </div>
 </td>
 <td className="px-4 py-2.5 text-gray-500 text-xs">
 {ps.employee?.department?.name || '--'}
 </td>
 <td className="px-4 py-2.5 text-right font-medium text-gray-800">
 {formatXAF(ps.grossSalary)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF(ps.cnpsEmployee)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF(ps.cfc)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF(ps.irpp)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF(ps.communalTax)}
 </td>
 <td className="px-4 py-2.5 text-right font-medium text-[#283852] text-xs">
 {formatXAF(ps.totalDeductions)}
 </td>
 <td className="px-4 py-2.5 text-right text-xs"
 title={(ps.customDeductions || []).map((d: { name: string; amount: number }) => `${d.name}: ${formatXAF(d.amount)}`).join(', ') || undefined}
 >
 {(ps.customDeductions?.length || 0) > 0 ? (
 <span className="font-medium text-[#283852]">
 {formatXAF((ps.customDeductions || []).reduce((s: number, d: { amount: number }) => s + d.amount, 0))}
 </span>
 ) : (
 <span className="text-gray-400">{'\u2014'}</span>
 )}
 </td>
 <td className="px-4 py-2.5 text-right text-xs">
 <div className="flex items-center justify-end gap-1">
 <span className={`font-medium ${(ps.manualDeductions || 0) > 0 ? 'text-[#283852]' : 'text-gray-400'}`}
 title={ps.manualDeductionNote || undefined}
 >
 {(ps.manualDeductions || 0) > 0 ? formatXAF(ps.manualDeductions) : '\u2014'}
 </span>
 {canEditDeductions && (
 <button
 onClick={() => setEditingDeduction(ps)}
 className="p-1 rounded-md text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 opacity-0 group-hover/row:opacity-100 transition-all"
 title="Modifier retenue manuelle"
 >
 <Pencil size={12} />
 </button>
 )}
 </div>
 </td>
 <td className="px-4 py-2.5 text-right font-bold text-[#33cbcc]">
 {formatXAF(ps.netSalary)}
 </td>
 {run.status === 'VALIDATED' && (
 <td className="px-4 py-2.5 text-center">
 {ps.paymentDate ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#33cbcc]/10 text-[#33cbcc] text-[11px] font-semibold">
 <Check size={10}/>
 {new Date(ps.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
 </span>
 ) : (
 <button
 onClick={() => setPayingPayslip(ps)}
 className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors"
 >
 <CreditCard size={11}/>
 Payer
 </button>
 )}
 </td>
 )}
 <td className="px-3 py-2.5 text-center">
 <div className="flex items-center gap-0.5 justify-center">
 {canEditDeductions && (
 <button
 onClick={() => setEditingPayslip(ps)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all"
 title="Modifier les retenues"
 >
 <Settings size={13} />
 </button>
 )}
 {(run.status === 'CALCULATED' || run.status === 'VALIDATED' || run.status === 'PAID') && (
 <button
 onClick={() => handleDownloadPdf(ps)}
 disabled={downloadingId === ps.id}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all disabled:opacity-50"
 title="Telecharger la fiche de paie"
 >
 {downloadingId === ps.id
 ? <Loader2 size={13} className="animate-spin"/>
 : <Download size={13} />}
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 <tfoot>
 <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold text-sm">
 <td className="px-6 py-3 text-gray-800"colSpan={canEditDeductions ? 3 : 2}>
 Totaux
 </td>
 <td className="px-4 py-3 text-right text-gray-800">
 {formatXAF(totals.gross)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.cnps)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.cfc)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.irpp)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.communal)}
 </td>
 <td className="px-4 py-3 text-right text-[#283852] text-xs">
 {formatXAF(totals.deductions)}
 </td>
 <td className="px-4 py-3 text-right text-[#283852] text-xs">
 {totals.custom > 0 ? formatXAF(totals.custom) : '\u2014'}
 </td>
 <td className="px-4 py-3 text-right text-[#283852] text-xs">
 {totals.manual > 0 ? formatXAF(totals.manual) : '\u2014'}
 </td>
 <td className="px-4 py-3 text-right text-[#33cbcc]">
 {formatXAF(totals.net)}
 </td>
 {run.status === 'VALIDATED' && <td className="px-4 py-3"></td>}
 <td className="px-3 py-3"></td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>
 ) : (
 <div className="bg-white rounded-2xl p-12 text-center">
 <Users size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-400 font-medium">Aucun bulletin de paie</p>
 <p className="text-sm text-gray-400 mt-1">
 Cliquez sur"Calculer"pour generer les bulletins.
 </p>
 </div>
 )}

 <AnimatePresence>
 {showPayConfirm && (
 <PayConfirmModal
 onClose={() => setShowPayConfirm(false)}
 onConfirm={() => {
 payMut.mutate(run.id, { onSuccess: () => setShowPayConfirm(false) });
 }}
 isPending={payMut.isPending}
 />
 )}
 {payingPayslip && (
 <PayOneModal
 payslip={payingPayslip}
 onClose={() => setPayingPayslip(null)}
 />
 )}
 {editingDeduction && (
 <ManualDeductionModal
 payslip={editingDeduction}
 onClose={() => setEditingDeduction(null)}
 onSave={(amount, note) => {
 deductionMut.mutate(
 { id: editingDeduction.id, manualDeductions: amount, note },
 { onSuccess: () => setEditingDeduction(null) },
 );
 }}
 isPending={deductionMut.isPending}
 />
 )}
 {editingPayslip && (
 <PayslipEditModal
 payslip={editingPayslip}
 onClose={() => setEditingPayslip(null)}
 />
 )}
 {showDeductionTypes && (
 <DeductionTypeManager onClose={() => setShowDeductionTypes(false)} />
 )}
 </AnimatePresence>
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Manual Deduction Modal */
/* ------------------------------------------------------------------ */

const ManualDeductionModal = ({
 payslip,
 onClose,
 onSave,
 isPending,
}: {
 payslip: Payslip;
 onClose: () => void;
 onSave: (amount: number, note?: string) => void;
 isPending: boolean;
}) => {
 const [amount, setAmount] = useState(String(payslip.manualDeductions || 0));
 const [note, setNote] = useState(payslip.manualDeductionNote || '');
 const empName = payslip.employee
 ? `${payslip.employee.firstName} ${payslip.employee.lastName}`
 : '';

 return (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-sm p-6"
 >
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center">
 <Pencil size={18} className="text-[#283852]"/>
 </div>
 <div>
 <h3 className="font-bold text-gray-800">Retenue manuelle</h3>
 <p className="text-xs text-gray-500">{empName} - Brut : {formatXAF(payslip.grossSalary)}</p>
 </div>
 </div>
 <div className="space-y-3 mb-5">
 <div>
 <label className={labelCls}>Montant de la retenue</label>
 <input
 type="number"min="0"value={amount} onChange={(e) => setAmount(e.target.value)}
 autoFocus
 className={inputCls}
 />
 <p className="text-xs text-gray-400 mt-1">
 Retenues auto : {formatXAF(payslip.totalDeductions)} - Net actuel : {formatXAF(payslip.netSalary)}
 </p>
 </div>
 <div>
 <label className={labelCls}>Motif (optionnel)</label>
 <input
 type="text"value={note} onChange={(e) => setNote(e.target.value)}
 placeholder="Ex: Remboursement pret, retenue disciplinaire..."
 className={inputCls}
 />
 </div>
 </div>
 <div className="flex gap-3">
 <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
 Annuler
 </button>
 <button
 onClick={() => onSave(parseFloat(amount) || 0, note || undefined)}
 disabled={isPending}
 className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors disabled:opacity-60"
 >
 {isPending ? 'En cours...' : 'Enregistrer'}
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Payslip Edit Modal (Toggles + Custom Deductions) */
/* ------------------------------------------------------------------ */

const PayslipEditModal = ({
 payslip,
 onClose,
}: {
 payslip: Payslip;
 onClose: () => void;
}) => {
 const togglesMut = useUpdatePayslipToggles();
 const { data: deductionTypes = [] } = useDeductionTypes();

 const [toggles, setToggles] = useState({
 includeCnps: payslip.includeCnps ?? true,
 includeCfc: payslip.includeCfc ?? true,
 includeIrpp: payslip.includeIrpp ?? true,
 includeCommunalTax: payslip.includeCommunalTax ?? true,
 });
 const [customDeductions, setCustomDeductions] = useState<{ name: string; amount: number }[]>(
 payslip.customDeductions || [],
 );
 const [selectedType, setSelectedType] = useState('');
 const [customAmount, setCustomAmount] = useState('');

 const empName = payslip.employee
 ? `${payslip.employee.firstName} ${payslip.employee.lastName}`
 : '';

 const addCustomDeduction = () => {
 const dt = deductionTypes.find((d) => d.id === selectedType);
 if (!dt) return;
 const amount = customAmount
 ? parseFloat(customAmount)
 : dt.isPercentage
 ? Math.round(Number(payslip.grossSalary) * dt.defaultAmount / 100)
 : dt.defaultAmount;
 setCustomDeductions((prev) => [...prev, { name: dt.name, amount }]);
 setSelectedType('');
 setCustomAmount('');
 };

 const removeCustomDeduction = (index: number) => {
 setCustomDeductions((prev) => prev.filter((_, i) => i !== index));
 };

 const handleSave = () => {
 togglesMut.mutate(
 { id: payslip.id, ...toggles, customDeductions },
 { onSuccess: onClose },
 );
 };

 const toggleItems = [
 { key: 'includeCnps' as const, label: 'CNPS (2.8%)', desc: 'Caisse Nationale de Prevoyance Sociale' },
 { key: 'includeCfc' as const, label: 'CFC (1%)', desc: 'Credit Foncier du Cameroun' },
 { key: 'includeIrpp' as const, label: 'IRPP', desc: 'Impot sur le Revenu des Personnes Physiques' },
 { key: 'includeCommunalTax' as const, label: 'T. Communale', desc: 'Taxe Communale (10% IRPP)' },
 ];

 return (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
 >
 <div className="px-6 py-5 border-b border-gray-100">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
 <Settings size={20} className="text-[#33cbcc]"/>
 </div>
 <div>
 <h2 className="text-lg font-bold text-gray-800">Retenues</h2>
 <p className="text-xs text-gray-500">{empName} — Brut: {formatXAF(payslip.grossSalary)}</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
 <X size={18} />
 </button>
 </div>
 </div>

 <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
 {/* Statutory toggles */}
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
 Retenues legales
 </p>
 <div className="space-y-3">
 {toggleItems.map((item) => (
 <div key={item.key} className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-gray-800">{item.label}</p>
 <p className="text-[11px] text-gray-400">{item.desc}</p>
 </div>
 <button
 type="button"
 onClick={() => setToggles((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
 className={`relative w-11 h-6 rounded-full transition-colors ${
 toggles[item.key] ? 'bg-[#33cbcc]' : 'bg-gray-300'
 }`}
 >
 <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
 toggles[item.key] ? 'translate-x-5' : ''
 }`} />
 </button>
 </div>
 ))}
 </div>
 </div>

 {/* Custom deductions */}
 <div>
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
 Retenues personnalisees
 </p>

 {customDeductions.length > 0 && (
 <div className="space-y-2 mb-3">
 {customDeductions.map((d, i) => (
 <div key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-xl group">
 <div className="flex items-center gap-2">
 <span className="text-sm text-gray-700">{d.name}</span>
 <span className="text-xs font-semibold text-[#283852]">-{formatXAF(d.amount)}</span>
 </div>
 <button
 onClick={() => removeCustomDeduction(i)}
 className="p-1 rounded-md text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 opacity-0 group-hover:opacity-100 transition-all"
 >
 <Trash2 size={13} />
 </button>
 </div>
 ))}
 </div>
 )}

 {deductionTypes.filter((d) => d.isActive).length > 0 ? (
 <div className="flex gap-2">
 <select
 value={selectedType}
 onChange={(e) => {
 setSelectedType(e.target.value);
 const dt = deductionTypes.find((d) => d.id === e.target.value);
 if (dt) {
 setCustomAmount(String(
 dt.isPercentage
 ? Math.round(Number(payslip.grossSalary) * dt.defaultAmount / 100)
 : dt.defaultAmount,
 ));
 }
 }}
 className={inputCls + ' flex-1 appearance-none cursor-pointer'}
 >
 <option value="">Choisir un type...</option>
 {deductionTypes.filter((d) => d.isActive).map((dt) => (
 <option key={dt.id} value={dt.id}>{dt.name}</option>
 ))}
 </select>
 <input
 type="number"
 value={customAmount}
 onChange={(e) => setCustomAmount(e.target.value)}
 placeholder="Montant"
 className={inputCls + ' w-28'}
 />
 <button
 onClick={addCustomDeduction}
 disabled={!selectedType || !customAmount}
 className="px-3 py-2 rounded-xl text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 <Plus size={16} />
 </button>
 </div>
 ) : (
 <p className="text-xs text-gray-400">
 Aucun type de retenue configure. Ajoutez-en via le bouton parametres.
 </p>
 )}
 </div>
 </div>

 <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
 Annuler
 </button>
 <button
 onClick={handleSave}
 disabled={togglesMut.isPending}
 className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {togglesMut.isPending ? <Loader2 size={16} className="animate-spin"/> : <Check size={16} />}
 Enregistrer
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Deduction Type Manager */
/* ------------------------------------------------------------------ */

const DeductionTypeManager = ({ onClose }: { onClose: () => void }) => {
 const { data: types = [], isLoading } = useDeductionTypes();
 const createMut = useCreateDeductionType();
 const updateMut = useUpdateDeductionType();
 const deleteMut = useDeleteDeductionType();
 const [name, setName] = useState('');
 const [amount, setAmount] = useState('');
 const [isPercentage, setIsPercentage] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editName, setEditName] = useState('');
 const [editAmount, setEditAmount] = useState('');
 const [editIsPercentage, setEditIsPercentage] = useState(false);

 const handleAdd = () => {
 if (!name.trim() || !amount) return;
 createMut.mutate(
 { name: name.trim(), defaultAmount: parseFloat(amount), isPercentage },
 { onSuccess: () => { setName(''); setAmount(''); setIsPercentage(false); } },
 );
 };

 const startEdit = (dt: DeductionType) => {
 setEditingId(dt.id);
 setEditName(dt.name);
 setEditAmount(String(dt.defaultAmount));
 setEditIsPercentage(dt.isPercentage);
 };

 const saveEdit = () => {
 if (!editingId || !editName.trim() || !editAmount) return;
 updateMut.mutate(
 { id: editingId, name: editName.trim(), defaultAmount: parseFloat(editAmount), isPercentage: editIsPercentage },
 { onSuccess: () => setEditingId(null) },
 );
 };

 return (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
 >
 <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
 <Settings size={20} className="text-gray-600"/>
 </div>
 <h2 className="text-lg font-bold text-gray-800">Types de retenues</h2>
 </div>
 <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
 <X size={18} />
 </button>
 </div>

 <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
 {isLoading ? (
 <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-gray-400"/></div>
 ) : types.length === 0 ? (
 <p className="text-sm text-gray-400 text-center py-4">Aucun type de retenue</p>
 ) : (
 <div className="space-y-2">
 {types.map((dt) =>
 editingId === dt.id ? (
 <div key={dt.id} className="flex items-center gap-2 px-3 py-2.5 bg-[#33cbcc]/5 rounded-xl border">
 <input type="text"value={editName} onChange={(e) => setEditName(e.target.value)}
 autoFocus
 className={inputCls + ' flex-1 !py-1.5 !text-xs'}
 onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
 />
 <input type="number"value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
 className={inputCls + ' w-24 !py-1.5 !text-xs'}
 onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
 />
 <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
 <input type="checkbox"checked={editIsPercentage} onChange={(e) => setEditIsPercentage(e.target.checked)}
 className="rounded border-gray-300"/>
 %
 </label>
 <button onClick={saveEdit} disabled={updateMut.isPending}
 className="p-1.5 rounded-lg bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors">
 <Check size={14} />
 </button>
 <button onClick={() => setEditingId(null)}
 className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
 <X size={14} />
 </button>
 </div>
 ) : (
 <div key={dt.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl group">
 <div>
 <p className="text-sm font-medium text-gray-800">{dt.name}</p>
 <p className="text-xs text-gray-400">
 {dt.isPercentage ? `${dt.defaultAmount}%` : formatXAF(dt.defaultAmount)}
 </p>
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
 <button onClick={() => startEdit(dt)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all">
 <Pencil size={14} />
 </button>
 <button onClick={() => deleteMut.mutate(dt.id)} disabled={deleteMut.isPending}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-all">
 <Trash2 size={14} />
 </button>
 </div>
 </div>
 )
 )}
 </div>
 )}

 <div className="border-t border-gray-100 pt-4">
 <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Ajouter un type</p>
 <div className="flex gap-2">
 <input
 type="text"value={name} onChange={(e) => setName(e.target.value)}
 placeholder="Nom (ex: Assurance)"
 className={inputCls + ' flex-1'}
 />
 <input
 type="number"value={amount} onChange={(e) => setAmount(e.target.value)}
 placeholder="Montant"
 className={inputCls + ' w-28'}
 />
 <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
 <input type="checkbox"checked={isPercentage} onChange={(e) => setIsPercentage(e.target.checked)}
 className="rounded border-gray-300"/>
 %
 </label>
 <button
 onClick={handleAdd}
 disabled={!name.trim() || !amount || createMut.isPending}
 className="px-3 py-2 rounded-xl text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 <Plus size={16} />
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Preview Calculator */
/* ------------------------------------------------------------------ */

const PreviewCalculator = () => {
 const [grossInput, setGrossInput] = useState('');
 const gross = Number(grossInput) || 0;
 const { data: preview, isLoading } = usePreviewPayroll(gross);

 return (
 <div className="bg-white rounded-2xl p-6">
 <div className="flex items-center gap-2 mb-4">
 <Calculator size={18} className="text-[#33cbcc]"/>
 <h3 className="text-sm font-bold text-gray-800">Simulateur de salaire</h3>
 </div>

 <div className="flex items-center gap-4 mb-4">
 <div className="flex-1">
 <label className={labelCls}>Salaire brut</label>
 <div className="relative">
 <input
 type="number"
 min="0"
 value={grossInput}
 onChange={(e) => setGrossInput(e.target.value)}
 placeholder="Entrer le salaire brut..."
 className={inputCls}
 />
 </div>
 </div>
 </div>

 {isLoading && gross > 0 && (
 <div className="flex items-center justify-center py-6">
 <Loader2 size={20} className="animate-spin text-[#33cbcc]"/>
 </div>
 )}

 {preview && gross > 0 && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-gray-50 rounded-xl p-4 space-y-2"
 >
 <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
 Retenues salariales
 </h4>
 <div className="space-y-1.5">
 {[
 { label: 'Salaire Brut', value: preview.grossSalary, bold: true },
 { label: 'CNPS (Employe)', value: -preview.cnpsEmployee },
 { label: 'CFC', value: -preview.cfc },
 { label: 'IRPP', value: -preview.irpp },
 { label: 'Taxe Communale', value: -preview.communalTax },
 ].map((item, i) => (
 <div key={i} className="flex justify-between text-sm">
 <span className={item.bold ? 'font-semibold text-gray-800' : 'text-gray-500'}>
 {item.label}
 </span>
 <span
 className={
 item.bold
 ? 'font-bold text-gray-800'
 : item.value < 0
 ? 'text-[#283852]'
 : 'text-gray-800'
 }
 >
 {item.value < 0 ? '- ' : ''}
 {formatXAF(Math.abs(item.value))}
 </span>
 </div>
 ))}
 </div>
 <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
 <span className="font-semibold text-gray-700">Total Retenues</span>
 <span className="font-bold text-[#283852]">- {formatXAF(preview.totalDeductions)}</span>
 </div>
 <div className="border-t-2 border-gray-300 pt-3 mt-3 flex justify-between">
 <span className="font-bold text-gray-800">Salaire Net</span>
 <span className="text-lg font-bold text-[#33cbcc]">{formatXAF(preview.netSalary)}</span>
 </div>

 <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">
 Charges patronales
 </h4>
 <div className="space-y-1.5">
 {[
 { label: 'CNPS (Employeur)', value: preview.cnpsEmployer },
 ].map((item, i) => (
 <div key={i} className="flex justify-between text-sm">
 <span className="text-gray-500">{item.label}</span>
 <span className="text-[#283852]">{formatXAF(item.value)}</span>
 </div>
 ))}
 <div className="border-t border-gray-200 pt-2 flex justify-between">
 <span className="font-semibold text-gray-700">Total Charges Patronales</span>
 <span className="font-bold text-[#283852]">
 {formatXAF(preview.totalEmployerCharges)}
 </span>
 </div>
 </div>
 </motion.div>
 )}
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Advance Modal */
/* ------------------------------------------------------------------ */

const AdvanceModal = ({ emp, onClose }: { emp: SalaryEmployee; onClose: () => void }) => {
 const [amount, setAmount] = useState('');
 const [note, setNote] = useState('');
 const payAdvance = usePayAdvance();
 const isValid = parseFloat(amount) > 0;

 return (
 <motion.div
 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
 >
 <motion.div
 initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white rounded-2xl w-full max-w-sm p-6"
 >
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center">
 <HandCoins size={18} className="text-[#283852]"/>
 </div>
 <div>
 <h3 className="font-bold text-gray-800">Avance sur salaire</h3>
 <p className="text-xs text-gray-500">{emp.firstName} {emp.lastName}</p>
 </div>
 </div>
 <div className="space-y-3 mb-5">
 <div>
 <label className={labelCls}>Montant</label>
 <input
 type="number"min="1"value={amount} onChange={(e) => setAmount(e.target.value)}
 placeholder="0"autoFocus
 className={inputCls}
 />
 {emp.salary > 0 && (
 <p className="text-xs text-gray-400 mt-1">Salaire mensuel : {formatXAF(emp.salary)}</p>
 )}
 </div>
 <div>
 <label className={labelCls}>Note (optionnel)</label>
 <input
 type="text"value={note} onChange={(e) => setNote(e.target.value)}
 placeholder="Motif de l'avance..."
 className={inputCls}
 />
 </div>
 </div>
 <div className="flex gap-3">
 <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
 <button
 onClick={() => payAdvance.mutate({ id: emp.id, amount: parseFloat(amount), note: note || undefined }, { onSuccess: () => onClose() })}
 disabled={!isValid || payAdvance.isPending}
 className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors disabled:opacity-60"
 >
 {payAdvance.isPending ? 'En cours...' : 'Payer l\'avance'}
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Salary Row */
/* ------------------------------------------------------------------ */

const SalaryRow = ({ emp }: { emp: SalaryEmployee }) => {
 const [editing, setEditing] = useState(false);
 const [value, setValue] = useState(String(emp.salary));
 const [showAdvanceModal, setShowAdvanceModal] = useState(false);
 const updateSalary = useUpdateSalary();

 const save = () => {
 const salary = parseFloat(value);
 if (isNaN(salary) || salary < 0) return;
 updateSalary.mutate({ id: emp.id, salary }, { onSuccess: () => setEditing(false) });
 };

 const cancel = () => { setValue(String(emp.salary)); setEditing(false); };

 return (
 <>
 <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors group">
 <td className="px-6 py-4">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-full bg-[#33cbcc]/20 flex items-center justify-center text-sm font-bold text-[#33cbcc]">
 {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
 </div>
 <span className="font-medium text-gray-800">{emp.firstName} {emp.lastName}</span>
 </div>
 </td>
 <td className="px-6 py-4 text-sm text-gray-500">{emp.departmentName || '\u2014'}</td>
 <td className="px-6 py-4">
 <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
 emp.role === 'MANAGER' ? 'bg-[#283852]/10 text-[#283852]' :
 emp.role === 'ACCOUNTANT' ? 'bg-[#283852]/10 text-[#283852]' :
 emp.role === 'HEAD_OF_DEPARTMENT' ? 'bg-[#283852]/10 text-[#283852]' :
 'bg-gray-100 text-gray-600'
 }`}>
 {emp.role}
 </span>
 </td>
 <td className="px-6 py-4">
 {editing ? (
 <div className="flex items-center gap-2">
 <input
 type="number"min="0"value={value} onChange={(e) => setValue(e.target.value)}
 onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
 autoFocus
 className="w-36 px-3 py-1.5 text-sm border border-[#33cbcc] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30"
 />
 <button onClick={save} disabled={updateSalary.isPending} className="p-1.5 rounded-lg bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors">
 <Check size={14} />
 </button>
 <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
 <X size={14} />
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 group/sal">
 <span className="font-semibold text-gray-800">
 {emp.salary > 0 ? formatXAF(emp.salary) : <span className="text-gray-400 font-normal">Non defini</span>}
 </span>
 <button onClick={() => setEditing(true)}
 className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 opacity-0 group-hover/sal:opacity-100 transition-all">
 <Pencil size={13} />
 </button>
 </div>
 )}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
 <button
 onClick={() => setShowAdvanceModal(true)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors"
 >
 <HandCoins size={13} />
 Avance
 </button>
 </div>
 </td>
 </tr>
 <AnimatePresence>
 {showAdvanceModal && <AdvanceModal emp={emp} onClose={() => setShowAdvanceModal(false)} />}
 </AnimatePresence>
 </>
 );
};

/* ------------------------------------------------------------------ */
/* Employees Tab */
/* ------------------------------------------------------------------ */

const EmployeesTab = () => {
 const { data: employees = [], isLoading } = useEmployees();
 const [search, setSearch] = useState('');

 const filtered = employees.filter((e) => {
 const q = search.toLowerCase();
 return (
 e.firstName.toLowerCase().includes(q) ||
 e.lastName.toLowerCase().includes(q) ||
 e.departmentName.toLowerCase().includes(q)
 );
 });

 const totalSalaries = employees.reduce((s, e) => s + (e.salary || 0), 0);
 const withSalary = employees.filter((e) => e.salary > 0).length;

 if (isLoading) {
 return (
 <div className="space-y-4">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="h-14 bg-gray-100 rounded-2xl animate-pulse"/>
 ))}
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Summary Cards */}
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-white rounded-2xl border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Masse salariale</p>
 <p className="text-2xl font-bold text-gray-800">{formatXAF(totalSalaries)}</p>
 </div>
 <div className="bg-white rounded-2xl border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Employes</p>
 <p className="text-2xl font-bold text-gray-800">{employees.length}</p>
 </div>
 <div className="bg-white rounded-2xl border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Salaire moyen</p>
 <p className="text-2xl font-bold text-gray-800">
 {withSalary > 0 ? formatXAF(Math.round(totalSalaries / withSalary)) : '\u2014'}
 </p>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
 <h2 className="font-semibold text-gray-700">Salaires des employes</h2>
 <div className="relative">
 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
 <input
 type="text"value={search} onChange={(e) => setSearch(e.target.value)}
 placeholder="Rechercher..."
 className="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] w-56"
 />
 </div>
 </div>

 {filtered.length === 0 ? (
 <div className="py-16 text-center text-gray-400 text-sm">Aucun employe trouve</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full">
 <thead>
 <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
 <th className="px-6 py-3">Employe</th>
 <th className="px-6 py-3">Departement</th>
 <th className="px-6 py-3">Role</th>
 <th className="px-6 py-3">Salaire mensuel</th>
 <th className="px-6 py-3">Actions</th>
 </tr>
 </thead>
 <tbody>
 {filtered.map((emp) => <SalaryRow key={emp.id} emp={emp} />)}
 </tbody>
 </table>
 </div>
 )}
 </div>
 </div>
 );
};

/* ------------------------------------------------------------------ */
/* Main Component */
/* ------------------------------------------------------------------ */

export default function Payroll() {
 const { t } = useTranslation();
 const [showCreateModal, setShowCreateModal] = useState(false);
 const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<'payroll' | 'employees'>('payroll');

 const { data: runs, isLoading } = usePayrollRuns();
 const calculateMut = useCalculatePayrollRun();
 const validateMut = useValidatePayrollRun();
 const payMut = usePayPayrollRun();
 const [payingRunId, setPayingRunId] = useState<string | null>(null);

 // Detail view
 if (selectedRunId) {
 return <PayrollDetail runId={selectedRunId} onBack={() => setSelectedRunId(null)} />;
 }

 const allRuns = runs || [];

 const tabs = [
 { key: 'payroll' as const, label: 'Bulletins de paie', icon: Wallet },
 { key: 'employees' as const, label: 'Employes & Salaires', icon: Users },
 ];

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h1 className="text-2xl font-bold text-gray-800">Gestion de la Paie</h1>
 <p className="text-sm text-gray-500 mt-1">
 Bulletins de paie, salaires et charges sociales
 </p>
 </div>
 {activeTab === 'payroll' && (
 <button
 onClick={() => setShowCreateModal(true)}
 className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
 >
 <Plus size={16} />
 Nouvelle Paie
 </button>
 )}
 </div>

 {/* Tabs */}
 <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
 {tabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
 activeTab === tab.key
 ? 'bg-white text-gray-800 '
 : 'text-gray-500 hover:text-gray-700'
 }`}
 >
 <tab.icon size={15} />
 {tab.label}
 </button>
 ))}
 </div>

 {/* Employees Tab */}
 {activeTab === 'employees' && <EmployeesTab />}

 {/* Payroll Tab */}
 {activeTab === 'payroll' && isLoading && (
 <div className="space-y-3">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse"/>
 ))}
 </div>
 )}

 {activeTab === 'payroll' && !isLoading && (
 <>
 {/* Payroll runs table */}
 {allRuns.length > 0 ? (
 <div className="bg-white rounded-2xl overflow-hidden">
 <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
 <div className="col-span-2">Periode</div>
 <div className="col-span-2">Statut</div>
 <div className="col-span-2 text-right">Total Brut</div>
 <div className="col-span-2 text-right">Total Net</div>
 <div className="col-span-2 text-right">Charges Patr.</div>
 <div className="col-span-2 text-right">Actions</div>
 </div>

 {allRuns.map((run, i) => {
 const status = STATUS_COLORS[run.status] || STATUS_COLORS.DRAFT;

 return (
 <motion.div
 key={run.id}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.03 }}
 onClick={() => setSelectedRunId(run.id)}
 className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
 >
 <div className="col-span-2 text-sm font-semibold text-gray-800">
 {MONTHS[run.month - 1]} {run.year}
 </div>
 <div className="col-span-2">
 <span
 className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}
 >
 {status.label}
 </span>
 </div>
 <div className="col-span-2 text-sm font-medium text-gray-800 text-right">
 {formatXAF(run.totalGross)}
 </div>
 <div className="col-span-2 text-sm font-medium text-[#33cbcc] text-right">
 {formatXAF(run.totalNet)}
 </div>
 <div className="col-span-2 text-sm font-medium text-[#283852] text-right">
 {formatXAF(run.totalEmployerCharges)}
 </div>
 <div className="col-span-2 flex justify-end gap-1">
 {run.status === 'DRAFT' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 calculateMut.mutate(run.id);
 }}
 disabled={calculateMut.isPending}
 title="Calculer"
 className="p-1.5 rounded-lg text-[#283852] hover:text-[#283852] hover:bg-[#283852]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Calculator size={14} />
 </button>
 )}
 {run.status === 'CALCULATED' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 validateMut.mutate(run.id);
 }}
 disabled={validateMut.isPending}
 title="Valider"
 className="p-1.5 rounded-lg text-[#33cbcc] hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <CheckCircle size={14} />
 </button>
 )}
 {run.status === 'VALIDATED' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setPayingRunId(run.id);
 }}
 title="Payer"
 className="p-1.5 rounded-lg text-[#33cbcc] hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <CreditCard size={14} />
 </button>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedRunId(run.id);
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
 <Wallet size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-500 font-medium mb-2">Aucune paie creee</p>
 <p className="text-sm text-gray-400">Creez votre premiere paie pour commencer.</p>
 </div>
 )}

 {/* Preview Calculator */}
 <PreviewCalculator />
 </>
 )}

 {/* Modals */}
 <AnimatePresence>
 {showCreateModal && <CreateRunModal onClose={() => setShowCreateModal(false)} />}
 {payingRunId && (
 <PayConfirmModal
 onClose={() => setPayingRunId(null)}
 onConfirm={() => {
 payMut.mutate(payingRunId, { onSuccess: () => setPayingRunId(null) });
 }}
 isPending={payMut.isPending}
 />
 )}
 </AnimatePresence>
 </div>
 );
}
