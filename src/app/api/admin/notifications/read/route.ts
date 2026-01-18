import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { dbPool } from '@/lib/prisma'
import { validateRequest } from '@/lib/validation/validateRequest'
import { notificationsReadSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'
function isAuth(obj: any): obj is { user: any; profile: any } { return obj && typeof obj === 'object' && 'user' in obj }

// POST /api/admin/notifications/read - Mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    if (!isAuth(auth)) return auth
    const { user } = auth

    const validated = await validateRequest(notificationsReadSchema, request)
    if ((validated as any).error) return (validated as any).error

    const { notifications } = (validated as any).data

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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    if (!isAuth(auth)) return auth
    const { user } = auth

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
