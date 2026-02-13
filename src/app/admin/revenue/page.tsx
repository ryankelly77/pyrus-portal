'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { MRRChart, MRRDataPoint } from '@/components/charts/MRRChart'

// Dynamically import Pipeline component to avoid large bundle
const PipelineDashboardEmbed = dynamic(
  () => import('@/components/pipeline/PipelineDashboardEmbed').then(mod => ({ default: mod.PipelineDashboardEmbed })),
  { loading: () => <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>Loading pipeline...</div> }
)

type MainTab = 'revenue' | 'pipeline'

interface VolumeDataPoint {
  month: string
  label: string
  volume: number
  cumulative: number
}

interface PipelineBucketStats {
  weighted_mrr: number
  raw_mrr: number
  deal_count: number
  avg_confidence: number
}

interface PipelineOnHoldStats {
  weighted_mrr: number
  raw_mrr: number
  deal_count: number
}

interface ClosingSoonDeal {
  id: string
  client_name: string
  client_id: string
  rep_full_name: string | null
  predicted_monthly: number
  confidence_score: number
  weighted_monthly: number
  age_days: number
}

interface PipelineSummary {
  current_mrr: number
  active_client_count: number
  closing_soon: PipelineBucketStats
  in_pipeline: PipelineBucketStats
  at_risk: PipelineBucketStats
  on_hold: PipelineOnHoldStats
  projected_mrr: number
  potential_growth: number
  last_updated: string | null
  closing_soon_deals: ClosingSoonDeal[]
}

