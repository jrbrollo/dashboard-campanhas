# 🧹 Limpeza de Duplicatas - Problema Resolvido

## 🎯 Problema Identificado

### **❌ Situação Anterior:**
- **Total de Leads**: 1000+ leads no banco
- **Leads Únicos**: Apenas 541 leads
- **Duplicatas**: 459 leads duplicados
- **Causa**: Constraint único não funcionava para leads com email/telefone vazios

### **✅ Solução Implementada:**
- **Script de Limpeza**: `scripts/clean-duplicates.cjs`
- **Método**: Remoção de duplicatas baseada em email + telefone
- **Resultado**: 541 leads únicos no banco

## 🔧 Scripts Criados

### 1. **clean-duplicates.cjs**
```bash
node scripts/clean-duplicates.cjs
```

**Funcionalidades:**
- Identifica duplicatas baseadas em email + telefone
- Remove todas as duplicatas
- Mantém apenas o lead mais recente de cada grupo
- Relatório detalhado do processo

### 2. **clean-duplicates.sql**
```sql
-- Execute no SQL Editor do Supabase
-- Script SQL para limpeza manual
```

**Funcionalidades:**
- Limpeza via SQL direto
- Análise antes e depois
- Verificação de duplicatas restantes

## 📊 Resultados da Limpeza

### **Antes da Limpeza:**
- **Total de Leads**: 1000
- **Leads Únicos**: 541
- **Duplicatas**: 459

### **Após a Limpeza:**
- **Total de Leads**: 541
- **Leads Únicos**: 541
- **Duplicatas**: 0

## 🔍 Como Funciona a Limpeza

### 1. **Identificação de Duplicatas**
```javascript
const key = `${lead.email || ''}|${lead.telefone || ''}`;
```
- Cria chave única baseada em email + telefone
- Trata valores vazios como string vazia

### 2. **Remoção de Duplicatas**
- Mantém apenas o lead mais recente de cada grupo
- Remove todos os outros leads duplicados
- Preserva dados originais em `raw_data`

### 3. **Reinserção de Dados**
- Insere apenas leads únicos
- Mantém integridade dos dados
- Preserva relacionamentos

## 🛡️ Prevenção de Duplicatas

### **Constraint Único Atualizado**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_email_telefone_unique 
ON leads(email, telefone) 
WHERE email IS NOT NULL AND telefone IS NOT NULL AND email != '' AND telefone != '';
```

### **Upsert no Upload**
```javascript
const { error } = await supabase
  .from('leads')
  .upsert(mappedLeads, { 
    onConflict: 'email,telefone',
    ignoreDuplicates: false 
  })
```

## 🚀 Como Usar

### **Limpeza Automática:**
```bash
cd dashboard-online
node scripts/clean-duplicates.cjs
```

### **Limpeza Manual (SQL):**
1. Acesse o SQL Editor do Supabase
2. Execute o script `clean-duplicates.sql`
3. Verifique os resultados

### **Verificação de Duplicatas:**
```sql
SELECT 
  email, 
  telefone, 
  COUNT(*) as count 
FROM leads 
GROUP BY email, telefone 
HAVING COUNT(*) > 1 
ORDER BY count DESC;
```

## 📈 Benefícios da Limpeza

### 1. **Precisão dos Dados**
- Números corretos de leads
- Cálculos precisos de conversão
- Métricas confiáveis

### 2. **Performance**
- Menos dados para processar
- Consultas mais rápidas
- Interface mais responsiva

### 3. **Integridade**
- Dados únicos e consistentes
- Relatórios precisos
- Análises confiáveis

## 🔄 Manutenção Contínua

### **Verificação Regular:**
```bash
# Verificar duplicatas
node scripts/clean-duplicates.cjs
```

### **Monitoramento:**
- Verificar total de leads periodicamente
- Comparar com dados originais
- Identificar padrões de duplicação

### **Prevenção:**
- Usar upsert no upload
- Validar dados antes de inserir
- Implementar constraints únicos

## 🛠️ Troubleshooting

### **Problema: Ainda há duplicatas**
- **Causa**: Constraint único não funciona para emails vazios
- **Solução**: Execute o script de limpeza novamente

### **Problema: Dados perdidos**
- **Causa**: Script removeu leads incorretos
- **Solução**: Restaure backup ou re-upload do CSV

### **Problema: Performance lenta**
- **Causa**: Muitos dados para processar
- **Solução**: Execute limpeza regular

## 📞 Suporte

Se encontrar problemas:
1. Verifique o console do script
2. Confirme se o Supabase está configurado
3. Execute verificação de duplicatas
4. Consulte logs de erro

## 🔧 Personalização

### **Alterar Critério de Duplicata:**
```javascript
// Alterar chave de identificação
const key = `${lead.email || ''}|${lead.telefone || ''}|${lead.nome || ''}`;
```

### **Alterar Estratégia de Manutenção:**
```javascript
// Manter lead mais antigo ao invés do mais recente
ORDER BY created_at ASC
```

### **Adicionar Validações:**
```javascript
// Validar dados antes de processar
if (!lead.email && !lead.telefone) {
  console.warn('Lead sem email e telefone:', lead);
}
```

A limpeza foi concluída com sucesso! Agora a ferramenta deve mostrar o número correto de leads (541) na visão geral. 🎉
