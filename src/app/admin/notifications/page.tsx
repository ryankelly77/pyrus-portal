'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

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
  const { user, hasNotifications } = useUserProfile()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [summary, setSummary] = useState<NotificationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchNotifications()
    fetchReadStatus()
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

  async function fetchReadStatus() {
    try {
      const res = await fetch('/api/admin/notifications/read')
      if (res.ok) {
        const data = await res.json()
        setReadIds(new Set(data.readIds))
      }
    } catch (error) {
      console.error('Error fetching read status:', error)
    }
  }

  function isUnread(notification: NotificationItem) {
    return !readIds.has(`${notification.type}:${notification.id}`)
  }

  function getUnreadCount() {
    return (notifications || []).filter(n => isUnread(n)).length
  }

  function handleExportActivity() {
    // Generate CSV from notifications
    const headers = ['Date', 'Type', 'Title', 'Description', 'Client', 'Status']
    const rows = (notifications || []).map(n => [
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

  async function handleMarkAllRead() {
    const unreadNotifications = (notifications || []).filter(n => isUnread(n))
    if (unreadNotifications.length === 0) return

    try {
      await fetch('/api/admin/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notifications: unreadNotifications.map(n => ({ type: n.type, id: n.id }))
        })
      })
      // Update local state
      const newReadIds = new Set(readIds)
      unreadNotifications.forEach(n => newReadIds.add(`${n.type}:${n.id}`))
      setReadIds(newReadIds)
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
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
      case 'page_view':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        )
      case 'registration':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
        )
      case 'purchase':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"></circle>
            <circle cx="20" cy="21" r="1"></circle>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
          </svg>
        )
      case 'onboarding':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
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
    if (type === 'page_view') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: '#FEF3C7',
          color: '#92400E',
        }}>
          page view
        </span>
      )
    }
    if (type === 'registration') {
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
          new signup
        </span>
      )
    }
    if (type === 'purchase') {
      // Don't show redundant "purchase" badge - the title already says "Purchase"
      // The description contains the specific action (started, activated, canceled)
      return null
    }
    if (type === 'onboarding') {
      return (
        <span style={{
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          background: '#8B5CF6',
          color: '#FFFFFF',
        }}>
          milestone
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

  function cleanDescription(description: string, clientName: string) {
    if (!description || !clientName) return description
    // Remove "ClientName: " prefix
    if (description.startsWith(`${clientName}: `)) {
      return description.slice(clientName.length + 2)
    }
    // Remove " for ClientName" suffix
    if (description.endsWith(` for ${clientName}`)) {
      return description.slice(0, -(` for ${clientName}`.length))
    }
    return description
  }

  function getIconClass(type: string) {
    switch (type) {
      case 'email': return 'email'
      case 'proposal_view': return 'view'
      case 'proposal_sent': return 'action'
      case 'login': return 'login'
      case 'page_view': return 'page-view'
      case 'registration': return 'registration'
      case 'purchase': return 'purchase'
      case 'onboarding': return 'onboarding'
      default: return 'action'
    }
  }

  // Group notifications by date
  function groupByDate(items: NotificationItem[]) {
    const groups: { [key: string]: NotificationItem[] } = {}
    if (!items || items.length === 0) return groups

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

  // Filter notifications by search query
  const filteredNotifications = searchQuery.trim()
    ? (notifications || []).filter(n =>
        n.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : (notifications || [])

  const groupedNotifications = groupByDate(filteredNotifications)

  return (
    <>
      <AdminHeader
        title="Notifications"
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Email activity, proposal views, and client logins</p>
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
            <button
              className={`filter-tab ${filter === 'page_view' ? 'active' : ''}`}
              onClick={() => setFilter('page_view')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              Page Views
            </button>
            <button
              className={`filter-tab ${filter === 'purchase' ? 'active' : ''}`}
              onClick={() => setFilter('purchase')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              Purchases
            </button>
            <button
              className={`filter-tab ${filter === 'onboarding' ? 'active' : ''}`}
              onClick={() => setFilter('onboarding')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Onboarding
            </button>
          </div>
          <div className="filter-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary btn-sm" onClick={fetchNotifications}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh
            </button>
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
              {getUnreadCount() > 0 && (
                <span className="unread-badge">{getUnreadCount()}</span>
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
          ) : (notifications || []).length === 0 ? (
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
                  <div key={notification.id} className={`activity-item ${isUnread(notification) ? 'unread' : ''} ${notification.type === 'purchase' ? 'purchase-highlight' : ''} ${notification.type === 'onboarding' ? 'onboarding-highlight' : ''}`}>
                    {isUnread(notification) && <span className="unread-dot"></span>}
                    <div className={`activity-icon ${getIconClass(notification.type)}`}>
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-header">
                        <span className="activity-title">{notification.title}</span>
                        {getStatusBadge(notification.type, notification.status)}
                      </div>
                      <p className="activity-description">{cleanDescription(notification.description, notification.clientName)}</p>
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
