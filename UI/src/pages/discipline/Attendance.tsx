import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar01Icon,
    Upload01Icon,
    UserGroupIcon,
    CheckmarkCircle01Icon,
    Cancel01Icon,
    Clock01Icon,
    Delete02Icon,
    Loading02Icon,
    Search01Icon,
    File01Icon,
    Alert02Icon,
    Award01Icon,
    Medal01Icon,
} from 'hugeicons-react';
import {
    useAttendanceMonth,
    useAttendanceMonths,
    useDeleteAttendanceMonth,
    useUploadAttendance,
} from '../../api/attendance/hooks';
import type { AttendanceRecord } from '../../api/attendance/types';
import { useEmployees } from '../../api/employees/hooks';

const MONTH_LABELS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const monthLabel = (year: number, month: number) =>
    `${MONTH_LABELS_FR[month - 1]} ${year}`;

/* ─── Lateness / weekday helpers ────────────────────────────────────────── */

// Workday starts at 08:15 — anything later is counted as a retard.
const LATE_THRESHOLD_MIN = 8 * 60 + 15;

const parseHHMM = (s: string | null | undefined): number | null => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};

const isWeekendDay = (year: number, month: number, day: number) => {
    const wd = new Date(year, month - 1, day).getDay();
    return wd === 0 || wd === 6; // Sunday | Saturday
};

