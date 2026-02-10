import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { logCheckoutError } from '@/lib/alerts'

interface AddToSubscriptionRequest {
  clientId: string
  productSlug: string  // Slug like 'ai-creative-assets' or 'content-writing'
  quantity?: number
}

// Map slugs to product search criteria
const PRODUCT_SLUG_MAP: Record<string, { nameContains: string; billingType: 'monthly' | 'onetime' }> = {
  'content-writing': { nameContains: 'Content Writing', billingType: 'monthly' },
  'ai-creative-assets': { nameContains: 'AI Creative', billingType: 'monthly' },
  'business-branding': { nameContains: 'Branding Foundation', billingType: 'monthly' },
  'seed-site': { nameContains: 'Seed Site', billingType: 'monthly' },
  'website-care': { nameContains: 'Website Care', billingType: 'monthly' },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, productSlug, quantity = 1 } = body as AddToSubscriptionRequest

    if (!clientId || !productSlug) {
      return NextResponse.json(
        { error: 'Client ID and product slug are required' },
        { status: 400 }
      )
    }

    // Look up product mapping
    const productMapping = PRODUCT_SLUG_MAP[productSlug]
    if (!productMapping) {
      return NextResponse.json(
        { error: 'unknown_product', message: `Unknown product: ${productSlug}` },
        { status: 400 }
      )
    }

    // Find product in database
    const product = await prisma.products.findFirst({
      where: {
        name: { contains: productMapping.nameContains, mode: 'insensitive' },
        status: 'active',
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'product_not_found', message: `Product not found: ${productSlug}` },
        { status: 404 }
      )
    }

    // Get the appropriate Stripe price ID
    const priceId = productMapping.billingType === 'monthly'
      ? product.stripe_monthly_price_id
      : product.stripe_onetime_price_id

    if (!priceId) {
      return NextResponse.json(
        { error: 'no_stripe_price', message: 'Product does not have a Stripe price configured' },
        { status: 400 }
      )
    }

    const productName = product.name
    const price = productMapping.billingType === 'monthly'
      ? Number(product.monthly_price || 0)
      : Number(product.onetime_price || 0)

    // 1. Get client and their Stripe customer ID
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        stripe_customer_id: true,
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (!client.stripe_customer_id) {
      return NextResponse.json(
        { error: 'no_stripe_customer', message: 'Client has no Stripe customer ID' },
        { status: 400 }
      )
    }

    // 2. Find active Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: client.stripe_customer_id,
      status: 'active',
      limit: 10,
      expand: ['data.items'],
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'no_active_subscription', message: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Use the most recent active subscription
    const subscription = subscriptions.data[0]

    // 3. Check if product is already on subscription
    const existingItem = subscription.items.data.find(item => {
      const itemPriceId = item.price.id
      return itemPriceId === priceId
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'already_subscribed', message: 'This product is already on your subscription' },
        { status: 400 }
      )
    }

    // 4. Add item to subscription - NO PRORATION (starts next billing cycle)
    const newItem = await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: priceId,
      quantity,
      proration_behavior: 'none',  // No immediate charge, starts next cycle
    })

    // 5. Update database - find the subscription record
    const dbSub = await prisma.subscriptions.findFirst({
      where: { stripe_subscription_id: subscription.id }
    })

    if (dbSub) {
      // Create subscription item record
      await prisma.subscription_items.create({
        data: {
          subscription_id: dbSub.id,
          product_id: product.id,
          quantity,
          unit_amount: price.toString(),
        }
      })

      // Record history
      await prisma.subscription_history.create({
        data: {
          subscription_id: dbSub.id,
          action: 'service_added',
          details: `Added ${productName} to subscription (starts next billing cycle)`,
        }
      })
    }

    // 6. Activity log
    await prisma.activity_log.create({
      data: {
        client_id: clientId,
        activity_type: 'upgrade',
        description: `Added ${productName} to plan (effective next billing cycle)`,
        metadata: {
          productId: product.id,
          productSlug,
          priceId,
          quantity,
          subscriptionId: subscription.id,
          subscriptionItemId: newItem.id,
        },
      }
    })

    // Calculate when the new item will take effect
    const periodEnd = (subscription as any).current_period_end
    const effectiveDate = periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      subscriptionItemId: newItem.id,
      effectiveDate,
      productName,
      price,
      billingType: productMapping.billingType,
      message: `${productName} will be added to your plan on your next billing date`,
    })
  } catch (error: any) {
    console.error('Error adding to subscription:', error)
    logCheckoutError(
      `Add to subscription failed: ${error.message || 'Unknown error'}`,
      undefined,
      { step: 'add_to_subscription', error: error.message },
      'add-to-subscription/route.ts'
    )
    return NextResponse.json(
      { error: 'Failed to add product to subscription' },
      { status: 500 }
    )
  }
}
