import { supabase } from '../lib/supabase'
import type { LeadData, CampaignData } from '../lib/supabase'

// Interface para o serviço de dados
export interface DataService {
  // Métodos para leads
  saveLeads: (leads: LeadData[]) => Promise<boolean>
  loadLeads: () => Promise<LeadData[]>
  clearLeads: () => Promise<boolean>

  // Métodos para dados da campanha
  saveCampaignData: (data: CampaignData) => Promise<boolean>
  loadCampaignData: () => Promise<CampaignData | null>
  extractManualDataFromCSV: (leads: LeadData[]) => Promise<CampaignData | null>

  // Verificar se está disponível
  isAvailable: () => boolean
}

// Implementação do serviço Supabase
class SupabaseDataService implements DataService {
  async saveLeads(leads: LeadData[]): Promise<boolean> {
    if (!supabase) return false

    try {
      // Primeiro, limpar todos os leads existentes para evitar duplicatas
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .gte('id', 1) // Deletar todos os registros com id >= 1

      if (deleteError) {
        console.error('Erro ao limpar leads existentes:', deleteError)
        return false
      }

      console.log(`📊 Tentando salvar ${leads.length} leads no Supabase...`)

      // Função auxiliar para converter valores vazios
      const toNumericOrNull = (value: any): number | null => {
        if (!value || String(value).trim() === '') return null
        const num = parseFloat(String(value).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.'))
        return isNaN(num) ? null : num
      }

      const toDateOrNull = (value: any): string | null => {
        if (!value || String(value).trim() === '') return null
        return String(value)
      }

      // Mapear colunas da planilha para o formato do banco
      const mappedLeads = leads.map(lead => ({
        nome: lead['nome_completo'] || '',
        email: lead.email || '',
        telefone: '', // Não há telefone na planilha
        renda: lead['qual_sua_renda_mensal?'] || '',
        qual_sua_renda_mensal: lead['qual_sua_renda_mensal?'] || '',
        data_da_venda: lead['Data_da_venda'] || '',
        Venda_planejamento: lead['Venda_planejamento'] || '',
        venda: lead['Venda_planejamento'] || '', // O valor da venda está na coluna Venda_planejamento
        sale: lead['Venda_planejamento'] || '',
        sale_efetuada: lead['Venda_planejamento'] || '',
        // Novas colunas para seguros e crédito
        venda_seguros: lead['venda_seguros'] || '',
        venda_credito: lead['venda_credito'] || '',
        // Novos mapeamentos - CORRIGIDO: converter para null se vazio
        churn_value: toNumericOrNull(lead['churn']),
        churn_date: toDateOrNull(lead['Data_do_churn']),
        venda_outros: toNumericOrNull(lead['Outros_Produtos']),
        // Novas colunas de data de venda por produto (para Análise Mensal)
        // Novas colunas de data de venda por produto (para Análise Mensal)
        // data_venda_credito: toDateOrNull(lead['Data_venda_credito']),
        // data_venda_seguros: toDateOrNull(lead['Data_venda_seguros']),
        // data_venda_outros: toDateOrNull(lead['Data_venda_outros']),
        adset_name: lead.adset_name || '',
        adset: lead.adset_name || '',
        ad_name: lead.ad_name || '',
        ad: lead.ad_name || '',
        // Campanha (novo)
        campaign_name: (lead as any)['campaign_name'] || (lead as any)['campaign'] || '',
        campaign: (lead as any)['campaign_name'] || (lead as any)['campaign'] || '',
        platform: lead.platform || '',
        created_time: lead.created_time || '',
        raw_data: lead, // Armazenar dados originais como JSONB
        created_at: new Date().toISOString()
      }))

      console.log(`📊 Leads mapeados: ${mappedLeads.length}`)
      console.log(`📊 Exemplo do primeiro lead mapeado:`, mappedLeads[0])

      // Inserir leads (agora sem duplicatas)
      const { data: insertedData, error } = await supabase
        .from('leads')
        .insert(mappedLeads)
        .select()

      if (error) {
        console.error('❌ Erro ao salvar leads:', error)
        console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2))
        return false
      }

      console.log(`✅ ${insertedData?.length || 0} leads salvos com sucesso no Supabase!`)
      return true
    } catch (error) {
      console.error('❌ Erro ao salvar leads:', error)
      return false
    }
  }

  // Nova função para extrair dados manuais do CSV
  async extractManualDataFromCSV(leads: LeadData[]): Promise<CampaignData | null> {
    if (leads.length === 0) return null

    // IMPORTANTE: Os campos abaixo são DADOS DA CAMPANHA, não dados dos leads individuais
    // - verba_gasta: Verba total gasta na campanha inteira
    // - churn_rate: Taxa de churn da campanha inteira
    // - reunioes_agendadas: Total de reuniões agendadas na campanha
    // - reunioes_realizadas: Total de reuniões realizadas na campanha

    // Procurar por uma linha que tenha dados da campanha (não apenas o primeiro lead)
    let campaignLead: LeadData | null = null

    for (const lead of leads) {
      const hasCampaignData = lead.verba_gasta || lead.churn ||
        lead.Reunioes_Agendadas || lead.Reunioes_Realizadas

      if (hasCampaignData) {
        campaignLead = lead
        console.log('Dados da campanha encontrados:', {
          verba_gasta: lead.verba_gasta,
          churn: lead.churn,
          Reunioes_Agendadas: lead.Reunioes_Agendadas,
          Reunioes_Realizadas: lead.Reunioes_Realizadas
        })
        break
      }
    }

    if (!campaignLead) {
      console.log('Nenhum dado da campanha encontrado no CSV')
      return null
    }

    // Calcular vendas e faturamento automaticamente de TODOS os leads
    // Estes são dados calculados a partir dos leads individuais

    // Função auxiliar para extrair valor numérico
    const extractValue = (value: any): number => {
      if (!value || String(value).trim() === '' || String(value).includes(';')) return 0
      return parseFloat(String(value).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
    }

    // Helper para buscar valor de coluna de forma flexível (igual ao Dashboard.tsx)
    const getColumnValue = (row: LeadData, names: string[]): string => {
      // 1. Exact match
      for (const name of names) if (Object.prototype.hasOwnProperty.call(row, name)) return row[name]
      // 2. Case insensitive
      const keys = Object.keys(row)
      for (const name of names) {
        const k = keys.find(key => key.toLowerCase().trim() === name.toLowerCase().trim())
        if (k) return row[k]
      }
      // 3. Partial match
      for (const name of names) {
        const k = keys.find(key => key.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(key.toLowerCase()))
        if (k) return row[k]
      }
      return ''
    }

    // Colunas possíveis (sincronizadas com Dashboard.tsx)
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesSegurosCol = ['venda_seguros', 'seguros', 'Seguros']
    const salesCreditoCol = ['venda_credito', 'credito', 'Credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos', 'Outros']

    const faturamentoPlanejamento = leads.reduce((total, lead) => {
      return total + extractValue(getColumnValue(lead, salesPlanejamentoCol))
    }, 0)

    const faturamentoSeguros = leads.reduce((total, lead) => {
      return total + extractValue(getColumnValue(lead, salesSegurosCol))
    }, 0)

    const faturamentoCredito = leads.reduce((total, lead) => {
      return total + extractValue(getColumnValue(lead, salesCreditoCol))
    }, 0)

    const faturamentoOutros = leads.reduce((total, lead) => {
      return total + extractValue(getColumnValue(lead, salesOutrosCol))
    }, 0)

    const faturamentoTotal = faturamentoPlanejamento + faturamentoSeguros + faturamentoCredito + faturamentoOutros

    // Recalcular contagens também usando getColumnValue
    const countSalesFlexible = (cols: string[]): number => {
      return leads.filter(lead => {
        const val = getColumnValue(lead, cols)
        const num = extractValue(val)
        return num > 0
      }).length
    }

    const vendasPlanejamento = countSalesFlexible(salesPlanejamentoCol)
    const vendasSeguros = countSalesFlexible(salesSegurosCol)
    const vendasCredito = countSalesFlexible(salesCreditoCol)
    const vendasOutros = countSalesFlexible(salesOutrosCol)
    const vendasEfetuadas = vendasPlanejamento + vendasSeguros + vendasCredito + vendasOutros

    return {
      ltv: 8723.24, // Valor fixo da campanha
      margem_bruta: 58.72, // Valor fixo da campanha
      verba_gasta: parseFloat(String(campaignLead.verba_gasta || '0').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0, // DADO DA CAMPANHA
      vendas_efetuadas: vendasEfetuadas,
      vendas_planejamento: vendasPlanejamento,
      vendas_seguros: vendasSeguros,
      vendas_credito: vendasCredito,
      vendas_outros: vendasOutros,
      faturamento_total: faturamentoTotal,
      faturamento_planejamento: faturamentoPlanejamento,
      faturamento_seguros: faturamentoSeguros,
      faturamento_credito: faturamentoCredito,
      faturamento_outros: faturamentoOutros,
      churn_rate: parseFloat(campaignLead.churn || '0') || 0, // DADO DA CAMPANHA
      reunioes_agendadas: parseInt(campaignLead.Reunioes_Agendadas || '0') || 0, // DADO DA CAMPANHA
      reunioes_realizadas: parseInt(campaignLead.Reunioes_Realizadas || '0') || 0 // DADO DA CAMPANHA
    }
  }

  async loadLeads(): Promise<LeadData[]> {
    if (!supabase) return []

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10000)

      if (error) {
        console.error('❌ Erro ao carregar leads:', error)
        return []
      }

      console.log(`✅ Total de leads carregados do Supabase: ${data?.length || 0}`)
      return data || []
    } catch (error) {
      console.error('❌ Erro ao carregar leads:', error)
      return []
    }
  }

  async clearLeads(): Promise<boolean> {
    if (!supabase) return false

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .neq('id', 0)

      return !error
    } catch (error) {
      console.error('Erro ao limpar leads:', error)
      return false
    }
  }

  async saveCampaignData(data: CampaignData): Promise<boolean> {
    if (!supabase) return false

    try {
      // Primeiro, limpar dados antigos da campanha
      const { error: deleteError } = await supabase
        .from('campaign_data')
        .delete()
        .gte('id', 1)

      if (deleteError) {
        console.error('Erro ao limpar dados antigos da campanha:', deleteError)
        return false
      }

      console.log('✅ Dados antigos da campanha removidos com sucesso')

      // Inserir novos dados (usando colunas específicas para vendas por produto)
      const { error } = await supabase
        .from('campaign_data')
        .insert({
          ltv: data.ltv,
          margem_bruta: data.margem_bruta,
          verba_gasta: data.verba_gasta,
          vendas_efetuadas: data.vendas_efetuadas,
          faturamento_total: data.faturamento_total,
          churn_rate: data.churn_rate,
          reunioes_agendadas: data.reunioes_agendadas,
          reunioes_realizadas: data.reunioes_realizadas,
          // Dados de vendas por produto (colunas específicas)
          vendas_planejamento: data.vendas_planejamento || 0,
          vendas_seguros: data.vendas_seguros || 0,
          vendas_credito: data.vendas_credito || 0,
          vendas_outros: data.vendas_outros || 0,
          faturamento_planejamento: data.faturamento_planejamento || 0,
          faturamento_seguros: data.faturamento_seguros || 0,
          faturamento_credito: data.faturamento_credito || 0,
          faturamento_outros: data.faturamento_outros || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error('Erro ao inserir dados da campanha:', error)
        return false
      }

      console.log('✅ Dados da campanha salvos com sucesso')
      return true
    } catch (error) {
      console.error('Erro ao salvar dados da campanha:', error)
      return false
    }
  }

  async loadCampaignData(): Promise<CampaignData | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from('campaign_data')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Erro ao carregar dados da campanha:', error)
        return null
      }

      return data && data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Erro ao carregar dados da campanha:', error)
      return null
    }
  }

  isAvailable(): boolean {
    return supabase !== null
  }
}

