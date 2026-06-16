import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { supabase, type Posto } from '../lib/supabase';
import { haversineDistance, findNearby } from '../lib/geoUtils';
import { ILHA_CENTERS } from '../lib/constants';
import { Navigation, MapPin, Zap, RotateCcw, ArrowRight, Clock, Route, AlertCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TILE_LIGHT = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

interface RouteInfo {
  distance: number;
  duration: number;
  coords: [number, number][];
}

async function fetchOSRMRoute(from: [number,number], to: [number,number]): Promise<RouteInfo | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes[0]) return null;
    const coords: [number,number][] = data.routes[0].geometry.coordinates.map(([lon,lat]: [number,number]) => [lat, lon]);
    return { coords, distance: data.routes[0].distance, duration: data.routes[0].duration };
  } catch { return null; }
}

const CAPE_VERDE_LOCATIONS = [
  { label: 'Praia (Santiago)', lat: 14.93, lng: -23.51 },
  { label: 'Assomada (Santiago)', lat: 15.09, lng: -23.69 },
  { label: 'Santa Cruz (Santiago)', lat: 15.08, lng: -23.54 },
  { label: 'Tarrafal (Santiago)', lat: 15.28, lng: -23.75 },
  { label: 'Mindelo (São Vicente)', lat: 16.89, lng: -24.99 },
  { label: 'Espargos (Sal)', lat: 16.77, lng: -22.95 },
  { label: 'Santa Maria (Sal)', lat: 16.60, lng: -22.90 },
  { label: 'Sal Rei (Boa Vista)', lat: 16.18, lng: -22.92 },
  { label: 'São Filipe (Fogo)', lat: 14.90, lng: -24.50 },
  { label: 'Ribeira Grande (Santo Antão)', lat: 17.19, lng: -25.06 },
  { label: 'Vila do Maio', lat: 15.14, lng: -23.22 },
];

