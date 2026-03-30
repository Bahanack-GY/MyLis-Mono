import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Check, Loader2, Tag } from 'lucide-react';
import { useTaskNatures, useCreateTaskNature, useUpdateTaskNature, useDeleteTaskNature } from '../api/task-natures/hooks';

const PRESET_COLORS = ['#33cbcc', '#283852', '#33cbcc99', '#28385280', '#33cbcc50', '#283852', '#33cbcc', '#283852'];

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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-nature-modal-title"
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
                            <Tag size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 id="task-nature-modal-title" className="text-base font-bold text-gray-800">{t('taskNatures.manageTitle')}</h3>
                    </div>
                    <button onClick={onClose} aria-label={t('common.close', 'Close')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                {/* Add form */}
                <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder={t('taskNatures.namePlaceholder')}
                            className="flex-1 bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || createNature.isPending}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {createNature.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {t('taskNatures.add')}
                        </button>
                    </div>
                    <div className="flex gap-1.5" role="group" aria-label={t('taskNatures.pickColor', 'Pick a color')}>
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                aria-label={c}
                                aria-pressed={color === c}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent '}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                {/* List */}
                <div className="px-6 py-4 max-h-[40vh] overflow-y-auto space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
                    ) : natures.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">{t('taskNatures.noNatures')}</p>
                    ) : (
                        natures.map(nature => (
                            <div key={nature.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 group">
                                {editingId === nature.id ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUpdate(nature.id)}
                                            autoFocus
                                            className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30"
                                        />
                                        <div className="flex gap-1" role="group" aria-label={t('taskNatures.pickColor', 'Pick a color')}>
                                            {PRESET_COLORS.map(c => (
                                                <button
                                                    key={c}
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
                                            className="p-1.5 rounded-lg bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                        >
                                            {updateNature.isPending ? <Loader2 size={13} aria-hidden="true" className="animate-spin" /> : <Check size={13} aria-hidden="true" />}
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            aria-label={t('common.cancel', 'Cancel')}
                                            className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                                        >
                                            <X size={13} aria-hidden="true" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: nature.color || '#33cbcc' }} />
                                        <span className="flex-1 text-sm font-medium text-gray-700">{nature.name}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(nature)}
                                                aria-label={`${t('common.edit', 'Edit')} ${nature.name}`}
                                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-[#33cbcc] transition-colors"
                                            >
                                                <Pencil size={13} aria-hidden="true" />
                                            </button>
                                            <button
                                                onClick={() => deleteNature.mutate(nature.id)}
                                                disabled={deleteNature.isPending}
                                                aria-label={`${t('common.delete', 'Delete')} ${nature.name}`}
                                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-[#283852] transition-colors"
                                            >
                                                <Trash2 size={13} aria-hidden="true" />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default TaskNatureManager;
