import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientSidebar, PreviewBanner, ChatbotWidget } from '@/components/layout'
import { AlertBanner, AnnouncementPopup } from '@/components/client'
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
    .select('role, full_name')
    .eq('id', user.id)
    .single<Pick<Profile, 'role' | 'full_name'>>()

  // Admins can view as client with ?viewingAs param
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  return (
    <div className="client-layout">
      <Suspense fallback={null}>
        <ClientSidebar />
      </Suspense>
      <main className="client-main">
        <Suspense fallback={null}>
          <PreviewBanner />
        </Suspense>
        <Suspense fallback={null}>
          <AlertBanner />
        </Suspense>
        {children}
      </main>
      <Suspense fallback={null}>
        <ChatbotWidget />
      </Suspense>
      <Suspense fallback={null}>
        <AnnouncementPopup />
      </Suspense>
    </div>
  )
}
