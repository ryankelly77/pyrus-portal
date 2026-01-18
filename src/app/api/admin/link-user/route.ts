import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { validateRequest } from '@/lib/validation/validateRequest'
import { linkUserSchema } from '@/lib/validation/schemas'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// POST /api/admin/link-user - Link a user to a client (admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const validated = await validateRequest(linkUserSchema, request)
    if ((validated as any).error) return (validated as any).error

    const { userEmail, clientId, clientName } = (validated as any).data

    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 })
    }

    // Find the user by email
    const userResult = await dbPool.query(
      `SELECT id FROM profiles WHERE LOWER(email) = LOWER($1)`,
      [userEmail]
    )
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const userId = userResult.rows[0].id

    // Find the client
    let foundClientId = clientId
    if (!foundClientId && clientName) {
      const clientResult = await dbPool.query(
        `SELECT id FROM clients WHERE LOWER(name) LIKE LOWER($1) LIMIT 1`,
        [`%${clientName}%`]
      )
      if (clientResult.rows.length === 0) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      foundClientId = clientResult.rows[0].id
    }

    if (!foundClientId) {
      return NextResponse.json({ error: 'clientId or clientName is required' }, { status: 400 })
    }

    // Link the user to the client
    await dbPool.query(
      `UPDATE profiles SET client_id = $1 WHERE id = $2`,
      [foundClientId, userId]
    )

    return NextResponse.json({ success: true, userId, clientId: foundClientId })
  } catch (error) {
    console.error('Error linking user:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// GET /api/admin/link-user?search=xxx - Search for clients
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    const { user, profile } = auth

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const clients = await dbPool.query(
      `SELECT id, name, contact_name, contact_email
       FROM clients
       WHERE LOWER(name) LIKE LOWER($1)
          OR LOWER(contact_name) LIKE LOWER($1)
          OR LOWER(contact_email) LIKE LOWER($1)
       ORDER BY name
       LIMIT 20`,
      [`%${search}%`]
    )

    return NextResponse.json({ clients: clients.rows })
  } catch (error) {
    console.error('Error searching clients:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
