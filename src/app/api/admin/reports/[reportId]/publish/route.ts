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
            contact_email: true,
          },
        },
      },
    })

    // TODO: Trigger client notification on publish
    // Follow the pattern in /api/admin/clients/[id]/communications:
    // 1. Create in-app notification: "Your {title} is ready to view."
    // 2. If email notifications enabled, send via sendTemplatedEmail:
    //    Subject: "Your {title} is ready"
    //    Body: Link to /results with reportPreview query param
    // Example:
    // await prisma.client_communications.create({
    //   data: {
    //     client_id: report.client_id,
    //     comm_type: 'harvest_report',
    //     title: `Your ${report.title} is ready to view`,
    //     subject: `Your ${report.title} is ready`,
    //     body: `Your Harvest Report for ${report.period_label} has been published. Log in to view your campaign performance.`,
    //     status: 'sent',
    //     highlight_type: 'success',
    //     sent_at: new Date(),
    //   }
    // })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to publish report:', error)
    return NextResponse.json(
      { error: 'Failed to publish report' },
      { status: 500 }
    )
  }
}
