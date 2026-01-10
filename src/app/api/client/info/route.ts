import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    if (!clientId) {
      return NextResponse.json({ error: 'Client ID required' }, { status: 400 })
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    const result = await dbPool.query(
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
        landingsite_preview_url
      FROM clients
      WHERE id = $1`,
      [clientId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = result.rows[0]

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
      status: client.status || 'active',
      growthStage: client.growth_stage,
      clientSince: startDate,
      agencyDashboardKey: client.agency_dashboard_share_key,
      landingsitePreviewUrl: client.landingsite_preview_url,
    })
  } catch (error) {
    console.error('Error fetching client info:', error)
    return NextResponse.json({ error: 'Failed to fetch client info' }, { status: 500 })
  }
}
