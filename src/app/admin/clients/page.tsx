'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  SummaryCards,
  GrowthStageCards,
  ClientFilters,
  ClientList,
  ClientDetailModal,
  ScoringExplainerModal,
  ALERT_TEMPLATES,
} from '@/components/admin/performance'
import type { PerformanceData, ClientDetailData } from '@/components/admin/performance'
import { PerformanceDashboardResponseSchema } from '@/lib/validation/performanceSchemas'

type ClientStatus = 'active' | 'inactive' | 'prospect' | 'paused'
type Tab = 'clients' | 'performance'

// Demo client ID - used to filter it from the regular list
const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'
type GrowthStage = 'prospect' | 'seedling' | 'sprouting' | 'blooming' | 'harvesting'
type SortOption = 'name' | 'date-desc' | 'date-asc' | 'stage'
type ViewMode = 'grid' | 'list'
type FilterOption = 'all' | ClientStatus

interface Client {
  id: string
  name: string
  email: string
  initials: string
  avatarColor: string
  status: ClientStatus
  growthStage: GrowthStage
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
  avatar_color: string | null
  created_at: string
  start_date: string | null
  services_count: number
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

// Growth stage icons and colors
const growthStageConfig: Record<GrowthStage, { icon: string; color: string; bg: string; label: string }> = {
  prospect: { icon: '○', color: '#6B7280', bg: '#F3F4F6', label: 'Prospect' },
  seedling: { icon: '🌱', color: '#D97706', bg: '#FEF3C7', label: 'Seedling' },
  sprouting: { icon: '🌿', color: '#059669', bg: '#D1FAE5', label: 'Sprouting' },
  blooming: { icon: '🌸', color: '#2563EB', bg: '#DBEAFE', label: 'Blooming' },
  harvesting: { icon: '🌾', color: '#7C3AED', bg: '#EDE9FE', label: 'Harvesting' },
}

export default function ClientsPage() {
  const { user, hasNotifications } = useUserProfile()
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('clients')

  // Clients tab state
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterOption>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  // Performance tab state
  const [perfData, setPerfData] = useState<PerformanceData | null>(null)
  const [perfLoading, setPerfLoading] = useState(false)
  const [perfError, setPerfError] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [perfStatusFilter, setPerfStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [perfSortBy, setPerfSortBy] = useState<string>('score_desc')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientDetail, setClientDetail] = useState<ClientDetailData | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [alertType, setAlertType] = useState<string>('performance_focus')
  const [alertMessage, setAlertMessage] = useState(ALERT_TEMPLATES.performance_focus)
  const [publishingAlert, setPublishingAlert] = useState(false)
  const [focusAlert, setFocusAlert] = useState(false)
  const [showExplainer, setShowExplainer] = useState(false)
  const [avgScoreHistory, setAvgScoreHistory] = useState<number[]>([])

  // Add Client Modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
    basecampProjectId: '',
    dashboardToken: '',
    stripeCustomerId: '',
  })
  const [isSavingClient, setIsSavingClient] = useState(false)

  // Edit Client Modal state
  const [showEditClientModal, setShowEditClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<{
    id: string
    name: string
    contactName: string
    contactEmail: string
    growthStage: string
    basecampProjectId: string
    dashboardToken: string
    stripeCustomerId: string
  } | null>(null)
  const [isUpdatingClient, setIsUpdatingClient] = useState(false)

  // Delete state
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  // Fetch clients from database
  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients')
      if (!res.ok) throw new Error('Failed to fetch clients')
      const dbClients: DBClient[] = await res.json()

      // Filter out the demo client from the list
      const filteredClients = dbClients.filter(c => c.id !== DEMO_CLIENT_ID)

      // Transform DB clients to Client interface
      const transformedClients: Client[] = filteredClients.map(c => {
        // Determine display status and growth stage
        const growthStage: GrowthStage = (c.growth_stage as GrowthStage) || 'prospect'
        const isProspect = growthStage === 'prospect'

        let displayStatus: ClientStatus = 'active'
        if (c.status === 'inactive') {
          displayStatus = 'inactive'
        } else if (c.status === 'paused') {
          displayStatus = 'paused'
        } else if (c.status === 'pending' || isProspect) {
          // 'pending' in database means prospect (pre-purchase)
          displayStatus = 'prospect'
        }

        // Generate dummy data for active clients based on growth stage
        // Note: services count now comes from real subscription data (c.services_count)
        let visitors: number | null = null
        let leads: number | null = null
        let growth: number | null = null

        if (!isProspect && displayStatus !== 'inactive') {
          // Generate consistent dummy data based on client name hash
          const hash = c.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)

          switch (growthStage) {
            case 'seedling':
              visitors = 500 + (hash % 1000)
              leads = 5 + (hash % 10)
              growth = 5 + (hash % 15)
              break
            case 'sprouting':
              visitors = 2000 + (hash % 3000)
              leads = 15 + (hash % 25)
              growth = 12 + (hash % 20)
              break
            case 'blooming':
              visitors = 8000 + (hash % 7000)
              leads = 50 + (hash % 50)
              growth = 20 + (hash % 25)
              break
            case 'harvesting':
              visitors = 20000 + (hash % 15000)
              leads = 150 + (hash % 100)
              growth = 30 + (hash % 20)
              break
          }
        }

        return {
          id: c.id,
          name: c.name,
          email: c.contact_email || '',
          initials: getInitials(c.name),
          avatarColor: c.avatar_color || getAvatarColor(c.name),
          status: displayStatus,
          growthStage,
          services: c.services_count,
          since: formatDate(c.start_date || c.created_at),
          visitors,
          leads,
          growth,
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
      setNewClientForm({ name: '', contactName: '', contactEmail: '', basecampProjectId: '', dashboardToken: '', stripeCustomerId: '' })
    } catch (error) {
      console.error('Failed to create client:', error)
      alert('Failed to create client')
    } finally {
      setIsSavingClient(false)
    }
  }

  // Open edit client modal
  const openEditClientModal = async (clientId: string) => {
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
          basecampProjectId: client.basecamp_project_id || '',
          dashboardToken: client.agency_dashboard_share_key || '',
          stripeCustomerId: client.stripe_customer_id || '',
        })
        setShowEditClientModal(true)
      }
    } catch (error) {
      console.error('Failed to fetch client:', error)
      alert('Failed to load client details')
    }
  }

  // Handle updating a client
  const handleUpdateClient = async () => {
    if (!editingClient || !editingClient.name.trim()) return

    setIsUpdatingClient(true)
    try {
      const res = await fetch(`/api/admin/clients/${editingClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingClient.name,
          contactName: editingClient.contactName,
          contactEmail: editingClient.contactEmail,
          growthStage: editingClient.growthStage,
          basecampProjectId: editingClient.basecampProjectId,
          dashboardToken: editingClient.dashboardToken,
          stripeCustomerId: editingClient.stripeCustomerId,
        }),
      })

      if (!res.ok) throw new Error('Failed to update client')

      // Refresh the clients list
      await fetchClients()

      // Close modal
      setShowEditClientModal(false)
      setEditingClient(null)
    } catch (error) {
      console.error('Failed to update client:', error)
      alert('Failed to update client')
    } finally {
      setIsUpdatingClient(false)
    }
  }

  // Handle deleting a client
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client? This will also delete all their recommendations.')) {
      return
    }

    setDeletingClientId(clientId)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete client')

      // Refresh the clients list
      await fetchClients()
    } catch (error) {
      console.error('Failed to delete client:', error)
      alert('Failed to delete client')
    } finally {
      setDeletingClientId(null)
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
    const stageOrder: Record<GrowthStage, number> = {
      prospect: 0,
      seedling: 1,
      sprouting: 2,
      blooming: 3,
      harvesting: 4,
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date-desc':
          return new Date(b.since).getTime() - new Date(a.since).getTime()
        case 'date-asc':
          return new Date(a.since).getTime() - new Date(b.since).getTime()
        case 'stage':
          return stageOrder[b.growthStage] - stageOrder[a.growthStage]
        default:
          return 0
      }
    })

    return result
  }, [clients, searchQuery, statusFilter, sortBy])

  const totalClients = clients.length

  // Performance tab - fetch avg score history
  useEffect(() => {
    if (activeTab === 'performance') {
      fetch('/api/admin/performance/avg-history')
        .then(res => res.json())
        .then(data => {
          if (data.history) {
            setAvgScoreHistory(data.history)
          }
        })
        .catch(err => console.error('Failed to fetch avg score history:', err))
    }
  }, [activeTab])

  // Performance tab - fetch dashboard data
  const fetchPerfData = useCallback(async () => {
    try {
      setPerfLoading(true)
      const params = new URLSearchParams()
      if (stageFilter !== 'all') params.set('stage', stageFilter)
      if (perfStatusFilter !== 'all') params.set('status', perfStatusFilter)
      if (planFilter !== 'all') params.set('plan', planFilter)
      if (perfSortBy) params.set('sort', perfSortBy)
      if (criticalOnly) params.set('critical_only', 'true')

      const res = await fetch(`/api/admin/performance?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch performance data')
      const result = await res.json()

      const validation = PerformanceDashboardResponseSchema.safeParse(result)
      if (!validation.success) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Performance API response validation failed:', validation.error.issues)
        }
        throw new Error('Invalid API response format')
      }

      setPerfData(validation.data as PerformanceData)
      setPerfError(null)
    } catch (err) {
      setPerfError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setPerfLoading(false)
    }
  }, [stageFilter, perfStatusFilter, planFilter, perfSortBy, criticalOnly])

  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerfData()
    }
  }, [activeTab, fetchPerfData])

  // Performance tab - fetch client detail
  const fetchClientDetail = async (clientId: string) => {
    try {
      setDetailLoading(true)
      const res = await fetch(`/api/admin/performance/${clientId}`)
      if (!res.ok) throw new Error('Failed to fetch client detail')
      const result = await res.json()
      setClientDetail(result)
    } catch (err) {
      console.error('Failed to fetch client detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }

  const openClientDetail = (clientId: string, shouldFocusAlert = false) => {
    setSelectedClientId(clientId)
    fetchClientDetail(clientId)
    setFocusAlert(shouldFocusAlert)
    setAlertType('performance_focus')
    setAlertMessage(ALERT_TEMPLATES.performance_focus)
  }

  const closeClientDetail = () => {
    setSelectedClientId(null)
    setClientDetail(null)
    setFocusAlert(false)
  }

  // Performance tab - publish alert
  const publishAlert = async () => {
    if (!selectedClientId || !alertMessage.trim()) return

    try {
      setPublishingAlert(true)
      const res = await fetch('/api/admin/performance/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          message: alertMessage,
          alert_type: alertType,
          publish: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to publish alert')

      await fetchClientDetail(selectedClientId)
      alert('Alert published successfully!')
    } catch (err) {
      alert('Failed to publish alert')
    } finally {
      setPublishingAlert(false)
    }
  }

  const perfSummary = perfData?.summary || {
    total_clients: 0,
    average_score: 0,
    by_status: { critical: 0, at_risk: 0, needs_attention: 0, healthy: 0, thriving: 0 },
    by_stage: {
      seedling: { count: 0, avg_score: 0 },
      sprouting: { count: 0, avg_score: 0 },
      blooming: { count: 0, avg_score: 0 },
      harvesting: { count: 0, avg_score: 0 },
    },
  }
  const perfClients = perfData?.clients || []

  return (
    <>
      <AdminHeader
        title="Clients"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage your client accounts and view their marketing performance</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link href={`/getting-started?viewingAs=${DEMO_CLIENT_ID}`} className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              View Demo
            </Link>
            <button className="btn btn-primary" onClick={() => setShowAddClientModal(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Client
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            <button
              className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => setActiveTab('clients')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'clients' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: activeTab === 'clients' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Clients
            </button>
            <button
              className={`tab ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'performance' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: 500,
                fontSize: '14px',
                borderBottom: activeTab === 'performance' ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-1px',
                transition: 'all 0.2s',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              Client Performance
            </button>
          </div>
        </div>

        {/* Clients Tab */}
        {activeTab === 'clients' && (
          <>
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
              <option value="stage">Growth Stage</option>
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

        {/* Growth Stage Legend */}
        <div className="growth-stage-legend">
          <span className="legend-label">Growth Stages:</span>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-icon" style={{ background: growthStageConfig.seedling.bg, color: growthStageConfig.seedling.color }}>
                {growthStageConfig.seedling.icon}
              </span>
              <span>Seedling</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon" style={{ background: growthStageConfig.sprouting.bg, color: growthStageConfig.sprouting.color }}>
                {growthStageConfig.sprouting.icon}
              </span>
              <span>Sprouting</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon" style={{ background: growthStageConfig.blooming.bg, color: growthStageConfig.blooming.color }}>
                {growthStageConfig.blooming.icon}
              </span>
              <span>Blooming</span>
            </div>
            <div className="legend-item">
              <span className="legend-icon" style={{ background: growthStageConfig.harvesting.bg, color: growthStageConfig.harvesting.color }}>
                {growthStageConfig.harvesting.icon}
              </span>
              <span>Harvesting</span>
            </div>
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
                      ) : client.status === 'paused' ? (
                        <span className="client-stat-value muted">Paused</span>
                      ) : client.growth !== null ? (
                        <div className="growth-with-stage">
                          <span className="client-stat-value positive">+{client.growth}%</span>
                          <span
                            className="growth-stage-icon"
                            title={growthStageConfig[client.growthStage].label}
                            style={{
                              background: growthStageConfig[client.growthStage].bg,
                              color: growthStageConfig[client.growthStage].color
                            }}
                          >
                            {growthStageConfig[client.growthStage].icon}
                          </span>
                        </div>
                      ) : (
                        <span className="client-stat-value">--</span>
                      )}
                      <span className="client-stat-label">
                        {client.status === 'inactive' || client.status === 'paused' ? 'Status' : 'Growth'}
                      </span>
                    </div>
                  </div>
                  {client.status === 'inactive' && (
                    <div className="client-card-paused-overlay">
                      <span>Inactive</span>
                    </div>
                  )}
                </Link>
                <div className="client-card-actions">
                  <button
                    className="card-action-btn"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      openEditClientModal(client.id)
                    }}
                    title="Edit client"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    className="card-action-btn delete"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDeleteClient(client.id)
                    }}
                    disabled={deletingClientId === client.id}
                    title="Delete client"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!isLoading && filteredAndSortedClients.length === 0 && (
          <div className="no-results">
            <p>
              {clients.length === 0
                ? "We don't have any clients that you've signed up yet."
                : "No clients found matching your criteria."}
            </p>
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
          </>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <>
            {perfLoading && !perfData ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#6B7280' }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }}></div>
                Loading performance data...
              </div>
            ) : perfError ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#dc2626' }}>
                Error: {perfError}
                <br />
                <button onClick={fetchPerfData} style={{ marginTop: '16px', padding: '8px 16px' }}>
                  Retry
                </button>
              </div>
            ) : (
              <>
                <SummaryCards summary={perfSummary} avgScoreHistory={avgScoreHistory} />

                <GrowthStageCards summary={perfSummary} />

                <ClientFilters
                  stageFilter={stageFilter}
                  statusFilter={perfStatusFilter}
                  planFilter={planFilter}
                  sortBy={perfSortBy}
                  criticalOnly={criticalOnly}
                  onStageChange={setStageFilter}
                  onStatusChange={setPerfStatusFilter}
                  onPlanChange={setPlanFilter}
                  onSortChange={setPerfSortBy}
                  onCriticalOnlyChange={setCriticalOnly}
                  onShowExplainer={() => setShowExplainer(true)}
                />

                <ClientList clients={perfClients} onViewClient={openClientDetail} />
              </>
            )}
          </>
        )}
      </div>

      {/* Performance Modals */}
      {selectedClientId && (
        <ClientDetailModal
          clientDetail={clientDetail}
          loading={detailLoading}
          alertType={alertType}
          alertMessage={alertMessage}
          publishingAlert={publishingAlert}
          focusAlert={focusAlert}
          onClose={closeClientDetail}
          onAlertTypeChange={setAlertType}
          onAlertMessageChange={setAlertMessage}
          onPublishAlert={publishAlert}
        />
      )}

      {showExplainer && (
        <ScoringExplainerModal onClose={() => setShowExplainer(false)} />
      )}

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
              <div className="form-row">
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
              <div className="form-divider">
                <span>Integrations</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="basecampProjectId">Basecamp Project ID</label>
                  <input
                    type="text"
                    id="basecampProjectId"
                    className="form-control"
                    placeholder="e.g., 12345678"
                    value={newClientForm.basecampProjectId}
                    onChange={(e) => setNewClientForm({ ...newClientForm, basecampProjectId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dashboardToken">Dashboard Token</label>
                  <input
                    type="text"
                    id="dashboardToken"
                    className="form-control"
                    placeholder="e.g., abc123xyz"
                    value={newClientForm.dashboardToken}
                    onChange={(e) => setNewClientForm({ ...newClientForm, dashboardToken: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="stripeCustomerId">Stripe Customer ID</label>
                <input
                  type="text"
                  id="stripeCustomerId"
                  className="form-control"
                  placeholder="e.g., cus_xxxxxxxxxxxxx"
                  value={newClientForm.stripeCustomerId}
                  onChange={(e) => setNewClientForm({ ...newClientForm, stripeCustomerId: e.target.value })}
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

      {/* Edit Client Modal */}
      {showEditClientModal && editingClient && (
        <div className="modal-overlay active" onClick={() => setShowEditClientModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
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
              <div className="form-row">
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
              <div className="form-divider">
                <span>Integrations</span>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="editBasecampProjectId">Basecamp Project ID</label>
                  <input
                    type="text"
                    id="editBasecampProjectId"
                    className="form-control"
                    placeholder="e.g., 12345678"
                    value={editingClient.basecampProjectId}
                    onChange={(e) => setEditingClient({ ...editingClient, basecampProjectId: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="editDashboardToken">Dashboard Token</label>
                  <input
                    type="text"
                    id="editDashboardToken"
                    className="form-control"
                    placeholder="e.g., abc123xyz"
                    value={editingClient.dashboardToken}
                    onChange={(e) => setEditingClient({ ...editingClient, dashboardToken: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="editStripeCustomerId">Stripe Customer ID</label>
                <input
                  type="text"
                  id="editStripeCustomerId"
                  className="form-control"
                  placeholder="e.g., cus_xxxxxxxxxxxxx"
                  value={editingClient.stripeCustomerId}
                  onChange={(e) => setEditingClient({ ...editingClient, stripeCustomerId: e.target.value })}
                />
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
                onClick={handleUpdateClient}
                disabled={!editingClient.name.trim() || isUpdatingClient}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {isUpdatingClient ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
