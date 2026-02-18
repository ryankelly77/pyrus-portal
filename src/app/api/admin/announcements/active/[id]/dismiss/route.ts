import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/admin/announcements/active/[id]/dismiss - Dismiss announcement for admin user
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

    // Verify admin role
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    if (!profile?.role || profile.role === 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Find existing dismissal for this admin user
    const existingDismissal = await prisma.announcement_dismissals.findFirst({
      where: {
        announcement_id: id,
        user_id: user.id,
        client_id: null,
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
    console.error('Error dismissing admin announcement:', error)
    return NextResponse.json(
      { error: 'Failed to dismiss announcement' },
      { status: 500 }
    )
  }
}
