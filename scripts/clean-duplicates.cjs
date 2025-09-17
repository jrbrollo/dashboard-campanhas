#!/usr/bin/env node

/**
 * Script para limpar duplicatas de leads no Supabase
 * Uso: node clean-duplicates.js
 */

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

// Função para limpar duplicatas
async function cleanDuplicates() {
  try {
    console.log('🔍 Verificando duplicatas...');
    
    // 1. Buscar todos os leads
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      throw fetchError;
    }
    
    console.log(`📊 Total de leads encontrados: ${allLeads.length}`);
    
    // 2. Identificar duplicatas
    const uniqueLeads = new Map();
    const duplicates = [];
    
    allLeads.forEach(lead => {
      // Usar apenas email como chave única se não há telefone
      const hasPhone = lead.telefone && lead.telefone.trim() !== '';
      const key = hasPhone ? `${lead.email || ''}|${lead.telefone || ''}` : `${lead.email || ''}`;
      
      if (uniqueLeads.has(key)) {
        duplicates.push(lead);
      } else {
        uniqueLeads.set(key, lead);
      }
    });
    
    console.log(`🔍 Leads únicos: ${uniqueLeads.size}`);
    console.log(`⚠️  Duplicatas encontradas: ${duplicates.length}`);
    
    if (duplicates.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada!');
      return;
    }
    
    // 3. Limpar tabela
    console.log('🗑️  Limpando tabela...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .neq('id', 0);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // 4. Inserir leads únicos
    console.log('💾 Inserindo leads únicos...');
    const uniqueLeadsArray = Array.from(uniqueLeads.values());
    
    const { error: insertError } = await supabase
      .from('leads')
      .insert(uniqueLeadsArray);
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('✅ Limpeza concluída com sucesso!');
    console.log(`📈 Leads únicos inseridos: ${uniqueLeadsArray.length}`);
    console.log(`🗑️  Duplicatas removidas: ${duplicates.length}`);
    
    // 5. Verificar resultado
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total de leads após limpeza: ${count}`);
    
  } catch (error) {
    console.error('❌ Erro durante limpeza:', error.message);
    process.exit(1);
  }
}

// Executar limpeza
cleanDuplicates();
