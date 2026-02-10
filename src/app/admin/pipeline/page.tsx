'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { ScoreHistoryChart } from '@/components/pipeline/score-history-chart'
import { ScoreAuditFeed } from '@/components/pipeline/score-audit-feed'
import { SnoozeDealForm } from '@/components/pipeline/snooze-deal-form'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type {
  PipelineDeal,
  PipelineAggregates,
  PipelineRep,
  PipelineFilters,
  ArchiveReason,
  ArchiveAnalytics,
} from '@/lib/pipeline/pipeline-view-types'
import {
  ARCHIVE_REASON_OPTIONS,
  ARCHIVE_REASON_LABELS,
  ARCHIVE_REASON_COLORS,
} from '@/lib/pipeline/pipeline-view-types'

type SortKey = 'confidence_score' | 'predicted_monthly' | 'weighted_monthly' | 'age_days' | 'sent_at' | 'client_name'
type SortDir = 'asc' | 'desc'

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getConfidenceColor(score: number | null): 'green' | 'yellow' | 'red' {
  if (score === null) return 'red'
  if (score >= 70) return 'green'
  if (score >= 40) return 'yellow'
  return 'red'
}

function getTierColor(tier: string | null): string {
  switch (tier) {
    case 'good': return '#2563EB' // blue
    case 'better': return '#7C3AED' // purple
    case 'best': return '#D97706' // gold
    default: return '#6B7280' // gray
  }
}

function getTierLabel(tier: string | null): string {
  if (!tier) return '—'
  return tier.charAt(0).toUpperCase() + tier.slice(1)
}

