import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import i18n from '../i18n/config';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Plus,
    X,
    User,
    Mail,
    Phone,
    Briefcase,
    Building,
    Calendar,
    UserPlus,
    Zap,
    GraduationCap,
    FileText,
    Trash2,
    Target,
    Loader2,
    Eye,
    EyeOff,
    MapPin,
    Upload,
    CheckCircle,
    Camera,
    Shield,
    Calculator,
    LayoutGrid,
    List,
    ArrowUpRight,
} from 'lucide-react';
import { useEmployees, useCreateEmployee, useLeaderboard } from '../api/employees/hooks';
import { EmployeesSkeleton } from '../components/Skeleton';
import { useDepartmentScope, useAuth } from '../contexts/AuthContext';
import { useDepartments } from '../api/departments/hooks';
import { usePositions } from '../api/positions/hooks';
import { documentsApi } from '../api/documents/api';

/* ─── UI Suggestion Chips ──────────────────────────────── */

const SKILLS = [
    'Figma', 'Adobe XD', 'Sketch', 'Prototyping', 'User Research', 'Wireframing',
    'Design Systems', 'UI Design', 'Illustrator', 'Photoshop', 'Branding',
    'Typography', 'Motion Design', 'CSS', 'React', 'TypeScript', 'Tailwind CSS',
    'Node.js', 'Leadership', 'Project Mgmt', 'Agile', 'After Effects', '3D Design',
];

/* ─── Create Employee Modal ────────────────────────────── */

