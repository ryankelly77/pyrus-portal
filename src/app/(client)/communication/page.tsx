'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

type FilterType = 'all' | 'emails' | 'alerts' | 'sms' | 'chat' | 'content'

interface Communication {
  id: string
  clientId: string
  type: string
  title: string
  subject: string | null
  body: string | null
  status: string | null
  metadata: Record<string, any> | null
  highlightType: string | null
  recipientEmail?: string | null
  openedAt: string | null
  clickedAt: string | null
  sentAt: string | null
  createdAt: string | null
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
}

export default function CommunicationPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  usePageView({ page: '/communication', pageName: 'Communication' })

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [communications, setCommunications] = useState<Communication[]>([])
  const [communicationsLoading, setCommunicationsLoading] = useState(true)

  // Fetch communications
  useEffect(() => {
    async function fetchCommunications() {
      setCommunicationsLoading(true)
      try {
        const url = viewingAs
          ? `/api/client/communications?clientId=${viewingAs}`
          : '/api/client/communications'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setCommunications(data)
        }
      } catch (error) {
        console.error('Failed to fetch communications:', error)
      } finally {
        setCommunicationsLoading(false)
      }
    }
    fetchCommunications()
  }, [viewingAs])

  // Check if client is pending (prospect only)
  const isPending = client.status === 'pending'

  // Calculate stats from communications (matching admin page logic)
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

  // Open rate includes both emails and result alerts
  const allEmailTypes = [...emails, ...resultAlerts]
  const openedEmails = allEmailTypes.filter(c => c.openedAt || c.status === 'opened' || c.status === 'clicked')
  const deliveredForRate = allEmailTypes.filter(c => c.status === 'sent' || c.status === 'delivered' || c.status === 'opened' || c.status === 'clicked')
  const openRate = deliveredForRate.length > 0 ? Math.round((openedEmails.length / deliveredForRate.length) * 100) : 0

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

  // Filter communications based on selected filter
  const filteredComms = communications.filter(comm => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'emails') return emailTypes.includes(comm.type)
    if (activeFilter === 'alerts') return comm.type === 'result_alert'
    if (activeFilter === 'sms') return comm.type === 'sms'
    if (activeFilter === 'chat') return chatTypes.includes(comm.type) || comm.type.startsWith('chat_')
    if (activeFilter === 'content') return comm.type.startsWith('content_')
    return true
  })

  // Show loading state while fetching client data
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Communication</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </div>
      </>
    )
  }

  // If client is pending, show locked placeholder
  if (isPending) {
    return (
      <>
        {/* Top Header Bar */}
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Communication</h1>
          </div>
          <div className="client-top-header-right">
            <Link href="/notifications" className="btn-icon has-notification">
              <span className="notification-badge"></span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </Link>
            <Link href="/settings" className="user-menu-link">
              <div className="user-avatar-small">
                <span>{client.initials}</span>
              </div>
              <span className="user-name">{client.contactName}</span>
            </Link>
          </div>
        </div>
        <div className="client-content">
          <div className="locked-page-placeholder">
            <div className="locked-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Communication Available After Purchase</h2>
            <p>Once you become an active client, you&apos;ll see all communications, updates, and notifications from your marketing team here.</p>
            <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'} className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              View Your Proposal
            </Link>
          </div>
        </div>
      </>
    )
  }

  // Helper functions for rendering timeline items
  const getIconClass = (type: string, metadata: Record<string, any> | null) => {
    if (type === 'result_alert') {
      const alertType = metadata?.alertType || 'other'
      switch (alertType) {
        case 'ranking': return 'result-ranking'
        case 'traffic': return 'result-traffic'
        case 'leads': return 'result-leads'
        case 'milestone': return 'result-milestone'
        case 'ai': return 'result-ai'
        default: return 'result-other'
      }
    }
    switch (type) {
      case 'email_invite': return 'email-invite'
      case 'email_reminder': return 'email-reminder'
      case 'email_general':
      case 'email_highlevel': return 'email-invite'
      case 'sms': return 'sms'
      case 'chat':
      case 'chat_facebook':
      case 'chat_instagram':
      case 'chat_whatsapp': return 'chat'
      case 'monthly_report': return 'monthly-report'
      case 'content_approved':
      case 'content_review':
      case 'content_revision': return 'monthly-report'
      default: return type.startsWith('chat_') ? 'chat' : 'email-invite'
    }
  }

  const getTypeLabel = (type: string, metadata: Record<string, any> | null, direction?: string) => {
    if (type === 'result_alert') {
      const alertLabel = metadata?.alertTypeLabel || 'Result Alert'
      return { label: alertLabel, class: 'result' }
    }
    switch (type) {
      case 'email_invite': return { label: 'Invitation', class: 'invitation' }
      case 'email_reminder': return { label: 'Reminder', class: 'reminder' }
      case 'email_general': return { label: 'Email', class: 'invitation' }
      case 'email_highlevel': return { label: direction === 'inbound' ? 'Email Received' : 'Email', class: 'invitation' }
      case 'sms': return { label: direction === 'inbound' ? 'SMS Received' : 'SMS Sent', class: 'sms' }
      case 'chat': return { label: direction === 'inbound' ? 'Message' : 'Reply', class: 'chat' }
      case 'chat_facebook': return { label: 'Facebook', class: 'chat' }
      case 'chat_instagram': return { label: 'Instagram', class: 'chat' }
      case 'chat_whatsapp': return { label: 'WhatsApp', class: 'chat' }
      case 'monthly_report': return { label: 'Report', class: 'report' }
      case 'content_approved':
      case 'content_review':
      case 'content_revision': return { label: 'Content', class: 'report' }
      default: return { label: type.replace(/_/g, ' '), class: 'invitation' }
    }
  }

  const getIcon = (type: string, metadata: Record<string, any> | null) => {
    if (type === 'result_alert') {
      const alertType = metadata?.alertType || 'other'
      switch (alertType) {
        case 'ranking':
          return <><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></>
        case 'traffic':
          return <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></>
        case 'leads':
          return <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></>
        case 'milestone':
          return <><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></>
        case 'ai':
          return <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path></>
        default:
          return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      }
    }
    // SMS icon (message bubble with phone)
    if (type === 'sms') {
      return <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path><path d="M8 10h8"></path><path d="M8 14h4"></path></>
    }
    // Chat/message icons
    if (type === 'chat' || type.startsWith('chat_')) {
      return <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    }
    if (type === 'monthly_report' || type.startsWith('content_')) {
      return <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></>
    }
    if (type === 'email_reminder') {
      return <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></>
    }
    return <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></>
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Communication</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/notifications" className="btn-icon has-notification">
            <span className="notification-badge"></span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </Link>
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>{client.initials}</span>
            </div>
            <span className="user-name">{client.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Communication Content */}
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
              <div className="stat-label">Result Alerts</div>
              <div className="stat-value purple">{resultAlerts.length}</div>
              <div className="stat-detail">{alertDetail}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chat Messages</div>
              <div className="stat-value blue">{chatMessages.length}</div>
              <div className="stat-detail">{chatDetail}</div>
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
          </div>

          {/* Communication Timeline */}
          <div className="timeline-card">
            <div className="timeline-header">
              <div className="timeline-title">
                <h3>Communication Timeline</h3>
                <p>All communications in chronological order</p>
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
                  const sentDate = comm.sentAt ? new Date(comm.sentAt) : new Date()
                  const dateStr = sentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  const timeStr = sentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST'

                  const isContentType = comm.type.startsWith('content_')
                  const contentStatus = isContentType ? comm.status : null
                  const typeInfo = getTypeLabel(comm.type, comm.metadata, comm.direction)
                  const highlightClass = comm.highlightType ? `highlight-${comm.highlightType}` : ''

                  return (
                    <li key={comm.id} className={`timeline-item ${highlightClass}`} data-type={comm.type}>
                      <div className="timeline-date">
                        <span className="date">{dateStr}</span>
                        <span className="time">{timeStr}</span>
                      </div>
                      <div className="timeline-content">
                        <div className={`comm-icon ${getIconClass(comm.type, comm.metadata)}`}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {getIcon(comm.type, comm.metadata)}
                          </svg>
                        </div>
                        <div className="comm-details">
                          <div className="comm-header">
                            <div className="comm-title">
                              <h4>{comm.title} <span className={`type-label ${typeInfo.class}`}>{typeInfo.label}</span></h4>
                            </div>
                            <div className="comm-status">
                              {/* Email delivery statuses */}
                              {!isContentType && comm.status !== 'failed' && comm.status !== 'bounced' && (
                                <span className="status-pill sent">Sent</span>
                              )}
                              {!isContentType && (comm.status === 'delivered' || comm.status === 'opened' || comm.status === 'clicked') && (
                                <span className="status-pill delivered">Delivered</span>
                              )}
                              {!isContentType && (comm.openedAt || comm.status === 'opened' || comm.status === 'clicked') && (
                                <span className="status-pill opened">Opened</span>
                              )}
                              {!isContentType && (comm.clickedAt || comm.status === 'clicked') && (
                                <span className="status-pill clicked">Clicked</span>
                              )}
                              {!isContentType && comm.status === 'failed' && (
                                <span className="status-pill failed">Failed</span>
                              )}
                              {!isContentType && comm.status === 'bounced' && (
                                <span className="status-pill failed">Bounced</span>
                              )}
                              {/* Content-specific statuses */}
                              {contentStatus === 'published' && (
                                <span className="status-pill published">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  Published
                                </span>
                              )}
                              {contentStatus === 'pending_review' && (
                                <span className="status-pill pending-review">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                  </svg>
                                  Pending Review
                                </span>
                              )}
                              {contentStatus === 'needs_revision' && (
                                <span className="status-pill needs-revision">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                  Needs Revision
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Source indicator for CRM messages */}
                          {comm.source === 'highlevel' && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>via CRM</span>
                          )}

                          {/* Body text for non-result communications */}
                          {comm.body && !comm.type.startsWith('result_') && !comm.metadata?.feedback && (
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '8px' }}>{comm.body}</p>
                          )}

                          {/* Result highlight for result alerts */}
                          {comm.type === 'result_alert' && comm.metadata && (comm.metadata.keyword || comm.metadata.keywords || comm.metadata.milestone) && (
                            <div className={`result-highlight result-highlight-${comm.metadata.alertType || 'other'}`} style={{ marginTop: '12px' }}>
                              <div className="result-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  {comm.metadata.alertType === 'ranking' && <><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></>}
                                  {comm.metadata.alertType === 'traffic' && <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></>}
                                  {comm.metadata.alertType === 'leads' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></>}
                                  {comm.metadata.alertType === 'milestone' && <><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></>}
                                  {comm.metadata.alertType === 'ai' && <><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path><path d="M20 3v4"></path><path d="M22 5h-4"></path><path d="M4 17v2"></path><path d="M5 18H3"></path></>}
                                  {(comm.metadata.alertType === 'other' || !comm.metadata.alertType) && <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>}
                                </svg>
                              </div>
                              <div className="result-text">
                                {/* Multiple keywords (new format) */}
                                {comm.metadata.keywords && comm.metadata.keywords.length > 0 && (() => {
                                  const keywords = comm.metadata.keywords as { keyword: string; newPosition: number | null; previousPosition: number | null }[]
                                  return (
                                    <>
                                      {comm.body && <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'normal' }}>{comm.body}</span>}
                                      {keywords.map((kw, idx) => (
                                        <div key={idx} style={{ marginBottom: idx < keywords.length - 1 ? '10px' : 0 }}>
                                          <strong>&quot;{kw.keyword}&quot; — Now Position #{kw.newPosition || '?'}</strong>
                                          {kw.previousPosition && kw.newPosition && (
                                            <span style={{ display: 'block' }}>Moved from position #{kw.previousPosition} to #{kw.newPosition} (up {kw.previousPosition - kw.newPosition} spots!){kw.newPosition <= 10 ? ' - First page visibility achieved' : ''}</span>
                                          )}
                                        </div>
                                      ))}
                                    </>
                                  )
                                })()}
                                {/* Legacy single keyword */}
                                {!comm.metadata.keywords && comm.metadata.keyword && (
                                  <>
                                    {comm.body && <span style={{ display: 'block', marginBottom: '8px', fontWeight: 'normal' }}>{comm.body}</span>}
                                    <strong>&quot;{comm.metadata.keyword}&quot; — Now Position #{comm.metadata.newPosition}</strong>
                                    {comm.metadata.previousPosition && (
                                      <span>Moved from position #{comm.metadata.previousPosition} to #{comm.metadata.newPosition} (up {comm.metadata.previousPosition - comm.metadata.newPosition} spots!){comm.metadata.newPosition <= 10 ? ' - First page visibility achieved' : ''}</span>
                                    )}
                                  </>
                                )}
                                {/* Milestone */}
                                {comm.metadata.milestone && (
                                  <>
                                    <strong>{comm.metadata.milestone}</strong>
                                    {comm.body && <span style={{ display: 'block', marginTop: '4px', fontWeight: 'normal' }}>{comm.body}</span>}
                                  </>
                                )}
                                {/* Body only (no keyword/milestone) */}
                                {!comm.metadata.keyword && !comm.metadata.keywords && !comm.metadata.milestone && comm.body && (
                                  <span style={{ fontWeight: 'normal' }}>{comm.body}</span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Clicked button indicator */}
                          {comm.clickedAt && comm.metadata?.clickedButton && (
                            <div className="click-inline">
                              <div className="click-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                  <polyline points="10 17 15 12 10 7"></polyline>
                                  <line x1="15" y1="12" x2="3" y2="12"></line>
                                </svg>
                              </div>
                              <span className="click-text">Clicked &quot;<strong>{comm.metadata.clickedButton}</strong>&quot; button</span>
                              {comm.metadata.clickedAt && <span className="click-time">{comm.metadata.clickedAt}</span>}
                            </div>
                          )}

                          {/* Error message for failed emails */}
                          {comm.status === 'failed' && comm.metadata?.errorMessage && (
                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--error-text)', background: 'var(--error-bg)', padding: '8px 12px', borderRadius: '6px' }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                              <span>{comm.metadata.errorMessage}</span>
                            </div>
                          )}

                          {/* Content feedback */}
                          {comm.type === 'content_revision' && comm.metadata?.feedback && (
                            <div style={{ marginTop: '8px' }}>
                              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Feedback:</strong>
                              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '4px' }}>{comm.metadata.feedback}</span>
                            </div>
                          )}

                          {/* Review button for pending content */}
                          {comm.type === 'content_review' && comm.status === 'pending_review' && (
                            <div style={{ marginTop: '12px' }}>
                              <Link href="/content" className="btn btn-sm btn-primary">Review Content</Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
