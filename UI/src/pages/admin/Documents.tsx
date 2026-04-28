import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { File01Icon, Upload01Icon, Download01Icon, ViewIcon, Delete02Icon, Search01Icon, Add01Icon, Cancel01Icon, HardDriveIcon, Clock01Icon, FolderOpenIcon, DashboardSquare01Icon, ListViewIcon, Building01Icon, Loading02Icon, BarChartIcon } from 'hugeicons-react';
import { useDocuments, useCreateDocument, useStorageInfo, useDeleteDocument } from '../../api/documents/hooks';
import { DocumentsAdminSkeleton } from '../../components/Skeleton';
import { documentsApi } from '../../api/documents/api';
import { useEmployees } from '../../api/employees/hooks';
import { useDepartments } from '../../api/departments/hooks';
import { useDepartmentScope, useAuth } from '../../contexts/AuthContext';
import Folder from '../../components/Folder';
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
    SRS: '#33cbcc',
    Design: '#283852',
    Technical: '#283852',
    Notes: '#6b7280',
    Brief: '#6b7280',
    Planning: '#283852',
    Education: '#283852',
    Recruitment: '#33cbcc',
};

const CATEGORIES: DocCategory[] = ['Contract', 'SRS', 'Design', 'Technical', 'Notes', 'Brief', 'Planning', 'Education', 'Recruitment'];

const DEPT_NAMES = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance'];

/* ─── Upload01Icon Document Modal ─────────────────────────────── */

const UploadDocumentModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createDocument = useCreateDocument();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [form, setForm] = useState({
        file: null as File | null,
        name: '',
        category: '' as DocCategory | '',
        visibilityType: 'EVERYONE' as 'EVERYONE' | 'DEPARTMENTS' | 'EMPLOYEES' | 'MANAGERS_ONLY',
        allowedDepartmentIds: [] as string[],
        allowedEmployeeIds: [] as string[],
    });

    const { data: departments = [] } = useDepartments();
    const { data: employees = [] } = useEmployees();

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
    const isValid = form.file !== null && form.name.trim().length > 0 && form.category !== '';

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
                            <Upload01Icon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('documents.upload.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
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
                                    ? 'border-[#33cbcc] bg-[#33cbcc]/10'
                                    : 'border-gray-200 hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5'
                        }`}
                    >
                        {form.file ? (
                            <div className="flex items-center justify-center gap-3">
                                <File01Icon size={24} className="text-[#33cbcc]" />
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-800">{form.file.name}</p>
                                    <p className="text-xs text-gray-400">{t('documents.upload.fileSelected')} — {(form.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null, name: '' })); }}
                                    className="text-xs text-[#283852] hover:text-[#283852]/70 font-medium ml-2"
                                >
                                    {t('documents.upload.removeFile')}
                                </button>
                            </div>
                        ) : (
                            <>
                                <Upload01Icon size={32} className="mx-auto text-gray-300 mb-3" />
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
                            <File01Icon size={12} />
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
                            <FolderOpenIcon size={12} />
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

                    {/* Visibility Settings */}
                    <div className="bg-[#283852]/10 rounded-xl p-4 space-y-4">
                        <label className="text-xs font-bold text-[#283852] uppercase tracking-wider">
                            {t('documents.visibility.title')}
                        </label>

                        <select
                            value={form.visibilityType}
                            onChange={e => setForm(prev => ({
                                ...prev,
                                visibilityType: e.target.value as any,
                                allowedDepartmentIds: [],
                                allowedEmployeeIds: []
                            }))}
                            className={selectCls}
                        >
                            <option value="EVERYONE">{t('documents.visibility.everyone')}</option>
                            <option value="DEPARTMENTS">{t('documents.visibility.departments')}</option>
                            <option value="EMPLOYEES">{t('documents.visibility.employees')}</option>
                            <option value="MANAGERS_ONLY">{t('documents.visibility.managersOnly')}</option>
                        </select>

                        {form.visibilityType === 'DEPARTMENTS' && (
                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 mb-1.5 block">
                                    {t('documents.visibility.selectDepartments')}
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {departments.map(dept => (
                                        <label key={dept.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.allowedDepartmentIds.includes(dept.id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        allowedDepartmentIds: checked
                                                            ? [...prev.allowedDepartmentIds, dept.id]
                                                            : prev.allowedDepartmentIds.filter(id => id !== dept.id)
                                                    }));
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-gray-700">{dept.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.visibilityType === 'EMPLOYEES' && (
                            <div>
                                <label className="text-[10px] font-semibold text-gray-600 mb-1.5 block">
                                    {t('documents.visibility.selectEmployees')}
                                </label>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {employees.map(emp => (
                                        <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.allowedEmployeeIds.includes(emp.id)}
                                                onChange={e => {
                                                    const checked = e.target.checked;
                                                    setForm(prev => ({
                                                        ...prev,
                                                        allowedEmployeeIds: checked
                                                            ? [...prev.allowedEmployeeIds, emp.id]
                                                            : prev.allowedEmployeeIds.filter(id => id !== emp.id)
                                                    }));
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-gray-700">{emp.firstName} {emp.lastName}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {form.visibilityType === 'MANAGERS_ONLY' && (
                            <p className="text-xs text-gray-600 italic">
                                {t('documents.visibility.managersOnlyDesc')}
                            </p>
                        )}
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
                                    visibilityType: form.visibilityType,
                                    allowedDepartmentIds: form.allowedDepartmentIds,
                                    allowedEmployeeIds: form.allowedEmployeeIds,
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
                        {(createDocument.isPending || isUploading) ? <Loading02Icon size={16} className="animate-spin" /> : <Add01Icon size={16} />}
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
    const { role } = useAuth();
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
    const [categorySearchQuery, setCategorySearchQuery] = useState('');
    const [clickedFolder, setClickedFolder] = useState<DocCategory | null>(null);

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
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3025';
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

    /* Upload01Icon activity data — group documents by month */
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
        { label: t('documents.stats.total'), value: documents.length, icon: File01Icon, color: '#33cbcc' },
        { label: t('documents.stats.storage'), value: storageUsed, icon: HardDriveIcon, color: '#283852' },
        { label: t('documents.stats.recent'), value: recentDocs, icon: Clock01Icon, color: '#283852' },
        { label: t('documents.stats.categories'), value: categoriesCount, icon: FolderOpenIcon, color: '#283852' },
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
                <div className="flex items-center gap-3">
                    {role !== 'EMPLOYEE' && role !== 'COMMERCIAL' && (
                        <button
                            onClick={() => setShowStats(!showStats)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                showStats
                                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            <BarChartIcon size={16} />
                            {showStats ? 'Hide Stats' : 'Show Stats'}
                        </button>
                    )}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                    >
                        <Upload01Icon size={16} />
                        {t('documents.uploadDocument')}
                    </button>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            {showStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="border border-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                        >
                            <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                                <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
                            </div>
                            <div className="p-5 bg-white relative overflow-hidden">
                                <h2 className="text-3xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                    <stat.icon size={110} strokeWidth={1.2} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* ── Charts ── */}
            {showStats && (
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
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
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

                {/* Upload01Icon Activity — AreaChart */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100"
                >
                    <h3 className="text-lg font-bold text-gray-800 mb-6">{t('documents.charts.uploadActivity')}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
            )}

            {/* ── Category Folders Grid ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
                {CATEGORIES.map((category, i) => {
                    const categoryDocs = documents.filter(d => d.type === category);
                    const isOpen = clickedFolder === category;

                    const handleFolderClick = () => {
                        setClickedFolder(category);
                        // Small delay to show the folder opening animation before modal appears
                        setTimeout(() => {
                            setSelectedCategory(category);
                        }, 300);
                    };

                    return (
                        <motion.div
                            key={category}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="flex flex-col items-center cursor-pointer"
                            onClick={handleFolderClick}
                        >
                            <Folder color="#33cbcc" size={1.2} onClick={handleFolderClick} isOpen={isOpen} />
                            <div className="w-full mt-4 space-y-2">
                                <h3 className="font-semibold text-gray-800 text-sm text-center">
                                    {t(`documents.categories.${category.toLowerCase()}`)}
                                </h3>
                                <p className="text-xs text-gray-500 text-center">
                                    {categoryDocs.length} {categoryDocs.length === 1 ? t('documents.document') : t('documents.documents')}
                                </p>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Category Documents Modal ── */}
            <AnimatePresence>
                {selectedCategory && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            setSelectedCategory(null);
                            setTimeout(() => setClickedFolder(null), 300);
                        }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.3, y: 100 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.3, y: 100 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                                        <FolderOpenIcon size={20} className="text-[#33cbcc]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">
                                            {t(`documents.categories.${selectedCategory.toLowerCase()}`)}
                                        </h2>
                                        <p className="text-xs text-gray-500">
                                            {documents.filter(d => d.type === selectedCategory).length} {t('documents.documents')}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedCategory(null);
                                        setTimeout(() => setClickedFolder(null), 300);
                                    }}
                                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <Cancel01Icon size={18} />
                                </button>
                            </div>

                            {/* Search01Icon Bar */}
                            <div className="px-6 py-4 border-b border-gray-100 shrink-0">
                                <div className="relative">
                                    <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder={t('documents.searchPlaceholder')}
                                        value={categorySearchQuery}
                                        onChange={e => setCategorySearchQuery(e.target.value)}
                                        className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-xl py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Documents ListViewIcon */}
                            <div className="flex-1 overflow-y-auto px-6 py-4">
                                {(() => {
                                    const categoryDocs = documents.filter(d =>
                                        d.type === selectedCategory &&
                                        (categorySearchQuery === '' || d.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                    );

                                    if (categoryDocs.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <File01Icon size={48} className="text-gray-300 mb-4" />
                                                <p className="text-gray-400 font-medium">
                                                    {categorySearchQuery ? t('documents.noResults') : t('documents.noDocuments')}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-2">
                                            {categoryDocs.map((doc, i) => (
                                                <motion.div
                                                    key={doc.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: i * 0.03 }}
                                                    className="group p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition-all"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* File Icon */}
                                                        <div className="w-10 h-10 rounded-lg bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                                                            <File01Icon size={18} className="text-[#33cbcc]" />
                                                        </div>

                                                        {/* Document Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-medium text-gray-800 text-sm truncate">{doc.name}</h4>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-xs text-gray-500">{doc.size}</span>
                                                                <span className="text-xs text-gray-400">•</span>
                                                                <span className="text-xs text-gray-500">{doc.date}</span>
                                                                <span className="text-xs text-gray-400">•</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {doc.uploader.avatar ? (
                                                                        <img src={doc.uploader.avatar} alt="" className="w-4 h-4 rounded-full border border-gray-200" />
                                                                    ) : (
                                                                        <div className="w-4 h-4 rounded-full border border-gray-200 bg-gray-100" />
                                                                    )}
                                                                    <span className="text-xs text-gray-500 truncate max-w-[100px]">{doc.uploader.name}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {doc.filePath ? (
                                                                <>
                                                                    <a
                                                                        href={getFileUrl(doc.filePath)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                                        title={t('documents.actions.preview')}
                                                                    >
                                                                        <ViewIcon size={16} />
                                                                    </a>
                                                                    <a
                                                                        href={getFileUrl(doc.filePath)}
                                                                        download
                                                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                                                        title={t('documents.actions.download')}
                                                                    >
                                                                        <Download01Icon size={16} />
                                                                    </a>
                                                                    {doc.dbId && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (window.confirm(t('documents.confirmDelete'))) {
                                                                                    deleteDocument.mutate(doc.dbId!);
                                                                                }
                                                                            }}
                                                                            className="p-2 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                                                            title="Delete"
                                                                        >
                                                                            <Delete02Icon size={16} />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className="p-2 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                                                        <ViewIcon size={16} />
                                                                    </button>
                                                                    <button className="p-2 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                                                        <Download01Icon size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Upload01Icon Modal ── */}
            <AnimatePresence>
                {showUploadModal && (
                    <UploadDocumentModal onClose={() => setShowUploadModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Documents;
