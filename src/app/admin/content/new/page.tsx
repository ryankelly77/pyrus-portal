'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

const clients = [
  { id: 'dlg', name: 'DLG Medical Services' },
  { id: 'summit', name: 'Summit Dental' },
  { id: 'coastal', name: 'Coastal Realty Group' },
  { id: 'precision', name: 'Precision Auto Care' },
  { id: 'green', name: 'Green Valley Landscaping' },
]

export default function CreateContentPage() {
  const [platform, setPlatform] = useState<'website' | 'gbp'>('website')
  const [timeline, setTimeline] = useState<'standard' | 'urgent'>('standard')
  const [basecampTask, setBasecampTask] = useState(true)
  const [emailNotification, setEmailNotification] = useState(true)

  return (
    <>
      <AdminHeader
        title="Create New Content"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
        breadcrumb={
          <Link href="/admin/content" className="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Content
          </Link>
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
                <div className="platform-options">
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
                    <span>Google Business Profile</span>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Content Type <span className="required">*</span>
                </label>
                <select className="form-select">
                  <option value="">Select type...</option>
                  {platform === 'website' ? (
                    <>
                      <option value="blog">Blog Post</option>
                      <option value="service">Service Page</option>
                      <option value="landing">Landing Page</option>
                    </>
                  ) : (
                    <>
                      <option value="update">Business Update</option>
                      <option value="offer">Offer</option>
                      <option value="event">Event</option>
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
