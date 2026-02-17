import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/announcements - List all announcements
export async function GET(request: NextRequest) {
  try {
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

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    const announcements = await prisma.client_announcements.findMany({
      where: status ? { status } : undefined,
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' },
      ],
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    })

    // Get view counts for each announcement
    const announcementsWithStats = await Promise.all(
      announcements.map(async (announcement) => {
        const viewStats = await prisma.announcement_dismissals.aggregate({
          where: { announcement_id: announcement.id },
          _sum: { view_count: true },
          _count: { id: true },
        })

        return {
          ...announcement,
          total_views: viewStats._sum.view_count || 0,
          unique_viewers: viewStats._count.id || 0,
          dismissal_count: announcement._count.dismissals,
        }
      })
    )

    return NextResponse.json({ announcements: announcementsWithStats })
  } catch (error: unknown) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

// POST /api/admin/announcements - Create a new announcement
export async function POST(request: NextRequest) {
  try {
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

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      message,
      announcement_type = 'general',
      display_pages = ['all'],
      display_frequency = 'once_per_session',
      persistence_type = 'dismissable',
      show_duration_days,
      allow_permanent_dismiss = true,
      target_all_clients = true,
      target_client_ids = [],
      start_date,
      end_date,
      has_detail_page = false,
      detail_html,
      cta_button_text,
      cta_button_url,
      status = 'draft',
      priority = 0,
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const announcement = await prisma.client_announcements.create({
      data: {
        title,
        message,
        announcement_type,
        display_pages,
        display_frequency,
        persistence_type,
        show_duration_days,
        allow_permanent_dismiss,
        target_all_clients,
        target_client_ids,
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        has_detail_page,
        detail_html,
        cta_button_text,
        cta_button_url,
        status,
        priority,
        created_by: user.id,
      },
    })

    return NextResponse.json({ announcement }, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { error: 'Failed to create announcement' },
      { status: 500 }
    )
  }
}
