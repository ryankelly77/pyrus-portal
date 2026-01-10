'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'

interface BundleProduct {
  product_id: string
  product: {
    id: string
    name: string
    monthly_price: string | null
    onetime_price: string | null
  }
}

interface RecommendationItem {
  id: string
  tier: string | null
  quantity: number | null
  monthly_price: string | null
  onetime_price: string | null
  is_free: boolean | null
  notes: string | null
  product: {
    id: string
    name: string
    short_description: string | null
    category: string
    monthly_price: string | null
    onetime_price: string | null
  } | null
  bundle: {
    id: string
    name: string
    description: string | null
    monthly_price: string | null
    bundle_products: BundleProduct[]
  } | null
  addon: {
    id: string
    name: string
    description: string | null
    price: string | null
  } | null
}

interface TierPricing {
  fullPriceMonthly: number
  fullPriceOnetime: number
  afterFreeMonthly: number
  afterFreeOnetime: number
  yourPriceMonthly: number
  yourPriceOnetime: number
  freeItemsValue: number
  discountPercent: number
  discountAmount: number
  totalSavings: number
}

interface TierData {
  items: RecommendationItem[]
  pricing: TierPricing
}

interface ProposalData {
  invite: {
    id: string
    firstName: string
    lastName: string
    email: string
    viewedAt: string | null
  }
  client: {
    id: string
    name: string
    contactName: string | null
  }
  recommendation: {
    id: string
    status: string
    totalMonthly: string | null
    totalOnetime: string | null
    discountApplied: string | null
    notes: string | null
    sentAt: string | null
  }
  tiers: {
    good: TierData
    better: TierData
    best: TierData
  }
  rewardTier: {
    name: string
    discount_percentage: number
    free_product_slots: number
  } | null
}

