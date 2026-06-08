import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Cancel01Icon, Loading02Icon, Calendar01Icon, Tick01Icon, CalculatorIcon, CreditCardIcon, ViewIcon, ArrowLeft01Icon, UserGroupIcon, Wallet01Icon, ArrowUpRight01Icon, Alert02Icon, DollarCircleIcon, Search01Icon, PencilIcon, Money01Icon, ArrowDown01Icon, Download01Icon, Settings01Icon, Delete02Icon, FilterIcon, Task01Icon, SquareIcon, MinusSignIcon } from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api/config';
import ToggleSwitch from '../../components/ToggleSwitch';
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
 /* Legacy fields */
 cnpsEmployee?: number;
 cnpsEmployer?: number;
 cfc?: number;
 communalTax?: number;
 /* 2026 CNPS fields */
 pvidEmployee?: number;
 pvidEmployer?: number;
 cnpsFamilyAllowance?: number;
 atmp?: number;
 /* 2026 CFC */
 cfcEmployee?: number;
 cfcEmployer?: number;
 /* 2026 FNE */
 fne?: number;
 /* Fiscal */
 irpp: number;
 cac?: number;
 rav?: number;
 tdl?: number;
 /* Salary bases */
 baseSalary?: number;
 grossCotisable?: number;
 grossTaxable?: number;
 netCategoriel?: number;
 riskClass?: number;
 /* Aggregates */
 totalDeductions: number;
 manualDeductions: number;
 manualDeductionNote: string | null;
 netSalary: number;
 totalEmployerCharges: number;
 /* Toggles */
 includeCnps: boolean;
 includeCfc: boolean;
 includeIrpp: boolean;
 includeCommunalTax: boolean;
 customDeductions: { name: string; amount: number }[];
 complianceWarnings?: string[];
 paymentDate: string | null;
 employee?: {
 id: string;
 firstName: string;
 lastName: string;
 position?: string;
 contractType?: string;
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

interface SalaryComponent {
 id: string;
 employeeId: string;
 type: 'PRIME' | 'INDEMNITE' | 'AVANTAGE_NATURE';
 label: string;
 amount: number;
 cnpsBase: boolean;
 taxable: boolean;
 cap: number | null;
 justificatifUrl: string | null;
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
 'w-full bg-white  border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
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
 position: ps.employee?.position,
 contractType: ps.employee?.contractType,
 riskClass: ps.riskClass ?? undefined,
 month: run.month,
 year: run.year,
 /* Salary bases */
 baseSalary: ps.baseSalary ? Number(ps.baseSalary) : undefined,
 grossSalary: Number(ps.grossSalary),
 grossCotisable: ps.grossCotisable ? Number(ps.grossCotisable) : undefined,
 grossTaxable: ps.grossTaxable ? Number(ps.grossTaxable) : undefined,
 netCategoriel: ps.netCategoriel ? Number(ps.netCategoriel) : undefined,
 /* 2026 CNPS */
 pvidEmployee: ps.pvidEmployee != null ? Number(ps.pvidEmployee) : undefined,
 pvidEmployer: ps.pvidEmployer != null ? Number(ps.pvidEmployer) : undefined,
 cnpsFamilyAllowance: ps.cnpsFamilyAllowance != null ? Number(ps.cnpsFamilyAllowance) : undefined,
 atmp: ps.atmp != null ? Number(ps.atmp) : undefined,
 /* 2026 CFC */
 cfcEmployee: ps.cfcEmployee != null ? Number(ps.cfcEmployee) : undefined,
 cfcEmployer: ps.cfcEmployer != null ? Number(ps.cfcEmployer) : undefined,
 /* FNE */
 fne: ps.fne != null ? Number(ps.fne) : undefined,
 /* Fiscal */
 irpp: Number(ps.irpp),
 cac: ps.cac != null ? Number(ps.cac) : undefined,
 rav: ps.rav != null ? Number(ps.rav) : undefined,
 tdl: ps.tdl != null ? Number(ps.tdl) : undefined,
 /* Legacy fallback */
 cnpsEmployee: ps.cnpsEmployee != null ? Number(ps.cnpsEmployee) : undefined,
 cnpsEmployer: ps.cnpsEmployer != null ? Number(ps.cnpsEmployer) : undefined,
 cfc: ps.cfc != null ? Number(ps.cfc) : undefined,
 communalTax: ps.communalTax != null ? Number(ps.communalTax) : undefined,
 /* Aggregates */
 totalDeductions: Number(ps.totalDeductions),
 totalEmployerCharges: Number(ps.totalEmployerCharges),
 manualDeductions: Number(ps.manualDeductions || 0),
 manualDeductionNote: ps.manualDeductionNote,
 customDeductions: ps.customDeductions || [],
 netSalary: Number(ps.netSalary),
 payslipId: ps.id,
 complianceWarnings: ps.complianceWarnings ?? [],
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
 <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center">
 <Wallet01Icon size={20} className="text-[#33cbcc]"/>
 </div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">Nouvelle paie</h2>
 </div>
 <button
 onClick={onClose}
 className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
 >
 <Cancel01Icon size={18} />
 </button>
 </div>

 <div className="p-6 space-y-4 flex-1 overflow-y-auto">
 <div>
 <label className={labelCls}>Mois</label>
 <select
 value={form.month}
 onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))}
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
 value={form.year}
 onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 </div>
 </div>

 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button
 onClick={onClose}
 className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
 >
 Annuler
 </button>
 <button
 disabled={createMut.isPending}
 onClick={handleSubmit}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
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
 className="fixed inset-0 z-[60] flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center gap-3">
 <div className="p-2.5 bg-[#33cbcc]/10">
 <CreditCardIcon size={20} className="text-[#33cbcc]"/>
 </div>
 <h3 className="text-base font-semibold text-[#1c2b3a]">Confirmer le paiement</h3>
 </div>
 <div className="flex-1 overflow-y-auto px-6 py-6">
 <p className="text-sm text-[#8892a4]">
 Etes-vous sur de vouloir proceder au paiement ? Cette action est irreversible.
 </p>
 </div>
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
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {isPending && <Loading02Icon size={14} className="animate-spin"/>}
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

 // Returns true if ALL selected payslips have the retenue enabled (defaults to true when none selected)
 const retenueOn = (key: keyof Payslip) => {
 const selected = payslips.filter(ps => selectedIds.has(ps.id));
 if (selected.length === 0) return true;
 return selected.every(ps => ps[key] !== false);
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

 const noneSelected = selectedIds.size === 0;

 return (
 <motion.div
 initial={{ opacity: 0, y: -10 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -10 }}
 className="bg-white  border p-4 space-y-3"
 >
 {/* Top row: selection info + department filter */}
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2 text-sm font-semibold text-[#33cbcc]">
 <Task01Icon size={16} />
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
 <FilterIcon size={14} className="text-gray-400"/>
 <select
 onChange={(e) => {
 if (e.target.value) selectByDepartment(e.target.value);
 e.target.value = '';
 }}
 className="text-xs border border-gray-200  px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#33cbcc]/30 cursor-pointer"
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
 <div className="flex items-center  overflow-hidden border-2 border-[#33cbcc]">
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
 disabled={bulkMut.isPending || noneSelected}
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
 disabled={bulkMut.isPending || noneSelected}
 className="px-3 py-1.5 text-xs font-bold bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors disabled:opacity-50"
 >
 TOUT OFF
 </button>
 </div>

 <div className="border-l border-gray-200 mx-1"/>

 {([
 { key: 'includeCnps', label: 'CNPS' },
 { key: 'includeCfc', label: 'CFC' },
 { key: 'includeIrpp', label: 'IRPP' },
 { key: 'includeCommunalTax', label: 'T.Comm' },
 ] as { key: keyof Payslip; label: string }[]).map(({ key, label }) => (
 <div key={String(key)} className={noneSelected || bulkMut.isPending ? 'opacity-50 pointer-events-none' : ''}>
 <ToggleSwitch
   checked={retenueOn(key)}
   onChange={v => applyToggle(String(key), v)}
   labels={['Off', label]}
 />
 </div>
 ))}

 <div className="border-l border-gray-200 mx-1"/>

 {/* Add custom deduction */}
 <div className="relative">
 <button
 onClick={() => setShowAddDeduction(!showAddDeduction)}
 disabled={bulkMut.isPending || noneSelected}
 className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium  bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors border border-gray-200 disabled:opacity-50"
 >
 <Add01Icon size={12} />
 Retenue
 </button>
 {showAddDeduction && (
 <div className="absolute top-full left-0 mt-2 bg-white  border border-gray-200 p-3 z-10 w-64 space-y-2">
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
 className="flex-1 px-2 py-1.5 text-xs  bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
 >
 Annuler
 </button>
 <button
 onClick={addCustomDeduction}
 disabled={!selectedType || !customAmount || bulkMut.isPending}
 className="flex-1 px-2 py-1.5 text-xs font-semibold  bg-[#283852] text-white hover:bg-[#283852] transition-colors disabled:opacity-50"
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
 className="text-xs border border-gray-200  px-2 py-1.5 text-[#283852] bg-[#283852]/10 focus:outline-none focus:ring-1 focus:ring-[#33cbcc]/30 cursor-pointer"
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
 <Loading02Icon size={14} className="animate-spin"/>
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
 className="fixed inset-0 z-[60] flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
 <CreditCardIcon size={18} className="text-[#33cbcc]"/>
 </div>
 <div>
 <h3 className="font-bold text-[#1c2b3a]">Payer le salaire</h3>
 <p className="text-xs text-[#8892a4]">{empName}</p>
 </div>
 </div>

 <div className="flex-1 p-6 space-y-5 overflow-y-auto">
 <div className="bg-[#f8f9fc] border border-[#e5e8ef] p-3 flex justify-between items-center">
 <span className="text-sm text-[#8892a4]">Net a payer</span>
 <span className="text-lg font-bold text-[#33cbcc]">{formatXAF(payslip.netSalary)}</span>
 </div>

 <div>
 <label className={labelCls}>Date de paiement</label>
 <input
 type="date"
 value={date}
 onChange={(e) => setDate(e.target.value)}
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 </div>
 </div>

 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
 Annuler
 </button>
 <button
 onClick={handleConfirm}
 disabled={payOneMut.isPending || !date}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {payOneMut.isPending ? <Loading02Icon size={14} className="animate-spin"/> : <Tick01Icon size={14}/>}
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
 <Loading02Icon size={24} className="animate-spin text-[#33cbcc]"/>
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
 pvid: acc.pvid + (Number(ps.pvidEmployee ?? ps.cnpsEmployee) || 0),
 cfc: acc.cfc + (Number(ps.cfcEmployee ?? ps.cfc) || 0),
 irpp: acc.irpp + (Number(ps.irpp) || 0) + (Number(ps.cac) || 0),
 ravTdl: acc.ravTdl + (Number(ps.rav) || 0) + (Number(ps.tdl) || 0) + (Number(ps.communalTax) || 0),
 deductions: acc.deductions + (Number(ps.totalDeductions) || 0),
 custom: acc.custom + (ps.customDeductions || []).reduce((s: number, d: { amount: number }) => s + (Number(d.amount) || 0), 0),
 manual: acc.manual + (Number(ps.manualDeductions) || 0),
 net: acc.net + (Number(ps.netSalary) || 0),
 }),
 { gross: 0, pvid: 0, cfc: 0, irpp: 0, ravTdl: 0, deductions: 0, custom: 0, manual: 0, net: 0 },
 );

 const canEditDeductions = run.status === 'CALCULATED';

 return (
 <div className="space-y-6">
 {/* Back + Header */}
 <div className="flex items-center gap-4">
 <button
 onClick={onBack}
 className="p-2  hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
 >
 <ArrowLeft01Icon size={20} />
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
 className="p-2.5  text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
 title="Gerer les types de retenues"
 >
 <Settings01Icon size={18} />
 </button>
 {(run.status === 'DRAFT' || run.status === 'CALCULATED') && (
 <button
 onClick={() => calculateMut.mutate(run.id)}
 disabled={calculateMut.isPending}
 className="flex items-center gap-2 px-4 py-2.5  text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors disabled:opacity-50"
 >
 {calculateMut.isPending ? (
 <Loading02Icon size={16} className="animate-spin"/>
 ) : (
 <CalculatorIcon size={16} />
 )}
 {run.status === 'DRAFT' ? 'Calculer' : 'Re-calculer'}
 </button>
 )}
 {run.status === 'CALCULATED' && (
 <button
 onClick={() => validateMut.mutate(run.id)}
 disabled={validateMut.isPending}
 className="flex items-center gap-2 px-4 py-2.5  text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors disabled:opacity-50"
 >
 {validateMut.isPending ? (
 <Loading02Icon size={16} className="animate-spin"/>
 ) : (
 <Tick01Icon size={16} />
 )}
 Valider
 </button>
 )}
 {run.status === 'VALIDATED' && (
 <button
 onClick={() => setShowPayConfirm(true)}
 className="flex items-center gap-2 px-4 py-2.5  text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors"
 >
 <CreditCardIcon size={16} />
 {hasPartialPayments ? `Payer le reste (${unpaidCount})` : 'Payer tout'}
 </button>
 )}
 </div>
 </div>

 {/* Summary cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="bg-white  p-6">
 <p className="text-sm text-gray-500 mb-1">Total Brut</p>
 <p className="text-xl font-bold text-gray-800">{formatXAF(run.totalGross)}</p>
 </div>
 <div className="bg-white  p-6">
 <p className="text-sm text-gray-500 mb-1">Total Net</p>
 <p className="text-xl font-bold text-[#33cbcc]">{formatXAF(run.totalNet)}</p>
 </div>
 <div className="bg-white  p-6">
 <p className="text-sm text-gray-500 mb-1">Charges Patronales</p>
 <p className="text-xl font-bold text-[#283852]">{formatXAF(run.totalEmployerCharges)}</p>
 </div>
 </div>

 {/* Payment progress (VALIDATED with partial payments) */}
 {run.status === 'VALIDATED' && payslips.length > 0 && (
 <div className="bg-white  p-4 flex items-center gap-4">
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
 <div className="bg-white  overflow-hidden">
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
 <Task01Icon size={15} />
 ) : selectedIds.size > 0 ? (
 <MinusSignIcon size={15} />
 ) : (
 <SquareIcon size={15} />
 )}
 </button>
 </th>
 )}
 <th className="px-6 py-3">Employe</th>
 <th className="px-4 py-3">Departement</th>
 <th className="px-4 py-3 text-right">Brut</th>
 <th className="px-4 py-3 text-right" title="PVID salarial 4.2% (2026) ou CNPS 2.8% (legacy)">PVID/CNPS</th>
 <th className="px-4 py-3 text-right">CFC</th>
 <th className="px-4 py-3 text-right" title="IRPP + CAC (10% IRPP)">IRPP+CAC</th>
 <th className="px-4 py-3 text-right" title="RAV + TDL (2026) ou Taxe Communale (legacy)">RAV+TDL</th>
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
 <Task01Icon size={15} className="text-[#33cbcc]"/>
 ) : (
 <SquareIcon size={15} />
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
 <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] flex-shrink-0" title="Retenues personnalisees"/>
 )}
 {(ps.complianceWarnings?.length ?? 0) > 0 && (
 <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title={ps.complianceWarnings!.join(' | ')}/>
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
 {formatXAF(ps.pvidEmployee ?? ps.cnpsEmployee ?? 0)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF(ps.cfcEmployee ?? ps.cfc ?? 0)}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF((Number(ps.irpp) || 0) + (Number(ps.cac) || 0))}
 </td>
 <td className="px-4 py-2.5 text-right text-gray-600 text-xs">
 {formatXAF((Number(ps.rav) || 0) + (Number(ps.tdl) || 0) + (Number(ps.communalTax) || 0))}
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
 className="p-1  text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 opacity-0 group-hover/row:opacity-100 transition-all"
 title="Modifier retenue manuelle"
 >
 <PencilIcon size={12} />
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
 <Tick01Icon size={10}/>
 {new Date(ps.paymentDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
 </span>
 ) : (
 <button
 onClick={() => setPayingPayslip(ps)}
 className="inline-flex items-center gap-1 px-2.5 py-1  text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc] transition-colors"
 >
 <CreditCardIcon size={11}/>
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
 className="p-1.5  text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all"
 title="Modifier les retenues"
 >
 <Settings01Icon size={13} />
 </button>
 )}
 {(run.status === 'CALCULATED' || run.status === 'VALIDATED' || run.status === 'PAID') && (
 <button
 onClick={() => handleDownloadPdf(ps)}
 disabled={downloadingId === ps.id}
 className="p-1.5  text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all disabled:opacity-50"
 title="Telecharger la fiche de paie"
 >
 {downloadingId === ps.id
 ? <Loading02Icon size={13} className="animate-spin"/>
 : <Download01Icon size={13} />}
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
 {formatXAF(totals.pvid)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.cfc)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.irpp)}
 </td>
 <td className="px-4 py-3 text-right text-gray-600 text-xs">
 {formatXAF(totals.ravTdl)}
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
 <div className="bg-white  p-12 text-center">
 <UserGroupIcon size={48} className="mx-auto text-gray-300 mb-4"/>
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
 className="fixed inset-0 z-[60] flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center">
 <PencilIcon size={18} className="text-[#283852]"/>
 </div>
 <div>
 <h3 className="font-bold text-[#1c2b3a]">Retenue manuelle</h3>
 <p className="text-xs text-[#8892a4]">{empName} - Brut : {formatXAF(payslip.grossSalary)}</p>
 </div>
 </div>
 <div className="flex-1 p-6 space-y-4 overflow-y-auto">
 <div>
 <label className={labelCls}>Montant de la retenue</label>
 <input
 type="number"min="0"value={amount} onChange={(e) => setAmount(e.target.value)}
 autoFocus
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 <p className="text-xs text-[#8892a4] mt-1">
 Retenues auto : {formatXAF(payslip.totalDeductions)} - Net actuel : {formatXAF(payslip.netSalary)}
 </p>
 </div>
 <div>
 <label className={labelCls}>Motif (optionnel)</label>
 <input
 type="text"value={note} onChange={(e) => setNote(e.target.value)}
 placeholder="Ex: Remboursement pret, retenue disciplinaire..."
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 </div>
 </div>
 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
 Annuler
 </button>
 <button
 onClick={() => onSave(parseFloat(amount) || 0, note || undefined)}
 disabled={isPending}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors disabled:opacity-60"
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
 const { data: liveComponents = [] } = useQuery<SalaryComponent[]>({
  queryKey: ['salary-components', payslip.employeeId],
  queryFn: () => api.get(`/payroll/employees/${payslip.employeeId}/salary-components`).then(r => r.data),
 });

 const effectiveGross = useMemo(() => {
  const base = payslip.baseSalary ?? payslip.grossSalary;
  const extras = liveComponents.filter(c => c.isActive).reduce((s, c) => s + Number(c.amount), 0);
  return Number(base) + extras;
 }, [liveComponents, payslip.baseSalary, payslip.grossSalary]);

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
 className="fixed inset-0 z-[60] flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef]">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center">
 <Settings01Icon size={20} className="text-[#33cbcc]"/>
 </div>
 <div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">Retenues</h2>
 <p className="text-xs text-[#8892a4]">{empName} — Brut: {formatXAF(effectiveGross)}</p>
 </div>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
 <Cancel01Icon size={18} />
 </button>
 </div>
 </div>

 <div className="p-6 space-y-6 flex-1 overflow-y-auto">
 {/* Statutory toggles */}
 <div>
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-3">
 Retenues legales
 </p>
 <div className="space-y-3">
 {toggleItems.map((item) => (
 <div key={item.key} className="flex items-center justify-between">
 <div>
 <p className="text-sm font-medium text-[#1c2b3a]">{item.label}</p>
 <p className="text-[11px] text-[#8892a4]">{item.desc}</p>
 </div>
 <ToggleSwitch
   checked={toggles[item.key]}
   onChange={v => setToggles(prev => ({ ...prev, [item.key]: v }))}
   labels={['Off', 'On']}
 />
 </div>
 ))}
 </div>
 </div>

 {/* Custom deductions */}
 <div>
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-3">
 Retenues personnalisees
 </p>

 {customDeductions.length > 0 && (
 <div className="space-y-2 mb-3">
 {customDeductions.map((d, i) => (
 <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#f8f9fc] border border-[#e5e8ef] group">
 <div className="flex items-center gap-2">
 <span className="text-sm text-[#1c2b3a]">{d.name}</span>
 <span className="text-xs font-semibold text-[#283852]">-{formatXAF(d.amount)}</span>
 </div>
 <button
 onClick={() => removeCustomDeduction(i)}
 className="p-1  text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 opacity-0 group-hover:opacity-100 transition-all"
 >
 <Delete02Icon size={13} />
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
 className="px-3 py-2  text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 <Add01Icon size={16} />
 </button>
 </div>
 ) : (
 <p className="text-xs text-[#8892a4]">
 Aucun type de retenue configure. Ajoutez-en via le bouton parametres.
 </p>
 )}
 </div>

 {/* Composantes salariales */}
 <div className="border-t border-[#e5e8ef] pt-4">
 <SalaryComponentsPanel employeeId={payslip.employeeId} />
 <p className="text-[10px] text-[#8892a4] mt-2 italic">Les composantes modifiées sont prises en compte au prochain "Enregistrer".</p>
 </div>
 </div>

 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
 Annuler
 </button>
 <button
 onClick={handleSave}
 disabled={togglesMut.isPending}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 {togglesMut.isPending ? <Loading02Icon size={16} className="animate-spin"/> : <Tick01Icon size={16} />}
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
 className="fixed inset-0 z-[60] flex justify-end bg-black/30"
 >
 <motion.div
 initial={{ x: '100%' }}
 animate={{ x: 0 }}
 exit={{ x: '100%' }}
 transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
 onClick={(e) => e.stopPropagation()}
 className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
 >
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10  bg-[#f8f9fc] border border-[#e5e8ef] flex items-center justify-center">
 <Settings01Icon size={20} className="text-[#8892a4]"/>
 </div>
 <h2 className="text-lg font-bold text-[#1c2b3a]">Types de retenues</h2>
 </div>
 <button onClick={onClose} className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
 <Cancel01Icon size={18} />
 </button>
 </div>

 <div className="p-6 space-y-4 flex-1 overflow-y-auto">
 {isLoading ? (
 <div className="flex justify-center py-4"><Loading02Icon size={20} className="animate-spin text-[#8892a4]"/></div>
 ) : types.length === 0 ? (
 <p className="text-sm text-[#8892a4] text-center py-4">Aucun type de retenue</p>
 ) : (
 <div className="space-y-2">
 {types.map((dt) =>
 editingId === dt.id ? (
 <div key={dt.id} className="flex items-center gap-2 px-3 py-2.5 bg-[#33cbcc]/5 border border-[#e5e8ef]">
 <input type="text"value={editName} onChange={(e) => setEditName(e.target.value)}
 autoFocus
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors flex-1 !py-1.5 !text-xs"
 onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
 />
 <input type="number"value={editAmount} onChange={(e) => setEditAmount(e.target.value)}
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors w-24 !py-1.5 !text-xs"
 onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null); }}
 />
 <label className="flex items-center gap-1 text-xs text-[#8892a4] cursor-pointer">
 <input type="checkbox"checked={editIsPercentage} onChange={(e) => setEditIsPercentage(e.target.checked)}
 className="border-[#e5e8ef]"/>
 %
 </label>
 <button onClick={saveEdit} disabled={updateMut.isPending}
 className="p-1.5 bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors">
 <Tick01Icon size={14} />
 </button>
 <button onClick={() => setEditingId(null)}
 className="p-1.5 bg-[#f8f9fc] text-[#8892a4] hover:bg-[#e5e8ef] transition-colors">
 <Cancel01Icon size={14} />
 </button>
 </div>
 ) : (
 <div key={dt.id} className="flex items-center justify-between px-4 py-3 bg-[#f8f9fc] border border-[#e5e8ef] group">
 <div>
 <p className="text-sm font-medium text-[#1c2b3a]">{dt.name}</p>
 <p className="text-xs text-[#8892a4]">
 {dt.isPercentage ? `${dt.defaultAmount}%` : formatXAF(dt.defaultAmount)}
 </p>
 </div>
 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
 <button onClick={() => startEdit(dt)}
 className="p-1.5  text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all">
 <PencilIcon size={14} />
 </button>
 <button onClick={() => deleteMut.mutate(dt.id)} disabled={deleteMut.isPending}
 className="p-1.5  text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-all">
 <Delete02Icon size={14} />
 </button>
 </div>
 </div>
 )
 )}
 </div>
 )}

 <div className="border-t border-[#e5e8ef] pt-4">
 <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-3">Ajouter un type</p>
 <div className="flex gap-2">
 <input
 type="text"value={name} onChange={(e) => setName(e.target.value)}
 placeholder="Nom (ex: Assurance)"
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors flex-1"
 />
 <input
 type="number"value={amount} onChange={(e) => setAmount(e.target.value)}
 placeholder="Montant"
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors w-28"
 />
 <label className="flex items-center gap-1.5 text-xs text-[#8892a4] cursor-pointer whitespace-nowrap">
 <input type="checkbox"checked={isPercentage} onChange={(e) => setIsPercentage(e.target.checked)}
 className="border-[#e5e8ef]"/>
 %
 </label>
 <button
 onClick={handleAdd}
 disabled={!name.trim() || !amount || createMut.isPending}
 className="px-3 py-2 text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
 >
 <Add01Icon size={16} />
 </button>
 </div>
 </div>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Preview CalculatorIcon */
/* ------------------------------------------------------------------ */

const PreviewCalculator = () => {
 const [grossInput, setGrossInput] = useState('');
 const gross = Number(grossInput) || 0;
 const { data: preview, isLoading } = usePreviewPayroll(gross);

 return (
 <div className="bg-white  p-6">
 <div className="flex items-center gap-2 mb-4">
 <CalculatorIcon size={18} className="text-[#33cbcc]"/>
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
 <Loading02Icon size={20} className="animate-spin text-[#33cbcc]"/>
 </div>
 )}

 {preview && gross > 0 && (
 <motion.div
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className="bg-gray-50  p-4 space-y-2"
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
 <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center">
 <Money01Icon size={18} className="text-[#283852]"/>
 </div>
 <div>
 <h3 className="font-bold text-[#1c2b3a]">Avance sur salaire</h3>
 <p className="text-xs text-[#8892a4]">{emp.firstName} {emp.lastName}</p>
 </div>
 </div>
 <div className="flex-1 p-6 space-y-4 overflow-y-auto">
 <div>
 <label className={labelCls}>Montant</label>
 <input
 type="number"min="1"value={amount} onChange={(e) => setAmount(e.target.value)}
 placeholder="0"autoFocus
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 {emp.salary > 0 && (
 <p className="text-xs text-[#8892a4] mt-1">Salaire mensuel : {formatXAF(emp.salary)}</p>
 )}
 </div>
 <div>
 <label className={labelCls}>Note (optionnel)</label>
 <input
 type="text"value={note} onChange={(e) => setNote(e.target.value)}
 placeholder="Motif de l'avance..."
 className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
 />
 </div>
 </div>
 <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3">
 <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">Annuler</button>
 <button
 onClick={() => payAdvance.mutate({ id: emp.id, amount: parseFloat(amount), note: note || undefined }, { onSuccess: () => onClose() })}
 disabled={!isValid || payAdvance.isPending}
 className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors disabled:opacity-60"
 >
 {payAdvance.isPending ? 'En cours...' : 'Payer l\'avance'}
 </button>
 </div>
 </motion.div>
 </motion.div>
 );
};

/* ------------------------------------------------------------------ */
/* Salary Components Panel */
/* ------------------------------------------------------------------ */

const SalaryComponentsPanel = ({ employeeId }: { employeeId: string }) => {
 const queryClient = useQueryClient();
 const [showForm, setShowForm] = useState(false);
 const [editingComp, setEditingComp] = useState<SalaryComponent | null>(null);
 const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
 const [form, setForm] = useState({ type: 'PRIME', label: '', amount: '', cnpsBase: true, taxable: true, cap: '' });

 const { data: components = [], isLoading } = useQuery<SalaryComponent[]>({
  queryKey: ['salary-components', employeeId],
  queryFn: () => api.get(`/payroll/employees/${employeeId}/salary-components`).then(r => r.data),
 });

 const createComp = useMutation({
  mutationFn: (data: any) => api.post(`/payroll/employees/${employeeId}/salary-components`, data).then(r => r.data),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-components', employeeId] }); setShowForm(false); resetForm(); toast.success('Composante ajoutée'); },
  onError: () => toast.error('Erreur lors de l\'ajout'),
 });

 const updateComp = useMutation({
  mutationFn: ({ id, data }: { id: string; data: any }) => api.patch(`/payroll/salary-components/${id}`, data).then(r => r.data),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-components', employeeId] }); setEditingComp(null); setShowForm(false); resetForm(); toast.success('Composante mise à jour'); },
  onError: () => toast.error('Erreur lors de la mise à jour'),
 });

 const deleteComp = useMutation({
  mutationFn: (id: string) => api.delete(`/payroll/salary-components/${id}`).then(r => r.data),
  onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['salary-components', employeeId] }); toast.success('Composante supprimée'); },
  onError: () => toast.error('Erreur lors de la suppression'),
 });

 const resetForm = () => setForm({ type: 'PRIME', label: '', amount: '', cnpsBase: true, taxable: true, cap: '' });

 const startEdit = (comp: SalaryComponent) => {
  setEditingComp(comp);
  setForm({ type: comp.type, label: comp.label, amount: String(comp.amount), cnpsBase: comp.cnpsBase, taxable: comp.taxable, cap: comp.cap != null ? String(comp.cap) : '' });
  setShowForm(true);
 };

 const handleSubmit = () => {
  const data = { type: form.type, label: form.label.trim(), amount: Number(form.amount), cnpsBase: form.cnpsBase, taxable: form.taxable, cap: form.cap ? Number(form.cap) : null };
  if (!data.label || form.amount.trim() === '') return;
  if (editingComp) { updateComp.mutate({ id: editingComp.id, data }); } else { createComp.mutate(data); }
 };

 const typeBadge = (type: string) => {
  if (type === 'PRIME') return 'bg-blue-50 text-blue-700 border border-blue-200';
  if (type === 'INDEMNITE') return 'bg-purple-50 text-purple-700 border border-purple-200';
  return 'bg-amber-50 text-amber-700 border border-amber-200';
 };

 const typeLabel = (type: string) => {
  if (type === 'PRIME') return 'Prime';
  if (type === 'INDEMNITE') return 'Indemnité';
  return 'Avantage';
 };

 if (isLoading) return (
  <div className="py-3 text-sm text-gray-400 flex items-center gap-2">
   <Loading02Icon size={14} className="animate-spin" />
   Chargement...
  </div>
 );

 return (
  <div className="py-3">
   <div className="flex items-center justify-between mb-3">
    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Composantes salariales</span>
    {!showForm && (
     <button
      onClick={() => { resetForm(); setEditingComp(null); setShowForm(true); }}
      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#33cbcc] bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 transition-colors rounded"
     >
      <Add01Icon size={12} />
      Ajouter
     </button>
    )}
   </div>

   {components.length === 0 && !showForm && (
    <p className="text-xs text-gray-400 italic">Aucune composante définie</p>
   )}

   <div className="space-y-1.5">
    {components.map(comp => (
     editingComp?.id === comp.id && showForm ? null : (
      <div key={comp.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded px-3 py-2">
       <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${typeBadge(comp.type)}`}>{typeLabel(comp.type)}</span>
       <span className="text-sm font-medium text-gray-700 flex-1">{comp.label}</span>
       <span className="text-sm font-semibold text-gray-800">{formatXAF(comp.amount)}</span>
       <div className="flex items-center gap-1 ml-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${comp.cnpsBase ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>CNPS</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${comp.taxable ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-400 line-through'}`}>IRPP</span>
       </div>
       <button onClick={() => startEdit(comp)} className="p-1 text-gray-400 hover:text-[#33cbcc] transition-colors"><PencilIcon size={12} /></button>
       {confirmDeleteId === comp.id ? (
        <div className="flex items-center gap-1">
         <button onClick={() => { deleteComp.mutate(comp.id); setConfirmDeleteId(null); }} className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Suppr.</button>
         <button onClick={() => setConfirmDeleteId(null)} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors">Non</button>
        </div>
       ) : (
        <button onClick={() => setConfirmDeleteId(comp.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Delete02Icon size={12} /></button>
       )}
      </div>
     )
    ))}
   </div>

   {showForm && (
    <div className="mt-2 bg-white border border-[#33cbcc]/30 rounded p-3">
     <div className="grid grid-cols-2 gap-2 mb-2">
      <select
       value={form.type}
       onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
       className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#33cbcc]"
      >
       <option value="PRIME">Prime</option>
       <option value="INDEMNITE">Indemnité</option>
       <option value="AVANTAGE_NATURE">Avantage en nature</option>
      </select>
      <input
       type="text"
       placeholder="Libellé"
       value={form.label}
       onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
       className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#33cbcc]"
      />
      <input
       type="number"
       min="0"
       placeholder="Montant (XAF)"
       value={form.amount}
       onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
       className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#33cbcc]"
      />
      <input
       type="number"
       placeholder="Plafond exo. (optionnel)"
       value={form.cap}
       onChange={e => setForm(f => ({ ...f, cap: e.target.value }))}
       className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#33cbcc]"
      />
     </div>
     <div className="flex items-center gap-4 mb-3">
      <label className="flex items-center gap-1.5 cursor-pointer">
       <input type="checkbox" checked={form.cnpsBase} onChange={e => setForm(f => ({ ...f, cnpsBase: e.target.checked }))} className="w-3.5 h-3.5 rounded border-gray-300 accent-[#33cbcc]" />
       <span className="text-xs text-gray-600">Base CNPS</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
       <input type="checkbox" checked={form.taxable} onChange={e => setForm(f => ({ ...f, taxable: e.target.checked }))} className="w-3.5 h-3.5 rounded border-gray-300 accent-[#33cbcc]" />
       <span className="text-xs text-gray-600">Imposable IRPP</span>
      </label>
     </div>
     <div className="flex items-center gap-2">
      <button
       onClick={handleSubmit}
       disabled={createComp.isPending || updateComp.isPending}
       className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#33cbcc]/90 rounded transition-colors disabled:opacity-50"
      >
       <Tick01Icon size={12} />
       {editingComp ? 'Modifier' : 'Ajouter'}
      </button>
      <button onClick={() => { setShowForm(false); setEditingComp(null); resetForm(); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
       <Cancel01Icon size={12} />
       Annuler
      </button>
     </div>
    </div>
   )}
  </div>
 );
};

/* ------------------------------------------------------------------ */
/* Salary Row */
/* ------------------------------------------------------------------ */

const SalaryRow = ({ emp }: { emp: SalaryEmployee }) => {
 const [editing, setEditing] = useState(false);
 const [value, setValue] = useState(String(emp.salary));
 const [showAdvanceModal, setShowAdvanceModal] = useState(false);
 const [showComponents, setShowComponents] = useState(false);
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
 className="w-36 px-3 py-1.5 text-sm border border-[#33cbcc]  focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30"
 />
 <button onClick={save} disabled={updateSalary.isPending} className="p-1.5  bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors">
 <Tick01Icon size={14} />
 </button>
 <button onClick={cancel} className="p-1.5  bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
 <Cancel01Icon size={14} />
 </button>
 </div>
 ) : (
 <div className="flex items-center gap-2 group/sal">
 <span className="font-semibold text-gray-800">
 {emp.salary > 0 ? formatXAF(emp.salary) : <span className="text-gray-400 font-normal">Non defini</span>}
 </span>
 <button onClick={() => setEditing(true)}
 className="p-1.5  text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-all">
 <PencilIcon size={13} />
 </button>
 </div>
 )}
 </td>
 <td className="px-6 py-4">
 <div className="flex items-center gap-2">
 <button
 onClick={() => setShowAdvanceModal(true)}
 className="flex items-center gap-1.5 px-3 py-1.5  text-xs font-semibold text-white bg-[#283852] hover:bg-[#283852] transition-colors"
 >
 <Money01Icon size={13} />
 Avance
 </button>
 <button
 onClick={() => setShowComponents(v => !v)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${showComponents ? 'text-[#33cbcc] bg-[#33cbcc]/10' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'}`}
 >
 <Settings01Icon size={13} />
 Primes
 </button>
 </div>
 </td>
 </tr>
 {showComponents && (
 <tr className="bg-[#33cbcc]/5 border-b border-gray-100">
 <td colSpan={5} className="px-6">
 <SalaryComponentsPanel employeeId={emp.id} />
 </td>
 </tr>
 )}
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
 <div key={i} className="h-14 bg-gray-100  animate-pulse"/>
 ))}
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Summary Cards */}
 <div className="grid grid-cols-3 gap-4">
 <div className="bg-white  border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Masse salariale</p>
 <p className="text-2xl font-bold text-gray-800">{formatXAF(totalSalaries)}</p>
 </div>
 <div className="bg-white  border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Employes</p>
 <p className="text-2xl font-bold text-gray-800">{employees.length}</p>
 </div>
 <div className="bg-white  border border-gray-100 p-5">
 <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Salaire moyen</p>
 <p className="text-2xl font-bold text-gray-800">
 {withSalary > 0 ? formatXAF(Math.round(totalSalaries / withSalary)) : '\u2014'}
 </p>
 </div>
 </div>

 {/* Table */}
 <div className="bg-white  border border-gray-100 overflow-hidden">
 <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
 <h2 className="font-semibold text-gray-700">Salaires des employes</h2>
 <div className="relative">
 <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none"/>
 <input
 type="text" value={search} onChange={(e) => setSearch(e.target.value)}
 placeholder="Rechercher..."
 className="w-56 bg-[#f5f6fa] border border-[#e5e8ef]  py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
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
 className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5  text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
 >
 <Add01Icon size={16} />
 Nouvelle Paie
 </button>
 )}
 </div>

 {/* Tabs */}
 <ToggleSwitch
   checked={activeTab === 'employees'}
   onChange={v => setActiveTab(v ? 'employees' : 'payroll')}
   labels={[
   <span className="flex items-center gap-1.5"><Wallet01Icon size={13} />Bulletins de paie</span>,
   <span className="flex items-center gap-1.5"><UserGroupIcon size={13} />Employés & Salaires</span>,
   ]}
 />

 {/* Employees Tab */}
 {activeTab === 'employees' && <EmployeesTab />}

 {/* Payroll Tab */}
 {activeTab === 'payroll' && isLoading && (
 <div className="space-y-3">
 {[...Array(4)].map((_, i) => (
 <div key={i} className="h-16 bg-gray-100  animate-pulse"/>
 ))}
 </div>
 )}

 {activeTab === 'payroll' && !isLoading && (
 <>
 {/* Payroll runs table */}
 {allRuns.length > 0 ? (
 <div className="bg-white  overflow-hidden">
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
 className="p-1.5  text-[#283852] hover:text-[#283852] hover:bg-[#283852]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <CalculatorIcon size={14} />
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
 className="p-1.5  text-[#33cbcc] hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <Tick01Icon size={14} />
 </button>
 )}
 {run.status === 'VALIDATED' && (
 <button
 onClick={(e) => {
 e.stopPropagation();
 setPayingRunId(run.id);
 }}
 title="Payer"
 className="p-1.5  text-[#33cbcc] hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 transition-colors opacity-0 group-hover:opacity-100"
 >
 <CreditCardIcon size={14} />
 </button>
 )}
 <button
 onClick={(e) => {
 e.stopPropagation();
 setSelectedRunId(run.id);
 }}
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
 <Wallet01Icon size={48} className="mx-auto text-gray-300 mb-4"/>
 <p className="text-gray-500 font-medium mb-2">Aucune paie creee</p>
 <p className="text-sm text-gray-400">Creez votre premiere paie pour commencer.</p>
 </div>
 )}

 {/* Preview CalculatorIcon */}
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
