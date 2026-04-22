import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
 BarChart as RechartsBarChart,
 Bar,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 PieChart,
 Pie,
 Cell,
 Legend,
} from 'recharts';
import {
 TrendingUp,
 TrendingDown,
 BarChart3,
 Wallet,
 Users,
 FileText,
 Calculator,
 PenLine,
 Banknote,
 Receipt,
 FileBarChart,
 AlertCircle,
 CalendarPlus,
 type LucideIcon,
} from 'lucide-react';

import {
 useDashboardKpis,
 useFiscalYears,
 useOpenFiscalYear,
 useIncomeStatement,
 useMonthlySummary,
 useCreateFiscalYear,
} from '../../api/accounting/hooks';
import type { DashboardKpis, FiscalYear, IncomeStatement } from '../../api/accounting/types';
import { useUpcomingDeclarations } from '../../api/tax/hooks';
import type { TaxDeclaration } from '../../api/tax/types';
import { useDepartments } from '../../api/departments/hooks';
import { useExpenseStats } from '../../api/expenses/hooks';

/* ─── Currency formatter (XAF / fr-CM) ─────────────────────────────────── */

const fmt = (n: number) =>
 new Intl.NumberFormat('fr-CM', {
 style: 'decimal',
 maximumFractionDigits: 0,
 }).format(n) + ' XAF';

/* ─── Stagger animation helpers ────────────────────────────────────────── */

const cardVariants = {
 hidden: { opacity: 0, y: 24 },
 visible: (i: number) => ({
 opacity: 1,
 y: 0,
 transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' },
 }),
};

const sectionVariants = {
 hidden: { opacity: 0, y: 20 },
 visible: (i: number) => ({
 opacity: 1,
 y: 0,
 transition: { delay: 0.3 + i * 0.1, duration: 0.45, ease: 'easeOut' },
 }),
};

/* ─── Reusable KPI card ────────────────────────────────────────────────── */

interface KpiCardProps {
 label: string;
 value: number;
 icon: LucideIcon;
 index: number;
}

const KpiCard = ({ label, value, icon: Icon, index }: KpiCardProps) => (
 <motion.div
 custom={index}
 variants={cardVariants}
 initial="hidden"
 animate="visible"
 className="bg-white rounded-2xl p-6 relative overflow-hidden"
 >
 <div className="relative z-10 space-y-1">
 <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
 <p className="text-2xl font-bold leading-tight text-gray-800">{fmt(value)}</p>
 </div>
 <div className="absolute -right-4 -bottom-4 text-[#33cbcc]/10 pointer-events-none">
 <Icon size={100} strokeWidth={1} />
 </div>
 </motion.div>
);

/* ─── Tax calendar urgency helpers ─────────────────────────────────────── */

