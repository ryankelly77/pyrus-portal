'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Websites',
    href: '/admin/websites',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    ),
  },
  {
    name: 'Edit Requests',
    href: '/admin/websites/requests',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
    ),
    showBadge: true,
  },
]

export default function WebsitesLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState<number>(0)

  // Fetch pending request count for badge
  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const response = await fetch('/api/admin/websites/requests')
        if (response.ok) {
          const data = await response.json()
          setPendingCount(data.stats?.pending || 0)
        }
      } catch (err) {
        console.error('Failed to fetch request count:', err)
      }
    }
    fetchPendingCount()
  }, [])

  const isActive = (href: string) => {
    if (href === '/admin/websites') {
      return pathname === '/admin/websites'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      <AdminHeader
        title="Websites"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Monitor client websites, uptime status, and manage edit requests.</p>
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
                {tab.showBadge && pendingCount > 0 && (
                  <span style={{
                    background: '#DC2626',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}>{pendingCount}</span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {children}
      </div>
    </>
  )
}
