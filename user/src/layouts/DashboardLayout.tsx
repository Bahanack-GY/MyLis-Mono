import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PartyPopper, Cake, Sparkles } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth/api';
import { employeesApi, type BirthdayEmployee } from '../api/employees/api';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';

/* ─── Welcome Modal ───────────────────────────────────── */

const WelcomeModal = ({ firstName, onClose }: { firstName: string; onClose: () => void }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
        >
            <div className="bg-gradient-to-br from-[#33cbcc] to-[#2196F3] px-8 pt-10 pb-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    {[...Array(6)].map((_, i) => (
                        <Sparkles
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
                >
                    <PartyPopper size={40} className="text-white" />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-1">
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
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#33cbcc] to-[#2196F3] text-white font-semibold text-sm hover:shadow-lg transition-shadow"
                >
                    C'est parti !
                </button>
            </div>
        </motion.div>
    </motion.div>
);

/* ─── Birthday Modal ──────────────────────────────────── */

const BirthdayModal = ({ people, onClose }: { people: BirthdayEmployee[]; onClose: () => void }) => {
    const single = people.length === 1;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            >
                <div className="bg-gradient-to-br from-[#f59e0b] to-[#ec4899] px-8 pt-10 pb-8 text-center relative overflow-hidden">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                    >
                        <X size={16} />
                    </button>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                        className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                        <Cake size={40} className="text-white" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                        Joyeux Anniversaire !
                    </h2>
                    <p className="text-white/80 text-sm">
                        {single ? "Un membre de l'equipe fete son anniversaire aujourd'hui" : "Des membres de l'equipe fetent leur anniversaire aujourd'hui"}
                    </p>
                </div>

                <div className="px-8 py-6">
                    <div className="space-y-3 mb-6">
                        {people.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-pink-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                    {p.avatarUrl ? (
                                        <img src={p.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        `${p.firstName[0] || ''}${p.lastName[0] || ''}`
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-gray-800 text-sm">{p.firstName} {p.lastName}</p>
                                    {p.departmentName && (
                                        <p className="text-xs text-gray-500">{p.departmentName}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-center text-gray-500 text-sm mb-5">
                        Souhaitez-{single ? 'lui' : 'leur'} un joyeux anniversaire !
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#ec4899] text-white font-semibold text-sm hover:shadow-lg transition-shadow"
                    >
                        Super !
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Dashboard Layout ────────────────────────────────── */

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { user } = useAuth();
    const [showWelcome, setShowWelcome] = useState(false);
    const [birthdayPeople, setBirthdayPeople] = useState<BirthdayEmployee[]>([]);
    const [showBirthday, setShowBirthday] = useState(false);

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

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop sidebar */}
            <div className="hidden md:block">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            </div>
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto pb-20 md:pb-0">
                    <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
            {/* Mobile bottom nav */}
            <div className="md:hidden">
                <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
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
        </div>
    );
};

export default DashboardLayout;
