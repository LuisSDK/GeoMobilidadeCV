import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useOcorrencias } from '../hooks/useOcorrencias';
import { AlertTriangle, Lightbulb, MessageCircle, Send, Clock, MapPin, ChevronDown, ChevronUp, Camera, X, Image as ImageIcon } from 'lucide-react';

interface PostoOption {
  id: string;
  nome: string;
  municipio: string;
  ilha: string;
}

const TIPO_CONFIG = {
  avaria: { label: 'Avaria', icon: AlertTriangle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800' },
  sugestao: { label: 'Sugestão', icon: Lightbulb, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800' },
  outro: { label: 'Outro', icon: MessageCircle, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
};

const ESTADO_CONFIG = {
  pendente: { label: 'Pendente', dot: 'bg-amber-400', text: 'text-amber-700 dark:text-amber-400' },
  em_analise: { label: 'Em Análise', dot: 'bg-blue-400', text: 'text-blue-700 dark:text-blue-400' },
  resolvido: { label: 'Resolvido', dot: 'bg-emerald-400', text: 'text-emerald-700 dark:text-emerald-400' },
};

export default function OcorrenciasPage() {
  const { ocorrencias, loading, error, create } = useOcorrencias();
  const [postos, setPostos] = useState<PostoOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<string>('');

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<string>('avaria');
  const [postoId, setPostoId] = useState<string>('');
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from('postos').select('id, nome, municipio, ilha').order('nome').then(({ data }) => setPostos((data || []) as PostoOption[]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!titulo.trim() || !descricao.trim()) {
      setFormError('Preencha todos os campos obrigatórios.');
      return;
    }

    setSubmitting(true);
    const { error: err } = await create({
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      tipo: tipo as 'avaria' | 'sugestao' | 'outro',
      posto_id: postoId || null,
      foto: foto || undefined,
    });
    setSubmitting(false);

    if (err) {
      setFormError(err);
    } else {
      setFormSuccess('Ocorrência registada com sucesso!');
      setTitulo('');
      setDescricao('');
      setTipo('avaria');
      setPostoId('');
      setFoto(null);
      setFotoPreview(null);
      setTimeout(() => setFormSuccess(''), 3000);
      setShowForm(false);
    }
  }

  const filtered = filterTipo ? ocorrencias.filter(o => o.tipo === filterTipo) : ocorrencias;

  function getPostoNome(postoId: string | null): string {
    if (!postoId) return 'Geral';
    const p = postos.find(p => p.id === postoId);
    return p ? `${p.nome} (${p.municipio})` : 'Posto removido';
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'há poucos minutos';
    if (h < 24) return `há ${h}h`;
    if (h < 720) return `há ${Math.floor(h / 24)}d`;
    return new Date(iso).toLocaleDateString('pt-PT');
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Registos de Ocorrências</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Reporte problemas ou sugira melhorias para a rede de carregamento
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); setFormSuccess(''); }}
          className="flex items-center gap-1.5 bg-cv-blue text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-800 transition-colors"
        >
          <Send size={14} />
          {showForm ? 'Cancelar' : 'Nova Ocorrência'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card p-5 mb-6 fade-in">
          <h3 className="font-bold text-slate-800 dark:text-white text-sm mb-4 flex items-center gap-2">
            <AlertTriangle size={15} className="text-cv-blue" />
            Registar Nova Ocorrência
          </h3>

          {formError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm rounded-lg px-4 py-3 mb-4">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tipo */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Tipo de Ocorrência</label>
              <div className="grid grid-cols-3 gap-2">
                {(['avaria', 'sugestao', 'outro'] as const).map(t => {
                  const cfg = TIPO_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipo(t)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        tipo === t
                          ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-800`
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <Icon size={13} /> {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Posto (opcional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Posto Relacionado <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <select
                value={postoId}
                onChange={e => setPostoId(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
              >
                <option value="">— Nenhum posto específico —</option>
                {postos.map(p => (
                  <option key={p.id} value={p.id}>{p.nome} — {p.municipio}, {p.ilha}</option>
                ))}
              </select>
            </div>

            {/* Título */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Título *</label>
              <input
                type="text"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                placeholder="Ex: Posto com conector danificado"
                required
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">Descrição *</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Descreva o problema ou sugestão em detalhe..."
                required
                rows={4}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 resize-none"
              />
            </div>

            {/* Foto */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Fotografia <span className="text-slate-400 font-normal normal-case">(opcional)</span>
              </label>
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-cv-blue hover:text-cv-blue transition-all"
                >
                  <Camera size={16} />
                  {foto ? 'Alterar foto' : 'Adicionar foto'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFoto(file);
                      setFotoPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="hidden"
                />
                {foto && (
                  <div className="relative flex-shrink-0">
                    <img
                      src={fotoPreview || ''}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => { setFoto(null); setFotoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-cv-blue hover:bg-blue-800 text-white py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A registar...</>
              ) : (
                <><Send size={14} /> Registar Ocorrência</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { key: '', label: 'Todas', count: ocorrencias.length },
          { key: 'avaria', label: 'Avarias', count: ocorrencias.filter(o => o.tipo === 'avaria').length },
          { key: 'sugestao', label: 'Sugestões', count: ocorrencias.filter(o => o.tipo === 'sugestao').length },
          { key: 'outro', label: 'Outros', count: ocorrencias.filter(o => o.tipo === 'outro').length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterTipo(f.key)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              filterTipo === f.key
                ? 'bg-cv-blue text-white border-cv-blue'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-cv-blue/50'
            }`}
          >
            {f.label} <span className="opacity-70">({f.count})</span>
          </button>
        ))}
      </div>

      {/* List */}
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro ao carregar ocorrências</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhuma ocorrência encontrada</p>
          <p className="text-sm mt-1">Clique em "Nova Ocorrência" para reportar um problema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(occ => {
            const tipoCfg = TIPO_CONFIG[occ.tipo];
            const estadoCfg = ESTADO_CONFIG[occ.estado];
            const TipoIcon = tipoCfg.icon;
            const isExpanded = expandedId === occ.id;

            return (
              <div
                key={occ.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden hover:shadow-elevated transition-all"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : occ.id)}
                  className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${tipoCfg.bg}`}>
                    <TipoIcon size={15} className={tipoCfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="font-semibold text-slate-800 dark:text-white text-sm truncate">{occ.titulo}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${tipoCfg.bg} ${tipoCfg.color}`}>{tipoCfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className={`flex items-center gap-1 font-medium ${estadoCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
                        {estadoCfg.label}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(occ.created_at)}</span>
                      <span>·</span>
                      <span>{getPostoNome(occ.posto_id)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0 mt-1" /> : <ChevronDown size={14} className="text-slate-400 flex-shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 fade-in">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{occ.descricao}</p>
                    {occ.foto_url && (
                      <div className="mt-3">
                        <img
                          src={occ.foto_url}
                          alt="Foto da ocorrência"
                          className="max-w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(occ.foto_url!, '_blank')}
                        />
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
                      <MapPin size={9} />
                      <span>Posto: {getPostoNome(occ.posto_id)}</span>
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
            );
          })}
        </div>
      )}
    </div>
  );
}