const CreateEmployeeModal = ({ onClose, managerMode = false, accountantMode = false, hodDepartmentId }: { onClose: () => void; managerMode?: boolean; accountantMode?: boolean; hodDepartmentId?: string }) => {
    const { t } = useTranslation();
    const createEmployee = useCreateEmployee();
    const { data: apiDepartments } = useDepartments();
    const { data: apiPositions } = usePositions();
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

    const isValid = form.firstName.trim().length > 0 && form.lastName.trim().length > 0 && (managerMode || accountantMode || (form.role !== '' && form.department !== ''));

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
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#33cbcc]/10 flex items-center justify-center">
                            {managerMode ? <Shield size={20} className="text-[#33cbcc]" /> : accountantMode ? <Calculator size={20} className="text-[#33cbcc]" /> : <UserPlus size={20} className="text-[#33cbcc]" />}
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">{managerMode ? t('employees.createManager.title') : accountantMode ? t('employees.createAccountant.title') : t('employees.create.title')}</h2>
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
                                    onClick={() => avatarInputRef.current?.click()}
                                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Camera size={18} className="text-white" />
                                </button>
                            </div>
                            <div
                                onDragOver={e => e.preventDefault()}
                                onDrop={handleAvatarDrop}
                                onClick={() => avatarInputRef.current?.click()}
                                className="flex-1 border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#33cbcc]/40 transition-colors"
                            >
                                <Upload size={20} className="mx-auto text-gray-400 mb-1" />
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
                                placeholder={t('employees.create.firstNamePlaceholder')}
                                className={inputCls}
                                autoFocus
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
                                placeholder={t('employees.create.lastNamePlaceholder')}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    {/* Email + Phone */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Mail size={12} />
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
                                <Phone size={12} />
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
                                <MapPin size={12} />
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
                                <Briefcase size={12} />
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
                            <User size={12} />
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
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Date of Birth + Gender */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelCls}>
                                <Calendar size={12} />
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
                                <User size={12} />
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

                    {/* Role + Department (not shown for managers or accountants) */}
                    {!managerMode && !accountantMode && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>
                                    <Briefcase size={12} />
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
                                    <Building size={12} />
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
                                <Calendar size={12} />
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
                                <Calendar size={12} />
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
                                <Target size={12} />
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
                                <Zap size={14} className="text-[#33cbcc]" />
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

                    {/* ── Education Documents ────────────────── */}
                    <div className="border-t border-gray-100 pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                <GraduationCap size={14} className="text-[#33cbcc]" />
                                {t('employees.create.educationDocs')}
                            </div>
                            <button
                                type="button"
                                onClick={() => addDoc('educationDocs', 'diploma')}
                                className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                            >
                                <Plus size={14} />
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
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer group/file">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all max-w-[220px] ${
                                                doc.file
                                                    ? 'bg-green-50 text-green-600 border border-green-200'
                                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#33cbcc]/30'
                                            }`}>
                                                {doc.file ? <CheckCircle size={12} className="shrink-0" /> : <Upload size={12} className="shrink-0" />}
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
                                <FileText size={14} className="text-[#33cbcc]" />
                                {t('employees.create.recruitmentDocs')}
                            </div>
                            <button
                                type="button"
                                onClick={() => addDoc('recruitmentDocs', 'cv')}
                                className="flex items-center gap-1 text-xs font-semibold text-[#33cbcc] hover:text-[#2bb5b6] transition-colors"
                            >
                                <Plus size={14} />
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
                                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer group/file">
                                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all max-w-[220px] ${
                                                doc.file
                                                    ? 'bg-green-50 text-green-600 border border-green-200'
                                                    : 'bg-white text-gray-500 border border-gray-200 hover:border-[#33cbcc]/30'
                                            }`}>
                                                {doc.file ? <CheckCircle size={12} className="shrink-0" /> : <Upload size={12} className="shrink-0" />}
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
                                // Upload education docs to formation folder
                                const uploadedEducationDocs = await Promise.all(
                                    form.educationDocs.map(async (doc) => {
                                        if (doc.file) {
                                            const result = await documentsApi.uploadFile(doc.file, 'formation');
                                            return { name: doc.name || doc.file.name, type: doc.type, filePath: result.filePath };
                                        }
                                        return { name: doc.name, type: doc.type };
                                    })
                                );

                                // Upload recruitment docs to recruitment folder
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
                                    ...(managerMode ? { userRole: 'MANAGER' } : accountantMode ? { userRole: 'ACCOUNTANT' } : {}),
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
                        {(createEmployee.isPending || isUploading) ? <Loader2 size={16} className="animate-spin" /> : managerMode ? <Shield size={16} /> : accountantMode ? <Calculator size={16} /> : <Plus size={16} />}
                        {isUploading ? t('employees.create.uploading') : managerMode ? t('employees.createManager.submit') : accountantMode ? t('employees.createAccountant.submit') : t('employees.create.submit')}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

/* ─── Component ─────────────────────────────────────────── */

const Employees = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showManagerModal, setShowManagerModal] = useState(false);
    const [showAccountantModal, setShowAccountantModal] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showDismissed, setShowDismissed] = useState(false);
    const deptScope = useDepartmentScope();
    const { role, departmentId } = useAuth();
    const isManager = role === 'MANAGER';
    const { data: apiEmployees, isLoading } = useEmployees(deptScope);
    const { data: apiDepartments } = useDepartments();
    const { data: leaderboard } = useLeaderboard();

    const allEmployees = (apiEmployees || []).map((emp, i) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.position?.title || '—',
        departmentId: emp.departmentId || '',
        departmentName: emp.department?.name || '',
        avatar: emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`,
        color: i % 2 === 0 ? '#33cbcc' : '#283852',
        dismissed: emp.dismissed || false,
    }));

    const filterFn = (emp: typeof allEmployees[0]) => {
        const matchesSearch = !searchQuery || emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || emp.role.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = !selectedDepartment || emp.departmentId === selectedDepartment;
        return matchesSearch && matchesDept;
    };

    const employees = allEmployees.filter(emp => !emp.dismissed && filterFn(emp));
    const dismissedEmployees = allEmployees.filter(emp => emp.dismissed && filterFn(emp));

    return (
        <div className="space-y-8 ">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-gray-800">{t('employees.title')}</h1>

                <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl flex items-center shadow-sm border border-gray-100">
                         <div className="flex -space-x-3">
                            {employees.slice(0, 4).map((emp) => (
                                <div key={emp.id} className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
                                    <img
                                        src={emp.avatar}
                                        alt={emp.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                         </div>
                         <span className="ml-4 text-gray-500 font-medium pr-2">{employees.length}</span>
                    </div>
                    {isManager && (
                        <button
                            onClick={() => setShowAccountantModal(true)}
                            className="flex items-center gap-2 bg-white text-[#33cbcc] border border-[#33cbcc]/30 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#33cbcc]/5 transition-colors"
                        >
                            <Calculator size={16} />
                            {t('employees.addAccountant')}
                        </button>
                    )}
                    {isManager && (
                        <button
                            onClick={() => setShowManagerModal(true)}
                            className="flex items-center gap-2 bg-white text-[#33cbcc] border border-[#33cbcc]/30 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#33cbcc]/5 transition-colors"
                        >
                            <Shield size={16} />
                            {t('employees.addManager')}
                        </button>
                    )}
                    {role !== 'ACCOUNTANT' && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 bg-[#33cbcc] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#2bb5b6] transition-colors shadow-lg shadow-[#33cbcc]/20"
                        >
                            <UserPlus size={16} />
                            {t('employees.addEmployee')}
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                 <div className="flex-1 bg-white rounded-2xl p-2 flex items-center border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#33cbcc]/20 transition-shadow">
                    <Search className="text-gray-400 ml-3" size={20} />
                    <input
                        type="text"
                        placeholder={t('employees.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 px-3"
                    />
                 </div>

                 <div className="flex gap-4">
                     {/* View toggle */}
                     <div className="flex items-center bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
                         <button
                             onClick={() => setViewMode('grid')}
                             className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             <LayoutGrid size={16} />
                         </button>
                         <button
                             onClick={() => setViewMode('list')}
                             className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-[#33cbcc] text-white' : 'text-gray-400 hover:text-gray-600'}`}
                         >
                             <List size={16} />
                         </button>
                     </div>
                     <div className="relative">
                         <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                         <select
                             value={selectedDepartment}
                             onChange={e => setSelectedDepartment(e.target.value)}
                             className="bg-white rounded-2xl p-3 pl-10 pr-8 border border-gray-100 shadow-sm min-w-45 text-sm text-gray-600 appearance-none cursor-pointer hover:border-[#33cbcc]/30 focus:outline-none focus:ring-2 focus:ring-[#33cbcc]/20 transition-all"
                         >
                             <option value="">{t('employees.allDepartments')}</option>
                             {(apiDepartments || []).map(d => (
                                 <option key={d.id} value={d.id}>{d.name}</option>
                             ))}
                         </select>
                         <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                     </div>
                     {selectedDepartment && (
                         <button
                             onClick={() => setSelectedDepartment('')}
                             className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors"
                             title={t('employees.clearFilter')}
                         >
                             <X size={20} />
                         </button>
                     )}
                 </div>
            </div>

            {/* Top Employees Section */}
            {leaderboard && leaderboard.length > 0 && !searchQuery && !selectedDepartment && (
                <div className="bg-linear-to-r from-[#283852] to-[#1e2a3d] rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#33cbcc]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                        {/* Best Employee */}
                        <div className="flex-1 max-w-sm flex flex-col items-center justify-center text-center p-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                            
                            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#33cbcc] mb-3">{t('employees.bestEmployee', 'Employee of the Month')}</h2>
                            <div className="relative mb-4">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#33cbcc] shadow-lg shadow-[#33cbcc]/30">
                                    <img 
                                        src={leaderboard[0].avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(leaderboard[0].firstName + '+' + leaderboard[0].lastName)}&background=33cbcc&color=fff`} 
                                        alt={`${leaderboard[0].firstName} ${leaderboard[0].lastName}`} 
                                        className="w-full h-full object-cover" 
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 border-2 border-[#283852] font-bold shadow-sm">
                                    #1
                                </div>
                            </div>
                            <h3 className="text-xl font-bold">{leaderboard[0].firstName} {leaderboard[0].lastName}</h3>
                            <p className="text-white/60 text-sm mb-3">{leaderboard[0].positionTitle} • {leaderboard[0].department}</p>
                            <div className="px-4 py-1.5 bg-[#33cbcc]/20 text-[#33cbcc] font-bold rounded-full text-sm">
                                {leaderboard[0].points} pts
                            </div>
                        </div>

                        {/* Top 5 List */}
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Target size={20} className="text-[#33cbcc]" />
                                {t('employees.leaderboard', 'Top Employees')}
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {leaderboard.slice(1, 5).map((emp) => (
                                    <div key={emp.id} className="flex items-center gap-4 bg-white/5 rounded-xl p-3 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">
                                            #{emp.rank}
                                        </div>
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0">
                                            <img 
                                                src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + '+' + emp.lastName)}&background=33cbcc&color=fff`} 
                                                alt={`${emp.firstName} ${emp.lastName}`} 
                                                className="w-full h-full object-cover" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-sm truncate">{emp.firstName} {emp.lastName}</h4>
                                            <p className="text-[10px] text-white/50 truncate">{emp.positionTitle}</p>
                                        </div>
                                        <div className="text-[#33cbcc] font-bold text-sm shrink-0">
                                            {emp.points} pts
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Grid / List */}
            {isLoading && <EmployeesSkeleton />}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map((employee, index) => (
                        <motion.div
                            key={employee.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            onClick={() => navigate(`/employees/${employee.id}`)}
                            className="bg-white rounded-3xl p-8 transition-all duration-300 border border-gray-100 group relative overflow-hidden cursor-pointer hover:border-[#33cbcc]/30"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-100 mb-4">
                                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-800">{employee.name}</h3>
                                <p className="text-gray-400 text-sm mt-1">{employee.role}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {employees.map((employee, index) => (
                        <motion.div
                            key={employee.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04 }}
                            onClick={() => navigate(`/employees/${employee.id}`)}
                            className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 cursor-pointer transition-colors group"
                        >
                            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-100 shrink-0">
                                <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{employee.name}</p>
                                <p className="text-xs text-gray-400">{employee.role}</p>
                            </div>
                            {employee.departmentName && (
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
                                    {employee.departmentName}
                                </span>
                            )}
                            <ArrowUpRight size={16} className="text-gray-300 group-hover:text-[#33cbcc] transition-colors shrink-0" />
                        </motion.div>
                    ))}
                    {employees.length === 0 && !isLoading && (
                        <div className="py-12 text-center text-gray-400 text-sm">
                            <p>{t('employees.searchPlaceholder')}</p>
                            {role !== 'ACCOUNTANT' && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-4 px-4 py-2 bg-[#33cbcc] text-white text-sm font-semibold rounded-xl hover:bg-[#2bb5b6] transition-colors"
                                >
                                    {t('employees.addEmployee')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Dismissed Employees Section */}
            {dismissedEmployees.length > 0 && (
                <div>
                    <button
                        onClick={() => setShowDismissed(v => !v)}
                        className="flex items-center gap-3 w-full text-left mb-4 group"
                    >
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 rounded-xl text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors">
                            <UserPlus size={15} className="rotate-45" />
                            {t('employees.dismissed', 'Dismissed / Suspended')}
                            <span className="bg-red-100 text-red-500 px-2 py-0.5 rounded-full text-xs font-bold">
                                {dismissedEmployees.length}
                            </span>
                            <motion.span
                                animate={{ rotate: showDismissed ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-1"
                            >
                                ▾
                            </motion.span>
                        </div>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {dismissedEmployees.map((employee, index) => (
                                            <motion.div
                                                key={employee.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => navigate(`/employees/${employee.id}`)}
                                                className="bg-white rounded-3xl p-8 border border-red-100 group relative overflow-hidden cursor-pointer hover:border-red-200 transition-all opacity-70 grayscale-[40%]"
                                            >
                                                <div className="absolute top-3 right-3 px-2 py-1 bg-red-50 text-red-400 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                                                    {t('employees.dismissedBadge', 'Dismissed')}
                                                </div>
                                                <div className="flex flex-col items-center text-center">
                                                    <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-red-100 mb-4">
                                                        <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-500">{employee.name}</h3>
                                                    <p className="text-gray-400 text-sm mt-1">{employee.role}</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl border border-red-100 overflow-hidden divide-y divide-red-50">
                                        {dismissedEmployees.map((employee, index) => (
                                            <motion.div
                                                key={employee.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.04 }}
                                                onClick={() => navigate(`/employees/${employee.id}`)}
                                                className="flex items-center gap-4 px-6 py-4 hover:bg-red-50/40 cursor-pointer transition-colors group opacity-70"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-red-100 shrink-0 grayscale">
                                                    <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-gray-500">{employee.name}</p>
                                                    <p className="text-xs text-gray-400">{employee.role}</p>
                                                </div>
                                                {employee.departmentName && (
                                                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 shrink-0">
                                                        {employee.departmentName}
                                                    </span>
                                                )}
                                                <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-400 uppercase tracking-wide shrink-0">
                                                    {t('employees.dismissedBadge', 'Dismissed')}
                                                </span>
                                                <ArrowUpRight size={16} className="text-gray-300 group-hover:text-red-400 transition-colors shrink-0" />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateEmployeeModal onClose={() => setShowCreateModal(false)} hodDepartmentId={role === 'HEAD_OF_DEPARTMENT' ? (departmentId ?? undefined) : undefined} />
                )}
                {showManagerModal && (
                    <CreateEmployeeModal onClose={() => setShowManagerModal(false)} managerMode />
                )}
                {showAccountantModal && (
                    <CreateEmployeeModal onClose={() => setShowAccountantModal(false)} accountantMode />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Employees;
