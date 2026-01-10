'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

export function PreviewBanner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)

  if (!viewingAs) return null

  const handleExitPreview = () => {
    // Redirect back to the admin client detail page
    router.push(`/admin/clients/${viewingAs}`)
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
