import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { getMonitorUptime } from '@/lib/uptimerobot/client'

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

    // Get client data including website fields
    const clientResult = await dbPool.query(
      `SELECT id, name, website_url, hosting_type, hosting_provider, website_launch_date, uptimerobot_monitor_id, landingsite_preview_url, stripe_customer_id FROM clients WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]

    // Check what website products the client has
    const subscriptionResult = await dbPool.query(`
      SELECT
        si.id,
        p.name as product_name,
        p.category
      FROM subscription_items si
      JOIN subscriptions s ON si.subscription_id = s.id
      JOIN products p ON si.product_id = p.id
      WHERE s.client_id = $1
        AND s.status = 'active'
        AND (
          LOWER(p.name) LIKE '%site%'
          OR LOWER(p.name) LIKE '%website%'
          OR LOWER(p.name) LIKE '%wordpress%'
          OR LOWER(p.name) LIKE '%harvest%'
          OR LOWER(p.name) LIKE '%care%'
        )
    `, [clientId])

    const websiteProducts = subscriptionResult.rows.map(r => r.product_name)
    const hasWebsiteProducts = websiteProducts.length > 0
    // Website access is enabled if we have a website URL configured
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
        // Harvest SEO includes Website Care
        carePlan = 'Website Care Plan (included with Harvest SEO)'
      } else if (lowerName.includes('website care')) {
        carePlan = 'Website Care Plan'
      } else if (lowerName.includes('wordpress care')) {
        carePlan = 'WordPress Care Plan'
      }
    }

    // If no specific website plan was found and client provides their own hosting, show "Client Provided"
    if (planName === 'Website' && client.hosting_type === 'client_hosted') {
      planName = 'Client Provided'
    }

    // Determine hosting provider based on hosting_type field
    const getHostingProvider = () => {
      switch (client.hosting_type) {
        case 'ai_site':
          return 'Landingsite.ai'
        case 'pyrus_hosted':
          return 'WPEngine (Pyrus Hosted)'
        case 'client_hosted':
          return client.hosting_provider || 'Client Hosted'
        default:
          // Fallback to old logic for backwards compatibility
          return planName.includes('WordPress') ? 'WPEngine' : 'Landingsite.ai'
      }
    }

    // Build website data if available
    let websiteData = null
    if (hasWebsiteAccess) {
      // Extract domain from website URL
      let domain = 'yoursite.com'
      try {
        const websiteUrl = client.website_url
        const url = new URL(websiteUrl)
        domain = url.hostname.replace(/^www\./, '')
      } catch {
        // Keep default
      }

      // Determine if iframe preview is allowed based on hosting type
      // HubSpot and many client-hosted sites block iframe embedding
      const hostingProvider = getHostingProvider()
      const blocksIframe = client.hosting_type === 'client_hosted' &&
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

      websiteData = {
        domain,
        websiteUrl: client.website_url,
        previewUrl: blocksIframe ? null : client.website_url,
        plan: planName,
        carePlan,
        status: 'active' as const,
        launchDate: client.website_launch_date
          ? new Date(client.website_launch_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Unknown',
        hostingType: client.hosting_type,
        hosting: {
          provider: hostingProvider,
          uptime: uptimeDisplay,
          uptimeStatus,
          lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
        blocksIframe,
      }
    }

    // Fetch real edit requests from database
    let editRequests: Array<{
      id: string
      title: string
      type: string
      status: 'pending' | 'in-progress' | 'completed'
      date: string
    }> = []

    if (hasWebsiteAccess) {
      try {
        const editRequestsResult = await dbPool.query(`
          SELECT id, title, request_type, status, created_at
          FROM website_edit_requests
          WHERE client_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        `, [clientId])

        editRequests = editRequestsResult.rows.map(row => ({
          id: row.id,
          title: row.title,
          type: row.request_type,
          status: row.status as 'pending' | 'in-progress' | 'completed',
          date: new Date(row.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          }),
        }))
      } catch (error) {
        // Table may not exist yet, return empty array
        console.log('website_edit_requests table not found or query failed:', error)
      }
    }

    return NextResponse.json({
      hasWebsiteProducts,
      hasWebsiteAccess,
      websiteProducts,
      websiteData,
      editRequests,
    })
  } catch (error) {
    console.error('Error fetching website data:', error)
    return NextResponse.json({ error: 'Failed to fetch website data' }, { status: 500 })
  }
}
