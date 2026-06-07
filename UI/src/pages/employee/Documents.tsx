import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { File01Icon, Upload01Icon, Download01Icon, ViewIcon, Search01Icon, Add01Icon, Cancel01Icon, FolderOpenIcon, Loading02Icon } from 'hugeicons-react';
import { useDocuments, useCreateDocument } from '../../api/documents/hooks';
import { documentsApi } from '../../api/documents/api';
import type { Document as DocType } from '../../api/documents/types';
import { UserDocumentsSkeleton } from '../../components/Skeleton';
import Folder from '../../components/Folder';

/* ------------------------------------------------------------------ */
/*  Types   */
/* ------------------------------------------------------------------ */

type DocCategory = 'Contract' | 'SRS' | 'Design' | 'Technical' | 'Notes' | 'Brief' | 'Planning' | 'Education' | 'Recruitment' | 'Rapport' | 'Facture' | 'Procedure' | 'PV' | 'Commercial' | 'Fiscal';

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
/*  Constants   */
/* ------------------------------------------------------------------ */

const CATEGORIES: DocCategory[] = [
  'Contract', 'SRS', 'Design', 'Technical', 'Notes', 'Brief',
  'Planning', 'Education', 'Recruitment',
  'Rapport', 'Facture', 'Procedure', 'PV', 'Commercial', 'Fiscal',
];

