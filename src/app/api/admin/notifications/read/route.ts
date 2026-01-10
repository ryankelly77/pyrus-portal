import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/admin/notifications/read - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { notifications } = await request.json()

    if (!notifications || !Array.isArray(notifications)) {
      return NextResponse.json({ error: 'notifications array is required' }, { status: 400 })
    }

    // Insert read records for each notification
    for (const notification of notifications) {
      await dbPool.query(
        `INSERT INTO notification_reads (user_id, notification_type, notification_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, notification_type, notification_id) DO NOTHING`,
        [user.id, notification.type, notification.id]
      )
    }

    return NextResponse.json({ success: true, count: notifications.length })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 })
  }
}

// GET /api/admin/notifications/read - Get read notification IDs for current user
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const result = await dbPool.query(
      `SELECT notification_type, notification_id FROM notification_reads WHERE user_id = $1`,
      [user.id]
    )

    // Return as a set of "type:id" strings for easy lookup
    const readIds = result.rows.map(r => `${r.notification_type}:${r.notification_id}`)

    return NextResponse.json({ readIds })
  } catch (error) {
    console.error('Error fetching read notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
