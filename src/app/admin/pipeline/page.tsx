'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/layout'
import { ScoreHistoryChart } from '@/components/pipeline/score-history-chart'
import { ScoreAuditFeed } from '@/components/pipeline/score-audit-feed'
import type {
  PipelineDeal,
  PipelineAggregates,
  PipelineRep,
  PipelineFilters,
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

export default function PipelineDashboardPage() {
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

  const handleRefreshScores = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/cron/pipeline-scores', {
        method: 'POST',
        headers: { 'x-vercel-cron': 'true' },
      })
      if (res.ok) {
        // Refetch data after recalculation
        await fetchPipelineData()
      }
    } catch (error) {
      console.error('Failed to refresh scores:', error)
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
        user={{ name: 'Admin', initials: 'A' }}
        hasNotifications={false}
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
                          <span className="client-name">{deal.client_name}</span>
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
                            href={`/admin/recommendations?client=${deal.client_id}`}
                            className="btn-view-recommendation"
                          >
                            View Recommendation
                          </a>
                          <a
                            href={`/admin/clients/${deal.client_id}`}
                            className="btn-view-client"
                          >
                            View Client
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
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
                    prospect engagement, and time-based signals. It&apos;s used to calculate <strong>Weighted MRR</strong> (Monthly × Score%),
                    giving leadership a realistic pipeline value instead of raw totals.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Base Score (0–100 points)</h3>
                  <p>
                    The base comes from the rep&apos;s <strong>call scoring</strong> — four factors rated after discovery/sales calls.
                    Each factor is weighted and multiplied by its score:
                  </p>
                  {/* Values from default-config.ts - update if config changes */}
                  <div className="scoring-factors">
                    <div className="scoring-factor">
                      <span className="factor-name">Budget Clarity <span className="factor-weight">(25%)</span></span>
                      <span className="factor-values">Clear (100%) → Vague (50%) → None (20%) → No Budget (0%)</span>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Competition <span className="factor-weight">(20%)</span></span>
                      <span className="factor-values">None (100%) → Some (50%) → Many (15%)</span>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Engagement <span className="factor-weight">(25%)</span></span>
                      <span className="factor-values">High (100%) → Medium (55%) → Low (15%)</span>
                    </div>
                    <div className="scoring-factor">
                      <span className="factor-name">Plan Fit <span className="factor-weight">(30%)</span></span>
                      <span className="factor-values">Strong (100%) → Medium (60%) → Weak (25%) → Poor (0%)</span>
                    </div>
                  </div>
                  <p className="scoring-note">
                    If no call score is entered, the base defaults to <strong>50</strong>.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Multi-Invite Bonuses</h3>
                  <p>When multiple decision-makers are invited and all engage:</p>
                  {/* Values from default-config.ts multi_invite_bonus */}
                  <ul className="scoring-list">
                    <li><span className="bonus">+3</span> if all invitees opened the email</li>
                    <li><span className="bonus">+5</span> if all invitees viewed the proposal</li>
                  </ul>
                </section>

                <section className="scoring-section">
                  <h3>Time-Based Penalties</h3>
                  <p>Penalties accumulate daily after the grace period until reaching the max:</p>
                  {/* Values from default-config.ts penalties */}
                  <table className="scoring-table">
                    <thead>
                      <tr>
                        <th>Penalty</th>
                        <th>Rate</th>
                        <th>Starts After</th>
                        <th>Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Email not opened</td>
                        <td className="penalty">−2.5/day</td>
                        <td>24 hours</td>
                        <td className="penalty">−35</td>
                      </tr>
                      <tr>
                        <td>Proposal not viewed</td>
                        <td className="penalty">−2/day</td>
                        <td>48 hours</td>
                        <td className="penalty">−25</td>
                      </tr>
                      <tr>
                        <td>Silence (no prospect reply)</td>
                        <td className="penalty">−3/day</td>
                        <td>5 days</td>
                        <td className="penalty">−80</td>
                      </tr>
                      <tr>
                        <td>Silence + 2+ follow-ups</td>
                        <td className="penalty">−4.5/day</td>
                        <td>5 days</td>
                        <td className="penalty">−80</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="scoring-note">
                    The silence penalty accelerates by 1.5× after 2+ unanswered follow-ups.
                  </p>
                </section>

                <section className="scoring-section">
                  <h3>Terminal Statuses</h3>
                  <ul className="scoring-list">
                    <li><strong>Accepted:</strong> Score fixed at <span className="bonus">100</span> (deal won)</li>
                    <li><strong>Closed Lost:</strong> Score fixed at <span className="penalty">0</span> (deal lost)</li>
                  </ul>
                </section>

                <section className="scoring-section">
                  <h3>Score Calculation</h3>
                  <div className="scoring-formula">
                    <code>Final Score = clamp(0, 100, Base + Bonuses − Penalties)</code>
                    <code>Weighted MRR = Monthly Amount × (Final Score ÷ 100)</code>
                  </div>
                </section>

                <section className="scoring-section tips-section">
                  <h3>Tips for Reps</h3>
                  <ul className="scoring-list tips-list">
                    <li>Fill out call scores after every discovery call — it replaces the default 50 with your actual read on the deal</li>
                    <li>Log inbound communications to reset the silence penalty</li>
                    <li>Deals over 15 days old with no engagement will trend toward 0 — follow up or close them out</li>
                  </ul>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .pipeline-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .kpi-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
        }

        .kpi-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .kpi-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .kpi-value {
          font-size: 24px;
          font-weight: 700;
          color: #111827;
        }

        .kpi-label {
          font-size: 12px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-filters {
          display: flex;
          align-items: flex-end;
          gap: 16px;
          margin-bottom: 24px;
          padding: 16px 20px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          flex-wrap: wrap;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .filter-select,
        .filter-input {
          padding: 8px 12px;
          font-size: 13px;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
          outline: none;
          transition: border-color 0.15s ease;
          min-width: 140px;
        }

        .filter-select:hover,
        .filter-input:hover {
          border-color: #D1D5DB;
        }

        .filter-select:focus,
        .filter-input:focus {
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
        }

        .btn-how-scoring {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          color: #374151;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-left: auto;
        }

        .btn-how-scoring:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
        }

        .btn-how-scoring svg {
          color: #6B7280;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: #111827;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-refresh:hover:not(:disabled) {
          background: #1F2937;
        }

        .btn-refresh:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-refresh svg {
          flex-shrink: 0;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .pipeline-table-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          overflow: hidden;
        }

        .pipeline-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #E5E7EB;
        }

        .pipeline-table-header h2 {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .pipeline-summary-stats {
          display: flex;
          gap: 24px;
        }

        .summary-stat {
          text-align: right;
        }

        .summary-value {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #059669;
        }

        .summary-label {
          font-size: 10px;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-table {
          overflow-x: auto;
        }

        .table-loading,
        .table-empty {
          padding: 60px 20px;
          text-align: center;
          color: #6B7280;
          font-size: 14px;
        }

        .pipeline-row {
          display: grid;
          grid-template-columns: minmax(200px, 1.5fr) minmax(100px, 130px) 65px 65px 65px 70px 85px 45px minmax(100px, 1fr);
          gap: 10px;
          padding: 12px 20px;
          border-bottom: 1px solid #F3F4F6;
          transition: background 0.15s ease;
          align-items: center;
        }

        .pipeline-row:hover:not(.pipeline-row-header) {
          background: #F9FAFB;
          cursor: pointer;
        }

        .pipeline-row.expanded {
          background: #F0FDF4;
          border-bottom-color: #D1FAE5;
        }

        .pipeline-row-header {
          padding: 12px 20px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .pipeline-row-header .pipeline-col {
          font-size: 11px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .pipeline-col {
          display: flex;
          align-items: center;
        }

        .col-client {
          gap: 10px;
        }

        .client-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .client-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-width: 0;
          gap: 2px;
        }

        .client-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .client-email {
          font-size: 11px;
          color: #6B7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .col-rep {
          gap: 6px;
        }

        .rep-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 9px;
          font-weight: 600;
        }

        .rep-name {
          font-size: 13px;
          color: #374151;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rep-name.muted {
          color: #9CA3AF;
        }

        .col-tier-price {
          justify-content: center;
        }

        .tier-price {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          padding: 4px 8px;
          border-radius: 16px;
          border: 2px solid transparent;
        }

        .tier-price.predicted {
          background: #D1FAE5;
          border-color: #059669;
          color: #065F46;
          font-weight: 600;
        }

        .col-amount {
          justify-content: flex-end;
        }

        .amount-value {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .col-date {
          justify-content: center;
        }

        .date-value {
          font-size: 12px;
          color: #6B7280;
        }

        .col-days {
          justify-content: center;
        }

        .days-badge {
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 500;
        }

        .days-badge.green {
          background: #D1FAE5;
          color: #065F46;
        }

        .days-badge.yellow {
          background: #FEF3C7;
          color: #92400E;
        }

        .days-badge.red {
          background: #FEE2E2;
          color: #991B1B;
        }

        .col-confidence {
          gap: 8px;
        }

        .confidence-display {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }

        .confidence-meter {
          flex: 1;
          height: 6px;
          background: #E5E7EB;
          border-radius: 3px;
          overflow: hidden;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease;
        }

        .confidence-fill.green {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
        }

        .confidence-fill.yellow {
          background: linear-gradient(90deg, #FBBF24 0%, #EAB308 100%);
        }

        .confidence-fill.red {
          background: linear-gradient(90deg, #EF4444 0%, #DC2626 100%);
        }

        .confidence-label {
          font-size: 14px;
          font-weight: 700;
          min-width: 28px;
          text-align: right;
        }

        .confidence-label.green {
          color: #059669;
        }

        .confidence-label.yellow {
          color: #CA8A04;
        }

        .confidence-label.red {
          color: #DC2626;
        }

        .col-weighted {
          justify-content: flex-end;
        }

        .weighted-value {
          font-size: 13px;
          font-weight: 600;
          color: #059669;
        }

        /* Expanded Details */
        .deal-details {
          padding: 20px 20px 20px 62px;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 20px;
        }

        .details-grid-4col {
          grid-template-columns: repeat(4, 1fr);
        }

        .details-section-full {
          margin-top: 20px;
          margin-bottom: 20px;
        }

        .history-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 12px;
          border-bottom: 1px solid #E5E7EB;
        }

        .history-tab {
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .history-tab:hover {
          color: #374151;
        }

        .history-tab.active {
          color: #059669;
          border-bottom-color: #059669;
        }

        .audit-container {
          max-height: 400px;
          overflow-y: auto;
        }

        .details-section h4 {
          font-size: 12px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 0 0 12px 0;
        }

        .score-items,
        .timeline-items,
        .pricing-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .score-item,
        .timeline-item,
        .pricing-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .score-item.total,
        .pricing-item.weighted {
          border-top: 1px solid #E5E7EB;
          padding-top: 10px;
          margin-top: 4px;
        }

        .score-label,
        .timeline-label,
        .pricing-label {
          font-size: 13px;
          color: #6B7280;
        }

        .score-value,
        .timeline-value,
        .pricing-value {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .score-value.negative {
          color: #DC2626;
        }

        .score-value.positive {
          color: #059669;
        }

        .score-value.green {
          color: #059669;
        }

        .score-value.yellow {
          color: #CA8A04;
        }

        .score-value.red {
          color: #DC2626;
        }

        .followup-badge {
          font-size: 10px;
          font-weight: 500;
          color: #6B7280;
          background: #F3F4F6;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 4px;
        }

        /* Milestones */
        .milestone-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .milestone-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .milestone-status {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          flex-shrink: 0;
        }

        .milestone-status.complete {
          background: #D1FAE5;
          color: #065F46;
          font-weight: 700;
        }

        .milestone-status.pending {
          background: #F3F4F6;
          color: #9CA3AF;
        }

        .milestone-label {
          font-size: 13px;
          color: #374151;
          flex: 1;
        }

        .milestone-date {
          font-size: 11px;
          color: #6B7280;
        }

        /* Call Scores */
        .call-score-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .call-score-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
        }

        .call-score-label {
          font-size: 13px;
          color: #6B7280;
        }

        .call-score-value {
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        .call-score-value.good {
          background: #D1FAE5;
          color: #065F46;
        }

        .call-score-value.medium {
          background: #FEF3C7;
          color: #92400E;
        }

        .call-score-value.poor {
          background: #FEE2E2;
          color: #991B1B;
        }

        .call-score-value.muted {
          background: #F3F4F6;
          color: #9CA3AF;
        }

        .not-set {
          font-weight: 400;
          font-size: 10px;
          color: #9CA3AF;
        }

        .details-actions {
          display: flex;
          gap: 12px;
        }

        .btn-view-recommendation,
        .btn-view-client {
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .btn-view-recommendation {
          background: #059669;
          color: white;
        }

        .btn-view-recommendation:hover {
          background: #047857;
        }

        .btn-view-client {
          background: white;
          color: #374151;
          border: 1px solid #E5E7EB;
        }

        .btn-view-client:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
        }

        @media (max-width: 1400px) {
          .details-grid-4col {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 1200px) {
          .pipeline-kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .details-grid-4col {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .pipeline-kpi-grid {
            grid-template-columns: 1fr;
          }

          .pipeline-filters {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group {
            width: 100%;
          }

          .filter-select,
          .filter-input {
            width: 100%;
          }

          .btn-refresh,
          .btn-how-scoring {
            margin-left: 0;
            justify-content: center;
          }

          .pipeline-row {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .pipeline-row-header {
            display: none;
          }

          .pipeline-col::before {
            content: attr(data-label);
            font-size: 10px;
            color: #6B7280;
            text-transform: uppercase;
            display: block;
            margin-bottom: 2px;
          }
        }

        /* Scoring Modal */
        .scoring-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .scoring-modal {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .scoring-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #E5E7EB;
          flex-shrink: 0;
        }

        .scoring-modal-header h2 {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .scoring-modal-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #6B7280;
          border-radius: 6px;
          transition: all 0.15s ease;
        }

        .scoring-modal-close:hover {
          background: #F3F4F6;
          color: #111827;
        }

        .scoring-modal-body {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .scoring-section {
          margin-bottom: 24px;
        }

        .scoring-section:last-child {
          margin-bottom: 0;
        }

        .scoring-section h3 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 10px 0;
        }

        .scoring-section p {
          font-size: 13px;
          color: #4B5563;
          line-height: 1.6;
          margin: 0 0 12px 0;
        }

        .scoring-factors {
          background: #F9FAFB;
          border-radius: 8px;
          padding: 12px 16px;
          margin: 12px 0;
        }

        .scoring-factor {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 0;
          border-bottom: 1px solid #E5E7EB;
        }

        .scoring-factor:last-child {
          border-bottom: none;
        }

        .factor-name {
          font-size: 13px;
          font-weight: 600;
          color: #111827;
        }

        .factor-weight {
          font-weight: 400;
          color: #6B7280;
        }

        .factor-values {
          font-size: 12px;
          color: #6B7280;
        }

        .scoring-note {
          font-size: 12px;
          color: #6B7280;
          font-style: italic;
          margin-top: 8px;
        }

        .scoring-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .scoring-list li {
          font-size: 13px;
          color: #4B5563;
          padding: 6px 0;
          padding-left: 20px;
          position: relative;
        }

        .scoring-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #9CA3AF;
        }

        .scoring-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          margin: 12px 0;
        }

        .scoring-table th,
        .scoring-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid #E5E7EB;
        }

        .scoring-table th {
          background: #F9FAFB;
          font-weight: 600;
          color: #374151;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .scoring-table td {
          color: #4B5563;
        }

        .scoring-table .penalty {
          color: #DC2626;
          font-weight: 500;
        }

        .scoring-table .bonus {
          color: #059669;
          font-weight: 500;
        }

        .bonus {
          color: #059669;
          font-weight: 600;
        }

        .penalty {
          color: #DC2626;
          font-weight: 600;
        }

        .scoring-formula {
          background: #F3F4F6;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
        }

        .scoring-formula code {
          display: block;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 12px;
          color: #1F2937;
          margin: 4px 0;
        }

        .tips-section {
          background: #FEF3C7;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }

        .tips-section h3 {
          color: #92400E;
        }

        .tips-list li {
          color: #78350F;
        }

        .tips-list li::before {
          color: #D97706;
        }
      `}</style>
    </>
  )
}
