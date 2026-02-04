import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { AdminSidebar } from '@/components/layout'
import type { Profile } from '@/types/database'

type AdminRole = 'super_admin' | 'admin' | 'production_team' | 'sales'

interface MenuPermissions {
  [menuKey: string]: boolean
}

export default async function AdminPrefixLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile to check role - use direct DB to bypass RLS recursion issue
  let profile: Pick<Profile, 'role' | 'full_name'> | null = null
  try {
    const profileResult = await dbPool.query(
      'SELECT role, full_name FROM profiles WHERE id = $1',
      [user.id]
    )
    if (profileResult.rows.length > 0) {
      profile = profileResult.rows[0]
    }
  } catch (error) {
    console.error('[AdminLayout] Failed to fetch profile:', error)
  }

  // Only admin roles can access admin routes
  if (profile?.role === 'client') {
    redirect('/getting-started')
  }

  // Map database role to sidebar role
  const getSidebarRole = (dbRole: string | undefined): AdminRole => {
    switch (dbRole) {
      case 'super_admin':
        return 'super_admin'
      case 'admin':
        return 'admin'
      case 'sales':
        return 'sales'
      case 'production_team':
      default:
        return 'production_team'
    }
  }

  const sidebarRole = getSidebarRole(profile?.role)

  // Fetch permissions for the user's role from database
  let permissions: MenuPermissions = {}
  try {
    const result = await dbPool.query(
      `SELECT menu_key, has_access FROM role_permissions WHERE role = $1`,
      [profile?.role || 'production_team']
    )
    for (const row of result.rows) {
      permissions[row.menu_key] = row.has_access
    }
  } catch (error) {
    // If permissions fetch fails, fallback to empty (sidebar will use default logic)
    console.error('Failed to fetch role permissions:', error)
  }

  return (
    <div className="admin-layout">
      <AdminSidebar role={sidebarRole} permissions={permissions} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}
