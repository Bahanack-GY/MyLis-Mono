import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Calendar,
  CheckCircle,
  Clock,
  MoreHorizontal,
  ArrowUpRight,
  Briefcase,
  AlertCircle,
  X,
  AlignLeft,
  Building,
  Users,
  TrendingUp,
  Upload,
  FileText,
  Trash2,
  Loader2,
  Pencil
} from 'lucide-react';
import { useProjects, useCreateProject, useProject, useUpdateProject } from '../../api/projects/hooks';
import { ProjectsSkeleton } from '../../components/Skeleton';
import { useDepartments } from '../../api/departments/hooks';
import { useClients, useCreateClient } from '../../api/clients/hooks';
import { useAuth, useDepartmentScope } from '../../contexts/AuthContext';
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
  Cell
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */

type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'overdue';

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  progress: number;
  startDate: string;
  endDate: string;
  department: string;
  tasksTotal: number;
  tasksDone: number;
  budget: string;
  revenue: string;
  category: string;
}

/* ─── Status config ─────────────────────────────────────── */

const STATUS_I18N: Record<ProjectStatus, string> = {
  active: 'statusActive',
  completed: 'statusCompleted',
  on_hold: 'statusOnHold',
  overdue: 'statusOverdue',
};

const STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string; dot: string }> = {
  active:    { bg: 'bg-emerald-50',  text: 'text-emerald-600',  dot: 'bg-emerald-500' },
  completed: { bg: 'bg-blue-50',     text: 'text-blue-600',     dot: 'bg-blue-500' },
  on_hold:   { bg: 'bg-amber-50',    text: 'text-amber-600',    dot: 'bg-amber-500' },
  overdue:   { bg: 'bg-rose-50',     text: 'text-rose-600',     dot: 'bg-rose-500' },
};

/* ─── (no mock data) ───────────────────────────────────── */

/* ─── Donut Chart ───────────────────────────────────────── */

const DONUT_COLORS = ['#33cbcc', '#3b82f6', '#f43f5e'];

