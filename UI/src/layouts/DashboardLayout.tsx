import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cancel01Icon, PartyIcon, BirthdayCakeIcon, SparklesIcon, QuoteDownIcon, Clock01Icon } from 'hugeicons-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import MeetingRecordingPrompt from '../components/MeetingRecordingPrompt';
import MeetingPopupModal from '../components/MeetingPopupModal';
import PlatformChatButton from '../components/PlatformChatButton';
import { useHasRole } from '../hooks/useRoleAccess';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth/api';
import { employeesApi, type BirthdayEmployee } from '../api/employees/api';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';
import { getQuoteOfTheDay } from '../data/quotes';
import { useReminders } from '../api/reminders/hooks';
import type { Reminder } from '../api/reminders/api';

/* -- Reminder Popup --------------------------------------- */

const REMINDER_SESSION_KEY = 'reminders_popup_dismissed';

function daysUntil(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dateStr);
    due.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function urgencyColor(days: number): string {
    if (days < 0) return 'bg-red-100 text-red-700 border-red-200';
    if (days === 0) return 'bg-orange-100 text-orange-700 border-orange-200';
    if (days === 1) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    if (days <= 5) return 'bg-teal-100 text-teal-700 border-teal-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
}

function urgencyLabel(days: number, t: any): string {
    if (days < 0) return t('remindersPage.urgency.overdue', '{{days}}d overdue', { days: Math.abs(days) });
    if (days === 0) return t('remindersPage.urgency.today', 'Today');
    if (days === 1) return t('remindersPage.urgency.tomorrow', 'Tomorrow');
    return t('remindersPage.urgency.inDays', 'In {{days}} days', { days });
}

