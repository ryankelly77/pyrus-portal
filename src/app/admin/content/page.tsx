'use client'

import { useState, useMemo } from 'react'
import { AdminHeader } from '@/components/layout'

type ContentStatus = 'draft' | 'awaiting' | 'revision' | 'approved' | 'published'
type ContentType = 'blog' | 'gbp' | 'service' | 'social'

interface ContentItem {
  id: string
  title: string
  client: string
  clientId: string
  type: ContentType
  typeLabel: string
  status: ContentStatus
  statusLabel: string
  submitted: string
  urgent?: boolean
  excerpt?: string
  liveUrl?: string
}

const contentItems: ContentItem[] = [
  {
    id: '1',
    title: 'Black Friday Sale Announcement',
    client: 'DLG Medical Services',
    clientId: 'dlg',
    type: 'gbp',
    typeLabel: 'GBP Post',
    status: 'revision',
    statusLabel: 'Needs Revision',
    submitted: 'Nov 20, 2024',
    urgent: true,
    excerpt: 'Get ready for our biggest sale of the year! This Black Friday, enjoy exclusive discounts on all our medical services...',
  },
  {
    id: '2',
    title: 'Complete Guide to Teeth Whitening',
    client: 'Summit Dental',
    clientId: 'summit',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    submitted: 'Nov 19, 2024',
    excerpt: 'A bright, white smile can boost your confidence and make a great first impression. In this comprehensive guide, we explore the various teeth whitening options available...',
  },
  {
    id: '3',
    title: 'Holiday Hours Update',
    client: 'DLG Medical Services',
    clientId: 'dlg',
    type: 'gbp',
    typeLabel: 'GBP Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    submitted: 'Nov 19, 2024',
    urgent: true,
    excerpt: 'Please note our updated hours for the holiday season. We will be closed on Thanksgiving Day and Christmas Day...',
  },
  {
    id: '4',
    title: '5 Tips for First-Time Home Buyers',
    client: 'Coastal Realty Group',
    clientId: 'coastal',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'draft',
    statusLabel: 'Draft',
    submitted: 'Nov 18, 2024',
    excerpt: 'Buying your first home is an exciting milestone. Here are five essential tips to help you navigate the process...',
  },
  {
    id: '5',
    title: 'Winter Car Care Checklist',
    client: 'Precision Auto Care',
    clientId: 'precision',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'approved',
    statusLabel: 'Approved',
    submitted: 'Nov 17, 2024',
    excerpt: 'As winter approaches, it\'s important to prepare your vehicle for cold weather conditions. Follow this checklist to ensure your car is ready...',
  },
  {
    id: '6',
    title: 'Fall Lawn Care Tips',
    client: 'Green Valley Landscaping',
    clientId: 'green',
    type: 'blog',
    typeLabel: 'Blog Post',
    status: 'published',
    statusLabel: 'Published',
    submitted: 'Nov 15, 2024',
    excerpt: 'Fall is the perfect time to prepare your lawn for the coming winter. Learn the essential steps to keep your yard healthy...',
    liveUrl: 'https://greenvalleylandscaping.com/blog/fall-lawn-care-tips',
  },
  {
    id: '7',
    title: 'Invisalign vs Traditional Braces',
    client: 'Summit Dental',
    clientId: 'summit',
    type: 'service',
    typeLabel: 'Service Page',
    status: 'revision',
    statusLabel: 'Needs Revision',
    submitted: 'Nov 14, 2024',
    excerpt: 'Choosing between Invisalign and traditional braces? Both options can help you achieve a straighter smile, but they differ in several key ways...',
  },
  {
    id: '8',
    title: 'New Listing: Oceanfront Condo',
    client: 'Coastal Realty Group',
    clientId: 'coastal',
    type: 'social',
    typeLabel: 'Social Post',
    status: 'awaiting',
    statusLabel: 'Awaiting Review',
    submitted: 'Nov 14, 2024',
    excerpt: 'Just listed! Stunning oceanfront condo with panoramic views. 3 bed, 2 bath, modern finishes throughout...',
  },
]

