import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/admin/clients/[id]/onboarding/complete - Mark client onboarding as complete (admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id: clientId } = await params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Check if already completed
    const existingClient = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { onboarding_completed_at: true, name: true },
    })

    if (!existingClient) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (existingClient.onboarding_completed_at) {
      return NextResponse.json({
        success: true,
        message: 'Onboarding was already completed',
        completedAt: existingClient.onboarding_completed_at.toISOString(),
      })
    }

    // Update onboarding_completed_at
    const updatedClient = await prisma.clients.update({
      where: { id: clientId },
      data: { onboarding_completed_at: new Date() },
      select: { id: true, name: true, onboarding_completed_at: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Onboarding marked as complete',
      completedAt: updatedClient.onboarding_completed_at?.toISOString(),
    })
  } catch (error) {
    console.error('Admin onboarding complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
