-- Adicionar colunas para Outros Produtos na tabela campaign_data

-- Coluna para vendas de outros produtos
ALTER TABLE campaign_data 
ADD COLUMN IF NOT EXISTS vendas_outros integer DEFAULT 0;

-- Coluna para faturamento de outros produtos
ALTER TABLE campaign_data 
ADD COLUMN IF NOT EXISTS faturamento_outros numeric DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN campaign_data.vendas_outros IS 'Quantidade de vendas de outros produtos (não Planejamento, Seguros ou Crédito)';
COMMENT ON COLUMN campaign_data.faturamento_outros IS 'Faturamento total de outros produtos';
