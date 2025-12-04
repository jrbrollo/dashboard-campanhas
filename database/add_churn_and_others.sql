-- Adicionar colunas para Churn e Outros Produtos na tabela leads

-- Coluna para valor do Churn (monetário)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS churn_value numeric DEFAULT 0;

-- Coluna para data do Churn
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS churn_date timestamp with time zone;

-- Coluna para valor de Outros Produtos
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS venda_outros numeric DEFAULT 0;

-- Comentários para documentação
COMMENT ON COLUMN leads.churn_value IS 'Valor monetário do churn (perda de receita)';
COMMENT ON COLUMN leads.churn_date IS 'Data em que o churn ocorreu';
COMMENT ON COLUMN leads.venda_outros IS 'Valor de vendas de outros produtos (não Planejamento, Seguros ou Crédito)';
