'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const clients = [
  { id: 'dlg', name: 'DLG Medical Services', hasAiMonitoring: true },
  { id: 'summit', name: 'Summit Dental', hasAiMonitoring: true },
  { id: 'coastal', name: 'Coastal Realty Group', hasAiMonitoring: false },
  { id: 'precision', name: 'Precision Auto Care', hasAiMonitoring: true },
  { id: 'green', name: 'Green Valley Landscaping', hasAiMonitoring: false },
]

// Mock content data
const contentData: Record<string, {
  id: string
  title: string
  client: string
  clientId: string
  type: 'blog' | 'gbp' | 'service' | 'social'
  typeLabel: string
  status: 'draft' | 'awaiting' | 'revision' | 'approved' | 'published'
  statusLabel: string
  platform: 'website' | 'gbp' | 'social'
  content: string
  targetKeyword?: string
  secondaryKeywords?: string
  wordCount?: number
  seoOptimized?: boolean
  aiOptimized?: boolean
}> = {
  '1': {
    id: '1',
    title: 'Black Friday Sale Announcement',
    client: 'DLG Medical Services',
    clientId: 'dlg',
    type: 'gbp',
    typeLabel: 'GBP Post',
    status: 'revision',
    statusLabel: 'Needs Revision',
    platform: 'gbp',
    content: 'Get ready for our biggest sale of the year! This Black Friday, enjoy exclusive discounts on all our medical services. From routine check-ups to specialized treatments, we\'re offering unprecedented savings to help you prioritize your health without breaking the bank.\n\nOffer valid November 24-27, 2024. Call us today to schedule your appointment!',
  },
  '2': {
    id: '2',
    title: 'Complete Guide to Teeth Whitening',
    client: 'Summit Dental',
    clientId: 'summit',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    platform: 'website',
    content: 'A bright, white smile can boost your confidence and make a great first impression. In this comprehensive guide, we explore the various teeth whitening options available, from professional in-office treatments to at-home solutions.\n\n## Professional Whitening Options\n\nProfessional teeth whitening performed by a dentist offers the fastest and most dramatic results. During an in-office whitening session, your dentist will apply a high-concentration bleaching gel to your teeth...\n\n## At-Home Whitening Kits\n\nFor those who prefer the convenience of whitening at home, there are several effective options available...',
    targetKeyword: 'teeth whitening',
    secondaryKeywords: 'professional teeth whitening, at-home whitening kits, dental whitening',
    wordCount: 1250,
    seoOptimized: true,
    aiOptimized: false,
  },
  '3': {
    id: '3',
    title: 'Holiday Hours Update',
    client: 'DLG Medical Services',
    clientId: 'dlg',
    type: 'gbp',
    typeLabel: 'GBP Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    platform: 'gbp',
    content: 'Please note our updated hours for the holiday season. We will be closed on Thanksgiving Day and Christmas Day. Regular hours will resume on December 26th.',
  },
  '4': {
    id: '4',
    title: '5 Tips for First-Time Home Buyers',
    client: 'Coastal Realty Group',
    clientId: 'coastal',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'draft',
    statusLabel: 'Draft',
    platform: 'website',
    content: 'Buying your first home is an exciting milestone. Here are five essential tips to help you navigate the process and make informed decisions.',
    targetKeyword: 'first-time home buyers',
    secondaryKeywords: 'buying first home, home buying tips, real estate guide',
    wordCount: 850,
    seoOptimized: false,
    aiOptimized: false,
  },
  '5': {
    id: '5',
    title: 'Winter Car Care Checklist',
    client: 'Precision Auto Care',
    clientId: 'precision',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'approved',
    statusLabel: 'Approved',
    platform: 'website',
    content: 'As winter approaches, it\'s important to prepare your vehicle for cold weather conditions. Follow this checklist to ensure your car is ready for whatever winter throws your way.',
    targetKeyword: 'winter car care',
    secondaryKeywords: 'car maintenance winter, cold weather driving, winter tires',
    wordCount: 1100,
    seoOptimized: true,
    aiOptimized: true,
  },
  '6': {
    id: '6',
    title: 'Fall Lawn Care Tips',
    client: 'Green Valley Landscaping',
    clientId: 'green',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'published',
    statusLabel: 'Published',
    platform: 'website',
    content: 'Fall is the perfect time to prepare your lawn for the coming winter. Learn the essential steps to keep your yard healthy and ready to thrive come spring.',
    targetKeyword: 'fall lawn care',
    secondaryKeywords: 'autumn yard maintenance, lawn winterization, fall gardening',
    wordCount: 950,
    seoOptimized: true,
    aiOptimized: false,
  },
  '7': {
    id: '7',
    title: 'Invisalign vs Traditional Braces',
    client: 'Summit Dental',
    clientId: 'summit',
    type: 'service',
    typeLabel: 'Service Page',
    status: 'revision',
    statusLabel: 'Needs Revision',
    platform: 'website',
    content: 'Choosing between Invisalign and traditional braces? Both options can help you achieve a straighter smile, but they differ in several key ways.',
  },
  '8': {
    id: '8',
    title: 'New Listing: Oceanfront Condo',
    client: 'Coastal Realty Group',
    clientId: 'coastal',
    type: 'social',
    typeLabel: 'Social Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    platform: 'social',
    content: 'Just listed! Stunning oceanfront condo with panoramic views. 3 bed, 2 bath, modern finishes throughout.',
  },
}