const getDaysUntil = (dateStr: string) => {
 const now = new Date();
 now.setHours(0, 0, 0, 0);
 const target = new Date(dateStr);
 target.setHours(0, 0, 0, 0);
 return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const urgencyClasses = (dueDate: string) => {
 const days = getDaysUntil(dueDate);
 if (days <= 7) return 'bg-[#283852]/5';
 if (days <= 30) return 'bg-[#283852]/5';
 return '';
};

const statusBadge = (status: string) => {
 const map: Record<string, string> = {
 DRAFT: 'text-[#283852]/70',
 VALIDATED: 'text-[#283852]',
 FILED: 'text-[#33cbcc]',
 };
 return map[status] ?? 'text-gray-500';
};

const statusLabel = (status: string) => {
 const map: Record<string, string> = {
 DRAFT: 'Brouillon',
 VALIDATED: 'Validé',
 FILED: 'Déposé',
 };
 return map[status] ?? status;
};

/* ─── Chart colors ─────────────────────────────────────────────────────── */

const CHART_TEAL = '#33cbcc';
const CHART_NAVY = '#283852';
const PIE_COLORS = [CHART_TEAL, CHART_NAVY];

/* ─── No fiscal year prompt ────────────────────────────────────────────── */

const NoFiscalYearPrompt = () => {
 const createFY = useCreateFiscalYear();
 const now = new Date();
 const year = now.getFullYear();

 const handleCreate = () => {
 createFY.mutate({
 name: `Exercice ${year}`,
 startDate: `${year}-01-01`,
 endDate: `${year}-12-31`,
 });
 };

 return (
 <motion.div
 initial={{ opacity: 0, scale: 0.96 }}
 animate={{ opacity: 1, scale: 1 }}
 className="flex flex-col items-center justify-center min-h-[60vh] gap-6"
 >
 <div className="w-20 h-20 rounded-2xl bg-[#33cbcc]/10 flex items-center justify-center">
 <AlertCircle size={40} className="text-[#33cbcc]"/>
 </div>
 <div className="text-center max-w-md">
 <h2 className="text-2xl font-bold text-gray-800 mb-2">Aucun exercice fiscal ouvert</h2>
 <p className="text-gray-500 leading-relaxed">
 Pour acceder au tableau de bord comptable, vous devez d'abord ouvrir un exercice fiscal
 pour l'annee en cours.
 </p>
 </div>
 <button
 onClick={handleCreate}
 disabled={createFY.isPending}
 className="flex items-center gap-2 px-6 py-3 bg-[#33cbcc] hover:bg-[#2bb5b6] text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
 >
 <CalendarPlus size={18} />
 {createFY.isPending ? 'Creation en cours...' : `Ouvrir l'exercice ${year}`}
 </button>
 </motion.div>
 );
};

/* ─── Main Dashboard Component ─────────────────────────────────────────── */

const AccountantDashboard = () => {
 const navigate = useNavigate();

 // Department filter
 const [selectedDeptId, setSelectedDeptId] = useState<string>('');
 const { data: departments = [] } = useDepartments();

 // Fiscal year data
 const { isLoading: loadingFY } = useFiscalYears();
 const { data: openFY, isLoading: loadingOpenFY } = useOpenFiscalYear();

 const fiscalYearId = (openFY as FiscalYear | undefined)?.id ?? '';
 const fiscalYear = openFY ? new Date((openFY as FiscalYear).startDate).getFullYear() : new Date().getFullYear();

 // KPIs and income statement (only fetch when fiscal year exists)
 const { data: kpis, isLoading: loadingKpis } = useDashboardKpis(fiscalYearId, selectedDeptId || undefined);
 const { data: incomeStatement, isLoading: loadingIS } = useIncomeStatement(fiscalYearId);

 // Monthly summary (real data for chart)
 const { data: monthlySummaryData } = useMonthlySummary(fiscalYearId);

 // Department-filtered expense stats (for charges KPI and chart when a dept is selected)
 const { data: deptExpenseStats } = useExpenseStats(fiscalYear, selectedDeptId || undefined);

 // Tax declarations
 const { data: declarations = [] } = useUpcomingDeclarations();

 const isLoading = loadingFY || loadingOpenFY || loadingKpis || loadingIS;

 const dashboardKpis = kpis as DashboardKpis | undefined;
 const statement = incomeStatement as IncomeStatement | undefined;

 /* ── Derived chart data ─────────────────────────────────────── */

 // Monthly revenue vs expenses bar chart data (real data from journal entries)
 const monthlyData = useMemo(() => {
 const monthLabels = [
 'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin',
 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec',
 ];

 const summary = monthlySummaryData as { month: number; revenue: number; expenses: number }[] | undefined;
 const deptMonths = (deptExpenseStats as any)?.byMonth as any[] | undefined;

 return monthLabels.map((label, idx) => {
 const entry = summary?.find((s) => s.month === idx + 1);
 const deptMonth = deptMonths?.[idx];
 return {
 month: label,
 revenue: entry?.revenue ?? 0,
 expenses: selectedDeptId && deptMonth !== undefined
 ? Math.round(Number(deptMonth.total) || 0)
 : (entry?.expenses ?? 0),
 };
 });
 }, [monthlySummaryData, deptExpenseStats, selectedDeptId]);

 // Pie data for income statement summary
 const pieData = useMemo(() => {
 if (!dashboardKpis) return [];
 const expensesValue = selectedDeptId
 ? ((deptExpenseStats as any)?.totalYear ?? dashboardKpis.totalExpenses)
 : dashboardKpis.totalExpenses;
 return [
 { name: 'Revenus', value: dashboardKpis.totalRevenue },
 { name: 'Charges', value: expensesValue },
 ].filter((d) => d.value > 0);
 }, [dashboardKpis, deptExpenseStats, selectedDeptId]);

 // Sorted declarations
 const sortedDeclarations = useMemo(
 () =>
 [...declarations].sort(
 (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
 ),
 [declarations],
 );

 /* ── Quick actions ──────────────────────────────────────────── */

 const quickActions = [
 { label: 'Nouvelle ecriture', icon: PenLine, path: '/accounting/entries' },
 { label: 'Lancer la paie', icon: Banknote, path: '/accounting/payroll' },
 { label: 'Declarer TVA', icon: Receipt, path: '/accounting/tax' },
 { label: 'Voir les rapports', icon: FileBarChart, path: '/accounting/reports' },
 ];

 /* ── Loading skeleton ───────────────────────────────────────── */

 if (isLoading) {
 return (
 <div className="space-y-8 animate-pulse">
 <div className="h-8 w-72 bg-gray-100 rounded-lg"/>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="bg-white rounded-2xl p-6 h-28"/>
 ))}
 </div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {Array.from({ length: 3 }).map((_, i) => (
 <div key={i} className="bg-white rounded-2xl p-6 h-28"/>
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 <div className="bg-white rounded-2xl p-6 h-80"/>
 <div className="bg-white rounded-2xl p-6 h-80"/>
 </div>
 </div>
 );
 }

 /* ── No open fiscal year → prompt ───────────────────────────── */

 if (!openFY || !fiscalYearId) {
 return <NoFiscalYearPrompt />;
 }

 /* ── KPI definitions ────────────────────────────────────────── */

 const deptTotalExpenses = selectedDeptId
 ? ((deptExpenseStats as any)?.totalYear ?? dashboardKpis?.totalExpenses ?? 0)
 : (dashboardKpis?.totalExpenses ?? 0);

 const kpiRow1 = [
 { label: 'Chiffre d\'affaires', value: dashboardKpis?.totalRevenue ?? 0, icon: TrendingUp },
 { label: 'Charges', value: deptTotalExpenses, icon: TrendingDown },
 { label: 'Resultat net', value: (dashboardKpis?.totalRevenue ?? 0) - deptTotalExpenses, icon: BarChart3 },
 { label: 'Tresorerie', value: dashboardKpis?.cashBalance ?? 0, icon: Wallet },
 ];

 const kpiRow2 = [
 { label: 'Creances clients', value: dashboardKpis?.receivables ?? 0, icon: Users },
 { label: 'Dettes fournisseurs', value: dashboardKpis?.payables ?? 0, icon: FileText },
 { label: 'TVA due', value: dashboardKpis?.tvaDue ?? 0, icon: Calculator },
 ];

 /* ── Render ─────────────────────────────────────────────────── */

 return (
 <div className="space-y-8">
 {/* Page header */}
 <motion.div
 initial={{ opacity: 0, y: -12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ duration: 0.35 }}
 className="flex items-start justify-between gap-4 flex-wrap"
 >
 <div>
 <h1 className="text-3xl font-bold text-gray-800">Tableau de bord comptable</h1>
 <p className="text-gray-500 mt-1">
 Vue d'ensemble de la sante financiere --{' '}
 {(openFY as FiscalYear).name}
 </p>
 </div>
 <select
 value={selectedDeptId}
 onChange={e => setSelectedDeptId(e.target.value)}
 className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none appearance-none cursor-pointer shadow-sm"
 >
 <option value="">Tous les départements</option>
 {departments.map(dept => (
 <option key={dept.id} value={dept.id}>{dept.name}</option>
 ))}
 </select>
 </motion.div>

 {/* ── Row 1: Primary KPIs ──────────────────────────────── */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
 {kpiRow1.map((kpi, i) => (
 <KpiCard key={kpi.label} index={i} {...kpi} />
 ))}
 </div>

 {/* ── Row 2: Secondary KPIs ────────────────────────────── */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {kpiRow2.map((kpi, i) => (
 <KpiCard key={kpi.label} index={i + 4} {...kpi} />
 ))}
 </div>

 {/* ── Row 3: Charts ────────────────────────────────────── */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Bar chart — Revenue vs Expenses */}
 <motion.div
 custom={0}
 variants={sectionVariants}
 initial="hidden"
 animate="visible"
 className="bg-white rounded-2xl p-6"
 >
 <h3 className="text-base font-bold text-gray-800 mb-1">Revenus vs Charges</h3>
 <p className="text-xs text-gray-400 mb-6">Repartition mensuelle</p>
 <div className="h-[300px] w-full">
 <ResponsiveContainer width="100%" height="100%" debounce={50}>
 <RechartsBarChart
 data={monthlyData}
 margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
 barCategoryGap="20%"
 >
 <CartesianGrid vertical={false} stroke="#F3F4F6"strokeDasharray="4 4"/>
 <XAxis
 dataKey="month"
 axisLine={false}
 tickLine={false}
 tick={{ fill: '#9CA3AF', fontSize: 12 }}
 />
 <YAxis
 axisLine={false}
 tickLine={false}
 tick={{ fill: '#9CA3AF', fontSize: 11 }}
 tickFormatter={(v: number) =>
 v >= 1_000_000
 ? (v / 1_000_000).toFixed(1) + 'M'
 : v >= 1_000
 ? (v / 1_000).toFixed(0) + 'k'
 : String(v)
 }
 />
 <Tooltip
 contentStyle={{
 borderRadius: '12px',
 border: 'none',
 boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
 }}
 cursor={{ fill: '#f3f4f6' }}
 formatter={(value: number, name: string) => [
 fmt(value),
 name === 'revenue' ? 'Revenus' : 'Charges',
 ]}
 />
 <Bar dataKey="revenue"fill={CHART_TEAL} radius={[4, 4, 0, 0]} name="revenue"/>
 <Bar dataKey="expenses"fill={CHART_NAVY} radius={[4, 4, 0, 0]} name="expenses"/>
 </RechartsBarChart>
 </ResponsiveContainer>
 </div>
 {/* Legend */}
 <div className="flex items-center justify-center gap-6 mt-4">
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-sm"style={{ backgroundColor: CHART_TEAL }} />
 <span className="text-xs text-gray-500 font-medium">Revenus</span>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-3 h-3 rounded-sm"style={{ backgroundColor: CHART_NAVY }} />
 <span className="text-xs text-gray-500 font-medium">Charges</span>
 </div>
 </div>
 </motion.div>

 {/* Pie chart — Income Statement Summary */}
 <motion.div
 custom={1}
 variants={sectionVariants}
 initial="hidden"
 animate="visible"
 className="bg-white rounded-2xl p-6 flex flex-col"
 >
 <h3 className="text-base font-bold text-gray-800 mb-1">Repartition du resultat</h3>
 <p className="text-xs text-gray-400 mb-6">Proportion revenus / charges</p>

 {pieData.length === 0 ? (
 <div className="flex-1 flex flex-col items-center justify-center gap-3">
 <BarChart3 size={36} className="text-gray-200"/>
 <p className="text-sm text-gray-400">Aucune donnee disponible</p>
 </div>
 ) : (
 <div className="flex-1 min-h-[280px] relative">
 <ResponsiveContainer width="100%" height="100%" debounce={50}>
 <PieChart>
 <Pie
 data={pieData}
 cx="50%"
 cy="50%"
 innerRadius={70}
 outerRadius={100}
 paddingAngle={4}
 dataKey="value"
 >
 {pieData.map((_, idx) => (
 <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip
 contentStyle={{
 borderRadius: '12px',
 border: 'none',
 boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
 }}
 formatter={(value: number) => [fmt(value), '']}
 />
 <Legend
 verticalAlign="bottom"
 iconType="circle"
 iconSize={10}
 formatter={(value: string) => (
 <span className="text-xs text-gray-600 font-medium">{value}</span>
 )}
 />
 </PieChart>
 </ResponsiveContainer>
 {/* Center label */}
 <div className="absolute inset-0 flex items-center justify-center pointer-events-none"style={{ marginBottom: 28 }}>
 <div className="text-center">
 <p
 className="text-xl font-bold"
 style={{
 color: ((dashboardKpis?.totalRevenue ?? 0) - deptTotalExpenses) >= 0 ? '#33cbcc' : '#283852',
 }}
 >
 {fmt((dashboardKpis?.totalRevenue ?? 0) - deptTotalExpenses)}
 </p>
 <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
 Resultat net
 </p>
 </div>
 </div>
 </div>
 )}
 </motion.div>
 </div>

 {/* ── Row 4: Tax Calendar ──────────────────────────────── */}
 <motion.div
 custom={2}
 variants={sectionVariants}
 initial="hidden"
 animate="visible"
 className="bg-white rounded-2xl p-6"
 >
 <h3 className="text-base font-bold text-gray-800 mb-1">Calendrier fiscal</h3>
 <p className="text-xs text-gray-400 mb-5">Obligations fiscales a venir</p>

 {sortedDeclarations.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-10 gap-3">
 <Calculator size={36} className="text-gray-200"/>
 <p className="text-sm text-gray-400">Aucune obligation fiscale a venir</p>
 </div>
 ) : (
 <div className="space-y-3">
 {sortedDeclarations.map((decl) => {
 const days = getDaysUntil(decl.dueDate);
 return (
 <div
 key={decl.id}
 className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${urgencyClasses(decl.dueDate)}`}
 >
 {/* Type badge */}
 <span className="text-xs font-semibold text-gray-500 shrink-0 uppercase tracking-wide">
 {decl.type}
 </span>

 {/* Period */}
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-700 truncate">{decl.period}</p>
 <p className="text-xs text-gray-400 mt-0.5">
 Echeance :{' '}
 {new Date(decl.dueDate).toLocaleDateString('fr-FR', {
 day: '2-digit',
 month: 'long',
 year: 'numeric',
 })}
 {days <= 7 && days >= 0 && (
 <span className="ml-2 text-[#283852] font-semibold">
 ({days === 0 ?"Aujourd'hui": `J-${days}`})
 </span>
 )}
 {days > 7 && days <= 30 && (
 <span className="ml-2 text-[#283852]/60 font-medium">
 (J-{days})
 </span>
 )}
 </p>
 </div>

 {/* Amount */}
 <span className="text-sm font-bold text-gray-800 shrink-0">{fmt(decl.totalAmount)}</span>

 {/* Status */}
 <span
 className={`text-[11px] font-semibold shrink-0 ${statusBadge(decl.status)}`}
 >
 {statusLabel(decl.status)}
 </span>
 </div>
 );
 })}
 </div>
 )}
 </motion.div>

 {/* ── Row 5: Quick Actions ──────────────────────────────── */}
 <motion.div
 custom={3}
 variants={sectionVariants}
 initial="hidden"
 animate="visible"
 >
 <h3 className="text-base font-bold text-gray-800 mb-4">Actions rapides</h3>
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {quickActions.map((action, idx) => (
 <motion.button
 key={action.path}
 custom={idx}
 variants={cardVariants}
 initial="hidden"
 animate="visible"
 onClick={() => navigate(action.path)}
 className="flex items-center gap-3 bg-white rounded-2xl p-5 text-left hover: border border-transparent transition-all group"
 >
 <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center shrink-0 group-hover:bg-[#33cbcc]/20 transition-colors">
 <action.icon size={20} className="text-[#33cbcc]"/>
 </div>
 <span className="text-sm font-semibold text-gray-700 group-hover:text-[#33cbcc] transition-colors">
 {action.label}
 </span>
 </motion.button>
 ))}
 </div>
 </motion.div>
 </div>
 );
};

export default AccountantDashboard;
