'use client'

import { ReactNode, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Users',
    href: '/admin/users',
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
    name: 'Roles Management',
    href: '/admin/users/roles',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    ),
    superAdminOnly: true,
  },
]

export default function UsersLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Fetch current user's role
  useEffect(() => {
    async function fetchUserRole() {
      try {
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          if (data.currentUserRole) {
            setCurrentUserRole(data.currentUserRole)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user role:', error)
      }
    }
    fetchUserRole()
  }, [])

  const isSuperAdmin = currentUserRole === 'super_admin'

  const isActive = (href: string) => {
    if (href === '/admin/users') {
      return pathname === '/admin/users'
    }
    return pathname.startsWith(href)
  }

  // Filter tabs based on user role
  const visibleTabs = tabs.filter(tab => !tab.superAdminOnly || isSuperAdmin)

  return (
    <>
      <AdminHeader
        title="Users"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Manage portal users and their access</p>
          </div>
        </div>

        {/* Tabs - Only show if super_admin (has multiple tabs) */}
        {isSuperAdmin && (
          <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', gap: '0' }}>
              {visibleTabs.map((tab) => (
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
