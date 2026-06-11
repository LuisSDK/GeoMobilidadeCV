import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'aviso' | 'sucesso' | 'erro';
  ilha: string | null;
  created_at: string;
  lida: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', titulo: 'Novo posto inaugurado em Mindelo', mensagem: 'O Porto Grande recebeu 2 novos postos de 50kW. Capacidade total: 100kW.', tipo: 'sucesso', ilha: 'São Vicente', created_at: new Date(Date.now() - 2*3600000).toISOString(), lida: false },
  { id: '2', titulo: 'Manutenção Tarrafal', mensagem: 'O posto de Tarrafal encontra-se offline para manutenção preventiva. Previsão: 48h.', tipo: 'aviso', ilha: 'Santiago', created_at: new Date(Date.now() - 5*3600000).toISOString(), lida: false },
  { id: '3', titulo: 'Expansão rede Sal', mensagem: 'Aprovada instalação de 3 novos postos na ilha do Sal até Q4 2024.', tipo: 'info', ilha: 'Sal', created_at: new Date(Date.now() - 24*3600000).toISOString(), lida: false },
  { id: '4', titulo: 'Posto São Filipe reativado', mensagem: 'Após manutenção, o posto de São Filipe voltou à operação normal.', tipo: 'sucesso', ilha: 'Fogo', created_at: new Date(Date.now() - 48*3600000).toISOString(), lida: true },
  { id: '5', titulo: 'Nova versão GeoMobilidade CV 2.0', mensagem: 'Portal atualizado com geolocalização, rotas inteligentes e modo escuro.', tipo: 'info', ilha: null, created_at: new Date(Date.now() - 72*3600000).toISOString(), lida: true },
  { id: '6', titulo: 'Alerta: Posto Brava offline', mensagem: 'O posto de Nova Sintra encontra-se offline. Contactar TECV: +238 260 0000.', tipo: 'erro', ilha: 'Brava', created_at: new Date(Date.now() - 96*3600000).toISOString(), lida: true },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
  }, []);

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'há poucos minutos';
    if (h < 24) return `há ${h}h`;
    return `há ${Math.floor(h/24)}d`;
  }

  return { notifications, unreadCount, markRead, markAllRead, timeAgo };
}
