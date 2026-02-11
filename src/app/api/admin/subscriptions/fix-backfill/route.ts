import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/admin/subscriptions/fix-backfill
// Removes bad backfilled entries and recreates them with proper amounts
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const results = {
      deletedBackfillEntries: 0,
      recreatedEntries: 0,
      errors: [] as string[],
    }

    // Delete all backfilled activity entries
    const deleteResult = await prisma.activity_log.deleteMany({
      where: {
        activity_type: { in: ['purchase', 'payment'] },
        metadata: {
          path: ['backfilled'],
          equals: true
        }
      }
    })
    results.deletedBackfillEntries = deleteResult.count

    // Get all subscriptions with Stripe IDs
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        stripe_subscription_id: { not: null }
      },
      include: {
        client: { select: { id: true, name: true } }
      }
    })

    for (const sub of subscriptions) {
      if (!sub.client_id || !sub.stripe_subscription_id) continue

      try {
        // Get subscription details from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)

        // Calculate monthly amount
        let monthlyAmount = 0
        if (stripeSub.items?.data) {
          for (const item of stripeSub.items.data) {
            const unitAmount = item.price?.unit_amount || 0
            const quantity = item.quantity || 1
            monthlyAmount += (unitAmount * quantity) / 100
          }
        }

        // Create proper activity entry
        const isActive = stripeSub.status === 'active' || stripeSub.status === 'trialing'
        const isCanceled = stripeSub.status === 'canceled'

        if (isActive || isCanceled) {
          // Get the start date from Stripe
          const startDate = stripeSub.start_date
            ? new Date(stripeSub.start_date * 1000)
            : sub.created_at || new Date()

          await prisma.activity_log.create({
            data: {
              client_id: sub.client_id,
              activity_type: 'purchase',
              description: monthlyAmount > 0
                ? `Paid $${monthlyAmount.toFixed(2)}/mo`
                : 'Subscription started',
              metadata: {
                subscriptionId: sub.stripe_subscription_id,
                amount: monthlyAmount,
                status: stripeSub.status,
                backfilled: true,
              },
              created_at: startDate,
            }
          })
          results.recreatedEntries++
        }

        // If canceled, add cancellation entry with proper date
        if (isCanceled && stripeSub.canceled_at) {
          await prisma.activity_log.create({
            data: {
              client_id: sub.client_id,
              activity_type: 'purchase',
              description: 'Subscription canceled',
              metadata: {
                subscriptionId: sub.stripe_subscription_id,
                action: 'canceled',
                backfilled: true,
              },
              created_at: new Date(stripeSub.canceled_at * 1000),
            }
          })
          results.recreatedEntries++
        }

      } catch (stripeError) {
        const msg = stripeError instanceof Error ? stripeError.message : String(stripeError)
        results.errors.push(`${sub.client?.name || sub.id}: ${msg}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Backfill fixed',
      results
    })

  } catch (error) {
    console.error('Fix backfill error:', error)
    return NextResponse.json({ error: 'Failed to fix backfill' }, { status: 500 })
  }
}

// DELETE - just remove all backfilled entries without recreating
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const deleteResult = await prisma.activity_log.deleteMany({
      where: {
        activity_type: { in: ['purchase', 'payment'] },
        metadata: {
          path: ['backfilled'],
          equals: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      deleted: deleteResult.count
    })

  } catch (error) {
    console.error('Delete backfill error:', error)
    return NextResponse.json({ error: 'Failed to delete backfill entries' }, { status: 500 })
  }
}
