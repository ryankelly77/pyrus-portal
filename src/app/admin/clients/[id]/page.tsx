'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

type MainTab = 'getting-started' | 'results' | 'activity' | 'content' | 'communication' | 'recommendations'
type GettingStartedSubtab = 'checklist' | 'onboarding-summary'
type ResultsSubtab = 'overview' | 'pro-dashboard'
type ActivityFilter = 'all' | 'task' | 'update' | 'alert' | 'content'

export default function ClientDetailPage() {
  const params = useParams()
  const [activeTab, setActiveTab] = useState<MainTab>('getting-started')
  const [activeSubtab, setActiveSubtab] = useState<GettingStartedSubtab>('checklist')
  const [resultsSubtab, setResultsSubtab] = useState<ResultsSubtab>('overview')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [isClientView, setIsClientView] = useState(false)

  // Activity data
  const activities = [
    { id: 1, type: 'content' as const, title: 'Content approved and published', description: '"January Services Update" blog post is now live on your website', time: 'Today, 3:30 PM' },
    { id: 2, type: 'alert' as const, title: 'Keyword reached Page 1!', description: '"precision wound care San Antonio" moved to position #7', time: 'Today, 2:45 PM' },
    { id: 3, type: 'content' as const, title: 'New content ready for review', description: '"Q1 2026 Marketing Goals" blog post submitted for your approval', time: 'Today, 11:00 AM' },
    { id: 4, type: 'task' as const, title: 'Monthly blog post published', description: '"5 Signs Your Wound Care Needs a Specialist" is now live', time: 'Today, 10:30 AM' },
    { id: 5, type: 'alert' as const, title: 'Traffic milestone: 2,500 visitors!', description: 'Monthly website traffic exceeded 2,500 unique visitors', time: 'Yesterday, 4:30 PM' },
    { id: 6, type: 'update' as const, title: 'Google Ads campaign optimized', description: 'Adjusted bid strategy based on conversion data', time: 'Yesterday, 3:00 PM' },
    { id: 7, type: 'task' as const, title: 'Google Business Profile updated', description: 'Added new photos and updated business hours', time: 'Yesterday, 11:15 AM' },
    { id: 8, type: 'task' as const, title: 'Website launched!', description: 'tc-clinicalservices.com is now live and indexed by Google', time: 'Dec 30, 4:00 PM' },
  ]

  const filteredActivities = activities.filter(
    activity => activityFilter === 'all' || activity.type === activityFilter
  )

  return (
    <>
      <AdminHeader
        title="Client Details"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <>
            <Link href="/admin/clients">Clients</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>TC Clinical Services</span>
          </>
        }
        actions={
          <Link href={`/getting-started?viewingAs=${params.id}`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View as Client
          </Link>
        }
      />

      <div className="admin-content">
        {/* Client Header Card */}
        <div className="client-header-card">
          <div className="client-header">
            <div className="client-info">
              <div className="client-avatar">TC</div>
              <div className="client-details">
                <h1>
                  TC Clinical Services
                  <span className="status-badge active">Active</span>
                </h1>
                <p className="client-meta">dlg.mdservices@gmail.com • Client since Sep 2025 • <Link href="#current-services" className="services-link">4 services</Link></p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Send Result Alert
              </button>
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Resend Invitation
              </button>
              <button className="btn btn-primary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit Client
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'getting-started' ? 'active' : ''}`} onClick={() => setActiveTab('getting-started')}>Getting Started</button>
          <button className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>Results</button>
          <button className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>Activity</button>
          <button className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`} onClick={() => setActiveTab('content')}>Content</button>
          <button className={`tab-btn ${activeTab === 'communication' ? 'active' : ''}`} onClick={() => setActiveTab('communication')}>Communication</button>
          <button className={`tab-btn ${activeTab === 'recommendations' ? 'active' : ''}`} onClick={() => setActiveTab('recommendations')}>Recommendations</button>
        </div>

        {/* ==================== GETTING STARTED TAB ==================== */}
        {activeTab === 'getting-started' && (
          <>
            {/* Getting Started Sub-tabs */}
            <div className="getting-started-subtabs">
              <button
                className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                onClick={() => setActiveSubtab('checklist')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Checklist
              </button>
              <button
                className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
                onClick={() => setActiveSubtab('onboarding-summary')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Onboarding Summary
              </button>
            </div>

            {/* Checklist Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
              <div className="onboarding-grid">
                <div className="checklist-card">
                  <div className="checklist-header">
                    <h3>Onboarding Checklist</h3>
                    <p>Complete these steps to get the most from your marketing</p>
                    <div className="progress-bar-container">
                      <div className="progress-bar-label">
                        <span>Progress</span>
                        <span>5 of 6 completed</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: '83%' }}></div>
                      </div>
                    </div>
                  </div>
                  <div className="checklist-items">
                    <div className="checklist-item completed">
                      <div className="checklist-checkbox completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">Create your portal account</div>
                        <div className="checklist-item-desc">Completed Jan 2, 2026</div>
                      </div>
                    </div>
                    <div className="checklist-item completed">
                      <div className="checklist-checkbox completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">Website launched</div>
                        <div className="checklist-item-desc">tc-clinicalservices.com is live • Completed Dec 30, 2025</div>
                      </div>
                    </div>
                    <div className="checklist-item completed">
                      <div className="checklist-checkbox completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">Google Business Profile claimed</div>
                        <div className="checklist-item-desc">Your business is verified on Google</div>
                      </div>
                    </div>
                    <div className="checklist-item completed">
                      <div className="checklist-checkbox completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">SEO campaign activated</div>
                        <div className="checklist-item-desc">47 keywords now being tracked</div>
                      </div>
                    </div>
                    <div className="checklist-item completed">
                      <div className="checklist-checkbox completed">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">Google Ads campaign launched</div>
                        <div className="checklist-item-desc">Generating 28 leads per month</div>
                      </div>
                    </div>
                    <div className="checklist-item">
                      <div className="checklist-checkbox"></div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">Connect social media accounts</div>
                        <div className="checklist-item-desc">Link Facebook and LinkedIn for enhanced tracking</div>
                      </div>
                      <div className="checklist-item-action">
                        <button className="btn btn-secondary">Connect</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="sidebar-card">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Getting Started Video
                    </h4>
                    <div className="video-container">
                      <div className="video-placeholder">
                        <div className="video-play-btn">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                        <span className="video-duration">2:45</span>
                      </div>
                      <p className="video-caption">Learn how to navigate your portal, track results, and get the most from your marketing partnership.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Onboarding Summary Tab Content */}
            <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
              <div className="onboarding-summary">
                <div className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Client Info
                  </h3>
                  <div className="summary-grid">
                    <div className="summary-field">
                      <label>Name</label>
                      <span>Jon De La Garza</span>
                    </div>
                    <div className="summary-field">
                      <label>Company</label>
                      <span>TC Clinical Services</span>
                    </div>
                    <div className="summary-field">
                      <label>Email</label>
                      <span>dlg.mdservices@gmail.com</span>
                    </div>
                    <div className="summary-field">
                      <label>Phone</label>
                      <span>(210) 394-5245</span>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    Content Writing
                  </h3>
                  <div className="summary-content">
                    <div className="summary-field full-width">
                      <label>Content creation focus</label>
                      <span>Updates on advanced wound care and gait deficit rehab</span>
                    </div>
                    <div className="summary-field full-width">
                      <label>Content posting process</label>
                      <span>Client needs to approve every piece of content before it gets posted</span>
                    </div>
                  </div>
                </div>

                <div className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    Website Design &amp; Development
                  </h3>
                  <div className="summary-content">
                    <div className="summary-field full-width">
                      <label>Primary website goal</label>
                      <span>Generate leads</span>
                    </div>
                    <div className="summary-field full-width">
                      <label>Ideal customer description</label>
                      <span>Medicare patients needing wound care and gait deficit disease patients over the age of 25</span>
                    </div>
                    <div className="summary-field full-width">
                      <label>Required pages/sections</label>
                      <span>Home, Products, Contact, Company Story</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== RESULTS TAB ==================== */}
        {activeTab === 'results' && (
          <div className="results-content">
            {/* Results Sub-tabs */}
            <div className="results-subtabs">
              <button
                className={`results-subtab ${resultsSubtab === 'overview' ? 'active' : ''}`}
                onClick={() => setResultsSubtab('overview')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Overview
              </button>
              <button
                className={`results-subtab ${resultsSubtab === 'pro-dashboard' ? 'active' : ''}`}
                onClick={() => setResultsSubtab('pro-dashboard')}
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
            {resultsSubtab === 'overview' && (
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
                        +32%
                      </div>
                    </div>
                    <div className="kpi-value">2,847</div>
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
                        +17
                      </div>
                    </div>
                    <div className="kpi-value">47</div>
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
                        +8
                      </div>
                    </div>
                    <div className="kpi-value">28</div>
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
                        +12
                      </div>
                    </div>
                    <div className="kpi-value">34</div>
                    <div className="kpi-label">Phone Calls</div>
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
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">precision wound care san antonio</span>
                      <span className="keyword-position">#7</span>
                      <span className="keyword-previous">#24</span>
                      <span className="keyword-change positive">+17</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">wound care clinic near me</span>
                      <span className="keyword-position">#12</span>
                      <span className="keyword-previous">#18</span>
                      <span className="keyword-change positive">+6</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">diabetic wound treatment texas</span>
                      <span className="keyword-position">#15</span>
                      <span className="keyword-previous">#22</span>
                      <span className="keyword-change positive">+7</span>
                    </div>
                    <div className="keywords-table-row">
                      <span className="keyword-name">chronic wound specialist</span>
                      <span className="keyword-position">#23</span>
                      <span className="keyword-previous">#31</span>
                      <span className="keyword-change positive">+8</span>
                    </div>
                  </div>
                  <div className="keywords-summary">
                    <span>Showing 4 of 47 tracked keywords</span>
                    <a href="#">View all keywords →</a>
                  </div>
                </div>
              </>
            )}

            {/* Pro Dashboard Content */}
            {resultsSubtab === 'pro-dashboard' && (
              <div className="pro-dashboard-content">
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
            )}
          </div>
        )}

        {/* ==================== ACTIVITY TAB ==================== */}
        {activeTab === 'activity' && (
          <div className="activity-content">
            <div className="activity-filters">
              <button className={`filter-chip ${activityFilter === 'all' ? 'active' : ''}`} onClick={() => setActivityFilter('all')}>All Activity</button>
              <button className={`filter-chip ${activityFilter === 'task' ? 'active' : ''}`} onClick={() => setActivityFilter('task')}>Tasks</button>
              <button className={`filter-chip ${activityFilter === 'update' ? 'active' : ''}`} onClick={() => setActivityFilter('update')}>Updates</button>
              <button className={`filter-chip ${activityFilter === 'alert' ? 'active' : ''}`} onClick={() => setActivityFilter('alert')}>Result Alerts</button>
              <button className={`filter-chip ${activityFilter === 'content' ? 'active' : ''}`} onClick={() => setActivityFilter('content')}>Content</button>
            </div>

            <div className="activity-card">
              <ul className="activity-list">
                {filteredActivities.map(activity => (
                  <li key={activity.id} className="activity-item" data-type={activity.type}>
                    <div className={`activity-icon ${activity.type}`}>
                      {activity.type === 'content' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                      )}
                      {activity.type === 'alert' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                      )}
                      {activity.type === 'task' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 11 12 14 22 4"></polyline>
                          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                        </svg>
                      )}
                      {activity.type === 'update' && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 4 23 10 17 10"></polyline>
                          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                      )}
                    </div>
                    <div className="activity-details">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-desc">{activity.description}</div>
                    </div>
                    <div className="activity-time">{activity.time}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ==================== CONTENT TAB ==================== */}
        {activeTab === 'content' && (
          <div className="content-manager-tab">
            {/* Content Stats */}
            <div className="content-stats">
              <div className="content-stat-card urgent">
                <div className="stat-label">Urgent Reviews</div>
                <div className="stat-value">2</div>
                <div className="stat-desc">Less than 24 hours</div>
              </div>
              <div className="content-stat-card">
                <div className="stat-label">Pending Approval</div>
                <div className="stat-value">5</div>
                <div className="stat-desc">Awaiting client review</div>
              </div>
              <div className="content-stat-card">
                <div className="stat-label">Approved</div>
                <div className="stat-value">2</div>
                <div className="stat-desc">Ready for publishing</div>
              </div>
              <div className="content-stat-card">
                <div className="stat-label">Published</div>
                <div className="stat-value">6</div>
                <div className="stat-desc">Live content</div>
              </div>
            </div>

            {/* Content List */}
            <div className="content-section">
              <div className="content-section-header">
                <h3 className="urgent-title">Urgent Reviews</h3>
              </div>
              <div className="content-list">
                <div className="content-item urgent">
                  <div className="content-item-header">
                    <span className="platform-badge website">Website Content</span>
                    <div className="time-remaining urgent">
                      <span className="time-label">Time remaining</span>
                      <span className="time-value">23 hours</span>
                    </div>
                  </div>
                  <h4 className="content-title">Black Friday Sale Announcement</h4>
                  <div className="content-meta">
                    <span className="content-type">Blog Post</span>
                    <span className="content-date">Added Nov 15</span>
                  </div>
                  <p className="content-preview">Get ready for our biggest sale of the year! This Black Friday, enjoy up to 50% off on all our digital marketing services...</p>
                  <div className="content-actions">
                    <button className="btn btn-primary btn-sm">Review &amp; Edit</button>
                    <button className="btn btn-outline btn-sm">Quick Approve</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="content-section">
              <div className="content-section-header">
                <h3>Pending Approval</h3>
              </div>
              <div className="content-list">
                <div className="content-item">
                  <div className="content-item-header">
                    <span className="platform-badge website">Website Content</span>
                    <div className="time-remaining">
                      <span className="time-label">Time remaining</span>
                      <span className="time-value">4 days</span>
                    </div>
                  </div>
                  <h4 className="content-title">2025 Marketing Trends You Need to Know</h4>
                  <div className="content-meta">
                    <span className="content-type">Blog Post</span>
                    <span className="content-date">Added Nov 20</span>
                  </div>
                  <p className="content-preview">Stay ahead of the curve with these 10 marketing trends that will dominate 2025...</p>
                  <div className="content-actions">
                    <button className="btn btn-primary btn-sm">Review &amp; Edit</button>
                    <button className="btn btn-outline btn-sm">Quick Approve</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== COMMUNICATION TAB ==================== */}
        {activeTab === 'communication' && (
          <div className="communication-content">
            {/* Stats Overview */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Communications</div>
                <div className="stat-value">11</div>
                <div className="stat-detail">Last 30 days</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Emails Sent</div>
                <div className="stat-value">4</div>
                <div className="stat-detail">3 delivered, 1 failed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Result Alerts</div>
                <div className="stat-value purple">2</div>
                <div className="stat-detail">Both viewed</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Email Open Rate</div>
                <div className="stat-value success">67%</div>
                <div className="stat-detail">2 of 3 delivered</div>
              </div>
            </div>

            {/* Communication Timeline */}
            <div className="timeline-card">
              <div className="timeline-header">
                <div className="timeline-title">
                  <h3>Communication Timeline</h3>
                  <p>All client communications in chronological order</p>
                </div>
              </div>

              <ul className="timeline-list">
                <li className="timeline-item highlight-success" data-type="result">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">2:45 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon result-alert">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>Result Alert Sent <span className="type-label result">Result Alert</span></h4>
                          <span className="subject">Your keyword is now ranking on Page 1!</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">Delivered</span>
                          <span className="status-pill opened">Viewed</span>
                        </div>
                      </div>
                      <div className="result-highlight">
                        <div className="result-text">
                          <strong>&quot;precision wound care San Antonio&quot; — Now Position #7</strong>
                          <span>Moved from position #24 to #7 (up 17 spots!)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>

                <li className="timeline-item" data-type="email">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">8:00 AM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon email-reminder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>Invitation Reminder <span className="type-label reminder">Reminder</span></h4>
                          <span className="subject">Your Pyrus Digital portal is waiting for you</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">Delivered</span>
                          <span className="status-pill opened">Opened</span>
                          <span className="status-pill clicked">Clicked</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ==================== RECOMMENDATIONS TAB ==================== */}
        {activeTab === 'recommendations' && (
          <div className="recommendations-content">
            {/* Growth Stage Hero Section */}
            <div className="growth-stage-hero">
              <div className="growth-stage-main">
                <div className="stage-icon-large">🌿</div>
                <div className="stage-content">
                  <div className="stage-label">Growth Stage</div>
                  <div className="stage-name-large">
                    Sprouting
                    <span className="month-badge">Month 4</span>
                  </div>
                  <div className="stage-description-large">
                    Building momentum with early results appearing. Marketing foundation is taking root.
                  </div>
                </div>
                <div className="stage-stats">
                  <div className="stage-stat">
                    <span className="stage-stat-value">47</span>
                    <span className="stage-stat-label">Keywords Ranking</span>
                  </div>
                  <div className="stage-stat">
                    <span className="stage-stat-value">28</span>
                    <span className="stage-stat-label">Leads This Month</span>
                  </div>
                  <div className="stage-stat">
                    <span className="stage-stat-value">+85%</span>
                    <span className="stage-stat-label">Traffic Growth</span>
                  </div>
                </div>
              </div>
              <div className="growth-progress-section">
                <div className="progress-track-large">
                  <div className="progress-stage completed">
                    <div className="stage-icon">🌱</div>
                    <div className="progress-dot"></div>
                    <span>Seedling</span>
                  </div>
                  <div className="progress-line completed"></div>
                  <div className="progress-stage current">
                    <div className="stage-icon">🌿</div>
                    <div className="progress-dot"></div>
                    <span>Sprouting</span>
                  </div>
                  <div className="progress-line"></div>
                  <div className="progress-stage">
                    <div className="stage-icon">🌸</div>
                    <div className="progress-dot"></div>
                    <span>Blooming</span>
                  </div>
                  <div className="progress-line"></div>
                  <div className="progress-stage">
                    <div className="stage-icon">🌾</div>
                    <div className="progress-dot"></div>
                    <span>Harvesting</span>
                  </div>
                </div>
                <div className="refresh-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                  </svg>
                  Next recommendations refresh: <strong>February 18, 2026</strong> (47 days)
                </div>
              </div>
            </div>

            {/* Current Services */}
            <div className="current-services-list">
              <div className="current-services-list-header">
                <h3>Current Services</h3>
                <span>Monthly Investment</span>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Seedling SEO Plan</div>
                  <div className="current-service-desc">Foundational on-page SEO &amp; performance tracking</div>
                </div>
                <div className="current-service-price">
                  <strong>$599</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Google Ads Management</div>
                  <div className="current-service-desc">Campaign management &amp; optimization</div>
                </div>
                <div className="current-service-price">
                  <strong>$499</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Google Business Profile Management</div>
                  <div className="current-service-desc">Local search optimization &amp; posting</div>
                </div>
                <div className="current-service-price">
                  <strong>$199</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-service-row">
                <div className="current-service-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                </div>
                <div className="current-service-info">
                  <div className="current-service-name">Analytics &amp; Tracking Setup</div>
                  <div className="current-service-desc">Performance monitoring &amp; reporting</div>
                </div>
                <div className="current-service-price">
                  <strong>$99</strong><br />
                  <span>/month</span>
                </div>
              </div>
              <div className="current-services-total">
                <div className="current-services-total-label">
                  Total Monthly Investment
                  <span>4 active services</span>
                </div>
                <div className="current-services-total-value">
                  $1,396<span> per month</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
