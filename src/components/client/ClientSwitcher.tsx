'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface LinkedClient {
  id: string
  name: string
  avatarColor: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
}

export function ClientSwitcher() {
  const router = useRouter()
  const [clients, setClients] = useState<LinkedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/client/my-clients')
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchClient = async (clientId: string) => {
    if (switching) return
    setSwitching(true)
    try {
      const res = await fetch('/api/client/my-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      if (res.ok) {
        // Refresh the page to load new client context
        window.location.href = '/dashboard'
      }
    } catch (error) {
      console.error('Failed to switch client:', error)
    } finally {
      setSwitching(false)
      setIsOpen(false)
    }
  }

  // Don't render if user has 0 or 1 client
  if (loading || clients.length <= 1) {
    return null
  }

  const activeClient = clients.find(c => c.isActive) || clients[0]

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(136, 84, 48, 0.08)',
          border: '1px solid rgba(136, 84, 48, 0.15)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#1F2937',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Client Avatar */}
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: activeClient.avatarUrl
              ? `url(${activeClient.avatarUrl}) center/cover`
              : activeClient.avatarColor || '#885430',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {!activeClient.avatarUrl && activeClient.name[0].toUpperCase()}
        </div>

        <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeClient.name}
        </span>

        {/* Dropdown Arrow */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          height="14"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            opacity: 0.5,
          }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '220px',
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Switch Account
            </span>
          </div>
          <div style={{ padding: '0.25rem 0' }}>
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => client.isActive ? setIsOpen(false) : switchClient(client.id)}
                disabled={switching}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.625rem 0.75rem',
                  background: client.isActive ? 'rgba(136, 84, 48, 0.08)' : 'transparent',
                  border: 'none',
                  cursor: client.isActive ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!client.isActive) {
                    (e.target as HTMLElement).style.background = '#F9FAFB'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!client.isActive) {
                    (e.target as HTMLElement).style.background = 'transparent'
                  }
                }}
              >
                {/* Client Avatar */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    background: client.avatarUrl
                      ? `url(${client.avatarUrl}) center/cover`
                      : client.avatarColor || '#885430',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {!client.avatarUrl && client.name[0].toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: client.isActive ? 600 : 500,
                    color: '#1F2937',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {client.name}
                  </div>
                </div>

                {/* Active Indicator */}
                {client.isActive && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#885430" strokeWidth="2.5" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ClientSwitcher
