'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

export function ClientSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  // Access flags
  const { isActive, hasResults, hasActivity, hasWebsite, hasWebsiteProducts, hasContent } = client.access

  // Helper to build href with viewingAs param preserved
  const buildHref = (path: string) => {
    if (viewingAs) {
      return `${path}?viewingAs=${viewingAs}`
    }
    return path
  }

  // Badge component
  const Badge = ({ type }: { type: 'coming-soon' | 'inactive' }) => (
    <span className={`nav-badge ${type}`}>
      {type === 'coming-soon' ? 'Coming Soon' : 'Inactive'}
    </span>
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
          <span>Getting Started</span>
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
          {!hasResults && isActive && <Badge type="coming-soon" />}
          {!isActive && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/activity')}
          className={`client-nav-item ${pathname === '/activity' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
          <span>Activity</span>
          {!hasActivity && isActive && <Badge type="coming-soon" />}
          {!isActive && <Badge type="inactive" />}
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
          {hasWebsiteProducts && !hasWebsite && <Badge type="coming-soon" />}
          {!hasWebsiteProducts && <Badge type="inactive" />}
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
          {!hasContent && <Badge type="inactive" />}
        </Link>
        <Link
          href={buildHref('/recommendations')}
          className={`client-nav-item ${pathname === '/recommendations' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span>Recommendations</span>
        </Link>
        <Link
          href={buildHref('/communication')}
          className={`client-nav-item ${pathname === '/communication' ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Communication</span>
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
