import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Briefcase,
    Building,
    Clock,
    Edit3,
    X,
    Save,
    Shield,
    Users,
    ListChecks,
    CalendarDays,
    FolderOpen,
} from 'lucide-react';
import { useProfile } from '../api/auth/hooks';
import { ProfileAdminSkeleton } from '../components/Skeleton';

/* ─── Profile Data ──────────────────────────────────────── */

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | '';
    avatar: string;
    role: string;
    department: string;
    employeeId: string;
    joinDate: string;
    manager: string;
    location: string;
    timezone: string;
    bio: string;
    skills: string[];
}

/* ─── Edit Profile Modal ───────────────────────────────── */

const EditProfileModal = ({
    profile,
    onClose,
}: {
    profile: ProfileData;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        location: profile.location,
    });

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

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
                            <Edit3 size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('profile.editProfile')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <User size={12} />
                                {t('profile.personalInfo.firstName')}
                            </label>
                            <input
                                type="text"
                                value={form.firstName}
                                onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <User size={12} />
                                {t('profile.personalInfo.lastName')}
                            </label>
                            <input
                                type="text"
                                value={form.lastName}
                                onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>
                            <Mail size={12} />
                            {t('profile.personalInfo.email')}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Phone size={12} />
                                {t('profile.personalInfo.phone')}
                            </label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('profile.personalInfo.dateOfBirth')}
                            </label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>
                            <MapPin size={12} />
                            {t('profile.jobInfo.location')}
                        </label>
                        <input
                            type="text"
                            value={form.location}
                            onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                            className={inputCls}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('profile.cancel')}
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20 transition-colors">
                        <Save size={16} />
                        {t('profile.saveChanges')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Profile = () => {
    const { t } = useTranslation();
    const [showEditModal, setShowEditModal] = useState(false);

    // API data
    const { data: apiProfile, isLoading } = useProfile();

    // Use only API data, empty defaults when no data
    const profile: ProfileData = {
        firstName: apiProfile?.firstName || '',
        lastName: apiProfile?.lastName || '',
        email: apiProfile?.email || '',
        phone: apiProfile?.phoneNumber || '',
        dateOfBirth: apiProfile?.birthDate ? apiProfile.birthDate.split('T')[0] : '',
        gender: '',
        avatar: apiProfile?.avatarUrl || '',
        role: apiProfile?.role || '',
        department: apiProfile?.departmentName || '',
        employeeId: apiProfile?.employeeId || '',
        joinDate: apiProfile?.hireDate ? new Date(apiProfile.hireDate).toLocaleDateString() : '',
        manager: '',
        location: apiProfile?.address || '',
        timezone: '',
        bio: '',
        skills: apiProfile?.skills || [],
    };

    if (isLoading) {
        return <ProfileAdminSkeleton />;
    }

    const stats = [
        { label: t('profile.stats.projects'), value: 0, icon: FolderOpen, color: '#33cbcc' },
        { label: t('profile.stats.tasks'), value: 0, icon: ListChecks, color: '#3b82f6' },
        { label: t('profile.stats.meetings'), value: 0, icon: CalendarDays, color: '#8b5cf6' },
        { label: t('profile.stats.teamMembers'), value: 0, icon: Users, color: '#22c55e' },
    ];

    return (
        <div className="space-y-8">
            {/* ── Header Banner ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
            >
                {/* Cover Gradient */}
                <div className="h-36 bg-gradient-to-r from-[#283852] via-[#33cbcc] to-[#283852] relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                </div>

                {/* Profile Info */}
                <div className="px-8 pb-6 -mt-16 relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex items-end gap-5">
                            <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <User size={40} className="text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="pb-1">
                                <h1 className="text-2xl font-bold text-gray-800">{profile.firstName} {profile.lastName}</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{profile.role}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Building size={12} />
                                        {profile.department}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <MapPin size={12} />
                                        {profile.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                        >
                            <Edit3 size={16} />
                            {t('profile.editProfile')}
                        </button>
                    </div>

                    {/* Bio */}
                    <p className="text-sm text-gray-500 leading-relaxed mt-5 max-w-2xl">{profile.bio}</p>
                </div>
            </motion.div>

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
                        <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-110 duration-500 ease-out" style={{ color: stat.color }}>
                            <stat.icon size={100} strokeWidth={1.5} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Two Column Layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — Job Info + Contact */}
                <div className="space-y-6">
                    {/* Job Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-3xl border border-gray-100 p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Briefcase size={18} className="text-[#33cbcc]" />
                            {t('profile.jobInfo.title')}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: t('profile.jobInfo.role'), value: profile.role, icon: Shield },
                                { label: t('profile.jobInfo.department'), value: profile.department, icon: Building },
                                { label: t('profile.jobInfo.employeeId'), value: profile.employeeId, icon: User },
                                { label: t('profile.jobInfo.joinDate'), value: profile.joinDate, icon: Calendar },
                                { label: t('profile.jobInfo.manager'), value: profile.manager, icon: Users },
                                { label: t('profile.jobInfo.location'), value: profile.location, icon: MapPin },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <item.icon size={14} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Contact Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-3xl border border-gray-100 p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Phone size={18} className="text-[#33cbcc]" />
                            {t('profile.contact.title')}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: t('profile.contact.email'), value: profile.email, icon: Mail },
                                { label: t('profile.contact.phone'), value: profile.phone, icon: Phone },
                                { label: t('profile.contact.office'), value: profile.location, icon: MapPin },
                                { label: t('profile.contact.timezone'), value: profile.timezone, icon: Clock },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <item.icon size={14} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{item.value}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column — Skills + Activity */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Skills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white rounded-3xl border border-gray-100 p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Shield size={18} className="text-[#33cbcc]" />
                            {t('profile.skills.title')}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.4 + i * 0.05 }}
                                    className="px-4 py-2 rounded-xl text-sm font-medium bg-[#33cbcc]/10 text-[#33cbcc] border border-[#33cbcc]/20"
                                >
                                    {skill}
                                </motion.span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="bg-white rounded-3xl border border-gray-100 p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Clock size={18} className="text-[#33cbcc]" />
                            {t('profile.recentActivity.title')}
                        </h3>
                        <div className="py-8 text-center">
                            <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">{t('profile.recentActivity.empty', 'No recent activity')}</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── Edit Modal ── */}
            <AnimatePresence>
                {showEditModal && (
                    <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
