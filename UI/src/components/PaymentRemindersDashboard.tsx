import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Alert01Icon, Clock01Icon, Calendar01Icon, ArrowUpRight01Icon, DollarCircleIcon, ArrowRight01Icon, Notification01Icon } from 'hugeicons-react';
import { useInvoices } from '../api/invoices/hooks';
import type { Invoice } from '../api/invoices/types';

/* ─── Helper Functions ─────────────────────────────────────── */

type PaymentUrgency = 'overdue' | 'dueSoon' | 'upcoming';

const getPaymentUrgency = (dueDate: string): { urgency: PaymentUrgency; daysUntilDue: number } => {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { urgency: 'overdue', daysUntilDue: diffDays };
    } else if (diffDays <= 7) {
        return { urgency: 'dueSoon', daysUntilDue: diffDays };
    } else {
        return { urgency: 'upcoming', daysUntilDue: diffDays };
    }
};

const getUrgencyConfig = (urgency: PaymentUrgency) => {
    const configs = {
        overdue: {
            color: 'bg-[#283852]',
            textColor: 'text-[#283852]',
            bgColor: 'bg-[#283852]/5',
            borderColor: 'border-[#283852]/20',
            icon: Alert01Icon,
            label: 'En retard',
        },
        dueSoon: {
            color: 'bg-[#33cbcc]',
            textColor: 'text-[#33cbcc]',
            bgColor: 'bg-[#33cbcc]/5',
            borderColor: 'border-[#33cbcc]/20',
            icon: Clock01Icon,
            label: 'Échéance proche',
        },
        upcoming: {
            color: 'bg-gray-500',
            textColor: 'text-gray-700',
            bgColor: 'bg-gray-50',
            borderColor: 'border-gray-200',
            icon: Calendar01Icon,
            label: 'À venir',
        },
    };
    return configs[urgency];
};

const formatFCFA = (n: number) => new Intl.NumberFormat('fr-FR').format(Math.round(n));

const formatDate = (dateStr: string) => {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return dateStr;
    }
};

/* ─── Payment Item ─────────────────────────────────────────── */

function PaymentItem({ invoice, onSelect }: { invoice: Invoice; onSelect: () => void }) {
    const { t } = useTranslation();
    const { urgency, daysUntilDue } = getPaymentUrgency(invoice.dueDate);
    const config = getUrgencyConfig(urgency, t);
    const Icon = config.icon;

    const daysText = useMemo(() => {
        if (urgency === 'overdue') {
            const days = Math.abs(daysUntilDue);
            return days === 1
                ? t('commercial.paymentReminders.overdue1Day', '1 jour de retard')
                : t('commercial.paymentReminders.overdueNDays', '{{days}} jours de retard', { days });
        } else if (urgency === 'dueSoon') {
            return daysUntilDue === 0
                ? t('commercial.paymentReminders.dueToday', "Dû aujourd'hui")
                : daysUntilDue === 1
                ? t('commercial.paymentReminders.dueTomorrow', 'Dû demain')
                : t('commercial.paymentReminders.dueInNDays', 'Dû dans {{days}} jours', { days: daysUntilDue });
            } else {
            return t('commercial.paymentReminders.dueInNDays', 'Dû dans {{days}} jours', { days: daysUntilDue });
            }
    }, [urgency, daysUntilDue, t]);

    return (
        <motion.button
            onClick={onSelect}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full p-3 rounded-xl hover:shadow-md transition-all text-left ${config.bgColor}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon size={14} className={config.textColor} />
                        <span className={`text-xs font-semibold ${config.textColor}`}>
                            {daysText}
                        </span>
                    </div>
                    <h4 className="text-sm font-semibold text-gray-800 truncate">
                        {invoice.invoiceNumber}
                    </h4>
                    <p className="text-xs text-gray-600 truncate">
                        {(invoice as any).client?.name || `Client ID: ${invoice.clientId}`}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-base font-bold text-gray-800">
                        {formatFCFA(Number(invoice.total) || 0)} <span className="text-xs font-normal text-gray-500">FCFA</span>
                    </div>
                    <ArrowRight01Icon size={14} className="text-gray-400" />
                </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
                <span>{t('commercial.paymentReminders.dueDate', 'Échéance')}: {formatDate(invoice.dueDate)}</span>
                {invoice.status && (
                    <span className={`px-2 py-0.5 rounded-lg font-medium ${
                        invoice.status === 'PAID'
                            ? 'bg-[#283852] text-white'
                            : invoice.status === 'PENDING'
                            ? 'bg-[#283852]/10 text-[#283852]/70'
                            : 'bg-gray-100 text-gray-700'
                    }`}>
                        {invoice.status === 'PAID' ? t('commercial.paymentReminders.statusPaid', 'Payé') 
                            : invoice.status === 'PENDING' ? t('commercial.paymentReminders.statusPending', 'En attente') 
                            : invoice.status}
                    </span>
                )}
            </div>
        </motion.button>
    );
}

/* ─── Payment Reminders Dashboard ─────────────────────────────────────── */

interface PaymentRemindersDashboardProps {
    onInvoiceSelect?: (invoiceId: string) => void;
}

