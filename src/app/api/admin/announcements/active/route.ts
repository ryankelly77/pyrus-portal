import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/announcements/active - Get active announcements for admin user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check role
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true },
    })

    const userRole = profile?.role
    if (!userRole || userRole === 'client') {
      return NextResponse.json({ announcements: [] })
    }

    const searchParams = request.nextUrl.searchParams
    const page = searchParams.get('page') || 'all'

    const now = new Date()

    // Get all active announcements that target admin or both
    const announcements = await prisma.client_announcements.findMany({
      where: {
        status: 'active',
        target_audience: { in: ['admin', 'both'] },
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

    // Get existing dismissals for this admin user
    const dismissals = await prisma.announcement_dismissals.findMany({
      where: {
        user_id: user.id,
        announcement_id: { in: announcements.map(a => a.id) },
      },
    })

    const dismissalMap = new Map(dismissals.map(d => [d.announcement_id, d]))

    // Filter announcements based on role targeting, page, and dismissal status
    const filteredAnnouncements = announcements.filter(announcement => {
      // Check admin role targeting
      const targetRoles = announcement.target_admin_roles as string[] | null
      if (targetRoles && targetRoles.length > 0) {
        if (!targetRoles.includes(userRole)) {
          return false
        }
      }

      // Check page filter - for admin pages, we need to match admin_ prefixed pages
      const displayPages = announcement.display_pages as string[]
      if (!displayPages.includes('all')) {
        // Check if any admin page matches
        const adminPage = `admin_${page}`
        if (!displayPages.includes(adminPage) && !displayPages.includes(page)) {
          return false
        }
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
    console.error('Error fetching admin announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}
