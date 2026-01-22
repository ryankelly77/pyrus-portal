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
    const result = await dbPool.query(`
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

    // Map Basecamp activities to frontend format
    const activities = result.rows.map((row: any) => {
      const isCompleted = row.kind === 'todo_completed'
      const type: 'task' | 'update' | 'alert' | 'content' = 'task'

      // Style based on completion status
      const iconStyle = isCompleted
        ? { background: 'var(--success-bg)', color: 'var(--success)' }
        : { background: 'var(--info-bg)', color: 'var(--info)' }

      // Format the date
      const date = new Date(row.basecamp_created_at || row.created_at)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const isYesterday = date.toDateString() === yesterday.toDateString()

      let timeStr: string
      if (isToday) {
        timeStr = `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      } else if (isYesterday) {
        timeStr = `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
      } else {
        timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
          ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      }

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
        time: timeStr,
        iconStyle,
        metadata: {
          kind: row.kind,
          status: row.recording_status,
          content: row.recording_content,
        },
      }
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching client activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
