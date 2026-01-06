'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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
                      <Link href={`/admin/content/${item.id}`}>{item.title}</Link>
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
                        <Link href={`/admin/content/${item.id}/revise`} className="btn btn-sm btn-secondary">
                          Revise
                        </Link>
                      )}
                      {item.status === 'draft' && (
                        <Link href={`/admin/content/${item.id}/edit`} className="btn btn-sm btn-primary">
                          Continue
                        </Link>
                      )}
                      {(item.status === 'awaiting' || item.status === 'approved') && (
                        <>
                          <button className="btn btn-sm btn-secondary">View</button>
                          {item.status === 'awaiting' && (
                            <button className="btn btn-sm btn-outline">Edit</button>
                          )}
                        </>
                      )}
                      {item.status === 'published' && (
                        <>
                          <button className="btn btn-sm btn-secondary">View</button>
                          <button className="btn btn-sm btn-outline">View Live</button>
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
      </div>
    </>
  )
}
