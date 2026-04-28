import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Car01Icon, UserGroupIcon, ArrowUpRight01Icon, DollarCircleIcon, RefreshIcon, Clock01Icon, Tick01Icon, Alert01Icon, ArrowDown01Icon, Location01Icon, Wrench01Icon } from 'hugeicons-react';
import {
    useCarwashStations, useCarwashEmployees, useCarwashDailyStats,
    useCarwashOverview, useCarwashSyncStatus, useTriggerCarwashSync,
} from '../../api/carwash/hooks';
import type { CarwashDailyStat } from '../../api/carwash/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFCFA(n: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n);
}

function getDateRange(period: string): { startDate: string; endDate: string } {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    const end = fmt(today);

    if (period === 'today') return { startDate: end, endDate: end };
    if (period === 'week') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        return { startDate: fmt(start), endDate: end };
    }
    if (period === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { startDate: fmt(start), endDate: end };
    }
    if (period === 'year') {
        const start = new Date(today.getFullYear(), 0, 1);
        return { startDate: fmt(start), endDate: end };
    }
    return { startDate: end, endDate: end };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
    manager: { label: 'Manager', color: 'bg-blue-100 text-blue-700' },
    controleur: { label: 'Contrôleur', color: 'bg-indigo-100 text-indigo-700' },
    caissiere: { label: 'Caissière', color: 'bg-green-100 text-green-700' },
    laveur: { label: 'Laveur', color: 'bg-teal-100 text-teal-700' },
    commercial: { label: 'Commercial', color: 'bg-orange-100 text-orange-700' },
    comptable: { label: 'Comptable', color: 'bg-yellow-100 text-yellow-700' },
};

// ── Mini Bar Chart ─────────────────────────────────────────────────────────────

