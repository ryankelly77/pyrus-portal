'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { StatusProgressBar } from '@/components/content'

type ContentStatus =
  | 'draft'
  | 'sent_for_review'
  | 'client_reviewing'
  | 'revisions_requested'
  | 'approved'
  | 'internal_review'
  | 'final_optimization'
  | 'image_selection'
  | 'scheduled'
  | 'posted'
  // Legacy statuses for backwards compatibility
  | 'pending_review'
  | 'revision'
  | 'published'

interface ContentItem {
  id: string
  title: string
  client_name: string
  client_id: string
  content_type: string | null
  platform: string | null
  status: ContentStatus
  urgent?: boolean
  excerpt?: string | null
  published_url?: string | null
  created_at: string
  updated_at?: string
  deadline?: string | null
  scheduled_date?: string | null
  published_at?: string | null
  // New workflow fields
  approval_required?: boolean
  review_round?: number
  status_history?: Array<{
    status: string
    changed_at: string
    changed_by_name: string
    note?: string
  }>
  status_changed_at?: string
  assigned_to?: string | null
}

interface ClientOption {
  id: string
  name: string
}

interface Stats {
  // New grouped stats
  active_clients: number
  drafts: number
  in_review: number
  revisions: number
  in_production: number
  posted_this_month: number
  // Legacy stats for backwards compatibility
  pending_review?: number
  revision?: number
  approved?: number
  published?: number
  clients_with_content?: number
}

