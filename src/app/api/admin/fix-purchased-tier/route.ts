import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

// POST /api/admin/fix-purchased-tier - Fix a client's purchased_tier
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { clientId, tier = 'better' } = await request.json()

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    // Get the recommendation
    const rec = await prisma.recommendations.findFirst({
      where: { client_id: clientId },
      orderBy: { updated_at: 'desc' }
    })

    if (!rec) {
      return NextResponse.json({ error: 'No recommendation found' }, { status: 404 })
    }

    console.log('Current purchased_tier:', rec.purchased_tier)

    // Update the purchased_tier
    const updated = await prisma.recommendations.update({
      where: { id: rec.id },
      data: {
        purchased_tier: tier,
        purchased_at: rec.purchased_at || new Date()
      }
    })

    return NextResponse.json({
      success: true,
      previous_tier: rec.purchased_tier,
      new_tier: updated.purchased_tier,
      purchased_at: updated.purchased_at
    })
  } catch (error) {
    console.error('Failed to fix purchased tier:', error)
    return NextResponse.json({ error: 'Failed to fix purchased tier' }, { status: 500 })
  }
}
