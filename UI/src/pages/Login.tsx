import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLogin } from '../api/auth/hooks';
import logo from '../assets/Logo.png';
import loginIllustration from '../assets/login-illustration.png';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const Login = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const login = useLogin();

    const isAccessDenied = login.error?.message === 'ACCESS_DENIED' ||
        (location.state as { accessDenied?: boolean })?.accessDenied;

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        login.mutate({ email, password });
    };

    const inputCls = 'w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-[#33cbcc] focus:ring-2 focus:ring-[#33cbcc]/20 focus:bg-white transition-all outline-none text-gray-700 placeholder-gray-400 text-sm';

    return (
        <>
            {/* ── MOBILE layout (unchanged) ─────────────────────────── */}
            <div className="md:hidden min-h-screen bg-[#283852] flex flex-col relative overflow-hidden">
                {/* Top Section with Logo */}
                <div className="h-[30vh] w-full flex items-center justify-center relative">
                    <div className="absolute top-4 right-4 z-10">
                        <button
                            onClick={toggleLanguage}
                            className="text-white text-sm opacity-80 hover:opacity-100 transition-opacity"
                        >
                            {i18n.language === 'en' ? 'FR' : 'EN'}
                        </button>
                    </div>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="p-4 bg-white rounded-2xl shadow-lg"
                    >
                        <img src={logo} alt="Logo" className="w-12 h-12 object-contain" />
                    </motion.div>

                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
                </div>

                {/* Bottom Section with Form */}
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="flex-1 bg-white rounded-tl-[80px] flex flex-col px-8 pt-16 pb-8"
                >
                    <div className="max-w-md mx-auto w-full">
                        <h1 className="text-3xl font-bold text-center text-gray-800 mb-12">
                            {t('login.title')}
                        </h1>

                        <form className="space-y-8" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block pl-1">
                                    {t('login.email')}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('login.emailPlaceholder')}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:bg-white transition-all outline-none text-gray-700 placeholder-gray-400"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block pl-1">
                                    {t('login.password')}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={t('login.passwordPlaceholder')}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:bg-white transition-all outline-none text-gray-700 placeholder-gray-400 pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {isAccessDenied && (
                                <p className="text-red-500 text-sm text-center">{t('login.accessDenied')}</p>
                            )}
                            {login.isError && !isAccessDenied && (
                                <p className="text-red-500 text-sm text-center">{t('login.error')}</p>
                            )}

                            <motion.button
                                type="submit"
                                disabled={login.isPending}
                                whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full text-white py-4 rounded-xl font-semibold mt-8 shadow-lg shadow-black/20 disabled:opacity-60"
                                style={{ backgroundColor: '#283852' }}
                            >
                                {login.isPending ? '...' : t('login.submit')}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>
            </div>

            {/* ── DESKTOP layout (new split layout) ─────────────────── */}
            <div className="hidden md:flex min-h-screen bg-[#283852] overflow-hidden">

                {/* Left panel — illustration */}
                <div className="relative flex-1 flex flex-col items-center justify-center p-12 overflow-hidden">
                    {/* Background decorations */}
                    <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-[-10%] left-[-10%] w-80 h-80 bg-[#33cbcc]/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-[-10%] right-[-5%] w-64 h-64 bg-[#33cbcc]/15 rounded-full blur-2xl" />
                        <div className="absolute top-1/3 right-0 w-1 h-48 bg-white/5" />
                    </div>

                    {/* Logo + App Name */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="absolute top-8 left-8 flex items-center gap-3"
                    >
                        <img src={logo} alt="MyLiS Logo" className="w-8 h-8 object-contain" />
                        <span className="text-white font-bold text-xl tracking-tight">MyLiS</span>
                    </motion.div>

                    {/* Language toggle */}
                    <div className="absolute top-8 right-8">
                        <button
                            onClick={toggleLanguage}
                            className="text-white/60 hover:text-white text-sm font-medium transition-colors"
                        >
                            {i18n.language === 'en' ? 'FR' : 'EN'}
                        </button>
                    </div>

                    {/* Illustration */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="relative z-10 w-full max-w-lg"
                    >
                        <img
                            src={loginIllustration}
                            alt="ERP Dashboard Illustration"
                            className="w-full h-auto drop-shadow-2xl"
                        />
                    </motion.div>

                    {/* Tagline */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="relative z-10 text-center mt-2"
                    >
                        <h2 className="text-white text-2xl font-bold mb-2">
                            {i18n.language === 'fr' ? 'Votre ERP & CRM tout-en-un' : 'Your all-in-one ERP & CRM'}
                        </h2>
                        <p className="text-white/50 text-sm max-w-xs mx-auto">
                            {i18n.language === 'fr'
                                ? 'Gérez vos équipes, clients et projets depuis une seule plateforme.'
                                : 'Manage your teams, clients and projects from a single platform.'}
                        </p>
                    </motion.div>

                    {/* Bottom stats pills */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.7 }}
                        className="relative z-10 flex gap-4 mt-8"
                    >
                        {[
                            { label: i18n.language === 'fr' ? 'Employés' : 'Employees', value: '∞' },
                            { label: 'Modules', value: '12+' },
                            { label: i18n.language === 'fr' ? 'Sécurisé' : 'Secure', value: '✓' },
                        ].map((stat) => (
                            <div key={stat.label} className="flex items-center gap-2 px-4 py-2">
                                <span className="text-[#33cbcc] font-bold text-sm">{stat.value}</span>
                                <span className="text-white/50 text-xs">{stat.label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Right panel — form */}
                <motion.div
                    initial={{ x: 60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200, damping: 30 }}
                    className="w-full max-w-[480px] bg-white flex flex-col justify-center px-12 py-16 relative"
                    style={{ borderRadius: '40px 0 0 40px' }}
                >
                    {/* Form header */}
                    <div className="mb-10">
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-1.5 h-6 rounded-full bg-[#33cbcc]" />
                            <span className="text-[#33cbcc] text-sm font-semibold uppercase tracking-widest">MyLiS</span>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-800 leading-tight">
                            {t('login.title')}
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm">
                            {i18n.language === 'fr'
                                ? 'Connectez-vous à votre espace de travail'
                                : 'Sign in to your workspace'}
                        </p>
                    </div>

                    {/* Form */}
                    <form className="space-y-5" onSubmit={handleSubmit}>
                        {/* Email */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                {t('login.email')}
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={t('login.emailPlaceholder')}
                                className={inputCls}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                                {t('login.password')}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t('login.passwordPlaceholder')}
                                    className={`${inputCls} pr-12`}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Errors */}
                        {isAccessDenied && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                            >
                                {t('login.accessDenied')}
                            </motion.p>
                        )}
                        {login.isError && !isAccessDenied && (
                            <motion.p
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                            >
                                {t('login.error')}
                            </motion.p>
                        )}

                        {/* Submit */}
                        <motion.button
                            type="submit"
                            disabled={login.isPending}
                            whileHover={{ scale: 1.02, filter: 'brightness(1.08)' }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white text-sm shadow-lg shadow-[#283852]/30 disabled:opacity-60 transition-all mt-2"
                            style={{ backgroundColor: '#283852' }}
                        >
                            {login.isPending ? (
                                <><Loader2 size={16} className="animate-spin" /> {i18n.language === 'fr' ? 'Connexion...' : 'Signing in...'}</>
                            ) : t('login.submit')}
                        </motion.button>
                    </form>

                    {/* Decorative teal accent line at bottom */}
                    <div className="absolute bottom-0 left-12 right-12 h-1 rounded-t-full bg-linear-to-r from-[#33cbcc]/0 via-[#33cbcc] to-[#33cbcc]/0" />
                </motion.div>
            </div>
        </>
    );
};

export default Login;
