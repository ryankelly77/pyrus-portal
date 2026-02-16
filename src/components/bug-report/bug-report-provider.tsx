'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BugReportButton } from './bug-report-button'

/**
 * Provider component that checks authentication and renders the bug report button.
 * This should be placed in the root layout.
 */
export function BugReportProvider() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    // Check if user is authenticated by calling the auth endpoint
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setIsAuthenticated(!!data.id)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [])

  // Determine position based on path
  // Admin pages use bottom-right, client pages use middle-right to avoid chatbot
  const isAdminPage = pathname?.startsWith('/admin')
  const position = isAdminPage ? 'bottom-right' : 'middle-right'

  return <BugReportButton isAuthenticated={isAuthenticated} position={position} />
}
