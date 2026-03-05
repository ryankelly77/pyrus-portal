import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/reports/[reportId]/publish - Publish a report
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId } = await params

    // Check if report exists
    const existing = await prisma.campaign_reports.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, published_at: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    // Update status to published and set publishedAt if not already set
    const report = await prisma.campaign_reports.update({
      where: { id: reportId },
      data: {
        status: 'published',
        published_at: existing.published_at || new Date(),
      },
      include: {
        sections: {
          orderBy: { sort_order: 'asc' },
        },
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to publish report:', error)
    return NextResponse.json(
      { error: 'Failed to publish report' },
      { status: 500 }
    )
  }
}
