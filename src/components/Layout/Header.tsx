import { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Bell, Accessibility, Languages, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../hooks/useNotifications';
import { useAccessibility } from '../../contexts/AccessibilityContext';
import { useI18n, type Locale } from '../../contexts/I18nContext';
import NotificationCenter from '../Notifications/NotificationCenter';
import AccessibilityPanel from '../Accessibility/AccessibilityPanel';
import Sidebar from './Sidebar';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: 'pt', label: 'Português', flag: '🇨🇻' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
];

function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const current = LANGS.find(l => l.code === locale)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t('lang_title')}
        title={t('lang_title')}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Languages size={15} />
        <span className="text-xs font-semibold uppercase hidden sm:block">{locale}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-modal overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('lang_title')}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{t('lang_subtitle')}</p>
          </div>
          {LANGS.map(lang => (
            <button
              key={lang.code}
              onClick={() => { setLocale(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 ${locale === lang.code ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
            >
              <span className="text-base leading-none flex-shrink-0">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-semibold ${locale === lang.code ? 'text-cv-blue dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{lang.label}</div>
                <div className="text-[9px] text-slate-400">{t(`lang_${lang.code}_region` as Parameters<typeof t>[0])}</div>
              </div>
              {locale === lang.code && <Check size={13} className="text-cv-blue dark:text-blue-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);
  const { isDark, toggle } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead, timeAgo } = useNotifications();
  const { activeCount } = useAccessibility();
  const { t } = useI18n();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-5 gap-4 flex-shrink-0 transition-colors relative">
        <button title='Menu' onClick={() => setMobileOpen(true)} className="lg:hidden text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-800 dark:text-white leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1">
          {actions}

          {/* Language */}
          <LanguagePicker />

          {/* Accessibility */}
          <button
            onClick={() => { setA11yOpen(v => !v); setNotifOpen(false); }}
            aria-label={t('header_accessibility')}
            aria-expanded={a11yOpen}
            title={t('header_accessibility')}
            className={`relative p-2 rounded-lg transition-colors ${
              activeCount > 0
                ? 'bg-cv-blue text-white hover:bg-cv-blue/90'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Accessibility size={16} />
            {activeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-cv-teal text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>

          {/* Dark mode */}
          <button
            onClick={toggle}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={isDark ? t('header_light_mode') : t('header_dark_mode')}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => { setNotifOpen(!notifOpen); setA11yOpen(false); }}
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        </div>

        <AccessibilityPanel isOpen={a11yOpen} onClose={() => setA11yOpen(false)} />
      </header>

      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        timeAgo={timeAgo}
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
      />
    </>
  );
}

export function AppShell({ children, title, subtitle, actions }: HeaderProps & { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} actions={actions} />
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
}
