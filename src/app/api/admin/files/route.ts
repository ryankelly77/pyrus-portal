import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET - List files (optionally filtered by client)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')

    let query = `
      SELECT
        cf.*,
        c.name as client_name,
        p.full_name as created_by_name
      FROM client_files cf
      LEFT JOIN clients c ON c.id = cf.client_id
      LEFT JOIN profiles p ON p.id = cf.created_by
    `
    const params: string[] = []

    if (clientId) {
      query += ` WHERE cf.client_id = $1`
      params.push(clientId)
    }

    query += ` ORDER BY cf.created_at DESC`

    const result = await dbPool.query(query, params)

    return NextResponse.json({ files: result.rows })
  } catch (error) {
    console.error('Error fetching files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

// POST - Create a new file
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user } = auth

    const body = await request.json()
    const { clientId, name, type, category, url } = body

    if (!clientId || !name || !type || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, name, type, category' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['docs', 'images', 'video'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be: docs, images, or video' },
        { status: 400 }
      )
    }

    const result = await dbPool.query(
      `INSERT INTO client_files (client_id, name, type, category, url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [clientId, name, type, category, url || null, user.id]
    )

    return NextResponse.json({ file: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating file:', error)
    return NextResponse.json({ error: 'Failed to create file' }, { status: 500 })
  }
}
