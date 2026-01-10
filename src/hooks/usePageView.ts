'use client'

import { useEffect, useRef } from 'react'

interface PageViewOptions {
  page: string
  pageName: string
}

export function usePageView({ page, pageName }: PageViewOptions) {
  const logged = useRef(false)

  useEffect(() => {
    // Only log once per page mount
    if (logged.current) return
    logged.current = true

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
