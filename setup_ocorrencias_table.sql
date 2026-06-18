-- ============================================================
-- GeoMobilidade — Criar/Atualizar tabela de Ocorrências
-- Executar no SQL Editor do Supabase Dashboard
-- ============================================================

-- Adicionar coluna foto_url se não existir
ALTER TABLE ocorrencias ADD COLUMN IF NOT EXISTS foto_url text;

-- Criar tabela se não existir (já existente, apenas seguro)
CREATE TABLE IF NOT EXISTS ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  posto_id uuid REFERENCES postos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('avaria', 'sugestao', 'outro')),
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'em_analise', 'resolvido')),
  foto_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas e recriar
DROP POLICY IF EXISTS "select_own_ocorrencias" ON ocorrencias;
DROP POLICY IF EXISTS "admin_select_all_ocorrencias" ON ocorrencias;
DROP POLICY IF EXISTS "insert_own_ocorrencias" ON ocorrencias;
DROP POLICY IF EXISTS "admin_update_ocorrencias" ON ocorrencias;

-- Utilizador: vê as suas próprias ocorrências
CREATE POLICY "select_own_ocorrencias" ON ocorrencias FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admin: vê TODAS (incluindo de outros utilizadores)
CREATE POLICY "admin_select_all_ocorrencias" ON ocorrencias FOR SELECT
  TO authenticated USING (
    (SELECT role FROM perfis WHERE id = auth.uid()) = 'admin'
  );

-- Utilizador: insere apenas as suas
CREATE POLICY "insert_own_ocorrencias" ON ocorrencias FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin: atualiza qualquer ocorrência
CREATE POLICY "admin_update_ocorrencias" ON ocorrencias FOR UPDATE
  TO authenticated USING (
    (SELECT role FROM perfis WHERE id = auth.uid()) = 'admin'
  );

-- Bucket de storage para fotos (se não existir)
INSERT INTO storage.buckets (id, name, public) VALUES ('ocorrencias_fotos', 'ocorrencias_fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Política do storage: qualquer utilizador autenticado pode fazer upload
DROP POLICY IF EXISTS "upload_ocorrencias_fotos" ON storage.objects;
CREATE POLICY "upload_ocorrencias_fotos" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'ocorrencias_fotos');

-- Política do storage: qualquer um pode ver (público)
DROP POLICY IF EXISTS "select_ocorrencias_fotos" ON storage.objects;
CREATE POLICY "select_ocorrencias_fotos" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'ocorrencias_fotos');