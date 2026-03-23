import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useCreateExpense, useUpdateExpense } from '../api/expenses/hooks';
import type { CreateExpenseDto, Expense } from '../api/expenses/types';

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | null;
}

const CATEGORIES = ['Loyer', 'Salaire', 'Facture', 'Fourniture', 'Licence/Logiciel', 'Demande', 'Autre'];

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
    const createExpense = useCreateExpense();
    const updateExpense = useUpdateExpense();
    const isEditing = !!expense;

    const [formData, setFormData] = useState<CreateExpenseDto>({
        title: '',
        amount: 0,
        category: CATEGORIES[0],
        type: 'ONE_TIME',
        frequency: null,
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        if (isOpen) {
            if (expense) {
                setFormData({
                    title: expense.title,
                    amount: Number(expense.amount),
                    category: expense.category,
                    type: expense.type,
                    frequency: expense.type === 'RECURRENT' ? expense.frequency : null,
                    date: expense.date,
                });
            } else {
                setFormData({
                    title: '',
                    amount: 0,
                    category: CATEGORIES[0],
                    type: 'ONE_TIME',
                    frequency: null,
                    date: new Date().toISOString().split('T')[0],
                });
            }
        }
    }, [isOpen, expense]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: name === 'amount' ? Number(value) : value };
            // Reset frequency when switching to ONE_TIME
            if (name === 'type' && value === 'ONE_TIME') {
                next.frequency = null;
            }
            if (name === 'type' && value === 'RECURRENT' && !prev.frequency) {
                next.frequency = 'MONTHLY';
            }
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateExpense.mutateAsync({ id: expense!.id, data: formData });
            } else {
                await createExpense.mutateAsync(formData);
            }
            onClose();
        } catch (error) {
            console.error('Failed to save expense:', error);
        }
    };

    const isPending = createExpense.isPending || updateExpense.isPending;

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
                                {isEditing ? 'Modifier la Dépense' : 'Nouvelle Dépense'}
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl transition-colors"
                            >
                                <X size={20} />
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc] transition-colors outline-none text-gray-800 text-sm"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de dépense</label>
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
                                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[#33cbcc] to-[#2bb5b6] hover:from-[#2bb5b6] hover:to-[#2bb5b6] rounded-xl transition-all shadow-md shadow-[#33cbcc]/20 hover:shadow-lg disabled:opacity-50"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin inset-0 m-auto" />
                                ) : (
                                    isEditing ? 'Enregistrer les modifications' : 'Enregistrer la dépense'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
