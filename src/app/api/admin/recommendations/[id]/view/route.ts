import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/admin/recommendations/[id]/view - Track when client views recommendation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { viewerName, viewerEmail } = body as { viewerName?: string; viewerEmail?: string }

    // Check if recommendation exists
    const recommendation = await prisma.recommendations.findUnique({
      where: { id },
      include: { client: true },
    })

    if (!recommendation) {
      return NextResponse.json(
        { error: 'Recommendation not found' },
        { status: 404 }
      )
    }

    // Check if we've already logged a view recently (within last hour) to avoid duplicate entries
    const recentView = await prisma.recommendation_history.findFirst({
      where: {
        recommendation_id: id,
        action: 'Client viewed recommendation',
        created_at: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    })

    if (recentView) {
      // Already logged a view recently, don't create duplicate
      return NextResponse.json({ success: true, alreadyLogged: true })
    }

    // Add history entry for view
    const viewerInfo = viewerName || viewerEmail || recommendation.client?.contact_name || 'Client'

    await prisma.recommendation_history.create({
      data: {
        recommendation_id: id,
        action: 'Client viewed recommendation',
        details: `Viewed by ${viewerInfo}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to track view:', error)
    return NextResponse.json(
      { error: 'Failed to track view' },
      { status: 500 }
    )
  }
}
