import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { logCheckoutError } from '@/lib/alerts'

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/clients/[id]/proration-preview - Get proration preview for adding items
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const body = await request.json()
    const { items } = body // Array of { productId, priceId? }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    // Get client's Stripe customer ID
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { stripe_customer_id: true },
    })

    if (!client?.stripe_customer_id) {
      return NextResponse.json({ error: 'Client has no Stripe customer' }, { status: 400 })
    }

    // Get client's active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: client.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    const subscription = subscriptions.data[0]
    const subAny = subscription as any

    // Get price IDs for each product
    const priceIds: string[] = []
    for (const item of items) {
      let priceId = item.priceId

      if (!priceId && item.productId) {
        // Look up the product to get its price ID
        const product = await prisma.products.findUnique({
          where: { id: item.productId },
          select: { stripe_monthly_price_id: true, stripe_onetime_price_id: true },
        })
        priceId = product?.stripe_monthly_price_id || product?.stripe_onetime_price_id
      }

      if (priceId) {
        priceIds.push(priceId)
      }
    }

    if (priceIds.length === 0) {
      return NextResponse.json({ error: 'No valid price IDs found' }, { status: 400 })
    }

    // Use Stripe's upcoming invoice preview to calculate proration
    // Build the items array for the preview
    const subscriptionItems = priceIds.map(priceId => ({
      price: priceId,
      quantity: 1,
    }))

    // Get upcoming invoice preview with the new items
    const upcomingInvoice = await stripe.invoices.createPreview({
      customer: client.stripe_customer_id,
      subscription: subscription.id,
      subscription_details: {
        items: [
          // Keep existing items
          ...subscription.items.data.map(item => ({
            id: item.id,
            price: item.price.id,
            quantity: item.quantity,
          })),
          // Add new items
          ...subscriptionItems,
        ],
        proration_behavior: 'create_prorations',
      },
    })

    // Calculate proration amount (the difference from current subscription)
    // Proration lines have descriptions like "Remaining time on..." or "Unused time on..."
    // The proration field may be undefined in newer Stripe API versions
    let prorationAmount = 0
    for (const line of upcomingInvoice.lines.data) {
      const description = (line.description || '').toLowerCase()
      const isProration = (line as any).proration === true ||
        description.includes('remaining time') ||
        description.includes('unused time')
      if (isProration) {
        prorationAmount += line.amount
      }
    }

    // Convert from cents to dollars
    prorationAmount = prorationAmount / 100

    // Get billing cycle info from subscription items (not subscription object)
    const firstItem = subscription.items.data[0] as any
    const periodEndTimestamp = firstItem?.current_period_end
    const currentPeriodEnd = periodEndTimestamp
      ? new Date(periodEndTimestamp * 1000)
      : new Date() // Fallback to now if no period end
    const billingDate = currentPeriodEnd.getDate()

    return NextResponse.json({
      prorationAmount,
      billingDate,
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      nextBillingDate: currentPeriodEnd.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      totalNewMonthly: upcomingInvoice.lines.data
        .filter((line: any) => !line.proration)
        .reduce((sum: number, line: any) => sum + (line.amount / 100), 0),
    })
  } catch (error: any) {
    console.error('Failed to get proration preview:', error)
    logCheckoutError(
      'Failed to get proration preview',
      clientId,
      { step: 'proration_preview', error: error.message },
      'proration-preview/route.ts'
    )
    return NextResponse.json(
      { error: error.message || 'Failed to calculate proration' },
      { status: 500 }
    )
  }
}
