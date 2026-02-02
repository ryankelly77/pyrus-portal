'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ActivityItem, ActivityEmptyState, ActivityLoadingState } from '@/components'
import type { ActivityData } from '@/components'
import './WelcomeView.css'

// Growth stage icons and colors (matching admin dashboard)
type GrowthStage = 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
const growthStageConfig: Record<GrowthStage, { icon: string; color: string; bg: string; label: string }> = {
  prospect: { icon: '○', color: '#6B7280', bg: '#F3F4F6', label: 'Prospect' },
  seedling: { icon: '🌱', color: '#D97706', bg: '#FEF3C7', label: 'Seedling' },
  sprouting: { icon: '🌿', color: '#059669', bg: '#D1FAE5', label: 'Sprouting' },
  blooming: { icon: '🌸', color: '#2563EB', bg: '#DBEAFE', label: 'Blooming' },
  harvesting: { icon: '🌾', color: '#7C3AED', bg: '#EDE9FE', label: 'Harvesting' },
}

interface WelcomeViewProps {
  clientId: string
  isAdmin?: boolean
}

interface ResultAlert {
  id: string
  type: string
  message: string
  createdAt: string
  isDismissed: boolean
}

interface Recommendation {
  id: string
  productId: string
  productName: string
  category: string | null
  description: string | null
  longDescription: string | null
  whyNote: string | null
  isFeatured: boolean
  priceOption: string | null
  monthlyPrice: number | null
  onetimePrice: number | null
  priority: number
  createdAt: string | null
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
  contactFirstName: string | null
  growthStage: string | null
  monthNumber: number
  recentActivity: ActivityData[]
  resultAlerts: ResultAlert[]
  billing: BillingSummary | null
  recommendations: Recommendation[]
  lastUpdated: string
}

