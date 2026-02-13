'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

type Tab = 'websites' | 'requests'
type WebsiteType = 'seed-site' | 'sprout' | 'bloom' | 'harvest' | 'other'
type UptimeStatus = 'up' | 'down' | 'paused' | 'unknown' | null
type RequestStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled'

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
  createdAt: string
  completedAt: string | null
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

interface RequestStats {
  total: number
  pending: number
  inProgress: number
  completed: number
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
  const { user, hasNotifications, profile } = useUserProfile()
  const [activeTab, setActiveTab] = useState<Tab>('websites')
  const isSuperAdmin = profile?.role === 'super_admin'

  // Websites tab state
  const [websites, setWebsites] = useState<Website[]>([])
  const [websiteStats, setWebsiteStats] = useState<WebsiteStats>({ total: 0, active: 0, down: 0, pendingRequests: 0 })
  const [websitesLoading, setWebsitesLoading] = useState(true)
  const [websitesError, setWebsitesError] = useState<string | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState<'all' | 'up' | 'down' | 'with-requests'>('all')
  const [typeFilter, setTypeFilter] = useState<WebsiteType | 'all'>('all')
  const [carePlanFilter, setCarePlanFilter] = useState<'all' | 'with-care' | 'no-care'>('all')

  // Requests tab state
  const [requests, setRequests] = useState<EditRequest[]>([])
  const [requestStats, setRequestStats] = useState<RequestStats>({ total: 0, pending: 0, inProgress: 0, completed: 0 })
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all')
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)

  // Edit modal state (super admin only)
  const [editingRequest, setEditingRequest] = useState<EditRequest | null>(null)
  const [editFormData, setEditFormData] = useState({ title: '', description: '', requestType: '', priority: '' })
  const [editModalLoading, setEditModalLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Create new request modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createFormData, setCreateFormData] = useState({ clientId: '', title: '', description: '', requestType: 'content_update', priority: 'normal' })
  const [createModalLoading, setCreateModalLoading] = useState(false)

  useEffect(() => {
    fetchWebsites()
    fetchRequests() // Fetch on mount so count bubble shows immediately
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

  const updateRequestStatus = async (requestId: string, status: RequestStatus) => {
    try {
      setUpdatingRequestId(requestId)
      const response = await fetch('/api/admin/websites/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status }),
      })
      if (!response.ok) throw new Error('Failed to update request')

      // Refresh both lists
      await Promise.all([fetchRequests(), fetchWebsites()])
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

      // Refresh and close modal
      await Promise.all([fetchRequests(), fetchWebsites()])
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

      // Refresh and close confirmation
      await Promise.all([fetchRequests(), fetchWebsites()])
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

      // Refresh and close modal
      await Promise.all([fetchRequests(), fetchWebsites()])
      setShowCreateModal(false)
      setCreateFormData({ clientId: '', title: '', description: '', requestType: 'content_update', priority: 'normal' })
    } catch (err) {
      console.error('Failed to create request:', err)
      alert(err instanceof Error ? err.message : 'Failed to create request')
    } finally {
      setCreateModalLoading(false)
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

  const filteredRequests = requests.filter(request => {
    if (requestStatusFilter !== 'all' && request.status !== requestStatusFilter) return false
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
      <AdminHeader
        title="Websites"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Monitor client websites, uptime status, and manage edit requests.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              className={`tab ${activeTab === 'websites' ? 'active' : ''}`}
              onClick={() => setActiveTab('websites')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'websites' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: activeTab === 'websites' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Websites
            </button>
            <button
              className={`tab ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'requests' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: activeTab === 'requests' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Edit Requests
              {requestStats.pending > 0 && (
                <span style={{
                  background: 'var(--accent-orange)',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}>{requestStats.pending}</span>
              )}
            </button>
          </div>
        </div>

        {activeTab === 'websites' && (
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
                                        <div style={{ fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                                          {request.title}
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
          </>
        )}

        {activeTab === 'requests' && (
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
                            <div style={{ fontWeight: 500, color: '#111827' }}>{request.title}</div>
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
          </>
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
      </div>

      <style jsx>{`
        .tabs-container {
          display: flex;
          gap: 0;
          border-bottom: 1px solid #E5E7EB;
        }
        .tab-button {
          padding: 12px 20px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #6B7280;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .tab-button:hover {
          color: #374151;
        }
        .tab-button.active {
          color: #4F46E5;
          border-bottom-color: #4F46E5;
        }
        .tab-count {
          background: #E5E7EB;
          color: #6B7280;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
        }
        .tab-count.pending {
          background: #FEF3C7;
          color: #D97706;
        }
        .tab-button.active .tab-count {
          background: #E0E7FF;
          color: #4F46E5;
        }
        .tab-button.active .tab-count.pending {
          background: #FEF3C7;
          color: #D97706;
        }
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
