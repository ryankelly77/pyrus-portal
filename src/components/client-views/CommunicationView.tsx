'use client'

import { useState, useEffect, useRef } from 'react'
import { CommunicationItem, formatTimelineDate } from '@/components'

type FilterType = 'all' | 'emails' | 'alerts' | 'sms' | 'chat' | 'content'
type DateRangeType = 'all' | '7days' | '30days' | '90days'

interface Communication {
  id: string
  clientId: string
  type: string
  title: string
  subject: string | null
  body: string | null
  status: string | null
  metadata: Record<string, unknown> | null
  highlightType: string | null
  recipientEmail?: string | null
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  createdAt: string | null
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
}

interface CommunicationViewProps {
  clientId: string
  isAdmin?: boolean
  clientName?: string
  // For admin view - pass pre-loaded data
  communications?: Communication[]
  communicationsLoading?: boolean
  onRefresh?: () => void
}

// Export communications to CSV
function exportToCSV(communications: Communication[], filename: string) {
  const headers = ['Date', 'Type', 'Title', 'Subject', 'Status', 'Direction', 'Source', 'Body']
  const rows = communications.map(comm => [
    comm.sentAt ? new Date(comm.sentAt).toLocaleString() : '',
    comm.type,
    comm.title,
    comm.subject || '',
    comm.status || '',
    comm.direction || '',
    comm.source || 'database',
    (comm.body || '').replace(/"/g, '""').substring(0, 500), // Escape quotes, limit length
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export function CommunicationView({
  clientId,
  isAdmin = false,
  clientName,
  communications: propCommunications,
  communicationsLoading: propCommunicationsLoading,
  onRefresh,
}: CommunicationViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [dateRange, setDateRange] = useState<DateRangeType>('all')
  const [showDateDropdown, setShowDateDropdown] = useState(false)
  const dateDropdownRef = useRef<HTMLDivElement>(null)

  // Client-side data fetching (when not admin)
  const [localCommunications, setLocalCommunications] = useState<Communication[]>([])
  const [localLoading, setLocalLoading] = useState(!isAdmin)

  // Use prop data for admin, local data for client
  const communications = isAdmin ? (propCommunications || []) : localCommunications
  const communicationsLoading = isAdmin ? propCommunicationsLoading : localLoading

  // Close date dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Client-side data fetching
  useEffect(() => {
    if (isAdmin) return // Skip for admin (data passed via props)

    async function fetchCommunications() {
      setLocalLoading(true)
      try {
        const res = await fetch(`/api/client/communications?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setLocalCommunications(data)
        }
      } catch (error) {
        console.error('Failed to fetch communications:', error)
      } finally {
        setLocalLoading(false)
      }
    }

    fetchCommunications()
  }, [clientId, isAdmin])

  // Refresh handler for client view
  const handleRefresh = async () => {
    if (isAdmin && onRefresh) {
      onRefresh()
      return
    }

    setLocalLoading(true)
    try {
      const res = await fetch(`/api/client/communications?clientId=${clientId}`)
      if (res.ok) {
        const data = await res.json()
        setLocalCommunications(data)
      }
    } catch (error) {
      console.error('Failed to refresh communications:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  // Calculate stats from communications
  const emailTypes = ['email_invite', 'email_reminder', 'email_general', 'email_highlevel']
  const emails = communications.filter(c => emailTypes.includes(c.type))
  const deliveredEmails = emails.filter(c => c.status === 'sent' || c.status === 'delivered' || c.status === 'opened' || c.status === 'clicked')
  const failedEmails = emails.filter(c => c.status === 'failed')
  const bouncedEmails = emails.filter(c => c.status === 'bounced')

  const resultAlerts = communications.filter(c => c.type === 'result_alert')
  const viewedAlerts = resultAlerts.filter(c => c.openedAt || c.status === 'opened' || c.status === 'clicked')

  // SMS messages from HighLevel
  const smsMessages = communications.filter(c => c.type === 'sms')
  const inboundSms = smsMessages.filter(c => c.direction === 'inbound')
  const outboundSms = smsMessages.filter(c => c.direction === 'outbound')

  // Chat messages (includes HighLevel chat types)
  const chatTypes = ['chat', 'chat_facebook', 'chat_instagram', 'chat_whatsapp']
  const chatMessages = communications.filter(c => chatTypes.includes(c.type) || c.type.startsWith('chat_'))
  const inboundChat = chatMessages.filter(c => c.direction === 'inbound')

  const contentComms = communications.filter(c => c.type.startsWith('content_'))
  const pendingContent = contentComms.filter(c => c.status === 'pending_review' || c.status === 'needs_revision')

  // Build detail strings
  const emailDetailParts = [`${deliveredEmails.length} delivered`]
  if (failedEmails.length > 0) emailDetailParts.push(`${failedEmails.length} failed`)
  if (bouncedEmails.length > 0) emailDetailParts.push(`${bouncedEmails.length} bounced`)

  const alertDetail = viewedAlerts.length === resultAlerts.length && resultAlerts.length > 0
    ? (resultAlerts.length === 1 ? 'Opened' : 'All opened')
    : `${viewedAlerts.length} opened`

  const smsDetail = smsMessages.length > 0
    ? `${outboundSms.length} sent, ${inboundSms.length} received`
    : 'No messages'

  const chatDetail = chatMessages.length > 0
    ? `${inboundChat.length} from client`
    : 'No messages'

  // Get date range cutoff
  const getDateCutoff = () => {
    const now = new Date()
    switch (dateRange) {
      case '7days': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30days': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90days': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      default: return null
    }
  }
  const dateCutoff = getDateCutoff()

  // Filter communications based on selected filter and date range
  const filteredComms = communications.filter(comm => {
    // Date range filter
    if (dateCutoff) {
      const commDate = new Date(comm.sentAt || comm.createdAt || 0)
      if (commDate < dateCutoff) return false
    }
    // Type filter
    if (activeFilter === 'all') return true
    if (activeFilter === 'emails') return emailTypes.includes(comm.type)
    if (activeFilter === 'alerts') return comm.type === 'result_alert'
    if (activeFilter === 'sms') return comm.type === 'sms'
    if (activeFilter === 'chat') return chatTypes.includes(comm.type) || comm.type.startsWith('chat_')
    if (activeFilter === 'content') return comm.type.startsWith('content_')
    return true
  })

  // Date range label helper
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '7days': return 'Last 7 Days'
      case '30days': return 'Last 30 Days'
      case '90days': return 'Last 90 Days'
      default: return 'All Time'
    }
  }

  // Get display name for admin
  const displayName = clientName || 'client'

  return (
    <div className="communication-content">
      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Communications</div>
          <div className="stat-value">{communications.length}</div>
          <div className="stat-detail">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Emails</div>
          <div className="stat-value">{emails.length}</div>
          <div className="stat-detail">{emailDetailParts.join(', ')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">SMS Messages</div>
          <div className="stat-value" style={{ color: '#10B981' }}>{smsMessages.length}</div>
          <div className="stat-detail">{smsDetail}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Chat Messages</div>
          <div className="stat-value blue">{chatMessages.length}</div>
          <div className="stat-detail">{chatDetail}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Result Alerts</div>
          <div className="stat-value purple">{resultAlerts.length}</div>
          <div className="stat-detail">{alertDetail}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Content Updates</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>{contentComms.length}</div>
          <div className="stat-detail">{pendingContent.length > 0 ? `${pendingContent.length} pending` : 'All reviewed'}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${activeFilter === 'emails' ? 'active' : ''}`}
            onClick={() => setActiveFilter('emails')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Emails
          </button>
          <button
            className={`filter-tab ${activeFilter === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveFilter('alerts')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Result Alerts
          </button>
          <button
            className={`filter-tab ${activeFilter === 'sms' ? 'active' : ''}`}
            onClick={() => setActiveFilter('sms')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <path d="M8 10h8"></path>
              <path d="M8 14h4"></path>
            </svg>
            SMS
          </button>
          <button
            className={`filter-tab ${activeFilter === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveFilter('chat')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Chat
          </button>
          <button
            className={`filter-tab ${activeFilter === 'content' ? 'active' : ''}`}
            onClick={() => setActiveFilter('content')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Content
          </button>
        </div>
        <div className="filter-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={communicationsLoading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            {communicationsLoading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="dropdown-container" ref={dateDropdownRef} style={{ position: 'relative' }}>
            <button
              className={`btn btn-secondary btn-sm ${dateRange !== 'all' ? 'active' : ''}`}
              onClick={() => setShowDateDropdown(!showDateDropdown)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {getDateRangeLabel()}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: '4px' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {showDateDropdown && (
              <div className="dropdown-menu" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '4px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
                minWidth: '140px',
                overflow: 'hidden',
              }}>
                {(['all', '7days', '30days', '90days'] as DateRangeType[]).map(range => (
                  <button
                    key={range}
                    onClick={() => { setDateRange(range); setShowDateDropdown(false) }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '10px 14px',
                      textAlign: 'left',
                      background: dateRange === range ? 'var(--bg-secondary)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {range === 'all' ? 'All Time' : range === '7days' ? 'Last 7 Days' : range === '30days' ? 'Last 30 Days' : 'Last 90 Days'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const filename = isAdmin
                ? `${displayName}-communications-${new Date().toISOString().split('T')[0]}.csv`
                : `communications-${new Date().toISOString().split('T')[0]}.csv`
              exportToCSV(filteredComms, filename)
            }}
            disabled={filteredComms.length === 0}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* Communication Timeline */}
      <div className="timeline-card">
        <div className="timeline-header">
          <div className="timeline-title">
            <h3>Communication Timeline</h3>
            <p>{isAdmin ? 'All client communications in chronological order' : 'All communications in chronological order'}</p>
          </div>
        </div>

        <ul className="timeline-list">
          {communicationsLoading ? (
            <li className="timeline-empty">
              <div className="spinner" style={{ width: 24, height: 24 }}></div>
              Loading communications...
            </li>
          ) : filteredComms.length === 0 ? (
            <li className="timeline-empty">
              No {activeFilter === 'all' ? 'communications' : activeFilter} found
            </li>
          ) : (
            filteredComms.map(comm => {
              const { dateStr, timeStr } = formatTimelineDate(comm.sentAt || comm.createdAt)
              return (
                <CommunicationItem
                  key={comm.id}
                  comm={comm}
                  dateStr={dateStr}
                  timeStr={timeStr}
                  showReviewButton={!isAdmin}
                  showResentLink={isAdmin}
                />
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