export function WelcomeView({ clientId, isAdmin = false }: WelcomeViewProps) {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const [data, setData] = useState<WelcomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Recommendation | null>(null)
  const [onboardingSummary, setOnboardingSummary] = useState<Record<string, Array<{id: string, question: string, answer: string | string[] | null}>> | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  // Helper to build href with viewingAs param preserved
  const buildHref = (path: string) => {
    if (viewingAs) {
      return `${path}?viewingAs=${viewingAs}`
    }
    return path
  }

  // Fetch onboarding summary when archive is opened
  const handleArchiveToggle = async (isOpen: boolean) => {
    if (isOpen && !onboardingSummary && !summaryLoading) {
      setSummaryLoading(true)
      try {
        const url = isAdmin
          ? `/api/client/onboarding?clientId=${clientId}`
          : `/api/client/onboarding?clientId=${clientId}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setOnboardingSummary(data.onboardingSummary || {})
        }
      } catch (err) {
        console.error('Failed to fetch onboarding summary:', err)
      } finally {
        setSummaryLoading(false)
      }
    }
  }

  // Format answer for display
  const formatAnswer = (answer: string | string[] | null): string => {
    if (!answer) return 'Not answered'
    if (Array.isArray(answer)) return answer.join(', ')
    return answer
  }

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

  const formatRecommendedDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()

    // Compare calendar dates by setting both to midnight
    const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const diffDays = Math.round((today.getTime() - dateDay.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`

    // For older dates, show the actual date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const formatCategory = (category: string | null) => {
    if (!category) return null
    // Capitalize first letter and append " Product"
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() + ' Product'
  }

  return (
    <div className="welcome-view">
      {/* Header */}
      <div className="welcome-header">
        <div className="welcome-greeting">
          <h2>Welcome Back{data.contactFirstName ? `, ${data.contactFirstName}` : ''}</h2>
          <p className="welcome-subtitle">Your account at a glance</p>
        </div>
        <div className="welcome-stats">
          {data.growthStage && (
            <div className="welcome-stat">
              <span className="stat-label">Growth Stage</span>
              {(() => {
                const stageKey = data.growthStage.toLowerCase() as GrowthStage
                const config = growthStageConfig[stageKey]
                return (
                  <span className="stat-value stage-badge">
                    <span
                      className="stage-icon"
                      style={{
                        background: config?.bg || '#F3F4F6',
                        color: config?.color || '#6B7280',
                      }}
                    >
                      {config?.icon || '○'}
                    </span>
                    {config?.label || data.growthStage}
                  </span>
                )
              })()}
            </div>
          )}
          <div className="welcome-stat">
            <span className="stat-label">Pyrus Client For</span>
            <span className="stat-value">{data.monthNumber} {data.monthNumber === 1 ? 'month' : 'months'}</span>
          </div>
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
                {rec.createdAt && (
                  <div className="rec-date">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {formatRecommendedDate(rec.createdAt)}
                  </div>
                )}
                <div className="rec-header">
                  <div className="rec-title-wrap">
                    <h4>{rec.productName}</h4>
                    {rec.category && <span className="rec-category">{formatCategory(rec.category)}</span>}
                  </div>
                  {rec.isFeatured && <span className="featured-badge">Recommended</span>}
                </div>
                {rec.description && <p className="rec-description">{rec.description}</p>}
                {rec.whyNote && (
                  <p className="rec-why">
                    <strong>Why:</strong> {rec.whyNote}
                  </p>
                )}
                <div className="rec-footer">
                  <div className="rec-price-row">
                    {rec.monthlyPrice !== null && rec.monthlyPrice > 0 && rec.onetimePrice !== null && rec.onetimePrice > 0 ? (
                      <span className="rec-price">{formatCurrency(rec.monthlyPrice)}/mo for 12 months</span>
                    ) : rec.monthlyPrice !== null && rec.monthlyPrice > 0 ? (
                      <span className="rec-price">{formatCurrency(rec.monthlyPrice)}/mo</span>
                    ) : rec.onetimePrice !== null && rec.onetimePrice > 0 ? (
                      <span className="rec-price">{formatCurrency(rec.onetimePrice)} one-time</span>
                    ) : null}
                  </div>
                  <div className="rec-btn-group">
                    {rec.longDescription && (
                      <button
                        className="btn btn-sm btn-outline rec-learn-btn"
                        onClick={() => setSelectedProduct(rec)}
                      >
                        Learn More
                      </button>
                    )}
                    <Link
                      href={`/checkout?product=${rec.productId}&price=${rec.priceOption || (rec.monthlyPrice && rec.monthlyPrice > 0 ? 'monthly' : 'onetime')}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                      className="btn btn-sm rec-add-btn"
                    >
                      Add to Plan
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <Link href={buildHref('/recommendations')} className="view-all-link">
              {data.recommendations.length > 4
                ? `View all ${data.recommendations.length} recommendations`
                : 'Go to Smart Recommendations'
              }
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </Link>
          </div>
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
            <Link href={buildHref('/activity')} className="view-all-link">View All Activity</Link>
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
                    <li key={alert.id} className={`alert-item-mini ${alert.isDismissed ? 'dismissed' : ''}`}>
                      <div className="alert-icon-mini" style={style}>
                        {alert.isDismissed ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                        )}
                      </div>
                      <div className="alert-content-mini">
                        <span className="alert-message">{alert.message}</span>
                        <span className="alert-date">{formatDate(alert.createdAt)}{alert.isDismissed && ' • Acknowledged'}</span>
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
            <Link href={buildHref('/results')} className="view-all-link">View Results</Link>
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
            <Link href={buildHref('/settings')} className="view-all-link">Manage Subscription</Link>
          </div>
        </div>
      </div>

      {/* Onboarding Archive */}
      <div className="onboarding-archive">
        <details onToggle={(e) => handleArchiveToggle((e.target as HTMLDetailsElement).open)}>
          <summary>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            View your onboarding responses
          </summary>
          <div className="archive-content">
            {summaryLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem' }}>
                <div className="spinner" style={{ width: 24, height: 24 }} />
              </div>
            ) : onboardingSummary && Object.keys(onboardingSummary).length > 0 ? (
              <div className="archive-summary">
                {Object.entries(onboardingSummary).map(([section, responses]) => (
                  <div key={section} className="archive-section">
                    <h4>{section}</h4>
                    <div className="archive-responses">
                      {responses.map((r) => (
                        <div key={r.id} className="archive-response">
                          <span className="archive-question">{r.question}</span>
                          <span className="archive-answer">{formatAnswer(r.answer)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : onboardingSummary ? (
              <p className="archive-empty">No onboarding responses recorded.</p>
            ) : null}
          </div>
        </details>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="product-modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(e) => e.stopPropagation()}>
            <div className="product-modal-header">
              <h3>{selectedProduct.productName}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedProduct(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="product-modal-body">
              {selectedProduct.longDescription && (
                <div
                  className="product-long-description"
                  dangerouslySetInnerHTML={{ __html: selectedProduct.longDescription }}
                />
              )}
              {selectedProduct.whyNote && (
                <div className="product-why-note">
                  <strong>Why we recommend this:</strong> {selectedProduct.whyNote}
                </div>
              )}
            </div>
            <div className="product-modal-footer">
              <div className="modal-price">
                {selectedProduct.monthlyPrice !== null && selectedProduct.monthlyPrice > 0 && selectedProduct.onetimePrice !== null && selectedProduct.onetimePrice > 0 ? (
                  <span>{formatCurrency(selectedProduct.monthlyPrice)}/mo for 12 months</span>
                ) : selectedProduct.monthlyPrice !== null && selectedProduct.monthlyPrice > 0 ? (
                  <span>{formatCurrency(selectedProduct.monthlyPrice)}/mo</span>
                ) : selectedProduct.onetimePrice !== null && selectedProduct.onetimePrice > 0 ? (
                  <span>{formatCurrency(selectedProduct.onetimePrice)} one-time</span>
                ) : null}
              </div>
              <Link
                href={`/checkout?product=${selectedProduct.productId}&price=${selectedProduct.priceOption || (selectedProduct.monthlyPrice && selectedProduct.monthlyPrice > 0 ? 'monthly' : 'onetime')}${viewingAs ? `&viewingAs=${viewingAs}` : ''}`}
                className="btn btn-primary"
              >
                Add to Plan
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WelcomeView
