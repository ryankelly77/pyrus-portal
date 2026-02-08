import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>
}

// DELETE /api/admin/activity/[id] - Delete an activity item (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { id } = await params

    // Get the source from request body to know which table to delete from
    const body = await request.json().catch(() => ({}))
    const { source } = body as { source?: 'basecamp' | 'communication' | 'recommendation_history' }

    // Delete from the appropriate table based on source
    switch (source) {
      case 'communication':
        await prisma.client_communications.delete({
          where: { id },
        })
        break
      case 'recommendation_history':
        await prisma.smart_recommendation_history.delete({
          where: { id },
        })
        break
      case 'basecamp':
        await prisma.basecamp_activities.delete({
          where: { id },
        })
        break
      default:
        // Fallback: try each table in order
        try {
          await prisma.basecamp_activities.delete({
            where: { id },
          })
        } catch {
          try {
            await prisma.client_communications.delete({
              where: { id },
            })
          } catch {
            await prisma.smart_recommendation_history.delete({
              where: { id },
            })
          }
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
