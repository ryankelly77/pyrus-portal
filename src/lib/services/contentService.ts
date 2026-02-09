import { prisma } from '@/lib/prisma'

interface ContentDataOptions {
  includeAssignments?: boolean
  status?: string
}

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_id?: string | null
  changed_by_name?: string
  note?: string
}

interface FormattedContentItem {
  id: string
  platform: string
  platformLabel: string
  title: string
  type: string
  preview: string
  timeRemaining: string | null
  daysAgo: string | null
  date: string
  scheduledDate: string | null
  publishedDate: string | null
  publishedUrl: string | null
  author?: { id: string; full_name: string | null; email: string } | null
  assignee?: { id: string; full_name: string | null; email: string } | null
  // New workflow fields
  status: string
  approval_required: boolean
  review_round: number
  status_history: StatusHistoryEntry[]
  status_changed_at: string | null
  urgent: boolean
}

interface ContentDataResult {
  stats: {
    urgentReviews: number
    pendingApproval: number
    approved: number
    published: number
    total: number
    // New workflow stats
    needsReview: number
    inProduction: number
    postedThisMonth: number
  }
  content: {
    urgentReviews: FormattedContentItem[]
    pendingApproval: FormattedContentItem[]
    approved: FormattedContentItem[]
    published: FormattedContentItem[]
  }
  // Flat list of all content for filtering
  allContent: FormattedContentItem[]
}

// Platform label mapping
const platformLabels: Record<string, string> = {
  website: 'Website Content',
  gbp: 'Google Business Profile',
  social: 'Social Posts',
  'ai-creative': 'AI Creative',
}

// Format a content item for display
function formatContentItem(
  item: {
    id: string
    title: string
    content_type: string | null
    platform: string | null
    status: string
    excerpt: string | null
    body: string | null
    urgent: boolean | null
    deadline: Date | null
    published_at: Date | null
    published_url: string | null
    scheduled_date: Date | null
    created_at: Date | null
    updated_at: Date | null
    author?: { id: string; full_name: string | null; email: string } | null
    assignee?: { id: string; full_name: string | null; email: string } | null
    // New workflow fields
    approval_required?: boolean | null
    review_round?: number | null
    status_history?: any
    status_changed_at?: Date | null
  },
  now: Date,
  includeAssignments: boolean
): FormattedContentItem {
  const deadline = item.deadline
  const publishedAt = item.published_at
  const scheduledDate = item.scheduled_date
  const createdAt = item.created_at || new Date()
  const statusChangedAt = item.status_changed_at

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

  // Get preview from excerpt or body
  const preview = item.excerpt || (item.body ? item.body.substring(0, 200) : '')

  // Parse status_history if it's a string
  let statusHistory: StatusHistoryEntry[] = []
  if (item.status_history) {
    try {
      statusHistory = typeof item.status_history === 'string'
        ? JSON.parse(item.status_history)
        : item.status_history
    } catch {
      statusHistory = []
    }
  }

  const result: FormattedContentItem = {
    id: item.id,
    platform: item.platform || 'website',
    platformLabel: platformLabels[item.platform || 'website'] || 'Website Content',
    title: item.title,
    type: item.content_type || 'Blog Post',
    preview,
    timeRemaining,
    daysAgo,
    date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    scheduledDate: scheduledDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || null,
    publishedDate: publishedAt?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || null,
    publishedUrl: item.published_url,
    // New workflow fields
    status: item.status,
    approval_required: item.approval_required ?? true,
    review_round: item.review_round ?? 0,
    status_history: statusHistory,
    status_changed_at: statusChangedAt?.toISOString() || item.updated_at?.toISOString() || null,
    urgent: item.urgent ?? false,
  }

  // Include author/assignee if requested (for admin view)
  if (includeAssignments) {
    result.author = item.author || null
    result.assignee = item.assignee || null
  }

  return result
}

/**
 * Get content data for a client with stats and categorized content
 * Used by both client and admin routes for data parity
 */
export async function getContentData(
  clientId: string,
  options: ContentDataOptions = {}
): Promise<ContentDataResult> {
  const { includeAssignments = false, status } = options

  // Build where clause
  const where: { client_id: string; status?: string } = { client_id: clientId }
  if (status) {
    where.status = status
  }

  // Fetch all content for this client
  const allContent = await prisma.content.findMany({
    where,
    select: {
      id: true,
      title: true,
      content_type: true,
      platform: true,
      status: true,
      excerpt: true,
      body: true,
      urgent: true,
      deadline: true,
      due_date: true,
      published_at: true,
      published_url: true,
      scheduled_date: true,
      created_at: true,
      updated_at: true,
      // New workflow fields
      approval_required: true,
      review_round: true,
      status_history: true,
      status_changed_at: true,
      ...(includeAssignments && {
        author: {
          select: { id: true, full_name: true, email: true },
        },
        assignee: {
          select: { id: true, full_name: true, email: true },
        },
      }),
    },
    orderBy: [
      { urgent: 'desc' },
      { deadline: 'asc' },
      { created_at: 'desc' },
    ],
  })

  const now = new Date()

  // Helper to check if content needs review (new workflow statuses)
  const needsReviewStatuses = ['sent_for_review', 'client_reviewing']
  const inProductionStatuses = ['approved', 'internal_review', 'final_optimization', 'image_selection']
  const completedStatuses = ['posted', 'published'] // Include legacy 'published'

  // Categorize content using both old and new status values for backwards compatibility
  const urgentReviews = allContent.filter(
    (c) => (c.status === 'pending_review' || (c.status && needsReviewStatuses.includes(c.status))) && c.urgent
  )

  const pendingApproval = allContent.filter(
    (c) => (c.status === 'pending_review' || (c.status && needsReviewStatuses.includes(c.status))) && !c.urgent
  )

  const approved = allContent.filter(
    (c) => c.status === 'approved' || (c.status && inProductionStatuses.includes(c.status))
  )

  const published = allContent.filter(
    (c) => c.status && completedStatuses.includes(c.status)
  )

  // Calculate new workflow stats
  const needsReview = allContent.filter(
    (c) => (c.status && needsReviewStatuses.includes(c.status)) || c.status === 'pending_review'
  ).length

  const inProduction = allContent.filter(
    (c) => c.status && inProductionStatuses.includes(c.status)
  ).length

  // Posted this month
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const postedThisMonth = allContent.filter((c) => {
    if (!c.status || !completedStatuses.includes(c.status)) return false
    const changedAt = c.status_changed_at || c.updated_at
    if (!changedAt) return false
    const changedDate = new Date(changedAt)
    return changedDate.getMonth() === currentMonth && changedDate.getFullYear() === currentYear
  }).length

  // Format all content for the flat list
  const formattedAllContent = allContent.map((item) =>
    formatContentItem(item as any, now, includeAssignments)
  )

  return {
    stats: {
      urgentReviews: urgentReviews.length,
      pendingApproval: pendingApproval.length + urgentReviews.length, // Total pending
      approved: approved.length,
      published: published.length,
      total: allContent.length,
      // New workflow stats
      needsReview,
      inProduction,
      postedThisMonth,
    },
    content: {
      urgentReviews: urgentReviews.map((item) =>
        formatContentItem(item as any, now, includeAssignments)
      ),
      pendingApproval: pendingApproval.map((item) =>
        formatContentItem(item as any, now, includeAssignments)
      ),
      approved: approved.map((item) =>
        formatContentItem(item as any, now, includeAssignments)
      ),
      published: published.map((item) =>
        formatContentItem(item as any, now, includeAssignments)
      ),
    },
    // Flat list for filtering
    allContent: formattedAllContent,
  }
}