const DonutChart = ({ projects }: { projects: Project[] }) => {
  const { t } = useTranslation();

  const donutData = [
    { name: t('projects.statusActive'),    value: projects.filter(p => p.status === 'active' || p.status === 'on_hold').length },
    { name: t('projects.statusCompleted'), value: projects.filter(p => p.status === 'completed').length },
    { name: t('projects.statusOverdue'),   value: projects.filter(p => p.status === 'overdue').length },
  ];

  const total = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-800">{t('projects.distribution')}</h3>
      </div>

      <div className="h-50 relative">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={5}
              dataKey="value"
              strokeWidth={0}
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-xs text-gray-400 font-medium">{t('projects.stats.total')}</p>
            <p className="text-2xl font-bold text-gray-800">{total}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {donutData.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DONUT_COLORS[i] }} />
              <span className="text-gray-600">{entry.name}</span>
            </div>
            <span className="font-semibold text-gray-800">{entry.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ─── Create Project Modal ──────────────────────────────── */

/* departments are now fetched from API inside the modal */

interface DocFile {
  name: string;
  size: string;
}

interface ProjectForm {
  name: string;
  description: string;
  department: string;
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

/* ─── Create Client Modal ────────────────────────────────── */

const CreateClientModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: (name: string) => void }) => {
  const { t } = useTranslation();
  const createClient = useCreateClient();
  const { data: apiDepartments } = useDepartments();

  const [form, setForm] = useState({
    name: '',
    type: 'one_time' as 'one_time' | 'subscription',
    department: '',
  });

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
        {/* Header */}
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

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className={labelCls}>
              <Users size={12} />
              {t('clients.name')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('clients.namePlaceholder')}
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Type */}
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

          {/* Department */}
          <div>
            <label className={labelCls}>
              <Building size={12} />
              {t('clients.department')}
            </label>
            <select
              value={form.department}
              onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
              className={selectCls}
            >
              <option value="">{t('clients.departmentPlaceholder')}</option>
              {(apiDepartments || []).map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            {t('clients.cancel')}
          </button>
          <button
            disabled={!isValid || createClient.isPending}
            onClick={() => {
              if (!isValid) return;
              const selectedDept = apiDepartments?.find(d => d.name === form.department);
              createClient.mutate({
                name: form.name,
                type: form.type,
                departmentId: selectedDept?.id,
              }, {
                onSuccess: () => {
                  onCreated(form.name);
                  onClose();
                },
              });
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
              isValid && !createClient.isPending
                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
                : 'bg-gray-300 cursor-not-allowed shadow-none'
            }`}
          >
            {createClient.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {t('clients.create')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Create Project Modal ───────────────────────────────── */

const CreateProjectModal = ({ onClose, hodDepartmentId }: { onClose: () => void; hodDepartmentId?: string | null }) => {
  const { t } = useTranslation();
  const createProject = useCreateProject();
  const { data: apiDepartments } = useDepartments();
  const { data: allClients } = useClients();
  const [showCreateClient, setShowCreateClient] = useState(false);

  const hodDepartment = hodDepartmentId
    ? (apiDepartments || []).find(d => d.id === hodDepartmentId)
    : null;

  const [form, setForm] = useState<ProjectForm>({
    name: '',
    description: '',
    department: '',
    client: '',
    cost: '',
    revenue: '',
    startDate: fmtToday(),
    dueDate: '',
    contract: null,
    srs: null,
    otherDocs: [],
  });

  // Auto-set department when HOD's department becomes available
  useEffect(() => {
    if (hodDepartment && !form.department) {
      setForm(prev => ({ ...prev, department: hodDepartment.name }));
    }
  }, [hodDepartment?.name]);

  // Close on Escape + lock scroll
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
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
    const newDocs: DocFile[] = Array.from(files).map(f => ({
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
    }));
    setForm(prev => ({ ...prev, otherDocs: [...prev.otherDocs, ...newDocs] }));
  };

  const removeOtherDoc = (idx: number) => {
    setForm(prev => ({ ...prev, otherDocs: prev.otherDocs.filter((_, i) => i !== idx) }));
  };

  const isValid = form.name.trim().length > 0 && form.department.length > 0 && form.dueDate.length > 0;

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

          {/* Project name */}
          <div>
            <label className={labelCls}>
              <Briefcase size={12} />
              {t('projects.formName')}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder={t('projects.formNamePlaceholder')}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              <AlignLeft size={12} />
              {t('projects.description')}
            </label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder={t('projects.formDescriptionPlaceholder')}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Department */}
          <div>
            <label className={labelCls}>
              <Building size={12} />
              {t('projects.formDepartment')}
            </label>
            {hodDepartment ? (
              <div className="w-full bg-gray-50 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-700 font-medium flex items-center gap-2">
                <Building size={13} className="text-gray-400 shrink-0" />
                {hodDepartment.name}
              </div>
            ) : (
              <select
                value={form.department}
                onChange={e => update('department', e.target.value)}
                className={selectCls}
              >
                <option value="">{t('projects.formDepartmentPlaceholder')}</option>
                {(apiDepartments || []).map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Client */}
          <div>
            <label className={labelCls}>
              <Users size={12} />
              {t('projects.formClient')}
            </label>
            <div className="flex gap-2">
              <select
                value={form.client}
                onChange={e => update('client', e.target.value)}
                className={selectCls}
              >
                <option value="">{t('projects.formClientPlaceholder')}</option>
                {(allClients || []).map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreateClient(true)}
                className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center text-[#33cbcc] hover:bg-[#33cbcc]/5 hover:border-[#33cbcc]/30 transition-colors"
                title={t('clients.createTitle')}
              >
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

          {/* Revenue */}
          <div>
            <label className={labelCls}>
              <TrendingUp size={12} />
              {t('projects.formRevenue')}
            </label>
            <input
              type="text"
              value={form.revenue}
              onChange={e => update('revenue', e.target.value)}
              placeholder="0 FCFA"
              className={inputCls}
            />
          </div>

          {/* Start date + Due date row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                <Calendar size={12} />
                {t('projects.startDate')}
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => update('startDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                <Calendar size={12} />
                {t('projects.formDueDate')}
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => update('dueDate', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* ── Documents section ── */}
          <div className="space-y-4">
            <p className={`${labelCls} mb-0`}>
              <FileText size={12} />
              {t('projects.formDocuments')}
            </p>

            {/* Contract */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formContract')}</p>
              {form.contract ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText size={14} className="text-[#33cbcc] shrink-0" />
                    <span className="font-medium text-gray-700 truncate max-w-[180px] inline-block align-bottom">{form.contract.name}</span>
                    <span className="text-gray-400 shrink-0">{form.contract.size}</span>
                  </div>
                  <button onClick={() => update('contract', null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                  <Upload size={16} />
                  {t('projects.formUpload')}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('contract', e)} />
                </label>
              )}
            </div>

            {/* SRS */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formSRS')}</p>
              {form.srs ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileText size={14} className="text-[#33cbcc] shrink-0" />
                    <span className="font-medium text-gray-700 truncate max-w-[180px] inline-block align-bottom">{form.srs.name}</span>
                    <span className="text-gray-400 shrink-0">{form.srs.size}</span>
                  </div>
                  <button onClick={() => update('srs', null)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                  <Upload size={16} />
                  {t('projects.formUpload')}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('srs', e)} />
                </label>
              )}
            </div>

            {/* Other documents */}
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">{t('projects.formOtherDocs')}</p>
              {form.otherDocs.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.otherDocs.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-2 text-sm min-w-0">
                        <FileText size={14} className="text-[#33cbcc] shrink-0" />
                        <span className="font-medium text-gray-700 truncate max-w-[180px] inline-block align-bottom">{doc.name}</span>
                        <span className="text-gray-400 shrink-0">{doc.size}</span>
                      </div>
                      <button onClick={() => removeOtherDoc(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-gray-400">
                <Upload size={16} />
                {t('projects.formUpload')}
                <input type="file" className="hidden" multiple onChange={handleOtherDocs} />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('projects.formCancel')}
          </button>
          <button
            onClick={() => {
              if (isValid) {
                const selectedDept = apiDepartments?.find(d => d.name === form.department);
                const selectedClient = allClients?.find(c => c.name === form.client);
                createProject.mutate({
                  name: form.name,
                  description: form.description || undefined,
                  departmentId: selectedDept?.id,
                  clientId: selectedClient?.id,
                  budget: form.cost ? parseFloat(form.cost) : undefined,
                  revenue: form.revenue ? parseFloat(form.revenue) : undefined,
                  startDate: form.startDate || undefined,
                  endDate: form.dueDate || undefined,
                }, { onSuccess: () => onClose() });
              }
            }}
            disabled={!isValid || createProject.isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
              isValid
                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
                : 'bg-gray-300 cursor-not-allowed shadow-none'
            }`}
          >
            {createProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {t('projects.formCreate')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Edit Project Modal ─────────────────────────────────── */

const EditProjectModal = ({ projectId, onClose }: { projectId: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const { data: apiProject, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();
  const { data: apiDepartments } = useDepartments();
  const { data: allClients } = useClients();

  const [form, setForm] = useState({
    name: '',
    description: '',
    departmentId: '',
    clientId: '',
    cost: '',
    revenue: '',
    startDate: '',
    dueDate: '',
  });

  useEffect(() => {
    if (apiProject) {
      setForm({
        name: apiProject.name || '',
        description: apiProject.description || '',
        departmentId: apiProject.departmentId || '',
        clientId: apiProject.clientId || '',
        cost: apiProject.budget ? String(apiProject.budget) : '',
        revenue: apiProject.revenue ? String(apiProject.revenue) : '',
        startDate: apiProject.startDate ? apiProject.startDate.slice(0, 10) : '',
        dueDate: apiProject.endDate ? apiProject.endDate.slice(0, 10) : '',
      });
    }
  }, [apiProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

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
              <Pencil size={18} className="text-[#33cbcc]" />
            </div>
            <h3 className="text-base font-bold text-gray-800">{t('projects.editTitle')}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-[#33cbcc]" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            <div>
              <label className={labelCls}><Briefcase size={12} />{t('projects.formName')}</label>
              <input type="text" value={form.name} onChange={e => update('name', e.target.value)} placeholder={t('projects.formNamePlaceholder')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}><AlignLeft size={12} />{t('projects.description')}</label>
              <textarea value={form.description} onChange={e => update('description', e.target.value)} placeholder={t('projects.formDescriptionPlaceholder')} rows={3} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}><Building size={12} />{t('projects.formDepartment')}</label>
              <select value={form.departmentId} onChange={e => update('departmentId', e.target.value)} className={selectCls}>
                <option value="">{t('projects.formDepartmentPlaceholder')}</option>
                {(apiDepartments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}><Users size={12} />{t('projects.formClient')}</label>
              <select value={form.clientId} onChange={e => update('clientId', e.target.value)} className={selectCls}>
                <option value="">{t('projects.formClientPlaceholder')}</option>
                {(allClients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}><TrendingUp size={12} />{t('projects.formRevenue')}</label>
              <input type="text" value={form.revenue} onChange={e => update('revenue', e.target.value)} placeholder="0 FCFA" className={inputCls} />
            </div>
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
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
            {t('projects.formCancel')}
          </button>
          <button
            onClick={() => {
              if (isValid) {
                updateProject.mutate({
                  id: projectId,
                  dto: {
                    name: form.name,
                    description: form.description || undefined,
                    departmentId: form.departmentId || undefined,
                    clientId: form.clientId || undefined,
                    budget: form.cost ? parseFloat(form.cost) : undefined,
                    revenue: form.revenue ? parseFloat(form.revenue) : undefined,
                    startDate: form.startDate || undefined,
                    endDate: form.dueDate || undefined,
                  },
                }, { onSuccess: () => onClose() });
              }
            }}
            disabled={!isValid || updateProject.isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-[#33cbcc]/20 ${
              isValid ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-gray-300 cursor-not-allowed shadow-none'
            }`}
          >
            {updateProject.isPending ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
            {t('projects.formSave')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Component ─────────────────────────────────────────── */

const Projects = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

  // API data
  const { role, departmentId } = useAuth();
  const deptScope = useDepartmentScope();
  const { data: apiProjects, isLoading } = useProjects(deptScope);
  const { data: apiDepartments } = useDepartments();
  const isHod = role === 'HEAD_OF_DEPARTMENT';

  // Map API projects to display shape — no mock fallback
  const projects: Project[] = (apiProjects || []).map((p) => {
      const tasks = p.tasks || [];
      const tasksDone = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;
      const allDone = tasks.length > 0 && tasksDone === tasks.length;
      let status: ProjectStatus = 'active';
      if (allDone && tasks.length > 0) status = 'completed';
      else if (p.endDate && new Date(p.endDate) < new Date() && !allDone) status = 'overdue';

      return {
          id: p.id,
          name: p.name,
          description: p.description || '',
          status,
          progress: tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0,
          startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : '',
          endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : '',
          department: p.department?.name || '',
          tasksTotal: tasks.length,
          tasksDone,
          budget: p.budget ? `${new Intl.NumberFormat('fr-FR').format(p.budget)} FCFA` : '',
          revenue: p.revenue ? `${new Intl.NumberFormat('fr-FR').format(p.revenue)} FCFA` : '',
          category: p.department?.name || '',
      };
  });


  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || p.department === filterDepartment;
    return matchesSearch && matchesFilter && matchesDepartment;
  });

  const stats = [
    { label: t('projects.stats.total'),     value: projects.length,                                       icon: Briefcase,   color: '#283852' },
    { label: t('projects.stats.active'),    value: projects.filter(p => p.status === 'active').length,     icon: Clock,       color: '#33cbcc' },
    { label: t('projects.stats.completed'), value: projects.filter(p => p.status === 'completed').length,  icon: CheckCircle, color: '#3b82f6' },
    { label: t('projects.stats.overdue'),   value: projects.filter(p => p.status === 'overdue').length,    icon: AlertCircle, color: '#f43f5e' },
  ];

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const activityData = useMemo(() => {
    const counts: Record<number, number> = {};
    (apiProjects || []).forEach(p => {
      const date = p.startDate || p.endDate;
      if (date) {
        const month = new Date(date).getMonth();
        counts[month] = (counts[month] || 0) + 1;
      }
    });
    const currentMonth = new Date().getMonth();
    const result: { name: string; projects: number }[] = [];
    for (let i = 0; i <= currentMonth; i++) {
      result.push({ name: MONTH_LABELS[i], projects: counts[i] || 0 });
    }
    return result;
  }, [apiProjects]);

  const statusFilters: { key: ProjectStatus | 'all'; label: string }[] = [
    { key: 'all',       label: t('projects.filterAll') },
    { key: 'active',    label: t('projects.statusActive') },
    { key: 'completed', label: t('projects.statusCompleted') },
    { key: 'on_hold',   label: t('projects.statusOnHold') },
    { key: 'overdue',   label: t('projects.statusOverdue') },
  ];

  if (isLoading) {
    return <ProjectsSkeleton />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('projects.title')}</h1>
          <p className="text-gray-500 mt-1">{t('projects.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
        >
          <Plus size={16} />
          {t('projects.newProject')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-[#33cbcc]/50 transition-colors"
          >
            <div className="relative z-10">
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
            </div>
            <div
              className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out"
              style={{ color: stat.color }}
            >
              <stat.icon size={100} strokeWidth={1.5} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
          <Search className="text-gray-400 ml-3" size={20} />
          <input
            type="text"
            placeholder={t('projects.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 px-3"
          />
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 px-3">
          <Building size={16} className="text-gray-400 shrink-0" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-transparent border-none text-sm font-medium text-gray-700 focus:outline-none focus:ring-0 py-2.5 cursor-pointer appearance-none pr-6"
          >
            <option value="all">{t('projects.filterAll')}</option>
            {(apiDepartments || []).map(d => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((sf) => (
            <button
              key={sf.key}
              onClick={() => setFilterStatus(sf.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filterStatus === sf.key
                  ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                  : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
              }`}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart + Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Charts */}
        <div className="space-y-8">
        {/* Area Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-gray-100"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">{t('projects.chartTitle')}</h3>
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
              <MoreHorizontal size={20} />
            </button>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#33cbcc', strokeWidth: 2 }}
                />
                <Area type="monotone" dataKey="projects" stroke="#33cbcc" strokeWidth={3} fillOpacity={1} fill="url(#colorProjects)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Donut Chart — Status Distribution */}
        <DonutChart projects={projects} />
        </div>

        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredProjects.length === 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
              <Briefcase size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400 font-medium">{t('projects.noResults')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-xl hover:bg-[#2bb5b6] transition-colors"
              >
                {t('projects.newProject')}
              </button>
            </div>
          )}
          {filteredProjects.map((project, index) => {
            const style = STATUS_STYLES[project.status];
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                onClick={() => setSelectedProject(project)}
                className="bg-white rounded-2xl p-6 border border-gray-100 hover:border-[#33cbcc]/30 transition-all cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-gray-800 truncate">{project.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {t(`projects.${STATUS_I18N[project.status]}`)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{project.description}</p>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1.5 text-sm">
                        <span className="text-gray-400">{t('projects.progress')}</span>
                        <span className="font-bold text-gray-700">{project.progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress}%` }}
                          transition={{ delay: 0.3 + index * 0.08, duration: 1 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: project.progress === 100 ? '#3b82f6' : '#33cbcc' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Meta */}
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-3 shrink-0">
                    {/* Department */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Building size={14} />
                      <span className="font-medium">{project.department}</span>
                    </div>

                    {/* Tasks count */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <CheckCircle size={14} />
                      <span>{project.tasksDone}/{project.tasksTotal}</span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Calendar size={14} />
                      <span>{project.endDate}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onEdit={() => { setEditProjectId(selectedProject.id); setSelectedProject(null); }}
          />
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {editProjectId && (
          <EditProjectModal
            projectId={editProjectId}
            onClose={() => setEditProjectId(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Project Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateProjectModal onClose={() => setShowCreateModal(false)} hodDepartmentId={isHod ? departmentId : null} />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Project Detail Modal ──────────────────────────────── */

const ProjectDetailModal = ({
  project,
  onClose,
  onEdit,
}: {
  project: Project;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const style = STATUS_STYLES[project.status];

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const taskProgress = project.tasksTotal > 0
    ? Math.round((project.tasksDone / project.tasksTotal) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#283852] flex items-center justify-center">
                  <Briefcase size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{project.name}</h2>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                    {t(`projects.${STATUS_I18N[project.status]}`)}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
              <AlignLeft size={14} />
              {t('projects.description')}
            </div>
            <p className="text-gray-600">{project.description}</p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{t('projects.formDepartment')}</p>
              <p className="font-semibold text-gray-800">{project.department}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{t('projects.formCost')}</p>
              <p className="font-semibold text-gray-800">{project.budget || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{t('projects.formRevenue')}</p>
              <p className="font-semibold text-gray-800">{project.revenue || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{t('projects.startDate')}</p>
              <p className="font-semibold text-gray-800">{project.startDate}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{t('projects.endDate')}</p>
              <p className="font-semibold text-gray-800">{project.endDate}</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-500">{t('projects.progress')}</span>
              <span className="text-sm font-bold text-gray-700">{project.progress}%</span>
            </div>
            <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.progress}%` }}
                transition={{ duration: 1 }}
                className="h-full rounded-full"
                style={{ backgroundColor: project.progress === 100 ? '#3b82f6' : '#33cbcc' }}
              />
            </div>
          </div>

          {/* Tasks */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-gray-500">{t('projects.tasks')}</span>
              <span className="text-sm text-gray-400">
                {project.tasksDone}/{project.tasksTotal} ({taskProgress}%)
              </span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskProgress}%` }}
                transition={{ delay: 0.3, duration: 1 }}
                className="h-full rounded-full bg-[#283852]"
              />
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {t('projects.close')}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200"
          >
            <Pencil size={16} />
            {t('projects.editTitle')}
          </button>
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
          >
            <ArrowUpRight size={16} />
            {t('projects.viewDetails')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Projects;
