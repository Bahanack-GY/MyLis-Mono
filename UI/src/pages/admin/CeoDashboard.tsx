import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import { ArrowUpRight01Icon, ArrowDownRight01Icon, UserGroupIcon, UserCheck01Icon, Wallet01Icon, Money01Icon, Building01Icon, Calendar01Icon, ArrowDown01Icon, BarChartHorizontalIcon, CrownIcon, ArrowRight01Icon, Clock01Icon, Invoice01Icon, CreditCardIcon, PieChartIcon, File01Icon, Award01Icon } from 'hugeicons-react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '../../api/employees/hooks';
import { useClients } from '../../api/clients/hooks';
import { useDepartments } from '../../api/departments/hooks';
import { useInvoiceStats, useRevenueByDepartment } from '../../api/invoices/hooks';
import { useExpenseStats } from '../../api/expenses/hooks';
import { useDemandStats } from '../../api/demands/hooks';
import { useOpenFiscalYear, useMonthlySummary } from '../../api/accounting/hooks';
import type { FiscalYear } from '../../api/accounting/types';

/* ─── Types & helpers ────────────────────────────────────── */

type DatePreset = 'today' | 'this_week' | 'this_month' | 'this_year' | 'custom';

const PRESET_LABELS: Record<DatePreset, string> = {
    today: "Aujourd'hui",
    this_week: 'Cette semaine',
    this_month: 'Ce mois',
    this_year: 'Cette année',
    custom: 'Personnalisé',
};

function getDateRange(preset: DatePreset, customFrom?: string, customTo?: string) {
    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const to = endOfDay.toISOString();
    switch (preset) {
        case 'today': {
            const s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return { from: s.toISOString(), to };
        }
        case 'this_week': {
            const d = now.getDay();
            const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (d === 0 ? -6 : 1 - d));
            return { from: s.toISOString(), to };
        }
        case 'this_month': {
            const s = new Date(now.getFullYear(), now.getMonth(), 1);
            return { from: s.toISOString(), to };
        }
        case 'this_year': {
            const s = new Date(now.getFullYear(), 0, 1);
            return { from: s.toISOString(), to };
        }
        case 'custom':
            return {
                from: customFrom
                    ? new Date(customFrom).toISOString()
                    : new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
                to: customTo ? new Date(customTo + 'T23:59:59.999').toISOString() : to,
            };
    }
}

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-CM', { style: 'decimal', maximumFractionDigits: 0 }).format(Math.round(n)) + ' XAF';

const fmtShort = (v: number) =>
    v >= 1_000_000
        ? (v / 1_000_000).toFixed(1) + 'M'
        : v >= 1_000
        ? (v / 1_000).toFixed(0) + 'k'
        : String(Math.round(v));

const TEAL = '#33cbcc';
const NAVY = '#283852';
const PALETTE = [TEAL, NAVY, '#FFBB28', '#FF8042', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

/* ─── Animation variants ─────────────────────────────────── */

const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.055, duration: 0.38, ease: 'easeOut' },
    }),
};

/* ─── KPI Card ───────────────────────────────────────────── */

interface KpiCardProps {
    label: string;
    value: string;
    sub?: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    accent?: string;
    index: number;
    onClick?: () => void;
}

