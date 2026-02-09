/**
 * Content Status Notifications
 *
 * Sends email notifications for content workflow status changes.
 * All functions are fire-and-forget - they should never break the main flow.
 */

import { createServerSupabaseClient } from '@/lib/supabase'
import { sendEmail } from '@/lib/email/mailgun'
import {
  getContentReadyForReviewEmail,
  getRevisionResubmittedEmail,
  getContentPublishedEmail,
  getContentScheduledEmail,
  getClientStartedReviewingEmail,
  getClientApprovedEmail,
  getRevisionsRequestedEmail,
} from '@/lib/email/templates/content-status'

// ============================================================
// Types
// ============================================================

export interface StatusNotificationParams {
  contentPieceId: string
  contentTitle: string
  clientId: string
  clientName: string
  fromStatus: string
  toStatus: string
  changedByName: string
  assignedTo?: string | null
  note?: string
  reviewRound?: number
  publishedUrl?: string | null
  scheduledDate?: string | null
}

// ============================================================
// Helper Functions
// ============================================================

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXTAUTH_URL ||
  'https://portal.pyrusdigitalmedia.com'

const TEAM_NOTIFICATION_EMAIL = process.env.TEAM_NOTIFICATION_EMAIL || 'team@pyrusdigitalmedia.com'

/**
 * Get the primary contact email for a client
 */
async function getClientEmail(clientId: string): Promise<string | null> {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('clients')
      .select('contact_email')
      .eq('id', clientId)
      .single()

    if (error || !data?.contact_email) {
      console.warn(`[EMAIL] No contact email found for client ${clientId}`)
      return null
    }

    return data.contact_email
  } catch (err) {
    console.error('[EMAIL] Error fetching client email:', err)
    return null
  }
}

/**
 * Get the email for a team member (by user ID) or fall back to team email
 */
async function getTeamEmail(assignedTo: string | null): Promise<string> {
  if (!assignedTo) {
    return TEAM_NOTIFICATION_EMAIL
  }

  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', assignedTo)
      .single()

    if (error || !data?.email) {
      console.warn(`[EMAIL] No email found for user ${assignedTo}, falling back to team email`)
      return TEAM_NOTIFICATION_EMAIL
    }

    return data.email
  } catch (err) {
    console.error('[EMAIL] Error fetching team member email:', err)
    return TEAM_NOTIFICATION_EMAIL
  }
}

/**
 * Get the name of a user for display
 */
async function getUserName(userId: string): Promise<string> {
  try {
    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (error || !data?.full_name) {
      return 'Team Member'
    }

    return data.full_name
  } catch (err) {
    return 'Team Member'
  }
}

/**
 * Format scheduled date for display
 */
function formatScheduledDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined

  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return undefined
  }
}

// ============================================================
// Main Notification Function
// ============================================================

/**
 * Send status change notifications
 * Determines which emails to send based on the transition
 */
