import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// Helper function to sync Stripe subscriptions to local database
async function syncStripeSubscriptions(clientId: string, stripeCustomerId: string) {
  // Fetch subscriptions from Stripe
  const subscriptionsResponse = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: 'all',
  })

  for (const sub of subscriptionsResponse.data) {
    const subAny = sub as any // Access snake_case properties
    // Check if subscription already exists
    const existing = await dbPool.query(
      'SELECT id FROM subscriptions WHERE stripe_subscription_id = $1',
      [sub.id]
    )

    let subscriptionId: string

    if (existing.rows.length > 0) {
      // Update existing subscription
      subscriptionId = existing.rows[0].id
      await dbPool.query(
        `UPDATE subscriptions SET
          status = $1,
          current_period_start = to_timestamp($2),
          current_period_end = to_timestamp($3),
          updated_at = NOW()
        WHERE id = $4`,
        [sub.status, subAny.current_period_start, subAny.current_period_end, subscriptionId]
      )
    } else {
      // Insert new subscription
      const result = await dbPool.query(
        `INSERT INTO subscriptions (client_id, stripe_subscription_id, status, current_period_start, current_period_end)
        VALUES ($1, $2, $3, to_timestamp($4), to_timestamp($5))
        RETURNING id`,
        [clientId, sub.id, sub.status, subAny.current_period_start, subAny.current_period_end]
      )
      subscriptionId = result.rows[0].id
    }

    // Sync subscription items
    for (const item of sub.items.data) {
      const productId = typeof item.price.product === 'string'
        ? item.price.product
        : (item.price.product as any)?.id

      if (!productId) continue

      // Find local product by stripe_product_id
      const productResult = await dbPool.query(
        'SELECT id FROM products WHERE stripe_product_id = $1',
        [productId]
      )

      if (productResult.rows.length === 0) continue

      const localProductId = productResult.rows[0].id

      // Check if item exists
      const existingItem = await dbPool.query(
        'SELECT id FROM subscription_items WHERE subscription_id = $1 AND product_id = $2',
        [subscriptionId, localProductId]
      )

      if (existingItem.rows.length === 0) {
        await dbPool.query(
          `INSERT INTO subscription_items (subscription_id, product_id, stripe_subscription_item_id, quantity, unit_amount)
          VALUES ($1, $2, $3, $4, $5)`,
          [subscriptionId, localProductId, item.id, item.quantity, item.price.unit_amount]
        )
      }
    }
  }
}

// GET /api/admin/clients/[id]/stripe-subscriptions - Get subscriptions directly from Stripe
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get client to find stripe_customer_id
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        stripe_customer_id: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.stripe_customer_id) {
      return NextResponse.json({
        subscriptions: [],
        message: 'No Stripe customer ID linked to this client',
      })
    }

    // Fetch subscriptions from Stripe
    const subscriptionsResponse = await stripe.subscriptions.list({
      customer: client.stripe_customer_id,
      status: 'all', // Get all statuses so we can filter/display appropriately
    })

    // Collect all unique product IDs to fetch in one go
    const productIds = new Set<string>()
    for (const sub of subscriptionsResponse.data) {
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === 'string'
          ? item.price.product
          : (item.price.product as any)?.id
        if (productId) productIds.add(productId)
      }
    }

    // Fetch all products in parallel
    const productMap = new Map<string, { name: string; description: string | null }>()
    await Promise.all(
      Array.from(productIds).map(async (id) => {
        try {
          const product = await stripe.products.retrieve(id)
          productMap.set(id, {
            name: product.name,
            description: product.description
          })
        } catch (e) {
          productMap.set(id, { name: id, description: null })
        }
      })
    )

    // Format subscriptions for frontend
    const subscriptions = subscriptionsResponse.data.map(sub => {
      // Cast to any to access snake_case properties that may not be in TypeScript types
      const subAny = sub as any

      return {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: subAny.current_period_start
          ? new Date(subAny.current_period_start * 1000).toISOString()
          : null,
        currentPeriodEnd: subAny.current_period_end
          ? new Date(subAny.current_period_end * 1000).toISOString()
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        canceledAt: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : null,
        created: new Date(sub.created * 1000).toISOString(),
        items: sub.items.data.map(item => {
          const productId = typeof item.price.product === 'string'
            ? item.price.product
            : (item.price.product as any)?.id || 'unknown'

          const productData = productMap.get(productId) || { name: productId, description: null }

          return {
            id: item.id,
            priceId: item.price.id,
            product: {
              id: productId,
              name: productData.name,
              description: productData.description
            },
            quantity: item.quantity,
            unitAmount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
            currency: item.price.currency.toUpperCase(),
            interval: item.price.recurring?.interval || 'one_time',
            intervalCount: item.price.recurring?.interval_count || 1,
          }
        }),
      }
    })

    return NextResponse.json({
      subscriptions,
      stripeCustomerId: client.stripe_customer_id,
    })
  } catch (error) {
    console.error('Failed to fetch Stripe subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions from Stripe' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/stripe-subscriptions - Sync subscriptions from Stripe to local DB
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id: clientId } = await params

    // Get client to find stripe_customer_id
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        stripe_customer_id: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (!client.stripe_customer_id) {
      return NextResponse.json({
        success: false,
        message: 'No Stripe customer ID linked to this client',
      })
    }

    // Sync subscriptions
    await syncStripeSubscriptions(clientId, client.stripe_customer_id)

    return NextResponse.json({
      success: true,
      message: 'Subscriptions synced successfully',
    })
  } catch (error) {
    console.error('Failed to sync Stripe subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to sync subscriptions from Stripe' },
      { status: 500 }
    )
  }
}
