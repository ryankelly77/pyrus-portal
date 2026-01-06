'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

type AdminRole = 'super_admin' | 'production_team' | 'sales'

interface AdminSidebarProps {
  role?: AdminRole
  isSuperAdmin?: boolean // Backwards compatible
}

export function AdminSidebar({ role, isSuperAdmin = true }: AdminSidebarProps) {
  const pathname = usePathname()

  // Determine effective role - support both new role prop and legacy isSuperAdmin
  const effectiveRole: AdminRole = role || (isSuperAdmin ? 'super_admin' : 'production_team')

  // Sales role only has access to Recommendations and Clients
  const isSalesRole = effectiveRole === 'sales'

  // Define which menu items are restricted to non-sales roles
  const showFullMenu = !isSalesRole

  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">
        <Image
          src="/pyrus-logo-icon.png"
          alt="Pyrus"
          width={28}
          height={28}
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        <span>Pyrus Admin</span>
      </div>
      <nav className="admin-nav">
        {showFullMenu && (
          <Link
            href="/admin/dashboard"
            className={`admin-nav-item ${pathname === '/admin/dashboard' ? 'active' : ''}`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span>Dashboard</span>
          </Link>
        )}
        <Link
          href="/admin/recommendations"
          className={`admin-nav-item ${pathname === '/admin/recommendations' || pathname.startsWith('/admin/recommendation-builder') ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <span>Recommendations</span>
        </Link>
        <Link
          href="/admin/clients"
          className={`admin-nav-item ${pathname === '/admin/clients' || pathname.startsWith('/admin/clients/') ? 'active' : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Clients</span>
        </Link>
        {showFullMenu && (
          <>
            <Link
              href="/admin/content"
              className={`admin-nav-item ${pathname === '/admin/content' || pathname.startsWith('/admin/content/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <span>Content</span>
            </Link>
            <Link
              href="/admin/users"
              className={`admin-nav-item ${pathname === '/admin/users' || pathname.startsWith('/admin/users/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Users</span>
            </Link>
            <Link
              href="/admin/notifications"
              className={`admin-nav-item ${pathname === '/admin/notifications' || pathname.startsWith('/admin/notifications/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Notifications</span>
            </Link>
            <Link
              href="/admin/products"
              className={`admin-nav-item ${pathname === '/admin/products' || pathname.startsWith('/admin/products/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Products</span>
            </Link>
            <Link
              href="/admin/rewards"
              className={`admin-nav-item ${pathname === '/admin/rewards' || pathname.startsWith('/admin/rewards/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 12 20 22 4 22 4 12"></polyline>
                <rect x="2" y="7" width="20" height="5"></rect>
                <line x1="12" y1="22" x2="12" y2="7"></line>
                <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
              </svg>
              <span>Rewards</span>
            </Link>
            <Link
              href="/admin/revenue"
              className={`admin-nav-item ${pathname === '/admin/revenue' || pathname.startsWith('/admin/revenue/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Revenue / MRR</span>
            </Link>
            <Link
              href="/admin/settings"
              className={`admin-nav-item ${pathname === '/admin/settings' || pathname.startsWith('/admin/settings/') ? 'active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Settings</span>
            </Link>
          </>
        )}
        <div className="nav-spacer"></div>
        <Link href="/login" className="admin-nav-item nav-logout">
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
