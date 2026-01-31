import { prisma } from '@/lib/prisma'
import { getMonitorUptime } from '@/lib/uptimerobot/client'

export interface WebsiteData {
  hasWebsiteProducts: boolean
  hasWebsiteAccess: boolean
  websiteProducts: string[]
  websiteData: {
    domain: string
    websiteUrl: string
    previewUrl: string | null
    plan: string
    carePlan: string
    status: 'active'
    launchDate: string
    hostingType: string | null
    hosting: {
      provider: string
      uptime: string
      uptimeStatus: 'up' | 'down' | 'paused' | 'unknown' | null
      lastUpdated: string
    }
    blocksIframe: boolean
  } | null
  editRequests: Array<{
    id: string
    title: string
    type: string
    status: 'pending' | 'in-progress' | 'completed'
    date: string
  }>
}

/**
 * Get website data for a client
 * Includes computed plan names, uptime from UptimeRobot, edit requests
 * Used by both client and admin routes for data parity
 */
export async function getWebsiteData(clientId: string): Promise<WebsiteData> {
  // Get client data including website fields
  const client = await prisma.clients.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      website_url: true,
      hosting_type: true,
      hosting_provider: true,
      website_launch_date: true,
      uptimerobot_monitor_id: true,
      landingsite_preview_url: true,
      stripe_customer_id: true,
    },
  })

  if (!client) {
    throw new Error('Client not found')
  }

  // Check what website products the client has
  const subscriptionItems = await prisma.subscription_items.findMany({
    where: {
      subscription: {
        client_id: clientId,
        status: 'active',
      },
      product: {
        name: {
          contains: '',
        },
      },
    },
    include: {
      product: {
        select: {
          name: true,
          category: true,
        },
      },
    },
  })

  // Filter for website-related products
  const websiteProductNames = subscriptionItems
    .filter((item) => {
      const name = item.product?.name?.toLowerCase() || ''
      return (
        name.includes('site') ||
        name.includes('website') ||
        name.includes('wordpress') ||
        name.includes('harvest') ||
        name.includes('care')
      )
    })
    .map((item) => item.product?.name || '')
    .filter(Boolean)

  const websiteProducts = Array.from(new Set(websiteProductNames)) // Remove duplicates
  const hasWebsiteProducts = websiteProducts.length > 0
  const hasWebsiteAccess = !!client.website_url

  // Determine website plan name from products
  let planName = 'Website'
  let carePlan = 'None'
  for (const name of websiteProducts) {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('bloom site')) {
      planName = 'Bloom Site (WordPress)'
    } else if (lowerName.includes('sprout site')) {
      planName = 'Sprout Site (WordPress)'
    } else if (lowerName.includes('seed site')) {
      planName = 'Seed Site (AI-Built)'
    } else if (lowerName.includes('harvest site')) {
      planName = 'Harvest Site (WordPress)'
    } else if (lowerName.includes('harvest seo')) {
      carePlan = 'Website Care Plan (included with Harvest SEO)'
    } else if (lowerName.includes('website care')) {
      carePlan = 'Website Care Plan'
    } else if (lowerName.includes('wordpress care')) {
      carePlan = 'WordPress Care Plan'
    }
  }

  // If no specific website plan was found and client provides their own hosting
  if (planName === 'Website' && client.hosting_type === 'client_hosted') {
    planName = 'Client Provided'
  }

  // Determine hosting provider based on hosting_type field
  const getHostingProvider = (): string => {
    switch (client.hosting_type) {
      case 'ai_site':
        return 'Landingsite.ai'
      case 'pyrus_hosted':
        return 'WPEngine (Pyrus Hosted)'
      case 'client_hosted':
        return client.hosting_provider || 'Client Hosted'
      default:
        return planName.includes('WordPress') ? 'WPEngine' : 'Landingsite.ai'
    }
  }

  // Build website data if available
  let websiteData: WebsiteData['websiteData'] = null
  if (hasWebsiteAccess && client.website_url) {
    // Extract domain from website URL
    let domain = 'yoursite.com'
    try {
      const url = new URL(client.website_url)
      domain = url.hostname.replace(/^www\./, '')
    } catch {
      // Keep default
    }

    // Determine if iframe preview is allowed
    const hostingProvider = getHostingProvider()
    const blocksIframe =
      client.hosting_type === 'client_hosted' &&
      client.hosting_provider?.toLowerCase().includes('hubspot')

    // Fetch uptime data from UptimeRobot if monitor is configured
    let uptimeDisplay = 'Not Monitored'
    let uptimeStatus: 'up' | 'down' | 'paused' | 'unknown' | null = null
    if (client.uptimerobot_monitor_id) {
      const uptimeData = await getMonitorUptime(client.uptimerobot_monitor_id)
      if (uptimeData) {
        uptimeDisplay = uptimeData.uptime
        uptimeStatus = uptimeData.status
      }
    }

    // Calculate last updated date from most recent "Website Updates" todo completion
    let lastUpdatedDate: Date | null = null
    try {
      const lastUpdate = await prisma.basecamp_activities.findFirst({
        where: {
          client_id: clientId,
          kind: 'todo_completed',
          recording_title: {
            contains: 'Website Updates',
            mode: 'insensitive',
          },
        },
        orderBy: [{ basecamp_created_at: 'desc' }, { created_at: 'desc' }],
        select: {
          basecamp_created_at: true,
          created_at: true,
        },
      })
      if (lastUpdate) {
        lastUpdatedDate = lastUpdate.basecamp_created_at || lastUpdate.created_at
      }
    } catch {
      // Table may not exist
    }

    // Fall back to launch date or 'Unknown'
    const lastUpdatedDisplay = lastUpdatedDate
      ? lastUpdatedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : client.website_launch_date
        ? new Date(client.website_launch_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown'

    websiteData = {
      domain,
      websiteUrl: client.website_url,
      previewUrl: blocksIframe ? null : client.website_url,
      plan: planName,
      carePlan,
      status: 'active' as const,
      launchDate: client.website_launch_date
        ? new Date(client.website_launch_date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown',
      hostingType: client.hosting_type,
      hosting: {
        provider: hostingProvider,
        uptime: uptimeDisplay,
        uptimeStatus,
        lastUpdated: lastUpdatedDisplay,
      },
      blocksIframe: blocksIframe || false,
    }
  }

  // Fetch edit requests from database
  let editRequests: WebsiteData['editRequests'] = []
  if (hasWebsiteAccess) {
    try {
      const requests = await prisma.website_edit_requests.findMany({
        where: { client_id: clientId },
        orderBy: { created_at: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          request_type: true,
          status: true,
          created_at: true,
        },
      })

      editRequests = requests.map((row) => ({
        id: row.id,
        title: row.title,
        type: row.request_type || 'Unknown',
        status: (row.status as 'pending' | 'in-progress' | 'completed') || 'pending',
        date: row.created_at
          ? new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Unknown',
      }))
    } catch {
      // Table may not exist yet
    }
  }

  return {
    hasWebsiteProducts,
    hasWebsiteAccess,
    websiteProducts,
    websiteData,
    editRequests,
  }
}
