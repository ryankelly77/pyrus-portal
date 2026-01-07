'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

type RecommendationStatus = 'draft' | 'sent' | 'approved'
type SortOption = 'date-desc' | 'date-asc' | 'client'
type FilterOption = 'all' | RecommendationStatus

interface InvitedUser {
  id: string
  email: string
  name: string | null
  status: 'pending' | 'viewed' | 'approved' | 'rejected'
  invitedAt: string
  respondedAt: string | null
}

interface DBRecommendationInvite {
  id: string
  recommendation_id: string
  first_name: string
  last_name: string
  email: string
  status: string | null
  sent_at: string | null
  viewed_at: string | null
  responded_at: string | null
  created_at: string | null
}

interface DBRecommendation {
  id: string
  client_id: string
  status: string | null
  pricing_type: string | null
  total_monthly: string | null
  total_onetime: string | null
  notes: string | null
  created_at: string
  sent_at: string | null
  client: {
    id: string
    name: string
    contact_email: string | null
  }
  recommendation_items: {
    id: string
    quantity: number | null
    monthly_price: string | null
    onetime_price: string | null
    notes: string | null
    product: { id: string; name: string; category: string } | null
    bundle: { id: string; name: string } | null
    addon: { id: string; name: string } | null
  }[]
  recommendation_invites: DBRecommendationInvite[]
}

interface Recommendation {
  id: string
  client: string
  clientId: string
  clientEmail: string | null
  initials: string
  avatarColor: string
  status: RecommendationStatus
  totalMonthly: number
  totalOnetime: number
  itemCount: number
  items: { name: string; tier: string }[]
  createdAt: string
  sentAt: string | null
  invitedUsers: InvitedUser[]
}