export default function ContentViewPage() {
  const { user, hasNotifications } = useUserProfile()
  const params = useParams()
  const contentId = params.id as string
  const content = contentData[contentId] || contentData['2'] // Default to item 2 for demo
  const currentClient = clients.find(c => c.id === content.clientId)
  const hasAiMonitoring = currentClient?.hasAiMonitoring ?? false

  const [platform, setPlatform] = useState<'website' | 'gbp' | 'social'>(content.platform)
  const [timeline, setTimeline] = useState<'standard' | 'urgent'>('standard')
  const [basecampTask, setBasecampTask] = useState(true)
  const [emailNotification, setEmailNotification] = useState(true)
  const [seoOptimized, setSeoOptimized] = useState(content.seoOptimized || false)
  const [aiOptimized, setAiOptimized] = useState(content.aiOptimized || false)

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft'
      case 'awaiting': return 'status-awaiting'
      case 'revision': return 'status-revision'
      case 'approved': return 'status-approved'
      case 'published': return 'status-published'
      default: return ''
    }
  }

  return (
    <>
      <AdminHeader
        title=""
        user={user}
        hasNotifications={hasNotifications}
        breadcrumb={
          <div className="page-header-with-back">
            <Link href="/admin/content" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Content
            </Link>
            <div className="page-title-with-status">
              <h1 className="page-title-inline">{content.title}</h1>
              <span className={`status-badge ${getStatusClass(content.status)}`}>
                {content.statusLabel}
              </span>
            </div>
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
                  defaultValue={content.title}
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
                  defaultValue={content.content}
                />
              </div>
            </div>

            {/* SEO Section - Only for Blog Posts */}
            {content.type === 'blog' && (
              <div className="form-card">
                <h3 className="form-card-title">SEO Information</h3>

                <div className="form-group">
                  <label className="form-label">Target Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={content.targetKeyword}
                    placeholder="Enter primary keyword..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Secondary Keywords</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={content.secondaryKeywords}
                    placeholder="Enter secondary keywords, separated by commas..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Content Word Length</label>
                  <input
                    type="number"
                    className="form-input"
                    defaultValue={content.wordCount}
                    placeholder="Target word count..."
                  />
                </div>

                <div className="form-group">
                  <div className="seo-checkboxes-row">
                    <label className="seo-checkbox">
                      <input
                        type="checkbox"
                        checked={seoOptimized}
                        onChange={(e) => setSeoOptimized(e.target.checked)}
                      />
                      <span className="seo-checkbox-content">
                        <strong>Optimized for SEO</strong>
                        <span>Content follows SEO best practices</span>
                      </span>
                    </label>
                    <label className={`seo-checkbox ${!hasAiMonitoring ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={aiOptimized}
                        onChange={(e) => setAiOptimized(e.target.checked)}
                        disabled={!hasAiMonitoring}
                      />
                      <span className="seo-checkbox-content">
                        <strong>Optimized for AI</strong>
                        {hasAiMonitoring ? (
                          <span>Content optimized for AI search results</span>
                        ) : (
                          <span className="disabled-hint">Client not enrolled in AI Monitoring program</span>
                        )}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="content-sidebar-section">
            <div className="form-card">
              <h3 className="form-card-title">Publishing Settings</h3>

              <div className="form-group">
                <label className="form-label">
                  Client <span className="required">*</span>
                </label>
                <select className="form-select" defaultValue={content.clientId}>
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

              <div className="form-group">
                <label className="form-label">
                  Content Type <span className="required">*</span>
                </label>
                <select className="form-select" defaultValue={content.type}>
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
                Save Changes
              </button>
              {content.status === 'awaiting' && (
                <>
                  <button className="btn btn-success btn-block">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Approve
                  </button>
                  <button className="btn btn-warning btn-block">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Request Revision
                  </button>
                </>
              )}
              {content.status === 'approved' && (
                <button className="btn btn-primary btn-block">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Publish
                </button>
              )}
              {(content.status === 'draft' || content.status === 'revision') && (
                <button className="btn btn-primary btn-block">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
