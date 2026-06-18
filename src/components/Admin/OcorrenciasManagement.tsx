import { useState, useEffect } from 'react';
import { supabase, type Posto } from '../../lib/supabase';
import { useOcorrencias } from '../../hooks/useOcorrencias';
import { AlertTriangle, Lightbulb, MessageCircle, Clock, MapPin, Search, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, User } from 'lucide-react';

const TIPO_CONFIG = {
  avaria: { label: 'Avaria', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  sugestao: { label: 'Sugestão', icon: Lightbulb, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  outro: { label: 'Outro', icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

const ESTADO_OPTIONS = [
  { value: 'pendente', label: 'Pendente', dot: 'bg-amber-400', bg: 'bg-amber-100 text-amber-800' },
  { value: 'em_analise', label: 'Em Análise', dot: 'bg-blue-400', bg: 'bg-blue-100 text-blue-800' },
  { value: 'resolvido', label: 'Resolvido', dot: 'bg-emerald-400', bg: 'bg-emerald-100 text-emerald-800' },
];

interface UserInfo {
  id: string;
  email: string;
  nome: string;
}

export default function OcorrenciasManagement() {
  const { ocorrencias, loading, updateEstado, reload } = useOcorrencias();
  const [postos, setPostos] = useState<Posto[]>([]);
  const [users, setUsers] = useState<Map<string, UserInfo>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterEstado, setFilterEstado] = useState<string>('');
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('postos').select('*').order('nome').then(({ data }) => setPostos(data || []));
  }, []);

  // Load user info for all ocorrencias
  useEffect(() => {
    const userIds = [...new Set(ocorrencias.map(o => o.user_id))];
    if (!userIds.length) return;
    Promise.all(
      userIds.map(uid =>
        supabase.from('perfis').select('id, email, nome').eq('id', uid).maybeSingle()
      )
    ).then(results => {
      const map = new Map<string, UserInfo>();
      results.forEach(r => {
        if (r.data) map.set(r.data.id, r.data as UserInfo);
      });
      setUsers(map);
    });
  }, [ocorrencias]);

  async function handleUpdateEstado(id: string, estado: 'pendente' | 'em_analise' | 'resolvido') {
    setUpdating(id);
    await updateEstado(id, estado);
    setUpdating(null);
  }

  function getPostoNome(postoId: string | null): string {
    if (!postoId) return 'Geral';
    const p = postos.find(p => p.id === postoId);
    return p ? `${p.nome} (${p.municipio})` : 'Posto removido';
  }

  function getUserInfo(userId: string): UserInfo {
    return users.get(userId) || { id: userId, email: 'Desconhecido', nome: 'Utilizador' };
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'há poucos minutos';
    if (h < 24) return `há ${h}h`;
    if (h < 720) return `há ${Math.floor(h / 24)}d`;
    return new Date(iso).toLocaleDateString('pt-PT');
  }

  const filtered = ocorrencias.filter(o => {
    if (filterTipo && o.tipo !== filterTipo) return false;
    if (filterEstado && o.estado !== filterEstado) return false;
    if (search) {
      const q = search.toLowerCase();
      const user = getUserInfo(o.user_id);
      return o.titulo.toLowerCase().includes(q) || o.descricao.toLowerCase().includes(q) || user.nome.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    total: ocorrencias.length,
    pendente: ocorrencias.filter(o => o.estado === 'pendente').length,
    em_analise: ocorrencias.filter(o => o.estado === 'em_analise').length,
    resolvido: ocorrencias.filter(o => o.estado === 'resolvido').length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', count: counts.total, color: 'bg-cv-blue', text: 'text-white' },
          { label: 'Pendentes', count: counts.pendente, color: 'bg-amber-400', text: 'text-white' },
          { label: 'Em Análise', count: counts.em_analise, color: 'bg-blue-400', text: 'text-white' },
          { label: 'Resolvidas', count: counts.resolvido, color: 'bg-emerald-400', text: 'text-white' },
        ].map(s => (
          <div key={s.label} className={`${s.color} rounded-xl px-4 py-3 ${s.text}`}>
            <div className="text-2xl font-bold">{s.count}</div>
            <div className="text-xs opacity-80 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar ocorrências..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cv-blue/30"
          />
        </div>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white"
        >
          <option value="">Todos os tipos</option>
          <option value="avaria">Avarias</option>
          <option value="sugestao">Sugestões</option>
          <option value="outro">Outros</option>
        </select>

        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white"
        >
          <option value="">Todos os estados</option>
          <option value="pendente">Pendente</option>
          <option value="em_analise">Em Análise</option>
          <option value="resolvido">Resolvido</option>
        </select>

        <button
          onClick={reload}
          className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:text-cv-blue hover:bg-slate-50 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhuma ocorrência encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(occ => {
            const tipoCfg = TIPO_CONFIG[occ.tipo];
            const TipoIcon = tipoCfg.icon;
            const isExpanded = expandedId === occ.id;
            const user = getUserInfo(occ.user_id);

            return (
              <div
                key={occ.id}
                className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden hover:shadow-elevated transition-all"
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoCfg.bg}`}>
                      <TipoIcon size={15} className={tipoCfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-800 text-sm truncate">{occ.titulo}</h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${tipoCfg.bg} ${tipoCfg.color}`}>{tipoCfg.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={9} />
                          {user.nome || user.email}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(occ.created_at)}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><MapPin size={9} />{getPostoNome(occ.posto_id)}</span>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {ESTADO_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => handleUpdateEstado(occ.id, opt.value as 'pendente' | 'em_analise' | 'resolvido')}
                          disabled={updating === occ.id || occ.estado === opt.value}
                          title={`Marcar como ${opt.label}`}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-lg border transition-all ${
                            occ.estado === opt.value
                              ? `${opt.bg} border-transparent cursor-default`
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          } disabled:opacity-50`}
                        >
                          {updating === occ.id ? (
                            <div className="w-3 h-3 border border-slate-400 border-t-slate-600 rounded-full animate-spin mx-auto" />
                          ) : occ.estado === opt.value ? (
                            opt.label
                          ) : (
                            opt.label
                          )}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : occ.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 fade-in">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{occ.descricao}</p>
                      {occ.foto_url && (
                        <div className="mt-3">
                          <img
                            src={occ.foto_url}
                            alt="Foto da ocorrência"
                            className="max-w-full h-48 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(occ.foto_url!, '_blank')}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>ID: {occ.id.slice(0, 8)}...</span>
                        <span>·</span>
                        <span>Utilizador: {user.email}</span>
                        {occ.updated_at !== occ.created_at && (
                          <>
                            <span>·</span>
                            <span>Atualizado: {timeAgo(occ.updated_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}