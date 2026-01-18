import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/clients/[id]/stripe-subscription-history - Get subscription history from Stripe
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
        history: [],
        message: 'No Stripe customer ID linked to this client',
      })
    }

    // Build a cache of product names
    const productCache = new Map<string, string>()
    const getProductName = async (productId: string): Promise<string> => {
      if (productCache.has(productId)) return productCache.get(productId)!
      try {
        const product = await stripe.products.retrieve(productId)
        productCache.set(productId, product.name)
        return product.name
      } catch {
        return productId
      }
    }

    const history: Array<{
      id: string
      type: string
      action: string
      details: string
      date: string
      products?: string[]
    }> = []

    // Fetch all subscriptions for this customer (including canceled ones)
    const subscriptions = await stripe.subscriptions.list({
      customer: client.stripe_customer_id,
      status: 'all',
    })

    // For each subscription, create a "Subscription Started" entry based on its created date
    for (const sub of subscriptions.data) {
      const productNames: string[] = []
      for (const item of sub.items.data) {
        const productId = typeof item.price.product === 'string'
          ? item.price.product
          : (item.price.product as any)?.id
        if (productId) {
          productNames.push(await getProductName(productId))
        }
      }

      history.push({
        id: `sub_created_${sub.id}`,
        type: 'subscription_created',
        action: 'Subscription Started',
        details: productNames.length > 0
          ? `Started: ${productNames.join(', ')}`
          : 'New subscription created',
        date: new Date(sub.created * 1000).toISOString(),
        products: productNames,
      })
    }

    // Also check recent events for product additions/removals (last 30 days)
    try {
      const events = await stripe.events.list({
        limit: 100,
        types: [
          'customer.subscription.updated',
        ],
      })

      for (const event of events.data) {
        const data = event.data.object as any

        // Filter to only this customer's events
        if (data.customer !== client.stripe_customer_id) continue

        const date = new Date(event.created * 1000).toISOString()
        const previousAttributes = event.data.previous_attributes as any

        if (previousAttributes?.items) {
          // Items changed - products were added or removed
          const currentItems = data.items?.data || []
          const previousItems = previousAttributes.items?.data || []

          const currentProductIds = new Set(
            currentItems.map((item: any) =>
              typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id
            )
          )
          const previousProductIds = new Set(
            previousItems.map((item: any) =>
              typeof item.price?.product === 'string' ? item.price.product : item.price?.product?.id
            )
          )

          // Find added products
          const addedIds = Array.from(currentProductIds).filter(id => id && !previousProductIds.has(id))
          const removedIds = Array.from(previousProductIds).filter(id => id && !currentProductIds.has(id))

          if (addedIds.length > 0) {
            const addedNames = await Promise.all(addedIds.map(id => getProductName(id as string)))
            history.push({
              id: event.id + '_added',
              type: 'product_added',
              action: 'Product Added',
              details: `Added: ${addedNames.join(', ')}`,
              date,
              products: addedNames,
            })
          }

          if (removedIds.length > 0) {
            const removedNames = await Promise.all(removedIds.map(id => getProductName(id as string)))
            history.push({
              id: event.id + '_removed',
              type: 'product_removed',
              action: 'Product Removed',
              details: `Removed: ${removedNames.join(', ')}`,
              date,
              products: removedNames,
            })
          }
        }
      }
    } catch (e) {
      // Events might fail but subscriptions should still work
      console.error('Failed to fetch events:', e)
    }

    // Sort by date, most recent first
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      history,
      stripeCustomerId: client.stripe_customer_id,
    })
  } catch (error) {
    console.error('Failed to fetch Stripe subscription history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription history from Stripe' },
      { status: 500 }
    )
  }
}
