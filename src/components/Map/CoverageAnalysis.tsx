import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { Posto } from '../../lib/supabase';
import { computeCoverageStats } from '../../lib/geoUtils';
import { Layers, Target, Activity, Map } from 'lucide-react';

const RADIUS_OPTIONS = [
  { label: '5 km (Urbano)', value: 5, color: '#10b981' },
  { label: '10 km (Semi-urbano)', value: 10, color: '#3b82f6' },
  { label: '20 km (Rural)', value: 20, color: '#8b5cf6' },
];

interface CoverageAnalysisProps {
  postos: Posto[];
}

export default function CoverageAnalysis({ postos }: CoverageAnalysisProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedRadius, setSelectedRadius] = useState(10);
  const circleLayerRef = useRef<L.LayerGroup | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const stats = computeCoverageStats(postos);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [16.0, -24.0], zoom: 7, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    circleLayerRef.current?.remove();
    markerLayerRef.current?.remove();
    const radiusOpt = RADIUS_OPTIONS.find(r => r.value === selectedRadius)!;

    const circleLayer = L.layerGroup();
    const markerLayer = L.layerGroup();

    postos.forEach(posto => {
      const color = posto.estado === 'ativo' ? radiusOpt.color :
                    posto.estado === 'manutencao' ? '#f59e0b' : '#ef4444';
      if (posto.estado === 'ativo') {
        L.circle([posto.latitude, posto.longitude], {
          radius: selectedRadius * 1000,
          color, fillColor: color,
          fillOpacity: 0.08, weight: 1.5, opacity: 0.5,
        }).addTo(circleLayer);
      }

      const dotColor = posto.estado === 'ativo' ? '#10b981' : posto.estado === 'manutencao' ? '#f59e0b' : '#ef4444';
      L.circleMarker([posto.latitude, posto.longitude], {
        radius: 6, color: 'white', weight: 2, fillColor: dotColor, fillOpacity: 1,
      })
      .bindPopup(`<div style="font-family:Inter;font-size:13px;padding:6px"><b>${posto.nome}</b><br/><span style="color:#64748b">${posto.municipio}, ${posto.ilha}</span><br/><span style="color:${dotColor};font-weight:600">● ${posto.estado}</span> · ${posto.potencia_kw}kW</div>`)
      .addTo(markerLayer);
    });

    circleLayer.addTo(map);
    markerLayer.addTo(map);
    circleLayerRef.current = circleLayer;
    markerLayerRef.current = markerLayer;
  }, [postos, selectedRadius]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Layers size={15}/>Raio de Cobertura:</span>
        {RADIUS_OPTIONS.map(r => (
          <button key={r.value}
            onClick={() => setSelectedRadius(r.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${selectedRadius === r.value ? 'bg-cv-blue text-white border-cv-blue shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-cv-blue/40'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Cobertura Estimada', value: `${stats.coveragePct}%`, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Postos Ativos', value: stats.ativos, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Potência Total', value: `${stats.totalPotencia.toLocaleString()} kW`, icon: Map, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Conectores', value: stats.totalConnectores, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-card border border-slate-100">
            <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-2`}>
              <s.icon size={15} className={s.color} />
            </div>
            <div className="text-xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Map */}
      <div className="relative">
        <div ref={containerRef} className="w-full h-[500px] rounded-xl shadow-card border border-slate-200" />
        {/* Legend */}
        <div className="absolute bottom-4 right-4 bg-white rounded-xl shadow-elevated border border-slate-100 p-3 z-[1000] text-xs space-y-1.5">
          <div className="font-semibold text-slate-700 mb-2">Legenda</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />Ativo</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-sm" />Manutenção</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-400 border-2 border-white shadow-sm" />Offline</div>
          <div className="border-t border-slate-100 pt-1.5">
            <div className="flex items-center gap-2">
              <span className="w-4 h-2 rounded" style={{ background: RADIUS_OPTIONS.find(r=>r.value===selectedRadius)?.color, opacity: 0.5 }} />
              Raio {selectedRadius}km
            </div>
          </div>
        </div>
      </div>

      {/* Per island breakdown */}
      <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Cobertura por Ilha</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {Object.entries(stats.byIlha).sort((a,b) => b[1].total - a[1].total).map(([ilha, data]) => {
            const pct = data.total > 0 ? Math.round((data.ativos / data.total) * 100) : 0;
            return (
              <div key={ilha} className="px-5 py-3 flex items-center gap-4">
                <div className="w-28 text-sm font-medium text-slate-700">{ilha}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-cv-blue to-cv-teal transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-10 text-right">{pct}%</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 w-24 text-right">{data.ativos}/{data.total} ativos · {data.potencia}kW</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
