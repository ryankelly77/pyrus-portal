import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/subscriptions/backfill-activity
// Backfills activity_log entries for historical subscription events
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Only super_admin can run backfill
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can run backfill' },
        { status: 403 }
      )
    }

    const results = {
      subscriptionsProcessed: 0,
      activitiesCreated: 0,
      errors: [] as string[],
    }

    // Get all subscriptions with their history
    const subscriptions = await prisma.subscriptions.findMany({
      include: {
        client: { select: { id: true, name: true } },
        subscription_history: {
          orderBy: { created_at: 'asc' }
        }
      }
    })

    for (const subscription of subscriptions) {
      if (!subscription.client_id || !subscription.stripe_subscription_id) continue

      results.subscriptionsProcessed++

      try {
        // Check for existing activity_log entries for this subscription
        const existingActivities = subscription.stripe_subscription_id
          ? await prisma.activity_log.findMany({
              where: {
                client_id: subscription.client_id,
                activity_type: { in: ['purchase', 'payment'] },
                metadata: {
                  path: ['subscriptionId'],
                  equals: subscription.stripe_subscription_id
                }
              }
            })
          : []

        const existingActions = new Set(
          existingActivities.map(a => {
            const meta = a.metadata as Record<string, any> | null
            return meta?.action || 'unknown'
          })
        )

        // Create activity for subscription creation if not exists
        if (subscription.created_at && !existingActions.has('created')) {
          // Check if there's already a purchase activity around this time
          const hasPurchaseActivity = existingActivities.some(a => {
            const desc = a.description?.toLowerCase() || ''
            return desc.includes('purchased') || desc.includes('new subscription')
          })

          if (!hasPurchaseActivity) {
            await prisma.activity_log.create({
              data: {
                client_id: subscription.client_id,
                activity_type: 'purchase',
                description: `Subscription started${subscription.client?.name ? ` for ${subscription.client.name}` : ''}`,
                metadata: {
                  subscriptionId: subscription.stripe_subscription_id,
                  action: 'created',
                  status: subscription.status,
                  backfilled: true,
                },
                created_at: subscription.created_at,
              }
            })
            results.activitiesCreated++
          }
        }

        // Process subscription history entries
        for (const history of subscription.subscription_history) {
          const actionKey = `${history.action}-${history.created_at?.toISOString()}`

          // Check if we already have an activity for this specific history entry
          const hasActivity = existingActivities.some(a => {
            const meta = a.metadata as Record<string, any> | null
            return meta?.historyId === history.id
          })

          if (hasActivity) continue

          let activityType = 'purchase'
          let description = history.details || ''

          switch (history.action) {
            case 'created':
              description = description || 'Subscription initiated'
              break
            case 'activated':
              description = description || 'Subscription activated'
              break
            case 'canceled':
              description = description || 'Subscription canceled'
              break
            case 'service_added':
              description = description || 'Service added to subscription'
              break
            case 'service_removed':
              description = description || 'Service removed from subscription'
              break
            case 'billing_updated':
              activityType = 'payment'
              description = description || 'Billing information updated'
              break
            case 'status_changed':
              description = description || 'Subscription status changed'
              break
            default:
              description = description || `Subscription ${history.action}`
          }

          await prisma.activity_log.create({
            data: {
              client_id: subscription.client_id,
              activity_type: activityType,
              description,
              metadata: {
                subscriptionId: subscription.stripe_subscription_id,
                historyId: history.id,
                action: history.action,
                backfilled: true,
              },
              created_at: history.created_at || new Date(),
            }
          })
          results.activitiesCreated++
        }

        // If subscription is active but we haven't logged an activation
        if (subscription.status === 'active' && !existingActions.has('activated')) {
          const hasActivation = existingActivities.some(a => {
            const desc = a.description?.toLowerCase() || ''
            return desc.includes('activated') || desc.includes('purchased')
          })

          if (!hasActivation && subscription.subscription_history.length === 0) {
            await prisma.activity_log.create({
              data: {
                client_id: subscription.client_id,
                activity_type: 'purchase',
                description: `Subscription active${subscription.client?.name ? ` for ${subscription.client.name}` : ''}`,
                metadata: {
                  subscriptionId: subscription.stripe_subscription_id,
                  action: 'activated',
                  status: 'active',
                  backfilled: true,
                },
                created_at: subscription.current_period_start || subscription.created_at || new Date(),
              }
            })
            results.activitiesCreated++
          }
        }

        // If subscription is canceled but we haven't logged it
        // Cast to any to access canceled_at which may not be in the type definition
        const subData = subscription as any
        if ((subscription.status === 'canceled' || subData.canceled_at) && !existingActions.has('canceled')) {
          const hasCancellation = existingActivities.some(a => {
            const desc = a.description?.toLowerCase() || ''
            return desc.includes('cancel')
          })

          if (!hasCancellation) {
            await prisma.activity_log.create({
              data: {
                client_id: subscription.client_id,
                activity_type: 'purchase',
                description: 'Subscription canceled',
                metadata: {
                  subscriptionId: subscription.stripe_subscription_id,
                  action: 'canceled',
                  backfilled: true,
                },
                created_at: subData.canceled_at || new Date(),
              }
            })
            results.activitiesCreated++
          }
        }

      } catch (subError) {
        const errMsg = subError instanceof Error ? subError.message : String(subError)
        results.errors.push(`Subscription ${subscription.id}: ${errMsg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backfill completed',
      results
    })

  } catch (error) {
    console.error('Backfill error:', error)
    return NextResponse.json(
      { error: 'Failed to run backfill' },
      { status: 500 }
    )
  }
}

// GET endpoint to preview what would be backfilled
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Get counts for preview
    const subscriptions = await prisma.subscriptions.findMany({
      include: {
        client: { select: { id: true, name: true } },
        subscription_history: true
      }
    })

    // Filter to only those with client_id
    const subscriptionsWithClient = subscriptions.filter(s => s.client_id)

    const existingPurchaseActivities = await prisma.activity_log.count({
      where: { activity_type: { in: ['purchase', 'payment'] } }
    })

    const subscriptionHistoryCount = await prisma.subscription_history.count()

    return NextResponse.json({
      subscriptionsToProcess: subscriptionsWithClient.length,
      subscriptionHistoryEntries: subscriptionHistoryCount,
      existingPurchaseActivities,
      subscriptions: subscriptionsWithClient.map(s => ({
        id: s.id,
        clientName: s.client?.name || 'Unknown',
        status: s.status,
        historyCount: s.subscription_history.length,
        createdAt: s.created_at,
      }))
    })

  } catch (error) {
    console.error('Preview error:', error)
    return NextResponse.json(
      { error: 'Failed to preview backfill' },
      { status: 500 }
    )
  }
}
