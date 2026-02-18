'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUserProfile } from '@/hooks/useUserProfile'

type RequestStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

interface Attachment {
  name: string
  url: string
  type: string
  size: number
}

interface EditRequest {
  id: string
  clientId: string
  clientName: string
  domain: string
  title: string
  description: string | null
  requestType: string
  status: string
  priority: string
  attachments: Attachment[]
  createdAt: string
  completedAt: string | null
}

interface RequestStats {
  total: number
  pending: number
  inProgress: number
  completed: number
}

interface Website {
  clientId: string
  clientName: string
  domain: string
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

export default function RequestsPage() {
  const { profile } = useUserProfile()
  const isSuperAdmin = profile?.role === 'super_admin'

  // Requests state
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [requestStats, setRequestStats] = useState<RequestStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

  // Websites for create modal dropdown
  const [websites, setWebsites] = useState<Website[]>([])

  // Edit modal state (super admin only)
  const [editingRequest, setEditingRequest] = useState<EditRequest | null>(null)
  const [editFormData, setEditFormData] = useState({ title: '', description: '', requestType: '', priority: '' })
  const [editModalLoading, setEditModalLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // View request details modal
  const [viewingRequest, setViewingRequest] = useState<EditRequest | null>(null)

  // Create new request modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({ clientId: '', title: '', description: '', requestType: 'content_update', priority: 'normal' })
  const [createModalLoading, setCreateModalLoading] = useState(false)

  useEffect(() => {
    fetchRequests()
    fetchWebsites()
  }, [])

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true)
      setRequestsError(null)
      const response = await fetch('/api/admin/websites/requests')
      if (!response.ok) throw new Error('Failed to fetch requests')
      const data = await response.json()
      setRequests(data.requests)
      setRequestStats(data.stats)
    } catch (err) {
      setRequestsError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setRequestsLoading(false)
    }
  }

  const fetchWebsites = async () => {
    try {
      const response = await fetch('/api/admin/websites')
      if (response.ok) {
        const data = await response.json()
        setWebsites(data.websites.map((w: { clientId: string; clientName: string; domain: string }) => ({
          clientId: w.clientId,
          clientName: w.clientName,
          domain: w.domain,
        })))
      }
    } catch (err) {
      console.error('Failed to fetch websites:', err)
    }
  }

  const updateRequestStatus = async (requestId: string, status: RequestStatus) => {
    try {
      setUpdatingRequestId(requestId)
      const response = await fetch('/api/admin/websites/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })
      if (!response.ok) throw new Error('Failed to update request')
      await fetchRequests()
    } catch (err) {
      console.error('Failed to update request:', err)
    } finally {
      setUpdatingRequestId(null)
    }
  }

  // Open edit modal (super admin only)
  const openEditModal = (request: EditRequest) => {
    setEditingRequest(request)
    setEditFormData({
      title: request.title,
      description: request.description || '',
      requestType: request.requestType,
      priority: request.priority,
    })
  }

  // Save edited request (super admin only)
  const saveEditedRequest = async () => {
    if (!editingRequest) return

    try {
      setEditModalLoading(true)
      const response = await fetch('/api/admin/websites/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: editingRequest.id,
          title: editFormData.title,
          description: editFormData.description,
          requestType: editFormData.requestType,
          priority: editFormData.priority,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update request')
      }

      await fetchRequests()
      setEditingRequest(null)
    } catch (err) {
      console.error('Failed to edit request:', err)
      alert(err instanceof Error ? err.message : 'Failed to edit request')
    } finally {
      setEditModalLoading(false)
    }
  }

  // Delete request (super admin only)
  const deleteRequest = async (requestId: string) => {
    try {
      setUpdatingRequestId(requestId)
      const response = await fetch(`/api/admin/websites/requests?requestId=${requestId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete request')
      }

      await fetchRequests()
      setDeleteConfirmId(null)
    } catch (err) {
      console.error('Failed to delete request:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete request')
    } finally {
      setUpdatingRequestId(null)
    }
  }

  // Create new request
  const createNewRequest = async () => {
    if (!createFormData.clientId || !createFormData.title || !createFormData.requestType) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setCreateModalLoading(true)
      const response = await fetch('/api/admin/websites/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: createFormData.clientId,
          title: createFormData.title,
          description: createFormData.description,
          requestType: createFormData.requestType,
          priority: createFormData.priority,
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create request')
      }

      await fetchRequests()
      setShowCreateModal(false)
      setCreateFormData({ clientId: '', title: '', description: '', requestType: 'content_update', priority: 'normal' })
    } catch (err) {
      console.error('Failed to create request:', err)
      alert(err instanceof Error ? err.message : 'Failed to create request')
    } finally {
      setCreateModalLoading(false)
    }
  }

  const filteredRequests = requests.filter(request => {
    if (requestStatusFilter !== 'all' && request.status !== requestStatusFilter) return false
    return true
  })

  return (
    <>
      {/* Request Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E0E7FF', color: '#4F46E5' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{requestsLoading ? '...' : requestStats.total}</span>
            <span className="stat-label">Total Requests</span>
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
            <span className="stat-value">{requestsLoading ? '...' : requestStats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#DBEAFE', color: '#1D4ED8' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{requestsLoading ? '...' : requestStats.inProgress}</span>
            <span className="stat-label">In Progress</span>
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
            <span className="stat-value">{requestsLoading ? '...' : requestStats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Filters and New Request Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div className="content-filters" style={{ marginBottom: 0 }}>
          <div className="filter-group">
            <label htmlFor="requestStatusFilter">Status</label>
            <select
              id="requestStatusFilter"
              className="form-control"
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value as typeof requestStatusFilter)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Request
        </button>
      </div>

      {/* Error State */}
      {requestsError && (
        <div style={{ padding: '20px', background: '#FEE2E2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px' }}>
          {requestsError}
          <button onClick={fetchRequests} style={{ marginLeft: '16px', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {requestsLoading ? (
        <div className="data-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: '#6B7280' }}>Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="data-table-card" style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: '#6B7280' }}>
            {requests.length === 0
              ? 'No edit requests found.'
              : 'No requests match the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="data-table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Request</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div>
                      <Link href={`/admin/clients/${request.clientId}`} className="client-link" style={{ fontWeight: 500 }}>
                        {request.clientName}
                      </Link>
                      {request.domain && (
                        <div style={{ fontSize: '12px', color: '#6B7280' }}>{request.domain}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ maxWidth: '300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500, color: '#111827' }}>{request.title}</span>
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
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {getRequestTypeLabel(request.requestType)}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: getPriorityColor(request.priority),
                        }}
                      ></span>
                      <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{request.priority}</span>
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500,
                        ...getStatusStyle(request.status),
                      }}
                    >
                      {getStatusLabel(request.status)}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                      {request.createdAt}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        className="btn btn-sm"
                        style={{ background: 'none', border: '1px solid #E5E7EB', padding: '4px 8px', color: '#374151' }}
                        onClick={() => setViewingRequest(request)}
                        title="View Details"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                      </button>
                      {request.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => updateRequestStatus(request.id, 'in-progress')}
                          disabled={updatingRequestId === request.id}
                        >
                          {updatingRequestId === request.id ? '...' : 'Start'}
                        </button>
                      )}
                      {request.status === 'in-progress' && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => updateRequestStatus(request.id, 'completed')}
                          disabled={updatingRequestId === request.id}
                        >
                          {updatingRequestId === request.id ? '...' : 'Complete'}
                        </button>
                      )}
                      {request.status === 'completed' && (
                        <span style={{ fontSize: '12px', color: '#16A34A' }}>
                          {request.completedAt}
                        </span>
                      )}
                      {/* Super admin edit/delete buttons */}
                      {isSuperAdmin && (
                        <>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'none', border: 'none', padding: '4px', color: '#6B7280' }}
                            onClick={() => openEditModal(request)}
                            title="Edit"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{ background: 'none', border: 'none', padding: '4px', color: '#DC2626' }}
                            onClick={() => setDeleteConfirmId(request.id)}
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
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

      {/* Edit Modal (Super Admin) */}
      {editingRequest && (
        <div className="edit-modal-overlay" onClick={() => setEditingRequest(null)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Edit Request</h2>
              <button className="modal-close" onClick={() => setEditingRequest(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title</label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
                <select
                  value={editFormData.requestType}
                  onChange={(e) => setEditFormData({ ...editFormData, requestType: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                >
                  <option value="content_update">Content Update</option>
                  <option value="bug_fix">Bug Fix</option>
                  <option value="new_feature">New Feature</option>
                  <option value="design_change">Design Change</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Priority</label>
                <select
                  value={editFormData.priority}
                  onChange={(e) => setEditFormData({ ...editFormData, priority: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setEditingRequest(null)} disabled={editModalLoading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={saveEditedRequest} disabled={editModalLoading}>
                {editModalLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Super Admin) */}
      {deleteConfirmId && (
        <div className="edit-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Delete Request</h2>
              <button className="modal-close" onClick={() => setDeleteConfirmId(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" width="32" height="32">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </div>
              <p style={{ color: '#6B7280', margin: 0 }}>
                Are you sure you want to delete this request? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setDeleteConfirmId(null)} disabled={updatingRequestId === deleteConfirmId}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#DC2626', color: 'white' }}
                onClick={() => deleteRequest(deleteConfirmId)}
                disabled={updatingRequestId === deleteConfirmId}
              >
                {updatingRequestId === deleteConfirmId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="edit-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>New Edit Request</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Client <span style={{ color: '#DC2626' }}>*</span></label>
                <select
                  value={createFormData.clientId}
                  onChange={(e) => setCreateFormData({ ...createFormData, clientId: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                >
                  <option value="">Select a client...</option>
                  {websites.map((website) => (
                    <option key={website.clientId} value={website.clientId}>
                      {website.clientName} ({website.domain})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Title <span style={{ color: '#DC2626' }}>*</span></label>
                <input
                  type="text"
                  value={createFormData.title}
                  onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                  placeholder="Brief description of the request"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                  placeholder="Detailed description of what needs to be changed..."
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Type <span style={{ color: '#DC2626' }}>*</span></label>
                  <select
                    value={createFormData.requestType}
                    onChange={(e) => setCreateFormData({ ...createFormData, requestType: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                  >
                    <option value="content_update">Content Update</option>
                    <option value="bug_fix">Bug Fix</option>
                    <option value="new_feature">New Feature</option>
                    <option value="design_change">Design Change</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Priority</label>
                  <select
                    value={createFormData.priority}
                    onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-outline" onClick={() => setShowCreateModal(false)} disabled={createModalLoading}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createNewRequest} disabled={createModalLoading}>
                {createModalLoading ? 'Creating...' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Request Details Modal */}
      {viewingRequest && (
        <div className="edit-modal-overlay" onClick={() => setViewingRequest(null)}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Request Details</h2>
              <button className="modal-close" onClick={() => setViewingRequest(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Client</div>
                <div style={{ fontWeight: 500, color: '#111827' }}>{viewingRequest.clientName}</div>
                {viewingRequest.domain && (
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>{viewingRequest.domain}</div>
                )}
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Title</div>
                <div style={{ fontWeight: 500, color: '#111827' }}>{viewingRequest.title}</div>
              </div>
              {viewingRequest.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Description</div>
                  <div style={{ color: '#374151', whiteSpace: 'pre-wrap' }}>{viewingRequest.description}</div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Type</div>
                  <div style={{ color: '#374151' }}>{getRequestTypeLabel(viewingRequest.requestType)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Priority</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getPriorityColor(viewingRequest.priority) }}></span>
                    <span style={{ textTransform: 'capitalize' }}>{viewingRequest.priority}</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Status</div>
                  <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, ...getStatusStyle(viewingRequest.status) }}>
                    {getStatusLabel(viewingRequest.status)}
                  </span>
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Submitted</div>
                <div style={{ color: '#374151' }}>{viewingRequest.createdAt}</div>
              </div>

              {/* Attachments Section */}
              {viewingRequest.attachments && viewingRequest.attachments.length > 0 && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                    Attachments ({viewingRequest.attachments.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewingRequest.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          background: '#F9FAFB',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        {/* Thumbnail for images */}
                        {attachment.type.startsWith('image/') ? (
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0 }}>
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                                border: '1px solid #E5E7EB',
                              }}
                            />
                          </a>
                        ) : (
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#E0E7FF',
                              borderRadius: '6px',
                              flexShrink: 0,
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" width="24" height="24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {attachment.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>
                            {attachment.type.split('/')[1]?.toUpperCase() || 'File'} &bull; {(attachment.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ flexShrink: 0 }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          Open
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setViewingRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .client-link {
          color: #374151;
          text-decoration: none;
        }
        .client-link:hover {
          color: #4F46E5;
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
      `}</style>
    </>
  )
}
