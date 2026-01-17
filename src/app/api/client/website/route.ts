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

    // Get client data including landingsite_preview_url
    const clientResult = await dbPool.query(
      `SELECT id, name, landingsite_preview_url, stripe_customer_id FROM clients WHERE id = $1`,
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
        )
    `, [clientId])

    const websiteProducts = subscriptionResult.rows.map(r => r.product_name)
    const hasWebsiteProducts = websiteProducts.length > 0
    const hasWebsiteAccess = !!client.landingsite_preview_url

    // Determine website plan name from products
    let planName = 'Website'
    let carePlan = 'None'
    for (const name of websiteProducts) {
      const lowerName = name.toLowerCase()
      if (lowerName.includes('bloom')) {
        planName = 'Bloom Site (WordPress)'
      } else if (lowerName.includes('sprout')) {
        planName = 'Sprout Site (WordPress)'
      } else if (lowerName.includes('seed')) {
        planName = 'Seed Site (AI-Built)'
      } else if (lowerName.includes('harvest')) {
        planName = 'Harvest Site (WordPress)'
      } else if (lowerName.includes('website care')) {
        carePlan = 'Website Care Plan'
      } else if (lowerName.includes('wordpress care')) {
        carePlan = 'WordPress Care Plan'
      }
    }

    // Build website data if available
    let websiteData = null
    if (hasWebsiteAccess) {
      // Extract domain from preview URL or use default
      let domain = 'yoursite.com'
      try {
        const previewUrl = client.landingsite_preview_url
        // Try to extract domain - for landingsite URLs use a placeholder
        if (previewUrl.includes('landingsite.ai')) {
          domain = `${client.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.com`
        } else {
          const url = new URL(previewUrl)
          domain = url.hostname
        }
      } catch {
        // Keep default
      }

      websiteData = {
        domain,
        previewUrl: client.landingsite_preview_url,
        plan: planName,
        carePlan,
        status: 'active' as const,
        launchDate: 'Dec 30, 2025', // TODO: Store actual launch date in database
        hosting: {
          provider: planName.includes('WordPress') ? 'WPEngine' : 'Landingsite.ai',
          uptime: '99.9%',
          lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
      }
    }

    // TODO: Fetch real edit requests from database
    // For now, return demo data that matches the existing structure
    const editRequests = hasWebsiteAccess ? [
      { id: 1, title: 'Update contact page hours', type: 'Content Update', status: 'completed' as const, date: 'Jan 3, 2026' },
      { id: 2, title: 'Add new service page', type: 'New Feature', status: 'in-progress' as const, date: 'Jan 2, 2026' },
      { id: 3, title: 'Fix mobile menu alignment', type: 'Bug Fix', status: 'completed' as const, date: 'Dec 28, 2025' },
      { id: 4, title: 'Update footer contact info', type: 'Content Update', status: 'completed' as const, date: 'Dec 20, 2025' },
    ] : []

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
