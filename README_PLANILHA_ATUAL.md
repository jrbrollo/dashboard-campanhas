# 📊 Planilha "Atualizada leads e vendas ate 15.09 v2" - Guia de Uso

## 🎯 Estrutura da Planilha

### **Colunas da Planilha:**
```csv
created_time;ad_name;adset_name;platform;qual_sua_renda_mensal?;email;nome_completo;Venda_efetuada;Data_da_venda;;Reunioes_Agendadas;Reunioes_Realizadas;verba_gasta;churn
```

### **Mapeamento para o Banco de Dados:**

#### **Dados dos Leads (Todas as linhas):**
- `nome_completo` → `nome` (nome do lead)
- `email` → `email` (email do lead)
- `qual_sua_renda_mensal?` → `renda` (faixa de renda)
- `Data_da_venda` → `data_da_venda` (data da venda)
- `Venda_efetuada` → `venda_efetuada` + `venda` (valor da venda)
- `ad_name` → `ad_name` (nome do anúncio)
- `adset_name` → `adset_name` (nome do conjunto)
- `platform` → `platform` (plataforma)
- `created_time` → `created_time` (data/hora do lead)

#### **Dados da Campanha (Apenas primeira linha):**
- `verba_gasta` → `verba_gasta` (verba total da campanha)
- `churn` → `churn_rate` (taxa de churn)
- `Reunioes_Agendadas` → `reunioes_agendadas` (total de reuniões)
- `Reunioes_Realizadas` → `reunioes_realizadas` (total de reuniões)

## 🔧 Como a Ferramenta Processa

### **1. Detecção de Separador:**
- A ferramenta detecta automaticamente que o separador é `;` (ponto e vírgula)
- Não precisa converter para vírgula

### **2. Mapeamento de Vendas:**
- **Campo**: `Venda_efetuada` contém o valor da venda (ex: "R$ 16.680,00")
- **Lógica**: Se tem valor, considera como venda efetuada
- **Cálculo**: Extrai valor numérico para faturamento total

### **3. Dados da Campanha:**
- **Fonte**: Apenas primeira linha da planilha
- **Campos**: verba_gasta, churn, Reunioes_Agendadas, Reunioes_Realizadas
- **Uso**: Aplicados para toda a campanha

## 📊 Exemplo de Processamento

### **Primeira Linha (Dados da Campanha):**
```csv
2025-06-21T23:48:49-03:00;AD2 - Depoimento Gabriela e Ka;00 - [AUTO] LAL (BR, 1%) - Base com valores 2025 [M] [25-40];ig;r$15.000_a_r$19.999;lethicia.cintra@gmail.com;Lethicia Cintra Maura;R$ 16.680,00;2025-07-11T16:07:00-03:00;;123;53;R$ 8.907,95;0
```

**Extraído:**
- **Lead**: Lethicia Cintra Maura, lethicia.cintra@gmail.com, R$ 16.680,00
- **Campanha**: verba_gasta = R$ 8.907,95, churn = 0, reuniões = 123/53

### **Demais Linhas (Apenas Leads):**
```csv
2025-09-09T06:27:03-03:00;AD16 - Depoimento Camila Cooper;00 - [AUTO] LAL (BR, 1%) - Base com valores 2025 [H] [25-40];ig;r$15.000_a_r$19.999;fbo08@hotmail.com;Fabio Luiz Cortez Ribeiro;R$ 12.397,00;2025-09-12T22:40:00-03:00;;;;;
```

**Extraído:**
- **Lead**: Fabio Luiz Cortez Ribeiro, fbo08@hotmail.com, R$ 12.397,00
- **Campanha**: Campos vazios (usados dados da primeira linha)

## 🚀 Como Fazer Upload

### **1. Preparar a Planilha:**
- ✅ Manter formato atual (ponto e vírgula como separador)
- ✅ Primeira linha com dados da campanha
- ✅ Demais linhas com dados dos leads
- ✅ Campos da campanha vazios nas demais linhas

### **2. Fazer Upload:**
1. Acesse `http://localhost:5173`
2. Clique em "Escolher arquivo"
3. Selecione `Atualizada leads e vendas ate 15.09 v2.csv`
4. Aguarde o processamento

### **3. Verificar Resultados:**
- **Total de Leads**: Deve mostrar o número correto
- **Vendas Efetuadas**: Calculado automaticamente
- **Faturamento Total**: Soma dos valores de venda
- **Dados da Campanha**: Extraídos da primeira linha

## 🔍 Validações Implementadas

### **1. Detecção de Vendas:**
```javascript
// Verifica se tem valor de venda válido
const hasValidSale = (row) => {
  const venda = row['Venda_efetuada']
  if (!venda || String(venda).trim() === '') return false
  if (String(venda).includes(';')) return false // Evita separadores
  const valor = parseFloat(String(venda).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
  return valor > 0
}
```

### **2. Extração de Valores:**
```javascript
// Extrai valor numérico de "R$ 16.680,00"
const valor = parseFloat(String(venda).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
```

### **3. Dados da Campanha:**
```javascript
// Extrai apenas da primeira linha
const firstLead = leads[0]
const verbaGasta = parseFloat(String(firstLead.verba_gasta).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
```

## 📈 Resultados Esperados

### **Dados Calculados Automaticamente:**
- **Vendas Efetuadas**: Conta leads com valor de venda
- **Faturamento Total**: Soma todos os valores de venda
- **Total de Leads**: Número total de linhas (exceto cabeçalho)

### **Dados da Campanha:**
- **Verba Gasta**: R$ 8.907,95 (da primeira linha)
- **Churn Rate**: 0% (da primeira linha)
- **Reuniões Agendadas**: 123 (da primeira linha)
- **Reuniões Realizadas**: 53 (da primeira linha)

## 🛠️ Troubleshooting

### **Problema: Erro de constraint único**
- **Causa**: Constraint único não existe no banco
- **Solução**: A ferramenta usa `insert` em vez de `upsert`

### **Problema: Dados não aparecem**
- **Causa**: Campos vazios ou formato incorreto
- **Solução**: Verificar se primeira linha tem dados da campanha

### **Problema: Vendas não contadas**
- **Causa**: Formato de valor incorreto
- **Solução**: Verificar se valores estão no formato "R$ X.XXX,XX"

## 📝 Notas Importantes

### **1. Formato de Valores:**
- **Vendas**: "R$ 16.680,00" (formato brasileiro)
- **Verba**: "R$ 8.907,95" (formato brasileiro)
- **Conversão**: Automática para formato numérico

### **2. Campos Obrigatórios:**
- **Primeira linha**: verba_gasta, churn, Reunioes_Agendadas, Reunioes_Realizadas
- **Todas as linhas**: nome_completo, email, Venda_efetuada

### **3. Campos Opcionais:**
- **telefone**: Não existe na planilha (deixado vazio)
- **campaign**: Não existe na planilha (deixado vazio)

A ferramenta está configurada para processar corretamente esta planilha específica! 🎉
