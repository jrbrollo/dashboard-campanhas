#!/usr/bin/env node

/**
 * Script para upload direto de CSV para Supabase
 * Uso: node upload-to-supabase.js <caminho-do-csv>
 * 
 * Exemplo: node upload-to-supabase.js ../data/leads.csv
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Função para parsear CSV
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detectar separador
  const firstLine = lines[0];
  let separator = ',';
  if (firstLine.includes(';')) separator = ';';
  else if (firstLine.includes('\t')) separator = '\t';

  // Parsear headers
  const headers = firstLine.split(separator).map(h => h.trim().replace(/^"|"$/g, ''));
  
  // Parsear dados
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    data.push(row);
  }
  
  return data;
}

// Função para mapear dados do CSV para o formato do Supabase
function mapLeadData(csvRow) {
  return {
    nome: csvRow.nome || csvRow['nome_completo'] || '',
    email: csvRow.email || '',
    telefone: csvRow.telefone || '',
    renda: csvRow.renda || '',
    qual_sua_renda_mensal: csvRow.qual_sua_renda_mensal || csvRow['qual_sua_renda_mensal?'] || '',
    data_da_venda: csvRow.data_da_venda || csvRow['Data_da_venda'] || '',
    venda_efetuada: csvRow.venda_efetuada || csvRow['Venda_efetuada'] || '',
    venda: csvRow.venda || csvRow['Venda'] || '',
    sale: csvRow.sale || csvRow['Sale'] || '',
    sale_efetuada: csvRow.sale_efetuada || '',
    adset_name: csvRow.adset_name || '',
    adset: csvRow.adset || '',
    ad_name: csvRow.ad_name || '',
    ad: csvRow.ad || '',
    campaign: csvRow.campaign || '',
    platform: csvRow.platform || '',
    created_time: csvRow.created_time || '',
    raw_data: csvRow, // Dados originais como JSONB
    created_at: new Date().toISOString()
  };
}

// Função para extrair dados manuais do CSV
function extractManualDataFromCSV(csvData) {
  if (csvData.length === 0) return null;
  
  // IMPORTANTE: Os campos abaixo são DADOS DA CAMPANHA, não dados dos leads individuais
  // - verba_gasta: Verba total gasta na campanha inteira
  // - churn_rate: Taxa de churn da campanha inteira
  // - reunioes_agendadas: Total de reuniões agendadas na campanha
  // - reunioes_realizadas: Total de reuniões realizadas na campanha
  
  // Pegar apenas o primeiro lead para extrair dados da campanha
  const firstLead = csvData[0];
  
  // Verificar se o primeiro lead tem dados da campanha
  const hasCampaignData = firstLead.verba_gasta || firstLead.churn_rate || 
                         firstLead.reunioes_agendadas || firstLead.reunioes_realizadas;
  
  if (!hasCampaignData) return null;
  
  // Calcular vendas e faturamento automaticamente de TODOS os leads
  // Estes são dados calculados a partir dos leads individuais
  const vendasEfetuadas = csvData.filter(lead => {
    const vendaEfetuada = lead.venda_efetuada || lead.Venda_efetuada || lead.venda_efetuada || lead.Venda_efetuada
    return vendaEfetuada && String(vendaEfetuada).toLowerCase().includes('sim')
  }).length;
  
  const faturamentoTotal = csvData.reduce((total, lead) => {
    const vendaEfetuada = lead.venda_efetuada || lead.Venda_efetuada || lead.venda_efetuada || lead.Venda_efetuada
    if (vendaEfetuada && String(vendaEfetuada).toLowerCase().includes('sim')) {
      const valorVenda = lead.venda || lead.Venda || lead.sale || lead.Sale || '0'
      const valor = parseFloat(String(valorVenda).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
      return total + valor
    }
    return total
  }, 0);
  
  return {
    ltv: 8723.24, // Valor fixo da campanha
    margem_bruta: 58.72, // Valor fixo da campanha
    verba_gasta: parseFloat(firstLead.verba_gasta || '0') || 0, // DADO DA CAMPANHA
    vendas_efetuadas: vendasEfetuadas, // Calculado automaticamente dos leads
    faturamento_total: faturamentoTotal, // Calculado automaticamente dos leads
    churn_rate: parseFloat(firstLead.churn_rate || '0') || 0, // DADO DA CAMPANHA
    reunioes_agendadas: parseInt(firstLead.reunioes_agendadas || '0') || 0, // DADO DA CAMPANHA
    reunioes_realizadas: parseInt(firstLead.reunioes_realizadas || '0') || 0 // DADO DA CAMPANHA
  };
}

// Função principal
async function uploadCSV(csvPath) {
  try {
    console.log('📁 Lendo arquivo CSV:', csvPath);
    
    // Verificar se arquivo existe
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Arquivo não encontrado: ${csvPath}`);
    }
    
    // Ler arquivo CSV
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    
    console.log(`📊 Encontrados ${csvData.length} registros no CSV`);
    
    if (csvData.length === 0) {
      console.log('⚠️  Nenhum dado encontrado no CSV');
      return;
    }
    
    // Mapear dados
    const mappedData = csvData.map(mapLeadData);
    
    console.log('🔄 Fazendo upload para Supabase...');
    
    // Upload com upsert para evitar duplicatas
    const { data, error } = await supabase
      .from('leads')
      .upsert(mappedData, { 
        onConflict: 'email,telefone',
        ignoreDuplicates: false 
      });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Upload de leads concluído com sucesso!');
    console.log(`📈 ${mappedData.length} registros processados`);
    
    // Extrair e salvar dados manuais se existirem
    const manualData = extractManualDataFromCSV(csvData);
    if (manualData) {
      console.log('💾 Salvando dados manuais da campanha...');
      
      const { error: campaignError } = await supabase
        .from('campaign_data')
        .upsert(manualData);
      
      if (campaignError) {
        console.error('❌ Erro ao salvar dados manuais:', campaignError);
      } else {
        console.log('✅ Dados manuais salvos com sucesso!');
      }
    }
    
    // Verificar quantos leads existem agora
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de leads no banco: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro durante upload:', error.message);
    process.exit(1);
  }
}

// Verificar argumentos
const csvPath = process.argv[2];

if (!csvPath) {
  console.log('📖 Uso: node upload-to-supabase.js <caminho-do-csv>');
  console.log('📖 Exemplo: node upload-to-supabase.js ../data/leads.csv');
  process.exit(1);
}

// Executar upload
uploadCSV(csvPath);
