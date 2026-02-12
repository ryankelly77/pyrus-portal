import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    // Fetch recent activities from multiple sources
    const [
      activityLogs,
      communications,
      subscriptionHistory,
      recommendationHistory,
      purchaseActivities
    ] = await Promise.all([
      // Activity log entries
      prisma.activity_log.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, full_name: true, email: true } }
        }
      }),
      // Recent communications (emails, alerts, etc.)
      prisma.client_communications.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          client: { select: { id: true, name: true } }
        }
      }),
      // Subscription history (payments, upgrades, etc.)
      prisma.subscription_history.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          subscription: {
            include: {
              client: { select: { id: true, name: true, avatar_color: true } }
            }
          }
        }
      }),
      // Recommendation history
      prisma.recommendation_history.findMany({
        take: 20,
        orderBy: { created_at: 'desc' },
        include: {
          recommendation: {
            include: {
              client: { select: { id: true, name: true } }
            }
          }
        }
      }),
      // Placeholder - we'll fetch from Stripe instead
      Promise.resolve([])
    ])

    // Transform and combine activities (using notification page types)
    const activities: Array<{
      id: string
      type: string  // email, login, purchase, onboarding, registration, proposal_view, proposal_sent
      title: string
      description: string
      time: string
      createdAt: Date
    }> = []

    // Add activity log entries (exclude page_view)
    for (const log of activityLogs) {
      // Skip page views for the dashboard activity feed
      if (log.activity_type === 'page_view') continue

      const activityType = mapActivityType(log.activity_type)

      // Get the entity name from client, user, or metadata
      let entityName = log.client?.name
      if (!entityName && log.user?.full_name) {
        entityName = log.user.full_name
      }
      if (!entityName && log.user?.email) {
        entityName = log.user.email.split('@')[0] // Use email username as fallback
      }
      // Check metadata for client/user info
      const metadata = log.metadata as Record<string, any> | null
      if (!entityName && metadata?.clientName) {
        entityName = metadata.clientName
      }
      if (!entityName && metadata?.userName) {
        entityName = metadata.userName
      }
      if (!entityName && metadata?.email) {
        entityName = metadata.email.split('@')[0]
      }
      entityName = entityName || 'Unknown'

      // Build description: entity name + details
      let description = entityName
      if (log.description) {
        description = `${entityName}: ${log.description}`
      }

      activities.push({
        id: log.id,
        type: activityType.type,
        title: activityType.title,
        description,
        time: formatRelativeTime(log.created_at),
        createdAt: log.created_at || new Date()
      })
    }

    // Add communications (emails, result alerts, etc.)
    for (const comm of communications) {
      const commType = mapCommunicationType(comm.comm_type)
      activities.push({
        id: comm.id,
        type: commType.type,
        title: commType.title || comm.title,
        description: `${comm.client?.name || 'Unknown'}: ${comm.subject || comm.title}`,
        time: formatRelativeTime(comm.created_at),
        createdAt: comm.created_at || new Date()
      })
    }

    // Add subscription history (purchase type)
    for (const history of subscriptionHistory) {
      const subType = mapSubscriptionAction(history.action)
      activities.push({
        id: history.id,
        type: 'purchase',
        title: subType.title,
        description: `${history.subscription?.client?.name || 'Unknown'}: ${history.details || subType.description}`,
        time: formatRelativeTime(history.created_at),
        createdAt: history.created_at || new Date()
      })
    }

    // Add recommendation history (proposal type)
    for (const history of recommendationHistory) {
      const recType = mapRecommendationAction(history.action)
      const type = history.action === 'sent' ? 'proposal_sent' :
                   history.action === 'purchased' ? 'purchase' : 'proposal_sent'
      activities.push({
        id: history.id,
        type,
        title: recType.title,
        description: `${history.recommendation?.client?.name || 'Unknown'}: ${history.details || recType.description}`,
        time: formatRelativeTime(history.created_at),
        createdAt: history.created_at || new Date()
      })
    }

    // Sort all activities by time and take top 20
    activities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const recentActivity = activities.slice(0, 20)

    // Fetch recent transactions from Stripe
    const stripeInvoices = await stripe.invoices.list({
      status: 'paid',
      limit: 10,
      expand: ['data.customer'],
    })

    // Get all clients with Stripe customer IDs to look up avatar colors
    const clientsWithStripe = await prisma.clients.findMany({
      where: { stripe_customer_id: { not: null } },
      select: { stripe_customer_id: true, avatar_color: true, name: true },
    })
    const stripeCustomerToClient = new Map(
      clientsWithStripe.map(c => [c.stripe_customer_id, { color: c.avatar_color, name: c.name }])
    )

    // Fallback color generator for customers not in our database
    const getFallbackColor = (name: string) => {
      const colors = ['#059669', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#EA580C']
      let hash = 0
      for (let i = 0; i < name.length; i++) {
        hash = ((hash << 5) - hash) + name.charCodeAt(i)
        hash = hash & hash
      }
      return colors[Math.abs(hash) % colors.length]
    }

    const transactions = stripeInvoices.data
      .filter(inv => inv.amount_paid > 0) // Only show paid invoices with amount > 0
      .map(inv => {
        const customer = inv.customer as any
        const customerId = typeof inv.customer === 'string' ? inv.customer : customer?.id
        const clientData = customerId ? stripeCustomerToClient.get(customerId) : null
        const customerName = clientData?.name || customer?.name || customer?.email || 'Unknown'
        const color = clientData?.color || getFallbackColor(customerName)

        return {
          id: inv.id,
          client: customerName,
          initials: getInitials(customerName),
          color,
          amount: inv.amount_paid / 100,
          type: 'payment' as const,
          date: formatTransactionDate(new Date(inv.created * 1000))
        }
      })
      .slice(0, 8)

    // Calculate stats - Active Clients from database
    const activeClients = await prisma.clients.count({
      where: { status: 'active' }
    })

    // "In Production" includes these statuses on the Content page
    const pendingContent = await prisma.content.count({
      where: { status: { in: ['approved', 'internal_review', 'final_optimization', 'image_selection'] } }
    })

    const openRecommendations = await prisma.recommendations.count({
      where: {
        status: { in: ['draft', 'sent'] },
        purchased_tier: null,
        archived_at: null  // Exclude archived deals
      }
    })

    // Calculate MRR from active subscriptions
    const activeSubscriptions = await prisma.subscriptions.findMany({
      where: { status: 'active' },
      select: { monthly_amount: true }
    })

    const mrr = activeSubscriptions.reduce((sum, sub) =>
      sum + (Number(sub.monthly_amount) || 0), 0
    )

    return NextResponse.json({
      recentActivity,
      recentTransactions: transactions,
      stats: {
        mrr: Math.round(mrr),
        mrrChange: 0, // Would need historical data to calculate
        activeClients,
        pendingContent,
        pendingRecommendations: openRecommendations
      }
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}

// Helper functions - using notification page types
function mapActivityType(activityType: string): { type: string, title: string } {
  const typeMap: Record<string, { type: string, title: string }> = {
    // Login activities
    'login': { type: 'login', title: 'Client Login' },
    'client_login': { type: 'login', title: 'Client Login' },
    'admin_login': { type: 'login', title: 'Admin Login' },
    'super_admin_login': { type: 'login', title: 'Super Admin Login' },
    'prospect_login': { type: 'login', title: 'Prospect Login' },

    // Registration
    'registration': { type: 'registration', title: 'New Registration' },
    'client_created': { type: 'registration', title: 'New Client Added' },

    // Onboarding activities
    'client_onboarding': { type: 'onboarding', title: 'Client Onboarding' },
    'client_onboarding_completed': { type: 'onboarding', title: 'Onboarding Completed' },
    'onboarding_completed': { type: 'onboarding', title: 'Onboarding Completed' },

    // Purchase activities
    'purchase': { type: 'purchase', title: 'Purchase' },
    'payment_received': { type: 'purchase', title: 'Payment Received' },
    'subscription_created': { type: 'purchase', title: 'New Subscription' },
    'subscription_upgraded': { type: 'purchase', title: 'Subscription Upgraded' },
    'subscription_downgraded': { type: 'purchase', title: 'Subscription Downgraded' },

    // Proposal activities
    'recommendation_created': { type: 'proposal_sent', title: 'Recommendation Created' },
    'recommendation_sent': { type: 'proposal_sent', title: 'Recommendation Sent' },
    'recommendation_accepted': { type: 'purchase', title: 'Recommendation Accepted' },
    'recommendation_declined': { type: 'proposal_view', title: 'Recommendation Declined' },
  }
  return typeMap[activityType] || { type: 'login', title: activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
}

function mapCommunicationType(commType: string): { type: string, title: string } {
  const typeMap: Record<string, { type: string, title: string }> = {
    'email_invite': { type: 'email', title: 'Invitation Sent' },
    'email_reminder': { type: 'email', title: 'Reminder Sent' },
    'email_general': { type: 'email', title: 'Email Sent' },
    'result_alert': { type: 'email', title: 'Result Alert' },
    'monthly_report': { type: 'email', title: 'Monthly Report Sent' },
    'content_approval': { type: 'email', title: 'Content Approval Request' },
    'notification': { type: 'email', title: 'Notification' },
  }
  return typeMap[commType] || { type: 'email', title: 'Communication' }
}

function mapSubscriptionAction(action: string): { title: string, description: string } {
  const actionMap: Record<string, { title: string, description: string }> = {
    'created': { title: 'New Subscription', description: 'Started new subscription' },
    'service_added': { title: 'Service Added', description: 'Added service to subscription' },
    'service_removed': { title: 'Service Removed', description: 'Removed service from subscription' },
    'billing_updated': { title: 'Billing Updated', description: 'Updated billing information' },
    'status_changed': { title: 'Status Changed', description: 'Subscription status changed' },
  }
  return actionMap[action] || { title: 'Subscription Update', description: action }
}

function mapRecommendationAction(action: string): { title: string, description: string } {
  const actionMap: Record<string, { title: string, description: string }> = {
    'created': { title: 'Recommendation Created', description: 'New recommendation created' },
    'updated': { title: 'Recommendation Updated', description: 'Recommendation updated' },
    'sent': { title: 'Recommendation Sent', description: 'Recommendation sent to client' },
    'purchased': { title: 'Recommendation Accepted', description: 'Client accepted recommendation' },
    'item_added': { title: 'Item Added', description: 'Added item to recommendation' },
    'item_removed': { title: 'Item Removed', description: 'Removed item from recommendation' },
    'tier_changed': { title: 'Tier Changed', description: 'Changed pricing tier' },
  }
  return actionMap[action] || { title: 'Recommendation Update', description: action }
}

function mapTransactionType(action: string): 'payment' | 'upgrade' | 'downgrade' | 'refund' {
  const typeMap: Record<string, 'payment' | 'upgrade' | 'downgrade' | 'refund'> = {
    'created': 'payment',
    'service_added': 'upgrade',
    'service_removed': 'downgrade',
    'billing_updated': 'payment',
    'status_changed': 'payment',
  }
  return typeMap[action] || 'payment'
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return 'Unknown'

  const now = new Date()
  const diffMs = now.getTime() - new Date(date).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTransactionDate(date: Date | null | undefined): string {
  if (!date) return 'Unknown'

  const now = new Date()
  const dateObj = new Date(date)
  const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
