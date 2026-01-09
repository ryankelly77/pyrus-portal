import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/subscriptions/[subscriptionId]/history - Get history for a subscription
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  try {
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
    const { subscriptionId } = await params
    const body = await request.json()
    const { action, details, created_by } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const historyEntry = await prisma.subscription_history.create({
      data: {
        subscription_id: subscriptionId,
        action,
        details: details || null,
        created_by: created_by || null,
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
