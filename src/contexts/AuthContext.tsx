import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type Perfil } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: 'admin' | 'utilizador' | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPerfil(userId: string, email?: string, user_metadata?: any) {
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      if (email === 'admin@geomobilidade.cv' && data.role !== 'admin') {
        const { data: updated } = await supabase
          .from('perfis')
          .update({ role: 'admin' })
          .eq('id', userId)
          .select('*')
          .single();
        setPerfil(updated || data);
        return updated || data;
      }
      setPerfil(data);
      return data;
    }

    if (!email) {
      setPerfil(null);
      return null;
    }

    const role = email === 'admin@geomobilidade.cv' ? 'admin' : 'utilizador';
    const nome = user_metadata?.nome ?? email.split('@')[0];
    const organizacao = role === 'admin' ? 'NOSi EPE' : 'Cidadão';

    const { data: inserted } = await supabase
      .from('perfis')
      .insert({ id: userId, email, nome, role, organizacao })
      .select('*')
      .single();

    setPerfil(inserted || null);
    return inserted || null;
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadPerfil(session.user.id, session.user.email ?? undefined, session.user.user_metadata ?? undefined);
      } else {
        setPerfil(null);
      }
      setLoading(false);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      (async () => {
        setLoading(true);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadPerfil(session.user.id, session.user.email ?? undefined, session.user.user_metadata ?? undefined);
        } else {
          setPerfil(null);
        }
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, role: null };

    const session = data.session;
    if (session?.user) {
      setSession(session);
      setUser(session.user);
      const perfilData = await loadPerfil(session.user.id, session.user.email ?? undefined, session.user.user_metadata ?? undefined);
      setLoading(false);
      return { error: null, role: perfilData?.role ?? (email === 'admin@geomobilidade.cv' ? 'admin' : 'utilizador') };
    }

    return { error: null, role: null };
  }

  async function signUp(email: string, password: string, nome: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const isAdmin = perfil?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, session, perfil, loading, signIn, signUp, signOut, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
