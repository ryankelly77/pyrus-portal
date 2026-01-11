'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface PageViewOptions {
  page: string
  pageName: string
}

export function usePageView({ page, pageName }: PageViewOptions) {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')

  useEffect(() => {
    // Only log once per session per page (include viewingAs in key for admin preview)
    const sessionKey = `pyrus_page_view_${page}${viewingAs ? `_${viewingAs}` : ''}`
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, 'true')

    async function logPageView() {
      try {
        await fetch('/api/client/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page,
            pageName,
            clientId: viewingAs || undefined
          })
        })
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.error('Failed to log page view:', error)
      }
    }

    logPageView()
  }, [page, pageName, viewingAs])
}
