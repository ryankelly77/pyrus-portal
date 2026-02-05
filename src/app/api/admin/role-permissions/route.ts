import { NextRequest, NextResponse } from 'next/server'
import { dbPool } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/requireAdmin'

export const dynamic = 'force-dynamic'

// Menu items configuration
const MENU_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'recommendations', label: 'Recommendations' },
  { key: 'clients', label: 'Clients' },
  { key: 'users', label: 'Users' },
  { key: 'content', label: 'Content' },
  { key: 'websites', label: 'Websites' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'products', label: 'Products' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'revenue', label: 'Revenue / MRR' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'performance', label: 'Performance' },
  { key: 'settings', label: 'Settings' },
  { key: 'alerts', label: 'System Alerts' },
]

const ROLES = ['super_admin', 'admin', 'production_team', 'sales']

// GET /api/admin/role-permissions - Get all role permissions
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    const result = await dbPool.query(
      `SELECT role, menu_key, has_access
       FROM role_permissions
       ORDER BY role, menu_key`
    )

    // Group permissions by role
    const permissions: Record<string, Record<string, boolean>> = {}

    for (const role of ROLES) {
      permissions[role] = {}
      for (const menuItem of MENU_ITEMS) {
        permissions[role][menuItem.key] = false
      }
    }

    for (const row of result.rows) {
      if (permissions[row.role]) {
        permissions[row.role][row.menu_key] = row.has_access
      }
    }

    return NextResponse.json({
      permissions,
      menuItems: MENU_ITEMS,
      roles: ROLES,
    })
  } catch (error) {
    console.error('Error fetching role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role permissions' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/role-permissions - Update permissions for a role (super_admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (auth instanceof NextResponse) return auth

    // Only super_admin can modify role permissions
    if (auth.profile.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Only super admins can modify role permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { role, permissions } = body as {
      role: string
      permissions: Record<string, boolean>
    }

    // Validate role
    if (!ROLES.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Cannot modify super_admin permissions (always has full access)
    if (role === 'super_admin') {
      return NextResponse.json(
        { error: 'Cannot modify super_admin permissions' },
        { status: 400 }
      )
    }

    // Update each permission
    for (const [menuKey, hasAccess] of Object.entries(permissions)) {
      const validMenuKey = MENU_ITEMS.find(m => m.key === menuKey)
      if (!validMenuKey) continue

      await dbPool.query(
        `UPDATE role_permissions
         SET has_access = $1, updated_at = NOW()
         WHERE role = $2 AND menu_key = $3`,
        [hasAccess, role, menuKey]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update role permissions' },
      { status: 500 }
    )
  }
}
