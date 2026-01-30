import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface BasecampWebhookPayload {
  id: string
  kind: string
  created_at: string
  recording: {
    id: number
    status: string
    title: string
    type: string
    position?: number
    content?: string
    bucket: {
      id: number
      name: string
    }
    parent?: {
      id: number
      title: string
      type: string
    }
  }
}

// POST /api/webhooks/basecamp - Single webhook for all Basecamp projects
export async function POST(request: NextRequest) {
  try {
    const payload: BasecampWebhookPayload = await request.json()

    // Log all incoming webhooks for debugging
    console.log('Basecamp webhook received:', {
      kind: payload.kind,
      recording_title: payload.recording?.title,
      recording_type: payload.recording?.type,
      bucket_id: payload.recording?.bucket?.id,
      bucket_name: payload.recording?.bucket?.name,
    })

    // Only process todo_created and todo_completed events
    if (!['todo_created', 'todo_completed'].includes(payload.kind)) {
      console.log('Skipping event type:', payload.kind)
      return NextResponse.json({
        success: true,
        msg: `Skipped event type: ${payload.kind}`,
      })
    }

    const taskId = payload.recording?.id?.toString()
    const projectId = payload.recording?.bucket?.id?.toString()

    if (!taskId) {
      return NextResponse.json(
        { success: false, msg: 'Missing task ID in payload' },
        { status: 400 }
      )
    }

    // Find the client by basecamp_project_id
    const client = projectId
      ? await prisma.clients.findFirst({
          where: { basecamp_project_id: projectId },
        })
      : null

    // Check if this task already exists
    const existingTask = await prisma.basecamp_activities.findFirst({
      where: {
        task_id: taskId,
        kind: { not: 'todo_completed' },
      },
    })

    if (existingTask) {
      // Update existing task
      await prisma.basecamp_activities.update({
        where: { id: existingTask.id },
        data: {
          kind: payload.kind,
          recording_status: payload.kind === 'todo_completed' ? 'completed' : payload.recording.status,
          basecamp_created_at: payload.created_at ? new Date(payload.created_at) : null,
          updated_at: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        msg: 'Task updated successfully',
        client: client?.name || 'unlinked',
      })
    } else {
      // Insert new task
      await prisma.basecamp_activities.create({
        data: {
          client_id: client?.id || null,
          kind: payload.kind,
          basecamp_request_id: String(payload.id),
          task_id: taskId,
          project_id: projectId || null,
          project_title: payload.recording.bucket?.name || null,
          recording_status: payload.recording.status || null,
          recording_title: payload.recording.title || null,
          recording_type: payload.recording.type || null,
          recording_position: payload.recording.position ?? 0,
          parent_id: payload.recording.parent?.id?.toString() || null,
          parent_title: payload.recording.parent?.title || null,
          parent_type: payload.recording.parent?.type || null,
          recording_content: payload.recording.content || null,
          basecamp_created_at: payload.created_at ? new Date(payload.created_at) : null,
        },
      })

      return NextResponse.json({
        success: true,
        msg: 'Task created successfully',
        client: client?.name || 'unlinked',
      })
    }
  } catch (error) {
    console.error('Basecamp webhook error:', error)
    return NextResponse.json(
      {
        success: false,
        msg: 'Error processing webhook',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// GET - for webhook verification
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    webhook: 'basecamp',
    description: 'Account-level webhook for all Basecamp projects',
  })
}
