'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

type TabType = 'smart-recommendations' | 'original-plan' | 'current-services'

// Format price - show cents only when there's a fractional part
const formatPrice = (amount: number): string => {
  const hasCents = amount % 1 !== 0
  if (hasCents) {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return Math.round(amount).toLocaleString('en-US')
}

interface RecommendationItem {
  id: string
  tier: string | null
  quantity?: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  product: { id: string; name: string; category: string; short_description: string | null; long_description: string | null; monthly_price: string | null; onetime_price: string | null } | null
  bundle: { id: string; name: string; description: string | null; long_description: string | null; monthly_price: string | null; onetime_price: string | null } | null
  addon: { id: string; name: string; description: string | null; long_description: string | null; price?: string | null; monthly_price?: string | null; onetime_price?: string | null } | null
}

interface RecommendationHistory {
  id: string
  action: string
  details: string | null
  created_at: string
  created_by: string | null
}

interface Recommendation {
  id: string
  status: string
  purchased_tier: string | null
  purchased_at: string | null
  discount_applied: string | null
  good_description: string | null
  better_description: string | null
  best_description: string | null
  recommendation_items: RecommendationItem[]
  history?: RecommendationHistory[]
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  growth_stage: string | null
  status?: string | null
}

interface SubscriptionItem {
  id: string
  quantity: number | null
  unit_amount: string | null
  product: { id: string; name: string; category: string; short_description: string | null; monthly_price: string | null } | null
  bundle: { id: string; name: string; description: string | null; monthly_price: string | null } | null
}

interface Subscription {
  id: string
  status: string | null
  current_period_start: string | null
  current_period_end: string | null
  monthly_amount: string | null
  created_at: string | null
  subscription_items: SubscriptionItem[]
}

interface StripeSubscriptionItem {
  id: string
  priceId: string
  product: {
    id: string
    name: string
    description?: string
  }
  quantity: number | null
  unitAmount: number
  currency: string
  interval: string
  intervalCount: number
}

interface StripeSubscription {
  id: string
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd?: boolean
  canceledAt?: string | null
  created?: string
  items: StripeSubscriptionItem[]
}

interface ManualProduct {
  id: string
  productId: string
  name: string
  category: string
  description: string | null
  source: 'manual'
  assignedAt: string | null
  notes: string | null
  monthlyPrice: number
  hasCustomPrice: boolean
}

interface StripeHistoryEvent {
  id: string
  type?: string
  date: string
  action: string
  details: string
  products?: string[]
}

interface StripeInvoice {
  id: string
  number: string | null
  status: string | null
  amountDue?: number
  amountPaid?: number
  amountRemaining?: number
  subtotal?: number
  total: number
  tax?: number | null
  currency?: string
  created: string | null
  dueDate?: string | null
  paidAt?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  hostedInvoiceUrl?: string | null
  invoicePdf: string | null
  description?: string | null
  subscriptionId?: string | null
}

interface RecommendationsViewProps {
  clientId: string
  isAdmin?: boolean
  isDemo?: boolean
  clientName?: string
  defaultTab?: TabType
  // For admin view - pass pre-loaded data
  dbClient?: DBClient | null
  recommendation?: Recommendation | null
  recommendationLoading?: boolean
  subscriptions?: Subscription[]
  subscriptionsLoading?: boolean
  stripeSubscriptions?: StripeSubscription[]
  stripeSubscriptionsLoading?: boolean
  manualProducts?: ManualProduct[]
  manualProductsLoading?: boolean
  isActiveClient?: boolean
  // Admin-specific data for Current Services subtab
  stripeHistory?: StripeHistoryEvent[]
  stripeHistoryLoading?: boolean
  invoices?: StripeInvoice[]
  invoicesLoading?: boolean
  stripeCustomerId?: string | null
  // For client view only
  isPending?: boolean
  demoState?: string | null
  viewingAs?: string | null
}

// Growth Rewards tier thresholds - shared constant
const REWARD_TIERS = [
  { threshold: 0, discount: 0, coupon: null },
  { threshold: 1000, discount: 5, coupon: 'HARVEST5X' },
  { threshold: 1500, discount: 5, coupon: 'HARVEST5X' },
  { threshold: 2000, discount: 10, coupon: 'CULTIVATE10' },
]

// Icon mapping based on service name
const getServiceIcon = (name: string) => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('seo')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    )
  } else if (lowerName.includes('ads') || lowerName.includes('google ads')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    )
  } else if (lowerName.includes('business profile') || lowerName.includes('gbp') || lowerName.includes('local')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
    )
  } else if (lowerName.includes('analytics') || lowerName.includes('tracking')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
    )
  } else if (lowerName.includes('content') || lowerName.includes('writing')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    )
  } else if (lowerName.includes('ai') || lowerName.includes('visibility')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
        <path d="M12 2a10 10 0 0 1 10 10"></path>
      </svg>
    )
  } else if (lowerName.includes('website') || lowerName.includes('site') || lowerName.includes('care')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  } else if (lowerName.includes('brand')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
      </svg>
    )
  } else {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    )
  }
}

