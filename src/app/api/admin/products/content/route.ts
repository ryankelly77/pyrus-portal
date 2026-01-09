import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/products/content - Get all content-related products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    // Fetch the 3 content products: Content Writing, AI Creative Assets, Business Branding Foundation
    const contentProducts = await prisma.products.findMany({
      where: {
        status: 'active',
        OR: [
          { name: 'Content Writing' },
          { name: 'AI Creative Assets' },
          { name: 'Business Branding Foundation' },
        ],
      },
      orderBy: { sort_order: 'asc' },
    })

    // If clientId provided, filter out products the client already has
    if (clientId) {
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
        all: contentProducts,
        available: availableProducts,
        purchased: contentProducts.filter(p => purchasedProductIds.has(p.id)),
      })
    }

    return NextResponse.json({ all: contentProducts })
  } catch (error) {
    console.error('Failed to fetch content products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content products' },
      { status: 500 }
    )
  }
}
