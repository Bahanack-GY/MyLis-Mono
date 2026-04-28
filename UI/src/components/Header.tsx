import { Search01Icon, Notification01Icon, Mail01Icon, ArrowDown01Icon, Menu01Icon } from 'hugeicons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../api/notifications/hooks';
import { useChannels } from '../api/chat/hooks';
import logo from '../assets/Logo.png';

const Header = ({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) => {
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
        <div className="bg-white h-14 md:h-20 px-4 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 relative">
            {/* Mobile: hamburger on the left */}
            <button
                onClick={onMobileMenuOpen}
                aria-label="Open menu"
                className="md:hidden p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
                <Menu01Icon size={22} aria-hidden="true" />
            </button>

            {/* Mobile: logo centered absolutely */}
            <div className="md:hidden absolute left-1/2 -translate-x-1/2">
                <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
            </div>

            {/* Empty spacer on desktop left */}
            <div className="hidden md:flex items-center gap-2" />

            {/* Center: Search01Icon (desktop only) */}
            <div className="hidden md:block flex-1 max-w-xl mx-8">
                <div className="relative">
                    <Search01Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#b0bac9] pointer-events-none" />
                    <input
                        type="text"
                        placeholder={t('header.searchPlaceholder')}
                        aria-label={t('header.searchPlaceholder')}
                        className="w-full bg-[#f5f6fa] border border-[#e5e8ef] rounded-2xl py-3.5 pl-11 pr-4 text-sm text-[#1c2b3a] placeholder-[#b0bac9] focus:outline-none focus:border-[#33cbcc] transition-colors"
                    />
                </div>
            </div>

            {/* Right: Actions and Profile */}
            <div className="flex items-center gap-3 md:gap-6">
                {/* Language Toggle (desktop only) */}
                <button
                    onClick={toggleLanguage}
                    aria-label={t('header.switchLanguage', { lang: i18n.language === 'en' ? 'Français' : 'English' })}
                    className="hidden md:block text-sm font-semibold text-gray-600 hover:text-[#33cbcc] uppercase transition-colors"
                >
                    {i18n.language}
                </button>

                {/* Notification and Message icons */}
                <div className="flex items-center gap-1 md:gap-4 md:border-r md:border-gray-100 md:pr-6">
                    <button
                        onClick={() => navigate('/notifications')}
                        aria-label={unreadCount > 0
                            ? t('header.notificationsWithCount', { count: unreadCount, defaultValue: `Notifications (${unreadCount} unread)` })
                            : t('header.notifications', 'Notifications')}
                        className="relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
                    >
                        <Notification01Icon size={20} aria-hidden="true" />
                        {unreadCount > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => navigate('/messages')}
                        aria-label={unreadMessages > 0
                            ? t('header.messagesWithCount', { count: unreadMessages, defaultValue: `Messages (${unreadMessages} unread)` })
                            : t('header.messages', 'Messages')}
                        className="hidden md:flex relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
                    >
                        <Mail01Icon size={20} aria-hidden="true" />
                        {unreadMessages > 0 && (
                            <span
                                aria-hidden="true"
                                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#33cbcc] rounded-full leading-none"
                            >
                                {unreadMessages > 99 ? '99+' : unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                {/* Profile */}
                <button
                    onClick={() => navigate('/profile')}
                    aria-label={t('header.viewProfile', 'View profile')}
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
                    <ArrowDown01Icon size={16} className="hidden md:block text-gray-400" aria-hidden="true" />
                </button>
            </div>
        </div>
    );
};

export default Header;