export function RecommendationsView({
  clientId,
  isAdmin = false,
  isDemo = false,
  clientName,
  defaultTab = 'original-plan',
  dbClient: propDbClient,
  recommendation: propRecommendation,
  recommendationLoading: propRecommendationLoading,
  subscriptions: propSubscriptions,
  subscriptionsLoading: propSubscriptionsLoading,
  stripeSubscriptions: propStripeSubscriptions,
  stripeSubscriptionsLoading: propStripeSubscriptionsLoading,
  manualProducts: propManualProducts,
  manualProductsLoading: propManualProductsLoading,
  isActiveClient: propIsActiveClient,
  stripeHistory: propStripeHistory,
  stripeHistoryLoading: propStripeHistoryLoading,
  invoices: propInvoices,
  invoicesLoading: propInvoicesLoading,
  stripeCustomerId: propStripeCustomerId,
  isPending: propIsPending,
  demoState,
  viewingAs,
}: RecommendationsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<TabType>(defaultTab)
  const [modalContent, setModalContent] = useState<{ name: string; html: string } | null>(null)

  // Sync activeTab when defaultTab changes (e.g., from parent navigation)
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Client-side data fetching (when not admin)
  const [localDbClient, setLocalDbClient] = useState<DBClient | null>(null)
  const [localRecommendation, setLocalRecommendation] = useState<Recommendation | null>(null)
  const [localSubscriptions, setLocalSubscriptions] = useState<Subscription[]>([])
  const [localLoading, setLocalLoading] = useState(!isAdmin)

  // Use prop data for admin, local data for client
  const dbClient = isAdmin ? propDbClient : localDbClient
  const recommendation = isAdmin ? propRecommendation : localRecommendation
  const recommendationLoading = isAdmin ? propRecommendationLoading : localLoading
  const subscriptions = isAdmin ? (propSubscriptions || []) : localSubscriptions
  const subscriptionsLoading = isAdmin ? propSubscriptionsLoading : localLoading
  const stripeSubscriptions = propStripeSubscriptions || []
  const stripeSubscriptionsLoading = propStripeSubscriptionsLoading || false
  const manualProducts = propManualProducts || []
  const manualProductsLoading = propManualProductsLoading || false

  // Determine active status
  const isActiveClient = isAdmin
    ? propIsActiveClient
    : (dbClient?.status === 'active' || dbClient?.status === 'client')
  const isPending = propIsPending ?? (dbClient?.status === 'pending' || dbClient?.status === 'prospect')

  // Client-side data fetching
  useEffect(() => {
    if (isAdmin || isDemo) return // Skip for admin (data passed via props) or demo

    async function fetchData() {
      try {
        const apiUrl = `/api/client/recommendation?clientId=${clientId}`
        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setLocalDbClient(data.client)
            setLocalRecommendation(data.recommendation)
            setLocalSubscriptions(data.subscriptions || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch recommendation:', error)
      } finally {
        setLocalLoading(false)
      }
    }

    fetchData()
  }, [clientId, isAdmin, isDemo])

  // Get display name
  const displayName = clientName || dbClient?.name || 'this client'

  // Loading state
  if (recommendationLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    )
  }

  return (
    <div className="recommendations-content">
      {/* Growth Stage Hero Section - Show for active clients */}
      {isActiveClient && !isPending && (
        <div className="growth-stage-hero">
          <div className="growth-stage-main">
            <div className="stage-icon-large">
              {dbClient?.growth_stage === 'seedling' && '🌱'}
              {dbClient?.growth_stage === 'sprouting' && '🌿'}
              {dbClient?.growth_stage === 'blooming' && '🌸'}
              {dbClient?.growth_stage === 'harvesting' && '🌾'}
              {!dbClient?.growth_stage && '🌱'}
            </div>
            <div className="stage-content">
              <div className="stage-label">{isAdmin ? 'Growth Stage' : 'Your Growth Stage'}</div>
              <div className="stage-name-large">
                {dbClient?.growth_stage === 'seedling' && 'Seedling'}
                {dbClient?.growth_stage === 'sprouting' && 'Sprouting'}
                {dbClient?.growth_stage === 'blooming' && 'Blooming'}
                {dbClient?.growth_stage === 'harvesting' && 'Harvesting'}
                {!dbClient?.growth_stage && 'Seedling'}
                <span className="month-badge">Month 1</span>
              </div>
              <div className="stage-description-large">
                {dbClient?.growth_stage === 'seedling' && (isAdmin
                  ? "Just getting started! Foundation being established."
                  : "Just getting started! We're laying the groundwork for your marketing success."
                )}
                {dbClient?.growth_stage === 'sprouting' && (isAdmin
                  ? "Building momentum with early results appearing."
                  : "Building momentum with early results appearing. Your marketing foundation is taking root!"
                )}
                {dbClient?.growth_stage === 'blooming' && (isAdmin
                  ? "Thriving with strong results and growth."
                  : "Your marketing is flourishing with strong results. Time to optimize and scale!"
                )}
                {dbClient?.growth_stage === 'harvesting' && (isAdmin
                  ? "Reaping the rewards of sustained growth."
                  : "Peak performance achieved! Reaping the rewards of your marketing investment."
                )}
                {!dbClient?.growth_stage && (isAdmin
                  ? "Just getting started! Foundation being established."
                  : "Just getting started! We're laying the groundwork for your marketing success."
                )}
              </div>
            </div>
            <div className="stage-stats">
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Keywords Ranking</span>
              </div>
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Leads This Month</span>
              </div>
              <div className="stage-stat">
                <span className="stage-stat-value">--</span>
                <span className="stage-stat-label">Traffic Growth</span>
              </div>
            </div>
          </div>
          <div className="growth-progress-section">
            <div className="progress-track-large">
              <div className={`progress-stage ${dbClient?.growth_stage === 'seedling' ? 'current' : ['sprouting', 'blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : 'current'}`}>
                <div className="stage-icon">🌱</div>
                <div className="progress-dot"></div>
                <span>Seedling</span>
              </div>
              <div className={`progress-line ${['sprouting', 'blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'sprouting' ? 'current' : ['blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}>
                <div className="stage-icon">🌿</div>
                <div className="progress-dot"></div>
                <span>Sprouting</span>
              </div>
              <div className={`progress-line ${['blooming', 'harvesting'].includes(dbClient?.growth_stage || '') ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'blooming' ? 'current' : dbClient?.growth_stage === 'harvesting' ? 'completed' : ''}`}>
                <div className="stage-icon">🌸</div>
                <div className="progress-dot"></div>
                <span>Blooming</span>
              </div>
              <div className={`progress-line ${dbClient?.growth_stage === 'harvesting' ? 'completed' : ''}`}></div>
              <div className={`progress-stage ${dbClient?.growth_stage === 'harvesting' ? 'current' : ''}`}>
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
              Next recommendations refresh: <strong>90 days</strong> from start
            </div>
          </div>
        </div>
      )}

      {/* Subtabs Navigation */}
      <div className="recommendations-tabs">
        <button
          className={`recommendations-tab ${activeTab === 'original-plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('original-plan')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Original Plan
        </button>
        <button
          className={`recommendations-tab ${activeTab === 'current-services' ? 'active' : ''}`}
          onClick={() => setActiveTab('current-services')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
          Your Current Services
          {!isActiveClient && (
            <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          )}
        </button>
        <button
          className={`recommendations-tab ${activeTab === 'smart-recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('smart-recommendations')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Smart Recommendations
          {!isActiveClient ? (
            <svg className="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          ) : (
            <span className="tab-badge coming-soon">Coming Soon</span>
          )}
        </button>
      </div>

      {/* Smart Recommendations Subtab */}
      {activeTab === 'smart-recommendations' && (
        <>
          {!isActiveClient ? (
            <div className="locked-placeholder">
              <div className="locked-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3>Smart Recommendations</h3>
              <p>
                {isAdmin
                  ? `Once ${displayName} is an active client, we'll analyze their marketing data to provide AI-powered recommendations tailored to their growth goals.`
                  : "Once you're an active client, we'll analyze your marketing data to provide AI-powered recommendations tailored to your growth goals."
                }
              </p>
            </div>
          ) : (
            <div className="coming-soon-placeholder">
              <div className="coming-soon-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h2>Smart Recommendations Coming Soon</h2>
              <p>
                {isAdmin
                  ? `We're analyzing ${displayName}'s marketing performance data to generate personalized AI-powered recommendations. The first set of smart recommendations will be available in approximately 90 days.`
                  : "We're analyzing your marketing performance data to generate personalized AI-powered recommendations. The first set of smart recommendations will be available in approximately 90 days."
                }
              </p>
              <div className="coming-soon-timeline">
                <div className="timeline-item">
                  <div className="timeline-dot active"></div>
                  <span>Campaign data collection started</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot pending"></div>
                  <span>AI analysis in progress</span>
                </div>
                <div className="timeline-item">
                  <div className="timeline-dot pending"></div>
                  <span>Smart recommendations generation</span>
                </div>
              </div>
              <div className="refresh-info" style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: '#5A6358' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                First recommendations expected around <strong>90 days</strong> from start date
              </div>
            </div>
          )}
        </>
      )}

      {/* Original Plan Subtab */}
      {activeTab === 'original-plan' && (
        <div className="original-plan-content">
          {recommendationLoading ? (
            <div className="loading-placeholder">Loading recommendation data...</div>
          ) : recommendation ? (
            <>
              {/* Plan Intro Header */}
              <div className="original-plan-header">
                <div className="plan-intro-card">
                  <div className="plan-intro-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <div className="plan-intro-content">
                    <h2>{isAdmin ? 'Marketing Proposal' : 'Your Marketing Proposal'}</h2>
                    <p>
                      {isAdmin
                        ? `Three service tiers tailored to ${displayName}'s business goals.`
                        : "We've prepared three service tiers tailored to your business goals. Choose the option that best fits your growth objectives and budget."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Good / Better / Best Pricing Tiers */}
              <div className="pricing-tiers">
                {(['good', 'better', 'best'] as const).map(tierName => {
                  const tierItems = recommendation.recommendation_items.filter(item => item.tier === tierName)
                  const isPurchased = recommendation.purchased_tier === tierName

                  // Calculate full pricing breakdown
                  let fullPriceMonthly = 0
                  let fullPriceOnetime = 0
                  let freeItemsValueMonthly = 0
                  let freeItemsValueOnetime = 0
                  let yourPriceMonthlyRaw = 0
                  let yourPriceOnetimeRaw = 0
                  let baseTotalForRewards = 0

                  tierItems.forEach(item => {
                    const qty = item.quantity || 1
                    const itemMonthly = Number(item.monthly_price || 0)
                    const itemOnetime = Number(item.onetime_price || 0)
                    const itemName = item.product?.name || item.bundle?.name || item.addon?.name || ''
                    const isAnalytics = itemName.includes('Analytics Tracking')

                    if (item.is_free) {
                      const productMonthly = Number(item.product?.monthly_price || item.bundle?.monthly_price || 0)
                      const productOnetime = Number(item.product?.onetime_price || item.bundle?.onetime_price || 0)
                      fullPriceMonthly += productMonthly * qty
                      fullPriceOnetime += productOnetime * qty
                      freeItemsValueMonthly += productMonthly * qty
                      freeItemsValueOnetime += productOnetime * qty
                    } else {
                      fullPriceMonthly += itemMonthly * qty
                      fullPriceOnetime += itemOnetime * qty
                      if (!isAnalytics) {
                        baseTotalForRewards += itemMonthly * qty
                      }
                    }

                    yourPriceMonthlyRaw += itemMonthly * qty
                    yourPriceOnetimeRaw += itemOnetime * qty
                  })

                  // Determine reward tier
                  let rewardTierIndex = 0
                  for (let i = REWARD_TIERS.length - 1; i >= 0; i--) {
                    if (baseTotalForRewards >= REWARD_TIERS[i].threshold) {
                      rewardTierIndex = i
                      break
                    }
                  }
                  const currentRewardTier = REWARD_TIERS[rewardTierIndex]

                  const discountPercent = currentRewardTier.discount
                  const couponCode = currentRewardTier.coupon
                  const discountAmount = Math.round(yourPriceMonthlyRaw * (discountPercent / 100) * 100) / 100
                  const yourPriceMonthly = yourPriceMonthlyRaw - discountAmount
                  const yourPriceOnetime = yourPriceOnetimeRaw

                  const totalSavings = (fullPriceMonthly - yourPriceMonthly) + (fullPriceOnetime - yourPriceOnetime)
                  const hasFreeItems = freeItemsValueMonthly > 0 || freeItemsValueOnetime > 0
                  const afterFreeMonthly = fullPriceMonthly - freeItemsValueMonthly
                  const afterFreeOnetime = fullPriceOnetime - freeItemsValueOnetime

                  const tierDescriptions: Record<string, string> = {
                    good: recommendation.good_description || 'Establish a professional foundation to help customers find and trust your business.',
                    better: recommendation.better_description || 'Build your online presence and start attracting qualified leads through search.',
                    best: recommendation.best_description || 'Comprehensive marketing to dominate your local market across all channels.',
                  }

                  return (
                    <div key={tierName} className={`pricing-tier${isPurchased ? ' selected' : ''}`}>
                      <div className="pricing-tier-header">
                        <div className="pricing-tier-label">
                          {tierName.charAt(0).toUpperCase() + tierName.slice(1)}
                          {isPurchased && <span className="selected-badge">Selected</span>}
                        </div>
                        <div className="pricing-tier-desc">{tierDescriptions[tierName]}</div>
                      </div>
                      <div className="pricing-tier-services">
                        {tierItems.length === 0 ? (
                          <div className="pricing-service-item empty">
                            <div className="pricing-service-info">
                              <div className="pricing-service-name">No items in this tier</div>
                            </div>
                          </div>
                        ) : (
                          tierItems.map(item => {
                            const itemName = item.product?.name || item.bundle?.name || item.addon?.name || 'Service'
                            const itemDesc = item.product?.short_description || item.bundle?.description || item.addon?.description || ''
                            const itemLongDesc = item.product?.long_description || item.bundle?.long_description || item.addon?.long_description || ''
                            const monthlyPrice = Number(item.monthly_price || 0)
                            const onetimePrice = Number(item.onetime_price || 0)
                            const isFree = item.is_free

                            return (
                              <div key={item.id} className={`pricing-service-item${isFree ? ' free' : ''}`}>
                                <div className={`pricing-service-check${isPurchased ? ' included' : ''}`}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                </div>
                                <div className="pricing-service-info">
                                  <div className="pricing-service-name">
                                    {itemName}
                                    {isFree && <span className="free-badge">FREE</span>}
                                    {itemLongDesc && (
                                      <button
                                        type="button"
                                        className="product-info-btn"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setModalContent({ name: itemName, html: itemLongDesc })
                                        }}
                                        aria-label={`More info about ${itemName}`}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                          <circle cx="12" cy="12" r="10"></circle>
                                          <line x1="12" y1="16" x2="12" y2="12"></line>
                                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                      </button>
                                    )}
                                  </div>
                                  {itemDesc && <div className="pricing-service-desc">{itemDesc}</div>}
                                </div>
                                <div className="pricing-service-price">
                                  {isFree ? (
                                    <>$0<br /><span>included</span></>
                                  ) : monthlyPrice > 0 ? (
                                    <>${monthlyPrice.toLocaleString()}<br /><span>/month</span></>
                                  ) : onetimePrice > 0 ? (
                                    <>${onetimePrice.toLocaleString()}<br /><span>one-time</span></>
                                  ) : (
                                    <>Included</>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                      <div className="pricing-tier-footer">
                        <div className="pricing-breakdown">
                          {totalSavings > 0 && (
                            <div className="pricing-line strikethrough">
                              <span className="pricing-line-label">Full Price</span>
                              <span className="pricing-line-value">
                                {fullPriceOnetime > 0
                                  ? `$${formatPrice(fullPriceOnetime + fullPriceMonthly)} today, then $${formatPrice(fullPriceMonthly)}/mo`
                                  : `$${formatPrice(fullPriceMonthly)}/mo`
                                }
                              </span>
                            </div>
                          )}
                          {hasFreeItems && (
                            <div className="pricing-line">
                              <span className="pricing-line-label">After Free Items</span>
                              <span className="pricing-line-value">
                                {afterFreeOnetime > 0
                                  ? `$${formatPrice(afterFreeOnetime + afterFreeMonthly)} today, then $${formatPrice(afterFreeMonthly)}/mo`
                                  : `$${formatPrice(afterFreeMonthly)}/mo`
                                }
                              </span>
                            </div>
                          )}
                          <div className="pricing-line highlight">
                            <span className="pricing-line-label">{totalSavings > 0 ? 'Your Price' : 'Total'}</span>
                            <span className="pricing-line-value highlight">
                              {yourPriceOnetime > 0
                                ? `$${formatPrice(yourPriceOnetime + yourPriceMonthly)} today, then $${formatPrice(yourPriceMonthly)}/mo`
                                : `$${formatPrice(yourPriceMonthly)}/mo`
                              }
                            </span>
                          </div>
                          {totalSavings > 0 && (
                            <div className="pricing-line savings">
                              <span className="pricing-line-label">You Save</span>
                              <span className="pricing-line-value savings">
                                ${formatPrice(totalSavings)}/mo
                                {discountPercent > 0 && ` (includes ${discountPercent}% discount)`}
                              </span>
                            </div>
                          )}
                          {couponCode && (
                            <div className="coupon-display">
                              <span className="coupon-label">Use code at checkout:</span>
                              <span className="coupon-code">{couponCode}</span>
                            </div>
                          )}
                        </div>
                        {isPurchased ? (
                          <button className="pricing-tier-btn selected">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Selected Plan
                            {recommendation.purchased_at && (
                              <span style={{ fontWeight: 400, marginLeft: '8px', opacity: 0.8 }}>
                                ({new Date(recommendation.purchased_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                              </span>
                            )}
                          </button>
                        ) : isAdmin ? (
                          <div className="pricing-tier-btn-placeholder" style={{ height: '44px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {tierName === 'good' ? 'Starter Option' : tierName === 'better' ? 'Popular Choice' : 'Premium Option'}
                          </div>
                        ) : recommendation.purchased_tier ? (
                          <div className="pricing-tier-btn-placeholder" style={{ height: '44px', borderRadius: '8px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {tierName === 'good' ? 'Starter Option' : tierName === 'better' ? 'Popular Choice' : 'Premium Option'}
                          </div>
                        ) : (
                          <button
                            className="pricing-tier-btn primary"
                            onClick={() => router.push(`/checkout?tier=${tierName}${viewingAs ? `&viewingAs=${viewingAs}` : ''}${couponCode ? `&coupon=${couponCode}` : ''}`)}
                          >
                            {tierName === 'good' ? 'Select the Starter Option' : tierName === 'better' ? 'Select the Popular Choice' : 'Select the Premium Option'}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                              <path d="M5 12h14"></path>
                              <path d="M12 5l7 7-7 7"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Recommendation History */}
              {recommendation.history && recommendation.history.length > 0 && (
                <div className="recommendation-history" style={{ marginTop: '2rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Recommendation History
                  </h4>
                  <div className="history-list" style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                    {recommendation.history.map((entry, index) => (
                      <div key={entry.id} className="history-item" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.75rem 0', borderBottom: index < recommendation.history!.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <div className="history-date" style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', minWidth: '100px' }}>
                          {new Date(entry.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          <br />
                          <span style={{ opacity: 0.8 }}>
                            {new Date(entry.created_at).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="history-content" style={{ flex: 1 }}>
                          <span className="history-action" style={{ fontWeight: 500, color: '#111827' }}>{entry.action}</span>
                          {entry.details && <span className="history-details" style={{ display: 'block', fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>{entry.details}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="no-recommendation-message">
              <div className="placeholder-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
              </div>
              <h3>{isAdmin ? 'No Recommendation Found' : 'No Recommendation Yet'}</h3>
              <p>
                {isAdmin
                  ? 'Create a recommendation for this client to see their original plan options here.'
                  : 'Your personalized marketing plan is being prepared. Check back soon!'
                }
              </p>
              {isAdmin && (
                <Link href={`/admin/recommendation-builder/${clientId}`} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Create Recommendation
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Current Services Subtab */}
      {activeTab === 'current-services' && (
        <div className="current-services-content">
          {isPending || !isActiveClient ? (
            <div className="locked-placeholder" style={{ textAlign: 'center', padding: '3rem', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
              <div className="locked-icon" style={{ marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48" style={{ color: '#9CA3AF' }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>Your Current Services</h3>
              <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                {isAdmin
                  ? `After this client chooses a plan and completes checkout, their active services will appear here with progress tracking and growth metrics.`
                  : `After you choose a plan and complete checkout, your active services will appear here with progress tracking and growth metrics.`
                }
              </p>
            </div>
          ) : subscriptionsLoading ? (
            <div className="loading-state">Loading services...</div>
          ) : (() => {
            // Get active Stripe subscriptions (admin) or database subscriptions (client)
            const activeStripeSubscriptions = stripeSubscriptions.filter(sub => sub.status === 'active' || sub.status === 'trialing')
            const stripeItems = activeStripeSubscriptions.flatMap(sub => sub.items)
            const hasStripeSubscriptions = stripeItems.length > 0

            // Fallback to database subscriptions (now uses services array from subscriptionService.ts)
            const dbServices = ((subscriptions as any)?.services || []) as Array<{ id: string; name: string; quantity: number }>
            const hasDbSubscription = dbServices.length > 0

            // If no subscriptions but has purchased tier, fall back to recommendation items
            const fallbackItems = !hasStripeSubscriptions && !hasDbSubscription && recommendation?.purchased_tier
              ? recommendation.recommendation_items.filter(item => item.tier === recommendation.purchased_tier)
              : []

            const hasAnyProducts = hasStripeSubscriptions || hasDbSubscription || fallbackItems.length > 0

            if (!hasAnyProducts) {
              return (
                <div className="no-services-message">
                  <div className="placeholder-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                      <polyline points="9 11 12 14 22 4"></polyline>
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                  </div>
                  <h3>No Active Services Yet</h3>
                  <p>Once you select a plan from the Original Plan tab, your services will appear here.</p>
                </div>
              )
            }

            // Calculate totals
            let totalMonthly = 0
            if (hasStripeSubscriptions) {
              totalMonthly = stripeItems.reduce((sum, item) => sum + (item.unitAmount * (item.quantity || 1)), 0)
            } else if (hasDbSubscription) {
              totalMonthly = dbServices.reduce((sum, item) => sum + ((item as any).price || 0) * (item.quantity || 1), 0)
            } else {
              totalMonthly = fallbackItems.reduce((sum, item) => sum + Number(item.monthly_price || 0), 0)
            }

            // Get the start date (from subscription object or recommendation)
            const startDate = (subscriptions as any)?.subscription?.createdAt || recommendation?.purchased_at

            // Determine which items to display
            let displayItems: { id: string; name: string; desc: string; price: number; isFree?: boolean }[] = []

            if (hasStripeSubscriptions) {
              displayItems = stripeItems.map(item => ({
                id: item.id,
                name: item.product.name,
                desc: item.product.description || '',
                price: item.unitAmount * (item.quantity || 1),
              }))
            } else if (hasDbSubscription) {
              displayItems = dbServices.map(item => ({
                id: item.id,
                name: item.name || 'Service',
                desc: '',
                price: ((item as any).price || 0) * (item.quantity || 1),
              }))
            } else {
              displayItems = fallbackItems.map(item => ({
                id: item.id,
                name: item.product?.name || item.bundle?.name || item.addon?.name || 'Service',
                desc: item.product?.short_description || item.bundle?.description || item.addon?.description || '',
                price: Number(item.monthly_price || 0),
                isFree: item.is_free || false,
              }))
            }

            return (
              <div className="current-services-list">
                <div className="current-services-list-header">
                  <h3>{isAdmin ? `${displayName}'s Current Services` : 'Your Current Services'}</h3>
                  <span>Monthly Investment</span>
                </div>
                {displayItems.map(item => (
                  <div key={item.id} className="current-service-row">
                    <div className="current-service-icon">
                      {getServiceIcon(item.name)}
                    </div>
                    <div className="current-service-info">
                      <div className="current-service-name">
                        {item.name}
                        {item.isFree && <span className="free-badge">FREE</span>}
                      </div>
                      {item.desc && <div className="current-service-desc">{item.desc}</div>}
                    </div>
                    <div className="current-service-price">
                      {item.isFree ? (
                        <><strong>$0</strong><br /><span>included</span></>
                      ) : (
                        <><strong>${item.price.toLocaleString()}</strong><br /><span>/month</span></>
                      )}
                    </div>
                  </div>
                ))}
                <div className="current-services-total">
                  <div className="current-services-total-label">
                    Total Monthly Investment
                    <span>{displayItems.length} active service{displayItems.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="current-services-total-value">
                    ${totalMonthly.toLocaleString()}<span> per month</span>
                  </div>
                </div>

                {/* Admin-only: Subscription History */}
                {isAdmin && (
                  <div className="recommendation-history" style={{ marginTop: '2rem' }}>
                    <h4>Subscription History</h4>
                    {propStripeHistoryLoading ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>Loading subscription history...</p>
                    ) : !propStripeHistory || propStripeHistory.length === 0 ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No subscription history available.</p>
                    ) : (
                      <ul className="history-list">
                        {propStripeHistory.map((event) => (
                          <li key={event.id} className="history-item">
                            <div className="history-date">
                              {new Date(event.date).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                timeZone: 'America/Chicago'
                              })}
                            </div>
                            <div className="history-content">
                              <span className="history-action">{event.action}</span>
                              <span className="history-details">{event.details}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Admin-only: Invoices Section */}
                {isAdmin && (
                  <div className="invoices-section" style={{ marginTop: '2rem', padding: '1.5rem', background: '#FAFAFA', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0 }}>Invoices</h4>
                    </div>

                    {propInvoicesLoading ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>Loading invoices...</p>
                    ) : !propStripeCustomerId ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No Stripe customer linked</p>
                    ) : !propInvoices || propInvoices.length === 0 ? (
                      <p style={{ color: '#6B7280', fontSize: '0.875rem', margin: '0.5rem 0' }}>No invoices found</p>
                    ) : (
                      <div style={{ border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                          <thead>
                            <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Invoice</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Date</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 500, color: '#6B7280' }}>Status</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 500, color: '#6B7280' }}>Amount</th>
                              <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center', fontWeight: 500, color: '#6B7280' }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {propInvoices.slice(0, 10).map((invoice, index) => (
                              <tr key={invoice.id} style={{ borderBottom: index < Math.min(propInvoices.length, 10) - 1 ? '1px solid #E5E7EB' : undefined }}>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <div style={{ fontWeight: 500, color: '#111827' }}>{invoice.number || invoice.id.slice(0, 10)}</div>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', color: '#6B7280' }}>
                                  {invoice.created ? new Date(invoice.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem' }}>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '0.125rem 0.375rem',
                                    borderRadius: '9999px',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    background: invoice.status === 'paid' ? '#D1FAE5' : invoice.status === 'open' ? '#FEF3C7' : '#E5E7EB',
                                    color: invoice.status === 'paid' ? '#065F46' : invoice.status === 'open' ? '#92400E' : '#374151',
                                  }}>
                                    {invoice.status}
                                  </span>
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'right', fontWeight: 500 }}>
                                  ${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                  {invoice.invoicePdf && (
                                    <a
                                      href={invoice.invoicePdf}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-outline btn-sm"
                                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                    >
                                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginRight: '0.25rem' }}>
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                      </svg>
                                      PDF
                                    </a>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      )}

      {/* Product Info Modal */}
      {modalContent && (
        <div className="product-info-modal-overlay" onClick={() => setModalContent(null)}>
          <div className="product-info-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="product-info-modal-close"
              onClick={() => setModalContent(null)}
              aria-label="Close modal"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div
              className="product-info-modal-content"
              dangerouslySetInnerHTML={{ __html: modalContent.html }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
