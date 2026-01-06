'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

export default function GettingStartedPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const client = getClientByViewingAs(viewingAs)

  const [activeSubtab, setActiveSubtab] = useState('checklist')

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Getting Started</h1>
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
                    <span>{client.hasWebsite ? '5 of 6' : '1 of 4'} completed</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: client.hasWebsite ? '83%' : '25%' }}></div>
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
                    <div className="checklist-item-desc">Completed {client.clientSince}</div>
                  </div>
                </div>
                {client.hasWebsite ? (
                  <div className="checklist-item completed">
                    <div className="checklist-checkbox completed">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div className="checklist-item-content">
                      <div className="checklist-item-title">Website launched</div>
                      <div className="checklist-item-desc">{client.websiteData?.domain} is live • {client.websiteData?.launchDate}</div>
                    </div>
                  </div>
                ) : (
                  <div className="checklist-item">
                    <div className="checklist-checkbox"></div>
                    <div className="checklist-item-content">
                      <div className="checklist-item-title">Get a professional website</div>
                      <div className="checklist-item-desc">Establish your online presence with a custom website</div>
                    </div>
                    <div className="checklist-item-action">
                      <Link href={viewingAs ? `/website?viewingAs=${viewingAs}` : '/website'} className="btn btn-secondary">Learn More</Link>
                    </div>
                  </div>
                )}
                <div className={`checklist-item ${client.hasWebsite ? 'completed' : ''}`}>
                  <div className={`checklist-checkbox ${client.hasWebsite ? 'completed' : ''}`}>
                    {client.hasWebsite && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <div className="checklist-item-content">
                    <div className="checklist-item-title">Google Business Profile claimed</div>
                    <div className="checklist-item-desc">{client.hasWebsite ? 'Your business is verified on Google' : 'Verify your business on Google'}</div>
                  </div>
                  {!client.hasWebsite && (
                    <div className="checklist-item-action">
                      <button className="btn btn-secondary">Claim Profile</button>
                    </div>
                  )}
                </div>
                {client.hasWebsite && (
                  <>
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
                  </>
                )}
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
                  <span>{client.primaryContact}</span>
                </div>
                <div className="summary-field">
                  <label>Company</label>
                  <span>{client.name}</span>
                </div>
                <div className="summary-field">
                  <label>Email</label>
                  <span>{client.email}</span>
                </div>
                <div className="summary-field">
                  <label>Phone</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Mobile Phone</label>
                  <span className="empty">Not provided</span>
                </div>
                <div className="summary-field">
                  <label>Website</label>
                  {client.websiteData?.domain ? (
                    <a href={`https://${client.websiteData.domain}`} target="_blank" rel="noopener noreferrer">https://{client.websiteData.domain}</a>
                  ) : (
                    <span className="empty">Not provided</span>
                  )}
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
          </div>
        </div>
      </div>
    </>
  )
}
