'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type AdminRole = 'super_admin' | 'admin' | 'production_team' | 'sales'

interface MenuPermissions {
  [menuKey: string]: boolean
}

interface AdminSidebarProps {
  role?: AdminRole
  isSuperAdmin?: boolean // Backwards compatible
  permissions?: MenuPermissions // From database
}

const COLLAPSED_KEY = 'admin-sidebar-collapsed'

export function AdminSidebar({ role, isSuperAdmin = true, permissions }: AdminSidebarProps) {
  const pathname = usePathname()
  const [criticalAlertCount, setCriticalAlertCount] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY)
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newValue = !isCollapsed
    setIsCollapsed(newValue)
    localStorage.setItem(COLLAPSED_KEY, String(newValue))
  }

  // Fetch unresolved critical alert count
  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const response = await fetch('/api/admin/alerts?severity=critical&unresolved=true&limit=100')
        if (response.ok) {
          const data = await response.json()
          setCriticalAlertCount(data.alerts?.length || 0)
        }
      } catch (error) {
        // Silently fail - badge just won't show
      }
    }

    fetchAlertCount()
    // Refresh every 60 seconds
    const interval = setInterval(fetchAlertCount, 60000)
    return () => clearInterval(interval)
  }, [])

  // Determine effective role - support both new role prop and legacy isSuperAdmin
  const effectiveRole: AdminRole = role || (isSuperAdmin ? 'super_admin' : 'production_team')

  // Check if user has access to a menu item
  // If permissions are provided, use them; otherwise fall back to legacy logic
  const hasAccess = (menuKey: string): boolean => {
    // Super admin always has access
    if (effectiveRole === 'super_admin') return true

    // If permissions are loaded from database, use them
    if (permissions && Object.keys(permissions).length > 0) {
      return permissions[menuKey] ?? false
    }

    // Fallback to legacy logic: sales only sees recommendations and clients
    if (effectiveRole === 'sales') {
      return menuKey === 'recommendations' || menuKey === 'clients'
    }

    // Admin and production_team have full access by default
    return true
  }

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="admin-logo">
        <Image
          src="/pyrus-logo-icon.png"
          alt="Pyrus"
          width={28}
          height={28}
          style={{ filter: 'brightness(0) invert(1)' }}
        />
        {!isCollapsed && <span>Pyrus Admin</span>}
      </div>
      <nav className="admin-nav">
        {hasAccess('dashboard') && (
          <Link
            href="/admin/dashboard"
            className={`admin-nav-item ${pathname === '/admin/dashboard' ? 'active' : ''}`}
            title={isCollapsed ? 'Dashboard' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            {!isCollapsed && <span>Dashboard</span>}
          </Link>
        )}
        {hasAccess('recommendations') && (
          <Link
            href="/admin/recommendations"
            className={`admin-nav-item ${pathname === '/admin/recommendations' || pathname.startsWith('/admin/recommendation-builder') ? 'active' : ''}`}
            title={isCollapsed ? 'Recommendations' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            {!isCollapsed && <span>Recommendations</span>}
          </Link>
        )}
        {hasAccess('clients') && (
          <Link
            href="/admin/clients"
            className={`admin-nav-item ${pathname === '/admin/clients' || pathname.startsWith('/admin/clients/') ? 'active' : ''}`}
            title={isCollapsed ? 'Clients' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            {!isCollapsed && <span>Clients</span>}
          </Link>
        )}
        {hasAccess('users') && (
          <Link
            href="/admin/users"
            className={`admin-nav-item ${pathname === '/admin/users' || pathname.startsWith('/admin/users/') ? 'active' : ''}`}
            title={isCollapsed ? 'Users' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            {!isCollapsed && <span>Users</span>}
          </Link>
        )}
        {hasAccess('content') && (
          <Link
            href="/admin/content"
            className={`admin-nav-item ${pathname === '/admin/content' || pathname.startsWith('/admin/content/') ? 'active' : ''}`}
            title={isCollapsed ? 'Content' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            {!isCollapsed && <span>Content</span>}
          </Link>
        )}
        {hasAccess('websites') && (
          <Link
            href="/admin/websites"
            className={`admin-nav-item ${pathname === '/admin/websites' || pathname.startsWith('/admin/websites/') ? 'active' : ''}`}
            title={isCollapsed ? 'Websites' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            {!isCollapsed && <span>Websites</span>}
          </Link>
        )}
        {hasAccess('notifications') && (
          <Link
            href="/admin/notifications"
            className={`admin-nav-item ${pathname === '/admin/notifications' || pathname.startsWith('/admin/notifications/') ? 'active' : ''}`}
            title={isCollapsed ? 'Notifications' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            {!isCollapsed && <span>Notifications</span>}
          </Link>
        )}
        {hasAccess('products') && (
          <Link
            href="/admin/products"
            className={`admin-nav-item ${pathname === '/admin/products' || pathname.startsWith('/admin/products/') ? 'active' : ''}`}
            title={isCollapsed ? 'Products' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            {!isCollapsed && <span>Products</span>}
          </Link>
        )}
        {(hasAccess('revenue') || hasAccess('pipeline')) && (
          <Link
            href="/admin/revenue"
            className={`admin-nav-item ${pathname === '/admin/revenue' || pathname.startsWith('/admin/revenue/') ? 'active' : ''}`}
            title={isCollapsed ? 'Revenue & Pipeline' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            {!isCollapsed && <span>Revenue & Pipeline</span>}
          </Link>
        )}
        {hasAccess('emails') && (
          <Link
            href="/admin/emails"
            className={`admin-nav-item ${pathname === '/admin/emails' || pathname.startsWith('/admin/emails/') ? 'active' : ''}`}
            title={isCollapsed ? 'Email Templates' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            {!isCollapsed && <span>Email Templates</span>}
          </Link>
        )}
        {hasAccess('settings') && (
          <Link
            href="/admin/settings"
            className={`admin-nav-item ${pathname === '/admin/settings' || pathname.startsWith('/admin/settings/') ? 'active' : ''}`}
            title={isCollapsed ? 'Settings' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            {!isCollapsed && <span>Settings</span>}
          </Link>
        )}
        {hasAccess('alerts') && (
          <Link
            href="/admin/alerts"
            className={`admin-nav-item ${pathname === '/admin/alerts' || pathname.startsWith('/admin/alerts/') ? 'active' : ''}`}
            style={{ position: 'relative' }}
            title={isCollapsed ? 'System Alerts' : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            {!isCollapsed && <span>System Alerts</span>}
            {criticalAlertCount > 0 && (
              <span className={`nav-alert-badge ${isCollapsed ? 'collapsed' : ''}`}>
                {criticalAlertCount > 99 ? '99+' : criticalAlertCount}
              </span>
            )}
          </Link>
        )}
        <div className="nav-spacer"></div>
        <Link href="/login" className="admin-nav-item nav-logout" title={isCollapsed ? 'Logout' : undefined}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          {!isCollapsed && <span>Logout</span>}
        </Link>
      </nav>
      <button
        className="sidebar-toggle-tab"
        onClick={toggleCollapsed}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCollapsed ? (
            <polyline points="9 18 15 12 9 6"></polyline>
          ) : (
            <polyline points="15 18 9 12 15 6"></polyline>
          )}
        </svg>
      </button>
    </aside>
  )
}
