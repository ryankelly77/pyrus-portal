'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Automation {
  id: string
  name: string
  slug: string
  description: string | null
  trigger_type: string
  is_active: boolean
  steps_count: number
  enrollments_count: number
  created_at: string
  updated_at: string
}

const triggerLabels: Record<string, string> = {
  proposal_sent: 'Proposal Sent',
  client_created: 'Client Created',
  content_approved: 'Content Approved',
  invoice_sent: 'Invoice Sent',
  manual: 'Manual',
}

export default function AutomationsPage() {
  const router = useRouter()
  const { user, hasNotifications } = useUserProfile()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAutomations()
  }, [])

  const fetchAutomations = async () => {
    try {
      const res = await fetch('/api/admin/automations')
      if (!res.ok) throw new Error('Failed to fetch automations')
      const data = await res.json()
      setAutomations(data.automations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    setTogglingId(id)
    try {
      const res = await fetch(`/api/admin/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      if (!res.ok) throw new Error('Failed to update automation')

      setAutomations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: !currentStatus } : a))
      )
    } catch (err) {
      console.error('Error toggling automation:', err)
      alert('Failed to update automation status')
    } finally {
      setTogglingId(null)
    }
  }

  const deleteAutomation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const res = await fetch(`/api/admin/automations/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete automation')
      }
      setAutomations((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete automation')
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader
          title="Email Automations"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading automations...
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <AdminHeader
          title="Email Automations"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error-color)' }}>
            {error}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title="Email Automations"
        user={user}
        hasNotifications={hasNotifications}
        actions={
          <Link href="/admin/automations/new" className="btn btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Automation
          </Link>
        }
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Create and manage automated email sequences</p>
          </div>
        </div>

        {automations.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 40px',
            textAlign: 'center',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--pyrus-sage-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--pyrus-sage)" strokeWidth="2" width="40" height="40">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              No automations yet
            </h2>
            <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '500px', marginBottom: '24px' }}>
              Create automated email sequences, drip campaigns, and workflow triggers based on client actions and milestones.
            </p>
            <Link href="/admin/automations/new" className="btn btn-primary">
              Create Your First Automation
            </Link>
          </div>
        ) : (
          <div className="admin-users-section">
            <div className="users-table-container">
              <table className="users-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Automation</th>
                    <th style={{ width: '20%' }}>Trigger</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Steps</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Enrollments</th>
                    <th style={{ width: '13%' }}>Status</th>
                    <th style={{ width: '15%' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {automations.map((automation) => (
                    <tr
                      key={automation.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/admin/automations/${automation.id}`)}
                    >
                      <td>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: '2px' }}>{automation.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {automation.slug}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            backgroundColor: '#FEF3C7',
                            color: '#92400E',
                          }}
                        >
                          ⚡ {triggerLabels[automation.trigger_type] || automation.trigger_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '14px' }}>{automation.steps_count}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '14px' }}>{automation.enrollments_count}</span>
                      </td>
                      <td>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: togglingId === automation.id ? 'wait' : 'pointer',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: '40px',
                              height: '22px',
                              borderRadius: '11px',
                              backgroundColor: automation.is_active ? 'var(--pyrus-brown)' : '#D1D5DB',
                              transition: 'background-color 0.2s',
                              opacity: togglingId === automation.id ? 0.5 : 1,
                            }}
                            onClick={() => {
                              if (togglingId !== automation.id) {
                                toggleActive(automation.id, automation.is_active)
                              }
                            }}
                          >
                            <div
                              style={{
                                position: 'absolute',
                                top: '2px',
                                left: automation.is_active ? '20px' : '2px',
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                backgroundColor: 'white',
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '13px', color: automation.is_active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {automation.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </label>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/admin/automations/${automation.id}`)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            style={{ color: 'var(--error-color)' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteAutomation(automation.id, automation.name)
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination Info */}
        {automations.length > 0 && (
          <div className="table-pagination">
            <span className="pagination-info">
              Showing {automations.length} automation{automations.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
