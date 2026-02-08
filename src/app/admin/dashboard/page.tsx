'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Activity {
  id: string
  type: string
  title: string
  description: string
  time: string
}

interface Transaction {
  id: string
  client: string
  initials: string
  color: string
  amount: number
  type: 'payment' | 'upgrade' | 'downgrade' | 'refund'
  date: string
}

interface DashboardStats {
  mrr: number
  mrrChange: number
  activeClients: number
  pendingContent: number
  pendingRecommendations: number
  avgGrowthPercent: number
}

interface MRRDataPoint {
  month: string
  label: string
  mrr: number
}

// MRR Chart Component - renders cumulative line graph
function MRRChart({ data }: { data: MRRDataPoint[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; mrr: number } | null>(null)

  if (data.length === 0) return null

  // Chart dimensions
  const width = 400
  const height = 220
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate min/max for scaling
  const mrrValues = data.map(d => d.mrr)
  const maxMRR = Math.max(...mrrValues, 100) // At least 100 to avoid empty chart
  const minMRR = Math.min(...mrrValues, 0)

  // Add 10% padding to the top
  const yMax = maxMRR * 1.1
  const yMin = Math.max(0, minMRR * 0.9)
  const yRange = yMax - yMin || 1

  // Calculate points for the line
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * chartWidth
    const y = padding.top + chartHeight - ((d.mrr - yMin) / yRange) * chartHeight
    return { x, y, mrr: d.mrr, label: d.label }
  })

  // Create line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')

  // Create area path (fill under the line)
  const areaPath = linePath + ` L${points[points.length - 1].x},${padding.top + chartHeight} L${points[0].x},${padding.top + chartHeight} Z`

  // Y-axis labels (4 values)
  const yAxisLabels = [0, 1, 2, 3].map(i => {
    const value = yMin + (yRange * (3 - i)) / 3
    const y = padding.top + (i / 3) * chartHeight
    return { value: Math.round(value), y }
  })

  // Format currency for axis
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`
    }
    return `$${value}`
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
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
          }}
        >
          {tooltip.label}: ${tooltip.mrr.toLocaleString()}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="sa-dash-chart-svg">
        {/* Grid lines */}
      {yAxisLabels.map((label, i) => (
        <line
          key={i}
          x1={padding.left}
          y1={label.y}
          x2={width - padding.right}
          y2={label.y}
          stroke="#E5E7EB"
          strokeWidth="1"
          strokeDasharray={i === yAxisLabels.length - 1 ? undefined : "4"}
        />
      ))}

      {/* Gradient definition */}
      <defs>
        <linearGradient id="mrrGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPath} fill="url(#mrrGradient)" />

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke="#059669"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points with hover */}
      {points.map((p, i) => (
        <g
          key={i}
          style={{ cursor: 'pointer' }}
          onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, mrr: p.mrr })}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Larger invisible hit area for easier hovering */}
          <circle
            cx={p.x}
            cy={p.y}
            r={12}
            fill="transparent"
          />
          {/* Visible dot */}
          <circle
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 5 : 3}
            fill="#059669"
          />
        </g>
      ))}

      {/* Y-axis labels */}
      {yAxisLabels.map((label, i) => (
        <text
          key={i}
          x={padding.left - 8}
          y={label.y + 4}
          fill="#9CA3AF"
          fontSize="10"
          textAnchor="end"
        >
          {formatCurrency(label.value)}
        </text>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 10}
          fill="#9CA3AF"
          fontSize="11"
          textAnchor="middle"
        >
          {p.label}
        </text>
      ))}
      </svg>
    </div>
  )
}

export default function SuperAdminDashboard() {
  const { user } = useUserProfile()
  const [stats, setStats] = useState<DashboardStats>({
    mrr: 0,
    mrrChange: 0,
    activeClients: 0,
    pendingContent: 0,
    pendingRecommendations: 0,
    avgGrowthPercent: 0,
  })
  const [recentActivity, setRecentActivity] = useState<Activity[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [mrrChartData, setMrrChartData] = useState<MRRDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch dashboard data and MRR data in parallel
        const [dashboardRes, mrrRes] = await Promise.all([
          fetch('/api/admin/dashboard'),
          fetch('/api/admin/dashboard/mrr')
        ])

        if (dashboardRes.ok) {
          const data = await dashboardRes.json()
          setStats(data.stats)
          setRecentActivity(data.recentActivity)
          setRecentTransactions(data.recentTransactions)
        }

        if (mrrRes.ok) {
          const mrrData = await mrrRes.json()
          setMrrChartData(mrrData.chartData || [])
          // Update stats with Stripe MRR data
          setStats(prev => ({
            ...prev,
            mrr: mrrData.currentMRR || prev.mrr,
            mrrChange: mrrData.mrrChange || prev.mrrChange,
            avgGrowthPercent: mrrData.avgGrowthPercent || 0
          }))
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Match notifications page icon rendering
  function getTypeIcon(type: string) {
    switch (type) {
      case 'email':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        )
      case 'proposal_view':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )
      case 'proposal_sent':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        )
      case 'login':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
        )
      case 'registration':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        )
      case 'purchase':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        )
      case 'onboarding':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        )
    }
  }

  function getIconClass(type: string) {
    switch (type) {
      case 'email': return 'email'
      case 'proposal_view': return 'view'
      case 'proposal_sent': return 'action'
      case 'login': return 'login'
      case 'registration': return 'registration'
      case 'purchase': return 'purchase'
      case 'onboarding': return 'onboarding'
      default: return 'action'
    }
  }

  return (
    <>
      <AdminHeader
        title="Dashboard"
        user={user}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Stats Grid */}
        <div className="stats-grid stats-grid-5" style={{ marginBottom: '24px' }}>
          <a href="/admin/recommendation-builder/new" className="stat-card stat-card-action">
            <div className="stat-icon" style={{ background: '#885430', color: '#FFFFFF' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value" style={{ fontSize: '16px' }}>New</span>
              <span className="stat-label">Recommendation</span>
            </div>
          </a>
          <Link href="/admin/clients" className="stat-card clickable">
            <div className="stat-icon" style={{ background: '#D1FAE5', color: '#059669' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{loading ? '...' : stats.activeClients}</span>
              <span className="stat-label">Active Clients</span>
            </div>
          </Link>
          <Link href="/admin/content?status=pending" className="stat-card clickable">
            <div className="stat-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{loading ? '...' : stats.pendingContent}</span>
              <span className="stat-label">Pending Content</span>
            </div>
          </Link>
          <Link href="/admin/recommendations?status=open" className="stat-card clickable">
            <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{loading ? '...' : stats.pendingRecommendations}</span>
              <span className="stat-label">Open Recommendations</span>
            </div>
          </Link>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{loading ? '...' : `${stats.avgGrowthPercent >= 0 ? '+' : ''}${stats.avgGrowthPercent}%`}</span>
              <span className="stat-label">Avg. Growth</span>
            </div>
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="sa-dash-grid">
          {/* Recent Activity */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <h3>Recent Activity</h3>
              <Link href="/admin/notifications" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="sa-dash-activity-stream">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }}></div>
                  Loading activity...
                </div>
              ) : recentActivity.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  No recent activity
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className={`activity-item ${activity.type === 'purchase' ? 'purchase-highlight' : ''} ${activity.type === 'onboarding' ? 'onboarding-highlight' : ''}`}>
                    <div className={`activity-icon ${getIconClass(activity.type)}`}>
                      {getTypeIcon(activity.type)}
                    </div>
                    <div className="activity-content">
                      <span className="activity-title">{activity.title}</span>
                      <p className="activity-description">{activity.description}</p>
                    </div>
                    <div className="activity-time">{activity.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MRR Chart */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <div>
                <h3>Monthly Recurring Revenue</h3>
                <div className="sa-dash-mrr-value">
                  <span className="sa-dash-mrr-amount">
                    {loading ? '...' : (() => {
                      const pendingBillingDate = new Date('2026-02-17')
                      const hasPending = new Date() < pendingBillingDate
                      const pendingAmount = 300
                      const displayMRR = hasPending ? stats.mrr + pendingAmount : stats.mrr
                      return `$${displayMRR.toLocaleString()}`
                    })()}
                  </span>
                  {!loading && (() => {
                    const pendingBillingDate = new Date('2026-02-17')
                    const hasPending = new Date() < pendingBillingDate
                    return hasPending && <span className="sa-dash-mrr-pending">(incl. $300 pending)</span>
                  })()}
                  {stats.mrrChange !== 0 && (
                    <span className={`sa-dash-mrr-change ${stats.mrrChange >= 0 ? 'positive' : 'negative'}`}>
                      {stats.mrrChange >= 0 ? '+' : ''}${stats.mrrChange.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <Link href="/admin/revenue" className="btn btn-sm btn-secondary">Details</Link>
            </div>
            <div className="sa-dash-chart">
              {mrrChartData.length > 0 ? (
                <MRRChart data={mrrChartData} />
              ) : (
                <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
                  {loading ? 'Loading chart data...' : 'No MRR data available'}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="sa-dash-card">
            <div className="sa-dash-card-header">
              <h3>Recent Transactions</h3>
              <Link href="/admin/revenue" className="btn btn-sm btn-secondary">View All</Link>
            </div>
            <div className="sa-dash-transactions-list">
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }}></div>
                  Loading transactions...
                </div>
              ) : recentTransactions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#6B7280' }}>
                  No recent transactions
                </div>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="sa-dash-tx-item">
                    <div className="sa-dash-tx-client">
                      <div className="sa-dash-tx-avatar" style={{ background: tx.color }}>
                        {tx.initials}
                      </div>
                      <div className="sa-dash-tx-info">
                        <span className="sa-dash-tx-name">{tx.client}</span>
                        <span className="sa-dash-tx-date">{tx.date}</span>
                      </div>
                    </div>
                    <div className={`sa-dash-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                      {tx.amount >= 0 ? '+' : ''}{tx.amount < 0 ? '-' : ''}${Math.abs(tx.amount).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
