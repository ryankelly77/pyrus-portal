'use client'

import { useState, useEffect } from 'react'

export interface ClientInfo {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  avatarColor: string
  contactName: string
  contactEmail: string | null
  status: string
  growthStage: string | null
  clientSince: string | null
  agencyDashboardKey: string | null
  landingsitePreviewUrl: string | null
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
  status: 'active',
  growthStage: null,
  clientSince: null,
  agencyDashboardKey: null,
  landingsitePreviewUrl: null,
}

export function useClientData(viewingAs: string | null) {
  const [client, setClient] = useState<ClientInfo>(defaultClient)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClient() {
      if (!viewingAs) {
        setLoading(false)
        return
      }

      // Check if it's a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(viewingAs)) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/client/info?clientId=${viewingAs}`)
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
