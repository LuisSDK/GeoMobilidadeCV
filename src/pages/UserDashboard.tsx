import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { supabase, type Posto } from '../lib/supabase';
import { AppShell } from '../components/Layout/Header';
import InteractiveMap from '../components/Map/InteractiveMap';
import StationDetailPanel from '../components/Map/StationDetailPanel';
import UserStats from '../components/Dashboard/UserStats';
import FavoritesPage from './FavoritesPage';
import TripPlannerPage from './TripPlannerPage';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAvailability } from '../hooks/useAvailability';
import { useFavorites } from '../hooks/useFavorites';
import { useTheme } from '../contexts/ThemeContext';
import { findNearby, haversineDistance } from '../lib/geoUtils';
import { ILHA_CENTERS } from '../lib/constants';
import {
  Search, MapPin, Zap, X, CheckCircle,
  AlertTriangle, WifiOff, LocateFixed,
  Star, ChevronRight, Clock, Bot,
} from 'lucide-react';

type SideTab = 'list' | 'filters' | 'stats';

const ESTADO_CONFIG = {
  ativo: { label: 'Ativo', dot: 'bg-emerald-400', icon: CheckCircle },
  manutencao: { label: 'Manutenção', dot: 'bg-amber-400', icon: AlertTriangle },
  offline: { label: 'Offline', dot: 'bg-red-400', icon: WifiOff },
};

const AVAIL_CONFIG = {
  disponivel: { label: 'Disponível', dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
  ocupado: { label: 'Ocupado', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
  manutencao: { label: 'Indisponível', dot: 'bg-red-400', text: 'text-red-600 dark:text-red-400' },
};

async function fetchRoute(from: [number,number], to: [number,number]): Promise<[number,number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await res.json();
    if (data.code !== 'Ok') return null;
    return data.routes[0].geometry.coordinates.map(([lon,lat]: [number,number]) => [lat,lon] as [number,number]);
  } catch { return null; }
}

function usePostos() {
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('postos').select('*').order('nome').then(({ data }) => {
      setPostos(data || []);
      setLoading(false);
    });
  }, []);
  return { postos, loading };
}