const clients = [
  { id: 'dlg', name: 'DLG Medical Services' },
  { id: 'summit', name: 'Summit Dental' },
  { id: 'coastal', name: 'Coastal Realty Group' },
  { id: 'precision', name: 'Precision Auto Care' },
  { id: 'green', name: 'Green Valley Landscaping' },
]

export default function AdminContentPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)
  const [editItem, setEditItem] = useState<ContentItem | null>(null)
  const [reviseItem, setReviseItem] = useState<ContentItem | null>(null)
  const [continueItem, setContinueItem] = useState<ContentItem | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredContent = useMemo(() => {
    return contentItems.filter((item) => {
      if (statusFilter && item.status !== statusFilter) return false
      if (clientFilter && item.clientId !== clientFilter) return false
      if (typeFilter && item.type !== typeFilter) return false
      return true
    })
  }, [statusFilter, clientFilter, typeFilter])

  const clearFilters = () => {
    setStatusFilter('')
    setClientFilter('')
    setTypeFilter('')
  }

  // Stats
  const stats = {
    drafts: contentItems.filter((i) => i.status === 'draft').length,
    awaiting: contentItems.filter((i) => i.status === 'awaiting').length,
    revisions: contentItems.filter((i) => i.status === 'revision').length,
    published: contentItems.filter((i) => i.status === 'published').length,
  }

  const getStatusClass = (status: ContentStatus) => {
    switch (status) {
      case 'draft':
        return 'status-draft'
      case 'awaiting':
        return 'status-awaiting'
      case 'revision':
        return 'status-revision'
      case 'approved':
        return 'status-approved'
      case 'published':
        return 'status-published'
    }
  }

  const getPlatformClass = (type: ContentType) => {
    switch (type) {
      case 'blog':
        return 'website'
      case 'gbp':
        return 'gbp'
      case 'service':
        return 'website'
      case 'social':
        return 'social'
    }
  }

  const handleView = (item: ContentItem) => {
    setPreviewItem(item)
  }

  const closePreview = () => {
    setPreviewItem(null)
  }

  return (
    <>
      <AdminHeader
        title="Content Management"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Review and manage content across all client accounts</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Content
          </button>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid stats-grid-4" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#DBEAFE', color: '#2563EB' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.drafts}</span>
              <span className="stat-label">Drafts in Progress</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.awaiting}</span>
              <span className="stat-label">Awaiting Review</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.revisions}</span>
              <span className="stat-label">Need Revisions</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">47</span>
              <span className="stat-label">Published This Month</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="content-filters">
          <div className="filter-group">
            <label htmlFor="statusFilter">Status</label>
            <select
              id="statusFilter"
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="awaiting">Awaiting Review</option>
              <option value="revision">Needs Revision</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="clientFilter">Client</label>
            <select
              id="clientFilter"
              className="form-control"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="typeFilter">Type</label>
            <select
              id="typeFilter"
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="blog">Blog Post</option>
              <option value="gbp">GBP Post</option>
              <option value="service">Service Page</option>
              <option value="social">Social Post</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="content-table-wrapper">
          <table className="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContent.map((item) => (
                <tr key={item.id} className="content-row" data-status={item.status}>
                  <td>
                    <div className="content-title-cell">
                      {item.urgent && (
                        <span className="urgent-indicator" title="Urgent - 24hr deadline">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                        </span>
                      )}
                      <button
                        className="content-title-link"
                        onClick={() => handleView(item)}
                      >
                        {item.title}
                      </button>
                    </div>
                  </td>
                  <td>{item.client}</td>
                  <td>
                    <span className={`platform-badge ${getPlatformClass(item.type)}`}>
                      {item.typeLabel}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {item.statusLabel}
                    </span>
                  </td>
                  <td>{item.submitted}</td>
                  <td>
                    <div className="action-buttons">
                      {item.status === 'revision' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setReviseItem(item)}
                        >
                          Revise
                        </button>
                      )}
                      {item.status === 'draft' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => setContinueItem(item)}
                        >
                          Continue
                        </button>
                      )}
                      {(item.status === 'awaiting' || item.status === 'approved') && (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleView(item)}>
                            View
                          </button>
                          {item.status === 'awaiting' && (
                            <button
                              className="btn btn-sm btn-outline"
                              onClick={() => setEditItem(item)}
                            >
                              Edit
                            </button>
                          )}
                        </>
                      )}
                      {item.status === 'published' && (
                        <>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleView(item)}>
                            View
                          </button>
                          {item.liveUrl && (
                            <a
                              href={item.liveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline"
                            >
                              View Live
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* No Results */}
        {filteredContent.length === 0 && (
          <div className="no-results">
            <p>No content found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        {filteredContent.length > 0 && (
          <div className="table-pagination">
            <span className="pagination-info">Showing 1-{filteredContent.length} of 23 items</span>
            <div className="pagination-buttons">
              <button className="btn btn-sm btn-secondary" disabled>
                Previous
              </button>
              <button className="btn btn-sm btn-secondary">Next</button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="table-legend">
          <div className="legend-item">
            <span className="urgent-indicator">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </span>
            <span className="legend-text">Urgent - 24 hour deadline</span>
          </div>
        </div>
      </div>

      {/* Content Preview Modal */}
      {previewItem && (
        <div className="modal-overlay active" onClick={closePreview}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Content Preview</h2>
              <button className="modal-close" onClick={closePreview}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="preview-meta">
                <span className={`platform-badge ${getPlatformClass(previewItem.type)}`}>
                  {previewItem.typeLabel}
                </span>
                <span className={`status-badge ${getStatusClass(previewItem.status)}`}>
                  {previewItem.statusLabel}
                </span>
              </div>
              <h3 className="preview-title">{previewItem.title}</h3>
              <p className="preview-client">
                <strong>Client:</strong> {previewItem.client}
              </p>
              <p className="preview-date">
                <strong>Submitted:</strong> {previewItem.submitted}
              </p>
              <div className="preview-content">
                <strong>Content Preview:</strong>
                <p>{previewItem.excerpt}</p>
              </div>
            </div>
            <div className="modal-footer">
              {previewItem.status === 'awaiting' && (
                <>
                  <button className="btn btn-secondary" onClick={closePreview}>
                    Close
                  </button>
                  <button className="btn btn-success">Approve</button>
                  <button className="btn btn-warning">Request Revision</button>
                </>
              )}
              {previewItem.status === 'approved' && (
                <>
                  <button className="btn btn-secondary" onClick={closePreview}>
                    Close
                  </button>
                  <button className="btn btn-primary">Publish</button>
                </>
              )}
              {previewItem.status === 'published' && (
                <>
                  <button className="btn btn-secondary" onClick={closePreview}>
                    Close
                  </button>
                  {previewItem.liveUrl && (
                    <a
                      href={previewItem.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                    >
                      View Live
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Content Modal */}
      {editItem && (
        <div className="modal-overlay active" onClick={() => setEditItem(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Content</h2>
              <button className="modal-close" onClick={() => setEditItem(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form className="modal-form">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={editItem.title}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" defaultValue={editItem.clientId}>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content Type</label>
                  <select className="form-select" defaultValue={editItem.type}>
                    <option value="blog">Blog Post</option>
                    <option value="gbp">GBP Post</option>
                    <option value="service">Service Page</option>
                    <option value="social">Social Post</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    rows={6}
                    defaultValue={editItem.excerpt}
                    placeholder="Enter content..."
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditItem(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => setEditItem(null)}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Content Modal */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={() => setShowCreateModal(false)}>
          <div className="modal modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Content</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <form className="modal-form">
                {/* Content Details Section */}
                <div className="form-section">
                  <h3 className="form-section-title">Content Details</h3>
                  <div className="form-group">
                    <label className="form-label">
                      Title <span className="required">*</span>
                    </label>
                    <input type="text" className="form-input" placeholder="Enter content title..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Content <span className="required">*</span>
                    </label>
                    <div className="editor-toolbar">
                      <button type="button" className="toolbar-btn" title="Bold"><strong>B</strong></button>
                      <button type="button" className="toolbar-btn" title="Italic"><em>I</em></button>
                      <button type="button" className="toolbar-btn" title="Heading 2">H2</button>
                      <button type="button" className="toolbar-btn" title="Heading 3">H3</button>
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
                      className="form-textarea"
                      rows={10}
                      placeholder="Write your content here..."
                    />
                  </div>
                </div>

                {/* Publishing Settings Section */}
                <div className="form-section">
                  <h3 className="form-section-title">Publishing Settings</h3>
                  <div className="form-row">
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
                      <select className="form-select">
                        <option value="">Select platform...</option>
                        <option value="website">Website</option>
                        <option value="gbp">Google Business Profile</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        Content Type <span className="required">*</span>
                      </label>
                      <select className="form-select">
                        <option value="">Select type...</option>
                        <option value="blog">Blog Post</option>
                        <option value="service">Service Page</option>
                        <option value="landing">Landing Page</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        Review Timeline <span className="required">*</span>
                      </label>
                      <select className="form-select">
                        <option value="standard">Standard (5 business days)</option>
                        <option value="urgent">Urgent (24 hours)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="form-section">
                  <h3 className="form-section-title">Notifications</h3>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span className="checkbox-text">Create Basecamp Task</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" defaultChecked />
                      <span className="checkbox-text">Send Email Notification</span>
                    </label>
                  </div>
                </div>

                {/* Pre-flight Checklist */}
                <div className="form-section">
                  <h3 className="form-section-title">Pre-flight Checklist</h3>
                  <div className="checklist-group">
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span className="checkbox-text">Content is complete and ready for review</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span className="checkbox-text">All information is accurate and up-to-date</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span className="checkbox-text">Links and CTAs have been verified</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span className="checkbox-text">Content aligns with brand voice guidelines</span>
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" />
                      <span className="checkbox-text">SEO best practices have been applied</span>
                    </label>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
                Save Draft
              </button>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(false)}>
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revise Content Modal */}
      {reviseItem && (
        <div className="modal-overlay active" onClick={() => setReviseItem(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Revise Content</h2>
              <button className="modal-close" onClick={() => setReviseItem(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="revision-feedback">
                <div className="feedback-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <strong>Client Feedback</strong>
                </div>
                <p className="feedback-text">Please adjust the tone to be more professional and add more details about pricing options.</p>
              </div>
              <form className="modal-form">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={reviseItem.title}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" defaultValue={reviseItem.clientId}>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content Type</label>
                  <select className="form-select" defaultValue={reviseItem.type}>
                    <option value="blog">Blog Post</option>
                    <option value="gbp">GBP Post</option>
                    <option value="service">Service Page</option>
                    <option value="social">Social Post</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    defaultValue={reviseItem.excerpt}
                    placeholder="Enter content..."
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReviseItem(null)}>
                Cancel
              </button>
              <button className="btn btn-outline" onClick={() => setReviseItem(null)}>
                Save Draft
              </button>
              <button className="btn btn-primary" onClick={() => setReviseItem(null)}>
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continue Editing Modal */}
      {continueItem && (
        <div className="modal-overlay active" onClick={() => setContinueItem(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Continue Editing</h2>
              <button className="modal-close" onClick={() => setContinueItem(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="draft-info">
                <span className="status-badge status-draft">Draft</span>
                <span className="draft-date">Last saved: {continueItem.submitted}</span>
              </div>
              <form className="modal-form">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="form-input"
                    defaultValue={continueItem.title}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" defaultValue={continueItem.clientId}>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content Type</label>
                  <select className="form-select" defaultValue={continueItem.type}>
                    <option value="blog">Blog Post</option>
                    <option value="gbp">GBP Post</option>
                    <option value="service">Service Page</option>
                    <option value="social">Social Post</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea
                    className="form-textarea"
                    rows={8}
                    defaultValue={continueItem.excerpt}
                    placeholder="Enter content..."
                  />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setContinueItem(null)}>
                Cancel
              </button>
              <button className="btn btn-outline" onClick={() => setContinueItem(null)}>
                Save Draft
              </button>
              <button className="btn btn-primary" onClick={() => setContinueItem(null)}>
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
