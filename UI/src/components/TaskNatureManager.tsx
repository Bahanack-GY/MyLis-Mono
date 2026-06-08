import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Add01Icon, PencilIcon, Delete02Icon, Tick01Icon, Loading02Icon, Tag01Icon } from 'hugeicons-react';
import { useTaskNatures, useCreateTaskNature, useUpdateTaskNature, useDeleteTaskNature } from '../api/task-natures/hooks';

const PRESET_COLORS = ['#33cbcc', '#283852', '#33cbcc99', '#28385280', '#33cbcc50', '#6b7280', '#f59e0b', '#ef4444'];

const TaskNatureManager = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { data: natures = [], isLoading } = useTaskNatures();
  const createNature = useCreateTaskNature();
  const updateNature = useUpdateTaskNature();
  const deleteNature = useDeleteTaskNature();

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  useEffect(() => {
  const prev = document.activeElement as HTMLElement;
  document.body.style.overflow = 'hidden';
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', onKey);
  return () => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
  prev?.focus();
  };
  }, [onClose]);

  const handleCreate = () => {
  if (!name.trim()) return;
  createNature.mutate({ name: name.trim(), color }, {
  onSuccess: () => { setName(''); setColor(PRESET_COLORS[0]); },
  });
  };

  const handleUpdate = (id: string) => {
  if (!editName.trim()) return;
  updateNature.mutate({ id, dto: { name: editName.trim(), color: editColor } }, {
  onSuccess: () => setEditingId(null),
  });
  };

  const startEdit = (nature: { id: string; name: string; color?: string }) => {
  setEditingId(nature.id);
  setEditName(nature.name);
  setEditColor(nature.color || PRESET_COLORS[0]);
  };

  return (
  <motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  role="dialog"
  aria-modal="true"
  aria-labelledby="task-nature-modal-title"
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
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc] mb-0.5">{t('taskNatures.subtitle', 'Configuration')}</p>
  <h2 id="task-nature-modal-title" className="text-lg font-bold text-[#1c2b3a] leading-none">{t('taskNatures.manageTitle')}</h2>
  </div>
  <button onClick={onClose} aria-label={t('common.close', 'Close')} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} aria-hidden="true" />
  </button>
  </div>

  {/* Add form */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] space-y-3 shrink-0">
  <div className="flex gap-2">
  <input
  type="text"
  value={name}
  onChange={e => setName(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && handleCreate()}
  placeholder={t('taskNatures.namePlaceholder')}
  className="flex-1 bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors"
  />
  <button
  onClick={handleCreate}
  disabled={!name.trim() || createNature.isPending}
  className="px-4 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors flex items-center gap-1.5"
  >
  {createNature.isPending ? <Loading02Icon size={14} className="animate-spin" /> : <Add01Icon size={14} />}
  {t('taskNatures.add')}
  </button>
  </div>
  <div className="flex gap-1.5" role="group" aria-label={t('taskNatures.pickColor', 'Pick a color')}>
  {PRESET_COLORS.map((c, i) => (
  <button
  key={i}
  onClick={() => setColor(c)}
  aria-label={c}
  aria-pressed={color === c}
  className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
  style={{ backgroundColor: c }}
  />
  ))}
  </div>
  </div>

  {/* List */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
  {isLoading ? (
  <div className="flex justify-center py-8"><Loading02Icon size={24} className="animate-spin text-[#33cbcc]" /></div>
  ) : natures.length === 0 ? (
  <p className="text-center text-sm text-[#8892a4] py-8">{t('taskNatures.noNatures')}</p>
  ) : (
  natures.map(nature => (
  <div key={nature.id} className="flex items-center gap-3 bg-[#f8f9fc] px-4 py-3 group">
  {editingId === nature.id ? (
  <>
  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
  <input
  type="text"
  value={editName}
  onChange={e => setEditName(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && handleUpdate(nature.id)}
  autoFocus
  className="flex-1 bg-white border border-[#e5e8ef] px-3 py-1.5 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] transition-colors"
  />
  <div className="flex gap-1" role="group" aria-label={t('taskNatures.pickColor', 'Pick a color')}>
  {PRESET_COLORS.map((c, i) => (
  <button
  key={i}
  onClick={() => setEditColor(c)}
  aria-label={c}
  aria-pressed={editColor === c}
  className={`w-5 h-5 rounded-full border ${editColor === c ? 'border-gray-800' : 'border-transparent'}`}
  style={{ backgroundColor: c }}
  />
  ))}
  </div>
  <button
  onClick={() => handleUpdate(nature.id)}
  disabled={!editName.trim() || updateNature.isPending}
  aria-label={t('common.save', 'Save')}
  className="p-1.5 bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
  >
  {updateNature.isPending ? <Loading02Icon size={13} aria-hidden="true" className="animate-spin" /> : <Tick01Icon size={13} aria-hidden="true" />}
  </button>
  <button
  onClick={() => setEditingId(null)}
  aria-label={t('common.cancel', 'Cancel')}
  className="p-1.5 bg-[#f8f9fc] text-[#8892a4] hover:bg-[#e5e8ef] transition-colors"
  >
  <Cancel01Icon size={13} aria-hidden="true" />
  </button>
  </>
  ) : (
  <>
  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: nature.color || '#33cbcc' }} />
  <span className="flex-1 text-sm font-medium text-[#1c2b3a]">{nature.name}</span>
  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
  onClick={() => startEdit(nature)}
  aria-label={`${t('common.edit', 'Edit')} ${nature.name}`}
  className="p-1.5 hover:bg-white text-[#8892a4] hover:text-[#33cbcc] transition-colors"
  >
  <PencilIcon size={13} aria-hidden="true" />
  </button>
  <button
  onClick={() => deleteNature.mutate(nature.id)}
  disabled={deleteNature.isPending}
  aria-label={`${t('common.delete', 'Delete')} ${nature.name}`}
  className="p-1.5 hover:bg-white text-[#8892a4] hover:text-[#283852] transition-colors"
  >
  <Delete02Icon size={13} aria-hidden="true" />
  </button>
  </div>
  </>
  )}
  </div>
  ))
  )}
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('common.close', 'Close')}
  </button>
  </div>
  </motion.div>
  </motion.div>
  );
};

export default TaskNatureManager;
