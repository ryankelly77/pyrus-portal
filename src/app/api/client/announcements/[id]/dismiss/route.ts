import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/client/announcements/[id]/dismiss - Dismiss announcement
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const viewingAsClientId = searchParams.get('clientId')

    let clientId: string | null = null

    if (viewingAsClientId) {
      // Admin viewing as client - verify admin role
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { role: true },
      })

      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      clientId = viewingAsClientId
    } else {
      // Regular client - get their client ID from profile
      const profile = await prisma.profiles.findUnique({
        where: { id: user.id },
        select: { client_id: true },
      })

      clientId = profile?.client_id || null
    }

    if (!clientId) {
      return NextResponse.json({ error: 'No client associated' }, { status: 400 })
    }

    // Get announcement to check persistence type
    const announcement = await prisma.client_announcements.findUnique({
      where: { id },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check if announcement can be dismissed
    if (announcement.persistence_type === 'required_action') {
      return NextResponse.json(
        { error: 'This announcement cannot be dismissed' },
        { status: 400 }
      )
    }

    // Parse request body for permanent flag
    let permanent = false
    try {
      const body = await request.json()
      permanent = body.permanent === true && announcement.allow_permanent_dismiss
    } catch {
      // Body may be empty, use default
    }

    const now = new Date()

    // Upsert dismissal record
    const existingDismissal = await prisma.announcement_dismissals.findUnique({
      where: {
        announcement_id_client_id: {
          announcement_id: id,
          client_id: clientId,
        },
      },
    })

    if (existingDismissal) {
      await prisma.announcement_dismissals.update({
        where: { id: existingDismissal.id },
        data: {
          dismissed_at: now,
          is_permanent: permanent,
        },
      })
    } else {
      await prisma.announcement_dismissals.create({
        data: {
          announcement_id: id,
          client_id: clientId,
          user_id: user.id,
          dismissed_at: now,
          is_permanent: permanent,
          first_viewed_at: now,
          view_count: 1,
        },
      })
    }

    return NextResponse.json({ success: true, permanent })
  } catch (error: unknown) {
    console.error('Error dismissing announcement:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss announcement' },
      { status: 500 }
    )
  }
}
