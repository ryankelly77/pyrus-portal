'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminHeaderProps {
  title: string
  breadcrumb?: { label: string; href: string }[]
  user?: {
    name: string
    initials: string
  }
  hasNotifications?: boolean
}

export function AdminHeader({
  title,
  breadcrumb,
  user = { name: 'User', initials: 'U' },
  hasNotifications = false,
}: AdminHeaderProps) {
  return (
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
        <Link
          href="/notifications"
          className={cn(
            'relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors',
          )}
        >
          {hasNotifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
          <Bell className="w-5 h-5" />
        </Link>

        {/* User Menu */}
        <Link
          href="/settings"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-admin-primary flex items-center justify-center">
            <span className="text-white text-sm font-medium">{user.initials}</span>
          </div>
          <span className="text-sm font-medium text-gray-700">{user.name}</span>
        </Link>
      </div>
    </header>
  )
}
