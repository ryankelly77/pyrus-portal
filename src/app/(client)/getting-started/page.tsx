import { createClient } from '@/lib/supabase/server'
import { ClientHeader } from '@/components/layout'
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import type { Profile } from '@/types/database'

export default async function GettingStartedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user profile for header (user is guaranteed by layout)
  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single<Pick<Profile, 'full_name'>>() : { data: null }

  const userName = profile?.full_name || 'User'
  const userInitials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Sample checklist items (would come from database)
  const checklistItems = [
    { id: 1, title: 'Create your portal account', description: 'Completed Jan 2, 2026', completed: true },
    { id: 2, title: 'Website launched', description: 'tc-clinicalservices.com is live', completed: true },
    { id: 3, title: 'Google Business Profile claimed', description: 'Your business is verified on Google', completed: true },
    { id: 4, title: 'SEO campaign activated', description: '47 keywords now being tracked', completed: true },
    { id: 5, title: 'Google Ads campaign launched', description: 'Generating 28 leads per month', completed: true },
    { id: 6, title: 'Connect social media accounts', description: 'Link Facebook and LinkedIn for enhanced tracking', completed: false },
  ]

  const completedCount = checklistItems.filter(item => item.completed).length
  const totalCount = checklistItems.length
  const progressPercent = Math.round((completedCount / totalCount) * 100)

  return (
    <>
      <ClientHeader
        title="Getting Started"
        user={{ name: userName, initials: userInitials }}
        hasNotifications={true}
      />
      <main className="p-6">
        {/* Client Header Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-admin-primary flex items-center justify-center">
                <span className="text-white text-xl font-semibold">TC</span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">TC Clinical Services</h1>
                  <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  dlg.mdservices@gmail.com • Client since Sep 2025 • 4 services
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button className="px-4 py-2.5 text-sm font-medium text-client-primary border-b-2 border-client-primary -mb-px">
            Getting Started
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            Results
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            Activity
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            Content
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            Communication
          </button>
          <button className="px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700">
            Recommendations
          </button>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-3 gap-6">
          {/* Checklist Card */}
          <div className="col-span-2 bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Onboarding Checklist</h3>
              <p className="text-sm text-gray-500 mt-1">Complete these steps to get the most from your marketing</p>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900 font-medium">{completedCount} of {totalCount} completed</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-client-primary rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="divide-y divide-gray-100">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                  {item.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.completed ? 'text-gray-500' : 'text-gray-900'}`}>
                      {item.title}
                    </p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  {!item.completed && (
                    <button className="px-3 py-1.5 text-sm font-medium text-client-primary bg-client-primary/10 rounded hover:bg-client-primary/20 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Getting Started Video */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5 text-client-primary" />
                <h4 className="font-semibold text-gray-900">Getting Started Video</h4>
              </div>
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors">
                    <svg className="w-6 h-6 text-client-primary ml-1" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                </div>
                <span className="absolute bottom-2 right-2 px-2 py-1 text-xs font-medium bg-black/70 text-white rounded">
                  2:45
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Learn how to navigate your portal, track results, and get the most from your marketing partnership.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
