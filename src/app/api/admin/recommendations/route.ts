import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { recommendationCreateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

// DELETE /api/admin/recommendations?id=xxx - Delete a recommendation
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
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
    } catch (inviteError) {
      console.warn('Could not delete recommendation invites (table may not exist):', inviteError)
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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const recommendations = await prisma.recommendations.findMany({
      include: {
        client: true,
        creator: {
          select: {
            id: true,
            full_name: true,
            role: true,
          },
        },
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
        } catch (inviteError) {
          console.warn(`Could not fetch invites for recommendation ${rec.id}:`, inviteError)
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
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const validated = await validateRequest(recommendationCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      clientId,
      tierName,
      items,
      totalMonthly,
      totalOnetime,
      discountApplied,
      notes,
    } = (validated as any).data

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // pricing_type must be 'good', 'better', 'best', or null (DB check constraint)
    const validPricingTypes = ['good', 'better', 'best']
    const pricingType = validPricingTypes.includes(tierName) ? tierName : null

    // Check for existing recommendation for this client (draft or sent - allow editing both)
    const existingRecommendation = await prisma.recommendations.findFirst({
      where: {
        client_id: clientId,
        status: { in: ['draft', 'sent'] },
      },
      orderBy: { updated_at: 'desc' },
    })

    let recommendation

    if (existingRecommendation) {
      // Get existing items for comparison
      const existingItems = await prisma.recommendation_items.findMany({
        where: { recommendation_id: existingRecommendation.id },
        include: { product: true, bundle: true, addon: true },
      })

      // Update existing recommendation
      recommendation = await prisma.recommendations.update({
        where: { id: existingRecommendation.id },
        data: {
          pricing_type: pricingType,
          total_monthly: totalMonthly || 0,
          total_onetime: totalOnetime || 0,
          discount_applied: discountApplied || 0,
          notes: notes || null,
          updated_at: new Date(),
        },
      })

      // Delete old items
      await prisma.recommendation_items.deleteMany({
        where: { recommendation_id: recommendation.id },
      })

      // Build change description for history with specific item details
      const changes: string[] = []

      // Create maps of old items by tier and name for comparison
      type ItemInfo = { name: string; price: number; tier: string }
      const oldItemsByTier: Record<string, ItemInfo[]> = {}
      const newItemsByTier: Record<string, ItemInfo[]> = {}

      existingItems.forEach(item => {
        const tier = item.tier || 'unassigned'
        const name = item.product?.name || item.bundle?.name || item.addon?.name || 'Unknown'
        const price = Number(item.monthly_price || 0)
        if (!oldItemsByTier[tier]) oldItemsByTier[tier] = []
        oldItemsByTier[tier].push({ name, price, tier })
      })

      if (items && items.length > 0) {
        items.forEach((item: { tierName?: string; name?: string; monthlyPrice?: number; productId?: string; bundleId?: string; addonId?: string }) => {
          const tier = item.tierName || 'unassigned'
          const name = item.name || 'Unknown'
          const price = Number(item.monthlyPrice || 0)
          if (!newItemsByTier[tier]) newItemsByTier[tier] = []
          newItemsByTier[tier].push({ name, price, tier })
        })
      }

      // Compare items by tier to find additions and removals
      const allTiers = new Set([...Object.keys(oldItemsByTier), ...Object.keys(newItemsByTier)])
      allTiers.forEach(tier => {
        const tierLabel = tier === 'unassigned' ? 'Unassigned' : tier.charAt(0).toUpperCase() + tier.slice(1)
        const oldItems = oldItemsByTier[tier] || []
        const newItems = newItemsByTier[tier] || []

        // Find items in old but not in new (removed)
        const oldNames = oldItems.map(i => i.name)
        const newNames = newItems.map(i => i.name)

        oldItems.forEach(item => {
          if (!newNames.includes(item.name)) {
            changes.push(`Removed "${item.name}" ($${item.price}/mo) from ${tierLabel}`)
          }
        })

        // Find items in new but not in old (added)
        newItems.forEach(item => {
          if (!oldNames.includes(item.name)) {
            changes.push(`Added "${item.name}" ($${item.price}/mo) to ${tierLabel}`)
          }
        })
      })

      // Check for discount changes
      if (Number(existingRecommendation.discount_applied || 0) !== Number(discountApplied || 0)) {
        changes.push(`Discount changed to $${discountApplied || 0}`)
      }

      // Add history entry for update with user info
      if (changes.length > 0) {
        const userName = (auth as any).profile?.full_name || 'Unknown User'
        // Format role nicely (super_admin -> Super Admin, sales -> Sales)
        const rawRole = (auth as any).profile?.role || 'user'
        const userRole = rawRole.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        const actionLabel = `Recommendation updated by ${userName} - ${userRole}`

        try {
          await prisma.recommendation_history.create({
            data: {
              recommendation_id: recommendation.id,
              action: actionLabel,
              details: changes.join('; '),
              created_by: (auth as any).user?.id || null,
            },
          })
        } catch (historyError) {
          console.error('Failed to create history entry:', historyError)
          // Don't fail the save if history creation fails
        }
      }
    } else {
      // Create new recommendation
      recommendation = await prisma.recommendations.create({
        data: {
          client_id: clientId,
          created_by: (auth as any).user?.id || null,
          status: 'draft',
          pricing_type: pricingType,
          total_monthly: totalMonthly || 0,
          total_onetime: totalOnetime || 0,
          discount_applied: discountApplied || 0,
          notes: notes || null,
        },
      })

      // Add history entry for creation with user info
      const userName = (auth as any).profile?.full_name || 'Unknown User'
      // Format role nicely (super_admin -> Super Admin, sales -> Sales)
      const rawRole = (auth as any).profile?.role || 'user'
      const userRole = rawRole.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

      try {
        await prisma.recommendation_history.create({
          data: {
            recommendation_id: recommendation.id,
            action: `Recommendation created by ${userName} - ${userRole}`,
            details: `Recommendation created with ${items?.length || 0} items`,
            created_by: (auth as any).user?.id || null,
          },
        })
      } catch (historyError) {
        console.error('Failed to create history entry:', historyError)
        // Don't fail the save if history creation fails
      }
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
          tier: item.tierName || null, // Store tier name (good/better/best)
          quantity: item.quantity || 1,
          monthly_price: item.monthlyPrice || 0,
          onetime_price: item.onetimePrice || 0,
          is_free: item.isFree || false,
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
