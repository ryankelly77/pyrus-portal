'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

type TabType = 'alerts' | 'bugs'

interface BugReport {
  id: string
  title: string
  description: string
  steps_to_reproduce: string | null
  expected_behavior: string | null
  page_url: string
  page_title: string | null
  user_agent: string | null
  screen_size: string | null
  console_logs: string | null
  status: 'new' | 'reviewed' | 'in_progress' | 'resolved' | 'dismissed'
  admin_notes: string | null
  created_at: string
  resolved_at: string | null
  user?: {
    id: string
    email: string | null
    full_name: string | null
  } | null
  client?: {
    id: string
    name: string
  } | null
}

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    new: { bg: '#FEE2E2', color: '#DC2626', label: 'New' },
    reviewed: { bg: '#DBEAFE', color: '#2563EB', label: 'Reviewed' },
    in_progress: { bg: '#FEF3C7', color: '#D97706', label: 'In Progress' },
    resolved: { bg: '#D1FAE5', color: '#059669', label: 'Resolved' },
    dismissed: { bg: '#F3F4F6', color: '#6B7280', label: 'Dismissed' },
  }
  const style = styles[status] || styles.new

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

export default function AlertsPage() {
  const { user, hasNotifications } = useUserProfile()
  const [activeTab, setActiveTab] = useState<TabType>('alerts')

  // Alerts state
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resolving, setResolving] = useState<string | null>(null)
  const [resolvingAll, setResolvingAll] = useState(false)
  const [resolvingCount, setResolvingCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [totalCount, setTotalCount] = useState(0)

  // Alerts Filters
  const [severityFilter, setSeverityFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [showResolved, setShowResolved] = useState(false)

  // Bug Reports state
  const [bugReports, setBugReports] = useState<BugReport[]>([])
  const [bugReportsLoading, setBugReportsLoading] = useState(false)
  const [bugReportsError, setBugReportsError] = useState<string | null>(null)
  const [bugStatusFilter, setBugStatusFilter] = useState<string>('')
  const [expandedBugId, setExpandedBugId] = useState<string | null>(null)
  const [updatingBugId, setUpdatingBugId] = useState<string | null>(null)
  const [bugsCopied, setBugsCopied] = useState(false)
  const [bugStatusCounts, setBugStatusCounts] = useState<Record<string, number>>({})
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [editingNotesValue, setEditingNotesValue] = useState('')

  const fetchAlerts = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (severityFilter) params.set('severity', severityFilter)
      if (categoryFilter) params.set('category', categoryFilter)
      if (!showResolved) params.set('unresolved', 'true')
      params.set('limit', '500')

      const response = await fetch(`/api/admin/alerts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data = await response.json()
      setAlerts(data.alerts || [])
      setTotalCount(data.totalCount || 0)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts')
    } finally {
      setIsLoading(false)
    }
  }, [severityFilter, categoryFilter, showResolved])

  const fetchBugReports = useCallback(async () => {
    setBugReportsLoading(true)
    try {
      const params = new URLSearchParams()
      if (bugStatusFilter) params.set('status', bugStatusFilter)
      params.set('limit', '100')

      const response = await fetch(`/api/admin/bug-reports?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch bug reports')

      const data = await response.json()
      setBugReports(data.reports || [])
      setBugStatusCounts(data.statusCounts || {})
      setBugReportsError(null)
    } catch (err) {
      setBugReportsError(err instanceof Error ? err.message : 'Failed to load bug reports')
    } finally {
      setBugReportsLoading(false)
    }
  }, [bugStatusFilter])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  useEffect(() => {
    if (activeTab === 'bugs') {
      fetchBugReports()
    }
  }, [activeTab, fetchBugReports])

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
    setResolvingCount(unresolvedAlerts.length)
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
      setResolvingCount(0)
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

  const handleUpdateBugStatus = async (bugId: string, status: string) => {
    setUpdatingBugId(bugId)
    try {
      const response = await fetch(`/api/admin/bug-reports/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      await fetchBugReports()
    } catch (err) {
      console.error('Failed to update bug status:', err)
    } finally {
      setUpdatingBugId(null)
    }
  }

  const handleSaveAdminNotes = async (bugId: string) => {
    setUpdatingBugId(bugId)
    try {
      const response = await fetch(`/api/admin/bug-reports/${bugId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: editingNotesValue }),
      })
      if (!response.ok) throw new Error('Failed to save notes')
      await fetchBugReports()
      setEditingNotesId(null)
      setEditingNotesValue('')
    } catch (err) {
      console.error('Failed to save admin notes:', err)
    } finally {
      setUpdatingBugId(null)
    }
  }

  const handleDeleteBugReport = async (bugId: string) => {
    if (!confirm('Are you sure you want to delete this bug report?')) return

    setUpdatingBugId(bugId)
    try {
      const response = await fetch(`/api/admin/bug-reports/${bugId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete')
      await fetchBugReports()
      setExpandedBugId(null)
    } catch (err) {
      console.error('Failed to delete bug report:', err)
    } finally {
      setUpdatingBugId(null)
    }
  }

  const copyBugReportAsMarkdown = (bug: BugReport) => {
    const lines: string[] = []
    lines.push(`# Bug Report: ${bug.title}`)
    lines.push('')
    lines.push(`**Reported by:** ${bug.user?.full_name || bug.user?.email || 'Unknown'}`)
    lines.push(`**Date:** ${new Date(bug.created_at).toLocaleString()}`)
    lines.push(`**Status:** ${bug.status.replace('_', ' ').charAt(0).toUpperCase() + bug.status.slice(1).replace('_', ' ')}`)
    if (bug.client?.name) {
      lines.push(`**Client:** ${bug.client.name}`)
    }
    lines.push('')
    lines.push('## Description')
    lines.push(bug.description)
    lines.push('')
    if (bug.steps_to_reproduce) {
      lines.push('## Steps to Reproduce')
      lines.push(bug.steps_to_reproduce)
      lines.push('')
    }
    if (bug.expected_behavior) {
      lines.push('## Expected Behavior')
      lines.push(bug.expected_behavior)
      lines.push('')
    }
    lines.push('## Environment')
    lines.push(`- **Page URL:** ${bug.page_url}`)
    if (bug.page_title) lines.push(`- **Page Title:** ${bug.page_title}`)
    if (bug.user_agent) lines.push(`- **Browser:** ${bug.user_agent}`)
    if (bug.screen_size) lines.push(`- **Screen Size:** ${bug.screen_size}`)
    lines.push('')
    if (bug.console_logs) {
      lines.push('## Console Logs')
      lines.push('```')
      lines.push(bug.console_logs)
      lines.push('```')
      lines.push('')
    }
    if (bug.admin_notes) {
      lines.push('## Admin Notes')
      lines.push(bug.admin_notes)
      lines.push('')
    }

    navigator.clipboard.writeText(lines.join('\n'))
    setBugsCopied(true)
    setTimeout(() => setBugsCopied(false), 2000)
  }

  const newBugsCount = bugStatusCounts['new'] || 0

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
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <AdminHeader
        title="System Alerts"
        user={user}
        hasNotifications={hasNotifications}
      />
      <div className="admin-content">
        <div style={{ padding: '24px' }}>
          {/* Tabs */}
          <div className="admin-tabs">
            <button
              className={`admin-tab ${activeTab === 'alerts' ? 'active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              System Alerts
              {unresolvedCriticalCount > 0 && (
                <span className="tab-badge count">{unresolvedCriticalCount}</span>
              )}
            </button>
            <button
              className={`admin-tab ${activeTab === 'bugs' ? 'active' : ''}`}
              onClick={() => setActiveTab('bugs')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M12 2a3 3 0 0 0-3 3v1H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1v3H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a5 5 0 0 0 10 0h1a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2h-1v-3h1a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3V5a3 3 0 0 0-3-3z"></path>
              </svg>
              Bug Reports
              {newBugsCount > 0 && (
                <span className="tab-badge alert">{newBugsCount}</span>
              )}
            </button>
          </div>

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <>
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
                {totalCount} alert{totalCount === 1 ? '' : 's'}
                {alerts.length < totalCount && ` (showing ${alerts.length})`}
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
                    backgroundColor: resolvingAll ? '#6B7280' : '#059669',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: resolvingAll ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '140px',
                  }}
                >
                  {resolvingAll ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                    </svg>
                  ) : (
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
                  )}
                  {resolvingAll ? `Resolving ${resolvingCount}...` : `Resolve All (${alerts.filter((a) => !a.resolved_at).length})`}
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
            </>
          )}

          {/* Bug Reports Tab */}
          {activeTab === 'bugs' && (
            <>
              {/* Bug Reports Filters */}
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
                  value={bugStatusFilter}
                  onChange={(e) => setBugStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px',
                    minWidth: '160px',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="new">New ({bugStatusCounts['new'] || 0})</option>
                  <option value="reviewed">Reviewed ({bugStatusCounts['reviewed'] || 0})</option>
                  <option value="in_progress">In Progress ({bugStatusCounts['in_progress'] || 0})</option>
                  <option value="resolved">Resolved ({bugStatusCounts['resolved'] || 0})</option>
                  <option value="dismissed">Dismissed ({bugStatusCounts['dismissed'] || 0})</option>
                </select>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#6B7280' }}>
                    {bugReports.length} report{bugReports.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              {/* Bug Reports Loading/Error */}
              {bugReportsLoading && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                  Loading bug reports...
                </div>
              )}

              {bugReportsError && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#DC2626',
                    backgroundColor: '#FEE2E2',
                    borderRadius: '8px',
                  }}
                >
                  {bugReportsError}
                </div>
              )}

              {/* Bug Reports List */}
              {!bugReportsLoading && !bugReportsError && (
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                  }}
                >
                  {bugReports.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '60px 24px',
                        color: '#6B7280',
                      }}
                    >
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐛</div>
                      <div style={{ fontSize: '16px' }}>No bug reports found</div>
                    </div>
                  ) : (
                    <div>
                      {bugReports.map((bug) => (
                        <div
                          key={bug.id}
                          style={{
                            borderBottom: '1px solid #E5E7EB',
                          }}
                        >
                          {/* Bug Report Header - Always Visible */}
                          <div
                            onClick={() => setExpandedBugId(expandedBugId === bug.id ? null : bug.id)}
                            style={{
                              padding: '16px 20px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '16px',
                              backgroundColor: expandedBugId === bug.id ? '#F9FAFB' : 'white',
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#9CA3AF"
                              strokeWidth="2"
                              style={{
                                transform: expandedBugId === bug.id ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s',
                                flexShrink: 0,
                              }}
                            >
                              <path d="M9 18l6-6-6-6" />
                            </svg>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                                <span style={{ fontWeight: 500, color: '#111827' }}>{bug.title}</span>
                                <StatusBadge status={bug.status} />
                              </div>
                              <div style={{ fontSize: '13px', color: '#6B7280' }}>
                                {bug.user?.full_name || bug.user?.email || 'Unknown user'}
                                {bug.client?.name && <span> • {bug.client.name}</span>}
                                <span> • {formatRelativeTime(bug.created_at)}</span>
                              </div>
                            </div>

                            {/* Quick Status Dropdown */}
                            <select
                              value={bug.status}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleUpdateBugStatus(bug.id, e.target.value)
                              }}
                              disabled={updatingBugId === bug.id}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                fontSize: '13px',
                                backgroundColor: 'white',
                                cursor: updatingBugId === bug.id ? 'wait' : 'pointer',
                                opacity: updatingBugId === bug.id ? 0.5 : 1,
                              }}
                            >
                              <option value="new">New</option>
                              <option value="reviewed">Reviewed</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Dismissed</option>
                            </select>
                          </div>

                          {/* Expanded Content */}
                          {expandedBugId === bug.id && (
                            <div
                              style={{
                                padding: '0 20px 20px 52px',
                                backgroundColor: '#F9FAFB',
                              }}
                            >
                              {/* Description */}
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Description
                                </div>
                                <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                  {bug.description}
                                </div>
                              </div>

                              {/* Steps to Reproduce */}
                              {bug.steps_to_reproduce && (
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Steps to Reproduce
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                    {bug.steps_to_reproduce}
                                  </div>
                                </div>
                              )}

                              {/* Expected Behavior */}
                              {bug.expected_behavior && (
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Expected Behavior
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#374151', whiteSpace: 'pre-wrap' }}>
                                    {bug.expected_behavior}
                                  </div>
                                </div>
                              )}

                              {/* Environment Info */}
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Environment
                                </div>
                                <div style={{ fontSize: '13px', color: '#374151' }}>
                                  <div><strong>Page URL:</strong> <a href={bug.page_url} target="_blank" rel="noopener noreferrer" style={{ color: '#3B82F6' }}>{bug.page_url}</a></div>
                                  {bug.page_title && <div><strong>Page Title:</strong> {bug.page_title}</div>}
                                  {bug.user_agent && <div><strong>Browser:</strong> {bug.user_agent}</div>}
                                  {bug.screen_size && <div><strong>Screen Size:</strong> {bug.screen_size}</div>}
                                </div>
                              </div>

                              {/* Console Logs */}
                              {bug.console_logs && (
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                    Console Logs
                                  </div>
                                  <pre
                                    style={{
                                      padding: '12px',
                                      backgroundColor: '#1F2937',
                                      color: '#F3F4F6',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      overflow: 'auto',
                                      maxHeight: '200px',
                                      whiteSpace: 'pre-wrap',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {bug.console_logs}
                                  </pre>
                                </div>
                              )}

                              {/* Admin Notes */}
                              <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase' }}>
                                  Admin Notes
                                </div>
                                {editingNotesId === bug.id ? (
                                  <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    <textarea
                                      value={editingNotesValue}
                                      onChange={(e) => setEditingNotesValue(e.target.value)}
                                      placeholder="Add notes about this bug report..."
                                      style={{
                                        padding: '10px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #D1D5DB',
                                        fontSize: '14px',
                                        minHeight: '80px',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                      }}
                                    />
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button
                                        onClick={() => handleSaveAdminNotes(bug.id)}
                                        disabled={updatingBugId === bug.id}
                                        style={{
                                          padding: '8px 16px',
                                          borderRadius: '6px',
                                          border: 'none',
                                          backgroundColor: '#3B82F6',
                                          color: 'white',
                                          fontSize: '13px',
                                          fontWeight: 500,
                                          cursor: updatingBugId === bug.id ? 'wait' : 'pointer',
                                        }}
                                      >
                                        Save Notes
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingNotesId(null)
                                          setEditingNotesValue('')
                                        }}
                                        style={{
                                          padding: '8px 16px',
                                          borderRadius: '6px',
                                          border: '1px solid #D1D5DB',
                                          backgroundColor: 'white',
                                          color: '#374151',
                                          fontSize: '13px',
                                          fontWeight: 500,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {bug.admin_notes ? (
                                      <div
                                        style={{
                                          padding: '10px 12px',
                                          backgroundColor: '#FEF3C7',
                                          borderRadius: '6px',
                                          fontSize: '14px',
                                          color: '#92400E',
                                          whiteSpace: 'pre-wrap',
                                          marginBottom: '8px',
                                        }}
                                      >
                                        {bug.admin_notes}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '14px', color: '#9CA3AF', marginBottom: '8px' }}>
                                        No admin notes yet
                                      </div>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditingNotesId(bug.id)
                                        setEditingNotesValue(bug.admin_notes || '')
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid #D1D5DB',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      {bug.admin_notes ? 'Edit Notes' : 'Add Notes'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => copyBugReportAsMarkdown(bug)}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #D1D5DB',
                                    backgroundColor: bugsCopied ? '#D1FAE5' : 'white',
                                    color: bugsCopied ? '#059669' : '#374151',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
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
                                  {bugsCopied ? 'Copied!' : 'Copy as Markdown'}
                                </button>
                                <button
                                  onClick={() => handleDeleteBugReport(bug.id)}
                                  disabled={updatingBugId === bug.id}
                                  style={{
                                    padding: '8px 14px',
                                    borderRadius: '6px',
                                    border: '1px solid #FCA5A5',
                                    backgroundColor: 'white',
                                    color: '#DC2626',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: updatingBugId === bug.id ? 'wait' : 'pointer',
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
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
