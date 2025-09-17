import { createClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from '../config/supabase'

// Criar cliente Supabase apenas se as variáveis estiverem configuradas
export const supabase = SUPABASE_CONFIG.isConfigured()
  ? createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null

// Função para verificar se o Supabase está disponível
export const isSupabaseAvailable = () => supabase !== null

// Tipos para os dados do dashboard
export interface LeadData {
  id?: number
  created_at?: string
  nome?: string
  email?: string
  telefone?: string
  renda?: string
  qual_sua_renda_mensal?: string
  Data_da_venda?: string
  Venda_planejamento?: string
  Venda_efetuada?: string
  venda_efetuada?: string
  venda?: string
  Venda?: string
  sale?: string
  Sale?: string
  adset?: string
  campaign?: string
  // Novas colunas para seguros e crédito
  venda_seguros?: string
  venda_credito?: string
  // Campos manuais da campanha (podem vir do CSV)
  ltv?: string
  margem_bruta?: string
  verba_gasta?: string
  vendas_efetuadas?: string
  vendas_planejamento?: string
  faturamento_total?: string
  churn_rate?: string
  reunioes_agendadas?: string
  reunioes_realizadas?: string
  [key: string]: any
}

export interface CampaignData {
  id?: number
  created_at?: string
  ltv?: number
  margem_bruta?: number
  verba_gasta?: number
  vendas_efetuadas?: number
  vendas_planejamento?: number
  vendas_seguros?: number
  vendas_credito?: number
  faturamento_total?: number
  faturamento_planejamento?: number
  faturamento_seguros?: number
  faturamento_credito?: number
  churn_rate?: number
  reunioes_agendadas?: number
  reunioes_realizadas?: number
  updated_at?: string
}
