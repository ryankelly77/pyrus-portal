'use client'

import React from 'react'

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_id?: string | null
  changed_by_name?: string
  note?: string
}

interface StatusHistoryFeedProps {
  history: StatusHistoryEntry[]
  currentStatus: string
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  sent_for_review: 'Sent for Review',
  client_reviewing: 'Client Reviewing',
  revisions_requested: 'Revisions Requested',
  approved: 'Approved',
  internal_review: 'Internal Review',
  final_optimization: 'Final Optimization',
  image_selection: 'Image Selection',
  scheduled: 'Scheduled',
  posted: 'Published',
  published: 'Published',
  Published: 'Published',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Chicago',
  }) + ' CST'
}

export function StatusHistoryFeed({ history, currentStatus, className }: StatusHistoryFeedProps) {
  if (!history || history.length === 0) {
    return null
  }

  const reversedHistory = [...history].reverse()

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 0,
      position: 'relative' as const,
    },
    item: {
      display: 'flex',
      gap: '12px',
      padding: '12px 0',
      position: 'relative' as const,
    },
    itemLine: {
      content: '""',
      position: 'absolute' as const,
      left: '5px',
      top: '24px',
      bottom: 0,
      width: '2px',
      background: '#E5E7EB',
    },
    dot: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      flexShrink: 0,
      marginTop: '4px',
    },
    dotGreen: {
      background: '#22c55e',
    },
    dotAmber: {
      background: '#D97706',
    },
    content: {
      flex: 1,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '4px',
      flexWrap: 'wrap' as const,
      gap: '8px',
    },
    label: {
      fontWeight: 500,
      color: '#1F2937',
    },
    date: {
      fontSize: '12px',
      color: '#6B7280',
    },
    author: {
      fontSize: '12px',
      color: '#9CA3AF',
    },
    note: {
      margin: '8px 0 0',
      padding: '8px 12px',
      background: '#FEF3C7',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#92400E',
    },
  }

  return (
    <div className={className} style={styles.container}>
      {reversedHistory.map((entry, index) => {
        const isCurrentAndOpen = index === 0 && currentStatus !== 'posted'
        const isLast = index === reversedHistory.length - 1

        return (
          <div key={index} style={styles.item}>
            {/* Connecting line */}
            {!isLast && <div style={styles.itemLine} />}

            {/* Dot */}
            <div
              style={{
                ...styles.dot,
                ...(isCurrentAndOpen ? styles.dotAmber : styles.dotGreen),
              }}
            />

            {/* Content */}
            <div style={styles.content}>
              <div style={styles.header}>
                <span style={styles.label}>
                  {STATUS_LABELS[entry.status] || entry.status}
                </span>
                <span style={styles.date}>
                  {formatDate(entry.changed_at)}
                </span>
              </div>
              {entry.changed_by_name && (
                <span style={styles.author}>by {entry.changed_by_name}</span>
              )}
              {entry.note && (
                <p style={styles.note}>{entry.note}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default StatusHistoryFeed
