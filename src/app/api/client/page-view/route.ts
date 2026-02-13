import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/client/page-view - Log a page view for the current user
// Only logs views from actual clients, NOT admin "view as client" sessions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { page, pageName } = await request.json()

    if (!page) {
      return NextResponse.json({ error: 'page is required' }, { status: 400 })
    }

    // Check if user is an admin - don't log page views for admins
    const profileResult = await dbPool.query(
      `SELECT role, client_id FROM profiles WHERE id = $1`,
      [user.id]
    )
    const profile = profileResult.rows[0]

    // Skip logging for admin users (super_admin or admin role)
    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      return NextResponse.json({ success: true, skipped: 'admin_user' })
    }

    // Regular client user - get client info
    let clientId = profile?.client_id
    let clientName = null

    if (clientId) {
      const clientResult = await dbPool.query(
        `SELECT name FROM clients WHERE id = $1`,
        [clientId]
      )
      clientName = clientResult.rows[0]?.name
    }

    // Log the page view to activity_log (only for real client users)
    await dbPool.query(
      `INSERT INTO activity_log (user_id, client_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        clientId || null,
        'page_view',
        `Viewed ${pageName || page}`,
        JSON.stringify({ page, pageName, clientName, userAgent: request.headers.get('user-agent') })
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging page view:', error)
    return NextResponse.json({ error: 'Failed to log page view' }, { status: 500 })
  }
}
