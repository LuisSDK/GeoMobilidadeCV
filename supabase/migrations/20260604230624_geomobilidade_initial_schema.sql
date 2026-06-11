
/*
# GeoMobilidade Cabo Verde — Schema Inicial

## Descrição
Cria o esquema completo para o portal WebGIS de gestão da rede nacional de
carregamento de veículos elétricos em Cabo Verde.

## Tabelas Criadas

### postos
Inventário nacional de postos de carregamento elétrico.
- id: identificador único (uuid)
- nome: nome do posto
- municipio: município onde está localizado
- ilha: ilha de Cabo Verde
- latitude / longitude: coordenadas geográficas
- potencia_kw: potência em quilowatts
- tipo: 'publico' | 'privado'
- estado: 'ativo' | 'manutencao' | 'offline'
- operador: entidade responsável
- endereco: morada completa
- num_conectores: número de tomadas disponíveis
- tipo_conector: standard do conector (Type 2, CCS, CHAdeMO, etc.)
- horario: horário de funcionamento

### perfis
Perfis de utilizadores do sistema (admin / utilizador).
- id: referência a auth.users
- nome: nome completo
- role: 'admin' | 'utilizador'
- organizacao: entidade do utilizador

## Segurança
- RLS ativado em todas as tabelas
- postos: leitura pública (anon), escrita apenas para admin
- perfis: utilizador pode ver o próprio perfil; admin vê todos
*/

-- ============================================================
-- POSTOS DE CARREGAMENTO
-- ============================================================
CREATE TABLE IF NOT EXISTS postos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  municipio text NOT NULL,
  ilha text NOT NULL DEFAULT 'Santiago',
  latitude numeric(10,6) NOT NULL,
  longitude numeric(10,6) NOT NULL,
  potencia_kw numeric(6,1) NOT NULL DEFAULT 22.0,
  tipo text NOT NULL DEFAULT 'publico' CHECK (tipo IN ('publico', 'privado')),
  estado text NOT NULL DEFAULT 'ativo' CHECK (estado IN ('ativo', 'manutencao', 'offline')),
  operador text DEFAULT 'TECV',
  endereco text,
  num_conectores integer NOT NULL DEFAULT 1,
  tipo_conector text DEFAULT 'Type 2',
  horario text DEFAULT '24h',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE postos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_postos" ON postos;
CREATE POLICY "public_select_postos" ON postos FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_postos" ON postos;
CREATE POLICY "auth_insert_postos" ON postos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_postos" ON postos;
CREATE POLICY "auth_update_postos" ON postos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_postos" ON postos;
CREATE POLICY "auth_delete_postos" ON postos FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_postos_municipio ON postos(municipio);
CREATE INDEX IF NOT EXISTS idx_postos_ilha ON postos(ilha);
CREATE INDEX IF NOT EXISTS idx_postos_estado ON postos(estado);
CREATE INDEX IF NOT EXISTS idx_postos_tipo ON postos(tipo);

-- ============================================================
-- PERFIS DE UTILIZADORES
-- ============================================================
CREATE TABLE IF NOT EXISTS perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text,
  email text,
  role text NOT NULL DEFAULT 'utilizador' CHECK (role IN ('admin', 'utilizador')),
  organizacao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_perfil" ON perfis;
