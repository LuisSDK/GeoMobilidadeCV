import { useMemo } from 'react';
import type { Posto } from '../../lib/supabase';
import type { AvailabilityMap, PostoAvailability } from '../../hooks/useAvailability';
import { Zap, CheckCircle, Users, Clock, Activity, MapPin } from 'lucide-react';
import { haversineDistance } from '../../lib/geoUtils';

interface UserStatsProps {
  postos: Posto[];
  availabilityMap: Record<string, PostoAvailability>;
  selectedIlha?: string;
  userLocation?: { lat: number; lng: number } | null;
}

export default function UserStats({ postos, availabilityMap, selectedIlha, userLocation }: UserStatsProps) {
  const stats = useMemo(() => {
    const filtered = selectedIlha ? postos.filter(p => p.ilha === selectedIlha) : postos;
    const disponiveis = filtered.filter(p => availabilityMap[p.id]?.status === 'disponivel');
    const ocupados = filtered.filter(p => availabilityMap[p.id]?.status === 'ocupado');
    const totalPotencia = disponiveis.reduce((s, p) => s + p.potencia_kw, 0);
    const avgEspera = ocupados.length > 0
      ? Math.round(ocupados.reduce((s, p) => s + (availabilityMap[p.id]?.espera_min || 0), 0) / ocupados.length)
      : 0;

    let nearestDist: number | null = null;
    if (userLocation) {
      const nearest = disponiveis.reduce((best, p) => {
        const d = haversineDistance(userLocation.lat, userLocation.lng, p.latitude, p.longitude);
        return d < best ? d : best;
      }, Infinity);
      nearestDist = nearest === Infinity ? null : nearest;
    }

    return {
      total: filtered.length,
      disponiveis: disponiveis.length,
      ocupados: ocupados.length,
      pctDisp: filtered.length > 0 ? Math.round((disponiveis.length / filtered.length) * 100) : 0,
      totalPotencia,
      avgEspera,
      nearestDist,
    };
  }, [postos, availabilityMap, selectedIlha, userLocation]);

  const items = [
    {
      label: selectedIlha ? `Postos em ${selectedIlha}` : 'Total Postos',
      value: stats.total,
      icon: MapPin, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30',
    },
    {
      label: 'Disponíveis agora',
      value: `${stats.disponiveis} (${stats.pctDisp}%)`,
      icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30',
    },
    {
      label: 'Ocupados',
      value: stats.ocupados,
      icon: Users, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30',
    },
    {
      label: 'Potência disponível',
      value: `${stats.totalPotencia}kW`,
      icon: Zap, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/30',
    },
    {
      label: 'Espera média',
      value: stats.avgEspera > 0 ? `${stats.avgEspera} min` : '0 min',
      icon: Clock, color: 'text-cv-teal dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-900/30',
    },
    {
      label: stats.nearestDist !== null ? 'Mais próximo de si' : 'Ative localização',
      value: stats.nearestDist !== null ? (stats.nearestDist < 1 ? `${Math.round(stats.nearestDist*1000)}m` : `${stats.nearestDist.toFixed(1)}km`) : '—',
      icon: Activity, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 p-3">
      {items.map(item => (
        <div key={item.label} className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-600">
          <div className={`w-7 h-7 ${item.bg} rounded-lg flex items-center justify-center mb-2`}>
            <item.icon size={13} className={item.color} />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-white">{item.value}</div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
