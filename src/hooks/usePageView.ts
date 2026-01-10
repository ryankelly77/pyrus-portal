'use client'

import { useEffect } from 'react'

interface PageViewOptions {
  page: string
  pageName: string
}

export function usePageView({ page, pageName }: PageViewOptions) {
  useEffect(() => {
    // Only log once per session per page
    const sessionKey = `pyrus_page_view_${page}`
    if (sessionStorage.getItem(sessionKey)) return
    sessionStorage.setItem(sessionKey, 'true')

    async function logPageView() {
      try {
        await fetch('/api/client/page-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, pageName })
        })
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.error('Failed to log page view:', error)
      }
    }

    logPageView()
  }, [page, pageName])
}
