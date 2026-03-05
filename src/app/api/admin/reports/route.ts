import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/reports?clientId=xxx - List all reports for a client
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json(
        { error: 'clientId query parameter is required' },
        { status: 400 }
      )
    }

    const reports = await prisma.campaign_reports.findMany({
      where: { client_id: clientId },
      select: {
        id: true,
        title: true,
        period_label: true,
        period_start: true,
        period_end: true,
        status: true,
        published_at: true,
        campaign_month: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Failed to list reports:', error)
    return NextResponse.json(
      { error: 'Failed to list reports' },
      { status: 500 }
    )
  }
}

// POST /api/admin/reports - Create a new report
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const {
      clientId,
      title,
      periodLabel,
      periodStart,
      periodEnd,
      campaignMonth,
      serviceTypes,
      managerName,
      managerNote,
      status = 'draft',
    } = body

    // Validate required fields
    if (!clientId || !title || !periodLabel || !periodStart || !periodEnd || campaignMonth === undefined || !serviceTypes) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, title, periodLabel, periodStart, periodEnd, campaignMonth, serviceTypes' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    const report = await prisma.campaign_reports.create({
      data: {
        client_id: clientId,
        title,
        period_label: periodLabel,
        period_start: new Date(periodStart),
        period_end: new Date(periodEnd),
        campaign_month: campaignMonth,
        service_types: serviceTypes,
        manager_name: managerName || null,
        manager_note: managerNote || null,
        status,
        published_at: status === 'published' ? new Date() : null,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Failed to create report:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
