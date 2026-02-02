'use client'

import { useState, useEffect } from 'react'
import { ActivityItem, ActivityEmptyState, ActivityLoadingState } from '@/components'
import type { ActivityData } from '@/components'
import './WelcomeView.css'

interface WelcomeViewProps {
  clientId: string
  isAdmin?: boolean
}

interface ResultAlert {
  id: string
  type: string
  message: string
  createdAt: string
}

interface Recommendation {
  id: string
  productId: string
  productName: string
  description: string | null
  whyNote: string | null
  isFeatured: boolean
  priceOption: string | null
  monthlyPrice: number | null
  onetimePrice: number | null
  priority: number
}

interface Invoice {
  id: string
  number: string | null
  created: string
  total: number
  status: string
  invoicePdf: string | null
  receiptUrl: string | null
  hostedUrl: string | null
}

interface BillingSummary {
  lastInvoice: Invoice | null
  nextBillingDate: string | null
  nextBillingDateFormatted: string | null
  monthlyTotal: number
  status: string
}

interface WelcomeData {
  isOnboarding: boolean
  clientAge: number
  companyName: string
  recentActivity: ActivityData[]
  resultAlerts: ResultAlert[]
  billing: BillingSummary | null
  recommendations: Recommendation[]
  lastUpdated: string
}

export function WelcomeView({ clientId, isAdmin = false }: WelcomeViewProps) {
  const [data, setData] = useState<WelcomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWelcomeData() {
      try {
        setLoading(true)
        const apiUrl = isAdmin
          ? `/api/admin/clients/${clientId}/welcome-summary`
          : `/api/client/welcome-summary?clientId=${clientId}`

        const res = await fetch(apiUrl)
        if (!res.ok) throw new Error('Failed to fetch welcome data')

        const result = await res.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchWelcomeData()
  }, [clientId, isAdmin])

  if (loading) {
    return (
      <div className="welcome-view">
        <div className="welcome-loading">
          <div className="spinner" style={{ width: 32, height: 32 }} />
          <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="welcome-view">
        <div className="welcome-error">
          <p>Unable to load dashboard. Please refresh the page.</p>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getAlertTypeStyle = (type: string) => {
    switch (type) {
      case 'milestone':
        return { background: 'var(--success-bg)', color: 'var(--success)' }
      case 'intervention':
        return { background: 'var(--danger-bg)', color: 'var(--danger)' }
      case 'performance_focus':
        return { background: 'var(--warning-bg)', color: 'var(--warning)' }
      default:
        return { background: 'var(--info-bg)', color: 'var(--info)' }
    }
  }

  return (
    <div className="welcome-view">
      {/* Header */}
      <div className="welcome-header">
        <div className="welcome-greeting">
          <h2>Welcome Back{data.companyName ? `, ${data.companyName}` : ''}</h2>
          <p className="welcome-subtitle">Your account at a glance</p>
        </div>
      </div>

      {/* Smart Recommendations - Hero Section */}
      {data.recommendations.length > 0 ? (
        <div className="welcome-section recommendations-hero">
          <div className="section-header">
            <div className="section-title-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <h3>Smart Recommendations</h3>
            </div>
            <p className="section-subtitle">Priority actions based on your account</p>
          </div>
          <div className="recommendations-grid">
            {data.recommendations.slice(0, 4).map((rec) => (
              <div key={rec.id} className={`recommendation-card ${rec.isFeatured ? 'featured' : ''}`}>
                <div className="rec-header">
                  <h4>{rec.productName}</h4>
                  {rec.isFeatured && <span className="featured-badge">Recommended</span>}
                </div>
                {rec.description && <p className="rec-description">{rec.description}</p>}
                {rec.whyNote && (
                  <p className="rec-why">
                    <strong>Why:</strong> {rec.whyNote}
                  </p>
                )}
                <div className="rec-footer">
                  {rec.monthlyPrice !== null && (
                    <span className="rec-price">{formatCurrency(rec.monthlyPrice)}/mo</span>
                  )}
                  {rec.onetimePrice !== null && rec.monthlyPrice === null && (
                    <span className="rec-price">{formatCurrency(rec.onetimePrice)} one-time</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.recommendations.length > 4 && (
            <div className="section-footer">
              <a href="#recommendations" className="view-all-link">
                View all {data.recommendations.length} recommendations
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-section recommendations-hero empty">
          <div className="section-header">
            <div className="section-title-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <h3>Smart Recommendations</h3>
            </div>
          </div>
          <div className="empty-recommendations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <p>You&apos;re all caught up! No pending recommendations.</p>
          </div>
        </div>
      )}

      {/* Three Column Summary */}
      <div className="welcome-columns">
        {/* Recent Activity */}
        <div className="welcome-column">
          <div className="column-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <h4>Recent Activity</h4>
          </div>
          <div className="column-content">
            {data.recentActivity.length > 0 ? (
              <ul className="activity-feed-mini">
                {data.recentActivity.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </ul>
            ) : (
              <ActivityEmptyState message="No recent activity" />
            )}
          </div>
          <div className="column-footer">
            <a href="#activity" className="view-all-link">View All Activity</a>
          </div>
        </div>

        {/* Result Alerts */}
        <div className="welcome-column">
          <div className="column-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <h4>Result Alerts</h4>
          </div>
          <div className="column-content">
            {data.resultAlerts.length > 0 ? (
              <ul className="alerts-list-mini">
                {data.resultAlerts.map((alert) => {
                  const style = getAlertTypeStyle(alert.type)
                  return (
                    <li key={alert.id} className="alert-item-mini">
                      <div className="alert-icon-mini" style={style}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                      </div>
                      <div className="alert-content-mini">
                        <span className="alert-message">{alert.message}</span>
                        <span className="alert-date">{formatDate(alert.createdAt)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="empty-state">No alerts</p>
            )}
          </div>
          <div className="column-footer">
            <a href="#results" className="view-all-link">View Results</a>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="welcome-column">
          <div className="column-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            <h4>Billing</h4>
          </div>
          <div className="column-content">
            {data.billing ? (
              <div className="billing-summary-mini">
                <div className="billing-row">
                  <span className="billing-label">Monthly Total</span>
                  <span className="billing-value">{formatCurrency(data.billing.monthlyTotal)}</span>
                </div>
                {data.billing.nextBillingDateFormatted && (
                  <div className="billing-row">
                    <span className="billing-label">Next Billing</span>
                    <span className="billing-value">{data.billing.nextBillingDateFormatted}</span>
                  </div>
                )}
                {data.billing.lastInvoice && (
                  <div className="billing-row">
                    <span className="billing-label">Last Invoice</span>
                    <span className="billing-value">
                      {formatCurrency(data.billing.lastInvoice.total)}
                      <span className="billing-date"> on {formatDate(data.billing.lastInvoice.created)}</span>
                    </span>
                  </div>
                )}
                <div className="billing-row status">
                  <span className={`billing-status ${data.billing.status}`}>
                    {data.billing.status === 'active' ? 'Active' : data.billing.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="empty-state">No billing info</p>
            )}
          </div>
          <div className="column-footer">
            <a href="#subscription" className="view-all-link">Manage Subscription</a>
          </div>
        </div>
      </div>

      {/* Onboarding Archive Link */}
      <div className="onboarding-archive">
        <details>
          <summary>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            View your onboarding responses and checklist
          </summary>
          <div className="archive-content">
            <p>Your original onboarding information is preserved for reference.</p>
            <a href="#getting-started" className="btn btn-outline btn-sm">
              View Onboarding Archive
            </a>
          </div>
        </details>
      </div>
    </div>
  )
}

export default WelcomeView
