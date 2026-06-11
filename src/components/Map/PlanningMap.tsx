import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Posto } from '../../lib/supabase';
import { priorityZones } from '../../lib/geoUtils';
import { AlertTriangle, MapPin, TrendingUp, Info } from 'lucide-react';

const PRIORITY_COLORS = {
  alta: { fill: '#ef4444', ring: '#fecaca', label: 'Alta Prioridade' },
  media: { fill: '#f59e0b', ring: '#fde68a', label: 'Média Prioridade' },
  baixa: { fill: '#10b981', ring: '#a7f3d0', label: 'Baixa Prioridade' },
};

interface PlanningMapProps { postos: Posto[]; }

export default function PlanningMap({ postos }: PlanningMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zones] = useState(() => priorityZones(postos));
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [15.5, -23.8], zoom: 7 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Existing postos (grey markers)
    postos.forEach(p => {
      L.circleMarker([p.latitude, p.longitude], {
        radius: 5, color: 'white', weight: 1.5,
        fillColor: p.estado === 'ativo' ? '#10b981' : p.estado === 'manutencao' ? '#f59e0b' : '#ef4444',
        fillOpacity: 0.9,
      }).bindPopup(`<b style="font-family:Inter;font-size:12px">${p.nome}</b>`).addTo(map);
    });

    // Priority zones
    zones.forEach(z => {
      const cfg = PRIORITY_COLORS[z.prioridade as keyof typeof PRIORITY_COLORS];

      // Outer ring (urgency indicator)
      L.circle([z.lat, z.lng], {
        radius: 20000,
        color: cfg.fill, fillColor: cfg.ring,
        fillOpacity: 0.12, weight: 2, opacity: 0.6,
        dashArray: '6 4',
      }).addTo(map);

      // Center marker
      const icon = L.divIcon({
        html: `<div style="
          width:20px;height:20px;
          background:${cfg.fill};
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 0 0 3px ${cfg.fill}40,0 3px 8px rgba(0,0,0,.3);
          cursor:pointer;
        "></div>`,
        className: '', iconSize: [20, 20], iconAnchor: [10, 10],
      });

      L.marker([z.lat, z.lng], { icon })
       .bindPopup(`
         <div style="font-family:Inter;padding:10px;min-width:200px">
           <div style="font-weight:700;color:#1e293b;margin-bottom:4px">${z.nome}</div>
           <div style="font-size:11px;color:#64748b;margin-bottom:6px">${z.motivo}</div>
           <span style="font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${cfg.fill}20;color:${cfg.fill}">${cfg.label}</span>
           <div style="font-size:11px;color:#94a3b8;margin-top:6px">Postos ativos num raio 15km: ${z.postosProximos}</div>
         </div>`)
       .addTo(map);
    });
  }, [postos, zones]);

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-amber-800 text-sm">
          Mapa de priorização baseado em análise geoespacial: densidade populacional, distância a postos ativos, infraestruturas críticas e zonas sem cobertura.
        </p>
      </div>

      <div className="relative">
        <div ref={containerRef} className="w-full h-[480px] rounded-xl shadow-card border border-slate-200" />
        <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-elevated border border-slate-100 p-3 z-[1000] text-xs space-y-1.5">
          <div className="font-semibold text-slate-700 mb-2">Prioridade</div>
          {Object.entries(PRIORITY_COLORS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: cfg.fill }} />
              {cfg.label}
            </div>
          ))}
          <div className="border-t border-slate-100 pt-1.5 text-slate-400">● Postos existentes</div>
        </div>
      </div>

      {/* Priority zones list */}
      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <TrendingUp size={15} className="text-cv-blue" />
          <h3 className="font-semibold text-slate-800 text-sm">Zonas Prioritárias para Expansão</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {zones.map(z => {
            const cfg = PRIORITY_COLORS[z.prioridade as keyof typeof PRIORITY_COLORS];
            return (
              <div key={z.id}
                onClick={() => {
                  setSelected(z.id);
                  mapRef.current?.flyTo([z.lat, z.lng], 10, { duration: 1 });
                }}
                className={`px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-4 ${selected === z.id ? 'bg-blue-50' : ''}`}
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.fill + '20' }}>
                  <AlertTriangle size={14} style={{ color: cfg.fill }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 text-sm">{z.nome}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: cfg.fill + '15', color: cfg.fill }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{z.motivo}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin size={9}/>{z.postosProximos} postos ativos num raio de 15km · {z.lat.toFixed(3)}, {z.lng.toFixed(3)}
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
