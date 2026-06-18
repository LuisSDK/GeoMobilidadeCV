import { useState } from 'react';
import type { Posto } from '../../lib/supabase';
import type { PostoAvailability } from '../../hooks/useAvailability';
import { haversineDistance, findNearby } from '../../lib/geoUtils';
import {
  X, Star, Navigation, Zap, MapPin, Clock, Activity, Users,
  TrendingUp, ChevronRight, ExternalLink, Share2, Phone, AlertTriangle,
  CheckCircle, WifiOff, Battery,
} from 'lucide-react';

interface GeoPos { lat: number; lng: number; }

interface StationDetailPanelProps {
  posto: Posto;
  availability?: PostoAvailability;
  userLocation?: GeoPos | null;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onRoute: (posto: Posto) => void;
  onClose: () => void;
  postos: Posto[];
  onSelectStation: (posto: Posto) => void;
  availability_map: Record<string, PostoAvailability>;
}

const STATUS_CONFIG = {
  disponivel: { label: 'Disponível', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', dot: 'bg-emerald-400', icon: CheckCircle },
  ocupado: { label: 'Ocupado', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30', dot: 'bg-amber-400', icon: Users },
  manutencao: { label: 'Indisponível', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30', dot: 'bg-red-400', icon: WifiOff },
};

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

function estimateTime(km: number, speed = 30) {
  const mins = Math.round((km / speed) * 60);
  if (mins < 60) return `~${mins} min`;
  return `~${Math.floor(mins/60)}h ${mins%60}min`;
}

function estimateChargeTime(kw: number, batteryKwh = 40, currentPct = 20) {
  const needed = batteryKwh * (1 - currentPct/100);
  const hours = needed / kw;
  const mins = Math.round(hours * 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins/60)}h ${mins%60}min`;
}

function MiniBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-1">
      <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function StationDetailPanel({
  posto, availability, userLocation, isFavorite, onToggleFavorite,
  onRoute, onClose, postos, onSelectStation, availability_map,
}: StationDetailPanelProps) {
  const [tab, setTab] = useState<'info' | 'stats' | 'nearby'>('info');

  const statusCfg = STATUS_CONFIG[availability?.status || 'disponivel'];
  const StatusIcon = statusCfg.icon;

  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, posto.latitude, posto.longitude)
    : null;

  const chargeTime = estimateChargeTime(posto.potencia_kw);

  const nearby = findNearby(
    postos.filter(p => p.id !== posto.id && (availability_map[p.id]?.status === 'disponivel')),
    posto.latitude, posto.longitude, 20
  ).slice(0, 3);

  const isHighPower = posto.potencia_kw >= 50;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 w-60 shadow-modal border-l border-slate-200 dark:border-slate-700 fade-in overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-cv-blue to-blue-700 p-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-blue-200 text-[10px] font-semibold uppercase tracking-widest mb-1">
              {posto.ilha} · {posto.municipio}
            </div>
            <h2 className="text-white font-bold text-sm leading-tight">{posto.nome}</h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => onToggleFavorite(posto.id)}
              className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-cv-gold bg-white/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
            >
              <Star size={15} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
            <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} animate-pulse`} />
            {statusCfg.label}
            {availability?.espera_min ? ` · ~${availability.espera_min}min` : ''}
          </div>
          {isHighPower && (
            <span className="text-[10px] font-bold px-2 py-1 bg-cv-gold/20 text-cv-gold rounded-full">
              ⚡ Carregamento Rápido
            </span>
          )}
        </div>

        {/* Quick metrics row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { icon: Zap, label: 'Potência', val: `${posto.potencia_kw}kW` },
            { icon: Battery, label: 'Conectores', val: posto.num_conectores },
            { icon: Clock, label: 'Carga est.', val: chargeTime },
          ].map(m => (
            <div key={m.label} className="bg-white/10 rounded-lg px-2 py-2 text-center">
              <m.icon size={12} className="text-blue-200 mx-auto mb-0.5" />
              <div className="text-white font-bold text-xs">{m.val}</div>
              <div className="text-blue-300 text-[9px]">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Distance (if geolocation available) */}
        {distance !== null && (
          <div className="mt-2 flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <Navigation size={12} className="text-cv-gold" />
            <span className="text-white text-xs">
              <strong>{formatDistance(distance)}</strong> · {estimateTime(distance)} de carro
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
        {([['info','Detalhes'],['stats','Utilização'],['nearby','Alternativos']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${tab === key ? 'text-cv-blue border-b-2 border-cv-blue dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'info' && (
          <div className="space-y-3 fade-in">
            {[
              { label: 'Operador', val: posto.operador || 'N/D' },
              { label: 'Tipo', val: posto.tipo === 'publico' ? 'Público' : 'Privado' },
              { label: 'Conector', val: posto.tipo_conector || 'Type 2' },
              { label: 'Horário', val: posto.horario || '24h' },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400">{r.label}</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{r.val}</span>
              </div>
            ))}
            {posto.endereco && (
              <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <MapPin size={12} className="text-slate-400 mt-0.5 flex-shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-300">{posto.endereco}</span>
              </div>
            )}
            {availability && (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Taxa de Utilização</span>
                  <span className="text-xs font-bold text-cv-blue">{availability.ocupacao}%</span>
                </div>
                <MiniBar value={availability.ocupacao} color={availability.ocupacao > 70 ? 'bg-amber-400' : 'bg-emerald-400'} />
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-3 fade-in">
            {availability ? (
              <>
                {[
                  { label: 'Carregamentos hoje', val: availability.carregamentos_hoje, icon: TrendingUp, color: 'text-cv-blue' },
                  { label: 'Carregamentos semana', val: availability.carregamentos_semana, icon: Activity, color: 'text-cv-teal' },
                  { label: 'Tempo médio espera', val: availability.status === 'ocupado' ? `${availability.espera_min} min` : '0 min', icon: Clock, color: 'text-amber-500' },
                  { label: 'Taxa utilização', val: `${availability.ocupacao}%`, icon: Users, color: 'text-purple-500' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                    <div className={`w-8 h-8 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center flex-shrink-0`}>
                      <s.icon size={14} className={s.color} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-800 dark:text-white">{s.val}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</div>
                    </div>
                  </div>
                ))}
                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center pt-1">
                  Atualizado: {availability.ultima_atualizacao.toLocaleTimeString('pt-CV')}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">Dados não disponíveis</p>
            )}
          </div>
        )}

        {tab === 'nearby' && (
          <div className="space-y-2 fade-in">
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Postos disponíveis num raio de 20km</p>
            {nearby.length > 0 ? nearby.map(p => {
              const dist = haversineDistance(posto.latitude, posto.longitude, p.latitude, p.longitude);
              const avail = availability_map[p.id];
              return (
                <button key={p.id} onClick={() => onSelectStation(p)}
                  className="w-full text-left p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${avail?.status === 'disponivel' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.nome}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{p.municipio} · {p.potencia_kw}kW</div>
                  </div>
                  <div className="text-[10px] text-slate-400 flex-shrink-0">{formatDistance(dist)}</div>
                  <ChevronRight size={11} className="text-slate-400 flex-shrink-0" />
                </button>
              );
            }) : (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum posto disponível próximo</p>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2 flex-shrink-0">
        <button
          onClick={() => onRoute(posto)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-cv-blue hover:bg-blue-800 text-white py-2.5 rounded-xl text-xs font-semibold transition-all"
        >
          <Navigation size={13} />
          Como Chegar
        </button>
        <button
          onClick={() => {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${posto.latitude},${posto.longitude}`;
            window.open(url, '_blank');
          }}
          className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all"
          title="Abrir no Google Maps"
        >
          <ExternalLink size={13} />
        </button>
        <button
          onClick={() => navigator.share?.({ title: posto.nome, text: `${posto.nome} — ${posto.municipio}, ${posto.ilha}` }).catch(()=>{})}
          className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all"
          title="Partilhar"
        >
          <Share2 size={13} />
        </button>
      </div>
    </div>
  );
}
