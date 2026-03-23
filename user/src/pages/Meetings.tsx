import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    CalendarPlus,
    Search,
    X,
    Eye,
    Users,
    ClipboardCheck,
    RotateCcw,
    Briefcase,
    UserPlus,
    MapPin,
    Clock,
    FileText,
    CheckCircle,
    ArrowRight,
    CalendarDays,
    User,
} from 'lucide-react';
import { useMeetings } from '../api/meetings/hooks';
import type { Meeting } from '../api/meetings/types';
import { UserMeetingsSkeleton } from '../components/Skeleton';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type MeetingType = 'standup' | 'review' | 'planning' | 'retrospective' | 'client' | 'onboarding';

interface MeetingReport {
    summary: string;
    decisions: string[];
    actionItems: { task: string; assignee: string }[];
}

interface MeetingItem {
    id: string;
    title: string;
    description: string;
    type: MeetingType;
    status: MeetingStatus;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    organizer: { name: string; avatar: string };
    participants: { id: string; name: string; avatar: string }[];
    report: MeetingReport | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<MeetingStatus, string> = {
    scheduled: 'bg-[#283852]/10 text-[#283852]',
    in_progress: 'bg-[#33cbcc]/10 text-[#33cbcc]',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-gray-100 text-gray-500',
};

const TYPE_ICONS: Record<MeetingType, React.ComponentType<{ size?: number; className?: string }>> = {
    standup: Users,
    review: ClipboardCheck,
    planning: CalendarPlus,
    retrospective: RotateCcw,
    client: Briefcase,
    onboarding: UserPlus,
};

const STATUSES: MeetingStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

/* ------------------------------------------------------------------ */
/*  Meeting Detail Modal (view-only)                                   */
/* ------------------------------------------------------------------ */

const MeetingDetailModal = ({ meeting, onClose }: { meeting: MeetingItem; onClose: () => void }) => {
    const { t } = useTranslation();
    const TypeIcon = TYPE_ICONS[meeting.type];

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-5 py-4 md:px-6 md:py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#283852]/10 flex items-center justify-center shrink-0">
                            <TypeIcon size={20} className="text-[#283852]" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-800 truncate">{meeting.title}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                    {t(`meetings.types.${meeting.type}`)}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[meeting.status]}`}>
                                    {t(`meetings.status.${meeting.status}`)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 md:p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Meeting Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                <CalendarDays size={12} />
                                {t('meetings.detail.dateTime')}
                            </div>
                            <p className="text-sm font-medium text-gray-800">{meeting.date}</p>
                            <p className="text-xs text-gray-500">{meeting.startTime} – {meeting.endTime}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                <MapPin size={12} />
                                {t('meetings.detail.location')}
                            </div>
                            <p className="text-sm font-medium text-gray-800">{meeting.location || '--'}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {meeting.description && (
                        <div>
                            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                {t('meetings.detail.description')}
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{meeting.description}</p>
                        </div>
                    )}

                    {/* Organizer */}
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('meetings.detail.organizer')}
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                <User size={14} className="text-gray-400" />
                            </div>
                            <span className="text-sm font-medium text-gray-800">{meeting.organizer.name}</span>
                        </div>
                    </div>

                    {/* Participants */}
                    <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                            {t('meetings.detail.participants')} ({meeting.participants.length})
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {meeting.participants.map((p) => (
                                <div key={p.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
                                    {p.avatar ? (
                                        <img src={p.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                            <User size={10} className="text-gray-400" />
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-600">{p.name}</span>
                                </div>
                            ))}
                            {meeting.participants.length === 0 && (
                                <span className="text-xs text-gray-400 italic">{t('meetings.detail.noParticipants')}</span>
                            )}
                        </div>
                    </div>

                    {/* Report */}
                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={18} className="text-[#33cbcc]" />
                            <h3 className="text-base font-bold text-gray-800">{t('meetings.detail.report')}</h3>
                            {meeting.report && (
                                <span className="w-2 h-2 rounded-full bg-[#33cbcc]" />
                            )}
                        </div>

                        {meeting.report ? (
                            <div className="space-y-5">
                                <div>
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('meetings.detail.summary')}</div>
                                    <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed">
                                        {meeting.report.summary}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('meetings.detail.decisions')}</div>
                                    <div className="space-y-2">
                                        {meeting.report.decisions.map((d, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <CheckCircle size={16} className="text-[#33cbcc] shrink-0 mt-0.5" />
                                                <span className="text-sm text-gray-700">{d}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('meetings.detail.actionItems')}</div>
                                    <div className="space-y-2">
                                        {meeting.report.actionItems.map((ai, i) => (
                                            <div key={i} className="flex items-start gap-2.5 bg-[#33cbcc]/5 rounded-xl px-4 py-3">
                                                <ArrowRight size={14} className="text-[#33cbcc] shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-gray-700">{ai.task}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{ai.assignee}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-8 text-center">
                                <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-sm text-gray-400">{t('meetings.detail.reportPending')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - close only, no edit/delete */}
                <div className="px-5 py-4 md:px-6 border-t border-gray-100 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('meetings.detail.close')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ------------------------------------------------------------------ */
/*  Meetings Page (employee - view only)                               */
/* ------------------------------------------------------------------ */

const Meetings = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<MeetingStatus | 'all'>('all');
    const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);

    const { data: apiMeetings, isLoading } = useMeetings();

    /* Map API meetings to display shape */
    const meetings: MeetingItem[] = (apiMeetings || []).map((m: Meeting) => ({
        id: m.id,
        title: m.title,
        description: m.description || '',
        type: (m.type || 'standup') as MeetingType,
        status: (m.status || 'scheduled') as MeetingStatus,
        date: m.date,
        startTime: m.startTime || '',
        endTime: m.endTime || '',
        location: m.location || '',
        organizer: {
            name: m.organizer?.email || '',
            avatar: '',
        },
        participants: (m.participants || []).map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            avatar: p.avatarUrl || '',
        })),
        report: m.report || null,
    }));

    /* Loading */
    if (isLoading) {
        return <UserMeetingsSkeleton />;
    }

    /* Filtered meetings */
    const filteredMeetings = meetings.filter(m => {
        const matchesSearch =
            m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.organizer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.location.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    /* Stats */
    const scheduledCount = meetings.filter(m => m.status === 'scheduled').length;
    const completedCount = meetings.filter(m => m.status === 'completed').length;
    const reportsCount = meetings.filter(m => m.report !== null).length;

    const stats = [
        { label: t('meetings.stats.total'), value: meetings.length, icon: Calendar, color: '#33cbcc' },
        { label: t('meetings.stats.scheduled'), value: scheduledCount, icon: CalendarPlus, color: '#283852' },
        { label: t('meetings.stats.completed'), value: completedCount, icon: CheckCircle, color: '#33cbcc' },
        { label: t('meetings.stats.reports'), value: reportsCount, icon: FileText, color: '#283852' },
    ];

    /* Status filters */
    const statusFilters: { key: MeetingStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('meetings.filterAll') },
        ...STATUSES.map(s => ({ key: s as MeetingStatus, label: t(`meetings.status.${s}`) })),
    ];

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header - no action button (employee view-only) */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{t('meetings.title')}</h1>
                <p className="text-gray-500 mt-1 text-sm md:text-base">{t('meetings.subtitle')}</p>
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

            {/* Search bar */}
            <div className="bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                <Search className="text-gray-400 ml-3" size={20} />
                <input
                    type="text"
                    placeholder={t('meetings.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-700 placeholder-gray-400 px-3 text-sm"
                />
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap">
                {statusFilters.map(sf => (
                    <button
                        key={sf.key}
                        onClick={() => setFilterStatus(sf.key)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors ${
                            filterStatus === sf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {sf.label}
                    </button>
                ))}
            </div>

            {/* Meeting cards grid - 1-col mobile / 2-col tablet / 3-col desktop */}
            {filteredMeetings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {filteredMeetings.map((meeting, i) => {
                        const TypeIcon = TYPE_ICONS[meeting.type];
                        return (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all cursor-pointer"
                                onClick={() => setSelectedMeeting(meeting)}
                            >
                                {/* Icon + View action */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                                        <TypeIcon size={20} className="text-[#283852]" />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={e => { e.stopPropagation(); setSelectedMeeting(meeting); }}
                                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="font-medium text-gray-800 text-sm truncate mb-3">{meeting.title}</h3>

                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#283852]/10 text-[#283852]">
                                        {t(`meetings.types.${meeting.type}`)}
                                    </span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[meeting.status]}`}>
                                        {t(`meetings.status.${meeting.status}`)}
                                    </span>
                                    {meeting.report && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#33cbcc]/10 text-[#33cbcc]">
                                            <FileText size={10} />
                                            {t('meetings.detail.report')}
                                        </span>
                                    )}
                                </div>

                                {/* Date + Time */}
                                <div className="flex items-center gap-3 text-xs text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <CalendarDays size={12} />
                                        {meeting.date}
                                    </span>
                                    {meeting.startTime && (
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {meeting.startTime}
                                        </span>
                                    )}
                                </div>

                                {/* Organizer + Participants */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                                            <User size={10} className="text-gray-400" />
                                        </div>
                                        <span className="text-xs text-gray-500 truncate">{meeting.organizer.name.split('@')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <div className="flex -space-x-2">
                                            {meeting.participants.slice(0, 3).map((p) => (
                                                p.avatar ? (
                                                    <img key={p.id} src={p.avatar} alt="" className="w-5 h-5 rounded-full border-2 border-white" />
                                                ) : (
                                                    <div key={p.id} className="w-5 h-5 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                                                        <User size={8} className="text-gray-400" />
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                        {meeting.participants.length > 3 && (
                                            <span className="text-[10px] text-gray-400 ml-1">+{meeting.participants.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {filteredMeetings.length === 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 p-12 text-center"
                >
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('meetings.noResults')}</p>
                </motion.div>
            )}

            {/* Meeting Detail Modal */}
            <AnimatePresence>
                {selectedMeeting && (
                    <MeetingDetailModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Meetings;
