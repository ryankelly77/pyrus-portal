'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface AdminHeaderProps {
  title: string
  user?: {
    name: string
    initials: string
  }
  hasNotifications?: boolean
  breadcrumb?: ReactNode
}

export function AdminHeader({
  title,
  user = { name: 'User', initials: 'U' },
  hasNotifications = false,
  breadcrumb,
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
        <Link href="/notifications" className={`btn-icon ${hasNotifications ? 'has-notification' : ''}`}>
          {hasNotifications && <span className="notification-badge"></span>}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        </Link>
        <Link href="/settings" className="user-menu-link">
          <div className="user-avatar-small">
            <span>{user.initials}</span>
          </div>
          <span className="user-name">{user.name}</span>
        </Link>
      </div>
    </div>
  )
}
