'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'
import { WebsiteView } from '@/components/client-views'

// Product info for the add-to-subscription modal
const PRODUCT_INFO: Record<string, { name: string; price: number; description: string }> = {
  'seed-site': { name: 'Seed Site', price: 249, description: 'AI-built professional website with hosting included' },
  'website-care': { name: 'Website Care Plan', price: 149, description: 'Content updates, design changes & ongoing requests' },
}

type RequestStatus = 'completed' | 'in-progress' | 'pending'

interface EditRequest {
  id: number
  title: string
  description?: string
  type: string
  status: RequestStatus
  date: string
}

// Demo client ID for showing demo-specific data
const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

// Demo website data (Raptor Vending)
const demoWebsiteData = {
  domain: 'raptor-vending.com',
  previewUrl: 'https://raptor-vending.com',
  plan: 'Bloom Site (WordPress)',
  carePlan: 'Website Care Plan',
  status: 'active' as const,
  launchDate: 'Jun 20, 2024',
  hosting: {
    provider: 'WPEngine',
    uptime: '99.9%',
    lastUpdated: 'Jan 10, 2026',
  },
}

// Default website data for TC Clinical
const defaultWebsiteData = {
  domain: 'tc-clinicalservices.com',
  previewUrl: 'https://app.landingsite.ai/website-preview?id=8869fd44-f6ea-4bd7-bc24-92a7a14f17a5',
  plan: 'Seed Site (AI-Built)',
  carePlan: 'Website Care Plan',
  status: 'active' as const,
  launchDate: 'Dec 30, 2025',
  hosting: {
    provider: 'Landingsite.ai',
    uptime: '99.9%',
    lastUpdated: 'Jan 3, 2026',
  },
}

