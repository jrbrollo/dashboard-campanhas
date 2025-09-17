import React, { useState, useEffect, useMemo } from 'react'
import ChartComponent from './ChartComponent'
import DataStatus from './DataStatus'
import { useDataManager } from '../hooks/useDataManager'
import { dataService } from '../services/dataService'

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

interface Filters {
  platform: string
  incomeRange: string
  adset: string
  ad: string
  month: string
}

// interface AnalysisType {
//   key: string
//   label: string
//   disabled?: boolean
// }

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
    setFileUploaded
  } = useDataManager()
  const [filters, setFilters] = useState<Filters>({
    platform: 'all',
    incomeRange: 'all',
    adset: 'all',
    ad: 'all',
    month: 'all'
  })
  const [selectedAnalysis, setSelectedAnalysis] = useState('overview')
  const [darkMode, setDarkMode] = useState(() => {
    // Verificar se há preferência salva no localStorage, senão usar modo escuro como padrão
    const saved = localStorage.getItem('darkMode')
    return saved !== null ? JSON.parse(saved) : true
  })
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isDataSectionExpanded, setIsDataSectionExpanded] = useState(false)

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

  const isCategoryExpanded = (category: string) => {
    return expandedCategories.includes(category)
  }

  const incomeLabels = {
    "menos_do_que_r$3.000": "Menos de R$ 3.000",
    "r$3.000_a_r$5.999": "R$ 3.000 - R$ 5.999",
    "r$6.000_a_r$9.999": "R$ 6.000 - R$ 9.999",
    "r$10.000_a_r$14.999": "R$ 10.000 - R$ 14.999",
    "r$15.000_a_r$19.999": "R$ 15.000 - R$ 19.999",
    "r$20.000_a_r$29.999": "R$ 20.000 - R$ 29.999",
    "acima_de_r$30.000": "Acima de R$ 30.000"
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
    const emailSet = new Set<string>() // Para detectar duplicatas por e-mail
    
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
      
      // Verificar duplicata por e-mail
      const emailLower = email.trim().toLowerCase()
      if (emailSet.has(emailLower)) {
        console.warn(`Linha ${i + 1}: Lead duplicado com e-mail "${email}" foi ignorado`)
        continue
      }
      
      emailSet.add(emailLower)
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
        alert(`Planilha processada com sucesso!\n\n${totalProcessed} leads válidos foram carregados.\n\nNota: Leads sem e-mail ou com e-mails duplicados foram automaticamente ignorados.`)
        
        // Salvar no Supabase se disponível
        if (isSupabaseAvailable) {
          console.log('💾 Salvando leads no Supabase...')
          await saveLeads(data)
          console.log('✅ Leads salvos com sucesso')
          
          // Extrair dados manuais do CSV se existirem
          console.log('🔍 Extraindo dados da campanha do CSV...')
          const manualData = await dataService.extractManualDataFromCSV(data)
          if (manualData) {
            console.log('📊 Dados da campanha extraídos:', manualData)
            console.log('🔍 Dados extraídos do CSV:', {
              vendas_efetuadas: manualData.vendas_efetuadas,
              vendas_planejamento: manualData.vendas_planejamento,
              vendas_seguros: manualData.vendas_seguros,
              vendas_credito: manualData.vendas_credito,
              faturamento_total: manualData.faturamento_total,
              faturamento_planejamento: manualData.faturamento_planejamento,
              faturamento_seguros: manualData.faturamento_seguros,
              faturamento_credito: manualData.faturamento_credito
            })
            
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
            console.log('💾 Salvando dados da campanha no Supabase...')
            await dataService.saveCampaignData(manualData)
            console.log('✅ Dados da campanha salvos com sucesso')
          } else {
            console.log('⚠️ Nenhum dado da campanha encontrado no CSV')
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

  const parseDate = (s: string): Date | null => { 
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

  const filteredData = useMemo(() => {
    const platformCol = ['platform', 'Platform', 'plataforma', 'Plataforma']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const adCol = ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'AdName']
    const createdCol = ['created_time']
    
    return csvData.filter(row => {
      const platform = getColumnValue(row, platformCol)
      const income = getColumnValue(row, incomeCol)
      const adset = getColumnValue(row, adsetCol)
      const ad = getColumnValue(row, adCol)
      if (filters.platform !== 'all' && platform !== filters.platform) return false
      if (filters.incomeRange !== 'all' && income !== filters.incomeRange) return false
      if (filters.adset !== 'all' && adset !== filters.adset) return false
      if (filters.ad !== 'all' && ad !== filters.ad) return false
      if (filters.month !== 'all') {
        const created = getColumnValue(row, createdCol)
        const leadDate = parseDate(created)
        if (leadDate) {
          const monthKey = formatMonthYear(leadDate)
          if (monthKey !== filters.month) return false
        } else {
          return false
        }
      }
      return true
    })
  }, [csvData, filters])

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

  const hasValidSale = (row: LeadData): boolean => {
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const raw = getColumnValue(row, salesCol)
    if (!raw || String(raw).trim() === '') return false
    // Verificar se não é apenas um separador de CSV
    if (String(raw).includes(';')) return false
    const num = parseFloat(String(raw).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
    return num > 0
  }

  const salesFromCSV = useMemo(() => {
    return filteredData.filter(row => hasValidSale(row)).length
  }, [filteredData])

  // Calcular clientes únicos que compraram (qualquer produto)
  const uniqueBuyers = useMemo(() => {
    const buyers = new Set<string>()
    filteredData.forEach(row => {
      // Verificar se comprou planejamento
      const planejamento = getColumnValue(row, ['Venda_planejamento'])
      if (planejamento && String(planejamento).trim() !== '' && !String(planejamento).includes(';')) {
        const valor = parseFloat(String(planejamento).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        if (valor > 0) {
          buyers.add(row.email || '')
        }
      }
      
      // Verificar se comprou seguros
      const seguros = getColumnValue(row, ['venda_seguros'])
      if (seguros && String(seguros).trim() !== '' && !String(seguros).includes(';')) {
        const valor = parseFloat(String(seguros).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        if (valor > 0) {
          buyers.add(row.email || '')
        }
      }
      
      // Verificar se comprou crédito
      const credito = getColumnValue(row, ['venda_credito'])
      if (credito && String(credito).trim() !== '' && !String(credito).includes(';')) {
        const valor = parseFloat(String(credito).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        if (valor > 0) {
          buyers.add(row.email || '')
        }
      }
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
  // Calcular clientes únicos que compraram planejamento (para métrica de reunião → venda)
  const uniquePlanejamentoBuyers = useMemo(() => {
    const buyers = new Set<string>()
    filteredData.forEach(row => {
      const planejamento = getColumnValue(row, ['Venda_planejamento'])
      if (planejamento && String(planejamento).trim() !== '' && !String(planejamento).includes(';')) {
        const valor = parseFloat(String(planejamento).replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        if (valor > 0) {
          buyers.add(row.email || '')
        }
      }
    })
    return buyers.size
  }, [filteredData])

  const taxaReuniaoVenda = manualInputs.reunioesAgendadas > 0 ? (uniquePlanejamentoBuyers / manualInputs.reunioesAgendadas) * 100 : 0
  const taxaRealizacaoReuniao = manualInputs.reunioesAgendadas > 0 ? (manualInputs.reunioesRealizadas / manualInputs.reunioesAgendadas) * 100 : 0
  const taxaLeadVenda = totalLeads > 0 ? (uniquePlanejamentoBuyers / totalLeads) * 100 : 0
  const custoPerLead = totalLeads > 0 ? manualInputs.verbaGasta / totalLeads : 0

  const getIncomeScore = (income: string): number => ({
    "menos_do_que_r$3.000": 1,
    "r$3.000_a_r$5.999": 2,
    "r$6.000_a_r$9.999": 3,
    "r$10.000_a_r$14.999": 4,
    "r$15.000_a_r$19.999": 5,
    "r$20.000_a_r$29.999": 6,
    "acima_de_r$30.000": 7
  }[income] || 0)

  const isQualifiedLead = (income: string): boolean => (
    income === 'r$6.000_a_r$9.999' || income === 'r$10.000_a_r$14.999' || 
    income === 'r$15.000_a_r$19.999' || income === 'r$20.000_a_r$29.999' || income === 'acima_de_r$30.000'
  )
  
  const isHighIncomeLead = (income: string): boolean => (
    income === 'r$10.000_a_r$14.999' || income === 'r$15.000_a_r$19.999' || 
    income === 'r$20.000_a_r$29.999' || income === 'acima_de_r$30.000'
  )

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
      value: filteredData.filter(r => getColumnValue(r, incomeCol) === key).length
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
    { stage: 'Vendas', value: manualInputs.vendasEfetuadas }
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
    const adsets = Array.from(new Set(filteredData.map(r => getColumnValue(r, adsetCol)).filter(Boolean)))
    return adsets.map(adset => {
      const leads = filteredData.filter(r => getColumnValue(r, adsetCol) === adset)
      const total = leads.length
      const distribution = Object.keys(incomeLabels).map(key => {
        const count = leads.filter(r => getColumnValue(r, incomeCol) === key).length
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
    const combos = new Set()
    const out: any[] = []
    filteredData.forEach(r => {
      const ad = getColumnValue(r, adCol)
      const adset = getColumnValue(r, adsetCol)
      const k = `${ad}|||${adset}`
      if (ad && adset && !combos.has(k)) { combos.add(k); out.push({ad, adset}) }
    })
    return out.map(c => {
      const leads = filteredData.filter(r => getColumnValue(r, adCol) === c.ad && getColumnValue(r, adsetCol) === c.adset)
      const total = leads.length
      const avgScore = total > 0 ? leads.reduce((s, r) => s + getIncomeScore(getColumnValue(r, incomeCol)), 0) / total : 0
      const hi = leads.filter(r => isHighIncomeLead(getColumnValue(r, incomeCol))).length
      return { ...c, totalLeads: total, avgIncomeScore: avgScore.toFixed(2), qualityRank: avgScore, highIncomeLeads: hi, highIncomePercentage: total > 0 ? (hi / total) * 100 : 0 }
    }).sort((a, b) => b.totalLeads - a.totalLeads)
  }

  // Função para drill-down de anúncios por conjunto
  const getAdsByAdsetDrillDown = () => {
    const adsSales = (() => {
      const adCol = ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'ad_name', 'AdName']
      const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'adset_name', 'AdsetName']
      const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
      const combos = new Set()
      const out: any[] = []
      filteredData.forEach(r => {
        const ad = getColumnValue(r, adCol)
        const adset = getColumnValue(r, adsetCol)
        const k = `${ad}|||${adset}`
        if (ad && adset && !combos.has(k)) { combos.add(k); out.push({ad, adset}) }
      })
      return out.map(c => {
        const leads = filteredData.filter(r => getColumnValue(r, adCol) === c.ad && getColumnValue(r, adsetCol) === c.adset)
        const totalLeads = leads.length
        const withSales = leads.filter(row => {
          const raw = String(getColumnValue(row, salesCol) || '').trim()
          const val = parseFloat(raw.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
          return val > 0
        })
        const totalSales = withSales.length
        const totalRevenue = withSales.reduce((s, row) => {
          const raw = String(getColumnValue(row, salesCol) || '')
          const val = parseFloat(raw.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
          return s + val
        }, 0)
        const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0
        const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
        return { ad: c.ad, adset: c.adset, totalLeads, totalSales, totalRevenue, avgTicket, conversionRate }
      }).sort((a, b) => b.totalRevenue - a.totalRevenue)
    })()
    const byAdset = getAdsetSalesData().filter(a => a.totalSales > 0).map(adsetData => {
      const ads = adsSales.filter(a => a.adset === adsetData.adset && a.totalSales > 0)
        .map(a => ({ ...a, percentOfAdset: adsetData.totalRevenue > 0 ? (a.totalRevenue / adsetData.totalRevenue) * 100 : 0 }))
        .sort((x, y) => y.totalRevenue - x.totalRevenue)
      return { adsetData, ads }
    }).sort((x, y) => y.adsetData.totalRevenue - x.adsetData.totalRevenue)
    return byAdset
  }

  // Função unificada para cálculo de vendas mensais
  const getSalesDataByDateType = (dateType: 'leadDate' | 'saleDate' = 'saleDate') => {
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const createdCol = ['created_time']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const monthly: any = {}
    
    filteredData.forEach(row => {
      const rawSale = getColumnValue(row, salesCol)
      const saleValue = parseFloat(String(rawSale || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
      if (saleValue <= 0) return
      
      let dateToUse: Date | null = null
      if (dateType === 'leadDate') {
        dateToUse = parseDate(getColumnValue(row, createdCol))
      } else {
        dateToUse = parseDate(getColumnValue(row, saleDateCol))
      }
      
      if (dateToUse) {
        const monthKey = formatMonthYear(dateToUse)
        if (!monthKey) return
        
        if (!monthly[monthKey]) {
          monthly[monthKey] = {
            month: getMonthName(monthKey),
            monthKey,
            salesCount: 0,
            totalRevenue: 0
          }
        }
        
        monthly[monthKey].salesCount++
        monthly[monthKey].totalRevenue += saleValue
      }
    })
    
    return Object.keys(monthly).sort().map(k => monthly[k])
  }

  // Análise de qualidade por conjunto
  // const getAdsetQuality = () => {
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const adsets = Array.from(new Set(filteredData.map(r => getColumnValue(r, adsetCol)).filter(Boolean)))

    return adsets.map(adset => {
      const leads = filteredData.filter(r => getColumnValue(r, adsetCol) === adset)
      const totalLeads = leads.length
      const qualifiedLeads = leads.filter(r => {
        const income = getColumnValue(r, incomeCol)
        return isQualifiedLead(income)
      }).length
      const highIncomeLeads = leads.filter(r => {
        const income = getColumnValue(r, incomeCol)
        return isHighIncomeLead(income)
      }).length
      const avgIncomeScore = totalLeads > 0 ? leads.reduce((s, r) => s + getIncomeScore(getColumnValue(r, incomeCol)), 0) / totalLeads : 0

      return {
        adset,
        totalLeads,
        qualifiedLeads,
        highIncomeLeads,
        qualifiedRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
        highIncomeRate: totalLeads > 0 ? (highIncomeLeads / totalLeads) * 100 : 0,
        avgIncomeScore: avgIncomeScore.toFixed(2),
        qualityRank: avgIncomeScore
      }
    }).sort((a, b) => b.qualityRank - a.qualityRank)
  }

  // Análise de vendas por conjunto
  const getAdsetSalesData = () => {
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const adsets = Array.from(new Set(filteredData.map(r => getColumnValue(r, adsetCol)).filter(Boolean)))
    
    return adsets.map(adset => {
      const leads = filteredData.filter(r => getColumnValue(r, adsetCol) === adset)
      const totalLeads = leads.length
      const withSales = leads.filter(row => {
        const raw = String(getColumnValue(row, salesCol) || '').trim()
        const val = parseFloat(raw.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        return val > 0
      })
      const totalSales = withSales.length
      const totalRevenue = withSales.reduce((s, row) => {
        const raw = String(getColumnValue(row, salesCol) || '')
        const val = parseFloat(raw.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
        return s + val
      }, 0)
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0
      const conversionRate = totalLeads > 0 ? (totalSales / totalLeads) * 100 : 0
      
      return { adset, totalLeads, totalSales, totalRevenue, avgTicket, conversionRate }
    }).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }

  // Todos os anúncios
  // const getAllAds = () => {
    const adCol = ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'AdName']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const incomeCol = ['qual_sua_renda_mensal?', 'qual_sua_renda_mensal', 'renda', 'Renda', 'income']
    const combos = new Set()
    const out: any[] = []
    
    filteredData.forEach(r => {
      const ad = getColumnValue(r, adCol)
      const adset = getColumnValue(r, adsetCol)
      const k = `${ad}|||${adset}`
      if (ad && adset && !combos.has(k)) { 
        combos.add(k)
        out.push({ad, adset})
      }
    })
    
    return out.map(c => {
      const leads = filteredData.filter(r => getColumnValue(r, adCol) === c.ad && getColumnValue(r, adsetCol) === c.adset)
      const total = leads.length
      const avgScore = total > 0 ? leads.reduce((s, r) => s + getIncomeScore(getColumnValue(r, incomeCol)), 0) / total : 0
      const hi = leads.filter(r => isHighIncomeLead(getColumnValue(r, incomeCol))).length
      return { 
        ...c, 
        totalLeads: total, 
        avgIncomeScore: avgScore.toFixed(2), 
        qualityRank: avgScore, 
        highIncomeLeads: hi, 
        highIncomePercentage: total > 0 ? (hi / total) * 100 : 0 
      }
    }).sort((a, b) => b.totalLeads - a.totalLeads)
  }

  // Análise temporal geral
  const getTemporalOverviewData = () => {
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
  }

  // Análise temporal por conjunto
  const getTemporalAdsetData = () => {
    const createdCol = ['created_time']
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const adsetCol = ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
    const map: any = {}
    
    // Processar leads por mês de criação e adset
    filteredData.forEach(row => {
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
    filteredData.forEach(row => {
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
  }

  // Análise temporal de vendas
  const getTemporalSalesData = () => {
    const salesData = getSalesDataByDateType('saleDate')
    return salesData.map(item => ({
      ...item,
      avgTicket: item.salesCount > 0 ? item.totalRevenue / item.salesCount : 0
    }))
  }

  // Análise de tempo de conversão
  const getConversionTimeAnalysis = () => {
    const createdCol = ['created_time']
    const saleDateCol = ['Data_da_venda', 'data_da_venda', 'sale_date']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
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
  }

  // Análise de tempo de conversão por mês
  const getConversionTimeByMonth = () => {
    const conversions = getConversionTimeAnalysis()
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
  }

  // Análise por dia da semana
  const getWeekdayAnalysis = () => {
    const createdCol = ['created_time']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
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
      
      // Vendas: se esse lead (gerado neste dia) teve venda (independente de quando)
      const rawSale = getColumnValue(row, salesCol)
      const saleValue = parseFloat(String(rawSale || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
      if (saleValue > 0) {
        weekdayData[weekdayIndex].sales++
        weekdayData[weekdayIndex].totalRevenue += saleValue
      }
    })
    
    return weekdayData.map(day => ({
      ...day,
      qualifiedRate: day.totalLeads > 0 ? (day.qualifiedLeads / day.totalLeads) * 100 : 0,
      highIncomeRate: day.totalLeads > 0 ? (day.highIncomeLeads / day.totalLeads) * 100 : 0,
      conversionRate: day.totalLeads > 0 ? (day.sales / day.totalLeads) * 100 : 0,
      avgTicket: day.sales > 0 ? day.totalRevenue / day.sales : 0
    }))
  }

  // Análise por horário
  const getHourlyAnalysis = () => {
    const createdCol = ['created_time']
    const salesCol = ['Venda_planejamento', 'Venda_efetuada', 'venda_efetuada', 'venda', 'Venda', 'sale', 'Sale']
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
      
      // Vendas: se esse lead (gerado neste horário) teve venda (independente de quando)
      const rawSale = getColumnValue(row, salesCol)
      const saleValue = parseFloat(String(rawSale || '').replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0
      if (saleValue > 0) {
        hourlyData[hour].sales++
        hourlyData[hour].totalRevenue += saleValue
      }
    })
    
    return hourlyData.map(hour => ({
      ...hour,
      qualifiedRate: hour.totalLeads > 0 ? (hour.qualifiedLeads / hour.totalLeads) * 100 : 0,
      highIncomeRate: hour.totalLeads > 0 ? (hour.highIncomeLeads / hour.totalLeads) * 100 : 0,
      conversionRate: hour.totalLeads > 0 ? (hour.sales / hour.totalLeads) * 100 : 0,
      avgTicket: hour.sales > 0 ? hour.totalRevenue / hour.sales : 0
    }))
  }


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
      key: 'sales-analysis',
      label: '💰 Análise de Vendas',
      type: 'category',
      subItems: [
        { key: 'sales-performance', label: '📊 Performance de Vendas', disabled: !salesFromCSV },
        { key: 'temporal-sales', label: '📈 Performance Temporal de Vendas', disabled: !salesFromCSV },
        { key: 'temporal-sales-comparison', label: '📅 Comparação Mensal - Vendas Efetivadas', disabled: !salesFromCSV },
        { key: 'conversion-time-analysis', label: '⏱️ Análise de Tempo de Conversão', disabled: !salesFromCSV },
        { key: 'revenue-analysis', label: '💰 Análise de Receita com LTV e Churn', disabled: !salesFromCSV },
        { key: 'budget-performance-analysis', label: '💸 Análise de Verba vs Performance', disabled: !salesFromCSV }
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
        <div className="grid grid-3 mb-8">
          <div className="kpi">
            <div className="icon">💰</div>
            <div className="label">Verba Gasta</div>
            <div className="value">R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
          </div>
          <div className="kpi">
            <div className="icon">🎯</div>
            <div className="label">Vendas Totais</div>
            <div className="value">{manualInputs.vendasEfetuadas}</div>
          </div>
          <div className="kpi">
            <div className="icon">📈</div>
            <div className="label">Faturamento Total</div>
            <div className="value">R$ {manualInputs.faturamentoTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
          </div>
          <div className="kpi">
            <div className="icon">📉</div>
            <div className="label">Taxa de Churn</div>
            <div className="value">{manualInputs.churnRate.toFixed(1)}%</div>
          </div>
          <div className="kpi">
            <div className="icon">📅</div>
            <div className="label">Reuniões Agendadas</div>
            <div className="value">{manualInputs.reunioesAgendadas}</div>
          </div>
          <div className="kpi">
            <div className="icon">✅</div>
            <div className="label">Reuniões Realizadas</div>
            <div className="value">{manualInputs.reunioesRealizadas}</div>
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
          <div className="grid grid-3 mb-8">
            <div className="kpi">
              <div className="icon">📋</div>
              <div className="label">Planejamento</div>
              <div className="value">{manualInputs.vendasPlanejamento}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoPlanejamento.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
            <div className="kpi">
              <div className="icon">🛡️</div>
              <div className="label">Seguros</div>
              <div className="value">{manualInputs.vendasSeguros}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoSeguros.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
            <div className="kpi">
              <div className="icon">💳</div>
              <div className="label">Crédito</div>
              <div className="value">{manualInputs.vendasCredito}</div>
              <div className="sub-value">R$ {manualInputs.faturamentoCredito.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-4 mb-8">
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
          <div className="icon">🚀</div>
          <div className="label">LTGP/CAC</div>
          <div className="value">{ltgpCac.toFixed(2)}x</div>
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
      </div>

      {/* Filtros */}
      <div className="card mb-8">
        <h2>Filtros de Análise</h2>
        <div className="grid grid-5">
          <div>
            <label>Plataforma</label>
            <select
              value={filters.platform}
              onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
            >
              <option value="all">Todas</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
            </select>
          </div>
          <div>
            <label>Faixa de Renda</label>
            <select
              value={filters.incomeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, incomeRange: e.target.value }))}
            >
              <option value="all">Todas</option>
              {Object.entries(incomeLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Conjunto</label>
            <select
              value={filters.adset}
              onChange={(e) => setFilters(prev => ({ ...prev, adset: e.target.value }))}
            >
              <option value="all">Todos</option>
              {Array.from(new Set(filteredData.map(r => getColumnValue(r, ['adset_name', 'adset', 'Adset', 'conjunto', 'AdsetName'])).filter(Boolean))).map(adset => (
                <option key={adset} value={adset}>{adset}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Anúncio</label>
            <select
              value={filters.ad}
              onChange={(e) => setFilters(prev => ({ ...prev, ad: e.target.value }))}
            >
              <option value="all">Todos</option>
              {Array.from(new Set(filteredData.map(r => getColumnValue(r, ['ad_name', 'ad', 'Ad', 'anuncio', 'anúncio', 'AdName'])).filter(Boolean))).map(ad => (
                <option key={ad} value={ad}>{ad}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Mês</label>
            <select
              value={filters.month}
              onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
            >
              <option value="all">Todos</option>
              {Array.from(new Set(filteredData.map(r => {
                const created = getColumnValue(r, ['created_time'])
                const leadDate = parseDate(created)
                return leadDate ? formatMonthYear(leadDate) : null
              }).filter(Boolean))).map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
            <h3 style={{marginTop: 0}}>Visão Geral das Campanhas</h3>
            
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

            <h4 style={{marginTop: 32}}>Performance por Conjunto de Anúncios</h4>
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
            
            <h4 style={{marginTop: 32}}>Distribuição por Faixa de Renda</h4>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start'}}>
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
                        <td style={{fontSize: '13px'}}>{item.name}</td>
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

        {/* Qualidade por Conjunto */}
        {selectedAnalysis === 'adset-quality' && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Qualidade por Conjunto de Anúncios</h3>
            <p className="muted">Análise da qualidade dos leads por conjunto, baseada na renda</p>
            
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
            <h3 style={{marginTop: 0}}>Drill-Down por Conjunto de Anúncios</h3>
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
            <h3 style={{marginTop: 0}}>Todos os Anúncios</h3>
            <p className="muted">Performance de todos os anúncios por qualidade de leads</p>
            
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
                      <span className={getPerformanceColorClass(item.highIncomePercentage, {good: 50, medium: 25})}>
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
        {selectedAnalysis === 'sales-performance' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Performance de Vendas por Conjunto</h3>
            <p className="muted">Análise de vendas, receita e conversão por conjunto de anúncios</p>
            
            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">🎯</div>
                <div className="label">Total Vendas</div>
                <div className="value">{getAdsetSalesData().reduce((sum, item) => sum + item.totalSales, 0)}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">💰</div>
                <div className="label">Faturamento Total</div>
                <div className="value">R$ {(getAdsetSalesData().reduce((sum, item) => sum + item.totalRevenue, 0)/1000).toFixed(0)}k</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">🏆</div>
                <div className="label">Melhor Conjunto</div>
                <div className="value" title={getAdsetSalesData()[0]?.adset}>{getAdsetSalesData()[0]?.adset.substring(0, 20)}...</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">📊</div>
                <div className="label">Taxa de Conversão</div>
                <div className="value">{(() => {
                  const adsetData = getAdsetSalesData();
                  const totalLeads = adsetData.reduce((sum, item) => sum + item.totalLeads, 0);
                  const totalSales = adsetData.reduce((sum, item) => sum + item.totalSales, 0);
                  return totalLeads > 0 ? ((totalSales / totalLeads) * 100).toFixed(1) : 0;
                })()}%</div>
              </div>
            </div>
            
            <table className="table">
              <thead>
                <tr>
                  <th>Conjunto</th>
                  <th>Leads</th>
                  <th>Vendas</th>
                  <th>Taxa Conversão</th>
                  <th>Receita Total</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {getAdsetSalesData().slice(0, 20).map((item, i) => (
                  <tr key={i}>
                    <td>{item.adset}</td>
                    <td><span className="highlight">{item.totalLeads}</span></td>
                    <td><span className="highlight">{item.totalSales}</span></td>
                    <td>
                      <span className={getPerformanceColorClass(item.conversionRate, {good: 10, medium: 5})}>
                        {item.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td><span className="highlight">R$ {item.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                    <td><span className="highlight">R$ {item.avgTicket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Drill-Down Anúncios por Conjunto */}
        {selectedAnalysis === 'ads-drilldown' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{marginTop: 0}}>Drill-Down Anúncios por Conjunto</h3>
            <p className="muted">Detalhamento da contribuição de cada anúncio dentro dos conjuntos</p>
            
            {getAdsByAdsetDrillDown().slice(0, 10).map((group, gi) => (
              <div key={gi} style={{marginBottom: '32px'}}>
                  <h4 className="border-bottom" style={{marginBottom: '16px'}}>
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
                    <div className="label">R$ {group.adsetData.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                    <div className="value">R$ {(group.adsetData.totalRevenue/1000).toFixed(0)}k</div>
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
                        <td><span className="highlight">R$ {ad.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                        <td>
                          <span className={ad.percentOfAdset >= 50 ? 'text-green' : 'text-gray'}>
                            {ad.percentOfAdset.toFixed(1)}%
                          </span>
                        </td>
                        <td>
                          <span className={getPerformanceColorClass(ad.conversionRate, {good: 10, medium: 5})}>
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
                    <strong>Melhor anúncio:</strong> {group.ads[0]?.ad} ({group.ads[0]?.percentOfAdset.toFixed(1)}% do faturamento)<br/>
                    <strong>Concentração:</strong> {group.ads.length <= 2 ? 'Alta' : group.ads.length <= 4 ? 'Média' : 'Baixa'} (anúncio líder {group.ads.length > 0 ? 'representa' : ''} {group.ads[0]?.percentOfAdset >= 50 ? 'mais da metade' : group.ads[0]?.percentOfAdset >= 30 ? 'cerca de 1/3' : 'uma parte'} do faturamento)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Performance Temporal - Geral */}
        {selectedAnalysis === 'temporal-overview' && (
          <div className="card">
            <h3 style={{marginTop: 0}}>🔥 Performance Temporal da Campanha - Visão Geral</h3>
            <p className="muted">Evolução mensal de leads, leads qualificados e vendas</p>
            
            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: getTemporalOverviewData().map(item => item.month),
                datasets: [
                  {
                    label: 'Total de Leads',
                    data: getTemporalOverviewData().map(item => item.totalLeads),
                    backgroundColor: '#3b82f6',
                    borderColor: '#1e40af',
                    borderWidth: 2
                  },
                  {
                    label: 'Leads Qualificados',
                    data: getTemporalOverviewData().map(item => item.qualifiedLeads),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 2
                  },
                  {
                    label: 'Leads Alta Renda',
                    data: getTemporalOverviewData().map(item => item.highIncomeLeads),
                    backgroundColor: '#8b5cf6',
                    borderColor: '#7c3aed',
                    borderWidth: 2
                  },
                  {
                    label: 'Vendas',
                    data: getTemporalOverviewData().map(item => item.sales),
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 2
                  },
                  {
                    label: 'Tendência Leads',
                    data: calculateTrendline(getTemporalOverviewData().map(item => item.totalLeads)),
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
                    data: calculateTrendline(getTemporalOverviewData().map(item => item.sales)),
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
            <h3 style={{marginTop: 0}}>📊 Performance Temporal por Conjunto de Anúncios</h3>
            <p className="muted">Performance mensal de cada conjunto de anúncios</p>
            
            <ChartComponent
              type="line"
              darkMode={darkMode}
              data={{
                labels: [...new Set(getTemporalAdsetData().map(item => item.month))],
                datasets: [...new Set(getTemporalAdsetData().map(item => item.adset))].slice(0, 6).map((adset, i) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                  const adsetData = getTemporalAdsetData().filter(item => item.adset === adset);
                  const months = [...new Set(getTemporalAdsetData().map(item => item.month))];
                  const data = months.map(month => {
                    const found = adsetData.find(item => item.month === month);
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
                {getTemporalAdsetData().slice(0, 50).map((item, i) => (
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
            <h3 style={{marginTop: 0}}>💰 Performance Temporal de Vendas</h3>
            <p className="muted">Evolução da receita e ticket médio ao longo do tempo</p>
            
            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: getTemporalSalesData().map(item => item.month),
                datasets: [
                  {
                    label: 'Receita Total (R$)',
                    data: getTemporalSalesData().map(item => item.totalRevenue),
                    backgroundColor: '#10b981',
                    borderColor: '#059669',
                    borderWidth: 2,
                    yAxisID: 'y'
                  },
                  {
                    label: 'Ticket Médio (R$)',
                    data: getTemporalSalesData().map(item => item.avgTicket),
                    backgroundColor: '#f59e0b',
                    borderColor: '#d97706',
                    borderWidth: 2,
                    yAxisID: 'y1'
                  }
                ]
              }}
              options={{
                plugins: {
                  title: {
                    display: true,
                    text: 'Evolução da Receita e Ticket Médio',
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
                {getTemporalSalesData().map((item, i) => (
                  <tr key={i}>
                    <td>{item.month}</td>
                    <td><span className="highlight">{item.salesCount}</span></td>
                    <td><span className="highlight">R$ {item.totalRevenue.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                    <td><span className="highlight">R$ {item.avgTicket.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Comparação Mensal - Leads */}
        {(selectedAnalysis === 'temporal-leads-comparison' || selectedAnalysis === 'temporal-qualified-leads' || selectedAnalysis === 'temporal-high-income-leads' || selectedAnalysis === 'temporal-sales-comparison') && (
          <div className="card">
            <h3 style={{marginTop: 0}}>
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
            
            <ChartComponent
              type="bar"
              darkMode={darkMode}
              data={{
                labels: getTemporalOverviewData().map(item => item.month),
                datasets: [{
                  label: selectedAnalysis === 'temporal-leads-comparison' ? 'Total de Leads' :
                         selectedAnalysis === 'temporal-qualified-leads' ? 'Leads Qualificados' :
                         selectedAnalysis === 'temporal-high-income-leads' ? 'Leads Alta Renda' :
                         'Vendas',
                  data: getTemporalOverviewData().map(item => 
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
                  data: calculateTrendline(getTemporalOverviewData().map(item => 
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
                {getTemporalOverviewData().map((monthData, i) => (
                  <tr key={i}>
                    <td>{monthData.month}</td>
                    {selectedAnalysis === 'temporal-leads-comparison' && (
                      <>
                        <td><span className="highlight">{monthData.totalLeads}</span></td>
                        <td>
                          <span className={getPerformanceColorClass(
                            (monthData.totalLeads / getTemporalOverviewData().reduce((sum, m) => sum + m.totalLeads, 0)) * 100,
                            { good: 20, medium: 10 }
                          )}>
                            {((monthData.totalLeads / getTemporalOverviewData().reduce((sum, m) => sum + m.totalLeads, 0)) * 100).toFixed(1)}%
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
          </div>
        )}

        {/* Análise de Tempo de Conversão */}
        {selectedAnalysis === 'conversion-time-analysis' && salesFromCSV > 0 && (
          <div className="card">
            <h3 style={{marginTop: 0}}>⏱️ Análise de Tempo de Conversão</h3>
            <p className="muted">Tempo entre entrada do lead e fechamento da venda</p>
            
            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">⏱️</div>
                <div className="label">Tempo Médio</div>
                <div className="value">{(() => {
                  const conversions = getConversionTimeAnalysis()
                  const times = conversions.map(c => c.conversionDays)
                  return times.length > 0 ? (times.reduce((a,b) => a+b, 0) / times.length).toFixed(1) : 0
                })()} dias</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">🎯</div>
                <div className="label">Total Conversões</div>
                <div className="value">{getConversionTimeAnalysis().length}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">⚡</div>
                <div className="label">Mais Rápida</div>
                <div className="value">{(() => {
                  const times = getConversionTimeAnalysis().map(c => c.conversionDays).sort((a,b) => a-b)
                  return times.length > 0 ? times[0] : 0
                })()} dias</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">💎</div>
                <div className="label">Alta Renda Média</div>
                <div className="value">{(() => {
                  const highIncomeConversions = getConversionTimeAnalysis().filter(c => c.isHighIncome)
                  return highIncomeConversions.length > 0 ? 
                    (highIncomeConversions.reduce((a,b) => a + b.conversionDays, 0) / highIncomeConversions.length).toFixed(1) : 0
                })()} dias</div>
              </div>
            </div>
            
            <div style={{marginBottom: '32px'}}>
              <h4>Tempo Médio de Conversão por Mês</h4>
              <ChartComponent
                type="line"
                darkMode={darkMode}
                data={{
                  labels: getConversionTimeByMonth().map(item => item.month),
                  datasets: [
                    {
                      label: 'Tempo Médio (dias)',
                      data: getConversionTimeByMonth().map(item => item.avgDays),
                      borderColor: '#3b82f6',
                      backgroundColor: '#3b82f620',
                      borderWidth: 3,
                      fill: true,
                      tension: 0.3
                    },
                    {
                      label: 'Tempo Mediano (dias)',
                      data: getConversionTimeByMonth().map(item => item.medianDays),
                      borderColor: '#10b981',
                      backgroundColor: 'transparent',
                      borderWidth: 2,
                      borderDash: [3, 3],
                      fill: false
                    },
                    {
                      label: 'Tendência',
                      data: calculateTrendline(getConversionTimeByMonth().map(item => item.avgDays)),
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
                {getConversionTimeByMonth().map((item, i) => (
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
                        <span className="text-small" style={{marginLeft: '8px'}}>
                          ({item.totalSales > 0 ? ((item.qualifiedConversions/item.totalSales)*100).toFixed(0) : 0}%)
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Performance por Dia e Horário */}
        {selectedAnalysis === 'weekday-hourly-analysis' && (
          <div className="card">
            <h3 style={{marginTop: 0}}>🕐 Performance por Dia da Semana e Horário</h3>
            <p className="muted">Análise de padrões temporais de geração de leads e conversões</p>
            
            <div className="summary-cards">
              <div className="summary-card animate-fade-in-up animate-delay-100">
                <div className="icon">📊</div>
                <div className="label">Melhor Dia</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis();
                  const bestDay = weekdayData.reduce((max, day) => day.totalLeads > max.totalLeads ? day : max, weekdayData[0]);
                  return bestDay ? bestDay.weekday : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-200">
                <div className="icon">🕐</div>
                <div className="label">Melhor Horário</div>
                <div className="value">{(() => {
                  const hourlyData = getHourlyAnalysis();
                  const bestHour = hourlyData.reduce((max, hour) => hour.totalLeads > max.totalLeads ? hour : max, hourlyData[0]);
                  return bestHour ? bestHour.hourLabel : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-300">
                <div className="icon">💎</div>
                <div className="label">Dia + Qualificado</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis();
                  const bestQualified = weekdayData.reduce((max, day) => day.qualifiedRate > max.qualifiedRate ? day : max, weekdayData[0]);
                  return bestQualified ? `${bestQualified.weekday} (${bestQualified.qualifiedRate.toFixed(1)}%)` : '-';
                })()}</div>
              </div>
              <div className="summary-card animate-fade-in-up animate-delay-400">
                <div className="icon">🎯</div>
                <div className="label">Dia + Converte</div>
                <div className="value">{(() => {
                  const weekdayData = getWeekdayAnalysis().filter(d => d.sales > 0);
                  if (weekdayData.length === 0) return '-';
                  const bestConversion = weekdayData.reduce((max, day) => day.conversionRate > max.conversionRate ? day : max, weekdayData[0]);
                  return `${bestConversion.weekday} (${bestConversion.conversionRate.toFixed(1)}%)`;
                })()}</div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px'}}>
              <div>
                <h4>Performance por Dia da Semana</h4>
                <ChartComponent
                  type="bar"
                  height={300}
                  darkMode={darkMode}
                  data={{
                    labels: getWeekdayAnalysis().map(item => item.weekday),
                    datasets: [
                      {
                        label: 'Total Leads',
                        data: getWeekdayAnalysis().map(item => item.totalLeads),
                        backgroundColor: '#3b82f6',
                        borderColor: '#1e40af',
                        borderWidth: 2
                      },
                      {
                        label: 'Leads Qualificados',
                        data: getWeekdayAnalysis().map(item => item.qualifiedLeads),
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
                    labels: getHourlyAnalysis().map(item => item.hourLabel),
                    datasets: [
                      {
                        label: 'Total Leads',
                        data: getHourlyAnalysis().map(item => item.totalLeads),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3
                      },
                      {
                        label: 'Leads Qualificados',
                        data: getHourlyAnalysis().map(item => item.qualifiedLeads),
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
                {getWeekdayAnalysis().map((item, i) => (
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
            <h3 style={{marginTop: 0}}>💰 Análise de Receita com LTV e Churn</h3>
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
                <div className="value">R$ {(salesFromCSV * LTV_FIXO).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="summary-card">
                <div className="icon">⚠️</div>
                <div className="label">Impacto Churn</div>
                <div className="value">R$ {(salesFromCSV * LTV_FIXO * manualInputs.churnRate / 100).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="summary-card">
                <div className="icon">✅</div>
                <div className="label">Receita Líquida</div>
                <div className="value">R$ {(salesFromCSV * LTV_FIXO * (1 - manualInputs.churnRate / 100)).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px'}}>
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
                        salesFromCSV * LTV_FIXO * (1 - manualInputs.churnRate / 100)
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
                          callback: function(value) {
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
                          callback: function(value) {
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

            <div style={{marginBottom: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '12px'}}>
              <h4 style={{margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8'}}>💡 O que significa LTGP/CAC?</h4>
              <p style={{margin: 0, fontSize: '14px'}}>
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
                  <td>R$ {LTV_FIXO.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td>Valor total de um cliente ao longo da vida</td>
                  <td className="text-green">📊 Por cliente</td>
                </tr>
                <tr>
                  <td><strong>Taxa de Churn</strong></td>
                  <td>{manualInputs.churnRate.toFixed(1)}%</td>
                  <td>Percentual de clientes que cancelam</td>
                  <td className={manualInputs.churnRate <= 5 ? 'text-green' : manualInputs.churnRate <= 10 ? 'text-orange' : 'text-red'}>
                    {manualInputs.churnRate <= 5 ? '✅ Baixo' : manualInputs.churnRate <= 10 ? '⚠️ Moderado' : '❌ Alto'}
                  </td>
                </tr>
                <tr>
                  <td><strong>CAC (Custo por Cliente)</strong></td>
                  <td>R$ {cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                  <td>Custo para adquirir um novo cliente</td>
                  <td className={cac < ltgp * 0.33 ? 'text-green' : cac < ltgp * 0.5 ? 'text-orange' : 'text-red'}>
                    {cac < ltgp * 0.33 ? '✅ Excelente' : cac < ltgp * 0.5 ? '⚠️ Razoável' : '❌ Alto'}
                  </td>
                </tr>
                <tr>
                  <td><strong>LTGP (Lifetime Gross Profit)</strong></td>
                  <td>R$ {ltgp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
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
            <h3 style={{marginTop: 0}}>💸 Análise de Verba vs Performance</h3>
            <p className="muted">Análise do retorno sobre investimento em campanhas e eficiência da verba aplicada</p>
            
            <div className="summary-cards">
              <div className="summary-card">
                <div className="icon">💰</div>
                <div className="label">Verba Total Gasta</div>
                <div className="value">R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="summary-card">
                <div className="icon">💵</div>
                <div className="label">CAC (Custo por Cliente)</div>
                <div className="value">R$ {cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
              </div>
              <div className="summary-card">
                <div className="icon">💎</div>
                <div className="label">LTGP (LTV × Margem)</div>
                <div className="value">R$ {ltgp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
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

            <div style={{marginBottom: '24px', padding: '16px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', borderRadius: '12px'}}>
              <h4 style={{margin: '0 0 8px 0', color: darkMode ? '#60a5fa' : '#1d4ed8'}}>💡 O que significa LTGP/CAC?</h4>
              <p style={{margin: 0, fontSize: '14px'}}>
                <strong>LTGP/CAC = {ltgpCac.toFixed(2)}x</strong> significa que para cada R$ 1,00 investido em verba de campanha, 
                você gera <strong>R$ {ltgpCac.toFixed(2)}</strong> de lucro bruto por cliente (LTV × margem bruta). 
                {ltgpCac >= 3 ? ' ✅ Excelente!' : ltgpCac >= 2 ? ' ⚠️ Razoável, pode melhorar.' : ' ❌ Atenção: baixo retorno.'}
              </p>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px'}}>
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
                          callback: function(value: any) {
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
                    labels: getTemporalSalesData().map(item => item.month),
                    datasets: [
                      {
                        label: 'Vendas por Mês',
                        data: getTemporalSalesData().map(item => item.salesCount),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f620',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                      },
                      {
                        label: 'CAC Teórico (R$)',
                        data: getTemporalSalesData().map(item => 
                          item.salesCount > 0 ? manualInputs.verbaGasta / salesFromCSV : 0
                        ),
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
                          callback: function(value: any) {
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

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px'}}>
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
                    labels: getTemporalSalesData().map(item => item.month),
                    datasets: [{
                      label: 'Receita Mensal (R$)',
                      data: getTemporalSalesData().map(item => item.totalRevenue),
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
                          callback: function(value: any) {
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
                    <td>R$ {manualInputs.verbaGasta.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
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
                    <td>R$ {cac.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td>Custo para adquirir cada cliente</td>
                    <td className={cac < ltgp * 0.33 ? 'text-green' : cac < ltgp * 0.5 ? 'text-orange' : 'text-red'}>
                      {cac < ltgp * 0.33 ? '✅ Excelente' : cac < ltgp * 0.5 ? '⚠️ Razoável' : '❌ Alto'}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>LTGP (Lifetime Gross Profit)</strong></td>
                    <td>R$ {ltgp.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
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

            <div style={{marginTop: '32px'}}>
              <h4>Insights e Recomendações</h4>
              <div style={{display: 'grid', gap: '16px'}}>
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
                  <div key={i} className="pill" style={{textAlign: 'left', padding: '12px', background: darkMode ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff'}}>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Outras análises */}
        {!['overview', 'adset-quality', 'adset-drill', 'all-ads', 'sales-performance', 'ads-drilldown', 'temporal-overview', 'temporal-adsets', 'temporal-sales', 'temporal-leads-comparison', 'temporal-qualified-leads', 'temporal-high-income-leads', 'temporal-sales-comparison', 'conversion-time-analysis', 'weekday-hourly-analysis', 'revenue-analysis', 'budget-performance-analysis'].includes(selectedAnalysis) && (
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
