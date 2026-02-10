'use client'

import Link from 'next/link'

interface ClientHeaderProps {
  title: string
  breadcrumb?: { label: string; href: string }[]
  clientName?: string
  user?: {
    name: string
    initials: string
    avatarUrl?: string | null
  }
  hasNotifications?: boolean
  isAdminPreview?: boolean
  onExitPreview?: () => void
}

export function ClientHeader({
  title,
  breadcrumb,
  clientName,
  user = { name: 'User', initials: 'U' },
  hasNotifications = false,
  isAdminPreview = false,
  onExitPreview,
}: ClientHeaderProps) {
  return (
    <>
      {/* Admin Preview Banner */}
      {isAdminPreview && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          background: '#FEF3C7',
          borderBottom: '1px solid #FDE68A',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#92400E' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <span>Viewing as client: {clientName}</span>
          </div>
          <button
            onClick={onExitPreview}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#92400E',
              background: '#FDE68A',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Exit Preview
          </button>
        </div>
      )}

      {/* Main Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        height: '64px',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #E5E7EB',
        background: 'white',
        padding: '0 24px',
      }}>
        {/* Left side - Title or Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              {breadcrumb.map((item, index) => (
                <span key={item.href} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {index > 0 && (
                    <svg
                      style={{ width: '16px', height: '16px', color: '#9CA3AF' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  {index === breadcrumb.length - 1 ? (
                    <span style={{ color: '#111827', fontWeight: 500 }}>{item.label}</span>
                  ) : (
                    <Link
                      href={item.href}
                      style={{ color: '#6B7280', textDecoration: 'none' }}
                    >
                      {item.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>{title}</h1>
          )}
        </div>

        {/* Right side - Notifications & User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Notification Bell */}
          <button
            style={{
              position: 'relative',
              padding: '8px',
              borderRadius: '8px',
              color: '#6B7280',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {hasNotifications && (
              <span style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '8px',
                height: '8px',
                background: '#EF4444',
                borderRadius: '50%',
              }} />
            )}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>

          {/* User Menu */}
          <Link
            href="/settings"
            style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#324438',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : user.initials ? (
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 500 }}>{user.initials}</span>
              ) : null}
            </div>
            {user.name && <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>{user.name}</span>}
          </Link>
        </div>
      </header>
    </>
  )
}
