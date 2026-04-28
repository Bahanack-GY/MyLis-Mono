import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { File01Icon, Download01Icon, Delete02Icon, Loading02Icon, Tick01Icon, CancelCircleIcon, Clock01Icon, Add01Icon, ArrowDown01Icon, ArrowUp01Icon, Search01Icon, Cancel01Icon, ArrowUpRight01Icon } from 'hugeicons-react';
import { useReports, useGenerateReport, useDeleteReport, useReportLockStatus } from '../../api/reports/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { exportReportPdf, loadReportLogoBase64 } from '../../utils/exportReportPdf';
import logoSrc from '../../assets/logo-lis.png';
import type { Report, ReportPeriod } from '../../api/reports/types';

/* ── Date helpers ────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, '0');
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function getPeriodDates(period: ReportPeriod): { startDate: string; endDate: string } {
    const now = new Date();
    switch (period) {
        case 'DAY':
            return { startDate: toDate(now), endDate: toDate(now) };
        case 'WEEK': {
            const dow = now.getDay();
            const diffToMonday = dow === 0 ? -6 : 1 - dow;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { startDate: toDate(monday), endDate: toDate(sunday) };
        }
        case 'MONTH': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { startDate: toDate(start), endDate: toDate(end) };
        }
        default:
            return { startDate: toDate(now), endDate: toDate(now) };
    }
}

/* ── Design constants ────────────────────────────────────── */

const INPUT = 'bg-[#f8f9fc] border border-[#e5e8ef] px-3 py-2 text-xs text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] transition-colors';
const SELECT = `${INPUT} appearance-none cursor-pointer`;
const LABEL = 'block text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1.5';
const TOGGLE_BASE = 'px-4 py-2 text-xs font-semibold border transition-colors';
const TOGGLE_ON = `${TOGGLE_BASE} bg-[#283852] text-white border-[#283852]`;
const TOGGLE_OFF = `${TOGGLE_BASE} bg-white text-[#8892a4] border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852]`;

/* ── Status badge ────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    if (status === 'COMPLETED') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#33cbcc]">
                <Tick01Icon size={11} />
                {t('reports.status.completed')}
            </span>
        );
    }
    if (status === 'GENERATING') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#283852]">
                <Loading02Icon size={11} className="animate-spin" />
                {t('reports.status.generating')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#b0bac9]">
            <CancelCircleIcon size={11} />
            {t('reports.status.failed')}
        </span>
    );
}

/* ── Stat card ───────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color = '#283852' }: { label: string; value: number | string; icon: any; color?: string }) {
    const v = String(value);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-[#33cbcc]/50">
            <div className="px-5 py-3" style={{ backgroundColor: color }}>
                <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{label}</h3>
            </div>
            <div className="p-5 bg-white relative overflow-hidden">
                <h2 className={`font-bold text-[#1c2b3a] truncate leading-tight ${v.length > 10 ? 'text-xl' : 'text-4xl'}`}>
                    {v}
                </h2>
                <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color }}>
                    <Icon size={110} strokeWidth={1.2} />
                </div>
            </div>
        </div>
    );
}

/* ── Report card ─────────────────────────────────────────── */

const STATUS_ACCENT: Record<string, string> = {
    COMPLETED: '#33cbcc',
    GENERATING: '#283852',
    FAILED: '#b0bac9',
};

