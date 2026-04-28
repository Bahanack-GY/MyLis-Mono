import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogin } from '../api/auth/hooks';
import logo from '../assets/Logo.png';
import bg1 from '../assets/images/bg1.png';
import bg2 from '../assets/images/bg2.png';
import { ViewIcon, ViewOffIcon, Loading02Icon } from 'hugeicons-react';

const BG_IMAGES = [bg1, bg2];

const Login = () => {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [bgIndex, setBgIndex] = useState(0);
    const [featureIndex, setFeatureIndex] = useState(0);
    const login = useLogin();

    useEffect(() => {
        const timer = setInterval(() => setBgIndex(i => (i + 1) % BG_IMAGES.length), 5000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setFeatureIndex(i => (i + 1) % 5), 2600);
        return () => clearInterval(timer);
    }, []);

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

    const features = i18n.language === 'fr'
        ? ['Gestion RH', 'CRM & Clients', 'Projets', 'Comptabilité', '12+ Modules']
        : ['HR Management', 'CRM & Clients', 'Projects', 'Accounting', '12+ Modules'];

    return (
        <>
            {/* ── MOBILE layout ─────────────────────────── */}
            <div className="md:hidden min-h-screen bg-[#283852] flex flex-col relative overflow-hidden">
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
                </div>

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
                                <label className="text-sm font-medium text-gray-600 block pl-1">{t('login.email')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={t('login.emailPlaceholder')}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-[#33cbcc]/20 focus:bg-white transition-all outline-none text-gray-700 placeholder-gray-400"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-600 block pl-1">{t('login.password')}</label>
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
                                        {showPassword ? <ViewOffIcon className="w-5 h-5" /> : <ViewIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                            {isAccessDenied && (
                                <p className="text-[#283852] text-sm text-center">{t('login.accessDenied')}</p>
                            )}
                            {login.isError && !isAccessDenied && (
                                <p className="text-[#283852] text-sm text-center">{t('login.error')}</p>
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

            {/* ── DESKTOP layout ─────────────────────────────────────── */}
            <div className="hidden md:flex min-h-screen bg-[#283852] overflow-hidden relative">

                {/* Full-screen crossfading background images */}
                <AnimatePresence initial={false}>
                    <motion.img
                        key={bgIndex}
                        src={BG_IMAGES[bgIndex]}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.35 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5 }}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                        aria-hidden
                    />
                </AnimatePresence>
                <div className="absolute inset-0 bg-[#283852]/20 pointer-events-none" />

                {/* ── LEFT branding area ── */}
                <div className="flex-1 flex flex-col justify-center relative px-14 py-10 overflow-hidden">

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3 relative z-10"
                    >
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md">
                            <img src={logo} alt="MyLiS" className="w-8 h-8 object-contain" />
                        </div>
                        <span className="text-white font-bold text-2xl tracking-tight">MyLiS</span>
                    </motion.div>

                    {/* Branding copy */}
                    <div className="flex flex-col mt-12 max-w-xl relative z-10">
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.65, delay: 0.25 }}
                        >
                            <h2 className="text-white text-5xl xl:text-6xl font-bold leading-[1.1] mb-6">
                                {i18n.language === 'fr' ? (
                                    <>Votre ERP &amp; CRM<br /><span className="text-[#33cbcc]">tout-en-un</span></>
                                ) : (
                                    <>Your all-in-one<br /><span className="text-[#33cbcc]">ERP &amp; CRM</span></>
                                )}
                            </h2>
                            <p className="text-white/50 text-xl leading-relaxed max-w-md">
                                {i18n.language === 'fr'
                                    ? 'Gérez vos équipes, clients et projets depuis une seule plateforme intelligente.'
                                    : 'Manage your teams, clients and projects from a single intelligent platform.'}
                            </p>
                        </motion.div>

                        {/* Animated cycling feature */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.5 }}
                            className="mt-12"
                        >
                            <p className="text-white/30 text-sm uppercase tracking-[0.18em] font-semibold mb-4">
                                {i18n.language === 'fr' ? 'Inclut' : 'Includes'}
                            </p>
                            <div className="relative h-20 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={`${featureIndex}-${i18n.language}`}
                                        initial={{ y: 64, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: -64, opacity: 0 }}
                                        transition={{ duration: 0.44, ease: [0.22, 1, 0.36, 1] }}
                                        className="absolute left-0 text-[#33cbcc] text-6xl xl:text-7xl font-bold whitespace-nowrap"
                                    >
                                        {features[featureIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ── RIGHT floating card ── */}
                <div className="flex items-center justify-center p-8 relative z-10">

                    {/* Language toggle */}
                    <div className="absolute top-8 right-8">
                        <button
                            onClick={toggleLanguage}
                            className="text-white/50 hover:text-white text-sm font-medium transition-colors"
                        >
                            {i18n.language === 'en' ? 'FR' : 'EN'}
                        </button>
                    </div>

                    <motion.div
                        initial={{ x: 60, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 180, damping: 28 }}
                        className="w-[500px] bg-white rounded-3xl shadow-2xl shadow-black/50 relative overflow-hidden"
                    >
                        <div className="px-12 pt-10 pb-8">
                            {/* Card logo */}
                            <div className="flex justify-center mb-6">
                                <img src={logo} alt="MyLiS" className="w-20 h-20 object-contain" />
                            </div>

                            {/* Title */}
                            <div className="mb-6">
                                <h1 className="text-[2.5rem] font-bold text-gray-800 leading-tight">
                                    {t('login.title')}
                                </h1>
                                <p className="text-gray-400 text-sm mt-2">
                                    {i18n.language === 'fr'
                                        ? 'Connectez-vous à votre espace de travail'
                                        : 'Sign in to your workspace'}
                                </p>
                            </div>

                            {/* Form */}
                            <form className="space-y-5" onSubmit={handleSubmit}>
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
                                            {showPassword ? <ViewOffIcon size={16} /> : <ViewIcon size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {isAccessDenied && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                                    >
                                        {t('login.accessDenied')}
                                    </motion.p>
                                )}
                                {login.isError && !isAccessDenied && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                                    >
                                        {t('login.error')}
                                    </motion.p>
                                )}

                                <motion.button
                                    type="submit"
                                    disabled={login.isPending}
                                    whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-white text-sm shadow-lg shadow-black/20 disabled:opacity-60 transition-all mt-2"
                                    style={{ backgroundColor: '#283852' }}
                                >
                                    {login.isPending ? (
                                        <><Loading02Icon size={16} className="animate-spin" /> {i18n.language === 'fr' ? 'Connexion...' : 'Signing in...'}</>
                                    ) : t('login.submit')}
                                </motion.button>

                            </form>
                        </div>
                    </motion.div>
                </div>
            </div>
        </>
    );
};

export default Login;
