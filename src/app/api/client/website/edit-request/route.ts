import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Map request type to friendly label
function getRequestTypeLabel(requestType: string): string {
  switch (requestType) {
    case 'content_update': return 'Content Update'
    case 'bug_fix': return 'Bug Fix'
    case 'new_feature': return 'New Feature'
    case 'design_change': return 'Design Change'
    default: return requestType
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { clientId, title, description, requestType, priority } = body

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

    // Validate priority if provided
    const validPriorities = ['low', 'normal', 'high', 'urgent']
    const priorityValue = priority && validPriorities.includes(priority) ? priority : 'normal'

    // Verify user has access to this client
    const profileResult = await dbPool.query(
      'SELECT client_id, role, full_name FROM profiles WHERE id = $1',
      [user.id]
    )

    const profile = profileResult.rows[0]
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Allow if admin or if user belongs to this client
    if (profile.role !== 'admin' && profile.role !== 'super_admin' && profile.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get client name for activity log
    const clientResult = await dbPool.query(
      'SELECT name FROM clients WHERE id = $1',
      [clientId]
    )
    const clientName = clientResult.rows[0]?.name || 'Unknown Client'

    // Create the edit request
    const result = await dbPool.query(`
      INSERT INTO website_edit_requests (client_id, title, description, request_type, priority, status, created_by)
      VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING id, title, description, request_type, priority, status, created_at
    `, [clientId, title.substring(0, 255), description, requestType, priorityValue, user.id])

    const newRequest = result.rows[0]

    // Create activity log entry for admin notifications
    const requestTypeLabel = getRequestTypeLabel(requestType)
    await dbPool.query(`
      INSERT INTO activity_log (client_id, user_id, activity_type, description, metadata)
      VALUES ($1, $2, 'website_edit_request', $3, $4)
    `, [
      clientId,
      user.id,
      `New website edit request: ${title.substring(0, 100)}`,
      JSON.stringify({
        requestId: newRequest.id,
        requestType: requestType,
        requestTypeLabel: requestTypeLabel,
        title: title.substring(0, 255),
        clientName: clientName,
        submittedBy: profile.full_name || user.email,
      })
    ])

    return NextResponse.json(newRequest)
  } catch (error) {
    console.error('Error creating edit request:', error)
    return NextResponse.json({ error: 'Failed to create edit request' }, { status: 500 })
  }
}
