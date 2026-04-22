import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ExpenseModal from './ExpenseModal';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Plus, FileText, Search, Trash2, Pencil, ChevronLeft, ChevronRight, Briefcase, Users, Tag, TrendingUp, Building2, Layers } from 'lucide-react';
import { useExpenses, useExpenseStats, useDeleteExpense } from '../api/expenses/hooks';
import { useDepartments } from '../api/departments/hooks';
import { useChargeFamilies } from '../api/charge-natures/hooks';
import { ExpensesSkeleton } from '../components/Skeleton';
import type { Expense } from '../api/expenses/types';

const COLORS = ['#33cbcc', '#283852', '#33cbcc99', '#28385280', '#33cbcc50', '#283852', '#33cbcc', '#283852', '#33cbcc99', '#28385280'];

const FAMILY_COLORS: Record<string, string> = {
    CHARGES_PERSONNEL:            '#33cbcc',
    CHARGES_OPERATIONNELLES:      '#283852',
    SOUS_TRAITANCE:               '#f59e0b',
    CHARGES_STRUCTURE:            '#8b5cf6',
    CHARGES_FINANCIERES_FISCALES: '#ef4444',
};

const formatFCFA = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('fr-FR');

const FREQUENCY_LABELS: Record<string, string> = {
    DAILY: 'Quotidienne',
    WEEKLY: 'Hebdomadaire',
    MONTHLY: 'Mensuelle',
    YEARLY: 'Annuelle',
};

