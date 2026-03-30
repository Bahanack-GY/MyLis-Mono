import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    Loader2,
    FileText,
    Calendar,
    Wallet,
    TrendingDown,
    Eye,
    X,
    ChevronDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/config';
import { exportPayslipPdf } from '../utils/exportPayslipPdf';
import type { PayslipPdfData } from '../utils/exportPayslipPdf';
import logoSrc from '../assets/logo-lis.png';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MyPayslip {
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
    totalEmployerCharges: number;
    manualDeductions: number;
    manualDeductionNote: string | null;
    netSalary: number;
    details: any;
    payrollRun: {
        id: string;
        month: number;
        year: number;
        status: string;
        paidAt: string;
    };
    employee: {
        id: string;
        firstName: string;
        lastName: string;
        department?: { id: string; name: string };
    };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MONTHS = [
    'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre',
];

const formatXAF = (amount: number) => {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(value) + ' XAF';
};

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ */
/*  Logo helper                                                        */
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

/* ------------------------------------------------------------------ */
/*  API & Hook                                                         */
/* ------------------------------------------------------------------ */

const useMyPayslips = () =>
    useQuery<MyPayslip[]>({
        queryKey: ['payroll', 'my-payslips'],
        queryFn: () => api.get('/payroll/my-payslips').then((r) => r.data),
    });

/* ------------------------------------------------------------------ */
/*  Detail Modal                                                       */
/* ------------------------------------------------------------------ */

const PayslipDetailModal = ({
    payslip,
    onClose,
    onDownload,
    downloading,
}: {
    payslip: MyPayslip;
    onClose: () => void;
    onDownload: () => void;
    downloading: boolean;
}) => {
    const emp = payslip.employee;
    const run = payslip.payrollRun;
    const empName = `${emp.firstName} ${emp.lastName}`;

    const deductionRows = [
        { label: 'CNPS (Pension vieillesse)', rate: '2,80%', amount: Number(payslip.cnpsEmployee) || 0 },
        { label: 'CFC (Credit Foncier)', rate: '1,00%', amount: Number(payslip.cfc) || 0 },
        { label: 'IRPP (Impot sur le revenu)', rate: 'Progressif', amount: Number(payslip.irpp) || 0 },
        { label: 'Centimes additionnels', rate: '10% IRPP', amount: Number(payslip.communalTax) || 0 },
    ];

    const manualDed = Number(payslip.manualDeductions) || 0;
    if (manualDed > 0) {
        const note = payslip.manualDeductionNote ? ` (${payslip.manualDeductionNote})` : '';
        deductionRows.push({ label: `Retenue manuelle${note}`, rate: '', amount: manualDed });
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Fiche de Paie</h3>
                        <p className="text-sm text-gray-500">{MONTHS[run.month - 1]} {run.year} - {empName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onDownload}
                            disabled={downloading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-60"
                        >
                            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            PDF
                        </button>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Employee Info */}
                    <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Employe</p>
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{empName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Departement</p>
                            <p className="text-sm text-gray-700 mt-0.5">{emp.department?.name || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Periode</p>
                            <p className="text-sm text-gray-700 mt-0.5">{MONTHS[run.month - 1]} {run.year}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Date de paiement</p>
                            <p className="text-sm text-gray-700 mt-0.5">{run.paidAt ? formatDate(run.paidAt) : '-'}</p>
                        </div>
                    </div>

                    {/* Gross Salary */}
                    <div className="flex justify-between items-center px-1">
                        <span className="text-sm font-semibold text-gray-700">Salaire Brut</span>
                        <span className="text-base font-bold text-gray-800">{formatXAF(Number(payslip.grossSalary) || 0)}</span>
                    </div>

                    {/* Deductions table */}
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Retenues salariales</p>
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                            {deductionRows.map((row, i) => (
                                <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? '' : 'bg-white'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-700">{row.label}</span>
                                        {row.rate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">{row.rate}</span>}
                                    </div>
                                    <span className="font-medium text-[#283852]">- {formatXAF(row.amount)}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 border-t border-gray-200">
                                <span className="text-sm font-bold text-gray-700">Total Retenues</span>
                                <span className="font-bold text-[#283852]">- {formatXAF((Number(payslip.totalDeductions) || 0) + (Number(payslip.manualDeductions) || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* Employer charges */}
                    <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Charges patronales</p>
                        <div className="bg-[#283852]/5 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <span className="text-gray-700">CNPS Employeur</span>
                                <span className="font-medium text-[#283852]">{formatXAF(Number(payslip.cnpsEmployer) || 0)}</span>
                            </div>
                            <div className="flex items-center justify-between px-4 py-2.5 bg-[#283852]/10 border-t border-gray-200">
                                <span className="text-sm font-bold text-gray-700">Total Charges Patronales</span>
                                <span className="font-bold text-[#283852]">{formatXAF(Number(payslip.totalEmployerCharges) || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Net salary box */}
                    <div className="bg-gradient-to-r from-[#33cbcc] to-[#33cbcc] rounded-xl p-5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Net a payer</p>
                            <p className="text-2xl font-bold text-white mt-1">{formatXAF(Number(payslip.netSalary) || 0)}</p>
                        </div>
                        <Wallet size={32} className="text-white/30" />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ------------------------------------------------------------------ */
/*  Payslip Card                                                       */
/* ------------------------------------------------------------------ */

const PayslipCard = ({
    payslip,
    onView,
    onDownload,
    downloading,
}: {
    payslip: MyPayslip;
    onView: () => void;
    onDownload: () => void;
    downloading: boolean;
}) => {
    const run = payslip.payrollRun;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100  transition-all duration-300 group"
        >
            <div className="p-5">
                {/* Period header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Calendar size={18} className="text-[#33cbcc]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{MONTHS[run.month - 1]} {run.year}</h3>
                            <p className="text-xs text-gray-400">
                                Paye le {run.paidAt ? formatDate(run.paidAt) : '-'}
                            </p>
                        </div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#283852] text-white">
                        Paye
                    </span>
                </div>

                {/* Amounts grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Brut</p>
                        <p className="text-sm font-bold text-gray-800 mt-0.5">{formatXAF(Number(payslip.grossSalary) || 0)}</p>
                    </div>
                    <div className="bg-[#283852]/10 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-[#283852]/60 uppercase tracking-wider">Retenues</p>
                        <p className="text-sm font-bold text-[#283852] mt-0.5">
                            - {formatXAF((Number(payslip.totalDeductions) || 0) + (Number(payslip.manualDeductions) || 0))}
                        </p>
                    </div>
                    <div className="bg-[#33cbcc]/5 rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-[#33cbcc] uppercase tracking-wider">Net</p>
                        <p className="text-sm font-bold text-[#33cbcc] mt-0.5">{formatXAF(Number(payslip.netSalary) || 0)}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={onView}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <Eye size={14} />
                        Details
                    </button>
                    <button
                        onClick={onDownload}
                        disabled={downloading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors disabled:opacity-60 shadow-sm shadow-[#33cbcc]/20"
                    >
                        {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Telecharger
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function MyPayslips() {
    const { t } = useTranslation();
    const { data: payslips = [], isLoading } = useMyPayslips();
    const [selectedPayslip, setSelectedPayslip] = useState<MyPayslip | null>(null);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [yearFilter, setYearFilter] = useState<number | null>(null);

    // Available years
    const years = [...new Set(payslips.map((ps) => ps.payrollRun.year))].sort((a, b) => b - a);

    const filtered = yearFilter
        ? payslips.filter((ps) => ps.payrollRun.year === yearFilter)
        : payslips;

    // Summary stats
    const currentYear = new Date().getFullYear();
    const currentYearPayslips = payslips.filter((ps) => ps.payrollRun.year === currentYear);
    const totalNetThisYear = currentYearPayslips.reduce((s, ps) => s + (Number(ps.netSalary) || 0), 0);
    const totalGrossThisYear = currentYearPayslips.reduce((s, ps) => s + (Number(ps.grossSalary) || 0), 0);
    const totalDeductionsThisYear = currentYearPayslips.reduce(
        (s, ps) => s + (Number(ps.totalDeductions) || 0) + (Number(ps.manualDeductions) || 0), 0,
    );

    const handleDownload = async (payslip: MyPayslip) => {
        setDownloadingId(payslip.id);
        try {
            const logoBase64 = await loadLogoBase64();

            const pdfData: PayslipPdfData = {
                employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                departmentName: payslip.employee.department?.name || '',
                month: payslip.payrollRun.month,
                year: payslip.payrollRun.year,
                grossSalary: Number(payslip.grossSalary),
                cnpsEmployee: Number(payslip.cnpsEmployee),
                cnpsEmployer: Number(payslip.cnpsEmployer),
                cfc: Number(payslip.cfc),
                irpp: Number(payslip.irpp),
                communalTax: Number(payslip.communalTax),
                totalDeductions: Number(payslip.totalDeductions),
                totalEmployerCharges: Number(payslip.totalEmployerCharges),
                manualDeductions: Number(payslip.manualDeductions || 0),
                manualDeductionNote: payslip.manualDeductionNote,
                netSalary: Number(payslip.netSalary),
                payslipId: payslip.id,
                paidAt: payslip.payrollRun.paidAt,
            };

            exportPayslipPdf(pdfData, logoBase64);
        } catch {
            // Fallback without logo
            const pdfData: PayslipPdfData = {
                employeeName: `${payslip.employee.firstName} ${payslip.employee.lastName}`,
                departmentName: payslip.employee.department?.name || '',
                month: payslip.payrollRun.month,
                year: payslip.payrollRun.year,
                grossSalary: Number(payslip.grossSalary),
                cnpsEmployee: Number(payslip.cnpsEmployee),
                cnpsEmployer: Number(payslip.cnpsEmployer),
                cfc: Number(payslip.cfc),
                irpp: Number(payslip.irpp),
                communalTax: Number(payslip.communalTax),
                totalDeductions: Number(payslip.totalDeductions),
                totalEmployerCharges: Number(payslip.totalEmployerCharges),
                manualDeductions: Number(payslip.manualDeductions || 0),
                manualDeductionNote: payslip.manualDeductionNote,
                netSalary: Number(payslip.netSalary),
                payslipId: payslip.id,
                paidAt: payslip.payrollRun.paidAt,
            };
            exportPayslipPdf(pdfData);
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800">{t('sidebar.myPayslips', 'Mes Fiches de Paie')}</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Consultez et telechargez vos bulletins de salaire
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Wallet size={16} className="text-[#33cbcc]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net percu {currentYear}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatXAF(totalNetThisYear)}</p>
                    <p className="text-xs text-gray-400 mt-1">{currentYearPayslips.length} fiche(s) de paie</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                            <FileText size={16} className="text-[#283852]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Brut cumule {currentYear}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatXAF(totalGrossThisYear)}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                            <TrendingDown size={16} className="text-[#283852]" />
                        </div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Retenues {currentYear}</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{formatXAF(totalDeductionsThisYear)}</p>
                </div>
            </div>

            {/* Year filter */}
            {years.length > 1 && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setYearFilter(null)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            !yearFilter ? 'bg-[#33cbcc] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Toutes
                    </button>
                    {years.map((year) => (
                        <button
                            key={year}
                            onClick={() => setYearFilter(year)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                yearFilter === year ? 'bg-[#33cbcc] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            )}

            {/* Payslip grid */}
            {!isLoading && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((ps) => (
                        <PayslipCard
                            key={ps.id}
                            payslip={ps}
                            onView={() => setSelectedPayslip(ps)}
                            onDownload={() => handleDownload(ps)}
                            downloading={downloadingId === ps.id}
                        />
                    ))}
                </div>
            )}

            {/* Empty state */}
            {!isLoading && filtered.length === 0 && (
                <div className="text-center py-20">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium mb-2">Aucune fiche de paie</p>
                    <p className="text-sm text-gray-400">
                        {payslips.length > 0
                            ? 'Aucune fiche de paie pour cette annee'
                            : 'Vos fiches de paie apparaitront ici une fois le salaire verse'}
                    </p>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedPayslip && (
                    <PayslipDetailModal
                        payslip={selectedPayslip}
                        onClose={() => setSelectedPayslip(null)}
                        onDownload={() => handleDownload(selectedPayslip)}
                        downloading={downloadingId === selectedPayslip.id}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
