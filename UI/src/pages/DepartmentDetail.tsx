import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserGroupIcon, Folder01Icon, Wallet01Icon, ArrowUpRight01Icon, CrownIcon, Briefcase01Icon, Building01Icon, ArrowRight01Icon, ArrowDown01Icon, Add01Icon, Cancel01Icon, Search01Icon, Calendar01Icon, DollarCircleIcon, Upload01Icon, File01Icon, Delete02Icon, Loading02Icon, AlignLeftIcon, Tick01Icon, AccountSetting01Icon, PencilIcon, ToggleOffIcon, ToggleOnIcon, Target01Icon, ArrowLeft01Icon, Car01Icon, RefreshIcon, Wrench01Icon, Location01Icon } from 'hugeicons-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar
} from 'recharts';
import type { DepartmentTab } from '../components/DepartmentDetailSidebar';
import type { Department, DeptEmployee } from '../layouts/DepartmentDetailLayout';
import { useEmployees } from '../api/employees/hooks';
import { useProjects, useCreateProject } from '../api/projects/hooks';
import { useTasks } from '../api/tasks/hooks';
import { useInvoices, useInvoiceStats } from '../api/invoices/hooks';
import { useClients, useCreateClient } from '../api/clients/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';
import { useUpdateDepartment, useDepartmentServices, useCreateDepartmentService, useUpdateDepartmentService, useDeleteDepartmentService, useMonthlyStats, useUpsertMonthlyTarget } from '../api/departments/hooks';
import { useCarwashOverview, useCarwashDailyStats, useCarwashStations, useTriggerCarwashSync, useCarwashSyncStatus } from '../api/carwash/hooks';
import ExpenseModal from './ExpenseModal';

const LIS_CARWASH_DEPT_ID = '7610e7a2-8ace-4d02-bd68-8394b71615e7';

function formatFCFA(n: number) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n || 0);
}

/** Tiny bar chart (no dependencies beyond recharts which is already imported) */
function MiniRevChart({ data }: { data: { date: string; revenue: number }[] }) {
    if (!data.length) return <div className="h-20 flex items-center justify-center text-gray-400 text-xs">Aucune donnée</div>;
    const max = Math.max(...data.map(d => d.revenue), 1);
    return (
        <div className="flex items-end gap-0.5 h-20">
            {data.slice(-30).map((d, i) => (
                <div key={i} title={`${d.date}: ${formatFCFA(d.revenue)}`}
                    className="flex-1 bg-[#33cbcc] rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: Math.max(2, (d.revenue / max) * 72) }} />
            ))}
        </div>
    );
}

const CARWASH_PERIODS = [
    { key: 'today', label: "Aujourd'hui" },
    { key: 'week',  label: '7 jours' },
    { key: 'month', label: 'Ce mois' },
    { key: 'year',  label: 'Cette année' },
];

function buildRange(period: string) {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    if (period === 'today') return { startDate: fmt(today), endDate: fmt(today) };
    if (period === 'week')  { const s = new Date(today); s.setDate(today.getDate() - 6); return { startDate: fmt(s), endDate: fmt(today) }; }
    if (period === 'year')  return { startDate: `${today.getFullYear()}-01-01`, endDate: fmt(today) };
    return { startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], endDate: fmt(today) };
}

