'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Products',
    href: '/admin/products',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
      </svg>
    )
  },
  {
    name: 'Rewards',
    href: '/admin/products/rewards',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <polyline points="20 12 20 22 4 22 4 12"></polyline>
        <rect x="2" y="7" width="20" height="5"></rect>
        <line x1="12" y1="22" x2="12" y2="7"></line>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
      </svg>
    )
  }
]

export default function ProductsLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()

  // Don't show tabs on edit pages
  const isEditPage = pathname.includes('/edit') || pathname.includes('/new')
  if (isEditPage) {
    return (
      <>
        <AdminHeader
          title="Product Management"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          {children}
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Product Management"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Main Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {tabs.map((tab) => {
              const isActive = tab.href === '/admin/products'
                ? pathname === '/admin/products'
                : pathname.startsWith(tab.href)

              return (
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
                    color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 500,
                    fontSize: '14px',
                    borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                    marginBottom: '-1px',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                  }}
                >
                  {tab.icon}
                  {tab.name}
                </Link>
              )
            })}
          </div>
        </div>

        {children}
      </div>
    </>
  )
}