// Helper to generate initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Helper to generate a consistent color from a string
function getAvatarColor(str: string): string {
  const colors = ['#885430', '#2563EB', '#7C3AED', '#0B7277', '#DC2626', '#6B7280', '#059669', '#D97706']
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Helper to format date
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Helper to format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return formatDate(dateStr)
}

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') as FilterOption | null

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<FilterOption>(initialStatus || 'all')
  const [sortBy, setSortBy] = useState<SortOption>('date-desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareRecommendationId, setShareRecommendationId] = useState<string | null>(null)
  const [shareForm, setShareForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  })
  const [isSendingInvite, setIsSendingInvite] = useState(false)

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this recommendation?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/recommendations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setRecommendations(prev => prev.filter(rec => rec.id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (error) {
      console.error('Failed to delete recommendation:', error)
      alert('Failed to delete recommendation')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  // Open share modal for a specific recommendation
  const openShareModal = (recId: string, clientEmail: string | null) => {
    setShareRecommendationId(recId)
    setShareForm({
      firstName: '',
      lastName: '',
      email: clientEmail || '',
    })
    setShowShareModal(true)
  }

  // Handle sharing the recommendation
  const handleShare = async () => {
    if (!shareRecommendationId) return

    if (!shareForm.firstName || !shareForm.lastName || !shareForm.email) {
      alert('Please fill in all fields')
      return
    }

    setIsSendingInvite(true)
    try {
      const res = await fetch(`/api/admin/recommendations/${shareRecommendationId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareForm),
      })

      if (!res.ok) throw new Error('Failed to send invite')

      const newInvite = await res.json()

      // Update the recommendations list with the new invite
      setRecommendations(prev => prev.map(rec => {
        if (rec.id === shareRecommendationId) {
          return {
            ...rec,
            status: 'sent' as RecommendationStatus,
            invitedUsers: [
              {
                id: newInvite.id,
                email: newInvite.email,
                name: `${newInvite.first_name} ${newInvite.last_name}`,
                status: 'pending' as const,
                invitedAt: newInvite.sent_at || newInvite.created_at,
                respondedAt: null,
              },
              ...rec.invitedUsers,
            ],
          }
        }
        return rec
      }))

      setShowShareModal(false)
      setShareForm({ firstName: '', lastName: '', email: '' })
      setShareRecommendationId(null)
    } catch (error) {
      console.error('Failed to send invite:', error)
      alert('Failed to send invite')
    } finally {
      setIsSendingInvite(false)
    }
  }

  // Fetch recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/admin/recommendations')
        if (!res.ok) throw new Error('Failed to fetch recommendations')
        const dbRecs: DBRecommendation[] = await res.json()

        const transformed: Recommendation[] = dbRecs.map(rec => {
          // Extract item names with their tiers
          const items = rec.recommendation_items.map(item => ({
            name: item.product?.name || item.bundle?.name || item.addon?.name || 'Unknown',
            tier: item.notes || 'good',
          }))

          // Transform invites from database
          const invitedUsers: InvitedUser[] = (rec.recommendation_invites || []).map(invite => ({
            id: invite.id,
            email: invite.email,
            name: `${invite.first_name} ${invite.last_name}`,
            status: (invite.status as InvitedUser['status']) || 'pending',
            invitedAt: invite.sent_at || invite.created_at || rec.created_at,
            respondedAt: invite.responded_at,
          }))

          return {
            id: rec.id,
            client: rec.client.name,
            clientId: rec.client.id,
            clientEmail: rec.client.contact_email,
            initials: getInitials(rec.client.name),
            avatarColor: getAvatarColor(rec.client.name),
            status: (rec.status as RecommendationStatus) || 'draft',
            totalMonthly: rec.total_monthly ? parseFloat(rec.total_monthly) : 0,
            totalOnetime: rec.total_onetime ? parseFloat(rec.total_onetime) : 0,
            itemCount: rec.recommendation_items.length,
            items,
            createdAt: rec.created_at,
            sentAt: rec.sent_at,
            invitedUsers,
          }
        })

        setRecommendations(transformed)
      } catch (error) {
        console.error('Failed to fetch recommendations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [])

  // Update filter when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status') as FilterOption | null
    if (urlStatus === 'draft' || urlStatus === 'sent' || urlStatus === 'approved') {
      setStatusFilter(urlStatus)
    }
  }, [searchParams])

  const filteredAndSortedRecommendations = useMemo(() => {
    let result = [...recommendations]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(rec => rec.client.toLowerCase().includes(query))
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(rec => rec.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'client':
          return a.client.localeCompare(b.client)
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return result
  }, [recommendations, searchQuery, statusFilter, sortBy])

  const getUserStatusBadge = (status: InvitedUser['status']) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'pending' },
      viewed: { label: 'Viewed', className: 'viewed' },
      approved: { label: 'Approved', className: 'approved' },
      rejected: { label: 'Rejected', className: 'rejected' },
    }
    const config = statusConfig[status]
    return <span className={`status-badge ${config.className}`}>{config.label}</span>
  }

  return (
    <>
      <AdminHeader
        title="Recommendations"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        <div className="page-header">
          <div className="page-header-content">
            <p>Track recommendation plans created for clients</p>
          </div>
          <Link href="/admin/recommendation-builder/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Recommendation
          </Link>
        </div>

        {/* Search and Filters */}
        <div className="clients-toolbar">
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
              onClick={() => setStatusFilter('draft')}
            >
              Draft
            </button>
            <button
              className={`filter-btn ${statusFilter === 'sent' ? 'active' : ''}`}
              onClick={() => setStatusFilter('sent')}
            >
              Sent
            </button>
            <button
              className={`filter-btn ${statusFilter === 'approved' ? 'active' : ''}`}
              onClick={() => setStatusFilter('approved')}
            >
              Approved
            </button>
          </div>
          <div className="sort-dropdown">
            <label className="sort-label">Sort by:</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="client">Client Name</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-state">
            <p>Loading recommendations...</p>
          </div>
        )}

        {/* Recommendations List */}
        {!isLoading && (
          <div className="recommendations-list">
            {filteredAndSortedRecommendations.length === 0 ? (
              <div className="no-results">
                <p>No recommendations found. Create your first recommendation!</p>
              </div>
            ) : (
              <div className="accordion-list">
                {filteredAndSortedRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`accordion-item ${expandedId === rec.id ? 'expanded' : ''}`}
                  >
                    {/* Accordion Header Row */}
                    <div
                      className="accordion-header"
                      onClick={() => toggleExpanded(rec.id)}
                    >
                      <div className="accordion-toggle">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="16"
                          height="16"
                          className="chevron-icon"
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                      <div className="client-cell">
                        <div className="client-avatar-sm" style={{ background: rec.avatarColor }}>
                          {rec.initials}
                        </div>
                        <div className="client-info-inline">
                          <Link
                            href={`/admin/clients/${rec.clientId}`}
                            className="client-name"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {rec.client}
                          </Link>
                        </div>
                      </div>
                      <div className="recommendation-status">
                        <span className={`status-badge ${rec.status}`}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </div>
                      <div className="recommendation-items-count">
                        {rec.itemCount} items
                      </div>
                      <div className="recommendation-pricing">
                        <span className="pricing-monthly">${rec.totalMonthly.toLocaleString()}/mo</span>
                        {rec.totalOnetime > 0 && (
                          <span className="pricing-onetime">+ ${rec.totalOnetime.toLocaleString()}</span>
                        )}
                      </div>
                      <div className="recommendation-date">
                        {formatDate(rec.createdAt)}
                      </div>
                      <div className="recommendation-actions" onClick={(e) => e.stopPropagation()}>
                        <Link
                          href={`/admin/recommendation-builder/${rec.clientId}`}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn-sm btn-secondary btn-danger"
                          onClick={(e) => handleDelete(rec.id, e)}
                          disabled={deletingId === rec.id}
                        >
                          {deletingId === rec.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>

                    {/* Accordion Content - Invited Users */}
                    {expandedId === rec.id && (
                      <div className="accordion-content">
                        <div className="accordion-section">
                          <div className="section-header">
                            <h4>Invited Users</h4>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => openShareModal(rec.id, rec.clientEmail)}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                              </svg>
                              Add User
                            </button>
                          </div>

                          {rec.invitedUsers.length === 0 ? (
                            <div className="no-users-message">
                              <p>No users have been invited yet. Send the recommendation to invite the client.</p>
                            </div>
                          ) : (
                            <table className="users-table">
                              <thead>
                                <tr>
                                  <th>User</th>
                                  <th>Email</th>
                                  <th>Status</th>
                                  <th>Invited</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rec.invitedUsers.map((user) => (
                                  <tr key={user.id}>
                                    <td>
                                      <div className="user-cell">
                                        <div className="user-avatar-sm">
                                          {user.name ? getInitials(user.name) : user.email[0].toUpperCase()}
                                        </div>
                                        <span>{user.name || 'Unknown'}</span>
                                      </div>
                                    </td>
                                    <td>{user.email}</td>
                                    <td>{getUserStatusBadge(user.status)}</td>
                                    <td>{formatRelativeTime(user.invitedAt)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Count */}
        {!isLoading && filteredAndSortedRecommendations.length > 0 && (
          <div className="load-more-container">
            <p className="clients-count">
              Showing {filteredAndSortedRecommendations.length} of {recommendations.length} recommendations
            </p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay active" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Recommendation</h2>
              <button className="modal-close" onClick={() => setShowShareModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Enter the details of the person you want to share this recommendation with.
              </p>
              <div className="form-group">
                <label htmlFor="shareFirstName">First Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="shareFirstName"
                  className="form-control"
                  placeholder="e.g., John"
                  value={shareForm.firstName}
                  onChange={(e) => setShareForm({ ...shareForm, firstName: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="shareLastName">Last Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="shareLastName"
                  className="form-control"
                  placeholder="e.g., Smith"
                  value={shareForm.lastName}
                  onChange={(e) => setShareForm({ ...shareForm, lastName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="shareEmail">Email <span className="required">*</span></label>
                <input
                  type="email"
                  id="shareEmail"
                  className="form-control"
                  placeholder="e.g., john@example.com"
                  value={shareForm.email}
                  onChange={(e) => setShareForm({ ...shareForm, email: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowShareModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleShare}
                disabled={!shareForm.firstName.trim() || !shareForm.lastName.trim() || !shareForm.email.trim() || isSendingInvite}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                {isSendingInvite ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
