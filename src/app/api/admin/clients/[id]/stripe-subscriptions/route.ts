import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { logCriticalError, logSyncFailure } from '@/lib/alerts'

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

      // Period dates are on subscription items, not the subscription itself
      const firstItem = sub.items.data[0] as any
      const periodStart = firstItem?.current_period_start
        ? new Date(firstItem.current_period_start * 1000).toISOString()
        : null
      const periodEnd = firstItem?.current_period_end
        ? new Date(firstItem.current_period_end * 1000).toISOString()
        : null

      return {
        id: sub.id,
        status: sub.status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
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
    // Log critical Stripe API error
    logCriticalError(
      'stripe_error',
      'Failed to fetch subscriptions from Stripe',
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
      undefined,
      'stripe-subscriptions/route.ts:GET'
    )
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions from Stripe' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/clients/[id]/stripe-subscriptions - Add a product to the client's Stripe subscription
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const body = await request.json()
    const { product_id, price_id, billing_term_months } = body

    if (!product_id) {
      return NextResponse.json({ error: 'product_id is required' }, { status: 400 })
    }

    // Term products (like 12-month plans) don't prorate - they start on next billing date
    const isTermProduct = billing_term_months && billing_term_months > 0

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
        error: 'No Stripe customer ID linked to this client. Please set up billing first.',
      }, { status: 400 })
    }

    // Get the product to find its Stripe price ID
    const product = await prisma.products.findUnique({
      where: { id: product_id },
      select: {
        id: true,
        name: true,
        stripe_product_id: true,
        stripe_monthly_price_id: true,
        stripe_onetime_price_id: true,
        monthly_price: true,
        onetime_price: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Determine which price to use
    const stripePriceId = price_id || product.stripe_monthly_price_id || product.stripe_onetime_price_id

    if (!stripePriceId) {
      return NextResponse.json({
        error: 'Product does not have a Stripe price configured',
      }, { status: 400 })
    }

    // Get the client's active subscription
    const subscriptionsResponse = await stripe.subscriptions.list({
      customer: client.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (subscriptionsResponse.data.length === 0) {
      return NextResponse.json({
        error: 'Client does not have an active subscription. Please create a subscription first.',
      }, { status: 400 })
    }

    const subscription = subscriptionsResponse.data[0]

    // Check if product is already in the subscription
    const existingItem = subscription.items.data.find(item => {
      const itemProductId = typeof item.price.product === 'string'
        ? item.price.product
        : (item.price.product as any)?.id
      return itemProductId === product.stripe_product_id
    })

    if (existingItem) {
      return NextResponse.json({
        error: 'Product is already in the subscription',
      }, { status: 400 })
    }

    // Add the item to the subscription
    // Term products: no proration, starts on next billing date
    // Ongoing products: prorate immediately
    const subscriptionItem = await stripe.subscriptionItems.create({
      subscription: subscription.id,
      price: stripePriceId,
      quantity: 1,
      proration_behavior: isTermProduct ? 'none' : 'always_invoice',
    })

    // For term products, calculate term_end_date
    let termEndDate: Date | null = null
    if (isTermProduct) {
      // Get the next billing date from the subscription
      const firstItem = subscription.items.data[0] as any
      const nextBillingTimestamp = firstItem?.current_period_end
      if (nextBillingTimestamp) {
        const nextBillingDate = new Date(nextBillingTimestamp * 1000)
        // Term ends billing_term_months after the next billing date
        termEndDate = new Date(nextBillingDate)
        termEndDate.setMonth(termEndDate.getMonth() + billing_term_months)
      }
    }

    // Sync the updated subscription to local DB (don't fail if this errors)
    try {
      await syncStripeSubscriptions(clientId, client.stripe_customer_id)
    } catch (syncError) {
      console.error('Failed to sync subscription to local DB:', syncError)
      logSyncFailure(
        'Failed to sync updated subscription to local DB',
        clientId,
        { error: syncError instanceof Error ? syncError.message : String(syncError), stripeCustomerId: client.stripe_customer_id },
        'stripe-subscriptions/route.ts:PUT:sync'
      )
      // Continue anyway - the Stripe subscription was updated successfully
    }

    // If this is a term product, update the subscription_item with term_end_date
    if (termEndDate) {
      try {
        await dbPool.query(
          `UPDATE subscription_items
           SET term_end_date = $1
           WHERE stripe_subscription_item_id = $2`,
          [termEndDate.toISOString(), subscriptionItem.id]
        )
      } catch (termError) {
        console.error('Failed to update term_end_date:', termError)
        // Continue anyway - the Stripe subscription was updated successfully
      }
    }

    // Mark any matching smart recommendation item as 'purchased'
    try {
      // Find the smart recommendation item for this product
      const recItemResult = await dbPool.query(
        `SELECT sri.id, sri.recommendation_id
         FROM smart_recommendation_items sri
         JOIN smart_recommendations sr ON sr.id = sri.recommendation_id
         WHERE sr.client_id = $1 AND sri.product_id = $2 AND (sri.status = 'active' OR sri.status IS NULL)
         LIMIT 1`,
        [clientId, product_id]
      )

      if (recItemResult.rows.length > 0) {
        const recItem = recItemResult.rows[0]
        // Update item status to purchased
        await dbPool.query(
          `UPDATE smart_recommendation_items
           SET status = 'purchased', status_changed_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [recItem.id]
        )

        // Create history entry
        await dbPool.query(
          `INSERT INTO smart_recommendation_history
           (recommendation_id, item_id, product_id, action, details, created_by)
           VALUES ($1, $2, $3, 'purchased', $4, NULL)`,
          [recItem.recommendation_id, recItem.id, product_id, `"${product.name}" was added to subscription`]
        )
      }
    } catch (recError) {
      // Don't fail the whole request if recommendation update fails
      console.error('Failed to update recommendation status:', recError)
    }

    return NextResponse.json({
      success: true,
      message: `${product.name} has been added to the subscription`,
      subscriptionItem: {
        id: subscriptionItem.id,
        priceId: subscriptionItem.price.id,
      },
    })
  } catch (error: any) {
    console.error('Failed to add product to subscription:', error)
    logCriticalError(
      'stripe_error',
      'Failed to add product to subscription',
      { error: error.message || String(error), stack: error.stack },
      clientId,
      'stripe-subscriptions/route.ts:PUT'
    )
    return NextResponse.json(
      { error: error.message || 'Failed to add product to subscription' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/stripe-subscriptions - Sync subscriptions from Stripe to local DB
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any

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
    logSyncFailure(
      'Failed to sync subscriptions from Stripe',
      clientId,
      { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined },
      'stripe-subscriptions/route.ts:POST'
    )
    return NextResponse.json(
      { error: 'Failed to sync subscriptions from Stripe' },
      { status: 500 }
    )
  }
}
