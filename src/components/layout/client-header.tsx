'use client'

import Link from 'next/link'
import { Bell, Eye, X } from 'lucide-react'
import { cn } from '@/lib/utils'

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
        <div className="flex items-center justify-between px-6 py-2 bg-amber-100 border-b border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <Eye className="w-4 h-4" />
            <span>Viewing as client: {clientName}</span>
          </div>
          <button
            onClick={onExitPreview}
            className="flex items-center gap-1.5 px-3 py-1 text-sm font-medium text-amber-800 bg-amber-200 rounded hover:bg-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Exit Preview
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
        {/* Left side - Title or Breadcrumb */}
        <div className="flex items-center">
          {breadcrumb && breadcrumb.length > 0 ? (
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumb.map((item, index) => (
                <span key={item.href} className="flex items-center gap-2">
                  {index > 0 && (
                    <svg
                      className="w-4 h-4 text-gray-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  )}
                  {index === breadcrumb.length - 1 ? (
                    <span className="text-gray-900 font-medium">{item.label}</span>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {item.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        {/* Right side - Notifications & User */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button
            className={cn(
              'relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
            )}
          >
            {hasNotifications && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
            <Bell className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <Link
            href="/settings"
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-client-primary flex items-center justify-center overflow-hidden" style={{ background: user.name ? undefined : '#e5e7eb' }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : user.initials ? (
                <span className="text-white text-sm font-medium">{user.initials}</span>
              ) : null}
            </div>
            {user.name && <span className="text-sm font-medium text-gray-700">{user.name}</span>}
          </Link>
        </div>
      </header>
    </>
  )
}
