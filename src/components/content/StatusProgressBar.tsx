'use client'

import React, { useState } from 'react'
import {
  getContentSteps,
  getStepState,
  getStatusLabel,
  getProgressPercentage,
  type StepState,
} from '@/lib/content-workflow-helpers'

// ============================================================
// Types
// ============================================================

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_name?: string
  note?: string
}

interface StatusProgressBarProps {
  currentStatus: string
  approvalRequired: boolean
  reviewRound: number
  statusHistory?: StatusHistoryEntry[]
  compact?: boolean
  className?: string
}

// ============================================================
// Helper Functions
// ============================================================

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

function formatFullDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Determine the state of the connecting line between steps
 */
function getLineState(
  lineIndex: number,
  steps: Array<{ key: string }>,
  currentStatus: string,
  approvalRequired: boolean,
  reviewRound: number
): 'completed' | 'active' | 'upcoming' {
  // Line connects step[lineIndex] to step[lineIndex + 1]
  const beforeStep = steps[lineIndex]
  const afterStep = steps[lineIndex + 1]

  if (!beforeStep || !afterStep) return 'upcoming'

  const beforeState = getStepState(beforeStep.key, currentStatus, approvalRequired, reviewRound)
  const afterState = getStepState(afterStep.key, currentStatus, approvalRequired, reviewRound)

  // If both are completed, line is completed
  if (beforeState === 'completed' && afterState === 'completed') {
    return 'completed'
  }

  // If before is completed/active and after is active, line is active
  if (
    (beforeState === 'completed' || beforeState === 'active') &&
    (afterState === 'active' || afterState === 'revision')
  ) {
    return 'active'
  }

  // If before is completed and after is upcoming, line is active
  if (beforeState === 'completed' && afterState === 'upcoming') {
    return 'active'
  }

  // Special case for revision: line to revision dot should be active
  if (beforeState === 'active' && afterState === 'revision') {
    return 'active'
  }

  return 'upcoming'
}

// ============================================================
// Sub-components
// ============================================================

interface TooltipProps {
  content: string
  visible: boolean
}

function Tooltip({ content, visible }: TooltipProps) {
  if (!visible) return null

  const tooltipStyles = {
    container: {
      position: 'absolute' as const,
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px',
      zIndex: 50,
      pointerEvents: 'none' as const,
    },
    content: {
      background: '#1F2937',
      color: 'white',
      fontSize: '12px',
      lineHeight: 1.4,
      padding: '8px 12px',
      borderRadius: '6px',
      whiteSpace: 'nowrap' as const,
      maxWidth: '200px',
      textAlign: 'center' as const,
    },
    arrow: {
      position: 'absolute' as const,
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      border: '6px solid transparent',
      borderTopColor: '#1F2937',
    },
  }

  return (
    <div style={tooltipStyles.container}>
      <div style={tooltipStyles.content}>{content}</div>
      <div style={tooltipStyles.arrow} />
    </div>
  )
}

interface DotIconProps {
  state: StepState
}

function DotIcon({ state }: DotIconProps) {
  if (state === 'completed') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="3"
        width="14"
        height="14"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )
  }

  if (state === 'revision') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        width="12"
        height="12"
      >
        <line x1="12" y1="8" x2="12" y2="12" />
        <circle cx="12" cy="16" r="0.5" fill="white" />
      </svg>
    )
  }

  if (state === 'active') {
    return (
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'white',
        }}
      />
    )
  }

  // Upcoming - small gray dot
  return (
    <div
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        background: '#D1D5DB',
      }}
    />
  )
}

// ============================================================
// Compact Progress Bar
// ============================================================

interface CompactProgressBarProps {
  steps: Array<{ key: string; label: string }>
  currentStatus: string
  approvalRequired: boolean
  reviewRound: number
  className?: string
}

