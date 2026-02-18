'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Content',
    href: '/admin/content',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
      </svg>
    ),
  },
  {
    name: 'Files',
    href: '/admin/content/files',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
  },
]

export default function ContentLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()

  // Don't show tabs on detail/edit/new pages
  const isDetailPage = pathname.match(/\/admin\/content\/[^/]+$/) && pathname !== '/admin/content/files'

  const isActive = (href: string) => {
    if (href === '/admin/content') {
      return pathname === '/admin/content'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <AdminHeader
        title="Content Management"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Review and manage content across all client accounts</p>
          </div>
        </div>

        {/* Tabs - only show on main pages */}
        {!isDetailPage && (
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
        )}

        {children}
      </div>
    </>
  )
}
