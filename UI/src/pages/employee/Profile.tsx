import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, Mail01Icon, CallIcon, Location01Icon, Calendar01Icon, Briefcase01Icon, Building01Icon, PencilIcon, Cancel01Icon, FloppyDiskIcon, Add01Icon, Shield01Icon, UserGroupIcon, Task01Icon, FolderOpenIcon, GraduationScrollIcon, Delete02Icon, Upload01Icon, ViewIcon, File01Icon, Loading02Icon, Award01Icon, CrownIcon, Key01Icon, ViewOffIcon } from 'hugeicons-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUpdateProfile, useMyBadges, useChangePassword } from '../../api/auth/hooks';
import { UserProfileSkeleton } from '../../components/Skeleton';
import { documentsApi } from '../../api/documents/api';
import type { EducationDoc } from '../../api/auth/types';
import { useMyTasks } from '../../api/tasks/hooks';
import { useMyTickets } from '../../api/tickets/hooks';
import { useMeetings } from '../../api/meetings/hooks';
import { useLeaderboard } from '../../api/employees/hooks';

import badge1 from '../../assets/badges/1.jpg';
import badge2 from '../../assets/badges/2.jpg';
import badge3 from '../../assets/badges/3.jpg';
import badge4 from '../../assets/badges/4.jpg';
import badge5 from '../../assets/badges/5.jpg';
import badge6 from '../../assets/badges/6.jpg';
import badge7 from '../../assets/badges/7.jpg';
import badge8 from '../../assets/badges/8.jpg';
import badge9 from '../../assets/badges/9.jpg';
import badge10 from '../../assets/badges/10.jpg';
import badge11 from '../../assets/badges/11.jpg';
import badge12 from '../../assets/badges/12.jpg';
import badge13 from '../../assets/badges/13.jpg';
import badge14 from '../../assets/badges/14.jpg';
import badge15 from '../../assets/badges/15.jpg';
import badge16 from '../../assets/badges/16.jpg';

const BADGE_IMAGES: Record<number, string> = {
    1: badge1, 2: badge2, 3: badge3, 4: badge4,
    5: badge5, 6: badge6, 7: badge7, 8: badge8,
    9: badge9, 10: badge10, 11: badge11, 12: badge12,
    13: badge13, 14: badge14, 15: badge15, 16: badge16,
};

const BADGE_DEFINITIONS = [
    { badgeNumber: 1,  milestone: 5,   title: 'First Steps' },
    { badgeNumber: 2,  milestone: 15,  title: 'Getting Started' },
    { badgeNumber: 3,  milestone: 30,  title: 'On a Roll' },
    { badgeNumber: 4,  milestone: 50,  title: 'Dedicated' },
    { badgeNumber: 5,  milestone: 75,  title: 'Committed' },
    { badgeNumber: 6,  milestone: 105, title: 'Reliable' },
    { badgeNumber: 7,  milestone: 140, title: 'Half Century' },
    { badgeNumber: 8,  milestone: 180, title: 'Powerhouse' },
    { badgeNumber: 9,  milestone: 225, title: 'Centurion' },
    { badgeNumber: 10, milestone: 275, title: 'Unstoppable' },
    { badgeNumber: 11, milestone: 330, title: 'Legend' },
    { badgeNumber: 12, milestone: 390, title: 'Elite' },
    { badgeNumber: 13, milestone: 455, title: 'Master' },
    { badgeNumber: 14, milestone: 525, title: 'Grandmaster' },
    { badgeNumber: 15, milestone: 600, title: 'Champion' },
    { badgeNumber: 16, milestone: 680, title: 'Ultimate' },
];

/* ─── Profile Data ──────────────────────────────────────── */

interface ProfileData {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    avatar: string;
    role: string;
    department: string;
    employeeId: string;
    joinDate: string;
    location: string;
    positionTitle: string;
    skills: string[];
    bio?: string;
}

/* ─── Edit Profile Modal ───────────────────────────────── */

