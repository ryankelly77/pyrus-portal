import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Get the current client's ID from the authenticated user
 */
async function getClientId(): Promise<{ clientId: string } | NextResponse> {
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

  return { clientId: profile.client_id }
}

// GET /api/client/alerts - Get active alerts for logged-in client
export async function GET(request: NextRequest) {
  try {
    const result = await getClientId()
    if (result instanceof NextResponse) return result
    const { clientId } = result

    // Get published, non-dismissed alerts
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
