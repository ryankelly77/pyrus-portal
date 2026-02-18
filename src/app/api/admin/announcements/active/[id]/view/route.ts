import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/admin/announcements/active/[id]/view - Log view for admin user
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

    // Verify announcement exists
    const announcement = await prisma.client_announcements.findUnique({
      where: { id },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Upsert dismissal record to track views (using user_id for admin)
    const now = new Date()
    const existingDismissal = await prisma.announcement_dismissals.findFirst({
      where: {
        announcement_id: id,
        user_id: user.id,
        client_id: null,
      },
    })

    if (existingDismissal) {
      // Update view count
      await prisma.announcement_dismissals.update({
        where: { id: existingDismissal.id },
        data: {
          view_count: existingDismissal.view_count + 1,
        },
      })
    } else {
      // Create new dismissal record with first view
      await prisma.announcement_dismissals.create({
        data: {
          announcement_id: id,
          user_id: user.id,
          first_viewed_at: now,
          view_count: 1,
          is_permanent: false,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error logging admin announcement view:', error)
    return NextResponse.json(
      { error: 'Failed to log view' },
      { status: 500 }
    )
  }
}
