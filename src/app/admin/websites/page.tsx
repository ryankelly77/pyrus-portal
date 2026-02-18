'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type WebsiteType = 'seed-site' | 'sprout' | 'bloom' | 'harvest' | 'other'
type UptimeStatus = 'up' | 'down' | 'paused' | 'unknown' | null

interface EditRequest {
  id: string
  title: string
  description: string | null
  requestType: string
  status: string
  priority: string
  attachments: { name: string; url: string; type: string; size: number }[]
  createdAt: string
}

interface Website {
  id: string
  clientId: string
  clientName: string
  domain: string
  websiteUrl: string
  websiteType: WebsiteType
  carePlan: string
  hostingType: string | null
  hostingProvider: string
  launchDate: string | null
  uptimeStatus: UptimeStatus
  uptime: string | null
  pendingRequests: number
  editRequests: EditRequest[]
}

interface WebsiteStats {
  total: number
  active: number
  down: number
  pendingRequests: number
}

const getTypeLabel = (type: WebsiteType) => {
  switch (type) {
    case 'seed-site': return 'Seed Site'
    case 'sprout': return 'Sprout'
    case 'bloom': return 'Bloom'
    case 'harvest': return 'Harvest'
    default: return 'Other'
  }
}

const getRequestTypeLabel = (type: string) => {
  switch (type) {
    case 'content_update': return 'Content Update'
    case 'bug_fix': return 'Bug Fix'
    case 'new_feature': return 'New Feature'
    case 'design_change': return 'Design Change'
    default: return type
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return '#DC2626'
    case 'high': return '#F59E0B'
    case 'normal': return '#6B7280'
    case 'low': return '#9CA3AF'
    default: return '#6B7280'
  }
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return { background: '#FEF3C7', color: '#D97706' }
    case 'in-progress':
      return { background: '#DBEAFE', color: '#1D4ED8' }
    case 'completed':
      return { background: '#DCFCE7', color: '#16A34A' }
    case 'cancelled':
      return { background: '#F3F4F6', color: '#6B7280' }
    default:
      return { background: '#F3F4F6', color: '#6B7280' }
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending': return 'Pending'
    case 'in-progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats>({ total: 0, active: 0, down: 0, pendingRequests: 0 })
  const [websitesLoading, setWebsitesLoading] = useState(true)
  const [websitesError, setWebsitesError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down' | 'with-requests'>('all')
  const [typeFilter, setTypeFilter] = useState<WebsiteType | 'all'>('all')
  const [carePlanFilter, setCarePlanFilter] = useState<'all' | 'with-care' | 'no-care'>('all')

  useEffect(() => {
    fetchWebsites()
  }, [])

  const fetchWebsites = async () => {
    try {
      setWebsitesLoading(true)
      setWebsitesError(null)
      const response = await fetch('/api/admin/websites')
      if (!response.ok) throw new Error('Failed to fetch websites')
      const data = await response.json()
      setWebsites(data.websites)
      setWebsiteStats(data.stats)
    } catch (err) {
      setWebsitesError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setWebsitesLoading(false)
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const filteredWebsites = websites.filter(website => {
    if (statusFilter === 'up' && website.uptimeStatus !== 'up') return false
    if (statusFilter === 'down' && website.uptimeStatus !== 'down') return false
    if (statusFilter === 'with-requests' && website.pendingRequests === 0) return false
    if (typeFilter !== 'all' && website.websiteType !== typeFilter) return false
    if (carePlanFilter === 'with-care' && website.carePlan === 'None') return false
    if (carePlanFilter === 'no-care' && website.carePlan !== 'None') return false
    return true
  })

  const getUptimeStatusPill = (status: UptimeStatus, uptime: string | null) => {
    if (!status) {
      return <span className="status-pill" style={{ background: '#F3F4F6', color: '#6B7280' }}>Not Monitored</span>
    }
    switch (status) {
      case 'up':
        return (
          <span className="status-pill active" title={uptime ? `${uptime} uptime (30 days)` : undefined}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16A34A', marginRight: 6 }}></span>
            Up {uptime && <span style={{ opacity: 0.8, marginLeft: 4 }}>({uptime})</span>}
          </span>
        )
      case 'down':
        return (
          <span className="status-pill" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#DC2626', marginRight: 6 }}></span>
            Down
          </span>
        )
      case 'paused':
        return (
          <span className="status-pill" style={{ background: '#FEF3C7', color: '#D97706' }}>
            Paused
          </span>
        )
      default:
        return (
          <span className="status-pill" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            Unknown
          </span>
        )
    }
  }

  return (
    <>
      {/* Stats Overview */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{websitesLoading ? '...' : websiteStats.total}</span>
            <span className="stat-label">Total Websites</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{websitesLoading ? '...' : websiteStats.active}</span>
            <span className="stat-label">Online</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{websitesLoading ? '...' : websiteStats.down}</span>
            <span className="stat-label">Down</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M12 20h9"></path>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{websitesLoading ? '...' : websiteStats.pendingRequests}</span>
            <span className="stat-label">Pending Requests</span>
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
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All Statuses</option>
            <option value="up">Online</option>
            <option value="down">Down</option>
            <option value="with-requests">With Pending Requests</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="typeFilter">Website Type</label>
          <select
            id="typeFilter"
            className="form-control"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as WebsiteType | 'all')}
          >
            <option value="all">All Types</option>
            <option value="seed-site">Seed Site</option>
            <option value="sprout">Sprout</option>
            <option value="bloom">Bloom</option>
            <option value="harvest">Harvest</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="carePlanFilter">Care Plan</label>
          <select
            id="carePlanFilter"
            className="form-control"
            value={carePlanFilter}
            onChange={(e) => setCarePlanFilter(e.target.value as typeof carePlanFilter)}
          >
            <option value="all">All</option>
            <option value="with-care">With Care Plan</option>
            <option value="no-care">No Care Plan</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {websitesError && (
        <div style={{ padding: '20px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px' }}>
          {websitesError}
          <button onClick={fetchWebsites} style={{ marginLeft: '16px', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {websitesLoading ? (
        <div className="data-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: '#6B7280' }}>Loading websites...</p>
        </div>
      ) : filteredWebsites.length === 0 ? (
        <div className="data-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B7280' }}>
            {websites.length === 0
              ? 'No clients with websites found.'
              : 'No websites match the selected filters.'}
          </p>
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '32px' }}></th>
                <th>Website</th>
                <th>Client</th>
                <th>Website Plan</th>
                <th>Care Plan</th>
                <th>Status</th>
                <th>Requests</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredWebsites.map((website) => (
                <>
                  <tr
                    key={website.id}
                    onClick={() => website.pendingRequests > 0 && toggleRow(website.id)}
                    style={{ cursor: website.pendingRequests > 0 ? 'pointer' : 'default' }}
                  >
                    <td style={{ width: '32px', paddingRight: 0 }}>
                      {website.pendingRequests > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRow(website.id) }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: expandedRows.has(website.id) ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="website-domain-cell">
                        <a
                          href={website.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="domain-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {website.domain}
                        </a>
                        <span className="hosting-badge">{website.hostingProvider}</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/admin/clients/${website.clientId}`}
                        className="client-link"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {website.clientName}
                      </Link>
                    </td>
                    <td>
                      <span className={`type-badge ${website.websiteType}`}>
                        {getTypeLabel(website.websiteType)}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: website.carePlan === 'None' ? '#9CA3AF' : '#374151' }}>
                        {website.carePlan}
                      </span>
                    </td>
                    <td>
                      {getUptimeStatusPill(website.uptimeStatus, website.uptime)}
                    </td>
                    <td>
                      {website.pendingRequests > 0 ? (
                        <span className="pending-requests-badge">
                          {website.pendingRequests}
                        </span>
                      ) : (
                        <span className="no-requests">None</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/admin/clients/${website.clientId}?tab=website`} className="btn btn-sm btn-secondary">
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(website.id) && website.editRequests.length > 0 && (
                    <tr key={`${website.id}-requests`} className="expanded-row">
                      <td colSpan={8} style={{ background: '#F9FAFB', padding: 0 }}>
                        <div style={{ padding: '16px 16px 16px 48px' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                            Pending Requests
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {website.editRequests.map((request) => (
                              <div
                                key={request.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  padding: '12px 16px',
                                  background: 'white',
                                  borderRadius: '8px',
                                  border: '1px solid #E5E7EB',
                                }}
                              >
                                <span
                                  style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: getPriorityColor(request.priority),
                                    flexShrink: 0,
                                  }}
                                  title={`Priority: ${request.priority}`}
                                ></span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                                    {request.title}
                                    {request.attachments && request.attachments.length > 0 && (
                                      <span
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '2px 6px',
                                          background: '#E0E7FF',
                                          color: '#4F46E5',
                                          borderRadius: '4px',
                                          fontSize: '11px',
                                          fontWeight: 500,
                                        }}
                                        title={`${request.attachments.length} attachment${request.attachments.length > 1 ? 's' : ''}`}
                                      >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                        </svg>
                                        {request.attachments.length}
                                      </span>
                                    )}
                                  </div>
                                  {request.description && (
                                    <div style={{ fontSize: '13px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {request.description}
                                    </div>
                                  )}
                                </div>
                                <span
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    ...getStatusStyle(request.status),
                                  }}
                                >
                                  {getStatusLabel(request.status)}
                                </span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                  {getRequestTypeLabel(request.requestType)}
                                </span>
                                <span style={{ fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                                  {request.createdAt}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .website-domain-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .domain-link {
          color: #4F46E5;
          text-decoration: none;
          font-weight: 500;
        }
        .domain-link:hover {
          text-decoration: underline;
        }
        .hosting-badge {
          font-size: 11px;
          padding: 2px 6px;
          background: #F3F4F6;
          color: #6B7280;
          border-radius: 4px;
        }
        .client-link {
          color: #374151;
          text-decoration: none;
        }
        .client-link:hover {
          color: #4F46E5;
        }
        .type-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        .type-badge.seed-site {
          background: #DCFCE7;
          color: #16A34A;
        }
        .type-badge.sprout {
          background: #D1FAE5;
          color: #059669;
        }
        .type-badge.bloom {
          background: #DBEAFE;
          color: #2563EB;
        }
        .type-badge.harvest {
          background: #FEF3C7;
          color: #D97706;
        }
        .type-badge.other {
          background: #F3F4F6;
          color: #6B7280;
        }
        .pending-requests-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 24px;
          padding: 0 8px;
          background: #FEF3C7;
          color: #D97706;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
        }
        .no-requests {
          color: #9CA3AF;
          font-size: 13px;
        }
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #E5E7EB;
          border-top-color: #4F46E5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .expanded-row td {
          border-top: none !important;
        }
      `}</style>
    </>
  )
}