// Implementação mock para quando Supabase não estiver disponível
class MockDataService implements DataService {
  async saveLeads(): Promise<boolean> {
    console.log('Supabase não configurado - dados não salvos')
    return false
  }

  async loadLeads(): Promise<LeadData[]> {
    console.log('Supabase não configurado - retornando array vazio')
    return []
  }

  async clearLeads(): Promise<boolean> {
    console.log('Supabase não configurado - operação ignorada')
    return false
  }

  async saveCampaignData(): Promise<boolean> {
    console.log('Supabase não configurado - dados não salvos')
    return false
  }

  async loadCampaignData(): Promise<CampaignData | null> {
    console.log('Supabase não configurado - retornando null')
    return null
  }

  async extractManualDataFromCSV(leads: LeadData[]): Promise<CampaignData> {
    console.log('Supabase não configurado - retornando dados vazios')
    return {
      ltv: 0,
      margem_bruta: 0,
      verba_gasta: 0,
      vendas_efetuadas: 0,
      vendas_planejamento: 0,
      vendas_seguros: 0,
      vendas_credito: 0,
      faturamento_total: 0,
      faturamento_planejamento: 0,
      faturamento_seguros: 0,
      faturamento_credito: 0,
      churn_rate: 0,
      reunioes_agendadas: 0,
      reunioes_realizadas: 0
    }
  }

  isAvailable(): boolean {
    return false
  }
}

// Exportar instância do serviço
export const dataService: DataService = supabase
  ? new SupabaseDataService()
  : new MockDataService()

// Função para verificar se o Supabase está configurado
export const isDataServiceAvailable = () => dataService.isAvailable()


