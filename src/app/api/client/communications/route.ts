import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import {
  isHighLevelConfigured,
  getAllMessagesForContact,
  getContactByEmail,
  transformHighLevelMessage,
} from '@/lib/highlevel/client'

export const dynamic = 'force-dynamic'

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
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get the current user's client
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      // Get profile with client_id
      const profileResult = await dbPool.query(
        `SELECT client_id FROM profiles WHERE id = $1`,
        [user.id]
      )

      const profileClientId = profileResult.rows[0]?.client_id

      if (!profileClientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileClientId
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Get query params for filtering
    const type = searchParams.get('type')
    const includeHighLevel = searchParams.get('includeHighLevel') !== 'false' // Default true
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build WHERE clause for database communications
    let whereClause = 'WHERE client_id = $1'
    const params: any[] = [clientId]

    if (type) {
      params.push(type)
      whereClause += ` AND comm_type = $${params.length}`
    }

    // Fetch database communications and client info in parallel
    const [commResult, clientResult] = await Promise.all([
      dbPool.query(
        `SELECT
          id,
          client_id,
          comm_type,
          title,
          subject,
          body,
          status,
          metadata,
          highlight_type,
          recipient_email,
          opened_at,
          clicked_at,
          sent_at,
          created_at
        FROM client_communications
        ${whereClause}
        ORDER BY sent_at DESC NULLS LAST, created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit * 2, offset] // Fetch more to account for merging
      ),
      dbPool.query(
        `SELECT highlevel_id, contact_email FROM clients WHERE id = $1`,
        [clientId]
      ),
    ])

    // Transform database communications
    const dbCommunications: Communication[] = commResult.rows.map(comm => ({
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
      createdAt: comm.created_at,
      source: 'database' as const,
    }))

    // Fetch HighLevel messages if configured
    let hlCommunications: Communication[] = []

    if (includeHighLevel && isHighLevelConfigured()) {
      const client = clientResult.rows[0]
      let highlevelContactId = client?.highlevel_id

      // If no HighLevel ID stored, try to find by email
      if (!highlevelContactId && client?.contact_email) {
        try {
          const contact = await getContactByEmail(client.contact_email)
          if (contact) {
            highlevelContactId = contact.id
            // Optionally: update the client record with the found ID
            await dbPool.query(
              `UPDATE clients SET highlevel_id = $1 WHERE id = $2`,
              [highlevelContactId, clientId]
            )
          }
        } catch (error) {
          console.error('Error looking up HighLevel contact by email:', error)
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
        } catch (error) {
          console.error('Error fetching HighLevel messages:', error)
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
  } catch (error) {
    console.error('Error fetching client communications:', error)
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
  }
}
