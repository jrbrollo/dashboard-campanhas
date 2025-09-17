# 📊 Dados da Campanha vs Dados dos Leads - Documentação Técnica

## 🎯 Definição Clara dos Tipos de Dados

### **📋 DADOS DOS LEADS (Individuais)**
Estes são dados que pertencem a **cada lead específico**:

#### **Campos de Identificação:**
- `nome` - Nome do lead
- `email` - Email do lead
- `telefone` - Telefone do lead
- `renda` - Faixa de renda do lead

#### **Campos de Venda:**
- `data_da_venda` - Data da venda do lead
- `venda_efetuada` - Se o lead efetuou venda (Sim/Não)
- `venda` - Valor da venda do lead

#### **Campos de Campanha:**
- `adset_name` - Conjunto de anúncios que gerou o lead
- `ad_name` - Anúncio específico que gerou o lead
- `campaign` - Nome da campanha
- `platform` - Plataforma (Facebook, Google, etc.)
- `created_time` - Data/hora que o lead foi gerado

### **🏢 DADOS DA CAMPANHA (Globais)**
Estes são dados que pertencem à **campanha inteira**, não aos leads individuais:

#### **Campos Financeiros:**
- `verba_gasta` - **Verba total gasta na campanha inteira**
- `churn_rate` - **Taxa de churn da campanha inteira**

#### **Campos de Reuniões:**
- `reunioes_agendadas` - **Total de reuniões agendadas na campanha**
- `reunioes_realizadas` - **Total de reuniões realizadas na campanha**

#### **Campos Calculados Automaticamente:**
- `vendas_efetuadas` - **Calculado automaticamente** contando leads com venda_efetuada = "Sim"
- `faturamento_total` - **Calculado automaticamente** somando valores da coluna "venda"

## 🔧 Implementação Técnica

### **1. Extração de Dados da Campanha:**
```javascript
// IMPORTANTE: Os campos abaixo são DADOS DA CAMPANHA, não dados dos leads individuais
// - verba_gasta: Verba total gasta na campanha inteira
// - churn_rate: Taxa de churn da campanha inteira
// - reunioes_agendadas: Total de reuniões agendadas na campanha
// - reunioes_realizadas: Total de reuniões realizadas na campanha

// Pegar apenas o primeiro lead para extrair dados da campanha
const firstLead = leads[0]

// Verificar se o primeiro lead tem dados da campanha
const hasCampaignData = firstLead.verba_gasta || firstLead.churn_rate || 
                       firstLead.reunioes_agendadas || firstLead.reunioes_realizadas
```

### **2. Cálculo de Dados dos Leads:**
```javascript
// Calcular vendas e faturamento automaticamente de TODOS os leads
// Estes são dados calculados a partir dos leads individuais
const vendasEfetuadas = leads.filter(lead => {
  const vendaEfetuada = lead.venda_efetuada || lead.Venda_efetuada
  return vendaEfetuada && String(vendaEfetuada).toLowerCase().includes('sim')
}).length

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

## 📋 Estrutura do CSV

### **Template Otimizado:**
```csv
nome,email,telefone,renda,qual_sua_renda_mensal,data_da_venda,venda_efetuada,venda,adset_name,ad_name,campaign,platform,created_time,verba_gasta,churn_rate,reunioes_agendadas,reunioes_realizadas
João Silva,joao@email.com,11999999999,r$3000_a_r$5999,r$3000_a_r$5999,2024-01-15,Sim,1500,Adset A,Ad 1,Campanha X,Facebook,2024-01-10 10:30:00,5000,5,20,15
Maria Santos,maria@email.com,11888888888,r$6000_a_r$9999,r$6000_a_r$9999,2024-01-16,Sim,2000,Adset B,Ad 2,Campanha X,Google,2024-01-11 14:20:00,,,,
Pedro Costa,pedro@email.com,11777777777,r$10000_a_r$14999,r$10000_a_r$14999,2024-01-17,Não,0,Adset C,Ad 3,Campanha X,Facebook,2024-01-12 09:15:00,,,,
```

### **Explicação:**
- **Primeira linha**: Dados do lead + dados da campanha
- **Demais linhas**: Apenas dados dos leads (campos da campanha vazios)

## 🎯 Lógica de Processamento

### **1. Dados da Campanha (Primeira Linha):**
- **Fonte**: Apenas o primeiro lead do CSV
- **Campos**: verba_gasta, churn_rate, reunioes_agendadas, reunioes_realizadas
- **Uso**: Aplicados para toda a campanha

### **2. Dados dos Leads (Todas as Linhas):**
- **Fonte**: Todos os leads do CSV
- **Campos**: nome, email, telefone, venda_efetuada, venda, etc.
- **Uso**: Processados individualmente

### **3. Dados Calculados (Automáticos):**
- **vendas_efetuadas**: Conta leads com venda_efetuada = "Sim"
- **faturamento_total**: Soma valores da coluna "venda"

## 🔍 Validação e Verificação

### **Verificação de Dados da Campanha:**
```javascript
// Verificar se o primeiro lead tem dados da campanha
const hasCampaignData = firstLead.verba_gasta || firstLead.churn_rate || 
                       firstLead.reunioes_agendadas || firstLead.reunioes_realizadas

