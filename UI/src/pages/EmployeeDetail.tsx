import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectsByDepartment } from '../api/projects';
import { useCreateTask, useTasksByEmployee, useUpdateTask, useDeleteTask, useTaskHistory, type Task, type TaskHistoryEntry } from '../api/tasks';
import {
    FileText,
    Clock,
    CheckCircle2,
    Circle,
    ChevronRight,
    ChevronLeft,
    Plus,
    Trash2,
    Calendar,
    List,
    AlertTriangle,
    GraduationCap,
    BookOpen,
    Download,
    Eye,
    Check,
    X,
    Trophy,
    Award,
    Cake,
    BriefcaseBusiness,
    Hourglass,
    Wallet,
    Repeat,
    Flag,
    Gauge,
    AlignLeft,
    FolderOpen,
    Zap,
    Phone,
    Mail,
    MapPin,
    CalendarCheck,
    Target,
    Users,
    Building2,
    TrendingUp,
    Loader2,
    Pencil,
    Camera,
    Upload,
    User,
    Briefcase,
    Building,
    Save,
    UserX,
    UserCheck,
    ShieldAlert,
    KeyRound,
    EyeOff,
    History,
} from 'lucide-react';
import { useEmployee, useEmployeeStats, useEmployeeBadges, useUpdateEmployee, useDismissEmployee, useReinstateEmployee, useChangeEmployeePassword } from '../api/employees/hooks';
import { DetailPageSkeleton } from '../components/Skeleton';
import badge1 from '../assets/badges/1.jpg';
import badge2 from '../assets/badges/2.jpg';
import badge3 from '../assets/badges/3.jpg';
import badge4 from '../assets/badges/4.jpg';
import badge5 from '../assets/badges/5.jpg';
import badge6 from '../assets/badges/6.jpg';
import badge7 from '../assets/badges/7.jpg';
import badge8 from '../assets/badges/8.jpg';
import badge9 from '../assets/badges/9.jpg';
import badge10 from '../assets/badges/10.jpg';
import badge11 from '../assets/badges/11.jpg';
import badge12 from '../assets/badges/12.jpg';
import badge13 from '../assets/badges/13.jpg';
import badge14 from '../assets/badges/14.jpg';
import badge15 from '../assets/badges/15.jpg';
import badge16 from '../assets/badges/16.jpg';

const BADGE_IMAGES: Record<number, string> = {
    1: badge1, 2: badge2, 3: badge3, 4: badge4,
    5: badge5, 6: badge6, 7: badge7, 8: badge8,
    9: badge9, 10: badge10, 11: badge11, 12: badge12,
    13: badge13, 14: badge14, 15: badge15, 16: badge16,
};
import { useDepartments } from '../api/departments/hooks';
import { usePositions } from '../api/positions/hooks';
import { useFormations } from '../api/formations/hooks';
import { useSanctionsByEmployee, useCreateSanction, useDeleteSanction } from '../api/sanctions/hooks';
import { useEntretiens } from '../api/entretiens/hooks';
import { useDocuments } from '../api/documents/hooks';
import { documentsApi } from '../api/documents/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    AreaChart,
    Area,
    CartesianGrid
} from 'recharts';
import type { EmployeeTab } from '../components/EmployeeDetailSidebar';
import type { Employee } from '../api/employees/types';

export interface EmployeeUI extends Employee {
    name?: string;
    role?: string;
    avatar?: string;
    stats: { projects: number; done: number; progress: number };
    productivity: number;
    color: string;
    phone?: string;
    email?: string;
}

interface EmployeeDetailProps {
    employee: EmployeeUI;
    activeTab: EmployeeTab;
    teamMembers?: EmployeeUI[];
}

/* ─── Skills list for suggestions ─────────────────────── */
const SKILLS = [
    'Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'Wireframing',
    'Design Systems', 'UI Design', 'Illustrator', 'Photoshop', 'Branding',
    'Typography', 'Motion Design', 'CSS', 'React', 'TypeScript', 'Tailwind CSS',
    'Node.js', 'Leadership', 'Project Mgmt', 'Agile', 'After Effects', '3D Design',
];

/* ─── Edit Employee Modal ─────────────────────────────── */

