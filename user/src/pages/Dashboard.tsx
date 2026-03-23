import { motion } from 'framer-motion';
import {
    ClipboardList,
    Ticket,
    Calendar,
    GraduationCap,
    Clock,
    Trophy,
    Crown,
    User,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMyTasks } from '../api/tasks/hooks';
import { useMyTickets } from '../api/tickets/hooks';
import { useMeetings } from '../api/meetings/hooks';
import { useFormations } from '../api/formations/hooks';
import { useLeaderboard } from '../api/employees/hooks';
import { UserDashboardSkeleton } from '../components/Skeleton';

const getTaskStatusStyle = (state: string) => {
    const lower = state.toLowerCase();
    if (['completed', 'reviewed', 'done'].includes(lower)) {
        return 'text-gray-500 bg-gray-100';
    }
    if (['in_progress', 'blocked'].includes(lower)) {
        return 'text-[#33cbcc] bg-[#33cbcc]/10';
    }
    // todo, created, assigned, and anything else
    return 'text-[#283852] bg-[#283852]/10';
};

const Dashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const { data: tasks, isLoading: loadingTasks } = useMyTasks();
    const { data: tickets, isLoading: loadingTickets } = useMyTickets();
    const { data: meetings, isLoading: loadingMeetings } = useMeetings();
    const { data: formations, isLoading: loadingFormations } = useFormations();
    const { data: leaderboard } = useLeaderboard(1);

    const isLoading = loadingTasks || loadingTickets || loadingMeetings || loadingFormations;

    const totalTasks = tasks?.length ?? 0;
    const totalTickets = tickets?.length ?? 0;

    // Filter upcoming meetings (today or future)
    const now = new Date();
    const upcomingMeetings = (meetings || []).filter(m => {
        const meetingDate = new Date(m.date);
        return meetingDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });
    const totalUpcomingMeetings = upcomingMeetings.length;
    const totalFormations = formations?.length ?? 0;

    const stats = [
        {
            title: t('dashboard.stats.myTasks'),
            value: String(totalTasks),
            icon: ClipboardList,
            color: '#283852',
            link: '/tasks',
        },
        {
            title: t('dashboard.stats.myTickets'),
            value: String(totalTickets),
            icon: Ticket,
            color: '#314463',
            link: '/tickets',
        },
        {
            title: t('dashboard.stats.upcomingMeetings'),
            value: String(totalUpcomingMeetings),
            icon: Calendar,
            color: '#33cbcc',
            link: '/meetings',
        },
        {
            title: t('dashboard.stats.myFormations'),
            value: String(totalFormations),
            icon: GraduationCap,
            color: '#445d86',
            link: '/formations',
        },
    ];

    // Recent tasks: last 5, sorted by dueDate
    const recentTasks = [...(tasks || [])]
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
        .slice(0, 5);

    // Upcoming meetings: next 5, sorted by date ascending
    const nextMeetings = [...upcomingMeetings]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    if (isLoading) {
        return <UserDashboardSkeleton />;
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-800">{t('dashboard.title')}</h1>
                <p className="text-gray-500 mt-1">{t('dashboard.subtitle')}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {stats.map((stat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.03 }}
                        onClick={() => navigate(stat.link)}
                        className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100 relative overflow-hidden group hover:border-[#33cbcc]/50 transition-colors cursor-pointer"
                    >
                        <div className="relative z-10">
                            <h3 className="text-gray-500 text-xs md:text-sm font-medium">{stat.title}</h3>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mt-2">{stat.value}</h2>
                        </div>

                        <div
                            className="absolute -right-6 -bottom-6 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out"
                            style={{ color: stat.color }}
                        >
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Content Grid: Recent Tasks + Upcoming Meetings + Top Employee */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Recent Tasks */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100"
                >
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-5">
                        {t('dashboard.recentTasks.title')}
                    </h3>

                    {recentTasks.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">
                            {t('dashboard.recentTasks.noData')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {task.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Clock size={12} className="text-gray-400 shrink-0" />
                                            <span className="text-xs text-gray-400">
                                                {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getTaskStatusStyle(task.state)}`}
                                    >
                                        {t(`dashboard.taskStatus.${task.state.toLowerCase()}`)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Upcoming Meetings */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100"
                >
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-5">
                        {t('dashboard.upcomingMeetings.title')}
                    </h3>

                    {nextMeetings.length === 0 ? (
                        <p className="text-gray-400 text-sm py-8 text-center">
                            {t('dashboard.upcomingMeetings.noData')}
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {nextMeetings.map((meeting) => (
                                <div
                                    key={meeting.id}
                                    className="flex items-center justify-between py-3 border-b border-gray-50 last:border-b-0"
                                >
                                    <div className="flex-1 min-w-0 mr-3">
                                        <p className="text-sm font-semibold text-gray-800 truncate">
                                            {meeting.title}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar size={12} className="text-gray-400 shrink-0" />
                                            <span className="text-xs text-gray-400">
                                                {new Date(meeting.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-[#283852] bg-[#283852]/10 px-2.5 py-1 rounded-full whitespace-nowrap">
                                        {meeting.startTime} - {meeting.endTime}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Top Employee */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-gray-100"
                >
                    <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                        <Trophy size={20} className="text-amber-500" />
                        {t('dashboard.topEmployee.title')}
                    </h3>

                    {leaderboard && leaderboard.length > 0 ? (
                        <div className="flex flex-col items-center text-center py-4">
                            <div className="relative mb-4">
                                <div className="w-20 h-20 rounded-full border-4 border-amber-200 shadow-lg overflow-hidden bg-gray-100">
                                    {leaderboard[0].avatarUrl ? (
                                        <img
                                            src={leaderboard[0].avatarUrl}
                                            alt={`${leaderboard[0].firstName} ${leaderboard[0].lastName}`}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User size={32} className="text-gray-300" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                                    <Crown size={16} className="text-white" />
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-gray-800">
                                {leaderboard[0].firstName} {leaderboard[0].lastName}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">{leaderboard[0].positionTitle}</p>
                            <p className="text-xs text-gray-400">{leaderboard[0].department}</p>
                            <div className="mt-4 px-5 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                                <span className="text-2xl font-black text-amber-500">{leaderboard[0].points}</span>
                                <span className="text-xs text-amber-400 ml-1.5 font-medium">pts</span>
                            </div>
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <Trophy size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-gray-400 text-sm">{t('dashboard.topEmployee.noData')}</p>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;
