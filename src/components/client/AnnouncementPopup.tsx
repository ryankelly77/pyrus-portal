'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'

interface Announcement {
  id: string
  title: string
  message: string
  announcement_type: string
  display_frequency: string
  persistence_type: string
  allow_permanent_dismiss: boolean
  has_detail_page: boolean
  detail_html: string | null
  cta_button_text: string | null
  cta_button_url: string | null
  first_viewed_at: string | null
  view_count: number
}

const TYPE_STYLES: Record<string, { bg: string; accent: string; icon: React.ReactNode }> = {
  general: {
    bg: '#EFF6FF',
    accent: '#3B82F6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    ),
  },
  billing: {
    bg: '#FEF3C7',
    accent: '#F59E0B',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
  },
  platform_update: {
    bg: '#F3E8FF',
    accent: '#8B5CF6',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>
    ),
  },
  offer: {
    bg: '#DCFCE7',
    accent: '#22C55E',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
        <line x1="7" y1="7" x2="7.01" y2="7"></line>
      </svg>
    ),
  },
  maintenance: {
    bg: '#FEE2E2',
    accent: '#EF4444',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    ),
  },
}

function getPageFromPathname(pathname: string): string {
  if (pathname === '/' || pathname === '/dashboard') return 'dashboard'
  if (pathname.startsWith('/results')) return 'results'
  if (pathname.startsWith('/content')) return 'content'
  if (pathname.startsWith('/website')) return 'website'
  if (pathname.startsWith('/communication')) return 'communication'
  if (pathname.startsWith('/recommendations')) return 'recommendations'
  if (pathname.startsWith('/billing')) return 'billing'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'all'
}

