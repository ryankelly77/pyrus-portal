'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

// Pages that support demo state switching
const DEMO_STATE_PAGES = ['/content', '/website', '/results', '/activity', '/recommendations']

// Get state options based on the current page
function getStateOptionsForPage(pathname: string) {
  const baseStates = [
    { value: null, label: 'Active' },
    { value: 'coming-soon', label: 'Coming Soon' },
    { value: 'locked', label: 'Locked' }
  ]

  // Only Content and Website have Upsell state
  if (pathname === '/content' || pathname === '/website') {
    return [...baseStates, { value: 'upsell', label: 'Upsell' }]
  }

  return baseStates
}

export function PreviewBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const viewingAs = searchParams.get('viewingAs')
  const demoState = searchParams.get('demoState')
  const { client, loading } = useClientData(viewingAs)

  if (!viewingAs) return null

  const isDemo = viewingAs === DEMO_CLIENT_ID
  const showStateSelector = isDemo && DEMO_STATE_PAGES.includes(pathname)

  const handleExitPreview = () => {
    if (isDemo) {
      router.push('/admin/clients')
    } else {
      router.push(`/admin/clients/${viewingAs}`)
    }
  }

  const handleStateChange = (state: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (state) {
      params.set('demoState', state)
    } else {
      params.delete('demoState')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Demo mode banner with state selector
  if (isDemo) {
    return (
      <div className="view-mode-banner demo-mode">
        <div className="banner-left">
          <div className="banner-text">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Demo Mode
          </div>
          {showStateSelector && (
            <div className="demo-state-buttons">
              <span className="state-label">View:</span>
              {getStateOptionsForPage(pathname).map((state) => (
                <button
                  key={state.value ?? 'active'}
                  onClick={() => handleStateChange(state.value)}
                  className={`demo-state-btn ${(!demoState && !state.value) || demoState === state.value ? 'active' : ''}`}
                >
                  {state.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn-exit-preview" onClick={handleExitPreview}>
          Exit Demo
        </button>
      </div>
    )
  }

  return (
    <div className="view-mode-banner">
      <div className="banner-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Viewing as client: {client.name}
      </div>
      <button className="btn-exit-preview" onClick={handleExitPreview}>
        Exit Preview
      </button>
    </div>
  )
}
