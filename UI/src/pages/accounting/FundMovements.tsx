import { useState, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Trash2, TrendingUp, TrendingDown, Scale, X,
    ArrowUpCircle, ArrowDownCircle, BookOpen, Loader2,
    Paperclip, FileText, Upload, Eye,
} from 'lucide-react';
import { useFundMovements, useCreateFundMovement, useDeleteFundMovement } from '../../api/fund-movements/hooks';
import { fundMovementsApi } from '../../api/fund-movements/api';
import type { FundMovement, JustificationFile } from '../../api/fund-movements/types';
import { useAuth } from '../../contexts/AuthContext';
import { useEmployees } from '../../api/employees/hooks';
import { toast } from 'sonner';

const SERVER_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') ?? '';

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-FR').format(Math.round(Number(n) || 0)) + ' FCFA';

const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
    }),
};

function getCeoName(m: FundMovement): string {
    const emp = m.ceoUser?.employee;
    if (emp) return `${emp.firstName} ${emp.lastName}`;
    return m.ceoUser?.email ?? '—';
}

function getCreatedByName(m: FundMovement): string {
    const emp = m.createdByUser?.employee;
    if (emp) return `${emp.firstName} ${emp.lastName}`;
    return m.createdByUser?.email ?? '—';
}

function FileChip({ file, onRemove }: { file: JustificationFile; onRemove?: () => void }) {
    const isPdf = file.filePath.toLowerCase().endsWith('.pdf') || file.originalName.toLowerCase().endsWith('.pdf');
    const url = file.filePath.startsWith('http') ? file.filePath : `${SERVER_BASE}${file.filePath}`;
    return (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 group">
            {isPdf
                ? <FileText size={14} className="text-[#283852] shrink-0" />
                : <img src={url} alt={file.originalName} className="w-6 h-6 rounded-md object-cover border border-gray-100 shrink-0" />
            }
            <span className="text-xs text-gray-700 truncate max-w-[140px]">{file.originalName}</span>
            <a href={url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#33cbcc] transition-colors shrink-0">
                <Eye size={12} />
            </a>
            {onRemove && (
                <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                    <X size={12} />
                </button>
            )}
        </div>
    );
}

function PendingFileChip({ file, onRemove }: { file: File; onRemove: () => void }) {
    const isPdf = file.type === 'application/pdf';
    const [preview, setPreview] = useState<string | null>(null);
    useMemo(() => {
        if (!isPdf) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [file, isPdf]);
    return (
        <div className="flex items-center gap-2 bg-[#33cbcc]/5 border border-[#33cbcc]/30 rounded-xl px-3 py-2">
            {isPdf
                ? <FileText size={14} className="text-[#33cbcc] shrink-0" />
                : preview && <img src={preview} alt={file.name} className="w-6 h-6 rounded-md object-cover shrink-0" />
            }
            <span className="text-xs text-gray-700 truncate max-w-[140px]">{file.name}</span>
            <button onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors shrink-0">
                <X size={12} />
            </button>
        </div>
    );
}

export default function FundMovements() {
    const { role, user } = useAuth();
    const isAccountant = role === 'ACCOUNTANT';

    const [filter, setFilter] = useState<'all' | 'APPORT' | 'RETRAIT'>('all');
    const [showModal, setShowModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files).filter(f =>
            ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(f.type),
        );
        if (files.length) setPendingFiles(prev => [...prev, ...files]);
    }, []);

    const { data, isLoading } = useFundMovements({
        type: filter === 'all' ? undefined : filter,
        limit: 100,
    });
    const createMutation = useCreateFundMovement();
    const deleteMutation = useDeleteFundMovement();

    // Fetch employees to populate CEO selector for accountants
    const { data: allEmployees = [] } = useEmployees();
    const ceos = useMemo(
        () => (allEmployees as any[]).filter((e) => e.user?.role === 'CEO'),
        [allEmployees],
    );

    const movements: FundMovement[] = data?.rows || [];
    const stats = data?.stats || { totalApport: 0, totalRetrait: 0, solde: 0, count: 0 };

    const [form, setForm] = useState({
        type: 'APPORT' as 'APPORT' | 'RETRAIT',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        ceoUserId: '',
    });

    const handleSubmit = async () => {
        if (!form.amount || !form.description || !form.date) {
            toast.error('Veuillez remplir tous les champs');
            return;
        }
        if (isAccountant && !form.ceoUserId) {
            toast.error('Veuillez sélectionner un CEO');
            return;
        }
        try {
            setIsUploading(true);
            const uploadedFiles: JustificationFile[] = [];
            for (const file of pendingFiles) {
                const fd = new FormData();
                fd.append('file', file);
                const result = await fundMovementsApi.uploadJustification(fd);
                uploadedFiles.push(result);
            }
            setIsUploading(false);
            await createMutation.mutateAsync({
                type: form.type,
                amount: Number(form.amount),
                description: form.description,
                date: form.date,
                ceoUserId: isAccountant ? form.ceoUserId : undefined,
                justificationFiles: uploadedFiles,
            });
            setShowModal(false);
            setPendingFiles([]);
            setForm({ type: 'APPORT', amount: '', description: '', date: new Date().toISOString().split('T')[0], ceoUserId: '' });
        } catch {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        await deleteMutation.mutateAsync(id);
        setConfirmDelete(null);
    };

    const soldePositive = Number(stats.solde) >= 0;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Compte Courant d'Associé</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Apports et retraits de fonds — Compte 461000
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Plus size={16} />
                    Nouveau mouvement
                </button>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    {
                        label: 'Total Apports',
                        value: stats.totalApport,
                        icon: TrendingUp,
                        color: 'text-[#33cbcc]',
                        bg: 'bg-[#33cbcc]/10',
                        border: 'border-[#33cbcc]/20',
                    },
                    {
                        label: 'Total Retraits',
                        value: stats.totalRetrait,
                        icon: TrendingDown,
                        color: 'text-[#283852]',
                        bg: 'bg-[#283852]/10',
                        border: 'border-[#283852]/20',
                    },
                    {
                        label: 'Solde Net (461000)',
                        value: Math.abs(Number(stats.solde)),
                        icon: Scale,
                        color: soldePositive ? 'text-[#33cbcc]' : 'text-red-500',
                        bg: soldePositive ? 'bg-[#33cbcc]/10' : 'bg-red-50',
                        border: soldePositive ? 'border-[#33cbcc]/20' : 'border-red-200',
                        prefix: soldePositive ? 'Créditeur' : 'Débiteur',
                    },
                ].map((card, i) => (
                    <motion.div
                        key={card.label}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        className={`bg-white rounded-2xl border ${card.border} shadow-md p-6`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-medium text-gray-500">{card.label}</p>
                            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                                <card.icon size={18} className={card.color} />
                            </div>
                        </div>
                        {'prefix' in card && card.prefix && (
                            <p className={`text-xs font-semibold mb-1 ${card.color}`}>{card.prefix}</p>
                        )}
                        <p className={`text-2xl font-bold ${card.color}`}>{fmt(card.value)}</p>
                    </motion.div>
                ))}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2">
                {(['all', 'APPORT', 'RETRAIT'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                            filter === f
                                ? 'bg-[#283852] text-white shadow-md'
                                : 'bg-white text-gray-600 border border-gray-200 hover:border-[#283852]/30'
                        }`}
                    >
                        {f === 'all' ? 'Tous' : f === 'APPORT' ? 'Apports' : 'Retraits'}
                        {f !== 'all' && (
                            <span
                                className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                    filter === f ? 'bg-white/20' : 'bg-gray-100'
                                }`}
                            >
                                {movements.filter((m) => m.type === f).length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Movements list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center py-16">
                        <Loader2 className="animate-spin text-[#33cbcc]" size={28} />
                    </div>
                ) : movements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Scale size={40} className="mb-3 opacity-30" />
                        <p className="text-sm font-medium">Aucun mouvement enregistré</p>
                        <p className="text-xs mt-1">Cliquez sur "Nouveau mouvement" pour commencer</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {/* Table header */}
                        <div
                            className={`grid gap-4 px-6 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider ${
                                isAccountant ? 'grid-cols-12' : 'grid-cols-10'
                            }`}
                        >
                            <div className="col-span-2">Date</div>
                            <div className="col-span-2">Type</div>
                            <div className="col-span-3">Description</div>
                            {isAccountant && <div className="col-span-2">CEO</div>}
                            <div className={`${isAccountant ? 'col-span-2' : 'col-span-2'} text-right`}>
                                Montant
                            </div>
                            <div className="col-span-1 text-right">Action</div>
                        </div>

                        <AnimatePresence>
                            {movements.map((m, i) => (
                                <motion.div
                                    key={m.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: i * 0.03 }}
                                    className={`grid gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors ${
                                        isAccountant ? 'grid-cols-12' : 'grid-cols-10'
                                    }`}
                                >
                                    <div className="col-span-2 text-sm text-gray-600">
                                        {new Date(m.date).toLocaleDateString('fr-FR')}
                                    </div>
                                    <div className="col-span-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                m.type === 'APPORT'
                                                    ? 'bg-[#33cbcc]/10 text-[#33cbcc]'
                                                    : 'bg-[#283852]/10 text-[#283852]'
                                            }`}
                                        >
                                            {m.type === 'APPORT' ? (
                                                <ArrowUpCircle size={11} />
                                            ) : (
                                                <ArrowDownCircle size={11} />
                                            )}
                                            {m.type === 'APPORT' ? 'Apport' : 'Retrait'}
                                        </span>
                                    </div>
                                    <div className="col-span-3">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {m.description}
                                        </p>
                                        {m.journalEntryRef && (
                                            <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                                <BookOpen size={9} />
                                                {m.journalEntryRef}
                                            </p>
                                        )}
                                        {m.justificationFiles?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {m.justificationFiles.map((f, fi) => (
                                                    <FileChip key={fi} file={f} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {isAccountant && (
                                        <div className="col-span-2 text-sm text-gray-600 truncate">
                                            {getCeoName(m)}
                                        </div>
                                    )}
                                    <div
                                        className={`${
                                            isAccountant ? 'col-span-2' : 'col-span-2'
                                        } text-right`}
                                    >
                                        <span
                                            className={`text-sm font-bold ${
                                                m.type === 'APPORT' ? 'text-[#33cbcc]' : 'text-[#283852]'
                                            }`}
                                        >
                                            {m.type === 'RETRAIT' ? '− ' : '+ '}
                                            {fmt(Number(m.amount))}
                                        </span>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        {confirmDelete === m.id ? (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleDelete(m.id)}
                                                    disabled={deleteMutation.isPending}
                                                    className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-lg font-semibold hover:bg-red-600 transition-colors"
                                                >
                                                    Oui
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete(null)}
                                                    className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                                >
                                                    Non
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmDelete(m.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Add Movement Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) { setShowModal(false); setPendingFiles([]); }
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">Nouveau mouvement</h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Compte courant d'associé 461000
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowModal(false); setPendingFiles([]); }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="space-y-5">
                                {/* Type toggle */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                                        Type de mouvement
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['APPORT', 'RETRAIT'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setForm((f) => ({ ...f, type: t }))}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                                    form.type === t
                                                        ? t === 'APPORT'
                                                            ? 'border-[#33cbcc] bg-[#33cbcc]/5 text-[#33cbcc]'
                                                            : 'border-[#283852] bg-[#283852]/5 text-[#283852]'
                                                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                                                }`}
                                            >
                                                {t === 'APPORT' ? (
                                                    <ArrowUpCircle size={24} />
                                                ) : (
                                                    <ArrowDownCircle size={24} />
                                                )}
                                                <span className="text-sm font-bold">
                                                    {t === 'APPORT' ? 'Apport' : 'Retrait'}
                                                </span>
                                                <span className="text-[10px] text-center opacity-70">
                                                    {t === 'APPORT' ? 'Entrée de fonds' : 'Sortie de fonds'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* CEO selector — accountant only */}
                                {isAccountant && (
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                            CEO concerné
                                        </label>
                                        <select
                                            value={form.ceoUserId}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, ceoUserId: e.target.value }))
                                            }
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                        >
                                            <option value="">Sélectionner un CEO</option>
                                            {ceos.map((emp: any) => (
                                                <option key={emp.user?.id || emp.id} value={emp.user?.id || emp.id}>
                                                    {emp.firstName} {emp.lastName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Amount */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                        Montant (FCFA)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={form.amount}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, amount: e.target.value }))
                                        }
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                    />
                                </div>

                                {/* Date */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, date: e.target.value }))
                                        }
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                        Description / Motif
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Apport de trésorerie Q1 2026"
                                        value={form.description}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, description: e.target.value }))
                                        }
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                                    />
                                </div>

                                {/* Justificatif upload */}
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                        Justificatif(s) <span className="text-gray-400 font-normal normal-case">(image, PDF)</span>
                                    </label>
                                    <div
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={handleFileDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[#33cbcc]/50 hover:bg-[#33cbcc]/5 transition-all"
                                    >
                                        <Upload size={20} className="text-gray-300" />
                                        <p className="text-xs text-gray-400">Glisser-déposer ou cliquer pour ajouter</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            accept="image/*,application/pdf"
                                            className="hidden"
                                            onChange={e => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length) setPendingFiles(prev => [...prev, ...files]);
                                                e.target.value = '';
                                            }}
                                        />
                                    </div>
                                    {pendingFiles.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {pendingFiles.map((f, i) => (
                                                <PendingFileChip
                                                    key={i}
                                                    file={f}
                                                    onRemove={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Accounting preview */}
                                {form.amount && Number(form.amount) > 0 && (
                                    <div
                                        className={`rounded-xl p-4 text-sm ${
                                            form.type === 'APPORT'
                                                ? 'bg-[#33cbcc]/5 border border-[#33cbcc]/20'
                                                : 'bg-[#283852]/5 border border-[#283852]/20'
                                        }`}
                                    >
                                        <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">
                                            Écriture comptable générée
                                        </p>
                                        {form.type === 'APPORT' ? (
                                            <>
                                                <p className="text-[#33cbcc] font-medium">
                                                    Débit 521000 Banque → {fmt(Number(form.amount))}
                                                </p>
                                                <p className="text-[#283852] font-medium">
                                                    Crédit 461000 Assoc. cpte courant → {fmt(Number(form.amount))}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[#283852] font-medium">
                                                    Débit 461000 Assoc. cpte courant → {fmt(Number(form.amount))}
                                                </p>
                                                <p className="text-[#33cbcc] font-medium">
                                                    Crédit 521000 Banque → {fmt(Number(form.amount))}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={createMutation.isPending || isUploading}
                                    className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2 ${
                                        form.type === 'APPORT'
                                            ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                            : 'bg-[#283852] hover:bg-[#1e2a3d] shadow-lg shadow-[#283852]/20'
                                    }`}
                                >
                                    {createMutation.isPending || isUploading ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : form.type === 'APPORT' ? (
                                        <ArrowUpCircle size={16} />
                                    ) : (
                                        <ArrowDownCircle size={16} />
                                    )}
                                    Enregistrer le {form.type === 'APPORT' ? 'apport' : 'retrait'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