// Normalise names for cross-system matching: lowercase, strip accents, drop punctuation.
const normaliseName = (s: string) =>
    s
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const fmtHHMM = (minutes: number | null) => {
    if (minutes == null) return '--:--';
    const h = Math.floor(minutes / 60).toString().padStart(2, '0');
    const m = Math.floor(minutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

interface EmployeeMetrics {
    employeeId: string;
    workdayCount: number;       // weekdays in the period
    presentWorkdays: number;    // weekdays with any pointage
    lateDays: number;           // weekdays where earliest SW > 08:15
    onTimeWorkdays: number;     // presentWorkdays - lateDays
    avgArrivalMin: number | null;
    punctualityRate: number;    // onTime / present (0 if no presence)
    assiduityRate: number;      // present / workdayCount
}

const computeMetrics = (rec: AttendanceRecord, year: number, month: number): EmployeeMetrics => {
    let workdayCount = 0;
    let presentWorkdays = 0;
    let lateDays = 0;
    const arrivals: number[] = [];

    for (const d of rec.days) {
        if (isWeekendDay(year, month, d.day)) continue;
        workdayCount++;
        const firstSw = d.pairs
            .map(p => parseHHMM(p.sw))
            .filter((v): v is number => v != null)
            .sort((a, b) => a - b)[0];
        const hasActivity = d.pairs.some(p => p.sw || p.ew);
        if (!hasActivity) continue;
        presentWorkdays++;
        if (firstSw != null) {
            arrivals.push(firstSw);
            if (firstSw > LATE_THRESHOLD_MIN) lateDays++;
        }
    }

    const onTimeWorkdays = presentWorkdays - lateDays;
    return {
        employeeId: rec.id,
        workdayCount,
        presentWorkdays,
        lateDays,
        onTimeWorkdays,
        avgArrivalMin: arrivals.length
            ? Math.round(arrivals.reduce((s, v) => s + v, 0) / arrivals.length)
            : null,
        punctualityRate: presentWorkdays > 0 ? onTimeWorkdays / presentWorkdays : 0,
        assiduityRate: workdayCount > 0 ? presentWorkdays / workdayCount : 0,
    };
};

const isCellLate = (pairs: { sw: string | null; ew: string | null }[]) => {
    const firstSw = pairs
        .map(p => parseHHMM(p.sw))
        .filter((v): v is number => v != null)
        .sort((a, b) => a - b)[0];
    return firstSw != null && firstSw > LATE_THRESHOLD_MIN;
};

const Attendance = () => {
    const fileInput = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedKey, setSelectedKey] = useState<string>('');

    const { data: months = [], isLoading: monthsLoading } = useAttendanceMonths();
    const upload = useUploadAttendance();
    const remove = useDeleteAttendanceMonth();

    // Default the selection to the most recent uploaded month once data arrives.
    useEffect(() => {
        if (!selectedKey && months.length > 0) {
            setSelectedKey(`${months[0].year}-${months[0].month}`);
        }
    }, [months, selectedKey]);

    const [selYear, selMonth] = selectedKey
        ? selectedKey.split('-').map(Number)
        : [null, null];

    const { data: monthData, isFetching } = useAttendanceMonth(selYear, selMonth);

    // Filter the punch-machine roster down to people who actually exist in our HR database.
    const { data: employees = [] } = useEmployees();

    const isKnownEmployee = useMemo(() => {
        const matchers = employees
            .filter(e => !(e as any).dismissed)
            .map(e => ({
                first: normaliseName((e as any).firstName ?? '').split(' ').filter(Boolean),
                last: normaliseName((e as any).lastName ?? '').split(' ').filter(Boolean),
            }))
            .filter(m => m.first.length > 0 || m.last.length > 0);

        return (name: string) => {
            const tokens = new Set(normaliseName(name).split(' ').filter(Boolean));
            if (tokens.size === 0) return false;
            return matchers.some(({ first, last }) => {
                const firstHit = first.length === 0 || first.some(t => tokens.has(t));
                const lastHit = last.length === 0 || last.some(t => tokens.has(t));
                // Require BOTH a first-name and last-name hit to avoid false positives
                // on common first names; an employee with only a single name is still
                // matched because that side is treated as empty.
                return firstHit && lastHit;
            });
        };
    }, [employees]);

    // Only employees from the HR database are surfaced or counted in metrics.
    const recognizedRecords = useMemo(() => {
        if (!monthData) return [] as AttendanceRecord[];
        return monthData.records.filter(r => isKnownEmployee(r.employeeName));
    }, [monthData, isKnownEmployee]);

    // Per-employee derived metrics (punctuality / assiduity / lateness)
    const metricsByEmployee = useMemo(() => {
        if (!monthData) return new Map<string, EmployeeMetrics>();
        const map = new Map<string, EmployeeMetrics>();
        for (const rec of recognizedRecords) {
            map.set(rec.id, computeMetrics(rec, monthData.year, monthData.month));
        }
        return map;
    }, [monthData, recognizedRecords]);

    const filteredRecords = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return recognizedRecords;
        return recognizedRecords.filter(r =>
            r.employeeName.toLowerCase().includes(q) ||
            (r.department ?? '').toLowerCase().includes(q),
        );
    }, [recognizedRecords, searchQuery]);

    const stats = useMemo(() => {
        if (!monthData) {
            return {
                total: 0, expectedDays: 0,
                totalPresentDays: 0, totalAbsentDays: 0, totalLateDays: 0,
            };
        }
        const total = recognizedRecords.length;
        const totalPresentDays = [...metricsByEmployee.values()].reduce((s, m) => s + m.presentWorkdays, 0);
        const totalAbsentDays = [...metricsByEmployee.values()].reduce(
            (s, m) => s + (m.workdayCount - m.presentWorkdays),
            0,
        );
        const totalLateDays = [...metricsByEmployee.values()].reduce((s, m) => s + m.lateDays, 0);
        return {
            total,
            expectedDays: monthData.daysCount,
            totalPresentDays,
            totalAbsentDays,
            totalLateDays,
        };
    }, [monthData, recognizedRecords, metricsByEmployee]);

    // Champions (most punctual + most diligent) — require at least one weekday present
    const champions = useMemo(() => {
        if (!monthData) return { mostPunctual: null as null | { rec: AttendanceRecord; m: EmployeeMetrics }, mostDiligent: null as null | { rec: AttendanceRecord; m: EmployeeMetrics } };
        const candidates = recognizedRecords
            .map(rec => ({ rec, m: metricsByEmployee.get(rec.id)! }))
            .filter(x => x.m && x.m.presentWorkdays > 0);

        if (candidates.length === 0) {
            return { mostPunctual: null, mostDiligent: null };
        }

        const mostPunctual = [...candidates].sort((a, b) => {
            if (b.m.punctualityRate !== a.m.punctualityRate) return b.m.punctualityRate - a.m.punctualityRate;
            // Tiebreak: more presence wins, then earlier average arrival
            if (b.m.presentWorkdays !== a.m.presentWorkdays) return b.m.presentWorkdays - a.m.presentWorkdays;
            return (a.m.avgArrivalMin ?? Infinity) - (b.m.avgArrivalMin ?? Infinity);
        })[0];

        const mostDiligent = [...candidates].sort((a, b) => {
            if (b.m.assiduityRate !== a.m.assiduityRate) return b.m.assiduityRate - a.m.assiduityRate;
            // Tiebreak: fewer lates wins
            return a.m.lateDays - b.m.lateDays;
        })[0];

        return { mostPunctual, mostDiligent };
    }, [monthData, recognizedRecords, metricsByEmployee]);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        upload.mutate(file, {
            onSuccess: (data) => {
                setSelectedKey(`${data.year}-${data.month}`);
            },
        });
        // Allow re-uploading the same file later.
        e.target.value = '';
    };

    const handleDelete = () => {
        if (selYear == null || selMonth == null) return;
        if (!window.confirm(`Supprimer les présences de ${monthLabel(selYear, selMonth)} ?`)) return;
        remove.mutate({ year: selYear, month: selMonth }, {
            onSuccess: () => {
                const next = months.find(m => !(m.year === selYear && m.month === selMonth));
                setSelectedKey(next ? `${next.year}-${next.month}` : '');
            },
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start justify-between gap-4 flex-wrap"
            >
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#33cbcc] mb-1">
                        Discipline
                    </p>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#1c2b3a] leading-tight">
                        Suivi des présences
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Importez le relevé mensuel (.xls) et consultez les pointages par employé.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".xls,.xlsx"
                        className="hidden"
                        onChange={handleUpload}
                    />
                    <button
                        onClick={() => fileInput.current?.click()}
                        disabled={upload.isPending}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#33cbcc] hover:bg-[#2bb5b6] text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
                    >
                        {upload.isPending ? (
                            <Loading02Icon size={16} className="animate-spin" />
                        ) : (
                            <Upload01Icon size={16} />
                        )}
                        {upload.isPending ? 'Import en cours...' : 'Importer un fichier'}
                    </button>
                </div>
            </motion.div>

            {/* Month selector + actions */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <Calendar01Icon size={16} className="text-[#33cbcc]" />
                    <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer"
                        disabled={monthsLoading || months.length === 0}
                    >
                        {months.length === 0 && <option value="">Aucune période</option>}
                        {months.map(m => (
                            <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                                {monthLabel(m.year, m.month)} — {m.employeeCount} employés
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 min-w-[220px] max-w-md">
                    <Search01Icon size={16} className="text-gray-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher un employé..."
                        className="flex-1 text-sm bg-transparent focus:outline-none"
                    />
                </div>

                {selectedKey && (
                    <button
                        onClick={handleDelete}
                        disabled={remove.isPending}
                        className="flex items-center gap-2 px-3 py-2 border border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/5 rounded-xl text-sm font-medium transition-colors"
                    >
                        <Delete02Icon size={15} />
                        Supprimer
                    </button>
                )}
            </div>

            {/* Stats */}
            {monthData && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {[
                        {
                            label: 'Employés',
                            value: stats.total,
                            icon: UserGroupIcon,
                            color: '#283852',
                        },
                        {
                            label: 'Jours suivis',
                            value: stats.expectedDays,
                            icon: Calendar01Icon,
                            color: '#33cbcc',
                        },
                        {
                            label: 'Présences cumulées',
                            value: stats.totalPresentDays,
                            icon: CheckmarkCircle01Icon,
                            color: '#22c55e',
                        },
                        {
                            label: 'Absences cumulées',
                            value: stats.totalAbsentDays,
                            icon: Cancel01Icon,
                            color: '#ef4444',
                        },
                        {
                            label: 'Retards (>08:15)',
                            value: stats.totalLateDays,
                            icon: Alert02Icon,
                            color: '#f59e0b',
                        },
                    ].map((s, i) => (
                        <motion.div
                            key={s.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border border-[#e5e8ef] rounded-2xl overflow-hidden bg-white"
                        >
                            <div className="px-5 py-3" style={{ backgroundColor: s.color }}>
                                <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide">
                                    {s.label}
                                </p>
                            </div>
                            <div className="p-5 relative overflow-hidden">
                                <p className="text-3xl font-bold text-[#1c2b3a] leading-none">{s.value}</p>
                                <div
                                    className="absolute -right-4 -bottom-4 opacity-[0.14] pointer-events-none"
                                    style={{ color: s.color }}
                                >
                                    <s.icon size={110} strokeWidth={1.2} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Champions */}
            {monthData && (champions.mostPunctual || champions.mostDiligent) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {champions.mostPunctual && (
                        <ChampionCard
                            title="Plus ponctuel"
                            subtitle={`Arrivées avant 08:15 — ${monthLabel(monthData.year, monthData.month)}`}
                            icon={Award01Icon}
                            accent="#33cbcc"
                            employeeName={champions.mostPunctual.rec.employeeName}
                            department={champions.mostPunctual.rec.department}
                            primary={{
                                label: 'Ponctualité',
                                value: `${Math.round(champions.mostPunctual.m.punctualityRate * 100)} %`,
                            }}
                            details={[
                                { label: 'Jours à l\'heure', value: `${champions.mostPunctual.m.onTimeWorkdays} / ${champions.mostPunctual.m.presentWorkdays}` },
                                { label: 'Retards', value: champions.mostPunctual.m.lateDays },
                                { label: 'Arrivée moyenne', value: fmtHHMM(champions.mostPunctual.m.avgArrivalMin) },
                            ]}
                        />
                    )}
                    {champions.mostDiligent && (
                        <ChampionCard
                            title="Plus assidu"
                            subtitle="Présence sur les jours ouvrés (samedi/dimanche exclus)"
                            icon={Medal01Icon}
                            accent="#22c55e"
                            employeeName={champions.mostDiligent.rec.employeeName}
                            department={champions.mostDiligent.rec.department}
                            primary={{
                                label: 'Assiduité',
                                value: `${Math.round(champions.mostDiligent.m.assiduityRate * 100)} %`,
                            }}
                            details={[
                                { label: 'Jours présents', value: `${champions.mostDiligent.m.presentWorkdays} / ${champions.mostDiligent.m.workdayCount}` },
                                { label: 'Retards', value: champions.mostDiligent.m.lateDays },
                                { label: 'Arrivée moyenne', value: fmtHHMM(champions.mostDiligent.m.avgArrivalMin) },
                            ]}
                        />
                    )}
                </div>
            )}

            {/* Initial months loading */}
            {monthsLoading && (
                <div className="space-y-4">
                    {/* KPI skeletons */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
                                <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
                                <div className="h-7 w-16 bg-gray-200 rounded mb-2" />
                                <div className="h-2.5 w-24 bg-gray-100 rounded" />
                            </div>
                        ))}
                    </div>
                    {/* Table skeleton */}
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
                        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                            <div className="h-4 w-48 bg-gray-200 rounded" />
                            <div className="h-3 w-32 bg-gray-100 rounded" />
                        </div>
                        <div className="p-4 space-y-2">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="h-8 w-40 bg-gray-100 rounded-lg shrink-0" />
                                    <div className="h-8 w-24 bg-gray-100 rounded-lg shrink-0" />
                                    {[...Array(10)].map((_, j) => (
                                        <div key={j} className="h-8 w-10 bg-gray-100 rounded shrink-0" />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Month data loading (month selected but data not yet fetched) */}
            {!monthsLoading && isFetching && !monthData && (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
                    <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                        <div className="h-4 w-52 bg-gray-200 rounded" />
                        <div className="h-3 w-36 bg-gray-100 rounded" />
                        <Loading02Icon size={16} className="animate-spin text-[#33cbcc] ml-auto" />
                    </div>
                    <div className="p-4 space-y-2">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-8 w-40 bg-gray-100 rounded-lg shrink-0" />
                                <div className="h-8 w-24 bg-gray-100 rounded-lg shrink-0" />
                                {[...Array(12)].map((_, j) => (
                                    <div key={j} className="h-8 w-10 bg-gray-100 rounded shrink-0" />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!monthsLoading && months.length === 0 && (
                <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#33cbcc]/10 flex items-center justify-center mx-auto mb-4">
                        <File01Icon size={28} className="text-[#33cbcc]" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">Aucun relevé importé</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                        Importez un fichier <code className="bg-gray-100 px-1.5 py-0.5 rounded">.xls</code>{' '}
                        issu de la pointeuse pour démarrer le suivi des présences mensuelles.
                    </p>
                </div>
            )}

            {/* Attendance grid */}
            {monthData && (
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white border border-gray-100 rounded-2xl overflow-hidden"
                >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <div>
                            <h3 className="text-sm font-bold text-gray-800">
                                Pointages — {monthLabel(monthData.year, monthData.month)}
                            </h3>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                {filteredRecords.length} / {recognizedRecords.length} employés ·{' '}
                                {monthData.records.length - recognizedRecords.length > 0
                                    ? `${monthData.records.length - recognizedRecords.length} non reconnus ignorés · `
                                    : ''}
                                {monthData.daysCount} jours · source :{' '}
                                <span className="font-medium">{monthData.fileName}</span>
                            </p>
                        </div>
                        {isFetching && (
                            <Loading02Icon size={16} className="animate-spin text-[#33cbcc]" />
                        )}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500">
                                    <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-semibold border-b border-gray-100 min-w-[200px]">
                                        Employé
                                    </th>
                                    <th className="px-3 py-2 text-left font-semibold border-b border-gray-100 min-w-[100px]">
                                        Département
                                    </th>
                                    {(recognizedRecords[0]?.days ?? monthData.records[0]?.days ?? []).map(d => {
                                        const weekend = isWeekendDay(monthData.year, monthData.month, d.day);
                                        return (
                                            <th
                                                key={d.day}
                                                className={`px-2 py-2 text-center font-semibold border-b border-gray-100 min-w-[78px] ${weekend ? 'bg-gray-100/70 text-gray-300' : ''}`}
                                                title={weekend ? 'Week-end (non comptabilisé)' : undefined}
                                            >
                                                <div className={`text-[10px] ${weekend ? 'text-gray-300' : 'text-gray-400'}`}>
                                                    {String(d.day).padStart(2, '0')}
                                                </div>
                                                <div className="text-[9px] uppercase text-gray-300">
                                                    {weekdayShort(monthData.year, monthData.month, d.day)}
                                                </div>
                                            </th>
                                        );
                                    })}
                                    <th className="px-3 py-2 text-center font-semibold border-b border-gray-100 min-w-[70px]">
                                        Présent
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold border-b border-gray-100 min-w-[70px]">
                                        Absent
                                    </th>
                                    <th className="px-3 py-2 text-center font-semibold border-b border-gray-100 min-w-[70px]">
                                        Retards
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((rec) => (
                                    <EmployeeRow
                                        key={rec.id}
                                        rec={rec}
                                        year={monthData.year}
                                        month={monthData.month}
                                        metrics={metricsByEmployee.get(rec.id)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredRecords.length === 0 && (
                        <div className="py-10 text-center text-sm text-gray-400">
                            Aucun employé ne correspond à votre recherche
                        </div>
                    )}
                </motion.div>
            )}
        </div>
    );
};

/* ─── Row component ─────────────────────────────────────────────────────── */

const EmployeeRow = ({
    rec,
    year,
    month,
    metrics,
}: {
    rec: AttendanceRecord;
    year: number;
    month: number;
    metrics?: EmployeeMetrics;
}) => (
    <tr className="hover:bg-gray-50/60">
        <td className="sticky left-0 bg-white hover:bg-gray-50/60 px-3 py-2 border-b border-gray-50 font-medium text-gray-800">
            {rec.employeeName}
        </td>
        <td className="px-3 py-2 border-b border-gray-50 text-gray-500">
            {rec.department ?? '—'}
        </td>
        {rec.days.map((d) => {
            const weekend = isWeekendDay(year, month, d.day);
            const late = !weekend && isCellLate(d.pairs);
            return (
                <td
                    key={d.day}
                    className={`px-2 py-1.5 border-b border-gray-50 text-center align-top ${weekend ? 'bg-gray-50/70' : ''}`}
                >
                    <DayCell pairs={d.pairs} weekend={weekend} late={late} />
                </td>
            );
        })}
        <td className="px-3 py-2 border-b border-gray-50 text-center font-semibold text-[#22c55e]">
            {metrics?.presentWorkdays ?? rec.presentDays}
        </td>
        <td className="px-3 py-2 border-b border-gray-50 text-center font-semibold text-[#ef4444]">
            {metrics ? metrics.workdayCount - metrics.presentWorkdays : rec.absentDays}
        </td>
        <td className="px-3 py-2 border-b border-gray-50 text-center font-semibold text-[#f59e0b]">
            {metrics?.lateDays ?? 0}
        </td>
    </tr>
);

const DayCell = ({
    pairs,
    weekend,
    late,
}: {
    pairs: { sw: string | null; ew: string | null }[];
    weekend?: boolean;
    late?: boolean;
}) => {
    const present = pairs.some(p => p.sw || p.ew);
    if (!present) {
        return <span className={weekend ? 'text-gray-300' : 'text-gray-300'}>—</span>;
    }
    return (
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-medium leading-tight">
            {pairs
                .filter(p => p.sw || p.ew)
                .map((p, i) => {
                    const swMin = parseHHMM(p.sw);
                    const swLate = i === 0 && !weekend && swMin != null && swMin > LATE_THRESHOLD_MIN;
                    return (
                        <div key={i} className="flex items-center gap-1 text-gray-700">
                            <Clock01Icon size={9} className={swLate ? 'text-[#f59e0b]' : 'text-[#33cbcc]'} />
                            <span className={swLate ? 'text-[#f59e0b] font-semibold' : ''}>
                                {p.sw ?? '--:--'}
                            </span>
                            <span className="text-gray-300">›</span>
                            <span>{p.ew ?? '--:--'}</span>
                        </div>
                    );
                })}
            {late && (
                <span className="mt-0.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-[#f59e0b]/15 text-[#f59e0b] text-[8px] font-bold uppercase tracking-wide">
                    Retard
                </span>
            )}
        </div>
    );
};

const ChampionCard = ({
    title,
    subtitle,
    icon: Icon,
    accent,
    employeeName,
    department,
    primary,
    details,
}: {
    title: string;
    subtitle: string;
    icon: any;
    accent: string;
    employeeName: string;
    department: string | null;
    primary: { label: string; value: string };
    details: { label: string; value: number | string }[];
}) => {
    const initials = employeeName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(s => s[0]?.toUpperCase())
        .join('');
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-[#e5e8ef] rounded-2xl overflow-hidden"
        >
            <div className="px-5 py-3 flex items-center gap-2" style={{ backgroundColor: accent }}>
                <Icon size={16} className="text-white" />
                <div>
                    <p className="text-[11px] font-bold text-white/90 uppercase tracking-wide">{title}</p>
                    <p className="text-[10px] text-white/70">{subtitle}</p>
                </div>
            </div>
            <div className="p-5 flex items-center gap-4">
                <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0"
                    style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                    {initials || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-[#1c2b3a] truncate">{employeeName}</p>
                    <p className="text-xs text-gray-500 truncate">{department ?? '—'}</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-2xl font-bold" style={{ color: accent }}>
                        {primary.value}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                        {primary.label}
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-3 border-t border-gray-100">
                {details.map((d, i) => (
                    <div
                        key={d.label}
                        className={`px-4 py-3 text-center ${i > 0 ? 'border-l border-gray-100' : ''}`}
                    >
                        <p className="text-sm font-bold text-gray-800">{d.value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{d.label}</p>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};

const weekdayShort = (year: number, month: number, day: number) => {
    const d = new Date(year, month - 1, day);
    return ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][d.getDay()];
};

export default Attendance;
