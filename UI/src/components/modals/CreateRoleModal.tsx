import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Cancel01Icon, Add01Icon, Loading02Icon, Briefcase01Icon, Delete02Icon } from 'hugeicons-react';
import { useCreatePosition } from '../../api/positions/hooks';
import { useDepartments } from '../../api/departments/hooks';

interface CreateRoleModalProps {
  onClose: () => void;
  departmentId?: number;
}

const CreateRoleModal = ({ onClose, departmentId }: CreateRoleModalProps) => {
  const { t } = useTranslation();
  const createPosition = useCreatePosition();
  const { data: departments } = useDepartments();

  const [form, setForm] = useState({
  title: '',
  description: '',
  missions: [] as string[],
  departmentId: departmentId ? String(departmentId) : '',
  });

  const [newMission, setNewMission] = useState('');

  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') onClose();
  };
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleAddMission = () => {
  if (newMission.trim()) {
  setForm(prev => ({
  ...prev,
  missions: [...prev.missions, newMission.trim()]
  }));
  setNewMission('');
  }
  };

  const handleRemoveMission = (index: number) => {
  setForm(prev => ({
  ...prev,
  missions: prev.missions.filter((_, i) => i !== index)
  }));
  };

  const update = (key: string, value: any) => {
  setForm(prev => ({ ...prev, [key]: value }));
  };

  const isValid = form.title.trim().length > 0 && form.departmentId !== '';

  const handleSubmit = () => {
  if (!isValid) return;

  createPosition.mutate({
  title: form.title,
  description: form.description,
  missions: form.missions,
  departmentId: form.departmentId,
  }, {
  onSuccess: () => {
  onClose();
  }
  });
  };

  const inputCls = "w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors";
  const labelCls = "block text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5";

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
  aria-labelledby="create-role-modal-title"
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">
  {t('positions.create.subtitle', 'Organization')}
  </p>
  <h2 id="create-role-modal-title" className="text-lg font-bold text-[#1c2b3a] leading-none">
  {t('positions.create.title', 'Create Role')}
  </h2>
  </div>
  <button onClick={onClose} aria-label={t('common.close', 'Close')} className="text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} aria-hidden="true" />
  </button>
  </div>

  {/* Content */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  {/* Title */}
  <div>
  <label htmlFor="cr-title" className={labelCls}>{t('positions.create.name', 'Role Name')}</label>
  <input
  id="cr-title"
  type="text"
  value={form.title}
  onChange={e => update('title', e.target.value)}
  placeholder={t('positions.create.namePlaceholder', 'e.g. Senior Developer')}
  className={inputCls}
  autoFocus
  />
  </div>

  {/* Department */}
  <div>
  <label htmlFor="cr-dept" className={labelCls}>{t('positions.create.department', 'Department')}</label>
  <select
  id="cr-dept"
  value={form.departmentId}
  onChange={e => update('departmentId', e.target.value)}
  className={inputCls}
  >
  <option value="" disabled>{t('positions.create.selectDepartment', 'Select a department')}</option>
  {(departments || []).map(dept => (
  <option key={dept.id} value={dept.id}>{dept.name}</option>
  ))}
  </select>
  </div>

  {/* Description */}
  <div>
  <label htmlFor="cr-desc" className={labelCls}>{t('positions.create.description', 'Description')}</label>
  <textarea
  id="cr-desc"
  value={form.description}
  onChange={e => update('description', e.target.value)}
  placeholder={t('positions.create.descriptionPlaceholder', 'Brief description of the role...')}
  className={`${inputCls} resize-none`}
  rows={3}
  />
  </div>

  {/* Missions */}
  <div>
  <label htmlFor="cr-mission" className={labelCls}>{t('positions.create.missions', 'Missions')}</label>
  <div className="space-y-2 mb-2">
  {form.missions.map((mission, idx) => (
  <div key={idx} className="flex items-center gap-2 bg-[#f8f9fc] px-3 py-2 border border-[#e5e8ef]">
  <div className="w-1.5 h-1.5 rounded-full bg-[#33cbcc]" />
  <span className="flex-1 text-sm text-[#1c2b3a]">{mission}</span>
  <button
  onClick={() => handleRemoveMission(idx)}
  aria-label={`${t('common.remove', 'Remove')} ${mission}`}
  className="text-[#8892a4] hover:text-[#283852] transition-colors p-1"
  >
  <Delete02Icon size={14} aria-hidden="true" />
  </button>
  </div>
  ))}
  </div>
  <div className="flex gap-2">
  <input
  id="cr-mission"
  type="text"
  value={newMission}
  onChange={e => setNewMission(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddMission())}
  placeholder={t('positions.create.missionPlaceholder', 'Add a mission...')}
  className={inputCls}
  />
  <button
  onClick={handleAddMission}
  disabled={!newMission.trim()}
  aria-label={t('positions.create.addMission', 'Add mission')}
  className="px-3 bg-[#f8f9fc] border border-[#e5e8ef] text-[#8892a4] hover:bg-[#e5e8ef] hover:text-[#283852] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
  <Add01Icon size={18} aria-hidden="true" />
  </button>
  </div>
  </div>
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('common.cancel', 'Cancel')}
  </button>
  <button
  onClick={handleSubmit}
  disabled={!isValid || createPosition.isPending}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
  isValid
  ? 'bg-[#33cbcc] hover:bg-[#2bb5b6]'
  : 'bg-gray-300 cursor-not-allowed'
  }`}
  >
  {createPosition.isPending ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
  {t('common.create', 'Create Role')}
  </button>
  </div>
  </motion.div>
  </motion.div>
  );
};

export default CreateRoleModal;
