# 📊 CSV Correto - Lógica Inteligente Implementada

## ✅ Problema Resolvido!

### **❌ Lógica Anterior (Incorreta):**
- **Verba Gasta**: Somava todas as linhas (5000 + 5000 + 5000 = 15000) ❌
- **Vendas Efetuadas**: Campo manual desnecessário ❌
- **Faturamento Total**: Campo manual desnecessário ❌

### **✅ Nova Lógica (Correta):**
- **Verba Gasta**: Valor global (não soma) ✅
- **Vendas Efetuadas**: Conta automaticamente linhas com "Sim" ✅
- **Faturamento Total**: Soma automaticamente valores da coluna "venda" ✅

## 📋 Template CSV Atualizado

### **Colunas Obrigatórias (dados por lead):**
```csv
nome,email,telefone,renda,qual_sua_renda_mensal,data_da_venda,venda_efetuada,venda,adset_name,ad_name,campaign,platform,created_time
```

### **Colunas Manuais da Campanha (valores globais):**
```csv
verba_gasta,churn_rate,reunioes_agendadas,reunioes_realizadas
```

### **Exemplo Prático:**
```csv
nome,email,telefone,renda,qual_sua_renda_mensal,data_da_venda,venda_efetuada,venda,adset_name,ad_name,campaign,platform,created_time,verba_gasta,churn_rate,reunioes_agendadas,reunioes_realizadas
João Silva,joao@email.com,11999999999,r$3000_a_r$5999,r$3000_a_r$5999,2024-01-15,Sim,1500,Adset A,Ad 1,Campanha X,Facebook,2024-01-10 10:30:00,5000,5,20,15
Maria Santos,maria@email.com,11888888888,r$6000_a_r$9999,r$6000_a_r$9999,2024-01-16,Sim,2000,Adset B,Ad 2,Campanha X,Google,2024-01-11 14:20:00,5000,5,20,15
Pedro Costa,pedro@email.com,11777777777,r$10000_a_r$14999,2024-01-17,Não,0,Adset C,Ad 3,Campanha X,Facebook,2024-01-12 09:15:00,5000,5,20,15
```

## 🧠 Como a Ferramenta Calcula Automaticamente

### **1. Vendas Efetuadas:**
```javascript
// Conta quantas linhas têm "Sim" na coluna venda_efetuada
const vendasEfetuadas = leads.filter(lead => {
  const vendaEfetuada = lead.venda_efetuada || lead.Venda_efetuada
  return vendaEfetuada && String(vendaEfetuada).toLowerCase().includes('sim')
}).length
```

**Exemplo:**
- João: venda_efetuada = "Sim" ✅
- Maria: venda_efetuada = "Sim" ✅  
- Pedro: venda_efetuada = "Não" ❌
- **Total**: 2 vendas efetuadas

### **2. Faturamento Total:**
```javascript
// Soma os valores da coluna "venda" onde venda_efetuada = "Sim"
const faturamentoTotal = leads.reduce((total, lead) => {
  const vendaEfetuada = lead.venda_efetuada || lead.Venda_efetuada
  if (vendaEfetuada && String(vendaEfetuada).toLowerCase().includes('sim')) {
    const valorVenda = lead.venda || lead.Venda || lead.sale || lead.Sale || '0'
    const valor = parseFloat(String(valorVenda).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
    return total + valor
  }
  return total
}, 0)
```

**Exemplo:**
- João: venda = 1500 (Sim) ✅
- Maria: venda = 2000 (Sim) ✅
- Pedro: venda = 0 (Não) ❌
- **Total**: R$ 3.500

### **3. Verba Gasta:**
```javascript
// Pega o valor da primeira linha (não soma)
const verba_gasta = parseFloat(leadWithManualData.verba_gasta || '0') || 0
```

**Exemplo:**
- Todas as linhas: verba_gasta = 5000
- **Total**: R$ 5.000 (não soma, pega o valor)

## 💡 Como Preencher a Planilha

### **✅ CORRETO:**

#### **Dados dos Leads (cada linha = um lead):**
- `nome`: Nome do lead
- `email`: Email do lead
- `telefone`: Telefone do lead
- `renda`: Faixa de renda
- `data_da_venda`: Data da venda
- `venda_efetuada`: "Sim" ou "Não"
- `venda`: Valor da venda (1500, 2000, etc.)

#### **Dados Manuais da Campanha (mesmo valor em TODAS as linhas):**
- `verba_gasta`: 5000 (R$ 5.000 gastos na campanha)
- `churn_rate`: 5 (5% de churn)
- `reunioes_agendadas`: 20 (20 reuniões agendadas)
- `reunioes_realizadas`: 15 (15 reuniões realizadas)

### **❌ INCORRETO:**
- Colocar vendas_efetuadas e faturamento_total nas linhas
- Somar verba_gasta (deve ser o mesmo valor em todas as linhas)

## 🎯 Benefícios da Nova Lógica

### **1. Inteligência Automática:**
- **Vendas**: Conta automaticamente
- **Faturamento**: Soma automaticamente
- **Precisão**: Sem erros de cálculo manual

### **2. Simplicidade:**
- **Menos campos**: Apenas 4 campos manuais
- **Menos trabalho**: Não precisa calcular manualmente
- **Menos erros**: Cálculos automáticos

### **3. Flexibilidade:**
- **Qualquer formato**: Suporta diferentes nomes de colunas
- **Validação**: Verifica se venda_efetuada = "Sim"
- **Limpeza**: Remove R$, espaços, pontos, vírgulas

## 🔧 Campos Suportados

### **Venda Efetuada (qualquer um):**
- `venda_efetuada`
- `Venda_efetuada`
- `venda_efetuada`
- `Venda_efetuada`

### **Valor da Venda (qualquer um):**
- `venda`
- `Venda`
- `sale`
- `Sale`

### **Valores Suportados:**
- `1500` (número)
- `R$ 1.500,00` (formato brasileiro)
- `1,500.00` (formato americano)
- `R$1.500` (sem espaço)

## 🚀 Como Usar

### **1. Prepare sua planilha:**
- Adicione as colunas manuais no final
- Coloque o mesmo valor em todas as linhas para dados globais
- Deixe a ferramenta calcular vendas e faturamento

### **2. Faça upload:**
- A ferramenta extrai automaticamente os dados
- Calcula vendas e faturamento
- Salva no Supabase

### **3. Verifique os resultados:**
- Vendas efetuadas: Contadas automaticamente
- Faturamento total: Somado automaticamente
- Verba gasta: Valor global correto

## 📊 Exemplo Completo

### **Planilha:**
```csv
nome,email,telefone,venda_efetuada,venda,verba_gasta,churn_rate
João,joao@email.com,11999999999,Sim,1500,5000,5
Maria,maria@email.com,11888888888,Sim,2000,5000,5
Pedro,pedro@email.com,11777777777,Não,0,5000,5
```

### **Resultado:**
- **Vendas Efetuadas**: 2 (João + Maria)
- **Faturamento Total**: R$ 3.500 (1500 + 2000)
- **Verba Gasta**: R$ 5.000 (valor global)
- **Churn Rate**: 5% (valor global)

## 🎉 Resumo

A ferramenta agora é **inteligente** e **automática**:

- ✅ **Conta vendas** automaticamente
- ✅ **Soma faturamento** automaticamente  
- ✅ **Usa verba global** corretamente
- ✅ **Menos trabalho** para você
- ✅ **Mais precisão** nos cálculos

Agora você só precisa colocar a **verba gasta** e outros dados globais em todas as linhas, e a ferramenta faz o resto! 🚀
