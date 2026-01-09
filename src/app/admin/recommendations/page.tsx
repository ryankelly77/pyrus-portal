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
    growth_stage: string | null
    avatar_color: string | null
  }
  creator: {
    id: string
    full_name: string | null
    role: string | null
  } | null
  recommendation_items: {
    id: string
    quantity: number | null
    monthly_price: string | null
    onetime_price: string | null
    notes: string | null
    tier: string | null
    product: { id: string; name: string; category: string } | null
    bundle: { id: string; name: string } | null
    addon: { id: string; name: string } | null
  }[]
  recommendation_invites: DBRecommendationInvite[]
}

interface TierPricing {
  monthly: number
  onetime: number
  itemCount: number
}

interface Recommendation {
  id: string
  client: string
  clientId: string
  clientEmail: string | null
  clientStage: string
  initials: string
  avatarColor: string
  status: RecommendationStatus
  tierPricing: {
    good: TierPricing
    better: TierPricing
    best: TierPricing
  }
  itemCount: number
  items: { name: string; tier: string }[]
  createdAt: string
  sentAt: string | null
  invitedUsers: InvitedUser[]
  createdBy: {
    name: string
    role: string
  } | null
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

// Helper to get role badge content (matches users page styling)
function getRoleBadgeContent(role: string | null) {
  switch (role) {
    case 'super_admin':
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
        ),
        label: 'Super Admin',
        className: 'super-admin',
      }
    case 'production_team':
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        ),
        label: 'Production',
        className: 'production-team',
      }
    case 'sales':
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        ),
        label: 'Sales',
        className: 'sales',
      }
    default:
      return {
        icon: null,
        label: 'User',
        className: 'user',
      }
  }
}

