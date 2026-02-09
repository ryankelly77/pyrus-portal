import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { contentCreateSchema } from '@/lib/validation/schemas'
import { sendEmail } from '@/lib/email/mailgun'
import { getContentReadyForReviewEmail } from '@/lib/email/templates/content-status'

export const dynamic = 'force-dynamic'

// Status group mappings
const STATUS_GROUPS: Record<string, string[]> = {
  in_review: ['sent_for_review', 'client_reviewing', 'revisions_requested'],
  in_production: ['approved', 'internal_review', 'final_optimization', 'image_selection'],
}

// GET - List all content with filters
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = `
      SELECT
        c.id,
        c.title,
        c.content_type,
        c.platform,
        c.excerpt,
        c.body,
        c.status,
        c.urgent,
        c.deadline,
        c.scheduled_date,
        c.published_at,
        c.published_url,
        c.target_keyword,
        c.secondary_keywords,
        c.word_count,
        c.seo_optimized,
        c.ai_optimized,
        c.revision_feedback,
        c.revision_count,
        c.approval_required,
        c.review_round,
        c.status_history,
        c.status_changed_at,
        c.assigned_to,
        c.created_at,
        c.updated_at,
        c.client_id,
        cl.name as client_name
      FROM content c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE 1=1
    `
    const params: (string | number)[] = []
    let paramIndex = 1

    // Handle status filter - including group filters
    if (status) {
      if (STATUS_GROUPS[status]) {
        // Group filter (in_review or in_production)
        const statuses = STATUS_GROUPS[status]
        const placeholders = statuses.map((_, i) => `$${paramIndex + i}`).join(', ')
        query += ` AND c.status IN (${placeholders})`
        statuses.forEach(s => params.push(s))
        paramIndex += statuses.length
      } else {
        // Single status filter
        query += ` AND c.status = $${paramIndex++}`
        params.push(status)
      }
    }
    if (clientId) {
      query += ` AND c.client_id = $${paramIndex++}`
      params.push(clientId)
    }
    if (platform) {
      query += ` AND c.platform = $${paramIndex++}`
      params.push(platform)
    }

    query += ` ORDER BY c.status_changed_at DESC NULLS LAST, c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await dbPool.query(query, params)

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) FROM content c WHERE 1=1'
    const countParams: string[] = []
    let countParamIndex = 1

    if (status) {
      if (STATUS_GROUPS[status]) {
        const statuses = STATUS_GROUPS[status]
        const placeholders = statuses.map((_, i) => `$${countParamIndex + i}`).join(', ')
        countQuery += ` AND c.status IN (${placeholders})`
        statuses.forEach(s => countParams.push(s))
        countParamIndex += statuses.length
      } else {
        countQuery += ` AND c.status = $${countParamIndex++}`
        countParams.push(status)
      }
    }
    if (clientId) {
      countQuery += ` AND c.client_id = $${countParamIndex++}`
      countParams.push(clientId)
    }
    if (platform) {
      countQuery += ` AND c.platform = $${countParamIndex++}`
      countParams.push(platform)
    }

    const countResult = await dbPool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    // Get stats with new groupings
    const statsResult = await dbPool.query(`
      SELECT
        -- Active clients (distinct clients with non-posted content)
        COUNT(DISTINCT client_id) FILTER (WHERE status != 'posted') as active_clients,

        -- Drafts
        COUNT(*) FILTER (WHERE status = 'draft') as drafts,

        -- In Review (sent_for_review + client_reviewing)
        COUNT(*) FILTER (WHERE status IN ('sent_for_review', 'client_reviewing')) as in_review,

        -- Revisions Requested
        COUNT(*) FILTER (WHERE status = 'revisions_requested') as revisions,

        -- In Production (approved + internal_review + final_optimization + image_selection)
        COUNT(*) FILTER (WHERE status IN ('approved', 'internal_review', 'final_optimization', 'image_selection')) as in_production,

        -- Posted This Month
        COUNT(*) FILTER (
          WHERE status = 'posted'
          AND status_changed_at >= date_trunc('month', CURRENT_DATE)
        ) as posted_this_month,

        -- Legacy stats for backwards compatibility
        COUNT(*) FILTER (WHERE status IN ('pending_review', 'sent_for_review')) as pending_review,
        COUNT(*) FILTER (WHERE status IN ('revision', 'revisions_requested')) as revision,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status IN ('published', 'posted')) as published,
        COUNT(DISTINCT client_id) as clients_with_content
      FROM content
    `)

    return NextResponse.json({
      content: result.rows,
      total,
      stats: statsResult.rows[0]
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

// POST - Create new content
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const validated = await validateRequest(contentCreateSchema, request)
    if ((validated as any).error) return (validated as any).error

    const {
      clientId,
      title,
      contentType,
      platform,
      bodyContent,
      excerpt,
      urgent,
      deadline,
      targetKeyword,
      secondaryKeywords,
      wordCount,
      seoOptimized,
      aiOptimized,
      status = 'draft'
    } = (validated as any).data

    if (!clientId || !title) {
      return NextResponse.json({ error: 'Client and title are required' }, { status: 400 })
    }

    // Determine if approval is required based on client settings
    let approvalRequired = true
    try {
      const clientResult = await dbPool.query(
        'SELECT content_approval_mode, approval_threshold FROM clients WHERE id = $1',
        [clientId]
      )
      if (clientResult.rows.length > 0) {
        const client = clientResult.rows[0]
        if (client.content_approval_mode === 'auto') {
          approvalRequired = false
        } else if (client.content_approval_mode === 'initial_approval' && client.approval_threshold) {
          // Count approved content for this client
          const countResult = await dbPool.query(
            `SELECT COUNT(*) FROM content
             WHERE client_id = $1
             AND status IN ('approved', 'final_optimization', 'image_selection', 'scheduled', 'posted')`,
            [clientId]
          )
          approvalRequired = parseInt(countResult.rows[0].count) < client.approval_threshold
        }
      }
    } catch (err) {
      console.error('Error checking client approval mode:', err)
      // Default to requiring approval
    }

    // Handle wordCount - ensure it's a valid integer or null
    const validWordCount = (wordCount !== undefined && wordCount !== null && !isNaN(wordCount))
      ? parseInt(wordCount, 10)
      : null

    const result = await dbPool.query(
      `INSERT INTO content (
        client_id, title, content_type, platform, body, excerpt,
        urgent, deadline, target_keyword, secondary_keywords,
        word_count, seo_optimized, ai_optimized, status,
        approval_required, review_round, status_history, status_changed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      RETURNING *`,
      [
        clientId, title, contentType || null, platform || null, bodyContent || null, excerpt || null,
        urgent || false, deadline || null, targetKeyword || null, secondaryKeywords || null,
        validWordCount, seoOptimized || false, aiOptimized || false, status,
        approvalRequired, 0, JSON.stringify([{ status, changed_at: new Date().toISOString(), changed_by_name: profile.full_name || 'Unknown' }])
      ]
    )

    const newContent = result.rows[0]

    // Send email notification if submitting directly for review
    if (status === 'sent_for_review') {
      try {
        // Get client info for email
        const clientResult = await dbPool.query(
          'SELECT name, contact_email FROM clients WHERE id = $1',
          [clientId]
        )
        const client = clientResult.rows[0]

        console.log('POST: Checking email conditions:', {
          status,
          hasClientEmail: !!client?.contact_email,
          clientEmail: client?.contact_email,
          clientName: client?.name,
        })

        if (client?.contact_email) {
          const portalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://portal.pyrusdigitalmedia.com'}/content/review/${newContent.id}`

          const emailData = {
            recipientName: client.name || 'there',
            contentTitle: title,
            clientName: client.name || 'your company',
            changedByName: profile.full_name || 'Pyrus Team',
            portalUrl,
            reviewRound: 0,
          }

          const emailTemplate = getContentReadyForReviewEmail(emailData)

          console.log('POST: Sending email to:', client.contact_email)

          const emailResult = await sendEmail({
            to: client.contact_email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text,
            tags: ['content-review', 'new-content'],
          })

          console.log('POST: Email send result:', JSON.stringify(emailResult))
        } else {
          console.log('POST: No client email found - skipping notification')
        }
      } catch (emailError) {
        console.error('POST: Failed to send review notification email:', emailError)
      }
    }

    return NextResponse.json(newContent, { status: 201 })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
}
