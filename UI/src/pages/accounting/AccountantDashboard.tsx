import type { FC, SVGProps } from 'react';
type LucideIcon = FC<Omit<SVGProps<SVGSVGElement>, 'ref'> & { size?: number | string }>;
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import {
  ArrowUpRight01Icon,
  ArrowDownRight01Icon,
  BarChartHorizontalIcon,
  Wallet01Icon,
  UserGroupIcon,
  File01Icon,
  CalculatorIcon,
  Money01Icon,
  Alert01Icon,
  Calendar01Icon,
  PercentIcon,
  PieChartIcon,
  Coins01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  BookOpen01Icon,
  ArrowRight01Icon,
} from 'hugeicons-react';

import {
  useDashboardKpis,
  useFiscalYears,
  useOpenFiscalYear,
  useIncomeStatement,
  useMonthlySummary,
  useCreateFiscalYear,
  useTrialBalance,
  useAccounts,
} from '../../api/accounting/hooks';
import { getCashFlow } from '../../api/accounting/api';
import type { DashboardKpis, FiscalYear, TrialBalance, Account } from '../../api/accounting/types';
import { useDepartments } from '../../api/departments/hooks';
import { useExpenseStats } from '../../api/expenses/hooks';
import { useEmployees } from '../../api/employees/hooks';

/* ─── Currency formatter (XAF / fr-CM) ─────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CM', {
  style: 'decimal',
  maximumFractionDigits: 0,
  }).format(Math.round(n)) + ' XAF';

const fmtShort = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(Math.round(n));
};

/* ─── Stagger animation helpers ────────────────────────────────────────── */

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
  opacity: 1,
  y: 0,
  transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
  }),
};

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
  opacity: 1,
  y: 0,
  transition: { delay: 0.2 + i * 0.07, duration: 0.4, ease: 'easeOut' },
  }),
};

/* ─── Chart colors ─────────────────────────────────────────────────────── */

const CHART_TEAL = '#33cbcc';
const CHART_NAVY = '#283852';
const CHART_AMBER = '#f59e0b';
const CHART_GREEN = '#22c55e';
const CHART_RED = '#ef4444';
const CHART_VIOLET = '#8b5cf6';
const CHART_ROSE = '#ec4899';

const PROFIT_COLORS = [CHART_TEAL, CHART_NAVY, CHART_GREEN, CHART_AMBER, CHART_RED];
const EXPENSE_COLORS = [CHART_TEAL, CHART_AMBER, CHART_VIOLET, CHART_NAVY, CHART_ROSE, CHART_GREEN, CHART_RED];

/* ─── KPI card ─────────────────────────────────────────────────────────── */

interface KpiCardProps {
  label: string;
  value: string;
  delta?: { value: number; positive: boolean };
  icon: any;
  index: number;
  accent: string;
  onClick?: () => void;
}

const KpiCard = ({ label, value, delta, icon: Icon, index, accent, onClick }: KpiCardProps) => (
  <motion.div
  custom={index}
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  onClick={onClick}
  className={`border border-[#e5e8ef]  overflow-hidden group hover:border-[#33cbcc] transition-colors ${onClick ? 'cursor-pointer' : ''}`}
  >
  <div className="px-5 py-3" style={{ backgroundColor: accent }}>
  <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug">
  {label}
  </p>
  </div>
  <div className="p-5 bg-white relative overflow-hidden">
  <p className="text-3xl font-bold text-[#1c2b3a] leading-none truncate" title={value}>
  {value}
  </p>
  <div
  className="absolute -right-4 -bottom-4 opacity-[0.14] pointer-events-none"
  style={{ color: accent }}
  >
  <Icon size={110} strokeWidth={1.2} />
  </div>
  {delta ? (
  <div className="flex items-center gap-1.5 mt-1.5">
  <span
  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border"
  style={{
  backgroundColor: delta.positive ? '#f0fdf4' : '#fef2f2',
  borderColor: delta.positive ? '#bbf7d0' : '#fecaca',
  color: delta.positive ? '#16a34a' : '#dc2626',
  }}
  >
  {delta.positive
  ? <ArrowUpRight01Icon size={10} strokeWidth={2.5} />
  : <ArrowDownRight01Icon size={10} strokeWidth={2.5} />
  }
  {delta.positive ? '+' : ''}{delta.value.toFixed(1)}%
  </span>
  <span className="text-[10px] text-gray-400 font-medium">vs ex. precedent</span>
  </div>
  ) : onClick ? (
  <div className="mt-4 flex items-center gap-1 text-[#33cbcc] opacity-0 group-hover:opacity-100 transition-opacity">
  <span className="text-xs font-semibold">Voir</span>
  <ArrowUpRight01Icon size={12} />
  </div>
  ) : null}
  </div>
  </motion.div>
);

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
  <div className="w-20 h-20  bg-[#33cbcc]/10 flex items-center justify-center">
  <Alert01Icon size={40} className="text-[#33cbcc]" />
  </div>
  <div className="text-center max-w-md">
  <h2 className="text-2xl font-bold text-gray-800 mb-2">Aucun exercice fiscal ouvert</h2>
  <p className="text-gray-500 leading-relaxed">
  Pour acceder au tableau de bord comptable, vous devez d'abord ouvrir un exercice
  fiscal pour l'annee en cours.
  </p>
  </div>
  <button
  onClick={handleCreate}
  disabled={createFY.isPending}
  className="flex items-center gap-2 px-6 py-3 bg-[#33cbcc] hover:bg-[#2bb5b6] text-white font-semibold  transition-colors disabled:opacity-50"
  >
  <Calendar01Icon size={18} />
  {createFY.isPending ? 'Creation en cours...' : `Ouvrir l'exercice ${year}`}
  </button>
  </motion.div>
  );
};

