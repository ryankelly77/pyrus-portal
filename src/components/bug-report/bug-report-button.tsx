'use client'

import { useState, useEffect } from 'react'
import { BugReportModal } from './bug-report-modal'
import { useDiagnosticCapture } from '@/hooks/use-diagnostic-capture'
import './bug-report.css'

interface BugReportButtonProps {
  // Only show for authenticated users
  isAuthenticated?: boolean
  // Position: 'bottom-right' for admin, 'middle-right' for client pages (avoids chatbot)
  position?: 'bottom-right' | 'middle-right'
}

export function BugReportButton({ isAuthenticated = false, position = 'bottom-right' }: BugReportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Initialize diagnostic capture (console, network, errors)
  useDiagnosticCapture()

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render for unauthenticated users
  if (!mounted || !isAuthenticated) {
    return null
  }

  return (
    <>
      <button
        className={`bug-report-fab ${position === 'middle-right' ? 'bug-report-fab-middle' : ''}`}
        onClick={() => setIsModalOpen(true)}
        aria-label="Report a bug"
        title="Report a bug"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v3H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a5 5 0 0 0 10 0h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-1v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
        </svg>
      </button>

      <BugReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  )
}
