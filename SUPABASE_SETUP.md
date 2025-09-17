# 🚀 Configuração do Supabase para Dashboard de Campanhas

Este guia te ajudará a configurar o Supabase para persistir os dados do dashboard.

## 📋 Pré-requisitos

1. Conta no Supabase (gratuita): https://supabase.com
2. Node.js instalado
3. Projeto do dashboard configurado

## 🔧 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Escolha sua organização
5. Preencha:
   - **Name**: `dashboard-campanhas`
   - **Database Password**: (escolha uma senha forte)
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
6. Clique em "Create new project"

### 2. Configurar Banco de Dados

**Opção A - Primeira vez (recomendado):**
1. No painel do Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `database/reset_and_create.sql`
4. Clique em **Run** para executar o script

**Opção B - Se já tentou antes e deu erro:**
1. No painel do Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Copie e cole o conteúdo do arquivo `database/reset_and_create.sql`
4. Clique em **Run** para executar o script (vai limpar e recriar as tabelas)

**⚠️ Se der erro de coluna duplicada:**
- Use o arquivo `database/reset_and_create.sql` que limpa as tabelas primeiro
- Ou execute manualmente: `DROP TABLE IF EXISTS leads CASCADE; DROP TABLE IF EXISTS campaign_data CASCADE;`

### 3. Obter Credenciais

1. No painel do Supabase, vá para **Settings** > **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://your-project-id.supabase.co`)
   - **anon public** key (chave pública anônima)

### 4. Configurar Variáveis de Ambiente

1. Na raiz do projeto, crie um arquivo `.env`:
```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Substitua pelos valores reais do seu projeto

### 5. Testar Configuração

1. Execute o projeto:
```bash
npm run dev
```

2. Abra o dashboard no navegador
3. Verifique se aparece "Conectado" no status de dados
4. Faça upload de um CSV para testar a persistência

## 🗄️ Estrutura do Banco de Dados

### Tabela `leads`
Armazena os dados dos leads importados via CSV:
- Campos básicos: nome, email, telefone, renda
- Dados de venda: data, valor, status
- Metadados: adset, campaign, platform
- Campo flexível: `raw_data` (JSON) para campos dinâmicos

### Tabela `campaign_data`
Armazena os dados manuais da campanha:
- Métricas financeiras: LTV, margem, verba, faturamento
- Métricas de performance: vendas, churn rate
- Timestamps automáticos para auditoria

## 🔒 Segurança

- **RLS (Row Level Security)** habilitado
- Políticas permissivas para desenvolvimento
- Ajuste as políticas conforme necessário para produção

## 🚨 Troubleshooting

### Erro: "Supabase não configurado"
- Verifique se o arquivo `.env` existe
- Confirme se as variáveis estão corretas
- Reinicie o servidor após alterar o `.env`

### Erro: "Failed to fetch"
- Verifique se a URL do projeto está correta
- Confirme se a chave anônima está correta
- Verifique se o projeto está ativo no Supabase

### Dados não salvam
- Verifique se o script SQL foi executado
- Confirme se as tabelas foram criadas
- Verifique os logs do navegador para erros

## 📊 Funcionalidades Implementadas

✅ **Persistência Automática**
- Dados CSV salvos automaticamente
- Dados manuais salvos com debounce
- Carregamento automático ao abrir

✅ **Modo Offline**
- Funciona sem Supabase configurado
- Dados salvos localmente
- Interface adaptativa

✅ **Status Visual**
- Indicador de conexão
- Última atualização
- Estado de carregamento

## 🔄 Próximos Passos

1. **Configurar autenticação** (opcional)
2. **Implementar backup/restore**
3. **Adicionar histórico de versões**
4. **Configurar notificações**

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do navegador (F12)
2. Consulte a documentação do Supabase
3. Verifique se todas as etapas foram seguidas

---

**🎉 Parabéns!** Seu dashboard agora tem persistência de dados com Supabase!
