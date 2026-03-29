import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDailyHours } from '../api/tasks/hooks';

type Period = 'week' | 'month' | 'year' | 'custom';

/* ── date helpers ─────────────────────────────────────────── */

function pad(n: number) { return String(n).padStart(2, '0'); }

function fmtDate(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getWeekRange(offset: number) {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const toMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + toMon + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
        from: fmtDate(monday),
        to: fmtDate(sunday),
        label: `${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    };
}

function getMonthRange(offset: number) {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    return {
        from: fmtDate(first),
        to: fmtDate(last),
        label: first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    };
}

function getYearRange(offset: number) {
    const year = new Date().getFullYear() + offset;
    return {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
        label: String(year),
    };
}

/* ── label helpers ────────────────────────────────────────── */

const FR_DAYS  = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const FR_MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

function dayLabel(dateStr: string) {
    // Add T12:00 to avoid timezone shift
    const d = new Date(dateStr + 'T12:00:00');
    return `${FR_DAYS[d.getDay()]} ${d.getDate()}`;
}

function dateLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

/* ── aggregate daily → monthly ────────────────────────────── */

function aggregateMonthly(daily: { date: string; hours: number }[]) {
    const map: Record<string, number> = {};
    for (const { date, hours } of daily) {
        const key = date.substring(0, 7); // YYYY-MM
        map[key] = (map[key] || 0) + hours;
    }
    return Object.keys(map)
        .sort()
        .map(key => ({
            label: FR_MONTHS[parseInt(key.split('-')[1], 10) - 1],
            hours: Math.round(map[key] * 10) / 10,
        }));
}

/* ── custom tooltip ───────────────────────────────────────── */

function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
            <p className="text-[#33cbcc] font-bold">{payload[0].value}h</p>
        </div>
    );
}

/* ── main component ───────────────────────────────────────── */

interface Props {
    employeeId: string;
}

export default function TaskTimeChart({ employeeId }: Props) {
    const [period, setPeriod] = useState<Period>('week');
    const [offset, setOffset] = useState(0);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    const range = useMemo(() => {
        if (period === 'week')  return getWeekRange(offset);
        if (period === 'month') return getMonthRange(offset);
        if (period === 'year')  return getYearRange(offset);
        return { from: customFrom, to: customTo, label: 'Personnalisé' };
    }, [period, offset, customFrom, customTo]);

    const { data: raw = [], isLoading } = useDailyHours(employeeId, range.from, range.to);

    const chartData = useMemo(() => {
        if (period === 'year') {
            return aggregateMonthly(raw);
        }
        if (period === 'week') {
            return raw.map(d => ({ label: dayLabel(d.date), hours: d.hours }));
        }
        // month or custom
        return raw.map(d => ({ label: dateLabel(d.date), hours: d.hours }));
    }, [raw, period]);

    const totalHours = useMemo(() => raw.reduce((s, d) => s + d.hours, 0), [raw]);

    const periods: { key: Period; label: string }[] = [
        { key: 'week',   label: 'Semaine' },
        { key: 'month',  label: 'Mois'    },
        { key: 'year',   label: 'Année'   },
        { key: 'custom', label: 'Perso.'  },
    ];

    const canNav = period !== 'custom';

    return (
        <div>
            {/* Period selector */}
            <div className="flex items-center gap-1 mb-3">
                {periods.map(p => (
                    <button
                        key={p.key}
                        onClick={() => { setPeriod(p.key); setOffset(0); }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                            period === p.key
                                ? 'bg-[#33cbcc] text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {p.label}
                    </button>
                ))}
                <span className="ml-auto text-xs text-gray-400 font-medium">
                    {Math.round(totalHours * 10) / 10}h total
                </span>
            </div>

            {/* Navigation or custom pickers */}
            {canNav ? (
                <div className="flex items-center justify-between mb-3">
                    <button
                        onClick={() => setOffset(o => o - 1)}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-semibold text-gray-700 capitalize">{range.label}</span>
                    <button
                        onClick={() => setOffset(o => o + 1)}
                        disabled={offset >= 0}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors disabled:opacity-30"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="date"
                        value={customFrom}
                        onChange={e => setCustomFrom(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#33cbcc]"
                    />
                    <span className="text-xs text-gray-400">—</span>
                    <input
                        type="date"
                        value={customTo}
                        onChange={e => setCustomTo(e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#33cbcc]"
                    />
                </div>
            )}

            {/* Chart */}
            {isLoading ? (
                <div className="h-[180px] flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : chartData.length === 0 || totalHours === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-xs text-gray-400">
                    Aucune donnée pour cette période
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} barCategoryGap="30%">
                        <CartesianGrid vertical={false} stroke="#f3f4f6" />
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            interval={period === 'month' ? Math.floor(chartData.length / 8) : 0}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                            tickFormatter={v => `${v}h`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
                        <Bar dataKey="hours" fill="#33cbcc" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}
