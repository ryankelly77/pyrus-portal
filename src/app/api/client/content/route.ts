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

      // Get profile with client_id
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

    // Get all content for this client with full details
    const contentResult = await dbPool.query(
      `SELECT
        id,
        title,
        content_type,
        platform,
        status,
        preview_text,
        due_date,
        published_date,
        scheduled_date,
        created_at,
        updated_at
       FROM content
       WHERE client_id = $1
       ORDER BY
         CASE
           WHEN status = 'pending_approval' THEN 1
           WHEN status = 'approved' THEN 2
           WHEN status = 'published' THEN 3
           ELSE 4
         END,
         due_date ASC NULLS LAST,
         created_at DESC`,
      [clientId]
    )

    const allContent = contentResult.rows

    const now = new Date()
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    // Categorize content
    const urgentReviews = allContent.filter(
      (c: any) =>
        c.status === 'pending_approval' &&
        c.due_date &&
        new Date(c.due_date) <= twentyFourHoursFromNow
    )

    const pendingApproval = allContent.filter(
      (c: any) =>
        c.status === 'pending_approval' &&
        (!c.due_date || new Date(c.due_date) > twentyFourHoursFromNow)
    )

    const approved = allContent.filter(
      (c: any) => c.status === 'approved'
    )

    const published = allContent.filter(
      (c: any) => c.status === 'published'
    )

    // Helper to format content items
    const formatContentItem = (item: any) => {
      const dueDate = item.due_date ? new Date(item.due_date) : null
      const publishedDate = item.published_date ? new Date(item.published_date) : null
      const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date) : null
      const createdAt = new Date(item.created_at)

      // Calculate time remaining for due items
      let timeRemaining: string | null = null
      if (dueDate) {
        const diffMs = dueDate.getTime() - now.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffHours < 24) {
          timeRemaining = `${diffHours} hours`
        } else {
          timeRemaining = `${diffDays} days`
        }
      }

      // Calculate days ago for published content
      let daysAgo: string | null = null
      if (publishedDate) {
        const diffMs = now.getTime() - publishedDate.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        daysAgo = `${diffDays} days ago`
      }

      // Map platform to display label
      const platformLabels: Record<string, string> = {
        website: 'Website Content',
        gbp: 'Google Business Profile',
        social: 'Social Posts',
        'ai-creative': 'AI Creative',
      }

      return {
        id: item.id,
        platform: item.platform || 'website',
        platformLabel: platformLabels[item.platform] || 'Website Content',
        title: item.title,
        type: item.content_type || 'Blog Post',
        preview: item.preview_text || '',
        timeRemaining,
        daysAgo,
        date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        scheduledDate: scheduledDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        publishedDate: publishedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }
    }

    return NextResponse.json({
      stats: {
        urgentReviews: urgentReviews.length,
        pendingApproval: pendingApproval.length + urgentReviews.length, // Total pending
        approved: approved.length,
        published: published.length,
        total: allContent.length,
      },
      content: {
        urgentReviews: urgentReviews.map(formatContentItem),
        pendingApproval: pendingApproval.map(formatContentItem),
        approved: approved.map(formatContentItem),
        published: published.map(formatContentItem),
      },
    })
  } catch (error) {
    console.error('Error fetching content data:', error)
    return NextResponse.json({ error: 'Failed to fetch content data' }, { status: 500 })
  }
}
