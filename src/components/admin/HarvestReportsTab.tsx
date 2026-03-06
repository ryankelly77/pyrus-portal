'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

interface Report {
  id: string
  title: string
  periodLabel: string
  periodStart: string
  periodEnd: string
  campaignMonth: number
  status: string
  publishedAt: string | null
  createdAt: string
  serviceTypes: string[]
  managerName: string | null
  client: {
    id: string
    name: string
    avatarUrl: string | null
    avatarColor: string | null
    initials: string
  } | null
}

interface ClientOption {
  id: string
  name: string
}

interface HarvestReportsTabProps {
  clients: ClientOption[]
  initialClientFilter?: string
}

type StatusFilter = 'all' | 'draft' | 'published'
type TimeFrame = 'all' | '30' | '90' | '180' | '365'

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ============================================================================
// COMPONENT
// ============================================================================

export function HarvestReportsTab({ clients, initialClientFilter = 'all' }: HarvestReportsTabProps) {
  const router = useRouter()

  // Data state
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [clientFilter, setClientFilter] = useState(initialClientFilter)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Action state
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // New report modal state
  const [showNewReportModal, setShowNewReportModal] = useState(false)
  const [newReportClientId, setNewReportClientId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newReportForm, setNewReportForm] = useState({
    title: '',
    periodLabel: '',
    periodStart: '',
    periodEnd: '',
    campaignMonth: 1,
    serviceTypes: [] as string[],
    managerName: '',
    managerNote: '',
  })

  const SERVICE_TYPE_OPTIONS = ['SEO', 'PPC', 'Content', 'Local', 'Email', 'Other']

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()

      if (clientFilter !== 'all') {
        params.set('clientId', clientFilter)
      }

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (debouncedSearch) {
        params.set('search', debouncedSearch)
      }

      params.set('sortBy', 'createdAt')
      params.set('sortDir', 'desc')

      const res = await fetch(`/api/admin/reports/all?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch reports')

      let data: Report[] = await res.json()

      // Apply time frame filter client-side
      if (timeFrame !== 'all') {
        const days = parseInt(timeFrame)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        data = data.filter(r => {
          const date = r.publishedAt ? new Date(r.publishedAt) : new Date(r.createdAt)
          return date >= cutoff
        })
      }

      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }, [clientFilter, statusFilter, debouncedSearch, timeFrame])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Handle publish
  const handlePublish = async (reportId: string) => {
    try {
      setPublishingId(reportId)
      const res = await fetch(`/api/admin/reports/${reportId}/publish`, {
        method: 'POST',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish')
      }
      await fetchReports()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to publish report')
    } finally {
      setPublishingId(null)
    }
  }

  // Handle delete
  const handleDelete = async (reportId: string) => {
    try {
      setIsDeleting(true)
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete')
      }
      setDeleteConfirmId(null)
      await fetchReports()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle create new report
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreating || !newReportClientId) return

    try {
      setIsCreating(true)
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newReportClientId,
          title: newReportForm.title,
          periodLabel: newReportForm.periodLabel,
          periodStart: newReportForm.periodStart,
          periodEnd: newReportForm.periodEnd,
          campaignMonth: newReportForm.campaignMonth,
          serviceTypes: newReportForm.serviceTypes,
          managerName: newReportForm.managerName,
          managerNote: newReportForm.managerNote || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create report')
      }

      const newReport = await res.json()
      setShowNewReportModal(false)
      resetNewReportForm()
      // Navigate to the report editor
      router.push(`/admin/reports/${newReport.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create report')
    } finally {
      setIsCreating(false)
    }
  }

  const resetNewReportForm = () => {
    setNewReportClientId('')
    setNewReportForm({
      title: '',
      periodLabel: '',
      periodStart: '',
      periodEnd: '',
      campaignMonth: 1,
      serviceTypes: [],
      managerName: '',
      managerNote: '',
    })
  }

  const toggleServiceType = (type: string) => {
    setNewReportForm(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter(t => t !== type)
        : [...prev.serviceTypes, type],
    }))
  }

  // Clear filters
  const clearFilters = () => {
    setClientFilter('all')
    setStatusFilter('all')
    setTimeFrame('all')
    setSearchQuery('')
    setDebouncedSearch('')
  }

  const hasActiveFilters = clientFilter !== 'all' || statusFilter !== 'all' || timeFrame !== 'all' || debouncedSearch !== ''

  // Report count
  const reportCount = reports.length

  return (
    <div className="harvest-reports-tab">
      {/* Sub-header */}
      <div className="reports-subheader">
        <div className="reports-subheader-left">
          <span className="reports-subtitle">All client campaign reports</span>
          <span className="reports-count">{isLoading ? '...' : `${reportCount} report${reportCount !== 1 ? 's' : ''}`}</span>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewReportModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Report
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-card">
        <div className="filter-row">
          <div className="filter-row-left">
            {/* Client Filter */}
            <div className="filter-group">
              <label className="filter-label">Client</label>
              <select
                className="filter-select"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              >
                <option value="all">All Clients</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="filter-group">
              <label className="filter-label">Status</label>
              <div className="pill-toggle">
                <button
                  className={`pill-btn ${statusFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </button>
                <button
                  className={`pill-btn ${statusFilter === 'draft' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('draft')}
                >
                  Drafts
                </button>
                <button
                  className={`pill-btn ${statusFilter === 'published' ? 'active' : ''}`}
                  onClick={() => setStatusFilter('published')}
                >
                  Published
                </button>
              </div>
            </div>

            {/* Time Frame Filter */}
            <div className="filter-group">
              <label className="filter-label">Time Frame</label>
              <select
                className="filter-select"
                value={timeFrame}
                onChange={(e) => setTimeFrame(e.target.value as TimeFrame)}
              >
                <option value="all">All Time</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="180">Last 6 months</option>
                <option value="365">Last 12 months</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>

          {/* Search - Right side */}
          <div className="filter-row-right">
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="error-card">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchReports}>
            Try Again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      )}

      {/* Reports Table */}
      {!isLoading && !error && (
        <div className="table-card">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Report Title</th>
                <th>Period</th>
                <th>Month</th>
                <th>Status</th>
                <th>Published</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-state-cell">
                    <div className="empty-state">
                      <p className="empty-state-text">No reports found</p>
                      {hasActiveFilters ? (
                        <p className="empty-state-hint">
                          Try adjusting your filters.{' '}
                          <button className="link-btn" onClick={clearFilters}>
                            Clear filters
                          </button>
                        </p>
                      ) : (
                        <p className="empty-state-hint">
                          No reports have been created yet.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                reports.map((report, index) => (
                  <tr key={report.id} className={index === reports.length - 1 ? 'last-row' : ''}>
                    {/* Client */}
                    <td>
                      {report.client ? (
                        <Link href={`/admin/clients/${report.client.id}`} className="client-cell">
                          <div
                            className="client-avatar-sm"
                            style={{ backgroundColor: report.client.avatarColor || getAvatarColor(report.client.name) }}
                          >
                            {report.client.initials}
                          </div>
                          <span className="client-name">{report.client.name}</span>
                        </Link>
                      ) : (
                        <span className="text-muted">Unknown</span>
                      )}
                    </td>

                    {/* Report Title */}
                    <td>
                      <Link href={`/admin/reports/${report.id}`} className="report-title-link">
                        {report.title}
                      </Link>
                    </td>

                    {/* Period */}
                    <td className="text-secondary">{report.periodLabel}</td>

                    {/* Campaign Month */}
                    <td>
                      <span className="campaign-month">Month {report.campaignMonth}</span>
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-badge ${report.status === 'published' ? 'published' : 'draft'}`}>
                        {report.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    {/* Published Date */}
                    <td className="text-secondary">
                      {formatDate(report.publishedAt)}
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="action-buttons">
                        <Link href={`/admin/reports/${report.id}`} className="btn-icon-sm" title="Edit">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </Link>
                        {report.status !== 'published' && (
                          <button
                            className="btn-icon-sm publish"
                            onClick={() => handlePublish(report.id)}
                            disabled={publishingId === report.id}
                            title="Publish"
                          >
                            {publishingId === report.id ? (
                              <span className="btn-spinner"></span>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <path d="M22 2L11 13"></path>
                                <path d="M22 2L15 22L11 13L2 9L22 2Z"></path>
                              </svg>
                            )}
                          </button>
                        )}
                        {deleteConfirmId === report.id ? (
                          <div className="delete-confirm-inline">
                            <button
                              className="action-btn action-btn-danger"
                              onClick={() => handleDelete(report.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? '...' : 'Confirm'}
                            </button>
                            <button
                              className="action-btn"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-icon-sm danger"
                            onClick={() => setDeleteConfirmId(report.id)}
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="modal-overlay active" onClick={() => setShowNewReportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>New Harvest Report</h2>
              <button className="modal-close" onClick={() => setShowNewReportModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateReport}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="clientId">Client *</label>
                  <select
                    id="clientId"
                    className="form-input"
                    value={newReportClientId}
                    onChange={e => setNewReportClientId(e.target.value)}
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="title">Report Title *</label>
                  <input
                    id="title"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Q4 2025 Harvest Report"
                    value={newReportForm.title}
                    onChange={e => setNewReportForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="periodLabel">Period Label *</label>
                  <input
                    id="periodLabel"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Months 7-9 · Nov 2025 - Feb 2026"
                    value={newReportForm.periodLabel}
                    onChange={e => setNewReportForm(prev => ({ ...prev, periodLabel: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="periodStart">Period Start *</label>
                    <input
                      id="periodStart"
                      type="date"
                      className="form-input"
                      value={newReportForm.periodStart}
                      onChange={e => setNewReportForm(prev => ({ ...prev, periodStart: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="periodEnd">Period End *</label>
                    <input
                      id="periodEnd"
                      type="date"
                      className="form-input"
                      value={newReportForm.periodEnd}
                      onChange={e => setNewReportForm(prev => ({ ...prev, periodEnd: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="campaignMonth">Campaign Month *</label>
                  <input
                    id="campaignMonth"
                    type="number"
                    className="form-input"
                    min="1"
                    placeholder="e.g., 9"
                    value={newReportForm.campaignMonth}
                    onChange={e => setNewReportForm(prev => ({ ...prev, campaignMonth: parseInt(e.target.value) || 1 }))}
                    required
                    style={{ maxWidth: '120px' }}
                  />
                  <span className="form-hint">Which month of the campaign this report covers</span>
                </div>

                <div className="form-group">
                  <label>Service Types</label>
                  <div className="checkbox-group">
                    {SERVICE_TYPE_OPTIONS.map(type => (
                      <label key={type} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={newReportForm.serviceTypes.includes(type)}
                          onChange={() => toggleServiceType(type)}
                        />
                        <span>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="managerName">Manager Name</label>
                  <input
                    id="managerName"
                    type="text"
                    className="form-input"
                    placeholder="e.g., John Smith"
                    value={newReportForm.managerName}
                    onChange={e => setNewReportForm(prev => ({ ...prev, managerName: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="managerNote">Manager Note (Optional)</label>
                  <textarea
                    id="managerNote"
                    className="form-input"
                    rows={3}
                    placeholder="A closing note from the campaign manager..."
                    value={newReportForm.managerNote}
                    onChange={e => setNewReportForm(prev => ({ ...prev, managerNote: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewReportModal(false)
                    resetNewReportForm()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating || !newReportClientId || !newReportForm.title || !newReportForm.periodLabel || !newReportForm.periodStart || !newReportForm.periodEnd}
                >
                  {isCreating ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .harvest-reports-tab {
          padding: 0;
        }

        .reports-subheader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .reports-subheader-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .reports-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .reports-count {
          font-size: 13px;
          color: var(--text-muted);
          padding: 4px 10px;
          background: var(--bg-page);
          border-radius: 20px;
        }

        .filter-card {
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }

        .filter-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }

        .filter-row-left {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: flex-end;
        }

        .filter-row-right {
          flex-shrink: 0;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-primary);
          background: var(--bg-white);
          min-width: 130px;
        }

        .pill-toggle {
          display: flex;
          gap: 4px;
          background: var(--bg-page);
          padding: 4px;
          border-radius: 8px;
        }

        .pill-btn {
          padding: 6px 12px;
          border: none;
          background: transparent;
          font-size: 13px;
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .pill-btn:hover {
          color: var(--text-primary);
        }

        .pill-btn.active {
          background: var(--bg-white);
          color: var(--text-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .search-input-wrapper {
          position: relative;
          width: 240px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 9px 12px 9px 36px;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-primary);
          background: var(--bg-white);
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: var(--pyrus-brown, #885430);
          box-shadow: 0 0 0 3px rgba(136, 84, 48, 0.1);
        }

        .search-input::placeholder {
          color: var(--text-muted);
        }

        .clear-filters-btn {
          padding: 8px 12px;
          border: none;
          background: none;
          font-size: 13px;
          color: var(--pyrus-brown, #885430);
          cursor: pointer;
          white-space: nowrap;
        }

        .clear-filters-btn:hover {
          text-decoration: underline;
        }

        .table-card {
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          overflow: hidden;
        }

        .reports-table {
          width: 100%;
          border-collapse: collapse;
        }

        .reports-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          background: var(--bg-page);
          border-bottom: 1px solid var(--border-light);
        }

        .reports-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-light);
          vertical-align: middle;
        }

        .reports-table tr:hover td {
          background: var(--pyrus-green-wash, #FCF7EF);
        }

        .reports-table tr.last-row td {
          border-bottom: none;
        }

        .client-cell {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }

        .client-cell:hover .client-name {
          color: var(--pyrus-brown, #885430);
        }

        .client-avatar-sm {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: white;
          flex-shrink: 0;
        }

        .client-name {
          font-weight: 500;
          color: var(--text-primary);
          transition: color 0.15s ease;
        }

        .report-title-link {
          color: var(--text-primary);
          font-weight: 500;
          text-decoration: none;
        }

        .report-title-link:hover {
          color: var(--pyrus-brown, #885430);
          text-decoration: underline;
        }

        .campaign-month {
          font-size: 12px;
          color: var(--text-muted);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-badge.draft {
          background: #F3F4F6;
          color: #6B7280;
        }

        .status-badge.published {
          background: #D1FAE5;
          color: #059669;
        }

        .text-secondary {
          color: var(--text-secondary);
        }

        .text-muted {
          color: var(--text-muted);
        }

        .action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-icon-sm {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: none;
          border-radius: 6px;
          color: var(--text-muted, #6B7280);
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .btn-icon-sm:hover {
          background: var(--bg-page, #F9FAFB);
          color: var(--text-primary, #111827);
        }

        .btn-icon-sm.publish {
          color: var(--pyrus-brown, #885430);
        }

        .btn-icon-sm.publish:hover {
          background: var(--pyrus-green-wash, #FCF7EF);
          color: var(--pyrus-brown, #885430);
        }

        .btn-icon-sm.danger {
          color: var(--text-muted, #6B7280);
        }

        .btn-icon-sm.danger:hover {
          background: #FEE2E2;
          color: #DC2626;
        }

        .btn-icon-sm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid var(--border-light, #E5E7EB);
          border-top-color: var(--pyrus-brown, #885430);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .action-btn {
          padding: 4px 10px;
          border: none;
          background: none;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          border-radius: 4px;
          text-decoration: none;
        }

        .action-btn:hover {
          background: var(--bg-page);
          color: var(--text-primary);
        }

        .action-btn-danger {
          color: #DC2626;
        }

        .action-btn-danger:hover {
          background: #FEE2E2;
        }

        .delete-confirm-inline {
          display: flex;
          gap: 4px;
        }

        .empty-state-cell {
          padding: 60px 20px !important;
        }

        .empty-state {
          text-align: center;
        }

        .empty-state-text {
          font-size: 15px;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .empty-state-hint {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
        }

        .link-btn {
          padding: 0;
          border: none;
          background: none;
          color: var(--pyrus-brown, #885430);
          cursor: pointer;
          font-size: inherit;
        }

        .link-btn:hover {
          text-decoration: underline;
        }

        .loading-card,
        .error-card {
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 60px 20px;
          text-align: center;
        }

        .loading-card p,
        .error-card p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 16px 0;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-light);
          border-top-color: var(--pyrus-brown, #885430);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-hint {
          display: block;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 4px;
        }

        .checkbox-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--text-primary);
          cursor: pointer;
        }

        .checkbox-label input {
          width: 16px;
          height: 16px;
          accent-color: var(--pyrus-brown, #885430);
        }

        @media (max-width: 1024px) {
          .filter-row {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-row-left {
            width: 100%;
          }

          .filter-row-right {
            width: 100%;
          }

          .search-input-wrapper {
            width: 100%;
          }

          .filter-group {
            width: 100%;
          }

          .filter-select {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .reports-subheader {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .table-card {
            overflow-x: auto;
          }

          .reports-table {
            min-width: 700px;
          }
        }
      `}</style>
    </div>
  )
}
