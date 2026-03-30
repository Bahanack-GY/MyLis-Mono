import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Medal, Trophy, Calendar, ChevronDown, Star, CheckCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const rankingsApi = {
    getYears: () => axios.get(`${API}/employees/rankings/years`).then(r => r.data as number[]),
    getMonthly: (year: number) => axios.get(`${API}/employees/rankings/monthly`, { params: { year } }).then(r => r.data),
    getYearly: (year: number) => axios.get(`${API}/employees/rankings/yearly`, { params: { year } }).then(r => r.data),
    snapshot: (year: number, month: number) => axios.post(`${API}/employees/rankings/snapshot`, { year, month }).then(r => r.data),
};

const RANK_ICONS = [Crown, Medal, Star];
const RANK_SIZES = ['w-14 h-14', 'w-11 h-11', 'w-10 h-10'];
const RANK_LABELS = ['1er', '2ème', '3ème'];
const RANK_ICON_COLORS = ['text-[#33cbcc]', 'text-[#283852]', 'text-[#283852]/50'];
const RANK_BG = ['bg-[#33cbcc]/10', 'bg-[#283852]/10', 'bg-gray-50'];

function Avatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: 'sm' | 'md' | 'lg' }) {
    const s = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
    if (src) return <img src={src} alt={name} className={`${s} rounded-full object-cover`} />;
    return (
        <div className={`${s} rounded-full bg-[#283852] text-white flex items-center justify-center font-bold`}>
            {initials}
        </div>
    );
}

