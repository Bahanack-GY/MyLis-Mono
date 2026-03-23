import { Search, Bell, Mail, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../api/notifications/hooks';
import { useChannels } from '../api/chat/hooks';
import logo from '../assets/Logo.png';

const Header = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user: profile } = useAuth();
    const { data: notifications = [] } = useNotifications();
    const { data: channels = [] } = useChannels();

    const unreadCount = notifications.filter(n => !n.read).length;
    const unreadMessages = channels.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

    const toggleLanguage = () => {
        i18n.changeLanguage(i18n.language === 'en' ? 'fr' : 'en');
    };

    const displayName = profile?.firstName
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : profile?.email?.split('@')[0] || '';
    const initials = (profile?.firstName || profile?.email?.split('@')[0] || '?').charAt(0).toUpperCase();

    return (
        <div className="bg-white h-14 md:h-20 px-4 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40">
            {/* Left: Logo on mobile, empty on desktop (sidebar has logo) */}
            <div className="flex items-center gap-2 md:hidden">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
                <span className="font-bold text-base text-[#283852]">MyLIS</span>
            </div>

            {/* Empty spacer on desktop left */}
            <div className="hidden md:flex items-center gap-2" />

            {/* Center: Search (desktop only) */}
            <div className="hidden md:block flex-1 max-w-xl mx-8">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#33cbcc]/20 outline-none"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            {/* Right: Actions and Profile */}
            <div className="flex items-center gap-3 md:gap-6">
                {/* Language Toggle (desktop only) */}
                <button
                    onClick={toggleLanguage}
                    className="hidden md:block text-sm font-semibold text-gray-600 hover:text-[#33cbcc] uppercase transition-colors"
                >
                    {i18n.language}
                </button>

                {/* Notification and Message icons */}
                <div className="flex items-center gap-1 md:gap-4 md:border-r md:border-gray-100 md:pr-6">
                    <button
                        onClick={() => navigate('/notifications')}
                        className="relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/messages')}
                        className="hidden md:flex relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
                    >
                        <Mail size={20} />
                        {unreadMessages > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#33cbcc] rounded-full leading-none">
                                {unreadMessages > 99 ? '99+' : unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                {/* Profile */}
                <div
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-gray-50 p-1.5 md:p-2 rounded-xl transition-colors"
                >
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#283852] overflow-hidden flex items-center justify-center">
                        <span className="text-xs md:text-sm font-bold text-white">
                            {initials}
                        </span>
                    </div>
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-bold text-gray-800">
                            {t('header.greeting', { name: displayName })}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[120px]">
                            {profile?.email || ''}
                        </p>
                    </div>
                    <ChevronDown size={16} className="hidden md:block text-gray-400" />
                </div>
            </div>
        </div>
    );
};

export default Header;

