import { useState, useEffect, useCallback } from 'react'
import type { LeadData, CampaignData } from '../lib/supabase'
import { dataService, isDataServiceAvailable } from '../services/dataService'

// Interface para dados manuais da campanha
export interface ManualInputs {
  ltv: number
  margemBruta: number
  verbaGasta: number
  vendasEfetuadas: number
  vendasPlanejamento: number
  vendasSeguros: number
  vendasCredito: number
  faturamentoTotal: number
  faturamentoPlanejamento: number
  faturamentoSeguros: number
  faturamentoCredito: number
  churnRate: number
  reunioesAgendadas: number
  reunioesRealizadas: number
}

// Hook para gerenciar dados do dashboard
export const useDataManager = () => {
  // Estados para dados CSV
  const [csvData, setCsvData] = useState<LeadData[]>([])
  const [fileUploaded, setFileUploaded] = useState(false)
  
  // Estados para dados manuais
  const [manualInputs, setManualInputs] = useState<ManualInputs>({
    ltv: 0,
    margemBruta: 0,
    verbaGasta: 0,
    vendasEfetuadas: 0,
    vendasPlanejamento: 0,
    vendasSeguros: 0,
    vendasCredito: 0,
    faturamentoTotal: 0,
    faturamentoPlanejamento: 0,
    faturamentoSeguros: 0,
    faturamentoCredito: 0,
    churnRate: 0,
    reunioesAgendadas: 0,
    reunioesRealizadas: 0
  })
  
  // Estados para persistência
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Verificar disponibilidade do Supabase
  useEffect(() => {
    setIsSupabaseAvailable(isDataServiceAvailable())
  }, [])

  // Carregar dados salvos do Supabase
  const loadSavedData = useCallback(async () => {
    console.log('🔍 loadSavedData chamado, isSupabaseAvailable:', isSupabaseAvailable)
    if (!isSupabaseAvailable) {
      console.log('❌ Supabase não disponível, saindo do loadSavedData')
      return
    }
    
    console.log('⏳ Iniciando carregamento de dados...')
    setIsLoading(true)
    try {
      let dataLoaded = false
      // Carregar leads
      const leads = await dataService.loadLeads()
      if (leads.length > 0) {
        setCsvData(leads)
        console.log(`📊 Dados de leads carregados do Supabase: ${leads.length} leads`)
      }
      
      // Carregar dados da campanha
      console.log('🔍 Chamando dataService.loadCampaignData()...')
      const campaignData = await dataService.loadCampaignData()
      console.log('🔍 Resultado de loadCampaignData:', campaignData)
      if (campaignData) {
        console.log('📊 Dados RAW da campanha carregados do Supabase (antes da conversão):', campaignData) // Log original

        const newManualInputs: ManualInputs = {
          ltv: parseFloat(String(campaignData.ltv)) || 0,
          margemBruta: parseFloat(String(campaignData.margem_bruta)) || 0,
          verbaGasta: parseFloat(String(campaignData.verba_gasta)) || 0,
          vendasEfetuadas: parseInt(String(campaignData.vendas_efetuadas)) || 0,
          vendasPlanejamento: parseInt(String(campaignData.vendas_planejamento)) || 0,
          vendasSeguros: parseInt(String(campaignData.vendas_seguros)) || 0,
          vendasCredito: parseInt(String(campaignData.vendas_credito)) || 0,
          faturamentoTotal: parseFloat(String(campaignData.faturamento_total)) || 0,
          faturamentoPlanejamento: parseFloat(String(campaignData.faturamento_planejamento)) || 0,
          faturamentoSeguros: parseFloat(String(campaignData.faturamento_seguros)) || 0,
          faturamentoCredito: parseFloat(String(campaignData.faturamento_credito)) || 0,
          churnRate: parseFloat(String(campaignData.churn_rate)) || 0,
          reunioesAgendadas: parseInt(String(campaignData.reunioes_agendadas)) || 0,
          reunioesRealizadas: parseInt(String(campaignData.reunioes_realizadas)) || 0
        }
        
        console.log('📊 Objeto newManualInputs a ser definido no estado:', newManualInputs) // NOVO LOG CRÍTICO
        
        setManualInputs(newManualInputs) // Chamar com o novo objeto
        // O console.log anterior para manualInputs após setManualInputs será removido, pois é assíncrono
      }
        const isFileUploaded = leads.length > 0 || (campaignData && campaignData.vendas_efetuadas > 0)
        setFileUploaded(isFileUploaded)
        console.log('📊 fileUploaded definido como:', isFileUploaded) // NOVO LOG para fileUploaded
        
        // Forçar atualização do fileUploaded se há dados de campanha
        if (campaignData && campaignData.vendas_efetuadas > 0) {
          console.log('🚀 Forçando fileUploaded = true devido a dados de campanha')
          setFileUploaded(true)
      }
    } catch (error) {
      console.error('Erro ao carregar dados salvos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [isSupabaseAvailable, dataService, setCsvData, setManualInputs, setFileUploaded])

  // Salvar leads no Supabase
  const saveLeads = async (leads: LeadData[]): Promise<boolean> => {
    if (!isSupabaseAvailable) return false
    
    setIsLoading(true)
    try {
      const success = await dataService.saveLeads(leads)
      if (success) {
        setLastSaved(new Date())
      }
      return success
    } catch (error) {
      console.error('Erro ao salvar leads:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Salvar dados da campanha no Supabase
  const saveCampaignData = async (): Promise<boolean> => {
    if (!isSupabaseAvailable) return false
    
    setIsLoading(true)
    try {
      const campaignData: CampaignData = {
        ltv: 8723.24, // Valor fixo
        margem_bruta: 58.72, // Valor fixo
        verba_gasta: manualInputs.verbaGasta,
        vendas_efetuadas: manualInputs.vendasEfetuadas,
        vendas_planejamento: manualInputs.vendasPlanejamento,
        vendas_seguros: manualInputs.vendasSeguros,
        vendas_credito: manualInputs.vendasCredito,
        faturamento_total: manualInputs.faturamentoTotal,
        faturamento_planejamento: manualInputs.faturamentoPlanejamento,
        faturamento_seguros: manualInputs.faturamentoSeguros,
        faturamento_credito: manualInputs.faturamentoCredito,
        churn_rate: manualInputs.churnRate,
        reunioes_agendadas: manualInputs.reunioesAgendadas,
        reunioes_realizadas: manualInputs.reunioesRealizadas
      }
      
      const success = await dataService.saveCampaignData(campaignData)
      if (success) {
        setLastSaved(new Date())
      }
      return success
    } catch (error) {
      console.error('Erro ao salvar dados da campanha:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Limpar todos os dados
  const clearAllData = async (): Promise<boolean> => {
    if (!isSupabaseAvailable) return false
    
    setIsLoading(true)
    try {
      const success = await dataService.clearLeads()
      if (success) {
        setCsvData([])
        setFileUploaded(false)
        setLastSaved(null)
      }
      return success
    } catch (error) {
      console.error('Erro ao limpar dados:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  // Atualizar dados CSV (compatível com funcionalidade atual)
  const updateCsvData = useCallback((newData: LeadData[]) => {
    setCsvData(newData)
    setFileUploaded(newData.length > 0)
    
    // NÃO salvar automaticamente aqui - será feito no handleFileUpload
  }, [])

  // Atualizar dados manuais (compatível com funcionalidade atual)
  const updateManualInputs = useCallback((newInputs: Partial<ManualInputs>) => {
    setManualInputs(prev => ({ ...prev, ...newInputs }))
  }, [])

  // Salvar dados manuais automaticamente quando mudarem
  // DESABILITADO: Evitar salvar dados zerados automaticamente
  // useEffect(() => {
  //   if (isSupabaseAvailable) {
  //     const timeoutId = setTimeout(() => {
  //       saveCampaignData()
  //     }, 2000) // Debounce de 2 segundos
  //     
  //     return () => clearTimeout(timeoutId)
  //   }
  // }, [manualInputs, isSupabaseAvailable])

  return {
    // Dados
    csvData,
    manualInputs,
    fileUploaded,
    
    // Estados
    isSupabaseAvailable,
    isLoading,
    lastSaved,
    
    // Funções
    updateCsvData,
    updateManualInputs,
    saveLeads,
    saveCampaignData,
    clearAllData,
    loadSavedData, // Exportar loadSavedData
    setFileUploaded
  }
}
