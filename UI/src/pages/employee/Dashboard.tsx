import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Player } from '@lottiefiles/react-lottie-player';
import { ClipboardIcon, Ticket01Icon, Calendar01Icon, GraduationScrollIcon, Clock01Icon, Award01Icon, CrownIcon, UserIcon, ArrowUpRight01Icon } from 'hugeicons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMyTasks } from '../../api/tasks/hooks';
import { useMyTickets } from '../../api/tickets/hooks';
import { useMeetings } from '../../api/meetings/hooks';
import { useFormations } from '../../api/formations/hooks';
import { useLeaderboard } from '../../api/employees/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { UserDashboardSkeleton } from '../../components/Skeleton';
import trophyData from '../../assets/lottie/trophy';
import emptyTeamData from '../../assets/lottie/emptyTeam';
import empDash1 from '../../assets/employee-dashboard-1.svg';
import empDash2 from '../../assets/employee-dashboard-2.svg';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    completed:  { label: 'Terminé',     bg: '#f0fdf4', color: '#16a34a' },
    reviewed:   { label: 'Révisé',      bg: '#f0fdf4', color: '#16a34a' },
    done:       { label: 'Fait',         bg: '#f0fdf4', color: '#16a34a' },
    in_progress:{ label: 'En cours',    bg: '#ecfeff', color: '#33cbcc' },
    blocked:    { label: 'Bloqué',      bg: '#fff1f2', color: '#e11d48' },
    todo:       { label: 'À faire',     bg: '#f0f4ff', color: '#283852' },
    created:    { label: 'Créé',        bg: '#f0f4ff', color: '#283852' },
    assigned:   { label: 'Assigné',     bg: '#f0f4ff', color: '#283852' },
};

const getStatusStyle = (state: string) => STATUS_CONFIG[state.toLowerCase()] ?? { label: state, bg: '#f3f4f6', color: '#6b7280' };

