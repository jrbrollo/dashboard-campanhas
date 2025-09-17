# Validação de E-mail Obrigatório

## Mudanças Implementadas

A partir desta versão, o sistema de upload de leads foi atualizado com as seguintes validações:

### 1. E-mail Obrigatório
- **Todas as planilhas devem conter uma coluna de e-mail**
- Colunas aceitas: `email`, `Email`, `EMAIL`, `e-mail`, `E-mail`, `E-MAIL`
- Leads sem e-mail são automaticamente ignorados

### 2. Validação de Formato de E-mail
- E-mails devem seguir o formato padrão: `usuario@dominio.com`
- E-mails inválidos são automaticamente ignorados
- A validação é case-insensitive

### 3. Detecção de Duplicatas por E-mail
- **E-mail é agora o critério principal para evitar duplicatas**
- Leads com e-mails duplicados são automaticamente ignorados
- Apenas o primeiro lead com cada e-mail é mantido

### 4. Feedback Melhorado
- Mensagens de erro claras quando a planilha não tem coluna de e-mail
- Avisos no console para leads ignorados (sem e-mail, e-mail inválido, duplicatas)
- Resumo do processamento mostrando quantos leads válidos foram carregados

## Como Usar

### 1. Preparar a Planilha
Certifique-se de que sua planilha CSV contém uma coluna de e-mail com um dos nomes aceitos:
- `email`
- `Email` 
- `EMAIL`
- `e-mail`
- `E-mail`
- `E-MAIL`

### 2. Formato da Planilha
```csv
nome,email,renda,data_da_venda,venda_efetuada,adset_name,ad_name,platform,created_time
João Silva,joao@email.com,r$3000_a_r$5999,2024-01-15,Sim,Adset A,Ad 1,Facebook,2024-01-10 10:30:00
Maria Santos,maria@email.com,r$6000_a_r$9999,2024-01-16,Sim,Adset B,Ad 2,Google,2024-01-11 14:20:00
```

### 3. Upload
- Faça o upload da planilha normalmente
- O sistema validará automaticamente todos os e-mails
- Leads inválidos ou duplicados serão ignorados
- Você receberá um resumo do processamento

## Exemplos de Validação

### ✅ E-mails Válidos
- `usuario@exemplo.com`
- `teste@empresa.com.br`
- `nome.sobrenome@dominio.org`

### ❌ E-mails Inválidos (serão ignorados)
- `usuario@` (sem domínio)
- `@exemplo.com` (sem usuário)
- `usuario.exemplo.com` (sem @)
- `usuario @exemplo.com` (com espaço)
- Campo vazio

### ❌ Duplicatas (serão ignoradas)
Se a planilha contém:
```csv
nome,email
João,joao@email.com
Maria,maria@email.com
Pedro,joao@email.com  ← Duplicata, será ignorado
```

Apenas João e Maria serão processados.

## Benefícios

1. **Qualidade dos Dados**: Garante que todos os leads tenham e-mail válido
2. **Sem Duplicatas**: Evita leads duplicados automaticamente
3. **Feedback Claro**: Informa exatamente o que foi processado
4. **Flexibilidade**: Aceita diferentes formatos de nome da coluna de e-mail
5. **Performance**: Processamento mais rápido sem dados inválidos

## Troubleshooting

### Erro: "A planilha deve conter uma coluna de e-mail"
- Verifique se existe uma coluna com um dos nomes aceitos
- Renomeie a coluna de e-mail para um dos formatos aceitos

### Muitos leads ignorados
- Verifique se os e-mails estão no formato correto
- Remova duplicatas da planilha antes do upload
- Verifique se não há espaços extras nos e-mails

### Nenhum lead processado
- Verifique se a planilha tem dados além do cabeçalho
- Confirme se todos os leads têm e-mail válido
- Verifique o console do navegador para mensagens de erro detalhadas
