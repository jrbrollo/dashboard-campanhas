# 📊 Valores Fixos da Campanha - Guia Atualizado

## 🎯 Mudanças Implementadas

### ✅ 1. Valores Fixos da Campanha
- **LTV**: R$ 8.723,24 (valor fixo)
- **Margem Bruta**: 58,72% (valor fixo)
- **Benefício**: Não precisam mais ser inseridos manualmente

### ✅ 2. Verba Gasta como Valor Global
- **Problema**: Verba gasta era interpretada por linha
- **Solução**: Valor global extraído do CSV
- **Resultado**: Verba gasta correta para toda a campanha

### ✅ 3. Template CSV Otimizado
- **Removido**: Campos `ltv` e `margem_bruta`
- **Mantido**: Campos dinâmicos (verba_gasta, vendas_efetuadas, etc.)
- **Resultado**: CSV mais limpo e focado

## 📋 Novo Template de CSV

```csv
nome,email,telefone,renda,qual_sua_renda_mensal,data_da_venda,venda_efetuada,venda,adset_name,ad_name,campaign,platform,created_time,verba_gasta,vendas_efetuadas,faturamento_total,churn_rate,reunioes_agendadas,reunioes_realizadas
João Silva,joao@email.com,11999999999,r$3000_a_r$5999,r$3000_a_r$5999,2024-01-15,Sim,1500,Adset A,Ad 1,Campanha Teste,Facebook,2024-01-10 10:30:00,5000,10,15000,5,20,15
Maria Santos,maria@email.com,11888888888,r$6000_a_r$9999,r$6000_a_r$9999,2024-01-16,Sim,2000,Adset B,Ad 2,Campanha Teste,Google,2024-01-11 14:20:00,5000,10,15000,5,20,15
```

## 🔧 Como Funciona Agora

### 1. Upload de CSV
- **Leads**: Salvos individualmente com upsert
- **Dados Manuais**: Extraídos do primeiro lead que tenha esses campos
- **Valores Fixos**: Aplicados automaticamente (LTV e Margem Bruta)

### 2. Cálculos Automáticos
- **LTGP**: LTV × Margem Bruta = R$ 8.723,24 × 58,72% = R$ 5.120,00
- **CAC**: Verba Gasta ÷ Vendas Efetuadas
- **LTGP/CAC**: LTGP ÷ CAC

### 3. Interface Simplificada
- **Removido**: Campos LTV e Margem Bruta
- **Mantido**: Verba Gasta, Vendas, Faturamento, Churn, Reuniões
- **Resultado**: Interface mais limpa e focada

## 📊 Campos Suportados

### Campos de Leads (por linha)
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

### Campos Manuais da Campanha (valor global)
- `verba_gasta` - Verba total gasta na campanha
- `vendas_efetuadas` - Número total de vendas
- `faturamento_total` - Faturamento total
- `churn_rate` - Taxa de churn (%)
- `reunioes_agendadas` - Reuniões agendadas
- `reunioes_realizadas` - Reuniões realizadas

## 🚀 Como Usar

### Opção 1: Upload via Interface Web
1. Acesse `http://localhost:5173`
2. Faça upload do CSV com campos manuais
3. Dados são salvos automaticamente no Supabase

### Opção 2: Upload Direto via Script
```bash
cd dashboard-online
node scripts/upload-to-supabase.js ../data/leads.csv
```

### Opção 3: Upload via Supabase Dashboard
1. Acesse seu projeto Supabase
2. Vá em "Table Editor" → "leads"
3. Use "Import" para fazer upload do CSV

## 💡 Benefícios das Mudanças

### 1. **Simplicidade**
- Menos campos para preencher
- Valores fixos aplicados automaticamente
- Interface mais limpa

### 2. **Precisão**
- Verba gasta como valor global
- Cálculos corretos de LTGP/CAC
- Dados consistentes

### 3. **Eficiência**
- Upload mais rápido
- Menos erros de digitação
- Processo automatizado

### 4. **Flexibilidade**
- Suporta diferentes formatos de CSV
- Valores fixos facilmente alteráveis no código
- Fácil manutenção

## 🔄 Fluxo de Dados Atualizado

1. **Upload CSV** → Parse e validação
2. **Mapeamento** → Conversão para formato Supabase
3. **Upsert Leads** → Inserção/atualização de leads
4. **Extração Manual** → Dados manuais extraídos (valor global)
5. **Valores Fixos** → LTV e Margem Bruta aplicados automaticamente
6. **Salvamento** → Dados salvos no Supabase
7. **Interface** → Dados carregados no dashboard

## 📈 Cálculos Automáticos

### LTGP (Lifetime Gross Profit)
```
LTGP = LTV × Margem Bruta
LTGP = R$ 8.723,24 × 58,72% = R$ 5.120,00
```

### CAC (Customer Acquisition Cost)
```
CAC = Verba Gasta ÷ Vendas Efetuadas
```

### LTGP/CAC
```
LTGP/CAC = LTGP ÷ CAC
```

## 🛠️ Troubleshooting

### Problema: Verba gasta incorreta
- **Causa**: Valor por linha ao invés de global
- **Solução**: Use o template atualizado

### Problema: LTV/Margem Bruta não aparecem
- **Causa**: Valores fixos não aplicados
- **Solução**: Recarregue a página

### Problema: Cálculos incorretos
- **Causa**: Valores antigos em cache
- **Solução**: Limpe o cache do navegador

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do navegador
2. Confirme se o Supabase está configurado
3. Use o template de CSV atualizado
4. Verifique se os valores fixos estão corretos

## 🔧 Alterando Valores Fixos

Para alterar LTV ou Margem Bruta, edite os arquivos:
- `src/components/Dashboard.tsx` (linhas 249-250)
- `src/hooks/useDataManager.ts` (linhas 110-111)
- `src/services/dataService.ts` (linhas 80-81)
- `scripts/upload-to-supabase.js` (linhas 97-98)
