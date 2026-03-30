import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    DollarSign,
    Clock,
    AlertTriangle,
    Receipt,
    Briefcase,
    Building,
    FileText,
    Link,
    CheckCircle,
    Send,
    XCircle,
    TrendingUp,
    Loader2,
    Save
} from 'lucide-react';
import type { ClientTab } from '../components/ClientDetailSidebar';
import type { ClientData } from '../layouts/ClientDetailLayout';
import { useUpdateClient } from '../api/clients/hooks';
import { useSendInvoice, usePayInvoice, useRejectInvoice } from '../api/invoices/hooks';
import { useDepartments } from '../api/departments/hooks';
import { useAuth } from '../contexts/AuthContext';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/* ─── Helpers ──────────────────────────────────────────── */

const fmtCurrency = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M FCFA`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K FCFA`;
    return `${n.toFixed(0)} FCFA`;
};

const fmtDate = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const INVOICE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    CREATED: { bg: 'bg-gray-100', text: 'text-gray-600' },
    SENT: { bg: 'bg-[#283852]/10', text: 'text-[#283852]' },
    PAID: { bg: 'bg-[#283852]', text: 'text-white' },
    REJECTED: { bg: 'bg-gray-100', text: 'text-gray-400' },
};

/* ═══════════════════════════════════════════════════════════
   OVERVIEW TAB
   ═══════════════════════════════════════════════════════════ */

