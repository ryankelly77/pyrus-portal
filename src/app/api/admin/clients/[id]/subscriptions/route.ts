import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/clients/[id]/subscriptions - Get subscriptions for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id } = await params

    // Fetch active subscriptions for the client
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        client_id: id,
        status: { in: ['active', 'trialing'] },
      },
      include: {
        subscription_items: {
          include: {
            product: true,
            bundle: true,
          },
        },
        subscription_history: {
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
