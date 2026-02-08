import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { bundleCreateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic';

// GET /api/admin/bundles - List all bundles
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const bundles = await prisma.bundles.findMany({
      include: {
        bundle_products: {
          include: {
            product: true,
          },
          orderBy: {
            sort_order: 'asc',
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    })

    return NextResponse.json(bundles)
  } catch (error) {
    console.error('Failed to fetch bundles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bundles' },
      { status: 500 }
    )
  }
}

// POST /api/admin/bundles - Create a new bundle
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any

    const validated = await validateRequest(bundleCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      name,
      description,
      monthlyPrice,
      onetimePrice,
      status,
      stripeProductId,
      stripePriceId,
      products,
    } = (validated as any).data

    const bundle = await prisma.bundles.create({
      data: {
        name,
        description: description || null,
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        onetime_price: onetimePrice ? parseFloat(onetimePrice) : null,
        status: status || 'active',
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripePriceId || null,
      },
    })

    // Add products to bundle
    if (products && products.length > 0) {
      await prisma.bundle_products.createMany({
        data: products.map((productId: string, index: number) => ({
          bundle_id: bundle.id,
          product_id: productId,
          sort_order: index,
        })),
      })
    }

    // Fetch bundle with products
    const bundleWithProducts = await prisma.bundles.findUnique({
      where: { id: bundle.id },
      include: {
        bundle_products: {
          include: {
            product: true,
          },
          orderBy: {
            sort_order: 'asc',
          },
        },
      },
    })

    return NextResponse.json(bundleWithProducts, { status: 201 })
  } catch (error) {
    console.error('Failed to create bundle:', error)
    return NextResponse.json(
      { error: 'Failed to create bundle' },
      { status: 500 }
    )
  }
}
