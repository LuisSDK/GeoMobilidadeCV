import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as unknown as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Posto {
  id: string;
  nome: string;
  municipio: string;
  ilha: string;
  latitude: number;
  longitude: number;
  potencia_kw: number;
  tipo: 'publico' | 'privado';
  estado: 'ativo' | 'manutencao' | 'offline';
  operador: string | null;
  endereco: string | null;
  num_conectores: number;
  tipo_conector: string | null;
  horario: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Perfil {
  id: string;
  nome: string | null;
  email: string | null;
  role: 'admin' | 'utilizador';
  organizacao: string | null;
  created_at: string;
}
