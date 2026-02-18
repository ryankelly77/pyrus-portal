import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/admin/profile - Get current admin user's profile
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile info
    const profileResult = await dbPool.query(
      `SELECT id, email, full_name, role, avatar_url FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const profile = profileResult.rows[0]

    // Only allow admin roles
    if (profile.role === 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const nameParts = (profile.full_name || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    return NextResponse.json({
      firstName,
      lastName,
      email: profile.email,
      profilePhotoUrl: profile.avatar_url,
      role: profile.role,
    })
  } catch (error) {
    console.error('Error fetching admin profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/profile - Update admin user's profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const profileCheck = await dbPool.query(
      `SELECT role FROM profiles WHERE id = $1`,
      [user.id]
    )

    if (profileCheck.rows.length === 0 || profileCheck.rows[0].role === 'client') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email, profilePhotoUrl } = body

    // Build dynamic update query
    const updates: string[] = []
    const values: (string | null)[] = []
    let paramIndex = 1

    if (firstName !== undefined || lastName !== undefined) {
      const currentProfile = await dbPool.query(
        `SELECT full_name FROM profiles WHERE id = $1`,
        [user.id]
      )
      const currentName = currentProfile.rows[0]?.full_name || ''
      const currentParts = currentName.split(' ')
      const newFirst = firstName !== undefined ? firstName : currentParts[0] || ''
      const newLast = lastName !== undefined ? lastName : currentParts.slice(1).join(' ') || ''
      const fullName = `${newFirst} ${newLast}`.trim()

      updates.push(`full_name = $${paramIndex++}`)
      values.push(fullName)
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(email)
    }

    if (profilePhotoUrl !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`)
      values.push(profilePhotoUrl)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(user.id)

    await dbPool.query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating admin profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
