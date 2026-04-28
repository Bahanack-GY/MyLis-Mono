import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Add01Icon, Calendar01Icon, UserIcon, Location01Icon, CallIcon, Mail01Icon, Alert01Icon, Tick01Icon, Clock01Icon, ArrowUpRight01Icon } from 'hugeicons-react';
import { useClientActivitiesReport, useClientHealthMetrics } from '../api/commercial/hooks';
import type { HealthStatus, ActivityType } from '../api/commercial/types';

/* ─── Helper Functions ─────────────────────────────────────── */

const getHealthBadgeStyles = (status: HealthStatus) => {
    const styles = {
        HEALTHY: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', icon: Tick01Icon, border: 'border-gray-200' },
        GOOD: { bg: 'bg-[#33cbcc]/10', text: 'text-[#33cbcc]', icon: Tick01Icon, border: 'border-gray-200' },
        NEEDS_FOLLOWUP: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: Clock01Icon, border: 'border-gray-200' },
        ATTENTION_NEEDED: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: Alert01Icon, border: 'border-gray-200' },
        AT_RISK: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: Alert01Icon, border: 'border-gray-200' },
        NEW: { bg: 'bg-[#283852]/10', text: 'text-[#283852]', icon: ArrowUpRight01Icon, border: 'border-gray-200' },
    };
    return styles[status] || styles.NEW;
};

const getActivityIcon = (type: ActivityType) => {
    const icons = {
        VISITE_CLIENT: Location01Icon,
        VISITE_PROSPECT: Location01Icon,
        APPEL: CallIcon,
        EMAIL: Mail01Icon,
        REUNION: UserIcon,
        DEMO: UserIcon,
        RELANCE: CallIcon,
        AUTRE: Calendar01Icon,
    };
    return icons[type] || Calendar01Icon;
};

const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
};

/* ─── Client Activities Panel Component ─────────────────────── */

