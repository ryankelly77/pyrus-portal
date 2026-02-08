import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { subscriptionCreateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic';

interface CartItem {
  id: string
  name: string
  quantity: number
  monthlyPrice: number
  onetimePrice: number
  pricingType: 'monthly' | 'onetime'
  category?: string
  productId?: string
  bundleId?: string
  addonId?: string
  isFree?: boolean
}

// POST /api/admin/subscriptions - Create a subscription from checkout
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const validated = await validateRequest(subscriptionCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const { clientId, items, tier, totalMonthly, stripeSubscriptionId, paymentIntentId, userName, userRole } = (validated as any).data

    // Build user display string for history
    const userDisplay = userName && userRole
      ? `${userName} - ${userRole}`
      : 'System'

    if (!clientId || !items || !tier) {
      return NextResponse.json(
        { error: 'clientId, items, and tier are required' },
        { status: 400 }
      )
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate each cart item
    for (const item of items as CartItem[]) {
      if (!item.name || typeof item.name !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a valid name' },
          { status: 400 }
        )
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for item "${item.name}": must be a positive number` },
          { status: 400 }
        )
      }
      if (typeof item.monthlyPrice !== 'number' || item.monthlyPrice < 0) {
        return NextResponse.json(
          { error: `Invalid monthlyPrice for item "${item.name}": must be a non-negative number` },
          { status: 400 }
        )
      }
      if (typeof item.onetimePrice !== 'number' || item.onetimePrice < 0) {
        return NextResponse.json(
          { error: `Invalid onetimePrice for item "${item.name}": must be a non-negative number` },
          { status: 400 }
        )
      }
    }

    const validPlanTiers = ['good', 'better', 'best']
    const isAddonPurchase = !validPlanTiers.includes(tier)

    // Get the recommendation for this client to link it (only for initial purchase)
    const recommendation = !isAddonPurchase ? await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'sent'] },
      },
      orderBy: { updated_at: 'desc' },
    }) : null

    // Get client's stripe_customer_id
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { stripe_customer_id: true },
    })

    // For add-on purchases, try to find an existing active subscription
    let subscription
    if (isAddonPurchase) {
      subscription = await prisma.subscriptions.findFirst({
        where: {
          client_id: clientId,
          status: 'active',
        },
        orderBy: { created_at: 'desc' },
      })
    }

    // Create new subscription only if this is an initial purchase or no existing subscription found
    if (!subscription) {
      subscription = await prisma.subscriptions.create({
        data: {
          client_id: clientId,
          recommendation_id: recommendation?.id || null,
          stripe_subscription_id: stripeSubscriptionId || null,
          stripe_customer_id: client?.stripe_customer_id || null,
          status: 'active',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          monthly_amount: totalMonthly || 0,
        },
      })
    } else {
      // Update the existing subscription's monthly_amount
      const currentAmount = Number(subscription.monthly_amount || 0)
      const additionalAmount = Number(totalMonthly || 0)
      await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: {
          monthly_amount: currentAmount + additionalAmount,
        },
      })
    }

    // Create subscription items from cart items
    const subscriptionItems = items.map((item: CartItem) => ({
      subscription_id: subscription.id,
      product_id: item.productId || null,
      bundle_id: item.bundleId || null,
      quantity: item.quantity || 1,
      unit_amount: item.isFree ? 0 : (item.monthlyPrice || 0),
    }))

    await prisma.subscription_items.createMany({
      data: subscriptionItems,
    })

    // Update recommendation status to accepted and set purchased_tier
    // Only for initial plan purchases, not add-ons
    if (recommendation) {
      await prisma.recommendations.update({
        where: { id: recommendation.id },
        data: {
          status: 'accepted',
          purchased_tier: tier,
          purchased_at: new Date(),
        },
      })
    }

    // Get item names with prices for history
    const itemsWithPrice = items.map((item: CartItem) => {
      const price = item.isFree ? 0 : (item.monthlyPrice || 0)
      return `${item.name} ($${price}/mo)`
    }).filter(Boolean)
    const itemsText = itemsWithPrice.length > 0 ? itemsWithPrice.join(', ') : 'services'

    // Create subscription history entry (always goes to subscription_history, not recommendation)
    await prisma.subscription_history.create({
      data: {
        subscription_id: subscription.id,
        action: isAddonPurchase
          ? `Add-on purchased by ${userDisplay}`
          : `New plan purchased by ${userDisplay}`,
        details: `Purchased: ${itemsText}`,
      },
    })

    // Fetch the created subscription with items
    const createdSubscription = await prisma.subscriptions.findUnique({
      where: { id: subscription.id },
      include: {
        subscription_items: {
          include: {
            product: true,
            bundle: true,
          },
        },
      },
    })

    return NextResponse.json(createdSubscription, { status: 201 })
  } catch (error) {
    console.error('Failed to create subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    )
  }
}
