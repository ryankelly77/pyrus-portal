import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ alertId: string }>
}

// POST /api/client/alerts/[alertId]/view - Log that a client viewed an alert
// Supports ?clientId= query param for admin viewing as client
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { alertId } = await params
    const { searchParams } = new URL(request.url)
    const viewingAsClientId = searchParams.get('clientId')

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // If viewing as a client, verify admin role
    if (viewingAsClientId) {
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Get the alert to verify it exists and get client info
    const alert = await prisma.client_alerts.findUnique({
      where: { id: alertId },
      select: {
        id: true,
        client_id: true,
        message: true,
        alert_type: true,
      },
    })

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    // Verify the alert belongs to the client being viewed
    if (viewingAsClientId && alert.client_id !== viewingAsClientId) {
      return NextResponse.json({ error: 'Alert not found for this client' }, { status: 404 })
    }

    // Check if we've already logged this view recently (within 24 hours)
    const recentView = await prisma.client_communications.findFirst({
      where: {
        client_id: alert.client_id,
        comm_type: 'client_alert',
        metadata: {
          path: ['alertId'],
          equals: alertId,
        },
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })

    if (recentView) {
      // Already logged recently, no need to log again
      return NextResponse.json({ success: true, logged: false })
    }

    // Format alert type for display
    const alertTypeLabels: Record<string, string> = {
      milestone: 'Milestone',
      intervention: 'Action Required',
      performance_focus: 'Performance Update',
    }

    // Log the view as a communication
    await prisma.client_communications.create({
      data: {
        client_id: alert.client_id,
        comm_type: 'client_alert',
        title: `Viewed: ${alertTypeLabels[alert.alert_type] || 'Alert'}`,
        body: alert.message,
        status: 'viewed',
        highlight_type: alert.alert_type === 'intervention' ? 'failed' : 'success',
        sent_at: new Date(),
        metadata: {
          alertId: alert.id,
          alertType: alert.alert_type,
        },
      },
    })

    return NextResponse.json({ success: true, logged: true })
  } catch (error) {
    console.error('Failed to log alert view:', error)
    return NextResponse.json(
      { error: 'Failed to log alert view' },
      { status: 500 }
    )
  }
}
