import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search01Icon, Add01Icon, Calendar01Icon, Tick01Icon, Clock01Icon, MoreHorizontalIcon, ArrowUpRight01Icon, Briefcase01Icon, Alert01Icon, Cancel01Icon, AlignLeftIcon, Building01Icon, UserGroupIcon, Upload01Icon, File01Icon, Delete02Icon, Loading02Icon, PencilIcon, Wrench01Icon } from 'hugeicons-react';
import { useProjects, useCreateProject, useProject, useUpdateProject } from '../../api/projects/hooks';
import { ProjectsSkeleton } from '../../components/Skeleton';
import { useDepartments, useDepartmentServices } from '../../api/departments/hooks';
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
  active:    'statusActive',
  completed: 'statusCompleted',
  on_hold:   'statusOnHold',
  overdue:   'statusOverdue',
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  active:    '#33cbcc',
  completed: '#b0bac9',
  on_hold:   '#283852',
  overdue:   '#e05e5e',
};

const STATUS_TEXT: Record<ProjectStatus, string> = {
  active:    'text-[#33cbcc]',
  completed: 'text-[#b0bac9]',
  on_hold:   'text-[#283852]',
  overdue:   'text-[#e05e5e]',
};

/* ─── Shared form styles ────────────────────────────────── */

const INPUT = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-2.5 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors';
const SELECT = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-2.5 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] transition-colors appearance-none cursor-pointer';
const LABEL = 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1.5';

/* ─── Panel component ───────────────────────────────────── */

