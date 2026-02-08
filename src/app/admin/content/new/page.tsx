'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const clients = [
  { id: 'dlg', name: 'DLG Medical Services' },
  { id: 'summit', name: 'Summit Dental' },
  { id: 'coastal', name: 'Coastal Realty Group' },
  { id: 'precision', name: 'Precision Auto Care' },
  { id: 'green', name: 'Green Valley Landscaping' },
]

export default function CreateContentPage() {
  const { user } = useUserProfile()
  const [platform, setPlatform] = useState<'website' | 'gbp' | 'social'>('website')
  const [timeline, setTimeline] = useState<'standard' | 'urgent'>('standard')
  const [basecampTask, setBasecampTask] = useState(true)
  const [emailNotification, setEmailNotification] = useState(true)
  const [socialPlatforms, setSocialPlatforms] = useState({
    facebook: true,
    instagram: true,
    linkedin: false,
    x: false,
  })

  return (
    <>
      <AdminHeader
        title=""
        user={user}
        hasNotifications={true}
        breadcrumb={
          <div className="page-header-with-back">
            <Link href="/admin/content" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Content
            </Link>
            <h1 className="page-title-inline">Create New Content</h1>
          </div>
        }
      />

      <div className="admin-content">
        <div className="create-content-layout">
          {/* Main Content Area */}
          <div className="content-editor-section">
            <div className="form-card">
              <h3 className="form-card-title">Content Details</h3>

              <div className="form-group">
                <label className="form-label">
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter content title..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Content <span className="required">*</span>
                </label>
                <div className="editor-toolbar">
                  <button type="button" className="toolbar-btn" title="Bold"><strong>B</strong></button>
                  <button type="button" className="toolbar-btn" title="Italic"><em>I</em></button>
                  <button type="button" className="toolbar-btn" title="Underline"><u>U</u></button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Heading 2">H2</button>
                  <button type="button" className="toolbar-btn" title="Heading 3">H3</button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Bullet List">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </button>
                  <button type="button" className="toolbar-btn" title="Numbered List">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="10" y1="6" x2="21" y2="6"></line>
                      <line x1="10" y1="12" x2="21" y2="12"></line>
                      <line x1="10" y1="18" x2="21" y2="18"></line>
                      <path d="M4 6h1v4"></path>
                      <path d="M4 10h2"></path>
                      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                    </svg>
                  </button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                  <button type="button" className="toolbar-btn" title="Image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </button>
                </div>
                <textarea
                  className="form-textarea content-textarea"
                  rows={16}
                  placeholder="Write your content here..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="content-sidebar-section">
            <div className="form-card">
              <h3 className="form-card-title">Publishing Settings</h3>

              <div className="form-group">
                <label className="form-label">
                  Client <span className="required">*</span>
                </label>
                <select className="form-select">
                  <option value="">Select client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Platform <span className="required">*</span>
                </label>
                <div className="platform-options platform-options-3">
                  <button
                    type="button"
                    className={`platform-option ${platform === 'website' ? 'active' : ''}`}
                    onClick={() => setPlatform('website')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span>Website</span>
                  </button>
                  <button
                    type="button"
                    className={`platform-option ${platform === 'gbp' ? 'active' : ''}`}
                    onClick={() => setPlatform('gbp')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>GBP</span>
                  </button>
                  <button
                    type="button"
                    className={`platform-option ${platform === 'social' ? 'active' : ''}`}
                    onClick={() => setPlatform('social')}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                    <span>Social</span>
                  </button>
                </div>
              </div>

              {/* Social Platform Selection */}
              {platform === 'social' && (
                <div className="form-group">
                  <label className="form-label">
                    Social Platforms <span className="required">*</span>
                  </label>
                  <div className="social-platform-checkboxes">
                    <label className="social-platform-checkbox" title="Facebook">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.facebook}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, facebook: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon facebook">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="Instagram">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.instagram}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, instagram: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon instagram">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="LinkedIn">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.linkedin}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, linkedin: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon linkedin">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="X">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.x}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, x: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon x-twitter">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                      </svg>
                    </label>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Content Type <span className="required">*</span>
                </label>
                <select className="form-select">
                  <option value="">Select type...</option>
                  {platform === 'website' && (
                    <>
                      <option value="blog">Blog Post</option>
                      <option value="service">Service Page</option>
                      <option value="landing">Landing Page</option>
                    </>
                  )}
                  {platform === 'gbp' && (
                    <>
                      <option value="update">Business Update</option>
                      <option value="offer">Offer</option>
                      <option value="event">Event</option>
                    </>
                  )}
                  {platform === 'social' && (
                    <>
                      <option value="post">Social Post</option>
                      <option value="story">Story</option>
                      <option value="reel">Reel / Short Video</option>
                      <option value="carousel">Carousel</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Review Timeline <span className="required">*</span>
                </label>
                <div className="timeline-options">
                  <button
                    type="button"
                    className={`timeline-option ${timeline === 'standard' ? 'active' : ''}`}
                    onClick={() => setTimeline('standard')}
                  >
                    <div className="timeline-option-content">
                      <strong>Standard (5 days)</strong>
                      <span>Normal review timeline</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`timeline-option ${timeline === 'urgent' ? 'active' : ''}`}
                    onClick={() => setTimeline('urgent')}
                  >
                    <div className="timeline-option-content">
                      <div className="timeline-option-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <strong>Urgent (24 hours)</strong>
                      </div>
                      <span>Rush review needed</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="form-card">
              <h3 className="form-card-title">Notifications</h3>

              <div className="notification-options">
                <label className="notification-option">
                  <input
                    type="checkbox"
                    checked={basecampTask}
                    onChange={(e) => setBasecampTask(e.target.checked)}
                  />
                  <div className="notification-option-content">
                    <strong>Create Basecamp Task</strong>
                    <span>Automatically create a task in Basecamp for tracking</span>
                  </div>
                </label>
                <label className="notification-option">
                  <input
                    type="checkbox"
                    checked={emailNotification}
                    onChange={(e) => setEmailNotification(e.target.checked)}
                  />
                  <div className="notification-option-content">
                    <strong>Send Email Notification</strong>
                    <span>Notify client that content is ready for review</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="sidebar-actions">
              <button className="btn btn-outline btn-block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save Draft
              </button>
              <button className="btn btn-primary btn-block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
