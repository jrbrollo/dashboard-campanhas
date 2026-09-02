import React, { useState, useEffect, useMemo, useCallback } from 'react'
import ChartComponent from './ChartComponent'
import DataStatus from './DataStatus'
import { useDataManager } from '../hooks/useDataManager'
import { dataService } from '../services/dataService'
import { MonthlyBudgetManager } from './MonthlyBudgetManager'
import { supabase } from '../lib/supabase'
import type { MonthlyBudget } from '../lib/supabase'

interface LeadData {
  [key: string]: string
}

interface ManualInputs {
  verbaGasta: number
  vendasEfetuadas: number
  faturamentoTotal: number
  churnRate: number
  reunioesAgendadas: number
  reunioesRealizadas: number
}


// interface AnalysisType {
//   key: string
//   label: string
//   disabled?: boolean
// }

// Hook de debounce removido

// Componente memoizado removido

// Componente de Tooltip para Cabeçalho da Tabela
const HeaderTooltip = ({ label, tooltip, darkMode }: { label: string, tooltip: string, darkMode: boolean }) => {
  const [hover, setHover] = useState(false)

  return (
    <th
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: 'relative', cursor: 'help' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label}
        <div style={{
          fontSize: '10px',
          width: '14px',
          height: '14px',
          borderRadius: '50%',
          border: `1px solid ${darkMode ? '#64748b' : '#94a3b8'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: darkMode ? '#94a3b8' : '#64748b',
          opacity: 0.8,
          fontFamily: 'serif'
        }}>i</div>
      </div>
      {hover && (
        <div className="animate-fade-in" style={{
          position: 'absolute',
          bottom: '120%',
          left: '50%',
          transform: 'translateX(-50%)',
          minWidth: '180px',
          maxWidth: '220px',
          padding: '8px 12px',
          backgroundColor: darkMode ? '#1e293b' : '#334155',
          color: '#f8fafc',
          fontSize: '12px',
          fontWeight: 400,
          borderRadius: '6px',
          zIndex: 100,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          pointerEvents: 'none',
          textAlign: 'center',
          lineHeight: '1.4',
          border: `1px solid ${darkMode ? '#334155' : '#cbd5e1'}`
        }}>
          {tooltip}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            marginLeft: '-6px',
            borderWidth: '6px',
            borderStyle: 'solid',
            borderColor: `${darkMode ? '#1e293b' : '#334155'} transparent transparent transparent`
          }}></div>
        </div>
      )}
    </th>
  )
}

const Dashboard: React.FC = () => {
  // Usar o hook de gerenciamento de dados do Supabase
  const {
    csvData,
    manualInputs,
    fileUploaded,
    isLoading,
    isSupabaseAvailable,
    updateCsvData,
    updateManualInputs,
    saveLeads,
    setFileUploaded,
    loadSavedData // Importar loadSavedData
  } = useDataManager()

  // Carregar dados salvos ao montar o componente
  useEffect(() => {
    if (isSupabaseAvailable) {
      loadSavedData()
    }
  }, [isSupabaseAvailable]) // Remover loadSavedData das dependências para evitar loop

  // Forçar re-renderização quando manualInputs mudar
  useEffect(() => {
    // manualInputs mudou - re-renderizar se necessário
  }, [manualInputs])

  // Filtros removidos - sempre usar dados completos para cálculos corretos

  // Filtros normais
  const [selectedAnalysis, setSelectedAnalysis] = useState('overview')
  const [darkMode, setDarkMode] = useState(() => {
    // Verificar se há preferência salva no localStorage, senão usar modo escuro como padrão
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isDataSectionExpanded, setIsDataSectionExpanded] = useState(false)
  // Filtro local de campanha para análises de leads por conjunto/anúncio
  const [campaignFilterLeads, setCampaignFilterLeads] = useState<string>('Todas')
  // Mês selecionado para a Análise Mensal
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  // Campanhas ocultas na Visão Geral de Campanhas
  const [hiddenCampaigns, setHiddenCampaigns] = useState<Set<string>>(new Set())
  const [campaignFilterOpen, setCampaignFilterOpen] = useState(false)
  // Filtro temporal da Visão Geral de Campanhas (formato YYYY-MM)
  const [campaignDateFrom, setCampaignDateFrom] = useState('')
  const [campaignDateTo, setCampaignDateTo] = useState('')
  // Como a Visão Geral de Campanhas lê as vendas no período:
  // 'safra' = pelo mês de chegada do lead | 'vendas' = pelo mês em que a venda aconteceu
  const [campaignViewMode, setCampaignViewMode] = useState<'safra' | 'vendas'>('safra')
  // Filtros da Comparação Mensal de Leads (Entrada de Leads e Alta Renda)
  const [leadsMonthlyHiddenCampaigns, setLeadsMonthlyHiddenCampaigns] = useState<Set<string>>(new Set())
  const [leadsMonthlyFilterOpen, setLeadsMonthlyFilterOpen] = useState(false)
  const [leadsMonthlyDateFrom, setLeadsMonthlyDateFrom] = useState('')
  const [leadsMonthlyDateTo, setLeadsMonthlyDateTo] = useState('')
  // Filtros de Vendas por Faixa de Renda (Performance de Vendas)
  const [salesIncomeHiddenCampaigns, setSalesIncomeHiddenCampaigns] = useState<Set<string>>(new Set())
  const [salesIncomeFilterOpen, setSalesIncomeFilterOpen] = useState(false)
  const [salesIncomeDateFrom, setSalesIncomeDateFrom] = useState('')
  const [salesIncomeDateTo, setSalesIncomeDateTo] = useState('')

  // Monthly Budgets State
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudget[]>([])

  // Estado de ordenação da tabela de Cohort
  const [cohortSortConfig, setCohortSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)

  const fetchMonthlyBudgets = useCallback(async () => {
    try {
      if (!isSupabaseAvailable) return

      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .order('month', { ascending: false })

      if (error) throw error
      setMonthlyBudgets(data || [])
    } catch (error) {
      console.error('Error fetching budgets:', error)
    }
  }, [isSupabaseAvailable])

  useEffect(() => {
    fetchMonthlyBudgets()
  }, [fetchMonthlyBudgets])

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : ''
    // Salvar preferência no localStorage
    localStorage.setItem('darkMode', JSON.stringify(darkMode))
  }, [darkMode])

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  // Todas as otimizações removidas

  const isCategoryExpanded = (category: string) => {
    return expandedCategories.includes(category)
  }

  // Função para normalizar strings de renda (remove R$, pontos e espaços)
  const normalizeIncome = (s: string): string => {
    if (!s) return ''
    return s.toLowerCase()
      .replace(/r\$/g, '')
      .replace(/\./g, '')
      .replace(/\s/g, '')
      .trim()
  }

  const incomeLabels: Record<string, string> = {
    "menos_do_que_3000": "Menos de R$ 3.000",
    "3000_a_5999": "R$ 3.000 - R$ 5.999",
    "6000_a_9999": "R$ 6.000 - R$ 9.999",
    "10000_a_14999": "R$ 10.000 - R$ 14.999",
    "15000_a_19999": "R$ 15.000 - R$ 19.999",
    "20000_a_29999": "R$ 20.000 - R$ 29.999",
    "acima_de_30000": "Acima de R$ 30.000"
  }



  const parseCSV = (text: string): LeadData[] => {
    const lines = text.split('\n').filter(l => l.trim())
    if (!lines.length) return []

    const firstLine = lines[0]
    let sep = ','
    if (firstLine.includes(';')) sep = ';'
    else if (firstLine.includes('\t')) sep = '\t'

    const parseLine = (line: string) => {
      const clean = line.replace(/\r/g, '').trim()
      if (sep !== ',') return clean.split(sep).map(f => f.trim().replace(/^"|"$/g, ''))

      const res: string[] = []
      let cur = ''
      let inQ = false
      for (let ch of clean) {
        if (ch === '"') inQ = !inQ
        else if (ch === ',' && !inQ) {
          res.push(cur.trim().replace(/^"|"$/g, ''))
          cur = ''
        }
        else cur += ch
      }
      res.push(cur.trim().replace(/^"|"$/g, ''))
      return res
    }

    const headers = parseLine(firstLine)
    const data: LeadData[] = []

    // Verificar se existe coluna de e-mail
    const emailCol = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL']
    const hasEmailColumn = headers.some(h => emailCol.includes(h.trim()))

    if (!hasEmailColumn) {
      throw new Error('ERRO: A planilha deve conter uma coluna de e-mail. Colunas aceitas: email, Email, EMAIL, e-mail, E-mail, E-MAIL')
    }

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue
      const vals = parseLine(lines[i])
      const row: LeadData = {}
      headers.forEach((h, idx) => row[h.trim()] = (vals[idx] || '').trim())

      // Verificar se o lead tem dados válidos
      if (!Object.values(row).some(v => v && v.length > 0)) continue

      // Buscar e-mail na linha
      const email = getColumnValue(row, emailCol)

      // Validar se e-mail existe e não está vazio
      if (!email || email.trim() === '') {
        console.warn(`Linha ${i + 1}: Lead sem e-mail foi ignorado`)
        continue
      }

      // Validar formato básico do e-mail
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        console.warn(`Linha ${i + 1}: E-mail inválido "${email}" foi ignorado`)
        continue
      }

      // Nota: NÃO deduplicar por e-mail aqui. Cada linha do CSV representa
      // uma entrada de lead distinta (mesmo e-mail pode aparecer em campanhas
      // diferentes). Métricas que precisam de contagem por pessoa única
      // (uniqueBuyers, etc.) já usam Set<string> na agregação.
      data.push(row)
    }

    return data
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string
        const data = parseCSV(String(text))

        if (data.length === 0) {
          alert('Nenhum lead válido foi encontrado na planilha. Verifique se há dados e se todos os leads possuem e-mail válido.')
          return
        }

        updateCsvData(data)
        setFileUploaded(true)

        // Mostrar resumo do processamento
        const totalProcessed = data.length
        alert(`Planilha processada com sucesso!\n\n${totalProcessed} leads válidos foram carregados.\n\nNota: Leads sem e-mail ou com e-mails inválidos foram automaticamente ignorados.`)

        // Salvar no Supabase se disponível
        if (isSupabaseAvailable) {
          await saveLeads(data)

          // Extrair dados manuais do CSV se existirem
          const manualData = await dataService.extractManualDataFromCSV(data)
          if (manualData) {

            updateManualInputs({
              verbaGasta: manualData.verba_gasta || 0,
              vendasEfetuadas: manualData.vendas_efetuadas || 0,
              vendasPlanejamento: manualData.vendas_planejamento || 0,
              vendasSeguros: manualData.vendas_seguros || 0,
              vendasCredito: manualData.vendas_credito || 0,
              faturamentoTotal: manualData.faturamento_total || 0,
              faturamentoPlanejamento: manualData.faturamento_planejamento || 0,
              faturamentoSeguros: manualData.faturamento_seguros || 0,
              faturamentoCredito: manualData.faturamento_credito || 0,
              churnRate: manualData.churn_rate || 0,
              reunioesAgendadas: (manualData as any).reunioes_agendadas || 0,
              reunioesRealizadas: (manualData as any).reunioes_realizadas || 0
            })

            // Salvar dados da campanha no Supabase
            await dataService.saveCampaignData(manualData)
          }
        }
      } catch (error) {
        console.error('Erro ao processar o arquivo CSV:', error)
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
        alert(`Erro ao processar o arquivo CSV:\n\n${errorMessage}\n\nVerifique o console para mais detalhes.`)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  // const handleInputChange = (field: keyof ManualInputs, value: string) => {
  //   const n = parseFloat(value)
  //   const newValue = isNaN(n) ? 0 : n
  //   
  //   // Atualizar o estado local
  //   updateManualInputs({ [field]: newValue })
  //   
  //   // Salvar no Supabase se disponível (o hook salva automaticamente via useEffect)
  //   // Não precisamos chamar saveCampaignData manualmente
  // }

  const getColumnValue = (row: LeadData, names: string[]): string => {
    for (const name of names) if (Object.prototype.hasOwnProperty.call(row, name)) return row[name]
    const keys = Object.keys(row)
    for (const name of names) {
      const k = keys.find(key => key.toLowerCase().trim() === name.toLowerCase().trim())
      if (k) return row[k]
    }
    for (const name of names) {
      const k = keys.find(key => key.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(key.toLowerCase()))
      if (k) return row[k]
    }
    return ''
  }

  // Uma linha pode vir do CSV (colunas originais) ou do Supabase, onde a linha original do CSV
  // é preservada em raw_data. Várias colunas da planilha não têm coluna própria na tabela leads,
  // então só sobrevivem ali — por isso toda busca de produto olha as duas fontes.
  const getRowSources = (row: LeadData): any[] => {
    const raw = (row as any)?.raw_data
    return raw && typeof raw === 'object' ? [row, raw] : [row]
  }

  // Busca ESTRITA (sem match parcial) — obrigatória para colunas de produto.
  // O match parcial de getColumnValue faz 'venda_renov_planejamento' casar com a coluna 'venda',
  // que é um alias do valor da venda ORIGINAL criado ao gravar no Supabase (ver saveLeads), e faria
  // 'venda_outros' casar com 'venda_outros_2'. Isso criaria vendas fantasma.
  // Mapa "chave em minúsculas -> chave original" por objeto. Sem ele, cada consulta que não
  // acerta o nome exato refazia Object.keys() + find() por linha, por produto — milhares de
  // varreduras por agregação. O WeakMap deixa a linha ser coletada pelo GC normalmente.
  const mapaChavesCache = new WeakMap<object, Record<string, string>>()
  const mapaChaves = (obj: any): Record<string, string> => {
    let mapa = mapaChavesCache.get(obj)
    if (!mapa) {
      mapa = {}
      for (const key of Object.keys(obj)) mapa[key.toLowerCase().trim()] = key
      mapaChavesCache.set(obj, mapa)
    }
    return mapa
  }

  const getStrictValue = (row: LeadData, names: string[]): string => {
    const lookup = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return ''
      for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(obj, name)) return obj[name] ?? ''
      }
      const mapa = mapaChaves(obj)
      for (const name of names) {
        const k = mapa[name.toLowerCase().trim()]
        if (k !== undefined) return obj[k] ?? ''
      }
      return ''
    }
    return lookup(row) || lookup((row as any).raw_data)
  }

  // Converte um valor monetário em número.
  // Trata os DOIS formatos que chegam: string do CSV ("R$ 1.078,80") e número nativo do Supabase
  // (1078.8, nas colunas gravadas como numeric — venda_outros, churn_value). Sem o tratamento de
  // número, o replace de '.' apagaria o separador decimal e 1078.8 viraria 10788.
  const toNum = (raw: any): number => {
    if (raw === null || raw === undefined) return 0
    if (typeof raw === 'number') return isFinite(raw) ? raw : 0
    const s = String(raw).trim()
    if (!s || s.includes(';')) return 0
    return parseFloat(s.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
  }

  // ===== Vendas repetidas do mesmo produto =====
  // Convenção da planilha: a 1ª venda usa a coluna base ('venda_seguros' + 'data_venda_seguro') e
  // as vendas seguintes do MESMO produto usam sufixo numérico ('venda_seguros_2' +
  // 'data_venda_seguros_2', depois '_3', '_4'...). Para registrar mais uma venda basta criar o par
  // de colunas na planilha — nada aqui precisa mudar.
  // Colunas do produto normalizadas uma vez por array. O mesmo array é reusado em todas as
  // linhas de uma agregação, então vale cachear em vez de normalizar linha a linha.
  const basesCache = new WeakMap<string[], string[]>()
  const basesNormalizadas = (valueCols: string[]): string[] => {
    let bases = basesCache.get(valueCols)
    if (!bases) {
      bases = valueCols.map(c => c.trim().toLowerCase())
      basesCache.set(valueCols, bases)
    }
    return bases
  }

  const APENAS_DIGITOS = /^\d+$/
  const UNDERSCORE = 95

  // Descobre quais sufixos numerados existem na linha para um produto (ex.: ['2', '3']).
  // Este trecho roda para cada produto de cada linha: construir um RegExp aqui dentro custava
  // ~2 milhões de alocações por agregação e travava a tela. Comparação de string resolve.
  const getExtraSaleSuffixes = (row: LeadData, valueCols: string[]): string[] => {
    const bases = basesNormalizadas(valueCols)
    let found: Set<string> | null = null
    for (const src of getRowSources(row)) {
      for (const key of Object.keys(src)) {
        const k = key.toLowerCase()
        for (let i = 0; i < bases.length; i++) {
          const base = bases[i]
          if (k.length > base.length + 1 && k.charCodeAt(base.length) === UNDERSCORE && k.startsWith(base)) {
            const sufixo = k.slice(base.length + 1)
            if (APENAS_DIGITOS.test(sufixo)) (found || (found = new Set<string>())).add(sufixo)
          }
        }
      }
    }
    return found ? Array.from(found).sort((a, b) => Number(a) - Number(b)) : []
  }

  // Todas as vendas de um produto numa linha: a venda base + cada venda numerada.
  // Cada item traz o valor e a data ORIGINAL daquela venda específica.
  const getProductSales = (row: LeadData, valueCols: string[], dateCols: string[] = []): Array<{ value: number, dateRaw: string }> => {
    const sales: Array<{ value: number, dateRaw: string }> = []

    const baseValue = toNum(getStrictValue(row, valueCols))
    if (baseValue > 0) sales.push({ value: baseValue, dateRaw: dateCols.length ? getStrictValue(row, dateCols) : '' })

    for (const suffix of getExtraSaleSuffixes(row, valueCols)) {
      const value = toNum(getStrictValue(row, valueCols.map(c => `${c}_${suffix}`)))
      if (value > 0) {
        sales.push({ value, dateRaw: dateCols.length ? getStrictValue(row, dateCols.map(c => `${c}_${suffix}`)) : '' })
      }
    }

    return sales
  }

  // Total de um produto numa linha: quantas vendas e a soma dos valores.
  const getProductTotal = (row: LeadData, valueCols: string[]): { count: number, value: number } => {
    const sales = getProductSales(row, valueCols)
    return { count: sales.length, value: sales.reduce((sum, s) => sum + s.value, 0) }
  }

  const parseDate = (s: string): Date | null => {
    if (!s) return null
    // Handle Excel serial date (numeric string)
    if (/^\d+$/.test(s)) {
      const serial = parseInt(s, 10)
      if (serial > 20000) { // Basic sanity check (starts around 1954)
        // Excel base date is 1899-12-30
        const date = new Date((serial - 25569) * 86400 * 1000)
        // Add minimal timezone offset compensation if needed, but usually UTC is fine for day level
        // But Javascript dates are local, so we just return the object. 
        // Often adding a few hours helps avoid "previous day" issues due to timezone, 
        // but let's stick to standard conversion first or use simple UTC construction.
        // Actually, easiest way to avoid TZ issues with days is:
        return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      }
    }

    // Handle DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
      const parts = s.split('/')
      // parts[0] = day, parts[1] = month, parts[2] = year
      const day = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const year = parseInt(parts[2], 10)
      return new Date(year, month, day)
    }

    // Default ISO/US parsing
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  const formatMonthYear = (d: Date): string | null => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : null
  const getMonthName = (my: string): string => {
    if (!my) return ''
    const [y, m] = my.split('-')
    const d = new Date(parseInt(y), parseInt(m) - 1)
    return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  // Sempre usar dados completos para cálculos corretos
  const filteredData = csvData

  // Opções de campanha (declarado após getCampaignName)

  // Cards superiores sempre usam dados completos
  const totalLeads = filteredData.length

  // Calcular data do lead mais recente
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastLeadDate = useMemo(() => {
    if (csvData.length === 0) return null

    // Procurar pela data mais recente nos leads
    let mostRecentDate: Date | null = null

    csvData.forEach(lead => {
      // Priorizar created_time (data real do lead) sobre created_at (data de inserção no Supabase)
      const dateFields = ['created_time', 'Data_da_venda', 'data_da_venda']

      for (const field of dateFields) {
        const dateValue = lead[field]
        if (dateValue) {
          try {
            const date = new Date(dateValue)
            if (!isNaN(date.getTime())) {
              if (!mostRecentDate || date > mostRecentDate) {
                mostRecentDate = date
              }
            }
          } catch (e) {
            // Ignorar datas inválidas
          }
        }
      }
    })

    return mostRecentDate
  }, [csvData])

  // ===== Análise de Churn =====
  const churnAnalysis = useMemo(() => {
    const churnValCol = ['churn', 'churn_value', 'Churn']
    const churnDateCol = ['Data_do_churn', 'churn_date', 'data_do_churn']
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']

    let totalChurnValue = 0
    let totalChurnCount = 0
    const churnByMonth: Record<string, number> = {}
    const timeToChurn: Record<string, number> = {} // "1 mês", "2 meses", etc.
    let churnWithoutDate = 0 // Churns sem data informada
    let churnWithoutCohort = 0 // Churns sem período de cohort calculável


    filteredData.forEach(row => {
      const churnVal = toNum(getColumnValue(row, churnValCol))
      const churnDateStr = getColumnValue(row, churnDateCol)

      if (churnVal > 0 || (churnDateStr && churnDateStr.trim() !== '')) {
        totalChurnCount++
        totalChurnValue += churnVal

        // Churn por mês
        const churnDate = parseDate(churnDateStr)
        if (churnDate) {
          const monthKey = formatMonthYear(churnDate)
          if (monthKey) {
            churnByMonth[monthKey] = (churnByMonth[monthKey] || 0) + 1
          }

          // Tempo até o churn (Cohort)
          const saleDate = parseDate(getColumnValue(row, saleDateCol))
          if (saleDate) {
            const diffTime = Math.abs(churnDate.getTime() - saleDate.getTime())
            const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))
            const label = diffMonths <= 1 ? '1º Mês' : `${diffMonths}º Mês`
            timeToChurn[label] = (timeToChurn[label] || 0) + 1
          } else {
            // Churn tem data mas não tem data de venda para calcular cohort
            churnWithoutCohort++
          }
        } else {
          // Churn sem data informada
          churnWithoutDate++
          churnWithoutCohort++
        }
      }
    })

    // Adicionar churns sem data ao breakdown mensal
    const churnByMonthArray = Object.entries(churnByMonth)
      .map(([key, value]) => ({ month: getMonthName(key), count: value, key }))
      .sort((a, b) => a.key.localeCompare(b.key))

    if (churnWithoutDate > 0) {
      churnByMonthArray.push({ month: 'Data não informada', count: churnWithoutDate, key: 'zzz' })
    }

    // Adicionar churns sem cohort ao breakdown de tempo
    const timeToChurnArray = Object.entries(timeToChurn)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => {
        const getNum = (s: string) => parseInt(s.replace(/\D/g, '')) || 0
        return getNum(a.label) - getNum(b.label)
      })

    if (churnWithoutCohort > 0) {
      timeToChurnArray.push({ label: 'Período não informado', value: churnWithoutCohort })
    }

    return {
      totalChurnValue,
      totalChurnCount,
      churnByMonth: churnByMonthArray,
      timeToChurn: timeToChurnArray
    }
  }, [filteredData])


  const hasValidSale = (row: LeadData): boolean => {
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const salesSegurosCol = ['venda_seguros']
    const salesCreditoCol = ['venda_credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos']

    const checkSale = (cols: string[]): boolean => getProductTotal(row, cols).value > 0

    return checkSale(salesPlanejamentoCol) || checkSale(salesRenovPlanejamentoCol) ||
      checkSale(salesSegurosCol) || checkSale(salesCreditoCol) || checkSale(salesOutrosCol)
  }

  const salesFromCSV = useMemo(() => {
    // Agora usando manualInputs.vendasEfetuadas que vem do Supabase via campaignData
    return manualInputs.vendasEfetuadas
  }, [manualInputs.vendasEfetuadas])

  // Calcular clientes únicos que compraram (qualquer produto)
  const uniqueBuyers = useMemo(() => {
    const buyers = new Set<string>()
    const emailCol = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL']

    filteredData.forEach(row => {
      const email = getColumnValue(row, emailCol)
      if (!email) return

      // Comprou qualquer produto? (inclui renovação e vendas repetidas do mesmo produto)
      const comprou = [
        ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada'],
        ['venda_renov_planejamento'],
        ['venda_seguros'],
        ['venda_credito'],
        ['venda_outros', 'Outros_Produtos', 'outros_produtos']
      ].some(cols => getProductTotal(row, cols).value > 0)

      if (comprou) buyers.add(email)
    })
    return buyers.size
  }, [filteredData])

  // Valores fixos da campanha
  const LTV_FIXO = 8723.24
  const MARGEM_BRUTA_FIXA = 58.72

  // const ticketMedio = manualInputs.vendasEfetuadas > 0 ? manualInputs.faturamentoTotal / manualInputs.vendasEfetuadas : 0
  const cac = uniqueBuyers > 0 ? manualInputs.verbaGasta / uniqueBuyers : 0
  const ltgp = (LTV_FIXO * MARGEM_BRUTA_FIXA) / 100
  const ltgpCac = cac > 0 ? ltgp / cac : 0
  const taxaLeadReuniao = totalLeads > 0 ? (manualInputs.reunioesAgendadas / totalLeads) * 100 : 0

  // Taxa de churn calculada dinamicamente (% de faturamento perdido)
  const taxaChurnCalculada = manualInputs.faturamentoPlanejamento > 0
    ? (churnAnalysis.totalChurnValue / manualInputs.faturamentoPlanejamento) * 100
    : 0

  // Definição de MQL: renda diferente de "Menos de R$ 3.000"
  const isMqlLead = (income: string): boolean => {
    const normalized = normalizeIncome(income)
    return !!normalized && normalized !== 'menos_do_que_3000'
  }
  const totalMqlLeads = useMemo(() => {
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    return filteredData.filter(row => isMqlLead(getColumnValue(row, incomeCol))).length
  }, [filteredData])
  const taxaMqlReuniao = totalMqlLeads > 0 ? (manualInputs.reunioesAgendadas / totalMqlLeads) * 100 : 0
  const taxaMqlRealizada = totalMqlLeads > 0 ? (manualInputs.reunioesRealizadas / totalMqlLeads) * 100 : 0
  // Calcular clientes únicos que compraram planejamento (para métrica de reunião → venda)
  const uniquePlanejamentoBuyers = useMemo(() => {
    const buyers = new Set<string>()
    const emailCol = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL']

    filteredData.forEach(row => {
      const email = getColumnValue(row, emailCol)
      if (!email) return

      const planejamento = getColumnValue(row, ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada'])
      if (planejamento && String(planejamento).trim() !== '' && !String(planejamento).includes(';')) {
        const valor = parseFloat(String(planejamento).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        if (valor > 0) {
          buyers.add(email)
        }
      }
    })
    return buyers.size
  }, [filteredData])

  // ===== Campanhas: helpers e agregações =====

  const getCampaignName = useCallback((row: LeadData): string => {
    const name = getColumnValue(row, ['campaign_name', 'campaign', 'Campaign Name', 'Campaign'])
    return name && String(name).trim() !== '' ? String(name) : '— Sem campanha'
  }, [])

  // Qualificação de lead por renda (usado nas agregações de campanha)
  const isQualifiedLead = (income: string): boolean => {
    const normalized = normalizeIncome(income)
    return (
      normalized === '6000_a_9999' || normalized === '10000_a_14999' ||
      normalized === '15000_a_19999' || normalized === '20000_a_29999' || normalized === 'acima_de_30000'
    )
  }

  const isHighIncomeLead = (income: string): boolean => {
    const normalized = normalizeIncome(income)
    return (
      normalized === '10000_a_14999' || normalized === '15000_a_19999' ||
      normalized === '20000_a_29999' || normalized === 'acima_de_30000'
    )
  }

  // Opções de campanha disponíveis no dataset atual (depende de filteredData e getCampaignName)
  const campaignOptions = useMemo(() => {
    const all = Array.from(new Set(filteredData.map(r => getCampaignName(r))))
    return ['Todas', ...all]
  }, [filteredData, getCampaignName])

  // ===== Visão Geral de Campanhas: as duas leituras possíveis =====
  // 'safra'  -> atribui as vendas ao período em que o LEAD CHEGOU, independente de quando a venda
  //             aconteceu. Mede a qualidade do lote de leads daquele período.
  // 'vendas' -> conta cada venda no período em que ELA ACONTECEU. Visão de vendas do período.
  // A diferença aparece quando um lead chega num mês e compra em outro.
  const buildCampaignOverview = useCallback((mode: 'safra' | 'vendas', dateFrom: string, dateTo: string) => {
    const createdCol = ['created_time']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const emailCol = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL']
    const churnValCol = ['churn', 'churn_value', 'Churn']
    const churnDateCol = ['Data_do_churn', 'churn_date', 'data_do_churn']
    const dataPlanejamentoCol = ['Data_da_venda', 'data_da_venda', 'sale_date']

    // [colunas de valor, colunas de data, tipo, permite cair na Data_da_venda quando não tem data própria]
    // A renovação não aceita o fallback: sem data própria ela iria para o mês da venda original.
    const produtos: Array<[string[], string[], 'plan' | 'seg' | 'cred' | 'outros', boolean]> = [
      [['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale'], dataPlanejamentoCol, 'plan', true],
      [['venda_renov_planejamento'], ['data_venda_renov_planejamento'], 'plan', false],
      [['venda_seguros'], ['Data_venda_seguros', 'data_venda_seguros', 'data_venda_seguro', 'Data_venda_seguro'], 'seg', true],
      [['venda_credito'], ['Data_venda_credito', 'data_venda_credito'], 'cred', true],
      [['venda_outros', 'Outros_Produtos', 'outros_produtos'], ['Data_venda_outros', 'data_venda_outros'], 'outros', true]
    ]

    const dentroDoPeriodo = (key: string | null): boolean => {
      if (!key) return false
      if (dateFrom && key < dateFrom) return false
      if (dateTo && key > dateTo) return false
      return true
    }

    const map: Record<string, any> = {}
    const bucketFor = (campaign: string) => {
      if (!map[campaign]) {
        map[campaign] = {
          campaign, totalLeads: 0, qualifiedLeads: 0, highIncomeLeads: 0,
          salesPlanejamento: 0, salesSeguros: 0, salesCredito: 0, salesOutros: 0,
          churnValue: 0, churnCount: 0, totalRevenue: 0,
          uniqueBuyerEmails: new Set<string>()
        }
      }
      return map[campaign]
    }

    filteredData.forEach(row => {
      const campaign = getCampaignName(row)
      const leadNoPeriodo = dentroDoPeriodo(formatMonthYear(parseDate(getColumnValue(row, createdCol))))

      // Leads são sempre contados pelo mês de CHEGADA, nos dois modos
      if (leadNoPeriodo) {
        const bucket = bucketFor(campaign)
        bucket.totalLeads++
        const income = getColumnValue(row, incomeCol)
        if (isQualifiedLead(income)) bucket.qualifiedLeads++
        if (isHighIncomeLead(income)) bucket.highIncomeLeads++
      }

      // Vendas: o que muda entre os dois modos é QUAIS vendas entram
      let vendasPlan = 0, vendasSeg = 0, vendasCred = 0, vendasOutros = 0, receita = 0
      for (const [valueCols, dateCols, tipo, permiteFallback] of produtos) {
        for (const venda of getProductSales(row, valueCols, dateCols)) {
          let contar: boolean
          if (mode === 'safra') {
            contar = leadNoPeriodo
          } else {
            let d = parseDate(venda.dateRaw)
            if (!d && permiteFallback) d = parseDate(getColumnValue(row, dataPlanejamentoCol))
            contar = dentroDoPeriodo(formatMonthYear(d))
          }
          if (!contar) continue

          if (tipo === 'plan') vendasPlan++
          if (tipo === 'seg') vendasSeg++
          if (tipo === 'cred') vendasCred++
          if (tipo === 'outros') vendasOutros++
          receita += venda.value
        }
      }

      const totalVendasNaLinha = vendasPlan + vendasSeg + vendasCred + vendasOutros
      if (totalVendasNaLinha > 0) {
        const bucket = bucketFor(campaign)
        bucket.salesPlanejamento += vendasPlan
        bucket.salesSeguros += vendasSeg
        bucket.salesCredito += vendasCred
        bucket.salesOutros += vendasOutros
        bucket.totalRevenue += receita
        // Cliente com venda = comprou QUALQUER produto, incluindo 'Outros'
        const email = getColumnValue(row, emailCol)
        if (email) bucket.uniqueBuyerEmails.add(email.toLowerCase())
      }

      // Churn: no modo safra segue o lead; no modo vendas segue a data do próprio churn
      const churnVal = toNum(getColumnValue(row, churnValCol))
      const churnDateRaw = getColumnValue(row, churnDateCol)
      const temChurn = churnVal > 0 || (churnDateRaw && String(churnDateRaw).trim() !== '')
      if (temChurn) {
        const churnNoPeriodo = mode === 'safra'
          ? leadNoPeriodo
          : dentroDoPeriodo(formatMonthYear(parseDate(churnDateRaw)))
        if (churnNoPeriodo) {
          const bucket = bucketFor(campaign)
          bucket.churnCount++
          bucket.churnValue += churnVal
        }
      }
    })

    return Object.values(map).map((c: any) => ({
      campaign: c.campaign,
      totalLeads: c.totalLeads,
      qualifiedLeads: c.qualifiedLeads,
      highIncomeLeads: c.highIncomeLeads,
      totalSales: c.salesPlanejamento + c.salesSeguros + c.salesCredito + c.salesOutros,
      salesPlanejamento: c.salesPlanejamento,
      salesSeguros: c.salesSeguros,
      salesCredito: c.salesCredito,
      salesOutros: c.salesOutros,
      churnCount: c.churnCount,
      churnValue: c.churnValue,
      clientesComVendas: c.uniqueBuyerEmails.size,
      conversionRate: c.totalLeads > 0 ? ((c.salesPlanejamento + c.salesSeguros + c.salesCredito + c.salesOutros) / c.totalLeads) * 100 : 0,
      totalRevenue: c.totalRevenue
    })).sort((a: any, b: any) => b.totalLeads - a.totalLeads)
  }, [filteredData, getCampaignName])

  // Base sem filtro (usada na lista do filtro e na Performance Temporal por Campanha)
  const campaignOverview = useMemo(
    () => buildCampaignOverview('safra', '', ''),
    [buildCampaignOverview]
  )

  // O que a Visão Geral de Campanhas exibe: respeita o modo e o período escolhidos
  const campaignOverviewDisplay = useMemo(
    () => buildCampaignOverview(campaignViewMode, campaignDateFrom, campaignDateTo),
    [buildCampaignOverview, campaignViewMode, campaignDateFrom, campaignDateTo]
  )

  const temporalCampaignLeads = useMemo(() => {
    const createdCol = ['created_time']
    const map: Record<string, any> = {}
    filteredData.forEach(row => {
      const d = parseDate(getColumnValue(row, createdCol))
      if (!d) return
      const monthKey = formatMonthYear(d)
      if (!monthKey) return
      const campaign = getCampaignName(row)
      const key = `${campaign}__${monthKey}`
      if (!map[key]) {
        map[key] = { campaign, monthKey, month: getMonthName(monthKey), totalLeads: 0 }
      }
      map[key].totalLeads++
    })
    return Object.values(map).sort((a: any, b: any) => a.monthKey.localeCompare(b.monthKey))
  }, [filteredData, getCampaignName])

  const temporalCampaignSales = useMemo(() => {
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const salesCols = [
      ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale'],
      ['venda_seguros'],
      ['venda_credito'],
      ['venda_outros', 'Outros_Produtos', 'outros_produtos']
    ]
    // Renovação do Planejamento: mesmo serviço, faturamento entra no mês em que a renovação aconteceu
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const dataRenovPlanejamentoCol = ['data_venda_renov_planejamento']
    const map: Record<string, any> = {}
    const getOrCreateBucket = (campaign: string, monthKey: string) => {
      const key = `${campaign}__${monthKey}`
      if (!map[key]) {
        map[key] = { campaign, monthKey, month: getMonthName(monthKey), salesCount: 0, totalRevenue: 0 }
      }
      return map[key]
    }
    filteredData.forEach(row => {
      const d = parseDate(getColumnValue(row, saleDateCol))
      if (d) {
        const monthKey = formatMonthYear(d)
        if (monthKey) {
          // Soma todas as vendas de cada produto, inclusive as repetidas (venda_seguros_2, etc.)
          let saleVal = 0
          for (const cols of salesCols) saleVal += getProductTotal(row, cols).value
          if (saleVal > 0) {
            const bucket = getOrCreateBucket(getCampaignName(row), monthKey)
            bucket.salesCount++
            bucket.totalRevenue += saleVal
          }
        }
      }

      // Renovação de planejamento: venda distinta do mesmo produto, soma no mês em que a renovação aconteceu
      for (const venda of getProductSales(row, salesRenovPlanejamentoCol, dataRenovPlanejamentoCol)) {
        const renovDate = parseDate(venda.dateRaw)
        const renovMonthKey = renovDate ? formatMonthYear(renovDate) : ''
        if (!renovMonthKey) continue
        const bucket = getOrCreateBucket(getCampaignName(row), renovMonthKey)
        bucket.salesCount++
        bucket.totalRevenue += venda.value
      }
    })
    return Object.values(map).sort((a: any, b: any) => a.monthKey.localeCompare(b.monthKey))
  }, [filteredData, getCampaignName])

  const taxaReuniaoVenda = manualInputs.reunioesAgendadas > 0 ? (uniquePlanejamentoBuyers / manualInputs.reunioesAgendadas) * 100 : 0
  const taxaRealizacaoReuniao = manualInputs.reunioesAgendadas > 0 ? (manualInputs.reunioesRealizadas / manualInputs.reunioesAgendadas) * 100 : 0
  // Versões focadas em MQL para etapas de reunião (assumindo que todas as reuniões são com MQL)
  const taxaReuniaoMqlRealizada = manualInputs.reunioesAgendadas > 0
    ? (manualInputs.reunioesRealizadas / manualInputs.reunioesAgendadas) * 100
    : 0
  const taxaReuniaoMqlPlanejamento = manualInputs.reunioesRealizadas > 0
    ? (uniquePlanejamentoBuyers / manualInputs.reunioesRealizadas) * 100
    : 0
  const taxaLeadVenda = totalLeads > 0 ? (uniquePlanejamentoBuyers / totalLeads) * 100 : 0
  const custoPerLead = totalLeads > 0 ? manualInputs.verbaGasta / totalLeads : 0

  const getIncomeScore = (income: string): number => {
    const normalized = normalizeIncome(income)
    return ({
      "menos_do_que_3000": 1,
      "3000_a_5999": 2,
      "6000_a_9999": 3,
      "10000_a_14999": 4,
      "15000_a_19999": 5,
      "20000_a_29999": 6,
      "acima_de_30000": 7
    }[normalized] || 0)
  }



  const getPerformanceColorClass = (value: number, thresholds: { good: number, medium: number }): string => {
    if (value >= thresholds.good) return 'text-green'
    if (value >= thresholds.medium) return 'text-orange'
    return 'text-red'
  }

  // Dados para a visão geral
  const incomeDistribution = useMemo(() => {
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    return Object.keys(incomeLabels).map(key => ({
      name: incomeLabels[key],
      value: filteredData.filter(r => normalizeIncome(getColumnValue(r, incomeCol)) === key).length
    })).filter(i => i.value > 0)
  }, [filteredData])

  const adsetPerformance = useMemo(() => {
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const adsets = Array.from(new Set(filteredData.map(r => getColumnValue(r, adsetCol)).filter(Boolean)))
    return adsets.map(a => ({ name: a, leads: filteredData.filter(r => getColumnValue(r, adsetCol) === a).length }))
      .sort((x, y) => y.leads - x.leads)
  }, [filteredData])

  const funnelData = [
    { stage: 'Leads', value: totalLeads },
    { stage: 'Reuniões Agendadas', value: manualInputs.reunioesAgendadas },
    { stage: 'Reuniões Realizadas', value: manualInputs.reunioesRealizadas },
    { stage: 'Vendas', value: manualInputs.vendasEfetuadas },
    { stage: 'Churn', value: churnAnalysis.totalChurnCount }
  ]

  // Função para calcular linha de tendência (regressão linear simples)
  const calculateTrendline = (data: number[]) => {
    const n = data.length
    if (n < 2) return null

    const xValues = data.map((_, i) => i)
    const yValues = data

    const sumX = xValues.reduce((a, b) => a + b, 0)
    const sumY = yValues.reduce((a, b) => a + b, 0)
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0)
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    return xValues.map(x => slope * x + intercept)
  }

  // Componente para distribuição de renda expansível
  const IncomeDistributionCell: React.FC<{ incomeDistribution: any[], id: string }> = ({ incomeDistribution, id }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const visibleItems = isExpanded ? incomeDistribution : incomeDistribution.slice(0, 3)
    const hasMore = incomeDistribution.length > 3

    return (
      <div style={{ fontSize: '11px' }}>
        {visibleItems.map((inc, idx) => (
          <div key={idx} className="income-text" style={{ marginBottom: '2px' }}>
            • {inc.income}: {inc.count} ({inc.percentage.toFixed(0)}%)
          </div>
        ))}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="income-expand-btn"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              padding: '2px 0',
              textDecoration: 'underline',
              marginTop: '4px',
              display: 'block'
            }}
          >
            {isExpanded ? 'Mostrar menos' : `... e mais ${incomeDistribution.length - 3} (clique para expandir)`}
          </button>
        )}
      </div>
    )
  }

  // Função para dados de renda por conjunto
  const adsetIncomeData = () => {
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const base = campaignFilterLeads === 'Todas' ? filteredData : filteredData.filter(r => getCampaignName(r) === campaignFilterLeads)
    const adsets = Array.from(new Set(base.map(r => getColumnValue(r, adsetCol)).filter(Boolean)))
    return adsets.map(adset => {
      const leads = base.filter(r => getColumnValue(r, adsetCol) === adset)
      const total = leads.length
      const distribution = Object.keys(incomeLabels).map(key => {
        const count = leads.filter(r => normalizeIncome(getColumnValue(r, incomeCol)) === key).length
        return { income: incomeLabels[key], count, percentage: total > 0 ? (count / total) * 100 : 0 }
      }).filter(i => i.count > 0)
      const avgScore = total > 0 ? leads.reduce((s, r) => s + getIncomeScore(getColumnValue(r, incomeCol)), 0) / total : 0
      return { adset, totalLeads: total, incomeDistribution: distribution, avgIncomeScore: avgScore.toFixed(2), qualityRank: avgScore }
    }).sort((a, b) => b.qualityRank - a.qualityRank)
  }

  // Função para todos os anúncios
  const getAllAdsData = () => {
    const adCol = ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'AdName']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const base = campaignFilterLeads === 'Todas' ? filteredData : filteredData.filter(r => getCampaignName(r) === campaignFilterLeads)
    const combos = new Set()
    const out: any[] = []
    base.forEach(r => {
      const ad = getColumnValue(r, adCol)
      const adset = getColumnValue(r, adsetCol)
      const k = `${ad}|||${adset}`
      if (ad && adset && !combos.has(k)) { combos.add(k); out.push({ ad, adset }) }
    })
    return out.map(c => {
      const leads = base.filter(r => getColumnValue(r, adCol) === c.ad && getColumnValue(r, adsetCol) === c.adset)
      const total = leads.length
      const avgScore = total > 0 ? leads.reduce((s, r) => s + getIncomeScore(getColumnValue(r, incomeCol)), 0) / total : 0
      const hi = leads.filter(r => isHighIncomeLead(getColumnValue(r, incomeCol))).length
      return { ...c, totalLeads: total, avgIncomeScore: avgScore.toFixed(2), qualityRank: avgScore, highIncomeLeads: hi, highIncomePercentage: total > 0 ? (hi / total) * 100 : 0 }
    }).sort((a, b) => b.totalLeads - a.totalLeads)
  }

  // Função para drill-down de anúncios por conjunto
  const getAdsByAdsetDrillDown = () => {
    const adCol = ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'ad_name', 'AdName']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'adset_name', 'AdsetName']
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const salesSegurosCol = ['venda_seguros']
    const salesCreditoCol = ['venda_credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos']
    const base = campaignFilterLeads === 'Todas' ? filteredData : filteredData.filter(r => getCampaignName(r) === campaignFilterLeads)


    // 1) Totais por adset (para os cards do topo de cada grupo)
    const adsetTotalsMap = new Map<string, { totalLeads: number, totalSales: number, totalRevenue: number, avgTicket: number, conversionRate: number }>()
    const adsetGroups = new Map<string, LeadData[]>()
    base.forEach(r => {
      const adset = getColumnValue(r, adsetCol)
      if (!adset) return
      if (!adsetGroups.has(adset)) adsetGroups.set(adset, [])
      adsetGroups.get(adset)!.push(r)
    })
    adsetGroups.forEach((rows, adset) => {
      const totalLeads = rows.length
      let sales = 0, revenue = 0
      rows.forEach(row => {
        const val = getProductTotal(row, salesPlanejamentoCol).value + getProductTotal(row, salesRenovPlanejamentoCol).value + getProductTotal(row, salesSegurosCol).value + getProductTotal(row, salesCreditoCol).value + getProductTotal(row, salesOutrosCol).value
        if (val > 0) { sales++; revenue += val }
      })
      const avgTicket = sales > 0 ? revenue / sales : 0
      const conversionRate = totalLeads > 0 ? (sales / totalLeads) * 100 : 0
      adsetTotalsMap.set(adset, { totalLeads, totalSales: sales, totalRevenue: revenue, avgTicket, conversionRate })
    })

    // 2) Métricas por anúncio dentro de cada adset
    const combos = new Set<string>()
    const adsIndex: Array<{ ad: string, adset: string }> = []
    base.forEach(r => {
      const ad = getColumnValue(r, adCol)
      const adset = getColumnValue(r, adsetCol)
      const k = `${ad}|||${adset}`
      if (ad && adset && !combos.has(k)) { combos.add(k); adsIndex.push({ ad, adset }) }
    })

    const adsSales = adsIndex.map(c => {
      const leads = base.filter(r => getColumnValue(r, adCol) === c.ad && getColumnValue(r, adsetCol) === c.adset)
      const totalLeads = leads.length
      let sales = 0, revenue = 0
      leads.forEach(row => {
        const val = getProductTotal(row, salesPlanejamentoCol).value + getProductTotal(row, salesRenovPlanejamentoCol).value + getProductTotal(row, salesSegurosCol).value + getProductTotal(row, salesCreditoCol).value + getProductTotal(row, salesOutrosCol).value
        if (val > 0) { sales++; revenue += val }
      })
      const avgTicket = sales > 0 ? revenue / sales : 0
      const conversionRate = totalLeads > 0 ? (sales / totalLeads) * 100 : 0
      return { ad: c.ad, adset: c.adset, totalLeads, totalSales: sales, totalRevenue: revenue, avgTicket, conversionRate }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)

    // 3) Agrupar por adset usando os totais filtrados
    const byAdset = Array.from(adsetTotalsMap.entries())
      .filter(([, t]) => t.totalSales > 0)
      .map(([adset, totals]) => {
        const ads = adsSales.filter(a => a.adset === adset && a.totalSales > 0)
          .map(a => ({ ...a, percentOfAdset: totals.totalRevenue > 0 ? (a.totalRevenue / totals.totalRevenue) * 100 : 0 }))
          .sort((x, y) => y.totalRevenue - x.totalRevenue)
        return { adsetData: { adset, ...totals }, ads }
      })
      .sort((x, y) => y.adsetData.totalRevenue - x.adsetData.totalRevenue)

    return byAdset
  }

  // Função unificada para cálculo de vendas mensais
  const getSalesDataByDateType = useCallback((dateType: 'leadDate' | 'saleDate' = 'saleDate') => {
    // Definições de colunas
    const createdCol = ['created_time']

    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale', 'Valor Venda', 'valor venda']
    const dataPlanejamentoCol = ['Data_da_venda', 'data_da_venda', 'sale_date', 'Data Venda', 'data venda', 'Data da Venda']

    // Renovação do Planejamento Financeiro Completo: mesmo serviço/mesmo cliente, não é um novo cliente
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const dataRenovPlanejamentoCol = ['data_venda_renov_planejamento']

    const salesSegurosCol = ['venda_seguros', 'seguros', 'Seguros', 'Valor Seguros', 'valor seguros', 'Venda Seguros']
    const dataSegurosCol = [
      'Data_venda_seguros', 'data_venda_seguros',
      'data_venda_seguro', 'Data_venda_seguro',
      'Data venda seguros', 'data venda seguros',
      'Data Venda Seguros', 'Data Venda Seguro',
      'Data de Venda Seguros', 'Dt Venda Seguros'
    ]

    const salesCreditoCol = ['venda_credito', 'credito', 'Credito', 'Crédito', 'Venda Crédito', 'venda crédito', 'Valor Crédito', 'valor crédito']
    const dataCreditoCol = [
      'Data_venda_credito', 'data_venda_credito',
      'Data venda credito', 'data venda credito',
      'Data Venda Credito', 'Data Venda Crédito',
      'data venda crédito', 'Data de Venda Crédito',
      'Dt Venda Credito', 'Dt Venda Crédito'
    ]

    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos', 'Outros', 'Valor Outros']
    const dataOutrosCol = [
      'Data_venda_outros', 'data_venda_outros',
      'Data venda outros', 'data venda outros',
      'Data Venda Outros', 'Dt Venda Outros'
    ]

    const monthly: Record<string, {
      month: string,
      monthKey: string,
      salesCount: number,
      salesCountPlanejamento: number,
      totalRevenue: number,
      revenuePlanejamento: number,
      revenueSeguros: number,
      revenueCredito: number,
      revenueOutros: number
    }> = {}


    // Função auxiliar para buscar valor da coluna com match estrito (para evitar pegar 'venda_credito' ao buscar 'data_venda_credito')
    const getStrictColumnValue = (row: any, names: string[]) => {
      if (!row) return ''
      const keys = Object.keys(row)
      for (const name of names) {
        const k = keys.find(key => key.toLowerCase().trim() === name.toLowerCase().trim())
        if (k) return row[k]
      }
      return ''
    }

    // allowMainDateFallback: quando a venda não tem data própria, cai na Data_da_venda do
    // planejamento. Faz sentido para seguros/crédito/outros (comportamento histórico), mas NÃO
    // para a renovação — ela seria atribuída ao mês da venda original.
    const processProduct = (
      row: LeadData,
      salesCols: string[],
      dateCols: string[],
      type: 'plan' | 'seg' | 'cred' | 'outros',
      allowMainDateFallback = true
    ) => {
      // Cada venda repetida do mesmo produto (venda_seguros_2, _3, ...) entra com a SUA própria data
      for (const sale of getProductSales(row, salesCols, dateCols)) {
        let dateToUse: Date | null = null

        if (dateType === 'leadDate') {
          dateToUse = parseDate(getColumnValue(row, createdCol))
        } else {
          dateToUse = parseDate(sale.dateRaw)

          // FALLBACK: Se não encontrou a data específica do produto, tenta a Data da Venda principal.
          // NÃO usar data de criação do lead como fallback para saleDate mode — a lógica de Safra
          // (usar data do lead) só deve ser aplicada na seção específica de Safra.
          if (!dateToUse && allowMainDateFallback) {
            dateToUse = parseDate(getColumnValue(row, dataPlanejamentoCol))
          }
        }

        if (!dateToUse) continue
        const monthKey = formatMonthYear(dateToUse)
        if (!monthKey) continue

        if (!monthly[monthKey]) {
          monthly[monthKey] = {
            month: getMonthName(monthKey),
            monthKey,
            salesCount: 0,
            salesCountPlanejamento: 0,
            totalRevenue: 0,
            revenuePlanejamento: 0,
            revenueSeguros: 0,
            revenueCredito: 0,
            revenueOutros: 0
          }
        }

        monthly[monthKey].salesCount++
        monthly[monthKey].totalRevenue += sale.value

        if (type === 'plan') {
          monthly[monthKey].revenuePlanejamento += sale.value
          monthly[monthKey].salesCountPlanejamento++
        }
        if (type === 'seg') monthly[monthKey].revenueSeguros += sale.value
        if (type === 'cred') monthly[monthKey].revenueCredito += sale.value
        if (type === 'outros') monthly[monthKey].revenueOutros += sale.value
      }
    }

    filteredData.forEach(row => {
      processProduct(row, salesPlanejamentoCol, dataPlanejamentoCol, 'plan')
      // Renovação é uma venda distinta do mesmo produto: soma em vendas e faturamento do mês em que ocorreu
      processProduct(row, salesRenovPlanejamentoCol, dataRenovPlanejamentoCol, 'plan', false)
      processProduct(row, salesSegurosCol, dataSegurosCol, 'seg')
      processProduct(row, salesCreditoCol, dataCreditoCol, 'cred')
      processProduct(row, salesOutrosCol, dataOutrosCol, 'outros')
    })

    return Object.keys(monthly).sort().map(k => monthly[k])
  }, [filteredData])

  // Logs de debug removidos para limpar o console

  // Vendas e receita de um produto num conjunto de leads.
  // Conta cada venda repetida do mesmo produto (venda_seguros_2, _3, ...) como uma venda distinta.
  const getSalesAndRevenue = useCallback((leads: LeadData[], salesCols: string[]) => {
    let count = 0
    let revenue = 0
    leads.forEach(row => {
      const { count: c, value } = getProductTotal(row, salesCols)
      count += c
      revenue += value
    })
    return { count, revenue }
  }, [])

  // Análise de vendas por conjunto - OTIMIZADA
  const getAdsetSalesData = useMemo(() => {
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const salesSegurosCol = ['venda_seguros']
    const salesCreditoCol = ['venda_credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos']

    // Usar filteredData que já aplica filtros corretos para vendas
    const salesFilteredByDate = filteredData

    // OTIMIZAÇÃO: Usar Map em vez de Array.from(new Set()) + filter
    const adsetMap = new Map<string, LeadData[]>()

    salesFilteredByDate.forEach(row => {
      const adset = getColumnValue(row, adsetCol)
      if (adset) {
        if (!adsetMap.has(adset)) {
          adsetMap.set(adset, [])
        }
        adsetMap.get(adset)!.push(row)
      }
    })

    return Array.from(adsetMap.entries()).map(([adset, leadsInAdset]) => {
      const totalLeads = leadsInAdset.length

      const { count: salesPlanejamentoOriginal, revenue: revenuePlanejamentoOriginal } = getSalesAndRevenue(leadsInAdset, salesPlanejamentoCol)
      // Renovação é uma venda distinta do mesmo produto (soma em vendas e faturamento), mas não é um cliente novo
      const { count: salesPlanejamentoRenov, revenue: revenuePlanejamentoRenov } = getSalesAndRevenue(leadsInAdset, salesRenovPlanejamentoCol)
      const salesPlanejamento = salesPlanejamentoOriginal + salesPlanejamentoRenov
      const revenuePlanejamento = revenuePlanejamentoOriginal + revenuePlanejamentoRenov
      const { count: salesSeguros, revenue: revenueSeguros } = getSalesAndRevenue(leadsInAdset, salesSegurosCol)
      const { count: salesCredito, revenue: revenueCredito } = getSalesAndRevenue(leadsInAdset, salesCreditoCol)
      const { count: salesOutros, revenue: revenueOutros } = getSalesAndRevenue(leadsInAdset, salesOutrosCol)

      const totalSales = salesPlanejamento + salesSeguros + salesCredito + salesOutros
      const totalRevenue = revenuePlanejamento + revenueSeguros + revenueCredito + revenueOutros
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0
      const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0

      return {
        adset,
        totalLeads,
        totalSales,
        totalRevenue,
        avgTicket,
        conversionRate,
        salesPlanejamento,
        revenuePlanejamento,
        salesSeguros,
        revenueSeguros,
        salesCredito,
        revenueCredito,
        salesOutros,
        revenueOutros
      }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [filteredData, getSalesAndRevenue])

  // Análise temporal geral - OTIMIZADA com useMemo
  const getTemporalOverviewData = useMemo(() => {
    const createdCol = ['created_time']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const salesByDateSale = getSalesDataByDateType('saleDate')
    const monthly: any = {}

    // Primeiro, processar leads por mês de criação
    filteredData.forEach(row => {
      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)
      const key = formatMonthYear(d)
      if (!key) return
      if (!monthly[key]) monthly[key] = { month: getMonthName(key), monthKey: key, totalLeads: 0, qualifiedLeads: 0, highIncomeLeads: 0, sales: 0 }
      monthly[key].totalLeads++
      const income = getColumnValue(row, incomeCol)
      if (isQualifiedLead(income)) monthly[key].qualifiedLeads++
      if (isHighIncomeLead(income)) monthly[key].highIncomeLeads++
    })

    // Depois, adicionar vendas por mês de venda
    salesByDateSale.forEach(saleMonth => {
      if (!monthly[saleMonth.monthKey]) {
        monthly[saleMonth.monthKey] = {
          month: saleMonth.month,
          monthKey: saleMonth.monthKey,
          totalLeads: 0,
          qualifiedLeads: 0,
          highIncomeLeads: 0,
          sales: 0
        }
      }
      monthly[saleMonth.monthKey].sales = saleMonth.salesCount
    })

    return Object.keys(monthly).sort().map(k => monthly[k])
  }, [filteredData])

  // Versão filtrada por campanha e período para as seções Entrada de Leads e Alta Renda
  const getTemporalLeadsFilteredData = useMemo(() => {
    const noCampaignFilter = leadsMonthlyHiddenCampaigns.size === 0
    const noDateFilter = !leadsMonthlyDateFrom && !leadsMonthlyDateTo
    if (noCampaignFilter && noDateFilter) return getTemporalOverviewData

    const createdCol = ['created_time']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const monthly: any = {}

    filteredData.forEach(row => {
      const campaign = getCampaignName(row)
      if (leadsMonthlyHiddenCampaigns.has(campaign)) return

      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)
      const key = formatMonthYear(d)
      if (!key) return

      if (leadsMonthlyDateFrom && key < leadsMonthlyDateFrom) return
      if (leadsMonthlyDateTo && key > leadsMonthlyDateTo) return

      if (!monthly[key]) monthly[key] = { month: getMonthName(key), monthKey: key, totalLeads: 0, qualifiedLeads: 0, highIncomeLeads: 0, sales: 0 }
      monthly[key].totalLeads++
      const income = getColumnValue(row, incomeCol)
      if (isQualifiedLead(income)) monthly[key].qualifiedLeads++
      if (isHighIncomeLead(income)) monthly[key].highIncomeLeads++
    })

    return Object.keys(monthly).sort().map(k => monthly[k])
  }, [getTemporalOverviewData, filteredData, getCampaignName, leadsMonthlyHiddenCampaigns, leadsMonthlyDateFrom, leadsMonthlyDateTo])

  const normalizeIncomeFormat = (income: any): string => {
    if (!income) return ''
    return String(income)
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')      // Substitui múltiplos espaços por um único underline
      .replace(/r\$_/g, 'r$')    // Remove underline logo após o "r$"
      .replace(/_-_/g, '_a_')    // Substitui "_-_" por "_a_" se usarem hífen ao invés de "a"
      .replace(/-/g, '_a_')      // Previne casos que só enviaram hífen direto
  }

  // Agregação de leads por mês e faixa de renda
  const getLeadsByMonthAndIncome = useMemo(() => {
    const createdCol = ['created_time']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const incomeRanges: Record<string, string> = {
      'menos_do_que_3000': 'Menos de R$ 3.000',
      'menos_do_que_r$3.000': 'Menos de R$ 3.000',
      '3000_a_5999': 'R$ 3.000 - R$ 5.999',
      'r$3.000_a_r$5.999': 'R$ 3.000 - R$ 5.999',
      '6000_a_9999': 'R$ 6.000 - R$ 9.999',
      'r$6.000_a_r$9.999': 'R$ 6.000 - R$ 9.999',
      '10000_a_14999': 'R$ 10.000 - R$ 14.999',
      'r$10.000_a_r$14.999': 'R$ 10.000 - R$ 14.999',
      'r$10.000_a_r$14.1000': 'R$ 10.000 - R$ 14.999',
      '15000_a_19999': 'R$ 15.000 - R$ 19.999',
      'r$15.000_a_r$19.999': 'R$ 15.000 - R$ 19.999',
      '20000_a_29999': 'R$ 20.000 - R$ 29.999',
      'r$20.000_a_r$29.999': 'R$ 20.000 - R$ 29.999',
      'acima_de_30000': 'Acima de R$ 30.000',
      'acima_de_r$30.000': 'Acima de R$ 30.000'
    }

    const monthlyIncome: Record<string, Record<string, number>> = {}

    filteredData.forEach(row => {
      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)
      const monthKey = formatMonthYear(d)
      if (!monthKey) return

      const rawIncome = getColumnValue(row, incomeCol) || ''
      const income = normalizeIncomeFormat(rawIncome)
      const incomeName = incomeRanges[income] || 'Não informado'

      if (!monthlyIncome[monthKey]) {
        monthlyIncome[monthKey] = {}
      }
      if (!monthlyIncome[monthKey][incomeName]) {
        monthlyIncome[monthKey][incomeName] = 0
      }
      monthlyIncome[monthKey][incomeName]++
    })

    return {
      monthlyIncome,
      incomeRanges: Array.from(new Set(Object.values(incomeRanges)))
    }
  }, [filteredData])

  // Agregação de vendas por faixa de renda
  const getSalesByIncome = useMemo(() => {
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const salesCols = [
      ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada'],
      ['venda_seguros'],
      ['venda_credito']
    ]
    // Renovação do Planejamento: mesmo serviço, é uma venda distinta (soma +1 venda e +receita)
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const incomeRanges: Record<string, string> = {
      'menos_do_que_3000': 'Menos de R$ 3.000',
      'menos_do_que_r$3.000': 'Menos de R$ 3.000',
      '3000_a_5999': 'R$ 3.000 - R$ 5.999',
      'r$3.000_a_r$5.999': 'R$ 3.000 - R$ 5.999',
      '6000_a_9999': 'R$ 6.000 - R$ 9.999',
      'r$6.000_a_r$9.999': 'R$ 6.000 - R$ 9.999',
      '10000_a_14999': 'R$ 10.000 - R$ 14.999',
      'r$10.000_a_r$14.999': 'R$ 10.000 - R$ 14.999',
      'r$10.000_a_r$14.1000': 'R$ 10.000 - R$ 14.999',
      '15000_a_19999': 'R$ 15.000 - R$ 19.999',
      'r$15.000_a_r$19.999': 'R$ 15.000 - R$ 19.999',
      '20000_a_29999': 'R$ 20.000 - R$ 29.999',
      'r$20.000_a_r$29.999': 'R$ 20.000 - R$ 29.999',
      'acima_de_30000': 'Acima de R$ 30.000',
      'acima_de_r$30.000': 'Acima de R$ 30.000'
    }


    const incomeData: Record<string, { sales: number; revenue: number; leads: number }> = {}

    // Inicializar todas as faixas
    Object.values(incomeRanges).forEach(incomeName => {
      incomeData[incomeName] = { sales: 0, revenue: 0, leads: 0 }
    })
    incomeData['Não informado'] = { sales: 0, revenue: 0, leads: 0 }

    filteredData.forEach(row => {
      const rawIncome = getColumnValue(row, incomeCol) || ''
      const income = normalizeIncomeFormat(rawIncome)
      const incomeName = incomeRanges[income] || 'Não informado'

      // Contar lead
      incomeData[incomeName].leads++

      // Verificar vendas (inclui vendas repetidas do mesmo produto: venda_seguros_2, etc.)
      let hasSale = false
      let totalRevenue = 0

      for (const cols of salesCols) {
        const { value } = getProductTotal(row, cols)
        if (value > 0) {
          hasSale = true
          totalRevenue += value
        }
      }

      if (hasSale) {
        incomeData[incomeName].sales++
        incomeData[incomeName].revenue += totalRevenue
      }

      // Renovação de planejamento: venda distinta do mesmo produto
      const renov = getProductTotal(row, salesRenovPlanejamentoCol)
      if (renov.value > 0) {
        incomeData[incomeName].sales += renov.count
        incomeData[incomeName].revenue += renov.value
      }
    })

    // Converter para array usando lista canônica (sem duplicatas)
    const canonicalRanges = [
      'Menos de R$ 3.000',
      'R$ 3.000 - R$ 5.999',
      'R$ 6.000 - R$ 9.999',
      'R$ 10.000 - R$ 14.999',
      'R$ 15.000 - R$ 19.999',
      'R$ 20.000 - R$ 29.999',
      'Acima de R$ 30.000',
    ]
    const sortedData = canonicalRanges.map(name => ({
      incomeName: name,
      sales: incomeData[name]?.sales ?? 0,
      revenue: incomeData[name]?.revenue ?? 0,
      leads: incomeData[name]?.leads ?? 0,
      conversionRate: (incomeData[name]?.leads ?? 0) > 0 ? ((incomeData[name].sales / incomeData[name].leads) * 100) : 0,
      avgTicket: (incomeData[name]?.sales ?? 0) > 0 ? incomeData[name].revenue / incomeData[name].sales : 0
    }))

    // Adicionar "Não informado" no final
    sortedData.push({
      incomeName: 'Não informado',
      sales: incomeData['Não informado'].sales,
      revenue: incomeData['Não informado'].revenue,
      leads: incomeData['Não informado'].leads,
      conversionRate: incomeData['Não informado'].leads > 0 ? (incomeData['Não informado'].sales / incomeData['Não informado'].leads) * 100 : 0,
      avgTicket: incomeData['Não informado'].sales > 0 ? incomeData['Não informado'].revenue / incomeData['Não informado'].sales : 0
    })

    return sortedData
  }, [filteredData])

  // Versão filtrada por campanha e período para "Vendas por Faixa de Renda"
  const getSalesByIncomeFiltered = useMemo(() => {
    const noCampaignFilter = salesIncomeHiddenCampaigns.size === 0
    const noDateFilter = !salesIncomeDateFrom && !salesIncomeDateTo
    if (noCampaignFilter && noDateFilter) return getSalesByIncome

    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const salesCols = [
      ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada'],
      ['venda_seguros'],
      ['venda_credito']
    ]
    // Renovação do Planejamento: mesmo serviço, filtrada pela própria data de renovação
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const dataRenovPlanejamentoCol = ['data_venda_renov_planejamento']
    const incomeRanges: Record<string, string> = {
      'menos_do_que_3000': 'Menos de R$ 3.000', 'menos_do_que_r$3.000': 'Menos de R$ 3.000',
      '3000_a_5999': 'R$ 3.000 - R$ 5.999', 'r$3.000_a_r$5.999': 'R$ 3.000 - R$ 5.999',
      '6000_a_9999': 'R$ 6.000 - R$ 9.999', 'r$6.000_a_r$9.999': 'R$ 6.000 - R$ 9.999',
      '10000_a_14999': 'R$ 10.000 - R$ 14.999', 'r$10.000_a_r$14.999': 'R$ 10.000 - R$ 14.999',
      'r$10.000_a_r$14.1000': 'R$ 10.000 - R$ 14.999',
      '15000_a_19999': 'R$ 15.000 - R$ 19.999', 'r$15.000_a_r$19.999': 'R$ 15.000 - R$ 19.999',
      '20000_a_29999': 'R$ 20.000 - R$ 29.999', 'r$20.000_a_r$29.999': 'R$ 20.000 - R$ 29.999',
      'acima_de_30000': 'Acima de R$ 30.000', 'acima_de_r$30.000': 'Acima de R$ 30.000'
    }

    const incomeData: Record<string, { sales: number; revenue: number; leads: number }> = {}
    const canonicalRanges = [
      'Menos de R$ 3.000', 'R$ 3.000 - R$ 5.999', 'R$ 6.000 - R$ 9.999',
      'R$ 10.000 - R$ 14.999', 'R$ 15.000 - R$ 19.999', 'R$ 20.000 - R$ 29.999',
      'Acima de R$ 30.000', 'Não informado'
    ]
    canonicalRanges.forEach(n => { incomeData[n] = { sales: 0, revenue: 0, leads: 0 } })

    const createdCol = ['created_time']

    filteredData.forEach(row => {
      if (!noCampaignFilter && salesIncomeHiddenCampaigns.has(getCampaignName(row))) return

      const incomeName = incomeRanges[normalizeIncomeFormat(getColumnValue(row, incomeCol) || '')] || 'Não informado'

      // Leads: filtrados por data de entrada (created_time)
      if (!noDateFilter) {
        const createdKey = formatMonthYear(parseDate(getColumnValue(row, createdCol)))
        if (createdKey &&
          (!salesIncomeDateFrom || createdKey >= salesIncomeDateFrom) &&
          (!salesIncomeDateTo || createdKey <= salesIncomeDateTo)) {
          incomeData[incomeName].leads++
        }
      } else {
        incomeData[incomeName].leads++
      }

      const dentroDoPeriodo = (key: string | null) =>
        !!key &&
        (!salesIncomeDateFrom || key >= salesIncomeDateFrom) &&
        (!salesIncomeDateTo || key <= salesIncomeDateTo)

      // Vendas: filtradas por data de venda (Data_da_venda)
      // getProductTotal já soma as vendas repetidas do mesmo produto (venda_seguros_2, etc.)
      let hasSale = false
      let totalRevenue = 0
      for (const cols of salesCols) {
        const { value } = getProductTotal(row, cols)
        if (value > 0) { hasSale = true; totalRevenue += value }
      }
      if (hasSale && (noDateFilter || dentroDoPeriodo(formatMonthYear(parseDate(getColumnValue(row, saleDateCol)))))) {
        incomeData[incomeName].sales++
        incomeData[incomeName].revenue += totalRevenue
      }

      // Renovação de Planejamento: venda distinta do mesmo produto, filtrada pela própria data (não é cliente novo)
      for (const venda of getProductSales(row, salesRenovPlanejamentoCol, dataRenovPlanejamentoCol)) {
        if (!noDateFilter && !dentroDoPeriodo(formatMonthYear(parseDate(venda.dateRaw)))) continue
        incomeData[incomeName].sales++
        incomeData[incomeName].revenue += venda.value
      }
    })

    return canonicalRanges.map(name => ({
      incomeName: name,
      sales: incomeData[name].sales,
      revenue: incomeData[name].revenue,
      leads: incomeData[name].leads,
      conversionRate: incomeData[name].leads > 0 ? (incomeData[name].sales / incomeData[name].leads) * 100 : 0,
      avgTicket: incomeData[name].sales > 0 ? incomeData[name].revenue / incomeData[name].sales : 0
    }))
  }, [getSalesByIncome, filteredData, getCampaignName, salesIncomeHiddenCampaigns, salesIncomeDateFrom, salesIncomeDateTo])

  // Análise temporal por conjunto
  const getTemporalAdsetData = useMemo(() => {
    const createdCol = ['created_time']
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const salesCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const map: any = {}
    const base = campaignFilterLeads === 'Todas' ? filteredData : filteredData.filter(r => getCampaignName(r) === campaignFilterLeads)

    // Processar leads por mês de criação e adset
    base.forEach(row => {
      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)
      const monthKey = formatMonthYear(d)
      const adset = getColumnValue(row, adsetCol) || '—'
      if (!monthKey) return
      const key = `${monthKey}|||${adset}`
      if (!map[key]) map[key] = { month: getMonthName(monthKey), monthKey, adset, leads: 0, sales: 0 }
      map[key].leads++
    })

    // Processar vendas por mês de venda e adset (para consistência)
    base.forEach(row => {
      const rawSale = getColumnValue(row, salesCol)
      const saleValue = parseFloat(String(rawSale || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
      if (saleValue <= 0) return

      const saleDate = parseDate(getColumnValue(row, saleDateCol))
      const monthKey = formatMonthYear(saleDate)
      const adset = getColumnValue(row, adsetCol) || '—'
      if (!monthKey) return
      const key = `${monthKey}|||${adset}`
      if (!map[key]) map[key] = { month: getMonthName(monthKey), monthKey, adset, leads: 0, sales: 0 }
      map[key].sales++
    })

    return Object.values(map).sort((a: any, b: any) => a.monthKey.localeCompare(b.monthKey))
  }, [filteredData, campaignFilterLeads])


  // Análise temporal de vendas
  const getTemporalSalesData = useMemo(() => {
    const salesData = getSalesDataByDateType('saleDate')
    const totalMonths = salesData.length || 1
    const avgBudget = manualInputs.verbaGasta / totalMonths

    return salesData.map(item => {
      // Buscar verba específica ou usar média
      const specificBudget = monthlyBudgets.find(b => b.month === item.monthKey)
      const monthlyBudget = specificBudget ? specificBudget.amount : avgBudget

      return {
        ...item,
        avgTicket: item.salesCount > 0 ? item.totalRevenue / item.salesCount : 0,
        monthlyBudget,
        cac: item.salesCount > 0 ? monthlyBudget / item.salesCount : 0
      }
    })
  }, [getSalesDataByDateType, manualInputs.verbaGasta, monthlyBudgets])

  // Análise de tempo de conversão
  const getConversionTimeAnalysis = useMemo(() => {
    const createdCol = ['created_time']
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const salesCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const emailCol = ['email']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']

    const conversions: any[] = []

    filteredData.forEach(row => {
      const rawSale = getColumnValue(row, salesCol)
      const saleValue = parseFloat(String(rawSale || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0

      if (saleValue > 0) {
        const leadDate = parseDate(getColumnValue(row, createdCol))
        const saleDate = parseDate(getColumnValue(row, saleDateCol))

        if (leadDate && saleDate) {
          const daysDiff = Math.ceil((saleDate.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24))
          const income = getColumnValue(row, incomeCol)

          conversions.push({
            email: getColumnValue(row, emailCol),
            leadDate,
            saleDate,
            conversionDays: daysDiff,
            saleValue,
            isQualified: isQualifiedLead(income),
            isHighIncome: isHighIncomeLead(income),
            saleMonth: getMonthName(formatMonthYear(saleDate))
          })
        }
      }
    })

    return conversions
  }, [filteredData])

  // Análise de tempo de conversão por mês
  const getConversionTimeByMonth = useMemo(() => {
    const conversions = getConversionTimeAnalysis
    const monthly: any = {}

    conversions.forEach(conv => {
      // Usar a data de venda para criar a chave cronológica
      const saleDateKey = formatMonthYear(conv.saleDate)
      const monthName = conv.saleMonth

      if (!monthly[saleDateKey]) {
        monthly[saleDateKey] = {
          month: monthName,
          monthKey: saleDateKey,
          conversions: [],
          avgDays: 0,
          medianDays: 0,
          totalSales: 0,
          qualifiedConversions: 0,
          minDays: 0,
          maxDays: 0
        }
      }
      monthly[saleDateKey].conversions.push(conv.conversionDays)
      monthly[saleDateKey].totalSales++
      if (conv.isQualified) monthly[saleDateKey].qualifiedConversions++
    })

    // CORRIGIDO: Ordenar por data cronológica usando monthKey (formato YYYY-MM)
    return Object.keys(monthly).sort().map(monthKey => {
      const data = monthly[monthKey]
      const sorted = data.conversions.sort((a: number, b: number) => a - b)
      data.avgDays = sorted.length > 0 ? (sorted.reduce((a: number, b: number) => a + b, 0) / sorted.length) : 0
      data.medianDays = sorted.length > 0 ?
        (sorted.length % 2 === 0 ?
          (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 :
          sorted[Math.floor(sorted.length / 2)]) : 0
      data.minDays = sorted.length > 0 ? sorted[0] : 0
      data.maxDays = sorted.length > 0 ? sorted[sorted.length - 1] : 0
      return data
    })
  }, [getConversionTimeAnalysis])

  // Análise por dia da semana
  const getWeekdayAnalysis = useMemo(() => {
    const createdCol = ['created_time']
    const salesCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesRenovCol = ['venda_renov_planejamento']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']

    const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const weekdayData = Array(7).fill(0).map((_, i) => ({
      weekday: weekdays[i],
      weekdayIndex: i,
      totalLeads: 0,
      qualifiedLeads: 0,
      highIncomeLeads: 0,
      sales: 0,
      totalRevenue: 0
    }))

    filteredData.forEach(row => {
      // SEMPRE usar a data de criação do lead (created_time)
      const created = getColumnValue(row, createdCol)
      const leadDate = parseDate(created)
      if (!leadDate) return

      const weekdayIndex = leadDate.getDay()
      weekdayData[weekdayIndex].totalLeads++

      // Análise de qualificação baseada na data do lead
      const income = getColumnValue(row, incomeCol)
      if (isQualifiedLead(income)) weekdayData[weekdayIndex].qualifiedLeads++
      if (isHighIncomeLead(income)) weekdayData[weekdayIndex].highIncomeLeads++

      // Vendas: se esse lead (gerado neste dia) teve venda (independente de quando).
      // Inclui renovação e vendas repetidas do mesmo produto.
      const venda = getProductTotal(row, salesCol)
      const renov = getProductTotal(row, salesRenovCol)
      weekdayData[weekdayIndex].sales += venda.count + renov.count
      weekdayData[weekdayIndex].totalRevenue += venda.value + renov.value
    })

    return weekdayData.map(day => ({
      ...day,
      qualifiedRate: day.totalLeads > 0 ? (day.qualifiedLeads / day.totalLeads) * 100 : 0,
      highIncomeRate: day.totalLeads > 0 ? (day.highIncomeLeads / day.totalLeads) * 100 : 0,
      conversionRate: day.totalLeads > 0 ? (day.sales / day.totalLeads) * 100 : 0,
      avgTicket: day.sales > 0 ? day.totalRevenue / day.sales : 0
    }))
  }, [filteredData])

  // Análise por horário
  const getHourlyAnalysis = useMemo(() => {
    const createdCol = ['created_time']
    const salesCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const salesRenovCol = ['venda_renov_planejamento']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']

    const hourlyData = Array(24).fill(0).map((_, i) => ({
      hour: i,
      hourLabel: `${i.toString().padStart(2, '0')}:00`,
      totalLeads: 0,
      qualifiedLeads: 0,
      highIncomeLeads: 0,
      sales: 0,
      totalRevenue: 0
    }))

    filteredData.forEach(row => {
      // SEMPRE usar a data de criação do lead (created_time)
      const created = getColumnValue(row, createdCol)
      const leadDate = parseDate(created)
      if (!leadDate) return

      const hour = leadDate.getHours()
      hourlyData[hour].totalLeads++

      // Análise de qualificação baseada na data do lead
      const income = getColumnValue(row, incomeCol)
      if (isQualifiedLead(income)) hourlyData[hour].qualifiedLeads++
      if (isHighIncomeLead(income)) hourlyData[hour].highIncomeLeads++

      // Vendas: se esse lead (gerado neste horário) teve venda (independente de quando).
      // Inclui renovação e vendas repetidas do mesmo produto.
      const venda = getProductTotal(row, salesCol)
      const renov = getProductTotal(row, salesRenovCol)
      if (venda.count + renov.count > 0) {
        hourlyData[hour].sales += venda.count + renov.count
        hourlyData[hour].totalRevenue += venda.value + renov.value
      }
    })

    return hourlyData.map(hour => ({
      ...hour,
      qualifiedRate: hour.totalLeads > 0 ? (hour.qualifiedLeads / hour.totalLeads) * 100 : 0,
      highIncomeRate: hour.totalLeads > 0 ? (hour.highIncomeLeads / hour.totalLeads) * 100 : 0,
      conversionRate: hour.totalLeads > 0 ? (hour.sales / hour.totalLeads) * 100 : 0,
      avgTicket: hour.sales > 0 ? hour.totalRevenue / hour.sales : 0
    }))
  }, [filteredData])

  // ===== Melhor dia/horário de CAPTAÇÃO, medido pelas vendas que o lead gerou =====
  // Difere da análise em "Análise de Leads", que julga o lead pela renda declarada.
  // Aqui cada lead é julgado pelo faturamento que de fato gerou, em qualquer produto e
  // independentemente de quando a venda ocorreu. O recorte é sempre o momento da CAPTAÇÃO.
  const getCaptureTimeSalesData = useMemo(() => {
    const createdCol = ['created_time']
    const produtos = [
      ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada'],
      ['venda_renov_planejamento'],
      ['venda_seguros'],
      ['venda_credito'],
      ['venda_outros', 'Outros_Produtos', 'outros_produtos']
    ]
    const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const BLOCOS = [
      { nome: 'Madrugada', faixa: '0h–05h', de: 0, ate: 6 },
      { nome: 'Manhã', faixa: '6h–11h', de: 6, ate: 12 },
      { nome: 'Tarde', faixa: '12h–17h', de: 12, ate: 18 },
      { nome: 'Noite', faixa: '18h–23h', de: 18, ate: 24 }
    ]
    // Abaixo disso a taxa vira ruído: 1 cliente a mais muda tudo. Serve para nunca
    // apontar como "melhor" uma célula que só parece boa por ter pouquíssimos leads.
    const MIN_LEADS = 50

    const zero = () => ({ leads: 0, clientes: 0, receita: 0 })
    const porDia = DIAS.map((dia, i) => ({ dia, diaIndex: i, ...zero() }))
    const porHora = Array.from({ length: 24 }, (_, hora) => ({ hora, ...zero() }))
    const matriz: Record<string, any> = {}
    DIAS.forEach((dia, i) => BLOCOS.forEach(b => { matriz[i + '|' + b.nome] = { dia, diaIndex: i, bloco: b.nome, faixa: b.faixa, ...zero() } }))

    filteredData.forEach(row => {
      const leadDate = parseDate(getColumnValue(row, createdCol))
      if (!leadDate) return
      const diaIndex = leadDate.getDay()
      const hora = leadDate.getHours()
      const bloco = BLOCOS.find(b => hora >= b.de && hora < b.ate)!

      // Receita total que ESTE lead gerou, somando todos os produtos
      const receita = produtos.reduce((acc, cols) => acc + getProductTotal(row, cols).value, 0)
      const virouCliente = receita > 0

      const alvos = [porDia[diaIndex], porHora[hora], matriz[diaIndex + '|' + bloco.nome]]
      alvos.forEach(alvo => {
        alvo.leads++
        if (virouCliente) { alvo.clientes++; alvo.receita += receita }
      })
    })

    const enriquecer = (x: any) => ({
      ...x,
      conversao: x.leads > 0 ? (x.clientes / x.leads) * 100 : 0,
      receitaPorLead: x.leads > 0 ? x.receita / x.leads : 0,
      amostraFraca: x.leads < MIN_LEADS
    })
    const dias = porDia.map(enriquecer)
    const horas = porHora.map(enriquecer)
    const celulas = Object.values(matriz).map(enriquecer)

    // "Melhor" sempre entre os recortes com amostra suficiente
    const melhorDe = (lista: any[]) => {
      const validos = lista.filter(x => !x.amostraFraca)
      return validos.length ? validos.reduce((a, b) => (b.conversao > a.conversao ? b : a)) : null
    }
    const totalLeads = dias.reduce((a, x) => a + x.leads, 0)
    const totalClientes = dias.reduce((a, x) => a + x.clientes, 0)

    return {
      dias,
      horas,
      celulas,
      blocos: BLOCOS,
      minLeads: MIN_LEADS,
      totalLeads,
      totalClientes,
      conversaoGeral: totalLeads > 0 ? (totalClientes / totalLeads) * 100 : 0,
      melhorDia: melhorDe(dias),
      piorDia: (() => { const v = dias.filter(x => !x.amostraFraca); return v.length ? v.reduce((a, b) => (b.conversao < a.conversao ? b : a)) : null })(),
      melhorHora: melhorDe(horas),
      melhorCelula: melhorDe(celulas)
    }
  }, [filteredData])

  // ===== Análise Mensal =====
  // Função para obter meses disponíveis nos dados
  const getAvailableMonths = useMemo(() => {
    const createdCol = ['created_time']
    const months = new Set<string>()

    filteredData.forEach(row => {
      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)

      if (d) {
        const key = formatMonthYear(d)
        if (key) months.add(key)
      }
    })

    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // Mais recente primeiro
      .map(key => ({ key, label: getMonthName(key) }))
  }, [filteredData])

  // Função para calcular dados da Análise Mensal
  const getMonthlyAnalysisData = useCallback((monthKey: string) => {
    if (!monthKey) return null

    const createdCol = ['created_time']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const emailCol = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail', 'E-MAIL']

    // Colunas de venda e data por produto
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada']
    const dataPlanejamentoCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    // Renovação do Planejamento Financeiro Completo: mesmo serviço/mesmo cliente, não é um novo cliente
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const dataRenovPlanejamentoCol = ['data_venda_renov_planejamento']
    const salesSegurosCol = ['venda_seguros']
    const dataSegurosCol = ['Data_venda_seguros', 'data_venda_seguros', 'data_venda_seguro', 'Data_venda_seguro']
    const salesCreditoCol = ['venda_credito']
    const dataCreditoCol = ['Data_venda_credito', 'data_venda_credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos']
    const dataOutrosCol = ['Data_venda_outros', 'data_venda_outros']
    const churnValCol = ['churn', 'churn_value', 'Churn']
    const churnDateCol = ['Data_do_churn', 'churn_date', 'data_do_churn']


    // Métricas de leads do mês (baseado em created_time)
    let totalLeads = 0
    let qualifiedLeads = 0
    let highIncomeLeads = 0
    const incomeDistribution: Record<string, number> = {}
    const uniqueEmails = new Set<string>()

    // Métricas de vendas do mês (baseado na data de venda de cada produto)
    let vendasPlanejamento = 0 // novos clientes de planejamento (renovação não soma aqui)
    let vendasPlanejamentoTotal = 0 // vendas de planejamento incluindo renovação (mesmo produto)
    let faturamentoPlanejamento = 0
    let vendasSeguros = 0
    let faturamentoSeguros = 0
    let vendasCredito = 0
    let faturamentoCredito = 0
    let vendasOutros = 0
    let faturamentoOutros = 0

    // Métricas de churn do mês
    let churnCount = 0
    let churnValue = 0

    // Detalhe de cada venda do mês (uma linha por venda, não por cliente)
    const vendasDetalhadas: Array<{
      cliente: string
      email: string
      produto: string
      faixaRenda: string
      dataVenda: Date
      diasAteVenda: number | null
      valor: number
    }> = []

    filteredData.forEach(row => {
      const email = getColumnValue(row, emailCol)

      // Leads do mês (baseado em created_time)
      const created = getColumnValue(row, createdCol)
      const leadDate = parseDate(created)
      if (leadDate && formatMonthYear(leadDate) === monthKey) {
        totalLeads++
        if (email) uniqueEmails.add(email.toLowerCase())

        const income = getColumnValue(row, incomeCol)
        if (isQualifiedLead(income)) qualifiedLeads++
        if (isHighIncomeLead(income)) highIncomeLeads++

        // Distribuição de renda
        const incomeName = incomeLabels[normalizeIncome(income)] || 'Não informado'
        incomeDistribution[incomeName] = (incomeDistribution[incomeName] || 0) + 1
      }

      // Cada produto pode ter mais de uma venda na linha (venda_seguros_2, etc.), cada uma
      // com a sua própria data — por isso percorremos venda a venda.
      const noMes = (dateRaw: string) => {
        const d = parseDate(dateRaw)
        return !!d && formatMonthYear(d) === monthKey
      }

      // Registra a venda no detalhamento do mês, com faixa de renda e tempo até a venda
      const registrarVenda = (produto: string, venda: { value: number, dateRaw: string }) => {
        const dataVenda = parseDate(venda.dateRaw)
        if (!dataVenda) return
        const income = getColumnValue(row, incomeCol)
        // Tempo da entrada do lead até a venda concluída
        const diasAteVenda = leadDate
          ? Math.ceil((dataVenda.getTime() - leadDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
        vendasDetalhadas.push({
          cliente: getColumnValue(row, ['nome_completo', 'nome', 'Nome']) || email || '—',
          email,
          produto,
          faixaRenda: incomeLabels[normalizeIncome(income)] || 'Não informado',
          dataVenda,
          diasAteVenda,
          valor: venda.value
        })
      }

      // Vendas de Planejamento do mês
      for (const venda of getProductSales(row, salesPlanejamentoCol, dataPlanejamentoCol)) {
        if (!noMes(venda.dateRaw)) continue
        vendasPlanejamento++
        vendasPlanejamentoTotal++
        faturamentoPlanejamento += venda.value
        registrarVenda('Planejamento', venda)
      }

      // Renovação do Planejamento do mês: venda distinta do mesmo produto, não é um novo cliente
      for (const venda of getProductSales(row, salesRenovPlanejamentoCol, dataRenovPlanejamentoCol)) {
        if (!noMes(venda.dateRaw)) continue
        vendasPlanejamentoTotal++
        faturamentoPlanejamento += venda.value
        registrarVenda('Renovação Planejamento', venda)
      }

      // Vendas de Seguros do mês
      for (const venda of getProductSales(row, salesSegurosCol, dataSegurosCol)) {
        if (!noMes(venda.dateRaw)) continue
        vendasSeguros++
        faturamentoSeguros += venda.value
        registrarVenda('Seguros', venda)
      }

      // Vendas de Crédito do mês
      for (const venda of getProductSales(row, salesCreditoCol, dataCreditoCol)) {
        if (!noMes(venda.dateRaw)) continue
        vendasCredito++
        faturamentoCredito += venda.value
        registrarVenda('Crédito', venda)
      }

      // Vendas de Outros do mês
      for (const venda of getProductSales(row, salesOutrosCol, dataOutrosCol)) {
        if (!noMes(venda.dateRaw)) continue
        vendasOutros++
        faturamentoOutros += venda.value
        registrarVenda('Outros', venda)
      }

      // Churn do mês
      const dataChurn = parseDate(getColumnValue(row, churnDateCol))
      if (dataChurn && formatMonthYear(dataChurn) === monthKey) {
        churnCount++
        churnValue += toNum(getColumnValue(row, churnValCol))
      }
    })

    const vendasTotais = vendasPlanejamento + vendasSeguros + vendasCredito + vendasOutros
    const faturamentoTotal = faturamentoPlanejamento + faturamentoSeguros + faturamentoCredito + faturamentoOutros

    // Cálculo da Margem de Contribuição (Estimativa B2C como padrão)
    const marginSeguros = faturamentoSeguros * 0.6 * 0.81 * 0.4
    const marginCredito = faturamentoCredito * 0.04 * 0.81 * 0.4
    const marginPlanejamento = faturamentoPlanejamento * 0.81 * 0.975 * 0.775
    const marginOutros = faturamentoOutros * 0.81 * 0.975 * 0.775

    const totalContributionMargin = marginSeguros + marginCredito + marginPlanejamento + marginOutros

    // Vendas do mês em ordem cronológica
    const vendasOrdenadas = [...vendasDetalhadas].sort((a, b) => a.dataVenda.getTime() - b.dataVenda.getTime())
    const ehRenovacao = (produto: string) => produto === 'Renovação Planejamento'

    // Agrupamento das vendas do mês por faixa de renda do cliente
    const ordemFaixas = Object.values(incomeLabels)
    const porFaixa: Record<string, { faixaRenda: string, vendas: number, receita: number, somaDias: number, comDias: number }> = {}
    vendasOrdenadas.forEach(v => {
      if (!porFaixa[v.faixaRenda]) {
        porFaixa[v.faixaRenda] = { faixaRenda: v.faixaRenda, vendas: 0, receita: 0, somaDias: 0, comDias: 0 }
      }
      const f = porFaixa[v.faixaRenda]
      f.vendas++
      f.receita += v.valor
      // Renovações ficam fora das médias de tempo: o lead entrou há mais de um ano e o
      // número mediria tempo de casa, não ciclo de venda. O valor segue visível linha a linha.
      if (v.diasAteVenda !== null && !ehRenovacao(v.produto)) { f.somaDias += v.diasAteVenda; f.comDias++ }
    })
    const vendasPorFaixaRenda = Object.values(porFaixa)
      .map(f => ({
        faixaRenda: f.faixaRenda,
        vendas: f.vendas,
        receita: f.receita,
        ticketMedio: f.vendas > 0 ? f.receita / f.vendas : 0,
        diasMedios: f.comDias > 0 ? f.somaDias / f.comDias : null
      }))
      .sort((a, b) => {
        const ai = ordemFaixas.indexOf(a.faixaRenda)
        const bi = ordemFaixas.indexOf(b.faixaRenda)
        if (ai === -1 && bi === -1) return 0
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })

    // Tempo médio da entrada do lead até a venda, apenas para vendas NOVAS
    const diasValidos = vendasOrdenadas
      .filter(v => !ehRenovacao(v.produto))
      .map(v => v.diasAteVenda)
      .filter((d): d is number => d !== null)
    const diasMedioMes = diasValidos.length > 0
      ? diasValidos.reduce((a, b) => a + b, 0) / diasValidos.length
      : null

    return {
      month: getMonthName(monthKey),
      monthKey,
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        highIncome: highIncomeLeads,
        qualifiedRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
        highIncomeRate: totalLeads > 0 ? (highIncomeLeads / totalLeads) * 100 : 0,
        incomeDistribution: Object.entries(incomeDistribution)
          .map(([name, count]) => ({ name, count, percentage: totalLeads > 0 ? (count / totalLeads) * 100 : 0 }))
          .sort((a, b) => {
            const incomeOrder = Object.values(incomeLabels)
            const ai = incomeOrder.indexOf(a.name)
            const bi = incomeOrder.indexOf(b.name)
            if (ai === -1 && bi === -1) return 0
            if (ai === -1) return 1
            if (bi === -1) return -1
            return ai - bi
          })
      },
      sales: {
        total: vendasTotais,
        // count = novos clientes de planejamento (para o card "Vendas (Novos Clientes)");
        // salesCount = vendas de planejamento incluindo renovação (para o card "Vendas por Produto")
        planejamento: { count: vendasPlanejamento, salesCount: vendasPlanejamentoTotal, revenue: faturamentoPlanejamento },
        seguros: { count: vendasSeguros, revenue: faturamentoSeguros },
        credito: { count: vendasCredito, revenue: faturamentoCredito },
        outros: { count: vendasOutros, revenue: faturamentoOutros },
        totalRevenue: faturamentoTotal,
        totalContributionMargin,
        conversionRate: totalLeads > 0 ? (vendasPlanejamento / totalLeads) * 100 : 0,
        // Detalhamento: uma linha por venda do mês + agregado por faixa de renda
        detalhes: vendasOrdenadas,
        porFaixaRenda: vendasPorFaixaRenda,
        diasMedioMes
      },
      churn: {
        count: churnCount,
        value: churnValue
      }
    }
  }, [filteredData])


  // Função para calcular dados da Análise Aprofundada (Cohorts)
  const getCohortAnalysisData = useMemo(() => {

    // Definições de colunas (duplicadas para garantir escopo local)
    const salesPlanejamentoCol = ['Venda_planejamento', 'venda_efetuada', 'Venda_efetuada']
    const dataPlanejamentoCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    // Renovação do Planejamento Financeiro Completo: mesmo serviço/mesmo cliente, entra no faturamento da safra mas não é um novo cliente
    const salesRenovPlanejamentoCol = ['venda_renov_planejamento']
    const salesSegurosCol = ['venda_seguros']
    const salesCreditoCol = ['venda_credito']
    const salesOutrosCol = ['venda_outros', 'Outros_Produtos', 'outros_produtos']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']


    const cohorts: Record<string, {
      leads: number,
      salesPlanejamento: number,
      salesSeguros: number,
      salesCredito: number,
      salesOutros: number,
      revenuePlanejamento: number,
      revenueSeguros: number,
      revenueCredito: number,
      revenueOutros: number,
      totalRevenue: number,
      clientesComVendas: number,
      qualifiedLeads: number,
      conversionDaysSum: number,
      conversionCount: number,
      crossSellCount: number
    }> = {}

    const createdCol = ['created_time']

    filteredData.forEach(row => {
      const created = getColumnValue(row, createdCol)
      const d = parseDate(created)

      if (d) {
        const key = formatMonthYear(d)
        if (!cohorts[key]) {
          cohorts[key] = {
            leads: 0,
            salesPlanejamento: 0,
            salesSeguros: 0,
            salesCredito: 0,
            salesOutros: 0,
            revenuePlanejamento: 0,
            revenueSeguros: 0,
            revenueCredito: 0,
            revenueOutros: 0,
            totalRevenue: 0,
            clientesComVendas: 0,
            qualifiedLeads: 0,
            conversionDaysSum: 0,
            conversionCount: 0,
            crossSellCount: 0
          }
        }

        cohorts[key].leads++

        // Qualidade (Income) — usa a mesma função global do resto do dashboard
        const income = getColumnValue(row, incomeCol)
        if (isQualifiedLead(income)) {
          cohorts[key].qualifiedLeads++
        }

        // Cada produto pode ter mais de uma venda na mesma linha (venda_seguros_2, etc.)
        const seguros = getProductTotal(row, salesSegurosCol)
        const credito = getProductTotal(row, salesCreditoCol)
        const outros = getProductTotal(row, salesOutrosCol)
        const planejamento = getProductTotal(row, salesPlanejamentoCol)
        const renovPlanejamento = getProductTotal(row, salesRenovPlanejamentoCol)

        // Planejamento (Base para Novos Clientes): esta safra conta CLIENTES, não vendas,
        // por isso soma 1 por lead que comprou — nem a renovação nem uma 2ª venda entram aqui.
        if (planejamento.value > 0) {
          cohorts[key].salesPlanejamento++
          cohorts[key].revenuePlanejamento += planejamento.value

          // Ciclo de Venda
          const saleDate = parseDate(getColumnValue(row, dataPlanejamentoCol))
          if (saleDate) {
            const diffTime = saleDate.getTime() - d.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays >= 0) {
              cohorts[key].conversionDaysSum += diffDays
              cohorts[key].conversionCount++
            }
          }

          // Cross-Sell Check
          if (seguros.value > 0 || credito.value > 0 || outros.value > 0) {
            cohorts[key].crossSellCount++
          }
        }

        // Renovação do Planejamento: soma no faturamento da safra (mesmo serviço), mas não conta como novo cliente
        cohorts[key].revenuePlanejamento += renovPlanejamento.value

        // Outras vendas independentes (caso existam sem planejamento, somamos volume/receita, mas não contam como 'Novo Cliente' na definição estrita de Cross-sell acima)
        cohorts[key].salesSeguros += seguros.count
        cohorts[key].revenueSeguros += seguros.value
        cohorts[key].salesCredito += credito.count
        cohorts[key].revenueCredito += credito.value
        cohorts[key].salesOutros += outros.count
        cohorts[key].revenueOutros += outros.value

        cohorts[key].totalRevenue += (planejamento.value + renovPlanejamento.value + seguros.value + credito.value + outros.value)

        // Clientes com vendas: leads que tiveram ao menos 1 produto vendido
        if (planejamento.value > 0 || renovPlanejamento.value > 0 || seguros.value > 0 || credito.value > 0 || outros.value > 0) {
          cohorts[key].clientesComVendas++
        }
      }
    })

    return Object.entries(cohorts)
      .sort((a, b) => a[0].localeCompare(b[0])) // Mais antigo primeiro (esquerda para direita)
      .map(([month, data]) => ({
        month,
        ...data,
        qualifiedRate: data.leads > 0 ? (data.qualifiedLeads / data.leads) * 100 : 0,
        avgConversionDays: data.conversionCount > 0 ? data.conversionDaysSum / data.conversionCount : 0,
        crossSellRate: data.salesPlanejamento > 0 ? (data.crossSellCount / data.salesPlanejamento) * 100 : 0
      }))
  }, [filteredData])


  const analysisCategories = [
    {
      key: 'overview',
      label: '📊 Visão Geral',
      type: 'individual'
    },
    {
      key: 'temporal-overview',
      label: '📈 Performance Temporal da Campanha - Visão Geral',
      type: 'individual'
    },
    {
      key: 'monthly-analysis',
      label: '📅 Análise Mensal',
      type: 'individual'
    },
    {
      key: 'sales-analysis',
      label: '💰 Análise de Vendas',
      type: 'category',
      subItems: [
        { key: 'cohort-analysis', label: '🔍 Análise Aprofundada (Safra)', disabled: !salesFromCSV },
        { key: 'sales-performance', label: '📊 Performance de Vendas', disabled: !salesFromCSV },
        { key: 'temporal-sales', label: '📈 Performance Temporal de Vendas', disabled: !salesFromCSV },
        { key: 'temporal-sales-comparison', label: '📅 Comparação Mensal - Vendas Efetivadas', disabled: !salesFromCSV },
        { key: 'capture-time-sales', label: '🗓️ Melhor Dia/Horário de Captação (por Vendas)', disabled: !salesFromCSV },
        { key: 'conversion-time-analysis', label: '⏱️ Análise de Tempo de Conversão', disabled: !salesFromCSV },
        { key: 'churn-analysis', label: '📉 Análise de Churn', disabled: !salesFromCSV },
        { key: 'revenue-analysis', label: '💰 Análise de Receita com LTV e Churn', disabled: !salesFromCSV },
        { key: 'budget-performance-analysis', label: '💸 Análise de Verba vs Performance', disabled: !salesFromCSV },
        { key: 'roi-analysis', label: '📈 Análise de ROI e Lucratividade', disabled: !salesFromCSV }
      ]
    },
    {
      key: 'leads-analysis',
      label: '🎯 Análise de Leads',
      type: 'category',
      subItems: [
        { key: 'adset-quality', label: '🎯 Qualidade por Conjunto de Anúncios', disabled: !fileUploaded },
        { key: 'all-ads', label: '📱 Todos os Anúncios', disabled: !fileUploaded },
        { key: 'ads-drilldown', label: '🔍 Drill-Down Anúncios por Conjunto', disabled: !fileUploaded },
        { key: 'temporal-adsets', label: '📊 Performance Temporal por Conjunto de Anúncios', disabled: !fileUploaded },
        { key: 'temporal-leads-comparison', label: '📅 Comparação Mensal - Entrada de Leads', disabled: !fileUploaded },
        { key: 'temporal-qualified-leads', label: '✅ Comparação Mensal - Leads Qualificados', disabled: !fileUploaded },
        { key: 'temporal-high-income-leads', label: '💰 Comparação Mensal - Leads Alta Renda', disabled: !fileUploaded },
        { key: 'weekday-hourly-analysis', label: '🕐 Performance por Dia da Semana e Horário' }
      ]
    },
    {
      key: 'campaigns-analysis',
      label: '🏷️ Análise por Campanha',
      type: 'category',
      subItems: [
        { key: 'campaign-overview', label: '🏷️ Campanhas — Visão Geral', disabled: !fileUploaded },
        { key: 'temporal-campaigns', label: '📈 Performance Temporal por Campanha', disabled: !fileUploaded }
      ]
    }
  ]

  return (
    <div className={`container ${darkMode ? 'dark' : ''}`}>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src={darkMode ? '/logo-modo-escuro.png' : '/logo-modo-claro.png'}
            alt="Logo"
            style={{
              height: '60px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
          <div>
            <h1 className="title">Dashboard de Campanhas</h1>
            <p className="subtitle">Análise completa de performance e conversões</p>
          </div>
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="btn btn-secondary"
          style={{ padding: '8px 16px' }}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {/* Status de Conexão com Supabase */}
      <DataStatus isLoading={isLoading} lastLeadDate={lastLeadDate} />

      {/* Seção de Upload e Dados */}
      <div className="mb-8">
        <div style={{
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
          borderRadius: '12px',
          padding: '24px',
          boxShadow: darkMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header da Seção */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: isDataSectionExpanded ? '20px' : '0',
            paddingBottom: isDataSectionExpanded ? '16px' : '0',
            borderBottom: isDataSectionExpanded ? `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` : 'none',
            cursor: 'pointer'
          }}
            onClick={() => setIsDataSectionExpanded(!isDataSectionExpanded)}>
            <div>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: '600',
                color: darkMode ? '#f8fafc' : '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 Gerenciamento de Dados
                <span style={{
                  fontSize: '16px',
                  transition: 'transform 0.2s ease',
                  transform: isDataSectionExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
                }}>
                  ▶️
                </span>
              </h2>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: darkMode ? '#94a3b8' : '#6b7280'
              }}>
                {isDataSectionExpanded
                  ? 'Faça upload da planilha de leads e configure os dados da campanha'
                  : 'Clique para expandir e gerenciar dados da campanha'
                }
              </p>
            </div>
            {fileUploaded && csvData.length > 0 && isDataSectionExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  updateCsvData([])
                  setFileUploaded(false)
                  updateManualInputs({
                    verbaGasta: 0,
                    vendasEfetuadas: 0,
                    faturamentoTotal: 0,
                    churnRate: 0,
                    reunioesAgendadas: 0,
                    reunioesRealizadas: 0
                  })
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  backgroundColor: darkMode ? '#dc2626' : '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#b91c1c' : '#dc2626'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = darkMode ? '#dc2626' : '#ef4444'
                }}
              >
                🗑️ Limpar Dados
              </button>
            )}
          </div>

          {/* Conteúdo Expansível */}
          {isDataSectionExpanded && (
            <>

              {/* Status dos Dados */}
              {fileUploaded && csvData.length > 0 && (
                <div style={{
                  backgroundColor: darkMode ? '#065f46' : '#d1fae5',
                  border: `1px solid ${darkMode ? '#047857' : '#a7f3d0'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#10b981',
                    borderRadius: '50%',
                    flexShrink: 0
                  }}></div>
                  <div>
                    <div style={{
                      fontWeight: '600',
                      color: darkMode ? '#a7f3d0' : '#065f46',
                      marginBottom: '2px'
                    }}>
                      ✅ Dados carregados com sucesso
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: darkMode ? '#6ee7b7' : '#047857'
                    }}>
                      <strong>{csvData.length} leads válidos</strong> processados
                      {isSupabaseAvailable && ' • Sincronizado com Supabase'}
                    </div>
                  </div>
                </div>
              )}


              {/* Gerenciamento de Verba Mensal */}

              <div style={{ marginBottom: '32px' }}>
                <MonthlyBudgetManager
                  darkMode={darkMode}
                  onUpdate={() => {
                    fetchMonthlyBudgets()
                  }}
                />
              </div>

              {/* Upload de Arquivos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* Upload CSV */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: darkMode ? '#f8fafc' : '#1f2937',
                    marginBottom: '8px'
                  }}>
                    📈 Upload de Planilha CSV
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                      borderRadius: '8px',
                      backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                      color: darkMode ? '#f8fafc' : '#1f2937',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = darkMode ? '#3b82f6' : '#2563eb'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = darkMode ? '#374151' : '#d1d5db'
                    }}
                  />
                  {fileUploaded && (
                    <div style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: darkMode ? '#065f46' : '#d1fae5',
                      border: `1px solid ${darkMode ? '#047857' : '#a7f3d0'}`,
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: darkMode ? '#a7f3d0' : '#065f46',
                      fontWeight: '500'
                    }}>
                      ✓ Arquivo carregado com {csvData.length} leads válidos
                    </div>
                  )}
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: darkMode ? '#94a3b8' : '#6b7280'
                  }}>
                    <div style={{ fontWeight: '600', marginBottom: '4px', color: darkMode ? '#f1f5f9' : '#374151' }}>
                      ⚠️ Requisitos importantes:
                    </div>
                    <ul style={{ margin: '0', paddingLeft: '16px' }}>
                      <li>A planilha deve conter uma coluna de e-mail</li>
                      <li>Leads sem e-mail serão ignorados</li>
                      <li>E-mails duplicados serão removidos automaticamente</li>
                    </ul>
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Dados da Campanha - Cards Estáticos */}
      <div className="mb-8">
        <h3 style={{
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '600',
          color: darkMode ? '#f8fafc' : '#1f2937'
        }}>
          📊 Dados da Campanha
        </h3>
        <div className="grid grid-4 mb-8">
          <div className="kpi">
            <div className="icon">💰</div>
            <div className="label">Verba Gasta</div>
            <div className="value">R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="kpi">
            <div className="icon">🎯</div>
            <div className="label">Vendas Totais</div>
            <div className="value">{manualInputs.vendasEfetuadas}</div>
          </div>
          <div className="kpi">
            <div className="icon">📈</div>
            <div className="label">Faturamento Total</div>
            <div className="value">R$ {manualInputs.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="kpi" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="icon">💵</div>
            <div className="label">Receita Bruta</div>
            <div className="value" style={{ color: '#10b981' }}>R$ {(() => {
              const recPlan = manualInputs.faturamentoPlanejamento || 0
              const recSeg = manualInputs.faturamentoSeguros || 0
              const recCred = manualInputs.faturamentoCredito || 0
              const recOutros = (manualInputs as any).faturamentoOutros || 0
              // Receita Bruta = Planejamento + Outros + (Seguros × 60%) + (Crédito × 4%)
              const receitaBruta = recPlan + recOutros + (recSeg * 0.6) + (recCred * 0.04)
              return receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
            })()}</div>
            <div className="sub-label" style={{ fontSize: '11px', color: darkMode ? '#94a3b8' : '#6b7280' }}>Após repasses de Seguros e Crédito</div>
          </div>
          <div className="kpi">
            <div className="icon">📉</div>
            <div className="label">Churn (Volume)</div>
            <div className="value">{churnAnalysis.totalChurnCount} <span style={{ fontSize: '14px', fontWeight: 'normal' }}>clientes</span></div>
          </div>
          <div className="kpi">
            <div className="icon">💸</div>
            <div className="label">Churn (Valor)</div>
            <div className="value">R$ {churnAnalysis.totalChurnValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="kpi">
            <div className="icon">⚠️</div>
            <div className="label">Taxa de Churn (Faturamento)</div>
            <div className="value">{taxaChurnCalculada.toFixed(1)}%</div>
          </div>
        </div>

        {/* Cards dos Produtos */}
        <div className="mb-8">
          <h4 style={{
            marginBottom: '16px',
            fontSize: '18px',
            fontWeight: '600',
            color: darkMode ? '#f8fafc' : '#1f2937'
          }}>
            📦 Vendas por Produto
          </h4>
          <div className="grid grid-4 mb-8">
            <div className="kpi">
              <div className="icon">📋</div>
              <div className="label">Planejamento</div>
              <div className="value">{manualInputs.vendasPlanejamento}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoPlanejamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="kpi">
              <div className="icon">🛡️</div>
              <div className="label">Seguros</div>
              <div className="value">{manualInputs.vendasSeguros}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="kpi">
              <div className="icon">💳</div>
              <div className="label">Crédito</div>
              <div className="value">{manualInputs.vendasCredito}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div className="kpi">
              <div className="icon">📦</div>
              <div className="label">Outros</div>
              <div className="value">{(manualInputs as any).vendasOutros || 0}</div>
              <div className="sub-value">R$ {((manualInputs as any).faturamentoOutros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          {/* Nova linha com LTV/CAC e LTGP/CAC */}
          <div className="grid grid-2 mb-8">
            <div className="kpi">
              <div className="icon">💰</div>
              <div className="label">LTV/CAC</div>
              <div className="value">{cac > 0 ? (LTV_FIXO / cac).toFixed(2) : 0}x</div>
            </div>
            <div className="kpi">
              <div className="icon">🚀</div>
              <div className="label">LTGP/CAC</div>
              <div className="value">{ltgpCac.toFixed(2)}x</div>
            </div>
          </div>
        </div>
      </div>


      {/* KPIs Principais */}
      <div className="grid grid-3 mb-8">
        <div className="kpi">
          <div className="icon">💵</div>
          <div className="label">CAC</div>
          <div className="value">R$ {cac.toFixed(2)}</div>
        </div>
        <div className="kpi">
          <div className="icon">💎</div>
          <div className="label">LTGP</div>
          <div className="value">R$ {ltgp.toFixed(2)}</div>
        </div>
        <div className="kpi">
          <div className="icon">🎯</div>
          <div className="label">Taxa Lead → Venda</div>
          <div className="value">{taxaLeadVenda.toFixed(1)}%</div>
        </div>
      </div>

      {/* Taxas de Conversão */}
      <div className="mb-8">
        <h3 style={{
          marginBottom: '16px',
          fontSize: '20px',
          fontWeight: '600',
          color: darkMode ? '#f8fafc' : '#1f2937'
        }}>
          🔄 Taxas de Conversão
        </h3>
        <div className="grid grid-3 mb-8">
          <div className="kpi">
            <div className="icon">📞</div>
            <div className="label">Lead → Reunião</div>
            <div className="value">{taxaLeadReuniao.toFixed(1)}%</div>
          </div>
          <div className="kpi">
            <div className="icon">✅</div>
            <div className="label">Reunião → Realizada</div>
            <div className="value">{taxaRealizacaoReuniao.toFixed(1)}%</div>
          </div>
          <div className="kpi">
            <div className="icon">💰</div>
            <div className="label">Reunião → Planejamento</div>
            <div className="value">{taxaReuniaoVenda.toFixed(1)}%</div>
          </div>
        </div>

        {/* Taxas considerando MQL como base */}
        <div className="grid grid-3 mb-8">
          <div className="kpi">
            <div className="icon">📞</div>
            <div className="label">MQL → Reunião</div>
            <div className="value">{taxaMqlReuniao.toFixed(1)}%</div>
          </div>
          <div className="kpi">
            <div className="icon">✅</div>
            <div className="label">Reunião MQL → Realizada</div>
            <div className="value">{taxaReuniaoMqlRealizada.toFixed(1)}%</div>
          </div>
          <div>
            <div className="grid grid-2">
              <div className="kpi">
                <div className="icon">💰</div>
                <div className="label">MQL → Planejamento</div>
                <div className="value">{(totalMqlLeads > 0 ? (uniquePlanejamentoBuyers / totalMqlLeads) * 100 : 0).toFixed(1)}%</div>
              </div>
              <div className="kpi">
                <div className="icon">💰</div>
                <div className="label">Reunião MQL → Planejamento</div>
                <div className="value">{taxaReuniaoMqlPlanejamento.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros removidos - sempre usar dados completos para cálculos corretos */}

      {/* Cards de Análise */}
      <div className="card mb-8">
        <h2>Tipos de Análise</h2>
        <div className="analysis-cards">
          {analysisCategories.map((category) => (
            <div key={category.key} className="analysis-card-container">
              {category.type === 'individual' ? (
                <div
                  onClick={() => setSelectedAnalysis(category.key)}
                  className={`analysis-card individual-card ${selectedAnalysis === category.key ? 'active' : ''}`}
                >
                  <div className="card-icon">📊</div>
                  <div className="card-content">
                    <h3>{category.label.replace(/^[📊📈💰🎯]+\s*/, '')}</h3>
                    <p>Análise geral da campanha</p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => toggleCategory(category.key)}
                  className={`analysis-card category-card ${isCategoryExpanded(category.key) ? 'expanded' : ''}`}
                >
                  <div className="card-icon">
                    {category.key === 'sales-analysis' ? '💰' : '🎯'}
                  </div>
                  <div className="card-content">
                    <h3>{category.label.replace(/^[📊📈💰🎯]+\s*/, '')}</h3>
                    <p>{category.subItems?.length} análises disponíveis</p>
                    <div className="expand-indicator">
                      {isCategoryExpanded(category.key) ? '▼' : '▶'}
                    </div>
                  </div>
                </div>
              )}

              {category.type === 'category' && isCategoryExpanded(category.key) && (
                <div className="sub-analysis-grid">
                  {category.subItems?.map((subItem) => (
                    <div
                      key={subItem.key}
                      onClick={() => setSelectedAnalysis(subItem.key)}
                      className={`sub-analysis-card ${selectedAnalysis === subItem.key ? 'active' : ''} ${subItem.disabled ? 'disabled' : ''}`}
                    >
                      <div className="sub-card-icon">
                        {subItem.label.includes('Performance') ? '📊' :
                          subItem.label.includes('Temporal') ? '📈' :
                            subItem.label.includes('Comparação') ? '📅' :
                              subItem.label.includes('Tempo') ? '⏱️' :
                                subItem.label.includes('Receita') ? '💰' :
                                  subItem.label.includes('Verba') ? '💸' :
                                    subItem.label.includes('Qualidade') ? '🎯' :
                                      subItem.label.includes('Todos') ? '📱' :
                                        subItem.label.includes('Drill') ? '🔍' :
                                          subItem.label.includes('Dia') ? '🕐' : '📊'}
                      </div>
                      <div className="sub-card-content">
                        <h4>{subItem.label.replace(/^[📊📈📅⏱️💰💸🎯📱🔍🕐]+\s*/, '')}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Conteúdo da Análise */}
      <div>
        {selectedAnalysis === 'overview' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Visão Geral das Campanhas</h3>

            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">👥</div>
                <div className="label">Total de Leads</div>
                <div className="value">{totalLeads}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">⭐</div>
                <div className="label">Leads Qualificados</div>
                <div className="value">{filteredData.filter(row => isQualifiedLead(getColumnValue(row, ['qual_sua_renda_mensal?', 'renda', 'income']))).length}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">💰</div>
                <div className="label">Custo por Lead</div>
                <div className="value">R$ {custoPerLead.toFixed(2)}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">🎯</div>
                <div className="label">Taxa Lead → Planejamento</div>
                <div className="value">{taxaLeadVenda.toFixed(1)}%</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-500">
                <div className="icon">💵</div>
                <div className="label">CAC</div>
                <div className="value">R$ {cac.toFixed(2)}</div>
              </div>
            </div>

            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: funnelData.map(item => item.stage),
                datasets: [{
                  label: 'Quantidade',
                  data: funnelData.map(item => item.value),
                  backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
                  borderColor: ['#1e40af', '#059669', '#d97706', '#dc2626'],
                  borderWidth: 2
                }]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Funil de Conversão',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    }
                  }
                }
              }}
            />

            <h4>Funil de Conversão - Dados</h4>
            <table className="table">
              <thead>
                <tr>
                  <th>Etapa</th>
                  <th>Quantidade</th>
                  <th>Taxa de Conversão</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((item, i) => (
                  <tr key={i}>
                    <td>{item.stage}</td>
                    <td><span className="highlight">{item.value}</span></td>
                    <td>
                      {i === 0 ? '100%' :
                        i === 1 ? `${((item.value / funnelData[0].value) * 100).toFixed(1)}%` :
                          i === 2 ? `${((item.value / funnelData[1].value) * 100).toFixed(1)}%` :
                            `${((item.value / funnelData[2].value) * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 style={{ marginTop: 32 }}>Performance por Conjunto de Anúncios</h4>
            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: adsetPerformance.slice(0, 8).map(item => item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name),
                datasets: [{
                  label: 'Leads',
                  data: adsetPerformance.slice(0, 8).map(item => item.leads),
                  backgroundColor: '#f59e0b',
                  borderColor: '#d97706',
                  borderWidth: 2
                }]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Top 8 Conjuntos por Número de Leads',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    }
                  }
                }
              }}
            />

            <h4 style={{ marginTop: 32 }}>Distribuição por Faixa de Renda</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
              <div>
                <ChartComponent
                  type="doughnut"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: incomeDistribution.map(item => item.name),
                    datasets: [{
                      data: incomeDistribution.map(item => item.value),
                      backgroundColor: [
                        '#ef4444', '#f97316', '#f59e0b', '#eab308',
                        '#84cc16', '#22c55e', '#10b981', '#06b6d4'
                      ],
                      borderWidth: 2,
                      borderColor: '#ffffff'
                    }]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Distribuição de Renda',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
              <div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faixa de Renda</th>
                      <th>Quantidade</th>
                      <th>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incomeDistribution.map((item, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: '13px' }}>{item.name}</td>
                        <td><span className="highlight">{item.value}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            (item.value / totalLeads) * 100,
                            { good: 20, medium: 10 }
                          )}>
                            {totalLeads > 0 ? ((item.value / totalLeads) * 100).toFixed(1) : 0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Análise Mensal */}
        {selectedAnalysis === 'monthly-analysis' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📅 Análise Mensal</h3>
            <p className="muted">Visualize todas as métricas filtradas por mês</p>

            {!fileUploaded || csvData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: darkMode ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', borderRadius: '8px', border: `1px solid ${darkMode ? '#7f1d1d' : '#fecaca'}` }}>
                <p style={{ color: darkMode ? '#fca5a5' : '#dc2626', fontWeight: 'bold' }}>⚠️ Nenhum dado de leads carregado</p>
                <p style={{ color: darkMode ? '#e2e8f0' : '#4b5563' }}>Para visualizar a análise mensal detalhada, por favor faça o upload da planilha de leads na seção "Gerenciamento de Dados".</p>
              </div>
            ) : (
              <>

                {/* Seletor de Mês */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' }}>
                  <label className="muted">Selecione o mês:</label>
                  <select
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="input"
                    style={{ minWidth: '200px' }}
                  >
                    <option value="">-- Selecione um mês --</option>
                    {getAvailableMonths.map(m => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {selectedMonth ? (() => {
                  const data = getMonthlyAnalysisData(selectedMonth)
                  if (!data) return <p className="muted">Nenhum dado disponível para este mês.</p>

                  return (
                    <>
                      {/* Resumo do Mês */}
                      <div style={{ marginBottom: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '12px' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8' }}>📊 Resumo: {data.month}</h4>
                      </div>

                      {/* Cards de Resumo */}
                      <div className="grid grid-4 mb-8">
                        <div className="summary-card">
                          <div className="icon">👥</div>
                          <div className="label">Leads no Mês</div>
                          <div className="value">{data.leads.total}</div>
                        </div>
                        <div className="summary-card">
                          <div className="icon">⭐</div>
                          <div className="label">Leads Qualificados</div>
                          <div className="value">{data.leads.qualified}</div>
                          <div className="sub-value">{data.leads.qualifiedRate.toFixed(1)}%</div>
                        </div>
                        <div className="summary-card">
                          <div className="icon">🎯</div>
                          <div className="label">Vendas (Novos Clientes)</div>
                          <div className="value">{data.sales.planejamento.count}</div>
                          <div className="sub-value">{data.sales.conversionRate.toFixed(1)}% conversão</div>
                        </div>
                        <div className="summary-card">
                          <div className="icon">💰</div>
                          <div className="label">Faturamento no Mês</div>
                          <div className="value">R$ {data.sales.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
                          <div className="icon">💵</div>
                          <div className="label">Receita Bruta</div>
                          <div className="value" style={{ color: '#10b981' }}>R$ {(() => {
                            const recPlan = data.sales.planejamento?.revenue || 0
                            const recSeg = data.sales.seguros?.revenue || 0
                            const recCred = data.sales.credito?.revenue || 0
                            const recOutros = data.sales.outros?.revenue || 0
                            // Receita Bruta = Planejamento + Outros + (Seguros × 60%) + (Crédito × 4%)
                            const receitaBruta = recPlan + recOutros + (recSeg * 0.6) + (recCred * 0.04)
                            return receitaBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                          })()}</div>
                          <div className="sub-label" style={{ fontSize: '11px', color: darkMode ? '#94a3b8' : '#6b7280' }}>Após repasses externos</div>
                        </div>
                        {(() => {
                          const monthBudget = monthlyBudgets.find(b => b.month === selectedMonth)?.amount || 0
                          const revenuePerReal = monthBudget > 0 ? data.sales.totalRevenue / monthBudget : 0
                          return (
                            <>
                              <div className="summary-card" style={{ borderLeft: monthBudget > 0 ? '4px solid #3b82f6' : '4px solid #ef4444' }}>
                                <div className="icon">📢</div>
                                <div className="label">Verba Investida</div>
                                <div className="value">R$ {monthBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                <div className="sub-label">{monthBudget > 0 ? 'cadastrado' : 'não cadastrado'}</div>
                              </div>
                              <div className="summary-card" style={{ borderLeft: revenuePerReal >= 1 ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                                <div className="icon">📈</div>
                                <div className="label">Faturamento/R$ Investido</div>
                                <div className="value" style={{ color: revenuePerReal >= 1 ? '#10b981' : '#f59e0b' }}>
                                  {monthBudget > 0 ? `R$ ${revenuePerReal.toFixed(2)}` : 'N/A'}
                                </div>
                                <div className="sub-label">{revenuePerReal >= 1 ? 'retorno positivo' : 'em maturação'}</div>
                              </div>

                              {/* Card Margem de Contribuição */}
                              {(() => {
                                // @ts-ignore - totalContributionMargin added dynamically
                                const marginPerReal = monthBudget > 0 ? (data.sales.totalContributionMargin || 0) / monthBudget : 0
                                return (
                                  <div className="summary-card" style={{ borderLeft: marginPerReal >= 1 ? '4px solid #3b82f6' : '4px solid #f59e0b' }}>
                                    <div className="icon">💎</div>
                                    <div className="label">Margem Contrib./R$ Investido</div>
                                    <div className="value" style={{ color: marginPerReal >= 1 ? '#3b82f6' : '#f59e0b' }}>
                                      {monthBudget > 0 ? `R$ ${marginPerReal.toFixed(2)}` : 'N/A'}
                                    </div>
                                    <div className="sub-label">retorno real por R$</div>
                                  </div>
                                )
                              })()}
                            </>
                          )
                        })()}
                      </div>

                      {/* Vendas por Produto */}
                      <h4>📦 Vendas por Produto no Mês</h4>
                      <div className="grid grid-4 mb-8">
                        <div className="kpi">
                          <div className="icon">📋</div>
                          <div className="label">Planejamento</div>
                          <div className="value">{data.sales.planejamento.salesCount}</div>
                          <div className="sub-value">R$ {data.sales.planejamento.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="kpi">
                          <div className="icon">🛡️</div>
                          <div className="label">Seguros</div>
                          <div className="value">{data.sales.seguros.count}</div>
                          <div className="sub-value">R$ {data.sales.seguros.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="kpi">
                          <div className="icon">💳</div>
                          <div className="label">Crédito</div>
                          <div className="value">{data.sales.credito.count}</div>
                          <div className="sub-value">R$ {data.sales.credito.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="kpi">
                          <div className="icon">📦</div>
                          <div className="label">Outros</div>
                          <div className="value">{data.sales.outros.count}</div>
                          <div className="sub-value">R$ {data.sales.outros.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                        </div>
                      </div>

                      {/* Churn do Mês */}
                      {data.churn.count > 0 && (
                        <>
                          <h4>📉 Churn no Mês</h4>
                          <div className="grid grid-2 mb-8">
                            <div className="kpi">
                              <div className="icon">📉</div>
                              <div className="label">Volume de Churn</div>
                              <div className="value">{data.churn.count} clientes</div>
                            </div>
                            <div className="kpi">
                              <div className="icon">💸</div>
                              <div className="label">Valor de Churn</div>
                              <div className="value">R$ {data.churn.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Distribuição de Renda dos Leads */}
                      <h4>💼 Distribuição de Renda dos Leads</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                        <div>
                          <ChartComponent
                            type="doughnut"
                            height={250}
                            darkMode={darkMode}
                            data={{
                              labels: data.leads.incomeDistribution.map(d => d.name),
                              datasets: [{
                                data: data.leads.incomeDistribution.map(d => d.count),
                                backgroundColor: [
                                  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'
                                ]
                              }]
                            }}
                            options={{
                              plugins: {
                                legend: { position: 'bottom', labels: { color: darkMode ? '#e2e8f0' : '#374151' } }
                              }
                            }}
                          />
                        </div>
                        <div>
                          <table className="table">
                            <thead>
                              <tr>
                                <th>Faixa de Renda</th>
                                <th>Qtd</th>
                                <th>%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data.leads.incomeDistribution.map((item, i) => (
                                <tr key={i}>
                                  <td>{item.name}</td>
                                  <td><span className="highlight">{item.count}</span></td>
                                  <td>{item.percentage.toFixed(1)}%</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detalhes das Vendas do Mês */}
                      <h4>🧾 Detalhes das Vendas do Mês</h4>
                      <p className="muted" style={{ marginTop: '-8px', marginBottom: '16px', fontSize: '13px' }}>
                        Uma linha por venda fechada em {data.month} (não por cliente). O tempo é contado da
                        entrada do lead até a data da venda.
                      </p>

                      {data.sales.detalhes.length === 0 ? (
                        <div style={{
                          textAlign: 'center', padding: '32px', borderRadius: '8px',
                          background: darkMode ? 'rgba(148, 163, 184, 0.08)' : '#f9fafb',
                          color: darkMode ? '#94a3b8' : '#6b7280'
                        }}>
                          Nenhuma venda registrada em {data.month}.
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-4 mb-8">
                            <div className="kpi">
                              <div className="icon">🧾</div>
                              <div className="label">Vendas no Mês</div>
                              <div className="value">{data.sales.detalhes.length}</div>
                            </div>
                            <div className="kpi">
                              <div className="icon">💰</div>
                              <div className="label">Faturamento</div>
                              <div className="value">R$ {data.sales.detalhes.reduce((acc, v) => acc + v.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="kpi">
                              <div className="icon">🎟️</div>
                              <div className="label">Ticket Médio</div>
                              <div className="value">R$ {(data.sales.detalhes.reduce((acc, v) => acc + v.valor, 0) / data.sales.detalhes.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                            </div>
                            <div className="kpi">
                              <div className="icon">⏱️</div>
                              <div className="label">Tempo Médio até a Venda</div>
                              <div className="value">{data.sales.diasMedioMes !== null ? `${data.sales.diasMedioMes.toFixed(0)} dias` : '—'}</div>
                              <div className="sub-value">da entrada do lead — sem renovações</div>
                            </div>
                          </div>

                          {/* Vendas agrupadas por faixa de renda do cliente */}
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '15px', color: darkMode ? '#f8fafc' : '#1f2937' }}>
                            Vendas por Faixa de Renda
                          </h5>
                          <div style={{ overflowX: 'auto', marginBottom: '24px' }}>
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Faixa de Renda</th>
                                  <th>Vendas</th>
                                  <th>Receita</th>
                                  <th>Ticket Médio</th>
                                  <HeaderTooltip label="Tempo Médio" darkMode={darkMode}
                                    tooltip="Média de dias entre a entrada do lead e a venda nesta faixa. Renovações ficam de fora: elas mediriam tempo de casa, não ciclo de venda." />
                                </tr>
                              </thead>
                              <tbody>
                                {data.sales.porFaixaRenda.map((f, i) => (
                                  <tr key={i}>
                                    <td>{f.faixaRenda}</td>
                                    <td><span className="highlight">{f.vendas}</span></td>
                                    <td>R$ {f.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td>R$ {f.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td>{f.diasMedios !== null ? `${f.diasMedios.toFixed(0)}d` : '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Uma linha por venda */}
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '15px', color: darkMode ? '#f8fafc' : '#1f2937' }}>
                            Vendas Individuais
                          </h5>
                          <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ minWidth: '760px' }}>
                              <thead>
                                <tr>
                                  <th>Cliente</th>
                                  <th>Produto</th>
                                  <th>Faixa de Renda</th>
                                  <th>Data da Venda</th>
                                  <HeaderTooltip label="Tempo até a Venda" darkMode={darkMode}
                                    tooltip="Dias entre a entrada do lead e a data da venda. Mostra '—' quando o lead não tem data de entrada." />
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.sales.detalhes.map((v, i) => (
                                  <tr key={i}>
                                    <td title={v.email}>{v.cliente}</td>
                                    <td>{v.produto}</td>
                                    <td>{v.faixaRenda}</td>
                                    <td>{v.dataVenda.toLocaleDateString('pt-BR')}</td>
                                    <td>
                                      {v.diasAteVenda === null ? '—' : (
                                        <span className={v.diasAteVenda <= 15 ? 'text-green' : v.diasAteVenda <= 30 ? 'text-orange' : 'text-red'}>
                                          {v.diasAteVenda}d
                                        </span>
                                      )}
                                    </td>
                                    <td>R$ {v.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </>
                  )
                })() : (
                  <div style={{ textAlign: 'center', padding: '48px', color: darkMode ? '#94a3b8' : '#6b7280' }}>
                    <p style={{ fontSize: '18px' }}>👆 Selecione um mês para visualizar a análise</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}


        {/* Qualidade por Conjunto */}
        {selectedAnalysis === 'adset-quality' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Qualidade por Conjunto de Anúncios</h3>
            <p className="muted">Análise da qualidade dos leads por conjunto, baseada na renda</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <label className="muted">Campanha:</label>
              <select value={campaignFilterLeads} onChange={e => setCampaignFilterLeads(e.target.value)} className="input">
                {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Conjunto</th>
                  <th>Total Leads</th>
                  <th>Score Médio</th>
                  <th>Principais Faixas de Renda</th>
                </tr>
              </thead>
              <tbody>
                {adsetIncomeData().slice(0, 15).map((item, i) => (
                  <tr key={i}>
                    <td>{item.adset}</td>
                    <td><span className="highlight">{item.totalLeads}</span></td>
                    <td><span className="highlight">{item.avgIncomeScore}</span></td>
                    <td>
                      <IncomeDistributionCell
                        incomeDistribution={item.incomeDistribution}
                        id={`quality-adset-${i}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Drill-Down por Conjunto */}
        {selectedAnalysis === 'adset-drill' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Drill-Down por Conjunto de Anúncios</h3>
            <p className="muted">Análise detalhada da distribuição de renda por conjunto</p>

            <table className="table">
              <thead>
                <tr>
                  <th>Conjunto</th>
                  <th>Total Leads</th>
                  <th>Score Médio</th>
                  <th>Principais Faixas de Renda</th>
                </tr>
              </thead>
              <tbody>
                {adsetIncomeData().slice(0, 20).map((item, i) => (
                  <tr key={i}>
                    <td>{item.adset}</td>
                    <td><span className="highlight">{item.totalLeads}</span></td>
                    <td><span className="highlight">{item.avgIncomeScore}</span></td>
                    <td>
                      <IncomeDistributionCell
                        incomeDistribution={item.incomeDistribution}
                        id={`adset-drill-${i}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Todos os Anúncios */}
        {selectedAnalysis === 'all-ads' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Todos os Anúncios</h3>
            <p className="muted">Performance de todos os anúncios por qualidade de leads</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <label className="muted">Campanha:</label>
              <select value={campaignFilterLeads} onChange={e => setCampaignFilterLeads(e.target.value)} className="input">
                {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Conjunto</th>
                  <th>Leads</th>
                  <th>Score Médio</th>
                  <th>Leads Alta Renda</th>
                  <th>% Alta Renda</th>
                </tr>
              </thead>
              <tbody>
                {getAllAdsData().slice(0, 30).map((item, i) => (
                  <tr key={i}>
                    <td className="text-sm">{item.ad}</td>
                    <td className="text-xs text-gray">{item.adset}</td>
                    <td><span className="highlight">{item.totalLeads}</span></td>
                    <td><span className="highlight">{item.avgIncomeScore}</span></td>
                    <td><span className="highlight">{item.highIncomeLeads}</span></td>
                    <td>
                      <span className={getPerformanceColorClass(item.highIncomePercentage, { good: 50, medium: 25 })}>
                        {item.highIncomePercentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance de Vendas */}
        {(() => {
          // A seção deve ser habilitada se houver vendas efetuadas (manualInputs.vendasEfetuadas > 0)
          // e o selectedAnalysis for 'sales-performance'
          if (selectedAnalysis === 'sales-performance' && manualInputs.vendasEfetuadas > 0) {
            return (
              <div className="card">
                <h3 style={{ marginTop: 0 }}>Performance de Vendas por Conjunto</h3>
                <p className="muted">Análise de vendas, receita e conversão por conjunto de anúncios</p>

                <div className="summary-cards mb-8">
                  <div className="summary-card animate-fade-in-up animate-delay-100">
                    <div className="icon">🎯</div>
                    <div className="label">Total Vendas</div>
                    <div className="value">{manualInputs.vendasEfetuadas}</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-200">
                    <div className="icon">💰</div>
                    <div className="label">Faturamento Total</div>
                    <div className="value">R$ {manualInputs.faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-250">
                    <div className="icon">📋</div>
                    <div className="label">Faturamento Planejamento</div>
                    <div className="value">R$ {manualInputs.faturamentoPlanejamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-300">
                    <div className="icon">🛡️</div>
                    <div className="label">Faturamento Seguros</div>
                    <div className="value">R$ {manualInputs.faturamentoSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-350">
                    <div className="icon">💳</div>
                    <div className="label">Faturamento Crédito</div>
                    <div className="value">R$ {manualInputs.faturamentoCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-400">
                    <div className="icon">🏆</div>
                    <div className="label">Melhor Conjunto</div>
                    <div className="value" title={getAdsetSalesData[0]?.adset}>{getAdsetSalesData[0]?.adset?.substring(0, 20)}...</div>
                  </div>
                  <div className="summary-card animate-fade-in-up animate-delay-450">
                    <div className="icon">📊</div>
                    <div className="label">Taxa de Conversão Planejamento</div>
                    <div className="value">{filteredData.length > 0 ? ((manualInputs.vendasEfetuadas / filteredData.length) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>Conjunto</th>
                      <th>Leads</th>
                      <th>Vendas Total</th>
                      <th>Vendas Planej.</th>
                      <th>Vendas Seguros</th>
                      <th>Vendas Crédito</th>
                      <th>Taxa Conversão</th>
                      <th>Faturamento Total</th>
                      <th>Faturamento Planej.</th>
                      <th>Faturamento Seguros</th>
                      <th>Faturamento Crédito</th>
                      <th>Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAdsetSalesData.slice(0, 20).map((item, i) => (
                      <tr key={i}>
                        <td>{item.adset}</td>
                        <td><span className="highlight">{item.totalLeads}</span></td>
                        <td><span className="highlight">{item.totalSales}</span></td>
                        <td><span className="highlight">{item.salesPlanejamento}</span></td>
                        <td><span className="highlight">{item.salesSeguros}</span></td>
                        <td><span className="highlight">{item.salesCredito}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(item.conversionRate, { good: 10, medium: 5 })}>
                            {item.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td><span className="highlight">R$ {item.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td><span className="highlight">R$ {item.revenuePlanejamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td><span className="highlight">R$ {item.revenueSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td><span className="highlight">R$ {item.revenueCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td><span className="highlight">R$ {item.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Gráficos de Vendas por Faixa de Renda */}
                {(() => {
                  const activeIncomeData = getSalesByIncomeFiltered
                  return (<>
                <h4 style={{ marginTop: '32px', marginBottom: '8px', color: darkMode ? '#f8fafc' : '#1f2937' }}>
                  💰 Vendas por Faixa de Renda
                </h4>

                {/* Filtros */}
                <div style={{ marginBottom: '16px' }}>
                  {/* Filtro Temporal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>📅 Período:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>De</label>
                      <select
                        value={salesIncomeDateFrom}
                        onChange={e => setSalesIncomeDateFrom(e.target.value)}
                        style={{
                          padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                          border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                          background: darkMode ? '#1f2937' : '#fff',
                          color: darkMode ? '#d1d5db' : '#374151',
                        }}
                      >
                        <option value="">Início</option>
                        {getAvailableMonths.slice().reverse().map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>Até</label>
                      <select
                        value={salesIncomeDateTo}
                        onChange={e => setSalesIncomeDateTo(e.target.value)}
                        style={{
                          padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                          border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                          background: darkMode ? '#1f2937' : '#fff',
                          color: darkMode ? '#d1d5db' : '#374151',
                        }}
                      >
                        <option value="">Hoje</option>
                        {getAvailableMonths.map(m => (
                          <option key={m.key} value={m.key}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                    {(salesIncomeDateFrom || salesIncomeDateTo) && (
                      <button
                        onClick={() => { setSalesIncomeDateFrom(''); setSalesIncomeDateTo('') }}
                        style={{
                          padding: '5px 10px', fontSize: '12px', borderRadius: '5px', cursor: 'pointer',
                          border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                          background: darkMode ? '#1f2937' : '#fff',
                          color: darkMode ? '#f87171' : '#dc2626',
                        }}
                      >
                        ✕ Limpar
                      </button>
                    )}
                  </div>

                  {/* Filtro de Campanhas */}
                  <button
                    onClick={() => setSalesIncomeFilterOpen(o => !o)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
                      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                      background: darkMode ? '#1f2937' : '#f9fafb',
                      color: darkMode ? '#d1d5db' : '#374151', fontSize: '14px',
                    }}
                  >
                    <span>🔍 Filtrar Campanhas</span>
                    <span style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                      ({campaignOverview.length - salesIncomeHiddenCampaigns.size} de {campaignOverview.length} visíveis)
                    </span>
                    <span style={{ fontSize: '11px' }}>{salesIncomeFilterOpen ? '▲' : '▼'}</span>
                  </button>
                  {salesIncomeFilterOpen && (
                    <div style={{
                      marginTop: '8px', padding: '14px', borderRadius: '8px',
                      border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                      background: darkMode ? '#111827' : '#f9fafb',
                    }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button
                          onClick={() => setSalesIncomeHiddenCampaigns(new Set())}
                          style={{
                            padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                            border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                            background: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#d1d5db' : '#374151',
                          }}
                        >Mostrar Todas</button>
                        <button
                          onClick={() => setSalesIncomeHiddenCampaigns(new Set(campaignOverview.map(c => c.campaign)))}
                          style={{
                            padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                            border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                            background: darkMode ? '#1f2937' : '#fff', color: darkMode ? '#d1d5db' : '#374151',
                          }}
                        >Ocultar Todas</button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {campaignOverview.map(c => {
                          const visible = !salesIncomeHiddenCampaigns.has(c.campaign)
                          return (
                            <label key={c.campaign} style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                              background: visible ? (darkMode ? '#1e3a5f' : '#dbeafe') : (darkMode ? '#1f2937' : '#f3f4f6'),
                              color: visible ? (darkMode ? '#93c5fd' : '#1d4ed8') : (darkMode ? '#6b7280' : '#9ca3af'),
                              fontSize: '13px', userSelect: 'none',
                            }}>
                              <input type="checkbox" checked={visible}
                                onChange={e => setSalesIncomeHiddenCampaigns(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.delete(c.campaign); else next.add(c.campaign)
                                  return next
                                })}
                                style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                              />
                              {c.campaign}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                  {/* Cards de métricas manuais (existente) */}
                  <div>
                    <h5 style={{ marginBottom: '16px', textAlign: 'center', color: darkMode ? '#e2e8f0' : '#374151' }}>
                      📊 Volume de Vendas
                    </h5>
                    <ChartComponent
                      type="doughnut"
                      darkMode={darkMode}
                      height={350}
                      data={{
                        labels: activeIncomeData.filter(item => item.sales > 0).map(item => item.incomeName),
                        datasets: [{
                          label: 'Vendas',
                          data: activeIncomeData.filter(item => item.sales > 0).map(item => item.sales),
                          backgroundColor: [
                            '#dc2626', // Vermelho intenso
                            '#ea580c', // Laranja forte
                            '#d97706', // Âmbar
                            '#16a34a', // Verde
                            '#0891b2', // Ciano
                            '#2563eb', // Azul
                            '#7c3aed', // Roxo
                            '#9ca3af'  // Cinza (Não informado)
                          ],
                          borderColor: darkMode ? '#1e293b' : '#ffffff',
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                            labels: {
                              color: darkMode ? '#e2e8f0' : '#374151',
                              font: { size: 11 },
                              padding: 10
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function (context: any) {
                                const value = context.parsed
                                const dataset = context.dataset.data
                                const total = dataset.reduce((a: number, b: number) => a + b, 0)
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                                return `${context.label}: ${value} vendas (${percentage}%)`
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Gráfico de Pizza - Faturamento */}
                  <div>
                    <h5 style={{ marginBottom: '16px', textAlign: 'center', color: darkMode ? '#e2e8f0' : '#374151' }}>
                      💵 Faturamento
                    </h5>
                    <ChartComponent
                      type="doughnut"
                      darkMode={darkMode}
                      height={350}
                      data={{
                        labels: activeIncomeData.filter(item => item.revenue > 0).map(item => item.incomeName),
                        datasets: [{
                          label: 'Faturamento',
                          data: activeIncomeData.filter(item => item.revenue > 0).map(item => item.revenue),
                          backgroundColor: [
                            '#dc2626', // Vermelho intenso
                            '#ea580c', // Laranja forte
                            '#d97706', // Âmbar
                            '#16a34a', // Verde
                            '#0891b2', // Ciano
                            '#2563eb', // Azul
                            '#7c3aed', // Roxo
                            '#9ca3af'  // Cinza (Não informado)
                          ],
                          borderColor: darkMode ? '#1e293b' : '#ffffff',
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                            labels: {
                              color: darkMode ? '#e2e8f0' : '#374151',
                              font: { size: 11 },
                              padding: 10
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function (context: any) {
                                const value = context.parsed
                                const dataset = context.dataset.data
                                const total = dataset.reduce((a: number, b: number) => a + b, 0)
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
                                return `${context.label}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)`
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Tabela detalhada */}
                <h5 style={{ marginBottom: '16px', color: darkMode ? '#e2e8f0' : '#374151' }}>
                  📋 Detalhamento por Faixa de Renda
                </h5>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Faixa de Renda</th>
                      <th>Leads</th>
                      <th>Vendas</th>
                      <th>Taxa de Conversão</th>
                      <th>Faturamento Total</th>
                      <th>Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeIncomeData.map((item, i) => (
                      <tr key={i}>
                        <td>{item.incomeName}</td>
                        <td><span className="highlight">{item.leads}</span></td>
                        <td><span className="highlight">{item.sales}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(item.conversionRate, { good: 10, medium: 5 })}>
                            {item.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                        <td><span className="highlight">R$ {item.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td><span className="highlight">R$ {item.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </>)
                })()}
              </div>
            )
          }
          return null
        })()}

        {/* Drill-Down Anúncios por Conjunto */}
        {selectedAnalysis === 'ads-drilldown' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Drill-Down Anúncios por Conjunto</h3>
            <p className="muted">Detalhamento da contribuição de cada anúncio dentro dos conjuntos</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <label className="muted">Campanha:</label>
              <select value={campaignFilterLeads} onChange={e => setCampaignFilterLeads(e.target.value)} className="input">
                {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            {getAdsByAdsetDrillDown().slice(0, 10).map((group, gi) => (
              <div key={gi} style={{ marginBottom: '32px' }}>
                <h4 className="border-bottom" style={{ marginBottom: '16px' }}>
                  {group.adsetData.adset}
                </h4>

                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="icon">📊</div>
                    <div className="label">{group.adsetData.totalLeads} leads</div>
                    <div className="value">{group.adsetData.totalLeads}</div>
                  </div>
                  <div className="summary-card">
                    <div className="icon">💰</div>
                    <div className="label">{group.adsetData.totalSales} vendas</div>
                    <div className="value">{group.adsetData.totalSales}</div>
                  </div>
                  <div className="summary-card">
                    <div className="icon">💵</div>
                    <div className="label">R$ {group.adsetData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    <div className="value">R$ {(group.adsetData.totalRevenue / 1000).toFixed(0)}k</div>
                  </div>
                  <div className="summary-card">
                    <div className="icon">📈</div>
                    <div className="label">{group.adsetData.conversionRate.toFixed(1)}% conversão</div>
                    <div className="value">{group.adsetData.conversionRate.toFixed(1)}%</div>
                  </div>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Anúncio</th>
                      <th>Leads</th>
                      <th>Vendas</th>
                      <th>Receita</th>
                      <th>% do Conjunto</th>
                      <th>Taxa Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.ads.slice(0, 5).map((ad, ai) => (
                      <tr key={ai}>
                        <td className="text-sm">{ad.ad}</td>
                        <td><span className="highlight">{ad.totalLeads}</span></td>
                        <td><span className="highlight">{ad.totalSales}</span></td>
                        <td><span className="highlight">R$ {ad.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                        <td>
                          <span className={ad.percentOfAdset >= 50 ? 'text-green' : 'text-gray'}>
                            {ad.percentOfAdset.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={getPerformanceColorClass(ad.conversionRate, { good: 10, medium: 5 })}>
                            {ad.conversionRate.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="insights-box">
                  <div className="insights-title">
                    💡 Insights do Conjunto:
                  </div>
                  <div className="insights-content">
                    <strong>Melhor anúncio:</strong> {group.ads[0]?.ad} ({group.ads[0]?.percentOfAdset.toFixed(1)}% do faturamento)<br />
                    <strong>Concentração:</strong> {group.ads.length <= 2 ? 'Alta' : group.ads.length <= 4 ? 'Média' : 'Baixa'} (anúncio líder {group.ads.length > 0 ? 'representa' : ''} {group.ads[0]?.percentOfAdset >= 50 ? 'mais da metade' : group.ads[0]?.percentOfAdset >= 30 ? 'cerca de 1/3' : 'uma parte'} do faturamento)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Campanhas — Visão Geral */}
        {selectedAnalysis === 'campaign-overview' && (() => {
          const visibleCampaigns = campaignOverviewDisplay.filter(c => !hiddenCampaigns.has(c.campaign))
          const isSafra = campaignViewMode === 'safra'
          return (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🏷️ Campanhas — Visão Geral</h3>
            <p className="muted">Leads, clientes com vendas e conversão por campanha</p>

            {/* Seletor de Visão */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280', marginBottom: '8px' }}>
                🔀 Como contar as vendas no período:
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {([
                  {
                    key: 'safra' as const,
                    titulo: '🌱 Safra — por chegada do lead',
                    desc: 'Todas as vendas dos leads que CHEGARAM no período, mesmo que a venda tenha sido depois'
                  },
                  {
                    key: 'vendas' as const,
                    titulo: '💰 Vendas — por data da venda',
                    desc: 'Somente as vendas que ACONTECERAM no período, mesmo que o lead tenha chegado antes'
                  }
                ]).map(opt => {
                  const ativo = campaignViewMode === opt.key
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setCampaignViewMode(opt.key)}
                      style={{
                        flex: '1 1 300px', textAlign: 'left', cursor: 'pointer',
                        padding: '10px 14px', borderRadius: '8px',
                        border: `2px solid ${ativo ? '#3b82f6' : (darkMode ? '#374151' : '#e5e7eb')}`,
                        background: ativo
                          ? (darkMode ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff')
                          : (darkMode ? '#1f2937' : '#f9fafb'),
                        color: darkMode ? '#e2e8f0' : '#374151',
                      }}
                    >
                      <div style={{
                        fontSize: '14px', fontWeight: 600, marginBottom: '4px',
                        color: ativo ? (darkMode ? '#93c5fd' : '#1d4ed8') : (darkMode ? '#d1d5db' : '#374151')
                      }}>
                        {opt.titulo} {ativo && '✓'}
                      </div>
                      <div style={{ fontSize: '12px', lineHeight: 1.4, color: darkMode ? '#9ca3af' : '#6b7280' }}>
                        {opt.desc}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div style={{
                marginTop: '10px', padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
                background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                color: darkMode ? '#bfdbfe' : '#1e40af'
              }}>
                {isSafra
                  ? <>Exibindo <strong>Safra</strong>: os leads e as vendas estão atribuídos ao mês em que o <strong>lead chegou</strong>. Serve para avaliar a qualidade dos leads de cada período.</>
                  : <>Exibindo <strong>Vendas do período</strong>: cada venda conta no mês em que <strong>ela aconteceu</strong> (a campanha é a que trouxe o cliente). Serve para acompanhar o resultado comercial do período.</>}
                {' '}Os <strong>Leads</strong> são sempre contados pelo mês de chegada nas duas visões.
              </div>
            </div>

            {/* Filtro Temporal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>📅 Período:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>De</label>
                <select
                  value={campaignDateFrom}
                  onChange={e => setCampaignDateFrom(e.target.value)}
                  style={{
                    padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                    border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                    background: darkMode ? '#1f2937' : '#fff',
                    color: darkMode ? '#d1d5db' : '#374151',
                  }}
                >
                  <option value="">Início</option>
                  {getAvailableMonths.slice().reverse().map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>Até</label>
                <select
                  value={campaignDateTo}
                  onChange={e => setCampaignDateTo(e.target.value)}
                  style={{
                    padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                    border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                    background: darkMode ? '#1f2937' : '#fff',
                    color: darkMode ? '#d1d5db' : '#374151',
                  }}
                >
                  <option value="">Hoje</option>
                  {getAvailableMonths.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
              {(campaignDateFrom || campaignDateTo) && (
                <button
                  onClick={() => { setCampaignDateFrom(''); setCampaignDateTo('') }}
                  style={{
                    padding: '5px 10px', fontSize: '12px', borderRadius: '5px', cursor: 'pointer',
                    border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                    background: darkMode ? '#1f2937' : '#fff',
                    color: darkMode ? '#f87171' : '#dc2626',
                  }}
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {/* Filtro de Campanhas */}
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={() => setCampaignFilterOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  background: darkMode ? '#1f2937' : '#f9fafb',
                  color: darkMode ? '#d1d5db' : '#374151', fontSize: '14px',
                }}
              >
                <span>🔍 Filtrar Campanhas</span>
                <span style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                  {/* Denominador = campanhas com leads no período selecionado (não o total geral),
                      senão o contador promete mais campanhas do que a tela pode mostrar */}
                  ({visibleCampaigns.length} de {campaignOverviewDisplay.length} visíveis)
                </span>
                <span style={{ fontSize: '11px' }}>{campaignFilterOpen ? '▲' : '▼'}</span>
              </button>

              {campaignFilterOpen && (
                <div style={{
                  marginTop: '8px', padding: '14px', borderRadius: '8px',
                  border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                  background: darkMode ? '#111827' : '#f9fafb',
                }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <button
                      onClick={() => setHiddenCampaigns(new Set())}
                      style={{
                        padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                        background: darkMode ? '#1f2937' : '#fff',
                        color: darkMode ? '#d1d5db' : '#374151',
                      }}
                    >
                      Mostrar Todas
                    </button>
                    <button
                      onClick={() => setHiddenCampaigns(new Set(campaignOverview.map(c => c.campaign)))}
                      style={{
                        padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                        background: darkMode ? '#1f2937' : '#fff',
                        color: darkMode ? '#d1d5db' : '#374151',
                      }}
                    >
                      Ocultar Todas
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(() => {
                      // Campanhas que têm leads no período selecionado. As demais continuam na
                      // lista (para o usuário poder gerenciá-las), mas marcadas — marcar/desmarcar
                      // não muda nada na tela enquanto o período não incluir leads delas.
                      const noPeriodo = new Set(campaignOverviewDisplay.map((c: any) => c.campaign))
                      return campaignOverview.map((c) => {
                        const visible = !hiddenCampaigns.has(c.campaign)
                        const temDadosNoPeriodo = noPeriodo.has(c.campaign)
                        return (
                          <label
                            key={c.campaign}
                            title={temDadosNoPeriodo ? undefined : 'Sem leads no período selecionado'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                              background: visible && temDadosNoPeriodo
                                ? (darkMode ? '#1e3a5f' : '#dbeafe')
                                : (darkMode ? '#1f2937' : '#f3f4f6'),
                              color: visible && temDadosNoPeriodo
                                ? (darkMode ? '#93c5fd' : '#1d4ed8')
                                : (darkMode ? '#6b7280' : '#9ca3af'),
                              fontSize: '13px', userSelect: 'none',
                              opacity: temDadosNoPeriodo ? 1 : 0.6,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={(e) => {
                                setHiddenCampaigns(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.delete(c.campaign)
                                  else next.add(c.campaign)
                                  return next
                                })
                              }}
                              style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                            />
                            {c.campaign}
                            {!temDadosNoPeriodo && (
                              <span style={{ fontSize: '11px', fontStyle: 'italic' }}>(sem leads no período)</span>
                            )}
                          </label>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="icon">🏷️</div>
                <div className="label">Total de Campanhas</div>
                <div className="value">{visibleCampaigns.length}</div>
              </div>
              <div className="summary-card">
                <div className="icon">👥</div>
                <div className="label">Leads (Top 1)</div>
                <div className="value">{visibleCampaigns[0]?.totalLeads || 0}</div>
                <div className="sub-label">campanha com mais leads</div>
              </div>
              <div className="summary-card">
                <div className="icon">🛒</div>
                <div className="label">Clientes com Vendas (Top 1)</div>
                <div className="value">{visibleCampaigns[0]?.clientesComVendas || 0}</div>
                <div className="sub-label">{isSafra ? 'da safra do período' : 'com venda no período'}</div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="icon">💵</div>
                <div className="label">{isSafra ? 'Faturamento da Safra' : 'Faturamento no Período'}</div>
                <div className="value" style={{ color: '#10b981' }}>
                  R$ {visibleCampaigns.reduce((acc, c) => acc + c.totalRevenue, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="sub-label">
                  {visibleCampaigns.reduce((acc, c) => acc + c.totalSales, 0)} vendas nas campanhas visíveis
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginTop: '16px' }}>
              <div>
                <h4>Leads por Campanha <span className="muted" style={{ fontSize: '13px', fontWeight: 400 }}>(por mês de chegada do lead)</span></h4>
                <ChartComponent
                  type="bar"
                  darkMode={darkMode}
                  data={{
                    labels: visibleCampaigns.map(c => c.campaign),
                    datasets: [{
                      label: 'Leads',
                      data: visibleCampaigns.map(c => c.totalLeads),
                      backgroundColor: '#3b82f6',
                      borderColor: '#1e40af',
                      borderWidth: 2
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>

              <div>
                <h4>
                  Clientes com Vendas por Campanha{' '}
                  <span className="muted" style={{ fontSize: '13px', fontWeight: 400 }}>
                    ({isSafra ? 'safra: lead chegou no período' : 'venda aconteceu no período'})
                  </span>
                </h4>
                <ChartComponent
                  type="bar"
                  darkMode={darkMode}
                  data={{
                    labels: visibleCampaigns.map(c => c.campaign),
                    datasets: [{
                      label: isSafra ? 'Clientes com Vendas (safra)' : 'Clientes com Vendas (no período)',
                      data: visibleCampaigns.map(c => c.clientesComVendas),
                      backgroundColor: '#10b981',
                      borderColor: '#059669',
                      borderWidth: 2
                    }]
                  }}
                  options={{ responsive: true, maintainAspectRatio: false }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <h4>
                Campanhas{' '}
                <span className="muted" style={{ fontSize: '13px', fontWeight: 400 }}>
                  — visão {isSafra ? '🌱 Safra (por chegada do lead)' : '💰 Vendas (por data da venda)'}
                </span>
              </h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Campanha</th>
                    <HeaderTooltip label="Leads" darkMode={darkMode}
                      tooltip="Leads que chegaram no período (igual nas duas visões)" />
                    <th>Leads Qualificados</th>
                    <th>Alta Renda</th>
                    <HeaderTooltip label={isSafra ? 'Vendas (safra)' : 'Vendas (no período)'} darkMode={darkMode}
                      tooltip={isSafra
                        ? 'Todas as vendas dos leads que chegaram no período, mesmo que a venda tenha ocorrido depois'
                        : 'Vendas que aconteceram no período, mesmo que o lead tenha chegado antes'} />
                    <th>Clientes com Vendas</th>
                    <HeaderTooltip label="Vendas / Leads" darkMode={darkMode}
                      tooltip="Vendas divididas por leads. Não é conversão de clientes: um mesmo cliente que compra 2 produtos conta 2 vendas." />
                  </tr>
                </thead>
                <tbody>
                  {visibleCampaigns.slice(0, 20).map((c, i) => (
                    <tr key={i}>
                      <td>{c.campaign}</td>
                      <td><span className="highlight">{c.totalLeads}</span></td>
                      <td>{c.qualifiedLeads}</td>
                      <td>{c.highIncomeLeads}</td>
                      <td>{c.totalSales}</td>
                      <td>{c.clientesComVendas}</td>
                      {/* Na visão Vendas uma campanha pode ter vendas no período sem nenhum lead
                          novo — a razão não existe, então mostramos '—' em vez de 0,0% */}
                      <td>{c.totalLeads > 0 ? `${c.conversionRate.toFixed(1)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )
        })()}

        {/* Performance Temporal por Campanha */}
        {selectedAnalysis === 'temporal-campaigns' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📈 Performance Temporal por Campanha</h3>
            <p className="muted">Evolução mensal de leads e vendas por campanha</p>

            {(() => {
              const totalsByCampaign: Record<string, number> = {}
              campaignOverview.forEach(c => { totalsByCampaign[c.campaign] = c.totalLeads })
              const top = Object.entries(totalsByCampaign).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name)
              const months = [...new Set(temporalCampaignLeads.map((x: any) => x.month))]
              return (
                <>
                  <h4>Leads por Mês (Top 5 campanhas)</h4>
                  <ChartComponent
                    type="line"
                    darkMode={darkMode}
                    data={{
                      labels: months,
                      datasets: top.map((campanha, idx) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
                        const points = months.map(m => {
                          const item = temporalCampaignLeads.find((x: any) => x.campaign === campanha && x.month === m)
                          return item ? item.totalLeads : 0
                        })
                        return { label: campanha, data: points, borderColor: colors[idx % colors.length], backgroundColor: colors[idx % colors.length] + '33' }
                      })
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />

                  <h4 style={{ marginTop: '24px' }}>Vendas por Mês (Top 5 campanhas)</h4>
                  <ChartComponent
                    type="line"
                    darkMode={darkMode}
                    data={{
                      labels: [...new Set(temporalCampaignSales.map((x: any) => x.month))],
                      datasets: top.map((campanha, idx) => {
                        const colors = ['#06b6d4', '#f97316', '#84cc16', '#a855f7', '#eab308']
                        const months2 = [...new Set(temporalCampaignSales.map((x: any) => x.month))]
                        const points = months2.map(m => {
                          const item = temporalCampaignSales.find((x: any) => x.campaign === campanha && x.month === m)
                          return item ? item.salesCount : 0
                        })
                        return { label: campanha, data: points, borderColor: colors[idx % colors.length], backgroundColor: colors[idx % colors.length] + '33' }
                      })
                    }}
                    options={{ responsive: true, maintainAspectRatio: false }}
                  />
                </>
              )
            })()}
          </div>
        )}

        {/* Performance Temporal - Geral */}
        {selectedAnalysis === 'temporal-overview' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🔥 Performance Temporal da Campanha - Visão Geral</h3>
            <p className="muted">Evolução mensal de leads, leads qualificados e vendas</p>

            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: getTemporalOverviewData.map(item => item.month),
                datasets: [
                  {
                    label: 'Total de Leads',
                    data: getTemporalOverviewData.map(item => item.totalLeads),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e40af',
                    borderWidth: 2
                  },
                  {
                    label: 'Leads Qualificados',
                    data: getTemporalOverviewData.map(item => item.qualifiedLeads),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 2
                  },
                  {
                    label: 'Leads Alta Renda',
                    data: getTemporalOverviewData.map(item => item.highIncomeLeads),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 2
                  },
                  {
                    label: 'Vendas',
                    data: getTemporalOverviewData.map(item => item.sales),
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 2
                  },
                  {
                    label: 'Tendência Leads',
                    data: calculateTrendline(getTemporalOverviewData.map(item => item.totalLeads)),
                    type: 'line',
                    borderColor: '#1e40af',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                  },
                  {
                    label: 'Tendência Vendas',
                    data: calculateTrendline(getTemporalOverviewData.map(item => item.sales)),
                    type: 'line',
                    borderColor: '#d97706',
                    backgroundColor: 'transparent',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                  }
                ]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Evolução Mensal da Performance',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Mês',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Quantidade',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  }
                }
              }}
            />
          </div>
        )}

        {/* Performance Temporal - por Conjunto */}
        {selectedAnalysis === 'temporal-adsets' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📊 Performance Temporal por Conjunto de Anúncios</h3>
            <p className="muted">Performance mensal de cada conjunto de anúncios</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <label className="muted">Campanha:</label>
              <select value={campaignFilterLeads} onChange={e => setCampaignFilterLeads(e.target.value)} className="input">
                {campaignOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>

            <ChartComponent
              type="line"
              darkMode={darkMode}
              data={{
                labels: [...new Set(getTemporalAdsetData.map((item: any) => item.month))],
                datasets: [...new Set(getTemporalAdsetData.map((item: any) => item.adset))].slice(0, 6).map((adset: string, i: number) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                  const adsetData = getTemporalAdsetData.filter((item: any) => item.adset === adset);
                  const months = [...new Set(getTemporalAdsetData.map((item: any) => item.month))];
                  const data = months.map((month: string) => {
                    const found = adsetData.find((item: any) => item.month === month) as any;
                    return found ? found.leads : 0;
                  });
                  return {
                    label: adset.length > 30 ? adset.substring(0, 30) + '...' : adset,
                    data: data,
                    borderColor: colors[i % colors.length],
                    backgroundColor: colors[i % colors.length] + '20',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.1
                  };
                })
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Evolução de Leads por Conjunto (Top 6)',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Mês',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Número de Leads',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  }
                }
              }}
            />

            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Conjunto</th>
                  <th>Leads</th>
                  <th>Vendas</th>
                  <th>Taxa Conversão</th>
                </tr>
              </thead>
              <tbody>
                {getTemporalAdsetData.slice(0, 50).map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{item.month}</td>
                    <td className="text-xs">{item.adset}</td>
                    <td><span className="highlight">{item.leads}</span></td>
                    <td><span className="highlight">{item.sales}</span></td>
                    <td>
                      <span className={item.leads > 0 && (item.sales / item.leads * 100) >= 5 ? 'text-green' : 'text-red'}>
                        {item.leads > 0 ? `${(item.sales / item.leads * 100).toFixed(1)}%` : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance Temporal - Vendas */}
        {selectedAnalysis === 'temporal-sales' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>💰 Performance Temporal de Vendas</h3>
            <p className="muted">Evolução da receita e ticket médio ao longo do tempo</p>

            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: getTemporalSalesData.map(item => item.month),
                datasets: [
                  {
                    label: 'Planejamento (R$)',
                    data: getTemporalSalesData.map(item => (item as any).revenuePlanejamento || 0),
                    backgroundColor: '#3b82f6',
                    borderColor: '#2563eb',
                    borderWidth: 1,
                    stack: 'revenue',
                    yAxisID: 'y'
                  },
                  {
                    label: 'Seguros (R$)',
                    data: getTemporalSalesData.map(item => (item as any).revenueSeguros || 0),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 1,
                    stack: 'revenue',
                    yAxisID: 'y'
                  },
                  {
                    label: 'Crédito (R$)',
                    data: getTemporalSalesData.map(item => (item as any).revenueCredito || 0),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 1,
                    stack: 'revenue',
                    yAxisID: 'y'
                  },
                  {
                    label: 'Outros (R$)',
                    data: getTemporalSalesData.map(item => (item as any).revenueOutros || 0),
                    backgroundColor: '#64748b',
                    borderColor: '#475569',
                    borderWidth: 1,
                    stack: 'revenue',
                    yAxisID: 'y'
                  },
                  {
                    type: 'line',
                    label: 'Ticket Médio (R$)',
                    data: getTemporalSalesData.map(item => item.avgTicket),
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 3,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Evolução da Receita por Produto e Ticket Médio',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: {
                        size: 11
                      },
                      usePointStyle: true,
                      boxWidth: 8
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                      label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        if (context.parsed.y !== null) {
                          label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                        }
                        return label;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    stacked: true,
                    title: {
                      display: true,
                      text: 'Mês',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  },
                  y: {
                    stacked: true,
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Receita Total (R$)',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Ticket Médio (R$)',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      drawOnChartArea: false,
                    },
                  }
                }
              }}
            />

            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Vendas</th>
                  <th>Receita Total</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {getTemporalSalesData.map((item, i) => (
                  <tr key={i}>
                    <td>{item.month}</td>
                    <td><span className="highlight">{item.salesCount}</span></td>
                    <td><span className="highlight">R$ {item.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                    <td><span className="highlight">R$ {item.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comparação Mensal - Leads */}
        {(selectedAnalysis === 'temporal-leads-comparison' || selectedAnalysis === 'temporal-qualified-leads' || selectedAnalysis === 'temporal-high-income-leads' || selectedAnalysis === 'temporal-sales-comparison') && (() => {
          const isFilterable = selectedAnalysis === 'temporal-leads-comparison' || selectedAnalysis === 'temporal-high-income-leads'
          const activeData = isFilterable ? getTemporalLeadsFilteredData : getTemporalOverviewData
          return (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>
              {selectedAnalysis === 'temporal-leads-comparison' && '📈 Comparação Mensal - Entrada de Leads'}
              {selectedAnalysis === 'temporal-qualified-leads' && '⭐ Comparação Mensal - Leads Qualificados'}
              {selectedAnalysis === 'temporal-high-income-leads' && '💎 Comparação Mensal - Leads Alta Renda'}
              {selectedAnalysis === 'temporal-sales-comparison' && '🔥 Comparação Mensal - Vendas Efetivadas'}
            </h3>
            <p className="muted">
              {selectedAnalysis === 'temporal-leads-comparison' && 'Comparação da entrada de leads por mês'}
              {selectedAnalysis === 'temporal-qualified-leads' && 'Evolução dos leads qualificados (R$ 6k+) por mês'}
              {selectedAnalysis === 'temporal-high-income-leads' && 'Evolução dos leads de alta renda (R$ 10k+) por mês'}
              {selectedAnalysis === 'temporal-sales-comparison' && 'Comparação das vendas efetivadas por mês'}
            </p>

            {/* Filtros — apenas para Entrada de Leads e Alta Renda */}
            {isFilterable && (
              <div style={{ marginBottom: '20px' }}>
                {/* Filtro Temporal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: darkMode ? '#9ca3af' : '#6b7280' }}>📅 Período:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>De</label>
                    <select
                      value={leadsMonthlyDateFrom}
                      onChange={e => setLeadsMonthlyDateFrom(e.target.value)}
                      style={{
                        padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                        background: darkMode ? '#1f2937' : '#fff',
                        color: darkMode ? '#d1d5db' : '#374151',
                      }}
                    >
                      <option value="">Início</option>
                      {getAvailableMonths.slice().reverse().map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>Até</label>
                    <select
                      value={leadsMonthlyDateTo}
                      onChange={e => setLeadsMonthlyDateTo(e.target.value)}
                      style={{
                        padding: '5px 8px', borderRadius: '5px', fontSize: '13px', cursor: 'pointer',
                        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                        background: darkMode ? '#1f2937' : '#fff',
                        color: darkMode ? '#d1d5db' : '#374151',
                      }}
                    >
                      <option value="">Hoje</option>
                      {getAvailableMonths.map(m => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  {(leadsMonthlyDateFrom || leadsMonthlyDateTo) && (
                    <button
                      onClick={() => { setLeadsMonthlyDateFrom(''); setLeadsMonthlyDateTo('') }}
                      style={{
                        padding: '5px 10px', fontSize: '12px', borderRadius: '5px', cursor: 'pointer',
                        border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                        background: darkMode ? '#1f2937' : '#fff',
                        color: darkMode ? '#f87171' : '#dc2626',
                      }}
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>

                {/* Filtro de Campanhas */}
                <button
                  onClick={() => setLeadsMonthlyFilterOpen(o => !o)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '7px 12px', borderRadius: '6px', cursor: 'pointer',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    background: darkMode ? '#1f2937' : '#f9fafb',
                    color: darkMode ? '#d1d5db' : '#374151', fontSize: '14px',
                  }}
                >
                  <span>🔍 Filtrar Campanhas</span>
                  <span style={{ fontSize: '12px', color: darkMode ? '#9ca3af' : '#6b7280' }}>
                    ({campaignOverview.length - leadsMonthlyHiddenCampaigns.size} de {campaignOverview.length} visíveis)
                  </span>
                  <span style={{ fontSize: '11px' }}>{leadsMonthlyFilterOpen ? '▲' : '▼'}</span>
                </button>

                {leadsMonthlyFilterOpen && (
                  <div style={{
                    marginTop: '8px', padding: '14px', borderRadius: '8px',
                    border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                    background: darkMode ? '#111827' : '#f9fafb',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <button
                        onClick={() => setLeadsMonthlyHiddenCampaigns(new Set())}
                        style={{
                          padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                          border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                          background: darkMode ? '#1f2937' : '#fff',
                          color: darkMode ? '#d1d5db' : '#374151',
                        }}
                      >
                        Mostrar Todas
                      </button>
                      <button
                        onClick={() => setLeadsMonthlyHiddenCampaigns(new Set(campaignOverview.map(c => c.campaign)))}
                        style={{
                          padding: '4px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                          border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
                          background: darkMode ? '#1f2937' : '#fff',
                          color: darkMode ? '#d1d5db' : '#374151',
                        }}
                      >
                        Ocultar Todas
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {campaignOverview.map((c) => {
                        const visible = !leadsMonthlyHiddenCampaigns.has(c.campaign)
                        return (
                          <label
                            key={c.campaign}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '4px 10px', borderRadius: '20px', cursor: 'pointer',
                              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
                              background: visible
                                ? (darkMode ? '#1e3a5f' : '#dbeafe')
                                : (darkMode ? '#1f2937' : '#f3f4f6'),
                              color: visible
                                ? (darkMode ? '#93c5fd' : '#1d4ed8')
                                : (darkMode ? '#6b7280' : '#9ca3af'),
                              fontSize: '13px', userSelect: 'none',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={(e) => {
                                setLeadsMonthlyHiddenCampaigns(prev => {
                                  const next = new Set(prev)
                                  if (e.target.checked) next.delete(c.campaign)
                                  else next.add(c.campaign)
                                  return next
                                })
                              }}
                              style={{ accentColor: '#3b82f6', cursor: 'pointer' }}
                            />
                            {c.campaign}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: activeData.map(item => item.month),
                datasets: [{
                  label: selectedAnalysis === 'temporal-leads-comparison' ? 'Total de Leads' :
                    selectedAnalysis === 'temporal-qualified-leads' ? 'Leads Qualificados' :
                      selectedAnalysis === 'temporal-high-income-leads' ? 'Leads Alta Renda' :
                        'Vendas',
                  data: activeData.map(item =>
                    selectedAnalysis === 'temporal-leads-comparison' ? item.totalLeads :
                      selectedAnalysis === 'temporal-qualified-leads' ? item.qualifiedLeads :
                        selectedAnalysis === 'temporal-high-income-leads' ? item.highIncomeLeads :
                          item.sales
                  ),
                  backgroundColor: selectedAnalysis === 'temporal-leads-comparison' ? '#3b82f6' :
                    selectedAnalysis === 'temporal-qualified-leads' ? '#10b981' :
                      selectedAnalysis === 'temporal-high-income-leads' ? '#8b5cf6' :
                        '#f59e0b',
                  borderColor: selectedAnalysis === 'temporal-leads-comparison' ? '#1e40af' :
                    selectedAnalysis === 'temporal-qualified-leads' ? '#059669' :
                      selectedAnalysis === 'temporal-high-income-leads' ? '#7c3aed' :
                        '#d97706',
                  borderWidth: 2
                },
                {
                  label: 'Tendência',
                  data: calculateTrendline(activeData.map(item =>
                    selectedAnalysis === 'temporal-leads-comparison' ? item.totalLeads :
                      selectedAnalysis === 'temporal-qualified-leads' ? item.qualifiedLeads :
                        selectedAnalysis === 'temporal-high-income-leads' ? item.highIncomeLeads :
                          item.sales
                  )),
                  type: 'line',
                  borderColor: selectedAnalysis === 'temporal-leads-comparison' ? '#1e40af' :
                    selectedAnalysis === 'temporal-qualified-leads' ? '#059669' :
                      selectedAnalysis === 'temporal-high-income-leads' ? '#7c3aed' :
                        '#d97706',
                  backgroundColor: 'transparent',
                  borderWidth: 3,
                  borderDash: [5, 5],
                  pointRadius: 0,
                  fill: false
                }]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: selectedAnalysis === 'temporal-leads-comparison' ? 'Entrada de Leads por Mês' :
                      selectedAnalysis === 'temporal-qualified-leads' ? 'Leads Qualificados por Mês' :
                        selectedAnalysis === 'temporal-high-income-leads' ? 'Leads Alta Renda por Mês' :
                          'Vendas por Mês',
                    color: darkMode ? '#e2e8f0' : '#374151',
                    font: {
                      size: 14,
                      weight: 'bold'
                    }
                  },
                  legend: {
                    labels: {
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Mês',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Quantidade',
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    ticks: {
                      color: darkMode ? '#e2e8f0' : '#374151'
                    },
                    grid: {
                      color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                    }
                  }
                }
              }}
            />

            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  {selectedAnalysis === 'temporal-leads-comparison' && (
                    <>
                      <th>Total Leads</th>
                      <th>% do Total Geral</th>
                    </>
                  )}
                  {selectedAnalysis === 'temporal-qualified-leads' && (
                    <>
                      <th>Leads Qualificados</th>
                      <th>% do Mês</th>
                      <th>Total Leads no Mês</th>
                    </>
                  )}
                  {selectedAnalysis === 'temporal-high-income-leads' && (
                    <>
                      <th>Leads Alta Renda</th>
                      <th>% do Mês</th>
                      <th>Total Leads no Mês</th>
                    </>
                  )}
                  {selectedAnalysis === 'temporal-sales-comparison' && (
                    <>
                      <th>Vendas</th>
                      <th>Taxa Conversão</th>
                      <th>Total Leads no Mês</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeData.map((monthData, i) => (
                  <tr key={i}>
                    <td>{monthData.month}</td>
                    {selectedAnalysis === 'temporal-leads-comparison' && (
                      <>
                        <td><span className="highlight">{monthData.totalLeads}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            (monthData.totalLeads / activeData.reduce((sum, m) => sum + m.totalLeads, 0)) * 100,
                            { good: 20, medium: 10 }
                          )}>
                            {((monthData.totalLeads / activeData.reduce((sum, m) => sum + m.totalLeads, 0)) * 100).toFixed(1)}%
                          </span>
                        </td>
                      </>
                    )}
                    {selectedAnalysis === 'temporal-qualified-leads' && (
                      <>
                        <td><span className="highlight">{monthData.qualifiedLeads}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            monthData.totalLeads > 0 ? (monthData.qualifiedLeads / monthData.totalLeads) * 100 : 0,
                            { good: 40, medium: 25 }
                          )}>
                            {monthData.totalLeads > 0 ? ((monthData.qualifiedLeads / monthData.totalLeads) * 100).toFixed(1) : 0}%
                          </span>
                        </td>
                        <td><span className="highlight">{monthData.totalLeads}</span></td>
                      </>
                    )}
                    {selectedAnalysis === 'temporal-high-income-leads' && (
                      <>
                        <td><span className="highlight">{monthData.highIncomeLeads}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            monthData.totalLeads > 0 ? (monthData.highIncomeLeads / monthData.totalLeads) * 100 : 0,
                            { good: 20, medium: 10 }
                          )}>
                            {monthData.totalLeads > 0 ? ((monthData.highIncomeLeads / monthData.totalLeads) * 100).toFixed(1) : 0}%
                          </span>
                        </td>
                        <td><span className="highlight">{monthData.totalLeads}</span></td>
                      </>
                    )}
                    {selectedAnalysis === 'temporal-sales-comparison' && (
                      <>
                        <td><span className="highlight">{monthData.sales}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            monthData.totalLeads > 0 ? (monthData.sales / monthData.totalLeads) * 100 : 0,
                            { good: 5, medium: 2 }
                          )}>
                            {monthData.totalLeads > 0 ? ((monthData.sales / monthData.totalLeads) * 100).toFixed(1) : 0}%
                          </span>
                        </td>
                        <td><span className="highlight">{monthData.totalLeads}</span></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Tabela de Leads por Faixa de Renda - apenas para temporal-leads-comparison */}
            {selectedAnalysis === 'temporal-leads-comparison' && (
              <>
                <h4 style={{ marginTop: '32px', marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>
                  💰 Distribuição de Leads por Faixa de Renda
                </h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      {getLeadsByMonthAndIncome.incomeRanges.map((income, idx) => (
                        <th key={idx}>{income}</th>
                      ))}
                      <th>Não informado</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeData.map((monthData, i) => {
                      const monthKey = monthData.monthKey
                      const incomeData = getLeadsByMonthAndIncome.monthlyIncome[monthKey] || {}
                      const total = Object.values(incomeData).reduce((sum: number, val: any) => sum + val, 0) as number

                      return (
                        <tr key={i}>
                          <td>{monthData.month}</td>
                          {getLeadsByMonthAndIncome.incomeRanges.map((incomeName, idx) => (
                            <td key={idx}>
                              <span className="highlight">{incomeData[incomeName] || 0}</span>
                            </td>
                          ))}
                          <td><span className="highlight">{incomeData['Não informado'] || 0}</span></td>
                          <td><span className="highlight">{total}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}
          </div>
          )
        })()}


        {/* Análise Aprofundada (Cohort) */}
        {selectedAnalysis === 'cohort-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🔍 Análise Aprofundada por Safra (Cohort) 2.0</h3>
            <p className="muted">Performance de vendas atribuída ao mês de entrada do lead (Data de Criação)</p>

            {/* KPIs de Safra */}
            <div className="summary-cards" style={{ marginTop: '24px', marginBottom: '32px' }}>
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">⚡</div>
                <div className="label">Ciclo Médio Geral</div>
                <div className="value">
                  {(() => {
                    const validCohorts = getCohortAnalysisData.filter(c => c.conversionCount > 0)
                    const totalDays = validCohorts.reduce((acc, c) => acc + c.conversionDaysSum, 0)
                    const totalCount = validCohorts.reduce((acc, c) => acc + c.conversionCount, 0)
                    return totalCount > 0 ? (totalDays / totalCount).toFixed(0) : 0
                  })()} dias
                </div>
                <div className="sub-label">tempo de decisão</div>
              </div>

              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">💎</div>
                <div className="label">Qualidade Média</div>
                <div className="value">
                  {(() => {
                    const totalLeads = getCohortAnalysisData.reduce((acc, c) => acc + c.leads, 0)
                    const totalQual = getCohortAnalysisData.reduce((acc, c) => acc + c.qualifiedLeads, 0)
                    return totalLeads > 0 ? ((totalQual / totalLeads) * 100).toFixed(1) : 0
                  })()}%
                </div>
                <div className="sub-label">leads perfil alto</div>
              </div>

              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">🧲</div>
                <div className="label">Power Rate Global</div>
                <div className="value">
                  {(() => {
                    const totalSales = getCohortAnalysisData.reduce((acc, c) => acc + c.salesPlanejamento, 0)
                    const totalCross = getCohortAnalysisData.reduce((acc, c) => acc + c.crossSellCount, 0)
                    return totalSales > 0 ? ((totalCross / totalSales) * 100).toFixed(1) : 0
                  })()}%
                </div>
                <div className="sub-label">taxa cross-sell</div>
              </div>

              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">💰</div>
                <div className="label">Ticket Médio Global</div>
                <div className="value">
                  R$ {(() => {
                    const totalClientes = getCohortAnalysisData.reduce((acc, c) => acc + c.clientesComVendas, 0)
                    const totalRev = getCohortAnalysisData.reduce((acc, c) => acc + c.totalRevenue, 0)
                    return totalClientes > 0 ? (totalRev / totalClientes).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : 0
                  })()}
                </div>
                <div className="sub-label">receita total / clientes com venda</div>
              </div>
            </div>

            {/* Cards de Verba e ROI */}
            <div className="summary-cards" style={{ marginBottom: '32px' }}>
              {(() => {
                const totalBudget = manualInputs.verbaGasta
                const totalRevenue = manualInputs.faturamentoTotal
                const recPlan = manualInputs.faturamentoPlanejamento || 0
                const recSeg = manualInputs.faturamentoSeguros || 0
                const recCred = manualInputs.faturamentoCredito || 0
                const recOutros = (manualInputs as any).faturamentoOutros || 0
                const margemBrutaSeguros = recSeg * 0.6 * 0.81
                const margemBrutaCredito = recCred * 0.04 * 0.81
                const margemBrutaPlanOutros = (recPlan + recOutros) * 0.81 * 0.975
                const margemBrutaTotal = margemBrutaSeguros + margemBrutaCredito + margemBrutaPlanOutros
                const mcBrutaPerReal = totalBudget > 0 ? margemBrutaTotal / totalBudget : 0
                return (
                  <>
                    <div className="summary-card animate-fade-in-up" style={{ borderLeft: totalBudget > 0 ? '4px solid #3b82f6' : '4px solid #ef4444' }}>
                      <div className="icon">📢</div>
                      <div className="label">Verba Total Investida</div>
                      <div className="value">R$ {totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="summary-card animate-fade-in-up" style={{ borderLeft: mcBrutaPerReal >= 1 ? '4px solid #10b981' : '4px solid #f59e0b' }}>
                      <div className="icon">📊</div>
                      <div className="label">MC Bruta/R$ Investido</div>
                      <div className="value" style={{ color: mcBrutaPerReal >= 1 ? '#10b981' : '#f59e0b' }}>
                        {totalBudget > 0 ? `R$ ${mcBrutaPerReal.toFixed(2)}` : 'N/A'}
                      </div>
                      <div className="sub-label">{mcBrutaPerReal >= 1 ? 'margem positiva' : 'em maturação'}</div>
                    </div>
                    <div className="summary-card animate-fade-in-up">
                      <div className="icon">💵</div>
                      <div className="label">Faturamento Total</div>
                      <div className="value">R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="summary-card animate-fade-in-up" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="icon">📊</div>
                      <div className="label">Margem de Contribuição Bruta</div>
                      <div className="value" style={{ color: '#f59e0b' }}>R$ {margemBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-label">MC Bruta/R$ Invest: R$ {mcBrutaPerReal.toFixed(2)}</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Gráfico: Margem de Contribuição Bruta por Safra vs Verba Investida */}
            <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>📊 Margem de Contribuição Bruta por Safra vs Verba Investida</h4>
            <p className="muted" style={{ marginBottom: '16px', fontSize: '13px' }}>
              Análise conservadora: Margem após impostos e taxas, antes da comissão dos planejadores.
            </p>
            <div style={{ marginBottom: '32px' }}>
              <ChartComponent
                type="bar"
                height={350}
                darkMode={darkMode}
                data={{
                  labels: getCohortAnalysisData.map(c => c.month),
                  datasets: [
                    {
                      label: 'MC Bruta Planejamento/Outros',
                      data: getCohortAnalysisData.map(c => (c.revenuePlanejamento + c.revenueOutros) * 0.81 * 0.975),
                      backgroundColor: '#3b82f6',
                      stack: 'margin',
                      order: 2,
                      yAxisID: 'y'
                    },
                    {
                      label: 'MC Bruta Seguros',
                      data: getCohortAnalysisData.map(c => c.revenueSeguros * 0.6 * 0.81),
                      backgroundColor: '#f59e0b',
                      stack: 'margin',
                      order: 2,
                      yAxisID: 'y'
                    },
                    {
                      label: 'MC Bruta Crédito',
                      data: getCohortAnalysisData.map(c => c.revenueCredito * 0.04 * 0.81),
                      backgroundColor: '#8b5cf6',
                      stack: 'margin',
                      order: 2,
                      yAxisID: 'y'
                    },
                    {
                      label: 'Verba Investida',
                      data: getCohortAnalysisData.map(c => {
                        // c.month is in format "YYYY-MM" matching monthlyBudgets
                        const budget = monthlyBudgets.find(b => b.month === c.month)
                        return budget ? budget.amount : 0
                      }),
                      type: 'line',
                      borderColor: '#ef4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.3,
                      order: 1,
                      yAxisID: 'y1'
                    }
                  ]
                }}
                options={{
                  plugins: {
                    title: {
                      display: true,
                      text: 'Comparativo: Margem de Contribuição Bruta por Safra vs Investimento em Anúncios',
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                      position: 'top',
                      labels: { color: darkMode ? '#e2e8f0' : '#374151' }
                    },
                    tooltip: {
                      callbacks: {
                        label: (ctx: any) => `${ctx.dataset.label}: R$ ${Number(ctx.parsed.y ?? ctx.raw ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    }
                  },
                  scales: {
                    x: {
                      title: { display: true, text: 'Mês da Safra (Criação do Lead)', color: darkMode ? '#e2e8f0' : '#374151' },
                      ticks: { color: darkMode ? '#e2e8f0' : '#374151' },
                      grid: { color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)' }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: { display: true, text: 'MC Bruta (R$)', color: '#f59e0b' },
                      ticks: {
                        color: '#f59e0b',
                        callback: (value: any) => 'R$ ' + value.toLocaleString('pt-BR')
                      },
                      grid: { color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)' }
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: { display: true, text: 'Verba Investida (R$)', color: '#ef4444' },
                      ticks: {
                        color: '#ef4444',
                        callback: (value: any) => 'R$ ' + value.toLocaleString('pt-BR')
                      },
                      grid: { drawOnChartArea: false }
                    }
                  }
                }}
              />
            </div>

            <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>🏅 Recordes da Safra</h4>
            <div className="summary-cards" style={{ marginBottom: '32px' }}>
              {(() => {
                const bestRevenue = [...getCohortAnalysisData].sort((a, b) => b.totalRevenue - a.totalRevenue)[0] || { month: '-', totalRevenue: 0 }
                const bestVolume = [...getCohortAnalysisData].sort((a, b) => b.salesPlanejamento - a.salesPlanejamento)[0] || { month: '-', salesPlanejamento: 0 }
                const bestCross = [...getCohortAnalysisData].sort((a, b) => b.crossSellCount - a.crossSellCount)[0] || { month: '-', crossSellCount: 0 }

                return (
                  <>
                    <div className="summary-card animate-fade-in-up animate-delay-100" style={{ borderLeft: '4px solid #10b981' }}>
                      <div className="label">Maior Faturamento</div>
                      <div className="value" style={{ color: '#10b981' }}>{bestRevenue.month}</div>
                      <div className="sub-label">
                        R$ {bestRevenue.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-200" style={{ borderLeft: '4px solid #3b82f6' }}>
                      <div className="label">Maior Volume Vendas</div>
                      <div className="value" style={{ color: '#3b82f6' }}>{bestVolume.month}</div>
                      <div className="sub-label">
                        {bestVolume.salesPlanejamento} vendas
                      </div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-300" style={{ borderLeft: '4px solid #8b5cf6' }}>
                      <div className="label">Recorde Cross-Sell</div>
                      <div className="value" style={{ color: '#8b5cf6' }}>{bestCross.month}</div>
                      <div className="sub-label">
                        {bestCross.crossSellCount} produtos extras
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Gráficos de Tendência */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>🏎️ Velocidade vs Volume</h4>
                <ChartComponent
                  type="bar" // Mixed chart hard to do with simple props, using Bar with logic if component supports, assuming simple usage
                  darkMode={darkMode}
                  data={{
                    labels: getCohortAnalysisData.map(d => d.month),
                    datasets: [
                      {
                        type: 'bar' as const,
                        label: 'Novos Clientes',
                        data: getCohortAnalysisData.map(d => d.salesPlanejamento),
                        backgroundColor: '#3b82f6',
                        yAxisID: 'y',
                      },
                      {
                        type: 'line' as const,
                        label: 'Ciclo (Dias)',
                        data: getCohortAnalysisData.map(d => d.avgConversionDays),
                        borderColor: '#fbbf24',
                        borderWidth: 3,
                        yAxisID: 'y1',
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: { type: 'linear', display: true, position: 'left' },
                      y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false } },
                    }
                  }}
                />
              </div>
              <div>
                <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>🎯 Qualidade vs Conversão</h4>
                <ChartComponent
                  type="line"
                  darkMode={darkMode}
                  data={{
                    labels: getCohortAnalysisData.map(d => d.month),
                    datasets: [
                      {
                        label: 'Qualidade (Leads)',
                        data: getCohortAnalysisData.map(d => d.qualifiedRate),
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                        tension: 0.3,
                        yAxisID: 'y'
                      },
                      {
                        label: 'Conversão (Vendas)',
                        data: getCohortAnalysisData.map(d => d.leads > 0 ? (d.salesPlanejamento / d.leads) * 100 : 0),
                        borderColor: '#10b981',
                        backgroundColor: '#10b981',
                        tension: 0.3,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Qualidade (%)', color: '#8b5cf6' },
                        ticks: { color: '#8b5cf6' }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: { display: true, text: 'Conversão (%)', color: '#10b981' },
                        ticks: { color: '#10b981' },
                        grid: { drawOnChartArea: false }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {(() => {
              // Função para calcular MC Bruta de uma linha
              const calcMCBruta = (row: any) => {
                return (row.revenuePlanejamento + row.revenueOutros) * 0.81 * 0.975 +
                  row.revenueSeguros * 0.6 * 0.81 +
                  row.revenueCredito * 0.04 * 0.81
              }

              // Dados ordenados
              const sortedData = (() => {
                const data = [...getCohortAnalysisData]
                if (cohortSortConfig !== null) {
                  data.sort((a, b) => {
                    let aVal: number, bVal: number
                    switch (cohortSortConfig.key) {
                      case 'month': return cohortSortConfig.direction === 'asc' ? a.month.localeCompare(b.month) : b.month.localeCompare(a.month)
                      case 'leads': aVal = a.leads; bVal = b.leads; break
                      case 'qualifiedRate': aVal = a.qualifiedRate; bVal = b.qualifiedRate; break
                      case 'salesPlanejamento': aVal = a.salesPlanejamento; bVal = b.salesPlanejamento; break
                      case 'avgConversionDays': aVal = a.avgConversionDays; bVal = b.avgConversionDays; break
                      case 'convRate': aVal = a.leads > 0 ? a.salesPlanejamento / a.leads : 0; bVal = b.leads > 0 ? b.salesPlanejamento / b.leads : 0; break
                      case 'crossSellRate': aVal = a.crossSellRate; bVal = b.crossSellRate; break
                      case 'prodAdic': aVal = a.salesSeguros + a.salesCredito + a.salesOutros; bVal = b.salesSeguros + b.salesCredito + b.salesOutros; break
                      case 'totalRevenue': aVal = a.totalRevenue; bVal = b.totalRevenue; break
                      case 'mcBruta': aVal = calcMCBruta(a); bVal = calcMCBruta(b); break
                      case 'ticketMedio': aVal = a.salesPlanejamento > 0 ? a.totalRevenue / a.salesPlanejamento : 0; bVal = b.salesPlanejamento > 0 ? b.totalRevenue / b.salesPlanejamento : 0; break
                      default: return 0
                    }
                    return cohortSortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
                  })
                }
                return data
              })()

              const requestSort = (key: string) => {
                setCohortSortConfig(current => {
                  if (current?.key === key) {
                    return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
                  }
                  return { key, direction: 'desc' }
                })
              }

              const getSortIndicator = (key: string) => {
                if (cohortSortConfig?.key !== key) return ' ↕'
                return cohortSortConfig.direction === 'asc' ? ' ↑' : ' ↓'
              }

              const headerStyle = { cursor: 'pointer', userSelect: 'none' as const, whiteSpace: 'nowrap' as const }

              return (
                <div style={{ overflowX: 'auto', marginTop: '24px' }}>
                  <table className="table" style={{ minWidth: '1100px' }}>
                    <thead>
                      <tr>
                        <th style={headerStyle} onClick={() => requestSort('month')} title="Clique para ordenar">
                          Mês (Safra){getSortIndicator('month')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('leads')} title="Clique para ordenar">
                          Leads{getSortIndicator('leads')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('qualifiedRate')} title="Clique para ordenar">
                          Qualidade{getSortIndicator('qualifiedRate')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('salesPlanejamento')} title="Clique para ordenar">
                          Novos Clientes{getSortIndicator('salesPlanejamento')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('avgConversionDays')} title="Clique para ordenar">
                          Ciclo (Dias){getSortIndicator('avgConversionDays')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('convRate')} title="Clique para ordenar">
                          Conv. (Novos){getSortIndicator('convRate')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('crossSellRate')} title="Clique para ordenar">
                          Power (Cross%){getSortIndicator('crossSellRate')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('prodAdic')} title="Clique para ordenar">
                          Prod. Adic.{getSortIndicator('prodAdic')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('totalRevenue')} title="Clique para ordenar">
                          Faturamento{getSortIndicator('totalRevenue')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('mcBruta')} title="Clique para ordenar">
                          MC Bruta{getSortIndicator('mcBruta')}
                        </th>
                        <th style={headerStyle} onClick={() => requestSort('ticketMedio')} title="Clique para ordenar">
                          Ticket Médio{getSortIndicator('ticketMedio')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedData.map((row, i) => {
                        const mcBruta = calcMCBruta(row)
                        return (
                          <tr key={i}>
                            <td><strong>{row.month}</strong></td>
                            <td><span className="highlight">{row.leads}</span></td>
                            <td>
                              <span className={getPerformanceColorClass(row.qualifiedRate, { good: 30, medium: 15 })}>
                                {row.qualifiedRate.toFixed(1)}%
                              </span>
                            </td>
                            <td>
                              <span className="highlight">{row.salesPlanejamento}</span>
                            </td>
                            <td>
                              <span className={row.avgConversionDays <= 15 ? 'text-green' : row.avgConversionDays <= 30 ? 'text-orange' : 'text-red'}>
                                {row.avgConversionDays.toFixed(0)}d
                              </span>
                            </td>
                            <td>
                              <span className={getPerformanceColorClass(
                                row.leads > 0 ? (row.salesPlanejamento / row.leads) * 100 : 0,
                                { good: 5, medium: 2 }
                              )}>
                                {row.leads > 0 ? ((row.salesPlanejamento / row.leads) * 100).toFixed(1) : 0}%
                              </span>
                            </td>
                            <td>
                              <span className={getPerformanceColorClass(row.crossSellRate, { good: 20, medium: 10 })}>
                                {row.crossSellRate.toFixed(1)}%
                              </span>
                            </td>
                            <td title={`Seguros: ${row.salesSeguros} | Crédito: ${row.salesCredito} | Outros: ${row.salesOutros}`}>
                              {row.salesSeguros + row.salesCredito + row.salesOutros}
                            </td>
                            <td title={`Planejamento: ${row.revenuePlanejamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Seguros: ${row.revenueSeguros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Crédito: ${row.revenueCredito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
Outros: ${row.revenueOutros.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}>
                              R$ {row.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td style={{ color: '#f59e0b', fontWeight: '600' }} title="Margem após impostos e taxas, antes da comissão">
                              R$ {mcBruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td>R$ {row.clientesComVendas > 0 ? (row.totalRevenue / row.clientesComVendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            <div style={{ marginTop: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '14px', color: darkMode ? '#bfdbfe' : '#1e40af' }}>
                ℹ️ <strong>Nota:</strong> Esta tabela atribui todas as vendas e faturamento ao mês em que o lead foi criado (safra), independente de quando a venda foi efetivada. Isso permite medir a qualidade dos leads e o retorno de longo prazo de cada mês.
              </p>
            </div>
          </div>
        )
        }

        {/* Análise de Tempo de Conversão */}
        {selectedAnalysis === 'capture-time-sales' && salesFromCSV > 0 && (() => {
          const d = getCaptureTimeSalesData
          const fmtPct = (v) => v.toFixed(1) + '%'
          const fmtBrl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
          // Cor pela distância da conversão geral, para a matriz ser lida de relance
          const corDaTaxa = (x) => {
            if (x.leads === 0) return 'transparent'
            const r = x.conversao / (d.conversaoGeral || 1)
            if (x.amostraFraca) return darkMode ? 'rgba(148,163,184,0.10)' : 'rgba(148,163,184,0.15)'
            if (r >= 1.5) return darkMode ? 'rgba(16,185,129,0.32)' : 'rgba(16,185,129,0.28)'
            if (r >= 1.15) return darkMode ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.14)'
            if (r <= 0.5) return darkMode ? 'rgba(239,68,68,0.28)' : 'rgba(239,68,68,0.20)'
            if (r <= 0.85) return darkMode ? 'rgba(239,68,68,0.13)' : 'rgba(239,68,68,0.10)'
            return 'transparent'
          }
          return (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🗓️ Melhor Dia/Horário de Captação (por Vendas)</h3>
            <p className="muted">
              Em que dia e horário vale mais a pena captar leads — medido pelas vendas que esses leads
              geraram, e não pelo volume captado.
            </p>

            <div style={{
              marginBottom: '20px', padding: '12px 14px', borderRadius: '8px', fontSize: '13px',
              background: darkMode ? 'rgba(59,130,246,0.1)' : '#eff6ff', color: darkMode ? '#bfdbfe' : '#1e40af'
            }}>
              Cada lead conta no dia e na hora em que <strong>entrou</strong>, e leva consigo tudo o que
              comprou depois (qualquer produto, em qualquer data). Conversão = leads daquele recorte que
              viraram cliente. Base: {d.totalLeads.toLocaleString('pt-BR')} leads → {d.totalClientes} clientes
              ({fmtPct(d.conversaoGeral)} no geral).
            </div>

            {/* Destaques */}
            <div className="summary-cards">
              <div className="summary-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div className="icon">📅</div>
                <div className="label">Melhor Dia para Captar</div>
                <div className="value" style={{ color: '#10b981' }}>{d.melhorDia ? d.melhorDia.dia : '—'}</div>
                <div className="sub-label">
                  {d.melhorDia ? `${fmtPct(d.melhorDia.conversao)} — ${d.melhorDia.clientes} clientes em ${d.melhorDia.leads} leads` : 'sem amostra'}
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="icon">⏰</div>
                <div className="label">Melhor Horário</div>
                <div className="value" style={{ color: '#3b82f6' }}>
                  {d.melhorHora ? String(d.melhorHora.hora).padStart(2, '0') + 'h' : '—'}
                </div>
                <div className="sub-label">
                  {d.melhorHora ? `${fmtPct(d.melhorHora.conversao)} — ${d.melhorHora.clientes} clientes em ${d.melhorHora.leads} leads` : 'sem amostra'}
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                <div className="icon">🎯</div>
                <div className="label">Melhor Combinação</div>
                <div className="value" style={{ color: '#8b5cf6', fontSize: '20px' }}>
                  {d.melhorCelula ? `${d.melhorCelula.dia}, ${d.melhorCelula.bloco}` : '—'}
                </div>
                <div className="sub-label">
                  {d.melhorCelula ? `${fmtPct(d.melhorCelula.conversao)} — ${d.melhorCelula.clientes} clientes em ${d.melhorCelula.leads} leads` : 'sem amostra'}
                </div>
              </div>
              <div className="summary-card" style={{ borderLeft: '4px solid #ef4444' }}>
                <div className="icon">📉</div>
                <div className="label">Pior Dia</div>
                <div className="value" style={{ color: '#ef4444' }}>{d.piorDia ? d.piorDia.dia : '—'}</div>
                <div className="sub-label">
                  {d.piorDia ? `${fmtPct(d.piorDia.conversao)} — ${d.piorDia.leads} leads captados` : 'sem amostra'}
                </div>
              </div>
            </div>

            {/* Dia da semana */}
            <h4 style={{ marginTop: '28px' }}>Conversão por Dia da Semana de Captação</h4>
            <p className="muted" style={{ marginTop: '-8px', fontSize: '13px' }}>
              Barras = % dos leads que viraram cliente. Linha = quantos leads foram captados naquele dia.
            </p>
            <ChartComponent
              type="bar"
              height={320}
              darkMode={darkMode}
              data={{
                labels: d.dias.map((x) => x.dia),
                datasets: [
                  {
                    type: 'bar',
                    label: 'Conversão em cliente (%)',
                    data: d.dias.map((x) => x.conversao),
                    backgroundColor: '#10b981',
                    yAxisID: 'y'
                  },
                  {
                    type: 'line',
                    label: 'Leads captados',
                    data: d.dias.map((x) => x.leads),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                plugins: {
                  title: { display: true, text: 'Volume captado x vendas geradas, por dia da semana', color: darkMode ? '#e2e8f0' : '#374151', font: { size: 14, weight: 'bold' } },
                  legend: { position: 'top', labels: { color: darkMode ? '#e2e8f0' : '#374151' } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => ctx.dataset.label === 'Leads captados'
                        ? `Leads captados: ${ctx.parsed.y}`
                        : `Conversão: ${Number(ctx.parsed.y).toFixed(1)}%`
                    }
                  }
                },
                scales: {
                  y: { type: 'linear', position: 'left', title: { display: true, text: 'Conversão (%)', color: '#10b981' }, ticks: { color: '#10b981', callback: (v) => v + '%' } },
                  y1: { type: 'linear', position: 'right', title: { display: true, text: 'Leads captados', color: '#3b82f6' }, ticks: { color: '#3b82f6' }, grid: { drawOnChartArea: false } }
                }
              }}
            />

            <div style={{ overflowX: 'auto', marginTop: '16px' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Dia da Semana</th>
                    <th>Leads Captados</th>
                    <th>Viraram Cliente</th>
                    <HeaderTooltip label="Conversão" darkMode={darkMode}
                      tooltip="Percentual dos leads captados naquele dia que geraram alguma venda" />
                    <th>Receita Gerada</th>
                    <HeaderTooltip label="Receita por Lead" darkMode={darkMode}
                      tooltip="Receita total dividida por todos os leads captados no dia — mede o valor de captar naquele dia" />
                  </tr>
                </thead>
                <tbody>
                  {[...d.dias].sort((a, b) => b.conversao - a.conversao).map((x, i) => (
                    <tr key={i}>
                      <td><strong>{x.dia}</strong></td>
                      <td><span className="highlight">{x.leads}</span></td>
                      <td>{x.clientes}</td>
                      <td>
                        <span className={getPerformanceColorClass(x.conversao, { good: d.conversaoGeral * 1.15, medium: d.conversaoGeral * 0.85 })}>
                          {fmtPct(x.conversao)}
                        </span>
                      </td>
                      <td>{fmtBrl(x.receita)}</td>
                      <td>{fmtBrl(x.receitaPorLead)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Horário */}
            <h4 style={{ marginTop: '28px' }}>Conversão por Horário de Captação</h4>
            <p className="muted" style={{ marginTop: '-8px', fontSize: '13px' }}>
              Horas com menos de {d.minLeads} leads aparecem em cinza — a taxa ali oscila demais para servir de base.
            </p>
            <ChartComponent
              type="bar"
              height={300}
              darkMode={darkMode}
              data={{
                labels: d.horas.map((x) => String(x.hora).padStart(2, '0') + 'h'),
                datasets: [{
                  label: 'Conversão em cliente (%)',
                  data: d.horas.map((x) => x.conversao),
                  backgroundColor: d.horas.map((x) => x.amostraFraca ? '#94a3b8' : (x.conversao >= d.conversaoGeral ? '#10b981' : '#f59e0b'))
                }]
              }}
              options={{
                plugins: {
                  title: { display: true, text: 'Conversão por hora de entrada do lead', color: darkMode ? '#e2e8f0' : '#374151', font: { size: 14, weight: 'bold' } },
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => {
                        const x = d.horas[ctx.dataIndex]
                        return `${fmtPct(x.conversao)} — ${x.clientes} clientes em ${x.leads} leads` + (x.amostraFraca ? ' (amostra fraca)' : '')
                      }
                    }
                  }
                },
                scales: { y: { title: { display: true, text: 'Conversão (%)' }, ticks: { callback: (v) => v + '%' } } }
              }}
            />

            {/* Matriz */}
            <h4 style={{ marginTop: '28px' }}>Matriz Dia × Período</h4>
            <p className="muted" style={{ marginTop: '-8px', fontSize: '13px' }}>
              Verde = converte acima da média geral ({fmtPct(d.conversaoGeral)}); vermelho = abaixo.
              Cada célula mostra clientes / leads captados.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ minWidth: '640px' }}>
                <thead>
                  <tr>
                    <th>Dia</th>
                    {d.blocos.map((b) => <th key={b.nome}>{b.nome}<br /><span style={{ fontWeight: 400, fontSize: '11px', opacity: 0.7 }}>{b.faixa}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {d.dias.map((dia) => (
                    <tr key={dia.diaIndex}>
                      <td><strong>{dia.dia}</strong></td>
                      {d.blocos.map((b) => {
                        const c = d.celulas.find((x) => x.diaIndex === dia.diaIndex && x.bloco === b.nome)
                        if (!c || c.leads === 0) return <td key={b.nome} style={{ opacity: 0.4 }}>—</td>
                        return (
                          <td key={b.nome} style={{ background: corDaTaxa(c) }}
                            title={c.amostraFraca ? `Apenas ${c.leads} leads — amostra fraca` : `${fmtBrl(c.receitaPorLead)} por lead captado`}>
                            <strong>{fmtPct(c.conversao)}</strong>
                            <br />
                            <span style={{ fontSize: '11px', opacity: 0.75 }}>
                              {c.clientes}/{c.leads}{c.amostraFraca ? ' ⚠' : ''}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', padding: '14px', background: darkMode ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderRadius: '8px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: darkMode ? '#fcd34d' : '#92400e' }}>
                ⚠️ <strong>Como ler:</strong> são {d.totalClientes} clientes distribuídos em 28 células, então
                uma célula isolada muda de patamar com 1 ou 2 vendas a mais. Leia o dia da semana como sinal
                principal (aí o volume é grande) e a matriz apenas como indício, sempre olhando o número de
                leads ao lado da taxa.
              </p>
            </div>
          </div>
          )
        })()}

        {selectedAnalysis === 'conversion-time-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>⏱️ Análise de Tempo de Conversão</h3>
            <p className="muted">Tempo entre entrada do lead e fechamento da venda</p>

            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">⏱️</div>
                <div className="label">Tempo Médio</div>
                <div className="value">{(() => {
                  const conversions = getConversionTimeAnalysis
                  const times = conversions.map(c => c.conversionDays)
                  return times.length > 0 ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : 0
                })()} dias</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">🎯</div>
                <div className="label">Total Conversões</div>
                <div className="value">{getConversionTimeAnalysis.length}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">⚡</div>
                <div className="label">Mais Rápida</div>
                <div className="value">{(() => {
                  const times = getConversionTimeAnalysis.map(c => c.conversionDays).sort((a, b) => a - b)
                  return times.length > 0 ? times[0] : 0
                })()} dias</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">💎</div>
                <div className="label">Alta Renda Média</div>
                <div className="value">{(() => {
                  const highIncomeConversions = getConversionTimeAnalysis.filter(c => c.isHighIncome)
                  return highIncomeConversions.length > 0 ?
                    (highIncomeConversions.reduce((a, b) => a + b.conversionDays, 0) / highIncomeConversions.length).toFixed(1) : 0
                })()} dias</div>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h4>Tempo Médio de Conversão por Mês</h4>
              <ChartComponent
                type="line"
                darkMode={darkMode}
                data={{
                  labels: getConversionTimeByMonth.map(item => item.month),
                  datasets: [
                    {
                      label: 'Tempo Médio (dias)',
                      data: getConversionTimeByMonth.map(item => item.avgDays),
                      borderColor: '#3b82f6',
                      backgroundColor: '#3b82f620',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.3
                    },
                    {
                      label: 'Tempo Mediano (dias)',
                      data: getConversionTimeByMonth.map(item => item.medianDays),
                      borderColor: '#10b981',
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderDash: [3, 3],
                      fill: false
                    },
                    {
                      label: 'Tendência',
                      data: calculateTrendline(getConversionTimeByMonth.map(item => item.avgDays)),
                      borderColor: '#ef4444',
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderDash: [8, 4],
                      pointRadius: 0,
                      fill: false
                    }
                  ]
                }}
                options={{
                  plugins: {
                    title: {
                      display: true,
                      text: 'Evolução do Tempo de Conversão',
                      color: darkMode ? '#e2e8f0' : '#374151',
                      font: {
                        size: 14,
                        weight: 'bold'
                      }
                    },
                    legend: {
                      labels: {
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 12
                        }
                      }
                    }
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Mês',
                        color: darkMode ? '#e2e8f0' : '#374151'
                      },
                      ticks: {
                        color: darkMode ? '#e2e8f0' : '#374151'
                      },
                      grid: {
                        color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                      }
                    },
                    y: {
                      title: {
                        display: true,
                        text: 'Dias',
                        color: darkMode ? '#e2e8f0' : '#374151'
                      },
                      ticks: {
                        color: darkMode ? '#e2e8f0' : '#374151'
                      },
                      grid: {
                        color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                      }
                    }
                  }
                }}
              />
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Total Vendas</th>
                  <th>Tempo Médio</th>
                  <th>Tempo Mediano</th>
                  <th>Variação (Min-Max)</th>
                  <th>Conversões Qualificadas</th>
                </tr>
              </thead>
              <tbody>
                {getConversionTimeByMonth.map((item, i) => (
                  <tr key={i}>
                    <td>{item.month}</td>
                    <td><span className="highlight">{item.totalSales}</span></td>
                    <td>
                      <span className={item.avgDays <= 7 ? 'text-green' : item.avgDays <= 15 ? 'text-orange' : 'text-red'}>
                        {item.avgDays.toFixed(1)} dias
                      </span>
                    </td>
                    <td>{item.medianDays.toFixed(1)} dias</td>
                    <td>{item.minDays}-{item.maxDays} dias</td>
                    <td>
                      <span className="highlight">{item.qualifiedConversions}</span>
                      <span className="text-small" style={{ marginLeft: '8px' }}>
                        ({item.totalSales > 0 ? ((item.qualifiedConversions / item.totalSales) * 100).toFixed(0) : 0}%)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Análise de Churn */}
        {selectedAnalysis === 'churn-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📉 Análise de Churn</h3>
            <p className="muted">Análise detalhada de cancelamentos e perda de clientes</p>

            {/* KPIs de Churn */}
            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">📉</div>
                <div className="label">Volume de Churn</div>
                <div className="value">{churnAnalysis.totalChurnCount}</div>
                <div className="sub-label">clientes perdidos</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">💸</div>
                <div className="label">Valor do Churn</div>
                <div className="value">R$ {churnAnalysis.totalChurnValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="sub-label">receita perdida</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">⚠️</div>
                <div className="label">Taxa de Churn</div>
                <div className="value">{manualInputs.vendasEfetuadas > 0 ? ((churnAnalysis.totalChurnCount / manualInputs.vendasEfetuadas) * 100).toFixed(1) : 0}%</div>
                <div className="sub-label">dos clientes</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">💰</div>
                <div className="label">Ticket Médio Churn</div>
                <div className="value">R$ {churnAnalysis.totalChurnCount > 0 ? (churnAnalysis.totalChurnValue / churnAnalysis.totalChurnCount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</div>
                <div className="sub-label">por cliente perdido</div>
              </div>
            </div>

            {churnAnalysis.totalChurnCount > 0 ? (
              <>
                {/* Gráficos de Churn */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
                  <div>
                    <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>Churn por Mês</h4>
                    <ChartComponent
                      type="bar"
                      darkMode={darkMode}
                      data={{
                        labels: churnAnalysis.churnByMonth.map(d => d.month),
                        datasets: [{
                          label: 'Volume de Churn',
                          data: churnAnalysis.churnByMonth.map(d => d.count),
                          backgroundColor: '#ef4444',
                          borderColor: '#b91c1c',
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        plugins: {
                          legend: { display: false },
                          title: {
                            display: true,
                            text: 'Distribuição Temporal de Cancelamentos',
                            color: darkMode ? '#e2e8f0' : '#374151'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                          }
                        }
                      }}
                    />
                  </div>

                  <div>
                    <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>Tempo até o Churn (Cohort)</h4>
                    <ChartComponent
                      type="bar"
                      darkMode={darkMode}
                      data={{
                        labels: churnAnalysis.timeToChurn.map(d => d.label),
                        datasets: [{
                          label: 'Clientes',
                          data: churnAnalysis.timeToChurn.map(d => d.value),
                          backgroundColor: '#f97316',
                          borderColor: '#c2410c',
                          borderWidth: 2
                        }]
                      }}
                      options={{
                        plugins: {
                          legend: { display: false },
                          title: {
                            display: true,
                            text: 'Quando os Clientes Cancelam',
                            color: darkMode ? '#e2e8f0' : '#374151'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Tabela de Churn por Mês */}
                <h4 style={{ marginTop: 32 }}>Detalhamento Mensal</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Volume de Churn</th>
                      <th>% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnAnalysis.churnByMonth.map((item, i) => (
                      <tr key={i}>
                        <td>{item.month}</td>
                        <td><span className="highlight">{item.count}</span></td>
                        <td>{churnAnalysis.totalChurnCount > 0 ? ((item.count / churnAnalysis.totalChurnCount) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Tabela de Tempo até Churn */}
                <h4 style={{ marginTop: 32 }}>Análise de Cohort - Tempo até Cancelamento</h4>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Clientes</th>
                      <th>% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnAnalysis.timeToChurn.map((item, i) => (
                      <tr key={i}>
                        <td>{item.label}</td>
                        <td><span className="highlight">{item.value}</span></td>
                        <td>{churnAnalysis.totalChurnCount > 0 ? ((item.value / churnAnalysis.totalChurnCount) * 100).toFixed(1) : 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: darkMode ? '#94a3b8' : '#6b7280',
                backgroundColor: darkMode ? '#1e293b' : '#f8fafc',
                borderRadius: '8px',
                marginTop: '24px'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '8px' }}>📊 Nenhum dado de churn disponível</p>
                <p style={{ fontSize: '14px' }}>Faça upload de um CSV com as colunas de churn preenchidas para visualizar as análises.</p>
              </div>
            )}
          </div>
        )}

        {/* Performance por Dia e Horário */}
        {selectedAnalysis === 'weekday-hourly-analysis' && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>🕐 Performance por Dia da Semana e Horário</h3>
            <p className="muted">Análise de padrões temporais de geração de leads e conversões</p>

            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">📊</div>
                <div className="label">Melhor Dia</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis;
                  const bestDay = weekdayData.reduce((max, day) => day.totalLeads > max.totalLeads ? day : max, weekdayData[0]);
                  return bestDay ? bestDay.weekday : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">🕐</div>
                <div className="label">Melhor Horário</div>
                <div className="value">{(() => {
                  const hourlyData = getHourlyAnalysis;
                  const bestHour = hourlyData.reduce((max, hour) => hour.totalLeads > max.totalLeads ? hour : max, hourlyData[0]);
                  return bestHour ? bestHour.hourLabel : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">💎</div>
                <div className="label">Dia + Qualificado</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis;
                  const bestQualified = weekdayData.reduce((max, day) => day.qualifiedRate > max.qualifiedRate ? day : max, weekdayData[0]);
                  return bestQualified ? `${bestQualified.weekday} (${bestQualified.qualifiedRate.toFixed(1)}%)` : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">🎯</div>
                <div className="label">Dia + Converte</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis.filter(d => d.sales > 0);
                  if (weekdayData.length === 0) return '-';
                  const bestConversion = weekdayData.reduce((max, day) => day.conversionRate > max.conversionRate ? day : max, weekdayData[0]);
                  return `${bestConversion.weekday} (${bestConversion.conversionRate.toFixed(1)}%)`;
                })()}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <h4>Performance por Dia da Semana</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: getWeekdayAnalysis.map(item => item.weekday),
                    datasets: [
                      {
                        label: 'Total Leads',
                        data: getWeekdayAnalysis.map(item => item.totalLeads),
                        backgroundColor: '#3b82f6',
                        borderColor: '#1e40af',
                        borderWidth: 2
                      },
                      {
                        label: 'Leads Qualificados',
                        data: getWeekdayAnalysis.map(item => item.qualifiedLeads),
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 2
                      }
                    ]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Leads por Dia da Semana',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Dia da Semana',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Número de Leads',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>

              <div>
                <h4>Performance por Horário (0-23h)</h4>
                <ChartComponent
                  type="line"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: getHourlyAnalysis.map(item => item.hourLabel),
                    datasets: [
                      {
                        label: 'Total Leads',
                        data: getHourlyAnalysis.map(item => item.totalLeads),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3
                      },
                      {
                        label: 'Leads Qualificados',
                        data: getHourlyAnalysis.map(item => item.qualifiedLeads),
                        borderColor: '#10b981',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [3, 3],
                        fill: false
                      }
                    ]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Leads por Horário do Dia',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Horário',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Número de Leads',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Dia da Semana</th>
                  <th>Total Leads</th>
                  <th>Leads Qualificados</th>
                  <th>% Qualificados</th>
                  <th>Vendas</th>
                  <th>Taxa Conversão</th>
                </tr>
              </thead>
              <tbody>
                {getWeekdayAnalysis.map((item, i) => (
                  <tr key={i}>
                    <td><strong>{item.weekday}</strong></td>
                    <td><span className="highlight">{item.totalLeads}</span></td>
                    <td><span className="highlight">{item.qualifiedLeads}</span></td>
                    <td>
                      <span className={getPerformanceColorClass(item.qualifiedRate, { good: 40, medium: 25 })}>
                        {item.qualifiedRate.toFixed(1)}%
                      </span>
                    </td>
                    <td><span className="highlight">{item.sales}</span></td>
                    <td>
                      <span className={getPerformanceColorClass(item.conversionRate, { good: 5, medium: 2 })}>
                        {item.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Análise de Receita */}
        {selectedAnalysis === 'revenue-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>💰 Análise de Receita com LTV e Churn</h3>
            <p className="muted">Análise da receita real considerando LTV por cliente e taxa de churn</p>

            <div className="grid grid-4 mb-8">
              <div className="summary-card">
                <div className="icon">📊</div>
                <div className="label">Vendas CSV</div>
                <div className="value">{salesFromCSV}</div>
              </div>
              <div className="summary-card">
                <div className="icon">💰</div>
                <div className="label">Receita Bruta (LTV)</div>
                <div className="value">R$ {(salesFromCSV * LTV_FIXO).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="summary-card">
                <div className="icon">⚠️</div>
                <div className="label">Impacto Churn</div>
                <div className="value">R$ {(salesFromCSV * LTV_FIXO * taxaChurnCalculada / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="summary-card">
                <div className="icon">✅</div>
                <div className="label">Receita Líquida</div>
                <div className="value">R$ {(salesFromCSV * LTV_FIXO * (1 - taxaChurnCalculada / 100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <h4>Comparação: Receita Bruta vs Líquida</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: ['Receita Bruta (LTV)', 'Receita Líquida (após Churn)'],
                    datasets: [{
                      label: 'Receita (R$)',
                      data: [
                        salesFromCSV * LTV_FIXO,
                        salesFromCSV * LTV_FIXO * (1 - taxaChurnCalculada / 100)
                      ],
                      backgroundColor: ['#3b82f6', '#10b981'],
                      borderColor: ['#1e40af', '#059669'],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Impacto do Churn na Receita',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Tipo de Receita',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Receita (R$)',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          callback: function (value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                          }
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>

              <div>
                <h4>Comparação: Investimento vs Retorno</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: ['CAC\n(Custo)', 'LTGP\n(Retorno)', 'Margem\n(LTGP - CAC)'],
                    datasets: [{
                      label: 'Valor por Cliente (R$)',
                      data: [cac, ltgp, Math.max(0, ltgp - cac)],
                      backgroundColor: ['#ef4444', '#10b981', '#3b82f6'],
                      borderColor: ['#dc2626', '#059669', '#1e40af'],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        bottom: 20
                      }
                    },
                    plugins: {
                      title: {
                        display: true,
                        text: 'Custo vs Retorno por Cliente',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Métrica por Cliente',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Valor (R$)',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          callback: function (value) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                          }
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8' }}>💡 O que significa LTGP/CAC?</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>LTGP/CAC = {ltgpCac.toFixed(2)}x</strong> significa que para cada R$ 1,00 investido em verba de campanha,
                você gera <strong>R$ {ltgpCac.toFixed(2)}</strong> de lucro bruto por cliente (LTV × margem bruta).
                {ltgpCac >= 3 ? ' ✅ Excelente!' : ltgpCac >= 2 ? ' ⚠️ Razoável, pode melhorar.' : ' ❌ Atenção: baixo retorno.'}
              </p>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Métrica</th>
                  <th>Valor</th>
                  <th>Descrição</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>LTV (Lifetime Value)</strong></td>
                  <td>R$ {LTV_FIXO.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>Valor total de um cliente ao longo da vida</td>
                  <td className="text-green">📊 Por cliente</td>
                </tr>
                <tr>
                  <td><strong>Taxa de Churn</strong></td>
                  <td>{taxaChurnCalculada.toFixed(1)}%</td>
                  <td>Percentual de clientes que cancelam</td>
                  <td className={taxaChurnCalculada <= 5 ? 'text-green' : taxaChurnCalculada <= 10 ? 'text-orange' : 'text-red'}>
                    {taxaChurnCalculada <= 5 ? '✅ Baixo' : taxaChurnCalculada <= 10 ? '⚠️ Moderado' : '❌ Alto'}
                  </td>
                </tr>
                <tr>
                  <td><strong>CAC (Custo por Cliente)</strong></td>
                  <td>R$ {cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>Custo para adquirir um novo cliente</td>
                  <td className={cac < ltgp * 0.33 ? 'text-green' : cac < ltgp * 0.5 ? 'text-orange' : 'text-red'}>
                    {cac < ltgp * 0.33 ? '✅ Excelente' : cac < ltgp * 0.5 ? '⚠️ Razoável' : '❌ Alto'}
                  </td>
                </tr>
                <tr>
                  <td><strong>LTGP (Lifetime Gross Profit)</strong></td>
                  <td>R$ {ltgp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td>Lucro bruto por cliente (LTV × Margem)</td>
                  <td className="text-green">📊 Por cliente</td>
                </tr>
                <tr>
                  <td><strong>LTGP/CAC (Retorno)</strong></td>
                  <td>{ltgpCac.toFixed(2)}x</td>
                  <td>R$ {ltgpCac.toFixed(2)} de retorno para cada R$ 1 investido</td>
                  <td className={ltgpCac >= 3 ? 'text-green' : ltgpCac >= 2 ? 'text-orange' : 'text-red'}>
                    {ltgpCac >= 3 ? '✅ Excelente' : ltgpCac >= 2 ? '⚠️ Bom' : '❌ Baixo'}
                  </td>
                </tr>
                <tr>
                  <td><strong>Payback (meses)</strong></td>
                  <td>{ltgp > 0 ? (cac / (ltgp / 12)).toFixed(1) : 'N/A'}</td>
                  <td>Tempo para recuperar investimento</td>
                  <td className={ltgp > 0 && (cac / (ltgp / 12)) <= 6 ? 'text-green' : ltgp > 0 && (cac / (ltgp / 12)) <= 12 ? 'text-orange' : 'text-red'}>
                    {ltgp > 0 ? (
                      (cac / (ltgp / 12)) <= 6 ? '✅ Rápido' :
                        (cac / (ltgp / 12)) <= 12 ? '⚠️ Moderado' : '❌ Lento'
                    ) : 'N/A'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Verba vs Performance */}
        {selectedAnalysis === 'budget-performance-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>💸 Análise de Verba vs Performance</h3>
            <p className="muted">Análise do retorno sobre investimento em campanhas e eficiência da verba aplicada</p>

            <div className="summary-cards">
              <div className="summary-card">
                <div className="icon">💰</div>
                <div className="label">Verba Total Gasta</div>
                <div className="value">R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="summary-card">
                <div className="icon">💵</div>
                <div className="label">CAC (Custo por Cliente)</div>
                <div className="value">R$ {cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="summary-card">
                <div className="icon">💎</div>
                <div className="label">LTGP (LTV × Margem)</div>
                <div className="value">R$ {ltgp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="summary-card">
                <div className="icon">🚀</div>
                <div className="label">LTGP/CAC</div>
                <div className="value">{ltgpCac.toFixed(2)}x</div>
              </div>
              <div className="summary-card">
                <div className="icon">⏰</div>
                <div className="label">Payback Time</div>
                <div className="value">{ltgp > 0 ? (cac / (ltgp / 12)).toFixed(1) : 'N/A'} meses</div>
              </div>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8' }}>💡 O que significa LTGP/CAC?</h4>
              <p style={{ margin: 0, fontSize: '14px' }}>
                <strong>LTGP/CAC = {ltgpCac.toFixed(2)}x</strong> significa que para cada R$ 1,00 investido em verba de campanha,
                você gera <strong>R$ {ltgpCac.toFixed(2)}</strong> de lucro bruto por cliente (LTV × margem bruta).
                {ltgpCac >= 3 ? ' ✅ Excelente!' : ltgpCac >= 2 ? ' ⚠️ Razoável, pode melhorar.' : ' ❌ Atenção: baixo retorno.'}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <h4>Comparação: Investimento vs Retorno</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: ['CAC\n(Custo)', 'LTGP\n(Retorno)', 'Margem\n(LTGP - CAC)'],
                    datasets: [{
                      label: 'Valor por Cliente (R$)',
                      data: [cac, ltgp, Math.max(0, ltgp - cac)],
                      backgroundColor: ['#ef4444', '#10b981', '#3b82f6'],
                      borderColor: ['#dc2626', '#059669', '#1e40af'],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        bottom: 20
                      }
                    },
                    plugins: {
                      title: {
                        display: true,
                        text: 'Custo vs Retorno por Cliente',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Métricas',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          maxRotation: 0,
                          minRotation: 0,
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 11
                          },
                          padding: 10
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Valor (R$)',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          callback: function (value: any) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                          }
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>

              <div>
                <h4>Evolução Temporal da Eficiência</h4>
                <ChartComponent
                  type="line"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: getTemporalSalesData.map(item => item.month),
                    datasets: [
                      {
                        label: 'Vendas por Mês',
                        data: getTemporalSalesData.map(item => item.salesCount),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                      },
                      {
                        label: 'CAC Real (R$)',
                        data: getTemporalSalesData.map(item => item.cac),
                        borderColor: '#ef4444',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1'
                      }
                    ]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Vendas vs CAC ao Longo do Tempo',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        position: 'top',
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Mês',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                          display: true,
                          text: 'Número de Vendas',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                          display: true,
                          text: 'CAC (R$)',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          callback: function (value: any) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                          }
                        },
                        grid: {
                          drawOnChartArea: false,
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
              <div>
                <h4>Comparação de Receitas</h4>
                <ChartComponent
                  type="doughnut"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: ['Faturamento (1ª Venda)', 'Receita Bruta (LTV)', 'Receita Líquida (LTV - Churn)'],
                    datasets: [{
                      data: [
                        manualInputs.faturamentoTotal,
                        salesFromCSV * LTV_FIXO,
                        salesFromCSV * LTV_FIXO * (1 - manualInputs.churnRate / 100)
                      ],
                      backgroundColor: ['#f59e0b', '#3b82f6', '#10b981'],
                      borderWidth: 2,
                      borderColor: darkMode ? '#1e293b' : '#ffffff'
                    }]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Visão Geral das Receitas',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        position: 'bottom',
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 11
                          }
                        }
                      }
                    }
                  }}
                />
              </div>

              <div>
                <h4>ROI e Eficiência por Período</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: getTemporalSalesData.map(item => item.month),
                    datasets: [{
                      label: 'Receita Mensal (R$)',
                      data: getTemporalSalesData.map(item => item.totalRevenue),
                      backgroundColor: '#10b981',
                      borderColor: '#059669',
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    plugins: {
                      title: {
                        display: true,
                        text: 'Receita Mensal da Campanha',
                        color: darkMode ? '#e2e8f0' : '#374151',
                        font: {
                          size: 14,
                          weight: 'bold'
                        }
                      },
                      legend: {
                        labels: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          font: {
                            size: 12
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        title: {
                          display: true,
                          text: 'Mês',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      },
                      y: {
                        title: {
                          display: true,
                          text: 'Receita (R$)',
                          color: darkMode ? '#e2e8f0' : '#374151'
                        },
                        ticks: {
                          color: darkMode ? '#e2e8f0' : '#374151',
                          callback: function (value: any) {
                            return 'R$ ' + value.toLocaleString('pt-BR');
                          }
                        },
                        grid: {
                          color: darkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(156, 163, 175, 0.2)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <h4>Detalhamento Completo da Performance</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                    <th>Interpretação</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Verba Total Gasta</strong></td>
                    <td>R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>Investimento total em campanhas</td>
                    <td>-</td>
                  </tr>
                  <tr>
                    <td><strong>Total de Vendas (CSV)</strong></td>
                    <td>{salesFromCSV} vendas</td>
                    <td>Vendas geradas pelas campanhas</td>
                    <td className={salesFromCSV > 0 ? 'text-green' : 'text-red'}>
                      {salesFromCSV > 0 ? '✅ Convertendo' : '❌ Sem conversões'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>CAC (Custo de Aquisição)</strong></td>
                    <td>R$ {cac.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>Custo para adquirir cada cliente</td>
                    <td className={cac < ltgp * 0.33 ? 'text-green' : cac < ltgp * 0.5 ? 'text-orange' : 'text-red'}>
                      {cac < ltgp * 0.33 ? '✅ Excelente' : cac < ltgp * 0.5 ? '⚠️ Razoável' : '❌ Alto'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>LTGP (Lifetime Gross Profit)</strong></td>
                    <td>R$ {ltgp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>Lucro bruto por cliente (LTV × Margem)</td>
                    <td className="text-green">📊 Por cliente</td>
                  </tr>
                  <tr>
                    <td><strong>LTGP/CAC (Retorno)</strong></td>
                    <td>{ltgpCac.toFixed(2)}x</td>
                    <td>R$ {ltgpCac.toFixed(2)} de retorno para cada R$ 1 investido</td>
                    <td className={ltgpCac >= 3 ? 'text-green' : ltgpCac >= 2 ? 'text-orange' : 'text-red'}>
                      {ltgpCac >= 3 ? '✅ Excelente' : ltgpCac >= 2 ? '⚠️ Bom' : '❌ Baixo'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Payback (meses)</strong></td>
                    <td>{ltgp > 0 ? (cac / (ltgp / 12)).toFixed(1) : 'N/A'}</td>
                    <td>Tempo para recuperar investimento</td>
                    <td className={ltgp > 0 && (cac / (ltgp / 12)) <= 6 ? 'text-green' : ltgp > 0 && (cac / (ltgp / 12)) <= 12 ? 'text-orange' : 'text-red'}>
                      {ltgp > 0 ? (
                        (cac / (ltgp / 12)) <= 6 ? '✅ Rápido' :
                          (cac / (ltgp / 12)) <= 12 ? '⚠️ Moderado' : '❌ Lento'
                      ) : 'N/A'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '32px' }}>
              <h4>Insights e Recomendações</h4>
              <div style={{ display: 'grid', gap: '16px' }}>
                {(() => {
                  const paybackMonths = ltgp > 0 ? (cac / (ltgp / 12)) : 0;
                  const custoPerLead = totalLeads > 0 ? manualInputs.verbaGasta / totalLeads : 0;

                  return [
                    `💰 **Eficiência da Verba**: Cada R$ 1,00 investido gera R$ ${ltgpCac.toFixed(2)} de retorno bruto através do LTGP/CAC`,
                    `🎯 **Custo por Lead**: R$ ${custoPerLead.toFixed(2)} para gerar cada lead (${totalLeads} leads com R$ ${manualInputs.verbaGasta.toLocaleString('pt-BR')})`,
                    `⏰ **Tempo de Payback**: ${paybackMonths.toFixed(1)} meses para recuperar o investimento por cliente`,
                    `📊 **Taxa de Conversão Lead→Planejamento**: ${totalLeads > 0 ? (uniquePlanejamentoBuyers / totalLeads * 100).toFixed(2) : 0}% (${uniquePlanejamentoBuyers} clientes de ${totalLeads} leads)`,
                    `🚀 **Recomendação**: ${ltgpCac >= 3 ? 'Excelente performance! Considere aumentar investimento.' : ltgpCac >= 2 ? 'Performance boa. Otimize campanhas para melhor ROI.' : 'Performance baixa. Revise estratégia e segmentação.'}`
                  ];
                })().map((insight, i) => (
                  <div key={i} className="pill" style={{ textAlign: 'left', padding: '12px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff' }}>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Análise de ROI e Lucratividade */}
        {selectedAnalysis === 'roi-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📈 Análise de ROI e Lucratividade</h3>
            <p className="muted">Cálculo detalhado do retorno sobre investimento e margem líquida por modelo de venda</p>

            {(() => {
              const receitaTotal = manualInputs.faturamentoTotal
              const investimento = manualInputs.verbaGasta

              const recPlanBruto = manualInputs.faturamentoPlanejamento || 0
              const recSeg = manualInputs.faturamentoSeguros || 0
              const recCred = manualInputs.faturamentoCredito || 0
              const recOutros = (manualInputs as any).faturamentoOutros || 0

              // Descontar churn de planejamento financeiro do faturamento
              const churnValue = churnAnalysis.totalChurnValue || 0
              const recPlan = recPlanBruto - churnValue
              const receitaTotalLiquida = receitaTotal - churnValue

              // ROI Simples
              const roi = receitaTotalLiquida - investimento
              const roiPercentual = investimento > 0 ? (roi / investimento) * 100 : 0

              // CÁLCULO DE LUCRO LÍQUIDO POR PRODUTO

              /* 
                Fórmulas fornecidas:
                Seguros: Valor * 0.6 (repasse) * 0.81 (imposto) * 0.4 (comissão)
                Crédito: Valor * 0.04 (repasse) * 0.81 (imposto) * 0.4 (comissão)
                Planejamento/Outros (B2B): Valor * 0.81 (imposto) * 0.975 (Vindi) * 0.4 (comissão)
                Planejamento/Outros (B2C): Valor * 0.81 (imposto) * 0.975 (Vindi) * 0.775 (comissão)
                
                NOTA: recPlan já desconta o churn de planejamento financeiro
              */

              // Lucro fixo (Seguros e Crédito) - independe do modelo B2B/B2C
              const lucroSeguros = recSeg * 0.6 * 0.81 * 0.4
              const lucroCredito = recCred * 0.04 * 0.81 * 0.4
              const lucroFixos = lucroSeguros + lucroCredito

              // Lucro variável (Planejamento e Outros) - depende do modelo
              const baseVariavel = recPlan + recOutros

              // B2B
              const lucroVariavelB2B = baseVariavel * 0.81 * 0.975 * 0.4
              const lucroFinalB2B = lucroFixos + lucroVariavelB2B - investimento

              // B2C
              const lucroVariavelB2C = baseVariavel * 0.81 * 0.975 * 0.775
              const lucroFinalB2C = lucroFixos + lucroVariavelB2C - investimento

              const margemB2B = receitaTotalLiquida > 0 ? (lucroFinalB2B / receitaTotalLiquida) * 100 : 0
              const margemB2C = receitaTotalLiquida > 0 ? (lucroFinalB2C / receitaTotalLiquida) * 100 : 0

              const roiRealPercentB2B = investimento > 0 ? (lucroFinalB2B / investimento) * 100 : 0
              const roiRealPercentB2C = investimento > 0 ? (lucroFinalB2C / investimento) * 100 : 0

              return (
                <>
                  {/* Cards de Resumo */}
                  <div className="summary-cards" style={{ marginTop: '24px', marginBottom: '32px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                    <div className="summary-card animate-fade-in-up animate-delay-100">
                      <div className="icon">💵</div>
                      <div className="label">Faturamento Líquido</div>
                      <div className="value">R$ {receitaTotalLiquida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-label">faturamento total - churn (R$ {churnValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-200">
                      <div className="icon">📢</div>
                      <div className="label">Verba Gasta</div>
                      <div className="value">R$ {investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-label">investimento em anúncios</div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-300" style={{ borderLeft: roiRealPercentB2B >= 0 ? '4px solid #3b82f6' : '4px solid #ef4444' }}>
                      <div className="icon">💼</div>
                      <div className="label">ROI Real (B2B)</div>
                      <div className="value" style={{ color: roiRealPercentB2B >= 0 ? '#3b82f6' : '#ef4444' }}>
                        {roiRealPercentB2B.toFixed(1)}%
                      </div>
                      <div className="sub-label">R$ {lucroFinalB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-300" style={{ borderLeft: roiRealPercentB2C >= 0 ? '4px solid #8b5cf6' : '4px solid #ef4444' }}>
                      <div className="icon">👥</div>
                      <div className="label">ROI Real (B2C)</div>
                      <div className="value" style={{ color: roiRealPercentB2C >= 0 ? '#8b5cf6' : '#ef4444' }}>
                        {roiRealPercentB2C.toFixed(1)}%
                      </div>
                      <div className="sub-label">R$ {lucroFinalB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                  </div>

                  {/* Cards B2B vs B2C */}
                  <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>💼 Comparação de Lucratividade: B2B vs B2C</h4>
                  <p className="muted" style={{ marginBottom: '24px', fontSize: '13px' }}>
                    Comparativo considerando margens específicas para Seguros e Crédito (fixas) e variações de comissão para Planejamento no modelo B2B (40%) vs B2C (77.5%).
                  </p>

                  <div className="summary-cards" style={{ marginBottom: '32px' }}>
                    <div className="summary-card animate-fade-in-up animate-delay-100" style={{ borderLeft: '4px solid #3b82f6' }}>
                      <div className="label">Lucro Líquido B2B</div>
                      <div className="value" style={{ color: lucroFinalB2B >= 0 ? '#10b981' : '#ef4444' }}>
                        R$ {lucroFinalB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="sub-label">Margem: {margemB2B.toFixed(1)}%</div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-200" style={{ borderLeft: '4px solid #8b5cf6' }}>
                      <div className="label">Lucro Líquido B2C</div>
                      <div className="value" style={{ color: lucroFinalB2C >= 0 ? '#10b981' : '#ef4444' }}>
                        R$ {lucroFinalB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="sub-label">Margem: {margemB2C.toFixed(1)}%</div>
                    </div>
                    <div className="summary-card animate-fade-in-up animate-delay-300">
                      <div className="label">Diferença B2C - B2B</div>
                      <div className="value" style={{ color: '#f59e0b' }}>
                        R$ {(lucroFinalB2C - lucroFinalB2B).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="sub-label">vantagem B2C</div>
                    </div>
                  </div>

                  {/* Cards de Margem de Contribuição Bruta e Líquida */}
                  <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>📊 Margem de Contribuição: Bruta vs Líquida</h4>
                  <p className="muted" style={{ marginBottom: '24px', fontSize: '13px' }}>
                    <strong>Margem Bruta:</strong> Antes de descontar a comissão dos planejadores. <strong>Margem Líquida:</strong> Após descontar a comissão final dos planejadores.
                  </p>

                  {(() => {
                    // Margem de Contribuição BRUTA (antes da comissão dos planejadores)
                    // Seguros: Valor * 0.6 (repasse) * 0.81 (imposto) — SEM comissão
                    // Crédito: Valor * 0.04 (repasse) * 0.81 (imposto) — SEM comissão
                    // Planejamento/Outros: Valor * 0.81 (imposto) * 0.975 (Vindi) — SEM comissão
                    const margemBrutaSeguros = recSeg * 0.6 * 0.81
                    const margemBrutaCredito = recCred * 0.04 * 0.81
                    const margemBrutaPlanOutros = baseVariavel * 0.81 * 0.975
                    const margemBrutaTotal = margemBrutaSeguros + margemBrutaCredito + margemBrutaPlanOutros

                    // Margem de Contribuição LÍQUIDA (após comissão dos planejadores)
                    // B2B: comissão de 40% para Planejamento/Outros
                    // B2C: comissão de 77.5% para Planejamento/Outros
                    // Seguros/Crédito: mesma comissão de 40% (fixo)
                    const margemLiquidaSeguros = margemBrutaSeguros * 0.4
                    const margemLiquidaCredito = margemBrutaCredito * 0.4
                    const margemLiquidaPlanOutrosB2B = margemBrutaPlanOutros * 0.4
                    const margemLiquidaPlanOutrosB2C = margemBrutaPlanOutros * 0.775
                    const margemLiquidaTotalB2B = margemLiquidaSeguros + margemLiquidaCredito + margemLiquidaPlanOutrosB2B
                    const margemLiquidaTotalB2C = margemLiquidaSeguros + margemLiquidaCredito + margemLiquidaPlanOutrosB2C

                    // Percentuais
                    const percBruta = receitaTotalLiquida > 0 ? (margemBrutaTotal / receitaTotalLiquida) * 100 : 0
                    const percLiquidaB2B = receitaTotalLiquida > 0 ? (margemLiquidaTotalB2B / receitaTotalLiquida) * 100 : 0
                    const percLiquidaB2C = receitaTotalLiquida > 0 ? (margemLiquidaTotalB2C / receitaTotalLiquida) * 100 : 0

                    return (
                      <div className="summary-cards" style={{ marginBottom: '32px', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {/* Margem Bruta - única para ambos (antes da comissão) */}
                        <div className="summary-card animate-fade-in-up animate-delay-100" style={{ borderLeft: '4px solid #f59e0b' }}>
                          <div className="icon">📈</div>
                          <div className="label">Margem de Contribuição Bruta</div>
                          <div className="value" style={{ color: '#f59e0b' }}>
                            R$ {margemBrutaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="sub-label">{percBruta.toFixed(1)}% da receita</div>
                          <div className="sub-label" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                            Antes da comissão do planejador
                          </div>
                        </div>

                        {/* Margem Líquida B2B */}
                        <div className="summary-card animate-fade-in-up animate-delay-200" style={{ borderLeft: '4px solid #3b82f6' }}>
                          <div className="icon">💼</div>
                          <div className="label">Margem Líquida (B2B)</div>
                          <div className="value" style={{ color: '#3b82f6' }}>
                            R$ {margemLiquidaTotalB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="sub-label">{percLiquidaB2B.toFixed(1)}% da receita</div>
                          <div className="sub-label" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                            Comissão planejador: 60%
                          </div>
                        </div>

                        {/* Margem Líquida B2C */}
                        <div className="summary-card animate-fade-in-up animate-delay-300" style={{ borderLeft: '4px solid #8b5cf6' }}>
                          <div className="icon">👥</div>
                          <div className="label">Margem Líquida (B2C)</div>
                          <div className="value" style={{ color: '#8b5cf6' }}>
                            R$ {margemLiquidaTotalB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="sub-label">{percLiquidaB2C.toFixed(1)}% da receita</div>
                          <div className="sub-label" style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                            Comissão planejador: 22.5%
                          </div>
                        </div>
                      </div>
                    )
                  })()}


                  {/* Detalhamento dos Produtos */}
                  <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>📦 Detalhamento do Lucro por Produto</h4>
                  <div className="grid grid-3 mb-8">
                    <div className="kpi" style={{ borderLeft: '2px solid #3b82f6' }}>
                      <div className="label">Lucro Planejamento (B2C)</div>
                      <div className="value">R$ {lucroVariavelB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-value text-xs text-gray-500">B2B: R$ {lucroVariavelB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div className="kpi" style={{ borderLeft: '2px solid #8b5cf6' }}>
                      <div className="label">Lucro Seguros</div>
                      <div className="value">R$ {lucroSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-value text-xs text-gray-500">Margem Fixa</div>
                    </div>
                    <div className="kpi" style={{ borderLeft: '2px solid #10b981' }}>
                      <div className="label">Lucro Crédito</div>
                      <div className="value">R$ {lucroCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div className="sub-value text-xs text-gray-500">Margem Fixa</div>
                    </div>
                  </div>

                  {/* Gráfico Comparativo */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
                    <div>
                      <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>📉 Composição do Lucro (B2C)</h4>
                      <ChartComponent
                        type="bar"
                        height={280}
                        darkMode={darkMode}
                        data={{
                          labels: ['Planejamento', 'Seguros', 'Crédito', 'Investimento (Dedução)', 'Lucro Final'],
                          datasets: [{
                            label: 'Valor (R$)',
                            data: [lucroVariavelB2C, lucroSeguros, lucroCredito, -investimento, lucroFinalB2C],
                            backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#ef4444', lucroFinalB2C >= 0 ? '#10b981' : '#ef4444'],
                            borderWidth: 1
                          }]
                        }}
                        options={{
                          plugins: { legend: { display: false } },
                          scales: {
                            y: {
                              ticks: {
                                callback: (value: any) => 'R$ ' + value.toLocaleString('pt-BR')
                              }
                            }
                          }
                        }}
                      />
                    </div>
                    <div>
                      <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>🔄 B2B vs B2C</h4>
                      <ChartComponent
                        type="bar"
                        height={280}
                        darkMode={darkMode}
                        data={{
                          labels: ['Lucro Total B2B', 'Lucro Total B2C'],
                          datasets: [{
                            label: 'Lucro Líquido (R$)',
                            data: [lucroFinalB2B, lucroFinalB2C],
                            backgroundColor: ['#3b82f6', '#8b5cf6'],
                            borderWidth: 2
                          }]
                        }}
                        options={{
                          plugins: { legend: { display: false } },
                          scales: {
                            y: {
                              ticks: {
                                callback: (value: any) => 'R$ ' + value.toLocaleString('pt-BR')
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Nota Explicativa */}
                  <div style={{
                    marginTop: '24px',
                    padding: '16px',
                    backgroundColor: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff',
                    borderRadius: '8px',
                    borderLeft: '4px solid #3b82f6'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8' }}>💡 Entenda a Diferença</h4>
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      <strong>Planejamento Financeiro:</strong> É o único produto que varia conforme o modelo. No <strong>B2C</strong> você retém 77.5% da comissão líquida, enquanto no <strong>B2B</strong> retém 40%.<br />
                      <strong>Seguros e Crédito:</strong> Possuem margens de lucro fixas que se somam ao resultado final, independente do modelo de operação.
                    </p>
                  </div>

                  {/* Detalhamento do Cálculo Completo */}
                  <div style={{ marginTop: '32px' }}>
                    <h4 style={{ marginBottom: '16px', color: darkMode ? '#f8fafc' : '#1f2937' }}>🧮 Detalhamento Completo do Cálculo</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                      {/* CÁLCULO B2B */}
                      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid ' + (darkMode ? '#333' : '#e2e8f0') }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + (darkMode ? '#333' : '#e2e8f0'), background: darkMode ? '#1e293b' : '#f8fafc' }}>
                          <h5 style={{ margin: 0, color: '#3b82f6' }}>Modelo B2B</h5>
                          <div style={{ fontSize: '11px', color: 'gray' }}>Participação menor no planejamento (40%)</div>
                        </div>
                        <div style={{ padding: '16px', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6' }}>

                          {/* Receitas */}
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>1. Margem de Contribuição</div>

                          {/* Seguros */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Seguros:</span>
                            <span>R$ {lucroSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '4px' }}>
                            Fat. R$ {recSeg.toLocaleString('pt-BR')} x 0.6 x 0.81 x 0.4
                          </div>

                          {/* Crédito */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Crédito:</span>
                            <span>R$ {lucroCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '4px' }}>
                            Fat. R$ {recCred.toLocaleString('pt-BR')} x 0.04 x 0.81 x 0.4
                          </div>

                          {/* Planejamento B2B */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Planej./Outros:</span>
                            <span>R$ {lucroVariavelB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '8px' }}>
                            Fat. R$ {baseVariavel.toLocaleString('pt-BR')} x 0.81 x 0.975 x 0.4
                          </div>

                          <div style={{ borderTop: '1px dashed gray', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>(=) Total Margem:</span>
                            <span style={{ color: '#3b82f6' }}>R$ {(lucroFixos + lucroVariavelB2B).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <br />
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>2. Lucro Líquido</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Margem Contrib.:</span>
                            <span>R$ {(lucroFixos + lucroVariavelB2B).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#ef4444' }}>(-) Investimento:</span>
                            <span style={{ color: '#ef4444' }}>R$ {investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ borderTop: '1px solid gray', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>(=) Lucro Líquido:</span>
                            <span style={{ color: lucroFinalB2B >= 0 ? '#3b82f6' : '#ef4444' }}>R$ {lucroFinalB2B.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <br />
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>3. ROI Real</div>
                          <div style={{ fontSize: '12px' }}>
                            (Lucro Líquido / Investimento) x 100
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px', borderRadius: '4px' }}>
                            <span>ROI Final:</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: roiRealPercentB2B >= 0 ? '#3b82f6' : '#ef4444' }}>
                              {roiRealPercentB2B.toFixed(2)}%
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* CÁLCULO B2C */}
                      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid ' + (darkMode ? '#333' : '#e2e8f0') }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid ' + (darkMode ? '#333' : '#e2e8f0'), background: darkMode ? '#1e293b' : '#f8fafc' }}>
                          <h5 style={{ margin: 0, color: '#8b5cf6' }}>Modelo B2C</h5>
                          <div style={{ fontSize: '11px', color: 'gray' }}>Participação maior no planejamento (77.5%)</div>
                        </div>
                        <div style={{ padding: '16px', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6' }}>

                          {/* Receitas */}
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>1. Margem de Contribuição</div>

                          {/* Seguros */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Seguros:</span>
                            <span>R$ {lucroSeguros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '4px' }}>
                            Fat. R$ {recSeg.toLocaleString('pt-BR')} x 0.6 x 0.81 x 0.4
                          </div>

                          {/* Crédito */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Crédito:</span>
                            <span>R$ {lucroCredito.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '4px' }}>
                            Fat. R$ {recCred.toLocaleString('pt-BR')} x 0.04 x 0.81 x 0.4
                          </div>

                          {/* Planejamento B2C */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Planej./Outros:</span>
                            <span>R$ {lucroVariavelB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'gray', marginBottom: '8px' }}>
                            Fat. R$ {baseVariavel.toLocaleString('pt-BR')} x 0.81 x 0.975 x 0.775
                          </div>

                          <div style={{ borderTop: '1px dashed gray', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>(=) Total Margem:</span>
                            <span style={{ color: '#8b5cf6' }}>R$ {(lucroFixos + lucroVariavelB2C).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <br />
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>2. Lucro Líquido</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>(+) Margem Contrib.:</span>
                            <span>R$ {(lucroFixos + lucroVariavelB2C).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#ef4444' }}>(-) Investimento:</span>
                            <span style={{ color: '#ef4444' }}>R$ {investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ borderTop: '1px solid gray', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px' }}>
                            <span>(=) Lucro Líquido:</span>
                            <span style={{ color: lucroFinalB2C >= 0 ? '#8b5cf6' : '#ef4444' }}>R$ {lucroFinalB2C.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>

                          <br />
                          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>3. ROI Real</div>
                          <div style={{ fontSize: '12px' }}>
                            (Lucro Líquido / Investimento) x 100
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', background: darkMode ? '#1e293b' : '#f1f5f9', padding: '8px', borderRadius: '4px' }}>
                            <span>ROI Final:</span>
                            <span style={{ fontWeight: 'bold', fontSize: '16px', color: roiRealPercentB2C >= 0 ? '#8b5cf6' : '#ef4444' }}>
                              {roiRealPercentB2C.toFixed(2)}%
                            </span>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Outras análises */}
        {!['overview', 'adset-quality', 'adset-drill', 'all-ads', 'sales-performance', 'cohort-analysis', 'ads-drilldown', 'temporal-overview', 'temporal-adsets', 'temporal-sales', 'temporal-campaigns', 'campaign-overview', 'temporal-leads-comparison', 'temporal-qualified-leads', 'temporal-high-income-leads', 'temporal-sales-comparison', 'conversion-time-analysis', 'capture-time-sales', 'churn-analysis', 'weekday-hourly-analysis', 'revenue-analysis', 'budget-performance-analysis', 'monthly-analysis', 'roi-analysis'].includes(selectedAnalysis) && (
          <div className="card">
            <h2>{analysisCategories.flatMap(cat => cat.type === 'category' ? cat.subItems || [] : [{ key: cat.key, label: cat.label }]).find(a => a.key === selectedAnalysis)?.label}</h2>
            <p>Esta análise será implementada em breve.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
