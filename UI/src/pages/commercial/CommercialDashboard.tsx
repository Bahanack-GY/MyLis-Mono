import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
    Target, Users, Phone, DollarSign, TrendingUp, ShoppingCart,
    Award, UserPlus, Percent, BarChart3, Trophy, Activity,
    ChevronLeft, ChevronRight, Pencil, Check, X as XIcon, Flag,
} from 'lucide-react';
import { useCommercialKpis, useLeadStats, useMyGoal, useTeamPerformance, useSetGoal } from '../../api/commercial/hooks';
import { useAuth } from '../../contexts/AuthContext';
import ClientHealthDashboard from '../../components/ClientHealthDashboard';
import PaymentRemindersDashboard from '../../components/PaymentRemindersDashboard';

// ── Types ──
type DatePreset = 'this_month' | 'this_quarter' | 'this_year' | 'all' | 'custom';

// ── Helpers ──
function getDateRange(preset: DatePreset, customFrom: string, customTo: string) {
    const now = new Date();
    switch (preset) {
        case 'this_month': {
            const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            const to = now.toISOString().split('T')[0];
            return { from, to };
        }
        case 'this_quarter': {
            const qMonth = Math.floor(now.getMonth() / 3) * 3;
            const from = new Date(now.getFullYear(), qMonth, 1).toISOString().split('T')[0];
            const to = now.toISOString().split('T')[0];
            return { from, to };
        }
        case 'this_year': {
            const from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            const to = now.toISOString().split('T')[0];
            return { from, to };
        }
        case 'all':
            return { from: undefined, to: undefined };
        case 'custom':
            return { from: customFrom || undefined, to: customTo || undefined };
    }
}

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';

const STAGE_COLORS: Record<string, string> = {
    PROSPECTION: '#33cbcc',
    QUALIFICATION: '#2bb5b6',
    PROPOSITION: '#22a0a1',
    NEGOCIATION: '#1a8a8b',
    CLOSING: '#127576',
    GAGNE: '#22c55e',
    PERDU: '#ef4444',
};

const PIE_COLORS = ['#33cbcc', '#2bb5b6', '#22a0a1', '#1a8a8b', '#127576', '#22c55e', '#ef4444'];

const MONTH_LABELS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function progressColor(pct: number | null): string {
    if (pct === null) return '#9CA3AF';
    if (pct >= 100) return '#33cbcc';
    if (pct >= 80) return '#22c55e';
    if (pct >= 50) return '#f59e0b';
    return '#ef4444';
}

// ── Inline KPI Card ──
function KpiCard({ icon: Icon, label, value, subtitle, delay = 0 }: {
    icon: any; label: string; value: string; subtitle?: string; delay?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white p-5 rounded-2xl border border-gray-100 relative overflow-hidden"
        >
            <div className="relative z-10">
                <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-5">
                <Icon size={100} strokeWidth={1.5} className="text-[#33cbcc]" />
            </div>
        </motion.div>
    );
}

const SOURCE_COLORS = ['#33cbcc', '#2bb5b6', '#22a0a1', '#1a8a8b', '#127576', '#0f6061', '#0d4b4c', '#0a3637'];

const SOURCE_LABELS: Record<string, string> = {
    PROSPECT: 'Prospect',
    CLIENT_EXISTANT: 'Client Existant',
    RECOMMANDATION: 'Recommandation',
    APPEL_ENTRANT: 'Appel Entrant',
    SALON: 'Salon',
    SITE_WEB: 'Site Web',
    RESEAU_SOCIAL: 'Reseau Social',
    PARTENAIRE: 'Partenaire',
};