/** Carwash stats block — shown in budget + overview for LIS CARWASH dept */
const CarwashDeptBlock = () => {
    const [activePeriod, setActivePeriod]           = useState('month');
    const [selectedStationId, setSelectedStationId] = useState<number | undefined>(undefined);
    const [showExpenseModal, setShowExpenseModal]    = useState(false);

    const { data: stations = [] } = useCarwashStations();
    const { data: syncStatus }    = useCarwashSyncStatus();
    const triggerSync             = useTriggerCarwashSync();

    const queryParams = useMemo(() => ({
        ...buildRange(activePeriod),
        ...(selectedStationId !== undefined ? { stationId: selectedStationId } : {}),
    }), [activePeriod, selectedStationId]);

    const { data: overview, isLoading } = useCarwashOverview(queryParams);
    const { data: dailyStats = [] }     = useCarwashDailyStats(queryParams);

    const revenueChartData = useMemo(() =>
        dailyStats.map(s => ({ date: s.date, revenue: Number(s.revenue) || 0 })),
    [dailyStats]);

    const lastSyncLabel = useMemo(() => {
        if (!syncStatus?.lastSync) return 'Jamais';
        return new Date(syncStatus.lastSync.syncedAt).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
        });
    }, [syncStatus]);

    const toggleStation = (id: number) =>
        setSelectedStationId(prev => prev === id ? undefined : id);

    return (
        <div className="space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Car01Icon className="w-5 h-5 text-[#33cbcc]" />
                    <h3 className="text-lg font-bold text-[#283852]">Performance LIS CARWASH</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        Synchro {lastSyncLabel}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => triggerSync.mutate()}
                        disabled={syncStatus?.syncing || triggerSync.isPending}
                        className="flex items-center gap-1 text-xs bg-[#33cbcc] text-white px-3 py-1.5 rounded-lg hover:bg-[#2ab5b6] disabled:opacity-50 transition-colors">
                        <RefreshIcon className={`w-3.5 h-3.5 ${syncStatus?.syncing ? 'animate-spin' : ''}`} />
                        Actualiser
                    </button>
                    <button onClick={() => setShowExpenseModal(true)}
                        className="flex items-center gap-1 text-xs bg-[#283852] text-white px-3 py-1.5 rounded-lg hover:bg-[#1e2d3d] transition-colors">
                        <Add01Icon className="w-3.5 h-3.5" />
                        Ajouter charge
                    </button>
                </div>
            </div>

            {/* Filter row: period + stations */}
            <div className="flex flex-wrap items-center gap-2">
                {/* Period tabs */}
                <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                    {CARWASH_PERIODS.map(p => (
                        <button key={p.key} onClick={() => setActivePeriod(p.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${activePeriod === p.key ? 'bg-white text-[#283852] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Station chips */}
                {stations.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-gray-400 font-medium">Station :</span>
                        <button onClick={() => setSelectedStationId(undefined)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedStationId === undefined ? 'bg-[#283852] text-white border-[#283852]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#283852] hover:text-[#283852]'}`}>
                            Toutes
                        </button>
                        {stations.map(st => (
                            <button key={st.id} onClick={() => toggleStation(st.id)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${selectedStationId === st.id ? 'bg-[#33cbcc] text-white border-[#33cbcc]' : 'bg-white text-gray-500 border-gray-200 hover:border-[#33cbcc] hover:text-[#33cbcc]'}`}>
                                {st.nom}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'CA Réalisé',      value: isLoading ? '…' : formatFCFA(overview?.totalRevenue ?? 0),                                                   icon: ArrowUpRight01Icon, color: 'text-[#33cbcc]',    bg: 'bg-[#33cbcc]/10' },
                    { label: 'Charges',          value: isLoading ? '…' : formatFCFA(overview?.totalExpenses ?? 0),                                                  icon: Wrench01Icon,     color: 'text-orange-500',  bg: 'bg-orange-50' },
                    { label: 'Voitures lavées',  value: isLoading ? '…' : String(overview?.totalVehicles ?? 0),                                                      icon: Car01Icon,        color: 'text-[#283852]',   bg: 'bg-[#283852]/10' },
                    { label: 'Résultat',         value: isLoading ? '…' : formatFCFA((overview?.totalRevenue ?? 0) - (overview?.totalExpenses ?? 0)),                icon: DollarCircleIcon, color: 'text-green-600',   bg: 'bg-green-50' },
                ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm">
                        <div className={`${s.bg} p-2.5 rounded-xl flex-shrink-0`}>
                            <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500">{s.label}</p>
                            <p className="text-lg font-bold text-[#283852] mt-0.5">{s.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Revenue chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <p className="text-sm font-semibold text-[#283852] mb-3">
                    Évolution des recettes
                    {selectedStationId !== undefined && (
                        <span className="ml-2 text-xs font-normal text-[#33cbcc]">
                            — {stations.find(s => s.id === selectedStationId)?.nom}
                        </span>
                    )}
                </p>
                <MiniRevChart data={revenueChartData} />
            </div>

            {/* Station cards — clickable to filter */}
            {stations.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {stations.map(st => {
                        const isSelected = selectedStationId === st.id;
                        return (
                            <button key={st.id} onClick={() => toggleStation(st.id)} className="text-left w-full">
                                <div className={`bg-white rounded-2xl border-2 p-4 shadow-sm transition-all ${isSelected ? 'border-[#33cbcc] shadow-[#33cbcc]/20' : 'border-gray-100 hover:border-gray-200'}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-semibold text-[#283852]">{st.nom}</p>
                                            {st.town && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Location01Icon className="w-3 h-3" />{st.adresse ? `${st.adresse}, ` : ''}{st.town}</p>}
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {st.status === 'active' ? 'Active' : st.status}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex gap-4 text-sm">
                                        <span><strong>{st.employeeCount}</strong> <span className="text-gray-400 text-xs">employés</span></span>
                                        {st.managerName && <span className="text-gray-500 text-xs">Manager: <strong>{st.managerName}</strong></span>}
                                    </div>
                                    {isSelected && (
                                        <p className="mt-2 text-[10px] text-[#33cbcc] font-medium">Filtre actif — cliquez pour tout afficher</p>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {showExpenseModal && (
                <ExpenseModal
                    isOpen={showExpenseModal}
                    onClose={() => setShowExpenseModal(false)}
                    defaultDepartmentId={LIS_CARWASH_DEPT_ID}
                />
            )}
        </div>
    );
};

/* ─── Status helpers ────────────────────────────────────── */

const PROJECT_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: 'bg-[#33cbcc]/10',  text: 'text-[#33cbcc]',  dot: 'bg-[#33cbcc]' },
    completed: { bg: 'bg-[#283852]',     text: 'text-white',       dot: 'bg-white' },
    on_hold:   { bg: 'bg-[#283852]/10',  text: 'text-[#283852]',   dot: 'bg-[#283852]' },
    overdue:   { bg: 'bg-[#283852]/10',  text: 'text-[#283852]',   dot: 'bg-[#283852]' },
};

const STATUS_I18N: Record<string, string> = {
    active: 'statusActive',
    completed: 'statusCompleted',
    on_hold: 'statusOnHold',
    overdue: 'statusOverdue',
};

/* ─── Helpers ──────────────────────────────────────────── */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ROLE_COLORS = ['#283852', '#3d5a7a', '#52789f', '#6895c4', '#83b0d8', '#9dcae6', '#b8dff0'];
const BAR_COLORS = ['#283852', '#3d5a7a', '#52789f', '#6895c4', '#83b0d8'];

/* ─── Add Member Modal ─────────────────────────────────── */

const AddMemberModal = ({
    department,
    onClose,
    onAdd,
}: {
    department: Department;
    onClose: () => void;
    onAdd: (emp: DeptEmployee) => void;
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const deptScope = useDepartmentScope();
    const { data: apiEmployees } = useEmployees(deptScope);

    const allEmployees = useMemo(() => {
        return (apiEmployees || []).map((emp, i): DeptEmployee => ({
            id: i + 1,
            name: `${emp.firstName} ${emp.lastName}`,
            role: emp.position?.title || '',
            avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=283852&color=fff`,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [apiEmployees]);

    const existingIds = new Set(department.employees.map(e => e.id));
    const available = allEmployees.filter(e =>
        !existingIds.has(e.id) &&
        (e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase()))
    );

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">{t('departmentDetail.members.addMemberTitle')}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Search01Icon */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('departmentDetail.members.searchEmployee')}
                            className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Employee list */}
                <div className="max-h-80 overflow-y-auto p-2">
                    {available.length > 0 ? (
                        available.map(emp => (
                            <button
                                key={emp.id}
                                onClick={() => { onAdd(emp); onClose(); }}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-gray-50 transition-colors group"
                            >
                                <img src={emp.avatar} alt="" className="w-10 h-10 rounded-xl border border-gray-200 object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                                </div>
                                <span
                                    className="text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: '#28385215', color: '#283852' }}
                                >
                                    {t('departmentDetail.members.add')}
                                </span>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <UserGroupIcon size={32} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{t('departmentDetail.members.noAvailable')}</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Helpers (project modal) ───────────────────────────── */

interface DocFile {
    name: string;
    size: string;
}

interface ProjectForm {
    name: string;
    description: string;
    client: string;
    cost: string;
    revenue: string;
    startDate: string;
    dueDate: string;
    contract: DocFile | null;
    srs: DocFile | null;
    otherDocs: DocFile[];
}

const fmtToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/* ─── Create Client sub-modal ───────────────────────────── */

const CreateClientModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) => {
    const { t } = useTranslation();
    const createClient = useCreateClient();
    const [form, setForm] = useState({ name: '', type: 'one_time' as 'one_time' | 'subscription' });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const isValid = form.name.trim().length > 0;
    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#283852]/30 focus:border-[#283852] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#283852]/30 focus:border-[#283852] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-60 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center">
                            <UserGroupIcon size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('clients.createTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className={labelCls}><UserGroupIcon size={12} />{t('clients.name')}</label>
                        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('clients.namePlaceholder')} className={inputCls} autoFocus />
                    </div>
                    <div>
                        <label className={labelCls}>{t('clients.type')}</label>
                        <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'one_time' | 'subscription' }))} className={selectCls}>
                            <option value="one_time">{t('clients.typeOneTime')}</option>
                            <option value="subscription">{t('clients.typeSubscription')}</option>
                        </select>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('clients.cancel')}</button>
                    <button
                        disabled={!isValid || createClient.isPending}
                        onClick={() => {
                            if (!isValid) return;
                            createClient.mutate({ name: form.name, type: form.type }, {
                                onSuccess: () => { onCreated(form.name); onClose(); },
                            });
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#283852]/20 ${isValid && !createClient.isPending ? 'bg-[#283852] hover:bg-[#1e2d42]' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                    >
                        {createClient.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {t('clients.create')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Add Project Modal ────────────────────────────────── */

const AddProjectModal = ({
    department,
    onClose,
}: {
    department: Department;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const createProject = useCreateProject();
    const { data: allClients } = useClients();
    const [showCreateClient, setShowCreateClient] = useState(false);

    const [form, setForm] = useState<ProjectForm>({
        name: '',
        description: '',
        client: '',
        cost: '',
        revenue: '',
        startDate: fmtToday(),
        dueDate: '',
        contract: null,
        srs: null,
        otherDocs: [],
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const update = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => {
        setForm(prev => ({ ...prev, [key]: value }));
    };

    const handleFileSelect = (key: 'contract' | 'srs', e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        update(key, { name: file.name, size: `${(file.size / 1024).toFixed(0)} KB` });
    };

    const handleOtherDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newDocs: DocFile[] = Array.from(files).map(f => ({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` }));
        setForm(prev => ({ ...prev, otherDocs: [...prev.otherDocs, ...newDocs] }));
    };

    const removeOtherDoc = (idx: number) => {
        setForm(prev => ({ ...prev, otherDocs: prev.otherDocs.filter((_, i) => i !== idx) }));
    };

    const isValid = form.name.trim().length > 0 && form.dueDate.length > 0;

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#283852]/30 focus:border-[#283852] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#283852]/30 focus:border-[#283852] transition-all appearance-none cursor-pointer';
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
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center shrink-0">
                            <Add01Icon size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('projects.createTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Department (read-only, pre-filled) */}
                    <div>
                        <label className={labelCls}><Building01Icon size={12} />{t('projects.formDepartment')}</label>
                        <div
                            className="flex items-center gap-3 w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-2.5"
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: '#283852' }} />
                            <span className="text-sm font-medium text-gray-700">{department.name}</span>
                        </div>
                    </div>

                    {/* Project name */}
                    <div>
                        <label className={labelCls}><Briefcase01Icon size={12} />{t('projects.formName')}</label>
                        <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder={t('projects.formNamePlaceholder')} className={inputCls} autoFocus />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}><AlignLeftIcon size={12} />{t('projects.description')}</label>
                        <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder={t('projects.formDescriptionPlaceholder')} rows={3} className={`${inputCls} resize-none`} />
                    </div>

                    {/* Client */}
                    <div>
                        <label className={labelCls}><UserGroupIcon size={12} />{t('projects.formClient')}</label>
                        <div className="flex gap-2">
                            <select value={form.client} onChange={e => update('client', e.target.value)} className={selectCls}>
                                <option value="">{t('projects.formClientPlaceholder')}</option>
                                {(allClients || []).map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <button type="button" onClick={() => setShowCreateClient(true)} className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-[#283852] hover:bg-[#283852]/5 hover:border-[#283852]/30 transition-colors" title={t('clients.createTitle')}>
                                <Add01Icon size={16} />
                            </button>
                        </div>
                    </div>

                    <AnimatePresence>
                        {showCreateClient && (
                            <CreateClientModal
                                onClose={() => setShowCreateClient(false)}
                                onCreated={(name) => update('client', name)}
                            />
                        )}
                    </AnimatePresence>

                    {/* Cost + Revenue */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}><DollarCircleIcon size={12} />{t('projects.formCost')}</label>
                            <input type="text" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0 FCFA" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}><ArrowUpRight01Icon size={12} />{t('projects.formRevenue')}</label>
                            <input type="text" value={form.revenue} onChange={e => update('revenue', e.target.value)} placeholder="0 FCFA" className={inputCls} />
                        </div>
                    </div>

                    {/* Start + Due dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}><Calendar01Icon size={12} />{t('projects.startDate')}</label>
                            <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}><Calendar01Icon size={12} />{t('projects.formDueDate')}</label>
                            <input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="space-y-4">
                        <p className={`${labelCls} mb-0`}><File01Icon size={12} />{t('projects.formDocuments')}</p>

                        {/* Contract */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formContract')}</p>
                            {form.contract ? (
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <File01Icon size={14} className="text-[#283852]" />
                                        <span className="font-medium text-gray-700">{form.contract.name}</span>
                                        <span className="text-gray-400">{form.contract.size}</span>
                                    </div>
                                    <button onClick={() => update('contract', null)} className="text-gray-400 hover:text-[#283852] transition-colors"><Delete02Icon size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#283852]/40 hover:bg-[#283852]/5 transition-all text-sm text-gray-400">
                                    <Upload01Icon size={16} />{t('projects.formUpload')}
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('contract', e)} />
                                </label>
                            )}
                        </div>

                        {/* SRS */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formSRS')}</p>
                            {form.srs ? (
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <File01Icon size={14} className="text-[#283852]" />
                                        <span className="font-medium text-gray-700">{form.srs.name}</span>
                                        <span className="text-gray-400">{form.srs.size}</span>
                                    </div>
                                    <button onClick={() => update('srs', null)} className="text-gray-400 hover:text-[#283852] transition-colors"><Delete02Icon size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#283852]/40 hover:bg-[#283852]/5 transition-all text-sm text-gray-400">
                                    <Upload01Icon size={16} />{t('projects.formUpload')}
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('srs', e)} />
                                </label>
                            )}
                        </div>

                        {/* Other docs */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formOtherDocs')}</p>
                            {form.otherDocs.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {form.otherDocs.map((doc, i) => (
                                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <File01Icon size={14} className="text-[#283852]" />
                                                <span className="font-medium text-gray-700">{doc.name}</span>
                                                <span className="text-gray-400">{doc.size}</span>
                                            </div>
                                            <button onClick={() => removeOtherDoc(i)} className="text-gray-400 hover:text-[#283852] transition-colors"><Delete02Icon size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#283852]/40 hover:bg-[#283852]/5 transition-all text-sm text-gray-400">
                                <Upload01Icon size={16} />{t('projects.formUpload')}
                                <input type="file" className="hidden" multiple onChange={handleOtherDocs} />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('projects.formCancel')}
                    </button>
                    <button
                        onClick={() => {
                            if (!isValid) return;
                            const selectedClient = allClients?.find(c => c.name === form.client);
                            createProject.mutate({
                                name: form.name,
                                description: form.description || undefined,
                                departmentId: String(department.id),
                                clientId: selectedClient?.id,
                                budget: form.cost ? parseFloat(form.cost) : undefined,
                                revenue: form.revenue ? parseFloat(form.revenue) : undefined,
                                startDate: form.startDate || undefined,
                                endDate: form.dueDate || undefined,
                            }, { onSuccess: () => onClose() });
                        }}
                        disabled={!isValid || createProject.isPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#283852]/20 ${isValid && !createProject.isPending ? 'bg-[#283852] hover:bg-[#1e2d42]' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                    >
                        {createProject.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
                        {t('projects.formCreate')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Overview View ─────────────────────────────────────── */

const OverviewView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const deptId = String(department.id);
    const isCarwash = deptId === LIS_CARWASH_DEPT_ID;

    const { data: projects } = useProjects(deptId);
    const { data: tasks } = useTasks(deptId);
    const { data: invoiceStats } = useInvoiceStats(deptId);

    // For LIS CARWASH: year-to-date carwash revenue replaces invoice stats
    const ytdStart = `${new Date().getFullYear()}-01-01`;
    const ytdEnd   = new Date().toISOString().split('T')[0];
    const { data: carwashYTD } = useCarwashOverview({ startDate: ytdStart, endDate: ytdEnd });

    // Compute project progress from tasks
    const projectProgress = useMemo(() => {
        const map: Record<string, { total: number; done: number }> = {};
        (tasks || []).forEach(task => {
            if (!task.projectId) return;
            if (!map[task.projectId]) map[task.projectId] = { total: 0, done: 0 };
            map[task.projectId].total++;
            if (task.state === 'COMPLETED' || task.state === 'REVIEWED') map[task.projectId].done++;
        });
        return map;
    }, [tasks]);

    const projectCount = projects?.length ?? department.projects.length;
    const avgProgress = useMemo(() => {
        if (!projects?.length) return 0;
        const progresses = projects.map(p => {
            const pp = projectProgress[p.id];
            return pp && pp.total > 0 ? Math.round((pp.done / pp.total) * 100) : 0;
        });
        return Math.round(progresses.reduce((s, v) => s + v, 0) / progresses.length);
    }, [projects, projectProgress]);

    const revenue = isCarwash
        ? (carwashYTD?.totalRevenue ?? 0)
        : (invoiceStats?.totalRevenue ?? 0);

    const stats = [
        { label: t('departmentDetail.overview.totalMembers'), value: department.employees.length, icon: UserGroupIcon, color: '#283852' },
        { label: t('departmentDetail.overview.activeProjects'), value: projectCount, icon: Folder01Icon, color: '#3b82f6' },
        { label: t('departmentDetail.overview.budget'), value: revenue >= 1000000 ? `${(revenue / 1000000).toFixed(1)}M` : `${(revenue / 1000).toFixed(0)}K`, icon: Wallet01Icon, color: '#8b5cf6' },
        { label: t('departmentDetail.overview.avgProgress'), value: projectCount > 0 ? `${avgProgress}%` : 'N/A', icon: ArrowUpRight01Icon, color: '#f59e0b' },
    ];

    // Monthly activity from real tasks
    const activityData = useMemo(() => {
        const counts: Record<number, number> = {};
        (tasks || []).forEach(task => {
            const month = new Date(task.createdAt!).getMonth();
            counts[month] = (counts[month] || 0) + 1;
        });
        const currentMonth = new Date().getMonth();
        const result: { month: string; tasks: number }[] = [];
        for (let i = 0; i <= currentMonth; i++) {
            result.push({ month: MONTH_LABELS[i], tasks: counts[i] || 0 });
        }
        return result;
    }, [tasks]);

    const roleGroups = department.employees.reduce((acc, emp) => {
        const key = emp.role || 'Other';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const roleData = Object.entries(roleGroups).map(([name, value]) => ({ name, value }));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#28385215' }}>
                    <department.icon size={22} style={{ color: '#283852' }} />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{department.name}</h1>
                    <p className="text-gray-500 text-sm">{t('departmentDetail.overview.subtitle')}</p>
                </div>
            </div>

            {/* Stats */}
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

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Activity AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('departmentDetail.overview.monthlyActivity')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorDeptActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#283852" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#283852" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="tasks" stroke="#283852" strokeWidth={2} fill="url(#colorDeptActivity)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Role Distribution Donut */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-4">{t('departmentDetail.overview.roleDistribution')}</h3>
                    <div className="h-50 relative">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <PieChart>
                                <Pie
                                    data={roleData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={3}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {roleData.map((_, i) => (
                                        <Cell key={i} fill={ROLE_COLORS[i % ROLE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-xs text-gray-400">{t('departmentDetail.overview.total')}</p>
                                <p className="text-xl font-bold text-gray-800">{department.employees.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {roleData.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length] }} />
                                    <span className="text-gray-600 text-xs">{entry.name}</span>
                                </div>
                                <span className="font-semibold text-gray-800 text-xs">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: CrownIcon, label: t('departmentDetail.overview.head'), value: department.head.name, avatar: department.head.avatar },
                    { icon: Wallet01Icon, label: t('departmentDetail.overview.budgetLabel'), value: revenue >= 1000000 ? `${(revenue / 1000000).toFixed(1)}M FCFA` : `${(revenue / 1000).toFixed(0)}K FCFA` },
                    { icon: Briefcase01Icon, label: t('departmentDetail.overview.projectsLabel'), value: String(projectCount) },
                    { icon: UserGroupIcon, label: t('departmentDetail.overview.teamSize'), value: `${department.employees.length} members` },
                ].map((item, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + i * 0.05 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <item.icon size={16} className="text-gray-400" />
                            <span className="text-xs text-gray-400 font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {item.avatar && <img src={item.avatar} alt="" className="w-8 h-8 rounded-full border border-gray-200" />}
                            <p className="text-sm font-bold text-gray-800">{item.value}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Carwash block — only for LIS CARWASH dept */}
            {String(department.id) === LIS_CARWASH_DEPT_ID && (
                <div className="pt-2">
                    <div className="border-t border-gray-100 pt-6">
                        <CarwashDeptBlock />
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Members View ──────────────────────────────────────── */

const MembersView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [showAddModal, setShowAddModal] = useState(false);
    const [addedMembers, setAddedMembers] = useState<DeptEmployee[]>([]);

    const allMembers = [...department.employees, ...addedMembers];
    const otherMembers = allMembers.filter(e => e.id !== department.head.id);

    const handleAddMember = (emp: DeptEmployee) => {
        setAddedMembers(prev => [...prev, emp]);
    };

    const deptWithAdded = { ...department, employees: allMembers };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">
                    {t('departmentDetail.members.title')} ({allMembers.length})
                </h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-[#283852] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1e2d42] transition-colors shadow-lg shadow-[#283852]/20"
                >
                    <Add01Icon size={16} />
                    {t('departmentDetail.members.addMember')}
                </button>
            </div>

            {/* Head card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/employees/${department.head.id}`)}
                className="bg-white rounded-3xl p-6 relative overflow-hidden cursor-pointer  transition-shadow"
                style={{ border: '2px solid #28385220' }}
            >
                <div className="absolute top-4 right-4">
                    <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#28385215', color: '#283852' }}
                    >
                        {t('departmentDetail.members.head')}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <img src={department.head.avatar} alt="" className="w-16 h-16 rounded-2xl border-2 border-gray-100 object-cover" />
                    <div>
                        <p className="text-lg font-bold text-gray-800">{department.head.name}</p>
                        <p className="text-sm text-gray-500">{department.head.role}</p>
                    </div>
                </div>
            </motion.div>

            {/* Team grid */}
            {otherMembers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {otherMembers.map((emp, i) => (
                        <motion.div
                            key={emp.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200  cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <img src={emp.avatar} alt="" className="w-12 h-12 rounded-xl border border-gray-200 object-cover" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-800 text-sm truncate">{emp.name}</p>
                                    <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400">
                    <UserGroupIcon size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('departmentDetail.members.empty')}</p>
                </div>
            )}

            {/* Add Member Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddMemberModal
                        department={deptWithAdded}
                        onClose={() => setShowAddModal(false)}
                        onAdd={handleAddMember}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Projects View ─────────────────────────────────────── */

const ProjectsView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const [showAddModal, setShowAddModal] = useState(false);
    const deptId = String(department.id);

    const { data: apiProjects } = useProjects(deptId);
    const { data: tasks } = useTasks(deptId);

    // Compute progress and status per project
    const enrichedProjects = useMemo(() => {
        const tasksByProject: Record<string, { total: number; done: number }> = {};
        (tasks || []).forEach(task => {
            if (!task.projectId) return;
            if (!tasksByProject[task.projectId]) tasksByProject[task.projectId] = { total: 0, done: 0 };
            tasksByProject[task.projectId].total++;
            if (task.state === 'COMPLETED' || task.state === 'REVIEWED') tasksByProject[task.projectId].done++;
        });

        return (apiProjects || []).map(p => {
            const tp = tasksByProject[p.id];
            const progress = tp && tp.total > 0 ? Math.round((tp.done / tp.total) * 100) : 0;
            let status = 'active';
            if (progress === 100) status = 'completed';
            else if (p.endDate && new Date(p.endDate) < new Date()) status = 'overdue';
            return { id: p.id, name: p.name, status, progress };
        });
    }, [apiProjects, tasks]);

    const allProjects = enrichedProjects;
    const activeCount = allProjects.filter(p => p.status === 'active').length;
    const avgProgress = allProjects.length > 0
        ? Math.round(allProjects.reduce((s, p) => s + p.progress, 0) / allProjects.length)
        : 0;

    const summaryStats = [
        { label: t('departmentDetail.projects.total'), value: allProjects.length },
        { label: t('departmentDetail.projects.active'), value: activeCount },
        { label: t('departmentDetail.projects.avgProgress'), value: `${avgProgress}%` },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">{t('departmentDetail.projects.title')}</h2>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-[#283852] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1e2d42] transition-colors shadow-lg shadow-[#283852]/20"
                >
                    <Add01Icon size={16} />
                    {t('departmentDetail.projects.addProject')}
                </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4">
                {summaryStats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white rounded-2xl p-4 border border-gray-100 text-center"
                    >
                        <p className="text-xs text-gray-400 font-medium mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Project cards */}
            {allProjects.length > 0 ? (
                <div className="space-y-4">
                    {allProjects.map((proj, i) => {
                        const pStyle = PROJECT_STATUS_STYLES[proj.status] || PROJECT_STATUS_STYLES.active;
                        return (
                            <motion.div
                                key={proj.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="bg-white rounded-2xl p-5 border border-gray-100"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <Briefcase01Icon size={18} className="text-gray-400" />
                                        <h4 className="font-semibold text-gray-800">{proj.name}</h4>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${pStyle.bg} ${pStyle.text}`}>
                                        {t(`projects.${STATUS_I18N[proj.status]}`)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${proj.progress}%` }}
                                            transition={{ delay: 0.3, duration: 0.8 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: '#283852' }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-800">{proj.progress}%</span>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-400">
                    <Briefcase01Icon size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">{t('departmentDetail.projects.empty')}</p>
                    <p className="text-sm mt-1">{t('departmentDetail.projects.emptyHint')}</p>
                </div>
            )}

            {/* Add Project Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <AddProjectModal
                        department={department}
                        onClose={() => setShowAddModal(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Budget View ───────────────────────────────────────── */

const BudgetView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const deptId = String(department.id);
    const isCarwash = deptId === LIS_CARWASH_DEPT_ID;

    const { data: invoices } = useInvoices(deptId);
    const { data: invoiceStats } = useInvoiceStats(deptId);
    const { data: projects } = useProjects(deptId);

    // For LIS CARWASH: year-to-date carwash figures replace invoice stats
    const ytdStart = `${new Date().getFullYear()}-01-01`;
    const ytdEnd   = new Date().toISOString().split('T')[0];
    const { data: carwashYTD } = useCarwashOverview({ startDate: ytdStart, endDate: ytdEnd });

    const totalRevenue = isCarwash ? (carwashYTD?.totalRevenue ?? 0) : (invoiceStats?.totalRevenue ?? 0);
    const totalPending = isCarwash ? (carwashYTD?.totalExpenses ?? 0) : (invoiceStats?.totalPending ?? 0);
    const totalBudget = useMemo(() => (projects || []).reduce((s, p) => s + (p.budget || 0), 0), [projects]);
    const perEmployee = department.employees.length > 0 ? Math.round(totalRevenue / department.employees.length) : 0;

    const formatVal = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

    const budgetStats = [
        { label: t('departmentDetail.budget.totalBudget'), value: formatVal(totalBudget), icon: Wallet01Icon, color: '#283852' },
        { label: t('departmentDetail.budget.totalExpenses'), value: formatVal(totalPending), icon: ArrowUpRight01Icon, color: '#f43f5e' },
        { label: t('departmentDetail.budget.remaining'), value: formatVal(totalRevenue), icon: Wallet01Icon, color: '#22c55e' },
        { label: t('departmentDetail.budget.perEmployee'), value: formatVal(perEmployee), icon: UserGroupIcon, color: '#3b82f6' },
    ];

    // Expense breakdown by invoice status
    const expenses = useMemo(() => {
        const statusMap: Record<string, number> = {};
        (invoices || []).forEach(inv => {
            const label = inv.status === 'PAID' ? t('invoices.status.paid', 'Paid')
                : inv.status === 'SENT' ? t('invoices.status.sent', 'Sent')
                : inv.status === 'CREATED' ? t('invoices.status.created', 'Created')
                : t('invoices.status.rejected', 'Rejected');
            statusMap[label] = (statusMap[label] || 0) + Number(inv.total);
        });
        return Object.entries(statusMap).map(([category, amount]) => ({ category, amount }));
    }, [invoices, t]);

    // Monthly revenue from paid invoices
    const monthlyData = useMemo(() => {
        const counts: Record<number, number> = {};
        (invoices || []).filter(i => i.status === 'PAID').forEach(inv => {
            const month = new Date(inv.paidAt || inv.issueDate).getMonth();
            counts[month] = (counts[month] || 0) + Number(inv.total);
        });
        const currentMonth = new Date().getMonth();
        const result: { month: string; spend: number }[] = [];
        for (let i = 0; i <= currentMonth; i++) {
            result.push({ month: MONTH_LABELS[i], spend: counts[i] || 0 });
        }
        return result;
    }, [invoices]);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('departmentDetail.budget.title')}</h2>

            {/* Budget stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {budgetStats.map((stat, i) => (
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
                            <p className="text-xs text-gray-400 mt-1">FCFA</p>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                <stat.icon size={110} strokeWidth={1.2} />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Breakdown BarChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('departmentDetail.budget.expenseBreakdown')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <BarChart data={expenses} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [`${(value || 0).toLocaleString()} FCFA`, '']}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                    {expenses.map((_, i) => (
                                        <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Monthly Spending AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('departmentDetail.budget.monthlySpend')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorDeptBudgetSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#283852" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#283852" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: any) => [`${(value || 0).toLocaleString()} FCFA`, 'Amount']}
                                />
                                <Area type="monotone" dataKey="spend" stroke="#283852" strokeWidth={2} fill="url(#colorDeptBudgetSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* ─── Monthly CA Objectives ─────────────────── */}
            <MonthlyObjectivesSection departmentId={deptId} />

            {/* ─── Carwash performance (LIS CARWASH only) ── */}
            {deptId === LIS_CARWASH_DEPT_ID && (
                <div className="border-t border-gray-100 pt-6">
                    <CarwashDeptBlock />
                </div>
            )}
        </div>
    );
};

/* ─── Monthly CA Objectives ─────────────────────────────── */

const MONTH_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const MonthlyObjectivesSection = ({ departmentId }: { departmentId: string }) => {
    const { t } = useTranslation();
    const [year, setYear] = useState(() => new Date().getFullYear());
    const [editingMonth, setEditingMonth] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    const { data: rows = [], isLoading } = useMonthlyStats(departmentId, year);
    const upsert = useUpsertMonthlyTarget();

    const currentMonth = new Date().getMonth() + 1; // 1-based

    const handleEdit = (month: number, current: number) => {
        setEditingMonth(month);
        setEditValue(current > 0 ? String(current) : '');
    };

    const handleSave = (month: number) => {
        const val = parseFloat(editValue);
        if (isNaN(val) || val < 0) return;
        upsert.mutate({ departmentId, year, month, targetRevenue: val });
        setEditingMonth(null);
    };

    const formatAmount = (v: number) =>
        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(Math.round(v));

    const yearTotal = rows.reduce((s, r) => s + r.actualRevenue, 0);
    const yearTarget = rows.reduce((s, r) => s + r.targetRevenue, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-3xl border border-gray-100 p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                        <Target01Icon size={18} className="text-[#33cbcc]" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{t('departmentDetail.budget.monthlyCA', 'Objectifs Chiffre d\'Affaires')}</h3>
                        <p className="text-xs text-gray-400">{t('departmentDetail.budget.monthlyCASubtitle', 'Objectif mensuel vs réalisé')}</p>
                    </div>
                </div>

                {/* Year nav */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setYear(y => y - 1)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft01Icon size={16} className="text-gray-500" />
                    </button>
                    <span className="text-sm font-semibold text-gray-700 w-12 text-center">{year}</span>
                    <button
                        onClick={() => setYear(y => y + 1)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowRight01Icon size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Year summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">{t('departmentDetail.budget.yearTarget', 'Objectif annuel')}</p>
                    <p className="text-xl font-bold text-gray-800">{formatAmount(yearTarget)} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">{t('departmentDetail.budget.yearActual', 'CA réalisé')}</p>
                    <p className="text-xl font-bold text-[#33cbcc]">{formatAmount(yearTotal)} <span className="text-xs font-normal text-gray-400">FCFA</span></p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs text-gray-400 font-medium mb-1">{t('departmentDetail.budget.yearRate', 'Taux de réalisation')}</p>
                    <p className={`text-xl font-bold ${yearTarget > 0 && yearTotal >= yearTarget ? 'text-[#33cbcc]' : 'text-gray-800'}`}>
                        {yearTarget > 0 ? `${Math.round((yearTotal / yearTarget) * 100)}%` : '—'}
                    </p>
                </div>
            </div>

            {/* Loading */}
            {isLoading ? (
                <div className="flex items-center justify-center h-32">
                    <Loading02Icon size={24} className="animate-spin text-[#33cbcc]" />
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {rows.map((row) => {
                        const pct = row.targetRevenue > 0 ? Math.min((row.actualRevenue / row.targetRevenue) * 100, 100) : 0;
                        const isOver = row.targetRevenue > 0 && row.actualRevenue >= row.targetRevenue;
                        const isCurrent = row.month === currentMonth && year === new Date().getFullYear();
                        const isFuture = year > new Date().getFullYear() || (year === new Date().getFullYear() && row.month > currentMonth);
                        const isEditing = editingMonth === row.month;

                        return (
                            <motion.div
                                key={row.month}
                                layout
                                className={`rounded-2xl border p-3 transition-all ${
                                    isCurrent
                                        ? 'border-[#33cbcc] bg-[#33cbcc]/5'
                                        : 'border-gray-100 bg-gray-50/60'
                                }`}
                            >
                                {/* Month label */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-bold uppercase tracking-wide ${isCurrent ? 'text-[#33cbcc]' : 'text-gray-500'}`}>
                                        {MONTH_SHORT[row.month - 1]}
                                    </span>
                                    {isOver && !isFuture && (
                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#33cbcc]/10 text-[#33cbcc]">✓</span>
                                    )}
                                    {row.hasExplicitTarget && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc]" title="Objectif défini" />
                                    )}
                                    {!row.hasExplicitTarget && row.usingDefault && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#283852]" title="Objectif par défaut" />
                                    )}
                                </div>

                                {/* Target01Icon edit */}
                                {isEditing ? (
                                    <div className="flex items-center gap-1 mb-2">
                                        <input
                                            type="number"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSave(row.month); if (e.key === 'Escape') setEditingMonth(null); }}
                                            autoFocus
                                            className="w-full text-xs border border-[#33cbcc] rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-[#33cbcc]/40"
                                            placeholder="0"
                                        />
                                        <button onClick={() => handleSave(row.month)} className="p-1 rounded-lg bg-[#33cbcc] text-white hover:bg-[#2bb5b6]">
                                            <Tick01Icon size={12} />
                                        </button>
                                        <button onClick={() => setEditingMonth(null)} className="p-1 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300">
                                            <Cancel01Icon size={12} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleEdit(row.month, row.targetRevenue)}
                                        className="w-full text-left mb-2 group"
                                    >
                                        <p className="text-[10px] text-gray-400">{t('departmentDetail.budget.target', 'Objectif')}</p>
                                        <p className="text-sm font-semibold text-gray-700 group-hover:text-[#33cbcc] transition-colors flex items-center gap-1">
                                            {row.targetRevenue > 0 ? `${formatAmount(row.targetRevenue)} FCFA` : <span className="text-gray-300 italic text-xs">{t('departmentDetail.budget.setTarget', 'Définir...')}</span>}
                                            <PencilIcon size={10} className="opacity-0 group-hover:opacity-100 transition-opacity text-[#33cbcc]" />
                                        </p>
                                    </button>
                                )}

                                {/* Actual */}
                                <div className="mb-2">
                                    <p className="text-[10px] text-gray-400">{t('departmentDetail.budget.actual', 'Réalisé')}</p>
                                    <p className={`text-sm font-bold ${isFuture ? 'text-gray-300' : isOver ? 'text-[#33cbcc]' : 'text-gray-800'}`}>
                                        {isFuture ? '—' : `${formatAmount(row.actualRevenue)} FCFA`}
                                    </p>
                                </div>

                                {/* Progress bar */}
                                {!isFuture && row.targetRevenue > 0 && (
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.6, ease: 'easeOut' }}
                                            className={`h-full rounded-full ${isOver ? 'bg-[#33cbcc]' : 'bg-[#33cbcc]'}`}
                                        />
                                    </div>
                                )}
                                {!isFuture && row.targetRevenue > 0 && (
                                    <p className={`text-[9px] font-semibold mt-1 ${isOver ? 'text-[#33cbcc]' : 'text-gray-400'}`}>
                                        {Math.round(pct)}%
                                    </p>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </motion.div>
    );
};

/* ─── Services View ─────────────────────────────────────── */

const ServiceFormModal = ({
    departmentId,
    service,
    color,
    onClose,
}: {
    departmentId: string;
    service?: { id: string; name: string; description?: string; isActive: boolean } | null;
    color: string;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const createService = useCreateDepartmentService();
    const updateService = useUpdateDepartmentService();

    const [name, setName] = useState(service?.name || '');
    const [description, setDescription] = useState(service?.description || '');
    const [isActive, setIsActive] = useState(service?.isActive ?? true);

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const isPending = createService.isPending || updateService.isPending;

    const handleSubmit = () => {
        if (!name.trim()) return;
        const dto = {
            name: name.trim(),
            description: description || undefined,
            isActive,
        };
        if (service) {
            updateService.mutate({ id: service.id, dto }, { onSuccess: onClose });
        } else {
            createService.mutate({ ...dto, departmentId }, { onSuccess: onClose });
        }
    };

    const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#283852]/30 focus:border-[#283852] transition-all';

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                            <Briefcase01Icon size={18} style={{ color }} />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">
                            {service ? t('departmentDetail.services.editService') : t('departmentDetail.services.addService')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('departmentDetail.services.name')} *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder={t('departmentDetail.services.namePlaceholder')}
                            className={inputCls}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('departmentDetail.services.description')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder={t('departmentDetail.services.descriptionPlaceholder')}
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="text-sm font-medium text-gray-700">{t('departmentDetail.services.active')}</p>
                            <p className="text-xs text-gray-400">{t('departmentDetail.services.activeDesc')}</p>
                        </div>
                        <button onClick={() => setIsActive(v => !v)} className="transition-colors">
                            {isActive
                                ? <ToggleOnIcon size={28} style={{ color }} />
                                : <ToggleOffIcon size={28} className="text-gray-300" />
                            }
                        </button>
                    </div>
                </div>

                <div className="px-6 pb-6 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || isPending}
                        className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: color }}
                    >
                        {isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Tick01Icon size={14} />}
                        {service ? t('common.save') : t('departmentDetail.services.create')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const ServicesView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const { data: services = [], isLoading } = useDepartmentServices(String(department.id));
    const deleteService = useDeleteDepartmentService();
    const updateService = useUpdateDepartmentService();

    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<typeof services[0] | null>(null);
    const [search, setSearch] = useState('');

    const filtered = services.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleActive = (s: typeof services[0]) => {
        updateService.mutate({ id: s.id, dto: { isActive: !s.isActive } });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{t('departmentDetail.services.title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('departmentDetail.services.subtitle')}</p>
                </div>
                <button
                    onClick={() => { setEditingService(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-medium rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#283852' }}
                >
                    <Add01Icon size={16} />
                    {t('departmentDetail.services.addService')}
                </button>
            </div>

            {/* Search01Icon */}
            <div className="relative max-w-sm">
                <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('departmentDetail.services.search')}
                    className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
                />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    { label: t('departmentDetail.services.stats.total'), value: services.length, icon: Briefcase01Icon },
                    { label: t('departmentDetail.services.stats.active'), value: services.filter(s => s.isActive).length, icon: ToggleOnIcon },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#28385215' }}>
                            <stat.icon size={18} style={{ color: '#283852' }} />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-gray-800">{stat.value}</p>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loading02Icon className="w-6 h-6 animate-spin text-[#283852]" />
                </div>
            ) : filtered.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
                >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#28385215' }}>
                        <Briefcase01Icon size={24} style={{ color: '#283852' }} />
                    </div>
                    <p className="font-semibold text-gray-700">{t('departmentDetail.services.empty')}</p>
                    <p className="text-sm text-gray-400 mt-1">{t('departmentDetail.services.emptyDesc')}</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((service, i) => (
                        <motion.div
                            key={service.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`bg-white rounded-2xl border p-5 transition-all ${service.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: '#28385215' }}>
                                        <Briefcase01Icon size={17} style={{ color: '#283852' }} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-800 text-sm truncate">{service.name}</p>
                                            {!service.isActive && (
                                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full shrink-0">{t('departmentDetail.services.inactive')}</span>
                                            )}
                                        </div>
                                        {service.description && (
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => { setEditingService(service); setShowModal(true); }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors"
                                    >
                                        <PencilIcon size={14} />
                                    </button>
                                    <button
                                        onClick={() => deleteService.mutate(service.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#283852] hover:bg-[#283852]/10 transition-colors"
                                    >
                                        <Delete02Icon size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
                                <button
                                    onClick={() => handleToggleActive(service)}
                                    className="ml-auto transition-colors"
                                >
                                    {service.isActive
                                        ? <ToggleOnIcon size={22} style={{ color: '#283852' }} />
                                        : <ToggleOffIcon size={22} className="text-gray-300" />
                                    }
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <ServiceFormModal
                        departmentId={String(department.id)}
                        service={editingService}
                        color="#283852"
                        onClose={() => { setShowModal(false); setEditingService(null); }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

/* ─── Settings View ─────────────────────────────────────── */

const SettingsView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();
    const updateDept = useUpdateDepartment();

    /* ── Edit department form ── */
    const [name, setName] = useState(department.name);
    const [description, setDescription] = useState(department.description || '');
    const nameChanged = name.trim() !== department.name || description !== (department.description || '');

    const handleSaveDept = () => {
        if (!name.trim()) return;
        updateDept.mutate({ id: String(department.id), dto: { name: name.trim(), description: description || undefined } });
    };

    /* ── HOD picker ── */
    const [headDropdownOpen, setHeadDropdownOpen] = useState(false);
    const [headSearch, setHeadSearch] = useState('');
    const deptScope = useDepartmentScope();
    const { data: allEmployeesRaw = [] } = useEmployees(deptScope);
    const ALL_EMPLOYEES = (allEmployeesRaw as any[]).map((emp: any) => ({
        id: String(emp.id),
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.position?.title || '',
        avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=283852&color=fff`,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name));

    const headEmployee = department.head?.id && String(department.head.id) !== '0'
        ? ALL_EMPLOYEES.find((e: any) => e.id === String(department.head!.id))
        : null;

    const filteredHeadEmployees = useMemo(() =>
        ALL_EMPLOYEES.filter((e: any) =>
            e.name.toLowerCase().includes(headSearch.toLowerCase()) ||
            e.role.toLowerCase().includes(headSearch.toLowerCase())
        ),
        [ALL_EMPLOYEES, headSearch]
    );

    const handleAppoint = (empId: string) => {
        updateDept.mutate(
            { id: String(department.id), dto: { headId: empId } },
            { onSuccess: () => { setHeadDropdownOpen(false); setHeadSearch(''); } }
        );
    };

    const handleRemoveHod = () => {
        updateDept.mutate({ id: String(department.id), dto: { headId: null } });
    };

    const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#283852]/20 focus:border-[#283852] bg-white';

    return (
        <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('departmentDetail.settings.title')}</h2>

            {/* ── Edit Department ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#28385215' }}>
                        <Building01Icon size={18} style={{ color: '#283852' }} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">{t('departmentDetail.settings.general')}</p>
                        <p className="text-xs text-gray-400">{t('departmentDetail.settings.generalDesc')}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('departments.name')}</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={inputCls}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 block">{t('departments.description')}</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className={`${inputCls} resize-none`}
                        />
                    </div>
                </div>

                <div className="flex justify-end mt-4">
                    <button
                        onClick={handleSaveDept}
                        disabled={!nameChanged || !name.trim() || updateDept.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#283852] text-white rounded-xl text-sm font-medium hover:bg-[#1e2d42] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {updateDept.isPending && !pendingHodId
                            ? <Loading02Icon size={14} className="animate-spin" />
                            : <Tick01Icon size={14} />
                        }
                        {t('common.save')}
                    </button>
                </div>
            </motion.div>

            {/* ── Head of Department ── */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-gray-100 p-5"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#28385215' }}>
                        <AccountSetting01Icon size={18} style={{ color: '#283852' }} />
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 text-sm">{t('departmentDetail.settings.hod')}</p>
                        <p className="text-xs text-gray-400">{t('departmentDetail.settings.hodDesc')}</p>
                    </div>
                </div>

                {/* HOD dropdown picker */}
                <div className="relative">
                    <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                        <CrownIcon size={11} className="text-[#33cbcc]" />
                        {t('departmentDetail.settings.hod')}
                    </label>
                    <button
                        type="button"
                        onClick={() => setHeadDropdownOpen(prev => !prev)}
                        className={`${inputCls} text-left flex items-center gap-3 cursor-pointer`}
                    >
                        {headEmployee ? (
                            <>
                                {headEmployee.avatar
                                    ? <img src={headEmployee.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 shrink-0" />
                                    : <div className="w-6 h-6 rounded-full bg-[#283852]/20 flex items-center justify-center text-[#283852] font-bold text-xs shrink-0">{headEmployee.name[0]}</div>
                                }
                                <span className="flex-1 truncate text-gray-800">{headEmployee.name}</span>
                                <span className="text-xs text-gray-400 truncate">{headEmployee.role}</span>
                                <button
                                    type="button"
                                    onClick={e => { e.stopPropagation(); handleRemoveHod(); }}
                                    disabled={updateDept.isPending}
                                    className="p-0.5 rounded text-gray-400 hover:text-[#283852] transition-colors disabled:opacity-40"
                                >
                                    <Cancel01Icon size={14} />
                                </button>
                            </>
                        ) : (
                            <span className="flex-1 text-gray-400">{t('departmentDetail.settings.noHod')}</span>
                        )}
                        <ArrowDown01Icon size={16} className={`text-gray-400 shrink-0 transition-transform ${headDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {headDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                            >
                                <div className="p-2 border-b border-gray-100">
                                    <div className="relative">
                                        <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                                        <input
                                            type="text"
                                            value={headSearch}
                                            onChange={e => setHeadSearch(e.target.value)}
                                            placeholder={t('departments.create.searchEmployee')}
                                            className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto py-1">
                                    {filteredHeadEmployees.map((emp: any) => (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => handleAppoint(String(emp.id))}
                                            disabled={updateDept.isPending}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors disabled:opacity-40 ${
                                                String(department.head?.id) === String(emp.id) ? 'bg-[#283852]/5' : ''
                                            }`}
                                        >
                                            {emp.avatar
                                                ? <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full border border-gray-200 shrink-0" />
                                                : <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">{emp.name[0]}</div>
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{emp.name}</p>
                                                <p className="text-[11px] text-gray-400 truncate">{emp.role}</p>
                                            </div>
                                            {updateDept.isPending
                                                ? <Loading02Icon size={14} className="animate-spin text-gray-400 shrink-0" />
                                                : String(department.head?.id) === String(emp.id) && <Tick01Icon size={16} className="text-[#283852] shrink-0" />
                                            }
                                        </button>
                                    ))}
                                    {filteredHeadEmployees.length === 0 && (
                                        <p className="text-sm text-gray-400 text-center py-3">{t('departments.create.noResults')}</p>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

/* ─── Main Component ────────────────────────────────────── */

interface DepartmentDetailProps {
    department: Department;
    activeTab: DepartmentTab;
}

const DepartmentDetail = ({ department, activeTab }: DepartmentDetailProps) => {
    switch (activeTab) {
        case 'overview':
            return <OverviewView department={department} />;
        case 'members':
            return <MembersView department={department} />;
        case 'projects':
            return <ProjectsView department={department} />;
        case 'budget':
            return <BudgetView department={department} />;
        case 'services':
            return <ServicesView department={department} />;
        case 'settings':
            return <SettingsView department={department} />;
        default:
            return <OverviewView department={department} />;
    }
};

export default DepartmentDetail;
