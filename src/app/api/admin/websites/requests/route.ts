import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/websites/requests - Get all website edit requests
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // 'all', 'pending', 'in-progress', 'completed'

    const whereClause: any = {}
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter
    }

    const requests = await prisma.website_edit_requests.findMany({
      where: whereClause,
      orderBy: [
        { status: 'asc' }, // pending first, then in-progress, then completed
        { created_at: 'desc' },
      ],
      include: {
        client: {
          select: {
            id: true,
            name: true,
            website_url: true,
          },
        },
      },
    })

    // Format the response
    const formattedRequests = requests.map((req) => {
      let domain = ''
      try {
        if (req.client.website_url) {
          const url = new URL(req.client.website_url)
          domain = url.hostname.replace(/^www\./, '')
        }
      } catch {
        domain = req.client.website_url || ''
      }

      return {
        id: req.id,
        clientId: req.client_id,
        clientName: req.client.name,
        domain,
        title: req.title,
        description: req.description,
        requestType: req.request_type,
        status: req.status,
        priority: req.priority || 'normal',
        createdAt: req.created_at
          ? new Date(req.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : '',
        createdAtRaw: req.created_at,
        completedAt: req.completed_at
          ? new Date(req.completed_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : null,
      }
    })

    // Calculate stats
    const stats = {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      inProgress: requests.filter((r) => r.status === 'in-progress').length,
      completed: requests.filter((r) => r.status === 'completed').length,
    }

    return NextResponse.json({ requests: formattedRequests, stats })
  } catch (error) {
    console.error('Failed to fetch edit requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit requests' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/websites/requests - Update a request status
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { requestId, status, priority } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date() }

    if (status) {
      const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status

      // Set completed_at when marking as completed
      if (status === 'completed') {
        updateData.completed_at = new Date()
      } else {
        updateData.completed_at = null
      }
    }

    if (priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updateData.priority = priority
    }

    const updated = await prisma.website_edit_requests.update({
      where: { id: requestId },
      data: updateData,
    })

    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    console.error('Failed to update edit request:', error)
    return NextResponse.json(
      { error: 'Failed to update edit request' },
      { status: 500 }
    )
  }
}
