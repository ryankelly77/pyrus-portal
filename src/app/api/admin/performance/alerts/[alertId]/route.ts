import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/performance/alerts/[alertId] - Get single alert
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { alertId } = await params

    const alert = await prisma.client_alerts.findUnique({
      where: { id: alertId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: alert.id,
      client_id: alert.client_id,
      client_name: alert.client.name,
      message: alert.message,
      alert_type: alert.alert_type,
      status: alert.status,
      published_at: alert.published_at?.toISOString() || null,
      dismissed_at: alert.dismissed_at?.toISOString() || null,
      created_by: alert.created_by,
      created_at: alert.created_at?.toISOString() || null,
    })
  } catch (error) {
    console.error('Failed to fetch alert:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/performance/alerts/[alertId] - Update alert
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { alertId } = await params
    const body = await request.json()

    const alert = await prisma.client_alerts.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    // Only allow updates if not yet published
    if (alert.status === 'published' && body.message) {
      return NextResponse.json(
        { error: 'Cannot edit published alert message' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (body.message && alert.status === 'draft') {
      updateData.message = body.message
    }

    if (body.publish && alert.status === 'draft') {
      updateData.status = 'published'
      updateData.published_at = new Date()
    }

    const updated = await prisma.client_alerts.update({
      where: { id: alertId },
      data: updateData,
    })

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      published_at: updated.published_at?.toISOString() || null,
    })
  } catch (error) {
    console.error('Failed to update alert:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/performance/alerts/[alertId] - Delete alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

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

    await prisma.client_alerts.delete({
      where: { id: alertId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete alert:', error)
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    )
  }
}
