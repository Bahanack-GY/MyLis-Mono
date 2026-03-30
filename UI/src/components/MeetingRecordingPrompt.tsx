import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Upload, CheckCircle, X } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';
import { useUploadRecording } from '../api/meetings/hooks';
import { toast } from 'sonner';

type RecordingState = 'idle' | 'prompted' | 'recording' | 'uploading' | 'done';

const MeetingRecordingPrompt = () => {
    const { socket } = useSocket();
    const [state, setState] = useState<RecordingState>('idle');
    const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
    const [activeMeetingTitle, setActiveMeetingTitle] = useState<string>('');
    const [elapsed, setElapsed] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const pendingStopRef = useRef(false);
    const uploadRecording = useUploadRecording();

    useEffect(() => {
        const handleManualTrigger = (e: Event) => {
            const { meetingId, meetingTitle } = (e as CustomEvent).detail;
            setActiveMeetingId(meetingId);
            setActiveMeetingTitle(meetingTitle);
            setState('prompted');
        };
        window.addEventListener('meeting:manual-record', handleManualTrigger);
        return () => window.removeEventListener('meeting:manual-record', handleManualTrigger);
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleMeetingStarted = (data: { meetingId: string; meetingTitle: string }) => {
            setActiveMeetingId(data.meetingId);
            setActiveMeetingTitle(data.meetingTitle);
            setState('prompted');
        };

        const handleMeetingEnded = (data: { meetingId: string }) => {
            setActiveMeetingId(prev => {
                if (prev !== data.meetingId) return prev;
                // Auto-stop if recording, else dismiss
                if (mediaRecorderRef.current?.state === 'recording') {
                    pendingStopRef.current = true;
                    mediaRecorderRef.current.stop();
                } else {
                    setState('idle');
                }
                return prev;
            });
        };

        socket.on('meeting:started', handleMeetingStarted);
        socket.on('meeting:ended', handleMeetingEnded);

        return () => {
            socket.off('meeting:started', handleMeetingStarted);
            socket.off('meeting:ended', handleMeetingEnded);
        };
    }, [socket]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            chunksRef.current = [];
            pendingStopRef.current = false;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (timerRef.current) clearInterval(timerRef.current);
                stream.getTracks().forEach(t => t.stop());

                if (!activeMeetingId || chunksRef.current.length === 0) {
                    setState('idle');
                    return;
                }

                setState('uploading');
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                uploadRecording.mutate({ id: activeMeetingId, audioBlob }, {
                    onSuccess: () => {
                        setState('done');
                        setTimeout(() => {
                            setState('idle');
                            setActiveMeetingId(null);
                            setActiveMeetingTitle('');
                        }, 4000);
                    },
                    onError: () => {
                        toast.error('Failed to upload recording');
                        setState('idle');
                        setActiveMeetingId(null);
                    },
                });
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start(1000);
            setState('recording');

            setElapsed(0);
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        } catch {
            toast.error('Could not access microphone. Please allow microphone access.');
        }
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
    };

    const dismiss = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) clearInterval(timerRef.current);
        setState('idle');
        setActiveMeetingId(null);
        setActiveMeetingTitle('');
    };

    const formatElapsed = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <AnimatePresence>
            {state !== 'idle' && (
                <motion.div
                    initial={{ opacity: 0, y: 24, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 24, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-6 right-6 z-[150] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-80"
                >
                    {state === 'prompted' && (
                        <>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center shrink-0">
                                        <Mic size={20} className="text-[#33cbcc]" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">You're the Secretary</p>
                                        <p className="text-xs text-gray-500 truncate max-w-[160px]">{activeMeetingTitle}</p>
                                    </div>
                                </div>
                                <button onClick={dismiss} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0">
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                                The meeting has started. Record the session to generate automatic minutes.
                            </p>
                            <button
                                onClick={startRecording}
                                className="w-full flex items-center justify-center gap-2 bg-[#33cbcc] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                            >
                                <Mic size={15} />
                                Start Recording
                            </button>
                        </>
                    )}

                    {state === 'recording' && (
                        <>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-[#283852]/10 flex items-center justify-center shrink-0">
                                    <span className="w-3 h-3 rounded-full bg-[#283852] animate-pulse" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-800">Recording…</p>
                                    <p className="text-xs text-[#283852] font-mono tabular-nums">{formatElapsed(elapsed)}</p>
                                </div>
                                <div className="ml-auto">
                                    <p className="text-[10px] text-gray-400 text-right truncate max-w-[100px]">{activeMeetingTitle}</p>
                                </div>
                            </div>
                            <button
                                onClick={stopRecording}
                                className="w-full flex items-center justify-center gap-2 bg-[#283852] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#283852]/90 transition-colors"
                            >
                                <Square size={13} />
                                Stop & Upload
                            </button>
                        </>
                    )}

                    {state === 'uploading' && (
                        <div className="text-center py-3">
                            <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center mx-auto mb-3">
                                <Upload size={20} className="text-[#33cbcc] animate-bounce" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">Transcribing…</p>
                            <p className="text-xs text-gray-500 mt-1">Generating meeting minutes, please wait</p>
                        </div>
                    )}

                    {state === 'done' && (
                        <div className="text-center py-3">
                            <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center mx-auto mb-3">
                                <CheckCircle size={20} className="text-[#33cbcc]" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">Minutes Generated</p>
                            <p className="text-xs text-gray-500 mt-1">Report saved to the meeting record</p>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MeetingRecordingPrompt;
