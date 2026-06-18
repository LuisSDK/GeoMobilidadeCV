import { useEffect, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { supabase, type Posto } from '../lib/supabase';
import { AppShell } from '../components/Layout/Header';
import InteractiveMap from '../components/Map/InteractiveMap';
import StationDetailPanel from '../components/Map/StationDetailPanel';
import StatsCards from '../components/Dashboard/StatsCards';
import Charts from '../components/Dashboard/Charts';
import StationForm from '../components/Admin/StationForm';
import StationList from '../components/Admin/StationList';
import UserManagement from '../components/Admin/UserManagement';
import CoverageAnalysis from '../components/Map/CoverageAnalysis';
import PlanningMap from '../components/Map/PlanningMap';
import ApiExplorer from '../components/API/ApiExplorer';
import OcorrenciasManagement from '../components/Admin/OcorrenciasManagement';
import { useAvailability } from '../hooks/useAvailability';
import { useGeolocation } from '../hooks/useGeolocation';
import { useFavorites } from '../hooks/useFavorites';
import { PlusCircle, RefreshCw, X, Map } from 'lucide-react';

function usePostos() {
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('postos').select('*').order('nome');
    setPostos(data || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { postos, loading, reload: load };
}

// ── Map Admin View ─────────────────────────────────────────────
const ADMIN_LEGEND = [
  { label: 'Ativo / Público', dot: 'bg-emerald-400', activeDot: 'bg-emerald-500', estado: 'ativo', tipo: 'publico' },
  { label: 'Ativo / Privado', dot: 'bg-blue-400', activeDot: 'bg-blue-500', estado: 'ativo', tipo: 'privado' },
  { label: 'Manutenção', dot: 'bg-amber-400', activeDot: 'bg-amber-500', estado: 'manutencao', tipo: '' },
  { label: 'Offline', dot: 'bg-red-400', activeDot: 'bg-red-500', estado: 'offline', tipo: '' },
] as const;

function MapAdmin({ postos, onSelect, selectedId, onRefresh }: {
  postos: Posto[]; selectedId: string | null;
  onSelect: (p: Posto) => void; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<Posto | null>(null);
  const [showCoverage, setShowCoverage] = useState(false);
  const [coverageRadius, setCoverageRadius] = useState(10);
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  const filtered = postos.filter(p => {
    if (filterEstado && p.estado !== filterEstado) return false;
    if (filterTipo && p.tipo !== filterTipo) return false;
    return true;
  });

  return (
    <div className="flex h-full">
      {/* Map */}
      <div className="flex-1 relative">
        <InteractiveMap
          postos={filtered}
          selectedId={selectedId}
          onSelect={onSelect}
          showCoverage={showCoverage}
          coverageRadius={coverageRadius}
          openPopupOnSelect={false}
          showResetButton
        />
        {/* Controls overlay */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-elevated border border-slate-200 p-3 space-y-2">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Cobertura</div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showCoverage} onChange={e => setShowCoverage(e.target.checked)} className="rounded" />
              <span className="text-xs text-slate-700">Mostrar raios</span>
            </label>
            {showCoverage && (
              <select value={coverageRadius} onChange={e => setCoverageRadius(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none bg-white">
                <option value={5}>5 km (Urbano)</option>
                <option value={10}>10 km (Semi-urbano)</option>
                <option value={20}>20 km (Rural)</option>
              </select>
            )}
          </div>

          {/* Interactive Legend */}
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-elevated border border-slate-200 overflow-hidden">
            <div className="px-3 pt-2.5 pb-1 border-b border-slate-100">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Legenda</span>
              {(filterEstado || filterTipo) && (
                <button onClick={() => { setFilterEstado(''); setFilterTipo(''); }}
                  className="ml-2 text-[9px] text-cv-blue hover:underline font-semibold">limpar</button>
              )}
            </div>
            <div className="p-2 space-y-0.5">
              {ADMIN_LEGEND.map(item => {
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
                      isActive ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? item.activeDot : item.dot}`} />
                    <span className={`text-xs flex-1 ${isActive ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{item.label}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cv-blue text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats overlay */}
        <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
          {[
            { label: 'Filtrados', val: filtered.length },
            { label: 'Ativos', val: filtered.filter(p=>p.estado==='ativo').length },
            { label: 'Offline', val: filtered.filter(p=>p.estado!=='ativo').length },
          ].map(s => (
            <div key={s.label} className="bg-white/95 border border-slate-200 rounded-lg px-3 py-1.5 shadow-sm">
              <span className="text-xs font-semibold text-slate-700">{s.val} {s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <StationForm posto={editing} onSaved={() => { setEditing(null); onRefresh(); }} onCancel={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gestão de Postos ────────────────────────────────────────────
function GestaoPostos({ postos, loading, onRefresh, onNewClick }: { postos: Posto[]; loading: boolean; onRefresh: () => void; onNewClick?: () => void }) {
  const [editing, setEditing] = useState<Posto | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-4">
      {(showForm || editing) && (
        <StationForm
          posto={editing}
          onSaved={() => { setShowForm(false); setEditing(null); onRefresh(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}
      {!showForm && !editing && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Postos Registados</h3>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs bg-cv-blue text-white rounded-lg px-3 py-1.5 hover:bg-blue-800 transition-colors">
              <PlusCircle size={13}/>Novo Posto
            </button>
          </div>
          <StationList
            postos={postos}
            onEdit={p => setEditing(p)}
            onRefresh={onRefresh}
            selectedId={selectedId}
            onSelect={p => setSelectedId(p.id)}
          />
        </>
      )}
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────
function DashboardAdmin({ postos }: { postos: Posto[] }) {
  return (
    <div className="p-6 space-y-6">
      <StatsCards postos={postos} />
      <Charts postos={postos} />
    </div>
  );
}

// ── Main Admin Dashboard ────────────────────────────────────────
export default function AdminDashboard() {
  const showApiExplorer = (import.meta as any).env?.VITE_SHOW_API_EXPLORER === 'true';
  const { postos, loading, reload } = usePostos();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPosto, setSelectedPosto] = useState<Posto | null>(null);
  const availability = useAvailability(postos);
  const { position: userPos } = useGeolocation();
  const { isFavorite, toggle } = useFavorites();

  function handleSelect(posto: Posto) {
    setSelectedId(posto.id);
    setSelectedPosto(posto);
  }

  function handleRoute(posto: Posto) {
    const target = `${posto.latitude},${posto.longitude}`;
    const origin = userPos ? `${userPos.lat},${userPos.lng}` : undefined;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${target}`
      : `https://www.google.com/maps/dir/?api=1&destination=${target}`;
    window.open(url, '_blank');
  }

  // Signal chatbot when detail panel opens/closes
  useEffect(() => {
    if (selectedPosto) {
      window.dispatchEvent(new CustomEvent('detail-panel-open'));
    } else {
      window.dispatchEvent(new CustomEvent('detail-panel-close'));
    }
  }, [selectedPosto]);

  return (
    <Routes>
      <Route path="/" element={
        <AppShell
          title="Mapa Avançado"
          subtitle="Gestão geoespacial da rede nacional"
          actions={
            <button onClick={reload} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cv-blue border border-slate-200 rounded-lg px-3 py-1.5 transition-colors">
              <RefreshCw size={12}/>Atualizar
            </button>
          }
        >
          <div className="h-full flex gap-4">
            <div className="flex-1">
              <MapAdmin postos={postos} selectedId={selectedId} onSelect={handleSelect} onRefresh={reload} />
            </div>
            {selectedPosto && (
              <StationDetailPanel
                posto={selectedPosto}
                availability={availability[selectedPosto.id]}
                userLocation={userPos}
                isFavorite={isFavorite(selectedPosto.id)}
                onToggleFavorite={toggle}
                onRoute={handleRoute}
                onClose={() => { setSelectedPosto(null); setSelectedId(null); }}
                postos={postos}
                onSelectStation={handleSelect}
                availability_map={availability}
              />
            )}
          </div>
          </AppShell>
        } />

        <Route path="/dashboard" element={
          <AppShell title="Dashboard Analítico" subtitle="Métricas e análise da rede de carregamento">
            {loading ? (
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-56 rounded-xl" />)}
                </div>
              </div>
            ) : <DashboardAdmin postos={postos} />}
          </AppShell>
        } />

        <Route path="/postos" element={
          <AppShell
            title="Gestão de Postos"
            subtitle={`${postos.length} postos no inventário nacional`}
          >
            <GestaoPostos postos={postos} loading={loading} onRefresh={reload} />
          </AppShell>
        } />

        <Route path="/cobertura" element={
          <AppShell title="Análise de Cobertura" subtitle="Visualização geoespacial dos raios de cobertura da rede">
            <div className="p-6">
              <CoverageAnalysis postos={postos} />
            </div>
          </AppShell>
        } />

        <Route path="/planeamento" element={
          <AppShell title="Planeamento SIG" subtitle="Sistema de recomendação para expansão da rede">
            <div className="p-6">
              <PlanningMap postos={postos} />
            </div>
          </AppShell>
        } />

        <Route path="/utilizadores" element={
          <AppShell title="Gestão de Utilizadores" subtitle="Administração de acessos ao sistema">
            <div className="p-6">
              <UserManagement />
            </div>
          </AppShell>
        } />

        <Route path="/ocorrencias" element={
          <AppShell title="Gestão de Ocorrências" subtitle="Registos reportados por utilizadores">
            <div className="p-6">
              <OcorrenciasManagement />
            </div>
          </AppShell>
        } />

        {showApiExplorer && (
          <Route path="/api" element={
            <AppShell title="API Explorer" subtitle="Documentação e teste da API geográfica GeoMobilidade CV">
              <div className="p-6">
                <ApiExplorer postos={postos} />
              </div>
            </AppShell>
          } />
        )}
      </Routes>
  );
}
