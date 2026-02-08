import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// GET /api/admin/performance/[clientId]/history - Get score history for sparkline
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { clientId } = await params

    // Get last 30 score records
    const history = await prisma.score_history.findMany({
      where: { client_id: clientId },
      orderBy: { recorded_at: 'asc' },
      take: 30,
      select: {
        id: true,
        score: true,
        growth_stage: true,
        recorded_at: true,
      },
    })

    return NextResponse.json({
      history: history.map(h => ({
        score: h.score,
        stage: h.growth_stage,
        date: h.recorded_at.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch score history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch score history' },
      { status: 500 }
    )
  }
}
