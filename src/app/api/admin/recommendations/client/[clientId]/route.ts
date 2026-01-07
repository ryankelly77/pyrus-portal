import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/recommendations/client/[clientId] - Get recommendation for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params

    // Find the most recent draft recommendation for this client
    const recommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        status: 'draft',
      },
      include: {
        client: true,
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    if (!recommendation) {
      return NextResponse.json(null)
    }

    return NextResponse.json(recommendation)
  } catch (error) {
    console.error('Failed to fetch client recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendation' },
      { status: 500 }
    )
  }
}
