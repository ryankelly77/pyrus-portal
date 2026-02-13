import { prisma } from '@/lib/prisma'
import { getMonitorUptime } from '@/lib/uptimerobot/client'
import { getDomainExpiry } from '@/lib/whoisxml/client'

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
      last24Hours?: {
        uptime: string
        incidents: number
        downtimeMinutes: number
        timeline?: Array<{
          hour: number
          status: 'up' | 'down' | 'partial'
          downtimeMinutes: number
        }>
      }
      ssl?: {
        brand: string
        expiresAt: string
        daysRemaining: number
      }
      domain?: {
        expiresAt: string
        daysRemaining: number
        registrar: string
      }
      currentStatus?: {
        uptimeDuration: string
        checkInterval: string
      }
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
      domain_expires_at: true,
      domain_registrar: true,
      domain_checked_at: true,
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
    },
    include: {
      product: {
        select: {
          name: true,
          category: true,
          includes_website: true,
        },
      },
    },
  })

  // Filter for website-related products using the includes_website flag
  const websiteProductNames = subscriptionItems
    .filter((item) => !!item.product?.includes_website)
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
      carePlan = 'Website Care (Harvest SEO)'
    } else if (lowerName.includes('seedling seo')) {
      carePlan = 'Basic Site Updates (Seedling SEO)'
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
    let last24Hours: { uptime: string; incidents: number; downtimeMinutes: number } | undefined
    let sslInfo: { brand: string; expiresAt: string; daysRemaining: number } | undefined
    let currentStatusInfo: { uptimeDuration: string; checkInterval: string } | undefined
    if (client.uptimerobot_monitor_id) {
      const uptimeData = await getMonitorUptime(client.uptimerobot_monitor_id)
      if (uptimeData) {
        uptimeDisplay = uptimeData.uptime
        uptimeStatus = uptimeData.status
        last24Hours = uptimeData.last24Hours
        if (uptimeData.ssl) {
          sslInfo = {
            brand: uptimeData.ssl.brand,
            expiresAt: uptimeData.ssl.expiresAt,
            daysRemaining: uptimeData.ssl.daysRemaining,
          }
        } else {
          console.log(`[WebsiteService] No SSL data from UptimeRobot for client ${clientId} (monitor: ${client.uptimerobot_monitor_id})`)
        }
        if (uptimeData.currentStatus) {
          currentStatusInfo = {
            uptimeDuration: uptimeData.currentStatus.uptimeDuration,
            checkInterval: uptimeData.currentStatus.checkInterval,
          }
        }
      } else {
        console.log(`[WebsiteService] UptimeRobot returned no data for client ${clientId} (monitor: ${client.uptimerobot_monitor_id})`)
      }
    }

    // Fetch domain expiry info (cached in DB, refreshed weekly)
    let domainInfo: { expiresAt: string; daysRemaining: number; registrar: string } | undefined
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
    const domainCacheStale = !client.domain_checked_at ||
      (Date.now() - new Date(client.domain_checked_at).getTime() > SEVEN_DAYS_MS)

    if (client.domain_expires_at && !domainCacheStale) {
      // Use cached domain info
      const expiresDate = new Date(client.domain_expires_at)
      domainInfo = {
        expiresAt: expiresDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        daysRemaining: Math.ceil((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        registrar: client.domain_registrar || 'Unknown',
      }
      console.log(`[WebsiteService] Using cached domain info for client ${clientId}: expires ${domainInfo.expiresAt}`)
    } else if (domainCacheStale && client.website_url) {
      // Fetch fresh domain info from WhoisXML
      console.log(`[WebsiteService] Fetching fresh domain info for client ${clientId} (cache stale: ${domainCacheStale}, url: ${client.website_url})`)
      try {
        const freshDomainInfo = await getDomainExpiry(client.website_url)
        if (freshDomainInfo) {
          domainInfo = {
            expiresAt: freshDomainInfo.expiresAt,
            daysRemaining: freshDomainInfo.daysRemaining,
            registrar: freshDomainInfo.registrar,
          }
          console.log(`[WebsiteService] Got domain info for client ${clientId}: expires ${domainInfo.expiresAt}, registrar: ${domainInfo.registrar}`)
          // Update cache in database (fire and forget)
          prisma.clients.update({
            where: { id: clientId },
            data: {
              domain_expires_at: new Date(freshDomainInfo.expiresTimestamp),
              domain_registrar: freshDomainInfo.registrar,
              domain_checked_at: new Date(),
            },
          }).catch(err => console.error('Failed to cache domain expiry:', err))
        } else {
          console.log(`[WebsiteService] WhoisXML returned no data for client ${clientId} (url: ${client.website_url})`)
        }
      } catch (err) {
        console.error(`[WebsiteService] Failed to fetch domain expiry for client ${clientId}:`, err)
      }
    } else {
      console.log(`[WebsiteService] Skipping domain lookup for client ${clientId} - no website_url or cache conditions not met`)
    }

    // Calculate last updated date from:
    // 1. Most recent completed edit request (completed_at), OR
    // 2. Most recent Basecamp todo with "Website" in title
    // If neither exists, show "N/A"
    let lastUpdatedDate: Date | null = null

    // Check for completed edit requests first
    try {
      const lastCompletedRequest = await prisma.website_edit_requests.findFirst({
        where: {
          client_id: clientId,
          status: 'completed',
          completed_at: { not: null },
        },
        orderBy: { completed_at: 'desc' },
        select: { completed_at: true },
      })
      if (lastCompletedRequest?.completed_at) {
        lastUpdatedDate = lastCompletedRequest.completed_at
      }
    } catch {
      // Table may not exist
    }

    // If no completed edit request, check Basecamp todos
    if (!lastUpdatedDate) {
      try {
        const lastUpdate = await prisma.basecamp_activities.findFirst({
          where: {
            client_id: clientId,
            kind: 'todo_completed',
            recording_title: {
              contains: 'Website',
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
    }

    // Show "N/A" if no valid update source found (don't fall back to launch date)
    const lastUpdatedDisplay = lastUpdatedDate
      ? lastUpdatedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'N/A'

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
        last24Hours,
        ssl: sslInfo,
        domain: domainInfo,
        currentStatus: currentStatusInfo,
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
