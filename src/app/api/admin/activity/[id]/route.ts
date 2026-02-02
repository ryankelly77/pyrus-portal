import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/activity/[id] - Delete an activity item (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Get the type from request body to know which table to delete from
    const body = await request.json().catch(() => ({}))
    const { type } = body as { type?: 'communication' | 'basecamp' }

    // Try to delete from the appropriate table
    if (type === 'communication') {
      // Delete from client_communications
      await prisma.client_communications.delete({
        where: { id },
      })
    } else {
      // Default: try basecamp_activities first, then client_communications
      try {
        await prisma.basecamp_activities.delete({
          where: { id },
        })
      } catch {
        // If not found in basecamp_activities, try client_communications
        await prisma.client_communications.delete({
          where: { id },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    )
  }
}