// ── MapView ──────────────────────────────────────────────────────────────────
function MapView() {
  const { postos, loading } = usePostos();
  const availability = useAvailability(postos);
  const { position: userPos, loading: geoLoading, getPosition } = useGeolocation();
  const { isFavorite, toggle: toggleFav } = useFavorites();
  const { isDark } = useTheme();

  // Filters
  const [search, setSearch] = useState('');
  const [filterIlha, setFilterIlha] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterAvail, setFilterAvail] = useState('');
  const [filterMinKw, setFilterMinKw] = useState(0);

  // UI state
  const [sideTab, setSideTab] = useState<SideTab>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPosto, setSelectedPosto] = useState<Posto | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number; zoom: number } | undefined>();
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number,number][] | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // URL params (from trip planner / favorites link)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const postoId = params.get('posto');
    if (postoId && postos.length) {
      const p = postos.find(x => x.id === postoId);
      if (p) { selectPosto(p); }
    }
  }, [location.search, postos.length]);

  const ilhas = [...new Set(postos.map(p => p.ilha))].sort();

  const filtered = postos.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.nome.toLowerCase().includes(q) && !p.municipio.toLowerCase().includes(q) && !p.ilha.toLowerCase().includes(q)) return false;
    if (filterIlha && p.ilha !== filterIlha) return false;
    if (filterEstado && p.estado !== filterEstado) return false;
    if (filterTipo && p.tipo !== filterTipo) return false;
    if (filterAvail && availability[p.id]?.status !== filterAvail) return false;
    if (filterMinKw && p.potencia_kw < filterMinKw) return false;
    return true;
  });

  const activeFilterCount = [filterIlha, filterEstado, filterTipo, filterAvail, filterMinKw > 0 ? '1' : ''].filter(Boolean).length;

  function clearFilters() {
    setFilterIlha(''); setFilterEstado(''); setFilterTipo('');
    setFilterAvail(''); setFilterMinKw(0); setSearch('');
    setHighlightedIds([]);
  }

  function selectPosto(posto: Posto) {
    setSelectedId(posto.id);
    setSelectedPosto(posto);
    setMapCenter({ lat: posto.latitude, lng: posto.longitude, zoom: 14 });
  }

  async function handleRoute(posto: Posto) {
    if (!userPos) { getPosition(); return; }
    setRouteLoading(true);
    const coords = await fetchRoute([userPos.lat, userPos.lng], [posto.latitude, posto.longitude]);
    setRouteCoords(coords);
    setRouteLoading(false);
    if (!coords) setMapCenter({ lat: posto.latitude, lng: posto.longitude, zoom: 13 });
  }

  function handleNearMe() {
    getPosition();
    if (userPos) {
      const nearby = findNearby(postos.filter(p => availability[p.id]?.status === 'disponivel' || p.estado === 'ativo'), userPos.lat, userPos.lng, 15);
      setHighlightedIds(nearby.slice(0, 5).map(p => p.id));
      setMapCenter({ lat: userPos.lat, lng: userPos.lng, zoom: 13 });
      if (nearby[0]) selectPosto(nearby[0]);
    }
  }

  const nearbyUserCount = userPos
    ? findNearby(postos.filter(p => availability[p.id]?.status === 'disponivel'), userPos.lat, userPos.lng, 10).length
    : 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
        {/* Search bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-700 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar posto, município..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Near me button */}
          <button onClick={handleNearMe} disabled={geoLoading}
            className="w-full flex items-center justify-center gap-2 py-2 bg-cv-blue/5 dark:bg-blue-900/20 hover:bg-cv-blue/10 dark:hover:bg-blue-900/30 border border-cv-blue/20 dark:border-blue-700 rounded-lg text-xs font-semibold text-cv-blue dark:text-blue-400 transition-all disabled:opacity-60">
            {geoLoading ? <div className="w-3 h-3 border border-cv-blue/50 border-t-cv-blue rounded-full animate-spin" /> : <LocateFixed size={13}/>}
            {userPos ? `${nearbyUserCount} disponíveis próximos` : 'Localizar posto mais próximo'}
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          {([['list','Lista'],['filters','Filtros'],['stats','Stats']] as const).map(([key,label]) => (
            <button key={key} onClick={() => setSideTab(key)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors relative ${sideTab === key ? 'text-cv-blue dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>
              {label}
              {key === 'filters' && activeFilterCount > 0 && (
                <span className="absolute top-1.5 right-2 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
              {sideTab === key && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-cv-blue dark:bg-blue-400 rounded-full" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {sideTab === 'list' && (
            <>
              {/* Island quick select */}
              <div className="px-3 py-2 border-b border-slate-50 dark:border-slate-700 flex-shrink-0">
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => { setFilterIlha(''); setMapCenter({ lat: 16.0, lng: -24.0, zoom: 7 }); }}
                    className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${!filterIlha ? 'bg-cv-blue text-white border-cv-blue' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cv-blue/50'}`}>
                    Todas
                  </button>
                  {ilhas.map(ilha => (
                    <button key={ilha} onClick={() => { setFilterIlha(ilha); if (ILHA_CENTERS[ilha]) setMapCenter(ILHA_CENTERS[ilha]); }}
                      className={`flex-shrink-0 text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors ${filterIlha === ilha ? 'bg-cv-blue text-white border-cv-blue' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cv-blue/50'}`}>
                      {ilha}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-3 py-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {filtered.length} postos · {filtered.filter(p => availability[p.id]?.status === 'disponivel').length} disponíveis
              </div>

              {loading ? (
                <div className="p-3 space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
              ) : (
                filtered.map(posto => {
                  const ec = ESTADO_CONFIG[posto.estado];
                  const avail = availability[posto.id];
                  const ac = avail ? AVAIL_CONFIG[avail.status] : null;
                  const dist = userPos ? haversineDistance(userPos.lat, userPos.lng, posto.latitude, posto.longitude) : null;
                  return (
                    <button key={posto.id} onClick={() => selectPosto(posto)}
                      className={`w-full text-left px-3 py-2.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${selectedId === posto.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${ac ? ac.dot : ec.dot}`} />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-white text-xs truncate">{posto.nome}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <MapPin size={8} className="flex-shrink-0" />
                            <span className="truncate">{posto.municipio}, {posto.ilha}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {ac && <span className={`text-[9px] font-semibold ${ac.text}`}>{ac.label}</span>}
                            {avail?.status === 'ocupado' && avail.espera_min > 0 && (
                              <span className="text-[9px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 font-medium">
                                <Clock size={7}/>~{avail.espera_min}min
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Zap size={7}/>{posto.potencia_kw}kW</span>
                            {dist !== null && <span className="text-[9px] text-slate-400">{dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`}</span>}
                            {isFavorite(posto.id) && <Star size={8} className="text-cv-gold" fill="currentColor" />}
                          </div>
                        </div>
                        <ChevronRight size={11} className="text-slate-300 dark:text-slate-600 flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {sideTab === 'filters' && (
            <div className="p-3 space-y-3 fade-in">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="w-full flex items-center justify-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg py-2 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <X size={12}/>Limpar {activeFilterCount} filtro{activeFilterCount !== 1 ? 's' : ''}
                </button>
              )}

              {[
                { label: 'Ilha', value: filterIlha, onChange: setFilterIlha, options: [['','Todas as ilhas'], ...ilhas.map(i => [i,i])] },
                { label: 'Estado', value: filterEstado, onChange: setFilterEstado, options: [['','Todos os estados'],['ativo','Ativo'],['manutencao','Manutenção'],['offline','Offline']] },
                { label: 'Tipo', value: filterTipo, onChange: setFilterTipo, options: [['','Todos os tipos'],['publico','Público'],['privado','Privado']] },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
                  <select value={f.value} onChange={e => (f.onChange as (v:string)=>void)(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                    {(f.options as [string,string][]).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Disponibilidade</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[['','Todos'],['disponivel','Livre'],['ocupado','Ocupado'],['manutencao','N/D']].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterAvail(v as string)}
                      className={`text-[10px] font-semibold py-1.5 rounded-lg border transition-all ${filterAvail === v ? 'bg-cv-blue text-white border-cv-blue' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cv-blue/50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Potência Mínima</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[[0,'Todos'],[22,'22kW'],[50,'50kW'],[100,'100kW']].map(([v,l]) => (
                    <button key={v} onClick={() => setFilterMinKw(v as number)}
                      className={`text-[10px] font-semibold py-1.5 rounded-lg border transition-all ${filterMinKw === v ? 'bg-cv-blue text-white border-cv-blue' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-cv-blue/50'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {sideTab === 'stats' && (
            <UserStats
              postos={filtered}
              availabilityMap={availability}
              selectedIlha={filterIlha || undefined}
              userLocation={userPos}
            />
          )}
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        <InteractiveMap
          postos={filtered}
          selectedId={selectedId}
          onSelect={selectPosto}
          center={mapCenter}
          highlightedIds={highlightedIds}
          userLocation={userPos}
          routeCoords={routeCoords}
          availability={availability}
          isDark={isDark}
        />

        {/* Toolbar overlay */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {routeCoords && (
            <button onClick={() => setRouteCoords(null)}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl shadow-card hover:bg-slate-50 transition-colors">
              <X size={12}/> Limpar Rota
            </button>
          )}
        </div>

        {/* Map stats overlay */}
        {!loading && (
          <div className="absolute bottom-3 left-3 z-[1000] flex flex-wrap gap-2">
            {[
              { label: 'Filtrados', val: filtered.length, color: 'bg-cv-blue' },
              { label: 'Disponíveis', val: filtered.filter(p => availability[p.id]?.status === 'disponivel').length, color: 'bg-emerald-500' },
              { label: 'Ocupados', val: filtered.filter(p => availability[p.id]?.status === 'ocupado').length, color: 'bg-amber-500' },
            ].map(s => (
              <div key={s.label} className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5 shadow-sm">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />{s.val} {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Interactive Legend */}
        {!loading && (
          <div className="absolute bottom-3 right-3 z-[1000] bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border border-slate-200 dark:border-slate-600 rounded-xl shadow-elevated overflow-hidden">
            <div className="px-3 pt-2.5 pb-1 border-b border-slate-100 dark:border-slate-700">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Legenda</span>
              {(filterEstado || filterTipo) && (
                <button onClick={() => { setFilterEstado(''); setFilterTipo(''); }}
                  className="ml-2 text-[9px] text-cv-blue hover:underline font-semibold">limpar</button>
              )}
            </div>
            <div className="p-2 space-y-0.5">
              {([
                { label: 'Ativo / Público', dot: 'bg-emerald-400', activeDot: 'bg-emerald-500', estado: 'ativo', tipo: 'publico' },
                { label: 'Ativo / Privado', dot: 'bg-blue-400', activeDot: 'bg-blue-500', estado: 'ativo', tipo: 'privado' },
                { label: 'Manutenção', dot: 'bg-amber-400', activeDot: 'bg-amber-500', estado: 'manutencao', tipo: '' },
                { label: 'Offline', dot: 'bg-red-400', activeDot: 'bg-red-500', estado: 'offline', tipo: '' },
              ] as const).map(item => {
                const isActive = filterEstado === item.estado && filterTipo === item.tipo;
                const count = postos.filter(p =>
                  p.estado === item.estado && (item.tipo === '' || p.tipo === item.tipo)
                ).length;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      if (isActive) { setFilterEstado(''); setFilterTipo(''); }
                      else { setFilterEstado(item.estado); setFilterTipo(item.tipo); }
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-700 ring-1 ring-slate-300 dark:ring-slate-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? item.activeDot : item.dot}`} />
                    <span className={`text-xs flex-1 ${isActive ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>{item.label}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cv-blue text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Station Detail Panel */}
      {selectedPosto && (
        <StationDetailPanel
          posto={selectedPosto}
          availability={availability[selectedPosto.id]}
          userLocation={userPos}
          isFavorite={isFavorite(selectedPosto.id)}
          onToggleFavorite={toggleFav}
          onRoute={handleRoute}
          onClose={() => { setSelectedPosto(null); setSelectedId(null); }}
          postos={postos}
          onSelectStation={selectPosto}
          availability_map={availability}
        />
      )}
    </div>
  );
}

// ── Postos List Page ──────────────────────────────────────────────────────────
function PostosListPage() {
  const { postos, loading } = usePostos();
  const availability = useAvailability(postos);
  const { isFavorite, toggle } = useFavorites();
  const [search, setSearch] = useState('');

  const filtered = postos.filter(p => {
    const q = search.toLowerCase();
    return !q || p.nome.toLowerCase().includes(q) || p.municipio.toLowerCase().includes(q);
  });

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white" />
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">{filtered.length} postos</span>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(posto => {
            const avail = availability[posto.id];
            const ac = avail ? AVAIL_CONFIG[avail.status] : null;
            return (
              <div key={posto.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card hover:shadow-elevated transition-all overflow-hidden">
                <div className={`h-1.5 ${posto.estado === 'ativo' ? 'bg-gradient-to-r from-cv-blue to-cv-teal' : posto.estado === 'manutencao' ? 'bg-amber-400' : 'bg-red-400'}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight flex-1">{posto.nome}</h3>
                    <div className="flex items-center gap-1 ml-2">
                      {ac && <span className={`text-[9px] font-bold flex items-center gap-1 ${ac.text}`}><span className={`w-1.5 h-1.5 rounded-full ${ac.dot}`}/>{ac.label}</span>}
                      <button onClick={() => toggle(posto.id)} className="p-1 text-slate-300 dark:text-slate-600 hover:text-cv-gold transition-colors">
                        <Star size={13} fill={isFavorite(posto.id) ? 'currentColor' : 'none'} className={isFavorite(posto.id) ? 'text-cv-gold' : ''} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-3">
                    <MapPin size={10}/>{posto.municipio}, {posto.ilha}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Potência', val: `${posto.potencia_kw}kW` },
                      { label: 'Conectores', val: posto.num_conectores },
                      { label: 'Utilização', val: avail ? `${avail.ocupacao}%` : '—' },
                    ].map(r => (
                      <div key={r.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.val}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500">{r.label}</div>
                      </div>
                    ))}
                  </div>
                  {avail?.espera_min ? (
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                      <Clock size={9}/><span>Tempo espera: ~{avail.espera_min} min</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UserDashboard() {
  const { postos } = usePostos();

  return (
    <Routes>
      <Route path="/" element={
        <AppShell title="Mapa Interativo" subtitle="Rede Nacional de Carregamento Elétrico · Cabo Verde">
          <div className="h-full"><MapView /></div>
        </AppShell>
      } />
      <Route path="/postos" element={
        <AppShell title="Lista de Postos" subtitle={`${postos.length} postos registados`}>
          <PostosListPage />
        </AppShell>
      } />
      <Route path="/trip-planner" element={
        <AppShell title="Planeador de Viagem" subtitle="Calcule rotas com postos de carregamento ao longo do percurso">
          <TripPlannerPage />
        </AppShell>
      } />
      <Route path="/favoritos" element={
        <AppShell title="Meus Favoritos" subtitle="Postos de carregamento guardados">
          <FavoritesPage />
        </AppShell>
      } />
      <Route path="/chatbot" element={
        <AppShell title="Assistente Virtual" subtitle="Chatbot inteligente de apoio ao utilizador">
          <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-card border border-slate-200 dark:border-slate-700 p-8 text-center">
              <div className="w-16 h-16 bg-cv-blue rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Bot size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Assistente GeoMobilidade</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">O assistente está disponível no canto inferior direito de todas as páginas. Pode controlar o mapa por voz de texto.</p>
              <div className="grid grid-cols-2 gap-3">
                {['Postos em Santiago', 'Postos disponíveis', 'Carregamento rápido', 'Mais próximo de mim'].map(q => (
                  <div key={q} className="bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-slate-600 dark:text-slate-300 text-xs font-medium">{q}</div>
                ))}
              </div>
            </div>
          </div>
        </AppShell>
      } />
    </Routes>
  );
}