/* ------------------------------------------------------------------ */
/*  Upload01Icon Document Modal   */
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

  const inputCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors';
  const selectCls = 'w-full bg-[#f8f9fc] border border-[#e5e8ef] px-4 py-3 text-sm text-[#1c2b3a] focus:outline-none focus:border-[#33cbcc] focus:bg-white transition-colors appearance-none cursor-pointer';
  const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-[#8892a4] uppercase tracking-wider mb-1.5';

  const handleSubmit = async () => {
  if (!isValid || !form.file) return;
  setIsUploading(true);
  try {
  const CATEGORY_MAP: Record<string, 'CONTRACT' | 'ID' | 'DIPLOMA' | 'OTHER'> = {
  Contract: 'CONTRACT', SRS: 'OTHER', Design: 'OTHER',
  Technical: 'OTHER', Notes: 'OTHER', Brief: 'OTHER', Planning: 'OTHER',
  Education: 'DIPLOMA', Recruitment: 'OTHER',
  Rapport: 'OTHER', Facture: 'OTHER', Procedure: 'OTHER',
  PV: 'OTHER', Commercial: 'OTHER', Fiscal: 'OTHER',
  };
  const FOLDER_MAP: Record<string, string> = {
  Education: 'formation', Recruitment: 'recruitment', Contract: 'contracts',
  Rapport: 'rapports', Facture: 'factures', Procedure: 'procedures',
  PV: 'pv', Commercial: 'commercial', Fiscal: 'fiscal',
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
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Header */}
  <div className="px-5 py-4 md:px-6 md:py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center">
  <Upload01Icon size={20} className="text-[#33cbcc]" />
  </div>
  <h2 className="text-lg font-bold text-[#1c2b3a]">{t('documents.upload.title')}</h2>
  </div>
  <button onClick={onClose} className="p-2  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors">
  <Cancel01Icon size={18} />
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
  className={`border-2 border-dashed  p-6 md:p-8 text-center cursor-pointer transition-all ${
  dragActive
  ? 'border-[#33cbcc] bg-[#33cbcc]/5'
  : form.file
  ? 'border-[#33cbcc]/40 bg-[#33cbcc]/5'
  : 'border-[#e5e8ef] hover:border-[#33cbcc]/40 hover:bg-[#33cbcc]/5'
  }`}
  >
  {form.file ? (
  <div className="flex items-center justify-center gap-3">
  <File01Icon size={24} className="text-[#33cbcc]" />
  <div className="text-left min-w-0">
  <p className="text-sm font-medium text-[#1c2b3a] truncate">{form.file.name}</p>
  <p className="text-xs text-[#8892a4]">{t('documents.upload.fileSelected')} -- {(form.file.size / 1024 / 1024).toFixed(1)} MB</p>
  </div>
  <button
  onClick={e => { e.stopPropagation(); setForm(prev => ({ ...prev, file: null, name: '' })); }}
  className="text-xs text-[#8892a4] hover:text-[#1c2b3a] font-medium ml-2 shrink-0"
  >
  {t('documents.upload.removeFile')}
  </button>
  </div>
  ) : (
  <>
  <Upload01Icon size={32} className="mx-auto text-[#b0bac9] mb-3" />
  <p className="text-sm font-medium text-[#8892a4]">{t('documents.upload.dropzone')}</p>
  <p className="text-xs text-[#8892a4] mt-1">{t('documents.upload.dropzoneSub')}</p>
  <p className="text-[10px] text-[#b0bac9] mt-3">{t('documents.upload.formats')}</p>
  </>
  )}
  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.webp" onChange={handleFileChange} />
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
  </div>

  {/* Footer */}
  <div className="px-5 py-4 md:px-6 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors"
  >
  {t('documents.upload.cancel')}
  </button>
  <button
  disabled={!isValid || createDocument.isPending || isUploading}
  onClick={handleSubmit}
  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white transition-colors ${
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

/* ------------------------------------------------------------------ */
/*  Documents Page (employee)   */
/* ------------------------------------------------------------------ */

const Documents = () => {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [clickedFolder, setClickedFolder] = useState<DocCategory | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  /* API data */
  const { data: apiDocuments, isLoading } = useDocuments();

  const getFileUrl = (filePath: string) => {
  const uploadsIndex = filePath.indexOf('uploads/');
  if (uploadsIndex === -1) return filePath;
  const relativePath = filePath.substring(uploadsIndex);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3025';
  return `${apiUrl}/${relativePath}`;
  };

  /* Map API documents to display shape */
  const CATEGORY_DISPLAY_MAP: Record<string, DocCategory> = {
  'CONTRACT': 'Contract',
  'ID': 'Notes',
  'DIPLOMA': 'Education',
  'RECRUITMENT': 'Recruitment',
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
  className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5  text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 self-start md:self-auto"
  >
  <Upload01Icon size={16} />
  {t('documents.uploadDocument')}
  </button>
  </div>

  {/* Category Folders Grid */}
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

  {/* Category Documents Modal */}
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
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  >
  <motion.div
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-md h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {/* Modal Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center">
  <FolderOpenIcon size={20} className="text-[#33cbcc]" />
  </div>
  <div>
  <h2 className="text-lg font-bold text-[#1c2b3a]">
  {t(`documents.categories.${selectedCategory.toLowerCase()}`)}
  </h2>
  <p className="text-xs text-[#8892a4]">
  {documents.filter(d => d.type === selectedCategory).length} {t('documents.documents')}
  </p>
  </div>
  </div>
  <button
  onClick={() => {
  setSelectedCategory(null);
  setTimeout(() => setClickedFolder(null), 300);
  }}
  className="w-8 h-8  hover:bg-[#f8f9fc] flex items-center justify-center text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
  >
  <Cancel01Icon size={18} />
  </button>
  </div>

  {/* Search01Icon Bar */}
  <div className="px-6 py-4 border-b border-[#e5e8ef] shrink-0">
  <div className="relative">
  <Search01Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
  <input
  type="text"
  placeholder={t('documents.searchPlaceholder')}
  value={categorySearchQuery}
  onChange={e => setCategorySearchQuery(e.target.value)}
  className="w-full bg-[#f5f6fa] border border-[#e5e8ef]  py-2.5 pl-9 pr-3 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#283852] transition-colors"
  />
  </div>
  </div>

  {/* Documents List */}
  <div className="flex-1 overflow-y-auto px-6 py-4">
  {(() => {
  const categoryDocs = documents.filter(d =>
  d.type === selectedCategory &&
  (categorySearchQuery === '' || d.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
  );

  if (categoryDocs.length === 0) {
  return (
  <div className="flex flex-col items-center justify-center py-12 text-center">
  <File01Icon size={48} className="text-[#b0bac9] mb-4" />
  <p className="text-[#8892a4] font-medium">
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
  onClick={() => { if (doc.filePath) window.open(getFileUrl(doc.filePath), '_blank'); }}
  className={`group p-4  border border-[#e5e8ef] hover:border-[#e5e8ef] hover:bg-[#f8f9fc] transition-all ${doc.filePath ? 'cursor-pointer' : ''}`}
  >
  <div className="flex items-center gap-4">
  {/* File Icon */}
  <div className="w-10 h-10  bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
  <File01Icon size={18} className="text-[#33cbcc]" />
  </div>

  {/* Document Info */}
  <div className="flex-1 min-w-0">
  <h4 className="font-medium text-[#1c2b3a] text-sm truncate">{doc.name}</h4>
  <div className="flex items-center gap-3 mt-1">
  {doc.size && <span className="text-xs text-[#8892a4]">{doc.size}</span>}
  {doc.size && doc.date && <span className="text-xs text-[#8892a4]">•</span>}
  {doc.date && <span className="text-xs text-[#8892a4]">{doc.date}</span>}
  {(doc.size || doc.date) && doc.uploader.name && <span className="text-xs text-[#8892a4]">•</span>}
  {doc.uploader.name && (
  <div className="flex items-center gap-1.5">
  {doc.uploader.avatar ? (
  <img src={doc.uploader.avatar} alt="" className="w-4 h-4 rounded-full border border-[#e5e8ef]" />
  ) : (
  <div className="w-4 h-4 rounded-full border border-[#e5e8ef] bg-[#f8f9fc]" />
  )}
  <span className="text-xs text-[#8892a4] truncate max-w-[100px]">{doc.uploader.name.split('@')[0]}</span>
  </div>
  )}
  </div>
  </div>

  {/* Actions */}
  <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  {doc.filePath ? (
  <>
  <a
  href={getFileUrl(doc.filePath)}
  target="_blank"
  rel="noopener noreferrer"
  className="p-2  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
  title={t('documents.actions.preview')}
  >
  <ViewIcon size={16} />
  </a>
  <a
  href={getFileUrl(doc.filePath)}
  download
  className="p-2  hover:bg-[#f8f9fc] text-[#8892a4] hover:text-[#1c2b3a] transition-colors"
  title={t('documents.actions.download')}
  >
  <Download01Icon size={16} />
  </a>
  </>
  ) : (
  <>
  <button className="p-2  text-[#b0bac9] cursor-not-allowed" disabled>
  <ViewIcon size={16} />
  </button>
  <button className="p-2  text-[#b0bac9] cursor-not-allowed" disabled>
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

  {/* Upload01Icon Modal */}
  <AnimatePresence>
  {showUploadModal && (
  <UploadDocumentModal onClose={() => setShowUploadModal(false)} />
  )}
  </AnimatePresence>
  </div>
  );
};

export default Documents;
