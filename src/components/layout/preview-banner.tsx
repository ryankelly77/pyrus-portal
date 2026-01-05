'use client'

import { useSearchParams, useRouter } from 'next/navigation'

interface PreviewBannerProps {
  clientName: string
}

export function PreviewBanner({ clientName }: PreviewBannerProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const viewingAs = searchParams.get('viewingAs')

  if (!viewingAs) return null

  const handleExitPreview = () => {
    router.push('/dashboard')
  }

  return (
    <div className="view-mode-banner">
      <div className="banner-text">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        Viewing as client: {clientName}
      </div>
      <button className="btn-exit-preview" onClick={handleExitPreview}>
        Exit Preview
      </button>
    </div>
  )
}
