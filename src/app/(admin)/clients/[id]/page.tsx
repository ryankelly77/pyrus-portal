'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface ClientData {
  id: string
  name: string
  initials: string
  avatarColor: string
  email: string
  clientSince: string
  status: 'active' | 'paused' | 'onboarding'
  servicesCount: number
}

// Client database - matches admin/clients/page.tsx
const clients: Record<string, ClientData> = {
  'tc-clinical': {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    initials: 'TC',
    avatarColor: '#885430',
    email: 'dlg.mdservices@gmail.com',
    clientSince: 'Sep 2025',
    status: 'active',
    servicesCount: 4,
  },
  'raptor-vending': {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    initials: 'RV',
    avatarColor: '#2563EB',
    email: 'info@raptorvending.com',
    clientSince: 'Jun 2025',
    status: 'active',
    servicesCount: 3,
  },
  'raptor-services': {
    id: 'raptor-services',
    name: 'Raptor Services',
    initials: 'RS',
    avatarColor: '#7C3AED',
    email: 'contact@raptorservices.com',
    clientSince: 'Mar 2025',
    status: 'active',
    servicesCount: 5,
  },
  'gohfr': {
    id: 'gohfr',
    name: 'Gohfr',
    initials: 'GO',
    avatarColor: '#0B7277',
    email: 'hello@gohfr.com',
    clientSince: 'Dec 2025',
    status: 'onboarding',
    servicesCount: 3,
  },
  'espronceda-law': {
    id: 'espronceda-law',
    name: 'Espronceda Law',
    initials: 'EL',
    avatarColor: '#DC2626',
    email: 'maria@espronceda.law',
    clientSince: 'Aug 2025',
    status: 'active',
    servicesCount: 4,
  },
}

