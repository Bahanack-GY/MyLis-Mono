import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, Mail01Icon, CallIcon, Location01Icon, Calendar01Icon, Briefcase01Icon, Building01Icon, Clock01Icon, PencilIcon, Cancel01Icon, FloppyDiskIcon, Shield01Icon, UserGroupIcon, Task01Icon, FolderOpenIcon, LockPasswordIcon, ViewIcon, ViewOffIcon, Loading02Icon } from 'hugeicons-react';
import { useProfile, useChangePassword } from '../../api/auth/hooks';
import { ProfileAdminSkeleton } from '../../components/Skeleton';

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
                            <PencilIcon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('profile.editProfile')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <UserIcon size={12} />
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
                                <UserIcon size={12} />
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
                            <Mail01Icon size={12} />
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
                                <CallIcon size={12} />
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
                                <Calendar01Icon size={12} />
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
                            <Location01Icon size={12} />
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
                        <FloppyDiskIcon size={16} />
                        {t('profile.saveChanges')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Change Password Modal ────────────────────────────── */

const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
    const { t } = useTranslation();
    const changePassword = useChangePassword();
    const [form, setForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validatePassword = (password: string): string[] => {
        const issues: string[] = [];
        if (password.length < 8) issues.push(t('profile.password.min8chars', 'At least 8 characters'));
        if (!/[A-Z]/.test(password)) issues.push(t('profile.password.uppercase', 'One uppercase letter'));
        if (!/[a-z]/.test(password)) issues.push(t('profile.password.lowercase', 'One lowercase letter'));
        if (!/[0-9]/.test(password)) issues.push(t('profile.password.number', 'One number'));
        return issues;
    };

    const handleSubmit = () => {
        const newErrors: Record<string, string> = {};

        if (!form.currentPassword) {
            newErrors.currentPassword = t('profile.password.currentRequired', 'Current password is required');
        }

        if (!form.newPassword) {
            newErrors.newPassword = t('profile.password.newRequired', 'New password is required');
        } else {
            const issues = validatePassword(form.newPassword);
            if (issues.length > 0) {
                newErrors.newPassword = issues.join(', ');
            }
        }

        if (form.newPassword !== form.confirmPassword) {
            newErrors.confirmPassword = t('profile.password.noMatch', 'Passwords do not match');
        }

        if (form.currentPassword === form.newPassword) {
            newErrors.newPassword = t('profile.password.sameAsCurrent', 'New password must be different from current');
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            changePassword.mutate(
                { currentPassword: form.currentPassword, newPassword: form.newPassword },
                {
                    onSuccess: () => {
                        onClose();
                        setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    },
                }
            );
        }
    };

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    const passwordStrength = form.newPassword ? validatePassword(form.newPassword) : null;
    const strengthScore = passwordStrength ? 4 - passwordStrength.length : 0;
    const strengthColor = strengthScore === 0 ? 'bg-gray-200' : strengthScore === 1 ? 'bg-red-500' : strengthScore === 2 ? 'bg-orange-500' : strengthScore === 3 ? 'bg-yellow-500' : 'bg-green-500';
    const strengthLabel = strengthScore === 0 ? '' : strengthScore === 1 ? t('profile.password.weak', 'Weak') : strengthScore === 2 ? t('profile.password.fair', 'Fair') : strengthScore === 3 ? t('profile.password.good', 'Good') : t('profile.password.strong', 'Strong');

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <LockPasswordIcon size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('profile.changePassword', 'Change Password')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <Cancel01Icon size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Current Password */}
                    <div>
                        <label className={labelCls}>
                            <LockPasswordIcon size={12} />
                            {t('profile.password.current', 'Current Password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showCurrent ? 'text' : 'password'}
                                value={form.currentPassword}
                                onChange={e => setForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showCurrent ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                            </button>
                        </div>
                        {errors.currentPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.currentPassword}</p>
                        )}
                    </div>

                    {/* New Password */}
                    <div>
                        <label className={labelCls}>
                            <LockPasswordIcon size={12} />
                            {t('profile.password.new', 'New Password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showNew ? 'text' : 'password'}
                                value={form.newPassword}
                                onChange={e => setForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showNew ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.newPassword}</p>
                        )}

                        {/* Password Strength Indicator */}
                        {form.newPassword && (
                            <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${strengthColor}`}
                                            style={{ width: `${(strengthScore / 4) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs font-medium text-gray-500">{strengthLabel}</span>
                                </div>
                                {passwordStrength && passwordStrength.length > 0 && (
                                    <div className="space-y-1">
                                        {passwordStrength.map((issue, i) => (
                                            <p key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                                <span className="w-1 h-1 rounded-full bg-gray-400" />
                                                {issue}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className={labelCls}>
                            <LockPasswordIcon size={12} />
                            {t('profile.password.confirm', 'Confirm Password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                value={form.confirmPassword}
                                onChange={e => setForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                className={inputCls}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showConfirm ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('profile.cancel')}
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={changePassword.isPending}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#33cbcc]/20 transition-colors"
                    >
                        {changePassword.isPending ? (
                            <>
                                <Loading02Icon size={16} className="animate-spin" />
                                {t('profile.password.changing', 'Changing...')}
                            </>
                        ) : (
                            <>
                                <FloppyDiskIcon size={16} />
                                {t('profile.password.change', 'Change Password')}
                            </>
                        )}
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
    const [showPasswordModal, setShowPasswordModal] = useState(false);

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
        { label: t('profile.stats.projects'), value: 0, icon: FolderOpenIcon, color: '#33cbcc' },
        { label: t('profile.stats.tasks'), value: 0, icon: Task01Icon, color: '#3b82f6' },
        { label: t('profile.stats.meetings'), value: 0, icon: Calendar01Icon, color: '#8b5cf6' },
        { label: t('profile.stats.teamMembers'), value: 0, icon: UserGroupIcon, color: '#22c55e' },
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
                                        <UserIcon size={40} className="text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="pb-1">
                                <h1 className="text-2xl font-bold text-gray-800">{profile.firstName} {profile.lastName}</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{profile.role}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Building01Icon size={12} />
                                        {profile.department}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Location01Icon size={12} />
                                        {profile.location}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                            >
                                <LockPasswordIcon size={16} />
                                {t('profile.changePassword', 'Change Password')}
                            </button>
                            <button
                                onClick={() => setShowEditModal(true)}
                                className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                            >
                                <PencilIcon size={16} />
                                {t('profile.editProfile')}
                            </button>
                        </div>
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
                        className="border border-gray-100 rounded-2xl overflow-hidden cursor-pointer"
                    >
                        <div className="px-5 py-3" style={{ backgroundColor: stat.color }}>
                            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wide leading-snug truncate">{stat.label}</h3>
                        </div>
                        <div className="p-5 bg-white relative overflow-hidden">
                            <h2 className="text-3xl font-bold text-[#1c2b3a] leading-none">{stat.value}</h2>
                            <div className="absolute -right-4 -bottom-4 opacity-[0.14]" style={{ color: stat.color }}>
                                <stat.icon size={110} strokeWidth={1.2} />
                            </div>
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
                            <Briefcase01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.jobInfo.title')}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: t('profile.jobInfo.role'), value: profile.role, icon: Shield01Icon },
                                { label: t('profile.jobInfo.department'), value: profile.department, icon: Building01Icon },
                                { label: t('profile.jobInfo.employeeId'), value: profile.employeeId, icon: UserIcon },
                                { label: t('profile.jobInfo.joinDate'), value: profile.joinDate, icon: Calendar01Icon },
                                { label: t('profile.jobInfo.manager'), value: profile.manager, icon: UserGroupIcon },
                                { label: t('profile.jobInfo.location'), value: profile.location, icon: Location01Icon },
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
                            <CallIcon size={18} className="text-[#33cbcc]" />
                            {t('profile.contact.title')}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: t('profile.contact.email'), value: profile.email, icon: Mail01Icon },
                                { label: t('profile.contact.phone'), value: profile.phone, icon: CallIcon },
                                { label: t('profile.contact.office'), value: profile.location, icon: Location01Icon },
                                { label: t('profile.contact.timezone'), value: profile.timezone, icon: Clock01Icon },
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
                            <Shield01Icon size={18} className="text-[#33cbcc]" />
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
                            <Clock01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.recentActivity.title')}
                        </h3>
                        <div className="py-8 text-center">
                            <Clock01Icon size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-sm text-gray-400">{t('profile.recentActivity.empty', 'No recent activity')}</p>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── Modals ── */}
            <AnimatePresence>
                {showEditModal && (
                    <EditProfileModal profile={profile} onClose={() => setShowEditModal(false)} />
                )}
                {showPasswordModal && (
                    <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
