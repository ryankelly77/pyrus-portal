import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/bug-reports/[id] - Get a single bug report
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super_admin
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const report = await prisma.bug_reports.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
            role: true,
          }
        },
        client: {
          select: {
            id: true,
            name: true,
          }
        },
        resolver: {
          select: {
            id: true,
            full_name: true,
          }
        }
      }
    })

    if (!report) {
      return NextResponse.json({ error: 'Bug report not found' }, { status: 404 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to fetch bug report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bug report' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/bug-reports/[id] - Update bug report status/notes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super_admin
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { id: true, role: true }
    })

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, adminNotes } = body

    // Validate status if provided
    const validStatuses = ['new', 'reviewed', 'in_progress', 'resolved', 'dismissed']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build update data
    const updateData: any = {}

    if (status !== undefined) {
      updateData.status = status

      // Set resolved_at and resolved_by when resolving or dismissing
      if (status === 'resolved' || status === 'dismissed') {
        updateData.resolved_at = new Date()
        updateData.resolved_by = profile.id
      } else if (status === 'new' || status === 'reviewed' || status === 'in_progress') {
        // Clear resolution info if reopening
        updateData.resolved_at = null
        updateData.resolved_by = null
      }
    }

    if (adminNotes !== undefined) {
      updateData.admin_notes = adminNotes
    }

    const updatedReport = await prisma.bug_reports.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          }
        },
        resolver: {
          select: {
            id: true,
            full_name: true,
          }
        }
      }
    })

    return NextResponse.json(updatedReport)
  } catch (error) {
    console.error('Failed to update bug report:', error)
    return NextResponse.json(
      { error: 'Failed to update bug report' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/bug-reports/[id] - Delete a bug report
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is super_admin
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: { role: true }
    })

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.bug_reports.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete bug report:', error)
    return NextResponse.json(
      { error: 'Failed to delete bug report' },
      { status: 500 }
    )
  }
}
