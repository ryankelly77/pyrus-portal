'use client'

import { useState, useEffect } from 'react'

interface Communication {
  id: string
  recommendationId: string
  direction: 'inbound' | 'outbound'
  channel: 'email' | 'sms' | 'chat' | 'call' | 'other'
  contactAt: string
  source: 'highlevel_webhook' | 'manual' | 'system'
  highlevelMessageId: string | null
  notes: string | null
  createdAt: string
}

interface CommunicationTimelineProps {
  recommendationId: string
  refreshTrigger?: number // increment to refresh
}

const CHANNEL_ICONS: Record<string, string> = {
  email: '✉️',
  sms: '💬',
  call: '📞',
  chat: '💭',
  other: '📋',
}

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  highlevel_webhook: { label: 'HighLevel', color: '#7C3AED' },
  manual: { label: 'Manual', color: '#6B7280' },
  system: { label: 'System', color: '#2563EB' },
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAbsoluteTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function CommunicationTimeline({
  recommendationId,
  refreshTrigger,
}: CommunicationTimelineProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCommunications() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(
          `/api/admin/recommendations/${recommendationId}/communications`
        )
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setCommunications(data.communications || [])
      } catch (err) {
        setError('Failed to load communications')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCommunications()
  }, [recommendationId, refreshTrigger])

  if (loading) {
    return (
      <div className="timeline-loading">
        <span>Loading communications...</span>
        <style jsx>{`
          .timeline-loading {
            padding: 20px;
            text-align: center;
            color: #6B7280;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="timeline-error">
        <span>{error}</span>
        <style jsx>{`
          .timeline-error {
            padding: 20px;
            text-align: center;
            color: #DC2626;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  if (communications.length === 0) {
    return (
      <div className="timeline-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span>No communications logged yet</span>
        <style jsx>{`
          .timeline-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            padding: 32px 20px;
            color: #9CA3AF;
            font-size: 13px;
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="comm-timeline">
      {communications.map((comm, index) => {
        const sourceInfo = SOURCE_LABELS[comm.source] || SOURCE_LABELS.manual
        const isLast = index === communications.length - 1

        return (
          <div key={comm.id} className={`timeline-item ${comm.direction}`}>
            <div className="timeline-connector">
              <div className={`timeline-dot ${comm.direction}`}>
                {comm.direction === 'inbound' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </div>
              {!isLast && <div className="timeline-line" />}
            </div>

            <div className="timeline-content">
              <div className="timeline-header">
                <span className="channel-badge">
                  <span className="channel-icon">{CHANNEL_ICONS[comm.channel]}</span>
                  <span className="channel-label">{comm.channel}</span>
                </span>
                <span
                  className="source-badge"
                  style={{ background: `${sourceInfo.color}15`, color: sourceInfo.color }}
                >
                  {sourceInfo.label}
                </span>
                <span
                  className="time-badge"
                  title={formatAbsoluteTime(comm.contactAt)}
                >
                  {formatRelativeTime(comm.contactAt)}
                </span>
              </div>

              <div className="timeline-direction">
                {comm.direction === 'inbound' ? 'Prospect contacted us' : 'We contacted prospect'}
              </div>

              {comm.notes && <div className="timeline-notes">{comm.notes}</div>}
            </div>
          </div>
        )
      })}

      <style jsx>{`
        .comm-timeline {
          display: flex;
          flex-direction: column;
        }

        .timeline-item {
          display: flex;
          gap: 12px;
        }

        .timeline-connector {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 24px;
          flex-shrink: 0;
        }

        .timeline-dot {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .timeline-dot.inbound {
          background: #ECFDF5;
          color: #059669;
        }

        .timeline-dot.outbound {
          background: #EEF2FF;
          color: #4F46E5;
        }

        .timeline-line {
          flex: 1;
          width: 2px;
          background: #E5E7EB;
          margin: 4px 0;
          min-height: 20px;
        }

        .timeline-content {
          flex: 1;
          padding-bottom: 16px;
        }

        .timeline-header {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .channel-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: #F3F4F6;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        .channel-icon {
          font-size: 11px;
        }

        .channel-label {
          text-transform: capitalize;
        }

        .source-badge {
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .time-badge {
          font-size: 12px;
          color: #6B7280;
          cursor: help;
        }

        .timeline-direction {
          margin-top: 6px;
          font-size: 13px;
          color: #374151;
        }

        .timeline-notes {
          margin-top: 6px;
          padding: 8px 10px;
          background: #F9FAFB;
          border-radius: 6px;
          font-size: 12px;
          color: #6B7280;
          line-height: 1.4;
        }
      `}</style>
    </div>
  )
}
