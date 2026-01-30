import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/performance/alerts/[alertId]/dismiss - Admin dismiss alert
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const { alertId } = await params

    const alert = await prisma.client_alerts.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    if (alert.status === 'dismissed') {
      return NextResponse.json(
        { error: 'Alert already dismissed' },
        { status: 400 }
      )
    }

    const updated = await prisma.client_alerts.update({
      where: { id: alertId },
      data: {
        status: 'dismissed',
        dismissed_at: new Date(),
      },
    })

    // Log activity
    await prisma.activity_log.create({
      data: {
        client_id: alert.client_id,
        user_id: user.id,
        activity_type: 'alert_dismissed',
        description: `Alert dismissed by admin`,
        metadata: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          dismissed_by: 'admin',
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      dismissed_at: updated.dismissed_at?.toISOString() || null,
    })
  } catch (error) {
    console.error('Failed to dismiss alert:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss alert' },
      { status: 500 }
    )
  }
}
