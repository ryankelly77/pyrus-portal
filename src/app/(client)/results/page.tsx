'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  usePageView({ page: '/results', pageName: 'Results' })

  const [activeSubtab, setActiveSubtab] = useState('overview')

  // Check if client is pending (prospect only) or doesn't have results data yet
  const isPending = client.status === 'pending'
  const showComingSoon = !isPending && !client.access.hasResults

  // KPI data - will be replaced with real data from API in the future
  const kpiData = {
    visitors: '2,847',
    visitorsChange: '+32%',
    keywords: '47',
    keywordsChange: '+17',
    leads: '28',
    leadsChange: '+8',
    calls: '34',
    callsChange: '+12'
  }

  // Show loading state while client data is being fetched
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Results</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Results</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>{client.initials}</span>
            </div>
            <span className="user-name">{client.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Pending client placeholder */}
        {isPending ? (
          <div className="locked-page-placeholder">
            <div className="locked-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Results Available After Purchase</h2>
            <p>Once you select a plan and become an active client, you&apos;ll see your marketing performance metrics, keyword rankings, lead tracking, and more here.</p>
            <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'} className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              View Your Proposal
            </Link>
          </div>
        ) : showComingSoon ? (
          <div className="coming-soon-placeholder">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h2>Results Coming Soon</h2>
            <p>We&apos;re setting up your analytics dashboard. Your marketing performance metrics, keyword rankings, and lead tracking will appear here once your campaigns are active.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Account setup complete</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Campaign configuration in progress</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Analytics dashboard connection</span>
              </div>
            </div>
          </div>
        ) : (
          <>
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
        <div className={`results-content results-tab-content ${activeSubtab === 'overview' ? 'active' : ''}`} id="overview">
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

          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon traffic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="kpi-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {kpiData.visitorsChange}
                </div>
              </div>
              <div className="kpi-value">{kpiData.visitors}</div>
              <div className="kpi-label">Website Visitors</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon keywords">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="kpi-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {kpiData.keywordsChange}
                </div>
              </div>
              <div className="kpi-value">{kpiData.keywords}</div>
              <div className="kpi-label">Keywords Ranking</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon leads">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="8.5" cy="7" r="4"></circle>
                    <line x1="20" y1="8" x2="20" y2="14"></line>
                    <line x1="23" y1="11" x2="17" y2="11"></line>
                  </svg>
                </div>
                <div className="kpi-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {kpiData.leadsChange}
                </div>
              </div>
              <div className="kpi-value">{kpiData.leads}</div>
              <div className="kpi-label">New Leads</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-header">
                <div className="kpi-icon calls">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div className="kpi-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  {kpiData.callsChange}
                </div>
              </div>
              <div className="kpi-value">{kpiData.calls}</div>
              <div className="kpi-label">Phone Calls</div>
            </div>
          </div>

          <div className="results-grid three-col">
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
                  <span>Dec 1</span>
                  <span>Dec 8</span>
                  <span>Dec 15</span>
                  <span>Dec 22</span>
                  <span>Dec 29</span>
                </div>
              </div>
            </div>
            <div className="chart-card ai-visibility-card">
              <div className="chart-header">
                <h3>AI Visibility Score</h3>
                <div className="ai-plan-badge not-included">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                  </svg>
                  Not in Plan
                </div>
              </div>
              <div className="ai-visibility-content">
                <div className="ai-score-gauge">
                  <svg viewBox="0 0 200 120" className="gauge-svg">
                    {/* Background arc */}
                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E8EDE7" strokeWidth="16" strokeLinecap="round"/>
                    {/* Score arc (21% of 180 degrees) */}
                    <path d="M 20 100 A 80 80 0 0 1 53 38" fill="none" stroke="#EF4444" strokeWidth="16" strokeLinecap="round"/>
                    {/* Industry average marker (45% position) */}
                    <line x1="100" y1="25" x2="100" y2="35" stroke="#6B7280" strokeWidth="3" strokeLinecap="round"/>
                    <text x="100" y="16" textAnchor="middle" fill="#6B7280" fontSize="14" fontWeight="600">Avg: 45</text>
                  </svg>
                  <div className="ai-score-value">
                    <span className="score-number">21</span>
                    <span className="score-max">/100</span>
                  </div>
                  <div className="ai-score-label low">Low</div>
                </div>
                <div className="ai-visibility-details">
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">ChatGPT</span>
                    <span className="ai-detail-value">18%</span>
                  </div>
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">Perplexity</span>
                    <span className="ai-detail-value">24%</span>
                  </div>
                  <div className="ai-detail-row">
                    <span className="ai-detail-label">Gemini</span>
                    <span className="ai-detail-value">21%</span>
                  </div>
                </div>
                <Link href="/recommendations" className="ai-upgrade-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Add AI Visibility Plan
                </Link>
              </div>
            </div>
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
                    <span className="donut-total">28</span>
                    <span className="donut-label">Leads</span>
                  </div>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#10B981' }}></span>
                    <span className="legend-label">Google Ads</span>
                    <span className="legend-value">40%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#F59E0B' }}></span>
                    <span className="legend-label">Organic Search</span>
                    <span className="legend-value">25%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#3B82F6' }}></span>
                    <span className="legend-label">Direct</span>
                    <span className="legend-value">20%</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-color" style={{ background: '#EC4899' }}></span>
                    <span className="legend-label">Referral</span>
                    <span className="legend-value">15%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
              <div className="keywords-table-row">
                <span className="keyword-name">precision wound care san antonio</span>
                <span className="keyword-position">#7</span>
                <span className="keyword-previous">#24</span>
                <span className="keyword-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  +17
                </span>
                <div className="keyword-progress">
                  <div className="keyword-progress-bar" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="keywords-table-row">
                <span className="keyword-name">wound care clinic near me</span>
                <span className="keyword-position">#12</span>
                <span className="keyword-previous">#18</span>
                <span className="keyword-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  +6
                </span>
                <div className="keyword-progress">
                  <div className="keyword-progress-bar" style={{ width: '70%' }}></div>
                </div>
              </div>
              <div className="keywords-table-row">
                <span className="keyword-name">diabetic wound treatment texas</span>
                <span className="keyword-position">#15</span>
                <span className="keyword-previous">#22</span>
                <span className="keyword-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  +7
                </span>
                <div className="keyword-progress">
                  <div className="keyword-progress-bar" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="keywords-table-row">
                <span className="keyword-name">chronic wound specialist</span>
                <span className="keyword-position">#23</span>
                <span className="keyword-previous">#31</span>
                <span className="keyword-change positive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  +8
                </span>
                <div className="keyword-progress">
                  <div className="keyword-progress-bar" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div className="keywords-table-row">
                <span className="keyword-name">advanced wound care products</span>
                <span className="keyword-position">#34</span>
                <span className="keyword-previous">#32</span>
                <span className="keyword-change negative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                  -2
                </span>
                <div className="keyword-progress">
                  <div className="keyword-progress-bar" style={{ width: '30%' }}></div>
                </div>
              </div>
            </div>
            <div className="keywords-summary">
              <span>Showing 5 of 47 tracked keywords</span>
              <a href="#">View all keywords →</a>
            </div>
          </div>
        </div>

        {/* Pro Dashboard Content */}
        <div className={`results-tab-content ${activeSubtab === 'pro-dashboard' ? 'active' : ''}`} id="pro-dashboard">
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
            <a href="https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM=" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
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
              src="https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM="
              frameBorder="0"
              allowFullScreen
            ></iframe>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  )
}
