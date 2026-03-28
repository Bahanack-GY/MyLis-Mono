import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    CalendarPlus,
    Search,
    Plus,
    X,
    Eye,
    Trash2,
    LayoutGrid,
    List,
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
    Building,
    User,
    Loader2,
    AlignLeft,
    Check,
    Download,
    MessageSquare,
} from 'lucide-react';
import logoSrc from '../../assets/logo-lis.png';
import { exportMeetingReportPdf, loadMeetingReportLogo } from '../../utils/exportMeetingReportPdf';
import { useMeetings, useCreateMeeting, useDeleteMeeting, useStartMeeting, useEndMeeting, useAttendMeeting } from '../../api/meetings/hooks';
import { MeetingsAdminSkeleton } from '../../components/Skeleton';
import { useDepartments } from '../../api/departments/hooks';
import { useEmployees } from '../../api/employees/hooks';
import { useDepartmentScope, useAuth } from '../../contexts/AuthContext';
import type { Meeting } from '../../api/meetings/types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

/* ─── Types ─────────────────────────────────────────────── */

type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type MeetingType = 'standup' | 'review' | 'planning' | 'retrospective' | 'client' | 'onboarding';

interface MeetingReport {
    summary: string;
    whatWasSaid?: string;
    decisions: string[];
    actionItems: { task: string; assignee: string; deadline?: string | null }[];
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
    organizerId: string;
    secretaryId: string | null;
    transcript: string | null;
    organizer: { name: string; avatar: string };
    secretary: { name: string } | null;
    participants: { id: string; name: string; avatar: string; attended: boolean }[];
    report: MeetingReport | null;
}

/* ─── Constants ─────────────────────────────────────────── */

const STATUS_COLORS: Record<MeetingStatus, string> = {
    scheduled: '#3b82f6',
    in_progress: '#f59e0b',
    completed: '#22c55e',
    cancelled: '#6b7280',
};

const TYPE_COLORS: Record<MeetingType, string> = {
    standup: '#33cbcc',
    review: '#3b82f6',
    planning: '#8b5cf6',
    retrospective: '#f59e0b',
    client: '#ec4899',
    onboarding: '#22c55e',
};

const TYPE_ICONS: Record<MeetingType, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
    standup: Users,
    review: ClipboardCheck,
    planning: CalendarPlus,
    retrospective: RotateCcw,
    client: Briefcase,
    onboarding: UserPlus,
};

const STATUSES: MeetingStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];
const TYPES: MeetingType[] = ['standup', 'review', 'planning', 'retrospective', 'client', 'onboarding'];


/* ─── Meeting Detail Modal ─────────────────────────────── */

