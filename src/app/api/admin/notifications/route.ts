import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

interface NotificationItem {
  id: string
  type: string
  title: string
  description: string
  clientName: string
  clientId: string
  status?: string
  timestamp: string
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '100')
  const type = searchParams.get('type') // 'all', 'email', 'login', 'proposal', 'page_view', 'purchase', 'onboarding'

  const notifications: NotificationItem[] = []

  // Fetch from activity_log for logins, page views, onboarding, purchases
  if (!type || type === 'all' || type === 'login' || type === 'page_view' || type === 'onboarding' || type === 'purchase') {
    const activityTypes: string[] = []
    if (!type || type === 'all') {
      activityTypes.push('login', 'client_login', 'admin_login', 'page_view', 'registration',
        'client_created', 'client_onboarding', 'onboarding_completed', 'client_onboarding_completed',
        'accepted_invite', 'purchase', 'payment')
    } else if (type === 'login') {
      // Logins + signups/registrations (all account access events)
      activityTypes.push('login', 'client_login', 'admin_login', 'prospect_login',
        'registration', 'client_created', 'accepted_invite')
    } else if (type === 'page_view') {
      activityTypes.push('page_view')
    } else if (type === 'onboarding') {
      // Only actual onboarding milestones
      activityTypes.push('client_onboarding', 'onboarding_completed', 'client_onboarding_completed')
    } else if (type === 'purchase') {
      // Purchases and payment events from activity_log
      activityTypes.push('purchase', 'payment')
    }

    if (activityTypes.length > 0) {
      const activityLogs = await prisma.activity_log.findMany({
        where: {
          activity_type: { in: activityTypes }
        },
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          client: { select: { id: true, name: true } },
          user: { select: { id: true, full_name: true, email: true } }
        }
      })

      for (const log of activityLogs) {
        const activityType = mapActivityType(log.activity_type)
        const metadata = log.metadata as Record<string, any> | null

        // Get entity name from client, user, or metadata
        let entityName = log.client?.name
        if (!entityName && log.user?.full_name) entityName = log.user.full_name
        if (!entityName && log.user?.email) entityName = log.user.email.split('@')[0]
        if (!entityName && metadata?.clientName) entityName = metadata.clientName
        if (!entityName && metadata?.userName) entityName = metadata.userName
        if (!entityName && metadata?.email) entityName = metadata.email.split('@')[0]
        entityName = entityName || 'Unknown'

        // Use description as-is, don't prefix with client name (shown separately in UI)
        const description = log.description || activityType.title

        notifications.push({
          id: log.id,
          type: activityType.type,
          title: activityType.title,
          description,
          clientName: log.client?.name || entityName,
          clientId: log.client?.id || '',
          timestamp: log.created_at?.toISOString() || new Date().toISOString()
        })
      }
    }
  }

  // Fetch email communications (also fetch for 'proposal' filter to include proposal emails)
  if (!type || type === 'all' || type === 'email' || type === 'proposal') {
    const communications = await prisma.client_communications.findMany({
      where: {
        comm_type: { startsWith: 'email' }
      },
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        client: { select: { id: true, name: true, contact_name: true } }
      }
    })

    for (const email of communications) {
      let description = `Sent to ${email.recipient_email || email.client?.contact_name || 'client'}`
      if (email.status === 'opened' && email.opened_at) {
        description = `Opened by ${email.recipient_email || 'client'}`
      } else if (email.status === 'clicked' && email.clicked_at) {
        description = `Link clicked by ${email.recipient_email || 'client'}`
      } else if (email.status === 'delivered') {
        description = `Delivered to ${email.recipient_email || 'client'}`
      } else if (email.status === 'failed' || email.status === 'bounced') {
        description = `Failed to deliver to ${email.recipient_email || 'client'}`
      }

      // Check if this is a proposal-related email
      const title = email.title || email.subject || ''
      const isProposalEmail = title.toLowerCase().includes('proposal') ||
                              title.toLowerCase().includes('recommendation') ||
                              email.comm_type?.includes('proposal') ||
                              email.comm_type?.includes('recommendation')

      // If filtering by 'proposal', only include proposal emails
      // If filtering by 'email', include all emails (proposal emails show in both)
      if (type === 'proposal' && !isProposalEmail) {
        continue
      }

      notifications.push({
        id: email.id,
        type: isProposalEmail ? 'proposal_sent' : 'email',
        title: title || 'Email',
        description,
        clientName: email.client?.name || 'Unknown',
        clientId: email.client?.id || '',
        status: email.status || 'sent',
        timestamp: email.sent_at?.toISOString() || email.created_at?.toISOString() || new Date().toISOString()
      })
    }
  }

  // Fetch proposal/recommendation activity
  if (!type || type === 'all' || type === 'proposal') {
    const recommendationHistory = await prisma.recommendation_history.findMany({
      where: {
        action: { in: ['sent', 'created', 'purchased', 'viewed'] }
      },
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        recommendation: {
          include: {
            client: { select: { id: true, name: true } }
          }
        }
      }
    })

    for (const history of recommendationHistory) {
      const recType = mapRecommendationAction(history.action)
      const notifType = history.action === 'viewed' ? 'proposal_view' :
                        history.action === 'purchased' ? 'purchase' : 'proposal_sent'

      notifications.push({
        id: history.id,
        type: notifType,
        title: recType.title,
        description: `${history.recommendation?.client?.name || 'Unknown'}: ${history.details || recType.description}`,
        clientName: history.recommendation?.client?.name || 'Unknown',
        clientId: history.recommendation?.client?.id || '',
        timestamp: history.created_at?.toISOString() || new Date().toISOString()
      })
    }
  }

  // Fetch purchase/subscription activity
  if (!type || type === 'all' || type === 'purchase') {
    const subscriptionHistory = await prisma.subscription_history.findMany({
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        subscription: {
          include: {
            client: { select: { id: true, name: true } }
          }
        }
      }
    })

    for (const history of subscriptionHistory) {
      const subType = mapSubscriptionAction(history.action)

      notifications.push({
        id: history.id,
        type: 'purchase',
        title: subType.title,
        description: `${history.subscription?.client?.name || 'Unknown'}: ${history.details || subType.description}`,
        clientName: history.subscription?.client?.name || 'Unknown',
        clientId: history.subscription?.client?.id || '',
        timestamp: history.created_at?.toISOString() || new Date().toISOString()
      })
    }
  }

  // Sort all notifications by timestamp (most recent first)
  notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Calculate summary stats
  const summary = {
    totalEmails: notifications.filter(n => n.type === 'email').length,
    sentEmails: notifications.filter(n => n.type === 'email' && n.status === 'sent').length,
    deliveredEmails: notifications.filter(n => n.type === 'email' && n.status === 'delivered').length,
    openedEmails: notifications.filter(n => n.type === 'email' && n.status === 'opened').length,
    proposalsViewed: notifications.filter(n => n.type === 'proposal_view').length,
    proposalsSent: notifications.filter(n => n.type === 'proposal_sent').length,
    totalLogins: notifications.filter(n => n.type === 'login').length,
  }

  return NextResponse.json({
    notifications: notifications.slice(0, limit),
    summary
  })
}