const KpiCard = ({ label, value, sub, icon: Icon, accent = TEAL, index, onClick }: KpiCardProps) => (
    <motion.div
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        onClick={onClick}
        className={`border border-gray-100 rounded-2xl overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="px-5 py-3" style={{ backgroundColor: accent }}>
            <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{label}</p>
        </div>
        <div className="p-5 bg-white relative overflow-hidden">
            <p className="text-3xl font-bold text-[#1c2b3a] leading-none">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
            <div className="absolute -right-4 -bottom-4 opacity-[0.14] pointer-events-none" style={{ color: accent }}>
                <Icon size={110} strokeWidth={1.2} />
            </div>
        </div>
    </motion.div>
);

/* ─── Date filter dropdown ───────────────────────────────── */

interface DateFilterProps {
    preset: DatePreset;
    setPreset: (p: DatePreset) => void;
    customFrom: string;
    setCustomFrom: (v: string) => void;
    customTo: string;
    setCustomTo: (v: string) => void;
}

const DateFilter = ({ preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo }: DateFilterProps) => {
    const [open, setOpen] = useState(false);
    const presets: DatePreset[] = ['today', 'this_week', 'this_month', 'this_year', 'custom'];

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-[#33cbcc]/40 transition-colors shadow-sm"
            >
                <Calendar01Icon size={15} className="text-[#33cbcc]" />
                <span className="font-medium">{PRESET_LABELS[preset]}</span>
                <ArrowDown01Icon size={13} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 min-w-[210px] overflow-hidden"
                    >
                        {presets.map(p => (
                            <button
                                key={p}
                                onClick={() => { setPreset(p); if (p !== 'custom') setOpen(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                                    preset === p ? 'bg-[#33cbcc]/10 text-[#33cbcc]' : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {PRESET_LABELS[p]}
                            </button>
                        ))}

                        {preset === 'custom' && (
                            <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Du</label>
                                    <input
                                        type="date"
                                        value={customFrom}
                                        onChange={e => setCustomFrom(e.target.value)}
                                        className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Au</label>
                                    <input
                                        type="date"
                                        value={customTo}
                                        onChange={e => setCustomTo(e.target.value)}
                                        className="w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#33cbcc]"
                                    />
                                </div>
                                <button
                                    onClick={() => setOpen(false)}
                                    className="w-full px-3 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-lg hover:bg-[#2bb5b6] transition-colors"
                                >
                                    Appliquer
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Main Component ─────────────────────────────────────── */

const CeoDashboard = () => {
    const navigate = useNavigate();

    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const { from, to } = useMemo(
        () => getDateRange(datePreset, customFrom, customTo),
        [datePreset, customFrom, customTo],
    );

    /* ── Data ───────────────────────────────────────── */

    const { data: departments = [] } = useDepartments();
    const { data: employees = [] } = useEmployees(selectedDeptId || undefined);
    const { data: clients = [] } = useClients(selectedDeptId || undefined);
    const { data: invoiceStats } = useInvoiceStats(selectedDeptId || undefined, from, to);
    const { data: expenseStats } = useExpenseStats(new Date().getFullYear(), selectedDeptId || undefined);
    const { data: demandStats } = useDemandStats(selectedDeptId || undefined, from, to);
    const { data: revenueByDeptRaw } = useRevenueByDepartment(from, to);
    const { data: openFY } = useOpenFiscalYear();
    const fiscalYearId = (openFY as FiscalYear | undefined)?.id ?? '';
    const { data: monthlySummaryRaw } = useMonthlySummary(fiscalYearId);

    /* ── KPI derivations ────────────────────────────── */

    const revenue = invoiceStats?.totalRevenue ?? 0;
    const expenses = (expenseStats?.totalYear ?? 0) + (expenseStats?.totalProjects ?? 0);
    const netProfit = revenue - expenses;
    const pendingAmount = invoiceStats?.totalPending ?? 0;
    const pendingCount = invoiceStats?.countByStatus?.SENT ?? 0;
    const clientCount = clients.length;
    const employeeCount = employees.length;
    const demandPending = demandStats?.totalPending ?? 0;
    const demandTotal = demandStats?.total ?? 0;

    /* ── Monthly trend chart (global — full fiscal year) */

    const monthlyData = useMemo(() => {
        const labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const summary = monthlySummaryRaw as { month: number; revenue: number; expenses: number }[] | undefined;
        return labels.map((label, idx) => {
            const entry = summary?.find(s => s.month === idx + 1);
            return { month: label, revenue: entry?.revenue ?? 0, expenses: entry?.expenses ?? 0 };
        });
    }, [monthlySummaryRaw]);

    /* ── Revenue by dept ────────────────────────────── */

    const deptRevenue = useMemo(() => {
        const all = revenueByDeptRaw ?? [];
        return selectedDeptId ? all.filter(d => d.departmentId === selectedDeptId) : all;
    }, [revenueByDeptRaw, selectedDeptId]);

    /* ── Department overview cards ──────────────────── */

    const deptCards = useMemo(() => {
        const revMap = new Map((revenueByDeptRaw ?? []).map(r => [r.departmentId, r.revenue]));
        return departments
            .filter(d => !selectedDeptId || d.id === selectedDeptId)
            .map(d => ({
                id: d.id,
                name: d.name,
                headcount: (d as any).employees?.length ?? 0,
                revenue: revMap.get(d.id) ?? 0,
            }))
            .sort((a, b) => b.revenue - a.revenue);
    }, [departments, revenueByDeptRaw, selectedDeptId]);

    const maxDeptRevenue = Math.max(...deptCards.map(d => d.revenue), 1);

    /* ── Recent employees (top 6 by joinDate desc) ── */

    const recentEmployees = useMemo(() =>
        [...employees]
            .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
            .slice(0, 6),
        [employees],
    );

    const fyYear = openFY ? new Date((openFY as FiscalYear).startDate).getFullYear() : new Date().getFullYear();

    /* ── Render ─────────────────────────────────────── */

    return (
        <div className="space-y-8">

            {/* ── Header ────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="flex flex-wrap items-start justify-between gap-4"
            >
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#283852] flex items-center justify-center shrink-0">
                        <CrownIcon size={21} className="text-[#33cbcc]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Vue Directeur</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Synthèse globale — {PRESET_LABELS[datePreset]}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Department selector */}
                    <select
                        value={selectedDeptId}
                        onChange={e => setSelectedDeptId(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none appearance-none cursor-pointer shadow-sm"
                    >
                        <option value="">Tous les départements</option>
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>

                    {/* Date filter */}
                    <DateFilter
                        preset={datePreset}
                        setPreset={setDatePreset}
                        customFrom={customFrom}
                        setCustomFrom={setCustomFrom}
                        customTo={customTo}
                        setCustomTo={setCustomTo}
                    />
                </div>
            </motion.div>

            {/* ── KPI Row 1: Financial ───────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <KpiCard
                    index={0}
                    label="Chiffre d'affaires"
                    value={fmt(revenue)}
                    sub={PRESET_LABELS[datePreset]}
                    icon={ArrowUpRight01Icon}
                    accent={TEAL}
                    onClick={() => navigate('/invoices')}
                />
                <KpiCard
                    index={1}
                    label="Charges"
                    value={fmt(expenses)}
                    sub={`Année ${fyYear}`}
                    icon={ArrowDownRight01Icon}
                    accent={NAVY}
                    onClick={() => navigate('/expenses')}
                />
                <KpiCard
                    index={2}
                    label="Bénéfice net"
                    value={fmt(netProfit)}
                    sub={netProfit >= 0 ? 'Bénéficiaire' : 'Déficitaire'}
                    icon={BarChartHorizontalIcon}
                    accent={netProfit >= 0 ? '#22c55e' : '#ef4444'}
                />
            </div>

            {/* ── KPI Row 2: Operational ─────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    index={3}
                    label="Employés"
                    value={String(employeeCount)}
                    sub={selectedDeptId ? 'Dans ce département' : 'Total entreprise'}
                    icon={UserGroupIcon}
                    accent={NAVY}
                    onClick={() => navigate('/employees')}
                />
                <KpiCard
                    index={4}
                    label="Clients"
                    value={String(clientCount)}
                    sub="Actifs"
                    icon={UserCheck01Icon}
                    accent={TEAL}
                    onClick={() => navigate('/clients')}
                />
                <KpiCard
                    index={5}
                    label="Paiements en attente"
                    value={fmt(pendingAmount)}
                    sub={`${pendingCount} facture${pendingCount !== 1 ? 's' : ''}`}
                    icon={Wallet01Icon}
                    accent="#f59e0b"
                    onClick={() => navigate('/invoices')}
                />
                <KpiCard
                    index={6}
                    label="Demandes en attente"
                    value={String(demandPending)}
                    sub={`/ ${demandTotal} total`}
                    icon={Money01Icon}
                    accent="#8b5cf6"
                    onClick={() => navigate('/demands')}
                />
            </div>

            {/* ── Monthly Trend Line Chart ───────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.4 }}
                className="bg-white rounded-2xl p-6"
            >
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-base font-bold text-gray-800">Tendance mensuelle</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Revenus vs Charges — Exercice {fyYear}
                        </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-8 h-0.5 rounded-full" style={{ background: TEAL }} />
                            Revenus
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-8 h-0.5 rounded-full" style={{ background: NAVY, opacity: 0.6 }} />
                            Charges
                        </span>
                    </div>
                </div>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
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
                                tickFormatter={fmtShort}
                                width={48}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                                formatter={(v: number, name: string) => [fmt(v), name === 'revenue' ? 'Revenus' : 'Charges']}
                            />
                            <Legend
                                formatter={v => v === 'revenue' ? 'Revenus' : 'Charges'}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: 12, paddingTop: 16, display: 'none' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke={TEAL}
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, fill: TEAL }}
                            />
                            <Line
                                type="monotone"
                                dataKey="expenses"
                                stroke={NAVY}
                                strokeWidth={2}
                                strokeDasharray="5 3"
                                dot={false}
                                activeDot={{ r: 4, fill: NAVY }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* ── Revenue by Department Bar Chart ───── */}
            {deptRevenue.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="bg-white rounded-2xl p-6"
                >
                    <div className="mb-6">
                        <h3 className="text-base font-bold text-gray-800">Revenus par département</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Factures encaissées · {PRESET_LABELS[datePreset]}
                        </p>
                    </div>
                    <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart
                                data={deptRevenue}
                                margin={{ top: 4, right: 24, left: 0, bottom: 4 }}
                                barCategoryGap="28%"
                            >
                                <defs>
                                    <linearGradient id="ceoDeptGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={TEAL} stopOpacity={1} />
                                        <stop offset="100%" stopColor={TEAL} stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="department"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    interval={0}
                                    tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                    tickFormatter={fmtShort}
                                    width={48}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    cursor={{ fill: '#f3f4f6' }}
                                    formatter={(v: number) => [fmt(v), 'Revenus']}
                                />
                                <Bar dataKey="revenue" fill="url(#ceoDeptGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            )}

            {/* ── Departments Grid ───────────────────── */}
            {deptCards.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.42, duration: 0.4 }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">Vue des départements</h3>
                        <button
                            onClick={() => navigate('/departments')}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                        >
                            Voir tout <ArrowRight01Icon size={13} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deptCards.map((dept, i) => (
                            <motion.div
                                key={dept.id}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                onClick={() => navigate(`/departments/${dept.id}`)}
                                className="bg-white rounded-2xl p-5 space-y-3 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ background: `${PALETTE[i % PALETTE.length]}18` }}
                                        >
                                            <Building01Icon size={16} style={{ color: PALETTE[i % PALETTE.length] }} />
                                        </div>
                                        <span className="font-semibold text-gray-800 text-sm truncate">{dept.name}</span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1">
                                        <UserGroupIcon size={11} />
                                        {dept.headcount}
                                    </span>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[11px] text-gray-400">Revenus</span>
                                        <span className="text-xs font-bold text-gray-700">{fmtShort(dept.revenue)} XAF</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${(dept.revenue / maxDeptRevenue) * 100}%`,
                                                backgroundColor: PALETTE[i % PALETTE.length],
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Recent Employees ───────────────────── */}
            {recentEmployees.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="bg-white rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Employés récents</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Dernières entrées dans l'entreprise</p>
                        </div>
                        <button
                            onClick={() => navigate('/employees')}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                        >
                            Voir tout <ArrowRight01Icon size={13} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {recentEmployees.map((emp, i) => (
                            <motion.div
                                key={emp.id}
                                custom={i}
                                variants={cardVariants}
                                initial="hidden"
                                animate="visible"
                                onClick={() => navigate(`/employees/${emp.id}`)}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <img
                                    src={
                                        (emp as any).avatarUrl ||
                                        (emp as any).photoUrl ||
                                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            (emp as any).firstName + '+' + (emp as any).lastName,
                                        )}&background=33cbcc&color=fff`
                                    }
                                    alt=""
                                    className="w-9 h-9 rounded-full object-cover shrink-0 border border-gray-100"
                                    onError={e => {
                                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                            (emp as any).firstName + '+' + (emp as any).lastName,
                                        )}&background=33cbcc&color=fff`;
                                    }}
                                />
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {(emp as any).firstName} {(emp as any).lastName}
                                    </p>
                                    <p className="text-[11px] text-gray-400 truncate">
                                        {(emp as any).position?.name ?? (emp as any).role ?? '—'}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* ── Demand Stats Summary ───────────────── */}
            {demandStats && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.56, duration: 0.4 }}
                    className="bg-white rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h3 className="text-base font-bold text-gray-800">Demandes des employés</h3>
                            <p className="text-xs text-gray-400 mt-0.5">{PRESET_LABELS[datePreset]}</p>
                        </div>
                        <button
                            onClick={() => navigate('/demands')}
                            className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                        >
                            Gérer <ArrowRight01Icon size={13} />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Total', value: demandStats.total, color: NAVY },
                            { label: 'En attente', value: demandStats.totalPending, color: '#f59e0b', icon: Clock01Icon },
                            { label: 'Validées', value: demandStats.totalValidated, color: '#22c55e' },
                            { label: 'Rejetées', value: demandStats.totalRejected, color: '#ef4444' },
                        ].map((item, i) => (
                            <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                                <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                                <p className="text-[11px] font-semibold mt-1" style={{ color: item.color }}>
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                    {demandStats.totalExpense > 0 && (
                        <div className="mt-4 flex items-center justify-between px-4 py-3 bg-[#283852]/5 rounded-xl">
                            <span className="text-sm text-gray-600 font-medium">Montant total validé</span>
                            <span className="text-sm font-bold text-[#283852]">{fmt(demandStats.totalExpense)}</span>
                        </div>
                    )}
                </motion.div>
            )}
            {/* ── Quick Actions ──────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.62, duration: 0.4 }}
            >
                <h3 className="text-base font-bold text-gray-800 mb-4">Actions rapides</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                        { label: 'Factures', icon: Invoice01Icon, path: '/invoices', color: TEAL },
                        { label: 'Charges', icon: CreditCardIcon, path: '/expenses', color: NAVY },
                        { label: 'Employés', icon: UserGroupIcon, path: '/employees', color: '#8b5cf6' },
                        { label: 'Demandes', icon: Money01Icon, path: '/demands', color: '#f59e0b' },
                        { label: 'Comptabilité', icon: PieChartIcon, path: '/accounting', color: '#22c55e' },
                        { label: 'Classement', icon: Award01Icon, path: '/employees/rankings', color: '#ec4899' },
                    ].map((action, i) => (
                        <motion.button
                            key={action.path}
                            custom={i}
                            variants={cardVariants}
                            initial="hidden"
                            animate="visible"
                            onClick={() => navigate(action.path)}
                            className="flex flex-col items-center gap-2.5 bg-white rounded-2xl p-5 hover:shadow-md transition-all group text-center"
                        >
                            <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ background: `${action.color}15` }}
                            >
                                <action.icon size={20} style={{ color: action.color }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-800 transition-colors">
                                {action.label}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default CeoDashboard;
