/**
 * Content Activity Logging
 *
 * Logs content status changes and other activities to the activity_feed table.
 * All functions are fire-and-forget - they should never break the main flow.
 */

import { createServerSupabaseClient } from '@/lib/supabase'

// ============================================================
// Types
// ============================================================

export interface ContentActivityParams {
  contentPieceId: string
  contentTitle: string
  clientId: string
  clientName: string
  fromStatus: string | null // null for new content creation
  toStatus: string
  changedById: string
  changedByName: string
  note?: string
  reviewRound?: number
}

export interface ActivityParams {
  clientId?: string
  userId: string
  userName: string
  activityType: string
  message: string
  metadata?: Record<string, unknown>
  icon?: string
}

// ============================================================
// Icon Mapping
// ============================================================

function getIconForStatus(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'edit',
    sent_for_review: 'send',
    client_reviewing: 'eye',
    approved: 'check',
    revisions_requested: 'alert-triangle',
    internal_review: 'eye',
    final_optimization: 'settings',
    image_selection: 'image',
    scheduled: 'calendar',
    posted: 'globe',
  }
  return iconMap[status] || 'info'
}

// ============================================================
// Message Generation
// ============================================================

function generateContentActivityMessage(params: ContentActivityParams): string {
  const { contentTitle, clientName, changedByName, fromStatus, toStatus, reviewRound } = params
  const title = `'${contentTitle}'`

  // Handle content creation (null fromStatus)
  if (fromStatus === null || fromStatus === undefined) {
    return `${changedByName} created new content ${title} for ${clientName}`
  }

  // Generate message based on transition
  const transitionKey = `${fromStatus}_${toStatus}`

  const messages: Record<string, string> = {
    // Draft transitions
    draft_sent_for_review: `${changedByName} sent ${title} to ${clientName} for review`,
    draft_internal_review: `${changedByName} started internal review of ${title} for ${clientName}`,

    // Client review flow
    sent_for_review_client_reviewing: `${changedByName} from ${clientName} started reviewing ${title}`,
    client_reviewing_approved: `${changedByName} from ${clientName} approved ${title}`,
    client_reviewing_revisions_requested: `${changedByName} from ${clientName} requested revisions on ${title}${reviewRound ? ` (Round ${reviewRound})` : ''}`,

    // Revision resubmission
    revisions_requested_sent_for_review: `${changedByName} resubmitted ${title} for review${reviewRound ? ` (Round ${reviewRound})` : ''}`,

    // Post-approval flow
    approved_final_optimization: `${changedByName} started final optimization on ${title}`,
    internal_review_final_optimization: `${changedByName} completed internal review of ${title}`,
    final_optimization_image_selection: `${changedByName} moved ${title} to image selection`,

    // Publishing
    image_selection_scheduled: `${changedByName} scheduled ${title} for publishing`,
    image_selection_posted: `${changedByName} published ${title}`,
    scheduled_posted: `${changedByName} published ${title}`,
  }

  return (
    messages[transitionKey] ||
    `${changedByName} changed ${title} from ${fromStatus} to ${toStatus}`
  )
}

// ============================================================
// Activity Logging Functions
// ============================================================

/**
 * Logs a content status change to the activity feed.
 * Fire-and-forget - logs errors but never throws.
 */
export async function logContentActivity(params: ContentActivityParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()

    const message = generateContentActivityMessage(params)
    const icon = getIconForStatus(params.toStatus)
    const activityType =
      params.fromStatus === null || params.fromStatus === undefined
        ? 'content_created'
        : 'content_status_change'

    const { error } = await supabase.from('activity_feed').insert({
      client_id: params.clientId,
      user_id: params.changedById,
      user_name: params.changedByName,
      activity_type: activityType,
      message,
      metadata: {
        content_piece_id: params.contentPieceId,
        content_title: params.contentTitle,
        from_status: params.fromStatus,
        to_status: params.toStatus,
        review_round: params.reviewRound || null,
        note: params.note || null,
      },
      icon,
    })

    if (error) {
      console.error('Failed to log content activity:', error)
    }
  } catch (err) {
    // Never throw - activity logging should not break the main flow
    console.error('Error in logContentActivity:', err)
  }
}

/**
 * Logs a general activity to the activity feed.
 * Fire-and-forget - logs errors but never throws.
 *
 * Use this for non-content activities like:
 * - Client setting changes
 * - User invitations
 * - System events
 */
export async function logActivity(params: ActivityParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient()

    const { error } = await supabase.from('activity_feed').insert({
      client_id: params.clientId || null,
      user_id: params.userId,
      user_name: params.userName,
      activity_type: params.activityType,
      message: params.message,
      metadata: params.metadata || {},
      icon: params.icon || 'info',
    })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    // Never throw - activity logging should not break the main flow
    console.error('Error in logActivity:', err)
  }
}

/**
 * Logs a client setting change.
 * Convenience wrapper around logActivity.
 */
export async function logClientSettingChange(params: {
  clientId: string
  clientName: string
  userId: string
  userName: string
  settingName: string
  oldValue: string | number | boolean | null
  newValue: string | number | boolean | null
}): Promise<void> {
  const { clientId, clientName, userId, userName, settingName, oldValue, newValue } = params

  await logActivity({
    clientId,
    userId,
    userName,
    activityType: 'client_setting_change',
    message: `${userName} changed ${settingName} for ${clientName} from "${oldValue}" to "${newValue}"`,
    metadata: {
      setting_name: settingName,
      old_value: oldValue,
      new_value: newValue,
    },
    icon: 'settings',
  })
}

/**
 * Logs content creation (separate from status change).
 * Convenience wrapper for when creating new content.
 */
export async function logContentCreated(params: {
  contentPieceId: string
  contentTitle: string
  clientId: string
  clientName: string
  createdById: string
  createdByName: string
}): Promise<void> {
  await logContentActivity({
    contentPieceId: params.contentPieceId,
    contentTitle: params.contentTitle,
    clientId: params.clientId,
    clientName: params.clientName,
    fromStatus: null,
    toStatus: 'draft',
    changedById: params.createdById,
    changedByName: params.createdByName,
  })
}
