'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface AdminHeaderProps {
  title: string
  user?: {
    name: string
    initials: string
    avatarUrl?: string | null
  }
  hasNotifications?: boolean
  breadcrumb?: ReactNode
  actions?: ReactNode
}

export function AdminHeader({
  title,
  user = { name: 'User', initials: 'U' },
  hasNotifications = false,
  breadcrumb,
  actions,
}: AdminHeaderProps) {
  return (
    <div className="admin-top-header">
      <div className="admin-top-header-left">
        {breadcrumb ? (
          <nav className="breadcrumb">{breadcrumb}</nav>
        ) : (
          <h1>{title}</h1>
        )}
      </div>
      <div className="admin-top-header-right">
        {actions}
        <Link href="/admin/notifications" className={`btn-icon ${hasNotifications ? 'has-notification' : ''}`}>
          {hasNotifications && <span className="notification-badge"></span>}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </Link>
        <Link href="/admin/settings" className="user-menu-link">
          <div className="user-avatar-small" style={{ overflow: 'hidden', background: user.name ? undefined : '#e5e7eb' }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : user.initials ? (
              <span>{user.initials}</span>
            ) : null}
          </div>
          {user.name && <span className="user-name">{user.name}</span>}
        </Link>
      </div>
    </div>
  )
}
