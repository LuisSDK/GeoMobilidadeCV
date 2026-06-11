import { useState } from 'react';
import { supabase, type Posto } from '../../lib/supabase';
import { Search, Edit2, Trash2, Zap, MapPin, CheckCircle, AlertTriangle, WifiOff } from 'lucide-react';

interface StationListProps {
  postos: Posto[];
  onEdit: (posto: Posto) => void;
  onRefresh: () => void;
  onSelect?: (posto: Posto) => void;
  selectedId?: string | null;
}

const ESTADO_CONFIG = {
  ativo: { label: 'Ativo', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  manutencao: { label: 'Manutenção', color: 'text-amber-700 bg-amber-50 border-amber-200', icon: AlertTriangle },
  offline: { label: 'Offline', color: 'text-red-700 bg-red-50 border-red-200', icon: WifiOff },
};

export default function StationList({ postos, onEdit, onRefresh, onSelect, selectedId }: StationListProps) {
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterIlha, setFilterIlha] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const ilhas = [...new Set(postos.map(p => p.ilha))].sort();

  const filtered = postos.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.municipio.toLowerCase().includes(q) || p.ilha.toLowerCase().includes(q);
    const matchEstado = !filterEstado || p.estado === filterEstado;
    const matchIlha = !filterIlha || p.ilha === filterIlha;
    return matchSearch && matchEstado && matchIlha;
  });

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este posto permanentemente?')) return;
    setDeleting(id);
    await supabase.from('postos').delete().eq('id', id);
    setDeleting(null);
    onRefresh();
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar posto..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30"
          />
        </div>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
          <option value="">Todos estados</option>
          <option value="ativo">Ativo</option>
          <option value="manutencao">Manutenção</option>
          <option value="offline">Offline</option>
        </select>
        <select value={filterIlha} onChange={e => setFilterIlha(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
          <option value="">Todas as ilhas</option>
          {ilhas.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <span className="text-xs text-slate-500 self-center">{filtered.length} resultados</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Posto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Localização</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Potência</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Operador</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(posto => {
              const ec = ESTADO_CONFIG[posto.estado];
              const EIcon = ec.icon;
              const isSelected = posto.id === selectedId;
              return (
                <tr
                  key={posto.id}
                  onClick={() => onSelect?.(posto)}
                  className={`border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${posto.estado === 'ativo' ? 'bg-emerald-400' : posto.estado === 'manutencao' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div>
                        <div className="font-medium text-slate-800">{posto.nome}</div>
                        <div className="text-xs text-slate-400">{posto.tipo === 'publico' ? 'Público' : 'Privado'} · {posto.tipo_conector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                      <div>
                        <div className="text-slate-700">{posto.municipio}</div>
                        <div className="text-xs text-slate-400">{posto.ilha}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Zap size={12} className="text-amber-500" />
                      <span className="font-semibold text-slate-700">{posto.potencia_kw} kW</span>
                    </div>
                    <div className="text-xs text-slate-400">{posto.num_conectores} conect.</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${ec.color}`}>
                      <EIcon size={10} />
                      {ec.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{posto.operador || 'N/D'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => onEdit(posto)} className="p-1.5 text-slate-400 hover:text-cv-blue hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(posto.id)} disabled={deleting === posto.id}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                        {deleting === posto.id ? <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                  Nenhum posto encontrado com os filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
