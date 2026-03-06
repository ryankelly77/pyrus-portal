import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')
    const isPreview = searchParams.get('preview') === 'true'
    const viewingAs = searchParams.get('viewingAs')

    // If viewingAs is provided, check if user is admin and use that clientId
    if (viewingAs) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      // Check if user is admin
      const profileResult = await dbPool.query(
        `SELECT role FROM profiles WHERE id = $1`,
        [user.id]
      )

      const isAdmin = profileResult.rows[0]?.role === 'admin' || profileResult.rows[0]?.role === 'production_team'
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      clientId = viewingAs
    }
    // If no clientId provided, get the current user's client
    else if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      // Check if user is admin (for preview mode)
      const profileResult = await dbPool.query(
        `SELECT client_id, role FROM profiles WHERE id = $1`,
        [user.id]
      )

      const profile = profileResult.rows[0]
      const isAdmin = profile?.role === 'admin' || profile?.role === 'production_team'

      // For preview mode, admins can view any report
      if (isPreview && isAdmin) {
        // Fetch the report without client restriction
        const reportResult = await dbPool.query(
          `SELECT
            r.id,
            r.client_id,
            r.title,
            r.period_label,
            r.period_start,
            r.period_end,
            r.campaign_month,
            r.service_types,
            r.status,
            r.published_at,
            r.manager_name,
            r.manager_note,
            c.name as client_name
          FROM campaign_reports r
          LEFT JOIN clients c ON r.client_id = c.id
          WHERE r.id = $1`,
          [reportId]
        )

        if (reportResult.rows.length === 0) {
          return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        const report = reportResult.rows[0]

        // Fetch sections
        const sectionsResult = await dbPool.query(
          `SELECT id, section_type, sort_order, data, notes
          FROM report_sections
          WHERE report_id = $1
          ORDER BY sort_order`,
          [reportId]
        )

        return NextResponse.json({
          ...report,
          sections: sectionsResult.rows,
          isPreview: true
        })
      }

      // For non-admin or non-preview, require client association
      if (!profile?.client_id) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profile.client_id
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!clientId || !uuidRegex.test(clientId)) {
      return NextResponse.json({ error: 'Invalid client ID format' }, { status: 400 })
    }

    // Fetch the report with client restriction (must belong to this client and be published)
    const reportResult = await dbPool.query(
      `SELECT
        r.id,
        r.client_id,
        r.title,
        r.period_label,
        r.period_start,
        r.period_end,
        r.campaign_month,
        r.service_types,
        r.status,
        r.published_at,
        r.manager_name,
        r.manager_note,
        c.name as client_name
      FROM campaign_reports r
      LEFT JOIN clients c ON r.client_id = c.id
      WHERE r.id = $1 AND r.client_id = $2 AND r.status = 'published'`,
      [reportId, clientId]
    )

    if (reportResult.rows.length === 0) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const report = reportResult.rows[0]

    // Fetch sections
    const sectionsResult = await dbPool.query(
      `SELECT id, section_type, sort_order, data, notes
      FROM report_sections
      WHERE report_id = $1
      ORDER BY sort_order`,
      [reportId]
    )

    return NextResponse.json({
      ...report,
      sections: sectionsResult.rows,
      isPreview: false
    })
  } catch (error) {
    console.error('Error fetching report:', error)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
