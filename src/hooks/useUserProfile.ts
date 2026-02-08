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
}

export function useUserProfile(): UseUserProfileReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

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

  const nameParts = (profile?.fullName || '').split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return {
    user: {
      name: profile?.fullName || 'User',
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U',
      avatarUrl: profile?.avatarUrl || null,
    },
    profile,
    loading,
  }
}