const avatarColors = [
  { name: 'Brown', value: '#885430' },
  { name: 'Blue', value: '#2563EB' },
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Teal', value: '#0B7277' },
  { name: 'Red', value: '#DC2626' },
  { name: 'Orange', value: '#EA580C' },
  { name: 'Green', value: '#16A34A' },
  { name: 'Cyan', value: '#0891B2' },
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Pink', value: '#DB2777' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Violet', value: '#9333EA' },
]

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const client = clients[clientId] || clients['tc-clinical']

  const [activeSubtab, setActiveSubtab] = useState('checklist')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: client.name,
    email: client.email,
    avatarColor: client.avatarColor,
  })

  return (
    <>
      {/* Top Header Bar */}
      <div className="admin-top-header">
        <div className="admin-top-header-left">
          <nav className="breadcrumb">
            <Link href="/dashboard">Clients</Link>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
            <span>{client.name}</span>
          </nav>
        </div>
        <div className="admin-top-header-right">
          <Link href={`/getting-started?viewingAs=${client.id}`} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            View as Client
          </Link>
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>RK</span>
            </div>
            <span className="user-name">Ryan Kelly</span>
          </Link>
        </div>
      </div>

      <div className="admin-content">
        {/* Client Header Card */}
        <div className="client-header-card">
          <div className="client-header">
            <div className="client-info">
              <div className="client-avatar" style={{ background: editFormData.avatarColor }}>{client.initials}</div>
              <div className="client-details">
                <h1>
                  {client.name}
                  <span className={`status-badge ${client.status}`}>{client.status.charAt(0).toUpperCase() + client.status.slice(1)}</span>
                </h1>
                <p className="client-meta">{client.email} • Client since {client.clientSince} • <Link href="#current-services" className="services-link">{client.servicesCount} services</Link></p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Send Result Alert
              </button>
              <button className="btn btn-secondary">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Resend Invitation
              </button>
              <button className="btn btn-primary" onClick={() => setShowEditModal(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Edit Client
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <Link href="#" className="tab-btn active">Getting Started</Link>
          <Link href="#" className="tab-btn">Results</Link>
          <Link href="#" className="tab-btn">Activity</Link>
          <Link href="#" className="tab-btn">Website</Link>
          <Link href="#" className="tab-btn">Content</Link>
          <Link href="#" className="tab-btn">Communication</Link>
          <Link href="#" className="tab-btn">Recommendations</Link>
        </div>

        {/* Getting Started Sub-tabs */}
        <div className="getting-started-subtabs">
          <button
            className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveSubtab('checklist')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Checklist
          </button>
          <button
            className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
            onClick={() => setActiveSubtab('onboarding-summary')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Onboarding Summary
          </button>
        </div>

        {/* Checklist Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
          <div className="onboarding-grid">
            <div className="checklist-card">
              <div className="checklist-header">
                <h3>Onboarding Checklist</h3>
                <p>Complete these steps to get the most from your marketing</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-label">
                    <span>Progress</span>
                    <span>5 of 6 completed</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: '83%' }}></div>
                  </div>
                </div>
              </div>
              <div className="checklist-items">
                <div className="checklist-item completed">
                  <div className="checklist-checkbox completed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Create your portal account</div>
                    <div className="checklist-item-desc">Completed Jan 2, 2026</div>
                  </div>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox completed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Website launched</div>
                    <div className="checklist-item-desc">tc-clinicalservices.com is live • Completed Dec 30, 2025</div>
                  </div>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox completed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Google Business Profile claimed</div>
                    <div className="checklist-item-desc">Your business is verified on Google</div>
                  </div>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox completed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">SEO campaign activated</div>
                    <div className="checklist-item-desc">47 keywords now being tracked</div>
                  </div>
                </div>
                <div className="checklist-item completed">
                  <div className="checklist-checkbox completed">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Google Ads campaign launched</div>
                    <div className="checklist-item-desc">Generating 28 leads per month</div>
                  </div>
                </div>
                <div className="checklist-item">
                  <div className="checklist-checkbox"></div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Connect social media accounts</div>
                    <div className="checklist-item-desc">Link Facebook and LinkedIn for enhanced tracking</div>
                  </div>
                  <div className="checklist-item-action">
                    <button className="btn btn-secondary">Connect</button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="sidebar-card">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  Getting Started Video
                </h4>
                <div className="video-container">
                  <div className="video-placeholder">
                    <div className="video-play-btn">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </div>
                    <span className="video-duration">2:45</span>
                  </div>
                  <p className="video-caption">Learn how to navigate your portal, track results, and get the most from your marketing partnership.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Summary Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
          <div className="onboarding-summary">
            {/* Client Info */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                Client Info
              </h3>
              <div className="summary-grid">
                <div className="summary-field">
                  <label>Name</label>
                  <span>Jon De La Garza</span>
                </div>
                <div className="summary-field">
                  <label>Company</label>
                  <span>TC Clinical Services</span>
                </div>
                <div className="summary-field">
                  <label>Email</label>
                  <span>dlg.mdservices@gmail.com</span>
                </div>
                <div className="summary-field">
                  <label>Phone</label>
                  <span>(210) 394-5245</span>
                </div>
                <div className="summary-field">
                  <label>Mobile Phone</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Website</label>
                  <a href="https://tc-clinicalservices.com" target="_blank" rel="noopener noreferrer">https://tc-clinicalservices.com</a>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                Location Info
              </h3>
              <div className="summary-content">
                <div className="summary-field full-width">
                  <label>Address and phone number for each location</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Social media account links</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Do you have Google Business Profiles?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field full-width">
                  <label>Google Business Profile link</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Pyrus added as Manager users?</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>

            {/* Ad Accounts */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                </svg>
                Ad Accounts
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Pyrus managing paid advertising?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Advertising accounts included</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field full-width">
                  <label>Company differentiators for ad copy</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Top competitors</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Geographical service areas</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Run ads on weekends?</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Analytics
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Running Google Analytics 4?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Measurement ID</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Pyrus added as Admin users?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Google Tag Manager installed?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>GTM - Pyrus added as Admin?</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>

            {/* SEO Info */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                SEO Info
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Seedling or Harvest SEO plan?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Website access link</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Google Search Console account?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Pyrus added as Admin?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field full-width">
                  <label>Target keywords</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Competitors</label>
                  <span className="empty">Not provided</span>
                </div>
              </div>
            </div>

            {/* Leads & Goals */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Leads &amp; Goals
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>CRM &amp; Lead Tracking Plan?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Current leads per month</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Target leads per month</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Current cost per lead</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Target cost per lead</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Sales pipeline steps</label>
                  <span className="empty">Not provided</span>
                </div>
              </div>
            </div>

            {/* Appointment Setting */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Appointment Setting
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Appointment types</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Charge fee for appointments?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Pyrus added as Stripe Developer?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Number of users with appointments</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Current calendar system</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>

            {/* Email & SMS Reminders */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Email &amp; SMS Reminders
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Allow appointment rescheduling?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Allow appointment cancellation?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Preferred SMS area code</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field full-width">
                  <label>Business name (for A2P compliance)</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>EIN / Federal Tax ID</label>
                  <span className="empty">Not provided</span>
                </div>
              </div>
            </div>

            {/* Content Writing */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                Content Writing
              </h3>
              <div className="summary-content">
                <div className="summary-field full-width">
                  <label>Content creation focus</label>
                  <span>Updates on advanced wound care and gait deficit rehab</span>
                </div>
                <div className="summary-field full-width">
                  <label>Content posting process</label>
                  <span>Client needs to approve every piece of content before it gets posted</span>
                </div>
              </div>
            </div>

            {/* Chat */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Chat
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Chat option selected</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Admin website access provided?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field full-width">
                  <label>Chatbot engagement goals</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Training documents/URLs</label>
                  <span className="empty">Not provided</span>
                </div>
              </div>
            </div>

            {/* Review Management */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
                Review Management
              </h3>
              <div className="summary-content">
                <div className="summary-field full-width">
                  <label>Current review collection method</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Review platforms used</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Reviews displayed on website?</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>

            {/* Business Branding Foundation */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                  <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                Business Branding Foundation
              </h3>
              <div className="summary-content">
                <div className="summary-field full-width">
                  <label>What does your business do?</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Ideal customers</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Competitors and differentiators</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Desired brand perception</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field full-width">
                  <label>Important industry terms/values</label>
                  <span className="empty">Not provided</span>
                </div>
              </div>
            </div>

            {/* Website Design & Development */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                Website Design &amp; Development
              </h3>
              <div className="summary-content">
                <div className="summary-field full-width">
                  <label>Primary website goal</label>
                  <span>Generate leads</span>
                </div>
                <div className="summary-field full-width">
                  <label>Ideal customer description</label>
                  <span>Medicare patients needing wound care and gait deficit disease patients over the age of 25</span>
                </div>
                <div className="summary-field full-width">
                  <label>Required pages/sections</label>
                  <span>Home, Products, Contact, Company Story</span>
                </div>
                <div className="summary-field">
                  <label>Existing content available?</label>
                  <span>Has some content but needs help with the rest</span>
                </div>
                <div className="summary-field full-width">
                  <label>Reference websites</label>
                  <a href="https://woundsmart.com" target="_blank" rel="noopener noreferrer">woundsmart.com</a>
                </div>
              </div>
            </div>

            {/* Hosting & Web Maintenance */}
            <div className="summary-section">
              <h3 className="summary-section-title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
                Hosting &amp; Web Maintenance
              </h3>
              <div className="summary-content">
                <div className="summary-field">
                  <label>Current hosting provider known?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>DNS records access?</label>
                  <span className="empty">Not specified</span>
                </div>
                <div className="summary-field">
                  <label>Domain ownership</label>
                  <span className="empty">Not specified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <div className="edit-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Client</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="clientName">Client Name</label>
                <input
                  type="text"
                  id="clientName"
                  className="form-control"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="clientEmail">Email</label>
                <input
                  type="email"
                  id="clientEmail"
                  className="form-control"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Avatar Color</label>
                <div className="color-picker-grid">
                  {avatarColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`color-picker-option ${editFormData.avatarColor === color.value ? 'selected' : ''}`}
                      style={{ background: color.value }}
                      onClick={() => setEditFormData({ ...editFormData, avatarColor: color.value })}
                      title={color.name}
                    >
                      {editFormData.avatarColor === color.value && (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => setShowEditModal(false)}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
