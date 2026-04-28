import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, Calendar01Icon, Location01Icon, Clock01Icon, Tick01Icon, Loading02Icon } from 'hugeicons-react';
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

/* ── Started popup ──────────────────────────────────────────────── */

const StartedPopup = ({ event, onClose }: { event: StartedEvent; onClose: () => void }) => {
    const { user } = useAuth();
    const { data: meeting } = useMeeting(event.meetingId);
    const attendMeeting = useAttendMeeting();

    const serverAttended =
        meeting?.participants?.find((p: any) => p.id === user?.employeeId)
            ?.MeetingParticipant?.attended ?? false;

    const [attended, setAttended] = useState(serverAttended);
    useEffect(() => { setAttended(serverAttended); }, [serverAttended]);

    const handleAttend = () => {
        setAttended(true);
        attendMeeting.mutate(event.meetingId, {
            onSuccess: onClose,
            onError: () => setAttended(false),
        });
    };

    return (
        <>
            {/* Left accent — teal for "live" */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#33cbcc]" />

            <div className="pl-5 space-y-4">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] animate-pulse" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc]">En cours</p>
                    </div>
                    <p className="text-[11px] text-[#8892a4] mb-0.5">Réunion démarrée</p>
                    <h3 className="text-sm font-bold text-[#1c2b3a] leading-snug">{event.meetingTitle}</h3>
                </div>

                {attended ? (
                    <div className="flex items-center gap-2 border-l-2 border-[#33cbcc] pl-3 py-1">
                        <Tick01Icon size={13} className="text-[#33cbcc] shrink-0" />
                        <p className="text-xs font-medium text-[#33cbcc]">Présence déjà marquée</p>
                    </div>
                ) : (
                    <p className="text-xs text-[#8892a4]">La réunion a commencé. Marquez votre présence.</p>
                )}

                <div className="flex gap-2">
                    {!attended && (
                        <button
                            onClick={handleAttend}
                            disabled={attendMeeting.isPending}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-60 transition-colors"
                        >
                            {attendMeeting.isPending
                                ? <Loading02Icon size={13} className="animate-spin" />
                                : <Tick01Icon size={13} />}
                            Marquer présent
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`${attended ? 'flex-1' : ''} px-4 py-2.5 text-xs font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors`}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </>
    );
};

/* ── Invite popup ───────────────────────────────────────────────── */

const InvitePopup = ({ event, onClose }: { event: InviteEvent; onClose: () => void }) => (
    <>
        {/* Left accent — navy for invite */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#283852]" />

        <div className="pl-5 space-y-4">
            <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#283852] mb-1.5">Invitation</p>
                <p className="text-[11px] text-[#8892a4] mb-0.5">Vous avez été invité(e) à</p>
                <h3 className="text-sm font-bold text-[#1c2b3a] leading-snug">{event.meetingTitle}</h3>
            </div>

            {(event.date || event.location) && (
                <div className="space-y-1.5">
                    {event.date && (
                        <div className="flex items-center gap-2 text-xs text-[#8892a4]">
                            <Calendar01Icon size={12} className="text-[#b0bac9] shrink-0" />
                            <span>{event.date}</span>
                            {event.startTime && (
                                <>
                                    <Clock01Icon size={12} className="text-[#b0bac9] shrink-0" />
                                    <span>{event.startTime}</span>
                                </>
                            )}
                        </div>
                    )}
                    {event.location && (
                        <div className="flex items-center gap-2 text-xs text-[#8892a4]">
                            <Location01Icon size={12} className="text-[#b0bac9] shrink-0" />
                            <span>{event.location}</span>
                        </div>
                    )}
                </div>
            )}

            <button
                onClick={onClose}
                className="w-full py-2.5 text-xs font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors"
            >
                OK, compris !
            </button>
        </div>
    </>
);

/* ── Main component ─────────────────────────────────────────────── */

const MeetingPopupModal = () => {
    const { socket } = useSocket();
    const [queue, setQueue] = useState<QueuedEvent[]>([]);
    const [current, setCurrent] = useState<QueuedEvent | null>(null);

    const dismiss = useCallback(() => {
        setCurrent(null);
        setQueue(prev => {
            const next = prev.slice(1);
            if (next.length > 0) setTimeout(() => setCurrent(next[0]), 300);
            return next;
        });
    }, []);

    const push = useCallback((event: QueuedEvent) => {
        setQueue(prev => {
            const next = [...prev, event];
            if (prev.length === 0) setCurrent(event);
            return next;
        });
    }, []);

    useEffect(() => {
        if (!socket) return;
        const onInvite = (data: { meetingId: string; meetingTitle: string; date?: string; startTime?: string; location?: string }) =>
            push({ kind: 'invite', ...data });
        const onStarted = (data: { meetingId: string; meetingTitle: string }) =>
            push({ kind: 'started', ...data });
        socket.on('meeting:invite', onInvite);
        socket.on('meeting:started', onStarted);
        return () => { socket.off('meeting:invite', onInvite); socket.off('meeting:started', onStarted); };
    }, [socket, push]);

    return (
        <AnimatePresence>
            {current && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/25 z-[200]"
                        onClick={dismiss}
                    />

                    <motion.div
                        key={`${current.kind}-${current.meetingId}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 16 }}
                        transition={{ type: 'tween', duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="bg-white border border-[#e5e8ef] w-full max-w-xs p-5 pointer-events-auto relative overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Queue dots — top right */}
                            {queue.length > 1 && (
                                <div className="absolute top-3 right-10 flex gap-1">
                                    {queue.map((_, i) => (
                                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-[#33cbcc]' : 'bg-[#e5e8ef]'}`} />
                                    ))}
                                </div>
                            )}

                            {/* Close */}
                            <button
                                onClick={dismiss}
                                className="absolute top-3 right-3 text-[#b0bac9] hover:text-[#283852] transition-colors"
                            >
                                <Cancel01Icon size={16} />
                            </button>

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