// Growth stage labels
const growthStageLabels: Record<string, string> = {
  prospect: 'Prospect',
  seedling: 'Seedling',
  sprouting: 'Sprouting',
  blooming: 'Blooming',
  harvesting: 'Harvesting',
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

  // Edit client modal state
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<{
    id: string
    name: string
    contactName: string
    contactEmail: string
    growthStage: string
  } | null>(null)
  const [isSavingClient, setIsSavingClient] = useState(false)

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

  // Open edit client modal
  const openEditClientModal = async (clientId: string, clientName: string, clientEmail: string | null) => {
    // Fetch full client data from API
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`)
      if (res.ok) {
        const client = await res.json()
        setEditingClient({
          id: client.id,
          name: client.name,
          contactName: client.contact_name || '',
          contactEmail: client.contact_email || '',
          growthStage: client.growth_stage || 'prospect',
        })
      } else {
        // Fallback to basic data we have
        setEditingClient({
          id: clientId,
          name: clientName,
          contactName: '',
          contactEmail: clientEmail || '',
          growthStage: 'prospect',
        })
      }
    } catch {
      // Fallback to basic data we have
      setEditingClient({
        id: clientId,
        name: clientName,
        contactName: '',
        contactEmail: clientEmail || '',
        growthStage: 'prospect',
      })
    }
    setShowEditClientModal(true)
  }

  // Save client changes
  const handleSaveClient = async () => {
    if (!editingClient) return

    setIsSavingClient(true)
    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingClient.name,
          contactName: editingClient.contactName,
          contactEmail: editingClient.contactEmail,
          growthStage: editingClient.growthStage,
        }),
      })

      if (!res.ok) throw new Error('Failed to update client')

      // Update recommendations list with new client name
      setRecommendations(prev => prev.map(rec => {
        if (rec.clientId === editingClient.id) {
          return {
            ...rec,
            client: editingClient.name,
            clientEmail: editingClient.contactEmail,
            initials: getInitials(editingClient.name),
            // Preserve existing avatar color - it's stored in the database
            avatarColor: rec.avatarColor,
            clientStage: growthStageLabels[editingClient.growthStage] || 'Prospect',
          }
        }
        return rec
      }))

      setShowEditClientModal(false)
      setEditingClient(null)
    } catch (error) {
      console.error('Failed to update client:', error)
      alert('Failed to update client')
    } finally {
      setIsSavingClient(false)
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
            tier: item.tier || 'good',
          }))

          // Calculate pricing per tier
          const tierPricing = {
            good: { monthly: 0, onetime: 0, itemCount: 0 },
            better: { monthly: 0, onetime: 0, itemCount: 0 },
            best: { monthly: 0, onetime: 0, itemCount: 0 },
          }

          rec.recommendation_items.forEach(item => {
            const tier = (item.tier as 'good' | 'better' | 'best') || 'good'
            if (tierPricing[tier]) {
              tierPricing[tier].monthly += item.monthly_price ? parseFloat(item.monthly_price) : 0
              tierPricing[tier].onetime += item.onetime_price ? parseFloat(item.onetime_price) : 0
              tierPricing[tier].itemCount += 1
            }
          })

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
            clientStage: growthStageLabels[rec.client.growth_stage || 'prospect'] || 'Prospect',
            initials: getInitials(rec.client.name),
            avatarColor: rec.client.avatar_color || getAvatarColor(rec.client.name),
            status: (rec.status as RecommendationStatus) || 'draft',
            tierPricing,
            itemCount: rec.recommendation_items.length,
            items,
            createdAt: rec.created_at,
            sentAt: rec.sent_at,
            invitedUsers,
            createdBy: rec.creator ? {
              name: rec.creator.full_name || 'Unknown',
              role: rec.creator.role || 'user',
            } : null,
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
                {/* Table Header */}
                <div className="accordion-list-header">
                  <div className="header-toggle"></div>
                  <div className="header-client">Client</div>
                  <div className="header-stage">Stage</div>
                  <div className="header-status">Status</div>
                  <div className="header-items">Items</div>
                  <div className="header-good">Good</div>
                  <div className="header-better">Better</div>
                  <div className="header-best">Best</div>
                  <div className="header-created-by">Created By</div>
                  <div className="header-date">Date</div>
                  <div className="header-actions">Actions</div>
                </div>
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
                          <button
                            className="edit-client-link"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditClientModal(rec.clientId, rec.client, rec.clientEmail)
                            }}
                            title="Edit client"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="client-stage">
                        <span className={`stage-badge ${rec.clientStage.toLowerCase().replace(/\s+/g, '-')}`}>
                          {rec.clientStage}
                        </span>
                      </div>
                      <div className="recommendation-status">
                        <span className={`status-badge ${rec.status}`}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </div>
                      <div className="recommendation-items-count">
                        {rec.itemCount} items
                      </div>
                      <div className="tier-pricing-cell">
                        {rec.tierPricing.good.itemCount > 0 ? (
                          <span className="tier-price good">${rec.tierPricing.good.monthly.toLocaleString()}</span>
                        ) : (
                          <span className="tier-price empty">—</span>
                        )}
                      </div>
                      <div className="tier-pricing-cell">
                        {rec.tierPricing.better.itemCount > 0 ? (
                          <span className="tier-price better">${rec.tierPricing.better.monthly.toLocaleString()}</span>
                        ) : (
                          <span className="tier-price empty">—</span>
                        )}
                      </div>
                      <div className="tier-pricing-cell">
                        {rec.tierPricing.best.itemCount > 0 ? (
                          <span className="tier-price best">${rec.tierPricing.best.monthly.toLocaleString()}</span>
                        ) : (
                          <span className="tier-price empty">—</span>
                        )}
                      </div>
                      <div className="created-by-cell">
                        {rec.createdBy ? (
                          <>
                            <span className="creator-name">{rec.createdBy.name}</span>
                            {(() => {
                              const roleContent = getRoleBadgeContent(rec.createdBy.role)
                              return (
                                <span className={`role-badge ${roleContent.className}`}>
                                  {roleContent.icon}
                                  {roleContent.label}
                                </span>
                              )
                            })()}
                          </>
                        ) : (
                          <span className="creator-unknown">—</span>
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

      {/* Edit Client Modal */}
      {showEditClientModal && editingClient && (
        <div className="modal-overlay active" onClick={() => setShowEditClientModal(false)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Client</h2>
              <button className="modal-close" onClick={() => setShowEditClientModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="editClientName">Client/Business Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="editClientName"
                  className="form-control"
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editContactName">Contact Name</label>
                <input
                  type="text"
                  id="editContactName"
                  className="form-control"
                  placeholder="e.g., John Smith"
                  value={editingClient.contactName}
                  onChange={(e) => setEditingClient({ ...editingClient, contactName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editContactEmail">Contact Email</label>
                <input
                  type="email"
                  id="editContactEmail"
                  className="form-control"
                  placeholder="e.g., john@company.com"
                  value={editingClient.contactEmail}
                  onChange={(e) => setEditingClient({ ...editingClient, contactEmail: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="editGrowthStage">Client Stage</label>
                <select
                  id="editGrowthStage"
                  className="form-control"
                  value={editingClient.growthStage}
                  onChange={(e) => setEditingClient({ ...editingClient, growthStage: e.target.value })}
                >
                  <option value="prospect">Prospect</option>
                  <option value="seedling">Seedling</option>
                  <option value="sprouting">Sprouting</option>
                  <option value="blooming">Blooming</option>
                  <option value="harvesting">Harvesting</option>
                </select>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                {editingClient.growthStage === 'prospect' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    background: 'var(--accent-amber-bg, #FEF3C7)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'var(--accent-amber, #D97706)'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: '1px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>This client is still a <strong>Prospect</strong>. Full client details will be available once they become an active client.</span>
                  </div>
                ) : (
                  <Link
                    href={`/admin/clients/${editingClient.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '13px' }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                      <polyline points="15 3 21 3 21 9"></polyline>
                      <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                    View Full Client Details
                  </Link>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditClientModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveClient}
                disabled={!editingClient.name.trim() || isSavingClient}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {isSavingClient ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
