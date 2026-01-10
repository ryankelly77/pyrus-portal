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
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single<{ client_id: string | null }>()

      if (!profile?.client_id) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profile.client_id
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
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
        basecamp_id
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
      `SELECT DISTINCT p.name, p.category
       FROM subscriptions s
       JOIN subscription_items si ON si.subscription_id = s.id
       JOIN products p ON p.id = si.product_id
       WHERE s.client_id = $1 AND s.status = 'active'`,
      [clientId]
    )

    const activeProducts = subscriptionResult.rows.map((r: { name: string }) => r.name.toLowerCase())

    // A client is "pending" (prospect) if they have no active subscriptions
    const hasActiveSubscriptions = activeProducts.length > 0
    const clientStatus = hasActiveSubscriptions ? (client.status || 'active') : 'pending'

    // Determine access flags
    const isActiveClient = hasActiveSubscriptions
    const hasResultsAccess = !!client.agency_dashboard_share_key
    const hasActivityAccess = !!client.basecamp_id
    const hasWebsiteAccess = !!client.landingsite_preview_url
    const hasWebsiteProducts = activeProducts.some((name: string) =>
      name.includes('site') || name.includes('website') || name.includes('care plan')
    )
    const hasContentProducts = activeProducts.some((name: string) =>
      name.includes('content') || name.includes('ai creative') || name.includes('branding')
    )

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
      // Access flags for sidebar badges
      access: {
        isActive: isActiveClient,
        hasResults: hasResultsAccess,
        hasActivity: hasActivityAccess,
        hasWebsite: hasWebsiteAccess,
        hasWebsiteProducts,
        hasContent: hasContentProducts,
      }
    })
  } catch (error) {
    console.error('Error fetching client info:', error)
    return NextResponse.json({ error: 'Failed to fetch client info' }, { status: 500 })
  }
}
