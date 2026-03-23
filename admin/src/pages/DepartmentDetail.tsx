import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    FolderKanban,
    Wallet,
    TrendingUp,
    Crown,
    Briefcase,
    Building,
    Palette,
    Bell,
    Shield,
    ChevronRight,
    Plus,
    X,
    Search,
    Calendar,
    DollarSign,
    Upload,
    FileText,
    Trash2,
    Loader2,
    AlignLeft,
} from 'lucide-react';
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

/* ─── Status helpers ────────────────────────────────────── */

const PROJECT_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    active:    { bg: 'bg-emerald-50',  text: 'text-emerald-600',  dot: 'bg-emerald-500' },
    completed: { bg: 'bg-blue-50',     text: 'text-blue-600',     dot: 'bg-blue-500' },
    on_hold:   { bg: 'bg-amber-50',    text: 'text-amber-600',    dot: 'bg-amber-500' },
    overdue:   { bg: 'bg-rose-50',     text: 'text-rose-600',     dot: 'bg-rose-500' },
};

const STATUS_I18N: Record<string, string> = {
    active: 'statusActive',
    completed: 'statusCompleted',
    on_hold: 'statusOnHold',
    overdue: 'statusOverdue',
};

/* ─── Helpers ──────────────────────────────────────────── */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ROLE_COLORS = ['#33cbcc', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#22c55e', '#ef4444'];
const BAR_COLORS = ['#33cbcc', '#3b82f6', '#8b5cf6', '#f59e0b', '#f43f5e'];

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
            avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`,
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
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('departmentDetail.members.searchEmployee')}
                            className="w-full bg-gray-50 rounded-xl border border-gray-200 pl-10 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
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
                                    style={{ backgroundColor: `${department.color}15`, color: department.color }}
                                >
                                    {t('departmentDetail.members.add')}
                                </span>
                            </button>
                        ))
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <Users size={32} className="mx-auto mb-3 opacity-30" />
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
    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
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
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center">
                            <Users size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('clients.createTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <div>
                        <label className={labelCls}><Users size={12} />{t('clients.name')}</label>
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${isValid && !createClient.isPending ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                    >
                        {createClient.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                            <Plus size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('projects.createTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
                    {/* Department (read-only, pre-filled) */}
                    <div>
                        <label className={labelCls}><Building size={12} />{t('projects.formDepartment')}</label>
                        <div
                            className="flex items-center gap-3 w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-2.5"
                        >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: department.color }} />
                            <span className="text-sm font-medium text-gray-700">{department.name}</span>
                        </div>
                    </div>

                    {/* Project name */}
                    <div>
                        <label className={labelCls}><Briefcase size={12} />{t('projects.formName')}</label>
                        <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder={t('projects.formNamePlaceholder')} className={inputCls} autoFocus />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}><AlignLeft size={12} />{t('projects.description')}</label>
                        <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder={t('projects.formDescriptionPlaceholder')} rows={3} className={`${inputCls} resize-none`} />
                    </div>

                    {/* Client */}
                    <div>
                        <label className={labelCls}><Users size={12} />{t('projects.formClient')}</label>
                        <div className="flex gap-2">
                            <select value={form.client} onChange={e => update('client', e.target.value)} className={selectCls}>
                                <option value="">{t('projects.formClientPlaceholder')}</option>
                                {(allClients || []).map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                            <button type="button" onClick={() => setShowCreateClient(true)} className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-[#33cbcc] hover:bg-[#33cbcc]/5 hover:border-[#33cbcc]/30 transition-colors" title={t('clients.createTitle')}>
                                <Plus size={16} />
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
                            <label className={labelCls}><DollarSign size={12} />{t('projects.formCost')}</label>
                            <input type="text" value={form.cost} onChange={e => update('cost', e.target.value)} placeholder="0 FCFA" className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}><TrendingUp size={12} />{t('projects.formRevenue')}</label>
                            <input type="text" value={form.revenue} onChange={e => update('revenue', e.target.value)} placeholder="0 FCFA" className={inputCls} />
                        </div>
                    </div>

                    {/* Start + Due dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}><Calendar size={12} />{t('projects.startDate')}</label>
                            <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}><Calendar size={12} />{t('projects.formDueDate')}</label>
                            <input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className={inputCls} />
                        </div>
                    </div>

                    {/* Documents */}
                    <div className="space-y-4">
                        <p className={`${labelCls} mb-0`}><FileText size={12} />{t('projects.formDocuments')}</p>

                        {/* Contract */}
                        <div>
                            <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formContract')}</p>
                            {form.contract ? (
                                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FileText size={14} className="text-[#33cbcc]" />
                                        <span className="font-medium text-gray-700">{form.contract.name}</span>
                                        <span className="text-gray-400">{form.contract.size}</span>
                                    </div>
                                    <button onClick={() => update('contract', null)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                                    <Upload size={16} />{t('projects.formUpload')}
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
                                        <FileText size={14} className="text-[#33cbcc]" />
                                        <span className="font-medium text-gray-700">{form.srs.name}</span>
                                        <span className="text-gray-400">{form.srs.size}</span>
                                    </div>
                                    <button onClick={() => update('srs', null)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            ) : (
                                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                                    <Upload size={16} />{t('projects.formUpload')}
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
                                                <FileText size={14} className="text-[#33cbcc]" />
                                                <span className="font-medium text-gray-700">{doc.name}</span>
                                                <span className="text-gray-400">{doc.size}</span>
                                            </div>
                                            <button onClick={() => removeOtherDoc(i)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                                <Upload size={16} />{t('projects.formUpload')}
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
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${isValid && !createProject.isPending ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
                    >
                        {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
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

    const { data: projects } = useProjects(deptId);
    const { data: tasks } = useTasks(deptId);
    const { data: invoiceStats } = useInvoiceStats(deptId);

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

    const revenue = invoiceStats?.totalRevenue ?? 0;

    const stats = [
        { label: t('departmentDetail.overview.totalMembers'), value: department.employees.length, icon: Users, color: department.color },
        { label: t('departmentDetail.overview.activeProjects'), value: projectCount, icon: FolderKanban, color: '#3b82f6' },
        { label: t('departmentDetail.overview.budget'), value: revenue >= 1000000 ? `${(revenue / 1000000).toFixed(1)}M` : `${(revenue / 1000).toFixed(0)}K`, icon: Wallet, color: '#8b5cf6' },
        { label: t('departmentDetail.overview.avgProgress'), value: projectCount > 0 ? `${avgProgress}%` : 'N/A', icon: TrendingUp, color: '#f59e0b' },
    ];

    // Monthly activity from real tasks
    const activityData = useMemo(() => {
        const counts: Record<number, number> = {};
        (tasks || []).forEach(task => {
            const month = new Date(task.createdAt).getMonth();
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
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${department.color}15` }}>
                    <department.icon size={22} style={{ color: department.color }} />
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
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={100} strokeWidth={1.5} />
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
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorDeptActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={department.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={department.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="tasks" stroke={department.color} strokeWidth={2} fill="url(#colorDeptActivity)" />
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
                        <ResponsiveContainer width="100%" height="100%">
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
                    { icon: Crown, label: t('departmentDetail.overview.head'), value: department.head.name, avatar: department.head.avatar },
                    { icon: Wallet, label: t('departmentDetail.overview.budgetLabel'), value: revenue >= 1000000 ? `${(revenue / 1000000).toFixed(1)}M FCFA` : `${(revenue / 1000).toFixed(0)}K FCFA` },
                    { icon: Briefcase, label: t('departmentDetail.overview.projectsLabel'), value: String(projectCount) },
                    { icon: Users, label: t('departmentDetail.overview.teamSize'), value: `${department.employees.length} members` },
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
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Plus size={16} />
                    {t('departmentDetail.members.addMember')}
                </button>
            </div>

            {/* Head card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => navigate(`/employees/${department.head.id}`)}
                className="bg-white rounded-3xl p-6 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                style={{ border: `2px solid ${department.color}20` }}
            >
                <div className="absolute top-4 right-4">
                    <span
                        className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: `${department.color}15`, color: department.color }}
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
                            className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md cursor-pointer transition-all"
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
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
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
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Plus size={16} />
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
                                        <Briefcase size={18} className="text-gray-400" />
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
                                            style={{ backgroundColor: department.color }}
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
                    <Briefcase size={48} className="mx-auto mb-4 opacity-30" />
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

    const { data: invoices } = useInvoices(deptId);
    const { data: invoiceStats } = useInvoiceStats(deptId);
    const { data: projects } = useProjects(deptId);

    const totalRevenue = invoiceStats?.totalRevenue ?? 0;
    const totalPending = invoiceStats?.totalPending ?? 0;
    const totalBudget = useMemo(() => (projects || []).reduce((s, p) => s + (p.budget || 0), 0), [projects]);
    const perEmployee = department.employees.length > 0 ? Math.round(totalRevenue / department.employees.length) : 0;

    const formatVal = (v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`;

    const budgetStats = [
        { label: t('departmentDetail.budget.totalBudget'), value: formatVal(totalBudget), icon: Wallet, color: department.color },
        { label: t('departmentDetail.budget.totalExpenses'), value: formatVal(totalPending), icon: TrendingUp, color: '#f43f5e' },
        { label: t('departmentDetail.budget.remaining'), value: formatVal(totalRevenue), icon: Wallet, color: '#22c55e' },
        { label: t('departmentDetail.budget.perEmployee'), value: formatVal(perEmployee), icon: Users, color: '#3b82f6' },
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
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                            <p className="text-xs text-gray-400 mt-1">FCFA</p>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={100} strokeWidth={1.5} />
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
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={expenses} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString()} FCFA`, '']}
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
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthlyData}>
                                <defs>
                                    <linearGradient id="colorDeptBudgetSpend" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={department.color} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={department.color} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                    formatter={(value: number | undefined) => [`${(value || 0).toLocaleString()} FCFA`, 'Amount']}
                                />
                                <Area type="monotone" dataKey="spend" stroke={department.color} strokeWidth={2} fill="url(#colorDeptBudgetSpend)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

/* ─── Settings View ─────────────────────────────────────── */

const SettingsView = ({ department }: { department: Department }) => {
    const { t } = useTranslation();

    const sections = [
        { icon: Building, title: t('departmentDetail.settings.general'), description: t('departmentDetail.settings.generalDesc') },
        { icon: Palette, title: t('departmentDetail.settings.appearance'), description: t('departmentDetail.settings.appearanceDesc') },
        { icon: Bell, title: t('departmentDetail.settings.notifications'), description: t('departmentDetail.settings.notificationsDesc') },
        { icon: Shield, title: t('departmentDetail.settings.permissions'), description: t('departmentDetail.settings.permissionsDesc') },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('departmentDetail.settings.title')}</h2>

            <div className="space-y-4">
                {sections.map((section, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between group hover:border-[#33cbcc]/30 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${department.color}10` }}
                            >
                                <section.icon size={20} style={{ color: department.color }} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-800">{section.title}</p>
                                <p className="text-sm text-gray-400">{section.description}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} className="text-gray-300 group-hover:text-[#33cbcc] transition-colors" />
                    </motion.div>
                ))}
            </div>
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
        case 'settings':
            return <SettingsView department={department} />;
        default:
            return <OverviewView department={department} />;
    }
};

export default DepartmentDetail;
