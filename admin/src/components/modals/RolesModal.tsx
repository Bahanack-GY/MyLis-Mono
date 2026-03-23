import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Loader2, Briefcase, Trash2, Pencil, Check, ChevronRight, Search, Building,
} from 'lucide-react';
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
    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                            <Briefcase size={18} className="text-[#33cbcc]" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-800">
                                {view === 'list'
                                    ? t('roles.modal.title', 'Roles')
                                    : view === 'create'
                                        ? t('roles.modal.create', 'Create Role')
                                        : t('roles.modal.edit', 'Edit Role')}
                            </h3>
                            {view === 'list' && (
                                <p className="text-xs text-gray-400">{(positions || []).length} {t('roles.modal.total', 'roles')}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {view !== 'list' && (
                            <button
                                onClick={() => { setView('list'); setEditingId(null); }}
                                className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                ← {t('common.back', 'Back')}
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={18} />
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
                            <div className="px-6 pt-3 pb-2 border-b border-gray-50 space-y-2 shrink-0">
                                <div className="flex gap-3">
                                    <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-3 border border-gray-100">
                                        <Search size={15} className="text-gray-400 shrink-0" />
                                        <input
                                            type="text"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                            placeholder={t('roles.modal.search', 'Search roles...')}
                                            className="flex-1 bg-transparent py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                                        />
                                    </div>
                                    <button
                                        onClick={openCreate}
                                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#33cbcc] text-white text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-sm shadow-[#33cbcc]/20"
                                    >
                                        <Plus size={15} />
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
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
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
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            <Building size={11} />
                                            {dept.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Roles List */}
                            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                                {isLoading ? (
                                    <div className="flex justify-center py-12">
                                        <Loader2 size={24} className="animate-spin text-[#33cbcc]" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Briefcase size={36} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-sm text-gray-400">{t('roles.modal.empty', 'No roles found')}</p>
                                    </div>
                                ) : filtered.map(pos => {
                                    const dept = departments?.find(d => d.id === (pos as any).departmentId);
                                    const missions: string[] = (pos as any).missions || [];
                                    return (
                                        <div key={pos.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors group">
                                            <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                                                <Briefcase size={18} className="text-[#33cbcc]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{pos.title}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {dept && (
                                                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                                            <Building size={10} />{dept.name}
                                                        </span>
                                                    )}
                                                    {missions.length > 0 && (
                                                        <span className="text-[11px] text-gray-300">·</span>
                                                    )}
                                                    {missions.length > 0 && (
                                                        <span className="text-[11px] text-gray-400">{missions.length} mission{missions.length > 1 ? 's' : ''}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEdit(pos)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(pos.id)}
                                                    className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                            <ChevronRight size={15} className="text-gray-200 group-hover:text-gray-300 transition-colors shrink-0" />
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
                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                {/* Title */}
                                <div>
                                    <label className={labelCls}>{t('positions.create.name', 'Role Name')}</label>
                                    <input
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
                                    <label className={labelCls}>{t('positions.create.department', 'Department')}</label>
                                    <select
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
                                    <label className={labelCls}>{t('positions.create.description', 'Description')}</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        placeholder={t('positions.create.descriptionPlaceholder', 'Brief description of the role...')}
                                        className={`${inputCls} resize-none`}
                                        rows={3}
                                    />
                                </div>

                                {/* Missions */}
                                <div>
                                    <label className={labelCls}>{t('positions.create.missions', 'Missions')}</label>
                                    <div className="space-y-2 mb-2">
                                        {form.missions.map((m, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] shrink-0" />
                                                <span className="flex-1 text-sm text-gray-700">{m}</span>
                                                <button onClick={() => removeMission(i)} className="text-gray-400 hover:text-rose-500 transition-colors p-1">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
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
                                            className="px-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <Plus size={17} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0 bg-gray-50/50">
                                <button
                                    onClick={() => { setView('list'); setEditingId(null); }}
                                    className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!form.title.trim() || isPending}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg shadow-[#33cbcc]/20 ${
                                        form.title.trim() && !isPending
                                            ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] hover:-translate-y-px'
                                            : 'bg-gray-300 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    {isPending ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
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
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
                        >
                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={22} className="text-rose-500" />
                            </div>
                            <h4 className="text-center font-bold text-gray-800 mb-2">{t('roles.modal.deleteTitle', 'Delete Role')}</h4>
                            <p className="text-center text-sm text-gray-500 mb-6">
                                {t('roles.modal.deleteConfirm', 'Are you sure you want to delete this role? This action cannot be undone.')}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button
                                    onClick={() => handleDelete(confirmDeleteId)}
                                    disabled={deletePosition.isPending}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 transition-colors"
                                >
                                    {deletePosition.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
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
