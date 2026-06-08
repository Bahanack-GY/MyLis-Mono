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

const StartedPopup = ({ event, onClose, queueCount }: { event: StartedEvent; onClose: () => void; queueCount: number }) => {
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
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <div className="flex items-center gap-2 mb-1">
  <span className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] animate-pulse" />
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#33cbcc]">En cours</p>
  {queueCount > 1 && (
  <div className="flex gap-1 ml-2">
  {Array.from({ length: queueCount }).map((_, i) => (
  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-[#33cbcc]' : 'bg-[#e5e8ef]'}`} />
  ))}
  </div>
  )}
  </div>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">{event.meetingTitle}</h2>
  </div>
  <button onClick={onClose} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} />
  </button>
  </div>

  {/* Body */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  <p className="text-[11px] text-[#8892a4]">Réunion démarrée</p>

  {attended ? (
  <div className="flex items-center gap-2 border-l-2 border-[#33cbcc] pl-3 py-1">
  <Tick01Icon size={13} className="text-[#33cbcc] shrink-0" />
  <p className="text-xs font-medium text-[#33cbcc]">Présence déjà marquée</p>
  </div>
  ) : (
  <p className="text-xs text-[#8892a4]">La réunion a commencé. Marquez votre présence.</p>
  )}
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  {!attended && (
  <button
  onClick={handleAttend}
  disabled={attendMeeting.isPending}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-60 transition-colors"
  >
  {attendMeeting.isPending
  ? <Loading02Icon size={14} className="animate-spin" />
  : <Tick01Icon size={14} />}
  Marquer présent
  </button>
  )}
  <button
  onClick={onClose}
  className={`${attended ? 'flex-1' : ''} px-4 py-3 text-sm font-semibold text-[#8892a4] border border-[#e5e8ef] hover:border-[#283852] hover:text-[#283852] transition-colors`}
  >
  Fermer
  </button>
  </div>
  </>
  );
};

/* ── Invite popup ───────────────────────────────────────────────── */

const InvitePopup = ({ event, onClose, queueCount }: { event: InviteEvent; onClose: () => void; queueCount: number }) => (
  <>
  {/* Header */}
  <div className="px-6 py-5 border-b border-[#e5e8ef] flex items-center justify-between shrink-0">
  <div>
  <div className="flex items-center gap-2 mb-0.5">
  <p className="text-[10px] font-bold uppercase tracking-widest text-[#283852]">Invitation</p>
  {queueCount > 1 && (
  <div className="flex gap-1 ml-2">
  {Array.from({ length: queueCount }).map((_, i) => (
  <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-[#33cbcc]' : 'bg-[#e5e8ef]'}`} />
  ))}
  </div>
  )}
  </div>
  <h2 className="text-lg font-bold text-[#1c2b3a] leading-none">{event.meetingTitle}</h2>
  </div>
  <button onClick={onClose} className="p-2 text-[#b0bac9] hover:text-[#283852] transition-colors">
  <Cancel01Icon size={20} />
  </button>
  </div>

  {/* Body */}
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
  <p className="text-[11px] text-[#8892a4]">Vous avez été invité(e) à cette réunion</p>

  {(event.date || event.location) && (
  <div className="space-y-2">
  {event.date && (
  <div className="flex items-center gap-2 text-xs text-[#8892a4]">
  <Calendar01Icon size={13} className="text-[#b0bac9] shrink-0" />
  <span>{event.date}</span>
  {event.startTime && (
  <>
  <Clock01Icon size={13} className="text-[#b0bac9] shrink-0" />
  <span>{event.startTime}</span>
  </>
  )}
  </div>
  )}
  {event.location && (
  <div className="flex items-center gap-2 text-xs text-[#8892a4]">
  <Location01Icon size={13} className="text-[#b0bac9] shrink-0" />
  <span>{event.location}</span>
  </div>
  )}
  </div>
  )}
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-[#e5e8ef] flex gap-3 shrink-0">
  <button
  onClick={onClose}
  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors"
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
  <motion.div
  key="backdrop"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 flex justify-end bg-black/30"
  onClick={dismiss}
  >
  <motion.div
  key={`${current.kind}-${current.meetingId}`}
  initial={{ x: '100%' }}
  animate={{ x: 0 }}
  exit={{ x: '100%' }}
  transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
  onClick={e => e.stopPropagation()}
  className="bg-white w-full max-w-sm h-full flex flex-col border-l border-[#e5e8ef]"
  >
  {current.kind === 'started'
  ? <StartedPopup event={current} onClose={dismiss} queueCount={queue.length} />
  : <InvitePopup event={current} onClose={dismiss} queueCount={queue.length} />
  }
  </motion.div>
  </motion.div>
  )}
  </AnimatePresence>
  );
};

export default MeetingPopupModal;
