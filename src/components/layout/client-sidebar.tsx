'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { useState, useEffect } from 'react'

export function ClientSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  const [smartRecsCount, setSmartRecsCount] = useState(0)

  // Fetch smart recommendations count
  const fetchSmartRecsCount = async () => {
    try {
      const url = viewingAs
        ? `/api/admin/clients/${viewingAs}/smart-recommendations`
        : '/api/client/smart-recommendations'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        // Count only active items (not declined or purchased)
        if (viewingAs) {
          const items = data.recommendation?.items || []
          const activeCount = items.filter((item: { status?: string }) =>
            !item.status || item.status === 'active'
          ).length
          setSmartRecsCount(activeCount)
        } else {
          // Client API already filters to active items only
          setSmartRecsCount(data.items?.length || 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch smart recommendations count:', error)
    }
  }

  useEffect(() => {
    if (!loading) {
      fetchSmartRecsCount()
    }
  }, [viewingAs, loading])

  // Listen for recommendation changes to refresh the count
  useEffect(() => {
    const handleRecommendationChange = () => {
      fetchSmartRecsCount()
    }
    window.addEventListener('recommendation-changed', handleRecommendationChange)
    return () => {
      window.removeEventListener('recommendation-changed', handleRecommendationChange)
    }
  }, [viewingAs])

  // Show minimal skeleton while loading to prevent flash
  if (loading) {
    return (
      <aside className="client-sidebar">
        <div className="client-logo">
          <Image
            src="/pyrus-logo-icon.png"
            alt="Pyrus"
            width={28}
            height={28}
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <span>Pyrus Portal</span>
        </div>
        <nav className="client-nav">
          {/* Loading skeleton for nav items */}
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="client-nav-item" style={{ opacity: 0.3, pointerEvents: 'none' }}>
              <div style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}></div>
              <div style={{ width: 80, height: 14, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}></div>
            </div>
          ))}
        </nav>
      </aside>
    )
  }

  // Check if client is pending (prospect with recommendation only)
  const isPending = client.status === 'pending'

  // Calculate onboarding status: < 30 days AND no completion timestamp
  const clientAgeInDays = client.startDate
    ? Math.floor((Date.now() - new Date(client.startDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0
  const isOnboarding = !isPending && clientAgeInDays < 30 && !client.onboardingCompletedAt

  // Access flags (only relevant for active clients)
  const { isActive, hasResults, hasActivity, hasWebsite, hasWebsiteProducts, hasContent, hasContentProducts } = client.access

  // Helper to build href with viewingAs param preserved
  const buildHref = (path: string) => {
    if (viewingAs) {
      return `${path}?viewingAs=${viewingAs}`
    }
    return path
  }

  // Badge component for text badges
  const Badge = ({ type }: { type: 'coming-soon' | 'inactive' }) => (
    <span className={`nav-badge ${type}`}>
      {type === 'coming-soon' ? 'Coming Soon' : 'Inactive'}
    </span>
  )

  // Lock icon for pending clients
  const LockIcon = () => (
    <svg className="nav-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  )

  return (
    <aside className="client-sidebar">
      <div className="client-logo">
        <Image
          src="/pyrus-logo-icon.png"
          alt="Pyrus"
          width={28}
          height={28}
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <span>Pyrus Portal</span>
      </div>
      <nav className="client-nav">
        <Link
          href={buildHref('/getting-started')}
          className={`client-nav-item ${pathname === '/getting-started' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span>{isOnboarding ? 'Getting Started' : 'Welcome'}</span>
        </Link>
        <Link
          href={buildHref('/results')}
          className={`client-nav-item ${pathname === '/results' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          <span>Results</span>
          {isPending && <LockIcon />}
          {!isPending && !hasResults && isActive && <Badge type="coming-soon" />}
          {!isPending && !isActive && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/activity')}
          className={`client-nav-item ${pathname === '/activity' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Activity</span>
          {isPending && <LockIcon />}
          {!isPending && !hasActivity && isActive && <Badge type="coming-soon" />}
          {!isPending && !isActive && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/website')}
          className={`client-nav-item ${pathname === '/website' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>Website</span>
          {isPending && <LockIcon />}
          {!isPending && hasWebsiteProducts && !hasWebsite && <Badge type="coming-soon" />}
          {!isPending && !hasWebsiteProducts && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/content')}
          className={`client-nav-item ${pathname === '/content' || pathname.startsWith('/content/') ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span>Content</span>
          {isPending && <LockIcon />}
          {!isPending && hasContentProducts && !hasContent && <Badge type="coming-soon" />}
          {!isPending && !hasContentProducts && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/recommendations')}
          className={`client-nav-item ${pathname === '/recommendations' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Recommendations</span>
          {smartRecsCount > 0 && (
            <span className={`nav-badge count${pathname === '/recommendations' ? ' active' : ''}`}>{smartRecsCount}</span>
          )}
        </Link>
        <Link
          href={buildHref('/communication')}
          className={`client-nav-item ${pathname === '/communication' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Communication</span>
          {isPending && <LockIcon />}
        </Link>
        <Link
          href={buildHref('/settings')}
          className={`client-nav-item ${pathname === '/settings' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
          <span>Settings</span>
        </Link>
        <div className="nav-spacer"></div>
        <Link href="/login" className="client-nav-item nav-logout">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Logout</span>
        </Link>
      </nav>
    </aside>
  )
}
