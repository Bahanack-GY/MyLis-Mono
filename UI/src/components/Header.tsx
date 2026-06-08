import { Notification01Icon, Mail01Icon, ArrowDown01Icon, Menu01Icon } from 'hugeicons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../api/notifications/hooks';
import { useChannels } from '../api/chat/hooks';
import { useMonthlyStats, useAllDepartmentsMonthlyStats } from '../api/departments/hooks';
import logo from '../assets/Logo.png';

const Header = ({ onMobileMenuOpen }: { onMobileMenuOpen?: () => void }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user: profile, departmentId, role } = useAuth();
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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const isGlobalRole = role === 'MANAGER' || role === 'CEO';

  const { data: deptStats } = useMonthlyStats(
    !isGlobalRole && departmentId ? departmentId : '',
    currentYear,
  );
  const { data: allStats } = useAllDepartmentsMonthlyStats(currentYear);

  const statRow = isGlobalRole
    ? allStats?.find(s => s.month === currentMonth)
    : deptStats?.find(s => s.month === currentMonth);

  const showWidget = isGlobalRole || !!departmentId;

  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-GB';
  const monthName = now.toLocaleDateString(locale, { month: 'long' });

  const fmtCA = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
  };

  const pct = statRow && statRow.targetRevenue > 0
  ? Math.round((statRow.actualRevenue / statRow.targetRevenue) * 100)
  : 0;
  const barColor = pct >= 100 ? '#22c55e' : pct >= 60 ? '#33cbcc' : '#f59e0b';

  return (
  <div className="bg-white h-14 md:h-20 px-4 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-40 relative">
  {/* Mobile: hamburger on the left */}
  <button
  onClick={onMobileMenuOpen}
  aria-label="Open menu"
  className="md:hidden p-2.5 text-gray-500 hover:bg-gray-100 transition-colors"
  >
  <Menu01Icon size={22} aria-hidden="true" />
  </button>

  {/* Mobile: logo centered absolutely */}
  <div className="md:hidden absolute left-1/2 -translate-x-1/2">
  <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
  </div>

  {/* Left: Monthly CA objective (desktop only) */}
  {showWidget && statRow ? (
  <div className="hidden md:flex flex-col justify-center select-none w-56">
    <div className="flex items-center justify-between mb-1.5">
    <p className="text-[10px] font-bold text-[#8892a4] uppercase tracking-wider capitalize">
      CA {monthName}{isGlobalRole ? ' · Global' : ''}
    </p>
    <p className="text-[10px] font-semibold text-[#283852] tabular-nums">
      {fmtCA(statRow.actualRevenue)} / {fmtCA(statRow.targetRevenue)}
    </p>
    </div>
    <div className="h-1.5 bg-[#e5e8ef] w-full overflow-hidden">
    <div
      className="h-full transition-all duration-500"
      style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
    />
    </div>
    <p className="text-[10px] text-[#8892a4] mt-1">
    <span className="font-semibold tabular-nums" style={{ color: barColor }}>{pct}%</span>
    {' '}{i18n.language === 'fr' ? 'de l\'objectif' : 'of target'}
    </p>
  </div>
  ) : (
  <div className="hidden md:block" />
  )}

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
  className="relative p-2.5 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
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
  className="hidden md:flex relative p-2.5 hover:bg-gray-50 rounded-full transition-colors text-gray-500"
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
  className="flex items-center gap-2 md:gap-3 cursor-pointer hover:bg-gray-50 p-2 md:p-2 transition-colors"
  >
  <div className="w-8 h-8 md:w-10 md:h-10  bg-[#283852] overflow-hidden flex items-center justify-center">
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