function ReportCard({ report, onDelete, onExport }: {
    report: Report;
    onDelete: (id: string) => void;
    onExport: (report: Report) => void;
}) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    const data = report.reportData;

    const period = {
        DAY: t('reports.period.day'),
        WEEK: t('reports.period.week'),
        MONTH: t('reports.period.month'),
        CUSTOM: t('reports.period.custom'),
    }[report.period] || report.period;

    const completionRate = data?.summary?.completionRate ?? 0;
    const accentColor = STATUS_ACCENT[report.status] ?? '#b0bac9';

    return (
        <div className="bg-white border border-[#e5e8ef] overflow-hidden">
            <div className="h-0.5" style={{ backgroundColor: accentColor }} />

            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[#1c2b3a] text-sm">{report.title}</span>
                            <StatusBadge status={report.status} />
                        </div>

                        <div className="text-xs text-[#8892a4] flex items-center gap-2 flex-wrap">
                            <span>{period}</span>
                            <span>·</span>
                            <span>{report.startDate} → {report.endDate}</span>
                        </div>

                        {report.status === 'GENERATING' && (
                            <div className="mt-3">
                                <div className="h-1 bg-[#f0f2f5] overflow-hidden">
                                    <div
                                        className="h-full bg-[#283852]"
                                        style={{ width: '40%', animation: 'indeterminate 1.4s ease-in-out infinite' }}
                                    />
                                </div>
                            </div>
                        )}

                        {report.status === 'COMPLETED' && data?.summary && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-[#8892a4]">
                                        {data.summary.completed + data.summary.reviewed}/{data.summary.total} {t('reports.pdf.done')}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#1c2b3a]">{completionRate}%</span>
                                </div>
                                <div className="h-1 bg-[#f0f2f5] overflow-hidden">
                                    <div
                                        className="h-full bg-[#33cbcc] transition-all duration-500"
                                        style={{ width: `${completionRate}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {data && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="p-1.5 text-[#8892a4] hover:text-[#1c2b3a] hover:bg-[#f8f9fc] transition-colors"
                            >
                                {expanded ? <ArrowUp01Icon size={15} /> : <ArrowDown01Icon size={15} />}
                            </button>
                        )}
                        {report.status === 'COMPLETED' && (
                            <button
                                onClick={() => onExport(report)}
                                className="p-1.5 text-[#8892a4] hover:text-[#1c2b3a] hover:bg-[#f8f9fc] transition-colors"
                                title={t('reports.export')}
                            >
                                <Download01Icon size={15} />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(report.id)}
                            className="p-1.5 text-[#8892a4] hover:text-[#e05e5e] hover:bg-[#e05e5e]/5 transition-colors"
                        >
                            <Delete02Icon size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {expanded && data && (
                <div className="border-t border-[#e5e8ef] px-5 py-4 bg-[#f8f9fc]">
                    {/* Mosaic mini-stat grid */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-px bg-[#e5e8ef] mb-4 border border-[#e5e8ef]">
                        {[
                            { label: t('reports.pdf.totalTasks'), value: data.summary.total },
                            { label: t('reports.pdf.completed'), value: data.summary.completed + data.summary.reviewed },
                            { label: t('reports.pdf.inProgress'), value: data.summary.inProgress },
                            { label: t('reports.pdf.blocked'), value: data.summary.blocked },
                            { label: t('reports.pdf.completionRate'), value: `${data.summary.completionRate}%` },
                        ].map(s => (
                            <div key={s.label} className="bg-white p-3 text-center">
                                <p className="text-[10px] text-[#8892a4] uppercase tracking-widest leading-tight mb-1">{s.label}</p>
                                <p className="text-sm font-bold text-[#1c2b3a]">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {data.tasks && data.tasks.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-2">{t('reports.pdf.taskList')}</p>
                            <div className="divide-y divide-[#e5e8ef] border border-[#e5e8ef]">
                                {data.tasks.slice(0, 5).map((task: any) => (
                                    <div key={task.id} className="flex items-center gap-2.5 text-xs text-[#1c2b3a] bg-white px-3 py-2">
                                        <span className="w-1.5 h-1.5 bg-[#283852]/25 shrink-0" />
                                        <span className="truncate flex-1">{task.title}</span>
                                        <span className="text-[#8892a4] shrink-0 font-mono text-[10px]">{task.dueDate || '-'}</span>
                                    </div>
                                ))}
                            </div>
                            {data.tasks.length > 5 && (
                                <p className="text-xs text-[#8892a4] mt-2 pl-1">+{data.tasks.length - 5} {t('reports.moreTasks')}</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────── */

export default function EmployeeReports() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();

    const { data: reports = [], isLoading } = useReports();
    const { data: lockData } = useReportLockStatus();
    const generateReport = useGenerateReport();
    const deleteReport = useDeleteReport();

    const isLocked = lockData?.locked || generateReport.isPending;

    const [showForm, setShowForm] = useState(false);
    const [period, setPeriod] = useState<ReportPeriod>('WEEK');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [language, setLanguage] = useState<'fr' | 'en'>(i18n.language.startsWith('fr') ? 'fr' : 'en');

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');

    const hasFilters = search || filterStatus || filterFrom || filterTo;

    const clearFilters = () => {
        setSearch('');
        setFilterStatus('');
        setFilterFrom('');
        setFilterTo('');
    };

    const stats = useMemo(() => {
        const all = reports as Report[];
        const completed = all.filter(r => r.status === 'COMPLETED');
        const avgRate = completed.length
            ? Math.round(completed.reduce((sum, r) => sum + (r.reportData?.summary?.completionRate ?? 0), 0) / completed.length)
            : 0;
        return {
            total: all.length,
            completed: completed.length,
            generating: all.filter(r => r.status === 'GENERATING').length,
            avgRate,
        };
    }, [reports]);

    const filteredReports = useMemo(() => {
        return (reports as Report[]).filter(r => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterFrom && r.startDate < filterFrom) return false;
            if (filterTo && r.endDate > filterTo) return false;
            if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
            return true;
        });
    }, [reports, search, filterStatus, filterFrom, filterTo]);

    const handleGenerate = () => {
        const dates = period === 'CUSTOM'
            ? { startDate: customStart, endDate: customEnd }
            : getPeriodDates(period);

        const isCustomValid = period !== 'CUSTOM' || (customStart && customEnd);
        if (!isCustomValid) return;

        generateReport.mutate(
            { type: 'PERSONAL', period, ...dates, language },
            { onSuccess: () => setShowForm(false) },
        );
    };

    const handleExport = async (report: Report) => {
        try {
            const logo = await loadReportLogoBase64(logoSrc).catch(() => undefined);
            exportReportPdf(report, logo);
        } catch {}
    };

    const handleDelete = (id: string) => {
        if (confirm(t('reports.deleteConfirm'))) {
            deleteReport.mutate(id);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold text-[#33cbcc] uppercase tracking-widest mb-0.5">
                        {t('reports.subtitleEmployee')}
                    </p>
                    <h1 className="text-xl font-bold text-[#1c2b3a]">{t('reports.title')}</h1>
                </div>

                <button
                    onClick={() => setShowForm(v => !v)}
                    disabled={isLocked}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#283852] text-white text-xs font-semibold hover:bg-[#1e2d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Add01Icon size={14} />
                    {t('reports.generate')}
                </button>
            </div>

            {/* ── Stat cards ── */}
            {!isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatCard label={t('reports.stats.total')}      value={stats.total}          icon={File01Icon}         color="#283852" />
                    <StatCard label={t('reports.stats.completed')}  value={stats.completed}       icon={Tick01Icon}         color="#33cbcc" />
                    <StatCard label={t('reports.stats.generating')} value={stats.generating}      icon={Loading02Icon}      color="#283852" />
                    <StatCard label={t('reports.stats.avgRate')}    value={`${stats.avgRate}%`}   icon={ArrowUpRight01Icon} color="#283852" />
                </div>
            )}

            {/* ── Lock warning ── */}
            {isLocked && !generateReport.isPending && (
                <div className="flex items-center gap-2 px-4 py-3 border border-[#e5e8ef] text-[#1c2b3a] text-xs">
                    <Clock01Icon size={14} className="text-[#8892a4]" />
                    {t('reports.lockWarning')}
                </div>
            )}

            {/* ── Generation progress ── */}
            {generateReport.isPending && (
                <div className="bg-white border border-[#e5e8ef] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Loading02Icon size={14} className="animate-spin text-[#283852]" />
                        <span className="text-xs font-medium text-[#1c2b3a]">{t('reports.generating')}</span>
                    </div>
                    <div className="h-1 bg-[#f0f2f5] overflow-hidden">
                        <div
                            className="h-full bg-[#283852]"
                            style={{ width: '60%', animation: 'indeterminate 1.4s ease-in-out infinite' }}
                        />
                    </div>
                    <style>{`
                        @keyframes indeterminate {
                            0%   { transform: translateX(-100%); width: 50%; }
                            50%  { width: 70%; }
                            100% { transform: translateX(250%); width: 50%; }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Generation form ── */}
            {showForm && !generateReport.isPending && (
                <div className="bg-white border border-[#e5e8ef] p-5 space-y-5">
                    <h2 className="font-semibold text-[#1c2b3a] text-sm">{t('reports.newReport')}</h2>

                    {/* Period */}
                    <div>
                        <label className={LABEL}>{t('reports.form.period')}</label>
                        <div className="flex gap-px bg-[#e5e8ef]">
                            {(['DAY', 'WEEK', 'MONTH', 'CUSTOM'] as ReportPeriod[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={period === p ? TOGGLE_ON : TOGGLE_OFF}
                                >
                                    {t(`reports.period.${p.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom date range */}
                    {period === 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL}>{t('reports.form.startDate')}</label>
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    className={`w-full ${INPUT}`}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>{t('reports.form.endDate')}</label>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    className={`w-full ${INPUT}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Language */}
                    <div>
                        <label className={LABEL}>Langue du rapport</label>
                        <div className="flex gap-px bg-[#e5e8ef]">
                            {(['fr', 'en'] as const).map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={language === lang ? TOGGLE_ON : TOGGLE_OFF}
                                >
                                    {lang === 'fr' ? 'Français' : 'English'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end items-center gap-3 pt-1">
                        <button
                            onClick={() => setShowForm(false)}
                            className="text-xs text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isLocked || generateReport.isPending || (period === 'CUSTOM' && (!customStart || !customEnd))}
                            className="flex items-center gap-2 px-4 py-2 bg-[#283852] text-white text-xs font-semibold hover:bg-[#1e2d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generateReport.isPending && <Loading02Icon size={13} className="animate-spin" />}
                            {t('reports.generate')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Filter bar ── */}
            {!isLoading && (reports as Report[]).length > 0 && (
                <div className="bg-white border border-[#e5e8ef] p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search01Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0bac9]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('reports.filters.searchPlaceholder')}
                                className={`w-full pl-8 pr-3 ${INPUT}`}
                            />
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
                            >
                                <Cancel01Icon size={12} />
                                {t('reports.filters.clear')}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className={SELECT}
                        >
                            <option value="">{t('reports.filters.allStatuses')}</option>
                            <option value="COMPLETED">{t('reports.status.completed')}</option>
                            <option value="GENERATING">{t('reports.status.generating')}</option>
                            <option value="FAILED">{t('reports.status.failed')}</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                            <input
                                type="date"
                                value={filterFrom}
                                onChange={e => setFilterFrom(e.target.value)}
                                className={INPUT}
                            />
                            <span className="text-[#b0bac9] text-xs">—</span>
                            <input
                                type="date"
                                value={filterTo}
                                onChange={e => setFilterTo(e.target.value)}
                                className={INPUT}
                            />
                        </div>
                    </div>

                    {hasFilters && (
                        <p className="text-xs text-[#8892a4]">
                            {t('reports.filters.results', { count: filteredReports.length, total: (reports as Report[]).length })}
                        </p>
                    )}
                </div>
            )}

            {/* ── Reports list ── */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loading02Icon size={28} className="animate-spin text-[#283852]" />
                </div>
            ) : (reports as Report[]).length === 0 ? (
                <div className="text-center py-16 text-[#b0bac9]">
                    <File01Icon size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-sm text-[#8892a4]">{t('reports.empty')}</p>
                    <p className="text-xs mt-1">{t('reports.emptyHint')}</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="text-center py-12 text-[#b0bac9]">
                    <Search01Icon size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-sm text-[#8892a4]">{t('reports.filters.noResults')}</p>
                </div>
            ) : (
                <div className="space-y-px bg-[#e5e8ef]">
                    {filteredReports.map((report: Report) => (
                        <ReportCard
                            key={report.id}
                            report={report}
                            onDelete={handleDelete}
                            onExport={handleExport}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