export function AnnouncementPopup() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const viewingAs = searchParams.get('viewingAs')
  const currentPage = getPageFromPathname(pathname)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showDetailPage, setShowDetailPage] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    async function fetchAnnouncements() {
      try {
        const url = viewingAs
          ? `/api/client/announcements?page=${currentPage}&clientId=${viewingAs}`
          : `/api/client/announcements?page=${currentPage}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          const filtered = filterByFrequency(data.announcements || [])
          setAnnouncements(filtered)
        }
      } catch (error) {
        console.error('Failed to fetch announcements:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [viewingAs, mounted, currentPage])

  // Log view when announcement is displayed
  useEffect(() => {
    if (loading || announcements.length === 0) return

    const announcement = announcements[currentIndex]
    if (!announcement) return

    const logView = async () => {
      try {
        const url = viewingAs
          ? `/api/client/announcements/${announcement.id}/view?clientId=${viewingAs}`
          : `/api/client/announcements/${announcement.id}/view`
        await fetch(url, { method: 'POST' })
      } catch (error) {
        console.error('Failed to log announcement view:', error)
      }
    }
    logView()
  }, [loading, announcements, currentIndex, viewingAs])

  function filterByFrequency(items: Announcement[]): Announcement[] {
    return items.filter((announcement) => {
      const sessionKey = `announcement_shown_${announcement.id}`
      const dayKey = `announcement_day_${announcement.id}`

      if (announcement.display_frequency === 'once_per_session') {
        if (typeof window !== 'undefined' && sessionStorage.getItem(sessionKey)) {
          return false
        }
      }

      if (announcement.display_frequency === 'once_per_day') {
        if (typeof window !== 'undefined') {
          const lastShown = localStorage.getItem(dayKey)
          if (lastShown) {
            const lastDate = new Date(lastShown).toDateString()
            const today = new Date().toDateString()
            if (lastDate === today) {
              return false
            }
          }
        }
      }

      return true
    })
  }

  function markAsShownForSession(id: string, frequency: string) {
    if (typeof window === 'undefined') return

    if (frequency === 'once_per_session') {
      sessionStorage.setItem(`announcement_shown_${id}`, 'true')
    }
    if (frequency === 'once_per_day') {
      localStorage.setItem(`announcement_day_${id}`, new Date().toISOString())
    }
  }

  const dismissAnnouncement = async (permanent: boolean = false) => {
    if (announcements.length === 0) return

    const announcement = announcements[currentIndex]
    setDismissing(true)

    try {
      const url = viewingAs
        ? `/api/client/announcements/${announcement.id}/dismiss?clientId=${viewingAs}`
        : `/api/client/announcements/${announcement.id}/dismiss`

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permanent }),
      })

      if (res.ok) {
        markAsShownForSession(announcement.id, announcement.display_frequency)
        setAnnouncements((prev) => prev.filter((_, i) => i !== currentIndex))
        setShowDetailPage(false)
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
        }
      }
    } catch (error) {
      console.error('Failed to dismiss announcement:', error)
    } finally {
      setDismissing(false)
    }
  }

  const closeWithoutDismiss = () => {
    const announcement = announcements[currentIndex]
    markAsShownForSession(announcement.id, announcement.display_frequency)
    setAnnouncements((prev) => prev.filter((_, i) => i !== currentIndex))
    setShowDetailPage(false)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading || announcements.length === 0) {
    return null
  }

  const announcement = announcements[currentIndex]
  const typeStyle = TYPE_STYLES[announcement.announcement_type] || TYPE_STYLES.general
  const canDismiss = announcement.persistence_type !== 'required_action'

  // Detail page view
  if (showDetailPage && announcement.has_detail_page && announcement.detail_html) {
    return (
      <>
        <div className="announcement-overlay" onClick={() => setShowDetailPage(false)}>
          <div className="announcement-detail-page" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <h2>{announcement.title}</h2>
              <button
                className="detail-close-btn"
                onClick={() => setShowDetailPage(false)}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div
              className="detail-content"
              dangerouslySetInnerHTML={{ __html: announcement.detail_html }}
            />
            <div className="detail-footer">
              {announcement.cta_button_text && announcement.cta_button_url && (
                <a
                  href={announcement.cta_button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-cta-btn"
                >
                  {announcement.cta_button_text}
                </a>
              )}
              {canDismiss && (
                <button
                  className="detail-dismiss-btn"
                  onClick={() => dismissAnnouncement(announcement.allow_permanent_dismiss)}
                  disabled={dismissing}
                >
                  {dismissing ? 'Dismissing...' : "Got it, don't show again"}
                </button>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          .announcement-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }

          .announcement-detail-page {
            background: white;
            border-radius: 16px;
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }

          .detail-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid #E5E7EB;
            background: ${typeStyle.bg};
          }

          .detail-header h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #111827;
          }

          .detail-close-btn {
            width: 32px;
            height: 32px;
            border: none;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6B7280;
            transition: all 0.15s ease;
          }

          .detail-close-btn:hover {
            background: rgba(0, 0, 0, 0.1);
            color: #374151;
          }

          .detail-close-btn svg {
            width: 18px;
            height: 18px;
          }

          .detail-content {
            padding: 24px;
            overflow-y: auto;
            flex: 1;
            font-size: 15px;
            line-height: 1.7;
            color: #374151;
          }

          .detail-content :global(h1),
          .detail-content :global(h2),
          .detail-content :global(h3) {
            color: #111827;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
          }

          .detail-content :global(h1:first-child),
          .detail-content :global(h2:first-child),
          .detail-content :global(h3:first-child) {
            margin-top: 0;
          }

          .detail-content :global(p) {
            margin: 0 0 1em 0;
          }

          .detail-content :global(ul),
          .detail-content :global(ol) {
            margin: 0 0 1em 0;
            padding-left: 1.5em;
          }

          .detail-content :global(li) {
            margin-bottom: 0.5em;
          }

          .detail-content :global(a) {
            color: ${typeStyle.accent};
            text-decoration: underline;
          }

          .detail-content :global(img) {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1em 0;
          }

          .detail-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 24px;
            border-top: 1px solid #E5E7EB;
            background: #F9FAFB;
          }

          .detail-cta-btn {
            padding: 10px 20px;
            background: ${typeStyle.accent};
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .detail-cta-btn:hover {
            opacity: 0.9;
          }

          .detail-dismiss-btn {
            padding: 10px 20px;
            background: white;
            color: #374151;
            border: 1px solid #D1D5DB;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
          }

          .detail-dismiss-btn:hover:not(:disabled) {
            background: #F9FAFB;
            border-color: #9CA3AF;
          }

          .detail-dismiss-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          @media (max-width: 600px) {
            .announcement-overlay {
              padding: 0;
              align-items: flex-end;
            }

            .announcement-detail-page {
              border-radius: 16px 16px 0 0;
              max-height: 85vh;
            }

            .detail-footer {
              flex-direction: column;
            }
          }
        `}</style>
      </>
    )
  }

  // Popup view
  return (
    <>
      <div className="announcement-overlay" onClick={canDismiss ? closeWithoutDismiss : undefined}>
        <div className="announcement-popup" onClick={(e) => e.stopPropagation()}>
          <div className="popup-header">
            <div className="popup-icon">{typeStyle.icon}</div>
            <span className="popup-title">{announcement.title}</span>
            {canDismiss && (
              <button
                className="popup-close-btn"
                onClick={closeWithoutDismiss}
                disabled={dismissing}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            )}
          </div>

          <div className="popup-body">
            <p className="popup-message">{announcement.message}</p>
          </div>

          <div className="popup-actions">
            {announcement.has_detail_page && announcement.detail_html && (
              <button
                className="popup-btn popup-btn-primary"
                onClick={() => setShowDetailPage(true)}
              >
                Read More
              </button>
            )}
            {announcement.cta_button_text && announcement.cta_button_url && !announcement.has_detail_page && (
              <a
                href={announcement.cta_button_url}
                target="_blank"
                rel="noopener noreferrer"
                className="popup-btn popup-btn-primary"
              >
                {announcement.cta_button_text}
              </a>
            )}
            {canDismiss && (
              <button
                className="popup-btn popup-btn-secondary"
                onClick={() => dismissAnnouncement(announcement.allow_permanent_dismiss)}
                disabled={dismissing}
              >
                {dismissing ? 'Dismissing...' : announcement.allow_permanent_dismiss ? "Don't show again" : 'Dismiss'}
              </button>
            )}
          </div>

          {announcements.length > 1 && (
            <div className="popup-pagination">
              {announcements.map((_, idx) => (
                <button
                  key={idx}
                  className={`pagination-dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`View announcement ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .announcement-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .announcement-popup {
          background: white;
          border-radius: 16px;
          max-width: 480px;
          width: 100%;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: ${typeStyle.bg};
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .popup-icon {
          width: 28px;
          height: 28px;
          color: ${typeStyle.accent};
          flex-shrink: 0;
        }

        .popup-icon :global(svg) {
          width: 100%;
          height: 100%;
        }

        .popup-title {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          flex: 1;
        }

        .popup-close-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          transition: all 0.15s ease;
        }

        .popup-close-btn:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.1);
          color: #374151;
        }

        .popup-close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .popup-close-btn :global(svg) {
          width: 18px;
          height: 18px;
        }

        .popup-body {
          padding: 20px;
        }

        .popup-message {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          margin: 0;
          white-space: pre-wrap;
        }

        .popup-actions {
          display: flex;
          gap: 10px;
          padding: 0 20px 20px 20px;
        }

        .popup-btn {
          flex: 1;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .popup-btn-primary {
          background: ${typeStyle.accent};
          color: white;
          border: none;
        }

        .popup-btn-primary:hover {
          opacity: 0.9;
        }

        .popup-btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #D1D5DB;
        }

        .popup-btn-secondary:hover:not(:disabled) {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }

        .popup-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .popup-pagination {
          display: flex;
          justify-content: center;
          gap: 8px;
          padding: 0 20px 16px 20px;
        }

        .pagination-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          border: none;
          background: #D1D5DB;
          cursor: pointer;
          padding: 0;
          transition: all 0.15s ease;
        }

        .pagination-dot.active {
          background: ${typeStyle.accent};
          width: 20px;
          border-radius: 4px;
        }

        .pagination-dot:hover:not(.active) {
          background: #9CA3AF;
        }

        @media (max-width: 500px) {
          .announcement-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .announcement-popup {
            border-radius: 16px 16px 0 0;
          }

          .popup-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  )
}
