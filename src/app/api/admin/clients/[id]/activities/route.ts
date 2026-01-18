import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

// GET /api/admin/clients/[id]/activities - Get basecamp activities for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin()
    if ((auth as any)?.user === undefined) return auth as any
    const { id } = await params

    // Get client to find their basecamp_project_id
    const client = await prisma.clients.findUnique({
      where: { id },
      select: { basecamp_project_id: true },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // If no basecamp project linked, return empty
    if (!client.basecamp_project_id) {
      return NextResponse.json([])
    }

    // Fetch activities - either by client_id or by project_id
    const activities = await prisma.basecamp_activities.findMany({
      where: {
        OR: [
          { client_id: id },
          { project_id: client.basecamp_project_id },
        ],
      },
      orderBy: [
        { basecamp_created_at: 'desc' },
        { created_at: 'desc' },
      ],
      take: 100,
    })

    // Transform to a cleaner format
    const transformed = activities.map((activity) => ({
      id: activity.id,
      taskId: activity.task_id,
      kind: activity.kind,
      title: activity.recording_title,
      status: activity.kind === 'todo_completed' ? 'completed' : 'active',
      todolist: activity.parent_title,
      content: activity.recording_content,
      position: activity.recording_position,
      createdAt: activity.basecamp_created_at || activity.created_at,
    }))

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}
