import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { dbPool } from '@/lib/prisma'
import { AdminSidebar } from '@/components/layout'
import type { Profile } from '@/types/database'

type AdminRole = 'super_admin' | 'admin' | 'production_team' | 'sales'

interface MenuPermissions {
  [menuKey: string]: boolean
}

// Map URL paths to menu keys
const pathToMenuKey: { [path: string]: string } = {
  '/admin/dashboard': 'dashboard',
  '/admin/recommendations': 'recommendations',
  '/admin/recommendation-builder': 'recommendations',
  '/admin/clients': 'clients',
  '/admin/users': 'users',
  '/admin/content': 'content',
  '/admin/websites': 'websites',
  '/admin/notifications': 'notifications',
  '/admin/products': 'products',
  '/admin/rewards': 'rewards',
  '/admin/revenue': 'revenue',
  '/admin/pipeline': 'pipeline',
  '/admin/performance': 'performance',
  '/admin/settings': 'settings',
  '/admin/alerts': 'alerts',
}

// Menu items in order of priority for finding first accessible
const menuOrder = [
  { key: 'dashboard', path: '/admin/dashboard' },
  { key: 'recommendations', path: '/admin/recommendations' },
  { key: 'clients', path: '/admin/clients' },
  { key: 'users', path: '/admin/users' },
  { key: 'content', path: '/admin/content' },
  { key: 'websites', path: '/admin/websites' },
  { key: 'notifications', path: '/admin/notifications' },
  { key: 'products', path: '/admin/products' },
  { key: 'rewards', path: '/admin/rewards' },
  { key: 'revenue', path: '/admin/revenue' },
  { key: 'pipeline', path: '/admin/pipeline' },
  { key: 'performance', path: '/admin/performance' },
  { key: 'settings', path: '/admin/settings' },
  { key: 'alerts', path: '/admin/alerts' },
]

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

  // Check if user has access to the current page (super_admin always has access)
  if (sidebarRole !== 'super_admin' && Object.keys(permissions).length > 0) {
    const headersList = await headers()
    const pathname = headersList.get('x-pathname') || headersList.get('x-invoke-path') || ''

    // Find the menu key for the current path
    let currentMenuKey: string | null = null
    for (const [path, key] of Object.entries(pathToMenuKey)) {
      if (pathname.startsWith(path)) {
        currentMenuKey = key
        break
      }
    }

    // If we found a menu key and user doesn't have access, redirect to first accessible page
    if (currentMenuKey && permissions[currentMenuKey] === false) {
      const firstAccessible = menuOrder.find(item => permissions[item.key] === true)
      if (firstAccessible) {
        redirect(firstAccessible.path)
      }
    }
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
