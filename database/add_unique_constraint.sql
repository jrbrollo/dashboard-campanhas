-- Script para adicionar constraint único para evitar duplicatas de leads
-- Execute este script no SQL Editor do Supabase

-- Criar índice único para evitar duplicatas baseado em email + telefone
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_telefone_unique 
ON leads(email, telefone) 
WHERE email IS NOT NULL AND telefone IS NOT NULL AND email != '' AND telefone != '';

-- Comentário para documentação
COMMENT ON INDEX idx_leads_email_telefone_unique IS 'Índice único para evitar duplicatas de leads baseado em email e telefone';

-- Verificar se o índice foi criado
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' 
AND indexname = 'idx_leads_email_telefone_unique';