// Helper functions
function mapActivityType(activityType: string): { type: string, title: string } {
  const typeMap: Record<string, { type: string, title: string }> = {
    'login': { type: 'login', title: 'Client Login' },
    'client_login': { type: 'login', title: 'Client Login' },
    'admin_login': { type: 'login', title: 'Admin Login' },
    'prospect_login': { type: 'login', title: 'Prospect Login' },
    'page_view': { type: 'page_view', title: 'Page View' },
    'registration': { type: 'registration', title: 'New Registration' },
    'client_created': { type: 'registration', title: 'New Client Added' },
    'accepted_invite': { type: 'registration', title: 'Invite Accepted' },
    'client_onboarding': { type: 'onboarding', title: 'Onboarding Started' },
    'onboarding_completed': { type: 'onboarding', title: 'Onboarding Completed' },
    'client_onboarding_completed': { type: 'onboarding', title: 'Onboarding Completed' },
    'purchase': { type: 'purchase', title: 'Purchase' },
    'payment': { type: 'purchase', title: 'Payment' },
  }
  return typeMap[activityType] || { type: 'login', title: activityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) }
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
    'viewed': { title: 'Proposal Viewed', description: 'Client viewed the proposal' },
    'purchased': { title: 'Recommendation Accepted', description: 'Client accepted recommendation' },
  }
  return actionMap[action] || { title: 'Recommendation Update', description: action }
}