const editRequests: EditRequest[] = [
  { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed', date: 'Jan 3, 2026' },
  { id: 2, title: 'Add new wound care service page', type: 'New Feature', status: 'in-progress', date: 'Jan 2, 2026' },
  { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed', date: 'Dec 28, 2025' },
  { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed', date: 'Dec 20, 2025' },
]

export default function WebsitePage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  const router = useRouter()
  usePageView({ page: '/website', pageName: 'Website' })

  // State hooks
  const [requestType, setRequestType] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [showBookingModal, setShowBookingModal] = useState(false)

  // Add to subscription modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingProduct, setAddingProduct] = useState<string | null>(null)
  const [addModalLoading, setAddModalLoading] = useState(false)
  const [addModalSuccess, setAddModalSuccess] = useState<{ productName: string; effectiveDate: string } | null>(null)
  const [addModalError, setAddModalError] = useState<string | null>(null)
  const [nextBillingDate, setNextBillingDate] = useState<string | null>(null)

  const isDemo = viewingAs === DEMO_CLIENT_ID

  // Fetch subscription info to get next billing date
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
        }
      } catch (err) {
        console.error('Error fetching subscription:', err)
      }
    }
    fetchSubscriptionInfo()
  }, [client.id, isDemo])
  const demoState = searchParams.get('demoState')

  // Check if client is pending (prospect only) or has website services
  const isPending = isDemo
    ? demoState === 'locked'
    : client.status === 'pending'
  const hasWebsite = isDemo
    ? !demoState || demoState === 'active'
    : client.access.hasWebsite
  const hasWebsiteProducts = isDemo
    ? demoState !== 'upsell'
    : client.access.hasWebsiteProducts
  // Show coming soon if client is active with website products but data isn't connected yet
  const showComingSoon = isDemo
    ? demoState === 'coming-soon'
    : !isPending && hasWebsiteProducts && !hasWebsite
  // Show upsell if client doesn't have website products
  const showUpsell = isDemo
    ? demoState === 'upsell'
    : !isPending && !hasWebsiteProducts

  // Determine upsell variant based on website_provider
  // State A: No website URL - show full website design upsell
  // State B: Has URL, provider='other' or null - show "We can manage your site" with care plans
  // State C: Has URL, provider='pear' - show "Add a Website Care Plan" with care plans
  const hasExistingWebsite = !!client.websiteUrl
  const websiteProvider = client.websiteProvider
  const upsellVariant = !hasExistingWebsite
    ? 'no-website'
    : websiteProvider === 'pear'
    ? 'pear-built'
    : 'other-built'

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

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('New request:', { type: requestType, description: requestDescription })
    setRequestType('')
    setRequestDescription('')
  }

  const getStatusIcon = (status: RequestStatus) => {
    switch (status) {
      case 'completed':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'in-progress':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        )
      case 'pending':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
    }
  }

  // Use demo data for demo client, otherwise use client-specific or default data
  // TODO: Fetch real website data from API based on client subscriptions
  const clientWebsiteData = isDemo ? demoWebsiteData : (client.landingsitePreviewUrl ? {
    ...defaultWebsiteData,
    previewUrl: client.landingsitePreviewUrl,
  } : defaultWebsiteData)

  // Show loading state while fetching client data
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Website</h1>
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

  // If client doesn't have website products, show upsell
  if (showUpsell) {
    return (
      <>
        {/* Top Header Bar */}
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Website</h1>
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
          <div className="upsell-container">
            <div className="upsell-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="64" height="64">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <h2 className="upsell-title">
              {upsellVariant === 'no-website' && 'Get Your Professional Website'}
              {upsellVariant === 'pear-built' && 'Add a Website Care Plan'}
              {upsellVariant === 'other-built' && 'We Can Manage Your Existing Site'}
            </h2>
            <p className="upsell-description">
              {upsellVariant === 'no-website' && 'Establish your online presence with a stunning, professional website tailored to your business. Our websites are designed to convert visitors into customers.'}
              {upsellVariant === 'pear-built' && 'Your Pear-built website needs ongoing care. Add a Website Care Plan for content updates, design changes, and ongoing requests to keep your site running smoothly.'}
              {upsellVariant === 'other-built' && 'We can help maintain and improve your existing website. Add a Website Care Plan for content updates, design changes, and ongoing support.'}
            </p>
            {upsellVariant === 'no-website' && (
              <div className="upsell-features">
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Custom design that reflects your brand</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Mobile-responsive on all devices</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>SEO optimized for better rankings</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Ongoing care and maintenance included</span>
                </div>
              </div>
            )}
            {(upsellVariant === 'pear-built' || upsellVariant === 'other-built') && (
              <div className="upsell-features">
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Content updates and design changes</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Security updates and backups</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Performance monitoring</span>
                </div>
                <div className="upsell-feature">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span>Ongoing support and requests</span>
                </div>
              </div>
            )}
            {upsellVariant === 'no-website' && (
            <div className="upsell-plans">
              <div className="upsell-plan-card">
                <div className="plan-card-content">
                  <div className="plan-header">
                    <h3>Seed Site</h3>
                    <p className="plan-type">AI-Built Website</p>
                  </div>
                  <div className="plan-price">
                    <span className="price-amount">$249</span>
                    <span className="price-period">/month</span>
                  </div>
                  <ul className="plan-features-list">
                    <li>AI-generated modern design</li>
                    <li>Up to 5 pages</li>
                    <li>Basic SEO setup</li>
                    <li>SSL &amp; hosting included</li>
                    <li>Mobile responsive</li>
                  </ul>
                </div>
                <button className="btn btn-secondary" onClick={() => handleAddToCart('seed-site')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add to My Plan
                </button>
              </div>
              <div className="upsell-plan-card">
                <div className="plan-card-content">
                  <div className="plan-header">
                    <h3>Sprout Site</h3>
                    <p className="plan-type">WordPress</p>
                  </div>
                  <div className="plan-price">
                    <span className="price-amount">$300</span>
                    <span className="price-period">/mo × 12</span>
                  </div>
                  <p className="plan-alt-price">or $3,000 one-time</p>
                  <ul className="plan-features-list">
                    <li>Custom WordPress design</li>
                    <li>Up to 5 pages</li>
                    <li>Blog ready</li>
                    <li>Contact forms</li>
                  </ul>
                </div>
                <button className="btn btn-secondary" onClick={() => handleAddToCart('sprout-site')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add to My Plan
                </button>
              </div>
              <div className="upsell-plan-card featured">
                <div className="plan-badge">Most Popular</div>
                <div className="plan-card-content">
                  <div className="plan-header">
                    <h3>Bloom Site</h3>
                    <p className="plan-type">WordPress</p>
                  </div>
                  <div className="plan-price">
                    <span className="price-amount">$450</span>
                    <span className="price-period">/mo × 12</span>
                  </div>
                  <p className="plan-alt-price">or $4,500 one-time</p>
                  <ul className="plan-features-list">
                    <li>Premium WordPress design</li>
                    <li>Up to 10 pages</li>
                    <li>Advanced SEO optimization</li>
                    <li>Blog &amp; integrations</li>
                    <li>Custom functionality</li>
                  </ul>
                </div>
                <button className="btn btn-primary" onClick={() => handleAddToCart('bloom-site')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add to My Plan
                </button>
              </div>
              <div className="upsell-plan-card">
                <div className="plan-card-content">
                  <div className="plan-header">
                    <h3>Harvest Site</h3>
                    <p className="plan-type">WordPress</p>
                  </div>
                  <div className="plan-price">
                    <span className="price-amount">$600</span>
                    <span className="price-period">/mo × 12</span>
                  </div>
                  <p className="plan-alt-price">or $6,000 one-time</p>
                  <ul className="plan-features-list">
                    <li>Enterprise WordPress design</li>
                    <li>Unlimited pages</li>
                    <li>E-commerce ready</li>
                    <li>Advanced integrations</li>
                    <li>Priority support</li>
                  </ul>
                </div>
                <button className="btn btn-secondary" onClick={() => handleAddToCart('harvest-site')}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add to My Plan
                </button>
              </div>
            </div>
            )}

            {/* Care Plans */}
            <div className="care-plans-section">
              <h3 className="care-plans-title">Ongoing Website Care</h3>
              <p className="care-plans-desc">Keep your website running smoothly with our maintenance plans</p>
              <div className="care-plans-grid">
                <div className="care-plan-card">
                  <div className="care-plan-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                    </svg>
                  </div>
                  <div className="care-plan-content">
                    <h4>WordPress Care Plan</h4>
                    <p>Hosting, security updates, backups &amp; technical maintenance</p>
                  </div>
                  <div className="care-plan-action">
                    <div className="care-plan-price">$49<span>/mo</span></div>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddToCart('wordpress-care')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to My Plan
                    </button>
                  </div>
                </div>
                <div className="care-plan-card">
                  <div className="care-plan-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  </div>
                  <div className="care-plan-content">
                    <h4>Website Care Plan</h4>
                    <p>Content updates, design changes &amp; ongoing requests</p>
                  </div>
                  <div className="care-plan-action">
                    <div className="care-plan-price">$149<span>/mo</span></div>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleAddToCart('website-care')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      Add to My Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="content-cta">
              <div className="cta-message">
                <h3>Have questions about our website services?</h3>
                <p>Let&apos;s discuss which website solution will drive the best results for your business.</p>
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
                  id="on0xt5S6hLW1JJ2G54dD_1767723556045"
                ></iframe>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Website</h1>
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
            <h2>Website Available After Purchase</h2>
            <p>Once you select a plan that includes website services, you&apos;ll be able to preview your site, request edits, and manage your web presence here.</p>
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
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
            </div>
            <h2>Website Coming Soon</h2>
            <p>We&apos;re building your new website. You&apos;ll be able to preview your site, request edits, and manage your web presence here once your site is ready.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Website plan selected</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Design &amp; development in progress</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Preview &amp; launch</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Website - use shared WebsiteView component */
          <WebsiteView clientId={client.id} isDemo={isDemo} onAddToCart={handleAddToCart} websiteServices={client.access.websiteServices || []} />
        )}
      </div>

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
