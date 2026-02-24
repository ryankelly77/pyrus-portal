'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Clients',
    href: '/admin/clients',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    name: 'Client Performance',
    href: '/admin/clients/performance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
      </svg>
    ),
  },
]

export default function ClientsLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()

  // Client detail pages have their own header - don't render layout header/wrapper
  const isDetailPage = pathname.match(/\/admin\/clients\/[^/]+$/) &&
    pathname !== '/admin/clients/performance'

  // Detail pages render their own AdminHeader and admin-content wrapper
  if (isDetailPage) {
    return <>{children}</>
  }

  const isActive = (href: string) => {
    if (href === '/admin/clients') {
      return pathname === '/admin/clients'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <AdminHeader
        title="Clients"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage your client accounts and view their marketing performance</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: isActive(tab.href) ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  fontSize: '14px',
                  borderBottom: isActive(tab.href) ? '2px solid var(--primary)' : '2px solid transparent',
                  marginBottom: '-1px',
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              >
                {tab.icon}
                {tab.name}
              </Link>
            ))}
          </div>
        </div>

        {children}
      </div>
    </>
  )
}
