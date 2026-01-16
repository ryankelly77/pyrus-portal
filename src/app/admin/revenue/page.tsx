'use client'

import { useState, useEffect } from 'react'
import { AdminHeader } from '@/components/layout'
import { MRRChart, MRRDataPoint } from '@/components/charts/MRRChart'

interface VolumeDataPoint {
  month: string
  label: string
  volume: number
  cumulative: number
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

export default function AdminRevenuePage() {
  const [mrrChartData, setMrrChartData] = useState<MRRDataPoint[]>([])
  const [volumeData, setVolumeData] = useState<{ month: string; label: string; volume: number; cumulative: number }[]>([])
  const [selectedRep, setSelectedRep] = useState('all')
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

  useEffect(() => {
    async function fetchMRRData() {
      try {
        const res = await fetch('/api/admin/dashboard/mrr')
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
        }
      } catch (error) {
        console.error('Failed to fetch MRR data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMRRData()
  }, [])

  return (
    <>
      <AdminHeader
        title="Revenue / MRR"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Track your monthly recurring revenue and growth metrics</p>
          </div>
        </div>

        {/* Main Layout: Charts + Pipeline */}
        <div className="revenue-layout">
          {/* Left: Charts */}
          <div className="revenue-charts-grid">
          {/* MRR Chart */}
          <div className="revenue-chart-card">
            <div className="chart-header">
              <div>
                <span className="chart-label">MRR</span>
                <div className="chart-value">
                  {loading ? '...' : `$${stats.currentMRR.toLocaleString()}`}
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
                  {loading ? '...' : `${stats.avgGrowthPercent >= 0 ? '+' : ''}${stats.avgGrowthPercent}%`}
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
                  {loading ? '...' : `${stats.churnRate}%`}
                </div>
              </div>
              <div className="chart-change">
                {!loading && stats.churnedSubscriptions > 0 && (
                  <span className="negative">
                    {stats.churnedSubscriptions} canceled
                  </span>
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
                    {loading ? '...' : `-$${stats.churnedMRR.toLocaleString()}`}
                  </span>
                </div>
                <div className="churn-stat">
                  <span className="churn-stat-label">Canceled subscriptions</span>
                  <span className="churn-stat-value">
                    {loading ? '...' : stats.churnedSubscriptions}
                  </span>
                </div>
                <div className="churn-stat">
                  <span className="churn-stat-label">Active subscriptions</span>
                  <span className="churn-stat-value positive">
                    {loading ? '...' : stats.currentMRR > 0 ? Math.round(stats.currentMRR / (stats.currentMRR + stats.churnedMRR) * 100) + '%' : '100%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Right: Pipeline Table */}
          <div className="pipeline-section">
            <div className="pipeline-card">
              <div className="pipeline-header">
                <div className="pipeline-header-left">
                  <h2>Sales Pipeline</h2>
                  <select
                    className="rep-filter"
                    value={selectedRep}
                    onChange={(e) => setSelectedRep(e.target.value)}
                  >
                    <option value="all">All Reps</option>
                    <option value="ryan">Ryan</option>
                    <option value="jake">Jake</option>
                  </select>
                </div>
                <div className="pipeline-summary">
                  <div className="pipeline-stat">
                    <span className="pipeline-total">$12,847</span>
                    <span className="pipeline-label">monthly</span>
                  </div>
                  <div className="pipeline-stat">
                    <span className="pipeline-total">$4,250</span>
                    <span className="pipeline-label">one-time</span>
                  </div>
                </div>
              </div>

              <div className="pipeline-table">
                {/* Header */}
                <div className="pipeline-row pipeline-row-header">
                  <div className="pipeline-col col-client">Client</div>
                  <div className="pipeline-col col-rep">Rep</div>
                  <div className="pipeline-col col-tier">Good</div>
                  <div className="pipeline-col col-tier">Better</div>
                  <div className="pipeline-col col-tier">Best</div>
                  <div className="pipeline-col col-date">Sent</div>
                  <div className="pipeline-col col-date">Last Comm</div>
                  <div className="pipeline-col col-days">Age</div>
                  <div className="pipeline-col col-confidence">Confidence</div>
                </div>

                {/* Row 1 - High confidence */}
                <div className="pipeline-row">
                  <div className="pipeline-col col-client">
                    <div className="client-avatar" style={{ background: '#059669' }}>AM</div>
                    <div className="client-info">
                      <span className="client-name">Acme Manufacturing</span>
                      <span className="client-email">john@acme.com</span>
                    </div>
                  </div>
                  <div className="pipeline-col col-rep">
                    <div className="rep-avatar">RK</div>
                    <span className="rep-name">Ryan</span>
                  </div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$497</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value predicted">$847</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$1,297</span></div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Jan 10</span>
                  </div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Jan 12</span>
                  </div>
                  <div className="pipeline-col col-days">
                    <span className="days-badge green">3 days</span>
                  </div>
                  <div className="pipeline-col col-confidence">
                    <div className="confidence-meter">
                      <div className="confidence-fill green" style={{ width: '85%' }}></div>
                    </div>
                    <span className="confidence-label green">85%</span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="pipeline-row">
                  <div className="pipeline-col col-client">
                    <div className="client-avatar" style={{ background: '#2563EB' }}>SP</div>
                    <div className="client-info">
                      <span className="client-name">Summit Properties</span>
                      <span className="client-email">sarah@summit.co</span>
                    </div>
                  </div>
                  <div className="pipeline-col col-rep">
                    <div className="rep-avatar">JD</div>
                    <span className="rep-name">Jake</span>
                  </div>
                  <div className="pipeline-col col-tier"><span className="tier-value predicted">$397</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$697</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$997</span></div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Jan 5</span>
                  </div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Jan 9</span>
                  </div>
                  <div className="pipeline-col col-days">
                    <span className="days-badge yellow">8 days</span>
                  </div>
                  <div className="pipeline-col col-confidence">
                    <div className="confidence-meter">
                      <div className="confidence-fill yellow" style={{ width: '62%' }}></div>
                    </div>
                    <span className="confidence-label yellow">62%</span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="pipeline-row">
                  <div className="pipeline-col col-client">
                    <div className="client-avatar" style={{ background: '#7C3AED' }}>BT</div>
                    <div className="client-info">
                      <span className="client-name">Blue Tech Solutions</span>
                      <span className="client-email">mike@bluetech.io</span>
                    </div>
                  </div>
                  <div className="pipeline-col col-rep">
                    <div className="rep-avatar">RK</div>
                    <span className="rep-name">Ryan</span>
                  </div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$597</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$997</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value predicted">$1,497</span></div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Dec 30</span>
                  </div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Jan 3</span>
                  </div>
                  <div className="pipeline-col col-days">
                    <span className="days-badge yellow">14 days</span>
                  </div>
                  <div className="pipeline-col col-confidence">
                    <div className="confidence-meter">
                      <div className="confidence-fill red" style={{ width: '38%' }}></div>
                    </div>
                    <span className="confidence-label red">38%</span>
                  </div>
                </div>

                {/* Row 4 */}
                <div className="pipeline-row">
                  <div className="pipeline-col col-client">
                    <div className="client-avatar" style={{ background: '#D97706' }}>CR</div>
                    <div className="client-info">
                      <span className="client-name">Coastal Realty</span>
                      <span className="client-email">lisa@coastal.com</span>
                    </div>
                  </div>
                  <div className="pipeline-col col-rep">
                    <div className="rep-avatar">JD</div>
                    <span className="rep-name">Jake</span>
                  </div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$297</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value predicted">$547</span></div>
                  <div className="pipeline-col col-tier"><span className="tier-value">$847</span></div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Dec 23</span>
                  </div>
                  <div className="pipeline-col col-date">
                    <span className="date-value">Dec 26</span>
                  </div>
                  <div className="pipeline-col col-days">
                    <span className="days-badge red">21 days</span>
                  </div>
                  <div className="pipeline-col col-confidence">
                    <div className="confidence-meter">
                      <div className="confidence-fill red" style={{ width: '15%' }}></div>
                    </div>
                    <span className="confidence-label red">15%</span>
                  </div>
                </div>
              </div>

              <div className="pipeline-footer">
                <span className="pipeline-count">4 proposals awaiting response</span>
                <button className="btn-view-all">View All</button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        .revenue-layout {
          display: flex;
          gap: 24px;
          align-items: stretch;
        }

        .revenue-charts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          flex: 1;
          min-width: 0;
        }

        /* Pipeline Section */
        .pipeline-section {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .pipeline-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .pipeline-header {
          padding: 16px 20px;
          border-bottom: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #FAFAFA 0%, #FFFFFF 100%);
          flex-shrink: 0;
        }

        .pipeline-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pipeline-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .rep-filter {
          padding: 6px 10px;
          font-size: 13px;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s ease;
        }

        .rep-filter:hover {
          border-color: #D1D5DB;
        }

        .rep-filter:focus {
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
        }

        .pipeline-summary {
          display: flex;
          gap: 20px;
        }

        .pipeline-stat {
          text-align: right;
        }

        .pipeline-total {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .pipeline-label {
          font-size: 10px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-table {
          padding: 8px 0;
          flex: 1;
          overflow-y: auto;
          min-height: 0;
        }

        .pipeline-row {
          display: grid;
          grid-template-columns: minmax(140px, 1fr) 70px 65px 65px 65px 60px 75px 70px 200px;
          gap: 10px;
          padding: 12px 16px;
          border-bottom: 1px solid #F3F4F6;
          transition: background 0.15s ease;
          align-items: center;
        }

        .pipeline-row:hover:not(.pipeline-row-header) {
          background: #F9FAFB;
          cursor: pointer;
        }

        .pipeline-row:last-child {
          border-bottom: none;
        }

        .pipeline-row-header {
          padding: 10px 20px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pipeline-row-header .pipeline-col {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-col {
          display: flex;
          align-items: center;
        }

        .pipeline-row-header .col-tier,
        .pipeline-row-header .col-date,
        .pipeline-row-header .col-days,
        .pipeline-row-header .col-confidence {
          justify-content: center;
        }

        .col-client {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .col-rep {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .rep-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #6B7280;
          color: white;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rep-name {
          font-size: 13px;
          color: #374151;
          font-weight: 500;
        }

        .client-avatar {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 11px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .client-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .client-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .client-email {
          font-size: 12px;
          color: #9CA3AF;
        }

        .col-tier {
          justify-content: center;
        }

        .tier-value {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .tier-value.predicted {
          color: #059669;
          border: 2px solid #059669;
          border-radius: 12px;
          padding: 2px 6px;
        }

        .col-date {
          justify-content: center;
        }

        .date-value {
          font-size: 12px;
          color: #6B7280;
          font-weight: 500;
        }

        .date-value.stale {
          color: #DC2626;
        }

        .col-days {
          justify-content: center;
        }

        .days-badge {
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 500;
        }

        .days-badge.green {
          background: #D1FAE5;
          color: #065F46;
        }

        .days-badge.yellow {
          background: #FEF3C7;
          color: #92400E;
        }

        .days-badge.red {
          background: #FEE2E2;
          color: #991B1B;
        }

        .col-confidence {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .confidence-meter {
          flex: 1;
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .confidence-fill.green {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
        }

        .confidence-fill.yellow {
          background: linear-gradient(90deg, #FBBF24 0%, #EAB308 100%);
        }

        .confidence-fill.red {
          background: linear-gradient(90deg, #EF4444 0%, #DC2626 100%);
        }

        .confidence-label {
          font-size: 13px;
          font-weight: 700;
          min-width: 36px;
          text-align: right;
        }

        .confidence-label.green {
          color: #059669;
        }

        .confidence-label.yellow {
          color: #CA8A04;
        }

        .confidence-label.red {
          color: #DC2626;
        }

        .pipeline-footer {
          padding: 12px 20px;
          border-top: 1px solid #F3F4F6;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F9FAFB;
          flex-shrink: 0;
        }

        .pipeline-count {
          font-size: 13px;
          color: #6B7280;
        }

        .btn-view-all {
          padding: 8px 16px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-view-all:hover {
          background: #1F2937;
          transform: translateY(-1px);
        }

        @media (max-width: 1400px) {
          .revenue-layout {
            flex-direction: column;
          }

          .revenue-charts-grid {
            flex: 1;
            width: 100%;
          }

          .pipeline-section {
            width: 100%;
            min-width: unset;
          }
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

        .chart-actions {
          display: flex;
          gap: 8px;
        }

        .chart-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.15s;
        }

        .chart-btn:hover {
          background: #E5E7EB;
          color: #374151;
        }

        .chart-btn svg {
          width: 16px;
          height: 16px;
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

        .growth-bars {
          display: flex;
          align-items: flex-end;
          justify-content: space-around;
          height: 180px;
          padding: 20px 10px;
          gap: 16px;
        }

        .growth-bar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          height: 100%;
          justify-content: flex-end;
        }

        .growth-bar {
          width: 100%;
          max-width: 40px;
          min-height: 4px;
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease;
        }

        .growth-bar.positive {
          background: #059669;
        }

        .growth-bar.negative {
          background: #EF4444;
        }

        .growth-bar-label {
          font-size: 11px;
          color: #9CA3AF;
          margin-top: 8px;
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

        .chart-wrapper {
          position: relative;
          height: 200px;
          padding-left: 45px;
        }

        .chart-wrapper svg {
          width: 100%;
          height: 100%;
        }

        .chart-y-axis {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-size: 11px;
          color: #9CA3AF;
          width: 40px;
          text-align: right;
          padding-right: 8px;
        }

        .chart-x-axis {
          display: flex;
          justify-content: space-between;
          padding-left: 45px;
          padding-top: 8px;
          font-size: 11px;
          color: #9CA3AF;
        }

        :global(.chart-grid-line) {
          stroke: #E5E7EB;
          stroke-width: 1;
        }

        :global(.chart-zero-line) {
          stroke: #D1D5DB;
          stroke-width: 1;
        }

        :global(.mrr-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        :global(.bar-positive) {
          fill: #059669;
        }

        :global(.bar-negative) {
          fill: #EF4444;
        }

        :global(.area-fill) {
          fill: rgba(5, 150, 105, 0.15);
        }

        :global(.area-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        :global(.rate-line) {
          fill: none;
          stroke: #059669;
          stroke-width: 2;
        }

        .report-downloads {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 24px;
        }

        .report-downloads h2 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 16px 0;
        }

        .report-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .report-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
        }

        .report-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
          color: #374151;
        }

        .report-info svg {
          width: 20px;
          height: 20px;
          color: #6B7280;
        }

        @media (max-width: 900px) {
          .revenue-charts-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
