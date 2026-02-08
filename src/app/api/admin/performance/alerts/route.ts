import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { CreateClientAlertSchema } from '@/lib/validation/performanceSchemas'

export const dynamic = 'force-dynamic';

// POST /api/admin/performance/alerts - Create a client alert
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()

    // Validate input
    const result = CreateClientAlertSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      )
    }

    const { client_id, message, alert_type, publish } = result.data

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: client_id },
      select: { id: true, name: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Create the alert
    const alert = await prisma.client_alerts.create({
      data: {
        client_id,
        message,
        alert_type,
        status: publish ? 'published' : 'draft',
        published_at: publish ? new Date() : null,
        created_by: user.id,
      },
    })

    // Log to activity if published
    if (publish) {
      await prisma.activity_log.create({
        data: {
          client_id,
          user_id: user.id,
          activity_type: 'alert_published',
          description: `Performance alert published: ${alert_type}`,
          metadata: {
            alert_id: alert.id,
            alert_type,
          },
        },
      })
    }

    return NextResponse.json({
      id: alert.id,
      status: alert.status,
      published_at: alert.published_at?.toISOString() || null,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create alert:', error)
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    )
  }
}

// GET /api/admin/performance/alerts - List all alerts (optional)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (clientId) where.client_id = clientId
    if (status) where.status = status

    const alerts = await prisma.client_alerts.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    })

    return NextResponse.json({
      alerts: alerts.map(a => ({
        id: a.id,
        client_id: a.client_id,
        client_name: a.client.name,
        message: a.message,
        alert_type: a.alert_type,
        status: a.status,
        published_at: a.published_at?.toISOString() || null,
        dismissed_at: a.dismissed_at?.toISOString() || null,
        created_at: a.created_at?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}