function MonthCard({ month, data }: { month: number; data: any[] }) {
    const hasData = data.length > 0;
    return (
        <div className={`rounded-2xl border p-4 ${hasData ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-700">{MONTH_NAMES[month - 1]}</span>
                {hasData && <CheckCircle size={14} className="text-[#33cbcc]" />}
            </div>
            {!hasData ? (
                <p className="text-xs text-gray-300 text-center py-3">Pas encore de données</p>
            ) : (
                <div className="space-y-2">
                    {data.map((entry: any) => {
                        const RankIcon = RANK_ICONS[entry.rank - 1];
                        return (
                            <div key={entry.rank} className={`flex items-center gap-2 px-2 py-1.5 rounded-xl ${RANK_BG[entry.rank - 1]}`}>
                                <RankIcon size={13} className={RANK_ICONS[entry.rank - 1] === Crown ? 'text-[#33cbcc]' : 'text-[#283852]/60'} />
                                <Avatar src={entry.employee.avatarUrl} name={`${entry.employee.firstName} ${entry.employee.lastName}`} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold text-gray-800 truncate">{entry.employee.firstName} {entry.employee.lastName}</p>
                                    <p className="text-[10px] text-gray-400">{entry.points} pts</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function YearWinner({ winner, podium }: { winner: any; podium: any[] }) {
    if (!winner) return null;
    return (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#283852] rounded-2xl p-6 text-white mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-[#33cbcc]" />
                <span className="font-bold text-lg">Employé de l'Année</span>
            </div>
            <div className="flex items-center gap-6">
                {/* Winner */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Avatar src={winner.avatarUrl} name={`${winner.firstName} ${winner.lastName}`} size="lg" />
                        <Crown size={18} className="absolute -top-2 -right-1 text-[#33cbcc]" />
                    </div>
                    <div>
                        <p className="text-xl font-bold">{winner.firstName} {winner.lastName}</p>
                        <p className="text-sm text-white/60">{winner.position} · {winner.department}</p>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs bg-[#33cbcc]/20 text-[#33cbcc] px-2 py-0.5 rounded-full">
                                {winner.rank1}× 1er
                            </span>
                            {winner.rank2 > 0 && <span className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{winner.rank2}× 2ème</span>}
                            <span className="text-xs text-white/40">{winner.totalPoints} pts cumulés</span>
                        </div>
                    </div>
                </div>

                {/* Podium */}
                <div className="ml-auto flex items-end gap-3">
                    {podium.map((p: any, i: number) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                            <Avatar src={p.avatarUrl} name={`${p.firstName} ${p.lastName}`} size={i === 0 ? 'md' : 'sm'} />
                            <span className="text-[10px] text-white/50">{RANK_LABELS[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

export default function MonthlyRankings() {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const qc = useQueryClient();

    const { data: years = [] } = useQuery({
        queryKey: ['ranking-years'],
        queryFn: rankingsApi.getYears,
    });

    const { data: monthly, isLoading: loadingMonthly } = useQuery({
        queryKey: ['rankings-monthly', selectedYear],
        queryFn: () => rankingsApi.getMonthly(selectedYear),
    });

    const { data: yearly } = useQuery({
        queryKey: ['rankings-yearly', selectedYear],
        queryFn: () => rankingsApi.getYearly(selectedYear),
    });

    const snapshot = useMutation({
        mutationFn: ({ year, month }: { year: number; month: number }) => rankingsApi.snapshot(year, month),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['rankings-monthly', selectedYear] });
            qc.invalidateQueries({ queryKey: ['rankings-yearly', selectedYear] });
            qc.invalidateQueries({ queryKey: ['ranking-years'] });
        },
    });

    const currentMonth = new Date().getMonth() + 1;

    // All 12 months for the grid
    const allYears = years.length > 0
        ? years
        : [new Date().getFullYear()];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy size={24} className="text-[#33cbcc]" />
                        Palmarès mensuel
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Top 3 employés par mois · Enregistrement automatique le dernier jour du mois à 20h
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Year selector */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <Calendar size={14} className="text-[#33cbcc]" />
                        <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
                            className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
                            {allYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
                            {!allYears.includes(new Date().getFullYear()) && (
                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            )}
                        </select>
                    </div>

                    {/* Manual snapshot button (current month) */}
                    <button
                        onClick={() => snapshot.mutate({ year: selectedYear, month: currentMonth })}
                        disabled={snapshot.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#283852] text-white rounded-xl text-sm hover:bg-[#283852]/90 disabled:opacity-50"
                        title={`Forcer le snapshot de ${MONTH_NAMES[currentMonth - 1]} ${selectedYear}`}
                    >
                        <RefreshCw size={14} className={snapshot.isPending ? 'animate-spin' : ''} />
                        Snapshot {MONTH_NAMES[currentMonth - 1]}
                    </button>
                </div>
            </div>

            {/* Employee of the year banner */}
            {yearly?.winner && <YearWinner winner={yearly.winner} podium={yearly.podium || []} />}

            {/* Monthly grid */}
            {loadingMonthly ? (
                <div className="grid grid-cols-4 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => {
                        const monthData = monthly?.months?.[month] ?? [];
                        const isCurrentMonth = month === currentMonth && selectedYear === new Date().getFullYear();
                        return (
                            <div key={month} className={`relative ${isCurrentMonth ? 'ring-2 ring-[#33cbcc]/40 rounded-2xl' : ''}`}>
                                {isCurrentMonth && (
                                    <span className="absolute -top-2 right-3 text-[10px] bg-[#33cbcc] text-white px-2 py-0.5 rounded-full z-10">
                                        En cours
                                    </span>
                                )}
                                <MonthCard month={month} data={monthData} />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-gray-400 justify-center pt-2">
                <span className="flex items-center gap-1.5"><Crown size={12} className="text-[#33cbcc]" />1er place</span>
                <span className="flex items-center gap-1.5"><Medal size={12} className="text-[#283852]" />2ème place</span>
                <span className="flex items-center gap-1.5"><Star size={12} className="text-[#283852]/50" />3ème place</span>
                <span className="text-gray-300">·</span>
                <span>Snapshot automatique le dernier jour du mois à 20:00</span>
            </div>
        </div>
    );
}
