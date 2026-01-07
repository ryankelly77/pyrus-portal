'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

type ClientStatus = 'active' | 'inactive' | 'prospect'
type SortOption = 'name' | 'date-desc' | 'date-asc'
type ViewMode = 'grid' | 'list'
type FilterOption = 'all' | ClientStatus

interface Client {
  id: string
  name: string
  email: string
  initials: string
  avatarColor: string
  status: ClientStatus
  services: number
  since: string
  visitors: number | null
  leads: number | null
  growth: number | null
}

interface DBClient {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  status: string | null
  growth_stage: string | null
  created_at: string
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
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Add Client Modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
  })
  const [isSavingClient, setIsSavingClient] = useState(false)

  // Fetch clients from database
  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients')
      if (!res.ok) throw new Error('Failed to fetch clients')
      const dbClients: DBClient[] = await res.json()

      // Transform DB clients to Client interface
      const transformedClients: Client[] = dbClients.map(c => {
        // Determine display status based on growth_stage
        let displayStatus: ClientStatus = 'active'
        if (c.growth_stage === 'prospect' || !c.growth_stage) {
          displayStatus = 'prospect'
        } else if (c.status === 'inactive') {
          displayStatus = 'inactive'
        }

        return {
          id: c.id,
          name: c.name,
          email: c.contact_email || '',
          initials: getInitials(c.name),
          avatarColor: getAvatarColor(c.name),
          status: displayStatus,
          services: 0, // Placeholder - would come from subscriptions
          since: formatDate(c.created_at),
          visitors: null, // Placeholder - would come from analytics
          leads: null, // Placeholder - would come from CRM
          growth: null, // Placeholder - would come from analytics
        }
      })

      setClients(transformedClients)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Handle adding a new client
  const handleAddClient = async () => {
    if (!newClientForm.name.trim()) return

    setIsSavingClient(true)
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientForm),
      })

      if (!res.ok) throw new Error('Failed to create client')

      // Refresh the clients list
      await fetchClients()

      // Close modal and reset form
      setShowAddClientModal(false)
      setNewClientForm({ name: '', contactName: '', contactEmail: '' })
    } catch (error) {
      console.error('Failed to create client:', error)
      alert('Failed to create client')
    } finally {
      setIsSavingClient(false)
    }
  }

  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients]

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.email.toLowerCase().includes(query)
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((client) => client.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date-desc':
          return new Date(b.since).getTime() - new Date(a.since).getTime()
        case 'date-asc':
          return new Date(a.since).getTime() - new Date(b.since).getTime()
        default:
          return 0
      }
    })

    return result
  }, [clients, searchQuery, statusFilter, sortBy])

  const totalClients = clients.length

  return (
    <>
      <AdminHeader
        title="Clients"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage your client accounts and view their marketing performance</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddClientModal(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Client
          </button>
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
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All Clients
            </button>
            <button
              className={`filter-btn ${statusFilter === 'prospect' ? 'active' : ''}`}
              onClick={() => setStatusFilter('prospect')}
            >
              Prospects
            </button>
            <button
              className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
              onClick={() => setStatusFilter('inactive')}
            >
              Inactive
            </button>
          </div>
          <div className="sort-dropdown">
            <label className="sort-label">Sort by:</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="name">Name</option>
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
            </select>
          </div>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="loading-state">
            <p>Loading clients...</p>
          </div>
        )}

        {/* Clients Grid */}
        {!isLoading && (
          <div className={`clients-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
            {filteredAndSortedClients.map((client) => (
              <div
                key={client.id}
                className={`client-card ${client.status === 'inactive' ? 'inactive' : ''}`}
                data-status={client.status}
              >
                <Link href={`/admin/clients/${client.id}`} className="client-card-link">
                  <div className="client-card-header">
                    <div
                      className="client-card-avatar"
                      style={{ background: client.avatarColor }}
                    >
                      {client.initials}
                    </div>
                    <span className={`status-badge ${client.status}`}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </span>
                  </div>
                  <div className="client-card-body">
                    <h3>{client.name}</h3>
                    <p className="client-card-email">{client.email || 'No email'}</p>
                    <div className="client-card-meta">
                      <span className="services-link">{client.services} services</span>
                      <span>•</span>
                      <span>Since {client.since}</span>
                    </div>
                  </div>
                  <div className="client-card-stats">
                    <div className="client-stat">
                      <span className={`client-stat-value ${client.status === 'inactive' ? 'muted' : ''}`}>
                        {client.visitors !== null ? client.visitors.toLocaleString() : '--'}
                      </span>
                      <span className="client-stat-label">Visitors</span>
                    </div>
                    <div className="client-stat">
                      <span className={`client-stat-value ${client.status === 'inactive' ? 'muted' : ''}`}>
                        {client.leads !== null ? client.leads : '--'}
                      </span>
                      <span className="client-stat-label">Leads</span>
                    </div>
                    <div className="client-stat">
                      {client.status === 'inactive' ? (
                        <span className="client-stat-value muted">Inactive</span>
                      ) : client.growth !== null ? (
                        <span className="client-stat-value positive">+{client.growth}%</span>
                      ) : (
                        <span className="client-stat-value">--</span>
                      )}
                      <span className="client-stat-label">
                        {client.status === 'inactive' ? 'Status' : 'Growth'}
                      </span>
                    </div>
                  </div>
                  {client.status === 'inactive' && (
                    <div className="client-card-paused-overlay">
                      <span>Inactive</span>
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredAndSortedClients.length === 0 && (
          <div className="no-results">
            <p>No clients found matching your criteria.</p>
          </div>
        )}

        {/* Clients Count */}
        {!isLoading && filteredAndSortedClients.length > 0 && (
          <div className="load-more-container">
            <p className="clients-count">
              Showing {filteredAndSortedClients.length} of {totalClients} clients
            </p>
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="modal-overlay active" onClick={() => setShowAddClientModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Client</h2>
              <button className="modal-close" onClick={() => setShowAddClientModal(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="clientName">Client/Business Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="clientName"
                  className="form-control"
                  placeholder="e.g., Acme Corporation"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactName">Contact Name</label>
                <input
                  type="text"
                  id="contactName"
                  className="form-control"
                  placeholder="e.g., John Smith"
                  value={newClientForm.contactName}
                  onChange={(e) => setNewClientForm({ ...newClientForm, contactName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="contactEmail">Contact Email</label>
                <input
                  type="email"
                  id="contactEmail"
                  className="form-control"
                  placeholder="e.g., john@acme.com"
                  value={newClientForm.contactEmail}
                  onChange={(e) => setNewClientForm({ ...newClientForm, contactEmail: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddClientModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddClient}
                disabled={!newClientForm.name.trim() || isSavingClient}
              >
                {isSavingClient ? 'Creating...' : 'Create Client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