// ── Main Component ──
export default function CommercialDashboard() {
    const { t } = useTranslation();
    const { role, user } = useAuth();
    const isCommercial = role === 'COMMERCIAL';

    // Goal period (month navigator — independent of the KPI date filter)
    const now = new Date();
    const [goalYear, setGoalYear] = useState(now.getFullYear());
    const [goalMonth, setGoalMonth] = useState(now.getMonth() + 1);

    const prevGoalMonth = () => {
        if (goalMonth === 1) { setGoalYear(y => y - 1); setGoalMonth(12); }
        else setGoalMonth(m => m - 1);
    };
    const nextGoalMonth = () => {
        const n = new Date();
        if (goalYear > n.getFullYear() || (goalYear === n.getFullYear() && goalMonth >= n.getMonth() + 1)) return;
        if (goalMonth === 12) { setGoalYear(y => y + 1); setGoalMonth(1); }
        else setGoalMonth(m => m + 1);
    };
    const isCurrentMonth = goalYear === now.getFullYear() && goalMonth === now.getMonth() + 1;

    // Goal hooks
    const { data: myGoal, isLoading: myGoalLoading } = useMyGoal(
        isCommercial ? { year: goalYear, month: goalMonth } : undefined,
    );
    const { data: teamPerf = [], isLoading: teamPerfLoading } = useTeamPerformance(
        !isCommercial ? { year: goalYear, month: goalMonth } : undefined,
    );
    const setGoalMutation = useSetGoal();

    // Inline goal editing state (manager)
    const [editingGoalFor, setEditingGoalFor] = useState<string | null>(null);
    const [goalInput, setGoalInput] = useState('');

    const startEditGoal = (employeeId: string, current: number | null) => {
        setEditingGoalFor(employeeId);
        setGoalInput(current !== null ? String(current) : '');
    };
    const saveGoal = (employeeId: string) => {
        const amount = parseFloat(goalInput.replace(/\s/g, '').replace(',', '.'));
        if (isNaN(amount) || amount < 0) return;
        setGoalMutation.mutate(
            { employeeId, year: goalYear, month: goalMonth, targetAmount: amount },
            { onSuccess: () => setEditingGoalFor(null) },
        );
    };

    // Date range state
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const { from, to } = useMemo(
        () => getDateRange(datePreset, customFrom, customTo),
        [datePreset, customFrom, customTo],
    );

    const filters = useMemo(() => ({
        dateFrom: from,
        dateTo: to,
        ...(isCommercial && user?.employeeId ? { employeeId: user.employeeId } : {}),
    }), [from, to, isCommercial, user?.employeeId]);

    // API data
    const { data: kpis, isLoading: kpisLoading } = useCommercialKpis(filters);
    const { data: leadStats, isLoading: statsLoading } = useLeadStats(filters);

    const isLoading = kpisLoading || statsLoading;

    // Derive chart data from leadStats.byStage
    const stageChartData = useMemo(() => {
        if (!leadStats?.byStage) return [];
        return Object.entries(leadStats.byStage).map(([stage, data]) => ({
            name: stage,
            count: data.count,
            value: data.value,
            color: STAGE_COLORS[stage] || '#94a3b8',
        }));
    }, [leadStats]);

    // Revenue trend from API
    const revenueTrendData = useMemo(() => {
        return leadStats?.revenueTrend || [];
    }, [leadStats]);

    // Leads by source from API
    const sourceChartData = useMemo(() => {
        if (!leadStats?.bySource) return [];
        return Object.entries(leadStats.bySource)
            .filter(([, count]) => count > 0)
            .map(([source, count]) => ({
                name: SOURCE_LABELS[source] || source,
                value: count,
            }));
    }, [leadStats]);

    // Preset options
    const presetOptions: { key: DatePreset; label: string }[] = [
        { key: 'this_month', label: t('commercial.dateFilter.thisMonth', 'Ce mois') },
        { key: 'this_quarter', label: t('commercial.dateFilter.thisQuarter', 'Ce trimestre') },
        { key: 'this_year', label: t('commercial.dateFilter.thisYear', 'Cette annee') },
        { key: 'all', label: t('commercial.dateFilter.all', 'Tout') },
    ];

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">
                        {t('commercial.dashboard.title', 'Commercial Dashboard')}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {t('commercial.dashboard.subtitle', 'Suivi des performances commerciales')}
                    </p>
                </div>

                {/* Date range selector */}
                <div className="flex items-center gap-2 flex-wrap">
                    {presetOptions.map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => setDatePreset(opt.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                                datePreset === opt.key
                                    ? 'bg-[#33cbcc] text-white  shadow-[#33cbcc]/20'
                                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-[#33cbcc]/40'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setDatePreset('custom')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                            datePreset === 'custom'
                                ? 'bg-[#33cbcc] text-white  shadow-[#33cbcc]/20'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-[#33cbcc]/40'
                        }`}
                    >
                        {t('commercial.dateFilter.custom', 'Personnalise')}
                    </button>

                    {datePreset === 'custom' && (
                        <>
                            <input
                                type="date"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all"
                            />
                            <input
                                type="date"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] outline-none transition-all"
                            />
                        </>
                    )}
                </div>
            </div>

            {/* ── Commercial: CA vs Objectif card ── */}
            {isCommercial && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-2xl  border border-gray-100 p-5"
                >
                    {/* Card header: title + month navigator */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Flag size={15} className="text-[#33cbcc]" />
                            <span className="text-sm font-semibold text-gray-700">
                                {t('commercial.goal.myGoalTitle', 'Mon objectif mensuel')}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={prevGoalMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Mois précédent"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-gray-600 min-w-[110px] text-center">
                                {MONTH_LABELS[goalMonth - 1]} {goalYear}
                            </span>
                            <button
                                onClick={nextGoalMonth}
                                disabled={isCurrentMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                                aria-label="Mois suivant"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {myGoalLoading ? (
                        <div className="h-12 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                            {/* Left: numbers */}
                            <div className="flex-1 space-y-0.5">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                    {t('commercial.goal.realized', 'CA réalisé')}
                                </p>
                                <p className="text-2xl font-bold text-gray-800">
                                    {formatFCFA(myGoal?.actualCA || 0)}
                                </p>
                                {myGoal?.targetAmount ? (
                                    <p className="text-xs text-gray-500">
                                        {t('commercial.goal.target', 'Objectif')} :{' '}
                                        <span className="font-semibold text-gray-700">{formatFCFA(myGoal.targetAmount)}</span>
                                    </p>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">
                                        {t('commercial.goal.noTarget', 'Aucun objectif défini pour ce mois')}
                                    </p>
                                )}
                            </div>

                            {/* Right: progress bar */}
                            {myGoal?.targetAmount ? (
                                <div className="w-full sm:w-64 space-y-1.5">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-gray-500">{t('commercial.goal.progress', 'Progression')}</span>
                                        <span style={{ color: progressColor(myGoal.progress) }} className="font-bold">
                                            {myGoal.progress ?? 0}%
                                            {(myGoal.progress ?? 0) >= 100 && ' 🎉'}
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(myGoal.progress ?? 0, 100)}%` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: progressColor(myGoal.progress) }}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 text-right">
                                        {formatFCFA(Math.max(0, (myGoal.targetAmount || 0) - (myGoal.actualCA || 0)))}
                                        {' '}{t('commercial.goal.remaining', 'restants')}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── Manager: Team Performance table ── */}
            {!isCommercial && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-white rounded-2xl  border border-gray-100 overflow-hidden"
                >
                    {/* Card header: title + month navigator */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                            <Flag size={15} className="text-[#33cbcc]" />
                            <span className="text-sm font-semibold text-gray-700">
                                {t('commercial.goal.teamTitle', "Performance de l'équipe")}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={prevGoalMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                aria-label="Mois précédent"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-xs font-semibold text-gray-600 min-w-[110px] text-center">
                                {MONTH_LABELS[goalMonth - 1]} {goalYear}
                            </span>
                            <button
                                onClick={nextGoalMonth}
                                disabled={isCurrentMonth}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30"
                                aria-label="Mois suivant"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>

                    {teamPerfLoading ? (
                        <div className="h-32 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : teamPerf.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-400">
                            {t('commercial.goal.noCommercials', 'Aucun commercial trouvé')}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                                            {t('commercial.goal.commercial', 'Commercial')}
                                        </th>
                                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                                            {t('commercial.goal.realized', 'CA Réalisé')}
                                        </th>
                                        <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3">
                                            {t('commercial.goal.target', 'Objectif')}
                                        </th>
                                        <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 py-3 min-w-[180px]">
                                            {t('commercial.goal.progress', 'Progression')}
                                        </th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {teamPerf.map((row) => {
                                        const color = progressColor(row.progress);
                                        const isEditing = editingGoalFor === row.employeeId;
                                        const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase();
                                        return (
                                            <tr key={row.employeeId} className="hover:bg-gray-50/60 transition-colors">
                                                {/* Name */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-[#33cbcc] flex items-center justify-center text-white text-sm font-bold shrink-0 overflow-hidden">
                                                            {row.avatarUrl
                                                                ? <img src={row.avatarUrl} alt={`${row.firstName} ${row.lastName}`} className="w-full h-full object-cover" />
                                                                : initials}
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-800">
                                                            {row.firstName} {row.lastName}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* CA Réalisé */}
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-sm font-bold text-gray-800">{formatFCFA(row.actualCA)}</span>
                                                </td>
                                                {/* Objectif (inline edit) */}
                                                <td className="px-6 py-4 text-right">
                                                    {isEditing ? (
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <input
                                                                type="number"
                                                                value={goalInput}
                                                                onChange={e => setGoalInput(e.target.value)}
                                                                onKeyDown={e => { if (e.key === 'Enter') saveGoal(row.employeeId); if (e.key === 'Escape') setEditingGoalFor(null); }}
                                                                autoFocus
                                                                placeholder="0"
                                                                className="w-32 text-right text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                                            />
                                                            <button
                                                                onClick={() => saveGoal(row.employeeId)}
                                                                disabled={setGoalMutation.isPending}
                                                                className="p-1.5 rounded-lg bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                                                aria-label="Enregistrer"
                                                            >
                                                                <Check size={13} />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingGoalFor(null)}
                                                                className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                                                                aria-label="Annuler"
                                                            >
                                                                <XIcon size={13} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className={`text-sm font-semibold ${row.targetAmount ? 'text-gray-700' : 'text-gray-300 italic'}`}>
                                                            {row.targetAmount ? formatFCFA(row.targetAmount) : '—'}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Progress bar */}
                                                <td className="px-6 py-4">
                                                    {row.targetAmount ? (
                                                        <div className="space-y-1">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-400">{formatFCFA(row.actualCA)}</span>
                                                                <span className="font-semibold" style={{ color }}>
                                                                    {row.progress ?? 0}%
                                                                    {(row.progress ?? 0) >= 100 && ' 🎉'}
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-700"
                                                                    style={{
                                                                        width: `${Math.min(row.progress ?? 0, 100)}%`,
                                                                        backgroundColor: color,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-300 italic">
                                                            {t('commercial.goal.noTarget', 'Objectif non défini')}
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Edit button */}
                                                <td className="px-6 py-4 text-right">
                                                    {!isEditing && (
                                                        <button
                                                            onClick={() => startEditGoal(row.employeeId, row.targetAmount)}
                                                            aria-label={`Définir objectif pour ${row.firstName} ${row.lastName}`}
                                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* ── KPI Cards — Row 1 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={Target}
                    label={t('commercial.kpi.totalVisites', 'Total Visites')}
                    value={isLoading ? '...' : String(kpis?.totalVisites || 0)}
                    subtitle={t('commercial.kpi.totalVisitesSubtitle', 'Toutes activites terrain')}
                    delay={0}
                />
                <KpiCard
                    icon={Users}
                    label={t('commercial.kpi.visitesClients', 'Visites Clients')}
                    value={isLoading ? '...' : String(kpis?.visitesClients || 0)}
                    subtitle={t('commercial.kpi.visitesClientsSubtitle', 'Clients existants')}
                    delay={0.05}
                />
                <KpiCard
                    icon={Phone}
                    label={t('commercial.kpi.visitesProspects', 'Visites Prospects')}
                    value={isLoading ? '...' : String(kpis?.visitesProspects || 0)}
                    subtitle={t('commercial.kpi.visitesProspectsSubtitle', 'Nouveaux prospects')}
                    delay={0.1}
                />
                <KpiCard
                    icon={DollarSign}
                    label={t('commercial.kpi.coutVisites', 'Cout Visites')}
                    value={isLoading ? '...' : formatFCFA(kpis?.coutVisites || 0)}
                    subtitle={t('commercial.kpi.coutVisitesSubtitle', 'Charges deplacement')}
                    delay={0.15}
                />
            </div>

            {/* ── KPI Cards — Row 2 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={TrendingUp}
                    label={t('commercial.kpi.chiffreAffaire', "Chiffre d'Affaire")}
                    value={isLoading ? '...' : formatFCFA(kpis?.chiffreAffaire || 0)}
                    subtitle={t('commercial.kpi.chiffreAffaireSubtitle', 'CA realise')}
                    delay={0.2}
                />
                <KpiCard
                    icon={ShoppingCart}
                    label={t('commercial.kpi.panierMoyen', 'Panier Moyen')}
                    value={isLoading ? '...' : formatFCFA(kpis?.panierMoyen || 0)}
                    subtitle={t('commercial.kpi.panierMoyenSubtitle', 'Par transaction')}
                    delay={0.25}
                />
                <KpiCard
                    icon={Award}
                    label={t('commercial.kpi.margeVisite', 'Marge/Visite')}
                    value={isLoading ? '...' : formatFCFA(kpis?.margeParVisite || 0)}
                    subtitle={t('commercial.kpi.margeVisiteSubtitle', 'Rentabilite terrain')}
                    delay={0.3}
                />
                <KpiCard
                    icon={UserPlus}
                    label={t('commercial.kpi.nouveauxClients', 'Nouveaux Clients')}
                    value={isLoading ? '...' : String(kpis?.nouveauxClients || 0)}
                    subtitle={t('commercial.kpi.nouveauxClientsSubtitle', 'Leads convertis')}
                    delay={0.35}
                />
            </div>

            {/* ── KPI Cards — Row 3 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={Percent}
                    label={t('commercial.kpi.tauxAcquisition', 'Taux Acquisition')}
                    value={isLoading ? '...' : `${(kpis?.tauxAcquisition || 0).toFixed(1)}%`}
                    subtitle={t('commercial.kpi.tauxAcquisitionSubtitle', 'Nouveaux / total')}
                    delay={0.4}
                />
                <KpiCard
                    icon={BarChart3}
                    label={t('commercial.kpi.pipelineValue', 'Pipeline Value')}
                    value={isLoading ? '...' : formatFCFA(kpis?.pipelineValue || 0)}
                    subtitle={t('commercial.kpi.pipelineValueSubtitle', 'Valeur des opportunites')}
                    delay={0.45}
                />
                <KpiCard
                    icon={Trophy}
                    label={t('commercial.kpi.winRate', 'Win Rate')}
                    value={isLoading ? '...' : `${(kpis?.winRate || 0).toFixed(1)}%`}
                    subtitle={t('commercial.kpi.winRateSubtitle', 'Affaires gagnees')}
                    delay={0.5}
                />
                <KpiCard
                    icon={Activity}
                    label={t('commercial.kpi.conversionRate', 'Conversion Rate')}
                    value={isLoading ? '...' : `${(kpis?.conversionRate || 0).toFixed(1)}%`}
                    subtitle={t('commercial.kpi.conversionRateSubtitle', 'Lead vers client')}
                    delay={0.55}
                />
            </div>

            {/* ── Charts Section (2x2) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline by Stage (Horizontal Bar) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white p-6 rounded-2xl  border border-gray-100"
                >
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-800">
                            {t('commercial.charts.pipelineByStage', 'Pipeline par Etape')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('commercial.charts.pipelineByStageSubtitle', 'Nombre de leads par etape')}
                        </p>
                    </div>
                    <div className="h-[280px]">
                        {stageChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={stageChartData}
                                    layout="vertical"
                                    margin={{ top: 0, right: 16, left: 10, bottom: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 500 }} width={110} />
                                    <Tooltip
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'none' }}
                                        formatter={(value: any) => [value, t('commercial.charts.leads', 'Leads')]}
                                    />
                                    <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={32}>
                                        {stageChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                {t('commercial.charts.noData', 'Aucune donnee disponible')}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Pipeline Value Distribution (Pie) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.65 }}
                    className="bg-white p-6 rounded-2xl  border border-gray-100"
                >
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-800">
                            {t('commercial.charts.pipelineValueDist', 'Distribution Valeur Pipeline')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('commercial.charts.pipelineValueDistSubtitle', 'Repartition par etape (FCFA)')}
                        </p>
                    </div>
                    <div className="h-[240px] relative">
                        {stageChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stageChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={56}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {stageChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'none' }}
                                        formatter={(value: any) => [formatFCFA(value), '']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                {t('commercial.charts.noData', 'Aucune donnee disponible')}
                            </div>
                        )}
                    </div>
                    {/* Legend */}
                    {stageChartData.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {stageChartData.map((entry) => (
                                <div key={entry.name} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                                        <span className="text-gray-600 text-xs truncate">{entry.name}</span>
                                    </div>
                                    <span className="font-semibold text-gray-700 text-xs shrink-0">
                                        {formatFCFA(entry.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Revenue Trend (Line — placeholder) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="bg-white p-6 rounded-2xl  border border-gray-100"
                >
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-800">
                            {t('commercial.charts.revenueTrend', 'Tendance CA')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('commercial.charts.revenueTrendSubtitle', 'Evolution mensuelle du chiffre d\'affaire')}
                        </p>
                    </div>
                    <div className="h-[280px]">
                        {revenueTrendData.length > 0 && revenueTrendData.some(d => d.revenue > 0) ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueTrendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="4 4" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                    tickFormatter={(v: number) => v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + 'M' : v >= 1_000 ? (v / 1_000).toFixed(0) + 'k' : String(v)}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'none' }}
                                    formatter={(value: any) => [formatFCFA(value), t('commercial.charts.revenue', 'CA')]}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="#33cbcc" strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#33cbcc', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                {t('commercial.charts.noData', 'Aucune donnee disponible')}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Leads by Source (Pie) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.75 }}
                    className="bg-white p-6 rounded-2xl  border border-gray-100"
                >
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-gray-800">
                            {t('commercial.charts.leadsBySource', 'Leads par Source')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {t('commercial.charts.leadsBySourceSubtitle', 'Origine des opportunites')}
                        </p>
                    </div>
                    <div className="h-[240px] relative">
                        {sourceChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={sourceChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={56}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="name"
                                    >
                                        {sourceChartData.map((_entry, index) => (
                                            <Cell key={`src-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'none' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                {t('commercial.charts.noData', 'Aucune donnee disponible')}
                            </div>
                        )}
                    </div>
                    {/* Legend */}
                    {sourceChartData.length > 0 && (
                    <div className="mt-2 space-y-2">
                        {sourceChartData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SOURCE_COLORS[index % SOURCE_COLORS.length] }} />
                                    <span className="text-gray-600 text-xs truncate">{entry.name}</span>
                                </div>
                                <span className="font-semibold text-gray-700 text-xs shrink-0">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                    )}
                </motion.div>
            </div>

            {/* ── Client Health & Payment Reminders Dashboard Widgets ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <ClientHealthDashboard />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.85 }}
                >
                    <PaymentRemindersDashboard />
                </motion.div>
            </div>
        </div>
    );
}
