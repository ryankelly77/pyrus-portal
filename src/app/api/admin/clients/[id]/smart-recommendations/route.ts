import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/clients/[id]/smart-recommendations
// Returns the client's smart recommendations with items and products
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params

  try {
    // Get the active smart recommendation for this client (draft or published)
    const recommendation = await prisma.smart_recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'published'] }
      },
      include: {
        items: {
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
          },
          orderBy: { priority: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    return NextResponse.json({ recommendation })
  } catch (error) {
    console.error('Error fetching smart recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch smart recommendations' },
      { status: 500 }
    )
  }
}

// POST /api/admin/clients/[id]/smart-recommendations
// Create or update smart recommendations
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params
  const body = await request.json()
  const { items, status = 'draft' } = body

  try {
    // Get existing draft/published recommendation
    let recommendation = await prisma.smart_recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'published'] }
      }
    })

    // Create new recommendation if none exists
    if (!recommendation) {
      recommendation = await prisma.smart_recommendations.create({
        data: {
          client_id: clientId,
          status: 'draft',
        }
      })
    }

    // If items are provided, update them
    if (items && Array.isArray(items)) {
      // Delete existing items
      await prisma.smart_recommendation_items.deleteMany({
        where: { recommendation_id: recommendation.id }
      })

      // Create new items
      if (items.length > 0) {
        await prisma.smart_recommendation_items.createMany({
          data: items.map((item: { product_id: string; priority?: number; why_note?: string; is_featured?: boolean }, index: number) => ({
            recommendation_id: recommendation!.id,
            product_id: item.product_id,
            priority: item.priority ?? index + 1,
            why_note: item.why_note || null,
            is_featured: item.is_featured || false,
          }))
        })
      }
    }

    // Update status if publishing
    if (status === 'published' && recommendation.status !== 'published') {
      const now = new Date()
      const refreshDate = new Date(now)
      refreshDate.setDate(refreshDate.getDate() + 90)

      await prisma.smart_recommendations.update({
        where: { id: recommendation.id },
        data: {
          status: 'published',
          published_at: now,
          next_refresh_at: refreshDate,
          updated_at: now,
        }
      })
    } else {
      await prisma.smart_recommendations.update({
        where: { id: recommendation.id },
        data: {
          status,
          updated_at: new Date(),
        }
      })
    }

    // Fetch and return the updated recommendation
    const updated = await prisma.smart_recommendations.findUnique({
      where: { id: recommendation.id },
      include: {
        items: {
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
          },
          orderBy: { priority: 'asc' }
        }
      }
    })

    return NextResponse.json({ recommendation: updated })
  } catch (error) {
    console.error('Error saving smart recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to save smart recommendations' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/clients/[id]/smart-recommendations
// Archive (soft delete) smart recommendations
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { id: clientId } = await params

  try {
    // Archive the recommendation instead of deleting
    await prisma.smart_recommendations.updateMany({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'published'] }
      },
      data: {
        status: 'archived',
        updated_at: new Date(),
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error archiving smart recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to archive smart recommendations' },
      { status: 500 }
    )
  }
}
