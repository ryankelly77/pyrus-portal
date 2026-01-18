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
        excerpt,
        SUBSTRING(body, 1, 200) as preview,
        urgent,
        deadline,
        due_date,
        published_at,
        published_url,
        scheduled_date,
        created_at,
        updated_at
       FROM content
       WHERE client_id = $1
       ORDER BY
         CASE WHEN urgent = true THEN 0 ELSE 1 END,
         CASE
           WHEN status = 'pending_review' THEN 1
           WHEN status = 'approved' THEN 2
           WHEN status = 'published' THEN 3
           ELSE 4
         END,
         deadline ASC NULLS LAST,
         created_at DESC`,
      [clientId]
    )

    const allContent = contentResult.rows

    const now = new Date()

    // Categorize content
    const urgentReviews = allContent.filter(
      (c: { status: string; urgent: boolean }) =>
        c.status === 'pending_review' && c.urgent
    )

    const pendingApproval = allContent.filter(
      (c: { status: string; urgent: boolean }) =>
        c.status === 'pending_review' && !c.urgent
    )

    const approved = allContent.filter(
      (c: { status: string }) => c.status === 'approved'
    )

    const published = allContent.filter(
      (c: { status: string }) => c.status === 'published'
    )

    // Helper to format content items
    const formatContentItem = (item: {
      id: string
      title: string
      content_type: string | null
      platform: string | null
      excerpt: string | null
      preview: string | null
      deadline: string | null
      published_at: string | null
      published_url: string | null
      scheduled_date: string | null
      created_at: string | null
    }) => {
      const deadline = item.deadline ? new Date(item.deadline) : null
      const publishedAt = item.published_at ? new Date(item.published_at) : null
      const scheduledDate = item.scheduled_date ? new Date(item.scheduled_date) : null
      const createdAt = item.created_at ? new Date(item.created_at) : new Date()

      // Calculate time remaining for deadline
      let timeRemaining: string | null = null
      if (deadline) {
        const diffMs = deadline.getTime() - now.getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        if (diffMs < 0) {
          timeRemaining = 'Overdue'
        } else if (diffHours < 24) {
          timeRemaining = `${diffHours} hours`
        } else {
          timeRemaining = `${diffDays} days`
        }
      }

      // Calculate days ago for published content
      let daysAgo: string | null = null
      if (publishedAt) {
        const diffMs = now.getTime() - publishedAt.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays === 0) {
          daysAgo = 'Today'
        } else if (diffDays === 1) {
          daysAgo = '1 day ago'
        } else {
          daysAgo = `${diffDays} days ago`
        }
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
        platformLabel: platformLabels[item.platform || 'website'] || 'Website Content',
        title: item.title,
        type: item.content_type || 'Blog Post',
        preview: item.excerpt || item.preview || '',
        timeRemaining,
        daysAgo,
        date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        scheduledDate: scheduledDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        publishedDate: publishedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        publishedUrl: item.published_url,
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
