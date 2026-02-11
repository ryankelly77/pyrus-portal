import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/subscriptions/cleanup-test
// Removes test subscriptions and their activity log entries
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Only super_admin can run cleanup
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can run cleanup' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { clientNames } = body

    if (!clientNames || !Array.isArray(clientNames) || clientNames.length === 0) {
      return NextResponse.json(
        { error: 'clientNames array is required' },
        { status: 400 }
      )
    }

    const results = {
      clientsProcessed: [] as string[],
      subscriptionsDeleted: 0,
      subscriptionHistoryDeleted: 0,
      activityLogsDeleted: 0,
      errors: [] as string[],
    }

    for (const clientName of clientNames) {
      try {
        // Find client by name
        const client = await prisma.clients.findFirst({
          where: { name: { equals: clientName, mode: 'insensitive' } },
          select: { id: true, name: true }
        })

        if (!client) {
          results.errors.push(`Client not found: ${clientName}`)
          continue
        }

        results.clientsProcessed.push(client.name)

        // Find subscriptions for this client
        const subscriptions = await prisma.subscriptions.findMany({
          where: { client_id: client.id },
          select: { id: true, stripe_subscription_id: true }
        })

        for (const sub of subscriptions) {
          // Delete subscription history
          const historyResult = await prisma.subscription_history.deleteMany({
            where: { subscription_id: sub.id }
          })
          results.subscriptionHistoryDeleted += historyResult.count

          // Delete the subscription
          await prisma.subscriptions.delete({
            where: { id: sub.id }
          })
          results.subscriptionsDeleted++
        }

        // Delete activity log entries for this client (purchase/payment types)
        const activityResult = await prisma.activity_log.deleteMany({
          where: {
            client_id: client.id,
            activity_type: { in: ['purchase', 'payment'] }
          }
        })
        results.activityLogsDeleted += activityResult.count

      } catch (clientError) {
        const msg = clientError instanceof Error ? clientError.message : String(clientError)
        results.errors.push(`${clientName}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cleanup completed',
      results
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to run cleanup' },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what would be cleaned up
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const clientNamesParam = searchParams.get('clientNames')

    if (!clientNamesParam) {
      return NextResponse.json(
        { error: 'clientNames query param is required (comma-separated)' },
        { status: 400 }
      )
    }

    const clientNames = clientNamesParam.split(',').map(n => n.trim())

    const preview = []

    for (const clientName of clientNames) {
      const client = await prisma.clients.findFirst({
        where: { name: { equals: clientName, mode: 'insensitive' } },
        select: { id: true, name: true }
      })

      if (!client) {
        preview.push({ clientName, found: false })
        continue
      }

      const subscriptions = await prisma.subscriptions.findMany({
        where: { client_id: client.id },
        include: { subscription_history: true }
      })

      const activityLogs = await prisma.activity_log.count({
        where: {
          client_id: client.id,
          activity_type: { in: ['purchase', 'payment'] }
        }
      })

      preview.push({
        clientName: client.name,
        found: true,
        subscriptions: subscriptions.length,
        subscriptionHistory: subscriptions.reduce((sum, s) => sum + s.subscription_history.length, 0),
        activityLogs,
      })
    }

    return NextResponse.json({ preview })

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to preview cleanup' },
      { status: 500 }
    )
  }
}
