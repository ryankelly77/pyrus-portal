import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/admin/activity/fix-description
// Updates activity log descriptions that have old format
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const results = {
      updated: 0,
      entries: [] as { id: string; oldDesc: string; newDesc: string; client: string }[],
    }

    // Find purchase activities with old "purchased" format
    const activities = await prisma.activity_log.findMany({
      where: {
        activity_type: 'purchase',
        description: { contains: 'purchased' },
      },
      include: {
        client: { select: { name: true, stripe_customer_id: true } }
      }
    })

    for (const activity of activities) {
      const metadata = activity.metadata as Record<string, any> | null
      const subscriptionId = metadata?.subscriptionId

      if (!subscriptionId) continue

      try {
        // Get subscription from Stripe to check actual amounts
        const sub = await stripe.subscriptions.retrieve(subscriptionId) as any

        // Calculate monthly price from subscription items
        let monthlyPrice = 0
        if (sub.items?.data) {
          for (const item of sub.items.data) {
            monthlyPrice += ((item.price?.unit_amount || 0) * (item.quantity || 1)) / 100
          }
        }

        // Get the first invoice to see what was actually charged
        const invoices = await stripe.invoices.list({
          subscription: subscriptionId,
          limit: 1,
        })

        const firstInvoice = invoices.data[0]
        const amountCharged = firstInvoice ? firstInvoice.amount_paid / 100 : 0

        const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

        let newDesc: string
        if (amountCharged === 0 && monthlyPrice > 0) {
          newDesc = `New subscription - $${formatMoney(monthlyPrice)}/mo (billed at next cycle)`
        } else if (amountCharged > 0) {
          newDesc = `Paid $${formatMoney(amountCharged)}`
        } else {
          continue // No change needed
        }

        // Only update if description is different
        if (newDesc !== activity.description) {
          await prisma.activity_log.update({
            where: { id: activity.id },
            data: { description: newDesc }
          })

          results.updated++
          results.entries.push({
            id: activity.id,
            oldDesc: activity.description || '',
            newDesc,
            client: activity.client?.name || 'Unknown'
          })
        }

      } catch (stripeError) {
        // Skip if can't fetch from Stripe
        console.error(`Failed to fetch subscription ${subscriptionId}:`, stripeError)
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Fix description error:', error)
    return NextResponse.json({ error: 'Failed to fix descriptions' }, { status: 500 })
  }
}
