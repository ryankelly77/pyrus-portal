import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic'

// GET /api/client/content-products - Get available content products for upsell
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get from current user's profile
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { client_id: true },
      })

      if (!profile?.client_id) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profile.client_id
    }

    // Fetch content products that have a portal_slug AND include content services
    const contentProducts = await prisma.products.findMany({
      where: {
        status: 'active',
        portal_slug: { not: null },
        includes_content: true,
      },
      orderBy: { sort_order: 'asc' },
    })

    // Get products the client already has via subscriptions
    const subscriptions = await prisma.subscriptions.findMany({
      where: { client_id: clientId, status: 'active' },
      include: { subscription_items: { select: { product_id: true } } },
    })
    const subscriptionProductIds = new Set(
      subscriptions.flatMap(s => s.subscription_items.map(si => si.product_id))
    )

    // Get products the client already has via manual assignment (client_products)
    let manualProductIds = new Set<string>()
    try {
      const manualProducts = await prisma.client_products.findMany({
        where: { client_id: clientId },
        select: { product_id: true },
      })
      manualProductIds = new Set(manualProducts.map(cp => cp.product_id))
    } catch (e) {
      // Table may not exist yet
    }

    // Filter out products the client already has, EXCEPT quantity-based products
    // like "Content Writing" which can be purchased multiple times
    const availableProducts = contentProducts.filter(p => {
      const hasProduct = subscriptionProductIds.has(p.id) || manualProductIds.has(p.id)
      // Keep quantity-based products even if they have them (can buy more)
      const isQuantityBased = p.supports_quantity === true ||
        p.name.toLowerCase().includes('content writing')
      return !hasProduct || isQuantityBased
    })

    return NextResponse.json({
      available: availableProducts.map(p => ({
        id: p.portal_slug || p.id, // Use portal_slug for checkout compatibility
        name: p.name,
        short_description: p.short_description,
        monthly_price: p.monthly_price,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch content products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content products' },
      { status: 500 }
    )
  }
}