function MiniBarChart({ data, field, color }: { data: CarwashDailyStat[]; field: 'revenue' | 'vehicles' | 'expenses'; color: string }) {
    if (!data.length) return <div className="h-16 flex items-center justify-center text-gray-400 text-xs">Aucune donnée</div>;
    const values = data.map(d => Number(d[field]) || 0);
    const max = Math.max(...values, 1);

    return (
        <div className="flex items-end gap-0.5 h-16 mt-2">
            {data.slice(-30).map((d, i) => {
                const h = Math.max(2, (values[i] / max) * 56);
                return (
                    <div key={d.date} title={`${d.date}: ${field === 'revenue' || field === 'expenses' ? formatFCFA(values[i]) : values[i]}`}
                        className={`flex-1 rounded-sm ${color} opacity-80 hover:opacity-100 transition-opacity`}
                        style={{ height: h }} />
                );
            })}
        </div>
    );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

const CARWASH_COLOR_MAP: Record<string, string> = {
    'bg-[#33cbcc]': '#33cbcc',
    'bg-[#283852]': '#283852',
    'bg-orange-400': '#fb923c',
    'bg-violet-500': '#8b5cf6',
};

function StatCard({ icon: Icon, label, value, sub, color }: {
    icon: React.ComponentType<any>; label: string; value: string | number; sub?: string; color: string;
}) {
    const hexColor = CARWASH_COLOR_MAP[color] ?? '#33cbcc';
    return (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="border border-gray-100 rounded-2xl overflow-hidden cursor-pointer">
            <div className="px-5 py-3" style={{ backgroundColor: hexColor }}>
                <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{label}</p>
            </div>
            <div className="p-5 bg-white relative overflow-hidden">
                <p className="text-3xl font-bold text-[#1c2b3a] leading-none">{value}</p>
                {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                <div className="absolute -right-4 -bottom-4 opacity-[0.14] pointer-events-none" style={{ color: hexColor }}>
                    <Icon size={110} strokeWidth={1.2} />
                </div>
            </div>
        </motion.div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week', label: '7 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year', label: 'Cette année' },
];

type Tab = 'overview' | 'employees' | 'revenue' | 'charges';

export default function CarwashDashboard() {
    const [tab, setTab] = useState<Tab>('overview');
    const [period, setPeriod] = useState('month');
    const [stationId, setStationId] = useState<number | undefined>();
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const dateRange = useMemo(() => {
        if (period === 'custom' && customStart && customEnd)
            return { startDate: customStart, endDate: customEnd };
        return getDateRange(period);
    }, [period, customStart, customEnd]);

    const { data: stations = [] } = useCarwashStations();
    const { data: employees = [], isLoading: empLoading } = useCarwashEmployees(stationId);
    const { data: dailyStats = [], isLoading: statsLoading } = useCarwashDailyStats({ stationId, ...dateRange });
    const { data: overview, isLoading: ovLoading } = useCarwashOverview({ stationId, ...dateRange });
    const { data: syncStatus } = useCarwashSyncStatus();
    const triggerSync = useTriggerCarwashSync();

    const lastSyncLabel = useMemo(() => {
        if (!syncStatus?.lastSync) return 'Jamais synchronisé';
        const d = new Date(syncStatus.lastSync.syncedAt);
        return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }, [syncStatus]);

    const filteredStats = useMemo(() => {
        if (!stationId) return dailyStats;
        return dailyStats.filter(s => s.stationId === stationId);
    }, [dailyStats, stationId]);

    const activeEmployees = employees.filter(e => e.actif);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#283852] flex items-center gap-2">
                        <Car01Icon className="w-7 h-7 text-[#33cbcc]" /> LIS CARWASH
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Données synchronisées depuis le système carwash</p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Sync status */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                        {syncStatus?.syncing ? (
                            <RefreshIcon className="w-3.5 h-3.5 text-[#33cbcc] animate-spin" />
                        ) : syncStatus?.lastSync?.status === 'error' ? (
                            <Alert01Icon className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                            <Tick01Icon className="w-3.5 h-3.5 text-green-500" />
                        )}
                        <Clock01Icon className="w-3.5 h-3.5" />
                        {syncStatus?.syncing ? 'Synchronisation...' : lastSyncLabel}
                    </div>

                    {/* Refetch button */}
                    <button
                        onClick={() => triggerSync.mutate()}
                        disabled={syncStatus?.syncing || triggerSync.isPending}
                        className="flex items-center gap-1.5 bg-[#33cbcc] text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-[#2ab5b6] disabled:opacity-50 transition-colors"
                    >
                        <RefreshIcon className={`w-4 h-4 ${syncStatus?.syncing || triggerSync.isPending ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Station filter */}
                <div className="relative">
                    <select
                        value={stationId ?? ''}
                        onChange={e => setStationId(e.target.value ? parseInt(e.target.value) : undefined)}
                        className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-8 text-sm text-[#283852] focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40"
                    >
                        <option value="">Toutes les stations</option>
                        {stations.map(s => (
                            <option key={s.id} value={s.id}>{s.nom}</option>
                        ))}
                    </select>
                    <ArrowDown01Icon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Period filter */}
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-0.5">
                    {PERIODS.map(p => (
                        <button key={p.key} onClick={() => setPeriod(p.key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === p.key ? 'bg-[#283852] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                            {p.label}
                        </button>
                    ))}
                    <button onClick={() => setPeriod('custom')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${period === 'custom' ? 'bg-[#283852] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        Personnalisé
                    </button>
                </div>

                {period === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40" />
                        <span className="text-gray-400 text-sm">→</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/40" />
                    </div>
                )}
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {([
                    { key: 'overview', label: 'Vue d\'ensemble', icon: ArrowUpRight01Icon },
                    { key: 'revenue', label: 'Revenus', icon: DollarCircleIcon },
                    { key: 'employees', label: 'Équipe', icon: UserGroupIcon },
                    { key: 'charges', label: 'Charges', icon: Wrench01Icon },
                ] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-[#283852] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Icon className="w-4 h-4" />{label}
                    </button>
                ))}
            </div>

            {/* ── Overview Tab ── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard icon={DollarCircleIcon} label="Chiffre d'affaires" color="bg-[#33cbcc]"
                            value={ovLoading ? '…' : formatFCFA(overview?.totalRevenue ?? 0)}
                            sub="Période sélectionnée" />
                        <StatCard icon={Car01Icon} label="Voitures lavées" color="bg-[#283852]"
                            value={ovLoading ? '…' : (overview?.totalVehicles ?? 0)}
                            sub="Période sélectionnée" />
                        <StatCard icon={Wrench01Icon} label="Charges" color="bg-orange-400"
                            value={ovLoading ? '…' : formatFCFA(overview?.totalExpenses ?? 0)}
                            sub="Dépenses enregistrées" />
                        <StatCard icon={UserGroupIcon} label="Employés actifs" color="bg-violet-500"
                            value={ovLoading ? '…' : (overview?.employeesCount ?? 0)}
                            sub={`${overview?.stationsCount ?? 0} station(s)`} />
                    </div>

                    {/* Stations cards */}
                    <div>
                        <h2 className="text-lg font-semibold text-[#283852] mb-3">Stations</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {stations.map(s => (
                                <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                    className="bg-white rounded-2xl shadow-md p-5 border border-gray-100">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-[#283852] text-lg">{s.nom}</p>
                                            {s.town && (
                                                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Location01Icon className="w-3 h-3" /> {s.adresse}, {s.town}
                                                </p>
                                            )}
                                        </div>
                                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.status === 'active' ? 'Active' : s.status}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex gap-6 text-sm text-gray-600">
                                        <div>
                                            <span className="font-semibold text-[#283852]">{s.employeeCount}</span>
                                            <span className="text-xs ml-1">employés</span>
                                        </div>
                                        {s.managerName && (
                                            <div>
                                                <span className="text-xs text-gray-400">Manager: </span>
                                                <span className="font-medium">{s.managerName}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Revenue chart */}
                    <div className="bg-white rounded-2xl shadow-md p-5">
                        <h2 className="text-base font-semibold text-[#283852] mb-1">Évolution du CA</h2>
                        <p className="text-xs text-gray-400 mb-2">Revenus par jour sur la période</p>
                        {statsLoading
                            ? <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                            : <MiniBarChart data={filteredStats} field="revenue" color="bg-[#33cbcc]" />
                        }
                    </div>
                </div>
            )}

            {/* ── Revenue Tab ── */}
            {tab === 'revenue' && (
                <div className="space-y-4">
                    {/* Summary row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard icon={DollarCircleIcon} label="Total revenus" color="bg-[#33cbcc]"
                            value={ovLoading ? '…' : formatFCFA(overview?.totalRevenue ?? 0)} />
                        <StatCard icon={Car01Icon} label="Voitures lavées" color="bg-[#283852]"
                            value={ovLoading ? '…' : (overview?.totalVehicles ?? 0)} />
                        <StatCard icon={Wrench01Icon} label="Total charges" color="bg-orange-400"
                            value={ovLoading ? '…' : formatFCFA(overview?.totalExpenses ?? 0)} />
                    </div>

                    {/* Daily revenue chart */}
                    <div className="bg-white rounded-2xl shadow-md p-5">
                        <h2 className="text-base font-semibold text-[#283852] mb-1">Revenus journaliers</h2>
                        {statsLoading
                            ? <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                            : <MiniBarChart data={filteredStats} field="revenue" color="bg-[#33cbcc]" />
                        }
                    </div>

                    {/* Daily table */}
                    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-[#283852]">Détail journalier</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                                        <th className="text-left px-5 py-3 text-gray-500 font-medium">Station</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Revenus</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Voitures</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Charges</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {statsLoading ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chargement…</td></tr>
                                    ) : filteredStats.length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune donnée pour cette période</td></tr>
                                    ) : (
                                        [...filteredStats].reverse().map(s => (
                                            <tr key={`${s.stationId}-${s.date}`} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3 font-medium text-[#283852]">
                                                    {new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">{s.stationName ?? `Station ${s.stationId}`}</td>
                                                <td className="px-5 py-3 text-right font-semibold text-[#33cbcc]">{formatFCFA(Number(s.revenue) || 0)}</td>
                                                <td className="px-5 py-3 text-right text-gray-700">{s.vehicles}</td>
                                                <td className="px-5 py-3 text-right text-orange-600">{formatFCFA(Number(s.expenses) || 0)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Employees Tab ── */}
            {tab === 'employees' && (
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="font-semibold text-[#283852]">
                            Équipe carwash
                            <span className="ml-2 text-sm font-normal text-gray-400">({activeEmployees.length} actifs)</span>
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Nom</th>
                                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Rôle</th>
                                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Station</th>
                                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Contact</th>
                                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Bonus/lavage</th>
                                    <th className="text-center px-5 py-3 text-gray-500 font-medium">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {empLoading ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chargement…</td></tr>
                                ) : employees.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun employé</td></tr>
                                ) : (
                                    employees.map(emp => {
                                        const roleMeta = ROLE_LABELS[emp.role] ?? { label: emp.role, color: 'bg-gray-100 text-gray-600' };
                                        return (
                                            <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center text-[#283852] font-bold text-sm flex-shrink-0">
                                                            {emp.prenom[0]}{emp.nom[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-[#283852]">{emp.prenom} {emp.nom}</p>
                                                            {emp.email && <p className="text-xs text-gray-400">{emp.email}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleMeta.color}`}>
                                                        {roleMeta.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-gray-600">
                                                    {emp.stationName ?? <span className="text-gray-300 italic">—</span>}
                                                </td>
                                                <td className="px-5 py-3 text-gray-500">{emp.telephone ?? '—'}</td>
                                                <td className="px-5 py-3 text-right font-medium text-[#33cbcc]">
                                                    {emp.bonusParLavage ? formatFCFA(Number(emp.bonusParLavage)) : '—'}
                                                </td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${emp.actif ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                        {emp.actif ? 'Actif' : 'Inactif'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Charges Tab ── */}
            {tab === 'charges' && (
                <div className="space-y-4">
                    <StatCard icon={Wrench01Icon} label="Total charges (période)" color="bg-orange-400"
                        value={ovLoading ? '…' : formatFCFA(overview?.totalExpenses ?? 0)} />

                    <div className="bg-white rounded-2xl shadow-md p-5">
                        <h2 className="text-base font-semibold text-[#283852] mb-1">Charges journalières</h2>
                        {statsLoading
                            ? <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                            : <MiniBarChart data={filteredStats} field="expenses" color="bg-orange-400" />
                        }
                    </div>

                    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-[#283852]">Charges par station</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                                        <th className="text-left px-5 py-3 text-gray-500 font-medium">Station</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Charges</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Revenus</th>
                                        <th className="text-right px-5 py-3 text-gray-500 font-medium">Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {statsLoading ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">Chargement…</td></tr>
                                    ) : filteredStats.filter(s => Number(s.expenses) > 0).length === 0 ? (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">Aucune charge enregistrée</td></tr>
                                    ) : (
                                        [...filteredStats].filter(s => Number(s.expenses) > 0).reverse().map(s => {
                                            const rev = Number(s.revenue) || 0;
                                            const exp = Number(s.expenses) || 0;
                                            return (
                                                <tr key={`${s.stationId}-${s.date}`} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-5 py-3 font-medium text-[#283852]">
                                                        {new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-5 py-3 text-gray-600">{s.stationName ?? `Station ${s.stationId}`}</td>
                                                    <td className="px-5 py-3 text-right text-orange-600 font-semibold">{formatFCFA(exp)}</td>
                                                    <td className="px-5 py-3 text-right text-[#33cbcc] font-semibold">{formatFCFA(rev)}</td>
                                                    <td className={`px-5 py-3 text-right font-bold ${rev - exp >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {formatFCFA(rev - exp)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
