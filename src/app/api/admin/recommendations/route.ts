import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE /api/admin/recommendations?id=xxx - Delete a recommendation
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Recommendation ID is required' },
        { status: 400 }
      )
    }

    // Delete invites first (foreign key constraint) - skip if table doesn't exist
    try {
      await prisma.recommendation_invites.deleteMany({
        where: { recommendation_id: id },
      })
    } catch {
      // Table may not exist yet, continue
    }

    // Delete recommendation items (foreign key constraint)
    await prisma.recommendation_items.deleteMany({
      where: { recommendation_id: id },
    })

    // Delete the recommendation
    await prisma.recommendations.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to delete recommendation' },
      { status: 500 }
    )
  }
}

// GET /api/admin/recommendations - Get all recommendations
export async function GET() {
  try {
    const recommendations = await prisma.recommendations.findMany({
      include: {
        client: true,
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    // Fetch invites separately to handle schema mismatches
    const recommendationsWithInvites = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          const invites = await prisma.recommendation_invites.findMany({
            where: { recommendation_id: rec.id },
            orderBy: { created_at: 'desc' },
          })
          return { ...rec, recommendation_invites: invites }
        } catch {
          return { ...rec, recommendation_invites: [] }
        }
      })
    )

    return NextResponse.json(recommendationsWithInvites)
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

// POST /api/admin/recommendations - Create or update a recommendation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      clientId,
      tierName,
      items,
      totalMonthly,
      totalOnetime,
      notes,
    } = body

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // pricing_type must be 'good', 'better', 'best', or null (DB check constraint)
    const validPricingTypes = ['good', 'better', 'best']
    const pricingType = validPricingTypes.includes(tierName) ? tierName : null

    // Check for existing draft recommendation for this client
    const existingRecommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        status: 'draft',
      },
    })

    let recommendation

    if (existingRecommendation) {
      // Update existing recommendation
      recommendation = await prisma.recommendations.update({
        where: { id: existingRecommendation.id },
        data: {
          pricing_type: pricingType,
          total_monthly: totalMonthly || 0,
          total_onetime: totalOnetime || 0,
          notes: notes || null,
          updated_at: new Date(),
        },
      })

      // Delete old items
      await prisma.recommendation_items.deleteMany({
        where: { recommendation_id: recommendation.id },
      })
    } else {
      // Create new recommendation
      recommendation = await prisma.recommendations.create({
        data: {
          client_id: clientId,
          status: 'draft',
          pricing_type: pricingType,
          total_monthly: totalMonthly || 0,
          total_onetime: totalOnetime || 0,
          notes: notes || null,
        },
      })
    }

    // Create recommendation items
    if (items && items.length > 0) {
      await prisma.recommendation_items.createMany({
        data: items.map((item: {
          productId?: string
          bundleId?: string
          addonId?: string
          quantity: number
          monthlyPrice: number
          onetimePrice: number
          isFree?: boolean
          tierName?: string
        }) => ({
          recommendation_id: recommendation.id,
          product_id: item.productId || null,
          bundle_id: item.bundleId || null,
          addon_id: item.addonId || null,
          quantity: item.quantity || 1,
          monthly_price: item.monthlyPrice || 0,
          onetime_price: item.onetimePrice || 0,
          is_free: item.isFree || false,
          notes: item.tierName || null, // Store tier name in notes field temporarily
        })),
      })
    }

    // Fetch the recommendation with items
    const savedRecommendation = await prisma.recommendations.findUnique({
      where: { id: recommendation.id },
      include: {
        client: true,
        recommendation_items: {
          include: {
            product: true,
            bundle: true,
            addon: true,
          },
        },
      },
    })

    return NextResponse.json(savedRecommendation, { status: existingRecommendation ? 200 : 201 })
  } catch (error) {
    console.error('Failed to save recommendation:', error)
    return NextResponse.json(
      { error: 'Failed to save recommendation' },
      { status: 500 }
    )
  }
}