function getAvatarColor(id: string): string {
  const colors = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2']
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(fullName: string | null, email?: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return fullName.slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}

function formatCallScore(value: string | null): string {
  if (!value) return '—'
  // Convert snake_case to Title Case
  return value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function getCallScoreClass(type: string, value: string): string {
  const goodValues: Record<string, string[]> = {
    budget: ['clear'],
    competition: ['none'],
    engagement: ['high'],
    plan_fit: ['strong'],
  }
  const mediumValues: Record<string, string[]> = {
    budget: ['vague'],
    competition: ['some'],
    engagement: ['medium'],
    plan_fit: ['medium'],
  }

  if (goodValues[type]?.includes(value)) return 'good'
  if (mediumValues[type]?.includes(value)) return 'medium'
  return 'poor'
}

function isSnoozed(snoozedUntil: string | null): boolean {
  if (!snoozedUntil) return false
  return new Date(snoozedUntil) > new Date()
}

function getSnoozeRemainingDays(snoozedUntil: string): number {
  const date = new Date(snoozedUntil)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export default function PipelineDashboardPage() {
  const { user, hasNotifications } = useUserProfile()
  const [deals, setDeals] = useState<PipelineDeal[]>([])
  const [aggregates, setAggregates] = useState<PipelineAggregates>({
    total_weighted_mrr: 0,
    total_raw_mrr: 0,
    total_weighted_onetime: 0,
    total_raw_onetime: 0,
    deal_count: 0,
    avg_confidence: 0,
    pipeline_confidence_pct: 0,
  })
  const [reps, setReps] = useState<PipelineRep[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null)
  const [showScoringModal, setShowScoringModal] = useState(false)
  const [historyTab, setHistoryTab] = useState<'chart' | 'audit'>('chart')
  const [snoozeDeal, setSnoozeDeal] = useState<PipelineDeal | null>(null)
  const [archiveDeal, setArchiveDeal] = useState<PipelineDeal | null>(null)
  const [archiveReason, setArchiveReason] = useState<ArchiveReason | ''>('')
  const [archiveNotes, setArchiveNotes] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [archivedDeals, setArchivedDeals] = useState<PipelineDeal[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [reviving, setReviving] = useState<string | null>(null)
  const [archiveTab, setArchiveTab] = useState<'deals' | 'analytics'>('deals')
  const [archiveAnalytics, setArchiveAnalytics] = useState<ArchiveAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [reasonFilter, setReasonFilter] = useState<ArchiveReason | null>(null)

  // Filters
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [selectedTier, setSelectedTier] = useState<string>('all')
  const [sentAfter, setSentAfter] = useState<string>('')
  const [sentBefore, setSentBefore] = useState<string>('')

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('confidence_score')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchPipelineData = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedRep !== 'all') params.set('rep_id', selectedRep)
      if (selectedTier !== 'all') params.set('predicted_tier', selectedTier)
      if (sentAfter) params.set('sent_after', sentAfter)
      if (sentBefore) params.set('sent_before', sentBefore)

      const url = `/api/admin/pipeline${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setDeals(data.deals || [])
        setAggregates(data.aggregates || {
          total_weighted_mrr: 0,
          total_raw_mrr: 0,
          total_weighted_onetime: 0,
          total_raw_onetime: 0,
          deal_count: 0,
          avg_confidence: 0,
          pipeline_confidence_pct: 0,
        })
        setReps(data.reps || [])
      }
    } catch (error) {
      console.error('Failed to fetch pipeline data:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedRep, selectedTier, sentAfter, sentBefore])

  useEffect(() => {
    fetchPipelineData()
  }, [fetchPipelineData])

  const fetchArchivedDeals = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/pipeline?archived=archived')
      if (res.ok) {
        const data = await res.json()
        setArchivedDeals(data.deals || [])
      }
    } catch (error) {
      console.error('Failed to fetch archived deals:', error)
    }
  }, [])

  // Fetch archived deals on mount (for count in toggle)
  useEffect(() => {
    fetchArchivedDeals()
  }, [fetchArchivedDeals])

  const fetchArchiveAnalytics = useCallback(async () => {
    setAnalyticsLoading(true)
    try {
      const params = new URLSearchParams()
      if (sentAfter) params.set('archived_after', sentAfter)
      if (sentBefore) params.set('archived_before', sentBefore)
      if (selectedRep !== 'all') params.set('rep_id', selectedRep)

      const url = `/api/admin/pipeline/archive-analytics${params.toString() ? `?${params}` : ''}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setArchiveAnalytics(data)
      }
    } catch (error) {
      console.error('Failed to fetch archive analytics:', error)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [sentAfter, sentBefore, selectedRep])

  // Fetch analytics when tab is opened or filters change
  useEffect(() => {
    if (showArchived && archiveTab === 'analytics') {
      fetchArchiveAnalytics()
    }
  }, [showArchived, archiveTab, fetchArchiveAnalytics])

  const handleRefreshScores = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/pipeline/refresh-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (res.ok && data.success) {
        console.log('[Pipeline] Refresh results:', data.details, data.diagnostics)
        // Show results in an alert
        const diag = data.diagnostics || {}
        const diagInfo = diag.new_history_records !== undefined
          ? `\nNew history records: ${diag.new_history_records}`
          : ''
        alert(
          `Scores refreshed!\n\n` +
          `Processed: ${data.details.processed}\n` +
          `Succeeded: ${data.details.succeeded}\n` +
          `Skipped: ${data.details.skipped}\n` +
          `Failed: ${data.details.failed}\n` +
          `Duration: ${data.details.duration_ms}ms` +
          diagInfo
        )
        // Refetch data after recalculation
        await fetchPipelineData()
      } else {
        console.error('[Pipeline] Refresh failed:', data.error, data.diagnostics)
        alert(`Failed to refresh scores: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to refresh scores:', error)
      alert('Failed to refresh scores. See console for details.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'client_name' ? 'asc' : 'desc')
    }
  }

  const handleSnoozeClick = (deal: PipelineDeal) => {
    setSnoozeDeal(deal)
  }

  const handleSnoozeUpdate = () => {
    setSnoozeDeal(null)
    fetchPipelineData()
  }

  const handleArchiveClick = (deal: PipelineDeal) => {
    setArchiveDeal(deal)
    setArchiveReason('')
    setArchiveNotes('')
  }

  const handleArchiveConfirm = async () => {
    if (!archiveDeal || !archiveReason) return

    // Validate notes required for 'other'
    if (archiveReason === 'other' && !archiveNotes.trim()) {
      alert('Please provide notes when selecting "Other" as the reason')
      return
    }

    setArchiving(true)
    try {
      const res = await fetch(`/api/admin/recommendations/${archiveDeal.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: archiveReason,
          notes: archiveNotes.trim() || null,
        }),
      })
      if (res.ok) {
        setArchiveDeal(null)
        setArchiveReason('')
        setArchiveNotes('')
        fetchPipelineData()
        fetchArchivedDeals()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to archive deal')
      }
    } catch (error) {
      console.error('Failed to archive deal:', error)
      alert('Failed to archive deal')
    } finally {
      setArchiving(false)
    }
  }

  const handleRevive = async (dealId: string) => {
    setReviving(dealId)
    try {
      const res = await fetch(`/api/admin/recommendations/${dealId}/archive`, {
        method: 'DELETE',
      })
      if (res.ok) {
        fetchPipelineData()
        fetchArchivedDeals()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to revive deal')
      }
    } catch (error) {
      console.error('Failed to revive deal:', error)
      alert('Failed to revive deal')
    } finally {
      setReviving(null)
    }
  }

  const sortedDeals = [...deals].sort((a, b) => {
    let aVal: number | string | null = null
    let bVal: number | string | null = null

    switch (sortKey) {
      case 'confidence_score':
        aVal = a.confidence_score ?? -1
        bVal = b.confidence_score ?? -1
        break
      case 'predicted_monthly':
        aVal = a.predicted_monthly
        bVal = b.predicted_monthly
        break
      case 'weighted_monthly':
        aVal = a.weighted_monthly ?? 0
        bVal = b.weighted_monthly ?? 0
        break
      case 'age_days':
        aVal = a.age_days ?? 0
        bVal = b.age_days ?? 0
        break
      case 'sent_at':
        aVal = a.sent_at ?? ''
        bVal = b.sent_at ?? ''
        break
      case 'client_name':
        aVal = a.client_name.toLowerCase()
        bVal = b.client_name.toLowerCase()
        break
    }

    if (aVal === bVal) return 0
    if (aVal === null) return 1
    if (bVal === null) return -1

    const comparison = aVal < bVal ? -1 : 1
    return sortDir === 'asc' ? comparison : -comparison
  })

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null
    return (
      <span style={{ marginLeft: 4, fontSize: 10 }}>
        {sortDir === 'asc' ? '▲' : '▼'}
      </span>
    )
  }

  return (
    <>
      <AdminHeader
        title="Sales Pipeline"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* KPI Cards */}
        <div className="pipeline-kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#059669' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div className="kpi-content">
              <span className="kpi-value">${aggregates.total_weighted_mrr.toLocaleString()}</span>
              <span className="kpi-label">Weighted MRR</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#6B7280' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div className="kpi-content">
              <span className="kpi-value">${aggregates.total_raw_mrr.toLocaleString()}</span>
              <span className="kpi-label">Raw MRR</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: getConfidenceColor(aggregates.pipeline_confidence_pct) === 'green' ? '#059669' : getConfidenceColor(aggregates.pipeline_confidence_pct) === 'yellow' ? '#D97706' : '#DC2626' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <div className="kpi-content">
              <span className="kpi-value">{aggregates.pipeline_confidence_pct}%</span>
              <span className="kpi-label">Pipeline Confidence</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon" style={{ background: '#2563EB' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="kpi-content">
              <span className="kpi-value">{aggregates.deal_count}</span>
              <span className="kpi-label">Active Deals</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pipeline-filters">
          <div className="filter-group">
            <label className="filter-label">Rep</label>
            <select
              className="filter-select"
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
            >
              <option value="all">All Reps</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name || rep.email}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Tier</label>
            <select
              className="filter-select"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
            >
              <option value="all">All Tiers</option>
              <option value="good">Good</option>
              <option value="better">Better</option>
              <option value="best">Best</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Sent After</label>
            <input
              type="date"
              className="filter-input"
              value={sentAfter}
              onChange={(e) => setSentAfter(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Sent Before</label>
            <input
              type="date"
              className="filter-input"
              value={sentBefore}
              onChange={(e) => setSentBefore(e.target.value)}
            />
          </div>

          <button
            className="btn-how-scoring"
            onClick={() => setShowScoringModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            How Scoring Works
          </button>

          <button
            className="btn-refresh"
            onClick={handleRefreshScores}
            disabled={refreshing}
          >
            {refreshing ? (
              <>
                <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                Refresh Scores
              </>
            )}
          </button>
        </div>

        {/* Pipeline Table */}
        <div className="pipeline-table-card">
          <div className="pipeline-table-header">
            <h2>Active Pipeline</h2>
            <div className="pipeline-summary-stats">
              <div className="summary-stat">
                <span className="summary-value">${aggregates.total_weighted_mrr.toLocaleString()}</span>
                <span className="summary-label">Weighted MRR</span>
              </div>
              <div className="summary-stat">
                <span className="summary-value">${aggregates.total_weighted_onetime.toLocaleString()}</span>
                <span className="summary-label">Weighted One-time</span>
              </div>
            </div>
          </div>

          <div className="pipeline-table">
            {loading ? (
              <div className="table-loading">Loading pipeline data...</div>
            ) : sortedDeals.length === 0 ? (
              <div className="table-empty">No active deals in pipeline</div>
            ) : (
              <>
                <div className="pipeline-row pipeline-row-header">
                  <div className="pipeline-col col-client" onClick={() => handleSort('client_name')} style={{ cursor: 'pointer' }}>
                    Client <SortIcon column="client_name" />
                  </div>
                  <div className="pipeline-col col-rep">Rep</div>
                  <div className="pipeline-col col-tier-price">Good</div>
                  <div className="pipeline-col col-tier-price">Better</div>
                  <div className="pipeline-col col-tier-price">Best</div>
                  <div className="pipeline-col col-date" onClick={() => handleSort('sent_at')} style={{ cursor: 'pointer' }}>
                    Sent <SortIcon column="sent_at" />
                  </div>
                  <div className="pipeline-col col-date">Last Comm</div>
                  <div className="pipeline-col col-days" onClick={() => handleSort('age_days')} style={{ cursor: 'pointer' }}>
                    Age <SortIcon column="age_days" />
                  </div>
                  <div className="pipeline-col col-confidence" onClick={() => handleSort('confidence_score')} style={{ cursor: 'pointer' }}>
                    Confidence <SortIcon column="confidence_score" />
                  </div>
                </div>

                {sortedDeals.map((deal) => (
                  <div key={deal.id}>
                    <div
                      className={`pipeline-row ${expandedDealId === deal.id ? 'expanded' : ''}`}
                      onClick={() => setExpandedDealId(expandedDealId === deal.id ? null : deal.id)}
                    >
                      <div className="pipeline-col col-client">
                        <div
                          className="client-avatar"
                          style={{ background: deal.client_avatar_color || getAvatarColor(deal.client_name) }}
                        >
                          {getInitials(deal.client_name)}
                        </div>
                        <div className="client-info">
                          <div className="client-name-row">
                            <span className="client-name">{deal.client_name}</span>
                            {isSnoozed(deal.snoozed_until) && (
                              <span className="snooze-badge" title={deal.snooze_reason || 'Snoozed'}>
                                😴 {getSnoozeRemainingDays(deal.snoozed_until!)}d
                              </span>
                            )}
                          </div>
                          {deal.client_email && (
                            <span className="client-email">{deal.client_email}</span>
                          )}
                        </div>
                      </div>

                      <div className="pipeline-col col-rep">
                        {deal.rep_id ? (
                          <>
                            <div
                              className="rep-avatar"
                              style={{ background: getAvatarColor(deal.rep_id) }}
                            >
                              {getInitials(deal.rep_full_name)}
                            </div>
                            <span className="rep-name">
                              {deal.rep_full_name || '—'}
                            </span>
                          </>
                        ) : (
                          <span className="rep-name muted">—</span>
                        )}
                      </div>

                      <div className="pipeline-col col-tier-price">
                        <span className={`tier-price ${deal.predicted_tier === 'good' ? 'predicted' : ''}`}>
                          {deal.good_monthly !== null && deal.good_monthly > 0
                            ? `$${deal.good_monthly.toLocaleString()}`
                            : '—'}
                        </span>
                      </div>

                      <div className="pipeline-col col-tier-price">
                        <span className={`tier-price ${deal.predicted_tier === 'better' ? 'predicted' : ''}`}>
                          {deal.better_monthly !== null && deal.better_monthly > 0
                            ? `$${deal.better_monthly.toLocaleString()}`
                            : '—'}
                        </span>
                      </div>

                      <div className="pipeline-col col-tier-price">
                        <span className={`tier-price ${deal.predicted_tier === 'best' ? 'predicted' : ''}`}>
                          {deal.best_monthly !== null && deal.best_monthly > 0
                            ? `$${deal.best_monthly.toLocaleString()}`
                            : '—'}
                        </span>
                      </div>

                      <div className="pipeline-col col-date">
                        <span className="date-value">{formatShortDate(deal.sent_at)}</span>
                      </div>

                      <div className="pipeline-col col-date">
                        <span className="date-value">{formatRelativeDate(deal.last_communication_at)}</span>
                      </div>

                      <div className="pipeline-col col-days">
                        <span
                          className={`days-badge ${
                            deal.age_days === null ? '' :
                            deal.age_days <= 5 ? 'green' :
                            deal.age_days <= 15 ? 'yellow' : 'red'
                          }`}
                        >
                          {deal.age_days !== null ? `${deal.age_days}d` : '—'}
                        </span>
                      </div>

                      <div className="pipeline-col col-confidence">
                        <div className="confidence-display">
                          <div className="confidence-meter">
                            <div
                              className={`confidence-fill ${getConfidenceColor(deal.confidence_score)}`}
                              style={{ width: `${deal.confidence_score ?? 0}%` }}
                            />
                          </div>
                          <span className={`confidence-label ${getConfidenceColor(deal.confidence_score)}`}>
                            {deal.confidence_score !== null ? deal.confidence_score : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedDealId === deal.id && (
                      <div className="deal-details">
                        {/* Snooze Banner */}
                        {isSnoozed(deal.snoozed_until) && (
                          <div className="deal-snooze-banner">
                            <span className="snooze-icon">😴</span>
                            <div className="snooze-content">
                              <span className="snooze-title">
                                Deal Snoozed for {getSnoozeRemainingDays(deal.snoozed_until!)} days
                              </span>
                              <span className="snooze-until">
                                Until {formatShortDate(deal.snoozed_until)}
                              </span>
                            </div>
                            {deal.snooze_reason && (
                              <span className="snooze-reason">{deal.snooze_reason}</span>
                            )}
                          </div>
                        )}

                        <div className="details-grid details-grid-4col">
                          {/* Milestones */}
                          <div className="details-section">
                            <h4>Milestones</h4>
                            <div className="milestone-items">
                              <div className="milestone-item">
                                <span className={`milestone-status ${deal.sent_at ? 'complete' : 'pending'}`}>
                                  {deal.sent_at ? '✓' : '○'}
                                </span>
                                <span className="milestone-label">Email Delivered</span>
                                <span className="milestone-date">{formatShortDate(deal.sent_at)}</span>
                              </div>
                              <div className="milestone-item">
                                <span className={`milestone-status ${deal.first_email_opened_at ? 'complete' : 'pending'}`}>
                                  {deal.first_email_opened_at ? '✓' : '○'}
                                </span>
                                <span className="milestone-label">Email Opened</span>
                                <span className="milestone-date">{formatShortDate(deal.first_email_opened_at)}</span>
                              </div>
                              <div className="milestone-item">
                                <span className={`milestone-status ${deal.first_proposal_viewed_at ? 'complete' : 'pending'}`}>
                                  {deal.first_proposal_viewed_at ? '✓' : '○'}
                                </span>
                                <span className="milestone-label">Proposal Viewed</span>
                                <span className="milestone-date">{formatShortDate(deal.first_proposal_viewed_at)}</span>
                              </div>
                              <div className="milestone-item">
                                <span className={`milestone-status ${deal.first_account_created_at ? 'complete' : 'pending'}`}>
                                  {deal.first_account_created_at ? '✓' : '○'}
                                </span>
                                <span className="milestone-label">Account Created</span>
                                <span className="milestone-date">{formatShortDate(deal.first_account_created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Call Scores */}
                          <div className="details-section">
                            <h4>Call Factors {!deal.call_budget_clarity && <span className="not-set">(Not Set)</span>}</h4>
                            <div className="call-score-items">
                              <div className="call-score-item">
                                <span className="call-score-label">Budget Clarity</span>
                                <span className={`call-score-value ${deal.call_budget_clarity ? getCallScoreClass('budget', deal.call_budget_clarity) : 'muted'}`}>
                                  {formatCallScore(deal.call_budget_clarity)}
                                </span>
                              </div>
                              <div className="call-score-item">
                                <span className="call-score-label">Competition</span>
                                <span className={`call-score-value ${deal.call_competition ? getCallScoreClass('competition', deal.call_competition) : 'muted'}`}>
                                  {formatCallScore(deal.call_competition)}
                                </span>
                              </div>
                              <div className="call-score-item">
                                <span className="call-score-label">Engagement</span>
                                <span className={`call-score-value ${deal.call_engagement ? getCallScoreClass('engagement', deal.call_engagement) : 'muted'}`}>
                                  {formatCallScore(deal.call_engagement)}
                                </span>
                              </div>
                              <div className="call-score-item">
                                <span className="call-score-label">Plan Fit</span>
                                <span className={`call-score-value ${deal.call_plan_fit ? getCallScoreClass('plan_fit', deal.call_plan_fit) : 'muted'}`}>
                                  {formatCallScore(deal.call_plan_fit)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Score Breakdown */}
                          <div className="details-section">
                            <h4>Score Breakdown</h4>
                            <div className="score-items">
                              <div className="score-item">
                                <span className="score-label">Base Score</span>
                                <span className="score-value">{deal.base_score ?? '50'}</span>
                              </div>
                              {deal.penalty_email_not_opened !== null && deal.penalty_email_not_opened > 0 && (
                                <div className="score-item">
                                  <span className="score-label">Email Not Opened</span>
                                  <span className="score-value negative">−{deal.penalty_email_not_opened.toFixed(1)}</span>
                                </div>
                              )}
                              {deal.penalty_proposal_not_viewed !== null && deal.penalty_proposal_not_viewed > 0 && (
                                <div className="score-item">
                                  <span className="score-label">Proposal Not Viewed</span>
                                  <span className="score-value negative">−{deal.penalty_proposal_not_viewed.toFixed(1)}</span>
                                </div>
                              )}
                              {deal.penalty_silence !== null && deal.penalty_silence > 0 && (
                                <div className="score-item">
                                  <span className="score-label">
                                    Silence {deal.followup_count_since_last_reply > 0 && (
                                      <span className="followup-badge">+{deal.followup_count_since_last_reply} follow-ups</span>
                                    )}
                                  </span>
                                  <span className="score-value negative">−{deal.penalty_silence.toFixed(1)}</span>
                                </div>
                              )}
                              {deal.total_bonus !== null && deal.total_bonus > 0 && (
                                <div className="score-item">
                                  <span className="score-label">Multi-invite Bonus</span>
                                  <span className="score-value positive">+{deal.total_bonus}</span>
                                </div>
                              )}
                              <div className="score-item total">
                                <span className="score-label">Final Score</span>
                                <span className={`score-value ${getConfidenceColor(deal.confidence_score)}`}>
                                  {deal.confidence_score ?? '—'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="details-section">
                            <h4>Pricing</h4>
                            <div className="pricing-items">
                              <div className="pricing-item">
                                <span className="pricing-label">Predicted Tier</span>
                                <span className="pricing-value" style={{ color: getTierColor(deal.predicted_tier) }}>
                                  {getTierLabel(deal.predicted_tier)}
                                </span>
                              </div>
                              <div className="pricing-item">
                                <span className="pricing-label">Monthly</span>
                                <span className="pricing-value">${deal.predicted_monthly.toLocaleString()}/mo</span>
                              </div>
                              <div className="pricing-item">
                                <span className="pricing-label">One-time</span>
                                <span className="pricing-value">${deal.predicted_onetime.toLocaleString()}</span>
                              </div>
                              <div className="pricing-item weighted">
                                <span className="pricing-label">Weighted MRR</span>
                                <span className="pricing-value">
                                  ${deal.weighted_monthly?.toLocaleString() ?? '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Score History Tabs */}
                        <div className="details-section details-section-full">
                          <div className="history-tabs">
                            <button
                              className={`history-tab ${historyTab === 'chart' ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setHistoryTab('chart'); }}
                            >
                              Score History
                            </button>
                            <button
                              className={`history-tab ${historyTab === 'audit' ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setHistoryTab('audit'); }}
                            >
                              Audit Log
                            </button>
                          </div>
                          {historyTab === 'chart' ? (
                            <ScoreHistoryChart recommendationId={deal.id} height={180} />
                          ) : (
                            <div className="audit-container">
                              <ScoreAuditFeed recommendationId={deal.id} />
                            </div>
                          )}
                        </div>

                        <div className="details-actions">
                          <a
                            href={`/admin/recommendation-builder/${deal.client_id}`}
                            className="btn-view-recommendation"
                          >
                            View Recommendation
                          </a>
                          <button
                            className="btn-snooze-deal"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSnoozeClick(deal)
                            }}
                          >
                            {isSnoozed(deal.snoozed_until) ? 'Manage Snooze' : 'Snooze Deal'}
                          </button>
                          <button
                            className="btn-archive-deal"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveClick(deal)
                            }}
                          >
                            Archive Deal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Archived Section */}
        <div className="archived-section">
          <button
            className="archived-toggle"
            onClick={() => setShowArchived(!showArchived)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={showArchived ? 'chevron-open' : ''}
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span>Archived Deals</span>
            {archivedDeals.length > 0 && (
              <>
                <span className="archived-count">{archivedDeals.length}</span>
                <span className="archived-lost-stats">
                  Lost: ${archivedDeals.reduce((sum, d) => sum + d.predicted_monthly, 0).toLocaleString()}/mo
                  {archivedDeals.reduce((sum, d) => sum + d.predicted_onetime, 0) > 0 && (
                    <> + ${archivedDeals.reduce((sum, d) => sum + d.predicted_onetime, 0).toLocaleString()} one-time</>
                  )}
                </span>
              </>
            )}
          </button>

          {showArchived && (
            <div className="archived-content">
              {/* Tab Navigation */}
              <div className="archive-tabs">
                <button
                  className={`archive-tab ${archiveTab === 'deals' ? 'active' : ''}`}
                  onClick={() => setArchiveTab('deals')}
                >
                  Deals
                </button>
                <button
                  className={`archive-tab ${archiveTab === 'analytics' ? 'active' : ''}`}
                  onClick={() => setArchiveTab('analytics')}
                >
                  Reasons Lost
                </button>
              </div>

              {/* Deals Tab */}
              {archiveTab === 'deals' && (
                <div className="archived-list">
                  {archivedDeals.length === 0 ? (
                    <p className="archived-empty">No archived deals</p>
                  ) : (
                    <table className="archived-table">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th>Reason</th>
                          <th>Archived</th>
                          <th>Last Score</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedDeals.map((deal) => (
                          <tr key={deal.id}>
                            <td>
                              <div className="archived-client">
                                <div
                                  className="archived-avatar"
                                  style={{ background: deal.client_avatar_color || getAvatarColor(deal.client_id) }}
                                >
                                  {getInitials(deal.client_name)}
                                </div>
                                <span>{deal.client_name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="archived-reason-badge">
                                {deal.archive_reason === 'other' && deal.archive_notes
                                  ? `Other — ${deal.archive_notes}`
                                  : deal.archive_reason
                                    ? ARCHIVE_REASON_LABELS[deal.archive_reason]
                                    : '—'}
                              </span>
                            </td>
                            <td className="archived-date">
                              {deal.archived_at ? formatRelativeDate(deal.archived_at) : '—'}
                            </td>
                            <td className="archived-score">
                              {deal.confidence_score !== null ? deal.confidence_score : '—'}
                            </td>
                            <td>
                              <button
                                className="btn-revive"
                                onClick={() => handleRevive(deal.id)}
                                disabled={reviving === deal.id}
                              >
                                {reviving === deal.id ? 'Reviving...' : 'Revive'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {archiveTab === 'analytics' && (
                <div className="archive-analytics">
                  {analyticsLoading ? (
                    <div className="analytics-loading">Loading analytics...</div>
                  ) : !archiveAnalytics || archiveAnalytics.total_archived === 0 ? (
                    <div className="analytics-empty">
                      <p>No archived deals in this period.</p>
                      <p className="analytics-empty-sub">Deals that are archived will appear here with analytics on why they were lost.</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary Cards */}
                      <div className="analytics-summary-cards">
                        <div className="analytics-card">
                          <div className="analytics-card-value">{archiveAnalytics.total_archived}</div>
                          <div className="analytics-card-label">Total Archived</div>
                          <div className="analytics-card-sub">in selected period</div>
                        </div>
                        <div className="analytics-card">
                          <div className="analytics-card-value">${archiveAnalytics.lost_mrr.toLocaleString()}/mo</div>
                          <div className="analytics-card-label">Lost MRR</div>
                          {archiveAnalytics.lost_onetime > 0 && (
                            <div className="analytics-card-sub">+ ${archiveAnalytics.lost_onetime.toLocaleString()} one-time</div>
                          )}
                        </div>
                        <div className="analytics-card">
                          <div className="analytics-card-value">{archiveAnalytics.avg_days_to_archive}</div>
                          <div className="analytics-card-label">Avg Days to Close</div>
                          <div className="analytics-card-sub">from proposal sent</div>
                        </div>
                        <div className="analytics-card">
                          <div className="analytics-card-value">
                            {archiveAnalytics.top_reason ? ARCHIVE_REASON_LABELS[archiveAnalytics.top_reason] : '—'}
                          </div>
                          <div className="analytics-card-label">Top Reason</div>
                          <div className="analytics-card-sub">{archiveAnalytics.top_reason_percentage}% of losses</div>
                        </div>
                      </div>

                      {/* Charts Row */}
                      <div className="analytics-charts-row">
                        {/* Donut Chart */}
                        <div className="analytics-chart-container">
                          <h4 className="analytics-chart-title">Reasons by Count</h4>
                          <div className="analytics-donut-wrapper">
                            <ResponsiveContainer width="100%" height={280}>
                              <PieChart>
                                <Pie
                                  data={archiveAnalytics.reasons_breakdown}
                                  dataKey="count"
                                  nameKey="reason"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={100}
                                  paddingAngle={2}
                                  onClick={(data) => {
                                    if (reasonFilter === data.reason) {
                                      setReasonFilter(null)
                                    } else {
                                      setReasonFilter(data.reason)
                                    }
                                  }}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {archiveAnalytics.reasons_breakdown.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={ARCHIVE_REASON_COLORS[entry.reason]}
                                      stroke={reasonFilter === entry.reason ? '#000' : 'none'}
                                      strokeWidth={reasonFilter === entry.reason ? 2 : 0}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      const data = payload[0].payload
                                      return (
                                        <div className="analytics-tooltip">
                                          <strong>{ARCHIVE_REASON_LABELS[data.reason as ArchiveReason]}</strong>
                                          <div>{data.count} deals (${data.mrr_lost.toLocaleString()}/mo lost)</div>
                                        </div>
                                      )
                                    }
                                    return null
                                  }}
                                />
                                <Legend
                                  verticalAlign="bottom"
                                  height={36}
                                  formatter={(value: string) => ARCHIVE_REASON_LABELS[value as ArchiveReason] || value}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="donut-center-label">
                              <span className="donut-center-value">{archiveAnalytics.total_archived}</span>
                              <span className="donut-center-text">Total</span>
                            </div>
                          </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="analytics-chart-container">
                          <h4 className="analytics-chart-title">Lost MRR by Reason</h4>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart
                              data={[...archiveAnalytics.reasons_breakdown].sort((a, b) => b.mrr_lost - a.mrr_lost)}
                              layout="vertical"
                              margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                            >
                              <XAxis type="number" tickFormatter={(v) => `$${v.toLocaleString()}`} />
                              <YAxis
                                type="category"
                                dataKey="reason"
                                tickFormatter={(v) => ARCHIVE_REASON_LABELS[v as ArchiveReason] || v}
                                width={75}
                              />
                              <Tooltip
                                formatter={(value) => [`$${(value as number)?.toLocaleString() ?? 0}/mo`, 'Lost MRR']}
                                labelFormatter={(label) => ARCHIVE_REASON_LABELS[label as ArchiveReason] || label}
                              />
                              <Bar dataKey="mrr_lost" radius={[0, 4, 4, 0]}>
                                {archiveAnalytics.reasons_breakdown.map((entry, index) => (
                                  <Cell key={`bar-${index}`} fill={ARCHIVE_REASON_COLORS[entry.reason]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Filtered Table */}
                      <div className="analytics-filtered-table">
                        {reasonFilter && (
                          <div className="filter-badge-row">
                            <span className="filter-badge">
                              Showing: {ARCHIVE_REASON_LABELS[reasonFilter]}
                              <button onClick={() => setReasonFilter(null)} className="filter-badge-clear">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </span>
                          </div>
                        )}
                        <table className="archived-table">
                          <thead>
                            <tr>
                              <th>Client</th>
                              <th>Reason</th>
                              <th>MRR</th>
                              <th>Archived</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {archivedDeals
                              .filter((deal) => !reasonFilter || deal.archive_reason === reasonFilter)
                              .map((deal) => (
                                <tr key={deal.id}>
                                  <td>
                                    <div className="archived-client">
                                      <div
                                        className="archived-avatar"
                                        style={{ background: deal.client_avatar_color || getAvatarColor(deal.client_id) }}
                                      >
                                        {getInitials(deal.client_name)}
                                      </div>
                                      <span>{deal.client_name}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className="archived-reason-badge clickable"
                                      style={{ backgroundColor: deal.archive_reason ? ARCHIVE_REASON_COLORS[deal.archive_reason] + '20' : undefined }}
                                      onClick={() => deal.archive_reason && setReasonFilter(deal.archive_reason)}
                                    >
                                      {deal.archive_reason === 'other' && deal.archive_notes
                                        ? `Other — ${deal.archive_notes}`
                                        : deal.archive_reason
                                          ? ARCHIVE_REASON_LABELS[deal.archive_reason]
                                          : '—'}
                                    </span>
                                  </td>
                                  <td className="archived-mrr">
                                    ${deal.predicted_monthly.toLocaleString()}/mo
                                  </td>
                                  <td className="archived-date">
                                    {deal.archived_at ? formatRelativeDate(deal.archived_at) : '—'}
                                  </td>
                                  <td>
                                    <button
                                      className="btn-revive"
                                      onClick={() => handleRevive(deal.id)}
                                      disabled={reviving === deal.id}
                                    >
                                      {reviving === deal.id ? 'Reviving...' : 'Revive'}
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* How Scoring Works Modal */}
        {showScoringModal && (
          <div className="scoring-modal-overlay" onClick={() => setShowScoringModal(false)}>
            <div className="scoring-modal" onClick={(e) => e.stopPropagation()}>
              <div className="scoring-modal-header">
                <h2>How Pipeline Confidence Scoring Works</h2>
                <button className="scoring-modal-close" onClick={() => setShowScoringModal(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="scoring-modal-body">
                <section className="scoring-section">
                  <h3>Overview</h3>
                  <p>
                    The confidence score (0–100) estimates how likely a deal is to close based on rep inputs,
                    prospect engagement, and time-based signals. It&apos;s used to calculate Weighted MRR:
                  </p>
                  <p className="scoring-formula-highlight">
                    <strong>Weighted MRR = Monthly Amount × (Confidence Score ÷ 100)</strong>
                  </p>
                  <p>
                    This gives leadership a realistic pipeline value instead of raw totals. A $500/mo deal at 80% confidence
                    contributes $400 in weighted MRR. A $500/mo deal at 20% confidence contributes $100.
                  </p>
                  <p>
                    Scores recalculate automatically whenever a scoring event occurs (call score updated, communication logged,
                    email opened, etc.) and once daily at midnight CST (6:00 AM UTC) to apply time-based decay.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Base Score (0–100 points)</h3>
                  <p>
                    After a discovery or sales call, reps rate four factors. The average becomes the base score.
                  </p>
                  <div className="scoring-factors">
                    <div className="scoring-factor">
                      <span className="factor-name">Budget Clarity <span className="factor-weight">(25% of base)</span></span>
                      <ul className="factor-options">
                        <li><strong>Clear</strong> — They have budget and told you the amount (100%)</li>
                        <li><strong>Vague</strong> — They have budget but were fuzzy on the number (50%)</li>
                        <li><strong>Unknown</strong> — Budget hasn&apos;t been discussed yet (20%)</li>
                        <li><strong>No Budget</strong> — They explicitly said they have no budget (0%)</li>
                      </ul>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Competition <span className="factor-weight">(20% of base)</span></span>
                      <ul className="factor-options">
                        <li><strong>None</strong> — We&apos;re the only option they&apos;re considering (100%)</li>
                        <li><strong>Some</strong> — They&apos;re comparing a few options (50%)</li>
                        <li><strong>Many</strong> — Competitive situation with multiple vendors (15%)</li>
                      </ul>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Engagement <span className="factor-weight">(25% of base)</span></span>
                      <ul className="factor-options">
                        <li><strong>High</strong> — Responsive, asking questions, driving the process (100%)</li>
                        <li><strong>Medium</strong> — Engaged but not urgent, responding at their pace (70%)</li>
                        <li><strong>Low</strong> — Slow to respond, minimal interest signals (15%)</li>
                      </ul>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Plan Fit <span className="factor-weight">(30% of base)</span></span>
                      <ul className="factor-options">
                        <li><strong>Strong</strong> — Perfect fit, we solve their exact problems (100%)</li>
                        <li><strong>Medium</strong> — Good fit with some gaps (65%)</li>
                        <li><strong>Weak</strong> — Partial fit, significant gaps (25%)</li>
                        <li><strong>Poor</strong> — Fundamental mismatch (0%)</li>
                      </ul>
                    </div>
                  </div>
                  <p className="scoring-note">
                    If no call score has been entered, the base defaults to <strong>50</strong>.
                  </p>
                  <p className="scoring-example">
                    <strong>Example:</strong> Budget=Clear (25), Competition=None (20), Engagement=Medium (17.5), Plan Fit=Medium (19.5) → Base = <strong>82</strong>
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Tier Multiplier</h3>
                  <p>The predicted closing tier adjusts the base score:</p>
                  <ul className="scoring-list">
                    <li><strong>Good:</strong> ×0.85 (lower deal value = slightly less confidence weight)</li>
                    <li><strong>Better:</strong> ×1.00 (neutral)</li>
                    <li><strong>Best:</strong> ×1.15 (higher deal value = slightly more confidence weight)</li>
                  </ul>
                </section>

                <section className="scoring-section">
                  <h3>Milestone Bonuses (up to +15 points)</h3>
                  <p>Points awarded when prospects hit engagement milestones:</p>
                  <ul className="scoring-list">
                    <li><span className="bonus">+3</span> Email Opened</li>
                    <li><span className="bonus">+5</span> Proposal Viewed</li>
                    <li><span className="bonus">+7</span> Account Created</li>
                  </ul>
                  <p className="scoring-note">
                    These are one-time bonuses — they don&apos;t go away once earned.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Time-Based Penalties</h3>
                  <p>Penalties accumulate daily when expected engagement doesn&apos;t happen. These are tuned for a 45–60 day sales cycle.</p>
                  <table className="scoring-table">
                    <thead>
                      <tr>
                        <th>Signal</th>
                        <th>Grace Period</th>
                        <th>Penalty Rate</th>
                        <th>Maximum</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Email not opened</td>
                        <td>48 hours</td>
                        <td className="penalty">−0.5/day</td>
                        <td className="penalty">−25</td>
                      </tr>
                      <tr>
                        <td>Proposal not viewed</td>
                        <td>5 days</td>
                        <td className="penalty">−0.5/day</td>
                        <td className="penalty">−20</td>
                      </tr>
                      <tr>
                        <td>No prospect reply (silence)</td>
                        <td>10 days</td>
                        <td className="penalty">−1.2/day</td>
                        <td className="penalty">−60</td>
                      </tr>
                      <tr>
                        <td>Excessive follow-ups</td>
                        <td>After 3+ unanswered</td>
                        <td className="penalty">−5 each</td>
                        <td className="penalty">−25</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="scoring-note">
                    <strong>Grace periods</strong> mean no penalty accumulates during that window — prospects need time to respond.
                  </p>
                  <p className="scoring-note">
                    <strong>Silence</strong> is the biggest factor. Any inbound communication from the prospect resets the silence timer completely, giving the deal a fresh runway.
                  </p>
                  <p className="scoring-note">
                    <strong>Excessive follow-ups</strong> trigger when you&apos;ve sent 3+ outbound messages with no inbound reply. Each additional unanswered follow-up costs 5 points. A single prospect reply resets this counter.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Quick Response Bonus</h3>
                  <p>
                    If the prospect replies within 48 hours of the invite being sent: <span className="bonus">+10 points</span>
                  </p>
                  <p className="scoring-note">
                    This rewards deals where the prospect is immediately engaged.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Snoozing Deals</h3>
                  <p>
                    When a prospect indicates interest but needs time — budget cycles, internal approvals, seasonal timing,
                    &quot;call me back in 30 days&quot; — reps can <strong>snooze</strong> a deal until a specific date.
                  </p>
                  <h4>During the snooze:</h4>
                  <ul className="scoring-list">
                    <li>All time-based penalties are frozen at zero — the score won&apos;t decay</li>
                    <li>Base score, milestone bonuses, and tier multiplier remain active</li>
                    <li>The deal shows a ⏸️ indicator on the dashboard</li>
                    <li>Daily recalculations still run but penalties evaluate to zero</li>
                  </ul>
                  <h4>When the snooze expires:</h4>
                  <ul className="scoring-list">
                    <li>Penalty clocks restart from zero, as if the deal was freshly sent</li>
                    <li>The prospect gets a full fresh runway (up to 60 days before full decay)</li>
                  </ul>
                  <h4>When to snooze:</h4>
                  <ul className="scoring-list do-list">
                    <li>✅ Prospect explicitly communicated a timeline (&quot;Let&apos;s revisit in March&quot;)</li>
                    <li>✅ Known budget cycle or approval process with a target date</li>
                    <li>✅ Seasonal business — they&apos;ll be ready after a specific event or date</li>
                  </ul>
                  <h4>When NOT to snooze:</h4>
                  <ul className="scoring-list dont-list">
                    <li>❌ Prospect went silent and you&apos;re hoping they&apos;ll come back — archive it instead</li>
                    <li>❌ You don&apos;t want the score to drop — that&apos;s what the score is designed to show</li>
                    <li>❌ No specific date in mind — if there&apos;s no timeline, the deal should reflect that</li>
                  </ul>
                </section>

                <section className="scoring-section">
                  <h3>Archiving Deals</h3>
                  <p>
                    When a deal is truly dead, archive it with a reason. This removes it from the active pipeline and stops daily recalculations.
                  </p>
                  <h4>Archive reasons:</h4>
                  <ul className="scoring-list archive-reasons">
                    <li><strong>Went Dark</strong> — stopped responding</li>
                    <li><strong>Budget</strong> — can&apos;t afford it or budget got cut</li>
                    <li><strong>Timing</strong> — not now, no specific date</li>
                    <li><strong>Chose Competitor</strong> — went with another vendor</li>
                    <li><strong>Handling In-House</strong> — doing it internally</li>
                    <li><strong>Not a Fit</strong> — services don&apos;t match needs</li>
                    <li><strong>Key Contact Left</strong> — champion left or changed roles</li>
                    <li><strong>Business Closed</strong> — company shut down or pivoted</li>
                    <li><strong>Duplicate</strong> — already exists elsewhere</li>
                    <li><strong>Other</strong> — with notes</li>
                  </ul>
                  <h4>Archived deals:</h4>
                  <ul className="scoring-list">
                    <li>Stop counting toward pipeline KPIs (weighted MRR, deal count, avg confidence)</li>
                    <li>Stop receiving daily score recalculations</li>
                    <li>Preserve their full history (score timeline, audit log, communications)</li>
                    <li>Appear in the Archived section with analytics on reasons lost</li>
                  </ul>
                  <p className="scoring-note">
                    <strong>Reasons Lost analytics</strong> — The &quot;Reasons Lost&quot; tab on the archived section shows a breakdown of why deals were lost, including total lost MRR by reason. Use this to spot patterns (e.g., losing too many deals to budget may signal a pricing issue).
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Reviving Deals</h3>
                  <p>
                    When a prospect resurfaces after being archived — even months later — revive the deal instead of creating a new recommendation. This preserves the full history while giving the deal a fresh start.
                  </p>
                  <h4>What happens on revival:</h4>
                  <ul className="scoring-list">
                    <li>The deal moves back to the active pipeline</li>
                    <li>All time-based penalties reset to zero (fresh runway from today)</li>
                    <li>Call scores are preserved — the base score returns to its original post-call value</li>
                    <li>Milestone bonuses from previous engagement are preserved</li>
                    <li>Score history shows the full lifecycle including the archive gap</li>
                  </ul>
                  <p className="scoring-example">
                    <strong>Example:</strong> A deal archived at score 12 after 45 days of silence. Prospect emails back 3 months later.
                    Revive the deal → score returns to ~82 (original call score with zero penalties) → fresh 60-day runway begins.
                  </p>
                  <p className="scoring-note">
                    Don&apos;t create a new recommendation for a revived prospect — revive the original to keep the complete story in one place.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Terminal Statuses</h3>
                  <ul className="scoring-list">
                    <li><strong>Accepted:</strong> Score fixed at <span className="bonus">100</span> (deal won)</li>
                    <li><strong>Closed Lost:</strong> Score fixed at <span className="penalty">0</span> (deal lost)</li>
                  </ul>
                  <p className="scoring-note">
                    These override all other calculations. Use &quot;Accepted&quot; when the deal closes. Use &quot;Closed Lost&quot; when it&apos;s definitively lost (different from archiving — closed lost is a final outcome, archived is removing from active pipeline).
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Score Calculation Summary</h3>
                  <div className="scoring-formula">
                    <code>Adjusted Base = (Call Score Average) × (Tier Multiplier)</code>
                    <code>Bonuses = Milestone Bonuses + Quick Response Bonus</code>
                    <code>Penalties = Email + Proposal + Silence + Follow-ups</code>
                    <code className="formula-note">(0 if snoozed or revived today)</code>
                    <code>Raw Score = Adjusted Base + Bonuses − Penalties</code>
                    <code>Final Score = clamp(0, 100)</code>
                    <code>Weighted MRR = Monthly Amount × (Final Score ÷ 100)</code>
                  </div>
                </section>

                <section className="scoring-section">
                  <h3>Degradation Example</h3>
                  <p>
                    A deal scored at 82 (good discovery call, Best tier) where the prospect viewed the proposal but hasn&apos;t responded:
                  </p>
                  <table className="scoring-table degradation-table">
                    <thead>
                      <tr>
                        <th>Timeline</th>
                        <th>Score</th>
                        <th>What&apos;s happening</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Week 1</td>
                        <td>~78</td>
                        <td>Grace periods active, minimal penalties</td>
                      </tr>
                      <tr>
                        <td>Week 2–3</td>
                        <td>~61</td>
                        <td>Silence and email penalties accumulating</td>
                      </tr>
                      <tr>
                        <td>Week 4</td>
                        <td>~44</td>
                        <td>Steady decline, deal cooling</td>
                      </tr>
                      <tr>
                        <td>Week 6</td>
                        <td>~27</td>
                        <td>Deal at risk</td>
                      </tr>
                      <tr>
                        <td>Week 8</td>
                        <td>~10</td>
                        <td>Near zero without engagement</td>
                      </tr>
                      <tr>
                        <td>~Day 60</td>
                        <td>0</td>
                        <td>Full decay — no engagement for 60 days</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="scoring-highlight">
                    <strong>A single prospect reply at any point resets the silence penalty and can recover 30+ points instantly.</strong>
                  </p>
                  <p className="scoring-note">
                    If the prospect says &quot;I need 30 days,&quot; snooze the deal. If they go completely dark, archive it. If they come back later, revive it.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Deal Lifecycle</h3>
                  <p>A typical deal flows through these stages:</p>
                  <div className="lifecycle-flow">
                    <div className="lifecycle-stage">
                      <strong>Active</strong>
                      <span>Rep fills out call scores, prospect engages, score reflects reality</span>
                    </div>
                    <div className="lifecycle-arrow">↓</div>
                    <div className="lifecycle-stage optional">
                      <strong>Snooze</strong> <span className="optional-tag">(optional)</span>
                      <span>Prospect needs time, score freezes, resumes on target date</span>
                    </div>
                    <div className="lifecycle-arrow">↓</div>
                    <div className="lifecycle-branch">
                      <div className="lifecycle-stage won">
                        <strong>Accepted</strong> <span className="status-tag">(won)</span>
                        <span>Score locks at 100 ✅</span>
                      </div>
                      <div className="lifecycle-or">— or —</div>
                      <div className="lifecycle-stage lost">
                        <strong>Archived</strong> <span className="status-tag">(lost/stale)</span>
                        <span>Removed from active pipeline with a reason</span>
                      </div>
                    </div>
                    <div className="lifecycle-arrow">↓</div>
                    <div className="lifecycle-stage optional">
                      <strong>Revived</strong> <span className="optional-tag">(optional)</span>
                      <span>Prospect resurfaces, deal returns to active with fresh scoring</span>
                    </div>
                  </div>
                </section>

                <section className="scoring-section tips-section">
                  <h3>Tips for Reps</h3>
                  <ul className="scoring-list tips-list">
                    <li><strong>Fill out call scores after every discovery call</strong> — it replaces the default 50 with your actual read on the deal and usually boosts the score significantly</li>
                    <li><strong>Log inbound communications</strong> to reset the silence penalty — even a short &quot;still interested&quot; email counts</li>
                    <li><strong>Use snooze</strong> when prospects give you a specific timeline — don&apos;t let good deals decay unnecessarily</li>
                    <li><strong>Don&apos;t over-follow-up</strong> — 3+ unanswered outbound messages starts costing points</li>
                    <li><strong>Archive dead deals</strong> with the right reason — this feeds the Reasons Lost analytics and keeps the active pipeline clean</li>
                    <li><strong>Revive, don&apos;t recreate</strong> — when a prospect comes back, revive the archived deal to keep the full history</li>
                    <li><strong>Deals over 30 days old with no engagement</strong> will be trending toward zero — follow up, snooze with a reason, or archive them</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Snooze Modal */}
        {snoozeDeal && (
          <div className="snooze-modal-overlay" onClick={() => setSnoozeDeal(null)}>
            <div className="snooze-modal" onClick={(e) => e.stopPropagation()}>
              <div className="snooze-modal-header">
                <h2>{isSnoozed(snoozeDeal.snoozed_until) ? 'Manage Snooze' : 'Snooze Deal'}</h2>
                <span className="snooze-modal-client">{snoozeDeal.client_name}</span>
                <button className="snooze-modal-close" onClick={() => setSnoozeDeal(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="snooze-modal-body">
                <SnoozeDealForm
                  recommendationId={snoozeDeal.id}
                  currentSnooze={snoozeDeal.snoozed_until ? {
                    snoozed_until: snoozeDeal.snoozed_until,
                    reason: snoozeDeal.snooze_reason,
                  } : null}
                  onUpdate={handleSnoozeUpdate}
                />
              </div>
            </div>
          </div>
        )}

        {/* Archive Modal */}
        {archiveDeal && (
          <div className="archive-modal-overlay" onClick={() => setArchiveDeal(null)}>
            <div className="archive-modal" onClick={(e) => e.stopPropagation()}>
              <div className="archive-modal-header">
                <h2>Archive Deal</h2>
                <span className="archive-modal-client">{archiveDeal.client_name}</span>
                <button className="archive-modal-close" onClick={() => setArchiveDeal(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="archive-modal-body">
                <p className="archive-description">
                  Archived deals are removed from the active pipeline and will no longer be scored.
                  You can revive them later if the opportunity becomes active again.
                </p>
                <label className="archive-reason-label">
                  Reason *
                  <select
                    className="archive-reason-select"
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value as ArchiveReason | '')}
                  >
                    <option value="">Select a reason...</option>
                    {ARCHIVE_REASON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.description}
                      </option>
                    ))}
                  </select>
                </label>
                {archiveReason === 'other' && (
                  <label className="archive-notes-label">
                    Notes *
                    <textarea
                      className="archive-notes-input"
                      value={archiveNotes}
                      onChange={(e) => setArchiveNotes(e.target.value)}
                      placeholder="Tell us why..."
                      rows={3}
                    />
                  </label>
                )}
                <div className="archive-modal-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setArchiveDeal(null)}
                    disabled={archiving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-confirm-archive"
                    onClick={handleArchiveConfirm}
                    disabled={archiving || !archiveReason || (archiveReason === 'other' && !archiveNotes.trim())}
                  >
                    {archiving ? 'Archiving...' : 'Archive Deal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </>
  )
}
