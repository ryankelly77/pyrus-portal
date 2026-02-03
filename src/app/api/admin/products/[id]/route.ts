import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/products/[id] - Get a single product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { id } = await params

    const product = await prisma.products.findUnique({
      where: { id },
      include: {
        product_dependencies: {
          include: {
            requires: true,
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Failed to fetch product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/products/[id] - Update a product
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
      shortDesc,
      longDesc,
      smartRecWhyText,
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
      includesContent,
      contentServices,
      includesWebsite,
      websiteServices,
    } = body

    // Update the product
    const product = await prisma.products.update({
      where: { id },
      data: {
        name,
        short_description: shortDesc || null,
        long_description: longDesc || null,
        smart_rec_why_text: smartRecWhyText || null,
        category,
        status: status || 'active',
        monthly_price: monthlyPrice ? parseFloat(monthlyPrice) : null,
        onetime_price: onetimePrice ? parseFloat(onetimePrice) : null,
        supports_quantity: supportsQuantity || false,
        stripe_product_id: stripeProductId || null,
        stripe_monthly_price_id: stripeMonthlyPriceId || null,
        stripe_onetime_price_id: stripeOnetimePriceId || null,
        sort_order: sortOrder,
        includes_content: includesContent ?? false,
        content_services: contentServices || null,
        includes_website: includesWebsite ?? false,
        website_services: websiteServices || null,
        updated_at: new Date(),
      },
    })

    // Update dependencies - delete existing and recreate
    if (dependencies !== undefined) {
      await prisma.product_dependencies.deleteMany({
        where: { product_id: id },
      })

      if (dependencies.length > 0) {
        await prisma.product_dependencies.createMany({
          data: dependencies.map((requiresId: string) => ({
            product_id: id,
            requires_product_id: requiresId,
          })),
        })
      }
    }

    // Fetch updated product with dependencies
    const updatedProduct = await prisma.products.findUnique({
      where: { id },
      include: {
        product_dependencies: {
          include: {
            requires: true,
          },
        },
      },
    })

    return NextResponse.json(updatedProduct)
  } catch (error) {
    console.error('Failed to update product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/[id] - Delete a product
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id } = await params

    // Delete dependencies first
    await prisma.product_dependencies.deleteMany({
      where: {
        OR: [
          { product_id: id },
          { requires_product_id: id },
        ],
      },
    })

    // Delete the product
    await prisma.products.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
