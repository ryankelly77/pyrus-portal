import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { validateRequest } from '@/lib/validation/validateRequest'
import { contentCreateSchema } from '@/lib/validation/schemas'

export const dynamic = 'force-dynamic'

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

    if (status) {
      query += ` AND c.status = $${paramIndex++}`
      params.push(status)
    }
    if (clientId) {
      query += ` AND c.client_id = $${paramIndex++}`
      params.push(clientId)
    }
    if (platform) {
      query += ` AND c.platform = $${paramIndex++}`
      params.push(platform)
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await dbPool.query(query, params)

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM content c WHERE 1=1'
    const countParams: string[] = []
    let countParamIndex = 1

    if (status) {
      countQuery += ` AND c.status = $${countParamIndex++}`
      countParams.push(status)
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

    // Get stats
    const statsResult = await dbPool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'draft') as drafts,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending_review,
        COUNT(*) FILTER (WHERE status = 'revision') as revision,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'published') as published,
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

    const result = await dbPool.query(
      `INSERT INTO content (
        client_id, title, content_type, platform, body, excerpt,
        urgent, deadline, target_keyword, secondary_keywords,
        word_count, seo_optimized, ai_optimized, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        clientId, title, contentType, platform, bodyContent, excerpt,
        urgent || false, deadline || null, targetKeyword, secondaryKeywords,
        wordCount, seoOptimized || false, aiOptimized || false, status
      ]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating content:', error)
    return NextResponse.json({ error: 'Failed to create content' }, { status: 500 })
  }
}
