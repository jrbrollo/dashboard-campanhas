# 🔄 Comportamento da Ferramenta - Carregamento de Dados

## 🎯 Como a Ferramenta Funciona

### **📊 Carregamento Automático:**
Quando você acessa a ferramenta, ela **automaticamente** carrega os dados salvos no Supabase:

1. **Verifica conexão** com Supabase
2. **Carrega leads** salvos no banco
3. **Carrega dados da campanha** salvos no banco
4. **Mostra indicador** de dados carregados

### **🔄 Fluxo de Dados:**

#### **1. Primeira Vez (Sem Dados):**
- Interface vazia
- Botão de upload disponível
- Sem dados carregados

#### **2. Após Upload de CSV:**
- Dados carregados da planilha
- Dados salvos no Supabase
- Indicador mostra "sincronizado com Supabase"

#### **3. Atualização da Página:**
- **Dados carregados automaticamente** do Supabase
- **Não precisa fazer upload novamente**
- Indicador mostra dados carregados

## 📋 Indicador de Dados Carregados

### **Visual:**
```
📊 Dados carregados: 541 leads (sincronizado com Supabase) [Limpar Dados]
```

### **Funcionalidades:**
- **Mostra quantidade** de leads carregados
- **Indica sincronização** com Supabase
- **Botão "Limpar Dados"** para resetar

## 🔧 Comportamentos Esperados

### **✅ CORRETO:**
- **Atualizar página**: Dados carregados automaticamente
- **Fazer upload**: Dados salvos no Supabase
- **Limpar dados**: Interface volta ao estado inicial
- **Reupload**: Substitui dados anteriores

### **❌ PROBLEMA ANTERIOR:**
- **Atualizar página**: Mostrava 1000 leads (dados antigos)
- **Causa**: Dados duplicados no banco

### **✅ SOLUÇÃO IMPLEMENTADA:**
- **Limpeza de duplicatas**: Script remove duplicatas
- **Carregamento correto**: 541 leads únicos
- **Indicador visual**: Mostra dados carregados

## 🛠️ Comandos Úteis

### **Limpar Duplicatas:**
```bash
node scripts/clean-duplicates.cjs
```

### **Verificar Dados no Banco:**
```sql
SELECT COUNT(*) as total_leads FROM leads;
```

### **Verificar Duplicatas:**
```sql
SELECT email, telefone, COUNT(*) as count 
FROM leads 
GROUP BY email, telefone 
HAVING COUNT(*) > 1;
```

## 📊 Estados da Interface

### **1. Estado Inicial:**
- Sem dados carregados
- Botão de upload disponível
- Sem indicador de dados

### **2. Dados Carregados:**
- Indicador azul com quantidade de leads
- Botão "Limpar Dados" disponível
- Dados visíveis na interface

### **3. Dados Limpos:**
- Volta ao estado inicial
- Dados removidos da interface
- Botão de upload disponível

## 🔄 Fluxo de Atualização

### **Quando você atualiza a página:**

1. **Ferramenta inicia**
2. **Verifica Supabase** (se configurado)
3. **Carrega leads** do banco
4. **Carrega dados da campanha** do banco
5. **Mostra indicador** de dados carregados
6. **Interface pronta** para uso

### **Quando você faz upload:**

1. **Seleciona arquivo** CSV
2. **Processa dados** da planilha
3. **Salva no Supabase** (se disponível)
4. **Atualiza interface** com novos dados
5. **Mostra indicador** de dados carregados

## 💡 Dicas de Uso

### **1. Primeira Vez:**
- Faça upload da planilha
- Dados serão salvos no Supabase
- Próximas vezes carregam automaticamente

### **2. Atualizar Dados:**
- Faça novo upload da planilha
- Dados anteriores serão substituídos
- Novos dados salvos no Supabase

### **3. Limpar Tudo:**
- Use botão "Limpar Dados"
- Interface volta ao estado inicial
- Dados removidos da memória (não do banco)

### **4. Problemas de Duplicatas:**
- Execute script de limpeza
- Dados únicos mantidos
- Duplicatas removidas

## 🎯 Resumo

A ferramenta agora funciona de forma **inteligente**:

- ✅ **Carrega automaticamente** dados salvos
- ✅ **Mostra indicador** de dados carregados
- ✅ **Permite limpar** dados quando necessário
- ✅ **Evita duplicatas** com script de limpeza
- ✅ **Sincroniza** com Supabase automaticamente

**Não é mais necessário fazer upload toda vez que atualizar a página!** 🎉
