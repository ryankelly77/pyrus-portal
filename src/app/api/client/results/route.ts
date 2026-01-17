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

    // Get client data including agency_dashboard_share_key for Pro Dashboard
    const clientResult = await dbPool.query(
      `SELECT id, name, agency_dashboard_share_key FROM clients WHERE id = $1`,
      [clientId]
    )

    if (clientResult.rows.length === 0) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientResult.rows[0]

    // TODO: Replace with real data from analytics sources
    // For now, return demo data structure that can be populated later
    const kpiData = {
      visitors: {
        value: 2847,
        formatted: '2,847',
        change: 32,
        changeFormatted: '+32%',
        trend: 'up' as const,
      },
      keywords: {
        value: 47,
        formatted: '47',
        change: 17,
        changeFormatted: '+17',
        trend: 'up' as const,
      },
      leads: {
        value: 28,
        formatted: '28',
        change: 8,
        changeFormatted: '+8',
        trend: 'up' as const,
      },
      calls: {
        value: 34,
        formatted: '34',
        change: 12,
        changeFormatted: '+12',
        trend: 'up' as const,
      },
    }

    // Demo keywords data - would come from SEO tracking tool
    const keywords = [
      {
        id: '1',
        keyword: 'precision wound care san antonio',
        currentPosition: 7,
        previousPosition: 24,
        change: 17,
        progress: 85,
      },
      {
        id: '2',
        keyword: 'wound care clinic near me',
        currentPosition: 12,
        previousPosition: 18,
        change: 6,
        progress: 70,
      },
      {
        id: '3',
        keyword: 'diabetic wound treatment texas',
        currentPosition: 15,
        previousPosition: 22,
        change: 7,
        progress: 60,
      },
      {
        id: '4',
        keyword: 'chronic wound specialist',
        currentPosition: 23,
        previousPosition: 31,
        change: 8,
        progress: 45,
      },
      {
        id: '5',
        keyword: 'advanced wound care products',
        currentPosition: 34,
        previousPosition: 32,
        change: -2,
        progress: 30,
      },
    ]

    // Demo traffic data - would come from Google Analytics
    const trafficData = {
      labels: ['Dec 1', 'Dec 8', 'Dec 15', 'Dec 22', 'Dec 29'],
      values: [120, 100, 110, 80, 70, 50, 40, 30, 20],
    }

    // Demo AI visibility data
    const aiVisibility = {
      score: 21,
      maxScore: 100,
      level: 'low' as const,
      industryAverage: 45,
      breakdown: {
        chatgpt: 18,
        perplexity: 24,
        gemini: 21,
      },
      inPlan: false,
    }

    // Demo lead sources data
    const leadSources = [
      { source: 'Google Ads', percentage: 40, color: '#10B981' },
      { source: 'Organic Search', percentage: 25, color: '#F59E0B' },
      { source: 'Direct', percentage: 20, color: '#3B82F6' },
      { source: 'Referral', percentage: 15, color: '#EC4899' },
    ]

    // Pro Dashboard URL
    const proDashboardUrl = client.agency_dashboard_share_key
      ? `https://agencydashboard.io/campaign/detail/${client.agency_dashboard_share_key}`
      : 'https://agencydashboard.io/campaign/detail/MjI5MTgtfC00NDUyMC18LXJPN0xveFpTQmM='

    return NextResponse.json({
      kpi: kpiData,
      keywords: {
        items: keywords,
        total: 47,
        showing: keywords.length,
      },
      trafficData,
      aiVisibility,
      leadSources,
      proDashboardUrl,
    })
  } catch (error) {
    console.error('Error fetching results data:', error)
    return NextResponse.json({ error: 'Failed to fetch results data' }, { status: 500 })
  }
}
