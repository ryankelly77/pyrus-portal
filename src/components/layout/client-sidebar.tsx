'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen,
  TrendingUp,
  Activity,
  FileText,
  MessageSquare,
  Star,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string
}

const navItems: NavItem[] = [
  {
    href: '/getting-started',
    label: 'Getting Started',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    href: '/results',
    label: 'Results',
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    href: '/activity',
    label: 'Activity',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    href: '/content',
    label: 'Content',
    icon: <FileText className="w-5 h-5" />,
    badge: 'NEW!',
  },
  {
    href: '/communication',
    label: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    href: '/recommendations',
    label: 'Recommendations',
    icon: <Star className="w-5 h-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
  },
]

export function ClientSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-client-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
        <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="text-white font-semibold">Pyrus Portal</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-4rem)] px-3 py-4">
        <div className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                {item.icon}
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-client-primary text-white rounded">
                      {item.badge}
                    </span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-white/10">
          <button
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            onClick={() => {
              // Will be implemented with Supabase signOut
            }}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  )
}
