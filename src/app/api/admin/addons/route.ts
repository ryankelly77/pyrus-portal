import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/addons - List all addons
export async function GET() {
  try {
    const addons = await prisma.addons.findMany({
      include: {
        addon_products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    })

    return NextResponse.json(addons)
  } catch (error) {
    console.error('Failed to fetch addons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addons' },
      { status: 500 }
    )
  }
}

// POST /api/admin/addons - Create a new addon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      description,
      price,
      status,
      stripeProductId,
      stripePriceId,
      products,
    } = body

    const addon = await prisma.addons.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        status: status || 'active',
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripePriceId || null,
      },
    })

    // Add products to addon
    if (products && products.length > 0) {
      await prisma.addon_products.createMany({
        data: products.map((productId: string) => ({
          addon_id: addon.id,
          product_id: productId,
        })),
      })
    }

    // Fetch addon with products
    const addonWithProducts = await prisma.addons.findUnique({
      where: { id: addon.id },
      include: {
        addon_products: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json(addonWithProducts, { status: 201 })
  } catch (error) {
    console.error('Failed to create addon:', error)
    return NextResponse.json(
      { error: 'Failed to create addon' },
      { status: 500 }
    )
  }
}
