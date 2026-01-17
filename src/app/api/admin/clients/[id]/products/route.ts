import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/clients/[id]/products - Get all products assigned to a client
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params

    // Get manually assigned products (handle case where table doesn't exist yet)
    let manualProducts: Awaited<ReturnType<typeof prisma.client_products.findMany>> = []
    try {
      manualProducts = await prisma.client_products.findMany({
        where: { client_id: clientId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              short_description: true,
              monthly_price: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      })
    } catch (e) {
      // Table might not exist yet
      console.log('client_products table may not exist yet:', e)
    }

    // Get subscription products
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        client_id: clientId,
        status: 'active',
      },
      include: {
        subscription_items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                short_description: true,
              },
            },
            bundle: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    })

    // Format manual products
    const manualProductsList = manualProducts.map(cp => ({
      id: cp.id,
      productId: cp.product.id,
      name: cp.product.name,
      category: cp.product.category,
      description: cp.product.short_description,
      source: 'manual' as const,
      assignedAt: cp.created_at,
      notes: cp.notes,
      // Use override price if set, otherwise fall back to product default
      monthlyPrice: cp.monthly_price !== null ? Number(cp.monthly_price) : Number(cp.product.monthly_price || 0),
      hasCustomPrice: cp.monthly_price !== null,
    }))

    // Format subscription products
    const subscriptionProductsList = subscriptions.flatMap(sub =>
      sub.subscription_items.map(item => ({
        id: item.id,
        productId: item.product?.id || item.bundle?.id || '',
        name: item.product?.name || item.bundle?.name || 'Unknown',
        category: item.product?.category || 'bundle',
        description: item.product?.short_description || item.bundle?.description,
        source: 'subscription' as const,
        subscriptionId: sub.id,
        stripeSubscriptionId: sub.stripe_subscription_id,
      }))
    )

    return NextResponse.json({
      manual: manualProductsList,
      subscription: subscriptionProductsList,
    })
  } catch (error) {
    console.error('Failed to fetch client products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client products' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/products - Add a product to a client
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params
    const body = await request.json()
    const { productId, notes, monthlyPrice } = body

    console.log('Adding product to client:', { clientId, productId, notes, monthlyPrice })

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Check if already assigned
    let existing = null
    try {
      existing = await prisma.client_products.findFirst({
        where: {
          client_id: clientId,
          product_id: productId,
        },
      })
    } catch (e) {
      console.error('Error checking existing product (table may not exist):', e)
      return NextResponse.json(
        { error: 'client_products table does not exist. Please run the SQL migration in Supabase.' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Product already assigned to this client' },
        { status: 400 }
      )
    }

    // Create the assignment
    const clientProduct = await prisma.client_products.create({
      data: {
        client_id: clientId,
        product_id: productId,
        monthly_price: monthlyPrice !== undefined ? monthlyPrice : null,
        notes: notes || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            short_description: true,
            monthly_price: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: clientProduct.id,
      productId: clientProduct.product.id,
      name: clientProduct.product.name,
      category: clientProduct.product.category,
      description: clientProduct.product.short_description,
      source: 'manual',
      assignedAt: clientProduct.created_at,
      notes: clientProduct.notes,
      monthlyPrice: clientProduct.monthly_price !== null
        ? Number(clientProduct.monthly_price)
        : Number(clientProduct.product.monthly_price || 0),
      hasCustomPrice: clientProduct.monthly_price !== null,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to add product to client:', error)
    return NextResponse.json(
      { error: 'Failed to add product to client' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id]/products - Remove a product from a client
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params
    const { searchParams } = new URL(request.url)
    const clientProductId = searchParams.get('clientProductId')

    if (!clientProductId) {
      return NextResponse.json(
        { error: 'Client product ID is required' },
        { status: 400 }
      )
    }

    // Verify the product belongs to this client
    const clientProduct = await prisma.client_products.findFirst({
      where: {
        id: clientProductId,
        client_id: clientId,
      },
    })

    if (!clientProduct) {
      return NextResponse.json(
        { error: 'Product assignment not found' },
        { status: 404 }
      )
    }

    // Delete the assignment
    await prisma.client_products.delete({
      where: { id: clientProductId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove product from client:', error)
    return NextResponse.json(
      { error: 'Failed to remove product from client' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[id]/products - Update a client product (e.g., price)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: clientId } = await params
    const body = await request.json()
    const { clientProductId, monthlyPrice } = body

    if (!clientProductId) {
      return NextResponse.json(
        { error: 'Client product ID is required' },
        { status: 400 }
      )
    }

    // Verify the product belongs to this client
    const existing = await prisma.client_products.findFirst({
      where: {
        id: clientProductId,
        client_id: clientId,
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Product assignment not found' },
        { status: 404 }
      )
    }

    // Update the product assignment
    const updated = await prisma.client_products.update({
      where: { id: clientProductId },
      data: {
        monthly_price: monthlyPrice !== undefined && monthlyPrice !== null ? monthlyPrice : null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            short_description: true,
            monthly_price: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: updated.id,
      productId: updated.product.id,
      name: updated.product.name,
      category: updated.product.category,
      description: updated.product.short_description,
      source: 'manual',
      assignedAt: updated.created_at,
      notes: updated.notes,
      monthlyPrice: updated.monthly_price !== null
        ? Number(updated.monthly_price)
        : Number(updated.product.monthly_price || 0),
      hasCustomPrice: updated.monthly_price !== null,
    })
  } catch (error) {
    console.error('Failed to update client product:', error)
    return NextResponse.json(
      { error: 'Failed to update client product' },
      { status: 500 }
    )
  }
}
