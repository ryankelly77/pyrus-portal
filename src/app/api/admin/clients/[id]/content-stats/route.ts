import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/clients/[id]/content-stats - Get content stats for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params

    // Get all content for this client
    const allContent = await prisma.content.findMany({
      where: { client_id: clientId },
      select: {
        id: true,
        status: true,
        due_date: true,
      },
    })

    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Calculate stats
    const urgentReviews = allContent.filter(
      (c) =>
        c.status === 'pending_approval' &&
        c.due_date &&
        new Date(c.due_date) <= twentyFourHoursFromNow
    ).length

    const pendingApproval = allContent.filter(
      (c) => c.status === 'pending_approval'
    ).length

    const approved = allContent.filter(
      (c) => c.status === 'approved'
    ).length

    const published = allContent.filter(
      (c) => c.status === 'published'
    ).length

    return NextResponse.json({
      urgentReviews,
      pendingApproval,
      approved,
      published,
      total: allContent.length,
    })
  } catch (error) {
    console.error('Failed to fetch content stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch content stats' },
      { status: 500 }
    )
  }
}
