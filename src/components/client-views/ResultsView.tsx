'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ResultsViewProps {
  clientId: string
  isAdmin?: boolean
  isDemo?: boolean
  proDashboardUrl?: string | null
}

interface KpiMetric {
  value: number
  formatted: string
  change: number
  changeFormatted: string
  trend: 'up' | 'down' | 'neutral'
}

interface Keyword {
  id: string
  keyword: string
  currentPosition: number
  previousPosition: number
  change: number
  progress: number
}

interface LeadSource {
  source: string
  percentage: number
  color: string
}

interface ResultsData {
  kpi: {
    visitors: KpiMetric
    keywords: KpiMetric
    leads: KpiMetric
    calls: KpiMetric
  }
  keywords: {
    items: Keyword[]
    total: number
    showing: number
  }
  trafficData: {
    labels: string[]
    values: number[]
  }
  aiVisibility: {
    score: number
    maxScore: number
    level: 'low' | 'medium' | 'high'
    industryAverage: number
    breakdown: {
      chatgpt: number
      perplexity: number
      gemini: number
    }
    inPlan: boolean
  }
  leadSources: LeadSource[]
  proDashboardUrl: string
}

// Demo data for demo mode
const demoResultsData: ResultsData = {
  kpi: {
    visitors: { value: 2847, formatted: '2,847', change: 32, changeFormatted: '+32%', trend: 'up' },
    keywords: { value: 47, formatted: '47', change: 17, changeFormatted: '+17', trend: 'up' },
    leads: { value: 28, formatted: '28', change: 8, changeFormatted: '+8', trend: 'up' },
    calls: { value: 34, formatted: '34', change: 12, changeFormatted: '+12', trend: 'up' },
  },
  keywords: {
    items: [
      { id: '1', keyword: 'precision wound care san antonio', currentPosition: 7, previousPosition: 24, change: 17, progress: 85 },
      { id: '2', keyword: 'wound care clinic near me', currentPosition: 12, previousPosition: 18, change: 6, progress: 70 },
      { id: '3', keyword: 'diabetic wound treatment texas', currentPosition: 15, previousPosition: 22, change: 7, progress: 60 },
      { id: '4', keyword: 'chronic wound specialist', currentPosition: 23, previousPosition: 31, change: 8, progress: 45 },
      { id: '5', keyword: 'advanced wound care products', currentPosition: 34, previousPosition: 32, change: -2, progress: 30 },
    ],
    total: 47,
    showing: 5,
  },
  trafficData: {
    labels: ['Dec 1', 'Dec 8', 'Dec 15', 'Dec 22', 'Dec 29'],
    values: [120, 100, 110, 80, 70, 50, 40, 30, 20],
  },
  aiVisibility: {
    score: 21,
    maxScore: 100,
    level: 'low',
    industryAverage: 45,
    breakdown: { chatgpt: 18, perplexity: 24, gemini: 21 },
    inPlan: false,
  },
  leadSources: [
    { source: 'Google Ads', percentage: 40, color: '#10B981' },
    { source: 'Organic Search', percentage: 25, color: '#F59E0B' },
    { source: 'Direct', percentage: 20, color: '#3B82F6' },
    { source: 'Referral', percentage: 15, color: '#EC4899' },
  ],
  proDashboardUrl: 'https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM=',
}

