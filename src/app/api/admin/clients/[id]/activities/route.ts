import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getClientActivity } from '@/lib/services/activityService'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/activities - Get activities for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id: clientId } = await params

    // Get activity data using shared service
    const activities = await getClientActivity(clientId)

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