export async function sendStatusNotification(params: StatusNotificationParams): Promise<void> {
  const {
    contentPieceId,
    contentTitle,
    clientId,
    clientName,
    fromStatus,
    toStatus,
    changedByName,
    assignedTo,
    note,
    reviewRound,
    publishedUrl,
    scheduledDate,
  } = params

  const portalContentUrl = `${BASE_URL}/admin/content/${contentPieceId}`
  const clientPortalUrl = `${BASE_URL}/content/${contentPieceId}`

  const emailData = {
    recipientName: '', // Will be set per email
    contentTitle,
    clientName,
    changedByName,
    portalUrl: '', // Will be set per email
    reviewRound,
    note,
    publishedUrl: publishedUrl || undefined,
    scheduledDate: formatScheduledDate(scheduledDate),
  }

  // ============================================================
  // Client Emails
  // ============================================================

  // Content Ready for Review (draft → sent_for_review)
  // But NOT if it's a resubmission (revisions_requested → sent_for_review)
  if (toStatus === 'sent_for_review' && fromStatus !== 'revisions_requested') {
    const clientEmail = await getClientEmail(clientId)
    if (clientEmail) {
      try {
        const template = getContentReadyForReviewEmail({
          ...emailData,
          portalUrl: clientPortalUrl,
        })
        const result = await sendEmail({
          to: clientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: ['content-status', 'ready-for-review'],
        })
        if (result.success) {
          console.log('[EMAIL SENT]', { to: clientEmail, subject: template.subject })
        }
      } catch (err) {
        console.error('[EMAIL FAILED]', { to: clientEmail, error: err })
      }
    }
  }

  // Revision Resubmitted (revisions_requested → sent_for_review)
  if (toStatus === 'sent_for_review' && fromStatus === 'revisions_requested') {
    const clientEmail = await getClientEmail(clientId)
    if (clientEmail) {
      try {
        const template = getRevisionResubmittedEmail({
          ...emailData,
          portalUrl: clientPortalUrl,
        })
        const result = await sendEmail({
          to: clientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: ['content-status', 'revision-resubmitted'],
        })
        if (result.success) {
          console.log('[EMAIL SENT]', { to: clientEmail, subject: template.subject })
        }
      } catch (err) {
        console.error('[EMAIL FAILED]', { to: clientEmail, error: err })
      }
    }
  }

  // Content Published (→ posted)
  if (toStatus === 'posted') {
    const clientEmail = await getClientEmail(clientId)
    if (clientEmail) {
      try {
        const template = getContentPublishedEmail({
          ...emailData,
          portalUrl: clientPortalUrl,
        })
        const result = await sendEmail({
          to: clientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: ['content-status', 'published'],
        })
        if (result.success) {
          console.log('[EMAIL SENT]', { to: clientEmail, subject: template.subject })
        }
      } catch (err) {
        console.error('[EMAIL FAILED]', { to: clientEmail, error: err })
      }
    }
  }

  // Content Scheduled (→ scheduled)
  if (toStatus === 'scheduled') {
    const clientEmail = await getClientEmail(clientId)
    if (clientEmail) {
      try {
        const template = getContentScheduledEmail({
          ...emailData,
          portalUrl: clientPortalUrl,
        })
        const result = await sendEmail({
          to: clientEmail,
          subject: template.subject,
          html: template.html,
          text: template.text,
          tags: ['content-status', 'scheduled'],
        })
        if (result.success) {
          console.log('[EMAIL SENT]', { to: clientEmail, subject: template.subject })
        }
      } catch (err) {
        console.error('[EMAIL FAILED]', { to: clientEmail, error: err })
      }
    }
  }

  // ============================================================
  // Team Emails
  // ============================================================

  const teamEmail = await getTeamEmail(assignedTo || null)

  // Client Started Reviewing (→ client_reviewing)
  if (toStatus === 'client_reviewing') {
    try {
      const template = getClientStartedReviewingEmail({
        ...emailData,
        portalUrl: portalContentUrl,
      })
      const result = await sendEmail({
        to: teamEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: ['content-status', 'client-reviewing'],
      })
      if (result.success) {
        console.log('[EMAIL SENT]', { to: teamEmail, subject: template.subject })
      }
    } catch (err) {
      console.error('[EMAIL FAILED]', { to: teamEmail, error: err })
    }
  }

  // Client Approved (→ approved)
  if (toStatus === 'approved') {
    try {
      const template = getClientApprovedEmail({
        ...emailData,
        portalUrl: portalContentUrl,
      })
      const result = await sendEmail({
        to: teamEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: ['content-status', 'client-approved'],
      })
      if (result.success) {
        console.log('[EMAIL SENT]', { to: teamEmail, subject: template.subject })
      }
    } catch (err) {
      console.error('[EMAIL FAILED]', { to: teamEmail, error: err })
    }
  }

  // Revisions Requested (→ revisions_requested)
  if (toStatus === 'revisions_requested') {
    try {
      const template = getRevisionsRequestedEmail({
        ...emailData,
        portalUrl: portalContentUrl,
      })
      const result = await sendEmail({
        to: teamEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: ['content-status', 'revisions-requested'],
      })
      if (result.success) {
        console.log('[EMAIL SENT]', { to: teamEmail, subject: template.subject })
      }
    } catch (err) {
      console.error('[EMAIL FAILED]', { to: teamEmail, error: err })
    }
  }
}
