import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Plus, Loader2, Briefcase, Trash2 } from 'lucide-react';
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

    const inputCls = "w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all";
    const labelCls = "block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

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
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                            <Briefcase size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('positions.create.title', 'Create Role')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Title */}
                    <div>
                        <label className={labelCls}>{t('positions.create.name', 'Role Name')}</label>
                        <input
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
                        <label className={labelCls}>{t('positions.create.department', 'Department')}</label>
                        <select
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
                        <label className={labelCls}>{t('positions.create.description', 'Description')}</label>
                        <textarea
                            value={form.description}
                            onChange={e => update('description', e.target.value)}
                            placeholder={t('positions.create.descriptionPlaceholder', 'Brief description of the role...')}
                            className={`${inputCls} resize-none`}
                            rows={3}
                        />
                    </div>

                    {/* Missions */}
                    <div>
                        <label className={labelCls}>{t('positions.create.missions', 'Missions')}</label>
                        <div className="space-y-2 mb-2">
                            {form.missions.map((mission, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#33cbcc]" />
                                    <span className="flex-1 text-sm text-gray-700">{mission}</span>
                                    <button
                                        onClick={() => handleRemoveMission(idx)}
                                        className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
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
                                className="px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid || createPosition.isPending}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-[#33cbcc]/20 ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] hover:-translate-y-px'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createPosition.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('common.create', 'Create Role')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CreateRoleModal;
