'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

export default function ContentPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const client = getClientByViewingAs(viewingAs)
  const router = useRouter()

  const [showBookingModal, setShowBookingModal] = useState(false)

  const handleAddToCart = (itemId: string) => {
    const params = new URLSearchParams()
    params.set('item', itemId)
    if (viewingAs) params.set('viewingAs', viewingAs)
    router.push(`/checkout?${params.toString()}`)
  }

  // If client doesn't have content service, show upsell
  if (!client.hasContent) {
    return (
      <>
        {/* Top Header Bar */}
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Content</h1>
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
          <div className="content-upsell-container">
            {/* Hero Section */}
            <div className="content-hero">
              <div className="content-hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
              </div>
              <h2 className="content-hero-title">Content is the Engine Behind Your Growth</h2>
              <p className="content-hero-subtitle">
                Every successful marketing channel depends on quality content. Without it, your SEO stalls,
                social media falls flat, and paid ads underperform.
              </p>
            </div>

            {/* Visual Hub Diagram */}
            <div className="content-hub-section">
              <div className="content-hub-diagram">
                {/* Center Hub */}
                <div className="hub-center">
                  <div className="hub-center-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2" width="32" height="32">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                  </div>
                  <span>Content</span>
                </div>

                {/* Connecting Lines */}
                <svg className="hub-connections" viewBox="0 0 400 320">
                  {/* Lines from center to spokes */}
                  <path d="M 200 150 Q 120 100 60 70" stroke="#8B5CF6" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                  <path d="M 200 150 Q 280 100 340 70" stroke="#22C55E" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                  <path d="M 200 150 L 200 295" stroke="#F59E0B" strokeWidth="3" fill="none" strokeDasharray="8 4" className="hub-line" />
                </svg>

                {/* Spoke: SEO */}
                <div className="hub-spoke spoke-seo">
                  <div className="spoke-icon seo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                  </div>
                  <div className="spoke-content">
                    <span className="spoke-title">SEO</span>
                    <span className="spoke-desc">Blog posts, landing pages, meta content</span>
                  </div>
                </div>

                {/* Spoke: Social Media */}
                <div className="hub-spoke spoke-social">
                  <div className="spoke-icon social">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                  </div>
                  <div className="spoke-content">
                    <span className="spoke-title">Social Media</span>
                    <span className="spoke-desc">Posts, images, videos, brand assets</span>
                  </div>
                </div>

                {/* Spoke: Paid Ads */}
                <div className="hub-spoke spoke-ads">
                  <div className="spoke-icon ads">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="3" y1="9" x2="21" y2="9"></line>
                      <line x1="9" y1="21" x2="9" y2="9"></line>
                    </svg>
                  </div>
                  <div className="spoke-content">
                    <span className="spoke-title">Paid Advertising</span>
                    <span className="spoke-desc">Ad copy, creative assets, landing pages</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Offerings */}
            <div className="content-offerings-section">
              <h3 className="offerings-title">Our Content Solutions</h3>
              <p className="offerings-subtitle">Professional content that powers every marketing channel</p>

              <div className="content-offerings-grid">
                {/* Content Writing */}
                <div className="content-offering-card">
                  <div className="offering-header">
                    <div className="offering-icon writing">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <circle cx="11" cy="11" r="2"></circle>
                      </svg>
                    </div>
                    <div className="offering-price-tag">
                      <span className="price">$99</span>
                      <span className="per">per article</span>
                    </div>
                  </div>
                  <h4 className="offering-title">Content Writing</h4>
                  <p className="offering-description">
                    SEO and AI-optimized content up to 1,000 words for your blog or website.
                    Each piece is crafted to rank and convert.
                  </p>
                  <div className="offering-powers">
                    <span className="powers-label">Powers:</span>
                    <div className="powers-tags">
                      <span className="power-tag seo">SEO Rankings</span>
                      <span className="power-tag social">Blog Strategy</span>
                    </div>
                  </div>
                  <ul className="offering-features">
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Keyword-optimized for search
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      AI-enhanced for engagement
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Up to 1,000 words
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      One round of revisions
                    </li>
                  </ul>
                  <button className="btn btn-secondary" onClick={() => handleAddToCart('content-writing')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add to My Plan
                  </button>
                </div>

                {/* AI Creative Assets */}
                <div className="content-offering-card featured">
                  <div className="offering-badge">Best Value</div>
                  <div className="offering-header">
                    <div className="offering-icon creative">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                    <div className="offering-price-tag">
                      <span className="price">$299</span>
                      <span className="per">/month</span>
                    </div>
                  </div>
                  <h4 className="offering-title">AI Creative Assets</h4>
                  <p className="offering-description">
                    A monthly package of custom visuals to fuel your social media, ads, and website
                    with scroll-stopping content.
                  </p>
                  <div className="offering-powers">
                    <span className="powers-label">Powers:</span>
                    <div className="powers-tags">
                      <span className="power-tag social">Social Media</span>
                      <span className="power-tag ads">Paid Ads</span>
                    </div>
                  </div>
                  <ul className="offering-features">
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      4 custom AI-generated images
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      1 short-form AI animated video
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      10 curated premium stock images
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      10 curated premium stock videos
                    </li>
                  </ul>
                  <button className="btn btn-primary" onClick={() => handleAddToCart('ai-creative-assets')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add to My Plan
                  </button>
                </div>

                {/* Business Branding Foundation */}
                <div className="content-offering-card">
                  <div className="offering-header">
                    <div className="offering-icon branding">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                      </svg>
                    </div>
                    <div className="offering-price-tag">
                      <span className="price">$99</span>
                      <span className="per">/month</span>
                      <span className="price-alt">or $899 one-time</span>
                    </div>
                  </div>
                  <h4 className="offering-title">Business Branding Foundation</h4>
                  <p className="offering-description">
                    The strategic foundation every business needs. Four essential documents that
                    guide all your marketing efforts.
                  </p>
                  <div className="offering-powers">
                    <span className="powers-label">Powers:</span>
                    <div className="powers-tags">
                      <span className="power-tag seo">SEO</span>
                      <span className="power-tag social">Social</span>
                      <span className="power-tag ads">Ads</span>
                    </div>
                  </div>
                  <ul className="offering-features">
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Strategic Positioning &amp; Brand Framework
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Brand Messaging &amp; Go-To-Market Playbook
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Competitive Comparison Analysis
                    </li>
                    <li>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Brand Color Guidelines
                    </li>
                  </ul>
                  <button className="btn btn-secondary" onClick={() => handleAddToCart('business-branding')}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add to My Plan
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="content-cta">
              <div className="cta-message">
                <h3>Have questions about our content services?</h3>
                <p>Let&apos;s discuss which content solutions will drive the best results for your business.</p>
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => setShowBookingModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Schedule a Consultation
              </button>
            </div>
          </div>
        </div>

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="booking-modal-overlay" onClick={() => setShowBookingModal(false)}>
            <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
              <button className="booking-modal-close" onClick={() => setShowBookingModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div className="booking-modal-content">
                <iframe
                  src="https://api.leadconnectorhq.com/widget/booking/on0xt5S6hLW1JJ2G54dD"
                  style={{ width: '100%', height: '100%', border: 'none', overflow: 'hidden' }}
                  scrolling="no"
                  id="on0xt5S6hLW1JJ2G54dD_content"
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // If client has content service, show the actual content management page
  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Content</h1>
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
        <div className="placeholder-message">
          <h2>Content Management</h2>
          <p>Content management features coming soon.</p>
        </div>
      </div>
    </>
  )
}
