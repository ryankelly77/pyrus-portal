'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

const tabs = [
  {
    name: 'Revenue & MRR',
    href: '/admin/revenue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    )
  },
  {
    name: 'Sales Pipeline',
    href: '/admin/revenue/pipeline',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    )
  }
]

export default function RevenueLayout({ children }: { children: ReactNode }) {
  const { user, hasNotifications } = useUserProfile()
  const pathname = usePathname()

  return (
    <>
      <AdminHeader
        title="Revenue & Pipeline"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Main Tabs */}
        <div className="tabs-container" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', gap: '0' }}>
            {tabs.map((tab) => {
              const isActive = tab.href === '/admin/revenue'
                ? pathname === '/admin/revenue'
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
