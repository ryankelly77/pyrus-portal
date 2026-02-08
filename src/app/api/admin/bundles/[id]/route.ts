import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// GET /api/admin/bundles/[id] - Get a single bundle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const bundle = await prisma.bundles.findUnique({
      where: { id },
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

    if (!bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(bundle)
  } catch (error) {
    console.error('Failed to fetch bundle:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bundle' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/bundles/[id] - Update a bundle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id } = await params
    const body = await request.json()

    const {
      name,
      description,
      monthlyPrice,
      onetimePrice,
      status,
      stripeProductId,
      stripePriceId,
      products,
    } = body

    // Update the bundle
    const bundle = await prisma.bundles.update({
      where: { id },
      data: {
        name,
        description: description || null,
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        onetime_price: onetimePrice ? parseFloat(onetimePrice) : null,
        status: status || 'active',
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripePriceId || null,
        updated_at: new Date(),
      },
    })

    // Update products - delete existing and recreate
    if (products !== undefined) {
      await prisma.bundle_products.deleteMany({
        where: { bundle_id: id },
      })

      if (products.length > 0) {
        await prisma.bundle_products.createMany({
          data: products.map((productId: string, index: number) => ({
            bundle_id: id,
            product_id: productId,
            sort_order: index,
          })),
        })
      }
    }

    // Fetch updated bundle with products
    const updatedBundle = await prisma.bundles.findUnique({
      where: { id },
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

    return NextResponse.json(updatedBundle)
  } catch (error) {
    console.error('Failed to update bundle:', error)
    return NextResponse.json(
      { error: 'Failed to update bundle' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/bundles/[id] - Delete a bundle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id } = await params

    // Delete bundle products first
    await prisma.bundle_products.deleteMany({
      where: { bundle_id: id },
    })

    // Delete the bundle
    await prisma.bundles.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete bundle:', error)
    return NextResponse.json(
      { error: 'Failed to delete bundle' },
      { status: 500 }
    )
  }
}
