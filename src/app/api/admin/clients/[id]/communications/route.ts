import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

// GET /api/admin/clients/[id]/communications - Get all communications for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get('type') // Filter by comm_type
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const whereClause: any = { client_id: clientId }
    if (type) {
      whereClause.comm_type = type
    }

    const communications = await prisma.client_communications.findMany({
      where: whereClause,
      orderBy: { sent_at: 'desc' },
      take: limit,
      skip: offset,
    })

    // Transform for frontend
    const transformed = communications.map(comm => ({
      id: comm.id,
      clientId: comm.client_id,
      type: comm.comm_type,
      title: comm.title,
      subject: comm.subject,
      body: comm.body,
      status: comm.status,
      metadata: comm.metadata,
      highlightType: comm.highlight_type,
      recipientEmail: comm.recipient_email,
      openedAt: comm.opened_at,
      clickedAt: comm.clicked_at,
      sentAt: comm.sent_at,
      createdBy: comm.created_by,
      createdAt: comm.created_at,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Error fetching communications:', error)
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
    const { id: clientId } = await params
    const body = await request.json()

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
    } = body

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Type and title are required' },
        { status: 400 }
      )
    }

    const communication = await prisma.client_communications.create({
      data: {
        client_id: clientId,
        comm_type: type,
        title,
        subject,
        body: commBody,
        status,
        metadata,
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
  } catch (error) {
    console.error('Error creating communication:', error)
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}
