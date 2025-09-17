# 🎯 Dashboard de Campanhas

Dashboard completo para análise de performance de campanhas de marketing digital com integração Supabase.

## ✨ Funcionalidades

### 📊 Análise de Leads
- **Qualidade por Conjunto de Anúncios**: Avaliação de performance por adset
- **Todos os Anúncios**: Visão geral de todos os anúncios ativos
- **Drill-Down Anúncios por Conjunto**: Análise detalhada por conjunto
- **Performance Temporal**: Análise de tendências ao longo do tempo
- **Comparação Mensal**: Entrada de leads, leads qualificados e alta renda
- **Performance por Dia/Horário**: Análise de horários de melhor performance

### 💰 Análise Financeira
- **CAC (Custo de Aquisição por Cliente)**: Cálculo baseado em clientes únicos
- **LTGP (Lifetime Value)**: Valor de vida do cliente
- **Faturamento Total**: Incluindo planejamento, seguros e crédito
- **Margem Bruta**: Análise de rentabilidade

### 📈 KPIs e Métricas
- **Taxa de Conversão Lead → Planejamento**: Conversão para produto principal
- **Taxa de Conversão Reunião → Planejamento**: Eficiência comercial
- **Churn Rate**: Taxa de cancelamento
- **Reuniões Agendadas/Realizadas**: Acompanhamento comercial

### 🎨 Interface
- **Modo Escuro/Claro**: Alternância com persistência no localStorage
- **Logos Adaptativos**: Logos diferentes para cada modo
- **Design Responsivo**: Interface adaptável a diferentes telas
- **Filtros Avançados**: Por plataforma, faixa de renda, adset, anúncio e mês

## 🚀 Tecnologias

- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Chart.js** para gráficos
- **Supabase** para backend e persistência
- **React Hooks** para gerenciamento de estado

## 📦 Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/jrbrollo/dashboard-campanhas.git
   cd dashboard-campanhas
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**
   ```bash
   cp env.example .env
   ```
   
   Edite o arquivo `.env` com suas credenciais do Supabase:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

4. **Execute o projeto:**
   ```bash
   npm run dev
   ```

## 🗄️ Estrutura do Banco de Dados

### Tabela `leads`
- Dados dos leads com validação de email
- Colunas para vendas de planejamento, seguros e crédito
- Metadados de criação e atualização

### Tabela `campaign_data`
- Dados agregados da campanha
- KPIs financeiros e de conversão
- Dados de vendas por produto

## 📊 Como Usar

1. **Upload de Dados**: Faça upload de um arquivo CSV com os dados dos leads
2. **Configuração Manual**: Ajuste os dados da campanha (verba, churn, reuniões)
3. **Análises**: Explore as diferentes análises disponíveis
4. **Filtros**: Use os filtros para análises específicas
5. **Export**: Os dados são automaticamente salvos no Supabase

## 🔧 Scripts Disponíveis

- `npm run dev` - Executa o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Visualiza o build de produção
- `npm run lint` - Executa o linter

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes React
│   ├── Dashboard.tsx   # Componente principal
│   ├── ChartComponent.tsx
│   └── DataStatus.tsx
├── hooks/              # Custom hooks
│   ├── useDataManager.ts
│   └── useDebounce.ts
├── services/           # Serviços de dados
│   └── dataService.ts
├── lib/               # Configurações
│   └── supabase.ts
└── types/             # Definições TypeScript
    └── dashboard.ts
```

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte o repositório GitHub ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outras Plataformas
- **Netlify**: Compatível com Vite
- **GitHub Pages**: Requer build estático
- **Heroku**: Com buildpack do Node.js

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📞 Suporte

Para suporte, abra uma issue no repositório ou entre em contato através do GitHub.

---

Desenvolvido com ❤️ para análise de campanhas de marketing digital.