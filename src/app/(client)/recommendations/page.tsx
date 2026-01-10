'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

type TabType = 'smart-recommendations' | 'original-plan' | 'current-services'

interface PurchaseItem {
  id: string
  name: string
  description: string
  price: number
  priceType: 'monthly' | 'one-time'
  currentPrice?: number
}

interface RecommendationItem {
  id: string
  tier: string | null
  quantity: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  product: { id: string; name: string; category: string; short_description: string | null } | null
  bundle: { id: string; name: string; description: string | null } | null
  addon: { id: string; name: string; description: string | null } | null
}

interface Recommendation {
  id: string
  status: string
  purchased_tier: string | null
  purchased_at: string | null
  discount_applied: string | null
  recommendation_items: RecommendationItem[]
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  growth_stage: string | null
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

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  const [activeTab, setActiveTab] = useState<TabType>('smart-recommendations')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PurchaseItem | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  // Database-connected state
  const [dbClient, setDbClient] = useState<DBClient | null>(null)
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch recommendation data from database
  useEffect(() => {
    async function fetchRecommendation() {
      try {
        // Map static client IDs to client names for database lookup
        const clientNameMap: Record<string, string> = {
          'tc-clinical': 'TC Clinical',
          'raptor-vending': 'Raptor Vending',
          'raptor-services': 'Raptor Services',
          'gohfr': 'Gohfr',
          'espronceda-law': 'Espronceda',
          'ruger': 'Ruger',
        }

        // If viewingAs is a UUID, client.name will have the actual name from API
        // Otherwise try the clientNameMap or use the viewingAs value directly
        const searchName = viewingAs
          ? (clientNameMap[viewingAs] || client.name || viewingAs)
          : client.name

        const res = await fetch(`/api/client/recommendation?clientName=${encodeURIComponent(searchName)}`)
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setDbClient(data.client)
            setRecommendation(data.recommendation)
            setSubscriptions(data.subscriptions || [])
          }
        }
      } catch (error) {
        console.error('Failed to fetch recommendation:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendation()
  }, [viewingAs, client.name])

  // Client-specific data
  const isRaptorVending = client.id === 'raptor-vending'

  // Handle purchase button click
  const handlePurchaseClick = (item: PurchaseItem) => {
    setSelectedItem(item)
    setShowPurchaseModal(true)
  }

  // Handle purchase confirmation
  const handleConfirmPurchase = async () => {
    setIsProcessing(true)
    // Simulate API call - Stripe integration will be added later
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsProcessing(false)
    setShowPurchaseModal(false)
    setShowSuccessModal(true)
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Recommendations</h1>
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
        {/* Recommendations Content */}
        <div className="recommendations-content">
          {/* Growth Stage Hero Section */}
          <div className="growth-stage-hero">
            <div className="growth-stage-main">
              <div className="stage-icon-large">🌿</div>
              <div className="stage-content">
                <div className="stage-label">Your Growth Stage</div>
                <div className="stage-name-large">
                  Sprouting
                  <span className="month-badge">Month 4</span>
                </div>
                <div className="stage-description-large">
                  Building momentum with early results appearing. Your marketing foundation is taking root and you&apos;re on track for the Blooming stage!
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
                {/* TODO: Wire to client data - 90 days from purchase date */}
                Next recommendations refresh: <strong>April 8, 2026</strong> (89 days)
              </div>
            </div>
          </div>

          {/* Main Recommendations Tabs */}
          <div className="recommendations-tabs">
            <button
              className={`recommendations-tab ${activeTab === 'smart-recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('smart-recommendations')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              Smart Recommendations
              <span className="tab-count">4</span>
            </button>
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
            </button>
          </div>

          {/* Smart Recommendations Tab Content */}
          <div className={`recommendations-tab-content ${activeTab === 'smart-recommendations' ? 'active' : ''}`} id="smart-recommendations-tab">
            <div className="rec-cards-grid">
              {/* Featured Recommendation: Scale Ads */}
              <div className="rec-card featured">
                <div className="rec-card-header">
                  <div>
                    <div className="rec-type-icon scale">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                    </div>
                    <div className="rec-title">Boost Google Ads Budget</div>
                    <div className="rec-subtitle">Scale your profitable campaigns</div>
                  </div>
                  <div className="rec-badges">
                    <span className="featured-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                      Top Pick
                    </span>
                    <span className="confidence-badge high">94% confidence</span>
                  </div>
                </div>
                <div className="rec-card-body">
                  <div className="rec-metrics">
                    <div className="rec-metric">
                      <div className="rec-metric-label">Current Spend</div>
                      <div className="rec-metric-value">$1,500/mo</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Proposed Spend</div>
                      <div className="rec-metric-value highlight">$2,250/mo</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Current Leads</div>
                      <div className="rec-metric-value">28/mo</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Projected Leads</div>
                      <div className="rec-metric-value highlight">42/mo (+14)</div>
                    </div>
                  </div>
                  <div className="rec-reasoning">
                    <strong>Why we recommend this:</strong> Your Google Ads are performing exceptionally well with a $53 cost-per-lead, well below the healthcare industry average of $85. Your current campaigns have room to scale without diminishing returns.
                  </div>
                </div>
                <div className="rec-card-footer">
                  <div className="rec-investment">
                    <span className="rec-investment-label">Additional Investment</span>
                    <span className="rec-investment-value">+$750/mo</span>
                    <span className="rec-investment-detail">50% increase from current</span>
                  </div>
                  <button
                    className="rec-cta primary"
                    onClick={() => handlePurchaseClick({
                      id: 'google-ads-increase',
                      name: 'Google Ads Budget Increase',
                      description: 'Increase your Google Ads spend to capture more leads',
                      price: 750,
                      priceType: 'monthly',
                      currentPrice: 1500
                    })}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approve Increase
                  </button>
                </div>
              </div>

              {/* Add AI Visibility */}
              <div className="rec-card">
                <div className="rec-card-header">
                  <div>
                    <div className="rec-type-icon add">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </div>
                    <div className="rec-title">Add AI Visibility Foundation</div>
                    <div className="rec-subtitle">Get discovered in AI search results</div>
                  </div>
                  <div className="rec-badges">
                    <span className="confidence-badge high">91% confidence</span>
                  </div>
                </div>
                <div className="rec-card-body">
                  <div className="rec-metrics">
                    <div className="rec-metric">
                      <div className="rec-metric-label">Current AI Score</div>
                      <div className="rec-metric-value">23/100</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Industry Average</div>
                      <div className="rec-metric-value">45/100</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Target Score</div>
                      <div className="rec-metric-value highlight">78+/100</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Emerging Channel</div>
                      <div className="rec-metric-value highlight">15-20% leads</div>
                    </div>
                  </div>
                  <div className="rec-reasoning">
                    <strong>Why we recommend this:</strong> Your AI visibility score of 23 is below the industry average of 45. Early movers are capturing 15-20% of leads from AI search channels.
                  </div>
                </div>
                <div className="rec-card-footer">
                  <div className="rec-investment">
                    <span className="rec-investment-label">Investment</span>
                    <span className="rec-investment-value">$3,000</span>
                    <span className="rec-investment-detail">One-time or $300/mo x 12</span>
                  </div>
                  <button
                    className="rec-cta add"
                    onClick={() => handlePurchaseClick({
                      id: 'ai-visibility',
                      name: 'AI Visibility Foundation',
                      description: 'Get discovered in AI search results like ChatGPT and Perplexity',
                      price: 3000,
                      priceType: 'one-time'
                    })}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add to Plan
                  </button>
                </div>
              </div>

              {/* Upgrade SEO */}
              <div className="rec-card">
                <div className="rec-card-header">
                  <div>
                    <div className="rec-type-icon upgrade">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </div>
                    <div className="rec-title">Upgrade to Harvest SEO</div>
                    <div className="rec-subtitle">Accelerate your organic growth</div>
                  </div>
                  <div className="rec-badges">
                    <span className="confidence-badge high">89% confidence</span>
                  </div>
                </div>
                <div className="rec-card-body">
                  <div className="rec-metrics">
                    <div className="rec-metric">
                      <div className="rec-metric-label">Current Plan</div>
                      <div className="rec-metric-value">Growth SEO</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Keywords Ranking</div>
                      <div className="rec-metric-value">47 keywords</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Pages Optimized</div>
                      <div className="rec-metric-value">12 pages</div>
                    </div>
                    <div className="rec-metric">
                      <div className="rec-metric-label">Projected Growth</div>
                      <div className="rec-metric-value highlight">+85% traffic</div>
                    </div>
                  </div>
                  <div className="rec-reasoning">
                    <strong>Why we recommend this:</strong> With 47 keywords now ranking, you&apos;ve built strong SEO momentum. Harvest SEO accelerates growth through content clusters and authority building.
                  </div>
                </div>
                <div className="rec-card-footer">
                  <div className="rec-investment">
                    <span className="rec-investment-label">Investment</span>
                    <span className="rec-investment-value">$1,499/mo</span>
                    <span className="rec-investment-detail">Currently $899/mo</span>
                  </div>
                  <button
                    className="rec-cta upgrade"
                    onClick={() => handlePurchaseClick({
                      id: 'harvest-seo',
                      name: 'Harvest SEO Plan',
                      description: 'Accelerate organic growth with content clusters and authority building',
                      price: 1499,
                      priceType: 'monthly',
                      currentPrice: 899
                    })}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    Upgrade Plan
                  </button>
                </div>
              </div>

              {/* Pear Analytics Premium */}
              <div className="rec-card premium full-width">
                <div className="rec-card-header">
                  <div>
                    <div className="rec-type-icon premium">
                      <svg viewBox="0 0 100 120" width="28" height="34" style={{ fill: 'white' }}>
                        <ellipse cx="50" cy="85" rx="35" ry="30" />
                        <ellipse cx="50" cy="45" rx="22" ry="25" />
                        <path d="M50 5 Q55 0 60 8 Q55 12 50 20" />
                      </svg>
                    </div>
                    <div className="rec-title">Pear Analytics Premium</div>
                    <div className="rec-subtitle">The pear that grew from the seed - Full-service agency partnership</div>
                  </div>
                  <div className="rec-badges">
                    <span className="premium-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                        <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                        <path d="M2 17l10 5 10-5"></path>
                        <path d="M2 12l10 5 10-5"></path>
                      </svg>
                      Premium Tier
                    </span>
                    <span className="confidence-badge medium" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
                      Invitation Only
                    </span>
                  </div>
                </div>
                <div className="rec-card-body">
                  <div>
                    <ul className="pear-features">
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Dedicated Marketing Strategist
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Monthly 60-min Strategy Meetings
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Custom Reporting Dashboard
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Priority Support (4-hour response)
                      </li>
                      <li>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        All Pyrus Services Included
                      </li>
                    </ul>
                  </div>
                  <div className="pear-story">
                    <h4>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                      </svg>
                      Why This Invitation?
                    </h4>
                    <p>
                      You&apos;ve grown from a seedling into a thriving business with Pyrus. With $2,300/mo invested across 4 services and strong results, you&apos;re ready for the full Pear Analytics experience - the natural evolution from self-serve to full-service.
                    </p>
                  </div>
                </div>
                <div className="rec-card-footer" style={{ background: 'var(--pyrus-green-wash)' }}>
                  <div className="rec-investment">
                    <span className="rec-investment-label">Starting Investment</span>
                    <span className="rec-investment-value">$5,000/mo</span>
                    <span className="rec-investment-detail">Includes all current services + premium support</span>
                  </div>
                  <button className="rec-cta premium">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Schedule Discovery Call
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Original Plan Tab Content */}
          <div className={`recommendations-tab-content ${activeTab === 'original-plan' ? 'active' : ''}`} id="original-plan-tab">
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
                  <h2>Your Marketing Proposal</h2>
                  <p>We&apos;ve prepared three service tiers tailored to your business goals. Choose the option that best fits your growth objectives and budget.</p>
                </div>
              </div>
            </div>

            {/* Good / Better / Best Pricing Tiers - Dynamic from Database */}
            {isLoading ? (
              <div className="pricing-tiers">
                <div className="loading-placeholder">Loading your plan options...</div>
              </div>
            ) : !recommendation ? (
              <div className="pricing-tiers">
                <div className="no-recommendation-message">
                  <div className="placeholder-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  </div>
                  <h3>No Recommendation Yet</h3>
                  <p>Your personalized marketing plan is being prepared. Check back soon!</p>
                </div>
              </div>
            ) : (
              <div className="pricing-tiers">
                {(['good', 'better', 'best'] as const).map(tierName => {
                  const tierItems = recommendation.recommendation_items.filter(item => item.tier === tierName)
                  const isPurchased = recommendation.purchased_tier === tierName
                  const monthlyTotal = tierItems.reduce((sum, item) => sum + Number(item.monthly_price || 0), 0)
                  const onetimeTotal = tierItems.reduce((sum, item) => sum + Number(item.onetime_price || 0), 0)
                  const hasMonthly = monthlyTotal > 0
                  const hasOnetime = onetimeTotal > 0

                  const tierDescriptions: Record<string, string> = {
                    good: 'Establish a professional foundation to help customers find and trust your business.',
                    better: 'Build your online presence and start attracting qualified leads through search.',
                    best: 'Comprehensive marketing to dominate your local market across all channels.',
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
                        <div className="pricing-tier-type">{hasMonthly ? 'Monthly' : 'One-time'}</div>
                        <div className="pricing-tier-total">
                          {hasMonthly ? (
                            <>${monthlyTotal.toLocaleString()}<span>/mo</span></>
                          ) : (
                            <>${onetimeTotal.toLocaleString()}</>
                          )}
                        </div>
                        {isPurchased ? (
                          <button className="pricing-tier-btn selected">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Your Selected Plan
                          </button>
                        ) : (
                          <button className="pricing-tier-btn secondary">
                            {tierName === 'good' ? 'Starter Option' : tierName === 'better' ? 'Popular Choice' : 'Premium Option'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Current Services Tab Content */}
          <div className={`recommendations-tab-content ${activeTab === 'current-services' ? 'active' : ''}`} id="current-services-tab">
            {isLoading ? (
              <div className="loading-placeholder">Loading your services...</div>
            ) : subscriptions.length === 0 && !recommendation?.purchased_tier ? (
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
            ) : (() => {
              // Get all subscription items from active subscriptions
              const activeItems = subscriptions.flatMap(sub => sub.subscription_items)

              // If no active subscriptions but has purchased tier, fall back to recommendation items
              const hasActiveSubscription = activeItems.length > 0
              const fallbackItems = !hasActiveSubscription && recommendation?.purchased_tier
                ? recommendation.recommendation_items.filter(item => item.tier === recommendation.purchased_tier)
                : []

              const displayItems = hasActiveSubscription ? activeItems : fallbackItems

              // Calculate total monthly from subscriptions or fallback
              const totalMonthly = hasActiveSubscription
                ? activeItems.reduce((sum, item) => sum + Number(item.unit_amount || item.product?.monthly_price || item.bundle?.monthly_price || 0), 0)
                : fallbackItems.reduce((sum, item) => sum + Number(item.monthly_price || 0), 0)

              // Get the start date from subscription or purchase
              const startDate = subscriptions[0]?.created_at || recommendation?.purchased_at
              const displayDate = startDate
                ? new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Recently'

              // Calculate months active
              const monthsActive = startDate
                ? Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)))
                : 1

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

              return (
                <>
                  {/* Your Progress Since Signup */}
                  <div className="progress-since-signup">
                    <div className="progress-since-header">
                      <div className="progress-since-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                          <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <div className="progress-since-title">Your Progress Since Signup</div>
                        <div className="progress-since-subtitle">Here&apos;s how far you&apos;ve come since {displayDate}</div>
                      </div>
                    </div>
                    <div className="progress-since-stats">
                      <div className="progress-stat">
                        <div className="progress-stat-value">{monthsActive}</div>
                        <div className="progress-stat-label">Month{monthsActive !== 1 ? 's' : ''} Active</div>
                      </div>
                      <div className="progress-stat">
                        <div className="progress-stat-value">{displayItems.length}</div>
                        <div className="progress-stat-label">Active Services</div>
                      </div>
                      <div className="progress-stat">
                        <div className="progress-stat-value">--</div>
                        <div className="progress-stat-label">Traffic Growth</div>
                      </div>
                      <div className="progress-stat">
                        <div className="progress-stat-value">--</div>
                        <div className="progress-stat-label">Monthly Leads</div>
                      </div>
                    </div>
                  </div>

                  {/* Your Current Services */}
                  <div className="current-services-list">
                    <div className="current-services-list-header">
                      <h3>Your Current Services</h3>
                      <span>Monthly Investment</span>
                    </div>
                    {hasActiveSubscription ? (
                      // Show active subscription items
                      activeItems.map(item => {
                        const itemName = item.product?.name || item.bundle?.name || 'Service'
                        const itemDesc = item.product?.short_description || item.bundle?.description || ''
                        const monthlyPrice = Number(item.unit_amount || item.product?.monthly_price || item.bundle?.monthly_price || 0)

                        return (
                          <div key={item.id} className="current-service-row">
                            <div className="current-service-icon">
                              {getServiceIcon(itemName)}
                            </div>
                            <div className="current-service-info">
                              <div className="current-service-name">{itemName}</div>
                              {itemDesc && <div className="current-service-desc">{itemDesc}</div>}
                            </div>
                            <div className="current-service-price">
                              <strong>${monthlyPrice.toLocaleString()}</strong><br /><span>/month</span>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      // Fall back to purchased recommendation items
                      fallbackItems.map(item => {
                        const itemName = item.product?.name || item.bundle?.name || item.addon?.name || 'Service'
                        const itemDesc = item.product?.short_description || item.bundle?.description || item.addon?.description || ''
                        const monthlyPrice = Number(item.monthly_price || 0)
                        const isFree = item.is_free

                        return (
                          <div key={item.id} className="current-service-row">
                            <div className="current-service-icon">
                              {getServiceIcon(itemName)}
                            </div>
                            <div className="current-service-info">
                              <div className="current-service-name">
                                {itemName}
                                {isFree && <span className="free-badge">FREE</span>}
                              </div>
                              {itemDesc && <div className="current-service-desc">{itemDesc}</div>}
                            </div>
                            <div className="current-service-price">
                              {isFree ? (
                                <><strong>$0</strong><br /><span>included</span></>
                              ) : (
                                <><strong>${monthlyPrice.toLocaleString()}</strong><br /><span>/month</span></>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div className="current-services-total">
                      <div className="current-services-total-label">
                        Total Monthly Investment
                        <span>{displayItems.length} active service{displayItems.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="current-services-total-value">
                        ${totalMonthly.toLocaleString()}<span> per month</span>
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Purchase Confirmation Modal */}
      {showPurchaseModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="modal purchase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Purchase</h2>
              <button className="modal-close" onClick={() => setShowPurchaseModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="purchase-item-card">
                <div className="purchase-item-header">
                  <div className="purchase-item-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="purchase-item-info">
                    <h3>{selectedItem.name}</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                </div>
                <div className="purchase-item-pricing">
                  {selectedItem.currentPrice && (
                    <div className="current-price">
                      <span className="label">Current:</span>
                      <span className="value">${selectedItem.currentPrice.toLocaleString()}/mo</span>
                    </div>
                  )}
                  <div className="new-price">
                    <span className="label">{selectedItem.currentPrice ? 'New Total:' : 'Investment:'}</span>
                    <span className="value highlight">
                      ${selectedItem.price.toLocaleString()}
                      {selectedItem.priceType === 'monthly' ? '/mo' : ' one-time'}
                    </span>
                  </div>
                  {selectedItem.currentPrice && (
                    <div className="price-change">
                      <span className="label">Change:</span>
                      <span className="value">+${(selectedItem.price).toLocaleString()}/mo</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="purchase-summary">
                <div className="summary-row">
                  <span>Billing starts</span>
                  <span>Immediately</span>
                </div>
                <div className="summary-row">
                  <span>Billing cycle</span>
                  <span>{selectedItem.priceType === 'monthly' ? 'Monthly' : 'One-time payment'}</span>
                </div>
                <div className="summary-row total">
                  <span>Total due today</span>
                  <span>${selectedItem.price.toLocaleString()}</span>
                </div>
              </div>

              <p className="purchase-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                Your existing payment method on file will be charged. You can cancel or modify anytime.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPurchaseModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmPurchase}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                    Confirm Purchase
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-content">
              <div className="success-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h2>Purchase Confirmed!</h2>
              <p>Your {selectedItem.name} has been activated.</p>
              <div className="success-details">
                <div className="detail-row">
                  <span>Amount charged</span>
                  <span>${selectedItem.price.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span>Confirmation #</span>
                  <span>PYR-{Date.now().toString().slice(-8)}</span>
                </div>
              </div>
              <p className="success-note">
                A confirmation email has been sent to {client.contactEmail || 'your email address'}.
              </p>
              <button className="btn btn-primary" onClick={() => setShowSuccessModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
