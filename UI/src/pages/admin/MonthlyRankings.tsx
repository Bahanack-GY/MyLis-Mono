import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrownIcon, Medal01Icon, Award01Icon, Calendar01Icon, ArrowDown01Icon, StarIcon, Tick01Icon, RefreshIcon } from 'hugeicons-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/config';

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const rankingsApi = {
    getYears: () => api.get('/employees/rankings/years').then(r => r.data as number[]),
    getMonthly: (year: number) => api.get('/employees/rankings/monthly', { params: { year } }).then(r => r.data),
    getYearly: (year: number) => api.get('/employees/rankings/yearly', { params: { year } }).then(r => r.data),
    snapshot: (year: number, month: number) => api.post('/employees/rankings/snapshot', { year, month, resetPoints: true }).then(r => r.data),
};

const RANK_ICONS = [CrownIcon, Medal01Icon, StarIcon];
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
    const winner = data.find((e: any) => e.rank === 1);
    const runners = data.filter((e: any) => e.rank > 1);

    return (
        <div className={`rounded-2xl border overflow-hidden ${hasData ? 'bg-white border-gray-100 shadow-sm' : 'bg-gray-50 border-dashed border-gray-200'}`}>
            {/* Month header */}
            <div className={`px-3 py-2 flex items-center justify-between ${hasData ? 'bg-[#283852]' : 'bg-transparent'}`}>
                <span className={`text-xs font-bold ${hasData ? 'text-white' : 'text-gray-400'}`}>{MONTH_NAMES[month - 1]}</span>
                {hasData && <Tick01Icon size={12} className="text-[#33cbcc]" />}
            </div>

            {!hasData ? (
                <div className="py-6 flex flex-col items-center gap-1">
                    <CrownIcon size={18} className="text-gray-200" />
                    <p className="text-[10px] text-gray-300">Pas encore de données</p>
                </div>
            ) : (
                <div className="p-3 space-y-2">
                    {/* Employee of the Month — rank 1 */}
                    {winner && (
                        <div className="flex flex-col items-center gap-1.5 py-2 px-2 rounded-xl bg-gradient-to-b from-[#33cbcc]/10 to-[#33cbcc]/5 border border-[#33cbcc]/20">
                            <div className="relative">
                                <Avatar src={winner.employee.avatarUrl} name={`${winner.employee.firstName} ${winner.employee.lastName}`} size="md" />
                                <CrownIcon size={14} className="absolute -top-2 left-1/2 -translate-x-1/2 text-[#33cbcc]" />
                            </div>
                            <div className="text-center min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate max-w-[90px]">{winner.employee.firstName}</p>
                                <p className="text-[10px] text-gray-500 truncate max-w-[90px]">{winner.employee.lastName}</p>
                                <span className="text-[10px] font-semibold text-[#33cbcc]">{winner.points} pts</span>
                            </div>
                        </div>
                    )}

                    {/* Runners-up */}
                    {runners.map((entry: any) => {
                        const RankIcon = RANK_ICONS[entry.rank - 1];
                        return (
                            <div key={entry.rank} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50">
                                <RankIcon size={11} className="text-[#283852]/50 shrink-0" />
                                <Avatar src={entry.employee.avatarUrl} name={`${entry.employee.firstName} ${entry.employee.lastName}`} size="sm" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-semibold text-gray-700 truncate">{entry.employee.firstName} {entry.employee.lastName}</p>
                                    <p className="text-[9px] text-gray-400">{entry.points} pts</p>
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
                <Award01Icon size={20} className="text-[#33cbcc]" />
                <span className="font-bold text-lg">Employé de l'Année</span>
            </div>
            <div className="flex items-center gap-6">
                {/* Winner */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Avatar src={winner.avatarUrl} name={`${winner.firstName} ${winner.lastName}`} size="lg" />
                        <CrownIcon size={18} className="absolute -top-2 -right-1 text-[#33cbcc]" />
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
    const [confirmSnapshot, setConfirmSnapshot] = useState(false);
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

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevMonthYear = prevMonthDate.getFullYear();

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
                        <Award01Icon size={24} className="text-[#33cbcc]" />
                        Palmarès mensuel
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Top 3 employés par mois · Enregistrement automatique le 5 de chaque mois · Les points sont remis à zéro après enregistrement
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Year selector */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                        <Calendar01Icon size={14} className="text-[#33cbcc]" />
                        <select value={selectedYear} onChange={e => setSelectedYear(+e.target.value)}
                            className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer">
                            {allYears.map((y: number) => <option key={y} value={y}>{y}</option>)}
                            {!allYears.includes(new Date().getFullYear()) && (
                                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            )}
                        </select>
                    </div>

                    {/* Manual snapshot button (previous month) */}
                    <button
                        onClick={() => setConfirmSnapshot(true)}
                        disabled={snapshot.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#283852] text-white rounded-xl text-sm hover:bg-[#283852]/90 disabled:opacity-50"
                    >
                        <RefreshIcon size={14} className={snapshot.isPending ? 'animate-spin' : ''} />
                        Clôturer {MONTH_NAMES[prevMonth - 1]}
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
                <span className="flex items-center gap-1.5"><CrownIcon size={12} className="text-[#33cbcc]" />1er place</span>
                <span className="flex items-center gap-1.5"><Medal01Icon size={12} className="text-[#283852]" />2ème place</span>
                <span className="flex items-center gap-1.5"><StarIcon size={12} className="text-[#283852]/50" />3ème place</span>
                <span className="text-gray-300">·</span>
                <span>Clôture automatique le 5 de chaque mois à 08:00 · Points remis à zéro</span>
            </div>

            {/* Confirmation modal */}
            <AnimatePresence>
                {confirmSnapshot && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setConfirmSnapshot(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                    <RefreshIcon size={18} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-800">
                                        Clôturer {MONTH_NAMES[prevMonth - 1]} {currentYear} ?
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Cette action va enregistrer le top 3 et{' '}
                                        <span className="font-semibold text-red-600">remettre à zéro les points de tous les employés actifs</span>.
                                        Cette opération est irréversible.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => setConfirmSnapshot(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={() => {
                                        setConfirmSnapshot(false);
                                        snapshot.mutate({ year: prevMonthYear, month: prevMonth });
                                    }}
                                    disabled={snapshot.isPending}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                                >
                                    Confirmer la clôture
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
