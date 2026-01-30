import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Get the current client's ID and user ID from the authenticated user
 */
async function getClientAndUser(): Promise<{ clientId: string; userId: string } | NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { client_id: true },
  })

  if (!profile?.client_id) {
    return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
  }

  return { clientId: profile.client_id, userId: user.id }
}

// POST /api/client/alerts/[alertId]/dismiss - Client dismiss alert
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const result = await getClientAndUser()
    if (result instanceof NextResponse) return result
    const { clientId, userId } = result

    const { alertId } = await params

    // Find the alert and verify it belongs to this client
    const alert = await prisma.client_alerts.findUnique({
      where: { id: alertId },
    })

    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }

    if (alert.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Alert does not belong to this client' },
        { status: 403 }
      )
    }

    if (alert.status === 'dismissed') {
      return NextResponse.json(
        { error: 'Alert already dismissed' },
        { status: 400 }
      )
    }

    // Dismiss the alert
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
        client_id: clientId,
        user_id: userId,
        activity_type: 'alert_dismissed',
        description: 'Client dismissed performance alert',
        metadata: {
          alert_id: alert.id,
          alert_type: alert.alert_type,
          dismissed_by: 'client',
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
