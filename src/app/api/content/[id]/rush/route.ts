import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/mailgun'
import { getStatusLabel } from '@/lib/content-workflow-helpers'

export const dynamic = 'force-dynamic'

const TEAM_NOTIFICATION_EMAIL = process.env.TEAM_NOTIFICATION_EMAIL || 'team@pyrusdigitalmedia.com'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params

    // 1. Authenticate the user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user profile
    const profileResult = await dbPool.query(
      `SELECT id, full_name, role, client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const profile = profileResult.rows[0]

    // 3. Get the content piece with client info
    const contentResult = await dbPool.query(
      `SELECT c.*, cl.name as client_name, cl.contact_email as client_email
       FROM content c
       LEFT JOIN clients cl ON cl.id = c.client_id
       WHERE c.id = $1`,
      [contentId]
    )

    if (contentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const content = contentResult.rows[0]

    // 4. Verify ownership (client must own the content, or user is admin)
    const isAdmin = ['super_admin', 'admin', 'production_team', 'sales'].includes(profile.role)
    if (!isAdmin && content.client_id !== profile.client_id) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // 5. Mark content as urgent
    await dbPool.query(
      `UPDATE content
       SET urgent = true,
           updated_at = NOW(),
           status_history = COALESCE(status_history, '[]'::jsonb) || $2::jsonb
       WHERE id = $1`,
      [
        contentId,
        JSON.stringify({
          status: getStatusLabel(content.status, 'admin'),
          changed_at: new Date().toISOString(),
          changed_by_id: user.id,
          changed_by_name: profile.full_name || 'Client',
          note: 'Rush publishing requested'
        })
      ]
    )

    // 6. Send notification email to team
    try {
      const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'}/admin/content/${contentId}`

      await sendEmail({
        to: TEAM_NOTIFICATION_EMAIL,
        subject: `🚀 Rush Publishing Requested: ${content.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">Rush Publishing Requested</h2>
            <p><strong>${content.client_name || 'A client'}</strong> has requested rush publishing for:</p>
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #92400E;">${content.title}</h3>
              <p style="margin: 0; color: #78350F;">Current Status: ${content.status}</p>
            </div>
            <p>Please prioritize this content for publishing.</p>
            <a href="${portalUrl}" style="display: inline-block; background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
              View Content
            </a>
          </div>
        `,
        text: `Rush Publishing Requested\n\n${content.client_name || 'A client'} has requested rush publishing for: ${content.title}\n\nCurrent Status: ${content.status}\n\nView content: ${portalUrl}`,
        tags: ['rush-publishing', 'content-urgent'],
      })

      console.log(`Rush publishing notification sent for content ${contentId}`)
    } catch (emailError) {
      console.error('Failed to send rush publishing notification:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Rush publishing requested',
    })
  } catch (error) {
    console.error('Rush publishing error:', error)
    return NextResponse.json({ error: 'Failed to request rush publishing' }, { status: 500 })
  }
}
