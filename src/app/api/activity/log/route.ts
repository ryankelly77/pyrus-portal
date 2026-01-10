import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/activity/log - Log an activity event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError) {
      console.error('Activity log auth error:', authError)
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 })
    }

    if (!user) {
      console.log('Activity log: No user found in session')
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('Activity log: User authenticated:', user.id)

    const { activity_type, description, metadata } = await request.json()

    if (!activity_type) {
      return NextResponse.json({ error: 'activity_type is required' }, { status: 400 })
    }

    // Get user's profile and client info
    const profileResult = await dbPool.query(
      `SELECT id, client_id, role FROM profiles WHERE id = $1`,
      [user.id]
    )

    const profile = profileResult.rows[0]
    const clientId = profile?.client_id || null
    const userId = user.id

    // Determine activity type based on role
    let finalActivityType = activity_type
    if (activity_type === 'login') {
      if (profile?.role === 'admin' || profile?.role === 'super_admin') {
        finalActivityType = 'admin_login'
      } else if (clientId) {
        // Check if client has active subscriptions (to differentiate prospect vs client)
        const subResult = await dbPool.query(
          `SELECT COUNT(*) as count FROM subscriptions WHERE client_id = $1 AND status = 'active'`,
          [clientId]
        )
        const hasSubscriptions = parseInt(subResult.rows[0]?.count || '0') > 0
        finalActivityType = hasSubscriptions ? 'client_login' : 'prospect_login'
      }
    }

    // Insert activity log
    const insertResult = await dbPool.query(
      `INSERT INTO activity_log (client_id, user_id, activity_type, description, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [clientId, userId, finalActivityType, description || null, metadata ? JSON.stringify(metadata) : null]
    )

    console.log('Activity log: Inserted entry', insertResult.rows[0]?.id, 'type:', finalActivityType)

    return NextResponse.json({ success: true, id: insertResult.rows[0]?.id })
  } catch (error) {
    console.error('Error logging activity:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
