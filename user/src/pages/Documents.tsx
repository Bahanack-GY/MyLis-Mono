import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Upload,
    Download,
    Eye,
    Search,
    Plus,
    X,
    HardDrive,
    Clock,
    FolderOpen,
    LayoutGrid,
    List,
    Loader2,
} from 'lucide-react';
import { useDocuments, useCreateDocument, useStorageInfo } from '../api/documents/hooks';
import { documentsApi } from '../api/documents/api';
import type { Document as DocType } from '../api/documents/types';
import { UserDocumentsSkeleton } from '../components/Skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type DocCategory = 'Contract' | 'SRS' | 'Design' | 'Technical' | 'Notes' | 'Brief' | 'Planning' | 'Education' | 'Recruitment';

interface DocItem {
    id: string;
    name: string;
    type: DocCategory;
    size: string;
    date: string;
    filePath?: string;
    uploader: {
        name: string;
        avatar: string;
    };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: DocCategory[] = ['Contract', 'SRS', 'Design', 'Technical', 'Notes', 'Brief', 'Planning', 'Education', 'Recruitment'];

/* ------------------------------------------------------------------ */
/*  Upload Document Modal                                              */
/* ------------------------------------------------------------------ */

const UploadDocumentModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createDocument = useCreateDocument();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [form, setForm] = useState({
        file: null as File | null,
        name: '',
        category: '' as DocCategory | '',
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

    const isValid = form.file !== null && form.name.trim().length > 0 && form.category !== '';

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const selectCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all appearance-none cursor-pointer';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    const handleSubmit = async () => {
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
    };

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
                <div className="px-5 py-4 md:px-6 md:py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
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
                <div className="p-5 md:p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Drop zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 md:p-8 text-center cursor-pointer transition-all ${
                            dragActive
                                ? 'border-[#33cbcc] bg-[#33cbcc]/5'
                                : form.file
                                    ? 'border-[#33cbcc]/40 bg-[#33cbcc]/5'
                                    : 'border-gray-200 hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5'
                        }`}
                    >
                        {form.file ? (
                            <div className="flex items-center justify-center gap-3">
                                <FileText size={24} className="text-[#33cbcc]" />
                                <div className="text-left min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{form.file.name}</p>
                                    <p className="text-xs text-gray-400">{t('documents.upload.fileSelected')} -- {(form.file.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null, name: '' })); }}
                                    className="text-xs text-gray-500 hover:text-gray-700 font-medium ml-2 shrink-0"
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
                        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.webp" onChange={handleFileChange} />
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
                </div>

                {/* Footer */}
                <div className="px-5 py-4 md:px-6 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                        {t('documents.upload.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createDocument.isPending || isUploading}
                        onClick={handleSubmit}
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

/* ------------------------------------------------------------------ */
/*  Documents Page (employee)                                          */
/* ------------------------------------------------------------------ */

const Documents = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<DocCategory | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showUploadModal, setShowUploadModal] = useState(false);

    /* API data */
    const { data: apiDocuments, isLoading } = useDocuments();
    const { data: storageInfo } = useStorageInfo();

    const getFileUrl = (filePath: string) => {
        const uploadsIndex = filePath.indexOf('uploads/');
        if (uploadsIndex === -1) return filePath;
        const relativePath = filePath.substring(uploadsIndex);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        return `${apiUrl}/${relativePath}`;
    };

    /* Map API documents to display shape */
    const CATEGORY_DISPLAY_MAP: Record<string, DocCategory> = {
        'CONTRACT': 'Contract',
        'ID': 'Notes',
        'DIPLOMA': 'Education',
        'OTHER': 'Technical',
    };

    const documents: DocItem[] = (apiDocuments || []).map((d: DocType) => ({
        id: `doc-${d.id}`,
        name: d.name,
        type: CATEGORY_DISPLAY_MAP[d.category] || 'Technical',
        size: '',
        date: '',
        filePath: d.filePath || undefined,
        uploader: d.uploadedBy
            ? { name: d.uploadedBy.email, avatar: '' }
            : { name: '', avatar: '' },
    }));

    /* Loading */
    if (isLoading) {
        return <UserDocumentsSkeleton />;
    }

    /* Filtered documents */
    const filteredDocs = documents.filter(doc => {
        const matchesSearch =
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
        { label: t('documents.stats.storage'), value: storageUsed, icon: HardDrive, color: '#283852' },
        { label: t('documents.stats.recent'), value: recentDocs, icon: Clock, color: '#33cbcc' },
        { label: t('documents.stats.categories'), value: categoriesCount, icon: FolderOpen, color: '#283852' },
    ];

    /* Category filters */
    const categoryFilters: { key: DocCategory | 'all'; label: string }[] = [
        { key: 'all', label: t('documents.filterAll') },
        ...CATEGORIES.map(cat => ({ key: cat as DocCategory, label: t(`documents.categories.${cat.toLowerCase()}`) })),
    ];

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('documents.title')}</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">{t('documents.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 self-start md:self-auto"
                >
                    <Upload size={16} />
                    {t('documents.uploadDocument')}
                </button>
            </div>

            {/* Stat Cards - 2-col mobile / 4-col desktop */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.label}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-1 md:mt-2">{stat.value}</h2>
                        </div>
                        <div
                            className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={80} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Search bar + View toggle */}
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
                <div className="flex bg-white rounded-xl border border-gray-100 p-1 self-start md:self-auto">
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

            {/* Category filter pills */}
            <div className="flex gap-2 flex-wrap">
                {categoryFilters.map(cf => (
                    <button
                        key={cf.key}
                        onClick={() => setFilterCategory(cf.key)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                            filterCategory === cf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {cf.label}
                    </button>
                ))}
            </div>

            {/* Grid View - 1-col mobile / 2-col tablet / 3-col desktop */}
            {viewMode === 'grid' && filteredDocs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredDocs.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.05 }}
                            className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all"
                        >
                            {/* Icon + Actions */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                                    <FileText size={20} className="text-[#283852]" />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {doc.filePath ? (
                                        <>
                                            <a
                                                href={getFileUrl(doc.filePath)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <Eye size={16} />
                                            </a>
                                            <a
                                                href={getFileUrl(doc.filePath)}
                                                download
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            >
                                                <Download size={16} />
                                            </a>
                                        </>
                                    ) : (
                                        <>
                                            <button className="p-2 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-2 rounded-lg text-gray-300 cursor-not-allowed" disabled>
                                                <Download size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Name */}
                            <h3 className="font-medium text-gray-800 text-sm truncate mb-2">{doc.name}</h3>

                            {/* Type + Size + Date */}
                            <div className="flex items-center gap-2 flex-wrap mb-4">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                    {t(`documents.categories.${doc.type.toLowerCase()}`)}
                                </span>
                                {doc.size && (
                                    <>
                                        <span className="text-xs text-gray-400">{doc.size}</span>
                                        <span className="text-xs text-gray-300">|</span>
                                    </>
                                )}
                                {doc.date && (
                                    <span className="text-xs text-gray-400">{doc.date}</span>
                                )}
                            </div>

                            {/* Uploader */}
                            {doc.uploader.name && (
                                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                    {doc.uploader.avatar ? (
                                        <img src={doc.uploader.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100" />
                                    )}
                                    <span className="text-xs text-gray-500 truncate">{doc.uploader.name.split('@')[0]}</span>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && filteredDocs.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Table header - hidden on mobile, shown on md+ */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-5">{t('documents.table.name')}</div>
                        <div className="col-span-2">{t('documents.table.type')}</div>
                        <div className="col-span-1">{t('documents.table.size')}</div>
                        <div className="col-span-2">{t('documents.table.date')}</div>
                        <div className="col-span-2">{t('documents.table.actions')}</div>
                    </div>

                    {/* Rows */}
                    {filteredDocs.map((doc, i) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-t border-gray-100 group hover:bg-gray-50/50 transition-colors"
                        >
                            {/* Mobile row */}
                            <div className="flex md:hidden items-center gap-3 px-4 py-3">
                                <div className="w-9 h-9 rounded-lg bg-[#283852]/10 flex items-center justify-center shrink-0">
                                    <FileText size={16} className="text-[#283852]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                            {t(`documents.categories.${doc.type.toLowerCase()}`)}
                                        </span>
                                        {doc.size && <span className="text-[10px] text-gray-400">{doc.size}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
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
                                            <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled><Eye size={14} /></button>
                                            <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled><Download size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Desktop row */}
                            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 items-center">
                                {/* Name with icon */}
                                <div className="col-span-5 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg bg-[#283852]/10 flex items-center justify-center shrink-0">
                                        <FileText size={16} className="text-[#283852]" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800 truncate">{doc.name}</span>
                                </div>
                                {/* Type badge */}
                                <div className="col-span-2">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                        {t(`documents.categories.${doc.type.toLowerCase()}`)}
                                    </span>
                                </div>
                                {/* Size */}
                                <div className="col-span-1 text-xs text-gray-500">{doc.size || '--'}</div>
                                {/* Date */}
                                <div className="col-span-2 text-xs text-gray-400">{doc.date || '--'}</div>
                                {/* Actions */}
                                <div className="col-span-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled><Eye size={14} /></button>
                                            <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" disabled><Download size={14} /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {filteredDocs.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
                >
                    <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('documents.noResults')}</p>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                    >
                        <Upload size={16} />
                        {t('documents.uploadDocument')}
                    </button>
                </motion.div>
            )}

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <UploadDocumentModal onClose={() => setShowUploadModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Documents;
