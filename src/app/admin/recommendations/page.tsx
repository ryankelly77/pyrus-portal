'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AdminHeader } from '@/components/layout'

type RecommendationStatus = 'draft' | 'sent' | 'approved'

interface DBRecommendation {
  id: string
  client_id: string
  status: string | null
  pricing_type: string | null
  total_monthly: string | null
  total_onetime: string | null
  notes: string | null
  created_at: string
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
    product: { id: string; name: string; category: string } | null
    bundle: { id: string; name: string } | null
    addon: { id: string; name: string } | null
  }[]
}

interface Recommendation {
  id: string
  client: string
  clientId: string
  initials: string
  avatarColor: string
  status: RecommendationStatus
  totalMonthly: number
  totalOnetime: number
  itemCount: number
  createdAt: string
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

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const initialStatus = searchParams.get('status') as 'all' | RecommendationStatus | null

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | RecommendationStatus>(initialStatus || 'all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recommendation?')) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/recommendations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setRecommendations(prev => prev.filter(rec => rec.id !== id))
    } catch (error) {
      console.error('Failed to delete recommendation:', error)
      alert('Failed to delete recommendation')
    } finally {
      setDeletingId(null)
    }
  }

  // Fetch recommendations
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const res = await fetch('/api/admin/recommendations')
        if (!res.ok) throw new Error('Failed to fetch recommendations')
        const dbRecs: DBRecommendation[] = await res.json()

        const transformed: Recommendation[] = dbRecs.map(rec => ({
          id: rec.id,
          client: rec.client.name,
          clientId: rec.client.id,
          initials: getInitials(rec.client.name),
          avatarColor: getAvatarColor(rec.client.name),
          status: (rec.status as RecommendationStatus) || 'draft',
          totalMonthly: rec.total_monthly ? parseFloat(rec.total_monthly) : 0,
          totalOnetime: rec.total_onetime ? parseFloat(rec.total_onetime) : 0,
          itemCount: rec.recommendation_items.length,
          createdAt: formatDate(rec.created_at),
        }))

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
    const urlStatus = searchParams.get('status') as 'all' | RecommendationStatus | null
    if (urlStatus === 'draft' || urlStatus === 'sent' || urlStatus === 'approved') {
      setStatusFilter(urlStatus)
    }
  }, [searchParams])

  const filteredRecommendations = statusFilter === 'all'
    ? recommendations
    : recommendations.filter(rec => rec.status === statusFilter)

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

        {/* Status Filter */}
        <div className="clients-toolbar">
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
            {filteredRecommendations.length === 0 ? (
              <div className="no-results">
                <p>No recommendations found. Create your first recommendation!</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th>Monthly</th>
                    <th>One-time</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecommendations.map((rec) => (
                    <tr key={rec.id}>
                      <td>
                        <div className="client-cell">
                          <div className="client-avatar-sm" style={{ background: rec.avatarColor }}>
                            {rec.initials}
                          </div>
                          <Link href={`/admin/clients/${rec.clientId}`} className="client-name">
                            {rec.client}
                          </Link>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${rec.status}`}>
                          {rec.status.charAt(0).toUpperCase() + rec.status.slice(1)}
                        </span>
                      </td>
                      <td>{rec.itemCount} items</td>
                      <td>${rec.totalMonthly.toLocaleString()}/mo</td>
                      <td>${rec.totalOnetime.toLocaleString()}</td>
                      <td>{rec.createdAt}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            href={`/admin/recommendation-builder/${rec.clientId}`}
                            className="btn btn-sm btn-secondary"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleDelete(rec.id)}
                            disabled={deletingId === rec.id}
                            style={{ color: '#DC2626' }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                              <path d="M3 6h18"></path>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            {deletingId === rec.id ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  )
}
