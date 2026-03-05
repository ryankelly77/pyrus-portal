'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// TYPES
// ============================================================================

interface Report {
  id: string
  title: string
  period_label: string
  period_start: string
  period_end: string
  status: string
  published_at: string | null
  campaign_month: number
  created_at: string
}

interface ReportsTabProps {
  clientId: string
  clientName: string
}

const SERVICE_TYPE_OPTIONS = ['SEO', 'PPC', 'Content', 'Local', 'Email', 'Other']

// ============================================================================
// COMPONENT
// ============================================================================

export function ReportsTab({ clientId, clientName }: ReportsTabProps) {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Publishing state
  const [publishingId, setPublishingId] = useState<string | null>(null)

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    periodLabel: '',
    periodStart: '',
    periodEnd: '',
    campaignMonth: 1,
    serviceTypes: [] as string[],
    managerName: '',
    managerNote: '',
  })

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/admin/reports?clientId=${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch reports')
      const data = await res.json()
      setReports(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reports')
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null)
    if (openMenuId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [openMenuId])

  // Handle create report
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCreating) return

    try {
      setIsCreating(true)
      const res = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          title: formData.title,
          periodLabel: formData.periodLabel,
          periodStart: formData.periodStart,
          periodEnd: formData.periodEnd,
          campaignMonth: formData.campaignMonth,
          serviceTypes: formData.serviceTypes,
          managerName: formData.managerName,
          managerNote: formData.managerNote || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create report')
      }

      const newReport = await res.json()
      setShowCreateModal(false)
      resetForm()
      await fetchReports()
      // Navigate to report editor
      router.push(`/admin/reports/${newReport.id}`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create report')
    } finally {
      setIsCreating(false)
    }
  }

  // Handle publish
  const handlePublish = async (reportId: string) => {
    try {
      setPublishingId(reportId)
      setOpenMenuId(null)
      const res = await fetch(`/api/admin/reports/${reportId}/publish`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to publish report')
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
        throw new Error(data.error || 'Failed to delete report')
      }

      setDeleteConfirmId(null)
      await fetchReports()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete report')
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
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
    setFormData(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(type)
        ? prev.serviceTypes.filter(t => t !== type)
        : [...prev.serviceTypes, type],
    }))
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="reports-tab">
      {/* Header */}
      <div className="reports-header">
        <div className="reports-header-text">
          <h2>Harvest Reports</h2>
          <p>Publish periodic campaign reports for {clientName}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Report
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="reports-loading">
          <div className="spinner"></div>
          <p>Loading reports...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="reports-error">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchReports}>
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && reports.length === 0 && (
        <div className="reports-empty">
          <div className="reports-empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <path d="M9 17H7A5 5 0 0 1 7 7h2"></path>
              <path d="M15 7h2a5 5 0 1 1 0 10h-2"></path>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <h3>No reports yet</h3>
          <p>Create your first Harvest Report to share campaign progress with this client.</p>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create First Report
          </button>
        </div>
      )}

      {/* Reports List */}
      {!isLoading && !error && reports.length > 0 && (
        <div className="reports-list">
          {reports.map(report => (
            <div key={report.id} className="report-card">
              <div className="report-card-main">
                <div className="report-card-info">
                  <h3 className="report-title">{report.title}</h3>
                  <p className="report-period">{report.period_label}</p>
                </div>
                <div className="report-card-meta">
                  <span className={`status-badge ${report.status === 'published' ? 'published' : 'draft'}`}>
                    {report.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span className="report-date">
                    {report.status === 'published' && report.published_at
                      ? formatDate(report.published_at)
                      : 'Draft'}
                  </span>
                </div>
              </div>
              <div className="report-card-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => router.push(`/admin/reports/${report.id}`)}
                >
                  Edit
                </button>
                <div className="dropdown-container">
                  <button
                    className="btn btn-icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpenMenuId(openMenuId === report.id ? null : report.id)
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <circle cx="12" cy="5" r="1.5"></circle>
                      <circle cx="12" cy="12" r="1.5"></circle>
                      <circle cx="12" cy="19" r="1.5"></circle>
                    </svg>
                  </button>
                  {openMenuId === report.id && (
                    <div className="dropdown-menu" onClick={e => e.stopPropagation()}>
                      {report.status !== 'published' && (
                        <button
                          className="dropdown-item"
                          onClick={() => handlePublish(report.id)}
                          disabled={publishingId === report.id}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                          </svg>
                          {publishingId === report.id ? 'Publishing...' : 'Publish'}
                        </button>
                      )}
                      <button
                        className="dropdown-item danger"
                        onClick={() => {
                          setOpenMenuId(null)
                          setDeleteConfirmId(report.id)
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirmId === report.id && (
                <div className="delete-confirm">
                  <p>Are you sure? This cannot be undone.</p>
                  <div className="delete-confirm-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(report.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="modal-overlay active" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>New Harvest Report</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="title">Report Title</label>
                  <input
                    id="title"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Q4 2025 Harvest Report"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="periodLabel">Period Label</label>
                  <input
                    id="periodLabel"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Months 7–9 · Nov 2025 – Feb 2026"
                    value={formData.periodLabel}
                    onChange={e => setFormData(prev => ({ ...prev, periodLabel: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="periodStart">Period Start</label>
                    <input
                      id="periodStart"
                      type="date"
                      className="form-input"
                      value={formData.periodStart}
                      onChange={e => setFormData(prev => ({ ...prev, periodStart: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="periodEnd">Period End</label>
                    <input
                      id="periodEnd"
                      type="date"
                      className="form-input"
                      value={formData.periodEnd}
                      onChange={e => setFormData(prev => ({ ...prev, periodEnd: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="campaignMonth">Campaign Month</label>
                  <input
                    id="campaignMonth"
                    type="number"
                    className="form-input"
                    min="1"
                    placeholder="e.g., 9"
                    value={formData.campaignMonth}
                    onChange={e => setFormData(prev => ({ ...prev, campaignMonth: parseInt(e.target.value) || 1 }))}
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
                          checked={formData.serviceTypes.includes(type)}
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
                    value={formData.managerName}
                    onChange={e => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="managerNote">Manager Note (Optional)</label>
                  <textarea
                    id="managerNote"
                    className="form-input"
                    rows={3}
                    placeholder="A closing note from the campaign manager..."
                    value={formData.managerNote}
                    onChange={e => setFormData(prev => ({ ...prev, managerNote: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating || !formData.title || !formData.periodLabel || !formData.periodStart || !formData.periodEnd}
                >
                  {isCreating ? 'Creating...' : 'Create Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .reports-tab {
          padding: 0;
        }

        .reports-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }

        .reports-header-text h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .reports-header-text p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0;
        }

        .reports-loading,
        .reports-error,
        .reports-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
        }

        .reports-empty-icon {
          width: 80px;
          height: 80px;
          background: var(--bg-page);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--text-muted);
        }

        .reports-empty h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }

        .reports-empty p {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 20px 0;
          max-width: 320px;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .report-card {
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 14px;
          padding: 16px 20px;
          position: relative;
        }

        .report-card-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .report-card-info {
          flex: 1;
          min-width: 0;
        }

        .report-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }

        .report-period {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
        }

        .report-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge {
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

        .report-date {
          font-size: 13px;
          color: var(--text-secondary);
          min-width: 90px;
          text-align: right;
        }

        .report-card-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: 16px;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }

        .btn-icon:hover {
          background: var(--bg-page);
          color: var(--text-primary);
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          min-width: 140px;
          z-index: 100;
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
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
          text-align: left;
          transition: background 0.15s ease;
        }

        .dropdown-item:hover {
          background: var(--bg-page);
        }

        .dropdown-item.danger {
          color: #DC2626;
        }

        .dropdown-item.danger:hover {
          background: #FEE2E2;
        }

        .delete-confirm {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-light);
        }

        .delete-confirm p {
          font-size: 13px;
          color: #DC2626;
          margin: 0 0 12px 0;
        }

        .delete-confirm-actions {
          display: flex;
          gap: 8px;
        }

        .btn-danger {
          background: #DC2626;
          color: white;
          border: none;
        }

        .btn-danger:hover {
          background: #B91C1C;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 13px;
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

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-light);
          border-top-color: var(--pyrus-brown, #885430);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