const Panel = ({
  children,
  onClose,
  wide = false,
  zIndex = 'z-50',
}: {
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
  zIndex?: string;
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className={`fixed inset-0 bg-black/30 ${zIndex} flex justify-end`}
  >
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onClick={e => e.stopPropagation()}
      className={`bg-white ${wide ? 'w-full max-w-lg' : 'w-full max-w-sm'} h-full flex flex-col border-l border-[#e5e8ef]`}
    >
      {children}
    </motion.div>
  </motion.div>
);

/* ─── Donut Chart ───────────────────────────────────────── */

const DONUT_COLORS = ['#33cbcc', '#283852', '#e05e5e'];

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
      className="bg-white p-6 border border-[#e5e8ef] flex flex-col"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-[#1c2b3a]">{t('projects.distribution')}</h3>
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
              paddingAngle={4}
              dataKey="value"
              strokeWidth={0}
            >
              {donutData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ border: '1px solid #e5e8ef', boxShadow: 'none', borderRadius: 0 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8892a4]">{t('projects.stats.total')}</p>
            <p className="text-2xl font-bold text-[#1c2b3a]">{total}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {donutData.map((entry, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5" style={{ backgroundColor: DONUT_COLORS[i] }} />
              <span className="text-[#8892a4] text-xs">{entry.name}</span>
            </div>
            <span className="font-bold text-[#1c2b3a] text-sm">{entry.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ─── Create Client Modal (small centered overlay) ──────── */

interface DocFile { name: string; size: string; }

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        className="bg-white border border-[#e5e8ef] w-full max-w-md overflow-hidden"
      >
        {/* Top accent */}
        <div className="h-1 bg-[#33cbcc]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#e5e8ef] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#1c2b3a]">{t('clients.createTitle')}</h3>
          <button onClick={onClose} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
            <Cancel01Icon size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={LABEL}><UserGroupIcon size={11} />{t('clients.name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t('clients.namePlaceholder')}
              className={INPUT}
              autoFocus
            />
          </div>
          <div>
            <label className={LABEL}>{t('clients.type')}</label>
            <select
              value={form.type}
              onChange={e => setForm(prev => ({ ...prev, type: e.target.value as 'one_time' | 'subscription' }))}
              className={SELECT}
            >
              <option value="one_time">{t('clients.typeOneTime')}</option>
              <option value="subscription">{t('clients.typeSubscription')}</option>
            </select>
          </div>
          <div>
            <label className={LABEL}><Building01Icon size={11} />{t('clients.department')}</label>
            <select
              value={form.department}
              onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
              className={SELECT}
            >
              <option value="">{t('clients.departmentPlaceholder')}</option>
              {(apiDepartments || []).map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e5e8ef] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
          >
            {t('clients.cancel')}
          </button>
          <button
            disabled={!isValid || createClient.isPending}
            onClick={() => {
              if (!isValid) return;
              const selectedDept = apiDepartments?.find(d => d.name === form.department);
              createClient.mutate(
                { name: form.name, type: form.type, departmentId: selectedDept?.id },
                { onSuccess: () => { onCreated(form.name); onClose(); } }
              );
            }}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white transition-colors ${
              isValid && !createClient.isPending ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-[#b0bac9] cursor-not-allowed'
            }`}
          >
            {createClient.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Add01Icon size={14} />}
            {t('clients.create')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ─── Create Project Panel ───────────────────────────────── */

const CreateProjectPanel = ({ onClose, hodDepartmentId }: { onClose: () => void; hodDepartmentId?: string | null }) => {
  const { t } = useTranslation();
  const createProject = useCreateProject();
  const { data: apiDepartments } = useDepartments();
  const { data: allClients } = useClients();
  const [showCreateClient, setShowCreateClient] = useState(false);

  const hodDepartment = hodDepartmentId
    ? (apiDepartments || []).find(d => d.id === hodDepartmentId)
    : null;

  const [form, setForm] = useState<ProjectForm>({
    name: '', description: '', department: '', client: '',
    cost: '', revenue: '', startDate: fmtToday(), dueDate: '',
    contract: null, srs: null, otherDocs: [],
  });

  useEffect(() => {
    if (hodDepartment && !form.department) {
      setForm(prev => ({ ...prev, department: hodDepartment.name }));
    }
  }, [hodDepartment?.name]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const update = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

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

  const removeOtherDoc = (idx: number) =>
    setForm(prev => ({ ...prev, otherDocs: prev.otherDocs.filter((_, i) => i !== idx) }));

  const isValid = form.name.trim().length > 0 && form.department.length > 0 && form.dueDate.length > 0;

  return (
    <Panel onClose={onClose} wide>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
            {t('projects.title')}
          </p>
          <h3 className="text-sm font-bold text-[#1c2b3a]">{t('projects.createTitle')}</h3>
        </div>
        <button onClick={onClose} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
          <Cancel01Icon size={18} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
        <div>
          <label className={LABEL}><Briefcase01Icon size={11} />{t('projects.formName')}</label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            placeholder={t('projects.formNamePlaceholder')} className={INPUT} />
        </div>
        <div>
          <label className={LABEL}><AlignLeftIcon size={11} />{t('projects.description')}</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder={t('projects.formDescriptionPlaceholder')} rows={3}
            className={`${INPUT} resize-none`} />
        </div>
        <div>
          <label className={LABEL}><Building01Icon size={11} />{t('projects.formDepartment')}</label>
          {hodDepartment ? (
            <div className="w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-2.5 text-sm text-[#1c2b3a] flex items-center gap-2">
              <Building01Icon size={13} className="text-[#b0bac9] shrink-0" />
              {hodDepartment.name}
            </div>
          ) : (
            <select value={form.department} onChange={e => update('department', e.target.value)} className={SELECT}>
              <option value="">{t('projects.formDepartmentPlaceholder')}</option>
              {(apiDepartments || []).map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className={LABEL}><UserGroupIcon size={11} />{t('projects.formClient')}</label>
          <div className="flex gap-2">
            <select value={form.client} onChange={e => update('client', e.target.value)} className={SELECT}>
              <option value="">{t('projects.formClientPlaceholder')}</option>
              {(allClients || []).map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCreateClient(true)}
              className="shrink-0 w-10 h-10 border border-[#e5e8ef] flex items-center justify-center text-[#33cbcc] hover:bg-[#33cbcc]/5 hover:border-[#33cbcc] transition-colors"
              title={t('clients.createTitle')}
            >
              <Add01Icon size={16} />
            </button>
          </div>
        </div>
        <div>
          <label className={LABEL}><ArrowUpRight01Icon size={11} />{t('projects.formRevenue')}</label>
          <input type="text" value={form.revenue} onChange={e => update('revenue', e.target.value)}
            placeholder="0 FCFA" className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}><Calendar01Icon size={11} />{t('projects.startDate')}</label>
            <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}><Calendar01Icon size={11} />{t('projects.formDueDate')}</label>
            <input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className={INPUT} />
          </div>
        </div>

        {/* Documents */}
        <div className="space-y-4">
          <p className={`${LABEL} mb-0`}><File01Icon size={11} />{t('projects.formDocuments')}</p>
          {/* Contract */}
          <div>
            <p className="text-xs font-medium text-[#8892a4] mb-1.5">{t('projects.formContract')}</p>
            {form.contract ? (
              <div className="flex items-center justify-between bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <File01Icon size={14} className="text-[#33cbcc] shrink-0" />
                  <span className="font-medium text-[#1c2b3a] truncate max-w-[180px] inline-block">{form.contract.name}</span>
                  <span className="text-[#b0bac9] shrink-0">{form.contract.size}</span>
                </div>
                <button onClick={() => update('contract', null)} className="text-[#b0bac9] hover:text-[#e05e5e] transition-colors">
                  <Delete02Icon size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5e8ef] px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-[#b0bac9]">
                <Upload01Icon size={16} />
                {t('projects.formUpload')}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('contract', e)} />
              </label>
            )}
          </div>
          {/* SRS */}
          <div>
            <p className="text-xs font-medium text-[#8892a4] mb-1.5">{t('projects.formSRS')}</p>
            {form.srs ? (
              <div className="flex items-center justify-between bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <File01Icon size={14} className="text-[#33cbcc] shrink-0" />
                  <span className="font-medium text-[#1c2b3a] truncate max-w-[180px] inline-block">{form.srs.name}</span>
                  <span className="text-[#b0bac9] shrink-0">{form.srs.size}</span>
                </div>
                <button onClick={() => update('srs', null)} className="text-[#b0bac9] hover:text-[#e05e5e] transition-colors">
                  <Delete02Icon size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5e8ef] px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-[#b0bac9]">
                <Upload01Icon size={16} />
                {t('projects.formUpload')}
                <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={e => handleFileSelect('srs', e)} />
              </label>
            )}
          </div>
          {/* Other docs */}
          <div>
            <p className="text-xs font-medium text-[#8892a4] mb-1.5">{t('projects.formOtherDocs')}</p>
            {form.otherDocs.length > 0 && (
              <div className="space-y-2 mb-3">
                {form.otherDocs.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <File01Icon size={14} className="text-[#33cbcc] shrink-0" />
                      <span className="font-medium text-[#1c2b3a] truncate max-w-[180px] inline-block">{doc.name}</span>
                      <span className="text-[#b0bac9] shrink-0">{doc.size}</span>
                    </div>
                    <button onClick={() => removeOtherDoc(i)} className="text-[#b0bac9] hover:text-[#e05e5e] transition-colors">
                      <Delete02Icon size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#e5e8ef] px-4 py-4 cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all text-sm text-[#b0bac9]">
              <Upload01Icon size={16} />
              {t('projects.formUpload')}
              <input type="file" className="hidden" multiple onChange={handleOtherDocs} />
            </label>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#e5e8ef] flex justify-end gap-3 shrink-0">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
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
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white transition-colors ${
            isValid ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-[#b0bac9] cursor-not-allowed'
          }`}
        >
          {createProject.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Add01Icon size={14} />}
          {t('projects.formCreate')}
        </button>
      </div>

      <AnimatePresence>
        {showCreateClient && (
          <CreateClientModal
            onClose={() => setShowCreateClient(false)}
            onCreated={(name) => update('client', name)}
          />
        )}
      </AnimatePresence>
    </Panel>
  );
};

/* ─── Edit Project Panel ─────────────────────────────────── */

const EditProjectPanel = ({ projectId, onClose }: { projectId: string; onClose: () => void }) => {
  const { t } = useTranslation();
  const { data: apiProject, isLoading } = useProject(projectId);
  const updateProject = useUpdateProject();
  const { data: apiDepartments } = useDepartments();
  const { data: allClients } = useClients();

  const [form, setForm] = useState({
    name: '', description: '', departmentId: '', clientId: '',
    serviceIds: [] as string[], cost: '', revenue: '', startDate: '', dueDate: '',
  });

  const { data: departmentServices } = useDepartmentServices(form.departmentId || undefined);

  useEffect(() => {
    if (apiProject) {
      setForm({
        name: apiProject.name || '',
        description: apiProject.description || '',
        departmentId: apiProject.departmentId || '',
        clientId: apiProject.clientId || '',
        serviceIds: (apiProject.services || []).map(s => s.id),
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

  return (
    <Panel onClose={onClose} wide>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
            {t('projects.title')}
          </p>
          <h3 className="text-sm font-bold text-[#1c2b3a]">{t('projects.editTitle')}</h3>
        </div>
        <button onClick={onClose} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors">
          <Cancel01Icon size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loading02Icon size={24} className="animate-spin text-[#33cbcc]" />
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
          <div>
            <label className={LABEL}><Briefcase01Icon size={11} />{t('projects.formName')}</label>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
              placeholder={t('projects.formNamePlaceholder')} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}><AlignLeftIcon size={11} />{t('projects.description')}</label>
            <textarea value={form.description} onChange={e => update('description', e.target.value)}
              placeholder={t('projects.formDescriptionPlaceholder')} rows={3}
              className={`${INPUT} resize-none`} />
          </div>
          <div>
            <label className={LABEL}><Building01Icon size={11} />{t('projects.formDepartment')}</label>
            <select value={form.departmentId} onChange={e => { update('departmentId', e.target.value); update('serviceIds', []); }} className={SELECT}>
              <option value="">{t('projects.formDepartmentPlaceholder')}</option>
              {(apiDepartments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {form.departmentId && (
            <div>
              <label className={LABEL}><Wrench01Icon size={11} />{t('projects.formServices', 'Services')}</label>
              {(departmentServices || []).filter(s => s.isActive).length === 0 ? (
                <p className="text-xs text-[#b0bac9] py-2">{t('projects.noServices', 'No active services for this department')}</p>
              ) : (
                <div className="space-y-2">
                  {(departmentServices || []).filter(s => s.isActive).map(s => (
                    <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 border border-[#e5e8ef] cursor-pointer hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5 transition-all">
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(s.id)}
                        onChange={e => {
                          const next = e.target.checked
                            ? [...form.serviceIds, s.id]
                            : form.serviceIds.filter(id => id !== s.id);
                          update('serviceIds', next);
                        }}
                        className="accent-[#33cbcc] w-4 h-4 shrink-0"
                      />
                      <span className="text-sm text-[#1c2b3a] flex-1">{s.name}</span>
                      {s.price != null && (
                        <span className="text-xs text-[#b0bac9]">{new Intl.NumberFormat('fr-FR').format(s.price)} FCFA</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div>
            <label className={LABEL}><UserGroupIcon size={11} />{t('projects.formClient')}</label>
            <select value={form.clientId} onChange={e => update('clientId', e.target.value)} className={SELECT}>
              <option value="">{t('projects.formClientPlaceholder')}</option>
              {(allClients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}><ArrowUpRight01Icon size={11} />{t('projects.formRevenue')}</label>
            <input type="text" value={form.revenue} onChange={e => update('revenue', e.target.value)}
              placeholder="0 FCFA" className={INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}><Calendar01Icon size={11} />{t('projects.startDate')}</label>
              <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}><Calendar01Icon size={11} />{t('projects.formDueDate')}</label>
              <input type="date" value={form.dueDate} onChange={e => update('dueDate', e.target.value)} className={INPUT} />
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#e5e8ef] flex justify-end gap-3 shrink-0">
        <button
          onClick={onClose}
          className="px-5 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
        >
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
                  serviceIds: form.serviceIds,
                  budget: form.cost ? parseFloat(form.cost) : undefined,
                  revenue: form.revenue ? parseFloat(form.revenue) : undefined,
                  startDate: form.startDate || undefined,
                  endDate: form.dueDate || undefined,
                },
              }, { onSuccess: () => onClose() });
            }
          }}
          disabled={!isValid || updateProject.isPending}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white transition-colors ${
            isValid ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]' : 'bg-[#b0bac9] cursor-not-allowed'
          }`}
        >
          {updateProject.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <PencilIcon size={14} />}
          {t('projects.formSave')}
        </button>
      </div>
    </Panel>
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

  const { role, departmentId } = useAuth();
  const deptScope = useDepartmentScope();
  const { data: apiProjects, isLoading } = useProjects(deptScope);
  const { data: apiDepartments } = useDepartments();
  const isHod = role === 'HEAD_OF_DEPARTMENT';

  const projects: Project[] = (apiProjects || []).map((p) => {
    const tasks = p.tasks || [];
    const tasksDone = tasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;
    const milestones = p.milestones || [];
    const milestonesDone = milestones.filter(m => m.completedAt != null).length;
    const progress = milestones.length > 0
      ? Math.round((milestonesDone / milestones.length) * 100)
      : (tasks.length > 0 ? Math.round((tasksDone / tasks.length) * 100) : 0);

    let status: ProjectStatus = 'active';
    if (milestones.length > 0) {
      if (milestones.every(m => m.completedAt != null)) status = 'completed';
      else if (p.endDate && new Date(p.endDate) < new Date()) status = 'overdue';
    } else {
      const allDone = tasks.length > 0 && tasksDone === tasks.length;
      if (allDone && tasks.length > 0) status = 'completed';
      else if (p.endDate && new Date(p.endDate) < new Date() && !allDone) status = 'overdue';
    }

    return {
      id: p.id,
      name: p.name,
      description: p.description || '',
      status,
      progress,
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
    { label: t('projects.stats.total'),     value: projects.length,                                        icon: Briefcase01Icon, color: '#283852' },
    { label: t('projects.stats.active'),    value: projects.filter(p => p.status === 'active').length,     icon: Clock01Icon,     color: '#33cbcc' },
    { label: t('projects.stats.completed'), value: projects.filter(p => p.status === 'completed').length,  icon: Tick01Icon,      color: '#283852' },
    { label: t('projects.stats.overdue'),   value: projects.filter(p => p.status === 'overdue').length,    icon: Alert01Icon,     color: '#e05e5e' },
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

  if (isLoading) return <ProjectsSkeleton />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-1">
            {t('projects.subtitle')}
          </p>
          <h1 className="text-2xl font-bold text-[#1c2b3a]">{t('projects.title')}</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#2bb5b6] transition-colors"
        >
          <Add01Icon size={16} />
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
            className="border border-gray-100 rounded-2xl overflow-hidden transition-colors duration-200 hover:border-[#33cbcc]/50"
          >
            <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
              <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
            </div>
            <div className="p-5 bg-white relative overflow-hidden">
              <h2 className="text-4xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
              <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                <stat.icon size={110} strokeWidth={1.2} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] px-4 py-3 focus-within:border-[#33cbcc] transition-colors">
          <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
          <input
            type="text"
            placeholder={t('projects.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#e5e8ef] px-3">
          <Building01Icon size={15} className="text-[#b0bac9] shrink-0" />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="bg-transparent text-xs font-medium text-[#1c2b3a] focus:outline-none py-2.5 cursor-pointer appearance-none pr-4"
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
              className={`px-4 py-2 text-xs font-semibold border transition-colors ${
                filterStatus === sf.key
                  ? 'bg-[#283852] text-white border-[#283852]'
                  : 'bg-white text-[#8892a4] border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852]'
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
        <div className="space-y-6">
          {/* Area Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 border border-[#e5e8ef]"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-[#1c2b3a]">{t('projects.chartTitle')}</h3>
              <button className="p-1.5 hover:bg-[#f8f9fc] text-[#b0bac9] transition-colors">
                <MoreHorizontalIcon size={18} />
              </button>
            </div>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#8892a4', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8892a4', fontSize: 11 }} />
                  <CartesianGrid vertical={false} stroke="#e5e8ef" strokeDasharray="3 3" />
                  <Tooltip
                    contentStyle={{ border: '1px solid #e5e8ef', boxShadow: 'none', borderRadius: 0 }}
                    cursor={{ stroke: '#33cbcc', strokeWidth: 1.5 }}
                  />
                  <Area type="monotone" dataKey="projects" stroke="#33cbcc" strokeWidth={2} fillOpacity={1} fill="url(#colorProjects)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <DonutChart projects={projects} />
        </div>

        {/* Projects List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredProjects.length === 0 && (
            <div className="bg-white border border-[#e5e8ef] p-12 text-center">
              <Briefcase01Icon size={40} className="mx-auto text-[#b0bac9] mb-4" />
              <p className="text-[#8892a4] font-medium">{t('projects.noResults')}</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-xs font-semibold hover:bg-[#2bb5b6] transition-colors"
              >
                {t('projects.newProject')}
              </button>
            </div>
          )}
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              onClick={() => setSelectedProject(project)}
              className="bg-white p-5 border border-[#e5e8ef] hover:border-[#33cbcc]/40 transition-colors cursor-pointer group"
            >
              {/* Status accent line */}
              <div className="h-0.5 w-full mb-4" style={{ backgroundColor: STATUS_DOT[project.status] }} />

              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-bold text-[#1c2b3a] truncate group-hover:text-[#283852] transition-colors">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: STATUS_DOT[project.status] }} />
                      <span className={`text-xs font-medium ${STATUS_TEXT[project.status]}`}>
                        {t(`projects.${STATUS_I18N[project.status]}`)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[#8892a4] text-xs line-clamp-2">{project.description}</p>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5 text-xs">
                      <span className="text-[#b0bac9]">{t('projects.progress')}</span>
                      <span className="font-bold text-[#1c2b3a]">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${project.progress}%` }}
                        transition={{ delay: 0.2 + index * 0.06, duration: 0.8 }}
                        className="h-full"
                        style={{ backgroundColor: project.status === 'completed' ? '#b0bac9' : '#33cbcc' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right: Meta */}
                <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-[#8892a4]">
                    <Building01Icon size={13} />
                    <span className="font-medium">{project.department}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#b0bac9]">
                    <Tick01Icon size={13} />
                    <span>{project.tasksDone}/{project.tasksTotal}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#b0bac9]">
                    <Calendar01Icon size={13} />
                    <span>{project.endDate}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectDetailPanel
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
            onEdit={() => { setEditProjectId(selectedProject.id); setSelectedProject(null); }}
          />
        )}
      </AnimatePresence>

      {/* Edit panel */}
      <AnimatePresence>
        {editProjectId && (
          <EditProjectPanel projectId={editProjectId} onClose={() => setEditProjectId(null)} />
        )}
      </AnimatePresence>

      {/* Create panel */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateProjectPanel onClose={() => setShowCreateModal(false)} hodDepartmentId={isHod ? departmentId : null} />
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Project Detail Panel ──────────────────────────────── */

const ProjectDetailPanel = ({
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

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
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
    <Panel onClose={onClose}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e5e8ef] flex items-start justify-between shrink-0">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-1">
            {t('projects.title')}
          </p>
          <h2 className="text-sm font-bold text-[#1c2b3a] leading-snug">{project.name}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 shrink-0" style={{ backgroundColor: STATUS_DOT[project.status] }} />
            <span className={`text-xs font-medium ${STATUS_TEXT[project.status]}`}>
              {t(`projects.${STATUS_I18N[project.status]}`)}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-[#b0bac9] hover:text-[#1c2b3a] transition-colors shrink-0">
          <Cancel01Icon size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        {project.description && (
          <div className="px-5 py-4 border-b border-[#e5e8ef]">
            <p className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1">
              {t('projects.description')}
            </p>
            <p className="text-sm text-[#8892a4] leading-relaxed">{project.description}</p>
          </div>
        )}

        {/* Info mosaic */}
        <div className="border-b border-[#e5e8ef]">
          <div className="grid grid-cols-2 gap-px bg-[#e5e8ef]">
            <div className="bg-white px-4 py-3">
              <p className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1">{t('projects.formDepartment')}</p>
              <p className="text-sm font-semibold text-[#1c2b3a]">{project.department || '—'}</p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1">{t('projects.formRevenue')}</p>
              <p className="text-sm font-semibold text-[#1c2b3a]">{project.revenue || '—'}</p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1">{t('projects.startDate')}</p>
              <p className="text-sm font-semibold text-[#1c2b3a]">{project.startDate || '—'}</p>
            </div>
            <div className="bg-white px-4 py-3">
              <p className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest mb-1">{t('projects.endDate')}</p>
              <p className="text-sm font-semibold text-[#1c2b3a]">{project.endDate || '—'}</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="px-5 py-4 border-b border-[#e5e8ef] space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest">{t('projects.progress')}</span>
              <span className="text-xs font-bold text-[#1c2b3a]">{project.progress}%</span>
            </div>
            <div className="h-2 w-full bg-[#e5e8ef] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${project.progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full"
                style={{ backgroundColor: project.status === 'completed' ? '#b0bac9' : '#33cbcc' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="block text-[11px] font-semibold text-[#8892a4] uppercase tracking-widest">{t('projects.tasks')}</span>
              <span className="text-xs text-[#8892a4]">{project.tasksDone}/{project.tasksTotal} ({taskProgress}%)</span>
            </div>
            <div className="h-1.5 w-full bg-[#e5e8ef] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${taskProgress}%` }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="h-full bg-[#283852]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e5e8ef] px-5 py-3 flex gap-2 shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
        >
          {t('projects.close')}
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#283852] border border-[#283852] hover:bg-[#283852] hover:text-white transition-colors"
        >
          <PencilIcon size={13} />
          {t('projects.editTitle')}
        </button>
        <button
          onClick={() => navigate(`/projects/${project.id}`)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors"
        >
          <ArrowUpRight01Icon size={13} />
          {t('projects.viewDetails')}
        </button>
      </div>
    </Panel>
  );
};

export default Projects;
