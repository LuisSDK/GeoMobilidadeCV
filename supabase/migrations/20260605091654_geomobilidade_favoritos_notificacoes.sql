
/*
# GeoMobilidade — Favoritos e Notificações

## Novas Tabelas

### favoritos
Postos guardados pelo utilizador. Cada linha representa um posto
favorito de um utilizador autenticado.
- id, user_id (auth.uid()), posto_id, created_at
- UNIQUE(user_id, posto_id) — sem duplicados

### notificacoes
Notificações do sistema exibidas ao utilizador.
- id, titulo, mensagem, tipo (info|aviso|sucesso|erro)
- ilha (opcional — filtra por contexto geográfico)
- lida (booleano — marcada como lida por utilizador)
- created_at

## Segurança
- favoritos: owner-scoped (utilizador só vê/gere os seus)
- notificacoes: leitura para todos (anon + authenticated), write apenas autenticado
*/

-- ============================================================
-- FAVORITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  posto_id uuid NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, posto_id)
);

ALTER TABLE favoritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favoritos" ON favoritos;
CREATE POLICY "select_own_favoritos" ON favoritos FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favoritos" ON favoritos;
CREATE POLICY "insert_own_favoritos" ON favoritos FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favoritos" ON favoritos;
CREATE POLICY "delete_own_favoritos" ON favoritos FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICAÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info','aviso','sucesso','erro')),
  ilha text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_notificacoes" ON notificacoes;
CREATE POLICY "public_select_notificacoes" ON notificacoes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_notificacoes" ON notificacoes;
CREATE POLICY "auth_insert_notificacoes" ON notificacoes FOR INSERT
  TO authenticated WITH CHECK (true);

-- Mock notifications
INSERT INTO notificacoes (titulo, mensagem, tipo, ilha) VALUES
  ('Novo posto inaugurado em Mindelo', 'O Porto Grande recebeu 2 novos postos de 50kW. Capacidade total: 100kW.', 'sucesso', 'São Vicente'),
  ('Manutenção Tarrafal', 'O posto de Tarrafal encontra-se offline para manutenção preventiva. Previsão: 48h.', 'aviso', 'Santiago'),
  ('Expansão rede Sal', 'Aprovada instalação de 3 novos postos na ilha do Sal até Q4 2024.', 'info', 'Sal'),
  ('Posto São Filipe reativado', 'Após manutenção, o posto de São Filipe (Fogo) voltou à operação normal.', 'sucesso', 'Fogo'),
  ('Nova app GeoMobilidade CV v2.0', 'Portal atualizado com novas funcionalidades de geolocalização e rotas inteligentes.', 'info', null),
  ('Alerta: Posto Brava offline', 'O posto de Nova Sintra (Brava) encontra-se offline. Contactar TECV: +238 260 0000.', 'erro', 'Brava')
ON CONFLICT DO NOTHING;
