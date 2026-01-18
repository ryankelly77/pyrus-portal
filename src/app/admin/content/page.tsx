'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type ContentStatus = 'draft' | 'pending_review' | 'revision' | 'approved' | 'published'

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
}

interface ClientOption {
  id: string
  name: string
}

interface Stats {
  drafts: number
  pending_review: number
  revision: number
  approved: number
  published: number
  clients_with_content: number
}

export default function AdminContentPage() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [stats, setStats] = useState<Stats>({
    drafts: 0,
    pending_review: 0,
    revision: 0,
    approved: 0,
    published: 0,
    clients_with_content: 0
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')

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

  const getStatusClass = (status: ContentStatus) => {
    switch (status) {
      case 'draft':
        return 'status-draft'
      case 'pending_review':
        return 'status-awaiting'
      case 'revision':
        return 'status-revision'
      case 'approved':
        return 'status-approved'
      case 'published':
        return 'status-published'
      default:
        return 'status-draft'
    }
  }

  const getStatusLabel = (status: ContentStatus) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'pending_review':
        return 'Awaiting Review'
      case 'revision':
        return 'Needs Revision'
      case 'approved':
        return 'Approved'
      case 'published':
        return 'Published'
      default:
        return status
    }
  }

  const getPlatformClass = (platform: string | null) => {
    if (!platform) {
      return 'default-platform' // Provide a default class for null values
    }
    switch (platform) {
      case 'website':
        return 'website'
      case 'gbp':
        return 'gbp'
      case 'social':
        return 'social'
      case 'ai-creative':
        return 'ai-creative'
      default:
        return 'website'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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
          <Link href="/admin/content/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Content
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="stats-grid stats-grid-5" style={{ marginBottom: '24px' }}>
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
              <span className="stat-value">12</span>
              <span className="stat-label">Clients Managing Content</span>
            </div>
          </div>
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
              <span className="stat-value">{stats.pending_review}</span>
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
              <span className="stat-value">{stats.revision}</span>
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
                <th>Status</th>
                <th>Submitted</th>
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
                    </div>
                  </td>
                  <td>{item.client_name}</td>
                  <td>
                    // TODO: Pre-existing type error - fix in P2
                    <span className={`platform-badge ${getPlatformClass(item.platform)}`}>
                      {item.content_type || item.platform}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                  </td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <div className="action-buttons">
                      {item.status === 'revision' && (
                        <Link href={`/admin/content/${item.id}`} className="btn btn-sm btn-secondary">
                          Revise
                        </Link>
                      )}
                      {item.status === 'draft' && (
                        <Link href={`/admin/content/${item.id}`} className="btn btn-sm btn-primary">
                          Continue
                        </Link>
                      )}
                      {(item.status === 'pending_review' || item.status === 'approved') && (
                        <>
                          <Link href={`/admin/content/${item.id}`} className="btn btn-sm btn-secondary">
                            View
                          </Link>
                          {item.status === 'pending_review' && (
                            <Link href={`/admin/content/${item.id}`} className="btn btn-sm btn-outline">
                              Edit
                            </Link>
                          )}
                        </>
                      )}
                      {item.status === 'published' && (
                        <>
                          <Link href={`/admin/content/${item.id}`} className="btn btn-sm btn-secondary">
                            View
                          </Link>
                          {item.published_url && (
                            <a
                              href={item.published_url}
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
        </div>
      </div>
    </>
  )
}
