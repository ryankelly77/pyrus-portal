import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// POST /api/client/announcements/[id]/view - Log view and increment count
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

    // Verify announcement exists
    const announcement = await prisma.client_announcements.findUnique({
      where: { id },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Upsert dismissal record to track views
    const now = new Date()
    const existingDismissal = await prisma.announcement_dismissals.findUnique({
      where: {
        announcement_id_client_id: {
          announcement_id: id,
          client_id: clientId,
        },
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
          client_id: clientId,
          user_id: user.id,
          first_viewed_at: now,
          view_count: 1,
          is_permanent: false,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Error logging announcement view:', error)
    return NextResponse.json(
      { error: 'Failed to log view' },
      { status: 500 }
    )
  }
}
