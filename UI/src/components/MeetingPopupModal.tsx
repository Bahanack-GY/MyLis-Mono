import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, MapPin, Clock, CheckCircle, Users, Bell } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useMeeting, useAttendMeeting } from '../api/meetings/hooks';

/* ── Types ─────────────────────────────────────────────────────── */

interface InviteEvent {
    kind: 'invite';
    meetingId: string;
    meetingTitle: string;
    date?: string;
    startTime?: string;
    location?: string;
}

interface StartedEvent {
    kind: 'started';
    meetingId: string;
    meetingTitle: string;
}

type QueuedEvent = InviteEvent | StartedEvent;

/* ── Started popup (fetches meeting for attendance check) ───────── */

const StartedPopup = ({
    event,
    onClose,
}: {
    event: StartedEvent;
    onClose: () => void;
}) => {
    const { user } = useAuth();
    const { data: meeting } = useMeeting(event.meetingId);
    const attendMeeting = useAttendMeeting();

    const serverAttended =
        meeting?.participants?.find((p: any) => p.id === user?.employeeId)
            ?.MeetingParticipant?.attended ?? false;

    const [attended, setAttended] = useState(serverAttended);

    // Sync if server data loads after mount
    useEffect(() => { setAttended(serverAttended); }, [serverAttended]);

    const handleAttend = () => {
        setAttended(true); // optimistic
        attendMeeting.mutate(event.meetingId, {
            onSuccess: onClose,
            onError: () => setAttended(false), // revert on failure
        });
    };

    return (
        <div className="space-y-4">
            {/* Badge */}
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#33cbcc]/15 text-[#33cbcc]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] animate-pulse" />
                    En cours
                </span>
            </div>

            {/* Title */}
            <div>
                <p className="text-xs font-medium text-gray-400 mb-1">Réunion démarrée</p>
                <h3 className="text-base font-bold text-gray-800 leading-snug">{event.meetingTitle}</h3>
            </div>

            {/* Message */}
            {attended ? (
                <div className="flex items-center gap-2 bg-[#33cbcc]/10 rounded-xl px-4 py-3">
                    <CheckCircle size={16} className="text-[#33cbcc] shrink-0" />
                    <p className="text-sm font-medium text-[#33cbcc]">Vous avez déjà marqué votre présence</p>
                </div>
            ) : (
                <p className="text-sm text-gray-500">
                    La réunion a commencé. Marquez votre présence dès maintenant.
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
                {!attended && (
                    <button
                        onClick={handleAttend}
                        disabled={attendMeeting.isPending}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            attendMeeting.isPending
                                ? 'bg-[#33cbcc]/50 text-white cursor-not-allowed'
                                : 'bg-[#33cbcc] text-white hover:bg-[#2bb5b6] shadow-md shadow-[#33cbcc]/20'
                        }`}
                    >
                        <CheckCircle size={15} className={attendMeeting.isPending ? 'animate-pulse' : ''} />
                        {attendMeeting.isPending ? '...' : 'Marquer présent'}
                    </button>
                )}
                <button
                    onClick={onClose}
                    className={`${attended ? 'flex-1' : ''} px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors`}
                >
                    Fermer
                </button>
            </div>
        </div>
    );
};

/* ── Invite popup ───────────────────────────────────────────────── */

const InvitePopup = ({
    event,
    onClose,
}: {
    event: InviteEvent;
    onClose: () => void;
}) => (
    <div className="space-y-4">
        {/* Badge */}
        <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#283852]/10 text-[#283852]">
                <Bell size={10} />
                Invitation
            </span>
        </div>

        {/* Title */}
        <div>
            <p className="text-xs font-medium text-gray-400 mb-1">Vous avez été invité(e) à</p>
            <h3 className="text-base font-bold text-gray-800 leading-snug">{event.meetingTitle}</h3>
        </div>

        {/* Details */}
        <div className="space-y-2">
            {event.date && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar size={14} className="text-gray-400 shrink-0" />
                    <span>{event.date}</span>
                    {event.startTime && (
                        <>
                            <Clock size={14} className="text-gray-400 shrink-0 ml-1" />
                            <span>{event.startTime}</span>
                        </>
                    )}
                </div>
            )}
            {event.location && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <span>{event.location}</span>
                </div>
            )}
        </div>

        {/* Action */}
        <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#283852] text-white hover:bg-[#283852]/80 transition-colors shadow-md shadow-[#283852]/20"
        >
            OK, compris !
        </button>
    </div>
);

/* ── Main component ─────────────────────────────────────────────── */

const MeetingPopupModal = () => {
    const { socket } = useSocket();
    const [queue, setQueue] = useState<QueuedEvent[]>([]);
    const [current, setCurrent] = useState<QueuedEvent | null>(null);

    /* Advance to next item in queue */
    const dismiss = useCallback(() => {
        setCurrent(null);
        setQueue(prev => {
            const next = prev.slice(1);
            if (next.length > 0) {
                // Small delay so exit animation finishes before next appears
                setTimeout(() => setCurrent(next[0]), 350);
            }
            return next;
        });
    }, []);

    /* Push new event to queue; show immediately if nothing is showing */
    const push = useCallback((event: QueuedEvent) => {
        setQueue(prev => {
            const next = [...prev, event];
            if (prev.length === 0) {
                setCurrent(event);
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (!socket) return;

        const onInvite = (data: { meetingId: string; meetingTitle: string; date?: string; startTime?: string; location?: string }) => {
            push({ kind: 'invite', ...data });
        };

        const onStarted = (data: { meetingId: string; meetingTitle: string }) => {
            push({ kind: 'started', ...data });
        };

        socket.on('meeting:invite', onInvite);
        socket.on('meeting:started', onStarted);
        return () => {
            socket.off('meeting:invite', onInvite);
            socket.off('meeting:started', onStarted);
        };
    }, [socket, push]);

    return (
        <AnimatePresence>
            {current && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
                        onClick={dismiss}
                    />

                    {/* Card */}
                    <motion.div
                        key={`${current.kind}-${current.meetingId}`}
                        initial={{ opacity: 0, scale: 0.92, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 24 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 pointer-events-auto relative"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Icon header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                    current.kind === 'started' ? 'bg-[#33cbcc]/10' : 'bg-[#283852]/10'
                                }`}>
                                    {current.kind === 'started'
                                        ? <Users size={20} className="text-[#33cbcc]" />
                                        : <Calendar size={20} className="text-[#283852]" />
                                    }
                                </div>
                                <button
                                    onClick={dismiss}
                                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Queue indicator */}
                            {queue.length > 1 && (
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
                                    {queue.map((_, i) => (
                                        <span
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === 0 ? 'bg-[#33cbcc]' : 'bg-gray-200'}`}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Content */}
                            {current.kind === 'started'
                                ? <StartedPopup event={current} onClose={dismiss} />
                                : <InvitePopup event={current} onClose={dismiss} />
                            }
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MeetingPopupModal;