export default function AdminContentPage() {
  const { user, profile, hasNotifications } = useUserProfile()
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [stats, setStats] = useState<Stats>({
    active_clients: 0,
    drafts: 0,
    in_review: 0,
    revisions: 0,
    in_production: 0,
    posted_this_month: 0
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const isSuperAdmin = profile?.role === 'super_admin'

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return
    const handleClick = () => setOpenDropdown(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openDropdown])

  // Fetch content and clients
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch content
        const params = new URLSearchParams()
        if (statusFilter) params.set('status', statusFilter)
        if (clientFilter) params.set('clientId', clientFilter)
        if (platformFilter) params.set('platform', platformFilter)

        const contentRes = await fetch(`/api/admin/content?${params.toString()}`)
        if (contentRes.ok) {
          const data = await contentRes.json()
          setContentItems(data.content || [])
          setStats(data.stats || stats)
        }

        // Fetch clients for filter dropdown
        const clientsRes = await fetch('/api/admin/clients')
        if (clientsRes.ok) {
          const data = await clientsRes.json()
          setClients(data.clients?.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name
          })) || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [statusFilter, clientFilter, platformFilter])

  const clearFilters = () => {
    setStatusFilter('')
    setClientFilter('')
    setPlatformFilter('')
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/content/${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Remove from local state
        setContentItems((prev) => prev.filter((item) => item.id !== deleteConfirm.id))
        setDeleteConfirm(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete content')
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Failed to delete content')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusClass = (status: ContentStatus) => {
    // Map to CSS classes for status badges
    const classMap: Record<string, string> = {
      draft: 'status-draft',
      sent_for_review: 'status-review',
      client_reviewing: 'status-reviewing',
      revisions_requested: 'status-revision',
      approved: 'status-approved',
      internal_review: 'status-internal',
      final_optimization: 'status-optimization',
      image_selection: 'status-images',
      scheduled: 'status-scheduled',
      posted: 'status-published',
      // Legacy mappings
      pending_review: 'status-awaiting',
      revision: 'status-revision',
      published: 'status-published'
    }
    return classMap[status] || 'status-draft'
  }

  const getStatusLabel = (status: ContentStatus) => {
    // Use workflow engine labels for new statuses
    const labelMap: Record<string, string> = {
      draft: 'Draft',
      sent_for_review: 'Sent for Review',
      client_reviewing: 'Client Reviewing',
      revisions_requested: 'Revisions Requested',
      approved: 'Approved',
      internal_review: 'Internal Review',
      final_optimization: 'Final Optimization',
      image_selection: 'Image Selection',
      scheduled: 'Scheduled',
      posted: 'Posted',
      // Legacy mappings
      pending_review: 'Awaiting Review',
      revision: 'Needs Revision',
      published: 'Published'
    }
    return labelMap[status] || status
  }

  const getContentTypeLabel = (contentType: string | null, platform: string | null) => {
    if (!contentType) {
      // Fallback to platform label if no content type
      const platformLabels: Record<string, string> = {
        website: 'Website',
        gbp: 'Google Business',
        social: 'Social',
        'ai-creative': 'AI Creative',
      }
      return platformLabels[platform || ''] || 'Content'
    }

    const typeLabels: Record<string, string> = {
      // Website content types
      blog: 'Blog Post',
      'blog-post': 'Blog Post',
      'Blog Post': 'Blog Post',
      landing_page: 'Landing Page',
      'landing-page': 'Landing Page',
      'Landing Page': 'Landing Page',
      service_page: 'Service Page',
      'service-page': 'Service Page',
      'Service Page': 'Service Page',
      location_page: 'Location Page',
      'location-page': 'Location Page',
      'Location Page': 'Location Page',
      website: 'Website',
      // GBP content types
      gbp: 'GBP Post',
      gbp_post: 'GBP Post',
      'gbp-post': 'GBP Post',
      'GBP Post': 'GBP Post',
      gbp_update: 'GBP Update',
      'gbp-update': 'GBP Update',
      // Social content types
      social: 'Social Post',
      social_post: 'Social Post',
      'social-post': 'Social Post',
      'Social Post': 'Social Post',
      // AI Creative types
      'ai-creative': 'AI Creative',
      ai_image: 'AI Image',
      'ai-image': 'AI Image',
      ai_video: 'AI Video',
      'ai-video': 'AI Video',
      '4 Graphics Package': '4 Graphics Package',
      // Other/misc
      other: 'Other',
      Other: 'Other',
    }
    return typeLabels[contentType] || contentType
  }

  const getPlatformClass = (platform: string | null, contentType: string | null) => {
    // First check platform
    if (platform) {
      switch (platform) {
        case 'website':
          return 'website'
        case 'gbp':
          return 'gbp'
        case 'social':
          return 'social'
        case 'ai-creative':
          return 'ai-creative'
      }
    }

    // If no platform, infer from content type
    if (contentType) {
      const websiteTypes = ['blog', 'blog-post', 'Blog Post', 'landing_page', 'landing-page', 'Landing Page', 'service_page', 'service-page', 'Service Page', 'location_page', 'location-page', 'Location Page', 'website']
      const gbpTypes = ['gbp', 'gbp_post', 'gbp-post', 'GBP Post', 'gbp_update', 'gbp-update', 'GBP Update']
      const socialTypes = ['social', 'social_post', 'social-post', 'Social Post']
      const aiCreativeTypes = ['ai-creative', 'ai_image', 'ai-image', 'AI Image', 'ai_video', 'ai-video', 'AI Video', '4 Graphics Package']

      if (websiteTypes.includes(contentType)) return 'website'
      if (gbpTypes.includes(contentType)) return 'gbp'
      if (socialTypes.includes(contentType)) return 'social'
      if (aiCreativeTypes.includes(contentType)) return 'ai-creative'
    }

    return 'default-platform'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Determine primary action based on status
  const getPrimaryAction = (item: ContentItem) => {
    switch (item.status) {
      case 'draft':
        return { label: 'Continue', variant: 'primary' as const }
      case 'revisions_requested':
        return { label: 'Revise', variant: 'secondary' as const }
      case 'sent_for_review':
      case 'client_reviewing':
        return { label: 'View', variant: 'secondary' as const }
      case 'approved':
      case 'internal_review':
        return { label: 'Optimize', variant: 'primary' as const }
      case 'final_optimization':
        return { label: 'Select Images', variant: 'primary' as const }
      case 'image_selection':
        return { label: 'Post', variant: 'primary' as const }
      case 'scheduled':
        return { label: 'Mark Posted', variant: 'primary' as const }
      case 'posted':
      case 'published':
        return { label: 'View', variant: 'secondary' as const }
      default:
        return { label: 'View', variant: 'secondary' as const }
    }
  }

  return (
    <>
      <AdminHeader
        title="Content Management"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Review and manage content across all client accounts</p>
          </div>
          <Link href="/admin/content/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Content
          </Link>
        </div>

        {/* Stat Cards - 6 cards in a row */}
        <div className="stats-grid stats-grid-6" style={{ marginBottom: '24px' }}>
          {/* Active Clients */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.active_clients}</span>
              <span className="stat-label">Active Clients</span>
            </div>
          </div>

          {/* Drafts */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#F3F4F6', color: '#6B7280' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.drafts}</span>
              <span className="stat-label">Drafts</span>
            </div>
          </div>

          {/* In Review */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#CCFBF1', color: '#0D9488' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.in_review}</span>
              <span className="stat-label">In Review</span>
            </div>
          </div>

          {/* Revisions */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.revisions}</span>
              <span className="stat-label">Revisions</span>
            </div>
          </div>

          {/* In Production */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#E0E7FF', color: '#6366F1' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.in_production}</span>
              <span className="stat-label">In Production</span>
            </div>
          </div>

          {/* Posted This Month */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.posted_this_month}</span>
              <span className="stat-label">Posted This Month</span>
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
              <optgroup label="Writing">
                <option value="draft">Draft</option>
              </optgroup>
              <optgroup label="Client Review">
                <option value="in_review">All In Review</option>
                <option value="sent_for_review">Sent for Review</option>
                <option value="client_reviewing">Client Reviewing</option>
                <option value="revisions_requested">Revisions Requested</option>
              </optgroup>
              <optgroup label="Production">
                <option value="in_production">All In Production</option>
                <option value="approved">Approved</option>
                <option value="internal_review">Internal Review</option>
                <option value="final_optimization">Final Optimization</option>
                <option value="image_selection">Image Selection</option>
              </optgroup>
              <optgroup label="Complete">
                <option value="scheduled">Scheduled</option>
                <option value="posted">Posted</option>
              </optgroup>
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
            <label htmlFor="platformFilter">Platform</label>
            <select
              id="platformFilter"
              className="form-control"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="">All Platforms</option>
              <option value="website">Website</option>
              <option value="gbp">Google Business</option>
              <option value="social">Social</option>
              <option value="ai-creative">AI Creative</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="loading-state" style={{ textAlign: 'center', padding: '48px' }}>
            <p>Loading content...</p>
          </div>
        )}

        {/* Content Table */}
        {!loading && (
        <div className="content-table-wrapper">
          <table className="content-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Client</th>
                <th>Type</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contentItems.map((item) => (
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
                      <Link
                        href={`/admin/content/${item.id}`}
                        className="content-title-link"
                      >
                        {item.title}
                      </Link>
                      {(item.review_round ?? 0) > 0 && (
                        <span className="revision-badge" title={`Revision round ${item.review_round}`}>
                          R{item.review_round}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{item.client_name}</td>
                  <td>
                    <span className={`platform-badge ${getPlatformClass(item.platform, item.content_type)}`}>
                      {getContentTypeLabel(item.content_type, item.platform)}
                    </span>
                  </td>
                  <td>
                    <StatusProgressBar
                      currentStatus={item.status}
                      approvalRequired={item.approval_required ?? true}
                      reviewRound={item.review_round ?? 0}
                      compact
                    />
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>{formatDate(item.status_changed_at || item.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      {(() => {
                        const action = getPrimaryAction(item)
                        return (
                          <Link
                            href={`/admin/content/${item.id}`}
                            className={`btn btn-sm btn-${action.variant}`}
                          >
                            {action.label}
                          </Link>
                        )
                      })()}
                      {/* More actions dropdown */}
                      {(isSuperAdmin || ((item.status === 'posted' || item.status === 'published') && item.published_url)) && (
                        <div className="dropdown-container">
                          <button
                            className="btn btn-sm btn-outline btn-icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdown(openDropdown === item.id ? null : item.id)
                            }}
                            title="More actions"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <circle cx="12" cy="12" r="1"></circle>
                              <circle cx="12" cy="5" r="1"></circle>
                              <circle cx="12" cy="19" r="1"></circle>
                            </svg>
                          </button>
                          {openDropdown === item.id && (
                            <div className="dropdown-menu" onClick={() => setOpenDropdown(null)}>
                              {(item.status === 'posted' || item.status === 'published') && item.published_url && (
                                <a
                                  href={item.published_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="dropdown-item"
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                  </svg>
                                  View Live
                                </a>
                              )}
                              {isSuperAdmin && (
                                <button
                                  className="dropdown-item dropdown-item-danger"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirm({ id: item.id, title: item.title })
                                    setOpenDropdown(null)
                                  }}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* No Results */}
        {!loading && contentItems.length === 0 && (
          <div className="no-results">
            <p>No content found matching your filters.</p>
          </div>
        )}

        {/* Pagination */}
        {contentItems.length > 0 && (
          <div className="table-pagination">
            <span className="pagination-info">Showing 1-{contentItems.length} items</span>
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
          <div className="legend-item">
            <span className="revision-badge">R1</span>
            <span className="legend-text">Revision round indicator</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => !isDeleting && setDeleteConfirm(null)}>
          <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Content</h3>
              <button
                className="modal-close"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                Are you sure you want to delete this content?
              </p>
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}>
                <strong style={{ color: '#DC2626' }}>{deleteConfirm.title}</strong>
              </div>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                This action cannot be undone. All revisions and comments will also be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .stats-grid-6 {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .stats-grid-6 {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-grid-6 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .revision-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 18px;
          padding: 0 6px;
          font-size: 10px;
          font-weight: 600;
          color: #D97706;
          background: #FEF3C7;
          border-radius: 9px;
          margin-left: 8px;
        }

        .status-badge.status-review {
          background: #CCFBF1;
          color: #0D9488;
        }

        .status-badge.status-reviewing {
          background: #DBEAFE;
          color: #2563EB;
        }

        .status-badge.status-internal {
          background: #CCFBF1;
          color: #0D9488;
        }

        .status-badge.status-optimization {
          background: #F3E8FF;
          color: #9333EA;
        }

        .status-badge.status-images {
          background: #E0E7FF;
          color: #6366F1;
        }

        .status-badge.status-scheduled {
          background: #E0E7FF;
          color: #6366F1;
        }

        /* Platform/Type badges */
        .platform-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .platform-badge.website {
          background: #DBEAFE;
          color: #1D4ED8;
        }

        .platform-badge.gbp {
          background: #FEF3C7;
          color: #B45309;
        }

        .platform-badge.social {
          background: #F3E8FF;
          color: #7C3AED;
        }

        .platform-badge.ai-creative {
          background: #FCE7F3;
          color: #BE185D;
        }

        .platform-badge.default-platform {
          background: #F3F4F6;
          color: #4B5563;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 24px;
        }

        .table-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
          font-size: 13px;
          color: #6B7280;
        }

        .btn-danger-outline {
          background: transparent;
          border: 1px solid #FCA5A5;
          color: #DC2626;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }

        .btn-danger-outline:hover {
          background: #FEF2F2;
          border-color: #DC2626;
        }

        .btn-danger {
          background: #DC2626;
          border: 1px solid #DC2626;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .btn-danger:hover {
          background: #B91C1C;
        }

        .btn-danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          padding: 6px;
          min-width: auto;
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          min-width: 140px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 50;
          overflow: hidden;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .dropdown-item:hover {
          background: #F3F4F6;
        }

        .dropdown-item-danger {
          color: #DC2626;
        }

        .dropdown-item-danger:hover {
          background: #FEF2F2;
        }

        /* Modal styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
        }

        .modal-content.modal-sm {
          width: 400px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #E5E7EB;
        }

        .modal-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          color: #6B7280;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .modal-close:hover {
          background: #F3F4F6;
          color: #111827;
        }

        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #E5E7EB;
        }
      `}</style>
    </>
  )
}
