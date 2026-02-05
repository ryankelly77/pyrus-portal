'use client'

import { useState, useEffect } from 'react'

interface ScoreBreakdown {
  confidence_score: number
  confidence_percent: number
  weighted_monthly: number
  weighted_onetime: number
  base_score: number
  total_penalties: number
  total_bonus: number
  penalty_breakdown: {
    email_not_opened: number
    proposal_not_viewed: number
    silence: number
    multi_invite_bonus: number
  }
}

interface DeltaChange {
  field: string
  from: number
  to: number
  delta: number
}

interface EventDelta {
  score_delta: number
  weighted_mrr_delta: number
  changes: DeltaChange[]
}

interface AuditEvent {
  id: string
  scored_at: string
  trigger_source: string
  confidence_score: number
  confidence_percent: number
  weighted_monthly: number
  breakdown: ScoreBreakdown | null
  deltas?: EventDelta
}

interface ScoreAuditFeedProps {
  recommendationId: string
}

// Map trigger sources to icons
const TRIGGER_ICONS: Record<string, string> = {
  invite_sent: '📤',
  call_score_updated: '📞',
  status_changed: '🔄',
  communication_logged: '💬',
  highlevel_sync: '🔗',
  email_opened: '📧',
  proposal_viewed: '👁️',
  account_created: '👤',
  tracking_event: '📍',
  daily_cron: '⏰',
  manual_refresh: '🔄',
  unknown: '•',
}

