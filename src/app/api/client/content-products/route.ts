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

    // Filter out products the client already has
    const clientSubscriptions = await prisma.subscriptions.findMany({
      where: {
        client_id: clientId,
        status: 'active',
      },
      include: {
        subscription_items: {
          include: {
            product: true,
          },
        },
      },
    })

    const purchasedProductIds = new Set(
      clientSubscriptions
        .flatMap(sub => sub.subscription_items)
        .map(item => item.product_id)
        .filter(Boolean)
    )

    const availableProducts = contentProducts.filter(
      product => !purchasedProductIds.has(product.id)
    )

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
