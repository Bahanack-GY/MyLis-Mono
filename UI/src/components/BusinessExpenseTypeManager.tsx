import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Plus, Pencil, Trash2, Check, Loader2, Wallet } from 'lucide-react';
import { useBusinessExpenseTypes, useCreateBusinessExpenseType, useUpdateBusinessExpenseType, useDeleteBusinessExpenseType } from '../api/business-expenses/hooks';

const PRESET_COLORS = ['#33cbcc', '#283852', '#ef4444', '#f59e0b', '#22c55e', '#8b5cf6', '#ec4899', '#6366f1'];

const BusinessExpenseTypeManager = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const { data: types = [], isLoading } = useBusinessExpenseTypes();
    const createType = useCreateBusinessExpenseType();
    const updateType = useUpdateBusinessExpenseType();
    const deleteType = useDeleteBusinessExpenseType();

    const [name, setName] = useState('');
    const [color, setColor] = useState(PRESET_COLORS[0]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('');

    const handleCreate = () => {
        if (!name.trim()) return;
        createType.mutate({ name: name.trim(), color }, {
            onSuccess: () => { setName(''); setColor(PRESET_COLORS[0]); },
        });
    };

    const handleUpdate = (id: string) => {
        if (!editName.trim()) return;
        updateType.mutate({ id, dto: { name: editName.trim(), color: editColor } }, {
            onSuccess: () => setEditingId(null),
        });
    };

    const startEdit = (type: { id: string; name: string; color?: string }) => {
        setEditingId(type.id);
        setEditName(type.name);
        setEditColor(type.color || PRESET_COLORS[0]);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
                            <Wallet size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('businessExpenseTypes.manageTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-4 border-b border-gray-100 space-y-3">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            placeholder={t('businessExpenseTypes.namePlaceholder')}
                            className="flex-1 bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                        />
                        <button
                            onClick={handleCreate}
                            disabled={!name.trim() || createType.isPending}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {createType.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {t('businessExpenseTypes.add')}
                        </button>
                    </div>
                    <div className="flex gap-1.5">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setColor(c)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-gray-800 scale-110' : 'border-transparent '}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                </div>

                <div className="px-6 py-4 max-h-[40vh] overflow-y-auto space-y-2">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
                    ) : types.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">{t('businessExpenseTypes.noTypes')}</p>
                    ) : (
                        types.map(type => (
                            <div key={type.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 group">
                                {editingId === type.id ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: editColor }} />
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUpdate(type.id)}
                                            autoFocus
                                            className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30"
                                        />
                                        <div className="flex gap-1">
                                            {PRESET_COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setEditColor(c)}
                                                    className={`w-5 h-5 rounded-full border ${editColor === c ? 'border-gray-800' : 'border-transparent'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleUpdate(type.id)}
                                            disabled={!editName.trim() || updateType.isPending}
                                            className="p-1.5 rounded-lg bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:opacity-50 transition-colors"
                                        >
                                            {updateType.isPending ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                        </button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                                        >
                                            <X size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: type.color || '#33cbcc' }} />
                                        <span className="flex-1 text-sm font-medium text-gray-700">{type.name}</span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEdit(type)}
                                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-[#33cbcc] transition-colors"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={() => deleteType.mutate(type.id)}
                                                disabled={deleteType.isPending}
                                                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={13} />
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

export default BusinessExpenseTypeManager;
