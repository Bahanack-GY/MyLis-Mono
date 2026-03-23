import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Upload,
    Download,
    Eye,
    Trash2,
    Search,
    Plus,
    X,
    HardDrive,
    Clock,
    FolderOpen,
    LayoutGrid,
    List,
    Building,
    Loader2
} from 'lucide-react';
import { useDocuments, useCreateDocument, useStorageInfo, useDeleteDocument } from '../api/documents/hooks';
import { DocumentsAdminSkeleton } from '../components/Skeleton';
import { documentsApi } from '../api/documents/api';
import { useEmployees } from '../api/employees/hooks';
import { useDepartmentScope } from '../contexts/AuthContext';
import {
    BarChart,
    Bar,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */

type DocCategory = 'Contract' | 'SRS' | 'Design' | 'Technical' | 'Notes' | 'Brief' | 'Planning' | 'Education' | 'Recruitment';

interface DocItem {
    id: string;
    dbId?: string; // real DB id for deletion (only for hr documents)
    name: string;
    type: DocCategory;
    size: string;
    sizeBytes: number;
    date: string;
    department: string;
    filePath?: string;
    uploader: {
        name: string;
        avatar: string;
    };
}

/* ─── Constants ─────────────────────────────────────────── */

const DOC_COLORS: Record<string, string> = {
    Contract: '#33cbcc',
    SRS: '#3b82f6',
    Design: '#8b5cf6',
    Technical: '#f59e0b',
    Notes: '#6b7280',
    Brief: '#ec4899',
    Planning: '#22c55e',
    Education: '#14b8a6',
    Recruitment: '#f97316',
};

const CATEGORIES: DocCategory[] = ['Contract', 'SRS', 'Design', 'Technical', 'Notes', 'Brief', 'Planning', 'Education', 'Recruitment'];

const DEPT_NAMES = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance'];

/* ─── Upload Document Modal ─────────────────────────────── */

const UploadDocumentModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createDocument = useCreateDocument();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [form, setForm] = useState({
        file: null as File | null,
        name: '',
        category: '' as DocCategory | '',
        department: '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
        else if (e.type === 'dragleave') setDragActive(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setForm(prev => ({ ...prev, file, name: file.name.replace(/\.[^/.]+$/, '') }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setForm(prev => ({ ...prev, file, name: file.name.replace(/\.[^/.]+$/, '') }));
    };

    const [isUploading, setIsUploading] = useState(false);
    const isValid = form.file !== null && form.name.trim().length > 0 && form.category !== '' && form.department !== '';

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Upload size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('documents.upload.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Drop zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                            dragActive
                                ? 'border-[#33cbcc] bg-[#33cbcc]/5'
                                : form.file
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-gray-200 hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5'
                        }`}
                    >
                        {form.file ? (
                            <div className="flex items-center justify-center gap-3">
                                <FileText size={24} className="text-emerald-500" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-800">{form.file.name}</p>
                                    <p className="text-xs text-gray-400">{t('documents.upload.fileSelected')} — {(form.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null, name: '' })); }}
                                    className="text-xs text-rose-500 hover:text-rose-600 font-medium ml-2"
                                >
                                    {t('documents.upload.removeFile')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload size={32} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm font-medium text-gray-600">{t('documents.upload.dropzone')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('documents.upload.dropzoneSub')}</p>
                                <p className="text-[10px] text-gray-300 mt-3">{t('documents.upload.formats')}</p>
                            </>
                        )}
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                    </div>

                    {/* File Name */}
                    <div>
                        <label className={labelCls}>
                            <FileText size={12} />
                            {t('documents.upload.fileName')}
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('documents.upload.fileNamePlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelCls}>
                            <FolderOpen size={12} />
                            {t('documents.upload.category')}
                        </label>
                        <select
                            value={form.category}
                            onChange={e => setForm(prev => ({ ...prev, category: e.target.value as DocCategory }))}
                            className={selectCls}
                        >
                            <option value="">{t('documents.upload.categoryPlaceholder')}</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{t(`documents.categories.${cat.toLowerCase()}`)}</option>
                            ))}
                        </select>
                    </div>

                    {/* Department */}
                    <div>
                        <label className={labelCls}>
                            <Building size={12} />
                            {t('documents.upload.department')}
                        </label>
                        <select
                            value={form.department}
                            onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                            className={selectCls}
                        >
                            <option value="">{t('documents.upload.departmentPlaceholder')}</option>
                            {DEPT_NAMES.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('documents.upload.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createDocument.isPending || isUploading}
                        onClick={async () => {
                            if (!isValid || !form.file) return;
                            setIsUploading(true);
                            try {
                                const CATEGORY_MAP: Record<string, 'CONTRACT' | 'ID' | 'DIPLOMA' | 'OTHER'> = {
                                    Contract: 'CONTRACT', SRS: 'OTHER', Design: 'OTHER',
                                    Technical: 'OTHER', Notes: 'OTHER', Brief: 'OTHER', Planning: 'OTHER',
                                    Education: 'DIPLOMA', Recruitment: 'OTHER',
                                };
                                const FOLDER_MAP: Record<string, string> = {
                                    Education: 'formation', Recruitment: 'recruitment', Contract: 'contracts',
                                };
                                const folder = form.category ? FOLDER_MAP[form.category] || 'general' : 'general';
                                const uploadResult = await documentsApi.uploadFile(form.file, folder);
                                createDocument.mutate({
                                    name: form.name,
                                    filePath: uploadResult.filePath,
                                    fileType: uploadResult.fileType,
                                    category: form.category ? CATEGORY_MAP[form.category] || 'OTHER' : 'OTHER',
                                }, {
                                    onSuccess: () => onClose(),
                                    onSettled: () => setIsUploading(false),
                                });
                            } catch (error) {
                                console.error('Failed to upload document:', error);
                                setIsUploading(false);
                            }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid && !isUploading
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {(createDocument.isPending || isUploading) ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('documents.upload.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Documents = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<DocCategory | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showUploadModal, setShowUploadModal] = useState(false);

    // API data
    const { data: apiDocuments, isLoading: isLoadingDocs } = useDocuments();
    const deleteDocument = useDeleteDocument();
    const deptScope = useDepartmentScope();
    const { data: employees, isLoading: isLoadingEmployees } = useEmployees(deptScope);
    const { data: storageInfo } = useStorageInfo();

    const getFileUrl = (filePath: string) => {
        const uploadsIndex = filePath.indexOf('uploads/');
        if (uploadsIndex === -1) return filePath;
        const relativePath = filePath.substring(uploadsIndex);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        return `${apiUrl}/${relativePath}`;
    };

    // Map API documents to display shape
    const CATEGORY_DISPLAY_MAP: Record<string, DocCategory> = {
        'CONTRACT': 'Contract', 'ID': 'Notes', 'DIPLOMA': 'SRS', 'OTHER': 'Technical',
    };
    const hrDocuments: DocItem[] = (apiDocuments || []).map((d) => ({
        id: `doc-${d.id}`,
        dbId: d.id,
        name: d.name,
        type: CATEGORY_DISPLAY_MAP[d.category] || 'Technical',
        size: '',
        sizeBytes: 0,
        date: '',
        department: '',
        filePath: d.filePath || undefined,
        uploader: d.uploadedBy
            ? { name: d.uploadedBy.email, avatar: '' }
            : { name: '', avatar: '' },
    }));

    // Extract education & recruitment docs from all employees
    const employeeDocs: DocItem[] = (employees || []).flatMap((emp) => {
        const empName = `${emp.firstName} ${emp.lastName}`;
        const eduDocs: DocItem[] = (emp.educationDocs || []).map((doc, i) => ({
            id: `edu-${emp.id}-${i}`,
            name: doc.name,
            type: 'Education' as DocCategory,
            size: '',
            sizeBytes: 0,
            date: emp.hireDate || '',
            department: emp.department?.name || '',
            filePath: doc.filePath || undefined,
            uploader: { name: empName, avatar: emp.avatarUrl || '' },
        }));
        const recDocs: DocItem[] = (emp.recruitmentDocs || []).map((doc, i) => ({
            id: `rec-${emp.id}-${i}`,
            name: doc.name,
            type: 'Recruitment' as DocCategory,
            size: '',
            sizeBytes: 0,
            date: emp.hireDate || '',
            department: emp.department?.name || '',
            filePath: doc.filePath || undefined,
            uploader: { name: empName, avatar: emp.avatarUrl || '' },
        }));
        return [...eduDocs, ...recDocs];
    });

    const documents: DocItem[] = [...hrDocuments, ...employeeDocs];

    const isLoading = isLoadingDocs || isLoadingEmployees;

    /* Upload activity data — group documents by month */
    const uploadActivityData = useMemo(() => {
        const counts: Record<string, number> = {};
        documents.forEach(doc => {
            if (!doc.date) return;
            const d = new Date(doc.date);
            if (isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            counts[key] = (counts[key] || 0) + 1;
        });
        // Fill last 6 months so the chart always has points
        const months: { month: string; uploads: number }[] = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
            months.push({ month: label, uploads: counts[key] || 0 });
        }
        return months;
    }, [documents]);

    if (isLoading) {
        return <DocumentsAdminSkeleton />;
    }

    /* Filtered documents */
    const filteredDocs = documents.filter(doc => {
        const matchesSearch =
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.uploader.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || doc.type === filterCategory;
        return matchesSearch && matchesCategory;
    });

    /* Stats */
    const totalStorageBytes = storageInfo?.totalBytes ?? 0;
    const storageUsed = totalStorageBytes > 1024 * 1024 * 1024
        ? `${(totalStorageBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
        : totalStorageBytes > 1024 * 1024
            ? `${(totalStorageBytes / (1024 * 1024)).toFixed(1)} MB`
            : `${(totalStorageBytes / 1024).toFixed(1)} KB`;
    const recentDocs = documents.filter(d => {
        if (!d.date) return false;
        const diff = Date.now() - new Date(d.date).getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
    }).length;
    const categoriesCount = new Set(documents.map(d => d.type)).size;

    const stats = [
        { label: t('documents.stats.total'), value: documents.length, icon: FileText, color: '#33cbcc' },
        { label: t('documents.stats.storage'), value: storageUsed, icon: HardDrive, color: '#3b82f6' },
        { label: t('documents.stats.recent'), value: recentDocs, icon: Clock, color: '#8b5cf6' },
        { label: t('documents.stats.categories'), value: categoriesCount, icon: FolderOpen, color: '#f59e0b' },
    ];

    /* Chart data */
    const categoryChartData = CATEGORIES.map(cat => ({
        name: t(`documents.categories.${cat.toLowerCase()}`),
        count: documents.filter(d => d.type === cat).length,
        color: DOC_COLORS[cat],
    }));

    /* Category filters */
    const categoryFilters: { key: DocCategory | 'all'; label: string }[] = [
        { key: 'all', label: t('documents.filterAll') },
        ...CATEGORIES.map(cat => ({ key: cat as DocCategory, label: t(`documents.categories.${cat.toLowerCase()}`) })),
    ];

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('documents.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('documents.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <Upload size={16} />
                    {t('documents.uploadDocument')}
                </button>
            </div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-3xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Documents by Category — BarChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('documents.charts.byCategory')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryChartData} barSize={36}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                    {categoryChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Upload Activity — AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('documents.charts.uploadActivity')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={uploadActivityData}>
                                <defs>
                                    <linearGradient id="colorDocUploads" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="uploads" stroke="#33cbcc" strokeWidth={2} fill="url(#colorDocUploads)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>

            {/* ── Search + View Toggle ── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('documents.searchPlaceholder')}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                    />
                </div>

                <div className="flex bg-white rounded-xl border border-gray-100 p-1">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <LayoutGrid size={18} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <List size={18} />
                    </button>
                </div>
            </div>

            {/* ── Category Filters ── */}
            <div className="flex gap-2 flex-wrap">
                {categoryFilters.map(cf => (
                    <button
                        key={cf.key}
                        onClick={() => setFilterCategory(cf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterCategory === cf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {cf.key !== 'all' && (
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: filterCategory === cf.key ? '#fff' : DOC_COLORS[cf.key] }}
                            />
                        )}
                        {cf.label}
                    </button>
                ))}
            </div>

            {/* ── Grid View ── */}
            {viewMode === 'grid' && filteredDocs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="bg-white rounded-3xl p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all"
                        >
                            {/* Icon + Actions */}
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                                    style={{ backgroundColor: `${DOC_COLORS[doc.type]}15` }}
                                >
                                    <FileText size={22} style={{ color: DOC_COLORS[doc.type] }} />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {doc.filePath ? (
                                        <>
                                            <a href={getFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                                <Eye size={16} />
                                            </a>
                                            <a href={getFileUrl(doc.filePath)} download className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                                <Download size={16} />
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-300 cursor-not-allowed transition-colors" disabled>
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-300 cursor-not-allowed transition-colors" disabled>
                                                <Download size={16} />
                                            </button>
                                        </>
                                    )}
                                    {doc.dbId && (
                                        <button
                                            onClick={() => { if (window.confirm('Delete this document?')) deleteDocument.mutate(doc.dbId!); }}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <h3 className="font-medium text-gray-800 text-sm truncate mb-2">{doc.name}</h3>

                            {/* Type + Size + Date */}
                            <div className="flex items-center gap-2 flex-wrap mb-4">
                                <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${DOC_COLORS[doc.type]}15`, color: DOC_COLORS[doc.type] }}
                                >
                                    {t(`documents.categories.${doc.type.toLowerCase()}`)}
                                </span>
                                <span className="text-xs text-gray-400">{doc.size}</span>
                                <span className="text-xs text-gray-300">|</span>
                                <span className="text-xs text-gray-400">{doc.date}</span>
                            </div>

                            {/* Department + Uploader */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <Building size={12} />
                                    <span>{doc.department}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {doc.uploader.avatar ? (
                                        <img src={doc.uploader.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100" />
                                    )}
                                    <span className="text-xs text-gray-500">{doc.uploader.name ? doc.uploader.name.split(' ')[0] : ''}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── List View ── */}
            {viewMode === 'list' && filteredDocs.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-4">{t('documents.table.name')}</div>
                        <div className="col-span-1">{t('documents.table.type')}</div>
                        <div className="col-span-1">{t('documents.table.size')}</div>
                        <div className="col-span-2">{t('documents.table.department')}</div>
                        <div className="col-span-2">{t('documents.table.uploader')}</div>
                        <div className="col-span-1">{t('documents.table.date')}</div>
                        <div className="col-span-1">{t('documents.table.actions')}</div>
                    </div>
                    {/* Rows */}
                    {filteredDocs.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors"
                        >
                            {/* Name with icon */}
                            <div className="col-span-4 flex items-center gap-3 min-w-0">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${DOC_COLORS[doc.type]}15` }}
                                >
                                    <FileText size={16} style={{ color: DOC_COLORS[doc.type] }} />
                                </div>
                                <span className="text-sm font-medium text-gray-800 truncate">{doc.name}</span>
                            </div>
                            {/* Type badge */}
                            <div className="col-span-1">
                                <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${DOC_COLORS[doc.type]}15`, color: DOC_COLORS[doc.type] }}
                                >
                                    {t(`documents.categories.${doc.type.toLowerCase()}`)}
                                </span>
                            </div>
                            {/* Size */}
                            <div className="col-span-1 text-xs text-gray-500">{doc.size}</div>
                            {/* Department */}
                            <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-500">
                                <Building size={12} />
                                <span>{doc.department}</span>
                            </div>
                            {/* Uploader */}
                            <div className="col-span-2 flex items-center gap-2">
                                {doc.uploader.avatar ? (
                                    <img src={doc.uploader.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100" />
                                )}
                                <span className="text-xs text-gray-500 truncate">{doc.uploader.name}</span>
                            </div>
                            {/* Date */}
                            <div className="col-span-1 text-xs text-gray-400">{doc.date}</div>
                            {/* Actions */}
                            <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {doc.filePath ? (
                                    <>
                                        <a href={getFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                            <Eye size={14} />
                                        </a>
                                        <a href={getFileUrl(doc.filePath)} download className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                            <Download size={14} />
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                            <Eye size={14} />
                                        </button>
                                        <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                            <Download size={14} />
                                        </button>
                                    </>
                                )}
                                {doc.dbId && (
                                    <button
                                        onClick={() => { if (window.confirm('Delete this document?')) deleteDocument.mutate(doc.dbId!); }}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredDocs.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('documents.noResults')}</p>
                </div>
            )}

            {/* ── Upload Modal ── */}
            <AnimatePresence>
                {showUploadModal && (
                    <UploadDocumentModal onClose={() => setShowUploadModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Documents;
