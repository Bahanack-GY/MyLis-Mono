import { Search, Bell, Mail, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../api/notifications/hooks';
import { useChannels } from '../api/chat/hooks';

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

    return (
        <div className="bg-white h-20 px-8 flex items-center justify-between shadow-sm sticky top-0 z-40">
            {/* Left: Title (Optional if Dashboard title is in page content, but requested design has it in header area or similar) 
                Wait, the uploaded image shows "Dashboard" on the left, but typically Dashboard title is part of page content.
                However, the "Dashboard" text in the image is next to the grid icon which usually implies it's the current page title.
                Since sidebar handles navigation, this might be a dynamic title. 
                For now, I'll assume the large "Dashboard" title in the page content is sufficient, 
                or I can put a breadcrumb or title here. 
                The user laid out the design request saying "Add a header to the dashboard".
                The image shows "Dashboard" on the far left.
                Let's put the Search bar in the center-ish.
            */}
            
            <div className="flex items-center gap-2">
                {/* Could be breadcrumbs or just current page name if we lift state */}
            </div>

            {/* Center: Search */}
            <div className="flex-1 max-w-xl mx-8">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder={t('header.searchPlaceholder')}
                        className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#33cbcc]/20 outline-none"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-6">
                
                {/* Language Toggle (Bonus) */}
                <button
                    onClick={toggleLanguage}
                    className="text-sm font-semibold text-gray-600 hover:text-[#33cbcc] uppercase"
                >
                    {i18n.language}
                </button>

                <div className="flex items-center gap-4 border-r border-gray-100 pr-6">
                    <button onClick={() => navigate('/notifications')} className="relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500">
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full leading-none">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <button onClick={() => navigate('/messages')} className="relative p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-500">
                        <Mail size={20} />
                        {unreadMessages > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-[#33cbcc] rounded-full leading-none">
                                {unreadMessages > 99 ? '99+' : unreadMessages}
                            </span>
                        )}
                    </button>
                </div>

                <div onClick={() => navigate('/profile')} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-xl transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center">
                        <span className="text-sm font-bold text-gray-500">
                            {(profile?.email?.split('@')[0] || '?').charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="hidden md:block text-left">
                        <p className="text-sm font-bold text-gray-800">{t('header.greeting', { name: profile?.email?.split('@')[0] || '' })}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[120px]">{profile?.email || ''}</p>
                    </div>
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
            </div>
        </div>
    );
};

export default Header;