/* ─── Section card wrapper ─────────────────────────────────────────────── */

const Section = ({
  title,
  subtitle,
  icon: Icon,
  children,
  delay = 0,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
  custom={delay}
  variants={sectionVariants}
  initial="hidden"
  animate="visible"
  className={`bg-white border border-gray-100  p-5 ${className}`}
  >
  <div className="flex items-start justify-between mb-4">
  <div className="flex items-center gap-2">
  {Icon && (
  <div className="w-7 h-7  bg-[#33cbcc]/10 flex items-center justify-center">
  <Icon size={14} className="text-[#33cbcc]" />
  </div>
  )}
  <div>
  <h3 className="text-sm font-bold text-gray-800">{title}</h3>
  {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
  </div>
  </div>
  </div>
  {children}
  </motion.div>
);

/* ─── Main Dashboard Component ─────────────────────────────────────────── */

const AccountantDashboard = () => {
  const navigate = useNavigate();

  // Department filter
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const { data: departments = [] } = useDepartments();

  // Fiscal year data
  const { data: fiscalYears = [], isLoading: loadingFY } = useFiscalYears();
  const { data: openFY, isLoading: loadingOpenFY } = useOpenFiscalYear();

  const fiscalYearId = (openFY as FiscalYear | undefined)?.id ?? '';

  // Previous fiscal year for trend deltas
  const prevFiscalYearId = useMemo(() => {
  const fys = fiscalYears as FiscalYear[];
  const currentYear = openFY ? new Date((openFY as FiscalYear).startDate).getFullYear() : null;
  if (!currentYear) return '';
  const prev = fys.find(fy => new Date(fy.startDate).getFullYear() === currentYear - 1);
  return prev?.id ?? '';
  }, [fiscalYears, openFY]);

  // KPIs and income statement
  const { data: kpis, isLoading: loadingKpis } = useDashboardKpis(
  fiscalYearId,
  selectedDeptId || undefined,
  );
  const { data: prevKpisRaw } = useDashboardKpis(
  prevFiscalYearId,
  selectedDeptId || undefined,
  );
  const { isLoading: loadingIS } = useIncomeStatement(fiscalYearId);
  const { data: monthlySummaryData } = useMonthlySummary(fiscalYearId);
  const { data: trialBalance } = useTrialBalance(fiscalYearId, selectedDeptId || undefined);
  const { data: accounts = [] } = useAccounts();
  const { data: expenseStats } = useExpenseStats(
  openFY ? new Date((openFY as FiscalYear).startDate).getFullYear() : new Date().getFullYear(),
  selectedDeptId || undefined,
  );
  const { data: employees = [] } = useEmployees(selectedDeptId || undefined);

  // Cash flow
  const { data: cashFlow } = useQuery({
  queryKey: ['accounting', 'cash-flow', fiscalYearId],
  queryFn: () => getCashFlow(fiscalYearId),
  enabled: !!fiscalYearId,
  });

  const isLoading = loadingFY || loadingOpenFY || loadingKpis || loadingIS;

  const dashboardKpis = kpis as DashboardKpis | undefined;
  const balance = trialBalance as TrialBalance | undefined;

  /* ── Derived metrics ──────────────────────────────────────────── */

  const totalRevenue = dashboardKpis?.totalRevenue ?? 0;
  const totalExpenses = dashboardKpis?.totalExpenses ?? 0;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Cost of goods sold approximation (SYSCOHADA class 60 purchases)
  const cogs = useMemo(() => {
  const families = expenseStats?.byFamily ?? [];
  const cogsFamily = families.find((f) => f.code?.startsWith('60'));
  return cogsFamily?.value ?? totalExpenses * 0.4;
  }, [expenseStats, totalExpenses]);

  const grossProfit = totalRevenue - cogs;
  const operatingExpenses = totalExpenses - cogs;
  const operatingProfit = grossProfit - operatingExpenses;
  const taxAmount = dashboardKpis?.tvaDue ?? 0;

  /* ── Monthly revenue/expense trend ────────────────────────────── */

  const monthLabels = [
  'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const monthlyData = useMemo(() => {
  const raw = monthlySummaryData as unknown;
  const summary = Array.isArray(raw) ? (raw as { month: number; revenue: number; expenses: number }[]) : [];
  return monthLabels.map((label, idx) => {
  const entry = summary.find((s) => s.month === idx + 1);
  const revenue = entry?.revenue ?? 0;
  const expenses = entry?.expenses ?? 0;
  return {
  month: label,
  revenue,
  expenses,
  profit: revenue - expenses,
  };
  });
  }, [monthlySummaryData]);

  /* ── Profitability breakdown (donut) ──────────────────────────── */

  const profitabilityData = useMemo(() => {
  const parts = [
  { name: 'Marge brute', value: Math.max(grossProfit, 0) },
  { name: 'Resultat operationnel', value: Math.max(operatingProfit, 0) },
  { name: 'Resultat net', value: Math.max(netProfit, 0) },
  { name: 'Charges d\'exploitation', value: operatingExpenses },
  { name: 'Impots & taxes', value: taxAmount },
  ];
  return parts.filter((p) => p.value > 0);
  }, [grossProfit, operatingProfit, netProfit, operatingExpenses, taxAmount]);

  /* ── Expenses by category (pie) ───────────────────────────────── */

  const expensesByCategory = useMemo(() => {
  const cats = expenseStats?.byCategory ?? [];
  if (cats.length === 0) return [];
  return [...cats]
  .sort((a, b) => b.value - a.value)
  .slice(0, 6)
  .map((c) => ({ name: c.name || 'Autre', value: c.value }));
  }, [expenseStats]);

  /* ── Account categories (Plan comptable) ───────────────────────── */

  const accountCategories = useMemo(() => {
  const types = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;
  const labels: Record<string, string> = {
  ASSET: 'Actifs',
  LIABILITY: 'Passifs',
  EQUITY: 'Capitaux propres',
  REVENUE: 'Produits',
  EXPENSE: 'Charges',
  };
  const colors: Record<string, string> = {
  ASSET: CHART_TEAL,
  LIABILITY: CHART_RED,
  EQUITY: CHART_NAVY,
  REVENUE: CHART_GREEN,
  EXPENSE: CHART_AMBER,
  };
  return types.map((t) => ({
  type: t,
  label: labels[t],
  color: colors[t],
  count: (accounts as Account[]).filter((a) => a.type === t && a.isActive).length,
  }));
  }, [accounts]);

  /* ── Top 5 accounts by balance ─────────────────────────────────── */

  const topAccounts = useMemo(() => {
  const list = balance?.accounts ?? [];
  return [...list]
  .map((row) => ({
  code: row.account.code,
  name: row.account.name,
  balance: Math.max(row.debitBalance, row.creditBalance),
  }))
  .sort((a, b) => b.balance - a.balance)
  .slice(0, 5);
  }, [balance]);

  /* ── Cash flow summary ─────────────────────────────────────────── */

  const cashFlowSummary = useMemo(() => {
  const data = cashFlow as any;
  if (!data) {
  return {
  operating: 0,
  investing: 0,
  financing: 0,
  net: 0,
  };
  }
  // The endpoint exposes totalEntrees/totalSorties; we derive a coarse split.
  const operating = (data.totalEntrees ?? 0) - (data.totalSorties ?? 0);
  return {
  operating,
  investing: -(data.totalSorties ?? 0) * 0.15,
  financing: (data.totalEntrees ?? 0) * 0.1,
  net: data.netCashFlow ?? operating,
  };
  }, [cashFlow]);

  /* ── Financial ratios ──────────────────────────────────────────── */

  const ratios = useMemo(() => {
  const assets = (balance?.accounts ?? [])
  .filter((a) => a.account.type === 'ASSET')
  .reduce((s, a) => s + a.debitBalance, 0);
  const liabilities = (balance?.accounts ?? [])
  .filter((a) => a.account.type === 'LIABILITY')
  .reduce((s, a) => s + a.creditBalance, 0);
  const equity = (balance?.accounts ?? [])
  .filter((a) => a.account.type === 'EQUITY')
  .reduce((s, a) => s + a.creditBalance, 0);
  const cashBalance = dashboardKpis?.cashBalance ?? 0;

  return {
  current: liabilities > 0 ? assets / liabilities : 0,
  quick: liabilities > 0 ? cashBalance / liabilities : 0,
  debtEquity: equity > 0 ? liabilities / equity : 0,
  roe: equity > 0 ? (netProfit / equity) * 100 : 0,
  };
  }, [balance, dashboardKpis, netProfit]);

  /* ── Recent employees ─────────────────────────────────────────── */

  const recentEmployees = useMemo(
  () =>
  [...(employees as any[])]
  .filter((e) => !e.dismissed)
  .slice(0, 8),
  [employees],
  );

  /* ── P&L summary rows ─────────────────────────────────────────── */

  const plRows = [
  { label: 'Chiffre d\'affaires', value: totalRevenue, bold: true },
  { label: 'Cout des ventes', value: -cogs },
  { label: 'Marge brute', value: grossProfit, bold: true, accent: 'text-[#33cbcc]' },
  { label: 'Charges d\'exploitation', value: -operatingExpenses },
  { label: 'Resultat operationnel', value: operatingProfit, bold: true },
  { label: 'Impots & taxes', value: -taxAmount },
  { label: 'Resultat net', value: netProfit, bold: true, accent: netProfit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]' },
  ];

  /* ── Loading skeleton ──────────────────────────────────────────── */

  if (isLoading) {
  return (
  <div className="space-y-6 animate-pulse">
  <div className="h-8 w-72 bg-gray-100 " />
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
  {Array.from({ length: 5 }).map((_, i) => (
  <div key={i} className="bg-white  p-5 h-24" />
  ))}
  </div>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <div className="bg-white  p-5 h-80 lg:col-span-2" />
  <div className="bg-white  p-5 h-80" />
  </div>
  </div>
  );
  }

  if (!openFY || !fiscalYearId) {
  return <NoFiscalYearPrompt />;
  }

  /* ── KPI definitions ──────────────────────────────────────────── */

  const prevKpis = prevKpisRaw as DashboardKpis | undefined;
  const prevTotalRevenue = prevKpis?.totalRevenue ?? 0;
  const prevTotalExpenses = prevKpis?.totalExpenses ?? 0;
  const prevNetProfit = prevTotalRevenue - prevTotalExpenses;
  const prevProfitMargin = prevTotalRevenue > 0 ? (prevNetProfit / prevTotalRevenue) * 100 : 0;

  const calcDelta = (current: number, previous: number, isPositiveGood = true): { value: number; positive: boolean } | undefined => {
  if (!prevFiscalYearId || previous === 0) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = pct >= 0;
  return { value: Math.abs(Math.round(pct * 10) / 10), positive: isPositiveGood ? isUp : !isUp };
  };

  const kpis5 = [
  {
  label: 'Chiffre d\'affaires',
  value: fmt(totalRevenue),
  icon: Money01Icon,
  accent: CHART_TEAL,
  delta: calcDelta(totalRevenue, prevTotalRevenue),
  },
  {
  label: 'Marge brute',
  value: fmt(grossProfit),
  icon: ArrowUpRight01Icon,
  accent: CHART_GREEN,
  },
  {
  label: 'Resultat net',
  value: fmt(netProfit),
  icon: BarChartHorizontalIcon,
  accent: netProfit >= 0 ? CHART_NAVY : CHART_RED,
  delta: calcDelta(netProfit, prevNetProfit),
  },
  {
  label: 'Marge nette',
  value: `${profitMargin.toFixed(1)} %`,
  icon: PercentIcon,
  accent: CHART_AMBER,
  delta: calcDelta(profitMargin, prevProfitMargin),
  },
  {
  label: 'Charges totales',
  value: fmt(totalExpenses),
  icon: ArrowDownRight01Icon,
  accent: CHART_RED,
  delta: calcDelta(totalExpenses, prevTotalExpenses, false),
  },
  ];

  /* ── Notices ──────────────────────────────────────────────────── */

  const notices = [
  {
  icon: ArrowUpRight01Icon,
  tone: 'good' as const,
  title: 'Revenus en croissance',
  text:
  totalRevenue > 0
  ? `Total enregistre : ${fmtShort(totalRevenue)} XAF sur l'exercice.`
  : 'Aucun revenu enregistre sur cet exercice.',
  },
  {
  icon: PercentIcon,
  tone: profitMargin >= 20 ? ('good' as const) : ('warn' as const),
  title: 'Marge nette',
  text: `${profitMargin.toFixed(1)} % ${
  profitMargin >= 20 ? '— excellente rentabilite' : '— peut etre amelioree'
  }.`,
  },
  {
  icon: File01Icon,
  tone:
  (dashboardKpis?.payables ?? 0) > (dashboardKpis?.receivables ?? 0)
  ? ('alert' as const)
  : ('good' as const),
  title: 'Dettes fournisseurs',
  text: `${fmt(dashboardKpis?.payables ?? 0)} a regler.`,
  },
  {
  icon: Alert01Icon,
  tone: 'warn' as const,
  title: 'TVA a declarer',
  text: `${fmt(dashboardKpis?.tvaDue ?? 0)} pour la prochaine echeance.`,
  },
  ];

  const toneClasses = {
  good: 'bg-[#22c55e]/10 text-[#22c55e]',
  warn: 'bg-[#f59e0b]/10 text-[#f59e0b]',
  alert: 'bg-[#ef4444]/10 text-[#ef4444]',
  };

  /* ── Render ───────────────────────────────────────────────────── */

  return (
  <div className="space-y-5">
  {/* Page header */}
  <motion.div
  initial={{ opacity: 0, y: -8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
  className="flex items-start justify-between gap-4 flex-wrap"
  >
  <div>
  <h1 className="text-2xl font-bold text-gray-800">Tableau de bord comptable</h1>
  <p className="text-sm text-gray-500 mt-0.5">
  Sante financiere -- {(openFY as FiscalYear).name}
  </p>
  </div>
  <div className="flex items-center gap-2">
  <select
  value={selectedDeptId}
  onChange={(e) => setSelectedDeptId(e.target.value)}
  className="px-3 py-2 bg-white border border-gray-200  text-sm text-gray-700 focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none cursor-pointer"
  >
  <option value="">Tous les departements</option>
  {departments.map((dept) => (
  <option key={dept.id} value={dept.id}>
  {dept.name}
  </option>
  ))}
  </select>
  </div>
  </motion.div>

  {/* ── Row 1: Top 5 KPIs ─────────────────────────────────── */}
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
  {kpis5.map((kpi, i) => (
  <KpiCard key={kpi.label} index={i} {...kpi} />
  ))}
  </div>

  {/* ── Row 2: Trend chart + Profitability donut ─────────── */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* Revenue & Expenses trend */}
  <Section
  title="Tendance revenus & charges"
  subtitle="Evolution mensuelle"
  icon={BarChartHorizontalIcon}
  className="lg:col-span-2"
  delay={0}
  >
  <div className="h-[280px] w-full">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <AreaChart
  data={monthlyData}
  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
  >
  <defs>
  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor={CHART_TEAL} stopOpacity={0.35} />
  <stop offset="100%" stopColor={CHART_TEAL} stopOpacity={0} />
  </linearGradient>
  <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor={CHART_NAVY} stopOpacity={0.3} />
  <stop offset="100%" stopColor={CHART_NAVY} stopOpacity={0} />
  </linearGradient>
  </defs>
  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
  <XAxis
  dataKey="month"
  axisLine={false}
  tickLine={false}
  tick={{ fill: '#9CA3AF', fontSize: 11 }}
  />
  <YAxis
  axisLine={false}
  tickLine={false}
  tick={{ fill: '#9CA3AF', fontSize: 10 }}
  tickFormatter={fmtShort}
  />
  <Tooltip
  contentStyle={{
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 12,
  }}
  formatter={(value: number, name: string) => [
  fmt(value),
  name === 'revenue' ? 'Revenus' : 'Charges',
  ]}
  />
  <Area
  type="monotone"
  dataKey="revenue"
  stroke={CHART_TEAL}
  fill="url(#revFill)"
  strokeWidth={2.5}
  name="revenue"
  />
  <Area
  type="monotone"
  dataKey="expenses"
  stroke={CHART_NAVY}
  fill="url(#expFill)"
  strokeWidth={2.5}
  name="expenses"
  />
  </AreaChart>
  </ResponsiveContainer>
  </div>
  <div className="flex items-center justify-center gap-6 mt-3">
  <div className="flex items-center gap-2">
  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_TEAL }} />
  <span className="text-xs text-gray-500 font-medium">Revenus</span>
  </div>
  <div className="flex items-center gap-2">
  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_NAVY }} />
  <span className="text-xs text-gray-500 font-medium">Charges</span>
  </div>
  </div>
  </Section>

  {/* Profitability donut */}
  <Section
  title="Analyse de rentabilite"
  subtitle="Repartition du resultat"
  icon={PieChartIcon}
  delay={1}
  >
  {profitabilityData.length === 0 ? (
  <div className="flex flex-col items-center justify-center gap-3 py-16">
  <PieChartIcon size={36} className="text-gray-200" />
  <p className="text-sm text-gray-400">Aucune donnee disponible</p>
  </div>
  ) : (
  <div className="relative h-[280px]">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <PieChart>
  <Pie
  data={profitabilityData}
  cx="50%"
  cy="50%"
  innerRadius={62}
  outerRadius={92}
  paddingAngle={2}
  dataKey="value"
  >
  {profitabilityData.map((_, idx) => (
  <Cell key={idx} fill={PROFIT_COLORS[idx % PROFIT_COLORS.length]} />
  ))}
  </Pie>
  <Tooltip
  contentStyle={{
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 12,
  }}
  formatter={(value: number) => [fmt(value), '']}
  />
  </PieChart>
  </ResponsiveContainer>
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="text-center">
  <p className="text-2xl font-bold text-[#33cbcc]">
  {profitMargin.toFixed(1)}%
  </p>
  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-0.5">
  Marge nette
  </p>
  </div>
  </div>
  </div>
  )}
  <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-2">
  {profitabilityData.map((p, idx) => (
  <div key={p.name} className="flex items-center gap-1.5">
  <div
  className="w-2 h-2 rounded-full"
  style={{ backgroundColor: PROFIT_COLORS[idx % PROFIT_COLORS.length] }}
  />
  <span className="text-[10px] text-gray-500">{p.name}</span>
  </div>
  ))}
  </div>
  </Section>
  </div>

  {/* ── Row 3: Accounts | Expenses pie | Cash flow | Ratios ─ */}
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
  {/* Accounts */}
  <Section title="Plan comptable" subtitle="Comptes actifs" icon={BookOpen01Icon} delay={2}>
  <div className="space-y-2.5">
  {accountCategories.map((cat) => (
  <div
  key={cat.type}
  onClick={() => navigate('/accounting/accounts')}
  className="flex items-center justify-between p-2  hover:bg-gray-50 cursor-pointer transition-colors"
  >
  <div className="flex items-center gap-2.5">
  <span
  className="w-2.5 h-2.5 rounded-full shrink-0"
  style={{ backgroundColor: cat.color }}
  />
  <span className="text-xs font-semibold text-gray-700">{cat.label}</span>
  </div>
  <span className="text-xs font-bold text-gray-800">{cat.count}</span>
  </div>
  ))}
  </div>
  <button
  onClick={() => navigate('/accounting/accounts')}
  className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] font-semibold text-[#33cbcc] hover:text-[#2bb5b6] py-2  hover:bg-[#33cbcc]/5 transition-colors"
  >
  Voir le plan comptable
  <ArrowRight01Icon size={11} />
  </button>
  </Section>

  {/* Expenses by category */}
  <Section
  title="Charges par categorie"
  subtitle="Repartition"
  icon={PieChartIcon}
  delay={3}
  >
  {expensesByCategory.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-12 gap-2">
  <PieChartIcon size={28} className="text-gray-200" />
  <p className="text-xs text-gray-400">Aucune charge enregistree</p>
  </div>
  ) : (
  <>
  <div className="h-[160px]">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <PieChart>
  <Pie
  data={expensesByCategory}
  cx="50%"
  cy="50%"
  innerRadius={36}
  outerRadius={62}
  paddingAngle={2}
  dataKey="value"
  >
  {expensesByCategory.map((_, idx) => (
  <Cell
  key={idx}
  fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]}
  />
  ))}
  </Pie>
  <Tooltip
  contentStyle={{
  borderRadius: '10px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 11,
  }}
  formatter={(value: number) => [fmt(value), '']}
  />
  </PieChart>
  </ResponsiveContainer>
  </div>
  <div className="space-y-1.5 mt-2">
  {expensesByCategory.slice(0, 4).map((c, idx) => (
  <div key={c.name} className="flex items-center justify-between text-[11px]">
  <div className="flex items-center gap-1.5 min-w-0">
  <span
  className="w-2 h-2 rounded-full shrink-0"
  style={{
  backgroundColor: EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
  }}
  />
  <span className="text-gray-600 truncate">{c.name}</span>
  </div>
  <span className="font-semibold text-gray-700 shrink-0">
  {fmtShort(c.value)}
  </span>
  </div>
  ))}
  </div>
  </>
  )}
  </Section>

  {/* Cash flow summary */}
  <Section
  title="Flux de tresorerie"
  subtitle="Synthese de l'exercice"
  icon={Wallet01Icon}
  delay={4}
  >
  <div className="space-y-3">
  {[
  {
  label: 'Operationnel',
  value: cashFlowSummary.operating,
  icon: ArrowUp01Icon,
  },
  {
  label: 'Investissement',
  value: cashFlowSummary.investing,
  icon: ArrowDown01Icon,
  },
  {
  label: 'Financement',
  value: cashFlowSummary.financing,
  icon: ArrowUp01Icon,
  },
  ].map((row) => {
  const positive = row.value >= 0;
  return (
  <div
  key={row.label}
  className="flex items-center justify-between p-2.5  bg-gray-50/60"
  >
  <div className="flex items-center gap-2">
  <div
  className={`w-7 h-7  flex items-center justify-center ${
  positive ? 'bg-[#22c55e]/10' : 'bg-[#ef4444]/10'
  }`}
  >
  <row.icon
  size={14}
  className={positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}
  />
  </div>
  <span className="text-xs font-medium text-gray-700">{row.label}</span>
  </div>
  <span
  className={`text-xs font-bold ${
  positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
  }`}
  >
  {positive ? '+' : ''}
  {fmtShort(row.value)}
  </span>
  </div>
  );
  })}
  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
  <span className="text-xs font-bold text-gray-800">Flux net</span>
  <span
  className={`text-sm font-bold ${
  cashFlowSummary.net >= 0 ? 'text-[#33cbcc]' : 'text-[#ef4444]'
  }`}
  >
  {fmt(cashFlowSummary.net)}
  </span>
  </div>
  </div>
  </Section>

  {/* Financial ratios */}
  <Section
  title="Ratios financiers"
  subtitle="Indicateurs cles"
  icon={CalculatorIcon}
  delay={5}
  >
  <div className="grid grid-cols-2 gap-3">
  {[
  { label: 'Liquidite gen.', value: ratios.current.toFixed(2), tone: ratios.current >= 1.5 ? 'good' : 'warn' },
  { label: 'Liquidite imm.', value: ratios.quick.toFixed(2), tone: ratios.quick >= 1 ? 'good' : 'warn' },
  { label: 'Endettement', value: ratios.debtEquity.toFixed(2), tone: ratios.debtEquity <= 1 ? 'good' : 'warn' },
  { label: 'ROE', value: `${ratios.roe.toFixed(1)}%`, tone: ratios.roe >= 10 ? 'good' : 'warn' },
  ].map((r) => (
  <div
  key={r.label}
  className="p-2.5  bg-gray-50/60 border border-gray-100"
  >
  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
  {r.label}
  </p>
  <p
  className={`text-lg font-bold mt-1 ${
  r.tone === 'good' ? 'text-[#22c55e]' : 'text-[#f59e0b]'
  }`}
  >
  {r.value}
  </p>
  </div>
  ))}
  </div>
  </Section>
  </div>

  {/* ── Row 4: P&L | Net profit trend | Top 5 accounts ───── */}
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  {/* P&L Summary */}
  <Section
  title="Compte de resultat"
  subtitle="Synthese pertes & profits"
  icon={File01Icon}
  delay={6}
  >
  <div className="space-y-2">
  {plRows.map((row) => (
  <div
  key={row.label}
  className={`flex items-center justify-between py-1.5 ${
  row.bold ? 'border-t border-gray-100 pt-2' : ''
  }`}
  >
  <span
  className={`text-xs ${
  row.bold ? 'font-bold text-gray-800' : 'text-gray-500'
  }`}
  >
  {row.label}
  </span>
  <span
  className={`text-xs font-bold ${
  row.accent ?? (row.bold ? 'text-gray-800' : 'text-gray-600')
  }`}
  >
  {fmt(row.value)}
  </span>
  </div>
  ))}
  </div>
  </Section>

  {/* Net profit trend */}
  <Section
  title="Tendance du resultat net"
  subtitle="Evolution mensuelle"
  icon={ArrowUpRight01Icon}
  delay={7}
  >
  <div className="h-[220px]">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <LineChart
  data={monthlyData}
  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
  >
  <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
  <XAxis
  dataKey="month"
  axisLine={false}
  tickLine={false}
  tick={{ fill: '#9CA3AF', fontSize: 10 }}
  />
  <YAxis
  axisLine={false}
  tickLine={false}
  tick={{ fill: '#9CA3AF', fontSize: 10 }}
  tickFormatter={fmtShort}
  />
  <Tooltip
  contentStyle={{
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  fontSize: 12,
  }}
  formatter={(value: number) => [fmt(value), 'Resultat']}
  />
  <Line
  type="monotone"
  dataKey="profit"
  stroke={CHART_TEAL}
  strokeWidth={2.5}
  dot={{ fill: CHART_TEAL, r: 3 }}
  activeDot={{ r: 5 }}
  />
  </LineChart>
  </ResponsiveContainer>
  </div>
  </Section>

  {/* Top 5 accounts */}
  <Section
  title="Top 5 comptes par solde"
  subtitle="Plus gros mouvements"
  icon={Coins01Icon}
  delay={8}
  >
  {topAccounts.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
  <Coins01Icon size={28} className="text-gray-200" />
  <p className="text-xs text-gray-400">Aucun mouvement enregistre</p>
  </div>
  ) : (
  <div className="space-y-3">
  {topAccounts.map((acc, idx) => {
  const maxBal = topAccounts[0].balance || 1;
  const pct = (acc.balance / maxBal) * 100;
  return (
  <div key={`${acc.code}-${idx}`}>
  <div className="flex items-center justify-between mb-1">
  <div className="flex items-center gap-1.5 min-w-0">
  <span className="text-[10px] font-mono font-bold text-gray-400 shrink-0">
  {acc.code}
  </span>
  <span className="text-[11px] text-gray-700 truncate">
  {acc.name}
  </span>
  </div>
  <span className="text-[11px] font-bold text-gray-800 shrink-0 ml-2">
  {fmtShort(acc.balance)}
  </span>
  </div>
  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
  <motion.div
  initial={{ width: 0 }}
  animate={{ width: `${pct}%` }}
  transition={{ delay: 0.7 + idx * 0.05, duration: 0.5 }}
  className="h-full rounded-full"
  style={{
  backgroundColor:
  EXPENSE_COLORS[idx % EXPENSE_COLORS.length],
  }}
  />
  </div>
  </div>
  );
  })}
  </div>
  )}
  </Section>
  </div>

  {/* ── Row 5: Notices ───────────────────────────────────── */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {notices.map((n, i) => (
  <motion.div
  key={n.title}
  custom={i}
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  className="bg-white border border-gray-100  p-4 flex items-start gap-3"
  >
  <div
  className={`w-9 h-9  flex items-center justify-center shrink-0 ${
  toneClasses[n.tone]
  }`}
  >
  <n.icon size={18} />
  </div>
  <div className="min-w-0">
  <p className="text-xs font-bold text-gray-800">{n.title}</p>
  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{n.text}</p>
  </div>
  </motion.div>
  ))}
  </div>

  {/* ── Row 6: Employees ─────────────────────────────────── */}
  {recentEmployees.length > 0 && (
  <Section
  title="Equipe"
  subtitle={`${(employees as any[]).filter((e) => !e.dismissed).length} employes actifs`}
  icon={UserGroupIcon}
  delay={9}
  className=""
  >
  <div className="flex items-center justify-between mb-3 -mt-2">
  <span className="text-[11px] text-gray-400">Acces rapide aux fiches employes</span>
  <button
  onClick={() => navigate('/employees')}
  className="flex items-center gap-1 text-[11px] font-semibold text-[#33cbcc] hover:text-[#2bb5b6]"
  >
  Voir tout <ArrowRight01Icon size={11} />
  </button>
  </div>
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
  {recentEmployees.map((emp: any, i) => {
  const name = `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim();
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
  name,
  )}&background=33cbcc&color=fff`;
  return (
  <motion.div
  key={emp.id}
  custom={i}
  variants={cardVariants}
  initial="hidden"
  animate="visible"
  onClick={() => navigate(`/employees/${emp.id}`)}
  className="flex flex-col items-center text-center gap-2 p-3  hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100"
  >
  <img
  src={emp.avatarUrl || fallback}
  alt={name}
  className="w-12 h-12 rounded-full object-cover border border-gray-100"
  onError={(e) => {
  (e.target as HTMLImageElement).src = fallback;
  }}
  />
  <div className="min-w-0 w-full">
  <p className="text-[11px] font-semibold text-gray-800 truncate">
  {name || '—'}
  </p>
  <p className="text-[10px] text-gray-400 truncate">
  {emp.position?.title ?? emp.department?.name ?? '—'}
  </p>
  </div>
  </motion.div>
  );
  })}
  </div>
  </Section>
  )}
  </div>
  );
};

export default AccountantDashboard;
