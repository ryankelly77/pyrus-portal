import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// GET /api/admin/users - Get all users (admin and client)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth
    // Auth already verified by requireAdmin - user and profile available if needed

    // Fetch admin users
    const adminsResult = await dbPool.query(
      `SELECT
        p.id,
        p.full_name as name,
        p.email,
        p.role,
        p.avatar_url,
        p.created_at
      FROM profiles p
      WHERE p.role IN ('admin', 'super_admin', 'production_team', 'sales')
      ORDER BY p.created_at ASC`
    )

    const adminUsers = adminsResult.rows.map(admin => {
      const initials = (admin.name || admin.email || 'U')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      return {
        id: admin.id,
        name: admin.name || admin.email?.split('@')[0] || 'Unknown',
        initials,
        email: admin.email,
        role: admin.role || 'admin',
        status: 'registered',
        avatarColor: getAvatarColor(admin.id),
      }
    })

    // Fetch client users (profiles with client_id set)
    const clientUsersResult = await dbPool.query(
      `SELECT
        p.id,
        p.full_name as name,
        p.email,
        p.client_id,
        p.created_at,
        c.name as client_name
      FROM profiles p
      JOIN clients c ON c.id = p.client_id
      WHERE p.client_id IS NOT NULL
        AND (p.role IS NULL OR p.role NOT IN ('admin', 'super_admin', 'production_team', 'sales'))
      ORDER BY p.created_at DESC`
    )

    const clientUsers = clientUsersResult.rows.map(clientUser => {
      const initials = (clientUser.name || clientUser.email || 'U')
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

      return {
        id: clientUser.id,
        name: clientUser.name || clientUser.email?.split('@')[0] || 'Unknown',
        initials,
        email: clientUser.email,
        clientId: clientUser.client_id,
        clientName: clientUser.client_name,
        status: 'registered',
        avatarColor: getAvatarColor(clientUser.id),
      }
    })

    // Get list of unique clients for the filter dropdown
    const clientsResult = await dbPool.query(
      `SELECT DISTINCT c.id, c.name
       FROM clients c
       JOIN profiles p ON p.client_id = c.id
       ORDER BY c.name`
    )
    const clients = clientsResult.rows.map(c => ({ id: c.id, name: c.name }))

    return NextResponse.json({
      adminUsers,
      clientUsers,
      clients,
      currentUserRole: auth.profile.role,
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// Generate consistent avatar color from user ID
function getAvatarColor(id: string): string {
  const colors = [
    '#3B82F6', // blue
    '#8B5CF6', // purple
    '#059669', // green
    '#DC2626', // red
    '#D97706', // amber
    '#7C3AED', // violet
    '#2563EB', // blue-600
    '#0891B2', // cyan
  ]

  // Simple hash from ID
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }

  return colors[Math.abs(hash) % colors.length]
}
