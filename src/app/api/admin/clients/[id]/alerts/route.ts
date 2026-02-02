import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/clients/[id]/alerts - Get alerts for a specific client (admin only)
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params

    // Get published, non-dismissed alerts for this client
    const alerts = await prisma.client_alerts.findMany({
      where: {
        client_id: clientId,
        status: 'published',
        dismissed_at: null,
      },
      select: {
        id: true,
        message: true,
        alert_type: true,
        published_at: true,
      },
      orderBy: { published_at: 'desc' },
    })

    return NextResponse.json({
      alerts: alerts.map(a => ({
        id: a.id,
        message: a.message,
        alert_type: a.alert_type,
        published_at: a.published_at?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch client alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