if (!hasCampaignData) {
  console.warn('Nenhum dado da campanha encontrado na primeira linha')
  return null
}
```

### **Validação de Dados dos Leads:**
```javascript
// Validar se há leads válidos
if (leads.length === 0) {
  console.warn('Nenhum lead encontrado no CSV')
  return null
}
```

## 📊 Interface do Usuário

### **Seção "Dados da Campanha (Valores Globais)":**
- **Título**: Deixa claro que são dados globais
- **Descrição**: Explica que são extraídos da primeira linha
- **Tooltips**: Mostram descrição de cada campo
- **Ícones**: Indicam se é calculado automaticamente ou manual

### **Campos com Tooltips:**
- **Verba Gasta**: "Verba total gasta na campanha"
- **Vendas Efetuadas**: "Calculado automaticamente dos leads"
- **Faturamento Total**: "Calculado automaticamente dos leads"
- **Taxa de Churn**: "Taxa de churn da campanha"
- **Reuniões Agendadas**: "Total de reuniões agendadas"
- **Reuniões Realizadas**: "Total de reuniões realizadas"

## 🚀 Benefícios da Separação Clara

### **1. Clareza Conceitual:**
- Dados da campanha vs dados dos leads bem definidos
- Lógica de processamento transparente
- Fácil manutenção e evolução

### **2. Eficiência Técnica:**
- Processamento otimizado
- Menos dados duplicados
- Cálculos automáticos precisos

### **3. Experiência do Usuário:**
- Interface clara e intuitiva
- Tooltips informativos
- Feedback visual adequado

## 🔧 Manutenção e Evolução

### **Adicionar Novos Campos da Campanha:**
1. Adicionar campo no CSV (apenas primeira linha)
2. Atualizar interface com tooltip explicativo
3. Adicionar lógica de extração no código
4. Documentar no README

### **Adicionar Novos Campos dos Leads:**
1. Adicionar campo no CSV (todas as linhas)
2. Atualizar lógica de processamento
3. Adicionar validações se necessário
4. Documentar no README

## 📝 Resumo da Lógica

### **DADOS DA CAMPANHA (Globais):**
- **Fonte**: Primeira linha do CSV
- **Campos**: verba_gasta, churn_rate, reunioes_agendadas, reunioes_realizadas
- **Uso**: Aplicados para toda a campanha
- **Processamento**: Extraídos uma vez, aplicados globalmente

### **DADOS DOS LEADS (Individuais):**
- **Fonte**: Todas as linhas do CSV
- **Campos**: nome, email, telefone, venda_efetuada, venda, etc.
- **Uso**: Processados individualmente
- **Processamento**: Cada lead é processado separadamente

### **DADOS CALCULADOS (Automáticos):**
- **Fonte**: Calculados a partir dos dados dos leads
- **Campos**: vendas_efetuadas, faturamento_total
- **Uso**: Métricas da campanha
- **Processamento**: Algoritmos automáticos

Esta separação clara garante que a ferramenta processe os dados corretamente e que os usuários entendam exatamente o que cada campo representa! 🎯
