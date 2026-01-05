import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/layout'
import type { Profile } from '@/types/database'

export default async function AdminLayout({
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

  // Only admin and super_admin can access admin routes
  if (profile?.role === 'client') {
    redirect('/getting-started')
  }

  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <div className="min-h-screen bg-admin-background">
      <AdminSidebar isSuperAdmin={isSuperAdmin} />
      <div className="ml-64">
        {children}
      </div>
    </div>
  )
}
