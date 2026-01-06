'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

type ClientStatus = 'active' | 'onboarding' | 'paused'
type SortOption = 'name' | 'growth-desc' | 'growth-asc'
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

const clients: Client[] = [
  {
    id: 'tc-clinical',
    name: 'TC Clinical Services',
    email: 'dlg.mdservices@gmail.com',
    initials: 'TC',
    avatarColor: '#885430',
    status: 'active',
    services: 4,
    since: 'Sep 2025',
    visitors: 2847,
    leads: 28,
    growth: 32,
  },
  {
    id: 'raptor-vending',
    name: 'Raptor Vending',
    email: 'info@raptorvending.com',
    initials: 'RV',
    avatarColor: '#2563EB',
    status: 'active',
    services: 3,
    since: 'Jun 2025',
    visitors: 4521,
    leads: 45,
    growth: 28,
  },
  {
    id: 'raptor-services',
    name: 'Raptor Services',
    email: 'contact@raptorservices.com',
    initials: 'RS',
    avatarColor: '#7C3AED',
    status: 'active',
    services: 5,
    since: 'Mar 2025',
    visitors: 3892,
    leads: 52,
    growth: 41,
  },
  {
    id: 'gohfr',
    name: 'Gohfr',
    email: 'hello@gohfr.com',
    initials: 'GO',
    avatarColor: '#0B7277',
    status: 'onboarding',
    services: 3,
    since: 'Dec 2025',
    visitors: null,
    leads: null,
    growth: null,
  },
  {
    id: 'espronceda-law',
    name: 'Espronceda Law',
    email: 'maria@espronceda.law',
    initials: 'EL',
    avatarColor: '#DC2626',
    status: 'active',
    services: 4,
    since: 'Aug 2025',
    visitors: 1245,
    leads: 18,
    growth: 15,
  },
  {
    id: 'american-fence',
    name: 'American Fence & Deck',
    email: 'sales@americanfence.com',
    initials: 'AF',
    avatarColor: '#6B7280',
    status: 'paused',
    services: 5,
    since: 'Jan 2025',
    visitors: 6234,
    leads: 87,
    growth: null,
  },
  {
    id: 'peak-performance',
    name: 'Peak Performance Gym',
    email: 'owner@peakperformancegym.com',
    initials: 'PP',
    avatarColor: '#EA580C',
    status: 'active',
    services: 4,
    since: 'Oct 2025',
    visitors: 1892,
    leads: 34,
    growth: 24,
  },
  {
    id: 'sunrise-dental',
    name: 'Sunrise Dental',
    email: 'dr.smith@sunrisedental.com',
    initials: 'SD',
    avatarColor: '#0891B2',
    status: 'active',
    services: 3,
    since: 'Jul 2025',
    visitors: 2156,
    leads: 41,
    growth: 19,
  },
  {
    id: 'metro-plumbing',
    name: 'Metro Plumbing',
    email: 'dispatch@metroplumbing.com',
    initials: 'MP',
    avatarColor: '#4F46E5',
    status: 'active',
    services: 5,
    since: 'Apr 2025',
    visitors: 5234,
    leads: 89,
    growth: 45,
  },
  {
    id: 'green-thumb',
    name: 'Green Thumb Landscaping',
    email: 'info@greenthumb.com',
    initials: 'GT',
    avatarColor: '#16A34A',
    status: 'onboarding',
    services: 4,
    since: 'Dec 2025',
    visitors: null,
    leads: null,
    growth: null,
  },
  {
    id: 'horizon-real-estate',
    name: 'Horizon Real Estate',
    email: 'broker@horizonre.com',
    initials: 'HR',
    avatarColor: '#9333EA',
    status: 'active',
    services: 3,
    since: 'May 2025',
    visitors: 3421,
    leads: 56,
    growth: 37,
  },
  {
    id: 'coastal-insurance',
    name: 'Coastal Insurance',
    email: 'agent@coastalins.com',
    initials: 'CI',
    avatarColor: '#6B7280',
    status: 'paused',
    services: 4,
    since: 'Feb 2025',
    visitors: 4128,
    leads: 62,
    growth: null,
  },
]

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

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
        case 'growth-desc':
          return (b.growth ?? -1) - (a.growth ?? -1)
        case 'growth-asc':
          return (a.growth ?? 999) - (b.growth ?? 999)
        default:
          return 0
      }
    })

    return result
  }, [searchQuery, statusFilter, sortBy])

  const totalClients = 147 // Would come from API in real app

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
          <button className="btn btn-primary">
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
              className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              className={`filter-btn ${statusFilter === 'onboarding' ? 'active' : ''}`}
              onClick={() => setStatusFilter('onboarding')}
            >
              Onboarding
            </button>
            <button
              className={`filter-btn ${statusFilter === 'paused' ? 'active' : ''}`}
              onClick={() => setStatusFilter('paused')}
            >
              Paused
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
              <option value="growth-desc">Growth (High to Low)</option>
              <option value="growth-asc">Growth (Low to High)</option>
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

        {/* Clients Grid */}
        <div className={`clients-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
          {filteredAndSortedClients.map((client) => (
            <div
              key={client.id}
              className={`client-card ${client.status === 'paused' ? 'paused' : ''}`}
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
                  <p className="client-card-email">{client.email}</p>
                  <div className="client-card-meta">
                    <span className="services-link">{client.services} services</span>
                    <span>•</span>
                    <span>Since {client.since}</span>
                  </div>
                </div>
                <div className="client-card-stats">
                  <div className="client-stat">
                    <span className={`client-stat-value ${client.status === 'paused' ? 'muted' : ''}`}>
                      {client.visitors !== null ? client.visitors.toLocaleString() : '--'}
                    </span>
                    <span className="client-stat-label">Visitors</span>
                  </div>
                  <div className="client-stat">
                    <span className={`client-stat-value ${client.status === 'paused' ? 'muted' : ''}`}>
                      {client.leads !== null ? client.leads : '--'}
                    </span>
                    <span className="client-stat-label">Leads</span>
                  </div>
                  <div className="client-stat">
                    {client.status === 'paused' ? (
                      <span className="client-stat-value muted">Paused</span>
                    ) : client.growth !== null ? (
                      <span className="client-stat-value positive">+{client.growth}%</span>
                    ) : (
                      <span className="client-stat-value">--</span>
                    )}
                    <span className="client-stat-label">
                      {client.status === 'paused' ? 'Status' : 'Growth'}
                    </span>
                  </div>
                </div>
                {client.status === 'paused' && (
                  <div className="client-card-paused-overlay">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span>Campaign Paused</span>
                  </div>
                )}
              </Link>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredAndSortedClients.length === 0 && (
          <div className="no-results">
            <p>No clients found matching your criteria.</p>
          </div>
        )}

        {/* Load More */}
        {filteredAndSortedClients.length > 0 && (
          <div className="load-more-container">
            <p className="clients-count">
              Showing {filteredAndSortedClients.length} of {totalClients} clients
            </p>
            <button className="btn btn-secondary load-more-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  )
}
