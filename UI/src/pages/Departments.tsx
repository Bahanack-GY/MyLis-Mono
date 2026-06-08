import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Building01Icon, UserGroupIcon, Briefcase01Icon, ArrowUpRight01Icon, Add01Icon, Cancel01Icon, CodeIcon, PaintBoardIcon, Megaphone01Icon, DollarCircleIcon, FavouriteIcon, PieChartIcon, AlignLeftIcon, Wallet01Icon, Search01Icon, Tick01Icon, ArrowDown01Icon, Loading02Icon, PencilIcon, Delete02Icon, ToggleOffIcon, ToggleOnIcon } from 'hugeicons-react';
import { useInfiniteDepartments, useCreateDepartment, useUpdateDepartment, useDepartmentServices, useCreateDepartmentService, useUpdateDepartmentService, useDeleteDepartmentService } from '../api/departments/hooks';
import { DepartmentsSkeleton } from '../components/Skeleton';
import { useEmployees } from '../api/employees/hooks';
import { useInvoices } from '../api/invoices/hooks';
import { useDepartmentScope, useAuth } from '../contexts/AuthContext';
import RolesModal from '../components/modals/RolesModal';
import ToggleSwitch from '../components/ToggleSwitch';
import {
  BarChart,
  Bar,
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

interface DeptEmployee {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

interface DeptProject {
  id: number;
  name: string;
  status: string;
  progress: number;
}

interface Department {
  id: string;
  name: string;
  description: string;
  headId: string | null;
  head: DeptEmployee;
  employees: DeptEmployee[];
  projects: DeptProject[];
  budget: number;
  color: string;
  icon: typeof CodeIcon;
}

/* ─── (no mock data — uses API only) ───────────────────── */

/* ─── Color options ─────────────────────────────────────── */

const COLOR_OPTIONS = [
  { value: '#283852', label: 'Teal' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#f59e0b', label: 'Amber' },
  { value: '#22c55e', label: 'Green' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#6366f1', label: 'Indigo' },
];

const ICON_OPTIONS: { value: string; icon: typeof CodeIcon }[] = [
  { value: 'code', icon: CodeIcon },
  { value: 'palette', icon: PaintBoardIcon },
  { value: 'megaphone', icon: Megaphone01Icon },
  { value: 'dollar', icon: DollarCircleIcon },
  { value: 'heart', icon: FavouriteIcon },
  { value: 'chart', icon: PieChartIcon },
  { value: 'briefcase', icon: Briefcase01Icon },
  { value: 'building', icon: Building01Icon },
];

/* ─── Employee pool is now fetched from API inside modal ─ */

/* ─── Create Department Modal ──────────────────────────── */

interface DeptForm {
  name: string;
  description: string;
  headId: string | null;
  budget: string;
  defaultTargetRevenue: string;
  color: string;
  iconKey: string;
  memberIds: string[];
}

const CreateDepartmentModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const createDepartment = useCreateDepartment();
  const createService = useCreateDepartmentService();
  const deptScope = useDepartmentScope();
  const { data: apiEmployeesList } = useEmployees(deptScope);
  const svcNameRef = useRef<HTMLInputElement>(null);

  const ALL_EMPLOYEES: DeptEmployee[] = (Array.isArray(apiEmployeesList) ? apiEmployeesList : []).map(emp => ({
  id: emp.id || '',
  name: `${emp.firstName} ${emp.lastName}`,
  role: emp.position?.title || '',
  avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=283852&color=fff`,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const [form, setForm] = useState<DeptForm>({
  name: '',
  description: '',
  headId: null,
  budget: '',
  defaultTargetRevenue: '',
  color: COLOR_OPTIONS[0].value,
  iconKey: 'code',
  memberIds: [],
  });

  const [headDropdownOpen, setHeadDropdownOpen] = useState(false);
  const [headSearch, setHeadSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Two-step flow
  const [step, setStep] = useState<1 | 2>(1);
  const [createdDeptId, setCreatedDeptId] = useState<string | null>(null);
  const [createdDeptName, setCreatedDeptName] = useState('');

  // Step 2 — service entries (saved on Finish)
  const [services, setServices] = useState<Array<{ name: string; description: string; price: string; duration: string }>>([]);
  const [svcForm, setSvcForm] = useState({ name: '', description: '', price: '', duration: '' });
  const [savingServices, setSavingServices] = useState(false);

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

  const update = <K extends keyof DeptForm>(key: K, value: DeptForm[K]) => {
  setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleMember = (empId: string) => {
  setForm(prev => {
  const ids = prev.memberIds.includes(empId)
  ? prev.memberIds.filter(id => id !== empId)
  : [...prev.memberIds, empId];
  return { ...prev, memberIds: ids };
  });
  };

  const removeMember = (empId: string) => {
  setForm(prev => ({ ...prev, memberIds: prev.memberIds.filter(id => id !== empId) }));
  };

  const handleStep1Submit = () => {
  if (!isValid) return;
  createDepartment.mutate({
  name: form.name,
  description: form.description || undefined,
  headId: form.headId,
  defaultTargetRevenue: form.defaultTargetRevenue ? parseFloat(form.defaultTargetRevenue) : null,
  }, {
  onSuccess: (newDept: any) => {
  setCreatedDeptId(newDept.id);
  setCreatedDeptName(form.name);
  setStep(2);
  },
  });
  };

  const addService = () => {
  if (!svcForm.name.trim()) return;
  setServices(prev => [...prev, svcForm]);
  setSvcForm({ name: '', description: '', price: '', duration: '' });
  setTimeout(() => svcNameRef.current?.focus(), 50);
  };

  const removeService = (idx: number) => {
  setServices(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFinish = async () => {
  if (!createdDeptId || services.length === 0) { onClose(); return; }
  setSavingServices(true);
  try {
  for (const svc of services) {
  await createService.mutateAsync({
  departmentId: createdDeptId,
  name: svc.name,
  description: svc.description || undefined,
  price: svc.price ? parseFloat(svc.price) : undefined,
  duration: svc.duration || undefined,
  });
  }
  } finally {
  onClose();
  }
  };

  const headEmployee = ALL_EMPLOYEES.find(e => e.id === form.headId);
  const selectedMembers = ALL_EMPLOYEES.filter(e => form.memberIds.includes(e.id));

  const filteredHeadEmployees = ALL_EMPLOYEES.filter(e =>
  e.name.toLowerCase().includes(headSearch.toLowerCase()) ||
  e.role.toLowerCase().includes(headSearch.toLowerCase())
  );

  const filteredMemberEmployees = ALL_EMPLOYEES.filter(e =>
  e.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
  e.role.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const isValid = form.name.trim().length > 0;

  const selectedIcon = ICON_OPTIONS.find(o => o.value === form.iconKey) || ICON_OPTIONS[0];

  const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
  const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

  return (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-4 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
  <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center shrink-0">
  {step === 1 ? <Add01Icon size={18} className="text-[#283852]" /> : <Briefcase01Icon size={18} className="text-[#283852]" />}
  </div>
  <div>
  <div className="flex items-center gap-2">
  <h3 className="text-base font-bold text-[#1c2b3a]">
  {step === 1 ? t('departments.create.title') : t('departments.create.servicesTitle', 'Services')}
  </h3>
  <span className="text-[10px] font-bold text-[#8892a4] bg-[#f0f2f5] px-2 py-0.5 rounded-full">{step} / 2</span>
  </div>
  {step === 2 && <p className="text-xs text-[#8892a4] mt-0.5 truncate max-w-[220px]">{createdDeptName}</p>}
  </div>
  </div>
  <button onClick={onClose} className="p-1.5 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
  <Cancel01Icon size={18} />
  </button>
  </div>

  {/* Progress bar */}
  <div className="h-0.5 flex shrink-0">
  <div className="flex-1 bg-[#283852]" />
  <div className={`flex-1 transition-colors duration-500 ${step === 2 ? 'bg-[#283852]' : 'bg-[#e5e8ef]'}`} />
  </div>

  <AnimatePresence mode="wait" initial={false}>
  {step === 1 ? (
  <motion.div
  key="step1"
  initial={{ opacity: 0, x: -16 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -16 }}
  transition={{ duration: 0.18 }}
  className="flex-1 flex flex-col overflow-hidden"
  >
  {/* Scrollable content */}
  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
  {/* Department name */}
  <div>
  <label className={labelCls}>
  <Building01Icon size={12} />
  {t('departments.create.name')}
  </label>
  <input
  type="text"
  value={form.name}
  onChange={e => update('name', e.target.value)}
  placeholder={t('departments.create.namePlaceholder')}
  className={inputCls}
  autoFocus
  />
  </div>

  {/* Description */}
  <div>
  <label className={labelCls}>
  <AlignLeftIcon size={12} />
  {t('departments.create.description')}
  </label>
  <textarea
  value={form.description}
  onChange={e => update('description', e.target.value)}
  placeholder={t('departments.create.descriptionPlaceholder')}
  rows={3}
  className={`${inputCls} resize-none`}
  />
  </div>

  {/* Head of department */}
  <div className="relative">
  <label className={labelCls}>
  <UserGroupIcon size={12} />
  {t('departments.create.head')}
  </label>
  <button
  type="button"
  onClick={() => setHeadDropdownOpen(prev => !prev)}
  className={`${inputCls} text-left flex items-center gap-3 cursor-pointer`}
  >
  {headEmployee ? (
  <>
  <img src={headEmployee.avatar} alt="" className="w-6 h-6 rounded-full border border-[#e5e8ef] shrink-0" />
  <span className="flex-1 truncate">{headEmployee.name}</span>
  <span className="text-xs text-[#8892a4] truncate">{headEmployee.role}</span>
  </>
  ) : (
  <span className="flex-1 text-[#b0bac9]">{t('departments.create.headPlaceholder')}</span>
  )}
  <ArrowDown01Icon size={16} className={`text-[#8892a4] shrink-0 transition-transform ${headDropdownOpen ? 'rotate-180' : ''}`} />
  </button>
  <AnimatePresence>
  {headDropdownOpen && (
  <motion.div
  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.15 }}
  className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-[#e5e8ef] shadow-lg overflow-hidden"
  >
  <div className="p-2 border-b border-[#e5e8ef]">
  <div className="relative">
  <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input type="text" value={headSearch} onChange={e => setHeadSearch(e.target.value)}
  placeholder={t('departments.create.searchEmployee')}
  className="w-full bg-[#f8f9fc] border border-[#e5e8ef] py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
  autoFocus />
  </div>
  </div>
  <div className="max-h-48 overflow-y-auto py-1">
  {filteredHeadEmployees.map(emp => (
  <button key={emp.id} type="button"
  onClick={() => { update('headId', emp.id); setHeadDropdownOpen(false); setHeadSearch(''); }}
  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f8f9fc] transition-colors ${form.headId === emp.id ? 'bg-[#283852]/5' : ''}`}
  >
  <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full border border-[#e5e8ef] shrink-0" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium text-[#1c2b3a] truncate">{emp.name}</p>
  <p className="text-[11px] text-[#8892a4] truncate">{emp.role}</p>
  </div>
  {form.headId === emp.id && <Tick01Icon size={16} className="text-[#283852] shrink-0" />}
  </button>
  ))}
  {filteredHeadEmployees.length === 0 && <p className="text-sm text-[#8892a4] text-center py-3">{t('departments.create.noResults')}</p>}
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </div>

  {/* Budget */}
  <div>
  <label className={labelCls}><Wallet01Icon size={12} />{t('departments.create.budget')}</label>
  <input type="text" value={form.budget} onChange={e => update('budget', e.target.value)} placeholder="0 FCFA" className={inputCls} />
  </div>

  {/* Default CA target */}
  <div>
  <label className={labelCls}><ArrowUpRight01Icon size={12} />{t('departments.create.defaultCA', 'Objectif CA par défaut')}</label>
  <div className="relative">
  <input type="number" min="0" value={form.defaultTargetRevenue} onChange={e => update('defaultTargetRevenue', e.target.value)} placeholder="0" className={`${inputCls} pr-16`} />
  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8892a4] pointer-events-none">FCFA</span>
  </div>
  <p className="text-[10px] text-[#8892a4] mt-1">{t('departments.create.defaultCAHint', "Utilisé chaque mois si aucun objectif spécifique n'est défini")}</p>
  </div>

  {/* Members */}
  <div>
  <label className={labelCls}>
  <UserGroupIcon size={12} />{t('departments.create.members')}
  {selectedMembers.length > 0 && <span className="ml-1 text-[#283852]">({selectedMembers.length})</span>}
  </label>
  {selectedMembers.length > 0 && (
  <div className="flex flex-wrap gap-2 mb-3">
  {selectedMembers.map(emp => (
  <motion.div key={emp.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
  className="flex items-center gap-2 bg-[#f8f9fc] border border-[#e5e8ef] rounded-full pl-1 pr-2.5 py-1"
  >
  <img src={emp.avatar} alt="" className="w-5 h-5 rounded-full border border-[#e5e8ef]" />
  <span className="text-xs font-medium text-[#1c2b3a]">{emp.name}</span>
  <button type="button" onClick={() => removeMember(emp.id)} className="p-1 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={12} />
  </button>
  </motion.div>
  ))}
  </div>
  )}
  <div className="bg-[#f8f9fc] border border-[#e5e8ef] overflow-hidden">
  <div className="relative p-2">
  <Search01Icon size={15} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
  placeholder={t('departments.create.searchEmployee')}
  className="w-full bg-white border border-[#e5e8ef] py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors" />
  </div>
  <div className="max-h-40 overflow-y-auto">
  {filteredMemberEmployees.map(emp => {
  const isSelected = form.memberIds.includes(emp.id);
  return (
  <button key={emp.id} type="button" onClick={() => toggleMember(emp.id)}
  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? 'bg-[#283852]/5' : 'hover:bg-white'}`}
  >
  <div className={`w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-[#283852] border-[#283852]' : 'border-[#e5e8ef]'}`}>
  {isSelected && <Tick01Icon size={12} className="text-white" />}
  </div>
  <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full border border-[#e5e8ef] shrink-0" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium text-[#1c2b3a] truncate">{emp.name}</p>
  <p className="text-[11px] text-[#8892a4] truncate">{emp.role}</p>
  </div>
  </button>
  );
  })}
  {filteredMemberEmployees.length === 0 && <p className="text-sm text-[#8892a4] text-center py-3">{t('departments.create.noResults')}</p>}
  </div>
  </div>
  </div>

  {/* Icon selector */}
  <div>
  <label className={labelCls}>{t('departments.create.icon')}</label>
  <div className="flex gap-2 flex-wrap">
  {ICON_OPTIONS.map(opt => {
  const isActive = form.iconKey === opt.value;
  return (
  <button key={opt.value} type="button" onClick={() => update('iconKey', opt.value)}
  className={`w-10 h-10 flex items-center justify-center border-2 transition-all ${isActive ? 'border-[#283852] bg-[#283852]/10' : 'border-[#e5e8ef] hover:border-[#b0bac9] bg-white'}`}
  >
  <opt.icon size={18} className={isActive ? 'text-[#283852]' : 'text-[#8892a4]'} />
  </button>
  );
  })}
  </div>
  </div>

  {/* Color selector */}
  <div>
  <label className={labelCls}>{t('departments.create.color')}</label>
  <div className="flex gap-2 flex-wrap">
  {COLOR_OPTIONS.map(opt => {
  const isActive = form.color === opt.value;
  return (
  <button key={opt.value} type="button" onClick={() => update('color', opt.value)}
  className={`w-10 h-10 flex items-center justify-center border-2 transition-all ${isActive ? 'border-[#1c2b3a] scale-110' : 'border-transparent'}`}
  style={{ backgroundColor: opt.value }}
  >
  {isActive && <div className="w-3 h-3 rounded-full bg-white" />}
  </button>
  );
  })}
  </div>
  </div>

  {/* Preview */}
  <div>
  <label className={labelCls}>{t('departments.create.preview')}</label>
  <div className="bg-[#f8f9fc] p-4 flex items-center gap-4">
  <div className="w-12 h-12 flex items-center justify-center" style={{ backgroundColor: `${form.color}15` }}>
  <selectedIcon.icon size={24} style={{ color: form.color }} />
  </div>
  <div className="flex-1 min-w-0">
  <p className="font-semibold text-[#1c2b3a]">{form.name || t('departments.create.namePlaceholder')}</p>
  <p className="text-xs text-[#8892a4] truncate">{headEmployee?.name || t('departments.create.headPlaceholder')}</p>
  </div>
  {selectedMembers.length > 0 && (
  <div className="flex items-center gap-2 shrink-0">
  <div className="flex -space-x-1.5">
  {selectedMembers.slice(0, 3).map(emp => (
  <img key={emp.id} src={emp.avatar} alt="" className="w-5 h-5 rounded-full border border-white" />
  ))}
  </div>
  {selectedMembers.length > 3 && <span className="text-[10px] font-semibold text-[#8892a4]">+{selectedMembers.length - 3}</span>}
  </div>
  )}
  </div>
  </div>
  </div>

  {/* Footer step 1 */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors">
  {t('departments.create.cancel')}
  </button>
  <button
  onClick={handleStep1Submit}
  disabled={!isValid || createDepartment.isPending}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${isValid ? 'bg-[#283852] hover:bg-[#1e2d42]' : 'bg-[#b0bac9] cursor-not-allowed'}`}
  >
  {createDepartment.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
  {t('departments.create.next', 'Suivant — Services')}
  </button>
  </div>
  </motion.div>
  ) : (
  <motion.div
  key="step2"
  initial={{ opacity: 0, x: 16 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 16 }}
  transition={{ duration: 0.18 }}
  className="flex-1 flex flex-col overflow-hidden"
  >
  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
  {/* Explainer */}
  <p className="text-xs text-[#8892a4] leading-relaxed">
  {t('departments.create.servicesHint', 'Ajoutez les services proposés par ce département. Vous pourrez en ajouter d\'autres plus tard.')}
  </p>

  {/* Service entry form */}
  <div className="space-y-3 bg-[#f8f9fc] border border-[#e5e8ef] p-4">
  <div>
  <label className={labelCls}><Briefcase01Icon size={12} />{t('departments.create.serviceName', 'Nom du service')} *</label>
  <input
  ref={svcNameRef}
  type="text"
  value={svcForm.name}
  onChange={e => setSvcForm(p => ({ ...p, name: e.target.value }))}
  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addService(); } }}
  placeholder={t('departments.create.serviceNamePlaceholder', 'Ex : Développement web')}
  className={inputCls}
  autoFocus
  />
  </div>
  <div>
  <label className={labelCls}><AlignLeftIcon size={12} />{t('departments.create.serviceDescription', 'Description')}</label>
  <input
  type="text"
  value={svcForm.description}
  onChange={e => setSvcForm(p => ({ ...p, description: e.target.value }))}
  placeholder={t('departments.create.serviceDescPlaceholder', 'Optionnel')}
  className={inputCls}
  />
  </div>
  <div className="grid grid-cols-2 gap-3">
  <div>
  <label className={labelCls}><DollarCircleIcon size={12} />{t('departments.create.servicePrice', 'Prix (FCFA)')}</label>
  <input
  type="number"
  min="0"
  value={svcForm.price}
  onChange={e => setSvcForm(p => ({ ...p, price: e.target.value }))}
  placeholder="0"
  className={inputCls}
  />
  </div>
  <div>
  <label className={labelCls}><AlignLeftIcon size={12} />{t('departments.create.serviceDuration', 'Durée')}</label>
  <input
  type="text"
  value={svcForm.duration}
  onChange={e => setSvcForm(p => ({ ...p, duration: e.target.value }))}
  placeholder="Ex : 2 semaines"
  className={inputCls}
  />
  </div>
  </div>
  <button
  type="button"
  onClick={addService}
  disabled={!svcForm.name.trim()}
  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
  <Add01Icon size={14} />
  {t('departments.create.addService', 'Ajouter ce service')}
  </button>
  </div>

  {/* Added services list */}
  {services.length > 0 && (
  <div className="space-y-2">
  <p className={labelCls}><Briefcase01Icon size={12} />{t('departments.create.addedServices', 'Services ajoutés')} ({services.length})</p>
  <AnimatePresence initial={false}>
  {services.map((svc, idx) => (
  <motion.div
  key={idx}
  initial={{ opacity: 0, y: -6 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -6 }}
  transition={{ duration: 0.15 }}
  className="flex items-start gap-3 bg-white border border-[#e5e8ef] px-4 py-3"
  >
  <div className="w-7 h-7 rounded-full bg-[#283852]/10 flex items-center justify-center shrink-0 mt-0.5">
  <Briefcase01Icon size={13} className="text-[#283852]" />
  </div>
  <div className="flex-1 min-w-0">
  <p className="text-sm font-semibold text-[#1c2b3a] truncate">{svc.name}</p>
  {svc.description && <p className="text-xs text-[#8892a4] truncate">{svc.description}</p>}
  <div className="flex gap-2 mt-1 flex-wrap">
  {svc.price && <span className="text-[10px] font-medium text-[#33cbcc] bg-[#33cbcc]/10 px-2 py-0.5 rounded-full">{parseFloat(svc.price).toLocaleString()} FCFA</span>}
  {svc.duration && <span className="text-[10px] font-medium text-[#8892a4] bg-[#f0f2f5] px-2 py-0.5 rounded-full">{svc.duration}</span>}
  </div>
  </div>
  <button type="button" onClick={() => removeService(idx)} className="p-1.5 text-[#b0bac9] hover:text-[#ef4444] transition-colors shrink-0">
  <Delete02Icon size={14} />
  </button>
  </motion.div>
  ))}
  </AnimatePresence>
  </div>
  )}
  </div>

  {/* Footer step 2 */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  disabled={savingServices}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] disabled:opacity-40 transition-colors"
  >
  {t('departments.create.skip', 'Ignorer')}
  </button>
  <button
  onClick={handleFinish}
  disabled={savingServices}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] disabled:opacity-60 transition-colors"
  >
  {savingServices
  ? <><Loading02Icon size={16} className="animate-spin" />{t('departments.create.saving', 'Enregistrement...')}</>
  : <><Tick01Icon size={16} />{services.length > 0 ? t('departments.create.saveAndFinish', `Enregistrer (${services.length})`) : t('departments.create.finish', 'Terminer')}</>
  }
  </button>
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </motion.div>
  </motion.div>
  );
};

/* ─── Edit Department Modal ────────────────────────────── */

const EditDepartmentModal = ({ department, onClose }: { department: Department; onClose: () => void }) => {
  const { t } = useTranslation();
  const updateDepartment = useUpdateDepartment();
  const deptScope = useDepartmentScope();
  const { data: apiEmployeesList } = useEmployees(deptScope);
  const ALL_EMPLOYEES: DeptEmployee[] = (apiEmployeesList || []).map(emp => ({
  id: emp.id || '',
  name: `${emp.firstName} ${emp.lastName}`,
  role: emp.position?.title || '',
  avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=283852&color=fff`,
  })).sort((a, b) => a.name.localeCompare(b.name));

  const [form, setForm] = useState({
  name: department.name,
  description: department.description || '',
  headId: department.headId as string | null,
  defaultTargetRevenue: department.defaultTargetRevenue != null ? String(department.defaultTargetRevenue) : '',
  });

  const [headDropdownOpen, setHeadDropdownOpen] = useState(false);
  const [headSearch, setHeadSearch] = useState('');

  // Services state
  const { data: services = [] } = useDepartmentServices(department.id);
  const createService = useCreateDepartmentService();
  const updateService = useUpdateDepartmentService();
  const deleteService = useDeleteDepartmentService();

  const blankService = { name: '', description: '', isActive: true };
  const [newService, setNewService] = useState(blankService);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editServiceForm, setEditServiceForm] = useState(blankService);

  const handleAddService = () => {
  if (!newService.name.trim()) return;
  createService.mutate({
  departmentId: department.id,
  name: newService.name.trim(),
  description: newService.description || undefined,
  isActive: newService.isActive,
  }, { onSuccess: () => setNewService(blankService) });
  };

  const handleEditService = (svc: typeof services[0]) => {
  setEditingServiceId(svc.id);
  setEditServiceForm({
  name: svc.name,
  description: svc.description || '',
  isActive: svc.isActive,
  });
  };

  const handleSaveEdit = (id: string) => {
  updateService.mutate({ id, dto: {
  name: editServiceForm.name.trim() || undefined,
  description: editServiceForm.description || undefined,
  isActive: editServiceForm.isActive,
  }}, { onSuccess: () => setEditingServiceId(null) });
  };

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

  const headEmployee = ALL_EMPLOYEES.find(e => e.id === form.headId);

  const filteredHeadEmployees = ALL_EMPLOYEES.filter(e =>
  e.name.toLowerCase().includes(headSearch.toLowerCase()) ||
  e.role.toLowerCase().includes(headSearch.toLowerCase())
  );

  const isValid = form.name.trim().length > 0;

  const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
  const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

  return (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-4 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
  <div className="w-9 h-9 rounded-full bg-[#283852]/10 flex items-center justify-center shrink-0">
  <PencilIcon size={18} className="text-[#283852]" />
  </div>
  <h3 className="text-base font-bold text-[#1c2b3a]">{t('departments.edit.title')}</h3>
  </div>
  <button onClick={onClose} className="p-1.5  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
  <Cancel01Icon size={18} />
  </button>
  </div>

  {/* Scrollable content */}
  <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
  {/* Department name */}
  <div>
  <label className={labelCls}>
  <Building01Icon size={12} />
  {t('departments.create.name')}
  </label>
  <input
  type="text"
  value={form.name}
  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
  placeholder={t('departments.create.namePlaceholder')}
  className={inputCls}
  />
  </div>

  {/* Description */}
  <div>
  <label className={labelCls}>
  <AlignLeftIcon size={12} />
  {t('departments.create.description')}
  </label>
  <textarea
  value={form.description}
  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
  placeholder={t('departments.create.descriptionPlaceholder')}
  rows={3}
  className={`${inputCls} resize-none`}
  />
  </div>

  {/* Head of department — dropdown selector */}
  <div className="relative">
  <label className={labelCls}>
  <UserGroupIcon size={12} />
  {t('departments.create.head')}
  </label>
  <button
  type="button"
  onClick={() => setHeadDropdownOpen(prev => !prev)}
  className={`${inputCls} text-left flex items-center gap-3 cursor-pointer`}
  >
  {headEmployee ? (
  <>
  <img src={headEmployee.avatar} alt="" className="w-6 h-6 rounded-full border border-[#e5e8ef] shrink-0" />
  <span className="flex-1 truncate">{headEmployee.name}</span>
  <span className="text-xs text-[#8892a4] truncate">{headEmployee.role}</span>
  </>
  ) : (
  <span className="flex-1 text-[#b0bac9]">{t('departments.create.headPlaceholder')}</span>
  )}
  <ArrowDown01Icon size={16} className={`text-[#8892a4] shrink-0 transition-transform ${headDropdownOpen ? 'rotate-180' : ''}`} />
  </button>

  <AnimatePresence>
  {headDropdownOpen && (
  <motion.div
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.15 }}
  className="absolute z-20 left-0 right-0 mt-1.5 bg-white border border-[#e5e8ef]  shadow-lg overflow-hidden"
  >
  <div className="p-2 border-b border-[#e5e8ef]">
  <div className="relative">
  <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input
  type="text"
  value={headSearch}
  onChange={e => setHeadSearch(e.target.value)}
  placeholder={t('departments.create.searchEmployee')}
  className="w-full bg-[#f8f9fc] border border-[#e5e8ef]  py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
  autoFocus
  />
  </div>
  </div>
  <div className="max-h-48 overflow-y-auto py-1">
  {filteredHeadEmployees.map(emp => (
  <button
  key={emp.id}
  type="button"
  onClick={() => {
  setForm(prev => ({ ...prev, headId: emp.id }));
  setHeadDropdownOpen(false);
  setHeadSearch('');
  }}
  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[#f8f9fc] transition-colors ${
  form.headId === emp.id ? 'bg-[#283852]/5' : ''
  }`}
  >
  <img src={emp.avatar} alt="" className="w-7 h-7 rounded-full border border-[#e5e8ef] shrink-0" />
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium text-[#1c2b3a] truncate">{emp.name}</p>
  <p className="text-[11px] text-[#8892a4] truncate">{emp.role}</p>
  </div>
  {form.headId === emp.id && <Tick01Icon size={16} className="text-[#283852] shrink-0" />}
  </button>
  ))}
  {filteredHeadEmployees.length === 0 && (
  <p className="text-sm text-[#8892a4] text-center py-3">{t('departments.create.noResults')}</p>
  )}
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </div>

  {/* Default CA target */}
  <div>
  <label className={labelCls}>
  <ArrowUpRight01Icon size={12} />
  {t('departments.create.defaultCA', 'Objectif CA par défaut')}
  </label>
  <div className="relative">
  <input
  type="number"
  min="0"
  value={form.defaultTargetRevenue}
  onChange={e => setForm(prev => ({ ...prev, defaultTargetRevenue: e.target.value }))}
  placeholder="0"
  className={`${inputCls} pr-16`}
  />
  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8892a4] pointer-events-none">FCFA</span>
  </div>
  <p className="text-[10px] text-[#8892a4] mt-1">{t('departments.create.defaultCAHint', 'Utilisé chaque mois si aucun objectif spécifique n\'est défini')}</p>
  </div>

  {/* Services */}
  <div>
  <label className={labelCls}>
  <Briefcase01Icon size={12} />
  {t('departments.services.title')}
  </label>

  {/* Existing services list */}
  {services.length > 0 && (
  <div className="space-y-2 mb-3">
  {services.map(svc => (
  <div key={svc.id} className={` border p-3 transition-all ${svc.isActive ? 'border-[#e5e8ef] bg-white' : 'border-[#e5e8ef] bg-[#f8f9fc] opacity-60'}`}>
  {editingServiceId === svc.id ? (
  <div className="space-y-2">
  <input
  value={editServiceForm.name}
  onChange={e => setEditServiceForm(prev => ({ ...prev, name: e.target.value }))}
  className="w-full border border-[#e5e8ef]  px-3 py-1.5 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] bg-[#f8f9fc] focus:bg-white transition-colors"
  placeholder={t('departments.services.namePlaceholder')}
  />
  <input
  value={editServiceForm.description}
  onChange={e => setEditServiceForm(prev => ({ ...prev, description: e.target.value }))}
  className="w-full border border-[#e5e8ef]  px-3 py-1.5 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] bg-[#f8f9fc] focus:bg-white transition-colors"
  placeholder={t('departments.services.descriptionPlaceholder')}
  />
  <div className="flex items-center justify-between">
  <button onClick={() => setEditServiceForm(prev => ({ ...prev, isActive: !prev.isActive }))}>
  {editServiceForm.isActive
  ? <ToggleOnIcon size={22} className="text-[#283852]" />
  : <ToggleOffIcon size={22} className="text-[#b0bac9]" />
  }
  </button>
  <div className="flex gap-2">
  <button onClick={() => setEditingServiceId(null)} className="px-3 py-1 text-xs text-[#8892a4] hover:bg-[#f8f9fc]  transition-colors">
  {t('common.cancel')}
  </button>
  <button
  onClick={() => handleSaveEdit(svc.id)}
  disabled={!editServiceForm.name.trim() || updateService.isPending}
  className="flex items-center gap-1 px-3 py-1 text-xs text-white bg-[#283852] hover:bg-[#1e2d42]  transition-colors disabled:opacity-40"
  >
  {updateService.isPending ? <Loading02Icon size={11} className="animate-spin" /> : <Tick01Icon size={11} />}
  {t('common.save')}
  </button>
  </div>
  </div>
  </div>
  ) : (
  <div className="flex items-center gap-2">
  <div className="flex-1 min-w-0">
  <p className="text-sm font-medium text-[#1c2b3a] truncate">{svc.name}</p>
  <div className="flex items-center gap-2 mt-0.5">
  {!svc.isActive && (
  <span className="text-xs px-1.5 py-0.5 bg-[#f8f9fc] text-[#8892a4] rounded-full">{t('departmentDetail.services.inactive')}</span>
  )}
  </div>
  </div>
  <button onClick={() => handleEditService(svc)} className="p-1.5  text-[#8892a4] hover:text-[#283852] hover:bg-[#283852]/10 transition-colors">
  <PencilIcon size={13} />
  </button>
  <button onClick={() => deleteService.mutate(svc.id)} className="p-1.5  text-[#8892a4] hover:text-[#283852] hover:bg-[#283852]/10 transition-colors">
  <Delete02Icon size={13} />
  </button>
  </div>
  )}
  </div>
  ))}
  </div>
  )}

  {/* Add new service inline form */}
  <div className="border border-dashed border-[#e5e8ef]  p-3 space-y-2 bg-[#f8f9fc]/50">
  <input
  value={newService.name}
  onChange={e => setNewService(prev => ({ ...prev, name: e.target.value }))}
  placeholder={t('departments.services.namePlaceholder')}
  className="w-full border border-[#e5e8ef]  px-3 py-1.5 text-sm text-[#1c2b3a] bg-white focus:outline-none focus:border-[#33cbcc] transition-colors"
  />
  <input
  value={newService.description}
  onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))}
  placeholder={t('departments.services.descriptionPlaceholder')}
  className="w-full border border-[#e5e8ef]  px-3 py-1.5 text-sm text-[#1c2b3a] bg-white focus:outline-none focus:border-[#33cbcc] transition-colors"
  />
  <div className="flex items-center justify-between">
  <button onClick={() => setNewService(prev => ({ ...prev, isActive: !prev.isActive }))}>
  {newService.isActive
  ? <ToggleOnIcon size={22} className="text-[#283852]" />
  : <ToggleOffIcon size={22} className="text-[#b0bac9]" />
  }
  </button>
  <button
  onClick={handleAddService}
  disabled={!newService.name.trim() || createService.isPending}
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#283852] hover:bg-[#1e2d42]  transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
  {createService.isPending ? <Loading02Icon size={12} className="animate-spin" /> : <Add01Icon size={12} />}
  {t('departments.services.addService')}
  </button>
  </div>
  </div>
  </div>
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('departments.create.cancel')}
  </button>
  <button
  onClick={() => {
  if (isValid) {
  updateDepartment.mutate({
  id: department.id,
  dto: {
  name: form.name,
  description: form.description || undefined,
  headId: form.headId,
  defaultTargetRevenue: form.defaultTargetRevenue ? parseFloat(form.defaultTargetRevenue) : null,
  },
  }, { onSuccess: () => onClose() });
  }
  }}
  disabled={!isValid || updateDepartment.isPending}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
  isValid
  ? 'bg-[#283852] hover:bg-[#1e2d42]'
  : 'bg-[#b0bac9] cursor-not-allowed'
  }`}
  >
  {updateDepartment.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Tick01Icon size={16} />}
  {t('departments.edit.submit')}
  </button>
  </div>
  </motion.div>
  </motion.div>
  );
};

/* ─── Component ─────────────────────────────────────────── */

const Departments = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const deptScope = useDepartmentScope();
  const { role } = useAuth();
  const isHOD = role === 'HEAD_OF_DEPARTMENT';

  // API data
  const departmentsQuery = useInfiniteDepartments();
  const allDepartments = departmentsQuery.data?.pages.flatMap(p => p.rows);
  const isLoading = departmentsQuery.isPending;
  const { data: allInvoices } = useInvoices();
  const apiDepartments = isHOD && deptScope
  ? allDepartments?.filter(d => d.id === deptScope)
  : allDepartments;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
  const el = sentinelRef.current;
  if (!el) return;
  const observer = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting && departmentsQuery.hasNextPage && !departmentsQuery.isFetchingNextPage) {
  departmentsQuery.fetchNextPage();
  }
  });
  observer.observe(el);
  return () => observer.disconnect();
  }, [departmentsQuery.hasNextPage, departmentsQuery.isFetchingNextPage, departmentsQuery.fetchNextPage]);

  // UI config for cycling colors and icons
  const DEPT_COLORS = ['#283852'];
  const DEPT_ICONS = [CodeIcon, PaintBoardIcon, Megaphone01Icon, DollarCircleIcon, FavouriteIcon, PieChartIcon];

  // Map API departments to display shape — no mock fallback
  const DEPARTMENTS: Department[] = (apiDepartments || []).map((d, i) => ({
  id: d.id || String(i + 1),
  name: d.name,
  description: d.description || '',
  headId: d.headId || null,
  color: DEPT_COLORS[i % DEPT_COLORS.length],
  icon: DEPT_ICONS[i % DEPT_ICONS.length],
  head: d.head
  ? { id: d.head.id, name: `${d.head.firstName} ${d.head.lastName}`, role: '', avatar: d.head.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.head.firstName + '+' + d.head.lastName)}&background=283852&color=fff` }
  : { id: '0', name: '\u2014', role: '', avatar: '' },
  employees: d.employees?.map((e) => ({
  id: e.id,
  name: `${e.firstName} ${e.lastName}`,
  role: e.position?.title || '',
  avatar: e.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(e.firstName + '+' + e.lastName)}&background=283852&color=fff`,
  })) || [],
  projects: d.projects?.map((p, j) => ({
  id: j + 1,
  name: p.name,
  status: 'active',
  progress: 0,
  })) || [],
  budget: 0,
  }));

  if (isLoading) {
  return <DepartmentsSkeleton />;
  }

  const totalEmployees = DEPARTMENTS.reduce((s, d) => s + d.employees.length, 0);
  const totalProjects = DEPARTMENTS.reduce((s, d) => s + d.projects.length, 0);
  const avgSize = Math.round(totalEmployees / Math.max(DEPARTMENTS.length, 1));

  const stats = [
  { label: t('departments.stats.total'), value: DEPARTMENTS.length, icon: Building01Icon, color: '#283852' },
  { label: t('departments.stats.employees'), value: totalEmployees, icon: UserGroupIcon, color: '#3b82f6' },
  { label: t('departments.stats.projects'), value: totalProjects, icon: Briefcase01Icon, color: '#8b5cf6' },
  { label: t('departments.stats.avgSize'), value: avgSize, icon: ArrowUpRight01Icon, color: '#f59e0b' },
  ];

  const barData = DEPARTMENTS.map(d => ({
  name: d.name,
  employees: d.employees.length,
  color: d.color,
  }));

  const revenueByDept: Record<string, number> = {};
  (allInvoices || []).forEach(inv => {
  if (inv.status === 'PAID' && inv.departmentId) {
  revenueByDept[inv.departmentId] = (revenueByDept[inv.departmentId] || 0) + Number(inv.total);
  }
  });
  const donutData = DEPARTMENTS.map(d => ({
  name: d.name,
  value: revenueByDept[d.id] || 0,
  color: d.color,
  }));
  const totalRevenue = donutData.reduce((s, d) => s + d.value, 0);

  return (
  <div className="space-y-8">
  {/* Header */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
  <div>
  <h1 className="text-3xl font-bold text-gray-800">{t('departments.title')}</h1>
  <p className="text-gray-500 mt-1">{t('departments.subtitle')}</p>
  </div>
  <div className="flex gap-3">
  <button
  onClick={() => setShowRoleModal(true)}
  className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5  text-sm font-semibold hover:bg-gray-50 transition-colors"
  >
  <Briefcase01Icon size={16} />
  {t('departments.manageRoles', 'Manage Roles')}
  </button>
  {!isHOD && (
  <button
  onClick={() => setShowCreateModal(true)}
  className="flex items-center gap-2 bg-[#283852] text-white px-5 py-2.5  text-sm font-semibold hover:bg-[#1e2d42] transition-colors shadow-lg shadow-[#283852]/20"
  >
  <Add01Icon size={16} />
  {t('departments.addDepartment')}
  </button>
  )}
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
  className="bg-white p-6  border border-gray-100 relative overflow-hidden group"
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

  {/* Charts */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  {/* Employee distribution bar chart */}
  <motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.3 }}
  className="bg-white p-6  border border-gray-100"
  >
  <h3 className="text-lg font-bold text-gray-800 mb-6">{t('departments.charts.employeeDistribution')}</h3>
  <div className="h-64">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <BarChart data={barData} barSize={36}>
  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
  <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
  <Bar dataKey="employees" radius={[8, 8, 0, 0]}>
  {barData.map((entry, i) => (
  <Cell key={i} fill={entry.color} />
  ))}
  </Bar>
  </BarChart>
  </ResponsiveContainer>
  </div>
  </motion.div>

  {/* Budget allocation donut */}
  <motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ delay: 0.4 }}
  className="bg-white p-6  border border-gray-100 flex flex-col"
  >
  <h3 className="text-lg font-bold text-gray-800 mb-4">{t('departments.charts.revenueByDepartment', 'Revenue by Department')}</h3>
  <div className="h-50 relative">
  <ResponsiveContainer width="100%" height="100%" debounce={50}>
  <PieChart>
  <Pie
  data={donutData}
  cx="50%"
  cy="50%"
  innerRadius={55}
  outerRadius={75}
  paddingAngle={3}
  dataKey="value"
  strokeWidth={0}
  >
  {donutData.map((entry, i) => (
  <Cell key={i} fill={entry.color} />
  ))}
  </Pie>
  <Tooltip
  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
  formatter={(value: any) => value ? `${(value / 1000000).toFixed(1)}M FCFA` : '0 FCFA'}
  />
  </PieChart>
  </ResponsiveContainer>
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="text-center">
  <p className="text-xs text-gray-400">{t('departments.charts.revenue', 'Revenue')}</p>
  <p className="text-xl font-bold text-gray-800">{totalRevenue >= 1000000 ? `${(totalRevenue / 1000000).toFixed(1)}M` : `${(totalRevenue / 1000).toFixed(0)}K`}</p>
  </div>
  </div>
  </div>
  <div className="grid grid-cols-2 gap-2 mt-4">
  {donutData.map((entry, i) => (
  <div key={i} className="flex items-center justify-between text-sm">
  <div className="flex items-center gap-2">
  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
  <span className="text-gray-600 text-xs">{entry.name}</span>
  </div>
  <span className="font-semibold text-gray-800 text-xs">{entry.value >= 1000000 ? `${(entry.value / 1000000).toFixed(1)}M` : `${(entry.value / 1000).toFixed(0)}K`}</span>
  </div>
  ))}
  </div>
  </motion.div>
  </div>

  {/* Department Cards / ListViewIcon */}
  <div className="flex items-center justify-between">
  <p className="text-sm text-gray-500">{DEPARTMENTS.length} {t('departments.stats.total', 'departments')}</p>
  <ToggleSwitch
    checked={viewMode === 'list'}
    onChange={v => setViewMode(v ? 'list' : 'grid')}
    labels={['Grille', 'Liste']}
  />
  </div>

  {viewMode === 'grid' ? (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {DEPARTMENTS.map((dept, i) => (
  <motion.div
  key={dept.id}
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.2 + i * 0.08 }}
  onClick={() => navigate(`/departments/${dept.id}`)}
  className="bg-white  p-6 border border-gray-100 cursor-pointer hover:border-[#283852]/30 transition-all group"
  >
  {/* Icon + Name */}
  <div className="flex items-center gap-4 mb-5">
  <div
  className="w-12 h-12  flex items-center justify-center transition-transform  duration-300"
  style={{ backgroundColor: `${dept.color}15` }}
  >
  <dept.icon size={24} style={{ color: dept.color }} />
  </div>
  <div className="flex-1 min-w-0">
  <h3 className="text-lg font-bold text-gray-800">{dept.name}</h3>
  <div className="flex items-center gap-2 mt-0.5">
  <img src={dept.head.avatar} alt="" className="w-4 h-4 rounded-full border border-gray-200" />
  <span className="text-xs text-gray-400">{dept.head.name}</span>
  </div>
  </div>
  {!isHOD && (
  <button
  onClick={e => { e.stopPropagation(); setEditingDepartment(dept); }}
  className="p-2  text-gray-300 hover:text-[#283852] hover:bg-[#283852]/5 transition-colors opacity-0 group-hover:opacity-100"
  >
  <PencilIcon size={16} />
  </button>
  )}
  </div>

  {/* Stats row */}
  <div className="grid grid-cols-3 gap-3 mb-5">
  <div className="text-center bg-gray-50  py-3">
  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{t('departments.card.employees')}</p>
  <p className="text-lg font-bold text-gray-800">{dept.employees.length}</p>
  </div>
  <div className="text-center bg-gray-50  py-3">
  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{t('departments.card.projects')}</p>
  <p className="text-lg font-bold text-gray-800">{dept.projects.length}</p>
  </div>
  <div className="text-center bg-gray-50  py-3">
  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">{t('departments.card.budget')}</p>
  <p className="text-lg font-bold text-gray-800">{(dept.budget / 1000000).toFixed(1)}M</p>
  </div>
  </div>

  {/* Employee avatars */}
  <div className="flex items-center justify-between">
  <div className="flex -space-x-2">
  {dept.employees.slice(0, 5).map(emp => (
  <img
  key={emp.id}
  src={emp.avatar}
  alt={emp.name}
  className="w-8 h-8 rounded-full border-2 border-white"
  />
  ))}
  {dept.employees.length > 5 && (
  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
  <span className="text-[10px] font-bold text-gray-500">+{dept.employees.length - 5}</span>
  </div>
  )}
  </div>
  <ArrowUpRight01Icon size={18} className="text-gray-300 group-hover:text-[#283852] transition-colors" />
  </div>
  </motion.div>
  ))}
  </div>
  ) : (
  <div className="bg-white  border border-gray-100 overflow-hidden divide-y divide-gray-100">
  {DEPARTMENTS.map((dept, i) => (
  <motion.div
  key={dept.id}
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: i * 0.04 }}
  onClick={() => navigate(`/departments/${dept.id}`)}
  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors group"
  >
  <div
  className="w-10 h-10  flex items-center justify-center shrink-0"
  style={{ backgroundColor: `${dept.color}15` }}
  >
  <dept.icon size={18} style={{ color: dept.color }} />
  </div>
  <div className="flex-1 min-w-0">
  <p className="text-sm font-semibold text-gray-800">{dept.name}</p>
  <p className="text-xs text-gray-400">{dept.head.name}</p>
  </div>
  <div className="flex items-center gap-6 text-xs text-gray-500 shrink-0">
  <span className="flex items-center gap-1.5">
  <UserGroupIcon size={12} className="text-gray-400" />
  {dept.employees.length}
  </span>
  <span className="flex items-center gap-1.5">
  <Briefcase01Icon size={12} className="text-gray-400" />
  {dept.projects.length}
  </span>
  </div>
  <div className="flex items-center gap-2 shrink-0">
  {!isHOD && (
  <button
  onClick={e => { e.stopPropagation(); setEditingDepartment(dept); }}
  className="p-1.5  text-gray-300 hover:text-[#283852] hover:bg-[#283852]/5 transition-colors opacity-0 group-hover:opacity-100"
  >
  <PencilIcon size={14} />
  </button>
  )}
  <ArrowUpRight01Icon size={16} className="text-gray-300 group-hover:text-[#283852] transition-colors" />
  </div>
  </motion.div>
  ))}
  </div>
  )}

  {/* Scroll sentinel */}
  <div ref={sentinelRef} className="h-1" />
  {departmentsQuery.isFetchingNextPage && (
  <div className="flex justify-center py-4">
  <Loading02Icon size={20} className="animate-spin text-[#283852]" />
  </div>
  )}

  {/* Create Department Modal */}
  <AnimatePresence>
  {showCreateModal && (
  <CreateDepartmentModal onClose={() => setShowCreateModal(false)} />
  )}
  {showRoleModal && (
  <RolesModal onClose={() => setShowRoleModal(false)} />
  )}
  {editingDepartment && (
  <EditDepartmentModal department={editingDepartment} onClose={() => setEditingDepartment(null)} />
  )}
  </AnimatePresence>
  </div>
  );
};

export default Departments;