export default function ClientActivitiesPanel({ clientId }: { clientId: string }) {
    const { t } = useTranslation();
    const [dateRange, setDateRange] = useState<{ dateFrom?: string; dateTo?: string }>({});

    const { data: report, isLoading: reportLoading } = useClientActivitiesReport(clientId, dateRange);
    const { data: health, isLoading: healthLoading } = useClientHealthMetrics(clientId);

    const healthStyles = health ? getHealthBadgeStyles(health.healthStatus) : null;
    const HealthIcon = healthStyles?.icon || ArrowUpRight01Icon;

    // Activity type breakdown for chart
    const activityBreakdown = useMemo(() => {
        if (!report?.summary?.activityBreakdown) return [];
        return Object.entries(report.summary.activityBreakdown).map(([type, count]) => ({
            type: type as ActivityType,
            count: count as number,
        })).filter(item => item.count > 0);
    }, [report]);

    const totalCount = activityBreakdown.reduce((sum, item) => sum + item.count, 0);

    if (!clientId) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Calendar01Icon size={48} strokeWidth={1.2} className="mb-4" />
                <p className="text-sm">{t('commercial.clientActivities.selectClient', 'Sélectionnez un client')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Health Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm p-5"
            >
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 mb-1">
                            {t('commercial.clientActivities.healthStatus')}
                        </h3>
                        {healthLoading ? (
                            <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                        ) : health && healthStyles ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${healthStyles.bg} ${healthStyles.text}`}>
                                <HealthIcon size={16} />
                                <span className="text-sm font-medium">
                                    {t(`commercial.clientActivities.healthStatuses.${health.healthStatus}`)}
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <button
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#33cbcc] rounded-xl hover:bg-[#33cbcc]/90 transition-colors shadow-sm"
                        onClick={() => {
                            // TODO: Open activity modal with clientId pre-filled
                            console.log('Log activity for client:', clientId);
                        }}
                    >
                        <Add01Icon size={16} />
                        {t('commercial.clientActivities.logActivity')}
                    </button>
                </div>

                {/* Health Metrics Grid */}
                {health && !healthLoading && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="text-xs text-gray-500 mb-1">
                                {t('commercial.clientActivities.lastContact')}
                            </div>
                            <div className="text-sm font-semibold text-gray-800">
                                {health.lastContactDate
                                    ? formatDate(health.lastContactDate)
                                    : t('commercial.clientActivities.noContact', 'Aucun')}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="text-xs text-gray-500 mb-1">
                                {t('commercial.clientActivities.daysSince', 'Jours écoulés')}
                            </div>
                            <div className="text-lg font-bold text-[#33cbcc]">
                                {health.daysSinceLastContact ?? '-'}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="text-xs text-gray-500 mb-1">
                                {t('commercial.clientActivities.last30Days', 'Dernier 30 jours')}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                                {health.activitiesLast30Days}
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-3">
                            <div className="text-xs text-gray-500 mb-1">
                                {t('commercial.clientActivities.totalActivities', 'Total')}
                            </div>
                            <div className="text-lg font-bold text-gray-800">
                                {health.totalActivities}
                            </div>
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Activity Type Breakdown */}
            {activityBreakdown.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-sm p-5"
                >
                    <h3 className="text-base font-semibold text-gray-800 mb-4">
                        {t('commercial.clientActivities.activityBreakdown', 'Répartition des activités')}
                    </h3>
                    <div className="space-y-3">
                        {activityBreakdown.map((item) => {
                            const percentage = (item.count / totalCount) * 100;
                            return (
                                <div key={item.type}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600">
                                            {t(`commercial.activities.types.${item.type}`, item.type)}
                                        </span>
                                        <span className="text-sm font-medium text-gray-800">
                                            {item.count} ({percentage.toFixed(0)}%)
                                        </span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 0.6, delay: 0.2 }}
                                            className="h-full bg-[#33cbcc]"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Activities Timeline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm p-5"
            >
                <h3 className="text-base font-semibold text-gray-800 mb-4">
                    {t('commercial.clientActivities.timeline', 'Historique des activités')}
                </h3>

                {reportLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !report?.activities || report.activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Calendar01Icon size={40} strokeWidth={1.2} className="mb-3" />
                        <p className="text-sm">{t('commercial.clientActivities.noActivities', 'Aucune activité enregistrée')}</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        <AnimatePresence>
                            {report.activities.map((activity, index) => {
                                const ActivityIcon = getActivityIcon(activity.type);
                                const isCompleted = activity.activityStatus === 'COMPLETED';

                                return (
                                    <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                            isCompleted ? 'bg-[#33cbcc]/10' : 'bg-gray-100'
                                        }`}>
                                            <ActivityIcon size={18} className={isCompleted ? 'text-[#33cbcc]' : 'text-gray-500'} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-gray-800">
                                                    {t(`commercial.activities.types.${activity.type}`, activity.type)}
                                                </h4>
                                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                                    {formatDate(activity.date)}
                                                </span>
                                            </div>

                                            {activity.description && (
                                                <p className="text-sm text-gray-600 mb-2">
                                                    {activity.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                {activity.employee && (
                                                    <span className="flex items-center gap-1">
                                                        <UserIcon size={12} />
                                                        {activity.employee.firstName} {activity.employee.lastName}
                                                    </span>
                                                )}
                                                {activity.location && (
                                                    <span className="flex items-center gap-1">
                                                        <Location01Icon size={12} />
                                                        {activity.location}
                                                    </span>
                                                )}
                                                {activity.startTime && activity.endTime && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock01Icon size={12} />
                                                        {activity.startTime} - {activity.endTime}
                                                    </span>
                                                )}
                                            </div>

                                            {activity.result && isCompleted && (
                                                <div className="mt-2 p-2 bg-[#33cbcc]/10 rounded-lg">
                                                    <p className="text-xs text-[#33cbcc]">
                                                        <strong>{t('commercial.clientActivities.result', 'Résultat')}:</strong> {activity.result}
                                                    </p>
                                                </div>
                                            )}

                                            {activity.nextAction && (
                                                <div className="mt-2 p-2 bg-[#283852]/10 rounded-lg">
                                                    <p className="text-xs text-[#283852]">
                                                        <strong>{t('commercial.clientActivities.nextAction', 'Prochaine action')}:</strong> {activity.nextAction}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
