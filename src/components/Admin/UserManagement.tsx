import { useEffect, useState } from 'react';
import { supabase, type Perfil } from '../../lib/supabase';
import { Shield, User, Mail, Building2, Trash2 } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('perfis').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleRole(u: Perfil) {
    const newRole = u.role === 'admin' ? 'utilizador' : 'admin';
    await supabase.from('perfis').update({ role: newRole }).eq('id', u.id);
    load();
  }

  return (
    <div className="bg-white rounded-xl shadow-card border border-slate-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Utilizadores do Sistema</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">{users.length} utilizadores</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400 text-sm">A carregar...</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {users.map(u => (
            <div key={u.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cv-blue to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {(u.nome || u.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800 text-sm truncate">{u.nome || 'Sem nome'}</span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-cv-gold/15 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {u.role === 'admin' ? <Shield size={8}/> : <User size={8}/>}
                    {u.role === 'admin' ? 'Admin' : 'Utilizador'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Mail size={10}/>{u.email || 'N/D'}</span>
                  {u.organizacao && <span className="text-xs text-slate-400 flex items-center gap-1"><Building2 size={10}/>{u.organizacao}</span>}
                </div>
              </div>
              <button
                onClick={() => toggleRole(u)}
                className="text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {u.role === 'admin' ? 'Revogar Admin' : 'Tornar Admin'}
              </button>
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              Nenhum utilizador registado ainda.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