// Generate explanation for score change
function generateExplanation(event: AuditEvent, isFirst: boolean): string {
  if (isFirst) {
    return 'Initial score recorded'
  }

  const { trigger_source, deltas, breakdown } = event
  const scoreDelta = deltas?.score_delta ?? 0

  // Build explanation from specific changes if available
  if (deltas && deltas.changes.length > 0) {
    const parts: string[] = []

    for (const change of deltas.changes) {
      const delta = change.delta
      const absDelta = Math.abs(delta).toFixed(1)

      switch (change.field) {
        case 'base_score':
          if (delta > 0) {
            parts.push(`Base score +${absDelta} (call scores improved)`)
          } else {
            parts.push(`Base score -${absDelta}`)
          }
          break
        case 'penalty_email_not_opened':
          if (delta > 0) {
            parts.push(`-${absDelta} pts: email not opened`)
          } else {
            parts.push(`+${absDelta} pts: email opened!`)
          }
          break
        case 'penalty_proposal_not_viewed':
          if (delta > 0) {
            parts.push(`-${absDelta} pts: proposal not viewed`)
          } else {
            parts.push(`+${absDelta} pts: proposal viewed!`)
          }
          break
        case 'penalty_silence':
          if (delta > 0) {
            parts.push(`-${absDelta} pts: no prospect response`)
          } else {
            parts.push(`+${absDelta} pts: prospect responded!`)
          }
          break
        case 'multi_invite_bonus':
        case 'total_bonus':
          if (delta > 0) {
            parts.push(`+${absDelta} pts: multi-invite bonus`)
          }
          break
      }
    }

    if (parts.length > 0) {
      return parts.join('; ')
    }
  }

  // No specific changes - explain based on score delta and trigger
  if (scoreDelta !== 0) {
    const absDelta = Math.abs(scoreDelta)

    if (trigger_source === 'daily_cron') {
      if (scoreDelta < 0) {
        return `-${absDelta} pts: time decay (no engagement)`
      } else {
        return `+${absDelta} pts: daily recalculation`
      }
    }

    if (scoreDelta > 0) {
      return `+${absDelta} pts`
    } else {
      return `-${absDelta} pts`
    }
  }

  // No change - describe the event
  switch (trigger_source) {
    case 'invite_sent':
      return 'Recommendation sent'
    case 'call_score_updated':
      return 'Call scores updated'
    case 'email_opened':
      return 'Email opened'
    case 'proposal_viewed':
      return 'Proposal viewed'
    case 'account_created':
      return 'Account created'
    case 'daily_cron':
      return 'Daily check (no change)'
    case 'manual_refresh':
      return 'Manual refresh'
    case 'status_changed':
      return 'Status changed'
    case 'communication_logged':
      return 'Communication logged'
    default:
      return 'Score recalculated'
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Format absolute time for tooltip
function formatAbsoluteTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Get score color class
function getScoreColor(score: number): string {
  if (score >= 70) return 'green'
  if (score >= 40) return 'yellow'
  return 'red'
}

export function ScoreAuditFeed({ recommendationId }: ScoreAuditFeedProps) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAudit() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/admin/recommendations/${recommendationId}/score-audit`)
        if (!res.ok) throw new Error('Failed to fetch audit trail')
        const data = await res.json()
        // Reverse to show newest first
        setEvents((data.events || []).reverse())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit')
      } finally {
        setLoading(false)
      }
    }
    fetchAudit()
  }, [recommendationId])

  if (loading) {
    return (
      <div className="audit-loading">
        <div className="loading-skeleton" />
        <div className="loading-skeleton" />
        <div className="loading-skeleton" />
        <style jsx>{`
          .audit-loading {
            padding: 16px 0;
          }
          .loading-skeleton {
            height: 48px;
            background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 6px;
            margin-bottom: 6px;
          }
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="audit-error">
        {error}
        <style jsx>{`
          .audit-error {
            padding: 20px;
            text-align: center;
            color: #DC2626;
            background: #FEF2F2;
            border-radius: 8px;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="audit-empty">
        <p>No scoring events recorded yet.</p>
        <p className="audit-empty-note">Score history begins when the recommendation is sent.</p>
        <style jsx>{`
          .audit-empty {
            padding: 30px 20px;
            text-align: center;
            color: #6B7280;
            background: #F9FAFB;
            border-radius: 8px;
          }
          .audit-empty p {
            margin: 0 0 8px 0;
            font-size: 14px;
          }
          .audit-empty-note {
            font-size: 12px;
            color: #9CA3AF;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="audit-feed">
      {events.map((event, i) => {
        const icon = TRIGGER_ICONS[event.trigger_source] || TRIGGER_ICONS.unknown
        const isFirst = i === events.length - 1
        const explanation = generateExplanation(event, isFirst)
        const scoreDelta = event.deltas?.score_delta

        return (
          <div key={event.id} className="audit-row">
            <div className="row-left">
              <span className="trigger-icon">{icon}</span>
              <span className="event-time" title={formatAbsoluteTime(event.scored_at)}>
                {formatRelativeTime(event.scored_at)}
              </span>
            </div>

            <div className="row-middle">
              <span className="explanation">{explanation}</span>
            </div>

            <div className="row-right">
              {scoreDelta !== undefined && scoreDelta !== 0 && (
                <span className={`delta ${scoreDelta > 0 ? 'positive' : 'negative'}`}>
                  {scoreDelta > 0 ? '+' : ''}{scoreDelta}
                </span>
              )}
              <span className={`score ${getScoreColor(event.confidence_score)}`}>
                {event.confidence_score}
              </span>
            </div>
          </div>
        )
      })}

      <style jsx>{`
        .audit-feed {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audit-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
        }

        .row-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 90px;
        }

        .trigger-icon {
          font-size: 14px;
        }

        .event-time {
          font-size: 12px;
          color: #6B7280;
          cursor: help;
        }

        .row-middle {
          flex: 1;
          min-width: 0;
        }

        .explanation {
          font-size: 13px;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .row-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .delta {
          font-size: 12px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .delta.positive {
          background: #D1FAE5;
          color: #059669;
        }

        .delta.negative {
          background: #FEE2E2;
          color: #DC2626;
        }

        .score {
          font-size: 13px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          min-width: 32px;
          text-align: center;
        }

        .score.green {
          background: #D1FAE5;
          color: #059669;
        }

        .score.yellow {
          background: #FEF3C7;
          color: #D97706;
        }

        .score.red {
          background: #FEE2E2;
          color: #DC2626;
        }
      `}</style>
    </div>
  )
}

export default ScoreAuditFeed