// KPI Card component
function KpiCard({ icon, label, value, changeFormatted, trend }: {
  icon: React.ReactNode
  label: string
  value: string
  changeFormatted: string
  trend: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <div className={`kpi-icon ${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {icon}
        </div>
        <div className={`kpi-change ${trend === 'up' ? 'positive' : trend === 'down' ? 'negative' : ''}`}>
          {trend === 'up' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          ) : trend === 'down' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          ) : null}
          {changeFormatted}
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  )
}

export function ResultsView({ clientId, isAdmin = false, isDemo = false, proDashboardUrl }: ResultsViewProps) {
  // Default to pro-dashboard while overview is under construction
  const [activeSubtab, setActiveSubtab] = useState<'overview' | 'pro-dashboard'>('pro-dashboard')
  const [loading, setLoading] = useState(true)
  const [resultsData, setResultsData] = useState<ResultsData | null>(null)

  // For demo mode, load demo data. For real clients, we don't have APIs yet for overview.
  useEffect(() => {
    if (isDemo) {
      setResultsData(demoResultsData)
    }
    setLoading(false)
  }, [isDemo])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    )
  }

  // Demo mode uses demo data, real clients will see Coming Soon for Overview tab
  const data = resultsData || demoResultsData
  const showOverviewComingSoon = !isDemo
  // Use provided proDashboardUrl prop, or fall back to data URL for demo mode
  const dashboardUrl = proDashboardUrl || data.proDashboardUrl

  return (
    <div className="results-view-container">
      {/* Results Sub-tabs */}
      <div className="results-subtabs">
        <button
          className={`results-subtab ${activeSubtab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('overview')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          Overview
        </button>
        <button
          className={`results-subtab ${activeSubtab === 'pro-dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('pro-dashboard')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="3" y1="9" x2="21" y2="9"></line>
            <line x1="9" y1="21" x2="9" y2="9"></line>
          </svg>
          Pro Dashboard
          <span className="pro-badge">PRO</span>
        </button>
      </div>

      {/* Overview Content */}
      {activeSubtab === 'overview' && (
        <div className="results-content results-tab-content active" id="overview">
          {showOverviewComingSoon ? (
            /* Coming Soon state for Overview - APIs not built yet */
            <div className="coming-soon-placeholder" style={{ margin: '2rem 0' }}>
              <div className="coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
              </div>
              <h2>Overview Coming Soon</h2>
              <p>
                {isAdmin
                  ? "The performance overview dashboard is being developed. Use the Pro Dashboard tab to view detailed analytics in the meantime."
                  : "We're building your performance overview dashboard. Use the Pro Dashboard tab to view your detailed analytics in the meantime."
                }
              </p>
              <button
                className="btn btn-primary"
                onClick={() => setActiveSubtab('pro-dashboard')}
                style={{ marginTop: '1rem' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                View Pro Dashboard
              </button>
            </div>
          ) : (
          <>
          <div className="results-header">
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Performance Overview</h3>
            <div className="results-period">
              <label>Time Period:</label>
              <select defaultValue="Last 30 Days">
                <option>Last 30 Days</option>
                <option>Last 90 Days</option>
                <option>This Year</option>
                <option>All Time</option>
              </select>
            </div>
          </div>

          {/* KPI Grid */}
          <div className="kpi-grid">
            <KpiCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              }
              label="Website Visitors"
              value={data.kpi.visitors.formatted}
              changeFormatted={data.kpi.visitors.changeFormatted}
              trend={data.kpi.visitors.trend}
            />
            <KpiCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              }
              label="Keywords Ranking"
              value={data.kpi.keywords.formatted}
              changeFormatted={data.kpi.keywords.changeFormatted}
              trend={data.kpi.keywords.trend}
            />
            <KpiCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                  <line x1="20" y1="8" x2="20" y2="14"></line>
                  <line x1="23" y1="11" x2="17" y2="11"></line>
                </svg>
              }
              label="New Leads"
              value={data.kpi.leads.formatted}
              changeFormatted={data.kpi.leads.changeFormatted}
              trend={data.kpi.leads.trend}
            />
            <KpiCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
              }
              label="Phone Calls"
              value={data.kpi.calls.formatted}
              changeFormatted={data.kpi.calls.changeFormatted}
              trend={data.kpi.calls.trend}
            />
          </div>

          {/* Charts Grid */}
          <div className="results-grid three-col">
            {/* Traffic Chart */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Traffic Over Time</h3>
                <select style={{ padding: '6px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '12px' }} defaultValue="Daily">
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </div>
              <div className="chart-area">
                <div className="chart-y-axis">
                  <span>3k</span>
                  <span>2k</span>
                  <span>1k</span>
                  <span>0</span>
                </div>
                <div className="line-chart">
                  <svg viewBox="0 0 400 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="trafficGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#B57841', stopOpacity: 0.3 }} />
                        <stop offset="100%" style={{ stopColor: '#B57841', stopOpacity: 0.05 }} />
                      </linearGradient>
                    </defs>
                    <path d="M0,120 L50,100 L100,110 L150,80 L200,70 L250,50 L300,40 L350,30 L400,20 L400,150 L0,150 Z" fill="url(#trafficGradient)"/>
                    <path d="M0,120 L50,100 L100,110 L150,80 L200,70 L250,50 L300,40 L350,30 L400,20" fill="none" stroke="#B57841" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="400" cy="20" r="5" fill="#B57841"/>
                  </svg>
                </div>
                <div className="chart-x-axis">
                  {data.trafficData.labels.map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Visibility */}
            <div className="chart-card ai-visibility-card">
              <div className="chart-header">
                <h3>AI Visibility Score</h3>
                <div className={`ai-plan-badge ${data.aiVisibility.inPlan ? 'included' : 'not-included'}`}>
                  {data.aiVisibility.inPlan ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      In Plan
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                      </svg>
                      Not in Plan
                    </>
                  )}
                </div>
              </div>
              <div className="ai-visibility-content">
                <div className="ai-score-gauge">
                  <svg viewBox="0 0 200 120" className="gauge-svg">
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E8EDE7" strokeWidth="16" strokeLinecap="round"/>
                    <path d="M 20 100 A 80 80 0 0 1 53 38" fill="none" stroke="#EF4444" strokeWidth="16" strokeLinecap="round"/>
                    <line x1="100" y1="30" x2="100" y2="42" stroke="#6B7280" strokeWidth="3" strokeLinecap="round"/>
                    <text x="100" y="12" textAnchor="middle" fill="#4B5563" fontSize="18" fontWeight="700">Avg: {data.aiVisibility.industryAverage}</text>
                  </svg>
                  <div className="ai-score-value">
                    <span className="score-number">{data.aiVisibility.score}</span>
                    <span className="score-max">/{data.aiVisibility.maxScore}</span>
                  </div>
                  <div className={`ai-score-label ${data.aiVisibility.level}`}>{data.aiVisibility.level.charAt(0).toUpperCase() + data.aiVisibility.level.slice(1)}</div>
                </div>
                <div className="ai-visibility-details">
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">ChatGPT</span>
                    <span className="ai-detail-value">{data.aiVisibility.breakdown.chatgpt}%</span>
                  </div>
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">Perplexity</span>
                    <span className="ai-detail-value">{data.aiVisibility.breakdown.perplexity}%</span>
                  </div>
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">Gemini</span>
                    <span className="ai-detail-value">{data.aiVisibility.breakdown.gemini}%</span>
                  </div>
                </div>
                {!data.aiVisibility.inPlan && (
                  <Link href="/recommendations" className="ai-upgrade-link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    Add AI Visibility Plan
                  </Link>
                )}
              </div>
            </div>

            {/* Lead Sources */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Lead Sources</h3>
              </div>
              <div className="donut-chart-container">
                <div className="donut-chart">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#E8EDE7" strokeWidth="12"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#10B981" strokeWidth="12" strokeDasharray="100.5 251.3" strokeDashoffset="0" transform="rotate(-90 50 50)"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray="62.8 251.3" strokeDashoffset="-100.5" transform="rotate(-90 50 50)"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#3B82F6" strokeWidth="12" strokeDasharray="50.3 251.3" strokeDashoffset="-163.3" transform="rotate(-90 50 50)"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#EC4899" strokeWidth="12" strokeDasharray="37.7 251.3" strokeDashoffset="-213.6" transform="rotate(-90 50 50)"/>
                  </svg>
                  <div className="donut-center">
                    <span className="donut-total">{data.kpi.leads.value}</span>
                    <span className="donut-label">Leads</span>
                  </div>
                </div>
                <div className="chart-legend">
                  {data.leadSources.map((source, i) => (
                    <div key={i} className="legend-item">
                      <span className="legend-color" style={{ background: source.color }}></span>
                      <span className="legend-label">{source.source}</span>
                      <span className="legend-value">{source.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Keyword Rankings */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Keyword Rankings Progress</h3>
              <button className="btn btn-secondary" style={{ padding: '8px 14px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export Report
              </button>
            </div>
            <div className="keywords-table">
              <div className="keywords-table-header">
                <span>Keyword</span>
                <span>Current</span>
                <span>Previous</span>
                <span>Change</span>
                <span>Progress</span>
              </div>
              {data.keywords.items.map((kw) => (
                <div key={kw.id} className="keywords-table-row">
                  <span className="keyword-name">{kw.keyword}</span>
                  <span className="keyword-position">#{kw.currentPosition}</span>
                  <span className="keyword-previous">#{kw.previousPosition}</span>
                  <span className={`keyword-change ${kw.change >= 0 ? 'positive' : 'negative'}`}>
                    {kw.change >= 0 ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    )}
                    {kw.change >= 0 ? '+' : ''}{kw.change}
                  </span>
                  <div className="keyword-progress">
                    <div className="keyword-progress-bar" style={{ width: `${kw.progress}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="keywords-summary">
              <span>Showing {data.keywords.showing} of {data.keywords.total} tracked keywords</span>
              <a href="#">View all keywords →</a>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* Pro Dashboard Content */}
      {activeSubtab === 'pro-dashboard' && (
        <div className="results-tab-content active" id="pro-dashboard">
          <div className="pro-dashboard-header">
            <div className="pro-dashboard-info">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                Pro Dashboard
              </h3>
              <p>Deep-dive analytics with real-time data from all your marketing channels</p>
            </div>
            <a href={dashboardUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Open in New Tab
            </a>
          </div>
          <div className="pro-dashboard-embed">
            <iframe
              src={dashboardUrl}
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  )
}

export default ResultsView
