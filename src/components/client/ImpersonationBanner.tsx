'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ImpersonationBanner() {
  const router = useRouter()
  const [userName, setUserName] = useState<string | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Read the impersonating_user_name cookie
    const cookies = document.cookie.split(';')
    const nameCookie = cookies.find(c => c.trim().startsWith('impersonating_user_name='))
    if (nameCookie) {
      const name = decodeURIComponent(nameCookie.split('=')[1])
      setUserName(name)
    }
  }, [])

  const handleExit = async () => {
    setExiting(true)
    try {
      const res = await fetch('/api/admin/users/impersonate', {
        method: 'DELETE',
      })
      if (res.ok) {
        // Force full page reload to ensure server-side layout re-runs
        window.location.href = '/admin/users'
      }
    } catch (error) {
      console.error('Failed to exit impersonation:', error)
      setExiting(false)
    }
  }

  if (!userName) return null

  return (
    <>
      <div className="impersonation-banner">
        <div className="impersonation-content">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
          <span>
            Viewing as <strong>{userName}</strong>
          </span>
        </div>
        <button
          className="impersonation-exit-btn"
          onClick={handleExit}
          disabled={exiting}
        >
          {exiting ? 'Exiting...' : 'Exit Impersonation'}
        </button>
      </div>

      <style jsx>{`
        .impersonation-banner {
          position: sticky;
          top: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
          color: white;
          font-size: 14px;
        }

        .impersonation-content {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .impersonation-content strong {
          font-weight: 600;
        }

        .impersonation-exit-btn {
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .impersonation-exit-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }

        .impersonation-exit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </>
  )
}
