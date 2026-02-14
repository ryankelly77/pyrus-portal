import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/clients/[id]/test-products - Get test products for a client
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Verify client exists and is a test client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, status: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.status !== 'test') {
      return NextResponse.json({ error: 'Test products only available for test clients' }, { status: 400 })
    }

    // Get test subscription items (where stripe_subscription_item_id starts with 'test_')
    const testItems = await dbPool.query(`
      SELECT si.id, si.product_id, si.quantity, p.name, p.category, p.monthly_price
      FROM subscription_items si
      JOIN subscriptions s ON s.id = si.subscription_id
      JOIN products p ON p.id = si.product_id
      WHERE s.client_id = $1
        AND (si.stripe_subscription_item_id LIKE 'test_%' OR si.stripe_subscription_item_id IS NULL)
        AND s.status = 'active'
    `, [clientId])

    return NextResponse.json({ products: testItems.rows })
  } catch (error) {
    console.error('Failed to fetch test products:', error)
    return NextResponse.json({ error: 'Failed to fetch test products' }, { status: 500 })
  }
}

// POST /api/admin/clients/[id]/test-products - Add a test product
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Verify client exists and is a test client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, status: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.status !== 'test') {
      return NextResponse.json({ error: 'Test products only available for test clients' }, { status: 400 })
    }

    // Get the product
    const product = await prisma.products.findUnique({
      where: { id: productId },
      select: { id: true, name: true, monthly_price: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Find or create a test subscription for this client
    let subscription = await prisma.subscriptions.findFirst({
      where: {
        client_id: clientId,
        stripe_subscription_id: `test_${clientId}`,
      },
    })

    if (!subscription) {
      subscription = await prisma.subscriptions.create({
        data: {
          client_id: clientId,
          stripe_subscription_id: `test_${clientId}`,
          status: 'active',
          monthly_amount: 0,
        },
      })
    }

    // Check if product already exists in subscription
    const existingItem = await prisma.subscription_items.findFirst({
      where: {
        subscription_id: subscription.id,
        product_id: productId,
      },
    })

    if (existingItem) {
      return NextResponse.json({ error: 'Product already added' }, { status: 400 })
    }

    // Add the subscription item
    const subscriptionItem = await prisma.subscription_items.create({
      data: {
        subscription_id: subscription.id,
        product_id: productId,
        stripe_subscription_item_id: `test_${productId}_${Date.now()}`,
        quantity: 1,
        unit_amount: product.monthly_price || 0,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Added ${product.name} to test subscription`,
      item: subscriptionItem,
    })
  } catch (error) {
    console.error('Failed to add test product:', error)
    return NextResponse.json({ error: 'Failed to add test product' }, { status: 500 })
  }
}

// DELETE /api/admin/clients/[id]/test-products - Remove a test product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: clientId } = await params
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 })
    }

    // Verify client exists and is a test client
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, status: true },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (client.status !== 'test') {
      return NextResponse.json({ error: 'Test products only available for test clients' }, { status: 400 })
    }

    // Find the test subscription
    const subscription = await prisma.subscriptions.findFirst({
      where: {
        client_id: clientId,
        stripe_subscription_id: `test_${clientId}`,
      },
    })

    if (!subscription) {
      return NextResponse.json({ error: 'No test subscription found' }, { status: 404 })
    }

    // Delete the subscription item
    const deleted = await prisma.subscription_items.deleteMany({
      where: {
        subscription_id: subscription.id,
        product_id: productId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Product not found in test subscription' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Removed product from test subscription',
    })
  } catch (error) {
    console.error('Failed to remove test product:', error)
    return NextResponse.json({ error: 'Failed to remove test product' }, { status: 500 })
  }
}
