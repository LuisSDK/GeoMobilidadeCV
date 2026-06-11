import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return; }
    setLoading(true);
    supabase.from('favoritos').select('posto_id').eq('user_id', user.id)
      .then(({ data }) => {
        setFavoriteIds(new Set(data?.map(f => f.posto_id) || []));
        setLoading(false);
      });
  }, [user?.id]);

  const toggle = useCallback(async (postoId: string) => {
    if (!user) return;
    const isFav = favoriteIds.has(postoId);
    // Optimistic update
    setFavoriteIds(prev => {
      const next = new Set(prev);
      isFav ? next.delete(postoId) : next.add(postoId);
      return next;
    });
    if (isFav) {
      await supabase.from('favoritos').delete().eq('user_id', user.id).eq('posto_id', postoId);
    } else {
      await supabase.from('favoritos').insert({ user_id: user.id, posto_id: postoId });
    }
  }, [user, favoriteIds]);

  const isFavorite = useCallback((id: string) => favoriteIds.has(id), [favoriteIds]);

  return { favoriteIds, isFavorite, toggle, loading };
}
