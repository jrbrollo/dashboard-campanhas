-- Script para limpar duplicatas de leads
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar duplicatas antes da limpeza
SELECT 
  'Antes da limpeza' as status,
  COUNT(*) as total_leads,
  COUNT(DISTINCT CONCAT(COALESCE(email, ''), '|', COALESCE(telefone, ''))) as leads_unicos
FROM leads;

-- 2. Criar tabela temporária com leads únicos
CREATE TEMP TABLE leads_unicos AS
SELECT DISTINCT ON (COALESCE(email, ''), COALESCE(telefone, ''))
  id,
  created_at,
  nome,
  email,
  telefone,
  renda,
  qual_sua_renda_mensal,
  data_da_venda,
  venda_efetuada,
  venda,
  sale,
  sale_efetuada,
  adset_name,
  adset,
  ad_name,
  ad,
  campaign,
  platform,
  created_time,
  raw_data
FROM leads
ORDER BY COALESCE(email, ''), COALESCE(telefone, ''), created_at DESC;

-- 3. Limpar tabela original
DELETE FROM leads;

-- 4. Inserir leads únicos de volta
INSERT INTO leads (
  id, created_at, nome, email, telefone, renda, qual_sua_renda_mensal,
  data_da_venda, venda_efetuada, venda, sale, sale_efetuada,
  adset_name, adset, ad_name, ad, campaign, platform, created_time, raw_data
)
SELECT 
  id, created_at, nome, email, telefone, renda, qual_sua_renda_mensal,
  data_da_venda, venda_efetuada, venda, sale, sale_efetuada,
  adset_name, adset, ad_name, ad, campaign, platform, created_time, raw_data
FROM leads_unicos;

-- 5. Verificar resultado
SELECT 
  'Após limpeza' as status,
  COUNT(*) as total_leads,
  COUNT(DISTINCT CONCAT(COALESCE(email, ''), '|', COALESCE(telefone, ''))) as leads_unicos
FROM leads;

-- 6. Verificar se ainda há duplicatas
SELECT 
  email, 
  telefone, 
  COUNT(*) as count 
FROM leads 
GROUP BY email, telefone 
HAVING COUNT(*) > 1 
ORDER BY count DESC 
LIMIT 10;
