import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/client/onboarding/complete - Mark onboarding as complete
// Supports ?clientId= for admin "view as client" mode
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const viewAsClientId = searchParams.get('clientId')

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let clientId: string

    if (viewAsClientId) {
      // Admin mode - verify admin role first
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { role: true },
      })

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      clientId = viewAsClientId
    } else {
      // Client mode - get their client_id from profile
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { client_id: true },
      })

      if (!profile?.client_id) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 400 })
      }

      clientId = profile.client_id
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

    // Log activity for notifications
    try {
      await prisma.activity_log.create({
        data: {
          user_id: user.id,
          client_id: clientId,
          activity_type: 'onboarding_completed',
          description: 'Completed onboarding',
          metadata: {
            clientName: updatedClient.name,
            completedAt: updatedClient.onboarding_completed_at?.toISOString(),
          },
        },
      })
    } catch (logError) {
      console.error('Failed to log onboarding completion (non-critical):', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding marked as complete',
      completedAt: updatedClient.onboarding_completed_at?.toISOString(),
    })
  } catch (error) {
    console.error('Onboarding complete error:', error)
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    )
  }
}