const ReminderPopup = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { data: reminders } = useReminders();
    const soundPlayedRef = useRef(false);

    const pending = (reminders || []).filter(
        (r: Reminder) => !r.isCompleted && daysUntil(r.dueDate) <= 10,
    ).sort((a: Reminder, b: Reminder) => daysUntil(a.dueDate) - daysUntil(b.dueDate));

    // Play a gentle chime when there are pending reminders
    useEffect(() => {
        if (pending.length === 0 || soundPlayedRef.current) return;
        soundPlayedRef.current = true;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const playNotes = () => {
                const playNote = (freq: number, start: number, dur: number) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, ctx.currentTime + start);
                    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
                    osc.start(ctx.currentTime + start);
                    osc.stop(ctx.currentTime + start + dur);
                };
                playNote(523, 0, 0.35);    // C5
                playNote(659, 0.18, 0.35); // E5
                playNote(784, 0.36, 0.55); // G5
                setTimeout(() => ctx.close(), 1500);
            };
            // resume() unblocks autoplay policy — plays only if browser allows
            ctx.resume().then(playNotes).catch(() => {});
        } catch {
            // AudioContext unavailable — silent degradation
        }
    }, [pending.length]);

    // Lock body scroll while open
    useEffect(() => {
        if (pending.length === 0) return;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, [pending.length]);

    // Keyboard dismiss
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (pending.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[190] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="reminder-modal-title"
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 24 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 bg-[#283852] text-white">
                    <div className="flex items-center gap-2">
                        <Clock01Icon size={16} />
                        <span id="reminder-modal-title" className="text-sm font-semibold">
                            {pending.length === 1
                                ? t('remindersPage.popup.single', '1 reminder coming up')
                                : t('remindersPage.popup.multiple', '{{count}} reminders coming up', { count: pending.length })}
                        </span>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                        <Cancel01Icon size={14} />
                    </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {pending.map((r: Reminder) => {
                        const days = daysUntil(r.dueDate);
                        return (
                            <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                                <span className={`mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${urgencyColor(days)}`}>
                                    {urgencyLabel(days, t)}
                                </span>
                                <p className="text-sm text-gray-800 font-medium leading-snug line-clamp-2">{r.title}</p>
                            </div>
                        );
                    })}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={() => { onClose(); navigate('/reminders'); }}
                        className="text-sm font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                    >
                        {t('remindersPage.popup.viewAll', 'View all reminders →')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* -- Welcome Modal ---------------------------------------- */

const WelcomeModal = ({ firstName, onClose }: { firstName: string; onClose: () => void }) => {
    useEffect(() => {
        const prev = document.activeElement as HTMLElement;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            prev?.focus();
        };
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-modal-title"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="bg-gradient-to-br from-[#33cbcc] to-[#2196F3] px-8 pt-10 pb-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" aria-hidden="true">
                        {[...Array(6)].map((_, i) => (
                            <SparklesIcon
                                key={i}
                                size={24}
                                className="absolute text-white animate-pulse"
                                style={{
                                    top: `${15 + (i * 15) % 70}%`,
                                    left: `${10 + (i * 20) % 80}%`,
                                    animationDelay: `${i * 0.3}s`,
                                }}
                            />
                        ))}
                    </div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        aria-hidden="true"
                    >
                        <PartyIcon size={40} className="text-white" />
                    </motion.div>
                    <h2 id="welcome-modal-title" className="text-2xl font-bold text-white mb-1">
                        Bienvenue {firstName} !
                    </h2>
                    <p className="text-white/80 text-sm">
                        Nous sommes ravis de vous avoir dans l'equipe
                    </p>
                </div>

                <div className="px-8 py-6 text-center">
                    <p className="text-gray-600 leading-relaxed mb-2">
                        Votre talent et votre energie vont faire toute la difference.
                        Nous croyons en vous et nous sommes convaincus que de grandes
                        choses vous attendent ici.
                    </p>
                    <p className="text-gray-500 text-sm mb-6">
                        N'hesitez pas a explorer l'application et a contacter
                        vos collegues si vous avez besoin d'aide.
                        Ensemble, nous allons accomplir de grandes choses !
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#33cbcc] to-[#2196F3] text-white font-semibold text-sm transition-shadow"
                    >
                        C'est parti !
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* -- Birthday Modal --------------------------------------- */

const BirthdayModal = ({ people, onClose }: { people: BirthdayEmployee[]; onClose: () => void }) => {
    const single = people.length === 1;

    useEffect(() => {
        const prev = document.activeElement as HTMLElement;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            prev?.focus();
        };
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="birthday-modal-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={e => e.stopPropagation()}
                className="bg-white border border-[#e5e8ef] max-w-sm w-full overflow-hidden"
            >
                {/* Accent top */}
                <div className="h-1 bg-[#33cbcc]" />

                {/* Header */}
                <div className="px-6 pt-8 pb-6 text-center relative">
                    <button
                        onClick={onClose}
                        aria-label="Fermer"
                        className="absolute top-4 right-4 text-[#b0bac9] hover:text-[#283852] transition-colors"
                    >
                        <Cancel01Icon size={18} aria-hidden="true" />
                    </button>

                    <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 20 }}
                        className="mb-4" aria-hidden="true"
                    >
                        <BirthdayCakeIcon size={36} className="text-[#33cbcc] mx-auto" />
                    </motion.div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#33cbcc] mb-1">
                        Aujourd'hui
                    </p>
                    <h2 id="birthday-modal-title" className="text-xl font-bold text-[#1c2b3a]">
                        Joyeux Anniversaire !
                    </h2>
                    <p className="text-xs text-[#8892a4] mt-1">
                        {single
                            ? "Un membre de l'équipe fête son anniversaire"
                            : "Des membres de l'équipe fêtent leur anniversaire"}
                    </p>
                </div>

                {/* People list */}
                <div className="divide-y divide-[#f0f2f5] border-t border-[#e5e8ef] max-h-52 overflow-y-auto">
                    {people.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-6 py-3">
                            <div
                                className="w-9 h-9 bg-[#283852] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                                aria-hidden="true"
                            >
                                {p.avatarUrl
                                    ? <img src={p.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    : `${p.firstName[0] || ''}${p.lastName[0] || ''}`
                                }
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#1c2b3a]">{p.firstName} {p.lastName}</p>
                                {p.departmentName && (
                                    <p className="text-xs text-[#8892a4]">{p.departmentName}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-5">
                    <p className="text-center text-xs text-[#8892a4] mb-4">
                        Souhaitez-{single ? 'lui' : 'leur'} un joyeux anniversaire !
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-sm font-semibold text-white bg-[#283852] hover:bg-[#1e2d42] transition-colors"
                    >
                        Super !
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* -- QuoteDownIcon Modal ------------------------------------------ */

const QUOTE_COUNTDOWN = 10;

const QuoteModal = ({ onClose }: { onClose: () => void }) => {
    const [seconds, setSeconds] = useState(QUOTE_COUNTDOWN);
    const quote = getQuoteOfTheDay();
    const canClose = seconds === 0;

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    useEffect(() => {
        if (seconds === 0) return;
        const id = setTimeout(() => setSeconds(s => s - 1), 1000);
        return () => clearTimeout(id);
    }, [seconds]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        >
            <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="quote-modal-title"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="bg-[#283852] px-8 pt-10 pb-8 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10" aria-hidden="true">
                        {[...Array(6)].map((_, i) => (
                            <SparklesIcon
                                key={i}
                                size={24}
                                className="absolute text-white animate-pulse"
                                style={{
                                    top: `${15 + (i * 15) % 70}%`,
                                    left: `${10 + (i * 20) % 80}%`,
                                    animationDelay: `${i * 0.3}s`,
                                }}
                            />
                        ))}
                    </div>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                        aria-hidden="true"
                    >
                        <QuoteDownIcon size={40} className="text-white" />
                    </motion.div>
                    <h2 id="quote-modal-title" className="text-lg font-bold text-white mb-1">
                        Citation du jour
                    </h2>
                    <p className="text-white/70 text-xs">Votre dose quotidienne de motivation</p>
                </div>

                <div className="px-8 py-6 text-center">
                    <blockquote className="text-gray-700 text-base leading-relaxed italic mb-4">
                        "{quote.text}"
                    </blockquote>
                    <p className="text-sm font-semibold text-[#283852] mb-6">— {quote.author}</p>

                    {/* Countdown progress bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
                        <motion.div
                            className="h-full bg-[#283852] rounded-full"
                            initial={{ width: '100%' }}
                            animate={{ width: '0%' }}
                            transition={{ duration: QUOTE_COUNTDOWN, ease: 'linear' }}
                        />
                    </div>

                    <button
                        onClick={onClose}
                        disabled={!canClose}
                        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                            canClose
                                ? 'bg-[#283852] text-white cursor-pointer'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {canClose ? 'Commencer la journée' : `Fermer dans ${seconds}s`}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* -- Dashboard Layout ------------------------------------- */

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user } = useAuth();
    const canUseAiChat = useHasRole(['CEO', 'MANAGER']);
    const [showWelcome, setShowWelcome] = useState(false);
    const [birthdayPeople, setBirthdayPeople] = useState<BirthdayEmployee[]>([]);
    const [showBirthday, setShowBirthday] = useState(false);
    const [showQuote, setShowQuote] = useState(false);
    const [showReminderPopup, setShowReminderPopup] = useState(false);

    // Browser notifications
    useBrowserNotifications();

    // Welcome modal: show on first login
    useEffect(() => {
        if (user?.firstLogin) {
            setShowWelcome(true);
        }
    }, [user?.firstLogin]);

    const handleWelcomeClose = () => {
        setShowWelcome(false);
        authApi.markFirstLoginDone().catch(() => {});
    };

    // Birthday modal: check once per day
    useEffect(() => {
        if (!user) return;
        const todayKey = `birthday_dismissed_${new Date().toISOString().split('T')[0]}`;
        if (localStorage.getItem(todayKey)) return;

        employeesApi.getTodayBirthdays().then(people => {
            if (people.length > 0) {
                setBirthdayPeople(people);
                setShowBirthday(true);
            }
        }).catch(() => {});
    }, [user]);

    const handleBirthdayClose = () => {
        setShowBirthday(false);
        const todayKey = `birthday_dismissed_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(todayKey, '1');
    };

    // QuoteDownIcon modal: show once per day for non-MANAGER roles
    useEffect(() => {
        if (!user) return;
        if (user.role === 'MANAGER') return;
        const todayKey = `quote_dismissed_${new Date().toISOString().split('T')[0]}`;
        if (localStorage.getItem(todayKey)) return;
        setShowQuote(true);
    }, [user]);

    const handleQuoteClose = () => {
        setShowQuote(false);
        const todayKey = `quote_dismissed_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(todayKey, '1');
    };

    // Reminder popup: show once per day (same pattern as birthday/quote modals)
    useEffect(() => {
        if (!user) return;
        const todayKey = `${REMINDER_SESSION_KEY}_${new Date().toISOString().split('T')[0]}`;
        if (localStorage.getItem(todayKey)) return;
        const timer = setTimeout(() => setShowReminderPopup(true), 3000);
        return () => clearTimeout(timer);
    }, [user]);

    const handleReminderPopupClose = () => {
        setShowReminderPopup(false);
        const todayKey = `${REMINDER_SESSION_KEY}_${new Date().toISOString().split('T')[0]}`;
        localStorage.setItem(todayKey, '1');
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header onMobileMenuOpen={() => setMobileMenuOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* Mobile bottom nav */}
            <div className="md:hidden">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showWelcome && user && (
                    <WelcomeModal
                        firstName={user.firstName || 'Collegue'}
                        onClose={handleWelcomeClose}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showBirthday && !showWelcome && birthdayPeople.length > 0 && (
                    <BirthdayModal
                        people={birthdayPeople}
                        onClose={handleBirthdayClose}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {showQuote && !showWelcome && !showBirthday && (
                    <QuoteModal onClose={handleQuoteClose} />
                )}
            </AnimatePresence>

            {/* Meeting Recording Prompt — floats for the designated secretary */}
            <MeetingRecordingPrompt />

            {/* Meeting Popup — invite & attendance modal for all participants */}
            <MeetingPopupModal />

            {/* AI Chat floating button — CEO and MANAGER only */}
            {canUseAiChat && <PlatformChatButton />}

            {/* Reminder popup — shows once per day, only when no other modal is open */}
            <AnimatePresence>
                {showReminderPopup && !showWelcome && !showBirthday && !showQuote && (
                    <ReminderPopup onClose={handleReminderPopupClose} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
