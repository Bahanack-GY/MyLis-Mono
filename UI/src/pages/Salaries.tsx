import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Pencil, Check, X, Banknote, ChevronDown, CreditCard, HandCoins } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSalaries, useUpdateSalary, usePayBulk, usePayOne, usePayAdvance } from '../api/salary/hooks';
import type { SalaryEmployee } from '../api/salary/types';

/* ─── Month/Year Picker Modal ─────────────────────────────── */
const PayOneModal = ({ emp, onClose }: { emp: SalaryEmployee; onClose: () => void }) => {
    const { t } = useTranslation();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const payOne = usePayOne();
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CreditCard size={18} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{t('salaries.payOne.title')}</h3>
                        <p className="text-xs text-gray-500">{emp.firstName} {emp.lastName} · {emp.salary.toLocaleString()} FCFA</p>
                    </div>
                </div>
                <div className="space-y-3 mb-5">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.payOne.month')}</label>
                        <div className="relative">
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]">
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i + 1}>{t(`salaries.months.${i + 1}`)}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.payOne.year')}</label>
                        <div className="relative">
                            <select value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('salaries.payOne.cancel')}</button>
                    <button
                        onClick={() => payOne.mutate({ id: emp.id, month, year }, { onSuccess: () => onClose() })}
                        disabled={payOne.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-60"
                    >
                        {payOne.isPending ? t('salaries.payOne.processing') : t('salaries.payOne.pay')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Advance Modal ───────────────────────────────────────── */
const AdvanceModal = ({ emp, onClose }: { emp: SalaryEmployee; onClose: () => void }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const payAdvance = usePayAdvance();
    const isValid = parseFloat(amount) > 0;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <HandCoins size={18} className="text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{t('salaries.advance.title')}</h3>
                        <p className="text-xs text-gray-500">{emp.firstName} {emp.lastName}</p>
                    </div>
                </div>
                <div className="space-y-3 mb-5">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.advance.amount')}</label>
                        <input
                            type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
                            placeholder="0" autoFocus
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                        />
                        {emp.salary > 0 && (
                            <p className="text-xs text-gray-400 mt-1">{t('salaries.advance.monthlySalary', { amount: emp.salary.toLocaleString() })}</p>
                        )}
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.advance.note')}</label>
                        <input
                            type="text" value={note} onChange={e => setNote(e.target.value)}
                            placeholder={t('salaries.advance.notePlaceholder')}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('salaries.advance.cancel')}</button>
                    <button
                        onClick={() => payAdvance.mutate({ id: emp.id, amount: parseFloat(amount), note: note || undefined }, { onSuccess: () => onClose() })}
                        disabled={!isValid || payAdvance.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-60"
                    >
                        {payAdvance.isPending ? t('salaries.advance.processing') : t('salaries.advance.payAdvance')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Bulk Pay Modal ──────────────────────────────────────── */
const BulkPayModal = ({ onClose, totalAmount, employeeCount }: {
    onClose: () => void; totalAmount: number; employeeCount: number;
}) => {
    const { t } = useTranslation();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const payBulk = usePayBulk();
    const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Banknote size={20} className="text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{t('salaries.bulkPay.title')}</h3>
                        <p className="text-xs text-gray-500">{t('salaries.bulkPay.subtitle', { count: employeeCount, total: totalAmount.toLocaleString() })}</p>
                    </div>
                </div>
                <div className="space-y-3 mb-5">
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.bulkPay.month')}</label>
                        <div className="relative">
                            <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]">
                                {Array.from({ length: 12 }, (_, i) => (
                                    <option key={i} value={i + 1}>{t(`salaries.months.${i + 1}`)}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">{t('salaries.bulkPay.year')}</label>
                        <div className="relative">
                            <select value={year} onChange={e => setYear(Number(e.target.value))}
                                className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mb-5 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    {t('salaries.bulkPay.warning', { month: t(`salaries.months.${month}`), year })}
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">{t('salaries.bulkPay.cancel')}</button>
                    <button
                        onClick={() => payBulk.mutate({ month, year }, { onSuccess: () => onClose() })}
                        disabled={payBulk.isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors disabled:opacity-60"
                    >
                        {payBulk.isPending ? t('salaries.bulkPay.processing') : t('salaries.bulkPay.confirm')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Salary Row ──────────────────────────────────────────── */
const SalaryRow = ({ emp }: { emp: SalaryEmployee }) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(String(emp.salary));
    const [showPayModal, setShowPayModal] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const updateSalary = useUpdateSalary();

    const save = () => {
        const salary = parseFloat(value);
        if (isNaN(salary) || salary < 0) return;
        updateSalary.mutate({ id: emp.id, salary }, { onSuccess: () => setEditing(false) });
    };

    const cancel = () => { setValue(String(emp.salary)); setEditing(false); };

    return (
        <>
            <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors group">
                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#33cbcc]/20 flex items-center justify-center text-sm font-bold text-[#33cbcc]">
                            {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{emp.firstName} {emp.lastName}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{emp.departmentName || '—'}</td>
                <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        emp.role === 'MANAGER' ? 'bg-purple-100 text-purple-700' :
                        emp.role === 'ACCOUNTANT' ? 'bg-blue-100 text-blue-700' :
                        emp.role === 'HEAD_OF_DEPARTMENT' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                        {t(`salaries.roles.${emp.role}`, { defaultValue: emp.role })}
                    </span>
                </td>
                <td className="px-6 py-4">
                    {editing ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="number" min="0" value={value} onChange={e => setValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
                                autoFocus
                                className="w-36 px-3 py-1.5 text-sm border border-[#33cbcc] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30"
                            />
                            <button onClick={save} disabled={updateSalary.isPending} className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
                                <Check size={14} />
                            </button>
                            <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/sal">
                            <span className="font-semibold text-gray-800">
                                {emp.salary > 0 ? emp.salary.toLocaleString() + ' FCFA' : <span className="text-gray-400 font-normal">{t('salaries.notSet')}</span>}
                            </span>
                            <button onClick={() => setEditing(true)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-[#33cbcc]/10 opacity-0 group-hover/sal:opacity-100 transition-all">
                                <Pencil size={13} />
                            </button>
                        </div>
                    )}
                </td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setShowPayModal(true)}
                            disabled={emp.salary === 0}
                            title={t('salaries.row.pay')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-500 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <CreditCard size={13} />
                            {t('salaries.row.pay')}
                        </button>
                        <button
                            onClick={() => setShowAdvanceModal(true)}
                            title={t('salaries.row.advance')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
                        >
                            <HandCoins size={13} />
                            {t('salaries.row.advance')}
                        </button>
                    </div>
                </td>
            </tr>

            <AnimatePresence>
                {showPayModal && <PayOneModal emp={emp} onClose={() => setShowPayModal(false)} />}
                {showAdvanceModal && <AdvanceModal emp={emp} onClose={() => setShowAdvanceModal(false)} />}
            </AnimatePresence>
        </>
    );
};

/* ─── Main Page ───────────────────────────────────────────── */
const Salaries = () => {
    const { t } = useTranslation();
    const { data: employees = [], isLoading } = useSalaries();
    const [search, setSearch] = useState('');
    const [showBulkModal, setShowBulkModal] = useState(false);

    const filtered = employees.filter(e => {
        const q = search.toLowerCase();
        return (
            e.firstName.toLowerCase().includes(q) ||
            e.lastName.toLowerCase().includes(q) ||
            e.departmentName.toLowerCase().includes(q)
        );
    });

    const totalSalaries = employees.reduce((s, e) => s + (e.salary || 0), 0);
    const withSalary = employees.filter(e => e.salary > 0).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{t('sidebar.salaries')}</h1>
                    <p className="text-sm text-gray-500 mt-0.5">{t('salaries.pageSubtitle', { count: employees.length, withSalary })}</p>
                </div>
                <button
                    onClick={() => setShowBulkModal(true)}
                    disabled={withSalary === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-green-500 hover:bg-green-600 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Banknote size={16} />
                    {t('salaries.payAll')}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('salaries.totalMonthly')}</p>
                    <p className="text-2xl font-bold text-gray-800">{totalSalaries.toLocaleString()} <span className="text-sm font-normal text-gray-400">FCFA</span></p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('salaries.employees')}</p>
                    <p className="text-2xl font-bold text-gray-800">{employees.length}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{t('salaries.averageSalary')}</p>
                    <p className="text-2xl font-bold text-gray-800">
                        {withSalary > 0 ? Math.round(totalSalaries / withSalary).toLocaleString() : '—'} <span className="text-sm font-normal text-gray-400">FCFA</span>
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">{t('salaries.employeeSalaries')}</h2>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text" value={search} onChange={e => setSearch(e.target.value)}
                            placeholder={t('salaries.search')}
                            className="pl-8 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] w-56"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-400 text-sm">{t('salaries.loading')}</div>
                ) : filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">{t('salaries.noEmployees')}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                                    <th className="px-6 py-3">{t('salaries.columns.employee')}</th>
                                    <th className="px-6 py-3">{t('salaries.columns.department')}</th>
                                    <th className="px-6 py-3">{t('salaries.columns.role')}</th>
                                    <th className="px-6 py-3">{t('salaries.columns.monthlySalary')}</th>
                                    <th className="px-6 py-3">{t('salaries.columns.actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(emp => <SalaryRow key={emp.id} emp={emp} />)}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showBulkModal && (
                    <BulkPayModal
                        onClose={() => setShowBulkModal(false)}
                        totalAmount={totalSalaries}
                        employeeCount={withSalary}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Salaries;
