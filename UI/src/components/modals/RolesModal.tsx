import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Add01Icon, Loading02Icon, Briefcase01Icon, Delete02Icon, PencilIcon, Tick01Icon, ArrowRight01Icon, Search01Icon, Building01Icon } from 'hugeicons-react';
import { usePositions, useCreatePosition, useUpdatePosition, useDeletePosition } from '../../api/positions/hooks';
import { useDepartments } from '../../api/departments/hooks';
import type { Position } from '../../api/positions/types';

interface RolesModalProps {
  onClose: () => void;
}

type View = 'list' | 'create' | 'edit';

const emptyForm = { title: '', description: '', missions: [] as string[], departmentId: '' };

const RolesModal = ({ onClose }: RolesModalProps) => {
  const { t } = useTranslation();
  const { data: positions, isLoading } = usePositions();
  const { data: departments } = useDepartments();
  const createPosition = useCreatePosition();
  const updatePosition = useUpdatePosition();
  const deletePosition = useDeletePosition();

  const [view, setView] = useState<View>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterDeptId, setFilterDeptId] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [newMission, setNewMission] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
  if (view !== 'list') { setView('list'); setEditingId(null); }
  else onClose();
  }
  };
  document.addEventListener('keydown', handleKey);
  document.body.style.overflow = 'hidden';
  return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose, view]);

  const openCreate = () => { setForm(emptyForm); setNewMission(''); setView('create'); };

  const openEdit = (pos: Position) => {
  setEditingId(pos.id);
  setForm({
  title: pos.title,
  description: (pos as any).description || '',
  missions: (pos as any).missions || [],
  departmentId: (pos as any).departmentId || '',
  });
  setNewMission('');
  setView('edit');
  };

  const addMission = () => {
  if (!newMission.trim()) return;
  setForm(p => ({ ...p, missions: [...p.missions, newMission.trim()] }));
  setNewMission('');
  };

  const removeMission = (i: number) =>
  setForm(p => ({ ...p, missions: p.missions.filter((_, idx) => idx !== i) }));

  const handleSubmit = () => {
  if (!form.title.trim()) return;
  const dto = {
  title: form.title.trim(),
  description: form.description,
  missions: form.missions,
  departmentId: form.departmentId || undefined,
  };
  if (view === 'create') {
  createPosition.mutate(dto, { onSuccess: () => setView('list') });
  } else if (view === 'edit' && editingId) {
  updatePosition.mutate({ id: editingId, dto }, { onSuccess: () => { setView('list'); setEditingId(null); } });
  }
  };

  const handleDelete = (id: string) => {
  deletePosition.mutate(id, { onSuccess: () => setConfirmDeleteId(null) });
  };

  const filtered = (positions || []).filter(p => {
  const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
  const matchesDept = !filterDeptId || (p as any).departmentId === filterDeptId;
  return matchesSearch && matchesDept;
  });

  const isPending = createPosition.isPending || updatePosition.isPending;
  const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
  const labelCls = 'block text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

  return (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="roles-modal-title"
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
  <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
  <Briefcase01Icon size={18} className="text-[#33cbcc]" />
  </div>
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
  {view === 'list'
  ? t('roles.modal.subtitle', 'Management')
  : view === 'create'
  ? t('roles.modal.subtitleCreate', 'New Role')
  : t('roles.modal.subtitleEdit', 'Edit Role')}
  </p>
  <h2 id="roles-modal-title" className="text-lg font-bold text-[#1c2b3a] leading-none">
  {view === 'list'
  ? t('roles.modal.title', 'Roles')
  : view === 'create'
  ? t('roles.modal.create', 'Create Role')
  : t('roles.modal.edit', 'Edit Role')}
  </h2>
  {view === 'list' && (
  <p className="text-xs text-[#8892a4] mt-0.5">{(positions || []).length} {t('roles.modal.total', 'roles')}</p>
  )}
  </div>
  </div>
  <div className="flex items-center gap-2">
  {view !== 'list' && (
  <button
  onClick={() => { setView('list'); setEditingId(null); }}
  className="text-xs text-[#8892a4] hover:text-[#1c2b3a] font-medium px-3 py-1.5 hover:bg-[#f8f9fc] transition-colors"
  >
  ← {t('common.back', 'Back')}
  </button>
  )}
  <button onClick={onClose} aria-label={t('common.close', 'Close')} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} aria-hidden="true" />
  </button>
  </div>
  </div>

  {/* List View */}
  <AnimatePresence mode="wait">
  {view === 'list' && (
  <motion.div
  key="list"
  initial={{ opacity: 0, x: -10 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -10 }}
  className="flex flex-col flex-1 min-h-0"
  >
  {/* Search + Add */}
  <div className="px-6 pt-3 pb-2 border-b border-[#e5e8ef] space-y-2 shrink-0">
  <div className="flex gap-3">
  <div className="relative flex-1">
  <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input
  type="text"
  value={search}
  onChange={e => setSearch(e.target.value)}
  placeholder={t('roles.modal.search', 'Search roles...')}
  className="w-full bg-[#f8f9fc] border border-[#e5e8ef] py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
  />
  </div>
  <button
  onClick={openCreate}
  className="flex items-center gap-1.5 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-sm shadow-[#33cbcc]/20"
  >
  <Add01Icon size={15} />
  {t('roles.modal.new', 'New')}
  </button>
  </div>
  {/* Department filter pills */}
  <div className="flex gap-2 flex-wrap pb-1">
  <button
  onClick={() => setFilterDeptId('')}
  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
  filterDeptId === ''
  ? 'bg-[#33cbcc] text-white'
  : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-[#e5e8ef]'
  }`}
  >
  {t('roles.modal.allDepts', 'All')}
  </button>
  {(departments || []).map(dept => (
  <button
  key={dept.id}
  onClick={() => setFilterDeptId(filterDeptId === dept.id ? '' : dept.id)}
  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
  filterDeptId === dept.id
  ? 'bg-[#33cbcc] text-white'
  : 'bg-[#f8f9fc] text-[#8892a4] hover:bg-[#e5e8ef]'
  }`}
  >
  <Building01Icon size={11} />
  {dept.name}
  </button>
  ))}
  </div>
  </div>

  {/* Roles List */}
  <div className="flex-1 overflow-y-auto divide-y divide-[#e5e8ef]">
  {isLoading ? (
  <div className="flex justify-center py-12">
  <Loading02Icon size={24} className="animate-spin text-[#33cbcc]" />
  </div>
  ) : filtered.length === 0 ? (
  <div className="py-12 text-center">
  <Briefcase01Icon size={36} className="mx-auto text-[#e5e8ef] mb-3" />
  <p className="text-sm text-[#8892a4]">{t('roles.modal.empty', 'No roles found')}</p>
  </div>
  ) : filtered.map(pos => {
  const dept = departments?.find(d => d.id === (pos as any).departmentId);
  const missions: string[] = (pos as any).missions || [];
  return (
  <div key={pos.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#f8f9fc] transition-colors group">
  <div className="w-10 h-10 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
  <Briefcase01Icon size={18} className="text-[#33cbcc]" />
  </div>
  <div className="flex-1 min-w-0">
  <p className="text-sm font-semibold text-[#1c2b3a] truncate">{pos.title}</p>
  <div className="flex items-center gap-2 mt-0.5">
  {dept && (
  <span className="flex items-center gap-1 text-[11px] text-[#8892a4]">
  <Building01Icon size={10} />{dept.name}
  </span>
  )}
  {missions.length > 0 && (
  <span className="text-[11px] text-[#b0bac9]">·</span>
  )}
  {missions.length > 0 && (
  <span className="text-[11px] text-[#8892a4]">{missions.length} mission{missions.length > 1 ? 's' : ''}</span>
  )}
  </div>
  </div>
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
  onClick={() => openEdit(pos)}
  aria-label={`${t('common.edit', 'Edit')} ${pos.title}`}
  className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#33cbcc] transition-colors"
  >
  <PencilIcon size={15} aria-hidden="true" />
  </button>
  <button
  onClick={() => setConfirmDeleteId(pos.id)}
  aria-label={`${t('common.delete', 'Delete')} ${pos.title}`}
  className="p-2 hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#283852] transition-colors"
  >
  <Delete02Icon size={15} aria-hidden="true" />
  </button>
  </div>
  <ArrowRight01Icon size={15} className="text-[#e5e8ef] group-hover:text-[#b0bac9] transition-colors shrink-0" />
  </div>
  );
  })}
  </div>
  </motion.div>
  )}

  {/* Create / Edit Form */}
  {(view === 'create' || view === 'edit') && (
  <motion.div
  key="form"
  initial={{ opacity: 0, x: 10 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 10 }}
  className="flex flex-col flex-1 min-h-0"
  >
  <div className="px-6 py-6 space-y-5 overflow-y-auto flex-1">
  {/* Title */}
  <div>
  <label htmlFor="roles-form-title" className={labelCls}>{t('positions.create.name', 'Role Name')}</label>
  <input
  id="roles-form-title"
  type="text"
  value={form.title}
  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
  placeholder={t('positions.create.namePlaceholder', 'e.g. Senior Developer')}
  className={inputCls}
  autoFocus
  />
  </div>

  {/* Department */}
  <div>
  <label htmlFor="roles-form-dept" className={labelCls}>{t('positions.create.department', 'Department')}</label>
  <select
  id="roles-form-dept"
  value={form.departmentId}
  onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
  className={inputCls}
  >
  <option value="">{t('positions.create.selectDepartment', 'Select a department (optional)')}</option>
  {(departments || []).map(dept => (
  <option key={dept.id} value={dept.id}>{dept.name}</option>
  ))}
  </select>
  </div>

  {/* Description */}
  <div>
  <label htmlFor="roles-form-desc" className={labelCls}>{t('positions.create.description', 'Description')}</label>
  <textarea
  id="roles-form-desc"
  value={form.description}
  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
  placeholder={t('positions.create.descriptionPlaceholder', 'Brief description of the role...')}
  className={`${inputCls} resize-none`}
  rows={3}
  />
  </div>

  {/* Missions */}
  <div>
  <label htmlFor="roles-form-mission" className={labelCls}>{t('positions.create.missions', 'Missions')}</label>
  <div className="space-y-2 mb-2">
  {form.missions.map((m, i) => (
  <div key={i} className="flex items-center gap-2 bg-[#f8f9fc] px-3 py-2 border border-[#e5e8ef]">
  <div className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] shrink-0" />
  <span className="flex-1 text-sm text-[#1c2b3a]">{m}</span>
  <button
  onClick={() => removeMission(i)}
  aria-label={`${t('common.remove', 'Remove')} ${m}`}
  className="text-[#8892a4] hover:text-[#283852] transition-colors p-1"
  >
  <Delete02Icon size={13} aria-hidden="true" />
  </button>
  </div>
  ))}
  </div>
  <div className="flex gap-2">
  <input
  id="roles-form-mission"
  type="text"
  value={newMission}
  onChange={e => setNewMission(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMission())}
  placeholder={t('positions.create.missionPlaceholder', 'Add a mission...')}
  className={inputCls}
  />
  <button
  onClick={addMission}
  disabled={!newMission.trim()}
  aria-label={t('positions.create.addMission', 'Add mission')}
  className="px-3 bg-[#f8f9fc] text-[#8892a4] hover:bg-[#e5e8ef] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
  <Add01Icon size={17} aria-hidden="true" />
  </button>
  </div>
  </div>
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={() => { setView('list'); setEditingId(null); }}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('common.cancel', 'Cancel')}
  </button>
  <button
  onClick={handleSubmit}
  disabled={!form.title.trim() || isPending}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
  form.title.trim() && !isPending
  ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
  : 'bg-[#b0bac9] cursor-not-allowed'
  }`}
  >
  {isPending ? <Loading02Icon size={15} className="animate-spin" /> : <Tick01Icon size={15} />}
  {view === 'create' ? t('common.create', 'Create') : t('common.save', 'Save changes')}
  </button>
  </div>
  </motion.div>
  )}
  </AnimatePresence>
  </motion.div>

  {/* Confirm Delete */}
  <AnimatePresence>
  {confirmDeleteId && (
  <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={() => setConfirmDeleteId(null)}
  className="fixed inset-0 z-60 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-xs h-full flex flex-col border-l border-[#e5e8ef]"
  >
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#283852] mb-0.5">{t('common.confirm', 'Confirm')}</p>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">{t('roles.modal.deleteTitle', 'Delete Role')}</h2>
  </div>
  <button onClick={() => setConfirmDeleteId(null)} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} />
  </button>
  </div>
  <div className="flex-1 flex flex-col items-center justify-center px-6 py-6">
  <div className="w-12 h-12 rounded-full bg-[#283852]/10 flex items-center justify-center mb-4">
  <Delete02Icon size={22} className="text-[#283852]" />
  </div>
  <p className="text-center text-sm text-[#8892a4]">
  {t('roles.modal.deleteConfirm', 'Are you sure you want to delete this role? This action cannot be undone.')}
  </p>
  </div>
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={() => setConfirmDeleteId(null)}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('common.cancel', 'Cancel')}
  </button>
  <button
  onClick={() => handleDelete(confirmDeleteId)}
  disabled={deletePosition.isPending}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#283852]/90 disabled:opacity-60 transition-colors"
  >
  {deletePosition.isPending ? <Loading02Icon size={14} className="animate-spin" /> : null}
  {t('common.delete', 'Delete')}
  </button>
  </div>
  </motion.div>
  </motion.div>
  )}
  </AnimatePresence>
  </motion.div>
  );
};

export default RolesModal;