const tierConfig: Record<'good' | 'better' | 'best', {
  title: string
  subtitle: string
  description: string
  color: string
  bgColor: string
  featured?: boolean
}> = {
  good: {
    title: 'Good',
    subtitle: 'Essential',
    description: 'Get started with the fundamentals',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  better: {
    title: 'Better',
    subtitle: 'Recommended',
    description: 'The sweet spot for most businesses',
    color: '#324438',
    bgColor: '#E8F5E9',
    featured: true,
  },
  best: {
    title: 'Best',
    subtitle: 'Premium',
    description: 'Maximum growth potential',
    color: '#7C3AED',
    bgColor: '#F3E8FF',
  },
}

export default function ViewProposalPage() {
  const params = useParams()
  const token = params.token as string

  const [proposal, setProposal] = useState<ProposalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<'good' | 'better' | 'best'>('better')

  useEffect(() => {
    async function fetchProposal() {
      try {
        const res = await fetch(`/api/proposal/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to load proposal')
          return
        }

        setProposal(data)

        // Auto-select a tier that has items, preferring 'better'
        if (data.tiers.better.items.length > 0) {
          setSelectedTier('better')
        } else if (data.tiers.good.items.length > 0) {
          setSelectedTier('good')
        } else if (data.tiers.best.items.length > 0) {
          setSelectedTier('best')
        }
      } catch (err) {
        console.error('Failed to fetch proposal:', err)
        setError('Failed to load proposal')
      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      fetchProposal()
    }
  }, [token])

  if (isLoading) {
    return (
      <div className="proposal-page">
        <div className="proposal-loading">
          <div className="loading-spinner"></div>
          <p>Loading your proposal...</p>
        </div>
      </div>
    )
  }

  if (error || !proposal) {
    return (
      <div className="proposal-page">
        <div className="proposal-error">
          <div className="error-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h1>Unable to Load Proposal</h1>
          <p>{error || 'This proposal link may be invalid or expired.'}</p>
          <p className="error-contact">
            If you believe this is an error, please contact us at{' '}
            <a href="mailto:support@pyrusdigitalmedia.com">support@pyrusdigitalmedia.com</a>
          </p>
        </div>
      </div>
    )
  }

  const { invite, client, tiers, rewardTier } = proposal

  const renderTierCard = (tierKey: 'good' | 'better' | 'best') => {
    const config = tierConfig[tierKey]
    const tierData = tiers[tierKey]
    const hasItems = tierData.items.length > 0
    const isSelected = selectedTier === tierKey

    return (
      <div
        key={tierKey}
        className={`tier-card ${config.featured ? 'featured' : ''} ${isSelected ? 'selected' : ''} ${!hasItems ? 'empty' : ''}`}
        onClick={() => hasItems && setSelectedTier(tierKey)}
        style={{
          '--tier-color': config.color,
          '--tier-bg': config.bgColor,
        } as React.CSSProperties}
      >
        {config.featured && <div className="tier-badge">Recommended</div>}
        <div className="tier-header">
          <h3 className="tier-title">{config.title}</h3>
          <p className="tier-subtitle">{config.subtitle}</p>
        </div>

        {hasItems ? (
          <>
            <div className="tier-price">
              <span className="price-amount">${tierData.pricing.yourPriceMonthly.toLocaleString()}</span>
              <span className="price-period">/month</span>
            </div>
            {tierData.pricing.yourPriceOnetime > 0 && (
              <p className="tier-onetime">+ ${tierData.pricing.yourPriceOnetime.toLocaleString()} one-time</p>
            )}
            {tierData.pricing.totalSavings > 0 && (
              <p className="tier-savings">You save ${tierData.pricing.totalSavings.toLocaleString()}</p>
            )}
            <p className="tier-description">{config.description}</p>
            <ul className="tier-features">
              {tierData.items.slice(0, 4).map((item) => {
                const name = item.product?.name || item.bundle?.name || item.addon?.name || 'Unknown'
                return (
                  <li key={item.id}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>{name}</span>
                    {item.is_free && <span className="free-tag">Free</span>}
                  </li>
                )
              })}
              {tierData.items.length > 4 && (
                <li className="more-items">
                  <span>+{tierData.items.length - 4} more services</span>
                </li>
              )}
            </ul>
          </>
        ) : (
          <div className="tier-empty">
            <p>No services in this tier</p>
          </div>
        )}

        {hasItems && (
          <button className={`tier-select-btn ${isSelected ? 'selected' : ''}`}>
            {isSelected ? 'Selected' : 'View Details'}
          </button>
        )}
      </div>
    )
  }

  const selectedTierData = tiers[selectedTier]
  const selectedConfig = tierConfig[selectedTier]

  return (
    <div className="proposal-page">
      {/* Header */}
      <header className="proposal-header">
        <div className="header-content">
          <Image
            src="https://pyrusdigitalmedia.com/wp-content/uploads/2024/11/pyrus-logo-white.png"
            alt="Pyrus Digital Media"
            width={120}
            height={32}
            className="logo"
          />
          <div className="header-contact">
            <a href="mailto:support@pyrusdigitalmedia.com">support@pyrusdigitalmedia.com</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="proposal-hero">
        <div className="hero-content">
          <h1>Your Marketing Proposal</h1>
          <p className="hero-subtitle">
            Hi {invite.firstName}, we&apos;ve prepared a personalized marketing plan for <strong>{client.name}</strong>.
          </p>
        </div>
      </section>

      {/* Tier Selection */}
      <section className="proposal-tiers">
        <div className="tiers-container">
          <h2>Choose Your Plan</h2>
          <p className="tiers-intro">Select the option that best fits your business goals and budget.</p>
          <div className="tiers-grid">
            {renderTierCard('good')}
            {renderTierCard('better')}
            {renderTierCard('best')}
          </div>
        </div>
      </section>

      {/* Selected Tier Details */}
      {selectedTierData.items.length > 0 && (
        <section className="proposal-details">
          <div className="details-container">
            <h2>
              <span style={{ color: selectedConfig.color }}>{selectedConfig.title}</span> Plan Details
            </h2>

            <div className="services-list">
              {selectedTierData.items.map((item) => {
                const name = item.product?.name || item.bundle?.name || item.addon?.name || 'Unknown'
                const description = item.product?.short_description || item.bundle?.description || item.addon?.description || ''
                const monthly = item.monthly_price ? parseFloat(item.monthly_price.toString()) : 0
                const onetime = item.onetime_price ? parseFloat(item.onetime_price.toString()) : 0
                const qty = item.quantity || 1
                const isBundle = !!item.bundle

                return (
                  <div key={item.id} className={`service-card ${item.is_free ? 'is-free' : ''}`}>
                    <div className="service-main">
                      <div className="service-info">
                        <h3>{name}</h3>
                        {description && <p>{description}</p>}
                        {isBundle && item.bundle?.bundle_products && (
                          <ul className="bundle-includes">
                            {item.bundle.bundle_products.map((bp) => (
                              <li key={bp.product_id}>{bp.product.name}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="service-pricing">
                        {item.is_free ? (
                          <div className="price-free">
                            <span className="original-price">${monthly}/mo</span>
                            <span className="free-label">FREE</span>
                          </div>
                        ) : (
                          <>
                            {monthly > 0 && (
                              <div className="price-monthly">
                                ${(monthly * qty).toLocaleString()}<span>/mo</span>
                              </div>
                            )}
                            {onetime > 0 && (
                              <div className="price-onetime">
                                ${(onetime * qty).toLocaleString()} <span>one-time</span>
                              </div>
                            )}
                          </>
                        )}
                        {qty > 1 && <span className="quantity">x{qty}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pricing Summary */}
            <div className="proposal-summary">
              {/* Full Price */}
              <div className={`summary-row ${selectedTierData.pricing.totalSavings > 0 ? 'strikethrough' : ''}`}>
                <span>Full Price</span>
                <span className="summary-amount">
                  ${(selectedTierData.pricing.fullPriceOnetime + selectedTierData.pricing.fullPriceMonthly).toLocaleString()} today, then ${selectedTierData.pricing.fullPriceMonthly.toLocaleString()}/mo
                </span>
              </div>

              {/* After Free Items - only show if there are free items */}
              {selectedTierData.pricing.freeItemsValue > 0 && (
                <div className="summary-row">
                  <span>After Free Items</span>
                  <span className="summary-amount">
                    ${(selectedTierData.pricing.afterFreeOnetime + selectedTierData.pricing.afterFreeMonthly).toLocaleString()} today, then ${selectedTierData.pricing.afterFreeMonthly.toLocaleString()}/mo
                  </span>
                </div>
              )}

              {/* Your Price */}
              <div className="summary-row highlight">
                <span>Your Price</span>
                <span className="summary-amount highlight">
                  ${(selectedTierData.pricing.yourPriceOnetime + selectedTierData.pricing.yourPriceMonthly).toLocaleString()} today, then ${selectedTierData.pricing.yourPriceMonthly.toLocaleString()}/mo
                </span>
              </div>

              {/* Total Savings */}
              {selectedTierData.pricing.totalSavings > 0 && (
                <div className="summary-row savings">
                  <span>You Save</span>
                  <span className="summary-amount savings">
                    ${selectedTierData.pricing.totalSavings.toLocaleString()}
                    {selectedTierData.pricing.discountPercent > 0 && ` (includes ${selectedTierData.pricing.discountPercent}% discount)`}
                  </span>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="proposal-cta">
              <p>Ready to get started? Contact us to begin your marketing journey.</p>
              <a href="mailto:support@pyrusdigitalmedia.com?subject=Ready to Get Started - {client.name}" className="btn-cta">
                Get Started
              </a>
              <p className="cta-note">
                Or call us at <a href="tel:+18174563900">(817) 456-3900</a>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Why Pyrus Section */}
      <section className="proposal-features">
        <div className="features-container">
          <h2>Why Choose Pyrus?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </div>
              <h3>30-Day Guarantee</h3>
              <p>Not satisfied? Get a full refund within the first 30 days.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h3>No Contracts</h3>
              <p>Month-to-month billing. Cancel anytime with no penalties.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h3>AI-Powered Tools</h3>
              <p>Leverage cutting-edge AI to maximize your marketing ROI.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <h3>Local Expertise</h3>
              <p>We understand the Fort Worth market and your customers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="proposal-footer">
        <div className="footer-content">
          <Image
            src="https://pyrusdigitalmedia.com/wp-content/uploads/2024/11/pyrus-logo-white.png"
            alt="Pyrus Digital Media"
            width={100}
            height={26}
            className="footer-logo"
          />
          <p>702 Houston St, Fort Worth, TX 76102</p>
          <p>
            <a href="mailto:support@pyrusdigitalmedia.com">support@pyrusdigitalmedia.com</a>
            {' | '}
            <a href="tel:+18174563900">(817) 456-3900</a>
          </p>
          <p className="footer-copyright">&copy; {new Date().getFullYear()} Pyrus Digital Media. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        .proposal-page {
          min-height: 100vh;
          background: #F8FAF8;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        /* Loading & Error States */
        .proposal-loading,
        .proposal-error {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid #E5E7EB;
          border-top-color: #324438;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          color: #DC2626;
          margin-bottom: 16px;
        }

        .proposal-error h1 {
          font-size: 24px;
          color: #1A1F16;
          margin-bottom: 8px;
        }

        .proposal-error p {
          color: #5A6358;
          margin-bottom: 16px;
        }

        .error-contact a {
          color: #324438;
        }

        /* Header */
        .proposal-header {
          background: #324438;
          padding: 16px 24px;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-contact a {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          font-size: 14px;
        }

        .header-contact a:hover {
          color: white;
        }

        /* Hero */
        .proposal-hero {
          background: linear-gradient(135deg, #324438 0%, #1A1F16 100%);
          padding: 60px 24px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .proposal-hero h1 {
          font-size: 36px;
          font-weight: 700;
          color: white;
          margin-bottom: 16px;
        }

        .hero-subtitle {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }

        .hero-subtitle strong {
          color: white;
        }

        /* Tiers Section */
        .proposal-tiers {
          padding: 60px 24px;
        }

        .tiers-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .tiers-container h2 {
          text-align: center;
          font-size: 28px;
          color: #1A1F16;
          margin-bottom: 8px;
        }

        .tiers-intro {
          text-align: center;
          color: #5A6358;
          margin-bottom: 40px;
        }

        .tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        @media (max-width: 900px) {
          .tiers-grid {
            grid-template-columns: 1fr;
            max-width: 400px;
            margin: 0 auto;
          }
        }

        /* Tier Cards */
        .tier-card {
          background: white;
          border-radius: 12px;
          padding: 32px 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .tier-card:hover:not(.empty) {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }

        .tier-card.selected {
          border-color: var(--tier-color);
        }

        .tier-card.featured {
          border-color: #324438;
        }

        .tier-card.empty {
          opacity: 0.5;
          cursor: default;
        }

        .tier-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #324438;
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .tier-header {
          text-align: center;
          margin-bottom: 16px;
        }

        .tier-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--tier-color);
          margin-bottom: 4px;
        }

        .tier-subtitle {
          font-size: 14px;
          color: #5A6358;
        }

        .tier-price {
          text-align: center;
          margin-bottom: 8px;
        }

        .price-amount {
          font-size: 36px;
          font-weight: 700;
          color: #1A1F16;
        }

        .price-period {
          font-size: 16px;
          color: #5A6358;
        }

        .tier-onetime {
          text-align: center;
          font-size: 14px;
          color: #5A6358;
          margin-bottom: 8px;
        }

        .tier-savings {
          text-align: center;
          font-size: 14px;
          color: #059669;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .tier-description {
          text-align: center;
          font-size: 14px;
          color: #5A6358;
          margin-bottom: 24px;
        }

        .tier-features {
          list-style: none;
          padding: 0;
          margin: 0 0 24px 0;
        }

        .tier-features li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 0;
          font-size: 14px;
          color: #1A1F16;
          border-bottom: 1px solid #F3F4F6;
        }

        .tier-features li:last-child {
          border-bottom: none;
        }

        .tier-features li svg {
          color: #324438;
          flex-shrink: 0;
        }

        .tier-features .free-tag {
          background: #E8F5E9;
          color: #324438;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: auto;
        }

        .tier-features .more-items {
          color: #5A6358;
          font-style: italic;
        }

        .tier-empty {
          padding: 40px 0;
          text-align: center;
          color: #8B9088;
        }

        .tier-select-btn {
          width: 100%;
          padding: 12px 24px;
          border: 2px solid var(--tier-color);
          background: transparent;
          color: var(--tier-color);
          font-size: 14px;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tier-select-btn:hover {
          background: var(--tier-bg);
        }

        .tier-select-btn.selected {
          background: var(--tier-color);
          color: white;
        }

        /* Details Section */
        .proposal-details {
          background: white;
          padding: 60px 24px;
        }

        .details-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .details-container h2 {
          font-size: 24px;
          color: #1A1F16;
          margin-bottom: 32px;
          text-align: center;
        }

        .services-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .service-card {
          background: #F8FAF8;
          border-radius: 12px;
          padding: 20px 24px;
        }

        .service-card.is-free {
          border: 2px dashed #324438;
          background: #E8F5E9;
        }

        .service-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
        }

        .service-info h3 {
          font-size: 16px;
          font-weight: 600;
          color: #1A1F16;
          margin-bottom: 4px;
        }

        .service-info p {
          font-size: 14px;
          color: #5A6358;
          margin-bottom: 8px;
        }

        .bundle-includes {
          margin: 8px 0 0 0;
          padding: 0 0 0 16px;
          font-size: 13px;
          color: #5A6358;
        }

        .bundle-includes li {
          margin-bottom: 4px;
        }

        .service-pricing {
          text-align: right;
          flex-shrink: 0;
        }

        .price-monthly {
          font-size: 18px;
          font-weight: 600;
          color: #1A1F16;
        }

        .price-monthly span {
          font-size: 14px;
          font-weight: 400;
          color: #5A6358;
        }

        .price-onetime {
          font-size: 14px;
          color: #5A6358;
        }

        .price-free {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .original-price {
          font-size: 14px;
          color: #8B9088;
          text-decoration: line-through;
        }

        .free-label {
          background: #324438;
          color: white;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .quantity {
          font-size: 14px;
          color: #5A6358;
        }

        /* Summary */
        .proposal-summary {
          background: #F8FAF8;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          font-size: 14px;
          color: #5A6358;
          border-bottom: 1px solid #E5E7EB;
        }

        .summary-row.strikethrough .summary-amount {
          text-decoration: line-through;
          color: #8B9088;
        }

        .summary-row.highlight {
          background: #E8F5E9;
          margin: 0 -24px;
          padding: 12px 24px;
          border-radius: 0;
        }

        .summary-row.savings {
          color: #059669;
          border-bottom: none;
        }

        .summary-amount {
          font-weight: 500;
          color: #1A1F16;
        }

        .summary-amount.highlight {
          color: #324438;
          font-weight: 700;
          font-size: 16px;
        }

        .summary-amount.savings {
          color: #059669;
          font-weight: 600;
        }

        .summary-row.savings .summary-amount {
          color: #059669;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          padding-top: 16px;
          font-size: 18px;
          font-weight: 600;
          color: #1A1F16;
        }

        .total-amount {
          font-size: 24px;
        }

        /* CTA */
        .proposal-cta {
          text-align: center;
          padding: 32px 0;
        }

        .proposal-cta p {
          color: #5A6358;
          margin-bottom: 16px;
        }

        .btn-cta {
          display: inline-block;
          padding: 16px 48px;
          background: #324438;
          color: white;
          text-decoration: none;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .btn-cta:hover {
          background: #1A1F16;
          transform: translateY(-2px);
        }

        .cta-note {
          margin-top: 16px;
          font-size: 14px;
        }

        .cta-note a {
          color: #324438;
          font-weight: 500;
        }

        /* Features Section */
        .proposal-features {
          padding: 60px 24px;
          background: linear-gradient(135deg, #324438 0%, #1A1F16 100%);
        }

        .features-container {
          max-width: 1000px;
          margin: 0 auto;
        }

        .features-container h2 {
          text-align: center;
          font-size: 28px;
          color: white;
          margin-bottom: 40px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        @media (max-width: 900px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .features-grid {
            grid-template-columns: 1fr;
          }
        }

        .feature-card {
          text-align: center;
          padding: 24px 16px;
        }

        .feature-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: white;
        }

        .feature-card h3 {
          font-size: 16px;
          font-weight: 600;
          color: white;
          margin-bottom: 8px;
        }

        .feature-card p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.5;
        }

        /* Footer */
        .proposal-footer {
          background: #1A1F16;
          padding: 40px 24px;
          text-align: center;
        }

        .footer-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .footer-logo {
          margin-bottom: 16px;
        }

        .proposal-footer p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 8px;
        }

        .proposal-footer a {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
        }

        .proposal-footer a:hover {
          color: white;
        }

        .footer-copyright {
          margin-top: 24px;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}
