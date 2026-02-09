/**
 * Content Workflow Helpers
 *
 * Pure functions for content workflow that can be used on both client and server.
 * These functions have no external dependencies and are safe for 'use client' components.
 */

// ============================================================
// Types
// ============================================================

export interface ContentStep {
  key: string
  label: string
  icon: string // icon name for the UI to resolve
}

export type StepState = 'completed' | 'active' | 'revision' | 'upcoming'

export interface ActionButton {
  action?: string // target status — omit if it's a display-only indicator
  label: string
  variant: 'primary' | 'secondary' | 'warning' | 'disabled'
  requiresNote?: boolean // true for revisions_requested — UI must collect feedback
}

export interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_id: string | null
  changed_by_name: string
  note?: string
}

export interface ContentPiece {
  id: string
  title: string
  status: string
  client_id: string | null
  approval_required: boolean
  review_round: number
  status_changed_at: string
  status_history: StatusHistoryEntry[]
  assigned_to: string | null
  [key: string]: unknown
}

export type ContentStatus =
  | 'draft'
  | 'sent_for_review'
  | 'client_reviewing'
  | 'revisions_requested'
  | 'approved'
  | 'internal_review'
  | 'final_optimization'
  | 'image_selection'
  | 'scheduled'
  | 'posted'

// ============================================================
// Valid Transitions Map
// ============================================================

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent_for_review', 'internal_review'],
  sent_for_review: ['client_reviewing'],
  client_reviewing: ['approved', 'revisions_requested'],
  revisions_requested: ['sent_for_review'],
  approved: ['final_optimization'],
  internal_review: ['final_optimization'],
  final_optimization: ['image_selection'],
  image_selection: ['scheduled', 'posted'],
  scheduled: ['posted'],
}

// ============================================================
// Step Definitions
// ============================================================

const STEPS_WITH_APPROVAL: ContentStep[] = [
  { key: 'draft', label: 'Draft Created', icon: 'edit' },
  { key: 'sent_for_review', label: 'Sent for Review', icon: 'send' },
  { key: 'client_reviewing', label: 'Client Review', icon: 'eye' },
  { key: 'approved', label: 'Approved', icon: 'check' },
  { key: 'final_optimization', label: 'Final Optimization', icon: 'settings' },
  { key: 'image_selection', label: 'Image Selection', icon: 'image' },
  { key: 'posted', label: 'Posted', icon: 'globe' },
]

const STEPS_WITHOUT_APPROVAL: ContentStep[] = [
  { key: 'draft', label: 'Draft Created', icon: 'edit' },
  { key: 'internal_review', label: 'Internal Review', icon: 'eye' },
  { key: 'final_optimization', label: 'Final Optimization', icon: 'settings' },
  { key: 'image_selection', label: 'Image Selection', icon: 'image' },
  { key: 'posted', label: 'Posted', icon: 'globe' },
]

// ============================================================
// Functions
// ============================================================

/**
 * Returns the ordered step definitions for the progress bar.
 * Note: 'revisions_requested' and 'scheduled' are not separate dots.
 */
export function getContentSteps(approvalRequired: boolean): ContentStep[] {
  return approvalRequired ? STEPS_WITH_APPROVAL : STEPS_WITHOUT_APPROVAL
}

/**
 * Determines how to render each step dot in the progress bar.
 */
export function getStepState(
  stepKey: string,
  currentStatus: string,
  approvalRequired: boolean,
  reviewRound: number = 0
): StepState {
  const steps = getContentSteps(approvalRequired)
  const stepIndex = steps.findIndex((s) => s.key === stepKey)

  if (stepIndex === -1) {
    return 'upcoming'
  }

  // Map currentStatus to its position in the step array
  // Handle special statuses that map to other steps
  let statusForOrdering = currentStatus

  // 'revisions_requested' maps to between 'sent_for_review' and 'client_reviewing'
  // 'scheduled' maps to the 'posted' step (last step)
  if (currentStatus === 'revisions_requested') {
    // Special handling: 'client_reviewing' step shows amber glow
    if (stepKey === 'client_reviewing') {
      return 'revision'
    }
    // 'sent_for_review' is active (team needs to resubmit)
    if (stepKey === 'sent_for_review') {
      return 'active'
    }
    // Steps before 'sent_for_review' are completed
    const sentForReviewIndex = steps.findIndex((s) => s.key === 'sent_for_review')
    if (stepIndex < sentForReviewIndex) {
      return 'completed'
    }
    // Steps after 'client_reviewing' are upcoming
    return 'upcoming'
  }

  if (currentStatus === 'scheduled') {
    // 'scheduled' is a sub-state of the final step
    // The 'posted' step (last step) gets 'active'
    const postedIndex = steps.findIndex((s) => s.key === 'posted')
    if (stepIndex < postedIndex) {
      return 'completed'
    }
    if (stepKey === 'posted') {
      return 'active'
    }
    return 'upcoming'
  }

  // Find the current status index
  const currentIndex = steps.findIndex((s) => s.key === statusForOrdering)

  if (currentIndex === -1) {
    // Status not in our step list, consider everything upcoming
    return 'upcoming'
  }

  if (stepIndex < currentIndex) {
    return 'completed'
  }

  if (stepIndex === currentIndex) {
    return 'active'
  }

  return 'upcoming'
}

/**
 * Simple lookup to check if a transition is valid.
 */
