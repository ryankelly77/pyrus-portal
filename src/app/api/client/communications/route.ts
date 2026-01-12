import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build WHERE clause
    let whereClause = 'WHERE client_id = $1'
    const params: any[] = [clientId]

    if (type) {
      params.push(type)
      whereClause += ` AND comm_type = $${params.length}`
    }

    // Fetch communications
    const result = await dbPool.query(
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
      [...params, limit, offset]
    )

    // Transform for frontend
    const communications = result.rows.map(comm => ({
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
    }))

    return NextResponse.json(communications)
  } catch (error) {
    console.error('Error fetching client communications:', error)
    return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 })
  }
}
