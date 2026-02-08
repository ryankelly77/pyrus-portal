import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// GET /api/admin/addons/[id] - Get a single addon
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const addon = await prisma.addons.findUnique({
      where: { id },
      include: {
        addon_products: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!addon) {
      return NextResponse.json(
        { error: 'Add-on not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(addon)
  } catch (error) {
    console.error('Failed to fetch addon:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addon' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/addons/[id] - Update an addon
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params
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

    // Update the addon
    const addon = await prisma.addons.update({
      where: { id },
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        status: status || 'active',
        stripe_product_id: stripeProductId || null,
        stripe_price_id: stripePriceId || null,
        updated_at: new Date(),
      },
    })

    // Update products - delete existing and recreate
    if (products !== undefined) {
      await prisma.addon_products.deleteMany({
        where: { addon_id: id },
      })

      if (products.length > 0) {
        await prisma.addon_products.createMany({
          data: products.map((productId: string) => ({
            addon_id: id,
            product_id: productId,
          })),
        })
      }
    }

    // Fetch updated addon with products
    const updatedAddon = await prisma.addons.findUnique({
      where: { id },
      include: {
        addon_products: {
          include: {
            product: true,
          },
        },
      },
    })

    return NextResponse.json(updatedAddon)
  } catch (error) {
    console.error('Failed to update addon:', error)
    return NextResponse.json(
      { error: 'Failed to update addon' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/addons/[id] - Delete an addon
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    // Delete addon products first
    await prisma.addon_products.deleteMany({
      where: { addon_id: id },
    })

    // Delete the addon
    await prisma.addons.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete addon:', error)
    return NextResponse.json(
      { error: 'Failed to delete addon' },
      { status: 500 }
    )
  }
}
