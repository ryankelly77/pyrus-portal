import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface NotificationItem {
  id: string
  type: string
  title: string
  description: string
  clientName: string
  clientId: string
  status?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // 'all', 'email', 'login', 'proposal'

    const notifications: NotificationItem[] = []

    // Fetch email communications
    if (!type || type === 'all' || type === 'email') {
      const emailsResult = await dbPool.query(
        `SELECT
          cc.id,
          cc.comm_type,
          cc.title,
          cc.subject,
          cc.status,
          cc.recipient_email,
          cc.opened_at,
          cc.clicked_at,
          cc.sent_at,
          cc.created_at,
          c.id as client_id,
          c.name as client_name,
          c.contact_name
        FROM client_communications cc
        JOIN clients c ON c.id = cc.client_id
        WHERE cc.comm_type LIKE 'email%'
        ORDER BY cc.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const email of emailsResult.rows) {
        let description = `Sent to ${email.recipient_email || email.contact_name || 'client'}`
        if (email.status === 'opened' && email.opened_at) {
          description = `Opened by ${email.recipient_email || 'client'}`
        } else if (email.status === 'clicked' && email.clicked_at) {
          description = `Link clicked by ${email.recipient_email || 'client'}`
        } else if (email.status === 'delivered') {
          description = `Delivered to ${email.recipient_email || 'client'}`
        } else if (email.status === 'failed' || email.status === 'bounced') {
          description = `Failed to deliver to ${email.recipient_email || 'client'}`
        }

        notifications.push({
          id: email.id,
          type: 'email',
          title: email.title || email.subject || 'Email',
          description,
          clientName: email.client_name,
          clientId: email.client_id,
          status: email.status,
          timestamp: email.sent_at || email.created_at,
        })
      }
    }

    // Fetch proposal views from recommendation_invites
    // Note: We only track views here since email sends are tracked in client_communications
    if (!type || type === 'all' || type === 'proposal') {
      const proposalViewsResult = await dbPool.query(
        `SELECT
          ri.id,
          ri.first_name,
          ri.last_name,
          ri.email,
          ri.status,
          ri.viewed_at,
          c.id as client_id,
          c.name as client_name
        FROM recommendation_invites ri
        JOIN recommendations r ON r.id = ri.recommendation_id
        JOIN clients c ON c.id = r.client_id
        WHERE ri.viewed_at IS NOT NULL
        ORDER BY ri.viewed_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const view of proposalViewsResult.rows) {
        notifications.push({
          id: `view-${view.id}`,
          type: 'proposal_view',
          title: 'Proposal Viewed',
          description: `${view.first_name} ${view.last_name} viewed the proposal`,
          clientName: view.client_name,
          clientId: view.client_id,
          status: 'viewed',
          timestamp: view.viewed_at,
        })
      }
    }

    // Fetch login events from activity_log
    if (!type || type === 'all' || type === 'login') {
      const loginsResult = await dbPool.query(
        `SELECT
          al.id,
          al.activity_type,
          al.description,
          al.metadata,
          al.created_at,
          COALESCE(c.id, pc.id) as client_id,
          COALESCE(c.name, pc.name) as client_name,
          p.full_name as user_name,
          p.email as user_email
        FROM activity_log al
        LEFT JOIN clients c ON c.id = al.client_id
        LEFT JOIN profiles p ON p.id = al.user_id
        LEFT JOIN clients pc ON pc.id = p.client_id
        WHERE al.activity_type IN ('login', 'client_login', 'prospect_login', 'admin_login')
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const login of loginsResult.rows) {
        // Determine a display name for the client column
        let clientDisplay = login.client_name
        if (!clientDisplay && login.user_email) {
          // Extract company from email domain (e.g., "ryan@raptor-vending.com" -> "Raptor Vending")
          const domain = login.user_email.split('@')[1]?.split('.')[0]
          if (domain && domain !== 'gmail' && domain !== 'yahoo' && domain !== 'hotmail' && domain !== 'outlook') {
            clientDisplay = domain.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          }
        }

        notifications.push({
          id: login.id,
          type: 'login',
          title: login.activity_type === 'admin_login' ? 'Admin Login' : 'Client Login',
          description: `${login.user_name || login.user_email || 'User'} logged in`,
          clientName: clientDisplay || 'Unlinked Account',
          clientId: login.client_id || '',
          metadata: login.metadata,
          timestamp: login.created_at,
        })
      }
    }

    // Fetch page view events from activity_log
    if (!type || type === 'all' || type === 'page_view') {
      const pageViewsResult = await dbPool.query(
        `SELECT
          al.id,
          al.description,
          al.metadata,
          al.created_at,
          COALESCE(c.id, pc.id) as client_id,
          COALESCE(c.name, pc.name) as client_name,
          p.full_name as user_name,
          p.email as user_email
        FROM activity_log al
        LEFT JOIN clients c ON c.id = al.client_id
        LEFT JOIN profiles p ON p.id = al.user_id
        LEFT JOIN clients pc ON pc.id = p.client_id
        WHERE al.activity_type = 'page_view'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const view of pageViewsResult.rows) {
        const metadata = view.metadata || {}

        // Determine a display name for the client column
        let clientDisplay = view.client_name
        if (!clientDisplay && view.user_email) {
          const domain = view.user_email.split('@')[1]?.split('.')[0]
          if (domain && domain !== 'gmail' && domain !== 'yahoo' && domain !== 'hotmail' && domain !== 'outlook') {
            clientDisplay = domain.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          }
        }

        notifications.push({
          id: view.id,
          type: 'page_view',
          title: 'Page View',
          description: `${view.user_name || view.user_email || 'User'} viewed ${metadata.pageName || metadata.page || 'a page'}`,
          clientName: clientDisplay || 'Unlinked Account',
          clientId: view.client_id || '',
          metadata: view.metadata,
          timestamp: view.created_at,
        })
      }
    }

    // Fetch registration events from activity_log
    if (!type || type === 'all' || type === 'registration') {
      const registrationsResult = await dbPool.query(
        `SELECT
          al.id,
          al.description,
          al.metadata,
          al.created_at,
          COALESCE(c.id, pc.id) as client_id,
          COALESCE(c.name, pc.name) as client_name,
          p.full_name as user_name,
          p.email as user_email
        FROM activity_log al
        LEFT JOIN clients c ON c.id = al.client_id
        LEFT JOIN profiles p ON p.id = al.user_id
        LEFT JOIN clients pc ON pc.id = p.client_id
        WHERE al.activity_type = 'registration'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const reg of registrationsResult.rows) {
        // Determine a display name for the client column
        let clientDisplay = reg.client_name
        if (!clientDisplay && reg.user_email) {
          const domain = reg.user_email.split('@')[1]?.split('.')[0]
          if (domain && domain !== 'gmail' && domain !== 'yahoo' && domain !== 'hotmail' && domain !== 'outlook') {
            clientDisplay = domain.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          }
        }

        notifications.push({
          id: reg.id,
          type: 'registration',
          title: 'New Registration',
          description: `${reg.user_name || reg.user_email || 'User'} created an account`,
          clientName: clientDisplay || 'Unlinked Account',
          clientId: reg.client_id || '',
          metadata: reg.metadata,
          timestamp: reg.created_at,
        })
      }
    }

    // Fetch purchase events from activity_log
    if (!type || type === 'all' || type === 'purchase') {
      const purchasesResult = await dbPool.query(
        `SELECT
          al.id,
          al.description,
          al.metadata,
          al.created_at,
          c.id as client_id,
          c.name as client_name,
          c.contact_name
        FROM activity_log al
        JOIN clients c ON c.id = al.client_id
        WHERE al.activity_type = 'purchase'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const purchase of purchasesResult.rows) {
        const metadata = purchase.metadata || {}
        notifications.push({
          id: purchase.id,
          type: 'purchase',
          title: 'New Purchase',
          description: purchase.description || `${purchase.contact_name || 'Client'} made a purchase`,
          clientName: purchase.client_name,
          clientId: purchase.client_id,
          metadata: purchase.metadata,
          status: 'completed',
          timestamp: purchase.created_at,
        })
      }
    }

    // Fetch onboarding completion events from activity_log
    if (!type || type === 'all' || type === 'onboarding') {
      const onboardingResult = await dbPool.query(
        `SELECT
          al.id,
          al.description,
          al.metadata,
          al.created_at,
          c.id as client_id,
          c.name as client_name,
          c.contact_name
        FROM activity_log al
        JOIN clients c ON c.id = al.client_id
        WHERE al.activity_type = 'onboarding_completed'
        ORDER BY al.created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      for (const onboarding of onboardingResult.rows) {
        notifications.push({
          id: onboarding.id,
          type: 'onboarding',
          title: 'Onboarding Completed',
          description: `${onboarding.contact_name || onboarding.client_name} completed their onboarding questionnaire`,
          clientName: onboarding.client_name,
          clientId: onboarding.client_id,
          metadata: onboarding.metadata,
          status: 'completed',
          timestamp: onboarding.created_at,
        })
      }
    }

    // Sort all notifications by timestamp (newest first)
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Get counts for summary
    const countsResult = await dbPool.query(`
      SELECT
        (SELECT COUNT(*) FROM client_communications WHERE comm_type LIKE 'email%') as total_emails,
        (SELECT COUNT(*) FROM client_communications WHERE comm_type LIKE 'email%' AND status = 'sent') as sent_emails,
        (SELECT COUNT(*) FROM client_communications WHERE comm_type LIKE 'email%' AND status = 'delivered') as delivered_emails,
        (SELECT COUNT(*) FROM client_communications WHERE comm_type LIKE 'email%' AND status = 'opened') as opened_emails,
        (SELECT COUNT(*) FROM recommendation_invites WHERE viewed_at IS NOT NULL) as proposals_viewed,
        (SELECT COUNT(*) FROM recommendation_invites WHERE sent_at IS NOT NULL) as proposals_sent,
        (SELECT COUNT(*) FROM activity_log WHERE activity_type IN ('login', 'client_login', 'prospect_login')) as total_logins,
        (SELECT COUNT(*) FROM activity_log WHERE activity_type = 'page_view') as total_page_views,
        (SELECT COUNT(*) FROM activity_log WHERE activity_type = 'purchase') as total_purchases,
        (SELECT COUNT(*) FROM activity_log WHERE activity_type = 'onboarding_completed') as total_onboardings
    `)

    const counts = countsResult.rows[0]

    return NextResponse.json({
      notifications: notifications.slice(0, limit),
      summary: {
        totalEmails: parseInt(counts.total_emails) || 0,
        sentEmails: parseInt(counts.sent_emails) || 0,
        deliveredEmails: parseInt(counts.delivered_emails) || 0,
        openedEmails: parseInt(counts.opened_emails) || 0,
        proposalsViewed: parseInt(counts.proposals_viewed) || 0,
        proposalsSent: parseInt(counts.proposals_sent) || 0,
        totalLogins: parseInt(counts.total_logins) || 0,
        totalPageViews: parseInt(counts.total_page_views) || 0,
        totalPurchases: parseInt(counts.total_purchases) || 0,
        totalOnboardings: parseInt(counts.total_onboardings) || 0,
      },
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
