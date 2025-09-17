# 📊 Guia de Upload de Dados para Supabase

## 🎯 Problemas Resolvidos

### ✅ 1. Duplicação de Leads
- **Problema**: Leads duplicados ao fazer upload múltiplas vezes
- **Solução**: Implementado `upsert` baseado em `email + telefone`
- **Resultado**: Leads únicos garantidos, atualizações automáticas

### ✅ 2. Upload Direto no Supabase
- **Script**: `scripts/upload-to-supabase.js`
- **Uso**: `node upload-to-supabase.js <caminho-do-csv>`
- **Benefício**: Upload direto sem interface web

### ✅ 3. Dados Manuais no CSV
- **Template**: `templates/csv-template-with-manual-fields.csv`
- **Campos**: LTV, Margem Bruta, Verba Gasta, etc.
- **Resultado**: Dados manuais salvos automaticamente

## 🚀 Como Usar

### Opção 1: Upload via Interface Web
1. Acesse `http://localhost:5173`
2. Faça upload do CSV com campos manuais
3. Dados são salvos automaticamente no Supabase

### Opção 2: Upload Direto via Script
```bash
# Navegar para o diretório
cd dashboard-online

# Instalar dependências (se necessário)
npm install

# Fazer upload do CSV
node scripts/upload-to-supabase.js ../data/leads.csv
```

### Opção 3: Upload via Supabase Dashboard
1. Acesse seu projeto Supabase
2. Vá em "Table Editor" → "leads"
3. Use "Import" para fazer upload do CSV

## 📋 Template de CSV

Use o template `templates/csv-template-with-manual-fields.csv`:

```csv
nome,email,telefone,renda,qual_sua_renda_mensal,data_da_venda,venda_efetuada,venda,adset_name,ad_name,campaign,platform,created_time,ltv,margem_bruta,verba_gasta,vendas_efetuadas,faturamento_total,churn_rate,reunioes_agendadas,reunioes_realizadas
João Silva,joao@email.com,11999999999,r$3000_a_r$5999,r$3000_a_r$5999,2024-01-15,Sim,1500,Adset A,Ad 1,Campanha Teste,Facebook,2024-01-10 10:30:00,1000,30,5000,10,15000,5,20,15
```

## 🔧 Configuração do Banco

### 1. Executar Script de Constraint Único
Execute no SQL Editor do Supabase:

```sql
-- Criar índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_telefone_unique 
ON leads(email, telefone) 
WHERE email IS NOT NULL AND telefone IS NOT NULL AND email != '' AND telefone != '';
```

### 2. Verificar Estrutura
```sql
-- Verificar colunas da tabela leads
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leads' 
ORDER BY ordinal_position;
```

## 📊 Campos Suportados

### Campos de Leads
- `nome` / `nome_completo`
- `email`
- `telefone`
- `renda`
- `qual_sua_renda_mensal` / `qual_sua_renda_mensal?`
- `data_da_venda` / `Data_da_venda`
- `venda_efetuada` / `Venda_efetuada`
- `venda` / `Venda`
- `sale` / `Sale`
- `adset_name` / `adset`
- `ad_name` / `ad`
- `campaign`
- `platform`
- `created_time`

### Campos Manuais da Campanha
- `ltv`
- `margem_bruta`
- `verba_gasta`
- `vendas_efetuadas`
- `faturamento_total`
- `churn_rate`
- `reunioes_agendadas`
- `reunioes_realizadas`

## 🛠️ Troubleshooting

### Erro: "Duplicate key value violates unique constraint"
- **Causa**: Lead já existe com mesmo email + telefone
- **Solução**: O sistema atualiza automaticamente (upsert)

### Erro: "Column does not exist"
- **Causa**: Nome de coluna incorreto no CSV
- **Solução**: Use o template fornecido ou verifique nomes das colunas

### Erro: "Failed to load resource: 400/406"
- **Causa**: Problema com mapeamento de colunas
- **Solução**: Verifique se o CSV segue o template

## 📈 Benefícios

1. **Sem Duplicatas**: Leads únicos garantidos
2. **Atualizações Automáticas**: Dados são atualizados, não duplicados
3. **Dados Manuais Integrados**: Campos manuais salvos automaticamente
4. **Flexibilidade**: Suporta diferentes formatos de CSV
5. **Backup**: Dados originais preservados em `raw_data`

## 🔄 Fluxo de Dados

1. **Upload CSV** → Parse e validação
2. **Mapeamento** → Conversão para formato Supabase
3. **Upsert** → Inserção/atualização no banco
4. **Extração Manual** → Dados manuais extraídos e salvos
5. **Interface** → Dados carregados no dashboard

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador
2. Confirme se o Supabase está configurado
3. Use o template de CSV fornecido
4. Execute o script de constraint único
