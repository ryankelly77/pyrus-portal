'use client'

import { EmailBodyPreview } from './EmailBodyPreview'
import { ResultHighlight } from './ResultHighlight'

export interface CommunicationData {
  id: string
  type: string
  title: string
  subject?: string | null
  body?: string | null
  status?: string | null
  source?: 'database' | 'highlevel'
  direction?: 'inbound' | 'outbound'
  highlightType?: string | null
  openedAt?: string | null
  clickedAt?: string | null
  sentAt?: string | null
  createdAt?: string | null
  metadata?: Record<string, any> | null
}

interface CommunicationItemProps {
  comm: CommunicationData
  dateStr: string
  timeStr: string
  showReviewButton?: boolean // Show review button for content pending review (client view only)
  showResentLink?: boolean // Show "Resent" link for failed emails (admin view)
}

// Get type label and class for display
function getTypeLabel(type: string, metadata?: Record<string, any> | null, direction?: string): { label: string; class: string } {
  if (type === 'email_highlevel' || type === 'email') {
    return direction === 'inbound'
      ? { label: 'Email Received', class: 'email-received' }
      : { label: 'Email Sent', class: 'email-sent' }
  }
  if (type === 'sms') {
    return direction === 'inbound'
      ? { label: 'SMS Received', class: 'sms-received' }
      : { label: 'SMS Sent', class: 'sms-sent' }
  }
  if (type === 'chat_widget' || type === 'chat') {
    return { label: 'Live Chat', class: 'chat' }
  }
  if (type === 'email_invite') return { label: 'Invite', class: 'invite' }
  if (type === 'result_alert') {
    const alertType = metadata?.alertType || 'other'
    if (alertType === 'ranking') return { label: 'Ranking Alert', class: 'ranking' }
    if (alertType === 'traffic') return { label: 'Traffic Alert', class: 'traffic' }
    if (alertType === 'leads') return { label: 'Lead Alert', class: 'leads' }
    if (alertType === 'milestone') return { label: 'Milestone', class: 'milestone' }
    if (alertType === 'ai') return { label: 'AI Insight', class: 'ai' }
    return { label: 'Result Alert', class: 'result' }
  }
  if (type === 'task_complete') return { label: 'Task Complete', class: 'task' }
  if (type.startsWith('content_')) {
    const contentTypes: Record<string, { label: string; class: string }> = {
      content_blog: { label: 'Blog Post', class: 'content-blog' },
      content_social: { label: 'Social Post', class: 'content-social' },
      content_email_campaign: { label: 'Email Campaign', class: 'content-email' },
      content_video: { label: 'Video', class: 'content-video' },
      content_graphic: { label: 'Graphic', class: 'content-graphic' },
    }
    return contentTypes[type] || { label: 'Content', class: 'content' }
  }
  return { label: 'Message', class: 'default' }
}

// Get icon class for styling
function getIconClass(type: string, metadata?: Record<string, any> | null): string {
  if (type === 'email_invite') return 'email-invite'
  if (type === 'email_highlevel' || type === 'email') return 'email-crm'
  if (type === 'sms') return 'sms'
  if (type === 'chat_widget' || type === 'chat') return 'chat'
  if (type === 'task_complete') return 'task-complete'
  if (type === 'result_alert') {
    const alertType = metadata?.alertType || 'other'
    return `result-${alertType}`
  }
  if (type.startsWith('content_')) return 'content'
  return 'default'
}

// Get icon SVG path based on type
function getIcon(type: string, metadata?: Record<string, any> | null) {
  if (type === 'email_invite' || type === 'email_highlevel' || type === 'email') {
    return (
      <>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </>
    )
  }
  if (type === 'sms') {
    return (
      <>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </>
    )
  }
  if (type === 'chat_widget' || type === 'chat') {
    return (
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </>
    )
  }
  if (type === 'task_complete') {
    return (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </>
    )
  }
  if (type === 'result_alert') {
    const alertType = metadata?.alertType || 'other'
    if (alertType === 'ranking') {
      return (
        <>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          <line x1="11" y1="8" x2="11" y2="14"></line>
          <line x1="8" y1="11" x2="14" y2="11"></line>
        </>
      )
    }
    if (alertType === 'traffic') {
      return (
        <>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </>
      )
    }
    if (alertType === 'leads') {
      return (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </>
      )
    }
    if (alertType === 'milestone') {
      return (
        <>
          <circle cx="12" cy="8" r="7"></circle>
          <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
        </>
      )
    }
    if (alertType === 'ai') {
      return (
        <>
          <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>
          <path d="M20 3v4"></path>
          <path d="M22 5h-4"></path>
          <path d="M4 17v2"></path>
          <path d="M5 18H3"></path>
        </>
      )
    }
    return <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  }
  if (type.startsWith('content_')) {
    return (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </>
    )
  }
  // Default icon
  return (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </>
  )
}

export function CommunicationItem({ comm, dateStr, timeStr, showReviewButton, showResentLink }: CommunicationItemProps) {
  const isContentType = comm.type.startsWith('content_')
  const contentStatus = isContentType ? comm.status : null
  const typeInfo = getTypeLabel(comm.type, comm.metadata, comm.direction)
  const highlightClass = comm.highlightType ? `highlight-${comm.highlightType}` : ''

  return (
    <li className={`timeline-item ${highlightClass}`} data-type={comm.type}>
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
            <EmailBodyPreview body={comm.body} source={comm.source} />
          )}

          {/* Result highlight for result alerts */}
          {comm.type === 'result_alert' && comm.metadata && (comm.metadata.keyword || comm.metadata.keywords || comm.metadata.milestone) && (
            <ResultHighlight
              alertType={comm.metadata.alertType}
              keyword={comm.metadata.keyword}
              keywords={comm.metadata.keywords}
              milestone={comm.metadata.milestone}
              newPosition={comm.metadata.newPosition}
              previousPosition={comm.metadata.previousPosition}
              body={comm.body}
            />
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
              {showResentLink && comm.metadata.resentAt && (
                <a href="#" style={{ marginLeft: 'auto', color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                  Resent {comm.metadata.resentAt}
                </a>
              )}
            </div>
          )}

          {/* Content feedback for revisions */}
          {comm.type === 'content_revision' && comm.metadata?.feedback && (
            <div style={{ marginTop: '8px' }}>
              <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>Feedback:</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px', marginLeft: '4px' }}>{comm.metadata.feedback}</span>
            </div>
          )}

          {/* Review button for pending content - client view */}
          {showReviewButton && comm.type === 'content_review' && comm.status === 'pending_review' && (
            <div style={{ marginTop: '12px' }}>
              <a href="/content" className="btn btn-sm btn-primary">Review Content</a>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

// Helper to format date/time for the timeline
export function formatTimelineDate(dateStr: string | null | undefined): { dateStr: string; timeStr: string } {
  const date = dateStr ? new Date(dateStr) : new Date()
  return {
    dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    timeStr: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + ' CST',
  }
}
