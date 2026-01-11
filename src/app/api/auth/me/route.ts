import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { dbPool } from '@/lib/db'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  try {
    const result = await dbPool.query(
      `SELECT role, client_id FROM profiles WHERE id = $1`,
      [user.id]
    )

    const profile = result.rows[0]

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: profile?.role || null,
      client_id: profile?.client_id || null
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