export default function TripPlannerPage() {
  const { isDark } = useTheme();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  const [postos, setPostos] = useState<Posto[]>([]);
  const [fromIdx, setFromIdx] = useState(0);
  const [toIdx, setToIdx] = useState(4);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stationsAlongRoute, setStationsAlongRoute] = useState<(Posto & { distFromRoute: number })[]>([]);

  useEffect(() => {
    supabase.from('postos').select('*').eq('estado', 'ativo').then(({ data }) => setPostos(data || []));
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: [15.5, -23.8], zoom: 8 });
    const tile = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    tileRef.current = tile;
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    if (!tileRef.current) return;
    tileRef.current.setUrl(isDark ? TILE_DARK : TILE_LIGHT);
  }, [isDark]);

  async function planRoute() {
    if (fromIdx === toIdx) { setError('Selecione origem e destino diferentes.'); return; }
    setLoading(true); setError(''); setRoute(null); setStationsAlongRoute([]);
    const from = CAPE_VERDE_LOCATIONS[fromIdx];
    const to = CAPE_VERDE_LOCATIONS[toIdx];

    const result = await fetchOSRMRoute([from.lat, from.lng], [to.lat, to.lng]);
    const map = mapRef.current;

    if (map) {
      routeLayerRef.current?.remove();
      markerLayerRef.current?.remove();
      const ml = L.layerGroup().addTo(map);
      markerLayerRef.current = ml;

      if (result) {
        const rl = L.polyline(result.coords, { color: '#1d4ed8', weight: 5, opacity: 0.8, dashArray: undefined }).addTo(map);
        routeLayerRef.current = rl;

        // Find stations near the route
        const alongRoute = postos.filter(p => {
          return result.coords.some(([lat, lng]) => haversineDistance(lat, lng, p.latitude, p.longitude) < 5);
        }).map(p => {
          const minDist = Math.min(...result.coords.map(([lat, lng]) => haversineDistance(lat, lng, p.latitude, p.longitude)));
          return { ...p, distFromRoute: minDist };
        }).sort((a,b) => a.distFromRoute - b.distFromRoute);
        setStationsAlongRoute(alongRoute);

        // Draw station markers along route
        alongRoute.forEach(p => {
          L.circleMarker([p.latitude, p.longitude], { radius: 8, color: 'white', weight: 2, fillColor: '#10b981', fillOpacity: 1 })
            .bindPopup(`<b style="font-size:12px;font-family:Inter">${p.nome}</b><br><small>${p.potencia_kw}kW · ${p.municipio}</small>`)
            .addTo(ml);
        });

        // Origin + destination markers
        [{ loc: from, color: '#1d4ed8', label: 'Origem' }, { loc: to, color: '#ef4444', label: 'Destino' }].forEach(({ loc, color, label }) => {
          const icon = L.divIcon({
            html: `<div style="width:14px;height:14px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
            className: '', iconSize: [14,14], iconAnchor: [7,7],
          });
          L.marker([loc.lat, loc.lng], { icon }).bindPopup(`<b style="font-size:12px;font-family:Inter">${label}: ${loc.label}</b>`).addTo(ml);
        });

        map.fitBounds(rl.getBounds(), { padding: [40, 40] });
        setRoute(result);
      } else {
        setError('Não foi possível calcular a rota. As ilhas podem estar em locais diferentes — verifique se existe ligação por estrada.');
        // Draw straight line as fallback
        const fallbackLine = L.polyline([[from.lat, from.lng],[to.lat, to.lng]], { color: '#6366f1', weight: 3, dashArray: '8 6', opacity: 0.7 }).addTo(map);
        routeLayerRef.current = fallbackLine;
        map.fitBounds(fallbackLine.getBounds(), { padding: [40,40] });
        const directDist = haversineDistance(from.lat, from.lng, to.lat, to.lng);
        const fallbackRoute: RouteInfo = { distance: directDist * 1000, duration: (directDist / 30) * 3600, coords: [[from.lat, from.lng],[to.lat, to.lng]] };
        setRoute(fallbackRoute);
      }
    }
    setLoading(false);
  }

  function reset() {
    routeLayerRef.current?.remove();
    markerLayerRef.current?.remove();
    setRoute(null); setStationsAlongRoute([]); setError('');
    mapRef.current?.setView([15.5, -23.8], 8);
  }

  return (
    <div className="p-6 space-y-4">
      {/* Planner card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-5">
        <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
          <Route size={15} className="text-cv-blue" />
          Minha Rota Intelegente
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Origem</label>
            <select value={fromIdx} onChange={e => setFromIdx(Number(e.target.value))}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
              {CAPE_VERDE_LOCATIONS.map((loc, i) => <option key={i} value={i}>{loc.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Destino</label>
            <select value={toIdx} onChange={e => setToIdx(Number(e.target.value))}
              className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
              {CAPE_VERDE_LOCATIONS.map((loc, i) => <option key={i} value={i}>{loc.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs rounded-xl px-3 py-2.5">
            <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={planRoute} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-cv-blue hover:bg-blue-800 text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Navigation size={14}/>}
            {loading ? 'A calcular...' : 'Calcular Rota'}
          </button>
          {route && (
            <button onClick={reset} className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition-all">
              <RotateCcw size={14}/>
            </button>
          )}
        </div>

        {route && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Distância', val: route.distance < 1000 ? `${Math.round(route.distance)}m` : `${(route.distance/1000).toFixed(1)}km`, icon: Route },
              { label: 'Tempo est.', val: route.duration < 3600 ? `${Math.round(route.duration/60)}min` : `${Math.floor(route.duration/3600)}h${Math.round((route.duration%3600)/60)}min`, icon: Clock },
              { label: 'Postos na rota', val: stationsAlongRoute.length, icon: Zap },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center">
                <s.icon size={14} className="text-cv-blue mx-auto mb-1" />
                <div className="text-base font-bold text-slate-800 dark:text-white">{s.val}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map */}
      <div ref={containerRef} className="w-full h-[400px] rounded-2xl shadow-card border border-slate-200 dark:border-slate-700" />

      {/* Stations along route */}
      {stationsAlongRoute.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Zap size={14} className="text-cv-teal" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Postos de Carregamento na Rota</h3>
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{stationsAlongRoute.length}</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700">
            {stationsAlongRoute.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap size={13} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 dark:text-white text-sm truncate">{p.nome}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <MapPin size={9}/>{p.municipio} · {p.potencia_kw}kW · {p.tipo_conector}
                  </div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
                  {p.distFromRoute < 1 ? `${Math.round(p.distFromRoute*1000)}m` : `${p.distFromRoute.toFixed(1)}km`} da rota
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
