import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get the current user's client
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const profileResult = await dbPool.query(
        `SELECT client_id FROM profiles WHERE id = $1`,
        [user.id]
      )

      const profileClientId = profileResult.rows[0]?.client_id
      if (!profileClientId) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileClientId
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Get client's basecamp_project_id
    const clientResult = await dbPool.query(
      `SELECT basecamp_project_id FROM clients WHERE id = $1`,
      [clientId]
    )
    const basecampProjectId = clientResult.rows[0]?.basecamp_project_id

    // Fetch Basecamp activities for this client
    const basecampResult = await dbPool.query(`
      SELECT
        id,
        kind,
        recording_title,
        recording_status,
        parent_title,
        recording_content,
        basecamp_created_at,
        created_at
      FROM basecamp_activities
      WHERE client_id = $1 OR project_id = $2
      ORDER BY COALESCE(basecamp_created_at, created_at) DESC
      LIMIT 100
    `, [clientId, basecampProjectId])

    // Fetch communications (website status alerts, etc.)
    const communicationsResult = await dbPool.query(`
      SELECT
        id,
        comm_type,
        title,
        body,
        highlight_type,
        metadata,
        sent_at,
        created_at
      FROM client_communications
      WHERE client_id = $1
        AND comm_type IN ('website_status', 'result_alert')
      ORDER BY COALESCE(sent_at, created_at) DESC
      LIMIT 50
    `, [clientId])

    // Helper to format time in Central Time
    const formatTime = (dateInput: Date | string) => {
      const date = new Date(dateInput)
      const now = new Date()

      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Chicago'
      }
      const dateOptions: Intl.DateTimeFormatOptions = {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/Chicago'
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
        return date.toLocaleDateString('en-US', dateOptions) +
          ', ' + date.toLocaleTimeString('en-US', timeOptions)
      }
    }

    // Map Basecamp activities to frontend format
    const basecampActivities = basecampResult.rows.map((row: any) => {
      const isCompleted = row.kind === 'todo_completed'
      const type: 'task' | 'update' | 'alert' | 'content' = 'task'

      // Style based on completion status
      const iconStyle = isCompleted
        ? { background: 'var(--success-bg)', color: 'var(--success)' }
        : { background: 'var(--info-bg)', color: 'var(--info)' }

      const date = new Date(row.basecamp_created_at || row.created_at)

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
        },
      }
    })

    // Map communications to frontend format
    const communicationActivities = communicationsResult.rows.map((row: any) => {
      const isDown = row.highlight_type === 'failed'
      const type: 'task' | 'update' | 'alert' | 'content' = 'alert'

      // Style based on status
      const iconStyle = isDown
        ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
        : { background: 'var(--success-bg)', color: 'var(--success)' }

      const date = new Date(row.sent_at || row.created_at)

      return {
        id: row.id,
        type,
        title: row.title,
        description: row.body,
        time: formatTime(date),
        timestamp: date.getTime(),
        iconStyle,
        metadata: {
          commType: row.comm_type,
          highlightType: row.highlight_type,
          ...((row.metadata && typeof row.metadata === 'object') ? row.metadata : {}),
        },
      }
    })

    // Merge and sort by timestamp (most recent first)
    const allActivities = [...basecampActivities, ...communicationActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100) // Limit to 100 items
      .map(({ timestamp, ...rest }) => rest) // Remove timestamp from response

    return NextResponse.json(allActivities)
  } catch (error) {
    console.error('Error fetching client activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
