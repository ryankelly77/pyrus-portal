import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// Format money with commas (e.g., $2,097.00)
const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// POST /api/admin/activity/fix-all
// Comprehensive fix for activity log entries:
// 1. Delete Tracie's Company entries
// 2. Fix "purchased" descriptions to show billing info
// 3. Add comma formatting to all dollar amounts
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can run this' }, { status: 403 })
    }

    const results = {
      tracieDeleted: 0,
      purchasedFixed: 0,
      commasAdded: 0,
      entries: [] as { id: string; oldDesc: string; newDesc: string; client: string }[],
    }

    // 1. Delete Tracie's Company entries
    const tracieClient = await prisma.clients.findFirst({
      where: { name: { contains: "Tracie", mode: 'insensitive' } },
      select: { id: true }
    })

    if (tracieClient) {
      const deleteResult = await prisma.activity_log.deleteMany({
        where: {
          client_id: tracieClient.id,
          activity_type: { in: ['purchase', 'payment'] }
        }
      })
      results.tracieDeleted = deleteResult.count
    }

    // 2. Fix "purchased" descriptions - these need "billed at next cycle" language
    const purchasedActivities = await prisma.activity_log.findMany({
      where: {
        activity_type: 'purchase',
        description: { contains: 'purchased' },
      },
      include: {
        client: { select: { name: true } }
      }
    })

    for (const activity of purchasedActivities) {
      // Extract price from description like "Paul D'Souza purchased the Plan - $300/mo"
      const priceMatch = activity.description?.match(/\$([0-9,]+(?:\.[0-9]{2})?)/);
      if (priceMatch) {
        const priceStr = priceMatch[1].replace(/,/g, '')
        const price = parseFloat(priceStr)
        if (!isNaN(price)) {
          const newDesc = `New subscription - $${formatMoney(price)}/mo (billed at next cycle)`

          await prisma.activity_log.update({
            where: { id: activity.id },
            data: { description: newDesc }
          })

          results.purchasedFixed++
          results.entries.push({
            id: activity.id,
            oldDesc: activity.description || '',
            newDesc,
            client: activity.client?.name || 'Unknown'
          })
        }
      }
    }

    // 3. Fix comma formatting in existing entries
    const allPurchaseActivities = await prisma.activity_log.findMany({
      where: {
        activity_type: { in: ['purchase', 'payment'] },
        description: { contains: '$' },
      },
      include: {
        client: { select: { name: true } }
      }
    })

    for (const activity of allPurchaseActivities) {
      if (!activity.description) continue

      // Check if any dollar amount is missing commas (4+ digits without comma)
      // Match patterns like $1234 or $1234.00 but not $1,234 or $1,234.00
      const needsComma = /\$([0-9]{4,})(?:\.[0-9]{2})?/.test(activity.description)

      if (needsComma) {
        // Replace all dollar amounts with comma-formatted versions
        const newDesc = activity.description.replace(
          /\$([0-9]+(?:\.[0-9]{2})?)/g,
          (match, numStr) => {
            const num = parseFloat(numStr)
            return `$${formatMoney(num)}`
          }
        )

        if (newDesc !== activity.description) {
          await prisma.activity_log.update({
            where: { id: activity.id },
            data: { description: newDesc }
          })

          results.commasAdded++
          results.entries.push({
            id: activity.id,
            oldDesc: activity.description,
            newDesc,
            client: activity.client?.name || 'Unknown'
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Fix all error:', error)
    return NextResponse.json({ error: 'Failed to fix activities' }, { status: 500 })
  }
}
