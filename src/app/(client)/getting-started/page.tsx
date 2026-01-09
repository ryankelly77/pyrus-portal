'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getClientByViewingAs } from '@/lib/client-data'

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  actionType: string | null
  actionUrl: string | null
  actionLabel: string | null
  isCompleted: boolean
  completedAt: string | null
  notes: string | null
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingResponse {
  id: string
  question: string
  answer: string | string[] | null
  questionType: string
  product: {
    id: string
    name: string
    category: string
  }
}

interface VideoChapter {
  id: string
  title: string
  description: string
  videoUrl: string
}

interface OnboardingData {
  client: {
    id: string
    name: string
    contactName: string | null
    contactEmail: string | null
    startDate: string | null
  }
  checklist: {
    items: ChecklistItem[]
    progress: {
      completed: number
      total: number
      percent: number
    }
  }
  onboardingSummary: Record<string, OnboardingResponse[]>
}

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export default function GettingStartedPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const mockClient = getClientByViewingAs(viewingAs)

  const [activeSubtab, setActiveSubtab] = useState('checklist')
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientDisplay, setClientDisplay] = useState<{ name: string; initials: string; primaryContact: string }>({
    name: mockClient.name,
    initials: mockClient.initials,
    primaryContact: mockClient.primaryContact,
  })
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])
  const [activeVideoChapter, setActiveVideoChapter] = useState<string>('')

  // Fetch video chapters
  useEffect(() => {
    async function fetchVideoChapters() {
      try {
        const res = await fetch('/api/client/video-chapters')
        if (res.ok) {
          const data = await res.json()
          const chapters = data.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            videoUrl: c.video_url || ''
          })).filter((c: VideoChapter) => c.videoUrl)
          setVideoChapters(chapters)
          if (chapters.length > 0) {
            setActiveVideoChapter(chapters[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
      }
    }
    fetchVideoChapters()
  }, [])

  // Fetch onboarding data
  useEffect(() => {
    async function fetchData() {
      if (!viewingAs) {
        setLoading(false)
        return
      }

      try {
        // Use viewingAs directly - it could be a mock ID or a real database UUID
        const res = await fetch(`/api/client/onboarding?clientId=${viewingAs}`)
        if (res.ok) {
          const data = await res.json()
          setOnboardingData(data)
          // Update display info from API response if available
          if (data.client) {
            const initials = data.client.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            setClientDisplay({
              name: data.client.name,
              initials,
              primaryContact: data.client.contactName || data.client.name,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch onboarding data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [viewingAs])

  const checklist = onboardingData?.checklist
  const summary = onboardingData?.onboardingSummary || {}

  // Format answer for display
  const formatAnswer = (answer: string | string[] | null): string => {
    if (!answer) return ''
    if (Array.isArray(answer)) return answer.join(', ')
    return answer
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Getting Started</h1>
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
              <span>{clientDisplay.initials}</span>
            </div>
            <span className="user-name">{clientDisplay.primaryContact}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Getting Started Sub-tabs */}
        <div className="getting-started-subtabs">
          <button
            className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
            onClick={() => setActiveSubtab('checklist')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            Checklist
          </button>
          <button
            className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
            onClick={() => setActiveSubtab('onboarding-summary')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Onboarding Summary
          </button>
        </div>

        {/* Checklist Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
          <div className="onboarding-grid">
            <div className="checklist-card">
              <div className="checklist-header">
                <h3>Onboarding Checklist</h3>
                <p>Complete these steps to get the most from your marketing</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-label">
                    <span>Progress</span>
                    <span>
                      {loading ? '...' : checklist ? `${checklist.progress.completed} of ${checklist.progress.total} completed` : '0 of 0 completed'}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${checklist?.progress.percent || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="checklist-items">
                {loading ? (
                  <div className="checklist-loading">Loading checklist...</div>
                ) : checklist && checklist.items.length > 0 ? (
                  checklist.items.map((item) => (
                    <div key={item.id} className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}>
                      <div className={`checklist-checkbox ${item.isCompleted ? 'completed' : ''}`}>
                        {item.isCompleted && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">{item.title}</div>
                        <div className="checklist-item-desc">
                          {item.isCompleted && item.completedAt
                            ? `Completed ${new Date(item.completedAt).toLocaleDateString()}`
                            : item.description || `Related to ${item.product.name}`}
                        </div>
                      </div>
                      {!item.isCompleted && item.actionType && item.actionUrl && (
                        <div className="checklist-item-action">
                          {item.actionType === 'link' ? (
                            <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                              {item.actionLabel || 'View'}
                            </a>
                          ) : (
                            <button className="btn btn-secondary">
                              {item.actionLabel || 'Complete'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="checklist-empty">
                    <p>No checklist items yet. Complete your onboarding form to see your personalized checklist.</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="sidebar-card video-sidebar">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  Getting Started Videos
                </h4>
                {videoChapters.length > 0 ? (
                  <>
                    <div className="video-player-wrapper">
                      {(() => {
                        const activeChapter = videoChapters.find(c => c.id === activeVideoChapter)
                        return activeChapter?.videoUrl ? (
                          <iframe
                            src={activeChapter.videoUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                          />
                        ) : null
                      })()}
                    </div>
                    <div className="video-chapter-list">
                      {videoChapters.map((chapter, index) => (
                        <button
                          key={chapter.id}
                          className={`video-chapter-btn ${activeVideoChapter === chapter.id ? 'active' : ''}`}
                          onClick={() => setActiveVideoChapter(chapter.id)}
                        >
                          <span className="chapter-num">{index + 1}</span>
                          <div className="chapter-info">
                            <span className="chapter-title">{chapter.title}</span>
                            <span className="chapter-desc">{chapter.description}</span>
                          </div>
                          {activeVideoChapter === chapter.id && (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="chapter-playing">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="video-container">
                    <div className="video-placeholder">
                      <div className="video-play-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </div>
                    </div>
                    <p className="video-caption">Videos coming soon! Learn how to navigate your portal and get the most from your marketing partnership.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Summary Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
          <div className="onboarding-summary">
            {loading ? (
              <div className="summary-loading">Loading onboarding summary...</div>
            ) : Object.keys(summary).length > 0 ? (
              Object.entries(summary).map(([section, responses]) => (
                <div key={section} className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    {section}
                  </h3>
                  <div className="summary-content">
                    {responses.map((r) => (
                      <div key={r.id} className="summary-field full-width">
                        <label>{r.question}</label>
                        {r.answer ? (
                          r.questionType === 'url' ? (
                            <a href={formatAnswer(r.answer)} target="_blank" rel="noopener noreferrer">
                              {formatAnswer(r.answer)}
                            </a>
                          ) : (
                            <span>{formatAnswer(r.answer)}</span>
                          )
                        ) : (
                          <span className="empty">Not provided</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="summary-empty">
                <div className="summary-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h3>No Onboarding Data Yet</h3>
                <p>Complete your onboarding form to see your responses here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .checklist-loading,
        .summary-loading {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .checklist-empty,
        .summary-empty {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .summary-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
        }

        .summary-empty-icon {
          color: #d1d5db;
        }

        .summary-empty h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
        }

        .summary-empty p {
          margin: 0;
          color: #6b7280;
        }

        .summary-content {
          display: grid;
          gap: 1rem;
        }

        .summary-field.full-width {
          grid-column: 1 / -1;
        }

        /* Video Sidebar Styles */
        .video-sidebar h4 {
          margin-bottom: 1rem;
        }

        .video-player-wrapper {
          position: relative;
          padding-top: 56.25%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .video-chapter-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .video-chapter-btn {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: none;
          border: 1px solid transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
        }

        .video-chapter-btn:hover {
          background: #F5F7F6;
        }

        .video-chapter-btn.active {
          background: rgba(50, 68, 56, 0.08);
          border-color: rgba(50, 68, 56, 0.2);
        }

        .chapter-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E8EDEA;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #5A6358;
          flex-shrink: 0;
        }

        .video-chapter-btn.active .chapter-num {
          background: #324438;
          color: white;
        }

        .chapter-info {
          flex: 1;
          min-width: 0;
        }

        .chapter-title {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1A1F16;
          margin-bottom: 0.125rem;
        }

        .chapter-desc {
          display: block;
          font-size: 0.75rem;
          color: #5A6358;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chapter-playing {
          color: #324438;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
      `}</style>
    </>
  )
}
