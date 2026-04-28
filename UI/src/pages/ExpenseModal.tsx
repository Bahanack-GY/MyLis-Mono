import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Loading02Icon, Attachment01Icon, File01Icon, Image01Icon, Delete02Icon, Upload01Icon } from 'hugeicons-react';
import { useCreateExpense, useUpdateExpense } from '../api/expenses/hooks';
import { expensesApi } from '../api/expenses/api';
import { useDepartments } from '../api/departments/hooks';
import { useChargeFamilies, useChargeNatures } from '../api/charge-natures/hooks';
import type { CreateExpenseDto, Expense, JustificationFile } from '../api/expenses/types';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | null;
    defaultDepartmentId?: string;
}

const DEFAULT_FAMILY = 'CHARGES_OPERATIONNELLES';
const DEFAULT_NATURE = 'Fournitures de bureau';

const ACCEPTED = '.jpg,.jpeg,.png,.gif,.webp,.pdf';

function FilePreview({ file, onRemove }: { file: JustificationFile; onRemove: () => void }) {
    const isPdf = file.filePath.toLowerCase().endsWith('.pdf') || file.originalName.toLowerCase().endsWith('.pdf');
    const isImage = !isPdf;
    const serverBase = import.meta.env.VITE_API_URL?.replace('/api', '') ?? '';
    const fullUrl = file.filePath.startsWith('http') ? file.filePath : `${serverBase}${file.filePath}`;

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200 group">
            {isImage ? (
                <img
                    src={fullUrl}
                    alt={file.originalName}
                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0"
                />
            ) : (
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <File01Icon size={14} className="text-red-400" />
                </div>
            )}
            <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 text-xs text-gray-700 hover:text-[#33cbcc] truncate transition-colors"
            >
                {file.originalName}
            </a>
            <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
            >
                <Delete02Icon size={12} />
            </button>
        </div>
    );
}

function PendingFilePreview({ file, onRemove }: { file: File; onRemove: () => void }) {
    const isPdf = file.type === 'application/pdf';
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!isPdf) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, isPdf]);

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 group">
            {preview ? (
                <img src={preview} alt={file.name} className="w-8 h-8 rounded-lg object-cover border border-blue-100 shrink-0" />
            ) : (
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <File01Icon size={14} className="text-red-400" />
                </div>
            )}
            <span className="flex-1 min-w-0 text-xs text-gray-700 truncate">{file.name}</span>
            <span className="text-[10px] text-blue-400 shrink-0">en attente</span>
            <button
                type="button"
                onClick={onRemove}
                className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
            >
                <Delete02Icon size={12} />
            </button>
        </div>
    );
}

