export interface ManualInputs {
  ltv: number
  margemBruta: number
  verbaGasta: number
  vendasEfetuadas: number
  faturamentoTotal: number
  churnRate: number
  reunioesAgendadas: number
  reunioesRealizadas: number
}

export interface Filters {
  startDate: string
  endDate: string
  month: string
}

export interface AnalysisType {
  key: string
  label: string
  disabled?: boolean
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string
    borderWidth?: number
    fill?: boolean
  }[]
}

export interface SummaryCard {
  icon: string
  label: string
  value: string | number
  color?: string
}

export interface AdsetData {
  adset: string
  totalLeads: number
  totalSales: number
  totalRevenue: number
  conversionRate: number
}

export interface WeekdayData {
  weekday: string
  totalLeads: number
  qualified: number
  highIncome: number
  sales: number
  totalRevenue: number
  qualifiedRate: number
  conversionRate: number
}

export interface HourlyData {
  hour: number
  hourLabel: string
  totalLeads: number
  qualified: number
  highIncome: number
  sales: number
  totalRevenue: number
  qualifiedRate: number
  conversionRate: number
}

export interface ConversionData {
  leadDate: string
  saleDate: string
  conversionDays: number
  isQualified: boolean
  isHighIncome: boolean
  adset: string
}
