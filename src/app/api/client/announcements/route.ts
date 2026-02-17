import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/client/announcements - Get active announcements for client
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || 'all'
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
      return NextResponse.json({ announcements: [] })
    }

    const now = new Date()

    // Get all active announcements
    const announcements = await prisma.client_announcements.findMany({
      where: {
        status: 'active',
        OR: [
          { start_date: null },
          { start_date: { lte: now } },
        ],
        AND: [
          {
            OR: [
              { end_date: null },
              { end_date: { gte: now } },
            ],
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' },
      ],
    })

    // Get existing dismissals for this client
    const dismissals = await prisma.announcement_dismissals.findMany({
      where: {
        client_id: clientId,
        announcement_id: { in: announcements.map(a => a.id) },
      },
    })

    const dismissalMap = new Map(dismissals.map(d => [d.announcement_id, d]))

    // Filter announcements based on targeting, page, and dismissal status
    const filteredAnnouncements = announcements.filter(announcement => {
      // Check targeting
      if (!announcement.target_all_clients) {
        const targetIds = announcement.target_client_ids as string[]
        if (!targetIds.includes(clientId!)) {
          return false
        }
      }

      // Check page filter
      const displayPages = announcement.display_pages as string[]
      if (!displayPages.includes('all') && !displayPages.includes(page)) {
        return false
      }

      // Check dismissal status
      const dismissal = dismissalMap.get(announcement.id)
      if (dismissal) {
        // If permanently dismissed and dismissable
        if (dismissal.is_permanent && announcement.persistence_type === 'dismissable') {
          return false
        }

        // If show_for_duration has passed
        if (
          announcement.persistence_type === 'show_for_duration' &&
          announcement.show_duration_days &&
          dismissal.first_viewed_at
        ) {
          const expiryDate = new Date(dismissal.first_viewed_at)
          expiryDate.setDate(expiryDate.getDate() + announcement.show_duration_days)
          if (now > expiryDate) {
            return false
          }
        }
      }

      return true
    })

    // Return announcements with dismissal info
    const announcementsWithDismissalInfo = filteredAnnouncements.map(announcement => {
      const dismissal = dismissalMap.get(announcement.id)
      return {
        ...announcement,
        first_viewed_at: dismissal?.first_viewed_at || null,
        view_count: dismissal?.view_count || 0,
        is_dismissed: dismissal?.is_permanent || false,
      }
    })

    return NextResponse.json({ announcements: announcementsWithDismissalInfo })
  } catch (error: unknown) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}
