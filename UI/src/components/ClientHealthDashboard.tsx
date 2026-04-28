import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Alert02Icon, ArrowDownRight01Icon, Clock01Icon, Tick01Icon, ArrowUpRight01Icon, FilterIcon, ArrowRight01Icon } from 'hugeicons-react';
import { useClients } from '../api/clients/hooks';
import { useClientHealthMetrics } from '../api/commercial/hooks';
import type { HealthStatus } from '../api/commercial/types';

/* ─── Helper Functions ─────────────────────────────────────── */

const getHealthBadgeConfig = (status: HealthStatus) => {
    const configs = {
        AT_RISK: { color: 'bg-[#283852]', textColor: 'text-[#283852]', bgColor: 'bg-[#283852]/10', icon: Alert02Icon, priority: 1 },
        ATTENTION_NEEDED: { color: 'bg-[#283852]', textColor: 'text-[#283852]', bgColor: 'bg-[#283852]/10', icon: ArrowDownRight01Icon, priority: 2 },
        NEEDS_FOLLOWUP: { color: 'bg-[#283852]', textColor: 'text-[#283852]', bgColor: 'bg-[#283852]/10', icon: Clock01Icon, priority: 3 },
        GOOD: { color: 'bg-[#33cbcc]', textColor: 'text-[#33cbcc]', bgColor: 'bg-[#33cbcc]/10', icon: Tick01Icon, priority: 4 },
        HEALTHY: { color: 'bg-[#33cbcc]', textColor: 'text-[#33cbcc]', bgColor: 'bg-[#33cbcc]/10', icon: Tick01Icon, priority: 5 },
        NEW: { color: 'bg-[#283852]', textColor: 'text-[#283852]', bgColor: 'bg-[#283852]/10', icon: ArrowUpRight01Icon, priority: 6 },
    };
    return configs[status] || configs.NEW;
};

/* ─── Client Health Item ─────────────────────────────────────── */

function ClientHealthItem({ clientId, clientName, onSelect }: { clientId: string; clientName: string; onSelect: () => void }) {
    const { t } = useTranslation();
    const { data: health, isLoading } = useClientHealthMetrics(clientId);

    if (isLoading) {
        return (
            <div className="p-3 bg-gray-50 rounded-xl animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
        );
    }

    if (!health) return null;

    const config = getHealthBadgeConfig(health.healthStatus);
    const Icon = config.icon;

    return (
        <motion.button
            onClick={onSelect}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-3 rounded-xl transition-all text-left ${config.bgColor}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">
                        {clientName}
                    </h4>
                    <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-lg ${config.textColor} bg-white/80`}>
                        <Icon size={12} />
                        <span className="text-xs font-medium">
                            {t(`commercial.clientActivities.healthStatuses.${health.healthStatus}`)}
                        </span>
                    </div>
                </div>
                <ArrowRight01Icon size={16} className="text-gray-400 flex-shrink-0 mt-1" />
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                <div>
                    <span className="font-medium">{health.daysSinceLastContact ?? '?'}</span>{' '}
                    {t('commercial.clientActivities.daysAgo', 'jours')}
                </div>
                <div className="h-3 w-px bg-gray-300" />
                <div>
                    <span className="font-medium">{health.activitiesLast30Days}</span>{' '}
                    {t('commercial.clientActivities.activities30d', 'activités (30j)')}
                </div>
            </div>
        </motion.button>
    );
}

/* ─── Client Health Dashboard ─────────────────────────────────── */

interface ClientHealthDashboardProps {
    onClientSelect?: (clientId: string) => void;
}

export default function ClientHealthDashboard({ onClientSelect }: ClientHealthDashboardProps) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<'all' | 'atRisk' | 'needsAttention'>('atRisk');

    const { data: clients = [], isLoading } = useClients();

    // Group clients by health status (we'll fetch health for each)
    const filteredClients = useMemo(() => {
        if (filter === 'all') return clients;
        // For now, return all clients and let the health fetch determine visibility
        // In production, you might want to pre-fetch health for all clients
        return clients;
    }, [clients, filter]);

    const handleClientSelect = (clientId: string) => {
        if (onClientSelect) {
            onClientSelect(clientId);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#283852] px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Alert02Icon size={20} />
                            {t('commercial.clientHealth.title', 'Santé Clients')}
                        </h2>
                        <p className="text-xs text-white/70 mt-1">
                            {t('commercial.clientHealth.subtitle', 'Clients nécessitant une attention')}
                        </p>
                    </div>
                </div>
            </div>

            {/* FilterIcon Tabs */}
            <div className="px-5 pt-4 border-b border-gray-100">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('atRisk')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            filter === 'atRisk'
                                ? 'bg-[#33cbcc]/10 text-[#33cbcc] border-b-2 border-[#33cbcc]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Alert02Icon size={14} />
                            {t('commercial.clientHealth.atRisk', 'À risque')}
                        </div>
                    </button>
                    <button
                        onClick={() => setFilter('needsAttention')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            filter === 'needsAttention'
                                ? 'bg-[#33cbcc]/10 text-[#33cbcc] border-b-2 border-[#33cbcc]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Clock01Icon size={14} />
                            {t('commercial.clientHealth.needsAttention', 'Attention requise')}
                        </div>
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                            filter === 'all'
                                ? 'bg-[#283852]/10 text-[#283852] border-b-2 border-[#283852]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <FilterIcon size={14} />
                            {t('commercial.clientHealth.all', 'Tous')}
                        </div>
                    </button>
                </div>
            </div>

            {/* Client List */}
            <div className="p-5">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <Tick01Icon size={40} strokeWidth={1.2} className="mb-3" />
                        <p className="text-sm">{t('commercial.clientHealth.noClients', 'Aucun client à afficher')}</p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {filteredClients.map((client: any, index) => (
                            <motion.div
                                key={client.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <ClientHealthItem
                                    clientId={client.id}
                                    clientName={client.name}
                                    onSelect={() => handleClientSelect(client.id)}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer Stats */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{t('commercial.clientHealth.totalClients', 'Total clients')}: {clients.length}</span>
                    <span className="text-[#33cbcc] font-medium cursor-pointer hover:underline">
                        {t('commercial.clientHealth.viewAll', 'Voir tout')} →
                    </span>
                </div>
            </div>
        </div>
    );
}
