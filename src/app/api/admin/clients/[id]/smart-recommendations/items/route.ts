import { NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
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
  const { product_id, why_note, is_featured = false, price_option = null, coupon_code = null } = body

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

    // Check if this product is already recommended (only active items)
    const existingItem = await prisma.smart_recommendation_items.findFirst({
      where: {
        recommendation_id: recommendation.id,
        product_id: product_id,
      }
    })

    if (existingItem) {
      // If the existing item was declined, reactivate it with the new settings
      if (existingItem.status === 'declined') {
        const reactivated = await prisma.smart_recommendation_items.update({
          where: { id: existingItem.id },
          data: {
            status: 'active',
            status_changed_at: null,
            why_note: why_note || null,
            is_featured,
            price_option: price_option || null,
            coupon_code: coupon_code || null,
            updated_at: new Date(),
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

        // Check if all other items are declined - if so, reset to draft
        const activeItemCount = await prisma.smart_recommendation_items.count({
          where: {
            recommendation_id: recommendation.id,
            status: { not: 'declined' }
          }
        })

        // Reset to draft if this is the only active item (needs to be published again)
        if (activeItemCount === 1) {
          await prisma.smart_recommendations.update({
            where: { id: recommendation.id },
            data: {
              status: 'draft',
              published_at: null,
              updated_at: new Date()
            }
          })
        } else {
          // Just update timestamp
          await prisma.smart_recommendations.update({
            where: { id: recommendation.id },
            data: { updated_at: new Date() }
          })
        }

        // Add history entry for reactivation
        try {
          await dbPool.query(
            `INSERT INTO smart_recommendation_history
             (recommendation_id, item_id, product_id, action, details)
             VALUES ($1, $2, $3, 'item_added', $4)`,
            [recommendation.id, reactivated.id, product_id, `Re-added "${reactivated.product.name}" to recommendations`]
          )
        } catch (historyError) {
          console.error('Failed to add history entry:', historyError)
        }

        // Fetch updated recommendation status
        const updatedRecommendation = await prisma.smart_recommendations.findUnique({
          where: { id: recommendation.id },
          select: { id: true, status: true, published_at: true, next_refresh_at: true }
        })

        return NextResponse.json({ item: reactivated, recommendation: updatedRecommendation })
      }

      // Item exists and is active - can't add duplicate
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
        coupon_code: coupon_code || null,
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

    // Check if all other items are declined - if so, reset to draft
    const activeItemCount = await prisma.smart_recommendation_items.count({
      where: {
        recommendation_id: recommendation.id,
        status: { not: 'declined' }
      }
    })

    // Reset to draft if this is the only active item (needs to be published again)
    if (activeItemCount === 1 && recommendation.status === 'published') {
      await prisma.smart_recommendations.update({
        where: { id: recommendation.id },
        data: {
          status: 'draft',
          published_at: null,
          updated_at: new Date()
        }
      })
    } else {
      // Just update timestamp
      await prisma.smart_recommendations.update({
        where: { id: recommendation.id },
        data: { updated_at: new Date() }
      })
    }

    // Add history entry
    try {
      await dbPool.query(
        `INSERT INTO smart_recommendation_history
         (recommendation_id, item_id, product_id, action, details)
         VALUES ($1, $2, $3, 'item_added', $4)`,
        [recommendation.id, item.id, product_id, `Added "${item.product.name}" to recommendations`]
      )
    } catch (historyError) {
      console.error('Failed to add history entry:', historyError)
    }

    // Fetch updated recommendation status
    const updatedRecommendation = await prisma.smart_recommendations.findUnique({
      where: { id: recommendation.id },
      select: { id: true, status: true, published_at: true, next_refresh_at: true }
    })

    return NextResponse.json({ item, recommendation: updatedRecommendation })
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
  const { item_id, why_note, priority, is_featured, coupon_code } = body

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
    const updateData: { why_note?: string | null; priority?: number; is_featured?: boolean; coupon_code?: string | null; updated_at: Date } = {
      updated_at: new Date()
    }
    if (why_note !== undefined) updateData.why_note = why_note || null
    if (priority !== undefined) updateData.priority = priority
    if (is_featured !== undefined) updateData.is_featured = is_featured
    if (coupon_code !== undefined) updateData.coupon_code = coupon_code || null

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

    // Get product name for history
    const product = await prisma.products.findUnique({
      where: { id: item.product_id },
      select: { name: true }
    })

    // Add history entry before deleting
    try {
      await dbPool.query(
        `INSERT INTO smart_recommendation_history
         (recommendation_id, item_id, product_id, action, details)
         VALUES ($1, $2, $3, 'item_removed', $4)`,
        [item.recommendation_id, itemId, item.product_id, `Removed "${product?.name || 'Unknown'}" from recommendations`]
      )
    } catch (historyError) {
      console.error('Failed to add history entry:', historyError)
    }

    // Delete the item
    await prisma.smart_recommendation_items.delete({
      where: { id: itemId }
    })

    // Check if there are any remaining items
    const remainingItems = await prisma.smart_recommendation_items.count({
      where: { recommendation_id: item.recommendation_id }
    })

    // If no items remain, reset to draft so new items require publishing
    if (remainingItems === 0) {
      await prisma.smart_recommendations.update({
        where: { id: item.recommendation_id },
        data: {
          status: 'draft',
          published_at: null,
          updated_at: new Date()
        }
      })
    } else {
      // Just update timestamp
      await prisma.smart_recommendations.update({
        where: { id: item.recommendation_id },
        data: { updated_at: new Date() }
      })
    }

    return NextResponse.json({ success: true, remainingItems })
  } catch (error) {
    console.error('Error deleting recommendation item:', error)
    return NextResponse.json(
      { error: 'Failed to delete recommendation item' },
      { status: 500 }
    )
  }
}
