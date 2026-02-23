import { useState, useEffect, useMemo } from 'react'
import { Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { BarChart2, ChevronDown, ChevronUp, Users, Disc3 } from 'lucide-react'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

interface QueueAnalyticsProps {
  queue: any[]
  provider: 'spotify' | 'youtube'
  eventId: string
}

// Curated palette for charts
const CHART_COLORS = [
  'rgba(30,215,96,0.85)',
  'rgba(0,206,209,0.85)',
  'rgba(138,43,226,0.85)',
  'rgba(255,107,107,0.85)',
  'rgba(255,193,7,0.85)',
  'rgba(233,30,99,0.85)',
  'rgba(0,150,136,0.85)',
  'rgba(63,81,181,0.85)',
  'rgba(255,152,0,0.85)',
  'rgba(96,125,139,0.85)',
]

export default function QueueAnalytics({ queue, provider }: QueueAnalyticsProps) {
  const [expanded, setExpanded] = useState(false)

  const artistData = useMemo(() => {
    const artists: Record<string, { votes: number; songs: number }> = {}
    queue.forEach(item => {
      const name = item.artist || 'Desconocido'
      if (!artists[name]) artists[name] = { votes: 0, songs: 0 }
      artists[name].votes += item.votes || 0
      artists[name].songs += 1
    })
    // Sort by votes desc, take top 8
    const sorted = Object.entries(artists)
      .sort((a, b) => b[1].votes - a[1].votes)
      .slice(0, 8)

    return {
      labels: sorted.map(([name]) => name.length > 20 ? name.slice(0, 18) + '…' : name),
      datasets: [{
        label: 'Votos',
        data: sorted.map(([, v]) => v.votes),
        backgroundColor: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderRadius: 6,
        borderSkipped: false,
      }]
    }
  }, [queue])

  const genreData = useMemo(() => {
    const genres: Record<string, number> = {}
    queue.forEach(item => {
      const g = item.genre && item.genre !== 'unknown' ? item.genre : null
      if (g) {
        genres[g] = (genres[g] || 0) + (item.votes || 0)
      }
    })
    const sorted = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 6)
    if (sorted.length === 0) return null

    return {
      labels: sorted.map(([name]) => name),
      datasets: [{
        data: sorted.map(([, v]) => v),
        backgroundColor: sorted.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
        borderWidth: 0,
        hoverOffset: 6,
      }]
    }
  }, [queue])

  const totalVotes = useMemo(() => queue.reduce((s, q) => s + (q.votes || 0), 0), [queue])
  const uniqueArtists = useMemo(() => new Set(queue.map(q => q.artist)).size, [queue])

  if (queue.length === 0) return null

  return (
    <div className="queue-analytics">
      <button
        onClick={() => setExpanded(!expanded)}
        className="analytics-toggle"
      >
        <div className="analytics-toggle-left">
          <BarChart2 className="analytics-icon" />
          <span>Análisis de la Fiesta</span>
        </div>
        <div className="analytics-toggle-right">
          <div className="analytics-stat">
            <Users size={14} />
            <span>{uniqueArtists} artistas</span>
          </div>
          <div className="analytics-stat">
            <Disc3 size={14} />
            <span>{totalVotes} votos</span>
          </div>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="analytics-content">
          {/* Artist votes chart */}
          <div className="analytics-chart-section">
            <h4 className="analytics-chart-title">🎤 Top Artistas por Votos</h4>
            <div className="analytics-chart-container">
              <Bar 
                data={artistData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(15,15,25,0.95)',
                      titleColor: '#1ed760',
                      bodyColor: '#fff',
                      borderColor: 'rgba(30,215,96,0.2)',
                      borderWidth: 1,
                      cornerRadius: 8,
                      padding: 10,
                    },
                  },
                  scales: {
                    x: {
                      grid: { color: 'rgba(255,255,255,0.05)' },
                      ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 11 } },
                    },
                    y: {
                      grid: { display: false },
                      ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 12, weight: 500 } },
                    },
                  },
                }} 
              />
            </div>
          </div>

          {/* Genre doughnut (only if data exists) */}
          {genreData && (
            <div className="analytics-chart-section">
              <h4 className="analytics-chart-title">🎵 Géneros Musicales</h4>
              <div className="analytics-doughnut-container">
                <Doughnut 
                  data={genreData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgba(255,255,255,0.7)',
                          font: { size: 12 },
                          padding: 12,
                          usePointStyle: true,
                          pointStyleWidth: 10,
                        },
                      },
                      tooltip: {
                        backgroundColor: 'rgba(15,15,25,0.95)',
                        titleColor: '#1ed760',
                        bodyColor: '#fff',
                        cornerRadius: 8,
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .queue-analytics {
          margin-top: 24px;
          background: linear-gradient(135deg, rgba(15,15,25,0.95), rgba(25,20,40,0.9));
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          overflow: hidden;
        }
        .analytics-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          background: none;
          border: none;
          color: rgba(255,255,255,0.85);
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        .analytics-toggle:hover {
          background: rgba(255,255,255,0.03);
        }
        .analytics-toggle-left {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }
        .analytics-icon {
          width: 18px;
          height: 18px;
          color: #1ed760;
        }
        .analytics-toggle-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .analytics-stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
        }
        .analytics-content {
          padding: 0 16px 16px;
          animation: analyticsSlideIn 0.3s ease-out;
        }
        @keyframes analyticsSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .analytics-chart-section {
          margin-bottom: 16px;
        }
        .analytics-chart-section:last-child {
          margin-bottom: 0;
        }
        .analytics-chart-title {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.7);
          margin: 0 0 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .analytics-chart-container {
          height: 220px;
        }
        .analytics-doughnut-container {
          height: 180px;
        }
      `}</style>
    </div>
  )
}
