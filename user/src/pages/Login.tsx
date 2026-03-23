import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLogin } from '../api/auth/hooks';
import logo from '../assets/Logo.png';

import { Eye, EyeOff } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-[#283852] flex flex-col relative overflow-hidden">
            {/* Top Section with Logo */}
            <div className="h-[30vh] md:h-[35vh] w-full flex items-center justify-center relative">
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

                {/* Decorative Pattern overlay */}
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

                    <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); login.mutate({ email, password }); }}>
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
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
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
                            whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
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
    );
};

export default Login;
