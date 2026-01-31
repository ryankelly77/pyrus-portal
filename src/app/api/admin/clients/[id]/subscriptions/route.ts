import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { getSubscriptionData } from '@/lib/services/subscriptionService'

export const dynamic = 'force-dynamic'

// GET /api/admin/clients/[id]/subscriptions - Get subscription data for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { id: clientId } = await params

    // Get subscription data using shared service
    const subscriptionData = await getSubscriptionData(clientId)

    return NextResponse.json(subscriptionData)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
