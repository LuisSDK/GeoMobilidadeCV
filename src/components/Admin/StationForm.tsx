import { useState } from 'react';
import { supabase, type Posto } from '../../lib/supabase';
import { ILHAS_CV, MUNICIPIOS_CV, OPERADORES, TIPOS_CONECTOR } from '../../lib/constants';
import { Save, X, MapPin } from 'lucide-react';

interface StationFormProps {
  posto?: Posto | null;
  onSaved: () => void;
  onCancel: () => void;
}

type FormData = Omit<Posto, 'id' | 'created_at' | 'updated_at'>;

const DEFAULTS: FormData = {
  nome: '', municipio: 'Praia', ilha: 'Santiago',
  latitude: 14.93, longitude: -23.51,
  potencia_kw: 22, tipo: 'publico', estado: 'ativo',
  operador: 'TECV', endereco: '', num_conectores: 2,
  tipo_conector: 'Type 2', horario: '24h', observacoes: '',
};

export default function StationForm({ posto, onSaved, onCancel }: StationFormProps) {
  const [form, setForm] = useState<FormData>(posto ? {
    nome: posto.nome, municipio: posto.municipio, ilha: posto.ilha,
    latitude: posto.latitude, longitude: posto.longitude,
    potencia_kw: posto.potencia_kw, tipo: posto.tipo, estado: posto.estado,
    operador: posto.operador || '', endereco: posto.endereco || '',
    num_conectores: posto.num_conectores,
    tipo_conector: posto.tipo_conector || 'Type 2',
    horario: posto.horario || '24h', observacoes: posto.observacoes || '',
  } : DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(k: keyof FormData, v: unknown) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function onIlhaChange(ilha: string) {
    const munis = MUNICIPIOS_CV[ilha] || [];
    set('ilha', ilha);
    set('municipio', munis[0] || '');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), potencia_kw: Number(form.potencia_kw), num_conectores: Number(form.num_conectores) };
      if (posto) {
        const { error: err } = await supabase.from('postos').update(data).eq('id', posto.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('postos').insert(data);
        if (err) throw err;
      }
      onSaved();
    } catch (e: unknown) {
      //setError(e instanceof Error ? e.message : 'Erro ao guardar');
      const message = e instanceof Error ? e.message : (typeof e === 'object' && e !== null) ? (e as any).message ?? JSON.stringify(e) : 'Erro ao guardar';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const munis = MUNICIPIOS_CV[form.ilha] || [];

  return (
    <div className="bg-white rounded-xl shadow-modal border border-slate-200 overflow-hidden fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cv-blue to-blue-800">
        <h2 className="font-bold text-white">{posto ? 'Editar Posto' : 'Novo Posto de Carregamento'}</h2>
        <button title='cancel' onClick={onCancel} className="text-white/70 hover:text-white"><X size={18}/></button>
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Nome */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nome do Posto *</label>
          <input value={form.nome} onChange={e => set('nome', e.target.value)} required
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue"
            placeholder="Ex: Posto Central Praia" />
        </div>

        {/* Localização */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Ilha *</label>
            <select value={form.ilha} onChange={e => onIlhaChange(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue bg-white">
              {ILHAS_CV.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Município *</label>
            <select value={form.municipio} onChange={e => set('municipio', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue bg-white">
              {munis.map(m => <option key={m} value={m}>{m}</option>)}
              {!munis.includes(form.municipio) && <option value={form.municipio}>{form.municipio}</option>}
            </select>
          </div>
        </div>

        {/* Coordenadas */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            <MapPin size={11} className="inline mr-1" />Coordenadas Geográficas
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Latitude</label>
              <input type="number" step="0.0001" value={form.latitude} onChange={e => set('latitude', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 mb-1 block">Longitude</label>
              <input type="number" step="0.0001" value={form.longitude} onChange={e => set('longitude', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 font-mono" />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Endereço</label>
          <input value={form.endereco || ''} onChange={e => set('endereco', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 focus:border-cv-blue"
            placeholder="Av. Amílcar Cabral, Plateau..." />
        </div>

        {/* Técnico */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Potência (kW) *</label>
            <select value={form.potencia_kw} onChange={e => set('potencia_kw', Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              {[3.7, 7.4, 11, 22, 50, 100, 150, 250].map(v => <option key={v} value={v}>{v} kW</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Nº Conectores</label>
            <input type="number" min="1" max="20" value={form.num_conectores} onChange={e => set('num_conectores', Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tipo Conector</label>
            <select value={form.tipo_conector || ''} onChange={e => set('tipo_conector', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              {TIPOS_CONECTOR.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Horário</label>
            <select value={form.horario || ''} onChange={e => set('horario', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              {['24h', '06:00-22:00', '07:00-21:00', '08:00-20:00', '08:00-18:00', '07:00-23:00'].map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Tipo</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Estado</label>
            <select value={form.estado} onChange={e => set('estado', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              <option value="ativo">Ativo</option>
              <option value="manutencao">Manutenção</option>
              <option value="offline">Offline</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Operador</label>
            <select value={form.operador || ''} onChange={e => set('operador', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 bg-white">
              {OPERADORES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Observações</label>
          <textarea value={form.observacoes || ''} onChange={e => set('observacoes', e.target.value)} rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cv-blue/30 resize-none"
            placeholder="Notas adicionais..." />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading}
            className="flex-1 bg-cv-blue hover:bg-blue-800 text-white py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15}/>}
            {posto ? 'Guardar Alterações' : 'Criar Posto'}
          </button>
          <button type="button" onClick={onCancel}
            className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-semibold text-sm transition-all">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
