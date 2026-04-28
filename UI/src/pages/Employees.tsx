import { useState, useEffect, useRef, useCallback } from 'react';
import { Player } from '@lottiefiles/react-lottie-player';
import trophyData from '../assets/lottie/trophy';
import emptyTeamData from '../assets/lottie/emptyTeam';
import { Tree, TreeNode } from 'react-organizational-chart';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import i18n from '../i18n/config';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search01Icon, FilterIcon, Add01Icon, Cancel01Icon, UserIcon, Mail01Icon, CallIcon, Briefcase01Icon, Building01Icon, Calendar01Icon, UserAdd01Icon, ZapIcon, GraduationScrollIcon, File01Icon, Delete02Icon, Target01Icon, Loading02Icon, ViewIcon, ViewOffIcon, Location01Icon, Upload01Icon, Tick01Icon, Camera01Icon, Shield01Icon, CalculatorIcon, DashboardSquare01Icon, ListViewIcon, ArrowUpRight01Icon, CrownIcon, Share01Icon } from 'hugeicons-react';
import { useInfiniteEmployees, useCreateEmployee, useLeaderboard, useEmployees } from '../api/employees/hooks';
import { EmployeesSkeleton } from '../components/Skeleton';
import { useDepartmentScope, useAuth } from '../contexts/AuthContext';
import { useDepartments } from '../api/departments/hooks';
import { usePositions } from '../api/positions/hooks';
import { documentsApi } from '../api/documents/api';

/* ─── UI Suggestion Chips ──────────────────────────────── */

const SKILLS = [
    'Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'UserIcon Research', 'Wireframing',
    'Design Systems', 'UI Design', 'Illustrator', 'Photoshop', 'Branding',
    'Typography', 'Motion Design', 'CSS', 'React', 'TypeScript', 'Tailwind CSS',
    'Node.js', 'Leadership', 'Project Mgmt', 'Agile', 'After Effects', '3D Design',
];

/* ─── Create Employee Modal ────────────────────────────── */

type UserType = 'employee' | 'manager' | 'accountant' | 'commercial' | 'stagiaire' | 'ceo';

