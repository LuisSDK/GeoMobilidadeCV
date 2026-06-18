import { useState, useEffect } from 'react';
import { supabase, type Ocorrencia } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type OcorrenciaInput = {
  titulo: string;
  descricao: string;
  tipo: 'avaria' | 'sugestao' | 'outro';
  posto_id?: string | null;
  foto?: File | null;
};

export function useOcorrencias() {
  const { user, isAdmin } = useAuth();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!user) {
      setOcorrencias([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from('ocorrencias').select('*');

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data, error: err } = await query.order('created_at', { ascending: false });

      if (err) {
        console.error('[useOcorrencias] Erro:', err.message);
        setError(err.message);
        setOcorrencias([]);
      } else {
        console.log('[useOcorrencias] OK:', data?.length, 'ocorrências');
        setOcorrencias(data || []);
      }
    } catch (e: any) {
      console.error('[useOcorrencias] Exceção:', e);
      setError(e?.message || 'Erro desconhecido');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user?.id, isAdmin]);

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('ocorrencias_fotos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      return null;
    }

    const { data: urlData } = supabase.storage.from('ocorrencias_fotos').getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  }

  async function create(input: OcorrenciaInput): Promise<{ error: string | null }> {
    if (!user) return { error: 'Não autenticado' };

    let fotoUrl: string | null = null;
    if (input.foto) {
      fotoUrl = await uploadPhoto(input.foto);
    }

    const { error: err } = await supabase.from('ocorrencias').insert({
      user_id: user.id,
      posto_id: input.posto_id || null,
      titulo: input.titulo,
      descricao: input.descricao,
      tipo: input.tipo,
      foto_url: fotoUrl,
    });

    if (err) return { error: err.message };

    await load();
    return { error: null };
  }

  async function updateEstado(id: string, estado: 'pendente' | 'em_analise' | 'resolvido'): Promise<{ error: string | null }> {
    const { error: err } = await supabase.from('ocorrencias').update({ estado }).eq('id', id);
    if (err) return { error: err.message };
    setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, estado, updated_at: new Date().toISOString() } : o));
    return { error: null };
  }

  return { ocorrencias, loading, error, create, updateEstado, reload: load };
}