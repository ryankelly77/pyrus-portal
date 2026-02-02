import { prisma } from '@/lib/prisma'

export interface ActivityItem {
  id: string
  type: 'task' | 'update' | 'alert' | 'content'
  title: string
  description: string
  time: string
  iconStyle: { background: string; color: string }
  metadata: Record<string, unknown>
}

interface ActivityOptions {
  limit?: number
}

// Format time in Central Time with Today/Yesterday logic
function formatTime(dateInput: Date | string): string {
  const date = new Date(dateInput)
  const now = new Date()

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Chicago',
  }
  const dateOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Chicago',
  }

  // Compare dates in Central Time
  const centralNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const centralDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  const isToday = centralDate.toDateString() === centralNow.toDateString()
  const yesterday = new Date(centralNow)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday = centralDate.toDateString() === yesterday.toDateString()

  if (isToday) {
    return `Today, ${date.toLocaleTimeString('en-US', timeOptions)}`
  } else if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', timeOptions)}`
  } else {
    return (
      date.toLocaleDateString('en-US', dateOptions) +
      ', ' +
      date.toLocaleTimeString('en-US', timeOptions)
    )
  }
}

/**
 * Get activity data for a client
 * Includes Basecamp activities and client communications (website_status, result_alert)
 * Used by both client and admin routes for data parity
 */
export async function getClientActivity(
  clientId: string,
  options: ActivityOptions = {}
): Promise<ActivityItem[]> {
  const { limit = 100 } = options

  // Get client's basecamp_project_id
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: { basecamp_project_id: true },
  })

  const basecampProjectId = client?.basecamp_project_id

  // Fetch Basecamp activities
  const basecampActivities = await prisma.basecamp_activities.findMany({
    where: {
      OR: [
        { client_id: clientId },
        ...(basecampProjectId ? [{ project_id: basecampProjectId }] : []),
      ],
    },
    orderBy: [{ basecamp_created_at: 'desc' }, { created_at: 'desc' }],
    take: limit,
  })

  // Fetch communications (website status alerts only - result alerts shown separately)
  const communications = await prisma.client_communications.findMany({
    where: {
      client_id: clientId,
      comm_type: 'website_status',
    },
    orderBy: [{ sent_at: 'desc' }, { created_at: 'desc' }],
    take: 50,
  })

  // Map Basecamp activities to unified format
  const mappedBasecampActivities = basecampActivities.map((row) => {
    const isCompleted = row.kind === 'todo_completed'
    const type: 'task' | 'update' | 'alert' | 'content' = 'task'

    // Style based on completion status
    const iconStyle = isCompleted
      ? { background: 'var(--success-bg)', color: 'var(--success)' }
      : { background: 'var(--info-bg)', color: 'var(--info)' }

    const date = new Date(row.basecamp_created_at || row.created_at || new Date())

    // Generate title based on task status
    const title = isCompleted
      ? `Completed: ${row.recording_title}`
      : `New task: ${row.recording_title}`

    // Description shows the todolist name if available
    const description = row.parent_title ? `In: ${row.parent_title}` : ''

    return {
      id: row.id,
      type,
      title,
      description,
      time: formatTime(date),
      timestamp: date.getTime(),
      iconStyle,
      metadata: {
        kind: row.kind,
        status: row.recording_status,
        content: row.recording_content,
        taskId: row.task_id,
        todolist: row.parent_title,
      },
    }
  })

  // Map communications to unified format
  const mappedCommunications = communications.map((row) => {
    const isDown = row.highlight_type === 'failed'
    const type: 'task' | 'update' | 'alert' | 'content' = 'alert'

    // Style based on status
    const iconStyle = isDown
      ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
      : { background: 'var(--success-bg)', color: 'var(--success)' }

    const date = new Date(row.sent_at || row.created_at || new Date())

    return {
      id: row.id,
      type,
      title: row.title,
      description: row.body || '',
      time: formatTime(date),
      timestamp: date.getTime(),
      iconStyle,
      metadata: {
        commType: row.comm_type,
        highlightType: row.highlight_type,
        ...((row.metadata && typeof row.metadata === 'object') ? (row.metadata as Record<string, unknown>) : {}),
      },
    }
  })

  // Merge and sort by timestamp (most recent first)
  const allActivities = [...mappedBasecampActivities, ...mappedCommunications]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .map(({ timestamp, ...rest }) => rest as ActivityItem)

  return allActivities
}