const CreateEmployeeModal = ({ onClose, initialUserType = 'employee', hodDepartmentId }: { onClose: () => void; initialUserType?: UserType; hodDepartmentId?: string }) => {
    const [userType, setUserType] = useState<UserType>(initialUserType);
    const managerMode = userType === 'manager';
    const accountantMode = userType === 'accountant';
    const commercialMode = userType === 'commercial';
    const stagiaireMode = userType === 'stagiaire';
    const ceoMode = userType === 'ceo';
    const { t } = useTranslation();
    const createEmployee = useCreateEmployee();
    const { data: apiDepartments } = useDepartments();
    const { data: apiPositions } = usePositions();
    const { data: allEmployees } = useEmployees();
    const [showPassword, setShowPassword] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        address: '',
        salary: '',
        role: '',
        department: '',
        startDate: '',
        dateOfBirth: '',
        gender: '',
        workDaysPerMonth: '23',
        customersGoal: '',
        skills: [] as string[],
        avatarUrl: '',
        educationDocs: [] as { name: string; type: string; file: File | null }[],
        recruitmentDocs: [] as { name: string; type: string; file: File | null }[],
        encadreurId: '',
    });

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [onClose]);

    useEffect(() => {
        if (hodDepartmentId && apiDepartments) {
            const dept = apiDepartments.find(d => d.id === hodDepartmentId);
            if (dept) setForm(prev => ({ ...prev, department: dept.name }));
        }
    }, [hodDepartmentId, apiDepartments]);

    const handleAvatarChange = useCallback((file: File | null) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setAvatarPreview(base64);
            setForm(prev => ({ ...prev, avatarUrl: base64 }));
        };
        reader.readAsDataURL(file);
    }, []);

    const handleAvatarDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        handleAvatarChange(e.dataTransfer.files[0] || null);
    }, [handleAvatarChange]);

    const [skillInput, setSkillInput] = useState('');

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

    const addDoc = (section: 'educationDocs' | 'recruitmentDocs', defaultType: string) => {
        setForm(prev => ({ ...prev, [section]: [...prev[section], { name: '', type: defaultType, file: null }] }));
    };

    const setDocFile = (section: 'educationDocs' | 'recruitmentDocs', index: number, file: File | null) => {
        setForm(prev => ({
            ...prev,
            [section]: prev[section].map((doc, i) => i === index ? { ...doc, file, name: doc.name || file?.name || '' } : doc),
        }));
    };

    const removeDoc = (section: 'educationDocs' | 'recruitmentDocs', index: number) => {
        setForm(prev => ({ ...prev, [section]: prev[section].filter((_, i) => i !== index) }));
    };

    const updateDoc = (section: 'educationDocs' | 'recruitmentDocs', index: number, field: 'name' | 'type', value: string) => {
        setForm(prev => ({
            ...prev,
            [section]: prev[section].map((doc, i) => i === index ? { ...doc, [field]: value } : doc),
        }));
    };

    const isValid = form.firstName.trim().length > 0 && form.lastName.trim().length > 0 && (ceoMode || managerMode || accountantMode || commercialMode || stagiaireMode || (form.role !== '' && form.department !== ''));

    const inputCls = 'w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';
    const labelCls = 'flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5';
    const docInputCls = 'flex-1 bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all';

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
                <div className="px-6 py-5 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                                {ceoMode ? <CrownIcon size={20} className="text-[#33cbcc]" /> : managerMode ? <Shield01Icon size={20} className="text-[#33cbcc]" /> : accountantMode ? <CalculatorIcon size={20} className="text-[#33cbcc]" /> : commercialMode ? <Target01Icon size={20} className="text-[#33cbcc]" /> : stagiaireMode ? <GraduationScrollIcon size={20} className="text-[#33cbcc]" /> : <UserAdd01Icon size={20} className="text-[#33cbcc]" />}
                            </div>
                            <h2 className="text-lg font-bold text-gray-800">{t('employees.create.title')}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Cancel01Icon size={18} />
                        </button>
                    </div>
                    {/* Role type selector */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl flex-wrap">
                        {(['employee', 'manager', 'accountant', 'commercial', 'stagiaire', 'ceo'] as UserType[]).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setUserType(type)}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                                    userType === type
                                        ? 'bg-white text-[#33cbcc] shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {type === 'employee' && <UserAdd01Icon size={13} />}
                                {type === 'manager' && <Shield01Icon size={13} />}
                                {type === 'accountant' && <CalculatorIcon size={13} />}
                                {type === 'commercial' && <Target01Icon size={13} />}
                                {type === 'stagiaire' && <GraduationScrollIcon size={13} />}
                                {type === 'ceo' && <CrownIcon size={13} />}
                                {type === 'employee' ? t('employees.addEmployee') : type === 'manager' ? t('employees.addManager') : type === 'accountant' ? t('employees.addAccountant') : type === 'commercial' ? t('employees.addCommercial') : type === 'stagiaire' ? 'Stagiaire' : 'CEO'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Profile Picture */}
                    <div>
                        <label className={labelCls}>
                            <Camera01Icon size={12} />
                            {t('employees.edit.profilePicture')}
                        </label>
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                            <UserIcon size={28} className="text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Camera01Icon size={18} className="text-white" />
                                </button>
                            </div>
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleAvatarDrop}
                                onClick={() => avatarInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#33cbcc]/40 transition-colors"
                            >
                                <Upload01Icon size={20} className="mx-auto text-gray-400 mb-1" />
                                <p className="text-xs text-gray-500">{t('employees.edit.dragOrClick')}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{t('employees.edit.maxSize')}</p>
                            </div>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={e => handleAvatarChange(e.target.files?.[0] || null)}
                                className="hidden"
                            />
                            {avatarPreview && (
                                <button
                                    type="button"
                                    onClick={() => { setAvatarPreview(''); setForm(prev => ({ ...prev, avatarUrl: '' })); }}
                                    className="text-xs text-[#283852]/60 hover:text-[#283852] transition-colors"
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
                                <UserIcon size={12} />
                                {t('employees.create.firstName')}
                            </label>
                            <input
                                type="text"
                                value={form.firstName}
                                onChange={e => setForm(prev => ({ ...prev, firstName: e.target.value }))}
                                placeholder={t('employees.create.firstNamePlaceholder')}
                                className={inputCls}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <UserIcon size={12} />
                                {t('employees.create.lastName')}
                            </label>
                            <input
                                type="text"
                                value={form.lastName}
                                onChange={e => setForm(prev => ({ ...prev, lastName: e.target.value }))}
                                placeholder={t('employees.create.lastNamePlaceholder')}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Email + CallIcon */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Mail01Icon size={12} />
                                {t('employees.create.email')}
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                placeholder={t('employees.create.emailPlaceholder')}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <CallIcon size={12} />
                                {t('employees.create.phone')}
                            </label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                placeholder={t('employees.create.phonePlaceholder')}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Address + Salary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Location01Icon size={12} />
                                {t('employees.create.address')}
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                                placeholder={t('employees.create.addressPlaceholder')}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Briefcase01Icon size={12} />
                                {t('employees.create.salary')} (XAF)
                            </label>
                            <input
                                type="number"
                                value={form.salary}
                                onChange={e => setForm(prev => ({ ...prev, salary: e.target.value }))}
                                placeholder="0"
                                className={inputCls}
                            />
                        </div>
                    </div>
                    
                    {/* Password */}
                    <div>
                         <label className={labelCls}>
                            <UserIcon size={12} />
                            {t('employees.create.password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={form.password}
                                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                                placeholder={t('employees.create.passwordPlaceholder')}
                                className={`${inputCls} pr-10`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            >
                                {showPassword ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Date of Birth + Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar01Icon size={12} />
                                {t('employees.create.dateOfBirth')}
                            </label>
                            <input
                                type="date"
                                value={form.dateOfBirth}
                                onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <UserIcon size={12} />
                                {t('employees.create.gender')}
                            </label>
                            <select
                                value={form.gender}
                                onChange={e => setForm(prev => ({ ...prev, gender: e.target.value }))}
                                className={inputCls}
                            >
                                <option value="">{t('employees.create.genderPlaceholder')}</option>
                                <option value="male">{t('employees.create.genderMale')}</option>
                                <option value="female">{t('employees.create.genderFemale')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Department + Encadreur selectors (STAGIAIRE only) */}
                    {stagiaireMode && (
                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>
                                    <Building01Icon size={12} />
                                    {t('employees.create.department')}
                                </label>
                                <select
                                    value={form.department}
                                    onChange={e => setForm(prev => ({ ...prev, department: e.target.value, encadreurId: '' }))}
                                    className={inputCls}
                                    disabled={!!hodDepartmentId}
                                >
                                    <option value="">{t('employees.create.departmentPlaceholder')}</option>
                                    {(apiDepartments || []).map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>
                                    <UserIcon size={12} />
                                    Encadreur
                                </label>
                                <select
                                    value={form.encadreurId}
                                    onChange={e => setForm(prev => ({ ...prev, encadreurId: e.target.value }))}
                                    className={inputCls}
                                >
                                    <option value="">Sélectionner un encadreur</option>
                                    {(allEmployees || [])
                                        .filter(e => {
                                            if (e.dismissed) return false;
                                            if (!form.department) return true;
                                            const deptId = apiDepartments?.find(d => d.name === form.department)?.id;
                                            return deptId ? e.departmentId === deptId : true;
                                        })
                                        .map(e => (
                                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                        ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Role + Department (not shown for managers, accountants, commercials or stagiaires) */}
                    {!managerMode && !accountantMode && !commercialMode && !stagiaireMode && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    <Briefcase01Icon size={12} />
                                    {t('employees.create.role')}
                                </label>
                                <select
                                    value={form.role}
                                    onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))}
                                    className={inputCls}
                                >
                                    <option value="">{t('employees.create.rolePlaceholder')}</option>
                                    {(apiPositions || []).map(p => (
                                        <option key={p.id} value={p.title}>{p.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>
                                    <Building01Icon size={12} />
                                    {t('employees.create.department')}
                                </label>
                                <select
                                    value={form.department}
                                    onChange={e => setForm(prev => ({ ...prev, department: e.target.value }))}
                                    className={inputCls}
                                    disabled={!!hodDepartmentId}
                                >
                                    <option value="">{t('employees.create.departmentPlaceholder')}</option>
                                    {(apiDepartments || []).map(d => (
                                        <option key={d.id} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Start Date + Work Days */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar01Icon size={12} />
                                {t('employees.create.startDate')}
                            </label>
                            <input
                                type="date"
                                value={form.startDate}
                                onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                                className={inputCls}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                <Calendar01Icon size={12} />
                                {t('employees.create.workDays')}
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={form.workDaysPerMonth}
                                onChange={e => setForm(prev => ({ ...prev, workDaysPerMonth: e.target.value }))}
                                placeholder={t('employees.create.workDaysPlaceholder')}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Customers Goal (Commercial only) */}
                    {form.role === 'Commercial' && (
                        <div>
                            <label className={labelCls}>
                                <Target01Icon size={12} />
                                {t('employees.create.customersGoal')}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={form.customersGoal}
                                onChange={e => setForm(prev => ({ ...prev, customersGoal: e.target.value }))}
                                placeholder={t('employees.create.customersGoalPlaceholder')}
                                className={inputCls}
                            />
                        </div>
                    )}

                    {/* ── Skills ─────────────────────────────── */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <ZapIcon size={14} className="text-[#33cbcc]" />
                                {t('employees.create.skills')}
                            </div>
                            {form.skills.length > 0 && (
                                <span className="text-[10px] font-semibold text-[#33cbcc] bg-[#33cbcc]/10 px-2 py-0.5 rounded-full">
                                    {form.skills.length}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{t('employees.create.skillsHint')}</p>
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
                                <Add01Icon size={14} />
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

                    {/* ── Education Documents ────────────────── */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <GraduationScrollIcon size={14} className="text-[#33cbcc]" />
                                {t('employees.create.educationDocs')}
                            </div>
                            <button
                                type="button"
                                onClick={() => addDoc('educationDocs', 'diploma')}
                                className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                            >
                                <Add01Icon size={14} />
                                {t('employees.create.addDocument')}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{t('employees.create.educationDocsHint')}</p>
                        {form.educationDocs.length > 0 && (
                            <div className="space-y-2">
                                {form.educationDocs.map((doc, i) => (
                                    <div key={i} className="bg-gray-50 rounded-xl p-2.5 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={doc.name}
                                                onChange={e => updateDoc('educationDocs', i, 'name', e.target.value)}
                                                placeholder={t('employees.create.documentNamePlaceholder')}
                                                className={docInputCls}
                                            />
                                            <select
                                                value={doc.type}
                                                onChange={e => updateDoc('educationDocs', i, 'type', e.target.value)}
                                                className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                                            >
                                                <option value="diploma">{t('employees.create.educationTypes.diploma')}</option>
                                                <option value="certificate">{t('employees.create.educationTypes.certificate')}</option>
                                                <option value="transcript">{t('employees.create.educationTypes.transcript')}</option>
                                                <option value="other">{t('employees.create.educationTypes.other')}</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeDoc('educationDocs', i)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-[#283852]/10 hover:text-[#283852] transition-colors"
                                            >
                                                <Delete02Icon size={14} />
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer group/file">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all max-w-[220px] ${
                                                doc.file
                                                    ? 'bg-[#33cbcc]/10 text-[#33cbcc] border border-[#33cbcc]/20'
                                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#33cbcc]/30'
                                            }`}>
                                                {doc.file ? <Tick01Icon size={12} className="shrink-0" /> : <Upload01Icon size={12} className="shrink-0" />}
                                                <span className="truncate max-w-[160px] inline-block">{doc.file ? doc.file.name : t('employees.create.chooseFile')}</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.webp"
                                                onChange={e => setDocFile('educationDocs', i, e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── Recruitment Documents ──────────────── */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <File01Icon size={14} className="text-[#33cbcc]" />
                                {t('employees.create.recruitmentDocs')}
                            </div>
                            <button
                                type="button"
                                onClick={() => addDoc('recruitmentDocs', 'cv')}
                                className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                            >
                                <Add01Icon size={14} />
                                {t('employees.create.addDocument')}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">{t('employees.create.recruitmentDocsHint')}</p>
                        {form.recruitmentDocs.length > 0 && (
                            <div className="space-y-2">
                                {form.recruitmentDocs.map((doc, i) => (
                                    <div key={i} className="bg-gray-50 rounded-xl p-2.5 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={doc.name}
                                                onChange={e => updateDoc('recruitmentDocs', i, 'name', e.target.value)}
                                                placeholder={t('employees.create.documentNamePlaceholder')}
                                                className={docInputCls}
                                            />
                                            <select
                                                value={doc.type}
                                                onChange={e => updateDoc('recruitmentDocs', i, 'type', e.target.value)}
                                                className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/30 focus:border-[#33cbcc] transition-all"
                                            >
                                                <option value="cv">{t('employees.create.recruitmentTypes.cv')}</option>
                                                <option value="coverLetter">{t('employees.create.recruitmentTypes.coverLetter')}</option>
                                                <option value="id">{t('employees.create.recruitmentTypes.id')}</option>
                                                <option value="references">{t('employees.create.recruitmentTypes.references')}</option>
                                                <option value="other">{t('employees.create.recruitmentTypes.other')}</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => removeDoc('recruitmentDocs', i)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:bg-[#283852]/10 hover:text-[#283852] transition-colors"
                                            >
                                                <Delete02Icon size={14} />
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer group/file">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all max-w-[220px] ${
                                                doc.file
                                                    ? 'bg-[#33cbcc]/10 text-[#33cbcc] border border-[#33cbcc]/20'
                                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#33cbcc]/30'
                                            }`}>
                                                {doc.file ? <Tick01Icon size={12} className="shrink-0" /> : <Upload01Icon size={12} className="shrink-0" />}
                                                <span className="truncate max-w-[160px] inline-block">{doc.file ? doc.file.name : t('employees.create.chooseFile')}</span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.webp"
                                                onChange={e => setDocFile('recruitmentDocs', i, e.target.files?.[0] || null)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        {t('employees.create.cancel')}
                    </button>
                    <button
                        disabled={!isValid || createEmployee.isPending || isUploading}
                        onClick={async () => {
                            setIsUploading(true);
                            try {
                                // Upload01Icon education docs to formation folder
                                const uploadedEducationDocs = await Promise.all(
                                    form.educationDocs.map(async (doc) => {
                                        if (doc.file) {
                                            const result = await documentsApi.uploadFile(doc.file, 'formation');
                                            return { name: doc.name || doc.file.name, type: doc.type, filePath: result.filePath };
                                        }
                                        return { name: doc.name, type: doc.type };
                                    })
                                );

                                // Upload01Icon recruitment docs to recruitment folder
                                const uploadedRecruitmentDocs = await Promise.all(
                                    form.recruitmentDocs.map(async (doc) => {
                                        if (doc.file) {
                                            const result = await documentsApi.uploadFile(doc.file, 'recruitment');
                                            return { name: doc.name || doc.file.name, type: doc.type, filePath: result.filePath };
                                        }
                                        return { name: doc.name, type: doc.type };
                                    })
                                );

                                createEmployee.mutate({
                                    email: form.email,
                                    password: form.password,
                                    firstName: form.firstName,
                                    lastName: form.lastName,
                                    phoneNumber: form.phone,
                                    address: form.address,
                                    birthDate: form.dateOfBirth || undefined,
                                    salary: form.salary ? Number(form.salary) : undefined,
                                    hireDate: form.startDate || undefined,
                                    departmentId: apiDepartments?.find(d => d.name === form.department)?.id,
                                    positionId: apiPositions?.find(p => p.title === form.role)?.id,
                                    skills: form.skills,
                                    avatarUrl: form.avatarUrl || undefined,
                                    educationDocs: uploadedEducationDocs,
                                    recruitmentDocs: uploadedRecruitmentDocs,
                                    ...(ceoMode ? { userRole: 'CEO' } : managerMode ? { userRole: 'MANAGER' } : accountantMode ? { userRole: 'ACCOUNTANT' } : commercialMode ? { userRole: 'COMMERCIAL' } : stagiaireMode ? { userRole: 'STAGIAIRE', encadreurId: form.encadreurId || undefined } : {}),
                                }, {
                                    onSuccess: () => onClose(),
                                    onSettled: () => setIsUploading(false),
                                });
                            } catch (error) {
                                console.error('Failed to upload documents:', error);
                                setIsUploading(false);
                                toast.error(i18n.t('toast.error'));
                            }
                        }}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                            isValid && !createEmployee.isPending && !isUploading
                                ? 'bg-[#33cbcc] hover:bg-[#2bb5b6] shadow-lg shadow-[#33cbcc]/20'
                                : 'bg-gray-300 cursor-not-allowed shadow-none'
                        }`}
                    >
                        {(createEmployee.isPending || isUploading) ? <Loading02Icon size={16} className="animate-spin" /> : ceoMode ? <CrownIcon size={16} /> : managerMode ? <Shield01Icon size={16} /> : accountantMode ? <CalculatorIcon size={16} /> : commercialMode ? <Target01Icon size={16} /> : stagiaireMode ? <GraduationScrollIcon size={16} /> : <Add01Icon size={16} />}
                        {isUploading ? t('employees.create.uploading') : ceoMode ? 'Créer le CEO' : managerMode ? t('employees.createManager.submit') : accountantMode ? t('employees.createAccountant.submit') : commercialMode ? t('employees.createCommercial.submit') : stagiaireMode ? 'Créer le stagiaire' : t('employees.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Organigram View ───────────────────────────────────── */

const orgAvatar = (emp: { firstName: string; lastName: string; avatarUrl?: string | null }) =>
    emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff&size=80`;

/** Distribute items round-robin across n buckets */
function distribute<T>(items: T[], n: number): T[][] {
    if (n <= 0) return [items];
    const buckets: T[][] = Array.from({ length: n }, () => []);
    items.forEach((item, i) => buckets[i % n].push(item));
    return buckets;
}

/* ── Node card components ─────────────────────────────── */

const PersonNode = ({ emp, badge, onClick }: { emp: any; badge: string; onClick: () => void }) => (
    <div
        onClick={onClick}
        className="inline-block bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden w-48 text-center cursor-pointer hover:border-[#283852]/30 hover:shadow-lg transition-all"
    >
        <div className="bg-[#283852]/10 px-3 py-1.5 border-b border-gray-100 flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#283852] shrink-0" />
            <p className="text-[10px] font-bold text-[#283852] uppercase tracking-widest truncate">{badge}</p>
        </div>
        <div className="px-4 py-4 flex flex-col items-center gap-2">
            <img
                src={orgAvatar(emp)}
                className="w-14 h-14 rounded-full border-2 border-[#283852]/20 object-cover shadow-sm"
                alt={`${emp.firstName} ${emp.lastName}`}
            />
            <div className="min-w-0 w-full">
                <p className="text-sm font-bold text-gray-800 leading-tight truncate">{emp.firstName} {emp.lastName}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{emp.position?.title || badge}</p>
            </div>
        </div>
    </div>
);

const CompanyNode = () => (
    <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#283852] to-[#1e2a3d] text-white px-5 py-3 rounded-2xl shadow-lg cursor-default">
        <div className="w-7 h-7 rounded-lg bg-[#33cbcc]/20 flex items-center justify-center shrink-0">
            <Building01Icon size={14} className="text-[#33cbcc]" />
        </div>
        <span className="text-sm font-bold tracking-tight">Organisation</span>
    </div>
);

/** HOD node — department header + head card + members, shown directly below managers */
const HodNode = ({ dept, navigate, showMembers = false }: { dept: any; navigate: (path: string) => void; showMembers?: boolean }) => {
    const head = dept.head;
    const members = showMembers
        ? (dept.employees || []).filter((e: any) => e.id !== head?.id && !e.dismissed)
        : [];
    return (
        <div className="inline-block text-left">
            <div
                onClick={() => head && navigate(`/employees/${head.id}`)}
                className={`bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden w-52 ${head ? 'cursor-pointer hover:border-[#33cbcc]/40 hover:shadow-lg transition-all' : ''}`}
            >
                {/* Dept label */}
                <div className="bg-gradient-to-r from-[#33cbcc]/15 to-[#283852]/10 px-3 py-2 border-b border-gray-100 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#33cbcc] shrink-0" />
                    <p className="text-[10px] font-bold text-[#283852] truncate">{dept.name}</p>
                    <span className="text-[9px] text-gray-400 bg-white/70 px-1.5 py-0.5 rounded-full ml-auto shrink-0">
                        {dept.employees?.length ?? 0}
                    </span>
                </div>
                {head ? (
                    <div className="px-4 py-4 flex flex-col items-center gap-2 text-center">
                        <img
                            src={orgAvatar(head)}
                            className="w-14 h-14 rounded-full border-2 border-[#33cbcc]/30 object-cover shadow-sm"
                            alt={`${head.firstName} ${head.lastName}`}
                        />
                        <div>
                            <p className="text-sm font-bold text-gray-800 leading-tight">
                                {head.firstName} {head.lastName}
                            </p>
                            <p className="text-[9px] text-[#33cbcc] font-semibold uppercase tracking-widest mt-0.5">
                                Chef de dépt.
                            </p>
                            {head.position?.title && (
                                <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[160px] mx-auto">
                                    {head.position.title}
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="px-3 py-4 text-center">
                        <p className="text-xs text-gray-400">Pas de chef</p>
                    </div>
                )}
            </div>
            {/* Members shown inside HOD card in full-org view */}
            {members.length > 0 && (
                <div className="mt-2 flex flex-col gap-1.5 w-52">
                    {members.map((m: any) => (
                        <div
                            key={m.id}
                            onClick={() => navigate(`/employees/${m.id}`)}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-2 flex items-center gap-2.5 cursor-pointer hover:border-[#33cbcc]/30 hover:shadow-md transition-all"
                        >
                            <img
                                src={orgAvatar(m)}
                                className="w-8 h-8 rounded-full border border-gray-100 object-cover shrink-0"
                                alt={`${m.firstName} ${m.lastName}`}
                            />
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">{m.firstName} {m.lastName}</p>
                                {m.position?.title && (
                                    <p className="text-[10px] text-gray-400 truncate">{m.position.title}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Member node — used in dept-scoped view only */
const MemberNode = ({ emp, navigate }: { emp: any; navigate: (path: string) => void }) => (
    <div
        onClick={() => navigate(`/employees/${emp.id}`)}
        className="inline-block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-44 text-center px-4 py-4 flex flex-col items-center gap-2.5 cursor-pointer hover:border-[#33cbcc]/30 hover:shadow-md transition-all"
    >
        <img
            src={orgAvatar(emp)}
            className="w-12 h-12 rounded-full border-2 border-gray-100 object-cover"
            alt={`${emp.firstName} ${emp.lastName}`}
        />
        <div className="min-w-0 w-full">
            <p className="text-sm font-semibold text-gray-800 leading-tight truncate">
                {emp.firstName} {emp.lastName}
            </p>
            {emp.position?.title && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{emp.position.title}</p>
            )}
        </div>
    </div>
);

const OrganigramView = ({ deptScope }: { deptScope?: string | null }) => {
    const navigate = useNavigate();
    const { data: departments = [], isLoading: deptsLoading } = useDepartments();
    const { data: allEmployees = [], isLoading: empsLoading } = useEmployees();

    const isLoading = deptsLoading || empsLoading;

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loading02Icon className="animate-spin text-[#33cbcc]" size={32} />
            </div>
        );
    }

    const ceos     = allEmployees.filter(e => e.user?.role === 'CEO'     && !e.dismissed);
    const managers = allEmployees.filter(e => e.user?.role === 'MANAGER' && !e.dismissed);

    const activeDepts = departments
        .filter(d => d.head || (d.employees?.length ?? 0) > 0)
        .filter(d => !deptScope || d.id === deptScope);

    const hasCeo      = ceos.length > 0 && !deptScope;
    const hasManagers = managers.length > 0 && !deptScope;

    if (activeDepts.length === 0 && !hasCeo && !hasManagers) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Share01Icon size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Aucun département configuré</p>
            </div>
        );
    }

    const treeProps = {
        lineColor: '#d1d5db',
        lineWidth: '2px',
        lineHeight: '36px',
        lineBorderRadius: '6px',
        nodePadding: '10px',
    };

    // ── Dept-scoped view ────────────────────────────────
    if (deptScope) {
        const dept = activeDepts[0];
        if (!dept) return null;
        const head = dept.head;
        const members = (dept.employees || []).filter((e: any) => e.id !== head?.id && !e.dismissed);

        return (
            <div className="w-full overflow-x-auto pb-8 pt-4">
                <div className="min-w-max mx-auto px-4">
                    <Tree {...treeProps} label={<HodNode dept={dept} navigate={navigate} />}>
                        {members.map((m: any) => (
                            <TreeNode key={m.id} label={<MemberNode emp={m} navigate={navigate} />} />
                        ))}
                    </Tree>
                </div>
            </div>
        );
    }

    // ── Full org view ───────────────────────────────────
    // Each dept/manager is assigned exactly once (globally) to avoid duplicate keys
    // and misaligned connectors.

    // Pre-compute members for each dept once
    type DeptEntry = { dept: (typeof activeDepts)[0]; members: any[] };
    const deptEntries: DeptEntry[] = activeDepts.map(dept => ({
        dept,
        members: (dept.employees || []).filter((e: any) => e.id !== dept.head?.id && !e.dismissed),
    }));

    // HOD subtree: each dept appears once, members shown inside the card (no child TreeNodes)
    const hodSubtrees = (entries: DeptEntry[]) =>
        entries.map(({ dept }) => (
            <TreeNode key={dept.id} label={<HodNode dept={dept} navigate={navigate} showMembers />} />
        ));

    // Assign depts to managers once, globally (round-robin)
    const deptsByMgr = distribute(deptEntries, Math.max(managers.length, 1));

    // Manager subtree: each manager appears once, with its assigned depts
    const mgrSubtrees = managers.map((mgr, i) => (
        <TreeNode
            key={mgr.id}
            label={<PersonNode emp={mgr} badge="Manager" onClick={() => navigate(`/employees/${mgr.id}`)} />}
        >
            {hodSubtrees(deptsByMgr[i] || [])}
        </TreeNode>
    ));

    // Assign manager indices to CEOs once, globally (round-robin)
    const mgrIdxByCeo = distribute(managers.map((_, i) => i), Math.max(ceos.length, 1));
    // When no managers: assign depts directly to CEOs
    const deptsByCeo = distribute(deptEntries, Math.max(ceos.length, 1));

    // CEO subtree: each CEO appears once
    const ceoSubtrees = ceos.map((ceo, i) => (
        <TreeNode
            key={ceo.id}
            label={<PersonNode emp={ceo} badge="CEO" onClick={() => navigate(`/employees/${ceo.id}`)} />}
        >
            {hasManagers
                ? (mgrIdxByCeo[i] || []).map(mi => mgrSubtrees[mi])
                : hodSubtrees(deptsByCeo[i] || [])
            }
        </TreeNode>
    ));

    const rootChildren = hasCeo
        ? ceoSubtrees
        : hasManagers
            ? mgrSubtrees
            : hodSubtrees(deptEntries);

    return (
        <div className="w-full overflow-x-auto pb-8 pt-4">
            <div className="min-w-max mx-auto px-4">
                <Tree {...treeProps} label={<CompanyNode />}>
                    {rootChildren}
                </Tree>
            </div>
        </div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Employees = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [viewMode, setViewMode] = useState<'org' | 'grid' | 'list'>('org');
    const [showDismissed, setShowDismissed] = useState(false);
    const deptScope = useDepartmentScope();
    const { role, departmentId } = useAuth();
    const { data: apiDepartments } = useDepartments();
    const { data: leaderboard } = useLeaderboard();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    const queryParams = {
        departmentId: deptScope || selectedDepartment || undefined,
        search: debouncedSearch || undefined,
    };
    const activeQuery = useInfiniteEmployees(queryParams);
    const dismissedQuery = useInfiniteEmployees({ ...queryParams, dismissed: true });

    const activeSentinelRef = useRef<HTMLDivElement>(null);
    const dismissedSentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = activeSentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && activeQuery.hasNextPage && !activeQuery.isFetchingNextPage) {
                activeQuery.fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [activeQuery.hasNextPage, activeQuery.isFetchingNextPage, activeQuery.fetchNextPage]);

    useEffect(() => {
        const el = dismissedSentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting && dismissedQuery.hasNextPage && !dismissedQuery.isFetchingNextPage) {
                dismissedQuery.fetchNextPage();
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [dismissedQuery.hasNextPage, dismissedQuery.isFetchingNextPage, dismissedQuery.fetchNextPage]);

    const isLoading = activeQuery.isPending;

    const mapEmp = (emp: any, i: number, dismissed: boolean) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.position?.title || '—',
        departmentId: emp.departmentId || '',
        departmentName: emp.department?.name || '',
        avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`,
        color: i % 2 === 0 ? '#33cbcc' : '#283852',
        dismissed,
    });

    const employees = (activeQuery.data?.pages.flatMap(p => p.rows) || []).map((emp, i) => mapEmp(emp, i, false));
    const dismissedEmployees = (dismissedQuery.data?.pages.flatMap(p => p.rows) || []).map((emp, i) => mapEmp(emp, i, true));

    const DEPT_COLORS = ['#33cbcc','#283852','#e05e5e','#f59e0b','#6366f1','#10b981','#ec4899'];
    const deptColorMap: Record<string, string> = {};
    (apiDepartments || []).forEach((d, i) => { deptColorMap[d.id] = DEPT_COLORS[i % DEPT_COLORS.length]; });

    return (
        <div>
            <div className="space-y-7">

                {/* ── PAGE HEADER ─────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#33cbcc] mb-1">
                            {i18n.language === 'fr' ? 'Ressources Humaines' : 'Human Resources'}
                        </p>
                        <h1 className="text-4xl font-bold text-[#1c2b3a] leading-none tracking-tight">
                            {t('employees.title')}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Avatar stack + count */}
                        {employees.length > 0 && (
                            <div className="flex items-center gap-2 border border-[#e5e8ef] bg-white rounded-2xl px-3 py-2">
                                <div className="flex -space-x-2.5">
                                    {employees.slice(0, 4).map(emp => (
                                        <div key={emp.id} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                                            <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-[#1c2b3a] pl-1">{employees.length}</span>
                            </div>
                        )}

                        {/* View toggle */}
                        <div className="flex items-center border border-[#e5e8ef] bg-white rounded-2xl p-1">
                            {(['org','grid','list'] as const).map(mode => (
                                <button key={mode} onClick={() => setViewMode(mode)}
                                    className={`p-2 rounded-xl transition-all duration-150 ${viewMode === mode ? 'bg-[#283852] text-white' : 'text-[#8892a4] hover:text-[#1c2b3a]'}`}
                                    title={mode === 'org' ? 'Organigramme' : mode === 'grid' ? 'Grille' : 'Liste'}>
                                    {mode === 'org' ? <Share01Icon size={15} /> : mode === 'grid' ? <DashboardSquare01Icon size={15} /> : <ListViewIcon size={15} />}
                                </button>
                            ))}
                        </div>

                        {role !== 'ACCOUNTANT' && (
                            <motion.button
                                onClick={() => setShowCreateModal(true)}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-2xl text-sm font-semibold"
                            >
                                <UserAdd01Icon size={15} />
                                {t('employees.addEmployee')}
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* ── SEARCH + FILTERS ────────────────────────────── */}
                {viewMode !== 'org' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-3 bg-white border border-[#e5e8ef] rounded-2xl px-4 py-3 focus-within:border-[#33cbcc] transition-colors">
                            <Search01Icon size={18} className="text-[#b0bac9] shrink-0" />
                            <input
                                type="text"
                                placeholder={t('employees.searchPlaceholder')}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent outline-none text-sm text-[#1c2b3a] placeholder-[#b0bac9]"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="text-[#b0bac9] hover:text-[#283852] transition-colors">
                                    <Cancel01Icon size={16} />
                                </button>
                            )}
                        </div>
                        <div className="relative min-w-44">
                            <Building01Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                            <select
                                value={selectedDepartment}
                                onChange={e => setSelectedDepartment(e.target.value)}
                                className="w-full bg-white border border-[#e5e8ef] rounded-2xl py-3 pl-10 pr-8 text-sm text-[#1c2b3a] appearance-none cursor-pointer focus:outline-none focus:border-[#33cbcc] transition-colors"
                            >
                                <option value="">{t('employees.allDepartments')}</option>
                                {(apiDepartments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <FilterIcon size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* ── LEADERBOARD ─────────────────────────────────── */}
                {leaderboard && leaderboard.length > 0 && !searchQuery && !selectedDepartment && viewMode !== 'org' && (
                    <div className="bg-[#283852] rounded-3xl overflow-hidden">
                        <div className="flex flex-col lg:flex-row">

                            {/* Left: Lottie + #1 */}
                            <div className="lg:w-72 flex flex-col items-center justify-center p-8 border-b border-white/10 lg:border-b-0 lg:border-r border-white/10">
                                <div className="relative">
                                    <Player
                                        autoplay loop
                                        src={trophyData as any}
                                        style={{ width: 100, height: 100 }}
                                    />
                                </div>
                                <p className="text-[#33cbcc] text-[11px] font-bold uppercase tracking-[0.18em] mb-4">
                                    {t('employees.bestEmployee', 'Employee of the month')}
                                </p>
                                <div className="relative mb-3">
                                    <div className="w-20 h-20 rounded-full overflow-hidden border-[3px] border-[#33cbcc]">
                                        <img
                                            src={leaderboard[0].avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(leaderboard[0].firstName + '+' + leaderboard[0].lastName)}&background=33cbcc&color=fff`}
                                            alt={`${leaderboard[0].firstName} ${leaderboard[0].lastName}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-[#33cbcc] flex items-center justify-center text-white text-xs font-black border-2 border-[#283852]">
                                        1
                                    </div>
                                </div>
                                <h3 className="text-white font-bold text-base text-center leading-tight">
                                    {leaderboard[0].firstName} {leaderboard[0].lastName}
                                </h3>
                                <p className="text-white/40 text-xs mt-0.5 text-center">{leaderboard[0].positionTitle}</p>
                                <div className="mt-3 px-3 py-1 bg-[#33cbcc]/15 text-[#33cbcc] text-xs font-bold rounded-xl border border-[#33cbcc]/20">
                                    {leaderboard[0].points} pts
                                </div>
                            </div>

                            {/* Right: ranked list */}
                            <div className="flex-1 p-6 lg:p-8">
                                <div className="flex items-center gap-3 mb-5">
                                    <Target01Icon size={18} className="text-[#33cbcc]" />
                                    <h2 className="text-white font-bold text-base">{t('employees.leaderboard', 'Top Employees')}</h2>
                                </div>
                                <div className="space-y-2">
                                    {leaderboard.slice(1, 6).map((emp, idx) => (
                                        <motion.div
                                            key={emp.id}
                                            initial={{ opacity: 0, x: 16 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                                            className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-white/6 hover:bg-white/6 transition-colors"
                                        >
                                            <span className="w-6 text-center text-xs font-bold text-white/30">#{emp.rank}</span>
                                            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/15 shrink-0">
                                                <img src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`} alt={`${emp.firstName} ${emp.lastName}`} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                                                <p className="text-white/35 text-[11px] truncate">{emp.positionTitle}</p>
                                            </div>
                                            <span className="text-[#33cbcc] text-sm font-bold tabular-nums shrink-0">{emp.points}<span className="text-[#33cbcc]/40 text-xs font-normal ml-0.5">pts</span></span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ORG VIEW ────────────────────────────────────── */}
                {viewMode === 'org' && <OrganigramView deptScope={deptScope} />}

                {/* ── GRID / LIST ─────────────────────────────────── */}
                {viewMode !== 'org' && (
                    <>
                        {isLoading && <EmployeesSkeleton />}

                        {/* Empty state */}
                        {!isLoading && employees.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Player autoplay loop src={emptyTeamData as any} style={{ width: 160, height: 140 }} />
                                <p className="mt-4 text-[#1c2b3a] font-semibold text-base">
                                    {searchQuery
                                        ? (i18n.language === 'fr' ? 'Aucun résultat' : 'No results found')
                                        : (i18n.language === 'fr' ? 'Aucun employé pour l\'instant' : 'No employees yet')}
                                </p>
                                <p className="text-[#8892a4] text-sm mt-1 mb-5">
                                    {searchQuery
                                        ? (i18n.language === 'fr' ? 'Essayez un autre terme' : 'Try a different search term')
                                        : (i18n.language === 'fr' ? 'Commencez par ajouter un employé' : 'Start by adding your first employee')}
                                </p>
                                {!searchQuery && role !== 'ACCOUNTANT' && (
                                    <button
                                        onClick={() => setShowCreateModal(true)}
                                        className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-2xl text-sm font-semibold"
                                    >
                                        <UserAdd01Icon size={15} /> {t('employees.addEmployee')}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Grid */}
                        {viewMode === 'grid' && employees.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {employees.map((employee, index) => {
                                    const accentColor = deptColorMap[employee.departmentId] || '#33cbcc';
                                    return (
                                        <motion.div
                                            key={employee.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
                                            onClick={() => navigate(`/employees/${employee.id}`)}
                                            className="group bg-white border border-[#e5e8ef] rounded-3xl overflow-hidden cursor-pointer hover:border-[#33cbcc] transition-colors duration-200"
                                        >
                                            {/* Color accent bar */}
                                            <div className="h-1.5" style={{ backgroundColor: accentColor }} />
                                            <div className="p-6 flex flex-col items-center text-center">
                                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#f0f2f5] mb-3">
                                                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                </div>
                                                <h3 className="font-bold text-[#1c2b3a] text-sm leading-snug">{employee.name}</h3>
                                                <p className="text-[#8892a4] text-xs mt-0.5 line-clamp-1">{employee.role}</p>
                                                {employee.departmentName && (
                                                    <span className="mt-3 text-[10px] font-semibold px-2.5 py-1 rounded-xl" style={{ backgroundColor: accentColor + '18', color: accentColor }}>
                                                        {employee.departmentName}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* List */}
                        {viewMode === 'list' && employees.length > 0 && (
                            <div className="bg-white border border-[#e5e8ef] rounded-3xl overflow-hidden">
                                {/* Table header */}
                                <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3 border-b border-[#f0f2f5]">
                                    <div className="w-10" />
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b0bac9]">{i18n.language === 'fr' ? 'Employé' : 'Employee'}</p>
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#b0bac9] hidden md:block">{i18n.language === 'fr' ? 'Département' : 'Department'}</p>
                                    <div className="w-5" />
                                </div>
                                {employees.map((employee, index) => {
                                    const accentColor = deptColorMap[employee.departmentId] || '#33cbcc';
                                    return (
                                        <motion.div
                                            key={employee.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: Math.min(index * 0.03, 0.3) }}
                                            onClick={() => navigate(`/employees/${employee.id}`)}
                                            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3.5 border-b border-[#f0f2f5] last:border-b-0 hover:bg-[#f8f9fc] cursor-pointer transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f0f2f5] shrink-0">
                                                <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-[#1c2b3a] truncate">{employee.name}</p>
                                                <p className="text-xs text-[#8892a4] truncate">{employee.role}</p>
                                            </div>
                                            {employee.departmentName && (
                                                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-xl hidden md:inline-flex items-center gap-1.5 shrink-0"
                                                    style={{ backgroundColor: accentColor + '18', color: accentColor }}>
                                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                                                    {employee.departmentName}
                                                </span>
                                            )}
                                            <ArrowUpRight01Icon size={15} className="text-[#d8dde6] group-hover:text-[#33cbcc] transition-colors shrink-0" />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* scroll sentinel */}
                {viewMode !== 'org' && <div ref={activeSentinelRef} className="h-1" />}
                {activeQuery.isFetchingNextPage && (
                    <div className="flex justify-center py-4">
                        <Loading02Icon size={20} className="animate-spin text-[#33cbcc]" />
                    </div>
                )}

                {/* ── DISMISSED ───────────────────────────────────── */}
                {viewMode !== 'org' && (dismissedEmployees.length > 0 || (dismissedQuery.data?.pages[0]?.count ?? 0) > 0) && (
                    <div>
                        <button
                            onClick={() => setShowDismissed(v => !v)}
                            className="flex items-center gap-2.5 px-4 py-2.5 bg-white border border-[#e5e8ef] rounded-2xl text-sm font-semibold text-[#8892a4] hover:border-[#283852]/30 hover:text-[#283852] transition-colors mb-4"
                        >
                            <UserAdd01Icon size={14} className="rotate-45 shrink-0" />
                            {t('employees.dismissed', 'Dismissed / Suspended')}
                            <span className="px-2 py-0.5 bg-[#f0f2f5] text-[#8892a4] rounded-lg text-xs font-bold">
                                {dismissedQuery.data?.pages[0]?.count ?? dismissedEmployees.length}
                            </span>
                            <motion.span animate={{ rotate: showDismissed ? 180 : 0 }} transition={{ duration: 0.2 }} className="ml-auto text-xs">▾</motion.span>
                        </button>

                        <AnimatePresence>
                            {showDismissed && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    {viewMode === 'grid' ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {dismissedEmployees.map((employee, index) => (
                                                <motion.div
                                                    key={employee.id}
                                                    initial={{ opacity: 0, y: 16 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.04 }}
                                                    onClick={() => navigate(`/employees/${employee.id}`)}
                                                    className="group bg-white border border-[#e5e8ef] rounded-3xl overflow-hidden cursor-pointer opacity-55 grayscale hover:opacity-70 transition-all"
                                                >
                                                    <div className="h-1.5 bg-[#d1d5db]" />
                                                    <div className="p-6 flex flex-col items-center text-center">
                                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#f0f2f5] mb-3">
                                                            <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <h3 className="font-bold text-[#6b7280] text-sm">{employee.name}</h3>
                                                        <p className="text-[#9ca3af] text-xs mt-0.5">{employee.role}</p>
                                                        <span className="mt-3 text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[#f3f4f6] text-[#9ca3af] uppercase tracking-wide">
                                                            {t('employees.dismissedBadge', 'Dismissed')}
                                                        </span>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-[#e5e8ef] rounded-3xl overflow-hidden">
                                            {dismissedEmployees.map((employee, index) => (
                                                <motion.div
                                                    key={employee.id}
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: index * 0.03 }}
                                                    onClick={() => navigate(`/employees/${employee.id}`)}
                                                    className="flex items-center gap-4 px-6 py-3.5 border-b border-[#f0f2f5] last:border-b-0 hover:bg-[#f8f9fc] cursor-pointer transition-colors group opacity-55"
                                                >
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#f0f2f5] shrink-0 grayscale">
                                                        <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#6b7280] truncate">{employee.name}</p>
                                                        <p className="text-xs text-[#9ca3af] truncate">{employee.role}</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-[#f3f4f6] text-[#9ca3af] uppercase tracking-wide shrink-0">
                                                        {t('employees.dismissedBadge', 'Dismissed')}
                                                    </span>
                                                    <ArrowUpRight01Icon size={15} className="text-[#d8dde6] group-hover:text-[#9ca3af] transition-colors shrink-0" />
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                    <div ref={dismissedSentinelRef} className="h-1" />
                                    {dismissedQuery.isFetchingNextPage && (
                                        <div className="flex justify-center py-4">
                                            <Loading02Icon size={20} className="animate-spin text-[#b0bac9]" />
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

            </div>

            {/* ── Modals ──────────────────────────────────────────── */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateEmployeeModal onClose={() => setShowCreateModal(false)} hodDepartmentId={role === 'HEAD_OF_DEPARTMENT' ? (departmentId ?? undefined) : undefined} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Employees;