export function canTransition(currentStatus: string, targetStatus: string): boolean {
  const validTargets = VALID_TRANSITIONS[currentStatus]
  if (!validTargets) {
    return false
  }
  return validTargets.includes(targetStatus)
}

/**
 * Returns which action buttons to show for the current status and user role.
 */
export function getNextActions(
  currentStatus: string,
  userRole: 'admin' | 'client',
  approvalRequired: boolean
): ActionButton[] {
  if (userRole === 'admin') {
    switch (currentStatus) {
      case 'draft':
        return approvalRequired
          ? [{ action: 'sent_for_review', label: 'Send for Review', variant: 'primary' }]
          : [{ action: 'internal_review', label: 'Start Internal Review', variant: 'primary' }]

      case 'sent_for_review':
        return [{ label: 'Waiting for client…', variant: 'disabled' }]

      case 'client_reviewing':
        return [{ label: 'Client is reviewing…', variant: 'disabled' }]

      case 'revisions_requested':
        return [{ action: 'sent_for_review', label: 'Resubmit for Review', variant: 'primary' }]

      case 'approved':
        return [
          { action: 'final_optimization', label: 'Begin Final Optimization', variant: 'primary' },
        ]

      case 'internal_review':
        return [
          { action: 'final_optimization', label: 'Begin Final Optimization', variant: 'primary' },
        ]

      case 'final_optimization':
        return [{ action: 'image_selection', label: 'Move to Image Selection', variant: 'primary' }]

      case 'image_selection':
        return [
          { action: 'scheduled', label: 'Schedule', variant: 'secondary' },
          { action: 'posted', label: 'Post Now', variant: 'primary' },
        ]

      case 'scheduled':
        return [{ action: 'posted', label: 'Mark as Posted', variant: 'primary' }]

      case 'posted':
        return [] // Terminal state

      default:
        return []
    }
  }

  // Client role
  switch (currentStatus) {
    case 'sent_for_review':
      return [{ action: 'client_reviewing', label: 'Begin Review', variant: 'primary' }]

    case 'client_reviewing':
      return [
        { action: 'approved', label: 'Approve', variant: 'primary' },
        {
          action: 'revisions_requested',
          label: 'Request Revisions',
          variant: 'warning',
          requiresNote: true,
        },
      ]

    default:
      return [] // Read-only for all other statuses
  }
}

/**
 * Returns display labels for a status.
 * Admin sees technical labels, client sees friendly ones.
 */
export function getStatusLabel(status: string, perspective: 'admin' | 'client'): string {
  const adminLabels: Record<string, string> = {
    draft: 'Draft',
    sent_for_review: 'Sent for Review',
    client_reviewing: 'Client Reviewing',
    revisions_requested: 'Revisions Requested',
    approved: 'Approved',
    internal_review: 'Internal Review',
    final_optimization: 'Final Optimization',
    image_selection: 'Image Selection',
    scheduled: 'Scheduled',
    posted: 'Posted',
  }

  const clientLabels: Record<string, string> = {
    draft: 'Being Written',
    sent_for_review: 'Ready for Your Review',
    client_reviewing: "You're Reviewing",
    revisions_requested: 'Your Feedback Sent',
    approved: 'You Approved This',
    internal_review: 'In Progress',
    final_optimization: 'Being Optimized',
    image_selection: 'Selecting Images',
    scheduled: 'Scheduled to Post',
    posted: 'Published',
  }

  const labels = perspective === 'admin' ? adminLabels : clientLabels
  return labels[status] || status
}

/**
 * Returns a CSS class suffix for status badges.
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'draft', // gray
    sent_for_review: 'review', // teal
    client_reviewing: 'reviewing', // blue
    revisions_requested: 'revision', // amber
    approved: 'approved', // green
    internal_review: 'internal', // teal
    final_optimization: 'optimization', // purple
    image_selection: 'images', // indigo
    scheduled: 'scheduled', // indigo
    posted: 'posted', // green-dark
  }

  return colorMap[status] || 'default'
}

/**
 * Get all valid target statuses from a given status.
 */
export function getValidTransitions(currentStatus: string): string[] {
  return VALID_TRANSITIONS[currentStatus] || []
}

/**
 * Check if a status is a terminal state (no further transitions).
 */
export function isTerminalStatus(status: string): boolean {
  return !VALID_TRANSITIONS[status] || VALID_TRANSITIONS[status].length === 0
}

/**
 * Get the step index for a given status in the workflow.
 * Returns -1 if the status is not a main step.
 */
export function getStepIndex(status: string, approvalRequired: boolean): number {
  const steps = getContentSteps(approvalRequired)

  // Map special statuses to their parent steps
  if (status === 'revisions_requested') {
    return steps.findIndex((s) => s.key === 'client_reviewing')
  }
  if (status === 'scheduled') {
    return steps.findIndex((s) => s.key === 'posted')
  }

  return steps.findIndex((s) => s.key === status)
}

/**
 * Calculate workflow progress as a percentage.
 */
export function getProgressPercentage(
  currentStatus: string,
  approvalRequired: boolean
): number {
  const steps = getContentSteps(approvalRequired)
  const stepIndex = getStepIndex(currentStatus, approvalRequired)

  if (stepIndex === -1) {
    return 0
  }

  // Posted is 100%, others are proportional
  if (currentStatus === 'posted') {
    return 100
  }

  // Calculate progress based on step position
  return Math.round((stepIndex / (steps.length - 1)) * 100)
}
