import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar, Line, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface ChartComponentProps {
  type: 'bar' | 'line' | 'doughnut'
  data: any
  options?: any
  darkMode?: boolean
  className?: string
  height?: number
}

const ChartComponent: React.FC<ChartComponentProps> = ({ 
  type, 
  data, 
  options = {}, 
  darkMode = false,
  className = '',
  height = 300
}) => {
  const textColor = darkMode ? '#e2e8f0' : '#1e293b'
  const gridColor = darkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(226, 232, 240, 0.8)'

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textColor,
          font: {
            size: 12,
            weight: '600' as const
          }
        }
      },
      title: {
        display: true,
        color: textColor,
        font: {
          size: 16,
          weight: '700' as const
        }
      }
    },
    scales: type !== 'doughnut' ? {
      x: {
        ticks: {
          color: textColor,
          font: {
            size: 11
          }
        },
        grid: {
          color: gridColor
        }
      },
      y: {
        ticks: {
          color: textColor,
          font: {
            size: 11
          }
        },
        grid: {
          color: gridColor
        }
      }
    } : {}
  }

  const mergedOptions = { ...defaultOptions, ...options }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data} options={mergedOptions} />
      case 'line':
        return <Line data={data} options={mergedOptions} />
      case 'doughnut':
        return <Doughnut data={data} options={mergedOptions} />
      default:
        return <Bar data={data} options={mergedOptions} />
    }
  }

  return (
    <div className={`w-full ${className}`} style={{ height: `${height}px` }}>
      {renderChart()}
    </div>
  )
}

export default ChartComponent


