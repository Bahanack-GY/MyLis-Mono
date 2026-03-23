import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hash,
    Users,
    MessageSquare,
    Send,
    Search,
    Plus,
    X,
    Loader2,
    ChevronDown,
    ArrowUp,
    ArrowLeft,
    Menu,
    Reply,
    Package,
    Paperclip,
    Download,
    FileText,
    FileSpreadsheet,
    File as FileIcon,
    Image as ImageIcon,
    Eye,
} from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import Header from '../components/Header';
import {
    useChannels,
    useMessages,
    useLoadMoreMessages,
    useSendMessage,
    useMarkAsRead,
    useTyping,
    useMembers,
    useCreateDM,
    useChatUsers,
    useUploadFiles,
} from '../api/chat/hooks';
import type { Channel, ChatMessage, ChatAttachment, ChannelMember } from '../api/chat/types';

/* ─── Helpers ──────────────────────────────────────────── */

function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getInitials(firstName: string, lastName: string) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || '?';
}

function isSameDay(a: string, b: string) {
    return new Date(a).toDateString() === new Date(b).toDateString();
}

function renderContent(content: string, isOwn = false) {
    const parts = content.split(/(@[A-Za-zÀ-ÿ]+ [A-Za-zÀ-ÿ]+)/g);
    return parts.map((part, i) => {
        if (/^@[A-Za-zÀ-ÿ]+ [A-Za-zÀ-ÿ]+$/.test(part)) {
            return (
                <span
                    key={i}
                    className={`rounded px-0.5 font-semibold ${
                        isOwn ? 'text-[#33cbcc]' : 'text-[#33cbcc] bg-[#33cbcc]/10'
                    }`}
                >
                    {part}
                </span>
            );
        }
        return part;
    });
}

function scrollToMessage(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('bg-yellow-50');
        setTimeout(() => el.classList.remove('bg-yellow-50'), 1500);
    }
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isImageType(fileType: string) {
    return fileType.startsWith('image/');
}

function isPdfType(fileType: string) {
    return fileType === 'application/pdf';
}

function getFileIcon(fileType: string) {
    if (isImageType(fileType)) return ImageIcon;
    if (isPdfType(fileType)) return FileText;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
    if (fileType.includes('word') || fileType.includes('document')) return FileText;
    return FileIcon;
}

const DEMAND_CARD_RE = /^\[DEMAND_CARD:(.+)\]$/s;

const formatFCFA = (amount: number) =>
    new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';

const IMPORTANCE_LABELS: Record<string, { label: string; color: string }> = {
    BARELY: { label: 'Faible', color: 'bg-gray-100 text-gray-500' },
    IMPORTANT: { label: 'Important', color: 'bg-blue-50 text-blue-600' },
    VERY_IMPORTANT: { label: 'Très important', color: 'bg-orange-50 text-orange-600' },
    URGENT: { label: 'Urgent', color: 'bg-red-50 text-red-600' },
};

/* ─── Demand Card Bubble ───────────────────────────────── */

interface DemandCardData {
    demandId: string;
    items: { name: string; quantity: number; unitPrice: number }[];
    totalPrice: number;
    importance: string;
    status: string;
}

