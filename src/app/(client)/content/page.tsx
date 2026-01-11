'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

export default function ContentPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  const router = useRouter()
  usePageView({ page: '/content', pageName: 'Content' })

  // Check if client is pending (prospect only)
  const isPending = client.status === 'pending'

  // Check if client has content access from their subscriptions
  const hasContentAccess = client.access.hasContent

  // Show coming soon if client has content products but no active content yet
  const showComingSoon = !isPending && client.access.hasContentProducts && !hasContentAccess

  const [showBookingModal, setShowBookingModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'review' | 'files'>('review')
  const [fileFilter, setFileFilter] = useState<'all' | 'docs' | 'images' | 'video'>('all')

  // Files data
  const files = [
    { id: 1, name: 'Brand Strategy Framework.pdf', type: 'docs' as const, category: 'Branding Foundation', date: 'Dec 15, 2025' },
    { id: 2, name: 'Go-To-Market Playbook.pdf', type: 'docs' as const, category: 'Branding Foundation', date: 'Dec 15, 2025' },
    { id: 3, name: 'Competitive Analysis.pdf', type: 'docs' as const, category: 'Branding Foundation', date: 'Dec 12, 2025' },
    { id: 4, name: 'Brand Color Guidelines.pdf', type: 'docs' as const, category: 'Branding Foundation', date: 'Dec 10, 2025' },
    { id: 5, name: 'Holiday Promo Banner.png', type: 'images' as const, category: 'AI Creative', date: 'Dec 20, 2025' },
    { id: 6, name: 'Social Post - Services.jpg', type: 'images' as const, category: 'AI Creative', date: 'Dec 18, 2025' },
    { id: 7, name: 'Animated Logo Intro.mp4', type: 'video' as const, category: 'AI Creative', date: 'Dec 5, 2025' },
  ]

  const filteredFiles = fileFilter === 'all' ? files : files.filter(f => f.type === fileFilter)

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
    const params = new URLSearchParams()
    params.set('item', itemId)
    if (viewingAs) params.set('viewingAs', viewingAs)
    router.push(`/checkout?${params.toString()}`)
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
          {/* Content Stats - showing zeros for coming soon state */}
          <div className="content-stats">
            <div className="content-stat-card">
              <div className="stat-label">Urgent Reviews</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Less than 24 hours</div>
            </div>
            <div className="content-stat-card">
              <div className="stat-label">Pending Approval</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Awaiting your review</div>
            </div>
            <div className="content-stat-card">
              <div className="stat-label">Approved</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Ready for publishing</div>
            </div>
            <div className="content-stat-card">
              <div className="stat-label">Published</div>
              <div className="stat-value">0</div>
              <div className="stat-desc">Live content</div>
            </div>
          </div>

          {/* Content Actions Bar */}
          <div className="content-actions-bar" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                View Content Requirements
              </button>
              <div className="content-plan-inline">
                <span className="plan-inline-label">Your Plan:</span>
                <span className="plan-inline-item">Business Branding Foundation</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn" style={{ background: '#7C3AED', borderColor: '#7C3AED', color: 'white' }} onClick={() => handleAddToCart('content-writing')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Add Content Writing
              </button>
              <button className="btn" style={{ background: '#F59E0B', borderColor: '#F59E0B', color: 'white' }} onClick={() => handleAddToCart('ai-creative-assets')}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Add AI Creative
              </button>
            </div>
          </div>

          {/* Content Tabs */}
          <div className="results-subtabs">
            <button
              className={`results-subtab ${activeTab === 'review' ? 'active' : ''}`}
              onClick={() => setActiveTab('review')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Content Review
            </button>
            <button
              className={`results-subtab ${activeTab === 'files' ? 'active' : ''}`}
              onClick={() => setActiveTab('files')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              Files
            </button>
          </div>

          {/* Content Filters - aligned right */}
          <div className="content-filters" style={{ marginBottom: '1rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-outline btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search
            </button>
            <button className="btn btn-outline btn-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Sort by Date
            </button>
          </div>

          {/* Coming Soon Message */}
          <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
            <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="32" height="32">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>Content Coming Soon</h3>
            <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
              Your content team is getting started on your first pieces. You&apos;ll be notified when content is ready for review.
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#DEF7EC', color: '#03543F', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Content service active
            </div>
          </div>
        </div>
      </>
    )
  }

  // If client doesn't have content products purchased, show upsell
  if (!client.access.hasContentProducts) {
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
            <div className="stat-desc">Awaiting your review</div>
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

        {/* Content Actions Bar */}
        <div className="content-actions-bar">
          <button className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            View Content Requirements
          </button>
          <div className="content-plan-inline">
            <span className="plan-inline-label">Your Plan:</span>
            <span className="plan-inline-item">(2) Blog posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(2) GBP posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(8) Social posts</span>
            <span className="plan-inline-divider">•</span>
            <span className="plan-inline-item">(4) AI graphics</span>
            <span className="plan-inline-suffix">per month</span>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="results-subtabs">
          <button
            className={`results-subtab ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Content Review
            <span className="subtab-badge">7</span>
          </button>
          <button
            className={`results-subtab ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Files
            <span className="subtab-badge">7</span>
          </button>
        </div>

        {/* Files Tab Content */}
        {activeTab === 'files' && (
          <div className="content-tab-content">
            <div className="files-header">
              <select
                className="file-filter-select"
                value={fileFilter}
                onChange={(e) => setFileFilter(e.target.value as 'all' | 'docs' | 'images' | 'video')}
              >
                <option value="all">All Files ({files.length})</option>
                <option value="docs">Documents ({files.filter(f => f.type === 'docs').length})</option>
                <option value="images">Images ({files.filter(f => f.type === 'images').length})</option>
                <option value="video">Video ({files.filter(f => f.type === 'video').length})</option>
              </select>
            </div>

            <div className="files-grid">
              {filteredFiles.map((file) => (
                <div key={file.id} className="file-card">
                  <div className={`file-icon ${file.type === 'docs' ? 'pdf' : file.type === 'images' ? 'image' : 'video'}`}>
                    {file.type === 'docs' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
                    )}
                    {file.type === 'images' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    )}
                    {file.type === 'video' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                    )}
                  </div>
                  <div className="file-info">
                    <h4 className="file-name">{file.name}</h4>
                    <div className="file-meta">
                      <span className="file-category">{file.category}</span>
                      <span className="file-date">{file.date}</span>
                    </div>
                  </div>
                  <div className="file-actions">
                    <button className="btn btn-sm btn-outline" title="Download">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </button>
                    <button className="btn btn-sm btn-outline" title="View">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content Review Tab Content */}
        {activeTab === 'review' && (
          <>
        {/* Urgent Reviews Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3 className="urgent-title">Urgent Reviews</h3>
            <div className="content-filters">
              <button className="btn btn-outline btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                Search
              </button>
              <button className="btn btn-outline btn-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Sort by Date
              </button>
            </div>
          </div>

          <div className="content-list">
            <div className="content-item urgent">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="time-remaining urgent">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">23 hours</span>
                </div>
              </div>
              <h4 className="content-title">Black Friday Sale Announcement</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 15
                </span>
              </div>
              <p className="content-preview">Get ready for our biggest sale of the year! This Black Friday, enjoy up to 50% off on all our digital marketing services...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item urgent">
              <div className="content-item-header">
                <span className="platform-badge gbp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Google Business Profile
                </span>
                <div className="time-remaining urgent">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">18 hours</span>
                </div>
              </div>
              <h4 className="content-title">Limited Time Offer Post</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Google Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 18
                </span>
              </div>
              <p className="content-preview">This week only! Get a free SEO audit with any web design package. Limited slots available...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approval Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Pending Approval</h3>
          </div>
          <div className="content-list">
            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">4 days</span>
                </div>
              </div>
              <h4 className="content-title">2025 Marketing Trends You Need to Know</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 20
                </span>
              </div>
              <p className="content-preview">Stay ahead of the curve with these 10 marketing trends that will dominate 2025...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge social">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                  </svg>
                  Social Posts
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">5 days</span>
                </div>
              </div>
              <h4 className="content-title">December Social Media Calendar</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  8 Posts
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 22
                </span>
              </div>
              <p className="content-preview">Your complete December social media content package: holiday promotions, year-end highlights, and New Year&apos;s preview...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>

            <div className="content-item">
              <div className="content-item-header">
                <span className="platform-badge ai-creative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  AI Creative
                </span>
                <div className="time-remaining">
                  <span className="time-label">Time remaining</span>
                  <span className="time-value">6 days</span>
                </div>
              </div>
              <h4 className="content-title">Holiday Promotion Graphics Package</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  4 Graphics
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  Added Nov 23
                </span>
              </div>
              <p className="content-preview">AI-generated promotional graphics for your holiday campaign: social banners, email headers, and website hero images...</p>
              <div className="content-actions">
                <button className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Review &amp; Edit
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Quick Approve
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Approved - Awaiting Publishing</h3>
          </div>
          <div className="content-list">
            <div className="content-item approved">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="status-approved">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Awaiting Publishing
                </div>
              </div>
              <h4 className="content-title">Complete Guide to Digital Marketing in 2024</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Approved Nov 19
                </span>
              </div>
              <p className="content-preview">Get ready to take your business to the next level with our comprehensive guide to digital marketing...</p>
              <div className="publishing-info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Scheduled for publishing on Nov 21
              </div>
              <div className="content-actions">
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  View Approved Version
                </button>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  Rush Publishing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Published Section */}
        <div className="content-section">
          <div className="content-section-header">
            <h3>Published Content</h3>
          </div>
          <div className="content-list">
            <div className="content-item published">
              <div className="content-item-header">
                <span className="platform-badge website">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  Website Content
                </span>
                <div className="status-published">
                  <span className="published-label">Published</span>
                  <span className="published-date">10 days ago</span>
                </div>
              </div>
              <h4 className="content-title">How to Improve Your Local SEO Rankings</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Blog Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Published Nov 10
                </span>
              </div>
              <p className="content-preview">Learn the essential strategies for boosting your local search visibility and attracting more customers...</p>
              <div className="content-actions">
                <a href="https://example.com/blog/local-seo-rankings" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  View on Website
                </a>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Request Update
                </button>
              </div>
            </div>

            <div className="content-item published">
              <div className="content-item-header">
                <span className="platform-badge gbp">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  Google Business Profile
                </span>
                <div className="status-published">
                  <span className="published-label">Published</span>
                  <span className="published-date">9 days ago</span>
                </div>
              </div>
              <h4 className="content-title">Veterans Day Special Offer</h4>
              <div className="content-meta">
                <span className="content-type">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Google Post
                </span>
                <span className="content-date">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Published Nov 11
                </span>
              </div>
              <p className="content-preview">This Veterans Day, we&apos;re proud to offer 20% off all services for veterans and active military...</p>
              <div className="content-actions">
                <a href="https://business.google.com/posts" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  View on GBP
                </a>
                <button className="btn btn-outline btn-sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Create Similar Post
                </button>
              </div>
            </div>
          </div>
        </div>
        </>
        )}
      </div>
    </>
  )
}
