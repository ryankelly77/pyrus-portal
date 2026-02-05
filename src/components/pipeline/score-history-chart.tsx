'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'

interface ScoreHistoryPoint {
  id: string
  confidence_score: number
  confidence_percent: number
  weighted_monthly: number
  weighted_onetime: number
  trigger_source: string
  scored_at: string
}

interface ScoreHistoryChartProps {
  recommendationId: string
  height?: number
}

// Format trigger source for display
function formatTriggerSource(source: string): string {
  const labels: Record<string, string> = {
    invite_sent: 'Invite Sent',
    call_score_updated: 'Call Score Updated',
    status_changed: 'Status Changed',
    communication_logged: 'Communication Logged',
    highlevel_sync: 'HighLevel Sync',
    email_opened: 'Email Opened',
    proposal_viewed: 'Proposal Viewed',
    account_created: 'Account Created',
    tracking_event: 'Tracking Event',
    daily_cron: 'Daily Update',
    manual_refresh: 'Manual Refresh',
    unknown: 'System Update',
  }
  return labels[source] || source.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

// Format date for X-axis
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Custom tooltip component
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload
  const date = new Date(data.scored_at)

  return (
    <div className="score-history-tooltip">
      <div className="tooltip-date">
        {date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })}
      </div>
      <div className="tooltip-score">
        Score: <strong>{data.confidence_score}</strong>
      </div>
      <div className="tooltip-mrr">
        Weighted MRR: <strong>${data.weighted_monthly.toLocaleString()}</strong>
      </div>
      <div className="tooltip-trigger">
        {formatTriggerSource(data.trigger_source)}
      </div>
      <style jsx>{`
        .score-history-tooltip {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-size: 13px;
        }
        .tooltip-date {
          color: #6B7280;
          margin-bottom: 8px;
          font-size: 12px;
        }
        .tooltip-score {
          color: #111827;
          margin-bottom: 4px;
        }
        .tooltip-mrr {
          color: #111827;
          margin-bottom: 8px;
        }
        .tooltip-trigger {
          color: #6B7280;
          font-size: 11px;
          padding-top: 8px;
          border-top: 1px solid #E5E7EB;
        }
      `}</style>
    </div>
  )
}

export function ScoreHistoryChart({ recommendationId, height = 200 }: ScoreHistoryChartProps) {
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/recommendations/${recommendationId}/score-history`)
        if (!res.ok) throw new Error('Failed to fetch score history')
        const data = await res.json()
        setHistory(data.history || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [recommendationId])

  if (loading) {
    return (
      <div className="score-history-loading" style={{ height }}>
        <div className="loading-skeleton" />
        <style jsx>{`
          .score-history-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F9FAFB;
            border-radius: 8px;
          }
          .loading-skeleton {
            width: 80%;
            height: 60%;
            background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="score-history-error" style={{ height }}>
        <span>{error}</span>
        <style jsx>{`
          .score-history-error {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #FEF2F2;
            border-radius: 8px;
            color: #DC2626;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="score-history-empty" style={{ height }}>
        <span>No score history yet</span>
        <style jsx>{`
          .score-history-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            background: #F9FAFB;
            border-radius: 8px;
            color: #6B7280;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  if (history.length === 1) {
    const point = history[0]
    return (
      <div className="score-history-single" style={{ height }}>
        <div className="single-score">
          <span className="score-value">{point.confidence_score}</span>
          <span className="score-label">Current Score</span>
        </div>
        <div className="single-note">Score history will build over time</div>
        <style jsx>{`
          .score-history-single {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #F9FAFB;
            border-radius: 8px;
            gap: 8px;
          }
          .single-score {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .score-value {
            font-size: 32px;
            font-weight: 600;
            color: ${point.confidence_score >= 70 ? '#059669' : point.confidence_score >= 40 ? '#D97706' : '#DC2626'};
          }
          .score-label {
            font-size: 12px;
            color: #6B7280;
          }
          .single-note {
            font-size: 12px;
            color: #9CA3AF;
          }
        `}</style>
      </div>
    )
  }

  // Format data for chart
  const chartData = history.map(point => ({
    ...point,
    dateLabel: formatDate(point.scored_at),
  }))

  return (
    <div className="score-history-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0.1}/>
            </linearGradient>
          </defs>

          {/* Reference areas for score zones */}
          <ReferenceArea y1={70} y2={100} fill="#059669" fillOpacity={0.08} />
          <ReferenceArea y1={40} y2={70} fill="#D97706" fillOpacity={0.08} />
          <ReferenceArea y1={0} y2={40} fill="#DC2626" fillOpacity={0.08} />

          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />

          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />

          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            ticks={[0, 25, 50, 75, 100]}
          />

          {/* Reference lines for thresholds */}
          <ReferenceLine y={70} stroke="#059669" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={40} stroke="#D97706" strokeDasharray="3 3" strokeOpacity={0.5} />

          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="confidence_score"
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ fill: '#2563EB', strokeWidth: 0, r: 4 }}
            activeDot={{ fill: '#2563EB', strokeWidth: 2, stroke: '#fff', r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ScoreHistoryChart
