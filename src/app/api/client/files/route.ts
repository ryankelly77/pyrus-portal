import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET - List files for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let clientId = searchParams.get('clientId')

    // If no clientId provided, get from current user's profile
    if (!clientId) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
      }

      const profileResult = await dbPool.query(
        'SELECT client_id FROM profiles WHERE id = $1',
        [user.id]
      )

      if (profileResult.rows.length === 0 || !profileResult.rows[0].client_id) {
        return NextResponse.json({ error: 'No client associated with user' }, { status: 404 })
      }

      clientId = profileResult.rows[0].client_id
    }

    const result = await dbPool.query(
      `SELECT
        id,
        name,
        type,
        category,
        url,
        created_at
       FROM client_files
       WHERE client_id = $1
       ORDER BY created_at DESC`,
      [clientId]
    )

    // Format for frontend
    const files = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      url: row.url,
      date: new Date(row.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    }))

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error fetching client files:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}
