import { createClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/components/layout'
import type { Profile } from '@/types/database'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile for header (user is guaranteed by layout)
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single<Pick<Profile, 'full_name'>>() : { data: null }

  const userName = profile?.full_name || 'Admin'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <AdminHeader
        title="Clients"
        user={{ name: userName, initials: userInitials }}
        hasNotifications={true}
      />
      <main className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            Manage your client accounts and view their marketing performance
          </p>
          <button className="btn btn-primary h-10 px-4 flex items-center gap-2">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Client
          </button>
        </div>

        {/* Placeholder for clients grid */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No clients yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Get started by adding your first client
          </p>
          <button className="btn btn-primary h-9 px-4 text-sm">
            Add Your First Client
          </button>
        </div>
      </main>
    </>
  )
}
