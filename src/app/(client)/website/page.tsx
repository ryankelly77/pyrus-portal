'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

type RequestStatus = 'completed' | 'in-progress' | 'pending'

interface EditRequest {
  id: number
  title: string
  description?: string
  type: string
  status: RequestStatus
  date: string
}

// Mock data for TC Clinical
const websiteData = {
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
  const client = getClientByViewingAs(viewingAs)

  const [requestType, setRequestType] = useState('')
  const [requestDescription, setRequestDescription] = useState('')
  const [showBookingModal, setShowBookingModal] = useState(false)

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

  // Use client-specific website data if available, otherwise fall back to default
  const clientWebsiteData = client.websiteData || websiteData

  // If client doesn't have website service, show upsell
  if (!client.hasWebsite) {
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
              <span className="user-name">{client.primaryContact}</span>
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
            <h2 className="upsell-title">Get Your Professional Website</h2>
            <p className="upsell-description">
              Establish your online presence with a stunning, professional website tailored to your business. Our websites are designed to convert visitors into customers.
            </p>
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
                <button className="btn btn-secondary">
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
                <button className="btn btn-secondary">
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
                <button className="btn btn-primary">
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
                <button className="btn btn-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add to My Plan
                </button>
              </div>
            </div>

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
                    <button className="btn btn-sm btn-secondary">
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
                    <button className="btn btn-sm btn-secondary">
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
            <span className="user-name">{client.primaryContact}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Website Preview and Info Grid */}
        <div className="website-hero-grid">
          {/* Website Preview */}
          <div className="website-preview-card">
            <div className="website-preview-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Website Preview
              </h3>
              <a href={`https://${clientWebsiteData.domain}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                Visit Site
              </a>
            </div>
            <div className="website-preview-container">
              <iframe
                src={clientWebsiteData.previewUrl}
                title="Website Preview"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          {/* Website Info Card */}
          <div className="website-info-card">
            <div className="website-info-header">
              <div className="website-status-badge active">
                <span className="status-dot"></span>
                Active
              </div>
            </div>

            <div className="website-domain">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>{clientWebsiteData.domain}</span>
            </div>

            <div className="website-info-details">
              <div className="info-row">
                <span className="info-label">Website Plan</span>
                <span className="info-value">{clientWebsiteData.plan}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Care Plan</span>
                <span className="info-value">{clientWebsiteData.carePlan}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Launched</span>
                <span className="info-value">{clientWebsiteData.launchDate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Hosting</span>
                <span className="info-value">{clientWebsiteData.hosting.provider}</span>
              </div>
            </div>

            <div className="website-stats-mini">
              <div className="stat-mini">
                <div className="stat-mini-value success">{clientWebsiteData.hosting.uptime}</div>
                <div className="stat-mini-label">Uptime</div>
              </div>
              <div className="stat-mini">
                <div className="stat-mini-value">{clientWebsiteData.hosting.lastUpdated}</div>
                <div className="stat-mini-label">Last Updated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Requests Section - Split Layout */}
        <div className="edit-requests-split">
          {/* Left: Request History */}
          <div className="edit-requests-card">
            <div className="edit-requests-header">
              <div className="edit-requests-title">
                <h3>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  Request History
                </h3>
                <p>Track your website change requests</p>
              </div>
            </div>

            {/* Requests List */}
            <div className="edit-requests-list">
              {editRequests.map((request) => (
                <div key={request.id} className={`edit-request-item ${request.status}`}>
                  <div className={`request-status-icon ${request.status}`}>
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="request-details">
                    <div className="request-title">{request.title}</div>
                    <div className="request-meta">
                      <span className="request-type">{request.type}</span>
                    </div>
                  </div>
                  <div className="request-info">
                    <span className={`request-status-badge ${request.status}`}>
                      {request.status === 'in-progress' ? 'In Progress' : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    <span className="request-date">{request.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: New Request Form */}
          <div className="new-request-card">
            <div className="new-request-header">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Request an Edit
              </h3>
              <p>Submit a new change request</p>
            </div>
            <form className="new-request-form" onSubmit={handleSubmitRequest}>
              <div className="form-group">
                <label htmlFor="requestType">Request Type</label>
                <select
                  id="requestType"
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  required
                >
                  <option value="">Select type...</option>
                  <option value="content-update">Content Update</option>
                  <option value="bug-fix">Bug Fix</option>
                  <option value="new-feature">New Feature</option>
                  <option value="design-change">Design Change</option>
                </select>
              </div>
              <div className="form-group description-group">
                <label htmlFor="requestDescription">Description</label>
                <textarea
                  id="requestDescription"
                  value={requestDescription}
                  onChange={(e) => setRequestDescription(e.target.value)}
                  placeholder="Describe the changes you'd like to make..."
                  rows={4}
                  required
                ></textarea>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
