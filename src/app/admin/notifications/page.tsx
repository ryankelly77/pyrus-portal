'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'

interface NotificationItem {
  id: string
  type: string
  title: string
  description: string
  clientName: string
  clientId: string
  status?: string
  timestamp: string
}

interface NotificationSummary {
  totalEmails: number
  sentEmails: number
  deliveredEmails: number
  openedEmails: number
  proposalsViewed: number
  proposalsSent: number
  totalLogins: number
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [summary, setSummary] = useState<NotificationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/notifications?type=${filter}&limit=100`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setSummary(data.summary)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleExportActivity() {
    // Generate CSV from notifications
    const headers = ['Date', 'Type', 'Title', 'Description', 'Client', 'Status']
    const rows = notifications.map(n => [
      new Date(n.timestamp).toLocaleString(),
      n.type,
      n.title,
      n.description,
      n.clientName,
      n.status || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-export-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function handleMarkAllRead() {
    // For now, just clear the notifications display
    // In a full implementation, this would call an API to mark notifications as read
    setNotifications([])
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'email':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        )
      case 'proposal_view':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )
      case 'proposal_sent':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        )
      case 'login':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
        )
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
        )
    }
  }

  function getStatusBadge(type: string, status?: string) {
    if (type === 'email') {
      const statusColors: Record<string, { bg: string; text: string }> = {
        sent: { bg: '#FEF3C7', text: '#92400E' },
        delivered: { bg: '#DBEAFE', text: '#1E40AF' },
        opened: { bg: '#D1FAE5', text: '#065F46' },
        clicked: { bg: '#C7D2FE', text: '#3730A3' },
        failed: { bg: '#FEE2E2', text: '#991B1B' },
        bounced: { bg: '#FEE2E2', text: '#991B1B' },
      }
      const colors = statusColors[status || 'sent'] || statusColors.sent
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: colors.bg,
          color: colors.text,
        }}>
          {status || 'sent'}
        </span>
      )
    }
    if (type === 'proposal_view') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: '#D1FAE5',
          color: '#065F46',
        }}>
          viewed
        </span>
      )
    }
    if (type === 'proposal_sent') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: '#DBEAFE',
          color: '#1E40AF',
        }}>
          sent
        </span>
      )
    }
    if (type === 'login') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: '#E0E7FF',
          color: '#3730A3',
        }}>
          login
        </span>
      )
    }
    return null
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  function getIconClass(type: string) {
    switch (type) {
      case 'email': return 'email'
      case 'proposal_view': return 'view'
      case 'proposal_sent': return 'action'
      case 'login': return 'login'
      default: return 'action'
    }
  }

  // Group notifications by date
  function groupByDate(items: NotificationItem[]) {
    const groups: { [key: string]: NotificationItem[] } = {}
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    items.forEach(item => {
      const itemDate = new Date(item.timestamp)
      itemDate.setHours(0, 0, 0, 0)

      let key: string
      if (itemDate.getTime() === today.getTime()) {
        key = 'Today'
      } else if (itemDate.getTime() === yesterday.getTime()) {
        key = 'Yesterday'
      } else {
        key = itemDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(item)
    })

    return groups
  }

  const groupedNotifications = groupByDate(notifications)

  return (
    <>
      <AdminHeader
        title="Notifications"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={notifications.length > 0}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Email activity, proposal views, and client logins</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={fetchNotifications}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Activity
            </button>
            <button
              className={`filter-tab ${filter === 'email' ? 'active' : ''}`}
              onClick={() => setFilter('email')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              Emails
            </button>
            <button
              className={`filter-tab ${filter === 'proposal' ? 'active' : ''}`}
              onClick={() => setFilter('proposal')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Proposals
            </button>
            <button
              className={`filter-tab ${filter === 'login' ? 'active' : ''}`}
              onClick={() => setFilter('login')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Logins
            </button>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleExportActivity}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export Activity
            </button>
            <button className="btn btn-secondary btn-sm mark-read-btn" onClick={handleMarkAllRead}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Mark All Read
              {notifications.length > 0 && (
                <span className="unread-badge">{notifications.length}</span>
              )}
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="activity-feed">
          {loading ? (
            <div className="loading-state" style={{ padding: '3rem', textAlign: 'center' }}>
              <p>Loading activity...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h3>No activity yet</h3>
              <p>Activity will appear here when emails are sent, proposals are viewed, or clients log in.</p>
            </div>
          ) : (
            Object.entries(groupedNotifications).map(([date, items]) => (
              <div key={date} className="activity-date-group">
                <div className="activity-date-header">{date}</div>
                {items.map((notification) => (
                  <div key={notification.id} className="activity-item">
                    <div className={`activity-icon ${getIconClass(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <span className="activity-title">{notification.title}</span>
                        {getStatusBadge(notification.type, notification.status)}
                      </div>
                      <p className="activity-description">{notification.description}</p>
                      <div className="activity-meta">
                        {notification.clientId ? (
                          <Link href={`/admin/clients/${notification.clientId}`} className="activity-client">
                            {notification.clientName}
                          </Link>
                        ) : (
                          <span className="activity-client">{notification.clientName}</span>
                        )}
                      </div>
                    </div>
                    <div className="activity-time">{formatTimestamp(notification.timestamp)}</div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
