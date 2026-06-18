/*
# GeoMobilidade — Registos de Ocorrências

## Nova Tabela

### ocorrencias
Registos de problemas reportados por utilizadores sobre postos de carregamento.
- id: identificador único
- user_id: referência a auth.users (quem reportou)
- posto_id: referência a postos (opcional — pode ser geral)
- titulo: título resumido da ocorrência
- descricao: descrição detalhada do problema
- tipo: 'avaria' | 'sugestao' | 'outro'
- estado: 'pendente' | 'em_analise' | 'resolvido' (apenas admin pode alterar)
- created_at: data do reporte
- updated_at: última atualização

## Segurança
- RLS ativado
- Utilizador: pode inserir e ver apenas as suas próprias ocorrências
- Admin: pode ver todas e alterar estado
*/

CREATE TABLE IF NOT EXISTS ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  posto_id uuid REFERENCES postos(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro' CHECK (tipo IN ('avaria', 'sugestao', 'outro')),
  estado text NOT NULL DEFAULT 'pendente' CHECK (estado IN ('pendente', 'em_analise', 'resolvido')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ocorrencias ENABLE ROW LEVEL SECURITY;

-- Utilizador pode ver as suas próprias ocorrências
DROP POLICY IF EXISTS "select_own_ocorrencias" ON ocorrencias;
CREATE POLICY "select_own_ocorrencias" ON ocorrencias FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Admin pode ver todas as ocorrências
DROP POLICY IF EXISTS "admin_select_all_ocorrencias" ON ocorrencias;
CREATE POLICY "admin_select_all_ocorrencias" ON ocorrencias FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
  );

-- Utilizador pode inserir as suas próprias ocorrências
DROP POLICY IF EXISTS "insert_own_ocorrencias" ON ocorrencias;
CREATE POLICY "insert_own_ocorrencias" ON ocorrencias FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admin pode atualizar qualquer ocorrência (para alterar estado)
DROP POLICY IF EXISTS "admin_update_ocorrencias" ON ocorrencias;
CREATE POLICY "admin_update_ocorrencias" ON ocorrencias FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_ocorrencias_user_id ON ocorrencias(user_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_estado ON ocorrencias(estado);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_posto_id ON ocorrencias(posto_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_ocorrencias_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ocorrencias_updated_at ON ocorrencias;
CREATE TRIGGER ocorrencias_updated_at
  BEFORE UPDATE ON ocorrencias
  FOR EACH ROW EXECUTE FUNCTION update_ocorrencias_updated_at();