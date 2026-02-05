import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { triggerRecalculation } from '@/lib/pipeline/recalculate-score'

// GET /api/proposal/[token] - Get recommendation by invite token (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find invite by token
    const invite = await prisma.recommendation_invites.findUnique({
      where: { invite_token: token },
      include: {
        recommendation: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                contact_name: true,
              },
            },
            recommendation_items: {
              include: {
                product: true,
                bundle: {
                  include: {
                    bundle_products: {
                      include: {
                        product: {
                          select: {
                            id: true,
                            name: true,
                            monthly_price: true,
                            onetime_price: true,
                          },
                        },
                      },
                    },
                  },
                },
                addon: true,
              },
            },
            reward_tier: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation link' },
        { status: 404 }
      )
    }

    // Update viewed_at and status if not already viewed
    if (!invite.viewed_at) {
      await prisma.recommendation_invites.update({
        where: { id: invite.id },
        data: {
          viewed_at: new Date(),
          status: 'viewed',
        },
      })

      // Log history
      try {
        await prisma.recommendation_history.create({
          data: {
            recommendation_id: invite.recommendation_id,
            action: 'Proposal viewed',
            details: `Viewed by ${invite.first_name} ${invite.last_name}`,
          },
        })
      } catch {
        // Don't fail if history creation fails
      }

      // Trigger score recalculation (non-blocking)
      triggerRecalculation(invite.recommendation_id, 'proposal_viewed').catch(console.error)
    }

    const recommendation = invite.recommendation

    // Group items by tier
    const tierItems: Record<string, typeof recommendation.recommendation_items> = {
      good: [],
      better: [],
      best: [],
    }

    recommendation.recommendation_items.forEach((item) => {
      const tier = item.tier || 'good'
      if (tierItems[tier]) {
        tierItems[tier].push(item)
      }
    })

    // Calculate tier pricing with full breakdown
    const calculateTierPricing = (items: typeof recommendation.recommendation_items) => {
      let fullPriceMonthly = 0
      let fullPriceOnetime = 0
      let freeItemsValueMonthly = 0
      let freeItemsValueOnetime = 0

      items.forEach((item) => {
        const qty = item.quantity || 1

        // Get the original product/bundle/addon price for full price calculation
        let originalMonthly = 0
        let originalOnetime = 0

        if (item.product) {
          originalMonthly = item.product.monthly_price ? parseFloat(item.product.monthly_price.toString()) : 0
          originalOnetime = item.product.onetime_price ? parseFloat(item.product.onetime_price.toString()) : 0
        } else if (item.bundle) {
          originalMonthly = item.bundle.monthly_price ? parseFloat(item.bundle.monthly_price.toString()) : 0
          originalOnetime = item.bundle.onetime_price ? parseFloat(item.bundle.onetime_price.toString()) : 0
        } else if (item.addon) {
          originalMonthly = item.addon.price ? parseFloat(item.addon.price.toString()) : 0
        }

        // Use item's stored price if different (custom pricing)
        const itemMonthly = item.monthly_price ? parseFloat(item.monthly_price.toString()) : originalMonthly
        const itemOnetime = item.onetime_price ? parseFloat(item.onetime_price.toString()) : originalOnetime

        // Full price always includes everything
        fullPriceMonthly += originalMonthly * qty
        fullPriceOnetime += originalOnetime * qty

        // Track free items value
        if (item.is_free) {
          freeItemsValueMonthly += originalMonthly * qty
          freeItemsValueOnetime += originalOnetime * qty
        }
      })

      // After free items = full price - free items value
      const afterFreeMonthly = fullPriceMonthly - freeItemsValueMonthly
      const afterFreeOnetime = fullPriceOnetime - freeItemsValueOnetime

      // Your price = after applying any discount from reward tier
      const discountPercent = recommendation.reward_tier?.discount_percentage || 0
      const discountAmountMonthly = Math.round(afterFreeMonthly * (discountPercent / 100) * 100) / 100
      const yourPriceMonthly = afterFreeMonthly - discountAmountMonthly
      const yourPriceOnetime = afterFreeOnetime // One-time fees typically not discounted

      // Total savings
      const totalSavings = (fullPriceMonthly - yourPriceMonthly) + (fullPriceOnetime - yourPriceOnetime)

      return {
        fullPriceMonthly,
        fullPriceOnetime,
        afterFreeMonthly,
        afterFreeOnetime,
        yourPriceMonthly,
        yourPriceOnetime,
        freeItemsValue: freeItemsValueMonthly + freeItemsValueOnetime,
        discountPercent,
        discountAmount: discountAmountMonthly,
        totalSavings,
      }
    }

    const tiers = {
      good: {
        items: tierItems.good,
        pricing: calculateTierPricing(tierItems.good),
      },
      better: {
        items: tierItems.better,
        pricing: calculateTierPricing(tierItems.better),
      },
      best: {
        items: tierItems.best,
        pricing: calculateTierPricing(tierItems.best),
      },
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        firstName: invite.first_name,
        lastName: invite.last_name,
        email: invite.email,
        viewedAt: invite.viewed_at,
      },
      client: {
        id: recommendation.client.id,
        name: recommendation.client.name,
        contactName: recommendation.client.contact_name,
      },
      recommendation: {
        id: recommendation.id,
        status: recommendation.status,
        totalMonthly: recommendation.total_monthly,
        totalOnetime: recommendation.total_onetime,
        discountApplied: recommendation.discount_applied,
        notes: recommendation.notes,
        sentAt: recommendation.sent_at,
      },
      tiers,
      rewardTier: recommendation.reward_tier,
    })
  } catch (error) {
    console.error('Failed to fetch proposal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    )
  }
}
