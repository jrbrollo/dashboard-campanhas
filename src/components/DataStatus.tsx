import React from 'react'
import { isDataServiceAvailable } from '../services/dataService'

interface DataStatusProps {
  lastSaved?: Date | null
  isLoading?: boolean
  lastLeadDate?: Date | null
}

const DataStatus: React.FC<DataStatusProps> = ({ lastSaved, isLoading, lastLeadDate }) => {
  const isSupabaseAvailable = isDataServiceAvailable()

  if (!isSupabaseAvailable) {
    return (
      <div className="data-status offline">
        <div className="status-indicator">
          <span className="status-dot offline"></span>
          <span className="status-text">Modo Offline</span>
        </div>
        <div className="status-description">
          <p>Dados salvos localmente. Configure o Supabase para persistência.</p>
          <a 
            href="https://supabase.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="config-link"
          >
            Como configurar Supabase →
          </a>
        </div>
      </div>
    )
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="data-status-compact online">
      <div className="status-indicator-compact">
        <span className={`status-dot online ${isLoading ? 'loading' : ''}`}></span>
        <span className="status-text-compact">
          {isLoading ? 'Salvando...' : 'Conectado'}
        </span>
      </div>
      {lastLeadDate && (
        <div className="last-update-indicator">
          <span className="update-icon">🕒</span>
          <span className="update-text">
            Atualizado: {formatDate(lastLeadDate)}
          </span>
        </div>
      )}
    </div>
  )
}

export default DataStatus
