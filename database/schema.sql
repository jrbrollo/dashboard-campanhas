-- Schema do banco de dados para o Dashboard de Campanhas
-- Execute este script no SQL Editor do Supabase

-- Tabela para armazenar os leads (dados CSV)
CREATE TABLE IF NOT EXISTS leads (
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
  
  -- Campos dinâmicos (JSON para flexibilidade)
  raw_data JSONB,
  
  -- Índices para performance
  CONSTRAINT leads_email_check CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Tabela para dados da campanha (dados manuais)
CREATE TABLE IF NOT EXISTS campaign_data (
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
  
  -- Métricas de reuniões (futuro)
  reunioes_agendadas INTEGER DEFAULT 0,
  reunioes_realizadas INTEGER DEFAULT 0,
  
  -- Metadados
  campaign_name TEXT,
  notes TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_adset ON leads(adset_name) WHERE adset_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_platform ON leads(platform) WHERE platform IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_renda ON leads(qual_sua_renda_mensal) WHERE qual_sua_renda_mensal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_venda ON leads(venda_efetuada) WHERE venda_efetuada IS NOT NULL;

-- Índice para busca em dados brutos
CREATE INDEX IF NOT EXISTS idx_leads_raw_data ON leads USING GIN(raw_data);

-- Índice para dados da campanha
CREATE INDEX IF NOT EXISTS idx_campaign_data_updated_at ON campaign_data(updated_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at na tabela campaign_data
CREATE TRIGGER update_campaign_data_updated_at 
    BEFORE UPDATE ON campaign_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de RLS (Row Level Security)
-- Habilitar RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_data ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas as operações (ajuste conforme necessário)
CREATE POLICY "Allow all operations on leads" ON leads
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on campaign_data" ON campaign_data
    FOR ALL USING (true);

-- Comentários para documentação
COMMENT ON TABLE leads IS 'Tabela para armazenar dados de leads importados via CSV';
COMMENT ON TABLE campaign_data IS 'Tabela para armazenar dados manuais da campanha';

COMMENT ON COLUMN leads.raw_data IS 'Dados brutos do CSV em formato JSON para flexibilidade';
COMMENT ON COLUMN campaign_data.ltv IS 'Lifetime Value do cliente';
COMMENT ON COLUMN campaign_data.margem_bruta IS 'Margem bruta em percentual';
COMMENT ON COLUMN campaign_data.verba_gasta IS 'Verba total gasta na campanha';
COMMENT ON COLUMN campaign_data.vendas_efetuadas IS 'Número total de vendas efetuadas';
COMMENT ON COLUMN campaign_data.faturamento_total IS 'Faturamento total da campanha';
COMMENT ON COLUMN campaign_data.churn_rate IS 'Taxa de churn em percentual';
