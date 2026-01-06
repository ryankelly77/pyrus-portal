'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

type TabType = 'smart-recommendations' | 'original-plan' | 'current-services'

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const client = getClientByViewingAs(viewingAs)

  const [activeTab, setActiveTab] = useState<TabType>('smart-recommendations')

  // Client-specific data
  const isRaptorVending = client.id === 'raptor-vending'

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
            <span className="user-name">{client.primaryContact}</span>
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
                  <button className="rec-cta primary">
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
                  <button className="rec-cta add">
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
                  <button className="rec-cta upgrade">
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

            {/* Good / Better / Best Pricing Tiers */}
            <div className="pricing-tiers">
              {/* Good Tier */}
              <div className="pricing-tier">
                <div className="pricing-tier-header">
                  <div className="pricing-tier-label">Good</div>
                  <div className="pricing-tier-desc">Establish a professional brand identity that helps customers remember, trust, and choose your business.</div>
                </div>
                <div className="pricing-tier-services">
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Business Branding Foundation</div>
                      <div className="pricing-service-desc">Logo, brand guidelines &amp; messaging foundation</div>
                    </div>
                    <div className="pricing-service-price">$899<br /><span>one-time</span></div>
                  </div>
                </div>
                <div className="pricing-tier-footer">
                  <div className="pricing-tier-type">One-time</div>
                  <div className="pricing-tier-total">$899</div>
                  <button className="pricing-tier-btn secondary">Starter Option</button>
                </div>
              </div>

              {/* Better Tier (Selected) */}
              <div className="pricing-tier selected">
                <div className="pricing-tier-header">
                  <div className="pricing-tier-label">
                    Better
                    <span className="selected-badge">Selected</span>
                  </div>
                  <div className="pricing-tier-desc">Build your online presence and start attracting qualified leads through search.</div>
                </div>
                <div className="pricing-tier-services">
                  <div className="pricing-service-item">
                    <div className="pricing-service-check included">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Seedling SEO Plan</div>
                      <div className="pricing-service-desc">Foundational on-page SEO &amp; performance tracking</div>
                    </div>
                    <div className="pricing-service-price">$599<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check included">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Google Ads Management</div>
                      <div className="pricing-service-desc">Campaign setup, management &amp; optimization</div>
                    </div>
                    <div className="pricing-service-price">$499<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check included">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Analytics Tracking</div>
                      <div className="pricing-service-desc">Monitor website performance and lead generation</div>
                    </div>
                    <div className="pricing-service-price">$99<br /><span>/month</span></div>
                  </div>
                </div>
                <div className="pricing-tier-footer">
                  <div className="pricing-tier-type">Monthly</div>
                  <div className="pricing-tier-total">$1,197<span>/mo</span></div>
                  <button className="pricing-tier-btn selected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Your Selected Plan
                  </button>
                </div>
              </div>

              {/* Best Tier */}
              <div className="pricing-tier">
                <div className="pricing-tier-header">
                  <div className="pricing-tier-label">Best</div>
                  <div className="pricing-tier-desc">Comprehensive marketing to dominate your local market across all channels.</div>
                </div>
                <div className="pricing-tier-services">
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Harvest SEO Plan</div>
                      <div className="pricing-service-desc">Advanced SEO with content, link building &amp; authority signals</div>
                    </div>
                    <div className="pricing-service-price">$1,799<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Google Ads Management</div>
                      <div className="pricing-service-desc">Campaign setup, management &amp; optimization</div>
                    </div>
                    <div className="pricing-service-price">$499<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Content Writing (2 articles)</div>
                      <div className="pricing-service-desc">Monthly SEO-optimized articles</div>
                    </div>
                    <div className="pricing-service-price">$198<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Google Business Profile Management</div>
                      <div className="pricing-service-desc">Local search optimization &amp; posting</div>
                    </div>
                    <div className="pricing-service-price">$199<br /><span>/month</span></div>
                  </div>
                  <div className="pricing-service-item">
                    <div className="pricing-service-check">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="pricing-service-info">
                      <div className="pricing-service-name">Analytics Tracking</div>
                      <div className="pricing-service-desc">Monitor website performance and lead generation</div>
                    </div>
                    <div className="pricing-service-price">$99<br /><span>/month</span></div>
                  </div>
                </div>
                <div className="pricing-tier-footer">
                  <div className="pricing-tier-type">Monthly</div>
                  <div className="pricing-tier-total">$2,794<span>/mo</span></div>
                  <button className="pricing-tier-btn secondary">Premium Option</button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Services Tab Content */}
          <div className={`recommendations-tab-content ${activeTab === 'current-services' ? 'active' : ''}`} id="current-services-tab">
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
                  <div className="progress-since-subtitle">Here&apos;s how far you&apos;ve come since Sep 16, 2025</div>
                </div>
              </div>
              <div className="progress-since-stats">
                <div className="progress-stat">
                  <div className="progress-stat-value">4</div>
                  <div className="progress-stat-label">Months Active</div>
                </div>
                <div className="progress-stat">
                  <div className="progress-stat-value">4</div>
                  <div className="progress-stat-label">Active Services</div>
                </div>
                <div className="progress-stat">
                  <div className="progress-stat-value">+14.5%</div>
                  <div className="progress-stat-label">Traffic Growth</div>
                </div>
                <div className="progress-stat">
                  <div className="progress-stat-value">42</div>
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
              <div className="ad-spend-note">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
                <span>Plus Google Ads spend (paid directly to Google)</span>
                <strong>$1,500/mo</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
