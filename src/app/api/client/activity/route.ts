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

    // Fetch activity log entries for this client
    const result = await dbPool.query(`
      SELECT
        id,
        activity_type,
        description,
        metadata,
        created_at
      FROM activity_log
      WHERE client_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [clientId])

    // Map database records to frontend format
    const activities = result.rows.map((row: any) => {
      const activityType = row.activity_type
      let type: 'task' | 'update' | 'alert' | 'content' = 'task'
      let iconStyle: { background: string; color: string } | undefined

      // Map activity_type to display type
      switch (activityType) {
        case 'onboarding_completed':
        case 'purchase':
        case 'checklist_completed':
          type = 'task'
          iconStyle = { background: 'var(--success-bg)', color: 'var(--success)' }
          break
        case 'content_published':
        case 'content_approved':
          type = 'content'
          iconStyle = { background: 'var(--success-bg)', color: 'var(--success)' }
          break
        case 'content_review':
        case 'content_submitted':
          type = 'content'
          iconStyle = { background: 'var(--info-bg)', color: 'var(--info)' }
          break
        case 'content_revision':
          type = 'content'
          iconStyle = { background: 'var(--warning-bg)', color: 'var(--warning)' }
          break
        case 'keyword_ranking':
        case 'traffic_milestone':
        case 'lead_generated':
          type = 'alert'
          break
        case 'campaign_update':
        case 'settings_change':
          type = 'update'
          break
        default:
          type = 'task'
      }

      // Format the date
      const date = new Date(row.created_at)
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

      // Generate title based on activity type
      let title = row.description || activityType.replace(/_/g, ' ')

      // Use more user-friendly titles
      switch (activityType) {
        case 'onboarding_completed':
          title = 'Onboarding completed!'
          break
        case 'purchase':
          title = 'Plan purchased'
          break
      }

      return {
        id: row.id,
        type,
        title,
        description: row.description || '',
        time: timeStr,
        iconStyle,
        metadata: row.metadata,
      }
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching client activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
