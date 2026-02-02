import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// POST /api/admin/clients/[id]/smart-recommendations/items
// Add a single item to smart recommendations
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params
  const body = await request.json()
  const { product_id, why_note, is_featured = false, price_option = null } = body

  if (!product_id) {
    return NextResponse.json(
      { error: 'product_id is required' },
      { status: 400 }
    )
  }

  try {
    // Get or create the smart recommendation for this client
    let recommendation = await prisma.smart_recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'published'] }
      }
    })

    if (!recommendation) {
      recommendation = await prisma.smart_recommendations.create({
        data: {
          client_id: clientId,
          status: 'draft',
        }
      })
    }

    // Check if this product is already recommended
    const existingItem = await prisma.smart_recommendation_items.findFirst({
      where: {
        recommendation_id: recommendation.id,
        product_id: product_id,
      }
    })

    if (existingItem) {
      return NextResponse.json(
        { error: 'Product is already in recommendations' },
        { status: 400 }
      )
    }

    // Get the max priority to add this item at the end
    const maxPriorityResult = await prisma.smart_recommendation_items.aggregate({
      where: { recommendation_id: recommendation.id },
      _max: { priority: true }
    })
    const nextPriority = (maxPriorityResult._max.priority || 0) + 1

    // Create the item
    const item = await prisma.smart_recommendation_items.create({
      data: {
        recommendation_id: recommendation.id,
        product_id,
        priority: nextPriority,
        why_note: why_note || null,
        is_featured,
        price_option: price_option || null,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            short_description: true,
            long_description: true,
            category: true,
            monthly_price: true,
            onetime_price: true,
            stripe_monthly_price_id: true,
            stripe_onetime_price_id: true,
          }
        }
      }
    })

    // Update recommendation timestamp
    await prisma.smart_recommendations.update({
      where: { id: recommendation.id },
      data: { updated_at: new Date() }
    })

    return NextResponse.json({ item })
  } catch (error: any) {
    console.error('Error adding recommendation item:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add recommendation item' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/clients/[id]/smart-recommendations/items
// Update an item (why_note, priority, is_featured)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params
  const body = await request.json()
  const { item_id, why_note, priority, is_featured } = body

  if (!item_id) {
    return NextResponse.json(
      { error: 'item_id is required' },
      { status: 400 }
    )
  }

  try {
    // Verify the item belongs to this client's recommendation
    const item = await prisma.smart_recommendation_items.findUnique({
      where: { id: item_id },
      include: { recommendation: true }
    })

    if (!item || item.recommendation.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: { why_note?: string | null; priority?: number; is_featured?: boolean; updated_at: Date } = {
      updated_at: new Date()
    }
    if (why_note !== undefined) updateData.why_note = why_note || null
    if (priority !== undefined) updateData.priority = priority
    if (is_featured !== undefined) updateData.is_featured = is_featured

    const updated = await prisma.smart_recommendation_items.update({
      where: { id: item_id },
      data: updateData,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            short_description: true,
            long_description: true,
            category: true,
            monthly_price: true,
            onetime_price: true,
            stripe_monthly_price_id: true,
            stripe_onetime_price_id: true,
          }
        }
      }
    })

    // Update recommendation timestamp
    await prisma.smart_recommendations.update({
      where: { id: item.recommendation_id },
      data: { updated_at: new Date() }
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('Error updating recommendation item:', error)
    return NextResponse.json(
      { error: 'Failed to update recommendation item' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id]/smart-recommendations/items
// Remove an item from smart recommendations
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('item_id')

  if (!itemId) {
    return NextResponse.json(
      { error: 'item_id is required' },
      { status: 400 }
    )
  }

  try {
    // Verify the item belongs to this client's recommendation
    const item = await prisma.smart_recommendation_items.findUnique({
      where: { id: itemId },
      include: { recommendation: true }
    })

    if (!item || item.recommendation.client_id !== clientId) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      )
    }

    // Delete the item
    await prisma.smart_recommendation_items.delete({
      where: { id: itemId }
    })

    // Update recommendation timestamp
    await prisma.smart_recommendations.update({
      where: { id: item.recommendation_id },
      data: { updated_at: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting recommendation item:', error)
    return NextResponse.json(
      { error: 'Failed to delete recommendation item' },
      { status: 500 }
    )
  }
}
