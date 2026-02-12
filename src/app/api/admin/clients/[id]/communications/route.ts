import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { communicationCreateSchema } from '@/lib/validation/schemas'
import { sendTemplatedEmail } from '@/lib/email/template-service'
import { isEmailConfigured } from '@/lib/email/mailgun'
import {
  isHighLevelConfigured,
  getAllMessagesForContact,
  getContactByEmail,
  transformHighLevelMessage,
} from '@/lib/highlevel/client'
import { logCrmError, logEmailError } from '@/lib/alerts'

export const dynamic = 'force-dynamic'

// Communication types
const COMM_TYPES = {
  EMAIL_INVITE: 'email_invite',
  EMAIL_REMINDER: 'email_reminder',
  EMAIL_GENERAL: 'email_general',
  RESULT_ALERT: 'result_alert',
  CHAT: 'chat',
  MONTHLY_REPORT: 'monthly_report',
  CONTENT_APPROVAL: 'content_approval',
  TASK_COMPLETE: 'task_complete',
  MEETING: 'meeting',
  CALL: 'call',
} as const

// Delivery statuses
const COMM_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  FAILED: 'failed',
  BOUNCED: 'bounced',
} as const

interface Communication {
  id: string
  clientId: string
  type: string
  title: string
  subject: string | null
  body: string | null
  status: string | null
  metadata: Record<string, any> | null
  highlightType: string | null
  recipientEmail?: string | null
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  createdAt: string | null
  createdBy?: string | null
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
}

