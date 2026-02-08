'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Alert {
  id: string
  severity: 'info' | 'warning' | 'critical'
  category: string
  message: string
  metadata: Record<string, unknown>
  source_file: string | null
  client_id: string | null
  resolved_at: string | null
  created_at: string
  client?: {
    id: string
    name: string
  } | null
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    critical: { bg: '#FEE2E2', color: '#DC2626', label: 'Critical' },
    warning: { bg: '#FEF3C7', color: '#D97706', label: 'Warning' },
    info: { bg: '#DBEAFE', color: '#2563EB', label: 'Info' },
  }
  const style = styles[severity] || styles.info

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.color,
      }}
    >
      {style.label}
    </span>
  )
}

function CategoryBadge({ category }: { category: string }) {
  const label = category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: '#F3F4F6',
        color: '#4B5563',
      }}
    >
      {label}
    </span>
  )
}

export default function AlertsPage() {
  const { user, hasNotifications } = useUserProfile()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolvingAll, setResolvingAll] = useState(false)
  const [copied, setCopied] = useState(false)

  // Filters
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showResolved, setShowResolved] = useState(false)

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (severityFilter) params.set('severity', severityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (!showResolved) params.set('unresolved', 'true')
      params.set('limit', '100')

      const response = await fetch(`/api/admin/alerts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data = await response.json()
      setAlerts(data.alerts || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }, [severityFilter, categoryFilter, showResolved])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const handleResolve = async (alertId: string, resolved: boolean) => {
    setResolving(alertId)
    try {
      const response = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolved }),
      })

      if (!response.ok) throw new Error('Failed to update alert')

      // Refresh alerts
      await fetchAlerts()
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    } finally {
      setResolving(null)
    }
  }

  const handleResolveAll = async () => {
    const unresolvedAlerts = alerts.filter((a) => !a.resolved_at)
    if (unresolvedAlerts.length === 0) return

    setResolvingAll(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertIds: unresolvedAlerts.map((a) => a.id),
          resolved: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resolve alerts')
      }

      // Refresh alerts
      await fetchAlerts()
    } catch (err) {
      console.error('Failed to resolve all alerts:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve alerts')
    } finally {
      setResolvingAll(false)
    }
  }

  const copyAsMarkdown = () => {
    const formatCategory = (cat: string) =>
      cat
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

    const lines: string[] = []
    lines.push('# System Alerts')
    lines.push('')
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    lines.push('')

    if (alerts.length === 0) {
      lines.push('No alerts to display.')
    } else {
      alerts.forEach((alert) => {
        const status = alert.resolved_at ? '[RESOLVED]' : ''
        const severity = alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)
        lines.push(`## ${severity} ${status}`)
        lines.push(`**Category:** ${formatCategory(alert.category)}`)
        lines.push(`**Message:** ${alert.message}`)
        if (alert.source_file) {
          lines.push(`**Source:** ${alert.source_file}`)
        }
        if (alert.client?.name) {
          lines.push(`**Client:** ${alert.client.name}`)
        }
        lines.push(`**Time:** ${formatRelativeTime(alert.created_at)}`)
        lines.push('')
      })
    }

    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categories = [
    'subscription_safeguard',
    'state_reset_blocked',
    'sync_failure',
    'api_error',
    'stripe_error',
    'auth_error',
    'data_integrity',
    'checkout_error',
    'billing_sync_failure',
  ]

  const unresolvedCriticalCount = alerts.filter(
    (a) => a.severity === 'critical' && !a.resolved_at
  ).length

  return (
    <>
      <AdminHeader
        title="System Alerts"
        user={user}
        hasNotifications={hasNotifications}
      />
      <div className="admin-content">
        <div style={{ padding: '24px' }}>
          {/* Filters */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '24px',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                minWidth: '140px',
              }}
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #D1D5DB',
                fontSize: '14px',
                minWidth: '180px',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </option>
              ))}
            </select>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#4B5563',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Show Resolved
            </label>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: '#6B7280' }}>
                {alerts.length} alert{alerts.length === 1 ? '' : 's'}
                {unresolvedCriticalCount > 0 && (
                  <span style={{ color: '#DC2626', fontWeight: 600, marginLeft: '8px' }}>
                    ({unresolvedCriticalCount} critical unresolved)
                  </span>
                )}
              </span>

              <button
                onClick={copyAsMarkdown}
                disabled={alerts.length === 0}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: copied ? '#D1FAE5' : 'white',
                  color: copied ? '#059669' : '#374151',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: alerts.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: alerts.length === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>

              {alerts.filter((a) => !a.resolved_at).length > 0 && (
                <button
                  onClick={handleResolveAll}
                  disabled={resolvingAll}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#059669',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: resolvingAll ? 'wait' : 'pointer',
                    opacity: resolvingAll ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {resolvingAll ? 'Resolving...' : 'Resolve All'}
                </button>
              )}
            </div>
          </div>

          {/* Loading / Error States */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              Loading alerts...
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                color: '#DC2626',
                backgroundColor: '#FEE2E2',
                borderRadius: '8px',
              }}
            >
              {error}
            </div>
          )}

          {/* Alerts Table */}
          {!isLoading && !error && (
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
              }}
            >
              {alerts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '60px 24px',
                    color: '#6B7280',
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                    {showResolved ? '(empty)' : '✓'}
                  </div>
                  <div style={{ fontSize: '16px' }}>
                    {showResolved
                      ? 'No alerts found matching your filters'
                      : 'No unresolved alerts'}
                  </div>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F9FAFB' }}>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Severity
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Category
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Message
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Client
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'left',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Time
                      </th>
                      <th
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#6B7280',
                          textTransform: 'uppercase',
                          borderBottom: '1px solid #E5E7EB',
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr
                        key={alert.id}
                        style={{
                          borderBottom: '1px solid #E5E7EB',
                          backgroundColor: alert.resolved_at ? '#F9FAFB' : 'white',
                          opacity: alert.resolved_at ? 0.7 : 1,
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <CategoryBadge category={alert.category} />
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#374151',
                            maxWidth: '400px',
                          }}
                        >
                          <div>{alert.message}</div>
                          {alert.source_file && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#9CA3AF',
                                marginTop: '4px',
                              }}
                            >
                              {alert.source_file}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#374151',
                          }}
                        >
                          {alert.client?.name || (
                            <span style={{ color: '#9CA3AF' }}>—</span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '12px 16px',
                            fontSize: '14px',
                            color: '#6B7280',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatRelativeTime(alert.created_at)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          {alert.resolved_at ? (
                            <button
                              onClick={() => handleResolve(alert.id, false)}
                              disabled={resolving === alert.id}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                backgroundColor: 'white',
                                color: '#6B7280',
                                fontSize: '13px',
                                cursor: 'pointer',
                                opacity: resolving === alert.id ? 0.5 : 1,
                              }}
                            >
                              {resolving === alert.id ? '...' : 'Unresolve'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResolve(alert.id, true)}
                              disabled={resolving === alert.id}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: 'none',
                                backgroundColor: '#059669',
                                color: 'white',
                                fontSize: '13px',
                                cursor: 'pointer',
                                opacity: resolving === alert.id ? 0.5 : 1,
                              }}
                            >
                              {resolving === alert.id ? '...' : 'Resolve'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
