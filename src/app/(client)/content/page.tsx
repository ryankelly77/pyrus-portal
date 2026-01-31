'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'
import { ContentView } from '@/components/client-views'

// Product info for the add-to-subscription modal
const PRODUCT_INFO: Record<string, { name: string; price: number; description: string }> = {
  'content-writing': { name: 'Content Writing', price: 99, description: 'SEO and AI-optimized content up to 1,000 words' },
  'ai-creative-assets': { name: 'AI Creative Assets', price: 299, description: 'Monthly package of custom visuals for social, ads & website' },
  'business-branding': { name: 'Business Branding Foundation', price: 99, description: 'Strategic brand positioning and messaging documents' },
}

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

export default function ContentPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const isDemo = viewingAs === DEMO_CLIENT_ID
  const { client, loading } = useClientData(viewingAs)
  const router = useRouter()
  usePageView({ page: '/content', pageName: 'Content' })

  // State hooks
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showContentRequirementsModal, setShowContentRequirementsModal] = useState(false)
  const [subscriptionServices, setSubscriptionServices] = useState<Array<{ id?: string; name: string; quantity: number }>>([])
  const [availableContentProducts, setAvailableContentProducts] = useState<Array<{ id: string; name: string; short_description?: string | null; monthly_price?: string | null }>>([])

  // Add to subscription modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)
  const [addModalLoading, setAddModalLoading] = useState(false)
  const [addModalSuccess, setAddModalSuccess] = useState<{ productName: string; effectiveDate: string } | null>(null)
  const [addModalError, setAddModalError] = useState<string | null>(null)
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null)

  // Fetch subscription info to get next billing date and services
  useEffect(() => {
    async function fetchSubscriptionInfo() {
      if (!client.id || isDemo) return
      try {
        const res = await fetch(`/api/client/subscription?clientId=${client.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.subscription?.currentPeriodEnd) {
            setNextBillingDate(data.subscription.currentPeriodEnd)
          }
          // Set subscription services for ContentView
          if (data.services) {
            setSubscriptionServices(data.services)
          }
        }
      } catch (err) {
        console.error('Error fetching subscription:', err)
      }
    }
    fetchSubscriptionInfo()
  }, [client.id, isDemo])

  // Fetch available content products for upsell
  useEffect(() => {
    async function fetchContentProducts() {
      if (!client.id || isDemo) return
      try {
        const res = await fetch(`/api/client/content-products?clientId=${client.id}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableContentProducts(data.available || [])
        }
      } catch (err) {
        console.error('Error fetching content products:', err)
      }
    }
    fetchContentProducts()
  }, [client.id, isDemo])

  // Demo state from URL params (set by PreviewBanner)
  const demoState = searchParams.get('demoState')

  // Check if client is pending (prospect only)
  const isPending = isDemo
    ? demoState === 'locked'
    : client.status === 'pending'

  // Check if client has content access from their subscriptions
  const hasContentAccess = isDemo
    ? !demoState || demoState === 'active'
    : client.access.hasContent

  // Show coming soon if client has content products but no active content yet
  const showComingSoon = isDemo
    ? demoState === 'coming-soon'
    : !isPending && client.access.hasContentProducts && !hasContentAccess

  // Show upsell/no content products state
  const showUpsell = isDemo
    ? demoState === 'upsell'
    : !isPending && !client.access.hasContentProducts

  // Show loading state while fetching client data
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Content</h1>
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

  const handleAddToCart = (itemId: string) => {
    // If client has an active subscription, show the add modal
    // Otherwise, redirect to checkout for a new subscription
    if (nextBillingDate && !isDemo) {
      setAddingProduct(itemId)
      setAddModalError(null)
      setAddModalSuccess(null)
      setShowAddModal(true)
    } else {
      // No active subscription - redirect to full checkout
      const params = new URLSearchParams()
      params.set('item', itemId)
      if (viewingAs) params.set('viewingAs', viewingAs)
      router.push(`/checkout?${params.toString()}`)
    }
  }

  const handleConfirmAdd = async () => {
    if (!addingProduct || !client.id) return

    setAddModalLoading(true)
    setAddModalError(null)

    try {
      const res = await fetch('/api/stripe/add-to-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: client.id,
          productSlug: addingProduct,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'no_active_subscription') {
          // Redirect to checkout
          setShowAddModal(false)
          const params = new URLSearchParams()
          params.set('item', addingProduct)
          if (viewingAs) params.set('viewingAs', viewingAs)
          router.push(`/checkout?${params.toString()}`)
          return
        }
        setAddModalError(data.message || 'Failed to add product')
        return
      }

      // Success!
      setAddModalSuccess({
        productName: data.productName,
        effectiveDate: data.effectiveDate,
      })
    } catch (err) {
      console.error('Error adding to subscription:', err)
      setAddModalError('An error occurred. Please try again.')
    } finally {
      setAddModalLoading(false)
    }
  }

  const closeAddModal = () => {
    setShowAddModal(false)
    setAddingProduct(null)
    setAddModalSuccess(null)
    setAddModalError(null)
  }

  // If client is pending, show locked placeholder
  if (isPending) {
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
              <span className="user-name">{client.contactName}</span>
            </Link>
          </div>
        </div>
        <div className="client-content">
          <div className="locked-page-placeholder">
            <div className="locked-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Content Available After Purchase</h2>
            <p>Once you select a plan that includes content services, you&apos;ll be able to review drafts, access brand assets, and manage your content library here.</p>
            <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'} className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              View Your Proposal
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Show coming soon if client has content products but content isn't active yet
  if (showComingSoon) {
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
              <span className="user-name">{client.contactName}</span>
            </Link>
          </div>
        </div>
        <div className="client-content">
          <div className="coming-soon-placeholder">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <h2>Content Coming Soon</h2>
            <p>Your content team is getting started on your first pieces. You&apos;ll be notified when content is ready for review.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Content service activated</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>First content in production</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Ready for your review</span>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // If client doesn't have content products purchased, show upsell
  if (showUpsell) {
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
              <span className="user-name">{client.contactName}</span>
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

        {/* Add to Subscription Modal */}
        {showAddModal && addingProduct && (
          <div className="edit-modal-overlay" onClick={closeAddModal}>
            <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <div className="modal-header-left">
                  <div className="modal-icon" style={{ background: '#D1FAE5' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="20" height="20">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  </div>
                  <div>
                    <h2>{addModalSuccess ? 'Added to Your Plan!' : 'Add to Your Plan'}</h2>
                    <p className="modal-subtitle">
                      {addModalSuccess
                        ? 'Your subscription has been updated'
                        : 'This will be added to your current subscription'}
                    </p>
                  </div>
                </div>
                <button className="modal-close" onClick={closeAddModal}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              <div className="modal-body" style={{ padding: '1.5rem' }}>
                {addModalSuccess ? (
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="32" height="32">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{addModalSuccess.productName}</h3>
                    <p style={{ color: '#6B7280', margin: 0 }}>
                      Will be active starting{' '}
                      {new Date(addModalSuccess.effectiveDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'America/Chicago'
                      })}
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
                        {PRODUCT_INFO[addingProduct]?.name || addingProduct}
                      </div>
                      <div style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {PRODUCT_INFO[addingProduct]?.description}
                      </div>
                      <div style={{ fontWeight: 600, color: '#059669' }}>
                        ${PRODUCT_INFO[addingProduct]?.price}/month
                      </div>
                    </div>

                    <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="20" height="20" style={{ flexShrink: 0, marginTop: 2 }}>
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style={{ fontSize: '0.875rem', color: '#92400E' }}>
                          <strong>Billing starts on your next cycle</strong>
                          <br />
                          {nextBillingDate ? (
                            <>Your next billing date is {new Date(nextBillingDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                              timeZone: 'America/Chicago'
                            })}. This service will be included starting then.</>
                          ) : (
                            <>This service will be added to your next billing cycle.</>
                          )}
                        </div>
                      </div>
                    </div>

                    {addModalError && (
                      <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.875rem' }}>
                        {addModalError}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {addModalSuccess ? (
                  <button className="btn btn-primary" onClick={closeAddModal}>
                    Done
                  </button>
                ) : (
                  <>
                    <button className="btn btn-outline" onClick={closeAddModal} disabled={addModalLoading}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={handleConfirmAdd} disabled={addModalLoading}>
                      {addModalLoading ? 'Adding...' : 'Add to My Plan'}
                    </button>
                  </>
                )}
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
          <h1>Content Manager</h1>
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
        {/* Active Content - use shared ContentView component */}
        <ContentView
          clientId={client.id}
          isDemo={isDemo}
          subscriptionServices={subscriptionServices}
          availableContentProducts={availableContentProducts}
          onAddToCart={handleAddToCart}
          onViewContentRequirements={() => setShowContentRequirementsModal(true)}
          contentServices={client.access.contentServices || []}
        />
      </div>

      {/* Content Requirements Modal */}
      {showContentRequirementsModal && (
        <div className="edit-modal-overlay" onClick={() => setShowContentRequirementsModal(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon" style={{ background: '#EDE9FE' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="20" height="20">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                </div>
                <div>
                  <h2>Content Requirements</h2>
                  <p className="modal-subtitle">What we need from you to create great content</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowContentRequirementsModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>Brand Voice & Tone</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                    Share your brand guidelines, preferred tone, and any specific messaging requirements.
                  </p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>Target Keywords</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                    List the primary keywords and topics you want your content to focus on.
                  </p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>Competitor References</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                    Share examples of content from competitors or other brands you admire.
                  </p>
                </div>
                <div style={{ background: '#F9FAFB', borderRadius: '8px', padding: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>Visual Assets</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                    Provide high-quality images, logos, and any existing brand assets for use in content.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB' }}>
              <button className="btn btn-primary" onClick={() => setShowContentRequirementsModal(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
