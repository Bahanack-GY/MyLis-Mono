import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileBarChart,
    Download,
    Trash2,
    Loader2,
    CheckCircle,
    XCircle,
    Clock,
    Plus,
    ChevronDown,
    ChevronUp,
    Search,
    X,
    TrendingUp,
} from 'lucide-react';
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

/* ── Status badge (no background) ───────────────────────── */

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    if (status === 'COMPLETED') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#33cbcc]">
                <CheckCircle size={11} />
                {t('reports.status.completed')}
            </span>
        );
    }
    if (status === 'GENERATING') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-[#283852]">
                <Loader2 size={11} className="animate-spin" />
                {t('reports.status.generating')}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
            <XCircle size={11} />
            {t('reports.status.failed')}
        </span>
    );
}

/* ── Stat card ───────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: any }) {
    return (
        <div className="bg-white rounded-2xl p-5 relative overflow-hidden border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            <div className="absolute -right-3 -bottom-3 text-[#283852]/5 pointer-events-none">
                <Icon size={80} strokeWidth={1} />
            </div>
        </div>
    );
}

/* ── Report card ─────────────────────────────────────────── */

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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[#283852] text-sm">{report.title}</span>
                            <StatusBadge status={report.status} />
                        </div>

                        <div className="text-xs text-gray-400 flex items-center gap-2 flex-wrap">
                            <span>{period}</span>
                            <span>·</span>
                            <span>{report.startDate} → {report.endDate}</span>
                        </div>

                        {/* Progress bar for GENERATING */}
                        {report.status === 'GENERATING' && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-[#283852] font-medium">{t('reports.status.generating')}…</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#283852] rounded-full"
                                        style={{
                                            width: '40%',
                                            animation: 'indeterminate 1.4s ease-in-out infinite',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Completion rate bar for COMPLETED */}
                        {report.status === 'COMPLETED' && data?.summary && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-gray-400">
                                        {data.summary.completed + data.summary.reviewed}/{data.summary.total} {t('reports.pdf.done')}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#283852]">{completionRate}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#283852] rounded-full transition-all duration-500"
                                        style={{ width: `${completionRate}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {data && (
                            <button
                                onClick={() => setExpanded(v => !v)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-gray-50 transition-colors"
                            >
                                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                        )}
                        {report.status === 'COMPLETED' && (
                            <button
                                onClick={() => onExport(report)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-gray-50 transition-colors"
                                title={t('reports.export')}
                            >
                                <Download size={15} />
                            </button>
                        )}
                        <button
                            onClick={() => onDelete(report.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && data && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/60">
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                        {[
                            { label: t('reports.pdf.totalTasks'), value: data.summary.total },
                            { label: t('reports.pdf.completed'), value: data.summary.completed + data.summary.reviewed },
                            { label: t('reports.pdf.inProgress'), value: data.summary.inProgress },
                            { label: t('reports.pdf.blocked'), value: data.summary.blocked },
                            { label: t('reports.pdf.completionRate'), value: `${data.summary.completionRate}%` },
                        ].map(s => (
                            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-tight mb-1">{s.label}</p>
                                <p className="text-sm font-bold text-[#283852]">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {data.tasks && data.tasks.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('reports.pdf.taskList')}</p>
                            {data.tasks.slice(0, 5).map((task: any) => (
                                <div key={task.id} className="flex items-center gap-2.5 text-xs text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#283852]/30 shrink-0" />
                                    <span className="truncate flex-1">{task.title}</span>
                                    <span className="text-gray-400 shrink-0 font-mono">{task.dueDate || '-'}</span>
                                </div>
                            ))}
                            {data.tasks.length > 5 && (
                                <p className="text-xs text-gray-400 pl-2">+{data.tasks.length - 5} {t('reports.moreTasks')}</p>
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

    /* ── Filter state ── */
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

    /* ── Stats ── */
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

    const inputCls = 'text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#283852]/20 focus:border-[#283852] bg-white';

    return (
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#283852] flex items-center justify-center">
                        <FileBarChart size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#283852]">{t('reports.title')}</h1>
                        <p className="text-sm text-gray-400">{t('reports.subtitleEmployee')}</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(v => !v)}
                    disabled={isLocked}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#283852] text-white rounded-xl text-sm font-semibold hover:bg-[#1e2d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus size={15} />
                    {t('reports.generate')}
                </button>
            </div>

            {/* ── Stat cards ── */}
            {!isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label={t('reports.stats.total')} value={stats.total} icon={FileBarChart} />
                    <StatCard label={t('reports.stats.completed')} value={stats.completed} icon={CheckCircle} />
                    <StatCard label={t('reports.stats.generating')} value={stats.generating} icon={Loader2} />
                    <StatCard label={t('reports.stats.avgRate')} value={`${stats.avgRate}%`} icon={TrendingUp} />
                </div>
            )}

            {/* ── Lock warning ── */}
            {isLocked && !generateReport.isPending && (
                <div className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-xl text-[#283852] text-sm">
                    <Clock size={16} />
                    {t('reports.lockWarning')}
                </div>
            )}

            {/* ── Generation progress bar ── */}
            {generateReport.isPending && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Loader2 size={16} className="animate-spin text-[#283852]" />
                        <span className="text-sm font-medium text-[#283852]">{t('reports.generating')}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#283852] rounded-full"
                            style={{
                                width: '60%',
                                animation: 'indeterminate 1.4s ease-in-out infinite',
                            }}
                        />
                    </div>
                    <style>{`
                        @keyframes indeterminate {
                            0% { transform: translateX(-100%); width: 50%; }
                            50% { width: 70%; }
                            100% { transform: translateX(250%); width: 50%; }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Generation form ── */}
            {showForm && !generateReport.isPending && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
                    <h2 className="font-semibold text-[#283852] text-sm">{t('reports.newReport')}</h2>

                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-2 block">{t('reports.form.period')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {(['DAY', 'WEEK', 'MONTH', 'CUSTOM'] as ReportPeriod[]).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPeriod(p)}
                                    className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${
                                        period === p
                                            ? 'bg-[#283852] text-white border-[#283852]'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#283852]'
                                    }`}
                                >
                                    {t(`reports.period.${p.toLowerCase()}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {period === 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{t('reports.form.startDate')}</label>
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={e => setCustomStart(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20 focus:border-[#283852]"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-600 mb-1 block">{t('reports.form.endDate')}</label>
                                <input
                                    type="date"
                                    value={customEnd}
                                    onChange={e => setCustomEnd(e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20 focus:border-[#283852]"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">Langue du rapport</label>
                        <div className="flex gap-2">
                            {(['fr', 'en'] as const).map(lang => (
                                <button
                                    key={lang}
                                    onClick={() => setLanguage(lang)}
                                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                                        language === lang
                                            ? 'bg-[#283852] text-white border-[#283852]'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#283852]'
                                    }`}
                                >
                                    {lang === 'fr' ? 'Français' : 'English'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={isLocked || generateReport.isPending || (period === 'CUSTOM' && (!customStart || !customEnd))}
                            className="flex items-center gap-2 px-4 py-2 bg-[#283852] text-white rounded-xl text-sm font-medium hover:bg-[#1e2d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {generateReport.isPending && <Loader2 size={14} className="animate-spin" />}
                            {t('reports.generate')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Filter bar ── */}
            {!isLoading && (reports as Report[]).length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('reports.filters.searchPlaceholder')}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#283852]/20 focus:border-[#283852]"
                            />
                        </div>
                        {hasFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                <X size={13} />
                                {t('reports.filters.clear')}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className={inputCls}
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
                                className={inputCls}
                            />
                            <span className="text-gray-400 text-xs">—</span>
                            <input
                                type="date"
                                value={filterTo}
                                onChange={e => setFilterTo(e.target.value)}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {hasFilters && (
                        <p className="text-xs text-gray-400">
                            {t('reports.filters.results', { count: filteredReports.length, total: (reports as Report[]).length })}
                        </p>
                    )}
                </div>
            )}

            {/* ── Reports list ── */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 size={28} className="animate-spin text-[#283852]" />
                </div>
            ) : (reports as Report[]).length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <FileBarChart size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">{t('reports.empty')}</p>
                    <p className="text-sm mt-1">{t('reports.emptyHint')}</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <Search size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-sm">{t('reports.filters.noResults')}</p>
                </div>
            ) : (
                <div className="space-y-3">
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