// GET /api/admin/clients/[id]/communications - Get all communications for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // Filter by comm_type
    const includeHighLevel = searchParams.get('includeHighLevel') !== 'false' // Default true
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = { client_id: clientId }
    if (type) {
      whereClause.comm_type = type
    }

    // Fetch database communications and client info in parallel
    const [communications, client] = await Promise.all([
      prisma.client_communications.findMany({
        where: whereClause,
        orderBy: { sent_at: 'desc' },
        take: limit * 2, // Fetch more to account for merging
        skip: offset,
      }),
      prisma.clients.findUnique({
        where: { id: clientId },
        select: { highlevel_id: true, contact_email: true },
      }),
    ])

    // Transform database communications
    const dbCommunications: Communication[] = communications.map(comm => ({
      id: comm.id,
      clientId: comm.client_id,
      type: comm.comm_type,
      title: comm.title,
      subject: comm.subject,
      body: comm.body,
      status: comm.status,
      metadata: comm.metadata as Record<string, any> | null,
      highlightType: comm.highlight_type,
      recipientEmail: comm.recipient_email,
      openedAt: comm.opened_at?.toISOString() || null,
      clickedAt: comm.clicked_at?.toISOString() || null,
      sentAt: comm.sent_at?.toISOString() || null,
      createdBy: comm.created_by,
      createdAt: comm.created_at?.toISOString() || null,
      source: 'database' as const,
    }))

    // Fetch HighLevel messages if configured
    let hlCommunications: Communication[] = []

    if (includeHighLevel && isHighLevelConfigured() && client) {
      let highlevelContactId = client.highlevel_id

      // If no HighLevel ID stored, try to find by email
      if (!highlevelContactId && client.contact_email) {
        try {
          const contact = await getContactByEmail(client.contact_email)
          if (contact) {
            highlevelContactId = contact.id
            // Update the client record with the found ID
            await dbPool.query(
              `UPDATE clients SET highlevel_id = $1 WHERE id = $2`,
              [highlevelContactId, clientId]
            )
          }
        } catch (error: any) {
          console.error('Error looking up HighLevel contact by email:', error)
          logCrmError(
            `HighLevel contact lookup by email failed: ${error.message || 'Unknown error'}`,
            clientId,
            { email: client.contact_email, error: error.message },
            'admin/clients/[id]/communications/route.ts'
          )
        }
      }

      // Fetch HighLevel messages
      if (highlevelContactId) {
        try {
          const hlMessages = await getAllMessagesForContact(highlevelContactId, limit)

          hlCommunications = hlMessages.map(msg => {
            const transformed = transformHighLevelMessage(msg)
            return {
              id: transformed.id,
              clientId,
              type: transformed.type,
              title: transformed.title,
              subject: transformed.subject,
              body: transformed.body,
              status: transformed.status,
              metadata: transformed.metadata,
              highlightType: transformed.highlightType,
              openedAt: null,
              clickedAt: null,
              sentAt: transformed.sentAt,
              createdAt: transformed.sentAt,
              source: 'highlevel' as const,
              direction: transformed.direction,
            }
          })
        } catch (error: any) {
          console.error('Error fetching HighLevel messages:', error)
          logCrmError(
            `HighLevel messages fetch failed: ${error.message || 'Unknown error'}`,
            clientId,
            { highlevelContactId, error: error.message },
            'admin/clients/[id]/communications/route.ts'
          )
          // Continue without HighLevel messages
        }
      }
    }

    // Merge and sort all communications
    const allCommunications = [...dbCommunications, ...hlCommunications]
      .sort((a, b) => {
        const dateA = new Date(a.sentAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.sentAt || b.createdAt || 0).getTime()
        return dateB - dateA
      })
      .slice(0, limit)

    // Apply type filter to HighLevel messages if specified
    let filteredCommunications = allCommunications
    if (type) {
      filteredCommunications = allCommunications.filter(comm => {
        if (comm.source === 'database') return true // Already filtered in query
        // Filter HighLevel messages by type
        if (type === 'sms') return comm.type === 'sms'
        if (type === 'chat') return comm.type.startsWith('chat')
        if (type === 'email_highlevel') return comm.type === 'email_highlevel'
        return true
      })
    }

    return NextResponse.json(filteredCommunications)
  } catch (error: any) {
    console.error('Error fetching communications:', error)
    logCrmError(
      `Communications fetch failed: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/clients/[id]/communications/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/communications - Create a new communication
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params
    const validated = await validateRequest(communicationCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      type,
      title,
      subject,
      body: commBody,
      status = 'sent',
      metadata,
      highlightType,
      recipientEmail,
      createdBy,
    } = (validated as any).data

    // Get client info for email
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { name: true, contact_name: true, contact_email: true },
    })

    // Determine initial status - will be updated after email send
    let emailStatus = status
    let emailMessageId: string | undefined

    // Send email for result alerts if recipient email is provided
    if (type === 'result_alert' && recipientEmail && isEmailConfigured()) {
      try {
        const firstName = client?.contact_name?.split(' ')[0] || 'there'
        const clientName = client?.name || 'your business'
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'

        const result = await sendTemplatedEmail({
          templateSlug: 'result-alert',
          to: recipientEmail,
          variables: {
            firstName,
            clientName,
            alertType: metadata?.alertType || 'other',
            alertTypeLabel: metadata?.alertTypeLabel || 'Result Alert',
            subject: subject || title,
            message: commBody || '',
            portalUrl,
          },
          clientId,
          tags: ['result-alert', metadata?.alertType || 'other'],
        })

        if (result.success) {
          emailStatus = 'delivered'
          emailMessageId = result.messageId
          console.log(`[Communications] Result alert email sent to ${recipientEmail}`)
        } else {
          emailStatus = 'failed'
          console.error(`[Communications] Failed to send result alert: ${result.error}`)
        }
      } catch (emailError: any) {
        console.error('[Communications] Error sending result alert email:', emailError)
        logEmailError(
          `Result alert email send failed: ${emailError.message || 'Unknown error'}`,
          clientId,
          { recipientEmail, error: emailError.message },
          'admin/clients/[id]/communications/route.ts'
        )
        emailStatus = 'failed'
      }
    }

    const communication = await prisma.client_communications.create({
      data: {
        client_id: clientId,
        comm_type: type,
        title,
        subject,
        body: commBody,
        status: emailStatus,
        metadata: {
          ...metadata,
          ...(emailMessageId && { mailgunMessageId: emailMessageId }),
        },
        highlight_type: highlightType,
        recipient_email: recipientEmail,
        created_by: createdBy,
        sent_at: new Date(),
      },
    })

    return NextResponse.json({
      id: communication.id,
      clientId: communication.client_id,
      type: communication.comm_type,
      title: communication.title,
      subject: communication.subject,
      body: communication.body,
      status: communication.status,
      metadata: communication.metadata,
      highlightType: communication.highlight_type,
      recipientEmail: communication.recipient_email,
      sentAt: communication.sent_at,
      createdAt: communication.created_at,
    })
  } catch (error: any) {
    console.error('Error creating communication:', error)
    logCrmError(
      `Communication create failed: ${error.message || 'Unknown error'}`,
      undefined,
      { error: error.message },
      'admin/clients/[id]/communications/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}
