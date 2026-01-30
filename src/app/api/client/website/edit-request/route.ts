import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, title, description, requestType } = body

    // Validate required fields
    if (!clientId || !title || !requestType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Validate request type
    const validTypes = ['content_update', 'bug_fix', 'new_feature', 'design_change']
    if (!validTypes.includes(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    }

    // Verify user has access to this client
    const profileResult = await dbPool.query(
      'SELECT client_id, role FROM profiles WHERE id = $1',
      [user.id]
    )

    const profile = profileResult.rows[0]
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Allow if admin or if user belongs to this client
    if (profile.role !== 'admin' && profile.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create the edit request
    const result = await dbPool.query(`
      INSERT INTO website_edit_requests (client_id, title, description, request_type, status, created_by)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING id, title, description, request_type, status, created_at
    `, [clientId, title.substring(0, 255), description, requestType, user.id])

    return NextResponse.json(result.rows[0])
  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json({ error: 'Failed to create edit request' }, { status: 500 })
  }
}
