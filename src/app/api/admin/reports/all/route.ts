import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

type SortBy = 'publishedAt' | 'createdAt' | 'periodStart' | 'clientName'
type SortDir = 'asc' | 'desc'

// GET /api/admin/reports/all - List all reports across all clients
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search')
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as SortBy
    const sortDir = (searchParams.get('sortDir') || 'desc') as SortDir

    // Build where clause
    const where: {
      client_id?: string
      status?: string
      OR?: Array<{
        title?: { contains: string; mode: 'insensitive' }
        client?: { name: { contains: string; mode: 'insensitive' } }
      }>
    } = {}

    if (clientId) {
      where.client_id = clientId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Build orderBy clause
    let orderBy: Record<string, unknown>
    switch (sortBy) {
      case 'publishedAt':
        orderBy = { published_at: sortDir }
        break
      case 'periodStart':
        orderBy = { period_start: sortDir }
        break
      case 'clientName':
        orderBy = { client: { name: sortDir } }
        break
      case 'createdAt':
      default:
        orderBy = { created_at: sortDir }
        break
    }

    const reports = await prisma.campaign_reports.findMany({
      where,
      select: {
        id: true,
        title: true,
        period_label: true,
        period_start: true,
        period_end: true,
        campaign_month: true,
        status: true,
        published_at: true,
        created_at: true,
        service_types: true,
        manager_name: true,
        client: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
            avatar_color: true,
          },
        },
      },
      orderBy,
    })

    // Transform to camelCase response shape
    const response = reports.map(report => ({
      id: report.id,
      title: report.title,
      periodLabel: report.period_label,
      periodStart: report.period_start,
      periodEnd: report.period_end,
      campaignMonth: report.campaign_month,
      status: report.status,
      publishedAt: report.published_at,
      createdAt: report.created_at,
      serviceTypes: report.service_types || [],
      managerName: report.manager_name,
      client: report.client ? {
        id: report.client.id,
        name: report.client.name,
        avatarUrl: report.client.avatar_url,
        avatarColor: report.client.avatar_color,
        initials: report.client.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2),
      } : null,
    }))

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to list all reports:', error)
    return NextResponse.json(
      { error: 'Failed to list reports' },
      { status: 500 }
    )
  }
}
