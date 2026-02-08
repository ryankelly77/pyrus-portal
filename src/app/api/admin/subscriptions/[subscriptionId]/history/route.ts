import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { subscriptionHistorySchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic';

// GET /api/admin/subscriptions/[subscriptionId]/history - Get history for a subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { subscriptionId } = await params

    const history = await prisma.subscription_history.findMany({
      where: { subscription_id: subscriptionId },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(history)
  } catch (error) {
    console.error('Failed to fetch subscription history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription history' },
      { status: 500 }
    )
  }
}

// POST /api/admin/subscriptions/[subscriptionId]/history - Add history entry
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { subscriptionId } = await params
    const validated = await validateRequest(subscriptionHistorySchema, request)
    if ((validated as any).error) return (validated as any).error

    const { action, details } = (validated as any).data

    const historyEntry = await prisma.subscription_history.create({
      data: {
        subscription_id: subscriptionId,
        action,
        details: details || null,
        created_by: user?.id || null,
      },
    })

    return NextResponse.json(historyEntry)
  } catch (error) {
    console.error('Failed to create subscription history:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription history' },
      { status: 500 }
    )
  }
}
