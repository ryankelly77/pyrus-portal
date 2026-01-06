import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout'
import type { Profile } from '@/types/database'

type AdminRole = 'super_admin' | 'production_team' | 'sales'

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

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single<Pick<Profile, 'role' | 'full_name'>>()

  // Only admin roles can access admin routes
  if (profile?.role === 'client') {
    redirect('/getting-started')
  }

  // Map database role to sidebar role
  const getSidebarRole = (dbRole: string | undefined): AdminRole => {
    switch (dbRole) {
      case 'super_admin':
        return 'super_admin'
      case 'sales':
        return 'sales'
      case 'production_team':
      case 'admin':
      default:
        return 'production_team'
    }
  }

  const sidebarRole = getSidebarRole(profile?.role)

  return (
    <div className="admin-layout">
      <AdminSidebar role={sidebarRole} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}
