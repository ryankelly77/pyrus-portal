'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'

type FilterType = 'all' | 'email' | 'result' | 'chat' | 'content'

export default function CommunicationPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client } = useClientData(viewingAs)

  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  const timelineItems = [
    { id: 1, type: 'result', date: 'Jan 2, 2026', time: '2:45 PM CST' },
    { id: 2, type: 'content', date: 'Jan 2, 2026', time: '3:30 PM CST' },
    { id: 3, type: 'content', date: 'Jan 2, 2026', time: '11:00 AM CST' },
    { id: 4, type: 'email', date: 'Jan 2, 2026', time: '8:00 AM CST' },
    { id: 5, type: 'content', date: 'Dec 31, 2025', time: '2:30 PM CST' },
    { id: 6, type: 'email', date: 'Dec 29, 2025', time: '2:30 PM CST' },
  ]

  const filteredItems = timelineItems.filter(
    item => activeFilter === 'all' || item.type === activeFilter
  )

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
              <div className="stat-value">11</div>
              <div className="stat-detail">Last 30 days</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Emails Sent</div>
              <div className="stat-value">4</div>
              <div className="stat-detail">3 delivered, 1 failed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Result Alerts</div>
              <div className="stat-value purple">2</div>
              <div className="stat-detail">Both viewed</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Chat Messages</div>
              <div className="stat-value blue">2</div>
              <div className="stat-detail">From HighLevel</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Email Open Rate</div>
              <div className="stat-value success">67%</div>
              <div className="stat-detail">2 of 3 delivered</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Content Reviews</div>
              <div className="stat-value" style={{ color: 'var(--primary)' }}>3</div>
              <div className="stat-detail">1 pending approval</div>
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
                className={`filter-tab ${activeFilter === 'email' ? 'active' : ''}`}
                onClick={() => setActiveFilter('email')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Emails
              </button>
              <button
                className={`filter-tab ${activeFilter === 'result' ? 'active' : ''}`}
                onClick={() => setActiveFilter('result')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                Result Alerts
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
              <button className="filter-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                Date Range
              </button>
              <button className="filter-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                <p>All client communications in chronological order</p>
              </div>
            </div>

            <ul className="timeline-list">
              {/* Result Alert - Page 1 Ranking */}
              {(activeFilter === 'all' || activeFilter === 'result') && (
                <li className="timeline-item highlight-success" data-type="result">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">2:45 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon result-alert">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Result Alert Sent
                            <span className="type-label result">Result Alert</span>
                          </h4>
                          <span className="subject">Your keyword is now ranking on Page 1!</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Delivered
                          </span>
                          <span className="status-pill opened">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Viewed
                          </span>
                        </div>
                      </div>
                      <div className="result-highlight">
                        <div className="result-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                          </svg>
                        </div>
                        <div className="result-text">
                          <strong>&quot;precision wound care San Antonio&quot; — Now Position #7</strong>
                          <span>Moved from position #24 to #7 (up 17 spots!) - First page visibility achieved</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Content Approved Notification */}
              {(activeFilter === 'all' || activeFilter === 'content') && (
                <li className="timeline-item highlight-success" data-type="content">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">3:30 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon content-review" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <polyline points="9 15 11 17 15 13"></polyline>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Content Approved
                            <span className="type-label" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Content</span>
                          </h4>
                          <span className="subject">&quot;January Services Update&quot; blog post has been approved and published</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Published
                          </span>
                        </div>
                      </div>
                      <div className="comm-preview">
                        <p>Your approved content is now live on your website. View it at tc-clinicalservices.com/blog/january-services-update</p>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Content Ready for Review */}
              {(activeFilter === 'all' || activeFilter === 'content') && (
                <li className="timeline-item" data-type="content">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">11:00 AM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon content-review" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Content Ready for Review
                            <span className="type-label" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Content</span>
                          </h4>
                          <span className="subject">&quot;Q1 2026 Marketing Goals&quot; blog post is waiting for your approval</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            Pending Review
                          </span>
                        </div>
                      </div>
                      <div className="comm-preview">
                        <p>New content has been submitted for your review. Please approve or request revisions.</p>
                      </div>
                      <div className="comm-actions" style={{ marginTop: '12px' }}>
                        <Link href="/content" className="btn btn-sm btn-primary">Review Content</Link>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Invitation Reminder - Opened & Clicked */}
              {(activeFilter === 'all' || activeFilter === 'email') && (
                <li className="timeline-item highlight-success" data-type="email">
                  <div className="timeline-date">
                    <span className="date">Jan 2, 2026</span>
                    <span className="time">8:00 AM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon email-reminder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Invitation Reminder
                            <span className="type-label reminder">Reminder</span>
                          </h4>
                          <span className="subject">Your Pyrus Digital portal is waiting for you</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill delivered">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Delivered
                          </span>
                          <span className="status-pill opened">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                              <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Opened
                          </span>
                          <span className="status-pill clicked">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                              <polyline points="10 17 15 12 10 7"></polyline>
                              <line x1="15" y1="12" x2="3" y2="12"></line>
                            </svg>
                            Clicked
                          </span>
                        </div>
                      </div>
                      <div className="click-inline">
                        <div className="click-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                            <polyline points="10 17 15 12 10 7"></polyline>
                            <line x1="15" y1="12" x2="3" y2="12"></line>
                          </svg>
                        </div>
                        <span className="click-text">Clicked <strong>&quot;Create Account&quot;</strong> button</span>
                        <span className="click-time">9:24 AM CST</span>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Content Revision Requested */}
              {(activeFilter === 'all' || activeFilter === 'content') && (
                <li className="timeline-item" data-type="content">
                  <div className="timeline-date">
                    <span className="date">Dec 31, 2025</span>
                    <span className="time">2:30 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon content-review" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="12" y1="9" x2="12.01" y2="9"></line>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Revision Requested
                            <span className="type-label" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Content</span>
                          </h4>
                          <span className="subject">&quot;Holiday Promotion Post&quot; requires changes before publishing</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 20h9"></path>
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            Needs Revision
                          </span>
                        </div>
                      </div>
                      <div className="comm-preview">
                        <p><strong>Feedback:</strong> Please update the pricing information to reflect January rates and adjust the call-to-action button text.</p>
                      </div>
                    </div>
                  </div>
                </li>
              )}

              {/* Portal Invitation - Failed */}
              {(activeFilter === 'all' || activeFilter === 'email') && (
                <li className="timeline-item highlight-failed" data-type="email">
                  <div className="timeline-date">
                    <span className="date">Dec 29, 2025</span>
                    <span className="time">2:30 PM CST</span>
                  </div>
                  <div className="timeline-content">
                    <div className="comm-icon email-failed">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                        <polyline points="22,6 12,13 2,6"></polyline>
                      </svg>
                    </div>
                    <div className="comm-details">
                      <div className="comm-header">
                        <div className="comm-title">
                          <h4>
                            Portal Invitation
                            <span className="type-label invitation">Invitation</span>
                          </h4>
                          <span className="subject">Welcome to Your Pyrus Digital Portal</span>
                        </div>
                        <div className="comm-status">
                          <span className="status-pill failed">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            Failed
                          </span>
                        </div>
                      </div>
                      <div className="failure-note">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Delivery failed: Mailbox full / temporary error</span>
                        <a href="#">Resent Dec 31</a>
                      </div>
                    </div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
