import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/products - List all products
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const products = await prisma.products.findMany({
      where: {
        ...(category && category !== 'all' ? { category } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { short_description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        product_dependencies: {
          include: {
            requires: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { sort_order: 'asc' },
      ],
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Failed to fetch products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/admin/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      shortDesc,
      longDesc,
      category,
      status,
      monthlyPrice,
      onetimePrice,
      supportsQuantity,
      stripeProductId,
      stripeMonthlyPriceId,
      stripeOnetimePriceId,
      dependencies,
      sortOrder,
    } = body

    // Get the max sort_order for the category
    const maxSortOrder = await prisma.products.aggregate({
      where: { category },
      _max: { sort_order: true },
    })

    const product = await prisma.products.create({
      data: {
        name,
        short_description: shortDesc || null,
        long_description: longDesc || null,
        category,
        status: status || 'active',
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        onetime_price: onetimePrice ? parseFloat(onetimePrice) : null,
        supports_quantity: supportsQuantity || false,
        stripe_product_id: stripeProductId || null,
        stripe_monthly_price_id: stripeMonthlyPriceId || null,
        stripe_onetime_price_id: stripeOnetimePriceId || null,
        sort_order: sortOrder ?? (maxSortOrder._max.sort_order ?? 0) + 1,
      },
    })

    // Create dependencies if provided
    if (dependencies && dependencies.length > 0) {
      await prisma.product_dependencies.createMany({
        data: dependencies.map((requiresId: string) => ({
          product_id: product.id,
          requires_product_id: requiresId,
        })),
      })
    }

    // Fetch the product with dependencies
    const productWithDeps = await prisma.products.findUnique({
      where: { id: product.id },
      include: {
        product_dependencies: {
          include: {
            requires: true,
          },
        },
      },
    })

    return NextResponse.json(productWithDeps, { status: 201 })
  } catch (error) {
    console.error('Failed to create product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