function NetVolumeChart({ data, height = 200 }: { data: VolumeDataPoint[]; height?: number }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; cumulative: number } | null>(null)

  if (data.length === 0) return null

  const width = 400
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const cumulativeValues = data.map(d => d.cumulative)
  const maxValue = Math.max(...cumulativeValues, 100)
  const yMax = maxValue * 1.1
  const yRange = yMax || 1

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - (d.cumulative / yRange) * chartHeight
    return { x, y, cumulative: d.cumulative, label: d.label }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = linePath + ` L${points[points.length - 1].x},${padding.top + chartHeight} L${points[0].x},${padding.top + chartHeight} Z`

  const yAxisLabels = [0, 1, 2, 3].map(i => {
    const value = (yRange * (3 - i)) / 3
    const y = padding.top + (i / 3) * chartHeight
    return { value: Math.round(value), y }
  })

  const formatCurrency = (value: number) => {
    if (value >= 1000) return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    return `$${value}`
  }

  return (
    <div style={{ position: 'relative' }}>
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${(tooltip.x / width) * 100}%`,
          top: `${(tooltip.y / height) * 100}%`,
          transform: 'translate(-50%, -130%)',
          background: '#1F2937',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {tooltip.label}: ${tooltip.cumulative.toLocaleString()}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
        {yAxisLabels.map((label, i) => (
          <line key={i} x1={padding.left} y1={label.y} x2={width - padding.right} y2={label.y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray={i === yAxisLabels.length - 1 ? undefined : "4"} />
        ))}
        <defs>
          <linearGradient id="volumeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#volumeGradient)" />
        <path d={linePath} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i} style={{ cursor: 'pointer' }} onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, cumulative: p.cumulative })} onMouseLeave={() => setTooltip(null)}>
            <circle cx={p.x} cy={p.y} r={12} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3} fill="#059669" />
          </g>
        ))}
        {yAxisLabels.map((label, i) => (
          <text key={i} x={padding.left - 8} y={label.y + 4} fill="#9CA3AF" fontSize="10" textAnchor="end">{formatCurrency(label.value)}</text>
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 10} fill="#9CA3AF" fontSize="11" textAnchor="middle">{p.label}</text>
        ))}
      </svg>
    </div>
  )
}

function GrowthBarsChart({ data }: { data: MRRDataPoint[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; label: string; change: number } | null>(null)

  if (data.length < 2) return null

  const recentData = data.slice(-6)
  const changes = recentData.slice(1).map((month, i) => ({
    month: month.month,
    label: month.label,
    change: month.mrr - recentData[i].mrr
  }))

  if (changes.length === 0) return null

  const maxChange = Math.max(...changes.map(c => Math.abs(c.change)), 1)

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-around',
      height: '180px',
      padding: '20px 10px',
      gap: '16px'
    }}>
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: `${tooltip.x}%`,
          top: '20px',
          transform: 'translateX(-50%)',
          background: '#1F2937',
          color: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {tooltip.label}: {tooltip.change >= 0 ? '+' : ''}{tooltip.change < 0 ? '-' : ''}${Math.abs(tooltip.change).toLocaleString()}
        </div>
      )}
      {changes.map((item, i) => {
        const heightPercent = item.change === 0 ? 5 : Math.max(5, Math.min(Math.abs(item.change) / maxChange * 80, 80))
        const xPercent = ((i + 0.5) / changes.length) * 100
        return (
          <div
            key={item.month}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              height: '100%',
              justifyContent: 'flex-end',
              cursor: 'pointer'
            }}
            onMouseEnter={() => setTooltip({ x: xPercent, label: item.label, change: item.change })}
            onMouseLeave={() => setTooltip(null)}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '40px',
                minHeight: '4px',
                height: `${heightPercent}%`,
                borderRadius: '4px 4px 0 0',
                background: item.change >= 0 ? '#059669' : '#EF4444',
                transition: 'height 0.3s ease'
              }}
            />
            <span style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '8px' }}>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

interface ScheduledCancellation {
  id: string
  subscriptionId: string
  productId: string
  productName: string
  clientId: string
  clientName: string
  termEndDate: string
  termEndDateFormatted: string
  monthlyAmount: number
  billingTermMonths: number
  monthsRemaining: number
}

export default function AdminRevenuePage() {
  const { user, hasNotifications } = useUserProfile()

  // Main tab state
  const [mainTab, setMainTab] = useState<MainTab>('revenue')

  const [mrrChartData, setMrrChartData] = useState<MRRDataPoint[]>([])
  const [volumeData, setVolumeData] = useState<{ month: string; label: string; volume: number; cumulative: number }[]>([])
  const [stats, setStats] = useState({
    currentMRR: 0,
    mrrChange: 0,
    avgGrowthPercent: 0,
    totalNetVolume: 0,
    churnRate: 0,
    churnedSubscriptions: 0,
    churnedMRR: 0,
  })
  const [loading, setLoading] = useState(true)
  const [scheduledCancellations, setScheduledCancellations] = useState<ScheduledCancellation[]>([])
  const [scheduledStats, setScheduledStats] = useState({
    totalItems: 0,
    totalScheduledMRR: 0,
    itemsEndingSoon: 0,
  })
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null)
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [refreshingScores, setRefreshingScores] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [refreshingData, setRefreshingData] = useState(false)

  const fetchMRRData = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshingData(true)
    try {
      const url = forceRefresh ? '/api/admin/dashboard/mrr?refresh=true' : '/api/admin/dashboard/mrr'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMrrChartData(data.chartData || [])
        setVolumeData(data.volumeData || [])
        setStats({
          currentMRR: data.currentMRR || 0,
          mrrChange: data.mrrChange || 0,
          avgGrowthPercent: data.avgGrowthPercent || 0,
          totalNetVolume: data.totalNetVolume || 0,
          churnRate: data.churnRate || 0,
          churnedSubscriptions: data.churnedSubscriptions || 0,
          churnedMRR: data.churnedMRR || 0,
        })
        setLastUpdated(data.lastUpdated || null)
      }
    } catch (error) {
      console.error('Failed to fetch MRR data:', error)
    } finally {
      setLoading(false)
      setRefreshingData(false)
    }
  }

  useEffect(() => {
    fetchMRRData()
  }, [])

  useEffect(() => {
    async function fetchScheduledCancellations() {
      try {
        const res = await fetch('/api/admin/scheduled-cancellations')
        if (res.ok) {
          const data = await res.json()
          setScheduledCancellations(data.items || [])
          setScheduledStats(data.summary || { totalItems: 0, totalScheduledMRR: 0, itemsEndingSoon: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch scheduled cancellations:', error)
      }
    }
    fetchScheduledCancellations()
  }, [])

  useEffect(() => {
    async function fetchPipelineSummary() {
      try {
        const res = await fetch('/api/admin/revenue/pipeline-summary')
        if (res.ok) {
          const data = await res.json()
          setPipelineSummary(data)
        }
      } catch (error) {
        console.error('Failed to fetch pipeline summary:', error)
      } finally {
        setPipelineLoading(false)
      }
    }
    fetchPipelineSummary()
  }, [])

  const handleRefreshScores = async () => {
    setRefreshingScores(true)
    try {
      const res = await fetch('/api/pipeline/recalculate', { method: 'POST' })
      if (res.ok) {
        // Refetch pipeline summary after recalculation
        const summaryRes = await fetch('/api/admin/revenue/pipeline-summary')
        if (summaryRes.ok) {
          const data = await summaryRes.json()
          setPipelineSummary(data)
        }
      }
    } catch (error) {
      console.error('Failed to refresh scores:', error)
    } finally {
      setRefreshingScores(false)
    }
  }

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <>
      <AdminHeader
        title="Revenue & Pipeline"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <p style={{ margin: 0 }}>Track your monthly recurring revenue and growth metrics</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '0.813rem', color: 'var(--text-secondary)' }}>
                Updated {formatLastUpdated(lastUpdated)}
              </span>
              <button
                onClick={() => fetchMRRData(true)}
                disabled={refreshingData}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.813rem',
                  fontWeight: 500,
                  cursor: refreshingData ? 'wait' : 'pointer',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  opacity: refreshingData ? 0.7 : 1,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="14"
                  height="14"
                  style={{ animation: refreshingData ? 'spin 1s linear infinite' : 'none' }}
                >
                  <path d="M21 12a9 9 0 1 1-9-9"></path>
                  <polyline points="21 3 21 9 15 9"></polyline>
                </svg>
                {refreshingData ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              className={`tab ${mainTab === 'revenue' ? 'active' : ''}`}
              onClick={() => setMainTab('revenue')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: mainTab === 'revenue' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: mainTab === 'revenue' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Revenue & MRR
            </button>
            <button
              className={`tab ${mainTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setMainTab('pipeline')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: mainTab === 'pipeline' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: mainTab === 'pipeline' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Sales Pipeline
            </button>
          </div>
        </div>

        {/* Revenue Tab */}
        {mainTab === 'revenue' && (
          <>
        {/* Main Layout: Pipeline Cards on LEFT, Charts on RIGHT */}
        <div className="revenue-layout">
          {/* Left Column: Pipeline Projection Cards */}
          <div className="pipeline-projection-column">
            {/* Focal Card: Projected MRR */}
            <div className="projected-mrr-card">
              <div className="projected-mrr-header">
                <span className="projected-mrr-label">Projected MRR</span>
                <Link href="/admin/pipeline" className="view-pipeline-link">
                  View Pipeline →
                </Link>
              </div>
              <div className="projected-mrr-value">
                {pipelineLoading ? '...' : (() => {
                  const pendingBillingDate = new Date('2026-02-17')
                  const hasPending = new Date() < pendingBillingDate
                  const pendingAmount = 300
                  const displayProjected = hasPending
                    ? (pipelineSummary?.projected_mrr || 0) + pendingAmount
                    : (pipelineSummary?.projected_mrr || 0)
                  return `$${displayProjected.toLocaleString()}/mo`
                })()}
              </div>

              {!pipelineLoading && pipelineSummary && (
                <div className="projected-mrr-breakdown">
                  <div className="breakdown-row">
                    <span className="breakdown-label">Current MRR</span>
                    <span className="breakdown-value">
                      {(() => {
                        const pendingBillingDate = new Date('2026-02-17')
                        const hasPending = new Date() < pendingBillingDate
                        const pendingAmount = 300
                        const displayMRR = hasPending
                          ? pipelineSummary.current_mrr + pendingAmount
                          : pipelineSummary.current_mrr
                        return (
                          <>
                            ${displayMRR.toLocaleString()}
                            {hasPending && <span className="breakdown-detail">(incl. $300 pending)</span>}
                          </>
                        )
                      })()}
                    </span>
                  </div>
                  {pipelineSummary.closing_soon.deal_count > 0 && (
                    <div className="breakdown-row">
                      <span className="breakdown-label">Closing Soon</span>
                      <span className="breakdown-value green">
                        +${pipelineSummary.closing_soon.weighted_mrr.toLocaleString()}
                        <span className="breakdown-detail">({pipelineSummary.closing_soon.deal_count} deals, avg {pipelineSummary.closing_soon.avg_confidence}%)</span>
                      </span>
                    </div>
                  )}
                  {pipelineSummary.in_pipeline.deal_count > 0 && (
                    <div className="breakdown-row">
                      <span className="breakdown-label">In Pipeline</span>
                      <span className="breakdown-value blue">
                        +${pipelineSummary.in_pipeline.weighted_mrr.toLocaleString()}
                        <span className="breakdown-detail">({pipelineSummary.in_pipeline.deal_count} deals, avg {pipelineSummary.in_pipeline.avg_confidence}%)</span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {!pipelineLoading && pipelineSummary && pipelineSummary.potential_growth > 0 && (
                <div className="potential-growth">
                  ▲ ${pipelineSummary.potential_growth.toLocaleString()} potential growth from active pipeline
                </div>
              )}

              {!pipelineLoading && pipelineSummary && pipelineSummary.potential_growth === 0 && (
                <div className="no-pipeline">
                  No active pipeline deals. Projected MRR equals current MRR.
                </div>
              )}
            </div>

            {/* Supporting Cards Grid */}
            <div className="supporting-cards-grid">
              {/* Current MRR Card */}
              <div className="supporting-card">
                <div className="supporting-card-header">
                  <span className="supporting-card-label">Current MRR</span>
                </div>
                <div className="supporting-card-value">
                  {pipelineLoading ? '...' : (() => {
                    const pendingBillingDate = new Date('2026-02-17')
                    const hasPending = new Date() < pendingBillingDate
                    const pendingAmount = 300
                    const displayMRR = hasPending
                      ? (pipelineSummary?.current_mrr || 0) + pendingAmount
                      : (pipelineSummary?.current_mrr || 0)
                    return `$${displayMRR.toLocaleString()}`
                  })()}
                </div>
                <div className="supporting-card-detail">
                  {pipelineLoading ? '' : (() => {
                    const pendingBillingDate = new Date('2026-02-17')
                    const hasPending = new Date() < pendingBillingDate
                    const clientCount = pipelineSummary?.active_client_count || 0
                    return hasPending
                      ? `${clientCount} active clients (incl. pending)`
                      : `${clientCount} active clients`
                  })()}
                </div>
                <div className="supporting-card-subtitle">Confirmed recurring revenue</div>
              </div>

              {/* Closing Soon Card */}
              <div className="supporting-card closing-soon">
                <div className="supporting-card-header">
                  <span className="supporting-card-label">Closing Soon</span>
                </div>
                <div className="supporting-card-value green">
                  {pipelineLoading ? '...' : `$${pipelineSummary?.closing_soon.weighted_mrr.toLocaleString()}`}
                </div>
                <div className="supporting-card-detail">
                  {pipelineLoading ? '' : pipelineSummary?.closing_soon.deal_count === 0
                    ? 'No deals'
                    : `${pipelineSummary?.closing_soon.deal_count} deals, ${pipelineSummary?.closing_soon.avg_confidence}% avg`}
                </div>
                <div className="supporting-card-subtitle">High confidence, 2+ weeks active</div>
              </div>

              {/* In Pipeline Card */}
              <div className="supporting-card in-pipeline">
                <div className="supporting-card-header">
                  <span className="supporting-card-label">In Pipeline</span>
                </div>
                <div className="supporting-card-value blue">
                  {pipelineLoading ? '...' : `$${pipelineSummary?.in_pipeline.weighted_mrr.toLocaleString()}`}
                </div>
                <div className="supporting-card-detail">
                  {pipelineLoading ? '' : pipelineSummary?.in_pipeline.deal_count === 0
                    ? 'No deals'
                    : `${pipelineSummary?.in_pipeline.deal_count} deals, ${pipelineSummary?.in_pipeline.avg_confidence}% avg`}
                </div>
                <div className="supporting-card-subtitle">Active deals in progress</div>
              </div>

              {/* At Risk Card */}
              <div className="supporting-card at-risk">
                <div className="supporting-card-header">
                  <span className="supporting-card-label">At Risk</span>
                </div>
                <div className="supporting-card-value orange">
                  {pipelineLoading ? '...' : `$${pipelineSummary?.at_risk.weighted_mrr.toLocaleString()}`}
                </div>
                <div className="supporting-card-detail">
                  {pipelineLoading ? '' : pipelineSummary?.at_risk.deal_count === 0
                    ? 'No deals'
                    : `${pipelineSummary?.at_risk.deal_count} deals, ${pipelineSummary?.at_risk.avg_confidence}% avg`}
                </div>
                <div className="supporting-card-subtitle">Needs attention or archiving</div>
              </div>
            </div>

            {/* On Hold Indicator */}
            {!pipelineLoading && pipelineSummary && pipelineSummary.on_hold.deal_count > 0 && (
              <div className="on-hold-indicator">
                ⏸️ {pipelineSummary.on_hold.deal_count} deal{pipelineSummary.on_hold.deal_count !== 1 ? 's' : ''} on hold (${pipelineSummary.on_hold.raw_mrr.toLocaleString()}/mo) — snoozed with specific resume dates
              </div>
            )}

            {/* Closing Soon Mini Table */}
            {!pipelineLoading && pipelineSummary && pipelineSummary.closing_soon_deals.length > 0 && (
              <div className="closing-soon-table-card">
                <div className="closing-soon-table-header">
                  <h3>Closing Soon</h3>
                  <span className="closing-soon-count">{pipelineSummary.closing_soon_deals.length} deals</span>
                </div>
                <div className="closing-soon-table">
                  <div className="closing-soon-row closing-soon-row-header">
                    <div className="closing-soon-col col-client">Client</div>
                    <div className="closing-soon-col col-rep">Rep</div>
                    <div className="closing-soon-col col-monthly">Monthly</div>
                    <div className="closing-soon-col col-confidence">Confidence</div>
                    <div className="closing-soon-col col-weighted">Weighted</div>
                  </div>
                  {pipelineSummary.closing_soon_deals.map((deal) => (
                    <Link
                      href="/admin/pipeline"
                      key={deal.id}
                      className="closing-soon-row"
                    >
                      <div className="closing-soon-col col-client">
                        <span className="deal-client-name">{deal.client_name}</span>
                      </div>
                      <div className="closing-soon-col col-rep">
                        {deal.rep_full_name?.split(' ')[0] || '—'}
                      </div>
                      <div className="closing-soon-col col-monthly">
                        ${deal.predicted_monthly.toLocaleString()}
                      </div>
                      <div className="closing-soon-col col-confidence">
                        <span className="confidence-badge">{deal.confidence_score}%</span>
                      </div>
                      <div className="closing-soon-col col-weighted">
                        ${deal.weighted_monthly.toLocaleString()}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Data Freshness */}
            <div className="pipeline-freshness">
              <div className="freshness-left">
                <span className="freshness-label">Last updated: {formatLastUpdated(pipelineSummary?.last_updated || null)}</span>
                <button
                  className="refresh-btn"
                  onClick={handleRefreshScores}
                  disabled={refreshingScores}
                >
                  {refreshingScores ? (
                    <span className="refresh-spinner">↻</span>
                  ) : (
                    <span>↻</span>
                  )}
                </button>
              </div>
              <span className="freshness-note">Scores recalculate on every deal event and daily at midnight CST</span>
            </div>
          </div>

          {/* Right Column: Charts + Scheduled Cancellations */}
          <div className="revenue-right-column">
            <div className="revenue-charts-grid">
              {/* MRR Chart */}
              <div className="revenue-chart-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-label">MRR</span>
                    <div className="chart-value">
                      {loading ? '...' : (() => {
                        const pendingBillingDate = new Date('2026-02-17')
                        const hasPending = new Date() < pendingBillingDate
                        const displayMRR = hasPending ? stats.currentMRR + 300 : stats.currentMRR
                        return (
                          <>
                            ${displayMRR.toLocaleString()}
                            {hasPending && <span className="pending-note"> (incl. $300 pending)</span>}
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="chart-change">
                    {!loading && stats.mrrChange !== 0 && (
                      <span className={stats.mrrChange >= 0 ? 'positive' : 'negative'}>
                        {stats.mrrChange >= 0 ? '+' : ''}{stats.mrrChange.toLocaleString()} this month
                      </span>
                    )}
                  </div>
                </div>
                <div className="chart-body mrr-chart-body">
                  {loading ? (
                    <div className="chart-loading">Loading...</div>
                  ) : (
                    <MRRChart data={mrrChartData} height={200} />
                  )}
                </div>
              </div>

              {/* MRR Growth Chart */}
              <div className="revenue-chart-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-label">MRR growth rate</span>
                    <div className="chart-value">
                      {loading ? '...' : (() => {
                        const pendingBillingDate = new Date('2026-02-17')
                        const hasPending = new Date() < pendingBillingDate

                        if (hasPending) {
                          const adjustedMRR = stats.currentMRR + 300
                          const adjustmentFactor = adjustedMRR / stats.currentMRR
                          const estimatedMonths = 12
                          const adjustedRate = Math.pow(Math.pow(1 + stats.avgGrowthPercent/100, estimatedMonths) * adjustmentFactor, 1/estimatedMonths) - 1
                          const adjustedPercent = Math.round(adjustedRate * 1000) / 10
                          return (
                            <>
                              {adjustedPercent >= 0 ? '+' : ''}{adjustedPercent}%
                              <span className="pending-note"> (incl. $300 pending)</span>
                            </>
                          )
                        }
                        return `${stats.avgGrowthPercent >= 0 ? '+' : ''}${stats.avgGrowthPercent}%`
                      })()}
                    </div>
                  </div>
                  <div className="chart-change">
                    <span className="neutral">avg. month over month</span>
                  </div>
                </div>
                <div className="chart-body">
                  {loading ? (
                    <div className="chart-loading">Loading...</div>
                  ) : mrrChartData.length > 1 ? (
                    <GrowthBarsChart data={mrrChartData} />
                  ) : (
                    <div className="chart-loading">No data</div>
                  )}
                </div>
              </div>

              {/* Net Volume Chart */}
              <div className="revenue-chart-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-label">Net volume</span>
                    <div className="chart-value">
                      {loading ? '...' : `$${stats.totalNetVolume.toLocaleString()}`}
                    </div>
                  </div>
                  <div className="chart-change">
                    <span className="neutral">all time</span>
                  </div>
                </div>
                <div className="chart-body">
                  {loading ? (
                    <div className="chart-loading">Loading...</div>
                  ) : (
                    <NetVolumeChart data={volumeData} height={200} />
                  )}
                </div>
              </div>

              {/* Churn */}
              <div className="revenue-chart-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-label">Churn</span>
                    <div className="chart-value">
                      {loading ? '...' : (() => {
                        const totalSubs = Math.round(stats.churnedSubscriptions / (stats.churnRate / 100))
                        const realChurn = ((stats.churnedSubscriptions - 1) / (totalSubs - 1)) * 100
                        return `${Math.round(realChurn * 10) / 10}%`
                      })()}
                      <span className="test-note"> ({stats.churnRate}% incl. test)</span>
                    </div>
                  </div>
                  <div className="chart-change">
                    {!loading && stats.churnedSubscriptions > 1 && (
                      <span className="negative">
                        {stats.churnedSubscriptions - 1} canceled (+ 1 test)
                      </span>
                    )}
                    {!loading && stats.churnedSubscriptions === 1 && (
                      <span className="positive">No real cancellations</span>
                    )}
                    {!loading && stats.churnedSubscriptions === 0 && (
                      <span className="positive">No cancellations</span>
                    )}
                  </div>
                </div>
                <div className="chart-body">
                  <div className="churn-stats">
                    <div className="churn-stat">
                      <span className="churn-stat-label">Lost MRR</span>
                      <span className="churn-stat-value negative">
                        {loading ? '...' : (
                          <>
                            ${(stats.churnedMRR - 300).toLocaleString()}
                            <span className="test-note"> ($300 test)</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="churn-stat">
                      <span className="churn-stat-label">Canceled subscriptions</span>
                      <span className="churn-stat-value">
                        {loading ? '...' : (
                          <>
                            {stats.churnedSubscriptions - 1}
                            <span className="test-note"> (+ 1 test)</span>
                          </>
                        )}
                      </span>
                    </div>
                    <div className="churn-stat">
                      <span className="churn-stat-label">Active subscriptions</span>
                      <span className="churn-stat-value positive">
                        {loading ? '...' : stats.currentMRR > 0 ? Math.round(stats.currentMRR / (stats.currentMRR + stats.churnedMRR - 300) * 100) + '%' : '100%'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduled Cancellations Section */}
            {scheduledCancellations.length > 0 && (
              <div className="scheduled-cancellations-section">
                <div className="scheduled-card">
                  <div className="scheduled-header">
                    <div>
                      <h2>Scheduled Cancellations</h2>
                      <p className="scheduled-subtitle">Term-based subscriptions ending soon</p>
                    </div>
                    <div className="scheduled-summary">
                      <div className="scheduled-stat">
                        <span className="scheduled-total">{scheduledStats.totalItems}</span>
                        <span className="scheduled-label">active terms</span>
                      </div>
                      <div className="scheduled-stat">
                        <span className="scheduled-total warning">${scheduledStats.totalScheduledMRR.toLocaleString()}</span>
                        <span className="scheduled-label">MRR at risk</span>
                      </div>
                      {scheduledStats.itemsEndingSoon > 0 && (
                        <div className="scheduled-stat">
                          <span className="scheduled-total alert">{scheduledStats.itemsEndingSoon}</span>
                          <span className="scheduled-label">ending in 2 mo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="scheduled-table">
                    <div className="scheduled-row scheduled-row-header">
                      <div className="scheduled-col col-client">Client</div>
                      <div className="scheduled-col col-product">Product</div>
                      <div className="scheduled-col col-amount">Monthly</div>
                      <div className="scheduled-col col-term">Term</div>
                      <div className="scheduled-col col-ends">Ends</div>
                      <div className="scheduled-col col-remaining">Remaining</div>
                    </div>

                    {scheduledCancellations.map((item) => (
                      <div key={item.id} className="scheduled-row">
                        <div className="scheduled-col col-client">
                          <div className="client-info">
                            <span className="client-name">{item.clientName}</span>
                          </div>
                        </div>
                        <div className="scheduled-col col-product">
                          <span className="product-name">{item.productName}</span>
                        </div>
                        <div className="scheduled-col col-amount">
                          <span className="amount-value">${item.monthlyAmount.toLocaleString()}</span>
                        </div>
                        <div className="scheduled-col col-term">
                          <span className="term-badge">{item.billingTermMonths} mo</span>
                        </div>
                        <div className="scheduled-col col-ends">
                          <span className="date-value">{item.termEndDateFormatted}</span>
                        </div>
                        <div className="scheduled-col col-remaining">
                          <span className={`remaining-badge ${item.monthsRemaining <= 2 ? 'urgent' : item.monthsRemaining <= 4 ? 'warning' : ''}`}>
                            {item.monthsRemaining} mo left
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
          </>
        )}

        {/* Pipeline Tab */}
        {mainTab === 'pipeline' && (
          <PipelineDashboardEmbed />
        )}

      </div>

      <style jsx>{`
        .revenue-layout {
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        /* Left Column: Pipeline Projection */
        .pipeline-projection-column {
          width: 340px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Focal Card: Projected MRR */
        .projected-mrr-card {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border: 2px solid #86EFAC;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        }

        .projected-mrr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .projected-mrr-label {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .view-pipeline-link {
          font-size: 13px;
          color: #059669;
          text-decoration: none;
          font-weight: 500;
        }

        .view-pipeline-link:hover {
          text-decoration: underline;
        }

        .projected-mrr-value {
          font-size: 36px;
          font-weight: 800;
          color: #14532D;
          margin-bottom: 16px;
        }

        .projected-mrr-breakdown {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding-top: 12px;
          border-top: 1px solid rgba(5, 150, 105, 0.2);
        }

        .breakdown-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .breakdown-label {
          font-size: 13px;
          color: #166534;
        }

        .breakdown-value {
          font-size: 13px;
          font-weight: 600;
          color: #166534;
          text-align: right;
        }

        .breakdown-value.green {
          color: #059669;
        }

        .breakdown-value.blue {
          color: #2563EB;
        }

        .breakdown-detail {
          display: block;
          font-size: 11px;
          font-weight: 400;
          color: #6B7280;
        }

        .potential-growth {
          margin-top: 16px;
          padding: 12px;
          background: rgba(5, 150, 105, 0.15);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #059669;
        }

        .no-pipeline {
          margin-top: 16px;
          font-size: 13px;
          color: #6B7280;
          font-style: italic;
        }

        /* Supporting Cards Grid */
        .supporting-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .supporting-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }

        .supporting-card.closing-soon {
          border-left: 3px solid #059669;
        }

        .supporting-card.in-pipeline {
          border-left: 3px solid #2563EB;
        }

        .supporting-card.at-risk {
          border-left: 3px solid #F97316;
        }

        .supporting-card-header {
          margin-bottom: 4px;
        }

        .supporting-card-label {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .supporting-card-value {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }

        .supporting-card-value.green {
          color: #059669;
        }

        .supporting-card-value.blue {
          color: #2563EB;
        }

        .supporting-card-value.orange {
          color: #F97316;
        }

        .supporting-card-detail {
          font-size: 12px;
          color: #374151;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .supporting-card-subtitle {
          font-size: 11px;
          color: #9CA3AF;
        }

        /* On Hold Indicator */
        .on-hold-indicator {
          padding: 12px 16px;
          background: #F3F4F6;
          border-radius: 8px;
          font-size: 13px;
          color: #6B7280;
        }

        /* Closing Soon Mini Table */
        .closing-soon-table-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }

        .closing-soon-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
          border-bottom: 1px solid #E5E7EB;
        }

        .closing-soon-table-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          margin: 0;
        }

        .closing-soon-count {
          font-size: 12px;
          color: #059669;
          font-weight: 500;
        }

        .closing-soon-table {
          max-height: 240px;
          overflow-y: auto;
        }

        .closing-soon-row {
          display: grid;
          grid-template-columns: 1fr 50px 70px 60px 70px;
          gap: 8px;
          padding: 10px 16px;
          border-bottom: 1px solid #F3F4F6;
          align-items: center;
          text-decoration: none;
          color: inherit;
        }

        .closing-soon-row:hover:not(.closing-soon-row-header) {
          background: #F9FAFB;
        }

        .closing-soon-row:last-child {
          border-bottom: none;
        }

        .closing-soon-row-header {
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          position: sticky;
          top: 0;
        }

        .closing-soon-row-header .closing-soon-col {
          font-size: 10px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .closing-soon-col {
          font-size: 12px;
        }

        .col-client {
          overflow: hidden;
        }

        .deal-client-name {
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .col-rep {
          color: #6B7280;
        }

        .col-monthly,
        .col-weighted {
          font-weight: 600;
          color: #111827;
          text-align: right;
        }

        .col-confidence {
          text-align: center;
        }

        .confidence-badge {
          display: inline-block;
          padding: 2px 6px;
          background: #D1FAE5;
          color: #065F46;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        /* Data Freshness */
        .pipeline-freshness {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .freshness-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .freshness-label {
          font-size: 12px;
          color: #6B7280;
        }

        .refresh-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          color: #6B7280;
          transition: all 0.15s;
        }

        .refresh-btn:hover:not(:disabled) {
          background: #F3F4F6;
          color: #374151;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .refresh-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .freshness-note {
          font-size: 11px;
          color: #9CA3AF;
        }

        /* Right Column: Charts */
        .revenue-right-column {
          flex: 1 1 0;
          min-width: 0;
          max-width: 1100px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .revenue-charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          width: 100%;
          box-sizing: border-box;
        }

        .revenue-chart-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .chart-label {
          font-size: 13px;
          color: #6B7280;
          display: block;
          margin-bottom: 4px;
        }

        .chart-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .chart-body {
          position: relative;
        }

        .chart-change {
          font-size: 13px;
        }

        .chart-change .positive {
          color: #059669;
        }

        .chart-change .negative {
          color: #EF4444;
        }

        .chart-change .neutral {
          color: #6B7280;
        }

        .mrr-chart-body {
          min-height: 200px;
        }

        .chart-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: #9CA3AF;
          font-size: 14px;
        }

        .churn-stats {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 0;
        }

        .churn-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .churn-stat-label {
          font-size: 14px;
          color: #6B7280;
        }

        .churn-stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .churn-stat-value.positive {
          color: #059669;
        }

        .churn-stat-value.negative {
          color: #EF4444;
        }

        .test-note {
          font-size: 12px;
          font-weight: 400;
          color: #9CA3AF;
        }

        .pending-note {
          font-size: 12px;
          font-weight: 400;
          color: #9CA3AF;
        }

        /* Scheduled Cancellations Styles */
        .scheduled-cancellations-section {
          width: 100%;
          max-width: 100%;
        }

        .scheduled-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }

        .scheduled-header {
          padding: 16px;
          border-bottom: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%);
          flex-wrap: wrap;
          gap: 12px;
        }

        .scheduled-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #92400E;
          margin: 0;
        }

        .scheduled-subtitle {
          font-size: 13px;
          color: #B45309;
          margin: 4px 0 0 0;
        }

        .scheduled-summary {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .scheduled-stat {
          text-align: right;
        }

        .scheduled-total {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #92400E;
        }

        .scheduled-total.warning {
          color: #D97706;
        }

        .scheduled-total.alert {
          color: #DC2626;
        }

        .scheduled-label {
          font-size: 10px;
          color: #B45309;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .scheduled-table {
          padding: 8px 0;
          width: 100%;
          box-sizing: border-box;
        }

        .scheduled-row {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 2.5fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1.2fr) minmax(0, 1.2fr);
          gap: 8px;
          padding: 10px 12px;
          border-bottom: 1px solid #F3F4F6;
          align-items: center;
        }

        .scheduled-row:last-child {
          border-bottom: none;
        }

        .scheduled-row:hover:not(.scheduled-row-header) {
          background: #FFFBEB;
          cursor: pointer;
        }

        .scheduled-row-header {
          padding: 10px 12px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .scheduled-row-header .scheduled-col {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .scheduled-col {
          display: flex;
          align-items: center;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .scheduled-col.col-amount,
        .scheduled-col.col-term,
        .scheduled-col.col-ends,
        .scheduled-col.col-remaining {
          justify-content: center;
        }

        .scheduled-row-header .col-amount,
        .scheduled-row-header .col-term,
        .scheduled-row-header .col-ends,
        .scheduled-row-header .col-remaining {
          justify-content: center;
        }

        .client-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .client-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-name {
          font-size: 12px;
          color: #374151;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .amount-value {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .date-value {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
        }

        .term-badge {
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          background: #F3F4F6;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .remaining-badge {
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
          background: #D1FAE5;
          color: #065F46;
        }

        .remaining-badge.warning {
          background: #FEF3C7;
          color: #92400E;
        }

        .remaining-badge.urgent {
          background: #FEE2E2;
          color: #991B1B;
        }

        /* Responsive */
        @media (max-width: 1400px) {
          .revenue-layout {
            flex-direction: column;
          }

          .pipeline-projection-column {
            width: 100%;
          }

          .supporting-cards-grid {
            grid-template-columns: repeat(4, 1fr);
          }

          .revenue-right-column {
            width: 100%;
          }
        }

        @media (max-width: 1000px) {
          .supporting-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .revenue-charts-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .supporting-cards-grid {
            grid-template-columns: 1fr;
          }

          .closing-soon-table {
            overflow-x: auto;
          }

          .closing-soon-row {
            min-width: 400px;
          }
        }
      `}</style>
    </>
  )
}
