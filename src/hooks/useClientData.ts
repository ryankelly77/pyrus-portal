'use client'

import { useState, useEffect } from 'react'

export interface Service {
  name: string
  quantity: number
  details?: string
}

export interface ClientAccess {
  isActive: boolean
  hasResults: boolean
  hasActivity: boolean
  hasWebsite: boolean
  hasWebsiteProducts: boolean
  hasContent: boolean
  hasContentProducts: boolean
  contentServices: Service[]
  websiteServices: Service[]
}

export interface ClientInfo {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  avatarColor: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  status: string
  growthStage: string | null
  clientSince: string | null
  startDate: string | null // Raw ISO date for calculations
  agencyDashboardKey: string | null
  landingsitePreviewUrl: string | null
  websiteUrl: string | null
  websiteProvider: string | null
  onboardingCompletedAt: string | null
  access: ClientAccess
}

// Default fallback for when no client is found
const defaultClient: ClientInfo = {
  id: '',
  name: 'Client',
  initials: 'CL',
  avatarUrl: null,
  avatarColor: '#324438',
  contactName: 'Client User',
  contactEmail: null,
  contactPhone: null,
  status: 'active',
  growthStage: null,
  clientSince: null,
  startDate: null,
  agencyDashboardKey: null,
  landingsitePreviewUrl: null,
  websiteUrl: null,
  websiteProvider: null,
  onboardingCompletedAt: null,
  access: {
    isActive: true,
    hasResults: false,
    hasActivity: false,
    hasWebsite: false,
    hasWebsiteProducts: false,
    hasContent: false,
    hasContentProducts: false,
    contentServices: [],
    websiteServices: [],
  },
}

export function useClientData(viewingAs: string | null) {
  const [client, setClient] = useState<ClientInfo>(defaultClient)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      try {
        // Build URL - if viewingAs is provided, use it; otherwise API will use current user's client
        let url = '/api/client/info'
        if (viewingAs) {
          // Check if it's a valid UUID
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(viewingAs)) {
            setLoading(false)
            return
          }
          url = `/api/client/info?clientId=${viewingAs}`
        }

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setClient(data)
        } else {
          setError('Failed to fetch client')
        }
      } catch (err) {
        console.error('Error fetching client:', err)
        setError('Failed to fetch client')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [viewingAs])

  return { client, loading, error }
}
