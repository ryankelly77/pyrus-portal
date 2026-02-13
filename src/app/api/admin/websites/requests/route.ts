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

// POST /api/admin/websites/requests - Create a new request (admin)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const body = await request.json()
    const { clientId, title, description, requestType, priority } = body

    // Validate required fields
    if (!clientId || !title || !requestType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Validate request type
    const validTypes = ['content_update', 'bug_fix', 'new_feature', 'design_change']
    if (!validTypes.includes(requestType)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
    }

    // Get client name for activity log
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { name: true },
    })
    const clientName = client?.name || 'Unknown Client'

    // Create the edit request
    const newRequest = await prisma.website_edit_requests.create({
      data: {
        client_id: clientId,
        title: title.substring(0, 255),
        description: description || null,
        request_type: requestType,
        priority: priority || 'normal',
        status: 'pending',
        created_by: auth.user.id,
      },
    })

    // Create activity log entry for notifications
    const requestTypeLabel = requestType === 'content_update' ? 'Content Update' :
      requestType === 'bug_fix' ? 'Bug Fix' :
      requestType === 'new_feature' ? 'New Feature' :
      requestType === 'design_change' ? 'Design Change' : requestType

    await prisma.activity_log.create({
      data: {
        client_id: clientId,
        user_id: auth.user.id,
        activity_type: 'website_edit_request',
        description: `New website edit request: ${title.substring(0, 100)}`,
        metadata: {
          requestId: newRequest.id,
          requestType: requestType,
          requestTypeLabel: requestTypeLabel,
          title: title.substring(0, 255),
          clientName: clientName,
          submittedBy: auth.profile.full_name || auth.user.email,
          source: 'admin',
        },
      },
    })

    return NextResponse.json({ success: true, request: newRequest })
  } catch (error) {
    console.error('Failed to create edit request:', error)
    return NextResponse.json(
      { error: 'Failed to create edit request' },
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

    // Fetch the existing request to get client_id and title for activity log
    const existingRequest = await prisma.website_edit_requests.findUnique({
      where: { id: requestId },
      select: { client_id: true, title: true, status: true },
    })

    if (!existingRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
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

    // Create activity log entry for status changes (shows in client activity feed)
    if (status && status !== existingRequest.status) {
      let description = ''
      let activityType = 'website_edit_request_update'

      if (status === 'in-progress') {
        description = `Website edit request started: ${existingRequest.title}`
        activityType = 'website_edit_request_started'
      } else if (status === 'completed') {
        description = `Website edit request completed: ${existingRequest.title}`
        activityType = 'website_edit_request_completed'
      } else if (status === 'cancelled') {
        description = `Website edit request cancelled: ${existingRequest.title}`
        activityType = 'website_edit_request_cancelled'
      }

      if (description) {
        await prisma.activity_log.create({
          data: {
            client_id: existingRequest.client_id,
            user_id: auth.user.id,
            activity_type: activityType,
            description,
            metadata: {
              requestId,
              requestTitle: existingRequest.title,
              previousStatus: existingRequest.status,
              newStatus: status,
              updatedBy: auth.profile.full_name || auth.user.email,
            },
          },
        })
      }
    }

    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    console.error('Failed to update edit request:', error)
    return NextResponse.json(
      { error: 'Failed to update edit request' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/websites/requests - Edit a request (super admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Check for super admin role
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { requestId, title, description, requestType, priority, status } = body

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date() }

    if (title !== undefined) {
      updateData.title = title.substring(0, 255)
    }

    if (description !== undefined) {
      updateData.description = description
    }

    if (requestType !== undefined) {
      const validTypes = ['content_update', 'bug_fix', 'new_feature', 'design_change']
      if (!validTypes.includes(requestType)) {
        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
      }
      updateData.request_type = requestType
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updateData.priority = priority
    }

    if (status !== undefined) {
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

    const updated = await prisma.website_edit_requests.update({
      where: { id: requestId },
      data: updateData,
    })

    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    console.error('Failed to edit request:', error)
    return NextResponse.json(
      { error: 'Failed to edit request' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/websites/requests - Delete a request (super admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Check for super admin role
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    await prisma.website_edit_requests.delete({
      where: { id: requestId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete request:', error)
    return NextResponse.json(
      { error: 'Failed to delete request' },
      { status: 500 }
    )
  }
}