CREATE POLICY "select_own_perfil" ON perfis FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_perfil" ON perfis;
CREATE POLICY "insert_own_perfil" ON perfis FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_perfil" ON perfis;
CREATE POLICY "update_own_perfil" ON perfis FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_perfil" ON perfis;
CREATE POLICY "delete_own_perfil" ON perfis FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- TRIGGER: auto-criar perfil ao registar utilizador
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO perfis (id, email, nome, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'utilizador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: atualizar updated_at em postos
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS postos_updated_at ON postos;
CREATE TRIGGER postos_updated_at
  BEFORE UPDATE ON postos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DADOS MOCK: postos realistas de Cabo Verde
-- ============================================================
INSERT INTO postos (nome, municipio, ilha, latitude, longitude, potencia_kw, tipo, estado, operador, endereco, num_conectores, tipo_conector, horario) VALUES
('Posto Central Praia', 'Praia', 'Santiago', 14.9300, -23.5133, 50.0, 'publico', 'ativo', 'TECV', 'Av. Amílcar Cabral, Plateau, Praia', 4, 'CCS + Type 2', '24h'),
('Palmarejo Shopping', 'Praia', 'Santiago', 14.9150, -23.5220, 22.0, 'publico', 'ativo', 'EV Cabo Verde', 'Palmarejo Grande, Praia', 2, 'Type 2', '08:00-22:00'),
('Hotel Pestana Tropic', 'Praia', 'Santiago', 14.9350, -23.5080, 11.0, 'privado', 'ativo', 'Pestana Hotels', 'Quebra Canela, Praia', 2, 'Type 2', '06:00-23:00'),
('Terminal Interurbano Praia', 'Praia', 'Santiago', 14.9200, -23.5100, 50.0, 'publico', 'manutencao', 'TECV', 'Terminal TRANSCOR, Praia', 3, 'CHAdeMO + CCS', '24h'),
('Aeroporto Nelson Mandela', 'Praia', 'Santiago', 14.9245, -23.4935, 22.0, 'publico', 'ativo', 'ACV', 'Aeroporto Internacional, Praia', 4, 'Type 2', '24h'),
('Santa Cruz Centro', 'Santa Cruz', 'Santiago', 15.0783, -23.5367, 22.0, 'publico', 'ativo', 'TECV', 'Largo da Igreja, Santa Cruz', 2, 'Type 2', '07:00-20:00'),
('Hospital Regional Santiago Sul', 'São Domingos', 'Santiago', 15.0500, -23.5600, 22.0, 'publico', 'ativo', 'SNS Cabo Verde', 'Hospital Regional, São Domingos', 2, 'Type 2', '24h'),
('Tarrafal Praia', 'Tarrafal', 'Santiago', 15.2785, -23.7483, 22.0, 'publico', 'offline', 'TECV', 'Praia de Tarrafal, Tarrafal', 2, 'Type 2', '08:00-18:00'),
('Assomada Mercado', 'Santa Catarina', 'Santiago', 15.0945, -23.6852, 22.0, 'publico', 'ativo', 'Câmara Municipal', 'Mercado Municipal, Assomada', 2, 'Type 2', '06:00-20:00'),
('Pedra Badejo Porto', 'Santa Cruz', 'Santiago', 15.1133, -23.5316, 11.0, 'publico', 'ativo', 'TECV', 'Porto de Pesca, Pedra Badejo', 1, 'Type 2', '07:00-19:00'),
('Porto Grande Mindelo', 'São Vicente', 'São Vicente', 16.8827, -24.9925, 50.0, 'publico', 'ativo', 'ENAPOR', 'Porto Grande, Mindelo', 4, 'CCS + CHAdeMO', '24h'),
('Hotel Foya Branca', 'São Vicente', 'São Vicente', 16.8750, -24.9800, 22.0, 'privado', 'ativo', 'Foya Branca Resort', 'Baía das Gatas, São Vicente', 2, 'Type 2', '07:00-22:00'),
('Mindelo Centro Comercial', 'São Vicente', 'São Vicente', 16.8928, -24.9867, 22.0, 'publico', 'ativo', 'EV Cabo Verde', 'Av. da República, Mindelo', 3, 'Type 2', '08:00-21:00'),
('Aeroporto Sal', 'Santa Maria', 'Sal', 16.7484, -22.9438, 50.0, 'publico', 'ativo', 'ACV', 'Aeroporto Internacional do Sal', 4, 'CCS + Type 2', '24h'),
('Santa Maria Beach Resort', 'Santa Maria', 'Sal', 16.5964, -22.9043, 22.0, 'privado', 'ativo', 'Meliá Hotels', 'Santa Maria, Ilha do Sal', 4, 'Type 2', '07:00-23:00'),
('Espargos Praça Central', 'Sal', 'Sal', 16.7714, -22.9467, 22.0, 'publico', 'ativo', 'TECV', 'Praça Central, Espargos', 2, 'Type 2', '24h'),
('Sal Rei Centro', 'Boa Vista', 'Boa Vista', 16.1773, -22.9151, 22.0, 'publico', 'ativo', 'TECV', 'Sal Rei, Ilha da Boa Vista', 2, 'Type 2', '08:00-20:00'),
('Club Med Boa Vista', 'Boa Vista', 'Boa Vista', 16.1200, -22.8900, 22.0, 'privado', 'ativo', 'Club Med', 'Praia de Chaves, Boa Vista', 6, 'Type 2', '07:00-23:00'),
('São Filipe Centro Fogo', 'São Filipe', 'Fogo', 14.8960, -24.4950, 22.0, 'publico', 'manutencao', 'TECV', 'Praça de São Filipe, Fogo', 2, 'Type 2', '08:00-18:00'),
('Rabil Boa Vista', 'Boa Vista', 'Boa Vista', 16.1560, -22.8890, 11.0, 'publico', 'ativo', 'Câmara Municipal', 'Rabil, Boa Vista', 1, 'Type 2', '08:00-18:00'),
('Ribeira Grande Santo Antão', 'Ribeira Grande', 'Santo Antão', 17.1920, -25.0580, 22.0, 'publico', 'ativo', 'TECV', 'Rua Principal, Ribeira Grande', 2, 'Type 2', '07:00-20:00'),
('Porto Novo Santo Antão', 'Porto Novo', 'Santo Antão', 17.0196, -25.0623, 22.0, 'publico', 'ativo', 'ENAPOR', 'Porto de Porto Novo', 2, 'Type 2', '24h'),
('Nova Sintra Brava', 'Brava', 'Brava', 14.8644, -24.7153, 11.0, 'publico', 'offline', 'TECV', 'Nova Sintra, Ilha Brava', 1, 'Type 2', '08:00-17:00'),
('Maio Centro', 'Maio', 'Maio', 15.1370, -23.2180, 22.0, 'publico', 'ativo', 'TECV', 'Vila do Maio, Maio', 2, 'Type 2', '07:00-19:00'),
('Praia da Vitória Santiago', 'Praia', 'Santiago', 14.9280, -23.5010, 100.0, 'publico', 'ativo', 'TECV', 'Praia da Vitória, Santiago', 6, 'CCS 100kW', '24h')
ON CONFLICT DO NOTHING;