export default function Expenses() {
    const [search, setSearch] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDeptId, setSelectedDeptId] = useState<string | undefined>(undefined);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [page, setPage] = useState(1);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { data: departments = [] } = useDepartments();
    const { data: families = [] } = useChargeFamilies();
    const { data: expensesPage, isLoading: expLoading } = useExpenses(page, selectedDeptId);
    const expenses = expensesPage?.data ?? [];
    const totalPages = expensesPage?.totalPages ?? 1;
    const total = expensesPage?.total ?? 0;
    const { data: stats, isLoading: statsLoading } = useExpenseStats(selectedYear, selectedDeptId);
    const deleteExpense = useDeleteExpense();
    const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set());

    const allSeries = stats?.series || [];
    const seriesKey = allSeries.join(',');
    const [prevSeriesKey, setPrevSeriesKey] = useState('');
    if (seriesKey !== prevSeriesKey) {
        setPrevSeriesKey(seriesKey);
        setVisibleSeries(new Set(allSeries));
    }

    const toggleSeries = (name: string) => {
        setVisibleSeries(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const seriesColors: Record<string, string> = useMemo(() => {
        const map: Record<string, string> = {};
        allSeries.forEach((name, i) => { map[name] = COLORS[i % COLORS.length]; });
        return map;
    }, [seriesKey]);

    const familyLabel = (code: string) => families.find(f => f.code === code)?.label ?? code;

    const filteredExpenses = useMemo(() => {
        if (!search) return expenses;
        const q = search.toLowerCase();
        return expenses.filter(e =>
            e.title.toLowerCase().includes(q) ||
            e.chargeNature.toLowerCase().includes(q) ||
            familyLabel(e.chargeFamily).toLowerCase().includes(q) ||
            (e.project?.name || '').toLowerCase().includes(q) ||
            (e.department?.name || '').toLowerCase().includes(q)
        );
    }, [expenses, search, families]);

    const isLoading = expLoading || statsLoading;

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
    };

    const handleDeptChange = (deptId: string | undefined) => {
        setSelectedDeptId(deptId);
        setPage(1);
    };

    if (isLoading) {
        return <ExpensesSkeleton />;
    }

    const selectedDeptName = departments.find(d => d.id === selectedDeptId)?.name;

    // Family breakdown for the 5 families
    const familyBreakdown = (stats?.byFamily || []).map(f => ({
        ...f,
        label: familyLabel(f.code),
        color: FAMILY_COLORS[f.code] || '#33cbcc',
    }));

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Charges</h1>
                    <p className="text-sm text-gray-500 mt-1">Gérez et analysez vos charges d'entreprise</p>
                </div>
                <button
                    onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#33cbcc] text-white rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-sm shadow-[#33cbcc]/20"
                >
                    <Plus size={16} />
                    Nouvelle Charge
                </button>
            </div>

            {/* Department Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-2">
                <button
                    onClick={() => handleDeptChange(undefined)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                        !selectedDeptId
                            ? 'bg-[#33cbcc] text-white border-[#33cbcc] shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#33cbcc]/40 hover:text-[#33cbcc]'
                    }`}
                >
                    <Building2 size={14} />
                    Toutes les départements
                </button>
                {departments.map(dept => (
                    <button
                        key={dept.id}
                        onClick={() => handleDeptChange(dept.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                            selectedDeptId === dept.id
                                ? 'bg-[#33cbcc] text-white border-[#33cbcc] shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-[#33cbcc]/40 hover:text-[#33cbcc]'
                        }`}
                    >
                        {dept.name}
                    </button>
                ))}
            </div>

            {/* Year Selector + Stats Cards */}
            <div className="flex items-center gap-3 mb-2">
                <button
                    onClick={() => setSelectedYear(y => y - 1)}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                >
                    <ChevronLeft size={18} />
                </button>
                <span className="text-lg font-bold text-gray-800 tabular-nums min-w-[60px] text-center">{selectedYear}</span>
                <button
                    onClick={() => setSelectedYear(y => y + 1)}
                    disabled={selectedYear >= new Date().getFullYear()}
                    className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <ChevronRight size={18} />
                </button>
                {selectedDeptName && (
                    <span className="text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 px-3 py-1 rounded-lg">
                        {selectedDeptName}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#33cbcc]/5 rounded-bl-[100px]" />
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Total des Charges</p>
                            <h3 className="text-xl font-bold text-gray-800 truncate">
                                {formatFCFA((stats?.totalYear || 0) + (stats?.totalProjects || 0))}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Charges + salaires + projets</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center text-[#33cbcc] shrink-0">
                            <TrendingUp size={20} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#283852]/5 rounded-bl-[100px]" />
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Charges Directes</p>
                            <h3 className="text-xl font-bold text-gray-800 truncate">{formatFCFA(stats?.totalYear || 0)}</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {stats?.totalCount || 0} transaction{(stats?.totalCount || 0) > 1 ? 's' : ''}
                                {(stats?.recurrentCount || 0) > 0 && ` · ${stats?.recurrentCount} récurrente${(stats?.recurrentCount || 0) > 1 ? 's' : ''}`}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center text-[#283852] shrink-0">
                            <FileText size={20} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#283852]/5 rounded-bl-[100px]" />
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Masse Salariale</p>
                            <h3 className="text-xl font-bold text-gray-800 truncate">{formatFCFA(stats?.totalSalaries || 0)}</h3>
                            <p className="text-xs text-gray-400 mt-1">Total versé en {selectedYear}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center text-[#283852] shrink-0">
                            <Users size={20} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#33cbcc]/5 rounded-bl-[100px]" />
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Budget Projets</p>
                            <h3 className="text-xl font-bold text-gray-800 truncate">{formatFCFA(stats?.totalProjects || 0)}</h3>
                            <p className="text-xs text-gray-400 mt-1">Alloué sur {selectedYear}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center text-[#33cbcc] shrink-0">
                            <Briefcase size={20} />
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-[#283852]/5 rounded-bl-[100px]" />
                    <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1 pr-2">
                            <p className="text-sm font-medium text-gray-500 mb-1">Top Nature</p>
                            <h3 className="text-xl font-bold text-gray-800 truncate">
                                {stats?.byCategory?.[0] ? formatFCFA(stats.byCategory[0].value) : '—'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1 truncate">
                                {stats?.byCategory?.[0]?.name || 'Aucune charge'}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#283852]/10 flex items-center justify-center text-[#283852] shrink-0">
                            <Tag size={20} />
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Family breakdown mini-cards */}
            {familyBreakdown.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Layers size={16} className="text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Répartition par Famille</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {familyBreakdown.map(f => (
                            <div key={f.code} className="flex flex-col gap-1 p-3 rounded-xl" style={{ backgroundColor: f.color + '15', borderLeft: `3px solid ${f.color}` }}>
                                <p className="text-xs font-semibold text-gray-600 leading-tight">{f.label}</p>
                                <p className="text-sm font-bold text-gray-800">{formatFCFA(f.value)}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Multi-Series Line Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Évolution Mensuelle ({selectedYear})</h3>
                        <p className="text-xs text-gray-500 mt-1">Salaires + charges par nature</p>
                    </div>
                </div>
                {allSeries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                        {allSeries.map((name) => {
                            const active = visibleSeries.has(name);
                            const color = seriesColors[name];
                            return (
                                <button
                                    key={name}
                                    onClick={() => toggleSeries(name)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${active
                                        ? 'border-transparent text-white shadow-sm'
                                        : 'border-gray-200 text-gray-400 bg-white hover:bg-gray-50'
                                        }`}
                                    style={active ? { backgroundColor: color } : undefined}
                                >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: active ? '#fff' : color }} />
                                    {name}
                                </button>
                            );
                        })}
                    </div>
                )}
                <div className="h-72">
                    {allSeries.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <LineChart data={stats?.byMonth || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => v === 0 ? '0' : (v / 1000).toFixed(0) + 'k'} dx={-10} />
                                <RechartsTooltip
                                    cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value, name) => [formatFCFA(Number(value) || 0), String(name)]}
                                />
                                {allSeries.map((name) => (
                                    <Line
                                        key={name}
                                        type="monotone"
                                        dataKey={name}
                                        stroke={seriesColors[name]}
                                        strokeWidth={visibleSeries.has(name) ? 2.5 : 0}
                                        dot={visibleSeries.has(name) ? { r: 3, fill: seriesColors[name], strokeWidth: 2, stroke: '#fff' } : false}
                                        activeDot={visibleSeries.has(name) ? { r: 5, strokeWidth: 0 } : false}
                                        hide={!visibleSeries.has(name)}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune donnée pour cette année</div>
                    )}
                </div>
            </motion.div>

            {/* Nature Bar Chart */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Par Nature de Charge</h3>
                <div className="h-64">
                    {(stats?.byCategory?.length || 0) > 0 ? (
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart data={stats?.byCategory || []} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#4B5563', fontWeight: 500 }} width={130} />
                                <RechartsTooltip
                                    cursor={{ fill: '#f9fafb' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value) => [formatFCFA(Number(value) || 0), 'Total']}
                                />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={40}>
                                    {(stats?.byCategory || []).map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 text-sm">Aucune donnée pour cette année</div>
                    )}
                </div>
            </motion.div>

            {/* Charges Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[400px]">
                <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 gap-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FileText size={20} className="text-gray-400" />
                        Historique des Charges
                        {selectedDeptName && (
                            <span className="text-sm font-medium text-[#33cbcc] bg-[#33cbcc]/10 px-2 py-0.5 rounded-lg">{selectedDeptName}</span>
                        )}
                    </h2>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-all bg-white"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold w-1/3">Charge</th>
                                <th className="px-6 py-4 font-semibold">Département</th>
                                <th className="px-6 py-4 font-semibold">Projet</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                <th className="px-6 py-4 w-24 text-center border-l border-gray-100">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredExpenses.map((expense) => {
                                const famColor = FAMILY_COLORS[expense.chargeFamily] || '#33cbcc';
                                return (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-800">{expense.title}</p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: famColor }} />
                                                {expense.chargeNature}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{familyLabel(expense.chargeFamily)}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.department ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#33cbcc]/10 text-[#33cbcc] text-xs font-semibold">
                                                    <Building2 size={11} />
                                                    {expense.department.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.project ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#33cbcc]/10 text-[#33cbcc] text-xs font-semibold">
                                                    <Briefcase size={11} />
                                                    {expense.project.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {expense.source === 'PAYROLL' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#33cbcc]/10 text-[#33cbcc] text-xs font-semibold">
                                                    Paie
                                                </span>
                                            ) : expense.type === 'ONE_TIME' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#283852]/10 text-[#283852] text-xs font-semibold">
                                                    Ponctuelle
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#283852]/10 text-[#283852] text-xs font-semibold">
                                                    {expense.frequency ? FREQUENCY_LABELS[expense.frequency] : 'Récurrente'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                            {formatDate(expense.date)}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800 text-right whitespace-nowrap">
                                            {formatFCFA(expense.amount)}
                                        </td>
                                        <td className="px-2">
                                            <div className="flex justify-center items-center gap-1 h-[72px] border-l border-transparent group-hover:border-gray-100 group-hover:bg-gray-100/50 transition-colors">
                                                {confirmDeleteId === expense.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => { deleteExpense.mutate(expense.id); setConfirmDeleteId(null); }}
                                                            className="p-1.5 text-white bg-[#283852] hover:bg-[#283852]/80 rounded-lg transition-colors text-[10px] font-semibold px-2"
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-[10px] font-semibold px-2"
                                                        >
                                                            ✕
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(expense)}
                                                            className="p-2 text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 rounded-lg transition-colors"
                                                            title="Modifier"
                                                        >
                                                            <Pencil size={15} />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDeleteId(expense.id)}
                                                            className="p-2 text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 rounded-lg transition-colors"
                                                            title="Supprimer"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredExpenses.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center bg-gray-50/30">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                                <FileText size={18} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium text-gray-500">
                                                {search ? 'Aucun résultat pour « ' + search + ' »' : 'Aucune charge enregistrée'}
                                            </p>
                                            {!search && (
                                                <button
                                                    onClick={() => { setEditingExpense(null); setIsModalOpen(true); }}
                                                    className="text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                                                >
                                                    + Ajouter la première charge
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <p className="text-xs text-gray-500">
                            {total} charge{total > 1 ? 's' : ''} · page {page} / {totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={15} />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                                        p === page ? 'bg-[#33cbcc] text-white' : 'border border-gray-200 text-gray-600 hover:bg-white'
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 rounded-lg border border-gray-200 hover:bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ExpenseModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                expense={editingExpense}
                defaultDepartmentId={selectedDeptId}
            />
        </div>
    );
}
