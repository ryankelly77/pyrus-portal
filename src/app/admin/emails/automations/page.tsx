'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Automation {
  id: string
  name: string
  slug: string
  description: string | null
  trigger_type: string
  is_active: boolean
  steps_count: number
  enrollments_count: number
}

const triggerLabels: Record<string, string> = {
  // Recommendations
  recommendation_sent: 'Recommendation Sent',
  recommendation_email_opened: 'Recommendation Email Opened',
  recommendation_email_clicked: 'Recommendation Email Clicked',
  recommendation_viewed: 'Recommendation Viewed',
  // Clients
  client_created: 'Client Created',
  client_login: 'Client Logged In',
  // Content
  content_approved: 'Content Approved',
  // Page Views
  page_view_dashboard: 'Viewed Dashboard',
  page_view_results: 'Viewed Results',
  page_view_recommendations: 'Viewed Recommendations',
  // Billing
  invoice_sent: 'Invoice Sent',
  payment_received: 'Payment Received',
  subscription_started: 'Subscription Started',
  // Other
  manual: 'Manual',
}

export default function AutomationsPage() {
  const router = useRouter()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingAutomationId, setTogglingAutomationId] = useState<string | null>(null)

  // Fetch automations on mount
  useEffect(() => {
    async function fetchAutomations() {
      try {
        const res = await fetch('/api/admin/automations')
        if (!res.ok) throw new Error('Failed to fetch automations')
        const data = await res.json()
        setAutomations(data.automations || [])
      } catch (err) {
        console.error('Failed to fetch automations:', err)
        setError('Failed to load automations')
      } finally {
        setIsLoading(false)
      }
    }
    fetchAutomations()
  }, [])

  // Toggle automation active status
  const handleToggleAutomation = async (id: string, currentStatus: boolean) => {
    setTogglingAutomationId(id)
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
      console.error('Failed to toggle automation:', err)
      alert('Failed to update automation status')
    } finally {
      setTogglingAutomationId(null)
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading automations...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error-color)' }}>
        {error}
      </div>
    )
  }

  return (
    <>
      {/* Toolbar */}
      <div className="clients-toolbar">
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-primary"
          onClick={() => router.push('/admin/automations/new')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Automation
        </button>
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
          <button
            className="btn btn-primary"
            onClick={() => router.push('/admin/automations/new')}
          >
            Create Your First Automation
          </button>
        </div>
      ) : (
        <div className="admin-users-section">
          <div className="users-table-container">
            <table className="users-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Automation</th>
                  <th style={{ width: '20%' }}>Trigger</th>
                  <th style={{ width: '12%', textAlign: 'center' }}>Steps</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Enrollments</th>
                  <th style={{ width: '13%' }}>Status</th>
                  <th style={{ width: '10%' }}>Actions</th>
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
                          cursor: togglingAutomationId === automation.id ? 'wait' : 'pointer',
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
                            opacity: togglingAutomationId === automation.id ? 0.5 : 1,
                          }}
                          onClick={() => {
                            if (togglingAutomationId !== automation.id) {
                              handleToggleAutomation(automation.id, automation.is_active)
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
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/admin/automations/${automation.id}`)
                        }}
                      >
                        Edit
                      </button>
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
    </>
  )
}
