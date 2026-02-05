import { NextRequest, NextResponse } from 'next/server'
import { prisma, dbPool } from '@/lib/prisma'
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

    // For non-admin roles, verify they own this recommendation
    if (!['super_admin', 'admin'].includes(profile.role)) {
      const recommendation = await prisma.recommendations.findUnique({
        where: { id },
        select: { created_by: true },
      })
      if (!recommendation || recommendation.created_by !== user.id) {
        return NextResponse.json(
          { error: 'You can only delete your own recommendations' },
          { status: 403 }
        )
      }
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

    // Build query filter based on role
    // super_admin and admin see all, sales and production_team see only their own
    const whereClause = ['super_admin', 'admin'].includes(profile.role)
      ? {}
      : { created_by: user.id }

    const recommendations = await prisma.recommendations.findMany({
      where: whereClause,
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

    // Fetch invites and call_scores separately to handle schema mismatches
    const recommendationsWithExtras = await Promise.all(
      recommendations.map(async (rec) => {
        let invites: any[] = []
        let callScores = null

        try {
          invites = await prisma.recommendation_invites.findMany({
            where: { recommendation_id: rec.id },
            orderBy: { created_at: 'desc' },
          })
        } catch (inviteError) {
          console.warn(`Could not fetch invites for recommendation ${rec.id}:`, inviteError)
        }

        try {
          const scoresResult = await dbPool.query(
            `SELECT id, budget_clarity, competition, engagement, plan_fit
             FROM recommendation_call_scores
             WHERE recommendation_id = $1`,
            [rec.id]
          )
          callScores = scoresResult.rows[0] || null
        } catch (scoresError) {
          console.warn(`Could not fetch call scores for recommendation ${rec.id}:`, scoresError)
        }

        return { ...rec, recommendation_invites: invites, call_scores: callScores }
      })
    )

    return NextResponse.json(recommendationsWithExtras)
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
      predictedTier,
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

    // Calculate predicted_monthly and predicted_onetime from the predicted tier's items
    let predictedMonthly = 0
    let predictedOnetime = 0
    if (predictedTier && items && items.length > 0) {
      for (const item of items) {
        if (item.tierName === predictedTier) {
          predictedMonthly += Number(item.monthlyPrice || 0)
          predictedOnetime += Number(item.onetimePrice || 0)
        }
      }
    }

    // Check for existing recommendation for this client (draft or sent - allow editing both)
    // For non-admin roles, only find their own recommendations
    const whereClause = ['super_admin', 'admin'].includes(profile.role)
      ? { client_id: clientId, status: { in: ['draft', 'sent'] } }
      : { client_id: clientId, status: { in: ['draft', 'sent'] }, created_by: user.id }

    const existingRecommendation = await prisma.recommendations.findFirst({
      where: whereClause,
      orderBy: { updated_at: 'desc' },
    })

    let recommendation

    if (existingRecommendation) {
      // Get existing items for comparison
      const existingItems = await prisma.recommendation_items.findMany({
        where: { recommendation_id: existingRecommendation.id },
        include: { product: true, bundle: true, addon: true },
      })

      // Update existing recommendation using raw SQL for new columns
      const updateResult = await dbPool.query(
        `UPDATE recommendations SET
           pricing_type = $1,
           predicted_tier = $2,
           predicted_monthly = $3,
           predicted_onetime = $4,
           total_monthly = $5,
           total_onetime = $6,
           discount_applied = $7,
           notes = $8,
           updated_at = NOW()
         WHERE id = $9
         RETURNING id, client_id, status, pricing_type, total_monthly, total_onetime, notes, created_at, updated_at`,
        [
          pricingType,
          predictedTier || null,
          predictedMonthly,
          predictedOnetime,
          totalMonthly || 0,
          totalOnetime || 0,
          discountApplied || 0,
          notes || null,
          existingRecommendation.id
        ]
      )
      recommendation = updateResult.rows[0]

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
      // Create new recommendation using raw SQL for new columns
      const createResult = await dbPool.query(
        `INSERT INTO recommendations (
           client_id, created_by, status, pricing_type, predicted_tier,
           predicted_monthly, predicted_onetime, total_monthly, total_onetime,
           discount_applied, notes, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
         RETURNING id, client_id, status, pricing_type, total_monthly, total_onetime, notes, created_at, updated_at`,
        [
          clientId,
          (auth as any).user?.id || null,
          'draft',
          pricingType,
          predictedTier || null,
          predictedMonthly,
          predictedOnetime,
          totalMonthly || 0,
          totalOnetime || 0,
          discountApplied || 0,
          notes || null,
        ]
      )
      recommendation = createResult.rows[0]

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
