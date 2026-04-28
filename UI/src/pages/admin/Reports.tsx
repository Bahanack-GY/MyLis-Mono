import { useState, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { File01Icon, Add01Icon, Download01Icon, Delete02Icon, Loading02Icon, Tick01Icon, CancelCircleIcon, Clock01Icon, Alert01Icon, Search01Icon, Cancel01Icon, ArrowDown01Icon, ArrowUp01Icon, ArrowUpRight01Icon, UserGroupIcon, BarChartIcon } from 'hugeicons-react';
import { useInfiniteReports, useGenerateReport, useDeleteReport, useReportLockStatus } from '../../api/reports/hooks';
import { useEmployees } from '../../api/employees/hooks';
import { useDepartments } from '../../api/departments/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { exportReportPdf, loadReportLogoBase64 } from '../../utils/exportReportPdf';
import logoSrc from '../../assets/logo-lis.png';
import type { Report, ReportPeriod, ReportType } from '../../api/reports/types';

/* ── Date helpers ─────────────────────────────────────────── */

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

/* ── Status badge ────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
    const { t } = useTranslation();
    if (status === 'COMPLETED') return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#33cbcc]">
            <Tick01Icon size={11} />{t('reports.status.completed')}
        </span>
    );
    if (status === 'GENERATING') return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#283852]">
            <Loading02Icon size={11} className="animate-spin" />{t('reports.status.generating')}
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#b0bac9]">
            <CancelCircleIcon size={11} />{t('reports.status.failed')}
        </span>
    );
}

/* ── Stat card ───────────────────────────────────────────── */

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
    const v = String(value);
    return (
        <div className="border border-gray-100 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-[#33cbcc]/50">
            <div className="px-5 py-3" style={{ backgroundColor: color }}>
                <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{label}</h3>
            </div>
            <div className="p-5 bg-white relative overflow-hidden">
                <h2 className={`font-bold text-[#1c2b3a] truncate leading-tight ${v.length > 10 ? 'text-xl' : 'text-4xl'}`}>{v}</h2>
                <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color }}>
                    <Icon size={110} strokeWidth={1.2} />
                </div>
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

    const target = report.type === 'PERSONAL'
        ? report.targetEmployee
            ? `${report.targetEmployee.firstName} ${report.targetEmployee.lastName}`
            : '-'
        : report.targetDepartment?.name || '-';

    const period = {
        DAY: t('reports.period.day'),
        WEEK: t('reports.period.week'),
        MONTH: t('reports.period.month'),
        CUSTOM: t('reports.period.custom'),
    }[report.period] || report.period;

    const completionRate = data?.summary?.completionRate ?? 0;

    return (
        <div className="bg-white border border-[#e5e8ef] overflow-hidden">
            {/* Status accent line */}
            <div className="h-0.5 w-full" style={{
                backgroundColor: report.status === 'COMPLETED' ? '#33cbcc' : report.status === 'GENERATING' ? '#283852' : '#b0bac9'
            }} />

            <div className="px-5 py-4">
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[#1c2b3a] text-sm">{report.title}</span>
                            <StatusBadge status={report.status} />
                            <span className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest bg-[#f8f9fc] border border-[#e5e8ef] px-1.5 py-0.5">
                                {report.type === 'PERSONAL' ? t('reports.type.personal') : t('reports.type.department')}
                            </span>
                        </div>

                        <div className="text-xs text-[#b0bac9] flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[#8892a4]">{target}</span>
                            <span>·</span>
                            <span>{period}</span>
                            <span>·</span>
                            <span>{report.startDate} → {report.endDate}</span>
                        </div>

                        {report.status === 'GENERATING' && (
                            <div className="mt-3">
                                <span className="text-[10px] text-[#283852] font-medium block mb-1">{t('reports.status.generating')}…</span>
                                <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                                    <div className="h-full bg-[#33cbcc]" style={{ width: '40%', animation: 'indeterminate 1.4s ease-in-out infinite' }} />
                                </div>
                            </div>
                        )}

                        {report.status === 'COMPLETED' && data?.summary && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-[#b0bac9]">
                                        {data.summary.completed + data.summary.reviewed}/{data.summary.total} {t('reports.pdf.done')}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#283852]">{completionRate}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                                    <div className="h-full bg-[#283852] transition-all duration-500" style={{ width: `${completionRate}%` }} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                        {data && (
                            <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-[#b0bac9] hover:text-[#283852] transition-colors">
                                {expanded ? <ArrowUp01Icon size={15} /> : <ArrowDown01Icon size={15} />}
                            </button>
                        )}
                        {report.status === 'COMPLETED' && (
                            <button onClick={() => onExport(report)} className="p-1.5 text-[#b0bac9] hover:text-[#283852] transition-colors" title={t('reports.export')}>
                                <Download01Icon size={15} />
                            </button>
                        )}
                        <button onClick={() => onDelete(report.id)} className="p-1.5 text-[#b0bac9] hover:text-[#e05e5e] transition-colors">
                            <Delete02Icon size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && data && (
                <div className="border-t border-[#e5e8ef] px-5 py-4 bg-[#f8f9fc]">
                    <div className="grid grid-cols-5 gap-px bg-[#e5e8ef] mb-4">
                        {[
                            { label: t('reports.pdf.totalTasks'),    value: data.summary.total },
                            { label: t('reports.pdf.completed'),     value: data.summary.completed + data.summary.reviewed },
                            { label: t('reports.pdf.inProgress'),    value: data.summary.inProgress },
                            { label: t('reports.pdf.blocked'),       value: data.summary.blocked },
                            { label: t('reports.pdf.completionRate'), value: `${data.summary.completionRate}%` },
                        ].map(s => (
                            <div key={s.label} className="bg-white px-3 py-2.5 text-center">
                                <p className="text-[10px] text-[#b0bac9] uppercase tracking-widest leading-tight mb-1">{s.label}</p>
                                <p className="text-sm font-bold text-[#283852]">{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {report.type === 'PERSONAL' && data.tasks && data.tasks.length > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-2">{t('reports.pdf.taskList')}</p>
                            <div className="divide-y divide-[#e5e8ef]">
                                {data.tasks.slice(0, 5).map((task: any) => (
                                    <div key={task.id} className="flex items-center gap-2.5 text-xs text-[#8892a4] bg-white px-3 py-2 border border-[#e5e8ef]">
                                        <span className="w-1.5 h-1.5 bg-[#283852]/30 shrink-0" />
                                        <span className="truncate flex-1 text-[#1c2b3a]">{task.title}</span>
                                        <span className="text-[#b0bac9] shrink-0">{task.dueDate || '-'}</span>
                                    </div>
                                ))}
                            </div>
                            {data.tasks.length > 5 && (
                                <p className="text-xs text-[#b0bac9] mt-2">+{data.tasks.length - 5} {t('reports.moreTasks')}</p>
                            )}
                        </div>
                    )}

                    {report.type === 'DEPARTMENT' && data.employees && (
                        <div>
                            <p className="text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-2">{t('reports.pdf.employees')}</p>
                            <div className="divide-y divide-[#e5e8ef]">
                                {data.employees.map((emp: any) => (
                                    <div key={emp.employee.id} className="flex items-center gap-3 bg-white px-3 py-2 border border-[#e5e8ef]">
                                        <span className="text-xs text-[#1c2b3a] flex-1">{emp.employee.firstName} {emp.employee.lastName}</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-20 h-1 bg-[#e5e8ef] overflow-hidden">
                                                <div className="h-full bg-[#283852]" style={{ width: `${emp.summary.completionRate}%` }} />
                                            </div>
                                            <span className="text-[10px] text-[#b0bac9] w-8 text-right">{emp.summary.completionRate}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ── Main page ───────────────────────────────────────────── */

export default function AdminReports() {
    const { t, i18n } = useTranslation();
    const { role, departmentId } = useAuth();
    const isHOD = role === 'HEAD_OF_DEPARTMENT';
    const isManager = role === 'MANAGER';
    const canGenerateDept = isHOD || isManager;

    const reportsQuery = useInfiniteReports();
    const reports: Report[] = reportsQuery.data?.pages.flatMap(p => p.rows) || [];
    const isLoading = reportsQuery.isPending;

    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && reportsQuery.hasNextPage && !reportsQuery.isFetchingNextPage)
                reportsQuery.fetchNextPage();
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [reportsQuery.hasNextPage, reportsQuery.isFetchingNextPage, reportsQuery.fetchNextPage]);

    const { data: lockData } = useReportLockStatus();
    const { data: employees = [] } = useEmployees(isHOD ? departmentId || undefined : undefined);
    const { data: allEmployees = [] } = useEmployees();
    const { data: departments = [] } = useDepartments();

    const generateReport = useGenerateReport();
    const deleteReport = useDeleteReport();
    const isLocked = lockData?.locked || generateReport.isPending;

    /* ── Form state ── */
    const [showForm, setShowForm] = useState(false);
    const [reportType, setReportType] = useState<ReportType>('PERSONAL');
    const [period, setPeriod] = useState<ReportPeriod>('WEEK');
    const [targetEmployeeId, setTargetEmployeeId] = useState('');
    const [targetDepartmentId, setTargetDepartmentId] = useState(isHOD ? (departmentId || '') : '');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [language, setLanguage] = useState<'fr' | 'en'>(i18n.language.startsWith('fr') ? 'fr' : 'en');

    /* ── Filter state ── */
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const hasFilters = search || filterStatus || filterType || filterDepartment || filterEmployee || filterFrom || filterTo;
    const clearFilters = () => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterDepartment(''); setFilterEmployee(''); setFilterFrom(''); setFilterTo(''); };

    /* ── Stats ── */
    const stats = useMemo(() => {
        const completed = reports.filter(r => r.status === 'COMPLETED');
        const avgRate = completed.length
            ? Math.round(completed.reduce((sum, r) => sum + (r.reportData?.summary?.completionRate ?? 0), 0) / completed.length)
            : 0;
        return {
            total: reports.length,
            completed: completed.length,
            generating: reports.filter(r => r.status === 'GENERATING').length,
            failed: reports.filter(r => r.status === 'FAILED').length,
            avgRate,
        };
    }, [reports]);

    const handleGenerate = () => {
        const dates = period === 'CUSTOM' ? { startDate: customStart, endDate: customEnd } : getPeriodDates(period);
        const dto: any = { type: reportType, period, ...dates, language };
        if (reportType === 'PERSONAL' && targetEmployeeId) dto.targetEmployeeId = targetEmployeeId;
        if (reportType === 'DEPARTMENT') dto.targetDepartmentId = targetDepartmentId || departmentId;
        generateReport.mutate(dto, { onSuccess: () => { setShowForm(false); setTargetEmployeeId(''); } });
    };

    const handleExport = async (report: Report) => {
        try { const logo = await loadReportLogoBase64(logoSrc).catch(() => undefined); exportReportPdf(report, logo); } catch {}
    };

    const handleDelete = (id: string) => {
        if (confirm(t('reports.deleteConfirm'))) deleteReport.mutate(id);
    };

    const formValid = useMemo(() => {
        if (period === 'CUSTOM' && (!customStart || !customEnd)) return false;
        if (reportType === 'PERSONAL' && !targetEmployeeId && !isHOD) return false;
        return true;
    }, [period, customStart, customEnd, reportType, targetEmployeeId, isHOD]);

    const filteredReports = useMemo(() => {
        return reports.filter(r => {
            if (filterStatus && r.status !== filterStatus) return false;
            if (filterType && r.type !== filterType) return false;
            if (filterDepartment && r.targetDepartment?.id !== filterDepartment) return false;
            if (filterEmployee && r.targetEmployee?.id !== filterEmployee) return false;
            if (filterFrom && r.startDate < filterFrom) return false;
            if (filterTo && r.endDate > filterTo) return false;
            if (search) {
                const q = search.toLowerCase();
                const empName = r.targetEmployee ? `${r.targetEmployee.firstName} ${r.targetEmployee.lastName}`.toLowerCase() : '';
                if (!r.title.toLowerCase().includes(q) && !empName.includes(q) && !(r.targetDepartment?.name?.toLowerCase() || '').includes(q)) return false;
            }
            return true;
        });
    }, [reports, search, filterStatus, filterType, filterDepartment, filterEmployee, filterFrom, filterTo]);

    const INPUT = 'bg-[#f8f9fc] border border-[#e5e8ef] px-3 py-2 text-xs text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] transition-colors';
    const SELECT = `${INPUT} appearance-none cursor-pointer`;
    const LABEL = 'block text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1.5';
    const TOGGLE_BASE = 'px-3 py-2 border text-xs font-semibold transition-colors';
    const TOGGLE_ON = `${TOGGLE_BASE} bg-[#283852] text-white border-[#283852]`;
    const TOGGLE_OFF = `${TOGGLE_BASE} bg-white text-[#8892a4] border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852]`;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-1">
                        {t('reports.subtitle')}
                    </p>
                    <h1 className="text-2xl font-bold text-[#1c2b3a]">{t('reports.title')}</h1>
                </div>
                <button
                    onClick={() => setShowForm(v => !v)}
                    disabled={isLocked}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#283852] text-white text-sm font-semibold hover:bg-[#1e2d42] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Add01Icon size={15} />
                    {t('reports.generate')}
                </button>
            </div>

            {/* Stat cards */}
            {!isLoading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatCard label={t('reports.stats.total')}     value={stats.total}          icon={File01Icon}        color="#283852" />
                    <StatCard label={t('reports.stats.completed')} value={stats.completed}       icon={Tick01Icon}        color="#33cbcc" />
                    <StatCard label={t('reports.stats.generating')} value={stats.generating}     icon={Loading02Icon}     color="#283852" />
                    <StatCard label={t('reports.stats.avgRate')}   value={`${stats.avgRate}%`}   icon={ArrowUpRight01Icon} color="#283852" />
                </div>
            )}

            {/* Lock warning */}
            {isLocked && !generateReport.isPending && (
                <div className="flex items-center gap-2 px-4 py-3 border border-[#e5e8ef] text-[#283852] text-sm">
                    <Clock01Icon size={16} />
                    {t('reports.lockWarning')}
                </div>
            )}

            {/* Generation progress */}
            {generateReport.isPending && (
                <div className="bg-white border border-[#e5e8ef] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Loading02Icon size={16} className="animate-spin text-[#283852]" />
                        <span className="text-sm font-medium text-[#283852]">{t('reports.generating')}</span>
                    </div>
                    <div className="h-1.5 bg-[#e5e8ef] overflow-hidden">
                        <div className="h-full bg-[#283852]" style={{ width: '60%', animation: 'indeterminate 1.4s ease-in-out infinite' }} />
                    </div>
                    <style>{`@keyframes indeterminate { 0% { transform: translateX(-100%); width: 50%; } 50% { width: 70%; } 100% { transform: translateX(250%); width: 50%; } }`}</style>
                </div>
            )}

            {/* Generation form */}
            {showForm && !generateReport.isPending && (
                <div className="bg-white border border-[#e5e8ef] p-5 space-y-5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc]">{t('reports.newReport')}</p>
                        <button onClick={() => setShowForm(false)} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
                            <Cancel01Icon size={16} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {canGenerateDept && (
                            <div>
                                <label className={LABEL}>{t('reports.form.type')}</label>
                                <div className="flex gap-px bg-[#e5e8ef]">
                                    {(['PERSONAL', 'DEPARTMENT'] as ReportType[]).map(tp => (
                                        <button key={tp} onClick={() => setReportType(tp)} className={`flex-1 ${reportType === tp ? TOGGLE_ON : TOGGLE_OFF}`}>
                                            {t(`reports.type.${tp.toLowerCase()}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={LABEL}>{t('reports.form.period')}</label>
                            <div className="flex gap-px bg-[#e5e8ef]">
                                {(['DAY', 'WEEK', 'MONTH', 'CUSTOM'] as ReportPeriod[]).map(p => (
                                    <button key={p} onClick={() => setPeriod(p)} className={`flex-1 ${period === p ? TOGGLE_ON : TOGGLE_OFF}`}>
                                        {t(`reports.period.${p.toLowerCase()}`)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {period === 'CUSTOM' && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL}>{t('reports.form.startDate')}</label>
                                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={`w-full ${INPUT}`} />
                            </div>
                            <div>
                                <label className={LABEL}>{t('reports.form.endDate')}</label>
                                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={`w-full ${INPUT}`} />
                            </div>
                        </div>
                    )}

                    {reportType === 'PERSONAL' && (
                        <div>
                            <label className={LABEL}>{t('reports.form.employee')}</label>
                            <select value={targetEmployeeId} onChange={e => setTargetEmployeeId(e.target.value)} className={`w-full ${SELECT}`}>
                                <option value="">{t('reports.form.selectEmployee')}</option>
                                {employees.filter((emp: any) => !emp.dismissed).map((emp: any) => (
                                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}{emp.department ? ` — ${emp.department.name}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {reportType === 'DEPARTMENT' && isManager && (
                        <div>
                            <label className={LABEL}>{t('reports.form.department')}</label>
                            <select value={targetDepartmentId} onChange={e => setTargetDepartmentId(e.target.value)} className={`w-full ${SELECT}`}>
                                <option value="">{t('reports.form.selectDepartment')}</option>
                                {departments.map((dept: any) => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {reportType === 'DEPARTMENT' && isHOD && (
                        <div className="flex items-center gap-1.5 text-xs text-[#b0bac9]">
                            <Alert01Icon size={12} />
                            {t('reports.form.hodDeptInfo')}
                        </div>
                    )}

                    <div>
                        <label className={LABEL}>Langue du rapport</label>
                        <div className="flex gap-px bg-[#e5e8ef]">
                            {(['fr', 'en'] as const).map(lang => (
                                <button key={lang} onClick={() => setLanguage(lang)} className={`flex-1 ${language === lang ? TOGGLE_ON : TOGGLE_OFF}`}>
                                    {lang === 'fr' ? 'Français' : 'English'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1 border-t border-[#e5e8ef]">
                        <button onClick={() => setShowForm(false)} className="px-4 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
                            {t('common.cancel')}
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={!formValid || isLocked}
                            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white transition-colors ${!formValid || isLocked ? 'bg-[#b0bac9] cursor-not-allowed' : 'bg-[#283852] hover:bg-[#1e2d42]'}`}
                        >
                            {t('reports.generate')}
                        </button>
                    </div>
                </div>
            )}

            {/* Filter bar */}
            {!isLoading && reports.length > 0 && (
                <div className="bg-white border border-[#e5e8ef] p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search01Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b0bac9]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={t('reports.filters.searchPlaceholder')}
                                className={`w-full pl-8 pr-3 py-2 text-sm bg-[#f8f9fc] border border-[#e5e8ef] focus:outline-none focus:border-[#33cbcc] transition-colors`}
                            />
                        </div>
                        {hasFilters && (
                            <button onClick={clearFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
                                <Cancel01Icon size={12} />
                                {t('reports.filters.clear')}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={SELECT}>
                            <option value="">{t('reports.filters.allStatuses')}</option>
                            <option value="COMPLETED">{t('reports.status.completed')}</option>
                            <option value="GENERATING">{t('reports.status.generating')}</option>
                            <option value="FAILED">{t('reports.status.failed')}</option>
                        </select>
                        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={SELECT}>
                            <option value="">{t('reports.filters.allTypes')}</option>
                            <option value="PERSONAL">{t('reports.type.personal')}</option>
                            <option value="DEPARTMENT">{t('reports.type.department')}</option>
                        </select>
                        {departments.length > 0 && (
                            <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)} className={SELECT}>
                                <option value="">{t('reports.filters.allDepartments')}</option>
                                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        )}
                        {(isManager ? allEmployees : employees).length > 0 && (
                            <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)} className={SELECT}>
                                <option value="">{t('reports.filters.allEmployees')}</option>
                                {(isManager ? allEmployees : employees).filter((e: any) => !e.dismissed).map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                ))}
                            </select>
                        )}
                        <div className="flex items-center gap-1.5">
                            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className={INPUT} />
                            <span className="text-[#b0bac9] text-xs">—</span>
                            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className={INPUT} />
                        </div>
                    </div>

                    {hasFilters && (
                        <p className="text-xs text-[#b0bac9]">
                            {t('reports.filters.results', { count: filteredReports.length, total: reports.length })}
                        </p>
                    )}
                </div>
            )}

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loading02Icon size={28} className="animate-spin text-[#283852]" />
                </div>
            ) : reports.length === 0 ? (
                <div className="text-center py-20">
                    <File01Icon size={44} className="mx-auto mb-3 text-[#b0bac9]" />
                    <p className="font-semibold text-[#8892a4]">{t('reports.empty')}</p>
                    <p className="text-sm mt-1 text-[#b0bac9]">{t('reports.emptyHint')}</p>
                </div>
            ) : filteredReports.length === 0 ? (
                <div className="text-center py-14">
                    <Search01Icon size={32} className="mx-auto mb-2 text-[#b0bac9]" />
                    <p className="font-medium text-sm text-[#8892a4]">{t('reports.filters.noResults')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReports.map((report: Report) => (
                        <ReportCard key={report.id} report={report} onDelete={handleDelete} onExport={handleExport} />
                    ))}
                    <div ref={sentinelRef} className="h-1" />
                    {reportsQuery.isFetchingNextPage && (
                        <div className="flex justify-center py-4">
                            <Loading02Icon size={20} className="animate-spin text-[#283852]" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