function CompactProgressBar({
  steps,
  currentStatus,
  approvalRequired,
  reviewRound,
  className,
}: CompactProgressBarProps) {
  const [hovered, setHovered] = useState(false)
  const statusLabel = getStatusLabel(currentStatus, 'admin')
  const progress = getProgressPercentage(currentStatus, approvalRequired)

  const compactStyles = {
    container: {
      position: 'relative' as const,
      minWidth: '120px',
      height: '18px',
      display: 'flex',
      alignItems: 'center',
    },
    track: {
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
    },
    dot: {
      width: '10px',
      height: '10px',
      borderRadius: '50%',
      flexShrink: 0,
    } as React.CSSProperties,
    dotCompleted: {
      background: '#22c55e',
      boxShadow: '0 0 4px rgba(34, 197, 94, 0.2)',
    },
    dotActive: {
      background: '#14b8a6',
      boxShadow: '0 0 8px 2px rgba(20, 184, 166, 0.4)',
    },
    dotRevision: {
      background: '#f59e0b',
      boxShadow: '0 0 8px 2px rgba(245, 158, 11, 0.4)',
    },
    dotUpcoming: {
      background: '#F3F4F6',
      border: '1.5px solid #D1D5DB',
    },
    line: {
      width: '6px',
      height: '1px',
      flexShrink: 0,
    } as React.CSSProperties,
    lineCompleted: {
      background: 'linear-gradient(90deg, #22c55e, #14b8a6)',
    },
    lineActive: {
      background: 'linear-gradient(90deg, #14b8a6, #D1D5DB)',
    },
    lineUpcoming: {
      background: '#E5E7EB',
    },
    tooltip: {
      position: 'absolute' as const,
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '6px',
      zIndex: 50,
      pointerEvents: 'none' as const,
    },
    tooltipContent: {
      background: '#1F2937',
      color: 'white',
      fontSize: '11px',
      lineHeight: 1.3,
      padding: '6px 10px',
      borderRadius: '4px',
      whiteSpace: 'nowrap' as const,
    },
    tooltipArrow: {
      position: 'absolute' as const,
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      border: '5px solid transparent',
      borderTopColor: '#1F2937',
    },
  }

  const getCompactDotStyle = (state: StepState): React.CSSProperties => {
    const base = { ...compactStyles.dot }
    switch (state) {
      case 'completed': return { ...base, ...compactStyles.dotCompleted }
      case 'active': return { ...base, ...compactStyles.dotActive }
      case 'revision': return { ...base, ...compactStyles.dotRevision }
      default: return { ...base, ...compactStyles.dotUpcoming }
    }
  }

  const getCompactLineStyle = (lineState: 'completed' | 'active' | 'upcoming'): React.CSSProperties => {
    const base = { ...compactStyles.line }
    switch (lineState) {
      case 'completed': return { ...base, ...compactStyles.lineCompleted }
      case 'active': return { ...base, ...compactStyles.lineActive }
      default: return { ...base, ...compactStyles.lineUpcoming }
    }
  }

  return (
    <div
      className={className || ''}
      style={compactStyles.container}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={compactStyles.track}>
        {steps.map((step, index) => {
          const state = getStepState(step.key, currentStatus, approvalRequired, reviewRound)
          const isLast = index === steps.length - 1

          return (
            <React.Fragment key={step.key}>
              <div style={getCompactDotStyle(state)} />
              {!isLast && (
                <div
                  style={getCompactLineStyle(getLineState(
                    index,
                    steps,
                    currentStatus,
                    approvalRequired,
                    reviewRound
                  ))}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {hovered && (
        <div style={compactStyles.tooltip}>
          <div style={compactStyles.tooltipContent}>
            {statusLabel} — {progress}% complete
          </div>
          <div style={compactStyles.tooltipArrow} />
        </div>
      )}
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================

export function StatusProgressBar({
  currentStatus,
  approvalRequired,
  reviewRound,
  statusHistory = [],
  compact = false,
  className,
}: StatusProgressBarProps) {
  const steps = getContentSteps(approvalRequired)
  const [hoveredStep, setHoveredStep] = useState<string | null>(null)

  // Get date from statusHistory for a given step
  const getStepDate = (stepKey: string): string | null => {
    // Map step key to possible status values
    const statusMap: Record<string, string[]> = {
      draft: ['draft'],
      sent_for_review: ['sent_for_review'],
      client_reviewing: ['client_reviewing', 'revisions_requested'],
      approved: ['approved'],
      internal_review: ['internal_review'],
      final_optimization: ['final_optimization'],
      image_selection: ['image_selection'],
      posted: ['posted', 'scheduled'],
    }

    const possibleStatuses = statusMap[stepKey] || [stepKey]
    const entry = statusHistory.find((h) => possibleStatuses.includes(h.status))
    return entry?.changed_at || null
  }

  const getStepChangedBy = (stepKey: string): string | null => {
    const statusMap: Record<string, string[]> = {
      draft: ['draft'],
      sent_for_review: ['sent_for_review'],
      client_reviewing: ['client_reviewing', 'revisions_requested'],
      approved: ['approved'],
      internal_review: ['internal_review'],
      final_optimization: ['final_optimization'],
      image_selection: ['image_selection'],
      posted: ['posted', 'scheduled'],
    }

    const possibleStatuses = statusMap[stepKey] || [stepKey]
    const entry = statusHistory.find((h) => possibleStatuses.includes(h.status))
    return entry?.changed_by_name || null
  }

  const getStepNote = (stepKey: string): string | null => {
    const entry = statusHistory.find((h) => h.status === stepKey)
    return entry?.note || null
  }

  const getTooltipContent = (stepKey: string, state: StepState, label: string): string => {
    const date = getStepDate(stepKey)
    const changedBy = getStepChangedBy(stepKey)
    const note = getStepNote(stepKey)

    switch (state) {
      case 'completed': {
        let text = `Completed ${formatFullDate(date)}`
        if (changedBy) text += ` by ${changedBy}`
        return text
      }
      case 'active': {
        let text = 'In progress'
        if (date) text += ` since ${formatFullDate(date)}`
        return text
      }
      case 'revision': {
        let text = `Revision requested — Round ${reviewRound}`
        if (note) {
          const truncated = note.length > 80 ? note.slice(0, 80) + '...' : note
          text += `: ${truncated}`
        }
        return text
      }
      default:
        return label
    }
  }

  if (compact) {
    return (
      <CompactProgressBar
        steps={steps}
        currentStatus={currentStatus}
        approvalRequired={approvalRequired}
        reviewRound={reviewRound}
        className={className}
      />
    )
  }

  // Inline styles for reliability with App Router
  const styles = {
    container: {
      background: '#F9FAFB',
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      padding: '20px 24px',
    } as React.CSSProperties,
    track: {
      display: 'flex',
      alignItems: 'flex-start',
    } as React.CSSProperties,
    step: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      position: 'relative' as const,
    },
    dot: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      position: 'relative' as const,
      zIndex: 1,
    } as React.CSSProperties,
    dotCompleted: {
      background: '#22c55e',
      boxShadow: '0 0 8px rgba(34, 197, 94, 0.25)',
    } as React.CSSProperties,
    dotActive: {
      background: '#14b8a6',
      boxShadow: '0 0 12px 3px rgba(20, 184, 166, 0.4)',
    } as React.CSSProperties,
    dotRevision: {
      background: '#f59e0b',
      boxShadow: '0 0 12px 3px rgba(245, 158, 11, 0.4)',
    } as React.CSSProperties,
    dotUpcoming: {
      background: '#F3F4F6',
      border: '2px solid #D1D5DB',
    } as React.CSSProperties,
    label: {
      fontSize: '12px',
      color: '#6B7280',
      textAlign: 'center' as const,
      marginTop: '8px',
      maxWidth: '80px',
      lineHeight: 1.3,
    } as React.CSSProperties,
    date: {
      fontSize: '11px',
      color: '#9CA3AF',
      marginTop: '2px',
    } as React.CSSProperties,
    revisionBadge: {
      fontSize: '10px',
      fontWeight: 500,
      color: '#92400E',
      background: '#FEF3C7',
      padding: '2px 8px',
      borderRadius: '10px',
      marginTop: '4px',
    } as React.CSSProperties,
    line: {
      height: '2px',
      flexGrow: 1,
      marginTop: '13px',
      marginLeft: '-2px',
      marginRight: '-2px',
      minWidth: '20px',
    } as React.CSSProperties,
    lineCompleted: {
      background: 'linear-gradient(90deg, #22c55e, #14b8a6)',
    } as React.CSSProperties,
    lineActive: {
      background: 'linear-gradient(90deg, #14b8a6, #D1D5DB)',
    } as React.CSSProperties,
    lineUpcoming: {
      background: '#E5E7EB',
    } as React.CSSProperties,
  }

  const getDotStyle = (state: StepState): React.CSSProperties => {
    const base = { ...styles.dot }
    switch (state) {
      case 'completed': return { ...base, ...styles.dotCompleted }
      case 'active': return { ...base, ...styles.dotActive }
      case 'revision': return { ...base, ...styles.dotRevision }
      default: return { ...base, ...styles.dotUpcoming }
    }
  }

  const getLineStyle = (lineState: 'completed' | 'active' | 'upcoming'): React.CSSProperties => {
    const base = { ...styles.line }
    switch (lineState) {
      case 'completed': return { ...base, ...styles.lineCompleted }
      case 'active': return { ...base, ...styles.lineActive }
      default: return { ...base, ...styles.lineUpcoming }
    }
  }

  return (
    <div className={className || ''} style={styles.container}>
      <div style={styles.track}>
        {steps.map((step, index) => {
          const state = getStepState(step.key, currentStatus, approvalRequired, reviewRound)
          const isLast = index === steps.length - 1
          const date = getStepDate(step.key)
          const tooltipContent = getTooltipContent(step.key, state, step.label)

          return (
            <React.Fragment key={step.key}>
              <div
                style={styles.step}
                onMouseEnter={() => setHoveredStep(step.key)}
                onMouseLeave={() => setHoveredStep(null)}
              >
                <div style={getDotStyle(state)}>
                  <DotIcon state={state} />
                </div>

                <span style={styles.label}>{step.label}</span>

                {state === 'completed' && date && (
                  <span style={styles.date}>{formatShortDate(date)}</span>
                )}

                {state === 'revision' && reviewRound > 0 && (
                  <span style={styles.revisionBadge}>Round {reviewRound}</span>
                )}

                <Tooltip content={tooltipContent} visible={hoveredStep === step.key} />
              </div>

              {!isLast && (
                <div
                  style={getLineStyle(getLineState(
                    index,
                    steps,
                    currentStatus,
                    approvalRequired,
                    reviewRound
                  ))}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

export default StatusProgressBar
