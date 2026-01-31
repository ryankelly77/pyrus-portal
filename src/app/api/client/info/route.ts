import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Service interface for content/website services
interface Service {
  name: string
  quantity: number
  details?: string
}

// Aggregates services across products, summing quantities by service name
function aggregateServices(products: any[], serviceField: 'content_services' | 'website_services'): Service[] {
  const serviceMap = new Map<string, Service>()

  for (const product of products) {
    const services = product[serviceField]
    if (!services || !Array.isArray(services)) continue

    for (const service of services) {
      const existing = serviceMap.get(service.name)
      if (existing) {
        // Same service name — sum quantities, keep first details
        existing.quantity += service.quantity
      } else {
        // New service — add to map
        serviceMap.set(service.name, { ...service })
      }
    }
  }

  return Array.from(serviceMap.values())
}

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

      let profileClientId = profileResult.rows[0]?.client_id

      // If no client_id, try to auto-associate based on email OR name matching a recommendation invite
      if (!profileClientId && user.email) {
        const userName = user.user_metadata?.full_name || ''
        const inviteResult = await dbPool.query(
          `SELECT r.client_id
           FROM recommendation_invites ri
           JOIN recommendations r ON r.id = ri.recommendation_id
           WHERE LOWER(ri.email) = LOWER($1)
              OR (LOWER(ri.first_name) || ' ' || LOWER(ri.last_name)) = LOWER($2)
           ORDER BY ri.created_at DESC
           LIMIT 1`,
          [user.email, userName]
        )

        if (inviteResult.rows.length > 0) {
          const foundClientId = inviteResult.rows[0].client_id
          // Auto-associate the user with this client
          // Use UPDATE since profile already exists (created by auth trigger)
          // If profile doesn't exist, INSERT with required 'role' field
          await dbPool.query(
            `INSERT INTO profiles (id, client_id, email, full_name, role)
             VALUES ($1, $2, $3, $4, 'client')
             ON CONFLICT (id) DO UPDATE SET client_id = EXCLUDED.client_id`,
            [user.id, foundClientId, user.email, user.user_metadata?.full_name || user.email?.split('@')[0] || 'User']
          )
          profileClientId = foundClientId
        }
      }

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

    // Fetch client data
    const clientResult = await dbPool.query(
      `SELECT
        id,
        name,
        contact_name,
        contact_email,
        avatar_url,
        avatar_color,
        status,
        growth_stage,
        start_date,
        agency_dashboard_share_key,
        landingsite_preview_url,
        website_url,
        website_provider,
        basecamp_id,
        basecamp_project_id,
        onboarding_completed_at
      FROM clients
      WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]

    // Fetch active subscription products to determine access
    const subscriptionResult = await dbPool.query(
      `SELECT DISTINCT
         p.id, p.name, p.category,
         p.includes_content, p.content_services,
         p.includes_website, p.website_services
       FROM subscriptions s
       JOIN subscription_items si ON si.subscription_id = s.id
       JOIN products p ON p.id = si.product_id
       WHERE s.client_id = $1 AND s.status = 'active'`,
      [clientId]
    )

    // Also fetch manually assigned products (handle case where table doesn't exist)
    let manualProductsResult = { rows: [] as any[] }
    try {
      manualProductsResult = await dbPool.query(
        `SELECT DISTINCT
           p.id, p.name, p.category,
           p.includes_content, p.content_services,
           p.includes_website, p.website_services
         FROM client_products cp
         JOIN products p ON p.id = cp.product_id
         WHERE cp.client_id = $1`,
        [clientId]
      )
    } catch (e) {
      // Table may not exist yet - that's ok
      console.log('client_products table may not exist yet')
    }

    // Combine subscription products and manually assigned products
    const subscriptionProducts = subscriptionResult.rows.map((r: { name: string }) => r.name.toLowerCase())
    const manualProductNames = manualProductsResult.rows.map((r: { name: string }) => r.name.toLowerCase())
    const activeProducts = Array.from(new Set([...subscriptionProducts, ...manualProductNames]))

    // Combine all active products with full details for flag-based access
    const allActiveProducts = [...subscriptionResult.rows, ...manualProductsResult.rows]

    // Check if admin has manually set the client as active
    // A client is "active" if:
    // 1. They have active subscriptions, OR
    // 2. They have manually assigned products, OR
    // 3. Admin has set status to 'active' AND growth_stage is NOT 'prospect'
    const hasActiveSubscriptions = subscriptionProducts.length > 0
    const hasManualProducts = manualProductNames.length > 0
    const isManuallyActive = client.status === 'active' && client.growth_stage && client.growth_stage !== 'prospect'
    const isActiveClient = hasActiveSubscriptions || hasManualProducts || isManuallyActive
    const clientStatus = isActiveClient ? (client.status || 'active') : 'pending'
    const hasResultsAccess = !!client.agency_dashboard_share_key
    const hasActivityAccess = !!client.basecamp_id || !!client.basecamp_project_id
    // Website access: has a website URL configured
    const hasWebsiteAccess = !!client.website_url

    // Flag-based product detection (replaces name matching)
    const hasWebsiteProducts = allActiveProducts.some((p: any) => p.includes_website === true)
    const hasContentProducts = allActiveProducts.some((p: any) => p.includes_content === true)

    // Aggregate content and website services across all active products
    const contentServices = aggregateServices(allActiveProducts, 'content_services')
    const websiteServices = aggregateServices(allActiveProducts, 'website_services')

    // Generate initials from name
    const initials = client.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

    // Format start date
    const startDate = client.start_date
      ? new Date(client.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : null

    return NextResponse.json({
      id: client.id,
      name: client.name,
      initials,
      avatarUrl: client.avatar_url,
      avatarColor: client.avatar_color || '#324438',
      contactName: client.contact_name || client.name,
      contactEmail: client.contact_email,
      contactPhone: null, // Column doesn't exist in database yet
      status: clientStatus,
      growthStage: client.growth_stage,
      clientSince: startDate,
      agencyDashboardKey: client.agency_dashboard_share_key,
      landingsitePreviewUrl: client.landingsite_preview_url,
      websiteUrl: client.website_url,
      websiteProvider: client.website_provider,
      onboardingCompletedAt: client.onboarding_completed_at,
      // Access flags for sidebar badges
      access: {
        isActive: isActiveClient,
        hasResults: hasResultsAccess,
        hasActivity: hasActivityAccess,
        hasWebsite: hasWebsiteAccess,
        hasWebsiteProducts,
        // For content: hasContent means content is actively being delivered (like hasActivity uses basecamp_id)
        // For now, we don't have a separate field to indicate content is active, so use hasActivityAccess as proxy
        hasContent: hasActivityAccess && hasContentProducts,
        hasContentProducts,
        // Aggregated services for "Your Plan Includes" display
        contentServices,
        websiteServices,
      }
    })
  } catch (error) {
    console.error('Error fetching client info:', error)
    return NextResponse.json({ error: 'Failed to fetch client info' }, { status: 500 })
  }
}
