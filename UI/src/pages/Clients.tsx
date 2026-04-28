import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search01Icon, Add01Icon, Cancel01Icon, Building01Icon, DashboardSquare01Icon, ListViewIcon, UserCircleIcon, Briefcase01Icon, DollarCircleIcon, RefreshIcon, RepeatIcon, Loading02Icon, Delete02Icon, PencilIcon, ArrowUpRight01Icon } from 'hugeicons-react';
import { useInfiniteClients, useCreateClient, useUpdateClient, useDeleteClient } from '../api/clients/hooks';
import { ClientsSkeleton } from '../components/Skeleton';
import { useInvoices } from '../api/invoices/hooks';
import { useDepartments } from '../api/departments/hooks';
import { useAuth, useDepartmentScope } from '../contexts/AuthContext';
import type { Client, CreateClientDto, UpdateClientDto } from '../api/clients/types';
import {
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

/* ─── Constants ─────────────────────────────────────────── */

const TYPE_COLORS: Record<string, string> = {
    one_time: '#283852',
    subscription: '#33cbcc',
};

/* ─── Create/Edit Client Modal ──────────────────────────── */

const ClientModal = ({
    onClose,
    client,
}: {
    onClose: () => void;
    client?: Client | null;
}) => {
    const { t } = useTranslation();
    const createClient = useCreateClient();
    const updateClient = useUpdateClient();
    const { data: departments } = useDepartments();
    const deptScope = useDepartmentScope();

    const [form, setForm] = useState<CreateClientDto>({
        name: client?.name || '',
        projectDescription: client?.projectDescription || '',
        price: client?.price || '',
        srs: client?.srs || '',
        contract: client?.contract || '',
        type: client?.type || 'one_time',
        departmentId: client?.departmentId || deptScope || '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const isValid = form.name.trim().length > 0;

    const handleSubmit = () => {
        if (!isValid) return;
        if (client) {
            updateClient.mutate({ id: client.id, dto: form as UpdateClientDto }, { onSuccess: () => onClose() });
        } else {
            createClient.mutate(form, { onSuccess: () => onClose() });
        }
    };

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <UserCircleIcon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {client ? t('clients.editTitle') : t('clients.createTitle')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div>
                        <label className={labelCls}>
                            <UserCircleIcon size={12} />
                            {t('clients.name')}
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('clients.namePlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <RepeatIcon size={12} />
                                {t('clients.type')}
                            </label>
                            <select
                                value={form.type}
                                onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'one_time' | 'subscription' }))}
                                className={selectCls}
                            >
                                <option value="one_time">{t('clients.typeOneTime')}</option>
                                <option value="subscription">{t('clients.typeSubscription')}</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Building01Icon size={12} />
                                {t('clients.department')}
                            </label>
                            <select
                                value={form.departmentId}
                                onChange={e => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                                className={selectCls}
                                disabled={!!deptScope}
                            >
                                <option value="">{t('clients.departmentPlaceholder')}</option>
                                {(departments || []).map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>
                            <DollarCircleIcon size={12} />
                            {t('clients.price')}
                        </label>
                        <input
                            type="text"
                            value={form.price}
                            onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                            placeholder="e.g. 5000"
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            <Briefcase01Icon size={12} />
                            {t('clients.projectDescription')}
                        </label>
                        <textarea
                            value={form.projectDescription}
                            onChange={e => setForm(prev => ({ ...prev, projectDescription: e.target.value }))}
                            placeholder={t('clients.projectDescriptionPlaceholder')}
                            rows={3}
                            className={inputCls + ' resize-none'}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('clients.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createClient.isPending || updateClient.isPending}
                        onClick={handleSubmit}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {(createClient.isPending || updateClient.isPending) ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {client ? t('clients.save') : t('clients.create')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Clients = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { role } = useAuth();
    const deptScope = useDepartmentScope();
    const isManager = role === 'MANAGER';

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'one_time' | 'subscription'>('all');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const clientsQuery = useInfiniteClients({
        departmentId: deptScope || filterDepartment || undefined,
        search: debouncedSearch || undefined,
    });
    const { data: apiInvoices } = useInvoices(deptScope);
    const { data: departments } = useDepartments();
    const deleteClient = useDeleteClient();

    const isLoading = clientsQuery.isPending;
    const clients: Client[] = clientsQuery.data?.pages.flatMap(p => p.rows) || [];
    const invoices = apiInvoices || [];

    const sentinelRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && clientsQuery.hasNextPage && !clientsQuery.isFetchingNextPage) {
                clientsQuery.fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [clientsQuery.hasNextPage, clientsQuery.isFetchingNextPage, clientsQuery.fetchNextPage]);

    /* Client revenue map */
    const clientRevenue = useMemo(() => {
        const map: Record<string, { paid: number; pending: number }> = {};
        invoices.forEach(inv => {
            if (!inv.clientId) return;
            if (!map[inv.clientId]) map[inv.clientId] = { paid: 0, pending: 0 };
            if (inv.status === 'PAID') {
                map[inv.clientId].paid += Number(inv.total);
            } else if (inv.status !== 'REJECTED') {
                map[inv.clientId].pending += Number(inv.total);
            }
        });
        return map;
    }, [invoices]);

    const activityData = useMemo(() => {
        const counts: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.status !== 'PAID' || !inv.paidAt) return;
            const d = new Date(inv.paidAt);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + Number(inv.total);
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
    }, [invoices]);

    if (isLoading) {
        return <ClientsSkeleton />;
    }

    /* Filters — search & dept are server-side; type is client-side */
    const filteredClients = filterType === 'all'
        ? clients
        : clients.filter(c => c.type === filterType);

    /* Stats */
    const subscriptionCount = clients.filter(c => c.type === 'subscription').length;
    const oneTimeCount = clients.filter(c => c.type === 'one_time').length;
    const totalRevenue = Object.values(clientRevenue).reduce((s, r) => s + r.paid, 0);

    const fmtCurrency = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
        return n.toFixed(0);
    };

    const stats = [
        { label: t('clients.stats.total'), value: clients.length, icon: UserCircleIcon, color: '#33cbcc' },
        { label: t('clients.stats.subscription'), value: subscriptionCount, icon: RefreshIcon, color: '#33cbcc' },
        { label: t('clients.stats.oneTime'), value: oneTimeCount, icon: Briefcase01Icon, color: '#283852' },
        { label: t('clients.stats.revenue'), value: fmtCurrency(totalRevenue), icon: DollarCircleIcon, color: '#33cbcc' },
    ];

    /* Chart data */
    const typeChartData = [
        { name: t('clients.typeOneTime'), value: oneTimeCount, color: '#283852' },
        { name: t('clients.typeSubscription'), value: subscriptionCount, color: '#33cbcc' },
    ];

    /* Type filters */
    const typeFilters: { key: 'all' | 'one_time' | 'subscription'; label: string }[] = [
        { key: 'all', label: t('clients.filterAll') },
        { key: 'one_time', label: t('clients.typeOneTime') },
        { key: 'subscription', label: t('clients.typeSubscription') },
    ];

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm(t('clients.confirmDelete'))) {
            deleteClient.mutate(id);
        }
    };

    const handleEdit = (e: React.MouseEvent, client: Client) => {
        e.stopPropagation();
        setEditingClient(client);
    };

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('clients.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('clients.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Add01Icon size={16} />
                    {t('clients.newClient')}
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="border border-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                    >
                        <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
                        </div>
                        <div className="p-5 bg-white relative overflow-hidden">
                            <h2 className="text-3xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                <stat.icon size={110} strokeWidth={1.2} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Clients by Type — PieChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('clients.charts.byType')}</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={typeChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={4}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {typeChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-gray-400">{t('clients.stats.total')}</p>
                                <p className="text-2xl font-bold text-gray-800">{clients.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {typeChartData.map(d => (
                            <div key={d.name} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-gray-500">{d.name} ({d.value})</span>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Revenue Activity — AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('clients.charts.revenueActivity')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorClientRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="revenue" stroke="#33cbcc" strokeWidth={2} fill="url(#colorClientRevenue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* ── Search01Icon + Filters ── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3.5 focus-within:border-[#33cbcc] transition-colors">
                    <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                    <input
                        type="text"
                        placeholder={t('clients.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                    />
                </div>

                <div className="flex items-center gap-3">
                    {!deptScope && (
                        <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm min-w-0">
                            <Building01Icon className="text-gray-400 ml-2 shrink-0" size={18} />
                            <select
                                value={filterDepartment}
                                onChange={e => setFilterDepartment(e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 px-2 text-sm appearance-none cursor-pointer"
                            >
                                <option value="">{t('clients.allDepartments')}</option>
                                {(departments || []).map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex bg-white rounded-xl border border-gray-100 p-1 shrink-0">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <DashboardSquare01Icon size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ListViewIcon size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Type Filters ── */}
            <div className="flex gap-2 flex-wrap">
                {typeFilters.map(tf => (
                    <button
                        key={tf.key}
                        onClick={() => setFilterType(tf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterType === tf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {tf.key !== 'all' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: filterType === tf.key ? '#fff' : TYPE_COLORS[tf.key] }}
                            />
                        )}
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* ── Grid View ── */}
            {viewMode === 'grid' && filteredClients.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredClients.map((client, i) => {
                        const rev = clientRevenue[client.id] || { paid: 0, pending: 0 };
                        return (
                            <motion.div
                                key={client.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="bg-white rounded-3xl p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all cursor-pointer"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                                        <UserCircleIcon size={24} className="text-[#33cbcc]" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={e => handleEdit(e, client)}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <PencilIcon size={14} />
                                        </button>
                                        {isManager && (
                                            <button
                                                onClick={e => handleDelete(e, client.id)}
                                                disabled={deleteClient.isPending}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#283852] transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {deleteClient.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Delete02Icon size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-800 text-sm truncate mb-2">{client.name}</h3>

                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{
                                            backgroundColor: `${TYPE_COLORS[client.type]}15`,
                                            color: TYPE_COLORS[client.type],
                                        }}
                                    >
                                        {client.type === 'subscription' ? t('clients.typeSubscription') : t('clients.typeOneTime')}
                                    </span>
                                    {client.price && (
                                        <span className="text-xs text-gray-500 font-medium">{client.price} FCFA</span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 min-w-0">
                                        <Building01Icon size={12} className="shrink-0" />
                                        <span className="truncate">{client.department?.name || '—'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {rev.paid > 0 && (
                                            <span className="text-xs text-[#33cbcc] font-medium flex items-center gap-1">
                                                <ArrowUpRight01Icon size={10} />
                                                {fmtCurrency(rev.paid)}
                                            </span>
                                        )}
                                        {rev.pending > 0 && (
                                            <span className="text-xs text-[#283852] font-medium">
                                                {fmtCurrency(rev.pending)} pending
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── ListViewIcon View ── */}
            {viewMode === 'list' && filteredClients.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-3">{t('clients.table.name')}</div>
                        <div className="col-span-2">{t('clients.table.type')}</div>
                        <div className="col-span-2">{t('clients.table.department')}</div>
                        <div className="col-span-1">{t('clients.table.price')}</div>
                        <div className="col-span-2">{t('clients.table.revenue')}</div>
                        <div className="col-span-2">{t('clients.table.actions')}</div>
                    </div>
                    {filteredClients.map((client, i) => {
                        const rev = clientRevenue[client.id] || { paid: 0, pending: 0 };
                        return (
                            <motion.div
                                key={client.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => navigate(`/clients/${client.id}`)}
                                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
                            >
                                <div className="col-span-3 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                                        <UserCircleIcon size={18} className="text-[#33cbcc]" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 truncate">{client.name}</span>
                                </div>
                                <div className="col-span-2">
                                    <span
                                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                        style={{
                                            backgroundColor: `${TYPE_COLORS[client.type]}15`,
                                            color: TYPE_COLORS[client.type],
                                        }}
                                    >
                                        {client.type === 'subscription' ? t('clients.typeSubscription') : t('clients.typeOneTime')}
                                    </span>
                                </div>
                                <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
                                    <Building01Icon size={12} className="shrink-0" />
                                    <span className="truncate">{client.department?.name || '—'}</span>
                                </div>
                                <div className="col-span-1 text-sm text-gray-600 font-medium">{client.price || '—'}</div>
                                <div className="col-span-2 flex items-center gap-3">
                                    {rev.paid > 0 && (
                                        <span className="text-xs text-[#33cbcc] font-medium">{fmtCurrency(rev.paid)} paid</span>
                                    )}
                                    {rev.pending > 0 && (
                                        <span className="text-xs text-[#283852] font-medium">{fmtCurrency(rev.pending)} pending</span>
                                    )}
                                    {!rev.paid && !rev.pending && <span className="text-xs text-gray-300">—</span>}
                                </div>
                                <div className="col-span-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={e => handleEdit(e, client)}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <PencilIcon size={14} />
                                    </button>
                                    {isManager && (
                                        <button
                                            onClick={e => handleDelete(e, client.id)}
                                            disabled={deleteClient.isPending}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#283852] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {deleteClient.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Delete02Icon size={14} />}
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Scroll sentinel ── */}
            <div ref={sentinelRef} className="h-1" />
            {clientsQuery.isFetchingNextPage && (
                <div className="flex justify-center py-4">
                    <Loading02Icon size={20} className="animate-spin text-[#33cbcc]" />
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredClients.length === 0 && !isLoading && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <UserCircleIcon size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('clients.noResults')}</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-xl hover:bg-[#2bb5b6] transition-colors"
                    >
                        {t('clients.newClient')}
                    </button>
                </div>
            )}

            {/* ── Modals ── */}
            <AnimatePresence>
                {showCreateModal && (
                    <ClientModal onClose={() => setShowCreateModal(false)} />
                )}
                {editingClient && (
                    <ClientModal client={editingClient} onClose={() => setEditingClient(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Clients;
