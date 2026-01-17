import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// GET /api/client/recommendation?clientName=xxx - Get recommendation for client by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('clientName')
    const clientId = searchParams.get('clientId')

    if (!clientName && !clientId) {
      return NextResponse.json(
        { error: 'Client name or ID is required' },
        { status: 400 }
      )
    }

    // Find the client
    let client
    if (clientId) {
      client = await prisma.clients.findUnique({
        where: { id: clientId },
      })
    } else if (clientName) {
      // Search by name (case-insensitive, partial match)
      client = await prisma.clients.findFirst({
        where: {
          name: {
            contains: clientName.replace(/-/g, ' '),
            mode: 'insensitive',
          },
        },
      })
    }

    if (!client) {
      return NextResponse.json(null)
    }

    // Find the recommendation for this client
    const recommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: client.id,
        status: { in: ['draft', 'sent', 'accepted'] },
      },
      include: {
        client: true,
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
        history: {
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
      orderBy: { updated_at: 'desc' },
    })

    // Fetch active subscriptions - try Stripe first, fall back to database
    let subscriptions: any[] = []

    if (client.stripe_customer_id) {
      try {
        // Fetch from Stripe directly for accurate data
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: client.stripe_customer_id,
          status: 'active',
        })

        // Collect product IDs and fetch product details
        const productIds = new Set<string>()
        for (const sub of stripeSubscriptions.data) {
          for (const item of sub.items.data) {
            const productId = typeof item.price.product === 'string'
              ? item.price.product
              : (item.price.product as any)?.id
            if (productId) productIds.add(productId)
          }
        }

        // Fetch product details
        const productMap = new Map<string, { name: string; description: string | null }>()
        await Promise.all(
          Array.from(productIds).map(async (id) => {
            try {
              const product = await stripe.products.retrieve(id)
              productMap.set(id, { name: product.name, description: product.description })
            } catch {
              productMap.set(id, { name: id, description: null })
            }
          })
        )

        // Format subscriptions for frontend (match existing structure)
        subscriptions = stripeSubscriptions.data.map(sub => ({
          id: sub.id,
          stripe_subscription_id: sub.id,
          status: sub.status,
          created_at: new Date(sub.created * 1000).toISOString(),
          subscription_items: sub.items.data.map(item => {
            const productId = typeof item.price.product === 'string'
              ? item.price.product
              : (item.price.product as any)?.id || 'unknown'
            const productData = productMap.get(productId) || { name: productId, description: null }

            return {
              id: item.id,
              unit_amount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
              quantity: item.quantity || 1,
              product: {
                id: productId,
                name: productData.name,
                short_description: productData.description,
                monthly_price: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
              },
              bundle: null,
            }
          }),
        }))
      } catch (stripeError) {
        console.error('Failed to fetch Stripe subscriptions, falling back to database:', stripeError)
      }
    }

    // Fall back to database subscriptions if Stripe fetch failed or no Stripe customer
    if (subscriptions.length === 0) {
      subscriptions = await prisma.subscriptions.findMany({
        where: {
          client_id: client.id,
          status: { in: ['active', 'trialing'] },
        },
        include: {
          subscription_items: {
            include: {
              product: true,
              bundle: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      })
    }

    if (!recommendation) {
      return NextResponse.json({ client, recommendation: null, subscriptions })
    }

    // Track view if recommendation exists
    try {
      // Check for recent view to avoid duplicates
      const recentView = await prisma.recommendation_history.findFirst({
        where: {
          recommendation_id: recommendation.id,
          action: 'Client viewed recommendation',
          created_at: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
          },
        },
      })

      if (!recentView) {
        await prisma.recommendation_history.create({
          data: {
            recommendation_id: recommendation.id,
            action: 'Client viewed recommendation',
            details: `Viewed by ${client.contact_name || client.name}`,
          },
        })
      }
    } catch {
      // Don't fail if view tracking fails
    }

    return NextResponse.json({
      client,
      recommendation,
      subscriptions,
    })
  } catch (error) {
    console.error('Failed to fetch client recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendation' },
      { status: 500 }
    )
  }
}