const DemandCardBubble = ({
    data,
    messageTime,
    showName,
    senderName,
    isOwn,
}: {
    data: DemandCardData;
    messageTime: string;
    showName: boolean;
    senderName: string;
    isOwn: boolean;
}) => {
    const { t } = useTranslation();
    const isPending = data.status === 'PENDING';
    const imp = IMPORTANCE_LABELS[data.importance] || IMPORTANCE_LABELS.BARELY;

    return (
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} px-5 py-1`}>
            {showName && (
                <div className="flex items-baseline gap-2 mb-1">
                    {!isOwn && <span className="text-sm font-semibold text-gray-800">{senderName}</span>}
                    <span className="text-[10px] text-gray-400">{formatTime(messageTime)}</span>
                    {isOwn && <span className="text-sm font-semibold text-[#33cbcc]">Vous</span>}
                </div>
            )}
            <div className={`max-w-[85%] w-full sm:max-w-[420px] ${!isOwn ? 'ml-12' : ''}`}>
                <div className="bg-gradient-to-br from-[#283852] to-[#1e2d42] rounded-2xl overflow-hidden shadow-lg">
                    {/* Header */}
                    <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <Package size={16} className="text-[#33cbcc]" />
                        <span className="text-sm font-semibold text-white">{t('demands.chatIntroMessage', { items: '' }).replace(': ', '')}</span>
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${imp.color}`}>{imp.label}</span>
                    </div>

                    {/* Items table */}
                    <div className="px-4 pb-2">
                        <div className="bg-white/10 rounded-lg overflow-hidden">
                            {data.items.map((item, i) => (
                                <div key={i} className={`flex items-center justify-between px-3 py-1.5 text-xs ${i > 0 ? 'border-t border-white/10' : ''}`}>
                                    <span className="text-white/90 font-medium flex-1 truncate">{item.name}</span>
                                    <span className="text-white/60 mx-3">×{item.quantity}</span>
                                    <span className="text-white/80 font-medium">{formatFCFA(item.unitPrice * item.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="px-4 pb-3 flex justify-between items-center">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">Total</span>
                        <span className="text-sm font-bold text-[#33cbcc]">{formatFCFA(data.totalPrice)}</span>
                    </div>

                    {/* Status badge */}
                    <div className="px-4 pb-3">
                        {isPending ? (
                            <div className="text-center text-xs font-bold py-1.5 rounded-lg text-[#f59e0b] bg-[#f59e0b]/15">
                                • {t('demands.status.pending')}
                            </div>
                        ) : (
                            <div className={`text-center text-xs font-bold py-1.5 rounded-lg ${
                                data.status === 'VALIDATED'
                                    ? 'text-green-400 bg-green-500/15'
                                    : 'text-red-400 bg-red-500/15'
                            }`}>
                                {data.status === 'VALIDATED' ? '✓ ' + t('demands.status.validated') : '✗ ' + t('demands.status.rejected')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─── New DM Modal ─────────────────────────────────────── */

const NewDMModal = ({
    onClose,
    onSelect,
}: {
    onClose: () => void;
    onSelect: (userId: string) => void;
}) => {
    const { t } = useTranslation();
    const { data: users, isLoading } = useChatUsers();
    const [search, setSearch] = useState('');

    const filtered = (users || []).filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q)
        );
    });

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[70vh] flex flex-col"
            >
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800">{t('chat.newMessage')}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="px-5 py-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={t('chat.searchUsers')}
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-3">
                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[#33cbcc]" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-center text-gray-400 text-sm py-8">Aucun utilisateur</p>
                    ) : (
                        <div className="space-y-1">
                            {filtered.map(user => (
                                <button
                                    key={user.userId}
                                    onClick={() => onSelect(user.userId)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                                >
                                    <div className="w-9 h-9 rounded-full bg-[#283852] flex items-center justify-center shrink-0">
                                        <span className="text-xs font-bold text-white">
                                            {getInitials(user.firstName, user.lastName)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">
                                            {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            {user.departmentName || user.email}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Channel Sidebar ──────────────────────────────────── */

const ChannelSidebar = ({
    channels,
    activeChannelId,
    onSelect,
    onNewDM,
    onlineUsers,
    isEmbed = false,
}: {
    channels: Channel[];
    activeChannelId: string | null;
    onSelect: (id: string) => void;
    onNewDM: () => void;
    onlineUsers: Set<string>;
    isEmbed?: boolean;
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const general = channels.filter(c => c.type === 'GENERAL');
    const managersGroup = channels.filter(c => c.type === 'MANAGERS');
    const departments = channels.filter(c => c.type === 'DEPARTMENT');
    const dms = channels.filter(c => c.type === 'DIRECT');

    const renderChannel = (ch: Channel) => {
        const isActive = ch.id === activeChannelId;
        const isDM = ch.type === 'DIRECT';
        const isOnline = isDM && ch.dmUser ? onlineUsers.has(ch.dmUser.userId) : false;

        return (
            <button
                key={ch.id}
                onClick={() => onSelect(ch.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm ${
                    isActive
                        ? 'bg-[#33cbcc]/15 text-white font-semibold'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
            >
                {isDM ? (
                    <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-full bg-[#283852] border border-gray-600 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">
                                {ch.dmUser ? getInitials(ch.dmUser.firstName, ch.dmUser.lastName) : '?'}
                            </span>
                        </div>
                        {isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#2b3548]" />
                        )}
                    </div>
                ) : (
                    <Hash size={16} className={isActive ? 'text-[#33cbcc]' : 'text-gray-500'} />
                )}

                <span className="flex-1 truncate">{ch.name}</span>

                {ch.unreadCount > 0 && (
                    <span className="bg-[#33cbcc] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {ch.unreadCount}
                    </span>
                )}
            </button>
        );
    };

    const SectionTitle = ({ children }: { children: React.ReactNode }) => (
        <div className="px-3 pt-4 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {children}
            </span>
        </div>
    );

    return (
        <div className="w-64 bg-[#283852] flex flex-col h-full shrink-0 shadow-2xl z-50">
            {/* Back button — hidden in embed mode */}
            {!isEmbed && (
                <div className="px-4 pt-4 pb-2">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                    >
                        <ArrowLeft size={16} />
                        <span className="font-medium">Retour</span>
                    </button>
                </div>
            )}

            {/* Title + New DM */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-700/50 shrink-0">
                <h2 className="font-bold text-white text-base">{t('chat.title')}</h2>
                <button
                    onClick={onNewDM}
                    className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                    title={t('chat.newMessage')}
                >
                    <Plus size={18} className="text-gray-400" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1 px-2">
                {general.length > 0 && (
                    <>
                        <SectionTitle>{t('chat.general')}</SectionTitle>
                        {general.map(renderChannel)}
                    </>
                )}

                {managersGroup.length > 0 && (
                    <>
                        <SectionTitle>{t('chat.managers')}</SectionTitle>
                        {managersGroup.map(renderChannel)}
                    </>
                )}

                {departments.length > 0 && (
                    <>
                        <SectionTitle>{t('chat.departments')}</SectionTitle>
                        {departments.map(renderChannel)}
                    </>
                )}

                {dms.length > 0 && (
                    <>
                        <SectionTitle>{t('chat.directMessages')}</SectionTitle>
                        {dms.map(renderChannel)}
                    </>
                )}
            </div>
        </div>
    );
};

/* ─── Mention Dropdown ────────────────────────────────── */

const MentionDropdown = ({
    members,
    query,
    onSelect,
}: {
    members: ChannelMember[];
    query: string;
    onSelect: (member: ChannelMember) => void;
}) => {
    const q = query.toLowerCase();
    const filtered = members.filter(m =>
        m.firstName.toLowerCase().startsWith(q) ||
        m.lastName.toLowerCase().startsWith(q) ||
        `${m.firstName} ${m.lastName}`.toLowerCase().startsWith(q)
    ).slice(0, 6);

    if (filtered.length === 0) return null;

    return (
        <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10">
            {filtered.map(m => (
                <button
                    key={m.userId}
                    onMouseDown={e => { e.preventDefault(); onSelect(m); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                >
                    <div className="w-7 h-7 rounded-full bg-[#283852] flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-white">
                            {getInitials(m.firstName, m.lastName)}
                        </span>
                    </div>
                    <span className="text-sm text-gray-700">{m.firstName} {m.lastName}</span>
                </button>
            ))}
        </div>
    );
};

/* ─── Image Lightbox ───────────────────────────────────── */

const ImageLightbox = ({
    src,
    fileName,
    onClose,
}: {
    src: string;
    fileName: string;
    onClose: () => void;
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center"
        >
            <div className="absolute -top-10 right-0 flex items-center gap-2">
                <a
                    href={src}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white"
                    onClick={e => e.stopPropagation()}
                >
                    <Download size={18} />
                </a>
                <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white">
                    <X size={18} />
                </button>
            </div>
            <img src={src} alt={fileName} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            <p className="text-white/70 text-sm mt-2">{fileName}</p>
        </motion.div>
    </motion.div>
);

/* ─── Attachment Renderer ─────────────────────────────── */

const AttachmentRenderer = ({
    attachments,
    isOwn,
}: {
    attachments: ChatAttachment[];
    isOwn: boolean;
}) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const [lightboxSrc, setLightboxSrc] = useState<{ src: string; name: string } | null>(null);
    const [pdfPreview, setPdfPreview] = useState<{ src: string; name: string } | null>(null);

    return (
        <>
            <div className="flex flex-col gap-1.5 mt-1">
                {attachments.map((att, i) => {
                    const fileUrl = att.filePath.startsWith('http') ? att.filePath : `${apiUrl}${att.filePath}`;

                    if (isImageType(att.fileType)) {
                        return (
                            <div key={i} className="relative group/att">
                                <img
                                    src={fileUrl}
                                    alt={att.fileName}
                                    className="max-w-[280px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxSrc({ src: fileUrl, name: att.fileName })}
                                />
                                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover/att:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => setLightboxSrc({ src: fileUrl, name: att.fileName })}
                                        className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <Eye size={14} />
                                    </button>
                                    <a
                                        href={fileUrl}
                                        download={att.fileName}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded bg-black/50 text-white hover:bg-black/70"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <Download size={14} />
                                    </a>
                                </div>
                                <p className="text-[10px] mt-0.5 opacity-60 truncate max-w-[280px]">{att.fileName}</p>
                            </div>
                        );
                    }

                    if (isPdfType(att.fileType)) {
                        return (
                            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${isOwn ? 'bg-white/10' : 'bg-gray-200/60'} max-w-[300px]`}>
                                <FileText size={20} className="text-red-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-medium truncate ${isOwn ? 'text-white' : 'text-gray-700'}`}>{att.fileName}</p>
                                    <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>{formatFileSize(att.size)}</p>
                                </div>
                                <button
                                    onClick={() => setPdfPreview({ src: fileUrl, name: att.fileName })}
                                    className={`p-1 rounded hover:bg-black/10 ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Aperçu"
                                >
                                    <Eye size={14} />
                                </button>
                                <a
                                    href={fileUrl}
                                    download={att.fileName}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-1 rounded hover:bg-black/10 ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                    title="Télécharger"
                                >
                                    <Download size={14} />
                                </a>
                            </div>
                        );
                    }

                    const Icon = getFileIcon(att.fileType);
                    return (
                        <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${isOwn ? 'bg-white/10' : 'bg-gray-200/60'} max-w-[300px]`}>
                            <Icon size={20} className="text-[#33cbcc] shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${isOwn ? 'text-white' : 'text-gray-700'}`}>{att.fileName}</p>
                                <p className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-gray-400'}`}>{formatFileSize(att.size)}</p>
                            </div>
                            <a
                                href={fileUrl}
                                download={att.fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`p-1 rounded hover:bg-black/10 ${isOwn ? 'text-white/70 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
                                title="Télécharger"
                            >
                                <Download size={14} />
                            </a>
                        </div>
                    );
                })}
            </div>

            {/* Image Lightbox */}
            <AnimatePresence>
                {lightboxSrc && (
                    <ImageLightbox src={lightboxSrc.src} fileName={lightboxSrc.name} onClose={() => setLightboxSrc(null)} />
                )}
            </AnimatePresence>

            {/* PDF Preview Modal */}
            <AnimatePresence>
                {pdfPreview && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPdfPreview(null)}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="relative w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden flex flex-col"
                        >
                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 shrink-0">
                                <span className="text-sm font-medium text-gray-700 truncate">{pdfPreview.name}</span>
                                <div className="flex items-center gap-2">
                                    <a
                                        href={pdfPreview.src}
                                        download={pdfPreview.name}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                                    >
                                        <Download size={16} />
                                    </a>
                                    <button onClick={() => setPdfPreview(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                            <iframe src={pdfPreview.src} className="flex-1 w-full" title={pdfPreview.name} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

/* ─── Message Bubble ───────────────────────────────────── */

const MessageBubble = ({
    message,
    isOwn,
    showAvatar,
    showName,
    onReply,
}: {
    message: ChatMessage;
    isOwn: boolean;
    showAvatar: boolean;
    showName: boolean;
    onReply: () => void;
}) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const avatarSrc = message.sender.avatarUrl
        ? (message.sender.avatarUrl.startsWith('http') || message.sender.avatarUrl.startsWith('data:') ? message.sender.avatarUrl : `${apiUrl}${message.sender.avatarUrl}`)
        : null;

    const replyContext = message.replyTo ? (
        <button
            onClick={() => scrollToMessage(message.replyTo!.id)}
            className="flex items-start gap-1.5 mb-1 px-2 py-1 rounded-lg text-left transition-colors bg-gray-100 hover:bg-gray-200"
        >
            <div className="w-0.5 rounded-full self-stretch shrink-0 bg-[#33cbcc]" />
            <div className="min-w-0">
                <span className="text-[10px] font-semibold block text-[#33cbcc]">
                    {message.replyTo.sender.firstName} {message.replyTo.sender.lastName}
                </span>
                <span className="text-[11px] block truncate text-gray-500">
                    {message.replyTo.content.length > 60 ? message.replyTo.content.substring(0, 60) + '...' : message.replyTo.content}
                </span>
            </div>
        </button>
    ) : null;

    // Detect demand card messages
    const demandMatch = message.content.match(DEMAND_CARD_RE);
    if (demandMatch) {
        try {
            const data: DemandCardData = JSON.parse(demandMatch[1]);
            return (
                <DemandCardBubble
                    data={data}
                    messageTime={message.createdAt}
                    showName={showAvatar}
                    senderName={`${message.sender.firstName} ${message.sender.lastName}`}
                    isOwn={isOwn}
                />
            );
        } catch {
            // If JSON parse fails, fall through to normal rendering
        }
    }

    const hasAttachments = message.attachments && message.attachments.length > 0;
    const hasContent = message.content.trim().length > 0;

    if (isOwn) {
        return (
            <div className={`flex flex-col items-end px-5 py-0.5 group ${showAvatar ? 'mt-3' : ''}`}>
                {showName && (
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
                        <span className="text-sm font-semibold text-[#33cbcc]">Vous</span>
                    </div>
                )}
                <div className="max-w-[70%] relative">
                    <button
                        onClick={onReply}
                        className="absolute -left-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    >
                        <Reply size={14} />
                    </button>
                    {replyContext}
                    <div className="bg-[#283852] text-white px-4 py-2 rounded-2xl rounded-tr-sm">
                        {hasContent && (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {renderContent(message.content, true)}
                            </p>
                        )}
                        {hasAttachments && (
                            <AttachmentRenderer attachments={message.attachments!} isOwn={true} />
                        )}
                    </div>
                    {!showName && (
                        <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity block text-right mt-0.5">
                            {formatTime(message.createdAt)}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex gap-3 px-5 py-0.5 group ${showAvatar ? 'mt-3' : ''}`}>
            {showAvatar ? (
                avatarSrc ? (
                    <img src={avatarSrc} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-[#283852] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-white">
                            {getInitials(message.sender.firstName, message.sender.lastName)}
                        </span>
                    </div>
                )
            ) : (
                <div className="w-9 shrink-0" />
            )}

            <div className="max-w-[70%] relative">
                {showName && (
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-800">
                            {message.sender.firstName} {message.sender.lastName}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatTime(message.createdAt)}</span>
                    </div>
                )}
                {replyContext}
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-tl-sm">
                    {hasContent && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {renderContent(message.content)}
                        </p>
                    )}
                    {hasAttachments && (
                        <AttachmentRenderer attachments={message.attachments!} isOwn={false} />
                    )}
                </div>
                {!showName && (
                    <span className="text-[10px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity block mt-0.5">
                        {formatTime(message.createdAt)}
                    </span>
                )}
                <button
                    onClick={onReply}
                    className="absolute -right-8 top-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                    <Reply size={14} />
                </button>
            </div>
        </div>
    );
};

/* ─── Members Panel ────────────────────────────────────── */

const MembersPanel = ({
    channelId,
    onlineUsers,
    onStartDM,
}: {
    channelId: string;
    onlineUsers: Set<string>;
    onStartDM: (userId: string) => void;
}) => {
    const { t } = useTranslation();
    const { data: members } = useMembers(channelId);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const online = (members || []).filter(m => onlineUsers.has(m.userId));
    const offline = (members || []).filter(m => !onlineUsers.has(m.userId));

    const renderMember = (m: typeof online[0], isOnline: boolean) => {
        const avatarSrc = m.avatarUrl
            ? (m.avatarUrl.startsWith('http') || m.avatarUrl.startsWith('data:') ? m.avatarUrl : `${apiUrl}${m.avatarUrl}`)
            : null;

        return (
            <button
                key={m.userId}
                onClick={() => onStartDM(m.userId)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
                <div className="relative shrink-0">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="" className={`w-8 h-8 rounded-full object-cover ${!isOnline ? 'opacity-40' : ''}`} />
                    ) : (
                        <div className={`w-8 h-8 rounded-full bg-[#283852] flex items-center justify-center ${!isOnline ? 'opacity-40' : ''}`}>
                            <span className="text-[10px] font-bold text-white">
                                {getInitials(m.firstName, m.lastName)}
                            </span>
                        </div>
                    )}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
                </div>
                <span className={`text-sm truncate ${isOnline ? 'text-gray-700' : 'text-gray-400'}`}>
                    {m.firstName} {m.lastName}
                </span>
            </button>
        );
    };

    return (
        <div className="w-56 bg-gray-50 border-l border-gray-200 flex flex-col h-full shrink-0 hidden md:flex">
            <div className="h-14 flex items-center px-4 border-b border-gray-200 shrink-0">
                <Users size={16} className="text-gray-400 mr-2" />
                <span className="text-sm font-semibold text-gray-600">
                    {t('chat.members')} — {(members || []).length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto py-2 px-2">
                {online.length > 0 && (
                    <>
                        <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-green-500">
                            {t('chat.online')} — {online.length}
                        </p>
                        {online.map(m => renderMember(m, true))}
                    </>
                )}
                {offline.length > 0 && (
                    <>
                        <p className="px-3 py-1 mt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            {t('chat.offline')} — {offline.length}
                        </p>
                        {offline.map(m => renderMember(m, false))}
                    </>
                )}
            </div>
        </div>
    );
};

/* ─── Main Component ───────────────────────────────────── */

const Messages = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const isEmbed = location.pathname.startsWith('/embed/');
    const { onlineUsers, socket } = useSocket();
    const queryClient = useQueryClient();
    const { data: channels, isLoading: channelsLoading } = useChannels();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [showNewDM, setShowNewDM] = useState(false);
    const [showMembers, setShowMembers] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [showChannelSidebar, setShowChannelSidebar] = useState(false);

    // Reply & mention state
    const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionStartIndex, setMentionStartIndex] = useState(0);
    const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // File attachment state
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data: messages, isLoading: messagesLoading } = useMessages(activeChannelId);
    const loadMore = useLoadMoreMessages(activeChannelId);
    const sendMessage = useSendMessage();
    const markAsRead = useMarkAsRead();
    const { startTyping, stopTyping } = useTyping(activeChannelId);
    const createDM = useCreateDM();
    const { data: members } = useMembers(activeChannelId);
    const uploadFiles = useUploadFiles();

    const activeChannel = (channels || []).find(c => c.id === activeChannelId);

    // Auto-select channel from query param (?channel=id) or first channel
    useEffect(() => {
        if (!channels || channels.length === 0) return;
        const channelFromParam = searchParams.get('channel');
        if (channelFromParam && channels.find(c => c.id === channelFromParam)) {
            setActiveChannelId(channelFromParam);
        } else if (!activeChannelId) {
            setActiveChannelId(channels[0].id);
        }
    }, [channels, searchParams]);

    // Mark as read when opening a channel
    useEffect(() => {
        if (activeChannelId && activeChannel && activeChannel.unreadCount > 0) {
            markAsRead(activeChannelId);
        }
    }, [activeChannelId]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (isAtBottom && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isAtBottom]);

    // Track scroll position
    const handleScroll = useCallback(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        setIsAtBottom(atBottom);
    }, []);

    // Typing indicators
    useEffect(() => {
        if (!socket) return;

        const handleTyping = (data: { channelId: string; userId: string }) => {
            if (data.userId === user?.userId) return;
            setTypingUsers(prev => {
                const next = new Map(prev);
                next.set(data.userId, data.channelId);
                return next;
            });
        };

        const handleTypingStop = (data: { userId: string }) => {
            setTypingUsers(prev => {
                const next = new Map(prev);
                next.delete(data.userId);
                return next;
            });
        };

        socket.on('typing', handleTyping);
        socket.on('typing:stop', handleTypingStop);
        return () => {
            socket.off('typing', handleTyping);
            socket.off('typing:stop', handleTypingStop);
        };
    }, [socket, user?.userId]);

    // Clear reply/mention/files state when switching channels
    useEffect(() => {
        setReplyingTo(null);
        setSelectedMentions([]);
        setMentionQuery(null);
        setPendingFiles([]);
    }, [activeChannelId]);

    const handleSend = async () => {
        if (!activeChannelId) return;
        const hasText = messageInput.trim().length > 0;
        const hasFiles = pendingFiles.length > 0;
        if (!hasText && !hasFiles) return;

        let attachments: ChatAttachment[] | undefined;

        if (hasFiles) {
            setIsUploading(true);
            try {
                attachments = await uploadFiles.mutateAsync(pendingFiles);
            } catch {
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        const channelIdSnapshot = activeChannelId;
        sendMessage(
            activeChannelId,
            messageInput.trim(),
            replyingTo?.id,
            selectedMentions.length > 0 ? selectedMentions : undefined,
            attachments,
        );
        setMessageInput('');
        setReplyingTo(null);
        setSelectedMentions([]);
        setMentionQuery(null);
        setPendingFiles([]);
        stopTyping();
        setIsAtBottom(true);
        // Invalidate messages after a short delay to ensure the server has saved the message,
        // covering cases where the socket event or ACK is not received by the sender.
        setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['chat', 'messages', channelIdSnapshot] });
            queryClient.invalidateQueries({ queryKey: ['chat', 'channels'] });
        }, 500);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setPendingFiles(prev => [...prev, ...files]);
        }
        e.target.value = '';
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (mentionQuery !== null) { setMentionQuery(null); return; }
            if (replyingTo) { setReplyingTo(null); return; }
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setMessageInput(value);
        if (value) startTyping();

        // Detect @mention
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = value.substring(0, cursorPos);
        const mentionMatch = textBeforeCursor.match(/@([A-Za-zÀ-ÿ]*)$/);

        if (mentionMatch) {
            setMentionQuery(mentionMatch[1]);
            setMentionStartIndex(cursorPos - mentionMatch[0].length);
        } else {
            setMentionQuery(null);
        }
    };

    const handleMentionSelect = (member: ChannelMember) => {
        const fullName = `${member.firstName} ${member.lastName}`;
        const before = messageInput.substring(0, mentionStartIndex);
        const after = messageInput.substring(mentionStartIndex + (mentionQuery?.length || 0) + 1);
        const newValue = `${before}@${fullName} ${after}`;
        setMessageInput(newValue);
        setSelectedMentions(prev => prev.includes(member.userId) ? prev : [...prev, member.userId]);
        setMentionQuery(null);

        setTimeout(() => {
            if (textareaRef.current) {
                const newPos = before.length + fullName.length + 2;
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newPos, newPos);
            }
        }, 0);
    };

    const handleNewDM = async (targetUserId: string) => {
        setShowNewDM(false);
        const channel = await createDM.mutateAsync(targetUserId);
        setActiveChannelId(channel.id);
    };

    const handleStartDM = async (targetUserId: string) => {
        if (targetUserId === user?.userId) return;
        const channel = await createDM.mutateAsync(targetUserId);
        setActiveChannelId(channel.id);
    };

    const handleLoadMore = () => {
        if (!messages || messages.length === 0 || loadMore.isPending) return;
        loadMore.mutate(messages[0].createdAt);
    };

    const currentTyping = Array.from(typingUsers.entries())
        .filter(([, chId]) => chId === activeChannelId)
        .map(([userId]) => userId);

    if (channelsLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-[#33cbcc]" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Channel Sidebar — Desktop */}
            <div className="hidden md:flex">
                <ChannelSidebar
                    channels={channels || []}
                    activeChannelId={activeChannelId}
                    onSelect={(id) => {
                        setActiveChannelId(id);
                        setIsAtBottom(true);
                    }}
                    onNewDM={() => setShowNewDM(true)}
                    onlineUsers={onlineUsers}
                    isEmbed={isEmbed}
                />
            </div>

            {/* Channel Sidebar — Mobile overlay */}
            <AnimatePresence>
                {showChannelSidebar && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-40 md:hidden"
                            onClick={() => setShowChannelSidebar(false)}
                        />
                        <motion.div
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ type: 'spring', damping: 25 }}
                            className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
                        >
                            <ChannelSidebar
                                channels={channels || []}
                                activeChannelId={activeChannelId}
                                onSelect={(id) => {
                                    setActiveChannelId(id);
                                    setIsAtBottom(true);
                                    setShowChannelSidebar(false);
                                }}
                                onNewDM={() => { setShowNewDM(true); setShowChannelSidebar(false); }}
                                onlineUsers={onlineUsers}
                                isEmbed={isEmbed}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Right side: Header + Chat area */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {!isEmbed && <Header />}

                <main className="flex-1 flex overflow-hidden bg-white">
                    {/* Main Chat Area */}
                    <div className="flex-1 flex flex-col min-w-0">
                        {activeChannel ? (
                            <>
                                {/* Channel Header */}
                                <div className="h-14 flex items-center justify-between px-4 md:px-5 border-b border-gray-200 shrink-0">
                                    <div className="flex items-center gap-2.5">
                                        {/* Mobile hamburger */}
                                        <button
                                            onClick={() => setShowChannelSidebar(true)}
                                            className="p-1.5 rounded-lg hover:bg-gray-100 md:hidden"
                                        >
                                            <Menu size={18} className="text-gray-500" />
                                        </button>
                                        {activeChannel.type === 'DIRECT' ? (
                                            <MessageSquare size={18} className="text-[#33cbcc]" />
                                        ) : (
                                            <Hash size={18} className="text-[#33cbcc]" />
                                        )}
                                        <h2 className="font-semibold text-gray-800 text-sm md:text-base truncate">
                                            {activeChannel.name}
                                        </h2>
                                        {activeChannel.description && (
                                            <span className="text-xs text-gray-400 hidden md:inline">
                                                — {activeChannel.description}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setShowMembers(!showMembers)}
                                        className={`p-2 rounded-lg transition-colors hidden md:block ${
                                            showMembers ? 'bg-gray-100 text-[#283852]' : 'text-gray-400 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Users size={18} />
                                    </button>
                                </div>

                                {/* Messages */}
                                <div
                                    ref={messagesContainerRef}
                                    onScroll={handleScroll}
                                    className="flex-1 overflow-y-auto"
                                >
                                    {messages && messages.length >= 50 && (
                                        <div className="flex justify-center py-3">
                                            <button
                                                onClick={handleLoadMore}
                                                disabled={loadMore.isPending}
                                                className="flex items-center gap-1.5 text-xs text-[#33cbcc] hover:text-[#2bb5b6] font-medium"
                                            >
                                                {loadMore.isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
                                                {t('chat.loadMore')}
                                            </button>
                                        </div>
                                    )}

                                    {messagesLoading ? (
                                        <div className="flex items-center justify-center h-full">
                                            <Loader2 className="w-6 h-6 animate-spin text-[#33cbcc]" />
                                        </div>
                                    ) : !messages || messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                            <MessageSquare size={48} className="mb-3 text-gray-200" />
                                            <p className="text-sm">{t('chat.noMessages')}</p>
                                        </div>
                                    ) : (
                                        <div className="py-4">
                                            {messages.map((msg, i) => {
                                                const prev = messages[i - 1];
                                                const showDate = !prev || !isSameDay(prev.createdAt, msg.createdAt);
                                                const showAvatar = !prev || prev.sender.id !== msg.sender.id || showDate ||
                                                    (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000);

                                                return (
                                                    <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500">
                                                        {showDate && (
                                                            <div className="flex items-center gap-3 px-5 my-4">
                                                                <div className="flex-1 h-px bg-gray-200" />
                                                                <span className="text-[11px] font-semibold text-gray-400">
                                                                    {formatDateSeparator(msg.createdAt)}
                                                                </span>
                                                                <div className="flex-1 h-px bg-gray-200" />
                                                            </div>
                                                        )}
                                                        <MessageBubble
                                                            message={msg}
                                                            isOwn={msg.sender.id === user?.userId}
                                                            showAvatar={showAvatar}
                                                            showName={showAvatar}
                                                            onReply={() => {
                                                                setReplyingTo(msg);
                                                                textareaRef.current?.focus();
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                            <div ref={messagesEndRef} />
                                        </div>
                                    )}
                                </div>

                                {/* Typing indicator */}
                                <AnimatePresence>
                                    {currentTyping.length > 0 && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="px-5 overflow-hidden"
                                        >
                                            <div className="flex items-center gap-2 py-1.5">
                                                <div className="flex gap-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
                                                </div>
                                                <span className="text-xs text-gray-400">{t('chat.typing')}</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Reply preview */}
                                {replyingTo && (
                                    <div className="px-3 md:px-5 pt-2 shrink-0">
                                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border-l-2 border-[#33cbcc]">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-semibold text-[#33cbcc]">
                                                    {t('chat.replyingTo', { name: `${replyingTo.sender.firstName} ${replyingTo.sender.lastName}` })}
                                                </span>
                                                <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                                            </div>
                                            <button onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-gray-200 shrink-0">
                                                <X size={14} className="text-gray-400" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Pending files preview */}
                                {pendingFiles.length > 0 && (
                                    <div className="px-3 md:px-5 pt-2 shrink-0">
                                        <div className="flex flex-wrap gap-2">
                                            {pendingFiles.map((file, i) => {
                                                const isImage = file.type.startsWith('image/');
                                                const Icon = getFileIcon(file.type);
                                                return (
                                                    <div key={i} className="relative group/file">
                                                        {isImage ? (
                                                            <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                                                                <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 max-w-[180px]">
                                                                <Icon size={16} className="text-[#33cbcc] shrink-0" />
                                                                <span className="text-xs text-gray-600 truncate">{file.name}</span>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => removePendingFile(i)}
                                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Message Input */}
                                <div className="px-3 md:px-5 py-3 border-t border-gray-100 shrink-0 relative">
                                    {/* Mention dropdown */}
                                    {mentionQuery !== null && members && (
                                        <MentionDropdown
                                            members={members}
                                            query={mentionQuery}
                                            onSelect={handleMentionSelect}
                                        />
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />
                                    <div className="flex items-end gap-2 bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 focus-within:border-[#33cbcc] focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-all">
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#33cbcc] hover:bg-gray-100 transition-colors shrink-0"
                                            title="Joindre un fichier"
                                        >
                                            <Paperclip size={18} />
                                        </button>
                                        <textarea
                                            ref={textareaRef}
                                            value={messageInput}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            placeholder={t('chat.typePlaceholder')}
                                            rows={1}
                                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none resize-none max-h-32"
                                            style={{ minHeight: '24px' }}
                                        />
                                        <button
                                            onClick={handleSend}
                                            disabled={(!messageInput.trim() && pendingFiles.length === 0) || isUploading}
                                            className={`p-2 rounded-lg transition-colors shrink-0 ${
                                                (messageInput.trim() || pendingFiles.length > 0) && !isUploading
                                                    ? 'bg-[#33cbcc] text-white hover:bg-[#2bb5b6] shadow-sm'
                                                    : 'text-gray-300'
                                            }`}
                                        >
                                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                <button
                                    onClick={() => setShowChannelSidebar(true)}
                                    className="md:hidden p-3 rounded-xl bg-gray-50 mb-4"
                                >
                                    <Menu size={24} className="text-gray-300" />
                                </button>
                                <MessageSquare size={64} className="mb-4 text-gray-200 hidden md:block" />
                                <p className="text-lg font-medium text-gray-300">{t('chat.title')}</p>
                                <p className="text-sm mt-1">{t('chat.noMessages')}</p>
                            </div>
                        )}
                    </div>

                    {/* Members Panel */}
                    {showMembers && activeChannelId && activeChannel && (
                        <MembersPanel
                            channelId={activeChannelId}
                            onlineUsers={onlineUsers}
                            onStartDM={handleStartDM}
                        />
                    )}
                </main>
            </div>

            {/* New DM Modal */}
            <AnimatePresence>
                {showNewDM && (
                    <NewDMModal onClose={() => setShowNewDM(false)} onSelect={handleNewDM} />
                )}
            </AnimatePresence>

            {/* Scroll to bottom FAB */}
            <AnimatePresence>
                {!isAtBottom && activeChannelId && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                            setIsAtBottom(true);
                        }}
                        className="fixed bottom-24 right-8 w-10 h-10 rounded-full bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/30 flex items-center justify-center hover:bg-[#2bb5b6] transition-colors z-10"
                    >
                        <ChevronDown size={20} />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Messages;
