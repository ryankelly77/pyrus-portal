import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/announcements/[id] - Get single announcement with stats
export async function GET(
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

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const announcement = await prisma.client_announcements.findUnique({
      where: { id },
      include: {
        dismissals: {
          include: {
            // We can't join clients here since it's not a relation in schema
            // Just get the dismissal data
          },
        },
      },
    })

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Get client names for dismissals
    const clientIds = announcement.dismissals.map(d => d.client_id)
    const clients = clientIds.length > 0
      ? await prisma.clients.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true },
        })
      : []

    const clientMap = new Map(clients.map(c => [c.id, c.name]))

    // Calculate stats
    const viewStats = await prisma.announcement_dismissals.aggregate({
      where: { announcement_id: id },
      _sum: { view_count: true },
      _count: { id: true },
    })

    const permanentDismissals = announcement.dismissals.filter(d => d.is_permanent).length

    return NextResponse.json({
      announcement: {
        ...announcement,
        dismissals: announcement.dismissals.map(d => ({
          ...d,
          client_name: clientMap.get(d.client_id) || 'Unknown',
        })),
      },
      stats: {
        total_views: viewStats._sum.view_count || 0,
        unique_viewers: viewStats._count.id || 0,
        permanent_dismissals: permanentDismissals,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching announcement:', error)
    return NextResponse.json(
      { error: 'Failed to fetch announcement' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/announcements/[id] - Update announcement
export async function PATCH(
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

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
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
      start_date,
      end_date,
      has_detail_page,
      detail_html,
      cta_button_text,
      cta_button_url,
      status,
      priority,
    } = body

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = { updated_at: new Date() }

    if (title !== undefined) updateData.title = title
    if (message !== undefined) updateData.message = message
    if (announcement_type !== undefined) updateData.announcement_type = announcement_type
    if (display_pages !== undefined) updateData.display_pages = display_pages
    if (display_frequency !== undefined) updateData.display_frequency = display_frequency
    if (persistence_type !== undefined) updateData.persistence_type = persistence_type
    if (show_duration_days !== undefined) updateData.show_duration_days = show_duration_days
    if (allow_permanent_dismiss !== undefined) updateData.allow_permanent_dismiss = allow_permanent_dismiss
    if (target_all_clients !== undefined) updateData.target_all_clients = target_all_clients
    if (target_client_ids !== undefined) updateData.target_client_ids = target_client_ids
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null
    if (has_detail_page !== undefined) updateData.has_detail_page = has_detail_page
    if (detail_html !== undefined) updateData.detail_html = detail_html
    if (cta_button_text !== undefined) updateData.cta_button_text = cta_button_text
    if (cta_button_url !== undefined) updateData.cta_button_url = cta_button_url
    if (status !== undefined) updateData.status = status
    if (priority !== undefined) updateData.priority = priority

    const announcement = await prisma.client_announcements.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ announcement })
  } catch (error: unknown) {
    console.error('Error updating announcement:', error)
    return NextResponse.json(
      { error: 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/announcements/[id] - Archive or delete announcement
export async function DELETE(
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

    if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Permanently delete
      await prisma.client_announcements.delete({
        where: { id },
      })
      return NextResponse.json({ message: 'Announcement deleted permanently' })
    } else {
      // Archive (soft delete)
      await prisma.client_announcements.update({
        where: { id },
        data: { status: 'archived', updated_at: new Date() },
      })
      return NextResponse.json({ message: 'Announcement archived' })
    }
  } catch (error: unknown) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { error: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}