const EditProfileModal = ({
    profile,
    onClose,
    onSave,
    isSaving,
}: {
    profile: ProfileData;
    onClose: () => void;
    onSave: (data: { firstName: string; lastName: string; email: string; phoneNumber: string; birthDate: string; address: string; skills: string[] }) => void;
    isSaving: boolean;
}) => {
    const { t } = useTranslation();
    const [form, setForm] = useState({
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        location: profile.location,
        skills: [...profile.skills],
        newSkill: '',
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            {t('profile.contact.email')}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            className={inputCls}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                    {/* Skills */}
                    <div>
                        <label className={labelCls}>
                            <Shield01Icon size={12} />
                            {t('profile.skills.title')}
                        </label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {form.skills.map((skill, i) => (
                                <span
                                    key={i}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#33cbcc]/10 text-[#33cbcc] border border-[#33cbcc]/20"
                                >
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))}
                                        className="hover:text-[#283852] transition-colors"
                                    >
                                        <Cancel01Icon size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={form.newSkill}
                                onChange={e => setForm(prev => ({ ...prev, newSkill: e.target.value }))}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && form.newSkill.trim()) {
                                        e.preventDefault();
                                        setForm(prev => ({
                                            ...prev,
                                            skills: [...prev.skills, prev.newSkill.trim()],
                                            newSkill: '',
                                        }));
                                    }
                                }}
                                placeholder={t('profile.skills.addPlaceholder')}
                                className={inputCls}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (form.newSkill.trim()) {
                                        setForm(prev => ({
                                            ...prev,
                                            skills: [...prev.skills, prev.newSkill.trim()],
                                            newSkill: '',
                                        }));
                                    }
                                }}
                                className="shrink-0 w-10 h-10 rounded-xl bg-[#33cbcc] text-white flex items-center justify-center hover:bg-[#2bb5b6] transition-colors"
                            >
                                <Add01Icon size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('profile.cancel')}
                        
                    </button>
                    <button
                        disabled={isSaving}
                        onClick={() => onSave({
                            firstName: form.firstName,
                            lastName: form.lastName,
                            email: form.email,
                            phoneNumber: form.phone,
                            birthDate: form.dateOfBirth,
                            address: form.location,
                            skills: form.skills,
                        })}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? <Loading02Icon size={16} className="animate-spin" /> : <FloppyDiskIcon size={16} />}
                        {t('profile.saveChanges')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Education Section ────────────────────────────────── */

const EDU_TYPE_COLORS: Record<string, string> = {
    diploma: 'bg-[#283852]/10 text-[#283852]',
    certificate: 'bg-teal-50 text-teal-500',
    transcript: 'bg-cyan-50 text-cyan-500',
    other: 'bg-gray-100 text-gray-500',
};

const getFileUrl = (filePath: string) => {
    const uploadsIndex = filePath.indexOf('uploads/');
    if (uploadsIndex === -1) return filePath;
    const relativePath = filePath.substring(uploadsIndex);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3025';
    return `${apiUrl}/${relativePath}`;
};

const EducationSection = ({
    educationDocs,
    onUpdate,
    isSaving,
}: {
    educationDocs: EducationDoc[];
    onUpdate: (docs: EducationDoc[]) => void;
    isSaving: boolean;
}) => {
    const { t } = useTranslation();
    const [showAdd, setShowAdd] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: '', type: 'diploma' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';

    const handleAdd = async () => {
        if (!newDoc.name.trim()) return;

        let filePath: string | undefined;

        if (selectedFile) {
            setIsUploading(true);
            try {
                const result = await documentsApi.uploadFile(selectedFile, 'education');
                filePath = result.filePath;
            } catch {
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        onUpdate([...educationDocs, { name: newDoc.name.trim(), type: newDoc.type, filePath }]);
        setNewDoc({ name: '', type: 'diploma' });
        setSelectedFile(null);
        setShowAdd(false);
    };

    const handleRemove = (index: number) => {
        onUpdate(educationDocs.filter((_, i) => i !== index));
    };

    const busy = isSaving || isUploading;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
        >
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <GraduationScrollIcon size={18} className="text-[#33cbcc]" />
                    {t('profile.education.title')}
                </h3>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                >
                    <Add01Icon size={14} />
                    {t('profile.education.add')}
                </button>
            </div>

            {/* Add form */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <input
                                type="text"
                                value={newDoc.name}
                                onChange={e => setNewDoc(prev => ({ ...prev, name: e.target.value }))}
                                placeholder={t('profile.education.namePlaceholder')}
                                className={inputCls}
                            />
                            <select
                                value={newDoc.type}
                                onChange={e => setNewDoc(prev => ({ ...prev, type: e.target.value }))}
                                className={inputCls}
                            >
                                <option value="diploma">{t('profile.education.types.diploma')}</option>
                                <option value="certificate">{t('profile.education.types.certificate')}</option>
                                <option value="transcript">{t('profile.education.types.transcript')}</option>
                                <option value="other">{t('profile.education.types.other')}</option>
                            </select>

                            {/* File upload */}
                            <div>
                                <label className="flex items-center gap-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                                    <Upload01Icon size={12} />
                                    {t('profile.education.file')}
                                </label>
                                {selectedFile ? (
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200">
                                        <File01Icon size={16} className="text-[#33cbcc] shrink-0" />
                                        <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedFile(null)}
                                            className="text-gray-400 hover:text-[#283852] transition-colors shrink-0"
                                        >
                                            <Cancel01Icon size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white rounded-xl border border-dashed border-gray-300 cursor-pointer hover:border-[#33cbcc] hover:bg-[#33cbcc]/5 transition-all">
                                        <Upload01Icon size={16} className="text-gray-400" />
                                        <span className="text-xs text-gray-400">{t('profile.education.uploadPlaceholder')}</span>
                                        <input
                                            type="file"
                                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) setSelectedFile(file);
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => { setShowAdd(false); setSelectedFile(null); }}
                                    className="px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {t('profile.cancel')}
                                </button>
                                <button
                                    onClick={handleAdd}
                                    disabled={!newDoc.name.trim() || busy}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-[#33cbcc] text-white rounded-xl text-xs font-semibold hover:bg-[#2bb5b6] transition-colors disabled:opacity-50"
                                >
                                    {busy && <Loading02Icon size={12} className="animate-spin" />}
                                    {t('profile.education.save')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Education list */}
            {educationDocs.length > 0 ? (
                <div className="space-y-3">
                    {educationDocs.map((doc, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + i * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${EDU_TYPE_COLORS[doc.type] || EDU_TYPE_COLORS.other}`}>
                                <GraduationScrollIcon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate">{doc.name}</p>
                                <p className="text-[11px] text-gray-400 capitalize">{t(`profile.education.types.${doc.type}`) || doc.type}</p>
                            </div>
                            {doc.filePath && (
                                <a
                                    href={getFileUrl(doc.filePath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-300 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-[#33cbcc]/10"
                                >
                                    <ViewIcon size={16} />
                                </a>
                            )}
                            <button
                                onClick={() => handleRemove(i)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-[#283852] transition-all rounded-lg hover:bg-[#283852]/10"
                            >
                                <Delete02Icon size={14} />
                            </button>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="py-6 text-center">
                    <GraduationScrollIcon size={28} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">{t('profile.education.empty')}</p>
                </div>
            )}
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Profile = () => {
    const { t } = useTranslation();
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const { user, isLoading } = useAuth();
    const updateProfile = useUpdateProfile();
    const changePassword = useChangePassword();
    const { data: tasks } = useMyTasks();
    const { data: tickets } = useMyTickets();
    const { data: meetings } = useMeetings();
    const { data: leaderboard } = useLeaderboard(5);
    const { data: myBadges } = useMyBadges();

    const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString() : '';

    const profile: ProfileData = {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
        phone: user?.phoneNumber || '',
        dateOfBirth: user?.birthDate ? user.birthDate.split('T')[0] : '',
        avatar: user?.avatarUrl || '',
        role: user?.role || '',
        department: user?.departmentName || '',
        employeeId: user?.employeeId || '',
        joinDate: formatDate(user?.hireDate ?? null),
        location: user?.address || '',
        positionTitle: user?.positionTitle || '',
        skills: user?.skills || [],
    };

    const handleSave = (data: { firstName: string; lastName: string; email: string; phoneNumber: string; birthDate: string; address: string; skills: string[] }) => {
        updateProfile.mutate(data, {
            onSuccess: () => setShowEditModal(false),
        });
    };

    if (isLoading) {
        return <UserProfileSkeleton />;
    }

    const stats = [
        { label: t('profile.stats.projects'), value: user?.projectsCount ?? 0, icon: FolderOpenIcon, color: '#283852' },
        { label: t('profile.stats.tasks'), value: tasks?.length ?? 0, icon: Task01Icon, color: '#33cbcc' },
        { label: t('profile.stats.meetings'), value: meetings?.length ?? 0, icon: Calendar01Icon, color: '#22c55e' },
        { label: t('profile.stats.teamMembers'), value: tickets?.length ?? 0, icon: UserGroupIcon, color: '#f59e0b' },
    ];

    return (
        <div className="space-y-6 md:space-y-8">
            {/* ── Header Banner ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 overflow-hidden"
            >
                {/* Cover Gradient */}
                <div className="h-28 md:h-36 bg-gradient-to-r from-[#283852] via-[#33cbcc] to-[#283852] relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
                </div>

                {/* Profile Info */}
                <div className="px-5 md:px-8 pb-5 md:pb-6 -mt-12 md:-mt-16 relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex items-end gap-4 md:gap-5">
                            <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-white shrink-0">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                        <UserIcon size={32} className="text-gray-300 md:hidden" />
                                        <UserIcon size={40} className="text-gray-300 hidden md:block" />
                                    </div>
                                )}
                            </div>
                            <div className="pb-1">
                                <h1 className="text-xl md:text-2xl font-bold text-gray-800">{profile.firstName} {profile.lastName}</h1>
                                <p className="text-sm text-gray-500 mt-0.5">{profile.role}</p>
                                <div className="flex items-center gap-3 mt-2">
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Building01Icon size={12} />
                                        {profile.department || '--'}
                                    </span>
                                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                        <Location01Icon size={12} />
                                        {profile.location || '--'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center justify-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20 w-full md:w-auto"
                        >
                            <PencilIcon size={16} />
                            {t('profile.editProfile')}
                        </button>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="text-sm text-gray-500 leading-relaxed mt-5 max-w-2xl">{profile.bio}</p>
                    )}
                </div>
            </motion.div>

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column -- Job Info + Contact */}
                <div className="space-y-6">
                    {/* Job Information */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Briefcase01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.jobInfo.title')}
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: t('profile.jobInfo.role'), value: profile.positionTitle || profile.role, icon: Shield01Icon },
                                { label: t('profile.jobInfo.department'), value: profile.department, icon: Building01Icon },
                                { label: t('profile.jobInfo.employeeId'), value: profile.employeeId, icon: UserIcon },
                                { label: t('profile.jobInfo.joinDate'), value: profile.joinDate, icon: Calendar01Icon },
                                { label: t('profile.jobInfo.location'), value: profile.location, icon: Location01Icon },
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <item.icon size={14} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{item.value || '--'}</p>
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
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
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
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                                        <item.icon size={14} className="text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                        <p className="text-sm font-medium text-gray-700 mt-0.5">{item.value || '--'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Right Column -- Skills + Activity */}
                <div className="md:col-span-2 space-y-6">
                    {/* Skills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Shield01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.skills.title')}
                        </h3>
                        {profile.skills.length > 0 ? (
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
                        ) : (
                            <div className="py-6 text-center">
                                <Shield01Icon size={28} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">{t('profile.skills.title')}</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Top 5 Leaderboard */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                            <Award01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.leaderboard.title')}
                        </h3>

                        {leaderboard && leaderboard.length > 0 ? (
                            <div className="space-y-2">
                                {leaderboard.map((entry, i) => (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.45 + i * 0.06 }}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                                            i === 0 ? 'bg-[#33cbcc]/10 border border-[#33cbcc]/20' : 'hover:bg-gray-50'
                                        }`}
                                    >
                                        {/* Rank */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                                            i === 0
                                                ? 'bg-[#33cbcc] text-white'
                                                : i === 1
                                                ? 'bg-gray-300 text-white'
                                                : i === 2
                                                ? 'bg-[#283852] text-white'
                                                : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {i === 0 ? <CrownIcon size={16} /> : entry.rank}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-100 shrink-0">
                                            {entry.avatarUrl ? (
                                                <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <UserIcon size={16} className="text-gray-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                {entry.firstName} {entry.lastName}
                                            </p>
                                            <p className="text-[11px] text-gray-400 truncate">{entry.department}</p>
                                        </div>

                                        {/* Points */}
                                        <div className="text-right shrink-0">
                                            <span className={`text-sm font-bold ${i === 0 ? 'text-[#33cbcc]' : 'text-gray-700'}`}>
                                                {entry.points}
                                            </span>
                                            <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <Award01Icon size={28} className="mx-auto text-gray-200 mb-2" />
                                <p className="text-sm text-gray-400">{t('profile.leaderboard.empty')}</p>
                            </div>
                        )}
                    </motion.div>

                    {/* Badges Collection & Progress */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 p-5 md:p-6"
                    >
                        <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                            <Award01Icon size={18} className="text-[#33cbcc]" />
                            {t('profile.badges.title')}
                        </h3>
                        <p className="text-xs text-gray-400 mb-5">
                            {t('profile.badges.subtitle', { count: myBadges?.length ?? 0, total: 16 })}
                        </p>

                        {/* Progress Timeline */}
                        {(() => {
                            const completedCount = user?.completedTasksCount ?? 0;
                            const earnedSet = new Set((myBadges || []).map(b => b.badgeNumber));
                            const nextBadge = BADGE_DEFINITIONS.find(b => !earnedSet.has(b.badgeNumber));
                            const prevMilestone = nextBadge
                                ? (BADGE_DEFINITIONS.find((_, i, arr) => arr[i + 1]?.badgeNumber === nextBadge.badgeNumber)?.milestone ?? 0)
                                : BADGE_DEFINITIONS[BADGE_DEFINITIONS.length - 1].milestone;
                            const nextMilestone = nextBadge?.milestone ?? BADGE_DEFINITIONS[BADGE_DEFINITIONS.length - 1].milestone;
                            const progress = nextBadge
                                ? Math.min(100, ((completedCount - prevMilestone) / (nextMilestone - prevMilestone)) * 100)
                                : 100;

                            return (
                                <div className="mb-6 p-4 rounded-xl bg-[#33cbcc]/5 border border-[#33cbcc]/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-semibold text-gray-600">
                                            {t('profile.badges.tasksCompleted', { count: completedCount })}
                                        </span>
                                        {nextBadge ? (
                                            <span className="text-xs font-medium text-[#33cbcc]">
                                                {t('profile.badges.nextBadge')}: {nextBadge.title} ({nextBadge.milestone})
                                            </span>
                                        ) : (
                                            <span className="text-xs font-medium text-[#33cbcc]">
                                                {t('profile.badges.allEarned')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress bar */}
                                    <div className="relative h-3 bg-white rounded-full overflow-hidden border border-[#33cbcc]/20">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#33cbcc] to-[#2bb5b6] rounded-full"
                                        />
                                    </div>

                                    {/* Milestone markers */}
                                    <div className="flex justify-between mt-1.5">
                                        <span className="text-[10px] text-gray-400">{prevMilestone}</span>
                                        <span className="text-[10px] font-semibold text-[#33cbcc]">{nextMilestone}</span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Badge Grid */}
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                            {BADGE_DEFINITIONS.map((badge, i) => {
                                const earned = (myBadges || []).some(b => b.badgeNumber === badge.badgeNumber);
                                return (
                                    <motion.div
                                        key={badge.badgeNumber}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 + i * 0.04 }}
                                        className="group relative flex flex-col items-center"
                                    >
                                        <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 transition-all ${
                                            earned
                                                ? 'border-[#33cbcc]/50 shadow-md shadow-[#33cbcc]/20'
                                                : 'border-gray-200 grayscale opacity-40'
                                        }`}>
                                            <img
                                                src={BADGE_IMAGES[badge.badgeNumber]}
                                                alt={badge.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <p className={`text-[10px] mt-1.5 text-center font-medium leading-tight ${
                                            earned ? 'text-gray-700' : 'text-gray-300'
                                        }`}>
                                            {badge.title}
                                        </p>
                                        <p className={`text-[9px] ${earned ? 'text-[#33cbcc]' : 'text-gray-300'}`}>
                                            {badge.milestone}
                                        </p>

                                        {/* Tooltip on hover */}
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gray-800 text-white text-[10px] rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                            {badge.title} — {badge.milestone} {t('profile.badges.tasks')}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Education */}
                    <EducationSection
                        educationDocs={user?.educationDocs || []}
                        onUpdate={(docs) => updateProfile.mutate({ educationDocs: docs })}
                        isSaving={updateProfile.isPending}
                    />

                    {/* Change Password */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl border border-gray-100 p-5 md:p-6"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-[#283852]/10 flex items-center justify-center">
                                <Key01Icon size={14} className="text-[#283852]" />
                            </div>
                            <h3 className="text-sm font-semibold text-gray-700">{t('profile.changePassword.title')}</h3>
                        </div>
                        <div className="space-y-3 max-w-sm">
                            {/* Current password */}
                            <div className="relative">
                                <input
                                    type={showCurrentPwd ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false); }}
                                    placeholder={t('profile.changePassword.currentPlaceholder')}
                                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33cbcc] focus:ring-1 focus:ring-[#33cbcc]/20"
                                />
                                <button type="button" onClick={() => setShowCurrentPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showCurrentPwd ? <ViewOffIcon size={15} /> : <ViewIcon size={15} />}
                                </button>
                            </div>
                            {/* New password */}
                            <div className="relative">
                                <input
                                    type={showNewPwd ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => { setNewPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false); }}
                                    placeholder={t('profile.changePassword.newPlaceholder')}
                                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33cbcc] focus:ring-1 focus:ring-[#33cbcc]/20"
                                />
                                <button type="button" onClick={() => setShowNewPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    {showNewPwd ? <ViewOffIcon size={15} /> : <ViewIcon size={15} />}
                                </button>
                            </div>
                            {/* Confirm password */}
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); setPasswordSuccess(false); }}
                                placeholder={t('profile.changePassword.confirmPlaceholder')}
                                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#33cbcc] focus:ring-1 focus:ring-[#33cbcc]/20"
                            />
                            {passwordError && <p className="text-xs text-[#283852]">{passwordError}</p>}
                            {passwordSuccess && <p className="text-xs text-[#33cbcc]">{t('profile.changePassword.success')}</p>}
                            <button
                                disabled={!currentPassword || newPassword.length < 6 || newPassword !== confirmPassword || changePassword.isPending}
                                onClick={() => {
                                    if (newPassword !== confirmPassword) {
                                        setPasswordError(t('profile.changePassword.mismatch'));
                                        return;
                                    }
                                    changePassword.mutate({ currentPassword, newPassword }, {
                                        onSuccess: () => {
                                            setPasswordSuccess(true);
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        },
                                        onError: () => setPasswordError(t('profile.changePassword.error')),
                                    });
                                }}
                                className="px-4 py-2 text-xs font-semibold bg-[#283852] text-white rounded-xl hover:bg-[#283852]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                            >
                                {changePassword.isPending ? <Loading02Icon size={13} className="animate-spin" /> : <Key01Icon size={13} />}
                                {t('profile.changePassword.submit')}
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* ── Edit Modal ── */}
            <AnimatePresence>
                {showEditModal && (
                    <EditProfileModal
                        profile={profile}
                        onClose={() => setShowEditModal(false)}
                        onSave={handleSave}
                        isSaving={updateProfile.isPending}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Profile;
