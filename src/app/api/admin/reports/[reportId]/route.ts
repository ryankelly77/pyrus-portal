import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports/[reportId] - Fetch one report with all sections
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId } = await params

    const report = await prisma.campaign_reports.findUnique({
      where: { id: reportId },
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

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to fetch report:', error)
    return NextResponse.json(
      { error: 'Failed to fetch report' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/reports/[reportId] - Update report fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { reportId } = await params
    const body = await request.json()

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

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.periodLabel !== undefined) updateData.period_label = body.periodLabel
    if (body.periodStart !== undefined) updateData.period_start = new Date(body.periodStart)
    if (body.periodEnd !== undefined) updateData.period_end = new Date(body.periodEnd)
    if (body.campaignMonth !== undefined) updateData.campaign_month = body.campaignMonth
    if (body.serviceTypes !== undefined) updateData.service_types = body.serviceTypes
    if (body.managerName !== undefined) updateData.manager_name = body.managerName
    if (body.managerNote !== undefined) updateData.manager_note = body.managerNote

    // Handle status change
    if (body.status !== undefined) {
      updateData.status = body.status
      // If changing to published and not already published, set publishedAt
      if (body.status === 'published' && !existing.published_at) {
        updateData.published_at = new Date()
      }
    }

    const report = await prisma.campaign_reports.update({
      where: { id: reportId },
      data: updateData,
      include: {
        sections: {
          orderBy: { sort_order: 'asc' },
        },
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Failed to update report:', error)
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/reports/[reportId] - Hard delete report (sections cascade)
export async function DELETE(
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
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    await prisma.campaign_reports.delete({
      where: { id: reportId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete report:', error)
    return NextResponse.json(
      { error: 'Failed to delete report' },
      { status: 500 }
    )
  }
}