const greeting = (name: string, lang: string) => {
    const h = new Date().getHours();
    if (lang === 'fr') {
        const g = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
        return `${g}, ${name}`;
    }
    const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    return `${g}, ${name}`;
};

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: tasks, isLoading: loadingTasks } = useMyTasks();
    const { data: tickets, isLoading: loadingTickets } = useMyTickets();
    const { data: meetings, isLoading: loadingMeetings } = useMeetings();
    const { data: formations, isLoading: loadingFormations } = useFormations();
    const { data: leaderboard } = useLeaderboard(1);

    const isLoading = loadingTasks || loadingTickets || loadingMeetings || loadingFormations;

    const now = new Date();
    const upcomingMeetings = (meetings || [])
        .filter(m => new Date(m.date) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const recentTasks = [...(tasks || [])]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 5);

    const stats = [
        { title: t('dashboard.stats.myTasks'),        value: tasks?.length ?? 0,            icon: ClipboardIcon,      color: '#283852', link: '/tasks' },
        { title: t('dashboard.stats.myTickets'),       value: tickets?.length ?? 0,           icon: Ticket01Icon,       color: '#283852', link: '/tickets' },
        { title: t('dashboard.stats.upcomingMeetings'),value: upcomingMeetings.length,         icon: Calendar01Icon,     color: '#33cbcc', link: '/meetings' },
        { title: t('dashboard.stats.myFormations'),    value: formations?.length ?? 0,         icon: GraduationScrollIcon, color: '#283852', link: '/formations' },
    ];

    const firstName = user?.firstName ?? '';

    if (isLoading) return <UserDashboardSkeleton />;

    return (
        <div>

            {/* ── Background illustrations via portal ─────────── */}
            {createPortal(
                <>
                    <img src={empDash1} alt="" aria-hidden className="hidden lg:block"
                        style={{ position: 'fixed', bottom: 0, left: 0, width: 'clamp(220px,24vw,420px)', opacity: 0.18, pointerEvents: 'none', userSelect: 'none', zIndex: 15 }} />
                    <img src={empDash2} alt="" aria-hidden className="hidden lg:block"
                        style={{ position: 'fixed', bottom: 0, right: 0, width: 'clamp(220px,24vw,420px)', opacity: 0.18, pointerEvents: 'none', userSelect: 'none', zIndex: 15 }} />
                </>,
                document.body
            )}

            <div className="space-y-8">

                {/* ── HEADER ──────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#33cbcc] mb-1">
                        {i18n.language === 'fr' ? 'Tableau de bord' : 'Dashboard'}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold text-[#1c2b3a] leading-none tracking-tight">
                        {greeting(firstName, i18n.language)}
                    </h1>
                    <p className="text-[#8892a4] text-sm mt-2">{t('dashboard.subtitle')}</p>
                </motion.div>

                {/* ── STAT CARDS ──────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => navigate(stat.link)}
                            className="border border-[#e5e8ef] rounded-2xl overflow-hidden cursor-pointer group hover:border-[#33cbcc] transition-colors"
                        >
                            <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                                <p className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug">{stat.title}</p>
                            </div>
                            <div className="p-5 bg-white relative overflow-hidden">
                                <p className="text-4xl font-bold text-[#1c2b3a] leading-none">{stat.value}</p>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                    <stat.icon size={110} strokeWidth={1.2} />
                                </div>
                                <div className="mt-4 flex items-center gap-1 text-[#33cbcc] opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-semibold">{i18n.language === 'fr' ? 'Voir' : 'View'}</span>
                                    <ArrowUpRight01Icon size={12} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* ── CONTENT GRID ────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                    {/* Recent Tasks */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-white border border-[#e5e8ef] rounded-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f2f5]">
                            <div className="flex items-center gap-2">
                                <ClipboardIcon size={16} className="text-[#283852]" />
                                <h3 className="font-bold text-[#1c2b3a] text-sm">{t('dashboard.recentTasks.title')}</h3>
                            </div>
                            <button onClick={() => navigate('/tasks')} className="text-[11px] font-semibold text-[#33cbcc] hover:underline">
                                {i18n.language === 'fr' ? 'Tout voir' : 'See all'}
                            </button>
                        </div>

                        {recentTasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-5">
                                <Player autoplay loop src={emptyTeamData as any} style={{ width: 100, height: 88 }} />
                                <p className="text-[#8892a4] text-xs text-center mt-2">{t('dashboard.recentTasks.noData')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#f0f2f5]">
                                {recentTasks.map((task) => {
                                    const s = getStatusStyle(task.state);
                                    return (
                                        <div key={task.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#f8f9fc] transition-colors">
                                            <div className="flex-1 min-w-0 mr-3">
                                                <p className="text-sm font-semibold text-[#1c2b3a] truncate">{task.title}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Clock01Icon size={11} className="text-[#b0bac9] shrink-0" />
                                                    <span className="text-[11px] text-[#b0bac9]">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                                            <span className="text-[11px] font-bold whitespace-nowrap shrink-0"
                                                style={{ color: s.color }}>
                                                {t(`dashboard.taskStatus.${task.state.toLowerCase()}`, s.label)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>

                    {/* Upcoming Meetings */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-white border border-[#e5e8ef] rounded-2xl overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#f0f2f5]">
                            <div className="flex items-center gap-2">
                                <Calendar01Icon size={16} className="text-[#33cbcc]" />
                                <h3 className="font-bold text-[#1c2b3a] text-sm">{t('dashboard.upcomingMeetings.title')}</h3>
                            </div>
                            <button onClick={() => navigate('/meetings')} className="text-[11px] font-semibold text-[#33cbcc] hover:underline">
                                {i18n.language === 'fr' ? 'Tout voir' : 'See all'}
                            </button>
                        </div>

                        {upcomingMeetings.slice(0, 5).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-5">
                                <Calendar01Icon size={32} className="text-[#e5e8ef] mb-2" />
                                <p className="text-[#8892a4] text-xs text-center">{t('dashboard.upcomingMeetings.noData')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#f0f2f5]">
                                {upcomingMeetings.slice(0, 5).map((meeting) => (
                                    <div key={meeting.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#f8f9fc] transition-colors">
                                        <div className="shrink-0 w-9 text-center mt-0.5">
                                            <p className="text-[11px] font-bold text-[#33cbcc] uppercase leading-none">
                                                {new Date(meeting.date).toLocaleDateString(i18n.language, { month: 'short' })}
                                            </p>
                                            <p className="text-lg font-black text-[#1c2b3a] leading-tight">
                                                {new Date(meeting.date).getDate()}
                                            </p>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[#1c2b3a] truncate">{meeting.title}</p>
                                            <p className="text-[11px] text-[#b0bac9] mt-0.5">{meeting.startTime} – {meeting.endTime}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>

                    {/* Top Employee */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-[#283852] border border-[#283852] rounded-2xl overflow-hidden"
                    >
                        <div className="flex items-center gap-2 px-5 pt-5 pb-4 border-b border-white/10">
                            <div className="relative">
                                <Player autoplay loop src={trophyData as any} style={{ width: 28, height: 28 }} />
                            </div>
                            <h3 className="font-bold text-white text-sm">{t('dashboard.topEmployee.title')}</h3>
                        </div>

                        {leaderboard && leaderboard.length > 0 ? (
                            <div className="flex flex-col items-center text-center px-5 py-8">
                                <div className="relative mb-4">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#33cbcc]">
                                        {leaderboard[0].avatarUrl ? (
                                            <img src={leaderboard[0].avatarUrl} alt={`${leaderboard[0].firstName} ${leaderboard[0].lastName}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/10">
                                                <UserIcon size={28} className="text-white/40" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#33cbcc] flex items-center justify-center border-2 border-[#283852]">
                                        <CrownIcon size={13} className="text-white" />
                                    </div>
                                </div>
                                <h4 className="text-base font-bold text-white leading-tight">
                                    {leaderboard[0].firstName} {leaderboard[0].lastName}
                                </h4>
                                <p className="text-[11px] text-white/40 mt-0.5">{leaderboard[0].positionTitle}</p>
                                <p className="text-[11px] text-white/30">{leaderboard[0].department}</p>
                                <div className="mt-5">
                                    <span className="text-3xl font-black text-[#33cbcc]">{leaderboard[0].points}</span>
                                    <span className="text-xs text-[#33cbcc]/50 ml-1.5 font-medium">pts</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 px-5">
                                <Award01Icon size={32} className="text-white/15 mb-2" />
                                <p className="text-white/30 text-xs text-center">{t('dashboard.topEmployee.noData')}</p>
                            </div>
                        )}
                    </motion.div>

                </div>
            </div>
        </div>
    );
};

export default Dashboard;
