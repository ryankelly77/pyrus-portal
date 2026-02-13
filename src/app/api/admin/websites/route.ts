import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { prisma } from '@/lib/prisma'
import { getMonitorUptime, UptimeData } from '@/lib/uptimerobot/client'

export const dynamic = 'force-dynamic'

interface WebsiteListItem {
  id: string
  clientId: string
  clientName: string
  domain: string
  websiteUrl: string
  websiteType: 'seed-site' | 'sprout' | 'bloom' | 'harvest' | 'other'
  carePlan: string
  hostingType: string | null
  hostingProvider: string
  launchDate: string | null
  uptimeStatus: 'up' | 'down' | 'paused' | 'unknown' | null
  uptime: string | null
  pendingRequests: number
  editRequests: Array<{
    id: string
    title: string
    description: string | null
    requestType: string
    status: string
    priority: string
    createdAt: string
  }>
}

// GET /api/admin/websites - Get all clients with websites
export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Get all active clients that have a website_url
    const clients = await prisma.clients.findMany({
      where: {
        website_url: { not: null },
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        website_url: true,
        hosting_type: true,
        hosting_provider: true,
        website_launch_date: true,
        uptimerobot_monitor_id: true,
      },
      orderBy: { name: 'asc' },
    })

    // Get subscription items for all these clients to determine website products
    const clientIds = clients.map((c) => c.id)

    const subscriptionItems = await prisma.subscription_items.findMany({
      where: {
        subscription: {
          client_id: { in: clientIds },
          status: 'active',
        },
      },
      include: {
        subscription: {
          select: { client_id: true },
        },
        product: {
          select: { name: true, category: true },
        },
      },
    })

    // Group subscription items by client
    const clientProducts: Record<string, string[]> = {}
    for (const item of subscriptionItems) {
      const clientId = item.subscription?.client_id
      if (clientId && item.product?.name) {
        if (!clientProducts[clientId]) {
          clientProducts[clientId] = []
        }
        clientProducts[clientId].push(item.product.name)
      }
    }

    // Get all pending/in-progress edit requests for these clients
    const editRequests = await prisma.website_edit_requests.findMany({
      where: {
        client_id: { in: clientIds },
        status: { in: ['pending', 'in-progress'] },
      },
      orderBy: [
        { priority: 'desc' },
        { created_at: 'desc' },
      ],
      select: {
        id: true,
        client_id: true,
        title: true,
        description: true,
        request_type: true,
        status: true,
        priority: true,
        created_at: true,
      },
    })

    // Group edit requests by client
    const clientRequests: Record<string, typeof editRequests> = {}
    for (const req of editRequests) {
      if (!clientRequests[req.client_id]) {
        clientRequests[req.client_id] = []
      }
      clientRequests[req.client_id].push(req)
    }

    // Fetch uptime data for all monitors (in parallel, with a limit)
    const monitorsToFetch = clients
      .filter((c) => c.uptimerobot_monitor_id)
      .map((c) => ({ clientId: c.id, monitorId: c.uptimerobot_monitor_id! }))

    const uptimeResults: Record<string, UptimeData | null> = {}

    // Fetch in batches of 5 to avoid rate limiting
    for (let i = 0; i < monitorsToFetch.length; i += 5) {
      const batch = monitorsToFetch.slice(i, i + 5)
      const results = await Promise.all(
        batch.map(async ({ clientId, monitorId }) => {
          const data = await getMonitorUptime(monitorId)
          return { clientId, data }
        })
      )
      for (const { clientId, data } of results) {
        uptimeResults[clientId] = data
      }
    }

    // Build the response
    const websites: WebsiteListItem[] = clients.map((client) => {
      const products = clientProducts[client.id] || []
      const requests = clientRequests[client.id] || []
      const uptimeData = uptimeResults[client.id]

      // Determine website type from products
      let websiteType: WebsiteListItem['websiteType'] = 'other'
      let carePlan = 'None'

      for (const name of products) {
        const lowerName = name.toLowerCase()
        if (lowerName.includes('bloom site')) {
          websiteType = 'bloom'
        } else if (lowerName.includes('sprout site')) {
          websiteType = 'sprout'
        } else if (lowerName.includes('seed site')) {
          websiteType = 'seed-site'
        } else if (lowerName.includes('harvest site')) {
          websiteType = 'harvest'
        }

        if (lowerName.includes('harvest seo')) {
          carePlan = 'Website Care (Harvest SEO)'
        } else if (lowerName.includes('seedling seo')) {
          carePlan = 'Basic Updates (Seedling SEO)'
        } else if (lowerName.includes('website care')) {
          carePlan = 'Website Care'
        } else if (lowerName.includes('wordpress care')) {
          carePlan = 'WordPress Care'
        }
      }

      // Extract domain from URL
      let domain = client.website_url || ''
      try {
        const url = new URL(client.website_url || '')
        domain = url.hostname.replace(/^www\./, '')
      } catch {
        // Keep original
      }

      // Determine hosting provider
      let hostingProvider = 'Unknown'
      switch (client.hosting_type) {
        case 'ai_site':
          hostingProvider = 'Landingsite.ai'
          break
        case 'pyrus_hosted':
          hostingProvider = 'WPEngine'
          break
        case 'client_hosted':
          hostingProvider = client.hosting_provider || 'Client Hosted'
          break
        default:
          hostingProvider = websiteType === 'seed-site' ? 'Landingsite.ai' : 'WPEngine'
      }

      return {
        id: client.id,
        clientId: client.id,
        clientName: client.name,
        domain,
        websiteUrl: client.website_url || '',
        websiteType,
        carePlan,
        hostingType: client.hosting_type,
        hostingProvider,
        launchDate: client.website_launch_date
          ? new Date(client.website_launch_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : null,
        uptimeStatus: uptimeData?.status || null,
        uptime: uptimeData?.uptime || null,
        pendingRequests: requests.length,
        editRequests: requests.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          requestType: r.request_type,
          status: r.status,
          priority: r.priority || 'normal',
          createdAt: r.created_at
            ? new Date(r.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '',
        })),
      }
    })

    return NextResponse.json({
      websites,
      stats: {
        total: websites.length,
        active: websites.filter((w) => w.uptimeStatus === 'up').length,
        down: websites.filter((w) => w.uptimeStatus === 'down').length,
        pendingRequests: websites.reduce((sum, w) => sum + w.pendingRequests, 0),
      },
    })
  } catch (error) {
    console.error('Failed to fetch websites:', error)
    return NextResponse.json(
      { error: 'Failed to fetch websites' },
      { status: 500 }
    )
  }
}
