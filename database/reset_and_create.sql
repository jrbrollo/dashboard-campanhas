-- Script para limpar e recriar as tabelas (use se houver conflitos)
-- Execute este script no SQL Editor do Supabase

-- 1. Remover tabelas existentes (se existirem)
DROP TABLE IF EXISTS campaign_data CASCADE;
DROP TABLE IF EXISTS leads CASCADE;

-- 2. Remover função se existir
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. Criar tabela leads
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Campos básicos do lead
  nome TEXT,
  email TEXT,
  telefone TEXT,
  renda TEXT,
  qual_sua_renda_mensal TEXT,
  
  -- Dados de venda
  data_da_venda TEXT,
  venda_efetuada TEXT,
  venda TEXT,
  sale TEXT,
  sale_efetuada TEXT,
  
  -- Metadados da campanha
  adset_name TEXT,
  adset TEXT,
  ad_name TEXT,
  ad TEXT,
  campaign TEXT,
  platform TEXT,
  created_time TEXT,
  
  -- Campos dinâmicos
  raw_data JSONB
);

-- 4. Criar tabela campaign_data
CREATE TABLE campaign_data (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Métricas financeiras
  ltv DECIMAL(10,2) DEFAULT 0,
  margem_bruta DECIMAL(5,2) DEFAULT 0,
  verba_gasta DECIMAL(12,2) DEFAULT 0,
  vendas_efetuadas INTEGER DEFAULT 0,
  faturamento_total DECIMAL(12,2) DEFAULT 0,
  churn_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Métricas de reuniões
  reunioes_agendadas INTEGER DEFAULT 0,
  reunioes_realizadas INTEGER DEFAULT 0,
  
  -- Metadados
  campaign_name TEXT,
  notes TEXT
);

-- 5. Criar índices
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_adset ON leads(adset_name) WHERE adset_name IS NOT NULL;
CREATE INDEX idx_leads_platform ON leads(platform) WHERE platform IS NOT NULL;
CREATE INDEX idx_leads_renda ON leads(qual_sua_renda_mensal) WHERE qual_sua_renda_mensal IS NOT NULL;
CREATE INDEX idx_leads_venda ON leads(venda_efetuada) WHERE venda_efetuada IS NOT NULL;
CREATE INDEX idx_leads_raw_data ON leads USING GIN(raw_data);
CREATE INDEX idx_campaign_data_updated_at ON campaign_data(updated_at DESC);

-- 6. Criar função para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Criar trigger
CREATE TRIGGER update_campaign_data_updated_at 
    BEFORE UPDATE ON campaign_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Configurar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_data ENABLE ROW LEVEL SECURITY;

-- 9. Criar políticas
CREATE POLICY "Allow all operations on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all operations on campaign_data" ON campaign_data FOR ALL USING (true);

-- 10. Adicionar comentários
COMMENT ON TABLE leads IS 'Tabela para armazenar dados de leads importados via CSV';
COMMENT ON TABLE campaign_data IS 'Tabela para armazenar dados manuais da campanha';
