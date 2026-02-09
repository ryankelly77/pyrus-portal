import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get content details for client view
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get the user's client_id from their profile
    const profileResult = await dbPool.query(
      'SELECT client_id FROM profiles WHERE id = $1',
      [user.id]
    )

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const clientId = profileResult.rows[0].client_id

    // Fetch the content - ensure it belongs to the user's client
    const contentResult = await dbPool.query(
      `SELECT
        c.*,
        cl.name as client_name
      FROM content c
      LEFT JOIN clients cl ON cl.id = c.client_id
      WHERE c.id = $1`,
      [id]
    )

    if (contentResult.rows.length === 0) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    const content = contentResult.rows[0]

    // Verify the content belongs to the user's client (unless user is admin)
    const isAdmin = await checkIfAdmin(user.id)
    if (!isAdmin && content.client_id !== clientId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(content)
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
  }
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  try {
    const result = await dbPool.query(
      'SELECT role FROM profiles WHERE id = $1',
      [userId]
    )
    if (result.rows.length === 0) return false
    const adminRoles = ['super_admin', 'admin', 'production_team', 'sales']
    return adminRoles.includes(result.rows[0].role)
  } catch {
    return false
  }
}