const MeetingDetailModal = ({
    meeting,
    onClose,
    currentUserId,
    onStart,
    onEnd,
    onAttend,
}: {
    meeting: MeetingItem;
    onClose: () => void;
    currentUserId?: string;
    onStart?: (secretaryId: string) => void;
    onEnd?: () => void;
    onAttend?: () => void;
}) => {
    const { t } = useTranslation();
    const TypeIcon = TYPE_ICONS[meeting.type];
    const [selectedSecretaryId, setSelectedSecretaryId] = useState('');
    const [showTranscript, setShowTranscript] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    const isOrganizer = currentUserId === meeting.organizerId;

    const handleExportPdf = async () => {
        setExportingPdf(true);
        try {
            const logo = await loadMeetingReportLogo(logoSrc).catch(() => undefined);
            exportMeetingReportPdf({
                id: meeting.id,
                title: meeting.title,
                type: meeting.type,
                status: meeting.status,
                date: meeting.date,
                startTime: meeting.startTime,
                endTime: meeting.endTime,
                location: meeting.location,
                organizer: { name: meeting.organizer.name },
                secretary: meeting.secretary,
                participants: meeting.participants.map(p => ({ name: p.name, attended: p.attended })),
                transcript: meeting.transcript,
                report: meeting.report,
            }, logo);
        } finally {
            setExportingPdf(false);
        }
    };
    const myParticipant = meeting.participants.find(p => p.id === currentUserId);
    const alreadyAttended = myParticipant?.attended ?? false;
    const attendedCount = meeting.participants.filter(p => p.attended).length;

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
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15` }}>
                            <TypeIcon size={20} style={{ color: TYPE_COLORS[meeting.type] }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">{meeting.title}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15`, color: TYPE_COLORS[meeting.type] }}>
                                    {t(`meetings.types.${meeting.type}`)}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[meeting.status]}15`, color: STATUS_COLORS[meeting.status] }}>
                                    {t(`meetings.status.${meeting.status}`)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    {/* Meeting Info */}
                    <div className="grid grid-cols-2 gap-4">
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
                            <p className="text-sm font-medium text-gray-800">{meeting.location || '—'}</p>
                        </div>
                    </div>

                    {/* Organizer + Secretary */}
                    <div className="grid grid-cols-2 gap-4">
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
                        {meeting.secretary && (
                            <div>
                                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {t('meetings.detail.secretary')}
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full border border-gray-200 bg-[#33cbcc]/10 flex items-center justify-center">
                                        <ClipboardCheck size={14} className="text-[#33cbcc]" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-800">{meeting.secretary.name}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Participants + Attendance */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                                {t('meetings.detail.participants')} ({meeting.participants.length})
                            </div>
                            {meeting.status === 'in_progress' && (
                                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    {attendedCount}/{meeting.participants.length} {t('meetings.detail.attendance')}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {meeting.participants.map((p) => (
                                <div key={p.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 min-w-0 ${p.attended ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                                    {p.avatar ? (
                                        <img src={p.avatar} alt="" className="w-6 h-6 rounded-full border border-gray-200 shrink-0" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center shrink-0">
                                            <User size={10} className="text-gray-400" />
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-600 truncate">{p.name}</span>
                                    {p.attended && <Check size={11} className="text-emerald-500 shrink-0" />}
                                </div>
                            ))}
                            {meeting.participants.length === 0 && (
                                <span className="text-xs text-gray-400 italic">No participants</span>
                            )}
                        </div>
                    </div>

                    {/* Transcript */}
                    {meeting.transcript && (
                        <div>
                            <button
                                onClick={() => setShowTranscript(v => !v)}
                                className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 hover:text-gray-600 transition-colors"
                            >
                                <AlignLeft size={11} />
                                {t('meetings.detail.transcript')}
                                <span className="ml-1 text-gray-300">{showTranscript ? '▲' : '▼'}</span>
                            </button>
                            {showTranscript && (
                                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                                    {meeting.transcript}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Report */}
                    <div className="border-t border-gray-100 pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <FileText size={18} className="text-[#33cbcc]" />
                            <h3 className="text-base font-bold text-gray-800">{t('meetings.detail.report')}</h3>
                            {meeting.report && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            )}
                            {meeting.report && (
                                <button
                                    onClick={handleExportPdf}
                                    disabled={exportingPdf}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#33cbcc]/10 hover:bg-[#33cbcc]/20 text-[#33cbcc] rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                                >
                                    {exportingPdf ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                    {t('meetings.detail.exportPdf')}
                                </button>
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
                                {meeting.report.whatWasSaid && (
                                    <div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                            <MessageSquare size={11} />
                                            {t('meetings.detail.whatWasSaid')}
                                        </div>
                                        <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                            {meeting.report.whatWasSaid}
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t('meetings.detail.decisions')}</div>
                                    <div className="space-y-2">
                                        {meeting.report.decisions.map((d, i) => (
                                            <div key={i} className="flex items-start gap-2.5">
                                                <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
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
                                                    <p className="text-xs text-gray-400 mt-0.5">{ai.assignee}{ai.deadline ? ` — ${ai.deadline}` : ''}</p>
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

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 shrink-0 space-y-3">
                    {/* Secretary picker + Start button */}
                    {isOrganizer && meeting.status === 'scheduled' && onStart && (
                        <div className="flex gap-2">
                            <select
                                value={selectedSecretaryId}
                                onChange={e => setSelectedSecretaryId(e.target.value)}
                                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc]"
                            >
                                <option value="">{t('meetings.start.selectSecretary')}</option>
                                {meeting.participants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                disabled={!selectedSecretaryId}
                                onClick={() => { if (selectedSecretaryId) onStart(selectedSecretaryId); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors ${selectedSecretaryId ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20' : 'bg-gray-300 cursor-not-allowed'}`}
                            >
                                <ArrowRight size={14} />
                                {t('meetings.start.button')}
                            </button>
                        </div>
                    )}

                    {/* End Meeting button */}
                    {isOrganizer && meeting.status === 'in_progress' && onEnd && (
                        <button
                            onClick={onEnd}
                            className="w-full flex items-center justify-center gap-2 bg-red-500 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 transition-colors"
                        >
                            <X size={14} />
                            {t('meetings.end.button')}
                        </button>
                    )}

                    {/* Mark Present button */}
                    {!isOrganizer && meeting.status === 'in_progress' && onAttend && (
                        <button
                            disabled={alreadyAttended}
                            onClick={onAttend}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${alreadyAttended ? 'bg-emerald-50 text-emerald-600 cursor-default' : 'bg-[#33cbcc] text-white hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'}`}
                        >
                            <Check size={14} />
                            {alreadyAttended ? t('meetings.attend.attended') : t('meetings.attend.button')}
                        </button>
                    )}

                    <div className="flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                            {t('meetings.detail.close')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Schedule Meeting Modal ───────────────────────────── */

type ParticipantMode = 'individual' | 'department' | 'all';

const ScheduleMeetingModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const createMeeting = useCreateMeeting();
    const deptScope = useDepartmentScope();
    const { data: departments } = useDepartments();
    const { data: employees } = useEmployees(deptScope);

    const [form, setForm] = useState({
        title: '',
        description: '',
        type: '' as MeetingType | '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
    });

    const [participantMode, setParticipantMode] = useState<ParticipantMode>('individual');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [employeeSearch, setEmployeeSearch] = useState('');

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const allEmployees = employees || [];

    // When "All Employees" is selected, select all
    const handleSelectAll = () => {
        setParticipantMode('all');
        setSelectedEmployeeIds(new Set(allEmployees.map(e => e.id)));
    };

    // When a department is selected, select all its members
    const handleSelectDepartment = (deptId: string) => {
        setSelectedDeptId(deptId);
        setParticipantMode('department');
        const deptEmployees = allEmployees.filter(e => e.departmentId === deptId);
        setSelectedEmployeeIds(new Set(deptEmployees.map(e => e.id)));
    };

    // Toggle individual employee
    const toggleEmployee = (empId: string) => {
        setParticipantMode('individual');
        setSelectedEmployeeIds(prev => {
            const next = new Set(prev);
            if (next.has(empId)) next.delete(empId);
            else next.add(empId);
            return next;
        });
    };

    const filteredEmployees = allEmployees.filter(e => {
        const name = `${e.firstName} ${e.lastName}`.toLowerCase();
        return name.includes(employeeSearch.toLowerCase());
    });

    const isValid = form.title.trim().length > 0 && form.type !== '' && form.date !== '';

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    const handleSubmit = () => {
        if (!isValid) return;
        createMeeting.mutate({
            title: form.title,
            description: form.description || undefined,
            type: form.type as MeetingType,
            date: form.date,
            startTime: form.startTime || undefined,
            endTime: form.endTime || undefined,
            location: form.location || undefined,
            participantIds: Array.from(selectedEmployeeIds),
        }, { onSuccess: () => onClose() });
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
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <CalendarPlus size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('meetings.schedule.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Title */}
                    <div>
                        <label className={labelCls}>
                            <Calendar size={12} />
                            {t('meetings.schedule.meetingTitle')}
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={t('meetings.schedule.titlePlaceholder')}
                            className={inputCls}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}>
                            <AlignLeft size={12} />
                            {t('meetings.schedule.description')}
                        </label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder={t('meetings.schedule.descriptionPlaceholder')}
                            rows={2}
                            className={inputCls + ' resize-none'}
                        />
                    </div>

                    {/* Type */}
                    <div>
                        <label className={labelCls}>
                            {t('meetings.schedule.type')}
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {TYPES.map(tp => {
                                const TpIcon = TYPE_ICONS[tp];
                                return (
                                    <button
                                        key={tp}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, type: tp }))}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                            form.type === tp
                                                ? 'text-white shadow-lg'
                                                : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                        }`}
                                        style={form.type === tp ? { backgroundColor: TYPE_COLORS[tp], boxShadow: `0 4px 14px ${TYPE_COLORS[tp]}33` } : {}}
                                    >
                                        <TpIcon size={14} />
                                        {t(`meetings.types.${tp}`)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Date + Times */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>
                                <CalendarDays size={12} />
                                {t('meetings.schedule.date')}
                            </label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Clock size={12} />
                                {t('meetings.schedule.startTime')}
                            </label>
                            <input
                                type="time"
                                value={form.startTime}
                                onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Clock size={12} />
                                {t('meetings.schedule.endTime')}
                            </label>
                            <input
                                type="time"
                                value={form.endTime}
                                onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className={labelCls}>
                            <MapPin size={12} />
                            {t('meetings.schedule.location')}
                        </label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                            placeholder={t('meetings.schedule.locationPlaceholder')}
                            className={inputCls}
                        />
                    </div>

                    {/* ── Participants Section ── */}
                    <div>
                        <label className={labelCls}>
                            <Users size={12} />
                            {t('meetings.schedule.participants')}
                            {selectedEmployeeIds.size > 0 && (
                                <span className="ml-1 text-[#33cbcc]">
                                    ({t('meetings.schedule.selectedCount', { count: selectedEmployeeIds.size })})
                                </span>
                            )}
                        </label>

                        {/* Quick-select buttons */}
                        <div className="flex gap-2 mb-3">
                            <button
                                type="button"
                                onClick={handleSelectAll}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                    participantMode === 'all'
                                        ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Users size={12} />
                                {t('meetings.schedule.allEmployees')}
                            </button>
                            <button
                                type="button"
                                onClick={() => setParticipantMode('department')}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                    participantMode === 'department'
                                        ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <Building size={12} />
                                {t('meetings.schedule.selectDepartment')}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setParticipantMode('individual'); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                    participantMode === 'individual'
                                        ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <User size={12} />
                                {t('meetings.schedule.selectIndividual')}
                            </button>
                        </div>

                        {/* Department selector (shown in department mode) */}
                        {participantMode === 'department' && (
                            <div className="mb-3">
                                <select
                                    value={selectedDeptId}
                                    onChange={e => handleSelectDepartment(e.target.value)}
                                    className={inputCls + ' appearance-none cursor-pointer'}
                                >
                                    <option value="">{t('meetings.schedule.selectDepartment')}</option>
                                    {(departments || []).map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Individual picker (shown in individual mode) */}
                        {participantMode === 'individual' && (
                            <div className="mb-2">
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={employeeSearch}
                                        onChange={e => setEmployeeSearch(e.target.value)}
                                        placeholder={t('meetings.schedule.participantsHint')}
                                        className={inputCls + ' pl-9'}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Employee list (individual or department mode) */}
                        {(participantMode === 'individual' || (participantMode === 'department' && selectedDeptId)) && (
                            <div className="bg-gray-50 rounded-xl max-h-40 overflow-y-auto">
                                {(participantMode === 'individual' ? filteredEmployees : allEmployees.filter(e => e.departmentId === selectedDeptId)).map(emp => (
                                    <button
                                        key={emp.id}
                                        type="button"
                                        onClick={() => toggleEmployee(emp.id)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white text-sm text-gray-700 transition-colors"
                                    >
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                            selectedEmployeeIds.has(emp.id)
                                                ? 'bg-[#33cbcc] border-[#33cbcc]'
                                                : 'border-gray-300'
                                        }`}>
                                            {selectedEmployeeIds.has(emp.id) && <Check size={12} className="text-white" />}
                                        </div>
                                        {emp.avatarUrl ? (
                                            <img src={emp.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                <User size={10} className="text-gray-400" />
                                            </div>
                                        )}
                                        <span className="flex-1 text-left truncate">{emp.firstName} {emp.lastName}</span>
                                        {emp.department && (
                                            <span className="text-[10px] text-gray-400">{emp.department.name}</span>
                                        )}
                                    </button>
                                ))}
                                {participantMode === 'department' && selectedDeptId && allEmployees.filter(e => e.departmentId === selectedDeptId).length === 0 && (
                                    <p className="text-xs text-gray-400 py-3 px-4">{t('meetings.schedule.noEmployeesInDept')}</p>
                                )}
                            </div>
                        )}

                        {/* Selected chips */}
                        {selectedEmployeeIds.size > 0 && participantMode !== 'individual' && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {allEmployees.filter(e => selectedEmployeeIds.has(e.id)).slice(0, 8).map(emp => (
                                    <span key={emp.id} className="flex items-center gap-1 bg-[#33cbcc]/10 text-[#33cbcc] text-[10px] font-medium px-2 py-1 rounded-full">
                                        {emp.firstName} {emp.lastName}
                                        <button type="button" onClick={() => toggleEmployee(emp.id)} className="hover:text-red-500">
                                            <X size={10} />
                                        </button>
                                    </span>
                                ))}
                                {selectedEmployeeIds.size > 8 && (
                                    <span className="text-[10px] text-gray-400 py-1 px-2">+{selectedEmployeeIds.size - 8}</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('meetings.schedule.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createMeeting.isPending}
                        onClick={handleSubmit}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {createMeeting.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {t('meetings.schedule.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Meetings = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<MeetingStatus | 'all'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

    const { user } = useAuth();
    const deptScope = useDepartmentScope();
    const { data: apiMeetings, isLoading } = useMeetings(deptScope);
    const deleteMeeting = useDeleteMeeting();
    const startMeeting = useStartMeeting();
    const endMeeting = useEndMeeting();
    const attendMeeting = useAttendMeeting();

    // Map API meetings to display shape
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
        organizerId: m.organizerId || '',
        secretaryId: m.secretaryId ?? null,
        transcript: m.transcript ?? null,
        organizer: {
            name: m.organizer?.email || '',
            avatar: '',
        },
        secretary: m.secretary ? { name: `${m.secretary.firstName} ${m.secretary.lastName}` } : null,
        participants: (m.participants || []).map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            avatar: p.avatarUrl || '',
            attended: p.MeetingParticipant?.attended ?? false,
        })),
        report: m.report || null,
    }));

    const selectedMeeting = selectedMeetingId ? (meetings.find(m => m.id === selectedMeetingId) ?? null) : null;

    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartData = useMemo(() => {
        const counts: Record<number, number> = {};
        meetings.forEach(m => {
            if (!m.date) return;
            const month = new Date(m.date).getMonth();
            counts[month] = (counts[month] || 0) + 1;
        });
        const currentMonth = new Date().getMonth();
        const result: { month: string; meetings: number }[] = [];
        for (let i = 0; i <= currentMonth; i++) {
            result.push({ month: MONTH_LABELS[i], meetings: counts[i] || 0 });
        }
        return result;
    }, [meetings]);

    if (isLoading) {
        return <MeetingsAdminSkeleton />;
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
        { label: t('meetings.stats.scheduled'), value: scheduledCount, icon: CalendarPlus, color: '#3b82f6' },
        { label: t('meetings.stats.completed'), value: completedCount, icon: CheckCircle, color: '#22c55e' },
        { label: t('meetings.stats.reports'), value: reportsCount, icon: FileText, color: '#8b5cf6' },
    ];

    /* Status filters */
    const statusFilters: { key: MeetingStatus | 'all'; label: string }[] = [
        { key: 'all', label: t('meetings.filterAll') },
        ...STATUSES.map(s => ({ key: s as MeetingStatus, label: t(`meetings.status.${s}`) })),
    ];

    const handleDelete = (e: React.MouseEvent, meetingId: string) => {
        e.stopPropagation();
        if (window.confirm(t('meetings.confirmDelete'))) {
            deleteMeeting.mutate(meetingId);
        }
    };

    return (
        <div className="space-y-8">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">{t('meetings.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('meetings.subtitle')}</p>
                </div>
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                >
                    <CalendarPlus size={16} />
                    {t('meetings.scheduleMeeting')}
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
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform  duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Chart ── */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-white p-6 rounded-3xl border border-gray-100"
            >
                <h3 className="text-lg font-bold text-gray-800 mb-6">{t('meetings.chart.title')}</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#33cbcc" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#33cbcc" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="meetings" stroke="#33cbcc" strokeWidth={2} fill="url(#colorMeetings)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* ── Search + View Toggle ── */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('meetings.searchPlaceholder')}
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

            {/* ── Status Filters ── */}
            <div className="flex gap-2 flex-wrap">
                {statusFilters.map(sf => (
                    <button
                        key={sf.key}
                        onClick={() => setFilterStatus(sf.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                            filterStatus === sf.key
                                ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-white text-gray-600 border border-gray-100 hover:border-[#33cbcc]/30'
                        }`}
                    >
                        {sf.key !== 'all' && (
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: filterStatus === sf.key ? '#fff' : STATUS_COLORS[sf.key] }} />
                        )}
                        {sf.label}
                    </button>
                ))}
            </div>

            {/* ── Grid View ── */}
            {viewMode === 'grid' && filteredMeetings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMeetings.map((meeting, i) => {
                        const TypeIcon = TYPE_ICONS[meeting.type];
                        return (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 + i * 0.05 }}
                                className="bg-white rounded-3xl p-6 border border-gray-100 group hover:border-[#33cbcc]/30 transition-all cursor-pointer"
                                onClick={() => setSelectedMeetingId(meeting.id)}
                            >
                                {/* Icon + Actions */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15` }}>
                                        <TypeIcon size={22} style={{ color: TYPE_COLORS[meeting.type] }} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={e => { e.stopPropagation(); setSelectedMeetingId(meeting.id); }} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={e => handleDelete(e, meeting.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Title */}
                                <h3 className="font-medium text-gray-800 text-sm truncate mb-3">{meeting.title}</h3>

                                {/* Badges */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15`, color: TYPE_COLORS[meeting.type] }}>
                                        {t(`meetings.types.${meeting.type}`)}
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[meeting.status]}15`, color: STATUS_COLORS[meeting.status] }}>
                                        {t(`meetings.status.${meeting.status}`)}
                                    </span>
                                    {meeting.report && (
                                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                                            <FileText size={10} />
                                            Report
                                        </span>
                                    )}
                                </div>

                                {/* Date + Location */}
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
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                            <User size={10} className="text-gray-400" />
                                        </div>
                                        <span className="text-xs text-gray-500">{meeting.organizer.name.split('@')[0]}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
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

            {/* ── List View ── */}
            {viewMode === 'list' && filteredMeetings.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        <div className="col-span-3">{t('meetings.table.title')}</div>
                        <div className="col-span-2">{t('meetings.table.type')}</div>
                        <div className="col-span-1">{t('meetings.table.status')}</div>
                        <div className="col-span-1">{t('meetings.table.date')}</div>
                        <div className="col-span-2">{t('meetings.table.location')}</div>
                        <div className="col-span-2">{t('meetings.table.organizer')}</div>
                        <div className="col-span-1">{t('meetings.table.actions')}</div>
                    </div>
                    {/* Rows */}
                    {filteredMeetings.map((meeting, i) => {
                        const TypeIcon = TYPE_ICONS[meeting.type];
                        return (
                            <motion.div
                                key={meeting.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="grid grid-cols-12 gap-4 px-6 py-4 border-t border-gray-100 items-center group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedMeetingId(meeting.id)}
                            >
                                {/* Title */}
                                <div className="col-span-3 flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15` }}>
                                        <TypeIcon size={16} style={{ color: TYPE_COLORS[meeting.type] }} />
                                    </div>
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium text-gray-800 truncate block">{meeting.title}</span>
                                        {meeting.report && <span className="text-[9px] text-emerald-500 font-medium flex items-center gap-0.5"><FileText size={8} /> Report</span>}
                                    </div>
                                </div>
                                {/* Type */}
                                <div className="col-span-2">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${TYPE_COLORS[meeting.type]}15`, color: TYPE_COLORS[meeting.type] }}>
                                        {t(`meetings.types.${meeting.type}`)}
                                    </span>
                                </div>
                                {/* Status */}
                                <div className="col-span-1">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${STATUS_COLORS[meeting.status]}15`, color: STATUS_COLORS[meeting.status] }}>
                                        {t(`meetings.status.${meeting.status}`)}
                                    </span>
                                </div>
                                {/* Date */}
                                <div className="col-span-1 text-xs text-gray-500">{meeting.date}</div>
                                {/* Location */}
                                <div className="col-span-2 flex items-center gap-1.5 text-xs text-gray-500">
                                    <MapPin size={12} />
                                    <span className="truncate">{meeting.location || '—'}</span>
                                </div>
                                {/* Organizer */}
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center">
                                        <User size={12} className="text-gray-400" />
                                    </div>
                                    <span className="text-xs text-gray-500 truncate">{meeting.organizer.name.split('@')[0]}</span>
                                </div>
                                {/* Actions */}
                                <div className="col-span-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={e => { e.stopPropagation(); setSelectedMeetingId(meeting.id); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                        <Eye size={14} />
                                    </button>
                                    <button onClick={e => handleDelete(e, meeting.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-rose-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* ── Empty State ── */}
            {filteredMeetings.length === 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                    <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-400 font-medium">{t('meetings.noResults')}</p>
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-xl hover:bg-[#2bb5b6] transition-colors"
                    >
                        {t('meetings.scheduleMeeting')}
                    </button>
                </div>
            )}

            {/* ── Modals ── */}
            <AnimatePresence>
                {showScheduleModal && (
                    <ScheduleMeetingModal onClose={() => setShowScheduleModal(false)} />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {selectedMeeting && (
                    <MeetingDetailModal
                        meeting={selectedMeeting}
                        onClose={() => setSelectedMeetingId(null)}
                        currentUserId={user?.userId}
                        onStart={(secretaryId) => {
                            startMeeting.mutate({ id: selectedMeeting.id, secretaryId }, {
                                onSuccess: () => setSelectedMeetingId(null),
                            });
                        }}
                        onEnd={() => {
                            endMeeting.mutate(selectedMeeting.id, {
                                onSuccess: () => setSelectedMeetingId(null),
                            });
                        }}
                        onAttend={() => {
                            attendMeeting.mutate(selectedMeeting.id, {
                                onSuccess: () => setSelectedMeetingId(null),
                            });
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Meetings;
