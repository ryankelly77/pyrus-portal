import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/bug-reports - List all bug reports (super_admin only)
export async function GET(request: Request) {
  try {
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build where clause
    const where: any = {}
    if (status && status !== 'all') {
      where.status = status
    }

    // Fetch bug reports with user info
    const [reports, total] = await Promise.all([
      prisma.bug_reports.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: offset,
        take: limit,
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
      }),
      prisma.bug_reports.count({ where })
    ])

    // Get status counts
    const statusCounts = await prisma.bug_reports.groupBy({
      by: ['status'],
      _count: { status: true }
    })

    const counts = {
      all: total,
      new: 0,
      reviewed: 0,
      in_progress: 0,
      resolved: 0,
      dismissed: 0,
    }

    statusCounts.forEach(({ status, _count }) => {
      counts[status as keyof typeof counts] = _count.status
    })

    return NextResponse.json({
      reports,
      total,
      statusCounts: counts,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Failed to fetch bug reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bug reports' },
      { status: 500 }
    )
  }
}
