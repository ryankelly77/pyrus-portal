import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/client/page-view - Log a page view for the current user
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { page, pageName, clientId: viewingAsClientId } = await request.json()

    if (!page) {
      return NextResponse.json({ error: 'page is required' }, { status: 400 })
    }

    // Get client ID - either from viewingAs parameter or user's profile
    let clientId = viewingAsClientId
    let clientName = null

    if (viewingAsClientId) {
      // Admin viewing as a specific client
      const clientResult = await dbPool.query(
        `SELECT id, name FROM clients WHERE id = $1`,
        [viewingAsClientId]
      )
      if (clientResult.rows[0]) {
        clientId = clientResult.rows[0].id
        clientName = clientResult.rows[0].name
      }
    } else {
      // Regular client user - get from profile
      const clientResult = await dbPool.query(
        `SELECT c.id, c.name FROM clients c
         JOIN profiles p ON p.client_id = c.id
         WHERE p.id = $1`,
        [user.id]
      )
      if (clientResult.rows[0]) {
        clientId = clientResult.rows[0].id
        clientName = clientResult.rows[0].name
      }
    }

    // Log the page view to activity_log
    await dbPool.query(
      `INSERT INTO activity_log (user_id, client_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        clientId || null,
        'page_view',
        `Viewed ${pageName || page}`,
        JSON.stringify({ page, pageName, clientName, viewingAs: !!viewingAsClientId, userAgent: request.headers.get('user-agent') })
      ]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging page view:', error)
    return NextResponse.json({ error: 'Failed to log page view' }, { status: 500 })
  }
}
