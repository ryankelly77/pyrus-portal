/**
 * Content Workflow Engine
 *
 * Handles status transition logic, step definitions, and approval mode calculations
 * for the multi-step content workflow with glowing progress dots.
 *
 * This file contains SERVER-ONLY functions that use Supabase.
 * For client-safe pure functions, use content-workflow-helpers.ts directly.
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import { logContentActivity } from '@/lib/content-activity'
import { sendStatusNotification } from '@/lib/content-notifications'

// Re-export all types and pure functions from helpers
// so server-side code can import everything from this file
export {
  type ContentStep,
  type StepState,
  type ActionButton,
  type StatusHistoryEntry,
  type ContentPiece,
  type ContentStatus,
  getContentSteps,
  getStepState,
  canTransition,
  getNextActions,
  getStatusLabel,
  getStatusColor,
  getValidTransitions,
  isTerminalStatus,
  getStepIndex,
  getProgressPercentage,
} from './content-workflow-helpers'

import { canTransition, getValidTransitions, type ContentPiece } from './content-workflow-helpers'

/**
 * Orchestrates the full status change.
 * Calls the Postgres function via RPC for atomic DB update.
 */
export async function transitionStatus(params: {
  contentPieceId: string
  targetStatus: string
  userId: string
  userName: string
  note?: string
}): Promise<ContentPiece> {
  const { contentPieceId, targetStatus, userId, userName, note } = params
  const supabase = createServerSupabaseClient()

  // 1. Fetch the current content piece with client info
  const { data: contentPiece, error: fetchError } = await supabase
    .from('content')
    .select('*, clients(name)')
    .eq('id', contentPieceId)
    .single()

  if (fetchError || !contentPiece) {
    throw new Error(`Content piece not found: ${contentPieceId}`)
  }

  // Extract client name from joined data
  const clientName = (contentPiece.clients as { name: string } | null)?.name || 'Unknown Client'

  const currentStatus = contentPiece.status

  // 2. Validate the transition is allowed
  if (!canTransition(currentStatus, targetStatus)) {
    const validTargets = getValidTransitions(currentStatus)
    throw new Error(
      `Invalid transition from '${currentStatus}' to '${targetStatus}'. ` +
        `Valid transitions: ${validTargets.join(', ') || 'none'}`
    )
  }

  // 3. Call the content_transition_status() Postgres function via RPC
  // This handles: status update, status_changed_at, status_history append,
  // review_round increment for 'revisions_requested', and transition record insert
  const { error: rpcError } = await supabase.rpc('content_transition_status', {
    p_content_id: contentPieceId,
    p_new_status: targetStatus,
    p_changed_by: userId,
    p_note: note || null,
  })

  if (rpcError) {
    throw new Error(`Failed to transition status: ${rpcError.message}`)
  }

  // 4. Fetch the updated content piece
  const { data: updatedPiece, error: refetchError } = await supabase
    .from('content')
    .select('*')
    .eq('id', contentPieceId)
    .single()

  if (refetchError || !updatedPiece) {
    throw new Error(`Failed to fetch updated content piece: ${refetchError?.message}`)
  }

  // 5. Log activity (fire-and-forget)
  try {
    await logContentActivity({
      contentPieceId,
      contentTitle: contentPiece.title,
      clientId: contentPiece.client_id,
      clientName,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      changedById: userId,
      changedByName: userName,
      note,
      reviewRound: updatedPiece.review_round,
    })
  } catch (activityError) {
    console.error('Failed to log content activity:', activityError)
  }

  // 6. Send notification (fire-and-forget)
  try {
    await sendStatusNotification({
      contentPieceId,
      contentTitle: contentPiece.title,
      clientId: contentPiece.client_id,
      clientName,
      fromStatus: currentStatus,
      toStatus: targetStatus,
      changedByName: userName,
      assignedTo: contentPiece.assigned_to,
      note,
      reviewRound: updatedPiece.review_round,
      publishedUrl: updatedPiece.published_url,
      scheduledDate: updatedPiece.scheduled_date,
    })
  } catch (notificationError) {
    console.error('Failed to send status notification:', notificationError)
  }

  return updatedPiece as ContentPiece
}

/**
 * Determines whether a new content piece requires client approval
 * based on the client's content_approval_mode setting.
 */
export async function determineApprovalRequired(clientId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  // Fetch client's content approval settings
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('content_approval_mode, approval_threshold')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    // Default to requiring approval if we can't fetch client
    console.error('Failed to fetch client approval settings:', clientError)
    return true
  }

  const { content_approval_mode, approval_threshold } = client

  if (content_approval_mode === 'full_approval') {
    return true
  }

  if (content_approval_mode === 'auto') {
    return false
  }

  if (content_approval_mode === 'initial_approval') {
    if (!approval_threshold || approval_threshold <= 0) {
      // No threshold set, default to requiring approval
      return true
    }

    // Count content pieces that have been approved or beyond
    const { count, error: countError } = await supabase
      .from('content')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .in('status', ['approved', 'final_optimization', 'image_selection', 'scheduled', 'posted'])

    if (countError) {
      console.error('Failed to count approved content:', countError)
      return true
    }

    // If count >= threshold, auto mode kicks in (no approval required)
    return (count ?? 0) < approval_threshold
  }

  // Unknown mode, default to requiring approval
  return true
}
