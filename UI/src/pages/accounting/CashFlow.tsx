import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowDownCircle,
    ArrowUpCircle,
    TrendingUp,
    Calendar,
    Loader2,
    Wallet,
    Filter,
    X,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { getFiscalYears, getCashFlow } from '../../api/accounting/api';
import type { FiscalYear } from '../../api/accounting/types';

/* ─── Constants ─── */

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const SOURCE_LABELS: Record<string, string> = {
    MANUAL: 'Manuel',
    INVOICE: 'Facture client',
    EXPENSE: 'Dépense',
    SALARY: 'Salaire',
    TAX: 'Impôt',
    CREDIT_NOTE: 'Avoir',
    SUPPLIER_INVOICE: 'Facture fournisseur',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' XAF';

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

/* ─── Custom Tooltip ─── */

const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-bold text-gray-700 mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                    <span className="text-gray-600">{p.name}:</span>
                    <span className="font-semibold" style={{ color: p.color }}>
                        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(p.value)}
                    </span>
                </div>
            ))}
        </div>
    );
};

/* ─── Main Page ─── */

export default function CashFlow() {
    const [selectedFiscalYearId, setSelectedFiscalYearId] = useState('');
    const [flowFilter, setFlowFilter] = useState<'all' | 'entrees' | 'sorties'>('all');
    const [monthFilter, setMonthFilter] = useState<number | null>(null);

    const { data: fiscalYears = [], isLoading: fyLoading } = useQuery<FiscalYear[]>({
        queryKey: ['accounting', 'fiscal-years'],
        queryFn: getFiscalYears,
        select: (data) => {
            if (data.length > 0 && !selectedFiscalYearId) {
                const open = data.find(fy => fy.status === 'OPEN');
                setSelectedFiscalYearId(open?.id || data[0].id);
            }
            return data;
        },
    });

    const { data, isLoading } = useQuery({
        queryKey: ['accounting', 'cash-flow', selectedFiscalYearId],
        queryFn: () => getCashFlow(selectedFiscalYearId),
        enabled: !!selectedFiscalYearId,
    });

    // Chart data — only months with activity or all 12
    const chartData = useMemo(() => {
        if (!data?.months) return [];
        return data.months.map((m: any) => ({
            name: MONTH_LABELS[m.month - 1],
            month: m.month,
            Entrées: m.entrees,
            Sorties: m.sorties,
            Net: m.net,
        }));
    }, [data]);

    // Table lines with filters applied
    const filteredLines = useMemo(() => {
        if (!data?.lines) return [];
        let lines = data.lines as any[];

        if (flowFilter === 'entrees') lines = lines.filter((l: any) => Number(l.debit) > 0);
        else if (flowFilter === 'sorties') lines = lines.filter((l: any) => Number(l.credit) > 0);

        if (monthFilter !== null) {
            lines = lines.filter((l: any) => new Date(l.date).getMonth() + 1 === monthFilter);
        }

        return lines;
    }, [data, flowFilter, monthFilter]);

    const hasFilters = flowFilter !== 'all' || monthFilter !== null;

    if (fyLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 size={24} className="animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Flux de Trésorerie</h1>
                    <p className="text-sm text-gray-500 mt-1">Mouvements de liquidités sur les comptes de trésorerie (classe 5)</p>
                </div>
                {/* Fiscal year selector */}
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                    <Calendar size={15} className="text-[#33cbcc]" />
                    <select
                        value={selectedFiscalYearId}
                        onChange={e => setSelectedFiscalYearId(e.target.value)}
                        className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                    >
                        {fiscalYears.map(fy => (
                            <option key={fy.id} value={fy.id}>
                                {fy.name} {fy.status === 'OPEN' ? '(ouvert)' : '(clôturé)'}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-2xl">
                    <Loader2 size={24} className="animate-spin text-[#33cbcc]" />
                </div>
            ) : !data ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl text-gray-400">
                    <Wallet size={48} className="mb-3 opacity-30" />
                    <p>Sélectionnez un exercice pour afficher les flux</p>
                </div>
            ) : (
                <>
                    {/* KPI cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-100 p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                                    <ArrowDownCircle size={20} className="text-[#33cbcc]" />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Total Entrées</span>
                            </div>
                            <p className="text-2xl font-bold text-[#33cbcc]">{fmt(data.totalEntrees)}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 } }}
                            className="bg-white rounded-2xl border border-gray-100 p-5"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                                    <ArrowUpCircle size={20} className="text-[#283852]" />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Total Sorties</span>
                            </div>
                            <p className="text-2xl font-bold text-[#283852]">{fmt(data.totalSorties)}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                            className={`rounded-2xl border p-5 ${data.netCashFlow >= 0 ? 'bg-[#33cbcc]/5 border-[#33cbcc]/30' : 'bg-[#283852]/5 border-gray-200'}`}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${data.netCashFlow >= 0 ? 'bg-[#33cbcc]/20' : 'bg-[#283852]/20'}`}>
                                    <TrendingUp size={20} className={data.netCashFlow >= 0 ? 'text-[#33cbcc]' : 'text-[#283852]'} />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Flux Net</span>
                            </div>
                            <p className={`text-2xl font-bold ${data.netCashFlow >= 0 ? 'text-[#33cbcc]' : 'text-[#283852]'}`}>
                                {data.netCashFlow >= 0 ? '+' : ''}{fmt(data.netCashFlow)}
                            </p>
                        </motion.div>
                    </div>

                    {/* Line Chart */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-base font-bold text-gray-800">Évolution mensuelle</h2>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[#33cbcc] rounded" />Entrées</span>
                                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 bg-[#283852] rounded" />Sorties</span>
                                <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 border-t-2 border-dashed border-gray-400" />Net</span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                    onClick={(e) => {
                                        const idx = MONTH_LABELS.indexOf(e.value);
                                        if (idx !== -1) setMonthFilter(prev => prev === idx + 1 ? null : idx + 1);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={v => v === 0 ? '0' : v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <ReferenceLine y={0} stroke="#e5e7eb" />
                                <Line
                                    type="monotone"
                                    dataKey="Entrées"
                                    stroke="#33cbcc"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#33cbcc', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Sorties"
                                    stroke="#283852"
                                    strokeWidth={2.5}
                                    dot={{ r: 4, fill: '#283852', strokeWidth: 0 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="Net"
                                    stroke="#9ca3af"
                                    strokeWidth={2}
                                    strokeDasharray="5 5"
                                    dot={false}
                                    activeDot={{ r: 5 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-xs text-gray-400 text-center mt-2">Cliquez sur un mois pour filtrer le tableau</p>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1 p-1 bg-white border border-gray-200 rounded-xl">
                            {([['all', 'Tout'], ['entrees', 'Entrées'], ['sorties', 'Sorties']] as const).map(([key, label]) => (
                                <button
                                    key={key}
                                    onClick={() => setFlowFilter(key)}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        flowFilter === key
                                            ? key === 'entrees' ? 'bg-[#33cbcc] text-white'
                                              : key === 'sorties' ? 'bg-[#283852] text-white'
                                              : 'bg-gray-800 text-white'
                                            : 'text-gray-500 hover:bg-gray-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Month filter chips */}
                        <div className="flex items-center gap-1 flex-wrap">
                            <Filter size={14} className="text-gray-400 mr-1" />
                            {MONTH_LABELS.map((label, idx) => {
                                const hasData = chartData[idx]?.Entrées > 0 || chartData[idx]?.Sorties > 0;
                                const isActive = monthFilter === idx + 1;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setMonthFilter(prev => prev === idx + 1 ? null : idx + 1)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            isActive
                                                ? 'bg-[#283852] text-white'
                                                : hasData
                                                ? 'bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20'
                                                : 'bg-gray-50 text-gray-300 cursor-default'
                                        }`}
                                        disabled={!hasData && !isActive}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>

                        {hasFilters && (
                            <button
                                onClick={() => { setFlowFilter('all'); setMonthFilter(null); }}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-[#283852] border border-gray-200 rounded-xl transition-colors"
                            >
                                <X size={12} /> Réinitialiser
                            </button>
                        )}

                        <span className="ml-auto text-xs text-gray-400">
                            {filteredLines.length} opération{filteredLines.length !== 1 ? 's' : ''}
                            {monthFilter && ` — ${MONTH_LABELS[monthFilter - 1]}`}
                        </span>
                    </div>

                    {/* Transactions table */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">N° Pièce</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Libellé</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Compte</th>
                                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#33cbcc] uppercase tracking-wider">Entrée</th>
                                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#283852] uppercase tracking-wider">Sortie</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLines.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-16 text-center text-gray-400">
                                            <Wallet size={40} className="mx-auto mb-3 opacity-20" />
                                            <p>Aucun mouvement{hasFilters ? ' pour ce filtre' : ''}</p>
                                        </td>
                                    </tr>
                                ) : filteredLines.map((line: any, idx: number) => {
                                    const isEntree = Number(line.debit) > 0;
                                    const amount = isEntree ? Number(line.debit) : Number(line.credit);
                                    return (
                                        <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${isEntree ? 'border-l-2 border-l-[#33cbcc]' : 'border-l-2 border-l-[#283852]'}`}>
                                            <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmtDate(line.date)}</td>
                                            <td className="px-5 py-3 font-mono text-xs text-[#283852]">{line.entryNumber || '--'}</td>
                                            <td className="px-5 py-3 text-gray-700 max-w-xs truncate">
                                                {line.label || line.description || '--'}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                                                    {line.accountCode}
                                                </span>
                                                <span className="text-xs text-gray-400 ml-1.5">{line.accountName}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs bg-[#283852]/10 text-[#283852] px-2 py-0.5 rounded">
                                                    {SOURCE_LABELS[line.sourceType] ?? line.sourceType}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold text-[#33cbcc]">
                                                {isEntree ? fmt(amount) : ''}
                                            </td>
                                            <td className="px-5 py-3 text-right font-semibold text-[#283852]">
                                                {!isEntree ? fmt(amount) : ''}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {filteredLines.length > 0 && (
                                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                                    <tr>
                                        <td colSpan={5} className="px-5 py-3 font-bold text-gray-700 text-sm">Totaux</td>
                                        <td className="px-5 py-3 text-right font-bold text-[#33cbcc]">
                                            {fmt(filteredLines.reduce((s: number, l: any) => s + (Number(l.debit) || 0), 0))}
                                        </td>
                                        <td className="px-5 py-3 text-right font-bold text-[#283852]">
                                            {fmt(filteredLines.reduce((s: number, l: any) => s + (Number(l.credit) || 0), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
