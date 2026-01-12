'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

export function PreviewBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)

  if (!viewingAs) return null

  const isDemo = viewingAs === DEMO_CLIENT_ID

  const handleExitPreview = () => {
    if (isDemo) {
      // For demo, go back to clients overview
      router.push('/admin/clients')
    } else {
      // Redirect back to the admin client detail page
      router.push(`/admin/clients/${viewingAs}`)
    }
  }

  // Demo mode banner
  if (isDemo) {
    return (
      <div className="view-mode-banner demo-mode">
        <div className="banner-text">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          Demo Mode - Exploring Client Portal
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