export default function ExpenseModal({ isOpen, onClose, expense, defaultDepartmentId }: ExpenseModalProps) {
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();
    const { data: departments = [] } = useDepartments();
    const { data: families = [] } = useChargeFamilies();
    const isEditing = !!expense;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<CreateExpenseDto>({
        title: '',
        amount: 0,
        chargeFamily: DEFAULT_FAMILY,
        chargeNature: DEFAULT_NATURE,
        type: 'ONE_TIME',
        frequency: null,
        date: new Date().toISOString().split('T')[0],
        departmentId: defaultDepartmentId ?? null,
    });

    const [savedFiles, setSavedFiles] = useState<JustificationFile[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const { data: allNatures = [] } = useChargeNatures();

    const naturesForFamily = useMemo(
        () => allNatures.filter(n => n.chargeFamily === formData.chargeFamily),
        [allNatures, formData.chargeFamily],
    );

    useEffect(() => {
        if (isOpen) {
            setPendingFiles([]);
            if (expense) {
                setFormData({
                    title: expense.title,
                    amount: Number(expense.amount),
                    chargeFamily: expense.chargeFamily,
                    chargeNature: expense.chargeNature,
                    type: expense.type,
                    frequency: expense.type === 'RECURRENT' ? expense.frequency : null,
                    date: expense.date,
                    departmentId: expense.departmentId ?? null,
                });
                setSavedFiles(expense.justificationFiles ?? []);
            } else {
                setFormData({
                    title: '',
                    amount: 0,
                    chargeFamily: DEFAULT_FAMILY,
                    chargeNature: DEFAULT_NATURE,
                    type: 'ONE_TIME',
                    frequency: null,
                    date: new Date().toISOString().split('T')[0],
                    departmentId: defaultDepartmentId ?? null,
                });
                setSavedFiles([]);
            }
        }
    }, [isOpen, expense, defaultDepartmentId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: name === 'amount' ? Number(value) : value };
            if (name === 'type' && value === 'ONE_TIME') next.frequency = null;
            if (name === 'type' && value === 'RECURRENT' && !prev.frequency) next.frequency = 'MONTHLY';
            if (name === 'departmentId') next.departmentId = value || null;
            if (name === 'chargeFamily') {
                const firstNature = allNatures.find(n => n.chargeFamily === value);
                next.chargeNature = firstNature?.natureName ?? '';
            }
            return next;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length) setPendingFiles(prev => [...prev, ...files]);
        e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f =>
            f.type.startsWith('image/') || f.type === 'application/pdf',
        );
        if (files.length) setPendingFiles(prev => [...prev, ...files]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let allFiles = [...savedFiles];

            if (pendingFiles.length > 0) {
                setIsUploading(true);
                for (const file of pendingFiles) {
                    const fd = new FormData();
                    fd.append('file', file);
                    const result = await expensesApi.uploadJustification(fd);
                    allFiles.push(result);
                }
                setIsUploading(false);
            }

            const dto = { ...formData, justificationFiles: allFiles };

            if (isEditing) {
                await updateExpense.mutateAsync({ id: expense!.id, data: dto });
            } else {
                await createExpense.mutateAsync(dto);
            }
            onClose();
        } catch (error) {
            setIsUploading(false);
            console.error('Failed to save expense:', error);
        }
    };

    const isPending = createExpense.isPending || updateExpense.isPending || isUploading;
    const selectedFamilyLabel = families.find(f => f.code === formData.chargeFamily)?.label ?? formData.chargeFamily;
    const totalFiles = savedFiles.length + pendingFiles.length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-xl z-[60] overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-800">
                                {isEditing ? 'Modifier la Charge' : 'Nouvelle Charge'}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors"
                            >
                                <Cancel01Icon size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            <form id="expense-form" onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Titre / Description</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                                        placeholder="Ex: Facture électricité Janvier"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Montant (FCFA)</label>
                                        <input
                                            type="number"
                                            name="amount"
                                            required
                                            min="0"
                                            value={formData.amount || ''}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            name="date"
                                            required
                                            value={formData.date}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Département</label>
                                    <select
                                        name="departmentId"
                                        value={formData.departmentId ?? ''}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="">Général (aucun département)</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Charge Classification */}
                                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Classification OHADA</p>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Famille de charge</label>
                                        <select
                                            name="chargeFamily"
                                            value={formData.chargeFamily}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm appearance-none cursor-pointer"
                                        >
                                            {families.map(f => (
                                                <option key={f.code} value={f.code}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                            Nature de la charge
                                            <span className="ml-1.5 text-xs font-normal text-gray-400">({selectedFamilyLabel})</span>
                                        </label>
                                        <select
                                            name="chargeNature"
                                            value={formData.chargeNature}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm appearance-none cursor-pointer"
                                        >
                                            {naturesForFamily.length === 0 && (
                                                <option value="">Aucune nature disponible</option>
                                            )}
                                            {naturesForFamily.map(n => (
                                                <option key={n.id} value={n.natureName}>{n.natureName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de charge</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="ONE_TIME"
                                                checked={formData.type === 'ONE_TIME'}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#33cbcc] focus:ring-[#33cbcc]"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">Ponctuelle</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="type"
                                                value="RECURRENT"
                                                checked={formData.type === 'RECURRENT'}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-[#33cbcc] focus:ring-[#33cbcc]"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">Récurrente</span>
                                        </label>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {formData.type === 'RECURRENT' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                        >
                                            <label className="block text-sm font-medium text-gray-700 mb-1.5 mt-2">Fréquence de récurrence</label>
                                            <select
                                                name="frequency"
                                                value={formData.frequency || 'MONTHLY'}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                                            >
                                                <option value="DAILY">Quotidienne</option>
                                                <option value="WEEKLY">Hebdomadaire</option>
                                                <option value="MONTHLY">Mensuelle</option>
                                                <option value="YEARLY">Annuelle</option>
                                            </select>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Justificatifs */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                                        <Attachment01Icon size={14} className="text-gray-400" />
                                        Justificatifs
                                        {totalFiles > 0 && (
                                            <span className="text-xs font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-1.5 py-0.5 rounded-full">
                                                {totalFiles}
                                            </span>
                                        )}
                                    </label>

                                    {/* Dropzone */}
                                    <div
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:border-[#33cbcc]/50 hover:bg-[#33cbcc]/5 transition-colors cursor-pointer"
                                    >
                                        <Upload01Icon size={20} className="text-gray-300" />
                                        <p className="text-xs text-gray-400 text-center">
                                            Glissez un fichier ici ou <span className="text-[#33cbcc] font-medium">cliquez pour parcourir</span>
                                        </p>
                                        <p className="text-[10px] text-gray-300">Images (JPG, PNG, WEBP) · PDF · 10 Mo max</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept={ACCEPTED}
                                            multiple
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </div>

                                    {/* File list */}
                                    {(savedFiles.length > 0 || pendingFiles.length > 0) && (
                                        <div className="mt-2 space-y-1.5">
                                            {savedFiles.map((f, i) => (
                                                <FilePreview
                                                    key={f.filePath}
                                                    file={f}
                                                    onRemove={() => setSavedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                />
                                            ))}
                                            {pendingFiles.map((f, i) => (
                                                <PendingFilePreview
                                                    key={`${f.name}-${i}`}
                                                    file={f}
                                                    onRemove={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 mt-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isPending}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                form="expense-form"
                                disabled={isPending}
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#33cbcc] hover:bg-[#2bb5b6] rounded-xl transition-all shadow-md shadow-[#33cbcc]/20 disabled:opacity-50"
                            >
                                {isPending ? (
                                    <>
                                        <Loading02Icon className="w-4 h-4 animate-spin" />
                                        {isUploading ? 'Envoi des fichiers...' : 'Enregistrement...'}
                                    </>
                                ) : (
                                    isEditing ? 'Enregistrer les modifications' : 'Enregistrer la charge'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
