import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import {
  Map, BarChart3, Zap, Bot, Code2, LogOut,
  Users, PlusCircle, Layers, AlertTriangle,
  ChevronRight, Star, Route, ChevronLeft, Home,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle, onClose }: SidebarProps) {
  const { perfil, user, signOut, isAdmin } = useAuth();
  const { t } = useI18n();
  const showApiExplorer = (import.meta as any).env?.VITE_SHOW_API_EXPLORER === 'true';
  const displayName = perfil?.nome || (user?.user_metadata?.nome as string | undefined) || user?.email?.split('@')[0] || '';
  const navigate = useNavigate();

  const USER_NAV = [
    { to: '/mapa', icon: Map, label: t('nav_map'), end: true },
    { to: '/mapa/postos', icon: Zap, label: t('nav_stations') },
    { to: '/mapa/trip-planner', icon: Route, label: t('nav_trip') },
    { to: '/mapa/favoritos', icon: Star, label: t('nav_favorites') },
    { to: '/ajuda', icon: HelpCircle, label: t('nav_help') },
  ];

  const ADMIN_NAV = [
    { to: '/admin', icon: Map, label: t('nav_admin_map'), end: true },
    { to: '/admin/dashboard', icon: BarChart3, label: t('nav_admin_dashboard') },
    { to: '/admin/postos', icon: Zap, label: t('nav_admin_stations') },
    { to: '/admin/cobertura', icon: Layers, label: t('nav_admin_coverage') },
    { to: '/admin/planeamento', icon: AlertTriangle, label: t('nav_admin_planning') },
    { to: '/admin/utilizadores', icon: Users, label: t('nav_admin_users') },
    { to: '/admin/api', icon: Code2, label: t('nav_admin_api') },
    { to: '/ajuda', icon: HelpCircle, label: t('nav_help') },
  ];

  const nav = isAdmin ? ADMIN_NAV.filter(item => showApiExplorer || item.to !== '/admin/api') : USER_NAV;

  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await signOut();
      navigate('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className={`flex flex-col h-full bg-gradient-to-b from-cv-blue to-blue-900 text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} flex-shrink-0`}>
      {/* Logo */}
      <div className={`flex items-center border-b border-white/10 flex-shrink-0 ${collapsed ? 'px-3 py-4 justify-center' : 'px-5 py-4 justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cv-teal rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">GeoMobilidade</div>
              <div className="text-blue-300 text-[10px] font-semibold uppercase tracking-widest">Cabo Verde</div>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-9 h-9 bg-cv-teal rounded-xl flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
        )}
        {onToggle && (
          <button onClick={onToggle} className={`text-white/60 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors ${collapsed ? 'mt-0' : ''}`}>
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? item.end : false}
            onClick={onClose}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer select-none ${isActive ? 'bg-white/20 text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
            }
          >
            <item.icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="flex-1">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className={`border-t border-white/10 py-3 ${collapsed ? 'px-2' : 'px-3'}`}>
        {isAdmin && !collapsed && (
          <NavLink to="/mapa" className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs text-blue-300 hover:bg-white/10 hover:text-white transition-all mb-1">
            <Home size={14} /><span>{t('nav_user_view')}</span>
          </NavLink>
        )}
        {!collapsed && (
          <div className="flex items-center gap-3 px-4 py-2.5 mb-1">
            <div className="w-8 h-8 bg-white/15 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {(displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName || user?.email || ''}</div>
              <div className="text-blue-300 text-[10px] truncate">{perfil?.organizacao || ''}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? t('nav_logout') : undefined}
          disabled={loggingOut}
          aria-busy={loggingOut}
          className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'} py-2.5 rounded-lg text-sm font-medium text-blue-200 ${loggingOut ? 'opacity-60 cursor-wait' : 'hover:bg-red-500/20 hover:text-red-300'} transition-all w-full`}
        >
          {loggingOut ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {!collapsed && <span>A sair...</span>}
            </>
          ) : (
            <>
              <LogOut size={15} className="flex-shrink-0" />
              {!collapsed && <span>{t('nav_logout')}</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
