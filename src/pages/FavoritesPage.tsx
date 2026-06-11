import { useEffect, useState } from 'react';
import { supabase, type Posto } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from '../hooks/useFavorites';
import { useAvailability } from '../hooks/useAvailability';
import { Star, Trash2, Zap, MapPin, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_DOT: Record<string, string> = {
  disponivel: 'bg-emerald-400',
  ocupado: 'bg-amber-400',
  manutencao: 'bg-red-400',
};

export default function FavoritesPage() {
  const { user } = useAuth();
  const { favoriteIds, toggle } = useFavorites();
  const [postos, setPostos] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  const availability = useAvailability(postos);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !favoriteIds.size) { setLoading(false); return; }
    const ids = [...favoriteIds];
    supabase.from('postos').select('*').in('id', ids).then(({ data }) => {
      setPostos(data || []);
      setLoading(false);
    });
  }, [user?.id, favoriteIds.size]);

  function goToMap(posto: Posto) {
    navigate(`/mapa?posto=${posto.id}`);
  }

  if (!user) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center text-slate-500 dark:text-slate-400">
        <Star size={40} className="mx-auto mb-3 opacity-30" />
        <p>Faça login para guardar favoritos.</p>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Meus Favoritos</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          {favoriteIds.size === 0 ? 'Ainda não guardou nenhum posto.' : `${favoriteIds.size} posto${favoriteIds.size !== 1 ? 's' : ''} guardado${favoriteIds.size !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : postos.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <Star size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhum posto favorito</p>
          <p className="text-sm mt-1">Clique na estrela num posto para guardá-lo aqui.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {postos.map(posto => {
            const avail = availability[posto.id];
            const statusDot = STATUS_DOT[avail?.status || 'disponivel'];
            return (
              <div key={posto.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-card overflow-hidden hover:shadow-elevated transition-all">
                <div className={`h-1.5 ${posto.estado === 'ativo' ? 'bg-gradient-to-r from-cv-blue to-cv-teal' : posto.estado === 'manutencao' ? 'bg-amber-400' : 'bg-red-400'}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">{posto.nome}</h3>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <MapPin size={10} />{posto.municipio}, {posto.ilha}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => goToMap(posto)}
                        className="p-1.5 text-slate-400 hover:text-cv-blue dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Navigation size={13} />
                      </button>
                      <button onClick={() => toggle(posto.id)}
                        className="p-1.5 text-cv-gold hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors">
                        <Star size={13} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Potência', val: `${posto.potencia_kw}kW` },
                      { label: 'Conectores', val: posto.num_conectores },
                      { label: avail ? (avail.status === 'disponivel' ? 'Disponível' : avail.status === 'ocupado' ? `Espera ${avail.espera_min}min` : 'Indisponível') : 'Estado', val: avail?.ocupacao !== undefined ? `${avail.ocupacao}%` : '—' },
                    ].map(r => (
                      <div key={r.label} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg px-2 py-1.5 text-center">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{r.val}</div>
                        <div className="text-[9px] text-slate-400 dark:text-slate-500">{r.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
