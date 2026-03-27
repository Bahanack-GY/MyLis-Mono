import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Plus,
    Loader2,
    Download,
    Calendar,
    TrendingUp,
    X,
    ChevronDown,
    ChevronUp,
    Trash2,
    FileBarChart,
    AlertCircle
} from 'lucide-react';
import { useReports, useGenerateReport, useDeleteReport } from '../../api/reports/hooks';
import { useFiscalYears } from '../../api/accounting/hooks';
import type { Report, AccountingReportData } from '../../api/reports/types';
import {
    RevenueExpensesChart,
    NetIncomeChart,
    BalanceSheetChart
} from '../../components/accounting/FinancialCharts';
import { exportAccountingReportPdf } from '../../utils/exportAccountingReportPdf';

const AIReports = () => {
    const { t } = useTranslation();
    const { data: reports = [], isLoading } = useReports();
    const { data: fiscalYears = [] } = useFiscalYears();
    const generateReport = useGenerateReport();
    const deleteReport = useDeleteReport();

    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    const [form, setForm] = useState({
        fiscalYearId: '',
        period: 'ANNUAL' as 'QUARTER' | 'SEMESTER' | 'ANNUAL' | 'CUSTOM',
        startDate: '',
        endDate: '',
        includeBudgetAnalysis: true,
        includeTaxStatus: true,
        language: 'fr' as 'fr' | 'en',
    });

    const accountingReports = reports.filter(r => r.type === 'ACCOUNTING');

    const handleGenerate = () => {
        const fiscalYear = fiscalYears.find(fy => fy.id === form.fiscalYearId);
        if (!fiscalYear) return;

        generateReport.mutate({
            type: 'ACCOUNTING',
            fiscalYearId: form.fiscalYearId,
            fiscalYearName: fiscalYear.name,
            period: form.period,
            startDate: form.startDate || fiscalYear.startDate,
            endDate: form.endDate || fiscalYear.endDate,
            includeBudgetAnalysis: form.includeBudgetAnalysis,
            includeTaxStatus: form.includeTaxStatus,
            language: form.language,
        }, {
            onSuccess: () => {
                setShowGenerateForm(false);
                setForm({ ...form, fiscalYearId: '', startDate: '', endDate: '' });
            },
        });
    };

    const toggleSection = (reportId: string, section: string) => {
        const key = `${reportId}-${section}`;
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const isSectionExpanded = (reportId: string, section: string) => {
        return expandedSections[`${reportId}-${section}`] || false;
    };

    const formatXAF = (value: number) => value.toLocaleString('fr-CM') + ' XAF';

    const parseAIContent = (content: string) => {
        const sections: Record<string, string> = {};
        const headings = [
            'RÉSUMÉ EXÉCUTIF',
            'EXECUTIVE SUMMARY',
            'ANALYSE DE LA PERFORMANCE FINANCIÈRE',
            'FINANCIAL PERFORMANCE ANALYSIS',
            'ANALYSE DU BILAN',
            'BALANCE SHEET ANALYSIS',
            'ANALYSE BUDGÉTAIRE',
            'BUDGET ANALYSIS',
            'TRÉSORERIE ET CRÉANCES',
            'CASH FLOW AND RECEIVABLES',
            'FISCALITÉ',
            'TAX COMPLIANCE',
            'RECOMMANDATIONS STRATÉGIQUES',
            'STRATEGIC RECOMMENDATIONS',
        ];

        let currentHeading = 'intro';
        let currentContent = '';

        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (headings.includes(trimmed)) {
                if (currentContent.trim()) {
                    sections[currentHeading] = currentContent.trim();
                }
                currentHeading = trimmed;
                currentContent = '';
            } else {
                currentContent += line + '\n';
            }
        });

        if (currentContent.trim()) {
            sections[currentHeading] = currentContent.trim();
        }

        return sections;
    };

    const renderReport = (report: Report) => {
        if (report.status === 'GENERATING') {
            return (
                <div className="flex items-center gap-3 p-6 bg-blue-50 rounded-lg">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                    <div>
                        <p className="font-semibold text-blue-900">{t('reports.generating')}</p>
                        <p className="text-sm text-blue-700">{t('reports.generatingDesc')}</p>
                    </div>
                </div>
            );
        }

        if (report.status === 'FAILED') {
            return (
                <div className="flex items-center gap-3 p-6 bg-red-50 rounded-lg">
                    <AlertCircle className="text-red-600" size={24} />
                    <div>
                        <p className="font-semibold text-red-900">{t('reports.failed')}</p>
                        <p className="text-sm text-red-700">{t('reports.failedDesc')}</p>
                    </div>
                </div>
            );
        }

        const data = report.reportData as AccountingReportData;
        if (!data) return null;

        const aiSections = data.aiContent ? parseAIContent(data.aiContent) : {};
        const isExpanded = expandedReportId === report.id;

        // Prepare monthly chart data
        const monthlyChartData = (data.monthlySummary?.months && Array.isArray(data.monthlySummary.months))
            ? data.monthlySummary.months.map((m, i) => ({
                month: `M${m.month || i + 1}`,
                revenue: m.revenue || 0,
                expenses: m.expenses || 0,
                netIncome: (m.revenue || 0) - (m.expenses || 0),
            }))
            : [];

        return (
            <div className="space-y-4">
                <button
                    onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                    className="w-full text-left"
                >
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            <span className="font-medium">{isExpanded ? t('reports.hideDetails') : t('reports.showDetails')}</span>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                exportAccountingReportPdf(report);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] transition-colors"
                        >
                            <Download size={18} />
                            <span>{t('reports.exportPDF')}</span>
                        </button>
                    </div>
                </button>

                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6 overflow-hidden"
                        >
                            {/* KPIs Grid */}
                            {data.kpis && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] transition-colors">
                                        <p className="text-sm text-gray-600 mb-1">{t('accounting.revenue')}</p>
                                        <p className="text-xl font-bold text-gray-900">{formatXAF(data.kpis.totalRevenue)}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] transition-colors">
                                        <p className="text-sm text-gray-600 mb-1">{t('accounting.expenses')}</p>
                                        <p className="text-xl font-bold text-gray-900">{formatXAF(data.kpis.totalExpenses)}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] transition-colors">
                                        <p className="text-sm text-gray-600 mb-1">{t('accounting.netIncome')}</p>
                                        <p className="text-xl font-bold text-gray-900">{formatXAF(data.kpis.netIncome)}</p>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] transition-colors">
                                        <p className="text-sm text-gray-600 mb-1">{t('accounting.cash')}</p>
                                        <p className="text-xl font-bold text-gray-900">{formatXAF(data.kpis.cashBalance)}</p>
                                    </div>
                                </div>
                            )}

                            {/* Charts Section */}
                            {data.monthlySummary && data.balanceSheet && (
                                <div className="bg-white border rounded-lg p-6">
                                    <button
                                        onClick={() => toggleSection(report.id, 'charts')}
                                        className="w-full flex items-center justify-between mb-4"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">{t('reports.sections.charts')}</h3>
                                        {isSectionExpanded(report.id, 'charts') ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                    <AnimatePresence>
                                        {isSectionExpanded(report.id, 'charts') && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-6"
                                            >
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('reports.revenueVsExpenses')}</h4>
                                                    <RevenueExpensesChart data={monthlyChartData} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('reports.netIncomeTrend')}</h4>
                                                    <NetIncomeChart data={monthlyChartData} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-3">{t('reports.balanceSheet')}</h4>
                                                    <BalanceSheetChart
                                                        assets={data.balanceSheet.totalAssets}
                                                        liabilities={data.balanceSheet.totalLiabilities}
                                                        equity={data.balanceSheet.equity}
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* AI Insights */}
                            {data.aiContent && (
                                <div className="bg-white border rounded-lg p-6">
                                    <button
                                        onClick={() => toggleSection(report.id, 'ai')}
                                        className="w-full flex items-center justify-between mb-4"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">{t('reports.sections.aiInsights')}</h3>
                                        {isSectionExpanded(report.id, 'ai') ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                    <AnimatePresence>
                                        {isSectionExpanded(report.id, 'ai') && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4"
                                            >
                                                {Object.entries(aiSections).map(([heading, content]) => (
                                                    <div key={heading}>
                                                        <h4 className="font-semibold text-gray-900 mb-2">{heading}</h4>
                                                        <p className="text-gray-700 whitespace-pre-line">{content}</p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Budget Analysis */}
                            {data.budgetVariance && (
                                <div className="bg-white border rounded-lg p-6">
                                    <button
                                        onClick={() => toggleSection(report.id, 'budget')}
                                        className="w-full flex items-center justify-between mb-4"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">{t('reports.sections.budgetAnalysis')}</h3>
                                        {isSectionExpanded(report.id, 'budget') ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                    <AnimatePresence>
                                        {isSectionExpanded(report.id, 'budget') && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                                            >
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.budgeted')}</p>
                                                    <p className="text-lg font-semibold">{formatXAF(data.budgetVariance.totalBudgeted)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.actual')}</p>
                                                    <p className="text-lg font-semibold">{formatXAF(data.budgetVariance.totalActual)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.compliance')}</p>
                                                    <p className="text-lg font-semibold">{data.budgetVariance.complianceRate}%</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Tax Status */}
                            {data.taxStatus && (
                                <div className="bg-white border rounded-lg p-6">
                                    <button
                                        onClick={() => toggleSection(report.id, 'tax')}
                                        className="w-full flex items-center justify-between mb-4"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-900">{t('reports.sections.taxStatus')}</h3>
                                        {isSectionExpanded(report.id, 'tax') ? <ChevronUp /> : <ChevronDown />}
                                    </button>
                                    <AnimatePresence>
                                        {isSectionExpanded(report.id, 'tax') && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                                            >
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.total')}</p>
                                                    <p className="text-lg font-semibold text-gray-900">{data.taxStatus.total}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.validated')}</p>
                                                    <p className="text-lg font-semibold text-gray-900">{data.taxStatus.validated}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.filed')}</p>
                                                    <p className="text-lg font-semibold text-gray-900">{data.taxStatus.filed}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">{t('reports.totalAmount')}</p>
                                                    <p className="text-lg font-semibold text-gray-900">{formatXAF(data.taxStatus.totalAmount)}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <FileBarChart className="text-[#33cbcc]" size={32} />
                        {t('accounting.aiReports.title')}
                    </h1>
                    <p className="text-gray-600 mt-1">{t('accounting.aiReports.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowGenerateForm(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] transition-colors shadow-lg"
                >
                    <Plus size={20} />
                    <span>{t('accounting.aiReports.generate')}</span>
                </button>
            </div>

            {/* Reports List */}
            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="animate-spin text-[#33cbcc]" size={40} />
                </div>
            ) : accountingReports.length === 0 ? (
                <div className="text-center p-12 bg-gray-50 rounded-lg border-2 border-dashed">
                    <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">{t('reports.noReports')}</h3>
                    <p className="text-gray-600">{t('reports.noReportsDesc')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {accountingReports.map(report => (
                        <div key={report.id} className="bg-white border rounded-xl p-6 shadow-sm">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">{report.title}</h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={16} />
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                            report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                            report.status === 'GENERATING' ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-100 text-red-800'
                                        }`}>
                                            {t(`reports.status.${report.status.toLowerCase()}`)}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        if (confirm(t('reports.confirmDelete'))) {
                                            deleteReport.mutate(report.id);
                                        }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                            {renderReport(report)}
                        </div>
                    ))}
                </div>
            )}

            {/* Generate Form Modal */}
            <AnimatePresence>
                {showGenerateForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowGenerateForm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">{t('accounting.aiReports.generate')}</h2>
                                <button onClick={() => setShowGenerateForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('accounting.aiReports.fiscalYear')}
                                    </label>
                                    <select
                                        value={form.fiscalYearId}
                                        onChange={e => setForm({ ...form, fiscalYearId: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#33cbcc] focus:border-transparent"
                                    >
                                        <option value="">{t('common.select')}</option>
                                        {fiscalYears.map(fy => (
                                            <option key={fy.id} value={fy.id}>
                                                {fy.name} ({fy.startDate} - {fy.endDate})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('accounting.aiReports.period')}
                                    </label>
                                    <select
                                        value={form.period}
                                        onChange={e => setForm({ ...form, period: e.target.value as any })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#33cbcc] focus:border-transparent"
                                    >
                                        <option value="QUARTER">{t('accounting.aiReports.periods.quarter')}</option>
                                        <option value="SEMESTER">{t('accounting.aiReports.periods.semester')}</option>
                                        <option value="ANNUAL">{t('accounting.aiReports.periods.annual')}</option>
                                        <option value="CUSTOM">{t('accounting.aiReports.periods.custom')}</option>
                                    </select>
                                </div>

                                {form.period === 'CUSTOM' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('common.startDate')}
                                            </label>
                                            <input
                                                type="date"
                                                value={form.startDate}
                                                onChange={e => setForm({ ...form, startDate: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#33cbcc] focus:border-transparent"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                {t('common.endDate')}
                                            </label>
                                            <input
                                                type="date"
                                                value={form.endDate}
                                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#33cbcc] focus:border-transparent"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.includeBudgetAnalysis}
                                            onChange={e => setForm({ ...form, includeBudgetAnalysis: e.target.checked })}
                                            className="w-4 h-4 text-[#33cbcc] border-gray-300 rounded focus:ring-[#33cbcc]"
                                        />
                                        <span className="text-sm text-gray-700">{t('accounting.aiReports.includeBudget')}</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={form.includeTaxStatus}
                                            onChange={e => setForm({ ...form, includeTaxStatus: e.target.checked })}
                                            className="w-4 h-4 text-[#33cbcc] border-gray-300 rounded focus:ring-[#33cbcc]"
                                        />
                                        <span className="text-sm text-gray-700">{t('accounting.aiReports.includeTax')}</span>
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        {t('accounting.aiReports.language')}
                                    </label>
                                    <select
                                        value={form.language}
                                        onChange={e => setForm({ ...form, language: e.target.value as 'fr' | 'en' })}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#33cbcc] focus:border-transparent"
                                    >
                                        <option value="fr">Français</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowGenerateForm(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                    <button
                                        onClick={handleGenerate}
                                        disabled={!form.fiscalYearId || generateReport.isPending}
                                        className="flex-1 px-4 py-2 bg-[#33cbcc] text-white rounded-lg hover:bg-[#2bb5b6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {generateReport.isPending ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                {t('accounting.aiReports.generating')}
                                            </>
                                        ) : (
                                            t('accounting.aiReports.generate')
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIReports;
