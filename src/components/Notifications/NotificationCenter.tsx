import { useRef } from 'react';
import { Bell, CheckCheck, X, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { Notification } from '../../hooks/useNotifications';

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
  aviso: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  sucesso: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800' },
  erro: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
};

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  timeAgo: (iso: string) => string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({
  notifications, unreadCount, onMarkRead, onMarkAllRead, timeAgo, isOpen, onClose,
}: NotificationCenterProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000]" onClick={onClose}>
      <div
        ref={ref}
        onClick={e => e.stopPropagation()}
        className="absolute top-16 right-4 w-96 max-h-[560px] bg-white dark:bg-slate-800 rounded-2xl shadow-modal border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden fade-in"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-cv-blue dark:text-blue-400" />
            <span className="font-bold text-sm text-slate-800 dark:text-white">Notificações</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs text-cv-blue dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <CheckCheck size={12} />Marcar todas lidas
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.tipo];
            const Ico = cfg.icon;
            return (
              <div
                key={n.id}
                onClick={() => onMarkRead(n.id)}
                className={`px-4 py-3.5 cursor-pointer transition-colors border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${!n.lida ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Ico size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className={`text-xs font-semibold ${!n.lida ? 'text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                        {n.titulo}
                      </span>
                      {!n.lida && <span className="w-2 h-2 rounded-full bg-cv-blue flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.mensagem}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {n.ilha && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{n.ilha}</span>}
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{timeAgo(n.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