const OverviewView = ({ client }: { client: ClientData }) => {
    const { t } = useTranslation();

    const stats = [
        { label: t('clientDetail.overview.totalPaid'), value: fmtCurrency(client.totalPaid), icon: DollarSign, color: '#33cbcc' },
        { label: t('clientDetail.overview.pendingPayments'), value: fmtCurrency(client.totalPending), icon: Clock, color: '#283852' },
        { label: t('clientDetail.overview.overdue'), value: client.overdueCount, icon: AlertTriangle, color: '#283852' },
        { label: t('clientDetail.overview.totalInvoices'), value: client.invoices.length, icon: Receipt, color: '#283852' },
    ];

    /* Revenue over time */
    const revenueData = useMemo(() => {
        const counts: Record<string, number> = {};
        client.invoices.forEach(inv => {
            if (inv.status !== 'PAID' || !inv.paidAt) return;
            const d = new Date(inv.paidAt);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + inv.total;
        });
        const months: { month: string; revenue: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            months.push({ month: label, revenue: Math.round(counts[key] || 0) });
        }
        return months;
    }, [client.invoices]);

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">{t('clientDetail.overview.title')}</h2>

            {/* Financial stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Revenue chart + Client info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t('clientDetail.overview.revenueOverTime')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorClientDetailRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#33cbcc" strokeWidth={2} fill="url(#colorClientDetailRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 space-y-4"
                >
                    <h3 className="text-lg font-bold text-gray-800">{t('clientDetail.overview.clientInfo')}</h3>

                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Building size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('clientDetail.overview.department')}</p>
                                <p className="text-sm font-medium text-gray-800">{client.department || '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <DollarSign size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('clientDetail.overview.price')}</p>
                                <p className="text-sm font-medium text-gray-800">{client.price ? `${client.price} FCFA` : '—'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <Briefcase size={16} className="text-gray-400" />
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('clientDetail.overview.type')}</p>
                                <p className="text-sm font-medium text-gray-800">
                                    {client.type === 'subscription' ? t('clients.typeSubscription') : t('clients.typeOneTime')}
                                </p>
                            </div>
                        </div>
                        {client.projectDescription && (
                            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                                <FileText size={16} className="text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">{t('clientDetail.overview.projectDescription')}</p>
                                    <p className="text-sm text-gray-600">{client.projectDescription}</p>
                                </div>
                            </div>
                        )}
                        {(client.srs || client.contract) && (
                            <div className="flex items-center gap-3">
                                {client.srs && (
                                    <a href={client.srs} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#33cbcc] hover:underline">
                                        <Link size={12} /> SRS
                                    </a>
                                )}
                                {client.contract && (
                                    <a href={client.contract} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#33cbcc] hover:underline">
                                        <Link size={12} /> {t('clientDetail.overview.contract')}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   INVOICES TAB
   ═══════════════════════════════════════════════════════════ */

const InvoicesView = ({ client }: { client: ClientData }) => {
    const { t } = useTranslation();
    const sendInvoice = useSendInvoice();
    const payInvoice = usePayInvoice();
    const rejectInvoice = useRejectInvoice();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('clientDetail.invoices.title')}</h2>

            {client.invoices.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('clientDetail.invoices.empty')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {client.invoices.map((inv, i) => {
                        const style = INVOICE_STATUS_STYLES[inv.status] || INVOICE_STATUS_STYLES.CREATED;
                        const isOverdue = inv.status === 'SENT' && inv.dueDate && new Date(inv.dueDate) < new Date();
                        return (
                            <motion.div
                                key={inv.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                                            <Receipt size={18} className="text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-gray-400">{inv.project || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                                            {t(`clientDetail.invoices.status.${inv.status.toLowerCase()}`)}
                                        </span>
                                        {isOverdue && (
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">
                                                {t('clientDetail.invoices.overdue')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-6 text-xs text-gray-400">
                                        <span>{t('clientDetail.invoices.issued')}: {fmtDate(inv.issueDate)}</span>
                                        <span>{t('clientDetail.invoices.due')}: {fmtDate(inv.dueDate)}</span>
                                        {inv.paidAt && <span className="text-[#33cbcc]">{t('clientDetail.invoices.paidOn')}: {fmtDate(inv.paidAt)}</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-bold text-gray-800">{fmtCurrency(inv.total)}</span>
                                        <div className="flex items-center gap-1">
                                            {inv.status === 'CREATED' && (
                                                <button
                                                    onClick={() => sendInvoice.mutate(inv.id)}
                                                    className="p-1.5 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                                    title={t('clientDetail.invoices.send')}
                                                >
                                                    <Send size={14} />
                                                </button>
                                            )}
                                            {inv.status === 'SENT' && (
                                                <>
                                                    <button
                                                        onClick={() => payInvoice.mutate(inv.id)}
                                                        className="p-1.5 rounded-lg hover:bg-[#33cbcc]/10 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                                        title={t('clientDetail.invoices.markPaid')}
                                                    >
                                                        <CheckCircle size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => rejectInvoice.mutate(inv.id)}
                                                        className="p-1.5 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                                        title={t('clientDetail.invoices.reject')}
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   PROJECTS TAB
   ═══════════════════════════════════════════════════════════ */

const ProjectsView = ({ client }: { client: ClientData }) => {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('clientDetail.projects.title')}</h2>

            {client.projects.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('clientDetail.projects.empty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {client.projects.map((project, i) => {
                        const tasks = project.tasks || [];
                        const done = tasks.filter(tk => tk.state === 'COMPLETED' || tk.state === 'REVIEWED').length;
                        const progress = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
                        const members = project.members || [];

                        return (
                            <motion.div
                                key={project.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-gray-200 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 text-sm">{project.name}</h3>
                                        {project.description && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{project.description}</p>
                                        )}
                                    </div>
                                    {(project.budget > 0 || project.revenue > 0) && (
                                        <div className="text-right">
                                            {project.budget > 0 && (
                                                <p className="text-xs text-gray-400">{fmtCurrency(project.budget)} coût</p>
                                            )}
                                            {project.revenue > 0 && (
                                                <p className="text-xs font-semibold text-[#33cbcc]">{fmtCurrency(project.revenue)} rev.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Progress bar */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                        <span>{t('clientDetail.projects.progress')}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${progress}%`,
                                                backgroundColor: '#33cbcc',
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <TrendingUp size={12} />
                                        <span>{done}/{tasks.length} {t('clientDetail.projects.tasks')}</span>
                                    </div>
                                    {members.length > 0 && (
                                        <div className="flex items-center">
                                            <div className="flex -space-x-2">
                                                {members.slice(0, 3).map(m => (
                                                    <img
                                                        key={m.id}
                                                        src={m.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.firstName + '+' + m.lastName)}&background=33cbcc&color=fff&size=24`}
                                                        alt=""
                                                        className="w-6 h-6 rounded-full border-2 border-white"
                                                    />
                                                ))}
                                            </div>
                                            {members.length > 3 && (
                                                <span className="text-[10px] text-gray-400 ml-1">+{members.length - 3}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   SETTINGS TAB
   ═══════════════════════════════════════════════════════════ */

const SettingsView = ({ client }: { client: ClientData }) => {
    const { t } = useTranslation();
    const { role } = useAuth();
    const updateClient = useUpdateClient();
    const { data: departments } = useDepartments();

    const [form, setForm] = useState({
        name: client.name,
        type: client.type,
        projectDescription: client.projectDescription,
        price: client.price,
        srs: client.srs,
        contract: client.contract,
        departmentId: client.departmentId,
    });

    const handleSave = () => {
        updateClient.mutate({ id: client.id, dto: form });
    };

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{t('clientDetail.settings.title')}</h2>
                <button
                    onClick={handleSave}
                    disabled={updateClient.isPending}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    {updateClient.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {t('clientDetail.settings.save')}
                </button>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-100 p-6 space-y-5"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelCls}>{t('clients.name')}</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>{t('clients.type')}</label>
                        <select
                            value={form.type}
                            onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'one_time' | 'subscription' }))}
                            className={selectCls}
                        >
                            <option value="one_time">{t('clients.typeOneTime')}</option>
                            <option value="subscription">{t('clients.typeSubscription')}</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelCls}>{t('clients.department')}</label>
                        <select
                            value={form.departmentId}
                            onChange={e => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                            className={selectCls}
                            disabled={role === 'HEAD_OF_DEPARTMENT'}
                        >
                            <option value="">{t('clients.departmentPlaceholder')}</option>
                            {(departments || []).map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>{t('clients.price')}</label>
                        <input
                            type="text"
                            value={form.price}
                            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                            className={inputCls}
                        />
                    </div>
                </div>

                <div>
                    <label className={labelCls}>{t('clients.projectDescription')}</label>
                    <textarea
                        value={form.projectDescription}
                        onChange={e => setForm(prev => ({ ...prev, projectDescription: e.target.value }))}
                        rows={4}
                        className={inputCls + ' resize-none'}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className={labelCls}>SRS</label>
                        <input
                            type="text"
                            value={form.srs}
                            onChange={e => setForm(prev => ({ ...prev, srs: e.target.value }))}
                            placeholder="https://..."
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className={labelCls}>{t('clientDetail.overview.contract')}</label>
                        <input
                            type="text"
                            value={form.contract}
                            onChange={e => setForm(prev => ({ ...prev, contract: e.target.value }))}
                            placeholder="https://..."
                            className={inputCls}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════════ */

interface ClientDetailProps {
    client: ClientData;
    activeTab: ClientTab;
}

const ClientDetail = ({ client, activeTab }: ClientDetailProps) => {
    switch (activeTab) {
        case 'overview':
            return <OverviewView client={client} />;
        case 'invoices':
            return <InvoicesView client={client} />;
        case 'projects':
            return <ProjectsView client={client} />;
        case 'settings':
            return <SettingsView client={client} />;
        default:
            return <OverviewView client={client} />;
    }
};

export default ClientDetail;