const EditEmployeeModal = ({ employee, onClose }: { employee: EmployeeUI; onClose: () => void }) => {
    const { t } = useTranslation();
    const updateEmployee = useUpdateEmployee();
    const changePassword = useChangeEmployeePassword();
    const { data: apiDepartments } = useDepartments();
    const { data: apiPositions } = usePositions();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const [form, setForm] = useState({
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        email: employee.user?.email || employee.email || '',
        phoneNumber: employee.phoneNumber || employee.phone || '',
        address: employee.address || '',
        salary: employee.salary ? String(employee.salary) : '',
        birthDate: employee.birthDate ? employee.birthDate.split('T')[0] : '',
        hireDate: employee.hireDate ? employee.hireDate.split('T')[0] : '',
        departmentId: employee.departmentId || '',
        positionId: employee.positionId || '',
        skills: [...(employee.skills || [])],
        avatarUrl: employee.avatarUrl || '',
    });

    const [skillInput, setSkillInput] = useState('');
    const [avatarPreview, setAvatarPreview] = useState(employee.avatarUrl || employee.avatar || '');

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    const handleImageChange = useCallback((file: File | null) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return; // 2MB max
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setAvatarPreview(base64);
            setForm(prev => ({ ...prev, avatarUrl: base64 }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleImageChange(e.dataTransfer.files[0] || null);
    }, [handleImageChange]);

    const addCustomSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && !form.skills.includes(trimmed)) {
            setForm(prev => ({ ...prev, skills: [...prev.skills, trimmed] }));
        }
        setSkillInput('');
    };

    const toggleSkill = (skill: string) => {
        setForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skill)
                ? prev.skills.filter(s => s !== skill)
                : [...prev.skills, skill],
        }));
    };

    const isValid = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';

    const handleSubmit = () => {
        if (!isValid) return;
        updateEmployee.mutate({
            id: employee.id,
            dto: {
                firstName: form.firstName,
                lastName: form.lastName,
                email: form.email || undefined,
                phoneNumber: form.phoneNumber || undefined,
                address: form.address || undefined,
                salary: form.salary ? Number(form.salary) : undefined,
                birthDate: form.birthDate || undefined,
                hireDate: form.hireDate || undefined,
                departmentId: form.departmentId || undefined,
                positionId: form.positionId || undefined,
                skills: form.skills,
                avatarUrl: form.avatarUrl || undefined,
            },
        }, { onSuccess: () => onClose() });
    };

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
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Pencil size={20} className="text-[#33cbcc]" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{t('employees.edit.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Profile Picture */}
                    <div>
                        <label className={labelCls}>
                            <Camera size={12} />
                            {t('employees.edit.profilePicture')}
                        </label>
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <User size={28} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Camera size={18} className="text-white" />
                                </button>
                            </div>
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#33cbcc]/40 transition-colors"
                            >
                                <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                                <p className="text-xs text-gray-500">{t('employees.edit.dragOrClick')}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{t('employees.edit.maxSize')}</p>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={e => handleImageChange(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={() => { setAvatarPreview(''); setForm(prev => ({ ...prev, avatarUrl: '' })); }}
                                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                                >
                                    {t('employees.edit.removePhoto')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* First + Last Name */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <User size={12} />
                                {t('employees.create.firstName')}
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
                                {t('employees.create.lastName')}
                            </label>
                            <input
                                type="text"
                                value={form.lastName}
                                onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className={labelCls}>
                            <Mail size={12} />
                            {t('employees.create.email')}
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                            className={inputCls}
                        />
                    </div>

                    {/* Phone + Address */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Phone size={12} />
                                {t('employees.create.phone')}
                            </label>
                            <input
                                type="text"
                                value={form.phoneNumber}
                                onChange={e => setForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <MapPin size={12} />
                                {t('employees.create.address')}
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Salary */}
                    <div>
                        <label className={labelCls}>
                            <Briefcase size={12} />
                            {t('employees.create.salary')} (XAF)
                        </label>
                        <input
                            type="number"
                            value={form.salary}
                            onChange={e => setForm(prev => ({ ...prev, salary: e.target.value }))}
                            className={inputCls}
                        />
                    </div>

                    {/* Birth Date + Hire Date */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('employees.create.dateOfBirth')}
                            </label>
                            <input
                                type="date"
                                value={form.birthDate}
                                onChange={e => setForm(prev => ({ ...prev, birthDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
                                {t('employees.create.startDate')}
                            </label>
                            <input
                                type="date"
                                value={form.hireDate}
                                onChange={e => setForm(prev => ({ ...prev, hireDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Department + Position */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Building size={12} />
                                {t('employees.create.department')}
                            </label>
                            <select
                                value={form.departmentId}
                                onChange={e => setForm(prev => ({ ...prev, departmentId: e.target.value }))}
                                className={inputCls + ' appearance-none cursor-pointer'}
                            >
                                <option value="">{t('employees.create.departmentPlaceholder')}</option>
                                {(apiDepartments || []).map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Briefcase size={12} />
                                {t('employees.create.role')}
                            </label>
                            <select
                                value={form.positionId}
                                onChange={e => setForm(prev => ({ ...prev, positionId: e.target.value }))}
                                className={inputCls + ' appearance-none cursor-pointer'}
                            >
                                <option value="">{t('employees.create.rolePlaceholder')}</option>
                                {(apiPositions || []).map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <Zap size={14} className="text-[#33cbcc]" />
                                {t('employees.create.skills')}
                            </div>
                            {form.skills.length > 0 && (
                                <span className="text-[10px] font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-2 py-0.5 rounded-full">
                                    {form.skills.length}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={skillInput}
                                onChange={e => setSkillInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                                placeholder={t('employees.create.skillsPlaceholder')}
                                className="flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                            <button
                                type="button"
                                onClick={addCustomSkill}
                                disabled={!skillInput.trim()}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    skillInput.trim()
                                        ? 'bg-[#33cbcc] text-white hover:bg-[#2bb5b6]'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {SKILLS.map(skill => {
                                const selected = form.skills.includes(skill);
                                return (
                                    <button
                                        key={skill}
                                        type="button"
                                        onClick={() => toggleSkill(skill)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            selected
                                                ? 'bg-[#33cbcc] text-white shadow-sm'
                                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                        }`}
                                    >
                                        {skill}
                                    </button>
                                );
                            })}
                            {form.skills.filter(s => !SKILLS.includes(s)).map(skill => (
                                <button
                                    key={skill}
                                    type="button"
                                    onClick={() => toggleSkill(skill)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#33cbcc] text-white shadow-sm transition-all"
                                >
                                    {skill}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Change Password */}
                <div className="px-6 pb-5">
                    <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                        <label className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                            <KeyRound size={11} />
                            {t('employees.edit.changePassword')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => { setNewPassword(e.target.value); setPasswordSuccess(false); }}
                                placeholder={t('employees.edit.newPasswordPlaceholder')}
                                className="w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 pr-10 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={newPassword.length < 6 || changePassword.isPending}
                                onClick={() => changePassword.mutate({ id: employee.id, password: newPassword }, {
                                    onSuccess: () => { setPasswordSuccess(true); setNewPassword(''); },
                                })}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors ${
                                    newPassword.length >= 6 ? 'bg-[#283852] hover:bg-[#1e2a3d]' : 'bg-gray-300 cursor-not-allowed'
                                }`}
                            >
                                {changePassword.isPending ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                                {t('employees.edit.setPassword')}
                            </button>
                            {passwordSuccess && <span className="text-xs text-green-500 font-medium">{t('employees.edit.passwordUpdated')}</span>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('employees.create.cancel')}
                    </button>
                    <button
                        disabled={!isValid || updateEmployee.isPending}
                        onClick={handleSubmit}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {updateEmployee.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {updateEmployee.isPending ? t('employees.edit.saving') : t('employees.edit.save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

const InfosView = ({ employee, teamMembers = [] }: { employee: EmployeeUI; teamMembers?: EmployeeUI[] }) => {
    const { t } = useTranslation();
    const [showTrophiesModal, setShowTrophiesModal] = useState(false);
    const [showBadgesModal, setShowBadgesModal] = useState(false);

    const { data: stats } = useEmployeeStats(employee.id);
    const { data: employeeTasks = [] } = useTasksByEmployee(employee.id);
    const { data: departmentProjects = [] } = useProjectsByDepartment(employee.departmentId);
    const { data: employeeBadges = [] } = useEmployeeBadges(String(employee.id));

    const trophies: { id: number; title: string; date: string; icon: string }[] = [];
    const badges = employeeBadges.map(b => ({
        id: b.badgeNumber,
        title: b.title,
        color: '#6366f1',
        icon: '',
        image: BADGE_IMAGES[b.badgeNumber],
        earnedAt: b.earnedAt,
    }));

    // Years in company from hireDate
    const yearsInCompany = employee.hireDate
        ? Math.floor((Date.now() - new Date(employee.hireDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

    const formatSalary = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount);

    const weeklyData = stats?.weeklyActivity || [
        { name: t('employeeDetail.days.mon'), hours: 0, active: false },
        { name: t('employeeDetail.days.tue'), hours: 0, active: false },
        { name: t('employeeDetail.days.wed'), hours: 0, active: false },
        { name: t('employeeDetail.days.thu'), hours: 0, active: false },
        { name: t('employeeDetail.days.fri'), hours: 0, active: false },
        { name: t('employeeDetail.days.sat'), hours: 0, active: false },
        { name: t('employeeDetail.days.sun'), hours: 0, active: false },
    ];

    const totalHours = weeklyData.reduce((sum: number, d: any) => sum + d.hours, 0);
    const avgHours = Math.floor(totalHours / 7);
    const avgMinutes = Math.round(((totalHours / 7) - avgHours) * 60);

    const productivityData = stats?.productivityData || [];
    const currentMonthIndex = new Date().getMonth();
    const currentProductivity = productivityData.length > currentMonthIndex ? productivityData[currentMonthIndex].value : 0;

    // Calculate change vs last month
    let productivityChange = 0;
    if (currentMonthIndex > 0 && productivityData.length > currentMonthIndex) {
        const current = productivityData[currentMonthIndex].value;
        const prev = productivityData[currentMonthIndex - 1].value;
        productivityChange = current - prev;
    }

    // Goals from real projects: track task completion per project
    const goals: { title: string; progress: number }[] = departmentProjects.slice(0, 4).map(p => {
        const projectTasks = employeeTasks.filter(t => t.projectId === p.id);
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;
        return { title: p.name, progress: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });

    const skills: { name: string; level: number; color: string }[] = (employee.skills || []).map((skill, i) => ({
        name: skill,
        level: 75 + ((skill.charCodeAt(0) * 7 + i * 13) % 26),
        color: i % 3 === 0 ? '#33cbcc' : i % 3 === 1 ? '#283852' : '#f59e0b',
    }));

    const contact = { phone: employee.phone || 'N/A', email: employee.email || 'N/A', address: employee.address || 'N/A' };

    // Days worked this month: count unique days with completed tasks
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysWorked = new Set(
        employeeTasks
            .filter(t => {
                const d = new Date(t.updatedAt);
                return (t.state === 'COMPLETED' || t.state === 'REVIEWED') && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            })
            .map(t => new Date(t.updatedAt).toDateString())
    ).size;
    const workingDaysInMonth = 23;
    const daysWorkedPercent = Math.round((daysWorked / workingDaysInMonth) * 100);

    const salary = {
        gross: employee.salary || 0,
        net: employee.salary ? Math.round((employee.salary / workingDaysInMonth) * daysWorked) : 0,
        currency: 'XAF'
    };

    // Projects done / total from real data
    const completedTasks = employeeTasks.filter(t => t.state === 'COMPLETED' || t.state === 'REVIEWED').length;
    const totalTasks = employeeTasks.length;
    const inProgressTasks = employeeTasks.filter(t => t.state === 'IN_PROGRESS' || t.state === 'ASSIGNED').length;

    const projectsRatio = `${completedTasks}/${totalTasks}`;
    const projectsPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const tasksRatio = `${inProgressTasks}/${totalTasks}`;
    const tasksPercent = totalTasks > 0 ? Math.round((inProgressTasks / totalTasks) * 100) : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-3 space-y-5">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl overflow-hidden">
                    {/* Photo filling top half */}
                    <div className="h-48">
                        <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                    </div>
                    {/* Info section */}
                    <div className="bg-linear-to-b from-[#1a2740] to-[#0f1a2e] px-5 pb-5 pt-3 text-center">
                        <h2 className="text-lg font-bold text-white">{employee.name}</h2>
                        <p className="text-gray-400 text-sm mt-0.5">{employee.role}</p>
                    </div>
                </motion.div>

                {/* Personal Info Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3.5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center shrink-0"><Cake size={16} className="text-pink-500" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.personalInfo.birthDate')}</p>
                            <p className="text-sm font-semibold text-gray-800">{employee.birthDate ? new Date(employee.birthDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><BriefcaseBusiness size={16} className="text-blue-500" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.personalInfo.hireDate')}</p>
                            <p className="text-sm font-semibold text-gray-800">{employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#33cbcc]/10 flex items-center justify-center shrink-0"><Hourglass size={16} className="text-[#33cbcc]" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.personalInfo.yearsInCompany')}</p>
                            <p className="text-sm font-semibold text-gray-800">{yearsInCompany} {t('employeeDetail.personalInfo.years')}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Contact Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3.5">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{t('employeeDetail.contact.title')}</h3>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><Phone size={16} className="text-green-500" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.contact.phone')}</p>
                            <p className="text-sm font-semibold text-gray-800">{contact.phone}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Mail size={16} className="text-blue-500" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.contact.email')}</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{contact.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center shrink-0"><MapPin size={16} className="text-orange-500" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.contact.address')}</p>
                            <p className="text-sm font-semibold text-gray-800">{contact.address}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Days Worked This Month */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <CalendarCheck size={16} className="text-[#33cbcc]" />
                        <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.daysWorked.title')}</h3>
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-3">
                        <span className="text-3xl font-bold text-gray-800">{daysWorked}</span>
                        <span className="text-sm text-gray-400">{t('employeeDetail.daysWorked.of')} {workingDaysInMonth} {t('employeeDetail.daysWorked.days')}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${daysWorkedPercent}%` }}
                            transition={{ delay: 0.3, duration: 0.8 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: daysWorkedPercent >= 80 ? '#33cbcc' : daysWorkedPercent >= 60 ? '#f59e0b' : '#ef4444' }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.daysWorked.thisMonth')}</span>
                        <span className="text-xs font-bold" style={{ color: daysWorkedPercent >= 80 ? '#33cbcc' : daysWorkedPercent >= 60 ? '#f59e0b' : '#ef4444' }}>{daysWorkedPercent}%</span>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.team.title')}</h3>
                        <button className="text-xs text-[#33cbcc] font-medium hover:underline">{t('employeeDetail.showAll')}</button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {teamMembers.map((member, i) => (
                            <div key={i} className="text-center">
                                <div className="w-11 h-11 mx-auto rounded-full overflow-hidden border-2 border-gray-100">
                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                </div>
                                <p className="text-[10px] font-medium text-gray-700 mt-1.5 truncate">{(member.name ?? `${member.firstName} ${member.lastName}`).split(' ')[0]}</p>
                                <p className="text-[9px] text-gray-400 truncate">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Skills Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap size={16} className="text-[#33cbcc]" />
                        <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.skills.title')}</h3>
                    </div>
                    <div className="space-y-3">
                        {skills.map((skill, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium text-gray-700">{skill.name}</span>
                                    <span className="text-[10px] font-semibold text-gray-400">{skill.level}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${skill.level}%` }}
                                        transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
                                        className="h-full rounded-full"
                                        style={{ backgroundColor: skill.color }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* MIDDLE COLUMN */}
            <div className="lg:col-span-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-2">{t('employeeDetail.stats.projectsDone')}</p>
                        <div className="flex items-end gap-3">
                            <span className="text-2xl font-bold text-gray-800">{projectsRatio}</span>
                            <div className="flex-1"><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#33cbcc]" style={{ width: `${projectsPercent}%` }} /></div></div>
                            <span className="text-xs text-gray-400">{projectsPercent}%</span>
                        </div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                        <p className="text-xs text-gray-400 font-medium mb-2">{t('employeeDetail.stats.tasksActive')}</p>
                        <div className="flex items-end gap-3">
                            <span className="text-2xl font-bold text-gray-800">{tasksRatio}</span>
                            <div className="flex-1"><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#283852]" style={{ width: `${tasksPercent}%` }} /></div></div>
                            <span className="text-xs text-gray-400">{tasksPercent}%</span>
                        </div>
                    </motion.div>
                </div>

                {/* Salary Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-linear-to-br from-[#1a2740] to-[#283852] rounded-2xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Wallet size={16} className="text-[#33cbcc]" />
                            <h3 className="font-semibold text-sm">{t('employeeDetail.salary.title')}</h3>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">{t('employeeDetail.salary.monthly')}</span>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.salary.gross')}</p>
                            <p className="text-2xl font-bold">{formatSalary(salary.gross)} <span className="text-sm font-normal text-gray-400">{salary.currency}</span></p>
                        </div>
                        <div className="h-px bg-white/10" />
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.salary.net')}</p>
                            <p className="text-lg font-semibold text-[#33cbcc]">{formatSalary(salary.net)} <span className="text-sm font-normal text-gray-400">{salary.currency}</span></p>
                        </div>
                    </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.progress.title')}</h3>
                        <span className="text-xs text-gray-400">{t('employeeDetail.progress.week')}</span>
                    </div>
                    <div className="flex items-baseline gap-1 mb-5">
                        <span className="text-3xl font-bold text-gray-800">{avgHours}h {avgMinutes}m</span>
                        <span className="text-sm text-gray-400 ml-2">{t('employeeDetail.progress.avgActivity')}</span>
                    </div>
                    <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData} barCategoryGap="30%">
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis hide />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(value: any) => [`${value || 0}h`, t('employeeDetail.progress.hours')]} cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
                                    {weeklyData.map((entry, index) => (
                                        <Cell key={index} fill={entry.active ? '#33cbcc' : '#E5E7EB'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Productivity Line Chart */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.productivity.title')}</h3>
                        <span className="text-xs text-gray-400">{t('employeeDetail.productivity.yearly')}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-5">
                        <span className="text-3xl font-bold text-gray-800">{currentProductivity}%</span>
                        <span className={`text-sm font-semibold ${productivityChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>{productivityChange >= 0 ? '+' : ''}{productivityChange}%</span>
                        <span className="text-xs text-gray-400 ml-1">{t('employeeDetail.productivity.vsLastMonth')}</span>
                    </div>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={productivityData}>
                                <defs>
                                    <linearGradient id={`prodGradient-${employee.id}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#33cbcc" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#33cbcc" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} width={40} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' }} formatter={(value: any) => [`${value || 0}%`, t('employeeDetail.productivity.title')]} cursor={{ stroke: '#33cbcc', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                <Area type="monotone" dataKey="value" stroke="#33cbcc" strokeWidth={2.5} fill={`url(#prodGradient-${employee.id})`} dot={false} activeDot={{ r: 5, fill: '#33cbcc', stroke: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Points Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-[#33cbcc] to-[#2ab5b6] rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-white/80" />
                        <h3 className="font-semibold text-sm">{t('employeeDetail.points.title')}</h3>
                    </div>
                    <p className="text-3xl font-bold">{stats?.points || 0}</p>
                    <p className="text-xs text-white/70 mt-1">{t('employeeDetail.points.accumulated')}</p>
                </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4 space-y-5">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{t('employeeDetail.goals.title')}</h3>
                    <p className="text-[11px] text-gray-400 mb-4">{t('employeeDetail.goals.subtitle')}</p>
                    <div className="space-y-4">
                        {goals.map((goal, i) => (
                            <div key={i}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                        <ChevronRight size={14} className="text-[#33cbcc]" />
                                        <span className="text-sm font-medium text-gray-700">{goal.title}</span>
                                    </div>
                                    <span className="text-sm font-bold text-gray-800">{goal.progress}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden ml-5">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${goal.progress}%` }} transition={{ delay: 0.3 + i * 0.15, duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: goal.progress > 50 ? '#33cbcc' : '#283852' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* Trophies Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} onClick={() => setShowTrophiesModal(true)} className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer hover:border-[#33cbcc]/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Trophy size={16} className="text-amber-500" />
                            <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.trophies.title')}</h3>
                        </div>
                        <span className="text-xs text-gray-400">{trophies.length}</span>
                    </div>
                    <div className="space-y-2.5">
                        {trophies.slice(0, 3).map(trophy => (
                            <div key={trophy.id} className="flex items-center gap-3">
                                <span className="text-lg">{trophy.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-700 truncate">{trophy.title}</p>
                                    <p className="text-[10px] text-gray-400">{trophy.date}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {trophies.length > 3 && (
                        <p className="text-[11px] text-[#33cbcc] font-medium mt-3 text-center">{t('employeeDetail.showAll')}</p>
                    )}
                </motion.div>

                {/* Badges Card */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} onClick={() => setShowBadgesModal(true)} className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer hover:border-[#33cbcc]/30 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Award size={16} className="text-indigo-500" />
                            <h3 className="font-semibold text-gray-800 text-sm">{t('employeeDetail.badges.title')}</h3>
                        </div>
                        <span className="text-xs text-gray-400">{badges.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {badges.slice(0, 4).map(badge => (
                            <div key={badge.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                                {badge.image ? (
                                    <img src={badge.image} alt={badge.title} className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                    <Award size={14} />
                                )}
                                {badge.title}
                            </div>
                        ))}
                    </div>
                    {badges.length > 4 && (
                        <p className="text-[11px] text-[#33cbcc] font-medium mt-3 text-center">+{badges.length - 4} {t('employeeDetail.badges.more')}</p>
                    )}
                </motion.div>
            </div>

            {/* Trophies Modal */}
            <AnimatePresence>
                {showTrophiesModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowTrophiesModal(false)}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Trophy size={20} className="text-amber-500" />
                                    <h2 className="text-lg font-bold text-gray-800">{t('employeeDetail.trophies.title')}</h2>
                                </div>
                                <button onClick={() => setShowTrophiesModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="space-y-3">
                                {trophies.map((trophy, i) => (
                                    <motion.div key={trophy.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-4 p-3.5 rounded-xl bg-gray-50 hover:bg-amber-50/50 transition-colors">
                                        <span className="text-2xl">{trophy.icon}</span>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-gray-800">{trophy.title}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{trophy.date}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Badges Modal */}
            <AnimatePresence>
                {showBadgesModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowBadgesModal(false)}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <Award size={20} className="text-indigo-500" />
                                    <h2 className="text-lg font-bold text-gray-800">{t('employeeDetail.badges.title')}</h2>
                                </div>
                                <button onClick={() => setShowBadgesModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {badges.map((badge, i) => (
                                    <motion.div key={badge.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                                        {badge.image ? (
                                            <img src={badge.image} alt={badge.title} className="w-12 h-12 rounded-full object-cover" />
                                        ) : (
                                            <Award size={32} className="text-indigo-500" />
                                        )}
                                        <p className="text-xs font-semibold text-center text-indigo-600">{badge.title}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

// ============================================================
// TASKS VIEW
// ============================================================
type TaskDifficulty = 'easy' | 'medium' | 'hard';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type CalendarMode = 'day' | 'week' | 'month' | 'year';



// mockProjects removed - now using real projects from API

interface TaskDraft {
    title: string;
    description: string;
    deadline: string;
    time: string;
    assignee: string;
    project: string;
    difficulty: string;
    priority: string;
    repeat: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
}

const emptyDraft = (): TaskDraft => ({
    title: '',
    description: '',
    deadline: '',
    time: '',
    assignee: '',
    project: '',
    difficulty: 'medium',
    priority: 'medium',
    repeat: 'none',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
});

const formatDateStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekDates = (refDate: Date) => {
    const dow = refDate.getDay();
    const monday = new Date(refDate);
    monday.setDate(refDate.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
    });
};

/* ─── Edit Task Modal ─────────────────────────────────── */

const EditTaskModal = ({
    task,
    onClose,
    onSave,
    isSaving,
    t,
}: {
    task: Task;
    onClose: () => void;
    onSave: (dto: Partial<Task>) => void;
    isSaving: boolean;
    t: (key: string) => string;
}) => {
    const [form, setForm] = useState({
        title: task.title || '',
        description: task.description || '',
        difficulty: task.difficulty || 'MEDIUM',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        startDate: task.startDate ? task.startDate.split('T')[0] : '',
        endDate: task.endDate ? task.endDate.split('T')[0] : '',
        startTime: task.startTime || '',
    });

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 block';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            <Pencil size={18} className="text-[#33cbcc]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('employeeDetail.tasks.editTask')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <label className={labelCls}>{t('employeeDetail.tasks.titlePlaceholder')}</label>
                        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('employeeDetail.tasks.descriptionPlaceholder')}</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className={`${inputCls} resize-none`} />
                    </div>
                    <div>
                        <label className={labelCls}>{t('employeeDetail.tasks.difficulty')}</label>
                        <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as 'EASY' | 'MEDIUM' | 'HARD' }))} className={inputCls}>
                            <option value="EASY">{t('employeeDetail.tasks.difficultyEasy')}</option>
                            <option value="MEDIUM">{t('employeeDetail.tasks.difficultyMedium')}</option>
                            <option value="HARD">{t('employeeDetail.tasks.difficultyHard')}</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>{t('employeeDetail.tasks.startDate')}</label>
                            <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>{t('employeeDetail.tasks.endDate')}</label>
                            <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className={inputCls} />
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>{t('employeeDetail.tasks.startTime')}</label>
                        <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} className={inputCls} />
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">{t('employeeDetail.cancel')}</button>
                    <button
                        onClick={() => onSave({ title: form.title, description: form.description, difficulty: form.difficulty as any, dueDate: form.dueDate || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, startTime: form.startTime || undefined })}
                        disabled={!form.title.trim() || isSaving}
                        className="px-5 py-2 bg-[#33cbcc] text-white rounded-xl text-sm font-medium hover:bg-[#2bb5b6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {t('employeeDetail.save')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Task History Modal ──────────────────────────────── */

const TaskHistoryModal = ({
    taskId,
    onClose,
    t,
}: {
    taskId: string;
    onClose: () => void;
    t: (key: string) => string;
}) => {
    const { data: history = [], isLoading } = useTaskHistory(taskId);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#283852]/10 flex items-center justify-center">
                            <History size={18} className="text-[#283852]" />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">{t('employeeDetail.tasks.historyTitle')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>
                <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
                    ) : history.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">{t('employeeDetail.tasks.historyEmpty')}</p>
                    ) : (
                        <div className="space-y-4">
                            {(history as TaskHistoryEntry[]).map(entry => (
                                <div key={entry.id} className="bg-gray-50 rounded-xl p-4 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-[#283852]">{entry.changedByName}</span>
                                        <span className="text-[11px] text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="space-y-1">
                                        {Object.entries(entry.changes).map(([field, change]) => (
                                            <div key={field} className="text-[11px] text-gray-600">
                                                <span className="font-medium text-gray-700 capitalize">{field}:</span>{' '}
                                                <span className="line-through text-gray-400">{String(change.from ?? '—')}</span>
                                                {' → '}
                                                <span className="text-[#33cbcc] font-medium">{String(change.to ?? '—')}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};

const TasksView = ({ employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [calendarMode, setCalendarMode] = useState<CalendarMode>('week');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [drafts, setDrafts] = useState<TaskDraft[]>([emptyDraft()]);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [showHistoryTaskId, setShowHistoryTaskId] = useState<string | null>(null);

    // Fetch department projects and employee tasks
    const { data: departmentProjects } = useProjectsByDepartment(employee.departmentId);
    const { data: apiTasks = [] } = useTasksByEmployee(employee.id);
    const createTaskMutation = useCreateTask();
    const updateTaskMutation = useUpdateTask();
    const deleteTaskMutation = useDeleteTask();

    // Debug logging
    console.log('Employee departmentId:', employee.departmentId);
    console.log('Department projects:', departmentProjects);
    console.log('API Tasks:', apiTasks);

    const updateDraft = (index: number, field: string, value: string) => {
        setDrafts(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
    };
    const addDraftRow = () => setDrafts(prev => [...prev, emptyDraft()]);
    const removeDraftRow = (index: number) => { if (drafts.length > 1) setDrafts(prev => prev.filter((_, i) => i !== index)); };

    const submitTasks = async () => {
        const valid = drafts.filter(d => d.title.trim());
        if (valid.length === 0) return;
        
        // Create tasks via API
        for (const draft of valid) {
            await createTaskMutation.mutateAsync({
                title: draft.title,
                description: draft.description,
                assignedToId: String(employee.id), // Map to assignedToId to match database schema
                projectId: draft.project || undefined,
                startDate: draft.startDate || undefined,
                endDate: draft.endDate || undefined,
                startTime: draft.startTime || undefined,
                endTime: draft.endTime || undefined,
                priority: draft.priority,
                difficulty: draft.difficulty?.toUpperCase(), // Convert to uppercase for database enum
            });
        }
        
        // Tasks will automatically refresh from API via react-query
        setDrafts([emptyDraft()]);
        setShowModal(false);
    };



    const handleSlotClick = (date: Date, hour: number) => {
        setDrafts([{ ...emptyDraft(), deadline: formatDateStr(date), time: `${String(hour).padStart(2, '0')}:00` }]);
        setShowModal(true);
    };

    const navigateCalendar = (dir: number) => {
        const d = new Date(selectedDate);
        if (calendarMode === 'day') d.setDate(d.getDate() + dir);
        else if (calendarMode === 'week') d.setDate(d.getDate() + dir * 7);
        else if (calendarMode === 'month') d.setMonth(d.getMonth() + dir);
        else d.setFullYear(d.getFullYear() + dir);
        setSelectedDate(d);
    };

    const priorityConfig: Record<TaskPriority, { color: string; label: string }> = {
        low: { color: '#9CA3AF', label: t('employeeDetail.tasks.priorityLow') },
        medium: { color: '#f59e0b', label: t('employeeDetail.tasks.priorityMedium') },
        high: { color: '#f97316', label: t('employeeDetail.tasks.priorityHigh') },
        urgent: { color: '#ef4444', label: t('employeeDetail.tasks.priorityUrgent') },
    };
    const difficultyConfig: Record<TaskDifficulty, { color: string; label: string }> = {
        easy: { color: '#22c55e', label: t('employeeDetail.tasks.difficultyEasy') },
        medium: { color: '#f59e0b', label: t('employeeDetail.tasks.difficultyMedium') },
        hard: { color: '#ef4444', label: t('employeeDetail.tasks.difficultyHard') },
    };

    const timeSlots = Array.from({ length: 14 }, (_, i) => i + 7);
    const dayLabels = [t('employeeDetail.days.mon'), t('employeeDetail.days.tue'), t('employeeDetail.days.wed'), t('employeeDetail.days.thu'), t('employeeDetail.days.fri'), t('employeeDetail.days.sat'), t('employeeDetail.days.sun')];
    const todayStr = formatDateStr(new Date());
    const weekDates = getWeekDates(selectedDate);

    const calendarLabel = (() => {
        if (calendarMode === 'day') return selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        if (calendarMode === 'week') { const s = weekDates[0]; const e = weekDates[6]; return `${s.getDate()} - ${e.getDate()} ${e.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`; }
        if (calendarMode === 'month') return selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        return String(selectedDate.getFullYear());
    })();

    const getTaskColor = (task: Task) => {
        if (task.state === 'COMPLETED') return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
        if (task.priority === 'urgent') return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
        if (task.priority === 'high') return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' };
        return { bg: '#ecfeff', text: '#0891b2', border: '#a5f3fc' };
    };

    const inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:border-[#33cbcc]/30 transition-colors";
    const selectClass = "border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20 bg-white appearance-none cursor-pointer";
    const calModes: CalendarMode[] = ['day', 'week', 'month', 'year'];
    const calModeLabels: Record<CalendarMode, string> = { day: t('employeeDetail.tasks.calendarDay'), week: t('employeeDetail.tasks.calendarWeek'), month: t('employeeDetail.tasks.calendarMonth'), year: t('employeeDetail.tasks.calendarYear') };

    // Month view helpers
    const getMonthDays = (year: number, month: number) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        return { daysInMonth, offset };
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.tasks')}</h2>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-[#33cbcc]' : 'text-gray-400'}`}><List size={18} /></button>
                        <button onClick={() => setViewMode('calendar')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-[#33cbcc]' : 'text-gray-400'}`}><Calendar size={18} /></button>
                    </div>
                    <button onClick={() => { setDrafts([emptyDraft()]); setShowModal(true); }} className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2bb5b6] transition-colors">
                        <Plus size={16} /> {t('employeeDetail.tasks.add')}
                    </button>
                </div>
            </div>

            {/* Calendar sub-header */}
            {viewMode === 'calendar' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigateCalendar(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronLeft size={20} /></button>
                        <span className="text-sm font-semibold text-gray-800 min-w-[220px] text-center">{calendarLabel}</span>
                        <button onClick={() => navigateCalendar(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><ChevronRight size={20} /></button>
                        <button onClick={() => setSelectedDate(new Date())} className="ml-2 text-xs text-[#33cbcc] font-medium px-3 py-1.5 rounded-lg hover:bg-[#33cbcc]/10 transition-colors border border-[#33cbcc]/20">{t('employeeDetail.tasks.today')}</button>
                    </div>
                    <div className="flex bg-gray-100 rounded-xl p-1">
                        {calModes.map(m => (
                            <button key={m} onClick={() => setCalendarMode(m)} className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${calendarMode === m ? 'bg-white shadow-sm text-[#33cbcc]' : 'text-gray-400 hover:text-gray-600'}`}>{calModeLabels[m]}</button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Task Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-800">{t('employeeDetail.tasks.createTitle')}</h2>
                                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                                {drafts.map((draft, idx) => (
                                    <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`space-y-4 ${idx > 0 ? 'pt-5 border-t border-gray-100' : ''}`}>
                                        {drafts.length > 1 && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('employeeDetail.tasks.taskNumber')} {idx + 1}</span>
                                                <button onClick={() => removeDraftRow(idx)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        )}
                                        <input value={draft.title} onChange={e => updateDraft(idx, 'title', e.target.value)} placeholder={t('employeeDetail.tasks.titlePlaceholder')} className={inputClass} />
                                        <div className="relative">
                                            <AlignLeft size={14} className="absolute left-4 top-3.5 text-gray-400" />
                                            <textarea value={draft.description} onChange={e => updateDraft(idx, 'description', e.target.value)} placeholder={t('employeeDetail.tasks.descriptionPlaceholder')} rows={2} className={`${inputClass} pl-10 resize-none`} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1"><FolderOpen size={10} /> {t('employeeDetail.tasks.project')}</label>
                                            <select value={draft.project} onChange={e => updateDraft(idx, 'project', e.target.value)} className={`${selectClass} w-full`}>
                                                <option value="">{t('employeeDetail.tasks.projectNone')}</option>
                                                {(departmentProjects || []).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                            </select>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">{t('employeeDetail.tasks.startDate')}</label><input type="date" value={draft.startDate} onChange={e => updateDraft(idx, 'startDate', e.target.value)} className={inputClass} /></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">{t('employeeDetail.tasks.endDate')}</label><input type="date" value={draft.endDate} onChange={e => updateDraft(idx, 'endDate', e.target.value)} className={inputClass} /></div>
                                        </div>
                                        
                                        {/* Time Duration Section */}
                                        <div>
                                            <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-2 flex items-center gap-1"><Clock size={10} /> {t('employeeDetail.tasks.duration')}</label>
                                            <div className="flex gap-2 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const now = new Date();
                                                        const startTime = draft.startTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                                        const [hours, minutes] = startTime.split(':').map(Number);
                                                        const endDate = new Date(2000, 0, 1, hours + 1, minutes);
                                                        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                                                        updateDraft(idx, 'startTime', startTime);
                                                        updateDraft(idx, 'endTime', endTime);
                                                    }}
                                                    className="flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors"
                                                >
                                                    {t('employeeDetail.tasks.oneHour')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const now = new Date();
                                                        const startTime = draft.startTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                                                        const [hours, minutes] = startTime.split(':').map(Number);
                                                        const endDate = new Date(2000, 0, 1, hours + 2, minutes);
                                                        const endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                                                        updateDraft(idx, 'startTime', startTime);
                                                        updateDraft(idx, 'endTime', endTime);
                                                    }}
                                                    className="flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors"
                                                >
                                                    {t('employeeDetail.tasks.twoHours')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 border-gray-200 hover:border-[#33cbcc] hover:bg-[#33cbcc]/5 transition-colors"
                                                >
                                                    {t('employeeDetail.tasks.customTime')}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">{t('employeeDetail.tasks.startTime')}</label>
                                                    <input 
                                                        type="time" 
                                                        value={draft.startTime} 
                                                        onChange={e => updateDraft(idx, 'startTime', e.target.value)} 
                                                        className={inputClass} 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 block">{t('employeeDetail.tasks.endTime')}</label>
                                                    <input 
                                                        type="time" 
                                                        value={draft.endTime} 
                                                        onChange={e => updateDraft(idx, 'endTime', e.target.value)} 
                                                        className={inputClass} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-3">
                                            <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1"><Gauge size={10} /> {t('employeeDetail.tasks.difficulty')}</label><select value={draft.difficulty} onChange={e => updateDraft(idx, 'difficulty', e.target.value)} className={`${selectClass} w-full`}><option value="easy">{t('employeeDetail.tasks.difficultyEasy')}</option><option value="medium">{t('employeeDetail.tasks.difficultyMedium')}</option><option value="hard">{t('employeeDetail.tasks.difficultyHard')}</option></select></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1"><Flag size={10} /> {t('employeeDetail.tasks.priority')}</label><select value={draft.priority} onChange={e => updateDraft(idx, 'priority', e.target.value)} className={`${selectClass} w-full`}><option value="low">{t('employeeDetail.tasks.priorityLow')}</option><option value="medium">{t('employeeDetail.tasks.priorityMedium')}</option><option value="high">{t('employeeDetail.tasks.priorityHigh')}</option><option value="urgent">{t('employeeDetail.tasks.priorityUrgent')}</option></select></div>
                                            <div><label className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1.5 flex items-center gap-1"><Repeat size={10} /> {t('employeeDetail.tasks.repeat')}</label><select value={draft.repeat} onChange={e => updateDraft(idx, 'repeat', e.target.value)} className={`${selectClass} w-full`}><option value="none">{t('employeeDetail.tasks.repeatNone')}</option><option value="daily">{t('employeeDetail.tasks.repeatDaily')}</option><option value="weekly">{t('employeeDetail.tasks.repeatWeekly')}</option><option value="monthly">{t('employeeDetail.tasks.repeatMonthly')}</option></select></div>
                                        </div>
                                    </motion.div>
                                ))}
                                <button onClick={addDraftRow} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#33cbcc]/40 hover:text-[#33cbcc] transition-colors flex items-center justify-center gap-2"><Plus size={16} /> {t('employeeDetail.tasks.addAnother')}</button>
                            </div>
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-xs text-gray-400">{drafts.filter(d => d.title.trim()).length} {t('employeeDetail.tasks.tasksReady')}</span>
                                <div className="flex gap-2">
                                    <button onClick={() => { setShowModal(false); setDrafts([emptyDraft()]); }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t('employeeDetail.cancel')}</button>
                                    <button onClick={submitTasks} className="px-5 py-2 bg-[#33cbcc] text-white rounded-xl text-sm font-medium hover:bg-[#2bb5b6]">{t('employeeDetail.tasks.createTasks')}</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Task Detail Modal */}
            <AnimatePresence>
                {selectedTask && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTask(null)}>
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} onClick={e => e.stopPropagation()} className="relative bg-white rounded-2xl p-6 w-full max-w-md">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-800">{t('employeeDetail.tasks.taskDetail')}</h2>
                                <button onClick={() => setSelectedTask(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-base font-semibold text-gray-800">{selectedTask.title}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{selectedTask.description || t('employeeDetail.tasks.noDescription')}</p>
                                </div>
                                {selectedTask.projectId && (() => {
                                    const proj = (departmentProjects || []).find(p => p.id === selectedTask.projectId);
                                    return proj ? (
                                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50">
                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                                            <span className="text-sm font-semibold text-gray-800">{proj.name}</span>
                                        </div>
                                    ) : null;
                                })()}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.date')}</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTask.deadline}</p></div>
                                    <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.time')}</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTask.time || '—'}</p></div>
                                    <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.assigneePlaceholder')}</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTask.assignee || '—'}</p></div>
                                    <div className="bg-gray-50 rounded-xl p-3"><p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.status')}</p><p className="text-sm font-semibold mt-0.5" style={{ color: selectedTask.state === 'COMPLETED' ? '#22c55e' : '#33cbcc' }}>{selectedTask.state === 'COMPLETED' ? t('employeeDetail.tasks.done') : selectedTask.state === 'IN_PROGRESS' ? t('employeeDetail.tasks.inProgress') : t('employeeDetail.tasks.pending')}</p></div>
                                    <div className="bg-blue-50 rounded-xl p-3 col-span-1"><p className="text-[10px] text-blue-400 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.startedAt')}</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTask.startedAt ? new Date(selectedTask.startedAt).toLocaleString() : '—'}</p></div>
                                    <div className="bg-green-50 rounded-xl p-3 col-span-1"><p className="text-[10px] text-green-500 uppercase tracking-wider font-medium">{t('employeeDetail.tasks.completedAt')}</p><p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedTask.completedAt ? new Date(selectedTask.completedAt).toLocaleString() : '—'}</p></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: `${difficultyConfig[(selectedTask.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].color}15`, color: difficultyConfig[(selectedTask.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].color }}>{difficultyConfig[(selectedTask.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].label}</span>
                                    <span className="text-xs font-bold px-2 py-1 rounded flex items-center gap-1" style={{ backgroundColor: `${priorityConfig[selectedTask.priority || 'medium'].color}15`, color: priorityConfig[selectedTask.priority || 'medium'].color }}><Flag size={10} /> {priorityConfig[selectedTask.priority || 'medium'].label}</span>
                                </div>
                                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-1">
                                    {!selectedTask.selfAssigned && (
                                        <button
                                            onClick={() => { setEditingTask(selectedTask); setSelectedTask(null); }}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#33cbcc]/10 text-[#33cbcc] hover:bg-[#33cbcc]/20 transition-colors"
                                        >
                                            <Pencil size={12} /> {t('employeeDetail.tasks.editTask')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => { setShowHistoryTaskId(selectedTask.id); setSelectedTask(null); }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#283852]/10 text-[#283852] hover:bg-[#283852]/20 transition-colors"
                                    >
                                        <History size={12} /> {t('employeeDetail.tasks.viewHistory')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Task Modal */}
            <AnimatePresence>
                {editingTask && (
                    <EditTaskModal
                        task={editingTask}
                        onClose={() => setEditingTask(null)}
                        onSave={(dto) => {
                            updateTaskMutation.mutate({ id: editingTask.id, dto }, { onSuccess: () => setEditingTask(null) });
                        }}
                        isSaving={updateTaskMutation.isPending}
                        t={t}
                    />
                )}
            </AnimatePresence>

            {/* Task History Modal */}
            <AnimatePresence>
                {showHistoryTaskId && (
                    <TaskHistoryModal
                        taskId={showHistoryTaskId}
                        onClose={() => setShowHistoryTaskId(null)}
                        t={t}
                    />
                )}
            </AnimatePresence>

            {/* List View */}
            {viewMode === 'list' && (
                <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
                    {apiTasks.map(task => (
                        <div key={task.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5 hover:bg-gray-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedTask(task)}>
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="shrink-0">
                                    {task.state === 'COMPLETED' ? <CheckCircle2 size={22} className="text-[#33cbcc]" /> : <Circle size={22} className="text-gray-300 hover:text-[#33cbcc] transition-colors" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${task.state === 'COMPLETED' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{task.title}</p>
                                    {task.description && <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={11} /> {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}</span>
                                        {task.assignedTo && <span className="text-[11px] text-gray-500 font-medium">{task.assignedTo.firstName} {task.assignedTo.lastName}</span>}
                                        {task.projectId && (() => { const proj = (departmentProjects || []).find(p => p.id === task.projectId); return proj ? <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: '#33cbcc15', color: '#33cbcc' }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#33cbcc' }} />{proj.name}</span> : null; })()}
                                        {task.startedAt && <span className="text-[11px] text-blue-400 flex items-center gap-1">▶ {new Date(task.startedAt).toLocaleString()}</span>}
                                        {task.completedAt && <span className="text-[11px] text-green-500 flex items-center gap-1">✓ {new Date(task.completedAt).toLocaleString()}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 ml-10 sm:ml-0">
                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: `${difficultyConfig[(task.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].color}15`, color: difficultyConfig[(task.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].color }}>{difficultyConfig[(task.difficulty?.toLowerCase() as TaskDifficulty) || 'medium'].label}</span>
                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-0.5" style={{ backgroundColor: `${priorityConfig[task.priority || 'medium'].color}15`, color: priorityConfig[task.priority || 'medium'].color }}><Flag size={9} /> {priorityConfig[task.priority || 'medium'].label}</span>
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${task.state === 'COMPLETED' ? 'bg-green-50 text-green-500' : task.state === 'IN_PROGRESS' ? 'bg-[#33cbcc]/10 text-[#33cbcc]' : 'bg-gray-100 text-gray-400'}`}>
                                    {task.state === 'COMPLETED' ? t('employeeDetail.tasks.done') : task.state === 'IN_PROGRESS' ? t('employeeDetail.tasks.inProgress') : t('employeeDetail.tasks.pending')}
                                </span>
                                {!task.selfAssigned && (
                                    <>
                                        <button
                                            onClick={e => { e.stopPropagation(); setEditingTask(task); }}
                                            className="p-1.5 rounded-lg hover:bg-[#33cbcc]/10 text-gray-400 hover:text-[#33cbcc] transition-colors"
                                            title={t('employeeDetail.tasks.editTask')}
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); if (window.confirm(t('employeeDetail.tasks.confirmDelete'))) { deleteTaskMutation.mutate(task.id); } }}
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                            title={t('employeeDetail.tasks.deleteTask')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); setShowHistoryTaskId(task.id); }}
                                    className="p-1.5 rounded-lg hover:bg-[#283852]/10 text-gray-400 hover:text-[#283852] transition-colors"
                                    title={t('employeeDetail.tasks.viewHistory')}
                                >
                                    <History size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {apiTasks.length === 0 && <p className="p-10 text-center text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>}
                </div>
            )}

            {/* ===== WEEK VIEW ===== */}
            {viewMode === 'calendar' && calendarMode === 'week' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: `${120 + timeSlots.length * 100}px` }}>
                            {/* Time header row */}
                            <div className="grid border-b border-gray-100 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: `120px repeat(${timeSlots.length}, 100px)` }}>
                                <div className="p-3 border-r border-gray-100 font-semibold text-sm text-gray-600">Day</div>
                                {timeSlots.map(h => (
                                    <div key={h} className="py-3 text-center text-xs font-semibold text-gray-600 border-r border-gray-100">{h}:00</div>
                                ))}
                            </div>
                            
                            {/* Day rows */}
                            {weekDates.map((date, dayIdx) => {
                                const dateStr = formatDateStr(date);
                                const isToday = dateStr === todayStr;
                                
                                // Get tasks for this day
                                const dayTasks = apiTasks.filter(tk => {
                                    const taskStart = tk.startDate ? new Date(tk.startDate).toISOString().split('T')[0] : null;
                                    const taskEnd = tk.endDate ? new Date(tk.endDate).toISOString().split('T')[0] : null;
                                    const taskDue = tk.dueDate ? new Date(tk.dueDate).toISOString().split('T')[0] : null;
                                    
                                    if (taskStart === dateStr) return true;
                                    if (taskDue === dateStr) return true;
                                    if (taskStart && taskEnd) {
                                        return dateStr >= taskStart && dateStr <= taskEnd;
                                    }
                                    return false;
                                });
                                
                                return (
                                    <div key={dayIdx} className={`grid border-b border-gray-100 ${isToday ? 'bg-[#33cbcc]/5' : ''}`} style={{ gridTemplateColumns: `120px repeat(${timeSlots.length}, 100px)` }}>
                                        {/* Day label */}
                                        <div className={`p-3 border-r border-gray-100 flex flex-col justify-center ${isToday ? 'text-[#33cbcc]' : 'text-gray-600'}`}>
                                            <span className="text-xs font-semibold uppercase tracking-wide">{dayLabels[dayIdx]}</span>
                                            <span className={`text-lg font-bold ${isToday ? 'bg-[#33cbcc] text-white w-8 h-8 rounded-full flex items-center justify-center text-sm mt-1' : ''}`}>{date.getDate()}</span>
                                        </div>
                                        
                                        {/* Time slots */}
                                        {timeSlots.map(h => {
                                            // Find tasks that overlap with this hour
                                            const hourTasks = dayTasks.filter(tk => {
                                                if (!tk.startTime || !tk.endTime) {
                                                    // Tasks without time show in the first slot only
                                                    return h === timeSlots[0];
                                                }
                                                const [startHour] = tk.startTime.split(':').map(Number);
                                                const [endHour] = tk.endTime.split(':').map(Number);
                                                return h >= startHour && h < endHour;
                                            });
                                            
                                            return (
                                                <div 
                                                    key={h} 
                                                    onClick={() => handleSlotClick(date, h)} 
                                                    className="min-h-[80px] border-r border-gray-100 p-1 cursor-pointer hover:bg-[#33cbcc]/5 transition-colors relative"
                                                >
                                                    {hourTasks.map(task => {
                                                        const c = getTaskColor(task);
                                                        
                                                        // Tasks without time
                                                        if (!task.startTime || !task.endTime) {
                                                            return (
                                                                <div 
                                                                    key={task.id} 
                                                                    onClick={e => { e.stopPropagation(); setSelectedTask(task); }} 
                                                                    className="mb-1 text-[10px] leading-snug p-2 rounded-lg cursor-pointer font-medium border hover:shadow-md transition-shadow"
                                                                    style={{ 
                                                                        backgroundColor: c.bg, 
                                                                        color: c.text, 
                                                                        borderColor: c.border
                                                                    }}
                                                                >
                                                                    <p className="font-semibold truncate">{task.title}</p>
                                                                    <p className="text-[9px] opacity-70 mt-0.5">All day</p>
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        const [startHour] = task.startTime.split(':').map(Number);
                                                        
                                                        // Only render the task in its starting hour to avoid duplicates
                                                        if (h !== startHour) return null;
                                                        
                                                        const [endHour] = task.endTime.split(':').map(Number);
                                                        const duration = endHour - startHour;
                                                        
                                                        return (
                                                            <div 
                                                                key={task.id} 
                                                                onClick={e => { e.stopPropagation(); setSelectedTask(task); }} 
                                                                className="absolute top-1 left-1 text-[10px] leading-snug p-2 rounded-lg cursor-pointer font-medium border hover:shadow-md transition-shadow z-10"
                                                                style={{ 
                                                                    backgroundColor: c.bg, 
                                                                    color: c.text, 
                                                                    borderColor: c.border,
                                                                    width: `calc(${duration * 100}px - 8px)`,
                                                                    right: duration > 1 ? 'auto' : '4px'
                                                                }}
                                                            >
                                                                <p className="font-semibold truncate">{task.title}</p>
                                                                <p className="text-[9px] opacity-70 mt-0.5">{task.startTime} - {task.endTime}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ===== DAY VIEW ===== */}
            {viewMode === 'calendar' && calendarMode === 'day' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    {timeSlots.map(h => {
                        const dateStr = formatDateStr(selectedDate);
                        const cellTasks = apiTasks.filter(tk => {
                            const taskStart = tk.startDate ? new Date(tk.startDate).toISOString().split('T')[0] : null;
                            const taskDue = tk.dueDate ? new Date(tk.dueDate).toISOString().split('T')[0] : null;
                            return taskStart === dateStr || taskDue === dateStr;
                        });
                        const isNow = dateStr === todayStr && new Date().getHours() === h;
                        return (
                            <div key={h} onClick={() => handleSlotClick(selectedDate, h)} className={`flex border-b border-gray-100 min-h-[72px] cursor-pointer hover:bg-[#33cbcc]/5 transition-colors ${isNow ? 'bg-[#33cbcc]/4' : ''}`}>
                                <div className={`w-20 py-4 pr-4 text-right text-xs font-medium border-r border-gray-100 shrink-0 ${isNow ? 'text-[#33cbcc] font-semibold' : 'text-gray-400'}`}>{h}:00</div>
                                <div className="flex-1 p-2 flex flex-wrap gap-2">
                                    {cellTasks.map(task => {
                                        const c = getTaskColor(task);
                                        const timeDisplay = task.startTime && task.endTime 
                                            ? `${task.startTime} - ${task.endTime}`
                                            : task.startTime 
                                            ? task.startTime 
                                            : '';
                                        return (
                                            <div key={task.id} onClick={e => { e.stopPropagation(); setSelectedTask(task); }} className="text-sm p-3 rounded-xl cursor-pointer font-medium border flex-1 min-w-[140px] hover:shadow-sm transition-shadow" style={{ backgroundColor: c.bg, color: c.text, borderColor: c.border }}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="font-semibold flex-1">{task.title}</p>
                                                    {timeDisplay && (
                                                        <span className="text-[10px] font-bold opacity-70 shrink-0">{timeDisplay}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== MONTH VIEW ===== */}
            {viewMode === 'calendar' && calendarMode === 'month' && (() => {
                const { daysInMonth, offset } = getMonthDays(selectedDate.getFullYear(), selectedDate.getMonth());
                return (
                    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-100">
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                            {dayLabels.map(day => (<div key={day} className="text-center text-xs font-semibold text-gray-400 py-2 sm:py-3">{day}</div>))}
                            {Array.from({ length: offset }, (_, i) => (<div key={`e${i}`} />))}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const day = i + 1;
                                const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayTasks = apiTasks.filter(tk => {
                                    const taskStart = tk.startDate ? new Date(tk.startDate).toISOString().split('T')[0] : null;
                                    const taskEnd = tk.endDate ? new Date(tk.endDate).toISOString().split('T')[0] : null;
                                    const taskDue = tk.dueDate ? new Date(tk.dueDate).toISOString().split('T')[0] : null;
                                    
                                    // Show if task starts on this date
                                    if (taskStart === dateStr) return true;
                                    // Show if task is due on this date
                                    if (taskDue === dateStr) return true;
                                    // Show if this date falls within task range
                                    if (taskStart && taskEnd) {
                                        return dateStr >= taskStart && dateStr <= taskEnd;
                                    }
                                    return false;
                                });
                                const isToday = dateStr === todayStr;
                                return (
                                    <div key={day} onClick={() => { const d = new Date(selectedDate); d.setDate(day); setSelectedDate(d); setCalendarMode('day'); }} className={`min-h-[48px] sm:min-h-[72px] p-1.5 sm:p-2 rounded-xl text-sm cursor-pointer transition-colors border ${isToday ? 'bg-[#33cbcc] text-white font-bold border-[#33cbcc]' : dayTasks.length > 0 ? 'hover:bg-gray-50 text-gray-600 border-gray-100' : 'hover:bg-gray-50 text-gray-600 border-transparent'}`}>
                                        <span className={`text-xs sm:text-sm font-semibold ${isToday ? '' : ''}`}>{day}</span>
                                        {dayTasks.length > 0 && (
                                            <div className="mt-1 space-y-0.5">
                                                {dayTasks.slice(0, 2).map(task => {
                                                    const c = getTaskColor(task);
                                                    const timeDisplay = task.startTime ? task.startTime.substring(0, 5) : '';
                                                    return (
                                                        <div key={task.id} className="hidden sm:block text-[9px] leading-tight truncate rounded px-1 py-0.5 font-medium" style={{ backgroundColor: isToday ? 'rgba(255,255,255,0.25)' : c.bg, color: isToday ? 'white' : c.text }}>
                                                            {timeDisplay && <span className="font-bold mr-1">{timeDisplay}</span>}
                                                            {task.title}
                                                        </div>
                                                    );
                                                })}
                                                {dayTasks.length > 2 && <div className={`hidden sm:block text-[8px] font-medium ${isToday ? 'text-white/70' : 'text-gray-400'}`}>+{dayTasks.length - 2}</div>}
                                                <div className={`sm:hidden w-1.5 h-1.5 rounded-full mx-auto ${isToday ? 'bg-white' : 'bg-[#33cbcc]'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })()}

            {/* ===== YEAR VIEW ===== */}
            {viewMode === 'calendar' && calendarMode === 'year' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 12 }, (_, mIdx) => {
                        const monthTasks = apiTasks.filter(tk => {
                            const taskStart = tk.startDate ? new Date(tk.startDate) : null;
                            const taskEnd = tk.endDate ? new Date(tk.endDate) : null;
                            const taskDue = tk.dueDate ? new Date(tk.dueDate) : null;
                            
                            // Check if task starts, ends, or is due in this month
                            const checkDate = (date: Date | null) => {
                                if (!date) return false;
                                return date.getFullYear() === selectedDate.getFullYear() && date.getMonth() === mIdx;
                            };
                            
                            return checkDate(taskStart) || checkDate(taskEnd) || checkDate(taskDue);
                        });
                        const monthName = new Date(selectedDate.getFullYear(), mIdx).toLocaleDateString(undefined, { month: 'long' });
                        const { daysInMonth, offset } = getMonthDays(selectedDate.getFullYear(), mIdx);
                        const isCurrent = new Date().getMonth() === mIdx && new Date().getFullYear() === selectedDate.getFullYear();
                        return (
                            <div key={mIdx} onClick={() => { const d = new Date(selectedDate); d.setMonth(mIdx); setSelectedDate(d); setCalendarMode('month'); }} className={`bg-white rounded-2xl p-5 border cursor-pointer hover:border-[#33cbcc]/30 hover:shadow-sm transition-all ${isCurrent ? 'border-[#33cbcc]/20 shadow-sm' : 'border-gray-100'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className={`text-sm font-bold capitalize ${isCurrent ? 'text-[#33cbcc]' : 'text-gray-800'}`}>{monthName}</h4>
                                    {monthTasks.length > 0 && <span className="text-[10px] font-bold bg-[#33cbcc]/10 text-[#33cbcc] px-2 py-0.5 rounded-full">{monthTasks.length}</span>}
                                </div>
                                <div className="grid grid-cols-7 gap-0.5">
                                    {dayLabels.map(d => (<div key={d} className="h-5 text-[8px] text-center leading-5 font-semibold text-gray-300">{d}</div>))}
                                    {Array.from({ length: offset }, (_, i) => (<div key={`e${i}`} className="h-6" />))}
                                    {Array.from({ length: daysInMonth }, (_, i) => {
                                        const dateStr = `${selectedDate.getFullYear()}-${String(mIdx + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
                                        const hasTasks = apiTasks.some(tk => tk.deadline === dateStr);
                                        const isToday = dateStr === todayStr;
                                        return <div key={i} className={`h-6 text-[10px] text-center leading-6 rounded-md ${isToday ? 'bg-[#33cbcc] text-white font-bold' : hasTasks ? 'bg-[#33cbcc]/15 text-[#33cbcc] font-semibold' : 'text-gray-400'}`}>{i + 1}</div>;
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ============================================================
// DOCUMENTS VIEW
// ============================================================
const DocumentsView = ({ employee: _employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState<{ id: number; name: string; ext: string; date: string; size: string }[]>([]);

    const removeDoc = (id: number) => setDocuments(prev => prev.filter(d => d.id !== id));

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.documents')}</h2>
                <button className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2bb5b6] transition-colors">
                    <Plus size={16} /> {t('employeeDetail.documents.add')}
                </button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-[#283852]/10 flex items-center justify-center shrink-0"><FileText size={20} className="text-[#283852]" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">{doc.name}<span className="text-gray-400">{doc.ext}</span></p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{doc.date} &middot; {doc.size}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Eye size={16} /></button>
                            <button className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Download size={16} /></button>
                            <button onClick={() => removeDoc(doc.id)} className="p-2 text-gray-300 hover:text-red-400 transition-colors rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                        </div>
                    </div>
                ))}
                {documents.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>}
            </div>
        </div>
    );
};

// ============================================================
// SANCTIONS VIEW
// ============================================================
const SANCTION_TYPE_LABELS: Record<string, string> = {
    AVERTISSEMENT: 'employeeDetail.sanctions.types.warning',
    BLAME: 'employeeDetail.sanctions.types.written',
    MISE_A_PIED: 'employeeDetail.sanctions.types.suspension',
    LICENCIEMENT: 'employeeDetail.sanctions.types.termination',
};

const SEVERITY_COLORS: Record<string, string> = {
    LEGER: 'bg-yellow-50 text-yellow-600',
    MOYEN: 'bg-orange-50 text-orange-600',
    GRAVE: 'bg-red-50 text-red-600',
};

const SanctionsView = ({ employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const { data: sanctions = [], isLoading } = useSanctionsByEmployee(employee.id);
    const createSanction = useCreateSanction();
    const deleteSanction = useDeleteSanction();
    const [showAdd, setShowAdd] = useState(false);
    const [newSanction, setNewSanction] = useState({ type: '', reason: '', date: '', severity: '' });

    const addSanction = () => {
        if (!newSanction.type || !newSanction.reason) return;
        createSanction.mutate({
            type: newSanction.type as 'AVERTISSEMENT' | 'BLAME' | 'MISE_A_PIED' | 'LICENCIEMENT',
            reason: newSanction.reason,
            date: newSanction.date || undefined,
            severity: (newSanction.severity || 'LEGER') as 'LEGER' | 'MOYEN' | 'GRAVE',
            employeeId: employee.id,
        }, {
            onSuccess: () => {
                setNewSanction({ type: '', reason: '', date: '', severity: '' });
                setShowAdd(false);
            },
        });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.sanctions')}</h2>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2bb5b6] transition-colors">
                    <Plus size={16} /> {t('employeeDetail.sanctions.add')}
                </button>
            </div>

            {showAdd && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
                    <select value={newSanction.type} onChange={e => setNewSanction(prev => ({ ...prev, type: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20">
                        <option value="">{t('employeeDetail.sanctions.selectType')}</option>
                        <option value="AVERTISSEMENT">{t('employeeDetail.sanctions.types.warning')}</option>
                        <option value="BLAME">{t('employeeDetail.sanctions.types.written')}</option>
                        <option value="MISE_A_PIED">{t('employeeDetail.sanctions.types.suspension')}</option>
                        <option value="LICENCIEMENT">{t('employeeDetail.sanctions.types.termination')}</option>
                    </select>
                    <select value={newSanction.severity} onChange={e => setNewSanction(prev => ({ ...prev, severity: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20">
                        <option value="">{t('employeeDetail.sanctions.selectSeverity')}</option>
                        <option value="LEGER">{t('employeeDetail.sanctions.severity.light')}</option>
                        <option value="MOYEN">{t('employeeDetail.sanctions.severity.medium')}</option>
                        <option value="GRAVE">{t('employeeDetail.sanctions.severity.severe')}</option>
                    </select>
                    <textarea value={newSanction.reason} onChange={e => setNewSanction(prev => ({ ...prev, reason: e.target.value }))} placeholder={t('employeeDetail.sanctions.reasonPlaceholder')} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20 resize-none h-20" />
                    <input type="date" value={newSanction.date} onChange={e => setNewSanction(prev => ({ ...prev, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20" />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t('employeeDetail.cancel')}</button>
                        <button
                            onClick={addSanction}
                            disabled={createSanction.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-[#33cbcc] text-white rounded-xl text-sm font-medium hover:bg-[#2bb5b6] disabled:bg-gray-300"
                        >
                            {createSanction.isPending && <Loader2 size={14} className="animate-spin" />}
                            {t('employeeDetail.save')}
                        </button>
                    </div>
                </motion.div>
            )}

            {isLoading && (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-[#33cbcc]" /></div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {sanctions.map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0"><AlertTriangle size={20} className="text-red-400" /></div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">{t(SANCTION_TYPE_LABELS[s.type] || s.type)}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{s.reason}{s.date ? ` \u00b7 ${new Date(s.date).toLocaleDateString()}` : ''}</p>
                        </div>
                        {s.severity && (
                            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${SEVERITY_COLORS[s.severity] || 'bg-gray-100 text-gray-500'}`}>
                                {t(`employeeDetail.sanctions.severity.${s.severity === 'LEGER' ? 'light' : s.severity === 'MOYEN' ? 'medium' : 'severe'}`)}
                            </span>
                        )}
                        <button
                            onClick={() => deleteSanction.mutate(s.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {!isLoading && sanctions.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>}
            </div>
        </div>
    );
};

// ============================================================
// HELPERS
// ============================================================
const getFileUrl = (filePath: string) => {
    const uploadsIndex = filePath.indexOf('uploads/');
    if (uploadsIndex === -1) return filePath;
    const relativePath = filePath.substring(uploadsIndex);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3025';
    return `${apiUrl}/${relativePath}`;
};

const DOC_TYPE_COLORS: Record<string, string> = {
    cv: 'bg-blue-50 text-blue-500',
    coverLetter: 'bg-purple-50 text-purple-500',
    id: 'bg-amber-50 text-amber-500',
    references: 'bg-green-50 text-green-500',
    diploma: 'bg-indigo-50 text-indigo-500',
    certificate: 'bg-teal-50 text-teal-500',
    transcript: 'bg-cyan-50 text-cyan-500',
    other: 'bg-gray-100 text-gray-500',
};

// ============================================================
// RECRUTEMENTS VIEW
// ============================================================
const RecrutementsView = ({ employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const updateEmployee = useUpdateEmployee();
    const docs = employee.recruitmentDocs || [];
    const [showAdd, setShowAdd] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: '', type: 'cv', file: null as File | null });
    const [isUploading, setIsUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleAdd = async () => {
        if (!newDoc.name.trim() || !newDoc.file) return;
        setIsUploading(true);
        try {
            const result = await documentsApi.uploadFile(newDoc.file, 'recruitment');
            const updated = [...docs, { name: newDoc.name.trim(), type: newDoc.type, filePath: result.filePath }];
            updateEmployee.mutate({ id: employee.id, dto: { recruitmentDocs: updated } }, {
                onSuccess: () => { setShowAdd(false); setNewDoc({ name: '', type: 'cv', file: null }); },
                onSettled: () => setIsUploading(false),
            });
        } catch {
            setIsUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        const updated = docs.filter((_, i) => i !== index);
        updateEmployee.mutate({ id: employee.id, dto: { recruitmentDocs: updated } });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.recrutements')}</h2>
                <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors">
                    <Plus size={14} />{t('employeeDetail.addDocument')}
                </button>
            </div>
            {showAdd && (
                <div className="bg-[#33cbcc]/5 rounded-2xl p-4 border border-[#33cbcc]/20 space-y-3">
                    <input type="text" placeholder={t('employeeDetail.docName')} value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    <select value={newDoc.type} onChange={e => setNewDoc(p => ({ ...p, type: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30">
                        {['cv', 'coverLetter', 'id', 'references', 'other'].map(t2 => <option key={t2} value={t2}>{t2}</option>)}
                    </select>
                    <div onClick={() => fileRef.current?.click()} className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-[#33cbcc]/40 transition-colors">
                        {newDoc.file ? <span className="text-xs text-gray-700">{newDoc.file.name}</span> : <span className="text-xs text-gray-400">{t('employeeDetail.clickToUpload')}</span>}
                    </div>
                    <input ref={fileRef} type="file" className="hidden" onChange={e => setNewDoc(p => ({ ...p, file: e.target.files?.[0] || null }))} />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{t('employeeDetail.cancel')}</button>
                        <button disabled={!newDoc.name.trim() || !newDoc.file || isUploading} onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}{t('employeeDetail.upload')}
                        </button>
                    </div>
                </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {docs.map((doc, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${DOC_TYPE_COLORS[doc.type] || 'bg-blue-50 text-blue-500'}`}>
                            <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 truncate">{doc.name || doc.type}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{doc.type}</p>
                        </div>
                        {doc.filePath ? (
                            <div className="flex items-center gap-1">
                                <a href={getFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Eye size={16} /></a>
                                <a href={getFileUrl(doc.filePath)} download className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Download size={16} /></a>
                                <button onClick={() => handleRemove(i)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">{t('employeeDetail.noFile')}</span>
                                <button onClick={() => handleRemove(i)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        )}
                    </div>
                ))}
                {docs.length === 0 && !showAdd && <p className="p-8 text-center text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>}
            </div>
        </div>
    );
};

// ============================================================
// EDUCATION VIEW
// ============================================================
const EducationView = ({ employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const updateEmployee = useUpdateEmployee();
    const docs = employee.educationDocs || [];
    const [showAdd, setShowAdd] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: '', type: 'diploma', file: null as File | null });
    const [isUploading, setIsUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleAdd = async () => {
        if (!newDoc.name.trim() || !newDoc.file) return;
        setIsUploading(true);
        try {
            const result = await documentsApi.uploadFile(newDoc.file, 'formation');
            const updated = [...docs, { name: newDoc.name.trim(), type: newDoc.type, filePath: result.filePath }];
            updateEmployee.mutate({ id: employee.id, dto: { educationDocs: updated } }, {
                onSuccess: () => { setShowAdd(false); setNewDoc({ name: '', type: 'diploma', file: null }); },
                onSettled: () => setIsUploading(false),
            });
        } catch {
            setIsUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        const updated = docs.filter((_, i) => i !== index);
        updateEmployee.mutate({ id: employee.id, dto: { educationDocs: updated } });
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.education')}</h2>
                <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors">
                    <Plus size={14} />{t('employeeDetail.addDocument')}
                </button>
            </div>
            {showAdd && (
                <div className="bg-[#33cbcc]/5 rounded-2xl p-4 border border-[#33cbcc]/20 space-y-3">
                    <input type="text" placeholder={t('employeeDetail.docName')} value={newDoc.name} onChange={e => setNewDoc(p => ({ ...p, name: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30" />
                    <select value={newDoc.type} onChange={e => setNewDoc(p => ({ ...p, type: e.target.value }))} className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30">
                        {['diploma', 'certificate', 'transcript', 'other'].map(t2 => <option key={t2} value={t2}>{t2}</option>)}
                    </select>
                    <div onClick={() => fileRef.current?.click()} className="cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-[#33cbcc]/40 transition-colors">
                        {newDoc.file ? <span className="text-xs text-gray-700">{newDoc.file.name}</span> : <span className="text-xs text-gray-400">{t('employeeDetail.clickToUpload')}</span>}
                    </div>
                    <input ref={fileRef} type="file" className="hidden" onChange={e => setNewDoc(p => ({ ...p, file: e.target.files?.[0] || null }))} />
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">{t('employeeDetail.cancel')}</button>
                        <button disabled={!newDoc.name.trim() || !newDoc.file || isUploading} onClick={handleAdd} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-[#33cbcc] text-white hover:bg-[#2bb5b6] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">
                            {isUploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}{t('employeeDetail.upload')}
                        </button>
                    </div>
                </div>
            )}
            <div className="space-y-4">
                {docs.map((doc, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${DOC_TYPE_COLORS[doc.type] || 'bg-[#283852]/10 text-[#283852]'}`}>
                            <GraduationCap size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-800 truncate">{doc.name || doc.type}</h3>
                            <p className="text-[11px] text-gray-400 mt-0.5 capitalize">{doc.type}</p>
                        </div>
                        {doc.filePath ? (
                            <div className="flex items-center gap-1">
                                <a href={getFileUrl(doc.filePath)} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Eye size={16} /></a>
                                <a href={getFileUrl(doc.filePath)} download className="p-2 text-gray-400 hover:text-[#33cbcc] transition-colors rounded-lg hover:bg-gray-100"><Download size={16} /></a>
                                <button onClick={() => handleRemove(i)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-600">{t('employeeDetail.noFile')}</span>
                                <button onClick={() => handleRemove(i)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors rounded-lg hover:bg-gray-100 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                            </div>
                        )}
                    </motion.div>
                ))}
                {docs.length === 0 && !showAdd && (
                    <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                        <p className="text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================
// FORMATIONS VIEW
// ============================================================
const FormationsView = ({ employee: _employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const [formations, setFormations] = useState<{ id: number; title: string; date: string; duration: string; status: 'upcoming' | 'completed' }[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newFormation, setNewFormation] = useState({ title: '', date: '', duration: '' });

    const addFormation = () => {
        if (!newFormation.title) return;
        setFormations(prev => [...prev, { id: Date.now(), ...newFormation, status: 'upcoming' as const }]);
        setNewFormation({ title: '', date: '', duration: '' });
        setShowAdd(false);
    };

    const markCompleted = (id: number) => {
        setFormations(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' as const } : f));
    };

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800">{t('employeeSidebar.formations')}</h2>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-[#33cbcc] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#2bb5b6] transition-colors">
                    <Plus size={16} /> {t('employeeDetail.formations.add')}
                </button>
            </div>

            {showAdd && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
                    <input value={newFormation.title} onChange={e => setNewFormation(prev => ({ ...prev, title: e.target.value }))} placeholder={t('employeeDetail.formations.titlePlaceholder')} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20" />
                    <div className="flex gap-3">
                        <input type="date" value={newFormation.date} onChange={e => setNewFormation(prev => ({ ...prev, date: e.target.value }))} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20" />
                        <input value={newFormation.duration} onChange={e => setNewFormation(prev => ({ ...prev, duration: e.target.value }))} placeholder={t('employeeDetail.formations.durationPlaceholder')} className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#33cbcc]/20" />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">{t('employeeDetail.cancel')}</button>
                        <button onClick={addFormation} className="px-4 py-2 bg-[#33cbcc] text-white rounded-xl text-sm font-medium hover:bg-[#2bb5b6]">{t('employeeDetail.save')}</button>
                    </div>
                </motion.div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
                {formations.map(f => (
                    <div key={f.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${f.status === 'completed' ? 'bg-green-50' : 'bg-[#33cbcc]/10'}`}>
                            <BookOpen size={20} className={f.status === 'completed' ? 'text-green-500' : 'text-[#33cbcc]'} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700">{f.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{f.date} &middot; {f.duration}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${f.status === 'completed' ? 'bg-green-50 text-green-500' : 'bg-[#33cbcc]/10 text-[#33cbcc]'}`}>
                            {f.status === 'completed' ? t('employeeDetail.formations.completed') : t('employeeDetail.formations.upcoming')}
                        </span>
                        {f.status === 'upcoming' && (
                            <button onClick={() => markCompleted(f.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-green-500 transition-all rounded-lg hover:bg-green-50" title={t('employeeDetail.formations.markComplete')}>
                                <Check size={16} />
                            </button>
                        )}
                        <button onClick={() => setFormations(prev => prev.filter(x => x.id !== f.id))} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 transition-all rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                ))}
                {formations.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{t('employeeDetail.emptyState')}</p>}
            </div>
        </div>
    );
};

// ============================================================
// PROSPECTS VIEW (Commercial role)
// ============================================================
type ProspectStatus = 'new' | 'contacted' | 'negotiation' | 'won' | 'lost';
interface Prospect { id: number; company: string; contact: string; value: number; status: ProspectStatus; date: string; }

const ProspectsView = ({ employee: _employee }: { employee: Employee }) => {
    const { t } = useTranslation();
    const monthlyGoal = 0;

    const [prospects, setProspects] = useState<Prospect[]>([]);

    const [filterStatus, setFilterStatus] = useState<ProspectStatus | 'all'>('all');

    const statusConfig: Record<ProspectStatus, { color: string; bg: string; label: string }> = {
        new: { color: '#3b82f6', bg: '#eff6ff', label: t('employeeDetail.prospects.status.new') },
        contacted: { color: '#f59e0b', bg: '#fffbeb', label: t('employeeDetail.prospects.status.contacted') },
        negotiation: { color: '#8b5cf6', bg: '#f5f3ff', label: t('employeeDetail.prospects.status.negotiation') },
        won: { color: '#22c55e', bg: '#f0fdf4', label: t('employeeDetail.prospects.status.won') },
        lost: { color: '#ef4444', bg: '#fef2f2', label: t('employeeDetail.prospects.status.lost') },
    };

    const wonCount = prospects.filter(p => p.status === 'won').length;
    const remaining = Math.max(0, monthlyGoal - wonCount);
    const goalPercent = Math.round((wonCount / monthlyGoal) * 100);
    const totalValue = prospects.filter(p => p.status === 'won').reduce((s, p) => s + p.value, 0);
    const conversionRate = prospects.length > 0 ? Math.round((wonCount / prospects.length) * 100) : 0;
    const formatValue = (v: number) => new Intl.NumberFormat('fr-FR').format(v) + ' XAF';

    const filtered = filterStatus === 'all' ? prospects : prospects.filter(p => p.status === filterStatus);

    const cycleStatus = (id: number) => {
        const order: ProspectStatus[] = ['new', 'contacted', 'negotiation', 'won', 'lost'];
        setProspects(prev => prev.map(p => {
            if (p.id !== id) return p;
            const idx = order.indexOf(p.status);
            return { ...p, status: order[(idx + 1) % order.length] };
        }));
    };

    return (
        <div className="space-y-5">
            <h2 className="text-xl font-bold text-gray-800">{t('employeeDetail.prospects.title')}</h2>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t('employeeDetail.prospects.goal'), value: monthlyGoal, icon: Target, color: '#33cbcc' },
                    { label: t('employeeDetail.prospects.reached'), value: wonCount, icon: CheckCircle2, color: '#22c55e' },
                    { label: t('employeeDetail.prospects.remaining'), value: remaining, icon: Clock, color: '#f59e0b' },
                    { label: t('employeeDetail.prospects.conversionRate'), value: `${conversionRate}%`, icon: TrendingUp, color: '#8b5cf6' },
                ].map((stat, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white rounded-2xl p-5 border border-gray-100 relative overflow-hidden">
                        <stat.icon size={48} className="absolute -right-2 -bottom-2 opacity-5" style={{ color: stat.color }} />
                        <p className="text-xs text-gray-400 font-medium mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Goal Progress */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">{t('employeeDetail.prospects.goal')}</span>
                    <span className="text-sm font-bold" style={{ color: goalPercent >= 100 ? '#22c55e' : goalPercent >= 60 ? '#f59e0b' : '#ef4444' }}>{wonCount}/{monthlyGoal}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, goalPercent)}%` }} transition={{ delay: 0.3, duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: goalPercent >= 100 ? '#22c55e' : goalPercent >= 60 ? '#f59e0b' : '#ef4444' }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{formatValue(totalValue)} {t('employeeDetail.prospects.reached').toLowerCase()}</p>
            </motion.div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
                {(['all', 'new', 'contacted', 'negotiation', 'won', 'lost'] as const).map(s => {
                    const isActive = filterStatus === s;
                    const count = s === 'all' ? prospects.length : prospects.filter(p => p.status === s).length;
                    return (
                        <button
                            key={s}
                            onClick={() => setFilterStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                                isActive ? 'bg-[#33cbcc] text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {s !== 'all' && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? '#fff' : statusConfig[s].color }} />}
                            {s === 'all' ? 'All' : statusConfig[s].label}
                            <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-gray-400'}`}>({count})</span>
                        </button>
                    );
                })}
            </div>

            {/* Prospects List */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                {filtered.map((prospect, i) => {
                    const cfg = statusConfig[prospect.status];
                    return (
                        <motion.div key={prospect.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                                <Building2 size={18} style={{ color: cfg.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{prospect.company}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Users size={12} className="text-gray-400" />
                                    <span className="text-xs text-gray-400">{prospect.contact}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-gray-800">{formatValue(prospect.value)}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{new Date(prospect.date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={() => cycleStatus(prospect.id)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                                {cfg.label}
                            </button>
                        </motion.div>
                    );
                })}
                {filtered.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">{t('employeeDetail.prospects.noProspects')}</p>}
            </div>
        </div>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const EmployeeDetail = ({ employee, activeTab, teamMembers = [] }: EmployeeDetailProps) => {
    const { t } = useTranslation();
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDismissConfirm, setShowDismissConfirm] = useState(false);

    const dismissEmployee = useDismissEmployee();
    const reinstateEmployee = useReinstateEmployee();

    // API data - fetch employee detail by id (stringified) for enrichment
    const { data: _apiEmployee, isLoading: loadingEmployee } = useEmployee(String(employee.id));
    const { data: _apiFormations, isLoading: loadingFormations } = useFormations();
    const { data: _apiEntretiens, isLoading: loadingEntretiens } = useEntretiens();
    const { data: _apiDocuments, isLoading: loadingDocuments } = useDocuments();

    const isApiLoading = loadingEmployee || loadingFormations || loadingEntretiens || loadingDocuments;

    if (isApiLoading) {
        return <DetailPageSkeleton />;
    }

    const isDismissed = !!employee.dismissed;

    const handleDismissOrReinstate = () => {
        if (isDismissed) {
            reinstateEmployee.mutate(String(employee.id), { onSuccess: () => setShowDismissConfirm(false) });
        } else {
            dismissEmployee.mutate(String(employee.id), { onSuccess: () => setShowDismissConfirm(false) });
        }
    };

    const isCommercial = (employee.role || '').toLowerCase().includes('commercial');

    const views: Record<EmployeeTab, React.ReactNode> = {
        infos: <InfosView employee={employee} teamMembers={teamMembers} />,
        tasks: isCommercial ? <ProspectsView employee={employee} /> : <TasksView employee={employee} />,
        documents: <DocumentsView employee={employee} />,
        sanctions: <SanctionsView employee={employee} />,
        recrutements: <RecrutementsView employee={employee} />,
        education: <EducationView employee={employee} />,
        formations: <FormationsView employee={employee} />,
    };

    return (
        <>
            {/* Dismissed banner */}
            {isDismissed && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-5 py-3 mb-4 rounded-xl bg-red-50 border border-red-200"
                >
                    <ShieldAlert size={18} className="text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                        {t('employees.dismissedBanner', 'This employee has been dismissed and can no longer access the system.')}
                        {employee.dismissedAt && (
                            <span className="text-red-400 ml-2">
                                ({new Date(employee.dismissedAt).toLocaleDateString()})
                            </span>
                        )}
                    </span>
                </motion.div>
            )}

            {/* Page header with action buttons */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">{employee.name}</h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowDismissConfirm(true)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                            isDismissed
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20'
                        }`}
                    >
                        {isDismissed ? <UserCheck size={15} /> : <UserX size={15} />}
                        {isDismissed ? t('employees.reinstate', 'Reinstate') : t('employees.dismiss', 'Dismiss')}
                    </button>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#33cbcc] hover:bg-[#2bb5b6] text-white text-sm font-semibold transition-colors shadow-lg shadow-[#33cbcc]/20"
                    >
                        <Pencil size={15} />
                        {t('employees.edit.title')}
                    </button>
                </div>
            </div>

            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                {views[activeTab]}
            </motion.div>

            {/* Edit Employee Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <EditEmployeeModal employee={employee} onClose={() => setShowEditModal(false)} />
                )}
            </AnimatePresence>

            {/* Dismiss/Reinstate Confirmation Modal */}
            <AnimatePresence>
                {showDismissConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowDismissConfirm(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
                        >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDismissed ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                {isDismissed ? <UserCheck size={24} className="text-emerald-500" /> : <UserX size={24} className="text-red-500" />}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                {isDismissed
                                    ? t('employees.reinstateConfirmTitle', 'Reinstate Employee')
                                    : t('employees.dismissConfirmTitle', 'Dismiss Employee')}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {isDismissed
                                    ? t('employees.reinstateConfirmMessage', 'This will restore access for {{name}}. They will be able to log in again.', { name: employee.name })
                                    : t('employees.dismissConfirmMessage', 'This will revoke access for {{name}}. They will no longer be able to log in.', { name: employee.name })}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDismissConfirm(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                >
                                    {t('common.cancel', 'Cancel')}
                                </button>
                                <button
                                    onClick={handleDismissOrReinstate}
                                    disabled={dismissEmployee.isPending || reinstateEmployee.isPending}
                                    className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50 ${
                                        isDismissed
                                            ? 'bg-emerald-500 hover:bg-emerald-600'
                                            : 'bg-red-500 hover:bg-red-600'
                                    }`}
                                >
                                    {(dismissEmployee.isPending || reinstateEmployee.isPending)
                                        ? <Loader2 size={16} className="animate-spin mx-auto" />
                                        : isDismissed
                                            ? t('employees.reinstate', 'Reinstate')
                                            : t('employees.dismiss', 'Dismiss')}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default EmployeeDetail;
