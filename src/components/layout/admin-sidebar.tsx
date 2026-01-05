'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Layers,
  Users,
  FileText,
  User,
  DollarSign,
  Bell,
  Package,
  Gift,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/recommendations',
    label: 'Recommendations',
    icon: <Layers className="w-5 h-5" />,
    superAdminOnly: true,
  },
  {
    href: '/dashboard',
    label: 'Clients',
    icon: <Users className="w-5 h-5" />,
  },
  {
    href: '/content',
    label: 'Content',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    href: '/users',
    label: 'Users',
    icon: <User className="w-5 h-5" />,
    superAdminOnly: true,
  },
  {
    href: '/revenue',
    label: 'Revenue / MRR',
    icon: <DollarSign className="w-5 h-5" />,
    superAdminOnly: true,
  },
  {
    href: '/notifications',
    label: 'Notifications',
    icon: <Bell className="w-5 h-5" />,
  },
  {
    href: '/products',
    label: 'Products',
    icon: <Package className="w-5 h-5" />,
    superAdminOnly: true,
  },
  {
    href: '/rewards',
    label: 'Rewards',
    icon: <Gift className="w-5 h-5" />,
    superAdminOnly: true,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    superAdminOnly: true,
  },
]

interface AdminSidebarProps {
  isSuperAdmin?: boolean
}

export function AdminSidebar({ isSuperAdmin = true }: AdminSidebarProps) {
  const pathname = usePathname()

  const filteredNavItems = navItems.filter(
    (item) => !item.superAdminOnly || isSuperAdmin
  )

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-admin-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-white/10">
        <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center">
          <span className="text-white font-bold text-sm">P</span>
        </div>
        <span className="text-white font-semibold">Pyrus Admin</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col h-[calc(100vh-4rem)] px-3 py-4">
        <div className="flex-1 space-y-1">
          {filteredNavItems.map((item) => {
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
                <span>{item.label}</span>
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