export default function PaymentRemindersDashboard({ onInvoiceSelect }: PaymentRemindersDashboardProps) {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<'all' | PaymentUrgency>('all');

    const { data: allInvoices = [], isLoading } = useInvoices();

    // Filter unpaid invoices and categorize
    const { overdueInvoices, dueSoonInvoices, upcomingInvoices, stats } = useMemo(() => {
        const unpaid = (allInvoices as Invoice[]).filter(inv => inv.status !== 'PAID');

        const overdue: Invoice[] = [];
        const dueSoon: Invoice[] = [];
        const upcoming: Invoice[] = [];
        let totalAmount = 0;
        let overdueAmount = 0;

        unpaid.forEach(inv => {
            const { urgency } = getPaymentUrgency(inv.dueDate);
            totalAmount += Number(inv.total) || 0;

            if (urgency === 'overdue') {
                overdue.push(inv);
                overdueAmount += Number(inv.total) || 0;
            } else if (urgency === 'dueSoon') {
                dueSoon.push(inv);
            } else {
                upcoming.push(inv);
            }
        });

        // Sort by due date (most urgent first)
        overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        dueSoon.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return {
            overdueInvoices: overdue,
            dueSoonInvoices: dueSoon,
            upcomingInvoices: upcoming,
            stats: {
                total: unpaid.length,
                overdue: overdue.length,
                dueSoon: dueSoon.length,
                upcoming: upcoming.length,
                totalAmount,
                overdueAmount,
            },
        };
    }, [allInvoices]);

    const displayedInvoices = useMemo(() => {
        if (filter === 'overdue') return overdueInvoices;
        if (filter === 'dueSoon') return dueSoonInvoices;
        if (filter === 'upcoming') return upcomingInvoices;
        return [...overdueInvoices, ...dueSoonInvoices, ...upcomingInvoices];
    }, [filter, overdueInvoices, dueSoonInvoices, upcomingInvoices]);

    const handleInvoiceSelect = (invoiceId: string) => {
        if (onInvoiceSelect) {
            onInvoiceSelect(invoiceId);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#283852] px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Notification01Icon size={20} />
                            {t('commercial.paymentReminders.title', 'Rappels de Paiement')}
                        </h2>
                        <p className="text-xs text-white/70 mt-1">
                            {t('commercial.paymentReminders.subtitle', 'Factures impayées à surveiller')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 p-5 border-b border-gray-100">
                <div className="bg-[#283852]/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Alert01Icon size={14} className="text-[#283852]" />
                        <span className="text-xs font-medium text-[#283852]">
                            {t('commercial.paymentReminders.overdue')}
                        </span>
                    </div>
                    <div className="text-xl font-bold text-[#283852]">{stats.overdue}</div>
                    <div className="text-xs text-gray-600 mt-1">{formatFCFA(stats.overdueAmount)} FCFA</div>
                </div>

                <div className="bg-[#33cbcc]/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock01Icon size={14} className="text-[#33cbcc]" />
                        <span className="text-xs font-medium text-[#33cbcc]">
                            {t('commercial.paymentReminders.dueSoon')}
                        </span>
                    </div>
                    <div className="text-xl font-bold text-[#33cbcc]">{stats.dueSoon}</div>
                    <div className="text-xs text-gray-600 mt-1">7 jours</div>
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowUpRight01Icon size={14} className="text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">
                            {t('commercial.paymentReminders.upcoming')}
                        </span>
                    </div>
                    <div className="text-xl font-bold text-gray-700">{stats.upcoming}</div>
                    <div className="text-xs text-gray-500 mt-1">&gt; 7 jours</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-5 pt-4 border-b border-gray-100">
                <div className="flex gap-2 overflow-x-auto pb-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            filter === 'all'
                                ? 'bg-[#283852] text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('commercial.paymentReminders.all', 'Tous')} ({stats.total})
                    </button>
                    <button
                        onClick={() => setFilter('overdue')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            filter === 'overdue'
                                ? 'bg-[#283852] text-white'
                                : 'bg-[#283852]/5 text-[#283852] hover:bg-[#283852]/10'
                        }`}
                    >
                        {t('commercial.paymentReminders.overdue', 'En retard')} ({stats.overdue})
                    </button>
                    <button
                        onClick={() => setFilter('dueSoon')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            filter === 'dueSoon'
                                ? 'bg-[#33cbcc] text-white'
                                : 'bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20'
                        }`}
                    >
                        {t('commercial.paymentReminders.dueSoon', 'Échéance proche')} ({stats.dueSoon})
                    </button>
                    <button
                        onClick={() => setFilter('upcoming')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                            filter === 'upcoming'
                                ? 'bg-gray-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {t('commercial.paymentReminders.upcoming', 'À venir')} ({stats.upcoming})
                    </button>
                </div>
            </div>

            {/* Invoice List */}
            <div className="p-5">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-6 h-6 border-2 border-[#33cbcc] border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : displayedInvoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <DollarCircleIcon size={40} strokeWidth={1.2} className="mb-3" />
                        <p className="text-sm">
                            {filter === 'all'
                                ? t('commercial.paymentReminders.noInvoices', 'Aucune facture impayée')
                                : t('commercial.paymentReminders.noInvoicesInCategory', 'Aucune facture dans cette catégorie')}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                        {displayedInvoices.map((invoice, index) => (
                            <motion.div
                                key={invoice.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <PaymentItem
                                    invoice={invoice}
                                    onSelect={() => handleInvoiceSelect(invoice.id)}
                                />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {stats.total > 0 && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">
                            {t('commercial.paymentReminders.totalOutstanding', 'Total impayé')}:
                        </span>
                        <span className="text-base font-bold text-gray-800">
                            {formatFCFA(stats.totalAmount)} FCFA
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
