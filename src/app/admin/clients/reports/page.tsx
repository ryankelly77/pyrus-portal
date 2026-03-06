'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { HarvestReportsTab } from '@/components/admin/HarvestReportsTab'

interface ClientOption {
  id: string
  name: string
}

function HarvestReportsContent() {
  const searchParams = useSearchParams()
  const initialClientFilter = searchParams.get('clientId') || 'all'

  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch clients for filter dropdown
  useEffect(() => {
    async function fetchClients() {
      try {
        const res = await fetch('/api/admin/clients')
        if (res.ok) {
          const data = await res.json()
          // Sort alphabetically
          const sorted = data
            .map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
            .sort((a: ClientOption, b: ClientOption) => a.name.localeCompare(b.name))
          setClients(sorted)
        }
      } catch (err) {
        console.error('Failed to fetch clients:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClients()
  }, [])

  if (isLoading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid var(--border-light)',
          borderTopColor: 'var(--pyrus-brown, #885430)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px auto',
        }}></div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <HarvestReportsTab
      clients={clients}
      initialClientFilter={initialClientFilter}
    />
  )
}

export default function HarvestReportsPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    }>
      <HarvestReportsContent />
    </Suspense>
  )
}
