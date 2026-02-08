'use client'

import { useState, useEffect } from 'react'

interface UserProfile {
  id: string
  email: string
  fullName: string
  role: string
  clientId: string | null
  avatarUrl: string | null
  permissions: Record<string, boolean>
}

interface UseUserProfileReturn {
  user: {
    name: string
    initials: string
    avatarUrl: string | null
  }
  profile: UserProfile | null
  loading: boolean
  hasNotifications: boolean
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasNotifications, setHasNotifications] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setProfile(data)
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  // Fetch unread notification count
  useEffect(() => {
    async function fetchNotificationCount() {
      try {
        const res = await fetch('/api/admin/notifications?limit=1')
        if (res.ok) {
          const data = await res.json()
          // Check if there are any unread notifications
          const unreadCount = data.summary?.unread || 0
          setHasNotifications(unreadCount > 0)
        }
      } catch (error) {
        // Silently fail - just won't show the dot
      }
    }
    fetchNotificationCount()
    // Refresh every 60 seconds
    const interval = setInterval(fetchNotificationCount, 60000)
    return () => clearInterval(interval)
  }, [])

  const nameParts = (profile?.fullName || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return {
    user: {
      name: loading ? '' : (profile?.fullName || 'User'),
      initials: loading ? '' : (`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U'),
      avatarUrl: profile?.avatarUrl || null,
    },
    profile,
    loading,
    hasNotifications,
  }
}
