import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientSidebar } from '@/components/layout'
import type { Profile } from '@/types/database'

export default async function ClientLayout({
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
    .select('role')
    .eq('id', user.id)
    .single<Pick<Profile, 'role'>>()

  // If admin or super_admin trying to access client routes, redirect to admin
  // (unless they're in preview mode - handled by client-side state)
  if (profile?.role !== 'client') {
    // For now, allow admins to view client pages (for preview functionality)
    // The client pages will show admin controls when in preview mode
  }

  return (
    <div className="min-h-screen bg-client-background">
      <ClientSidebar />
      <div className="ml-64">
        {children}
      </div>
    </div>
  )
}
