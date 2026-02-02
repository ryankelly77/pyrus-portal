'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Alert {
  id: string
  message: string
  alert_type: string
  published_at: string | null
}

function getAlertIcon(alertType: string) {
  switch (alertType) {
    case 'milestone':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      )
    case 'intervention':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )
    case 'performance_focus':
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      )
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AlertBanner() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // Ensure we're on the client before fetching
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Wait for client-side mount to ensure searchParams are hydrated
    if (!mounted) return

    async function fetchAlerts() {
      try {
        // Use admin endpoint if viewing as another client
        const url = viewingAs
          ? `/api/admin/clients/${viewingAs}/alerts`
          : '/api/client/alerts'
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setAlerts(data.alerts || [])
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [viewingAs, mounted])

  // Log alert view to activity feed when alert is displayed
  useEffect(() => {
    if (loading || alerts.length === 0) return

    const alert = alerts[0]
    const logView = async () => {
      try {
        const url = viewingAs
          ? `/api/client/alerts/${alert.id}/view?clientId=${viewingAs}`
          : `/api/client/alerts/${alert.id}/view`
        await fetch(url, { method: 'POST' })
      } catch (error) {
        // Silent fail - logging is non-critical
        console.error('Failed to log alert view:', error)
      }
    }
    logView()
  }, [loading, alerts, viewingAs])

  const dismissAlert = async (alertId: string) => {
    try {
      setDismissing(alertId)
      const url = viewingAs
        ? `/api/client/alerts/${alertId}/dismiss?clientId=${viewingAs}`
        : `/api/client/alerts/${alertId}/dismiss`
      const res = await fetch(url, {
        method: 'POST',
      })
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    } finally {
      setDismissing(null)
    }
  }

  // Don't render anything while loading or if no alerts
  if (loading || alerts.length === 0) {
    return null
  }

  // Show the most recent alert
  const alert = alerts[0]

  return (
    <>
      <div className="client-alert-banner">
        <div className="alert-banner-header">
          <div className="alert-banner-icon">
            {getAlertIcon(alert.alert_type)}
          </div>
          <span className="alert-banner-title">Message from your Pyrus team</span>
          <button
            className="alert-banner-dismiss"
            onClick={() => dismissAlert(alert.id)}
            disabled={dismissing === alert.id}
            aria-label="Dismiss alert"
          >
            {dismissing === alert.id ? (
              <span className="spinner-small"></span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            )}
          </button>
        </div>

        <div className="alert-banner-body">
          <p className="alert-banner-message">{alert.message}</p>
          <div className="alert-banner-footer">
            <span className="alert-banner-signature">- The Pyrus Digital Team</span>
            {alert.published_at && (
              <span className="alert-banner-date">Posted: {formatDate(alert.published_at)}</span>
            )}
          </div>
        </div>

        <div className="alert-banner-actions">
          <Link href="/communication" className="alert-banner-btn alert-banner-btn-primary">
            Start Chat
          </Link>
          <Link href="/results" className="alert-banner-btn alert-banner-btn-secondary">
            View My Results
          </Link>
        </div>
      </div>

      <style jsx>{`
        .client-alert-banner {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 1px solid #86efac;
          border-radius: 12px;
          margin: 0 24px 24px 24px;
          padding: 0;
          overflow: hidden;
        }

        .alert-banner-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(134, 239, 172, 0.5);
        }

        .alert-banner-icon {
          width: 24px;
          height: 24px;
          color: #16a34a;
          flex-shrink: 0;
        }

        .alert-banner-icon svg {
          width: 100%;
          height: 100%;
        }

        .alert-banner-title {
          font-size: 14px;
          font-weight: 600;
          color: #166534;
          flex: 1;
        }

        .alert-banner-dismiss {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          transition: all 0.15s ease;
        }

        .alert-banner-dismiss:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.05);
          color: #374151;
        }

        .alert-banner-dismiss:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .alert-banner-dismiss svg {
          width: 16px;
          height: 16px;
        }

        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid #E5E7EB;
          border-top-color: #6B7280;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .alert-banner-body {
          padding: 16px 20px;
        }

        .alert-banner-message {
          font-size: 15px;
          line-height: 1.6;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .alert-banner-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .alert-banner-signature {
          font-size: 13px;
          font-style: italic;
          color: #6B7280;
        }

        .alert-banner-date {
          font-size: 12px;
          color: #9CA3AF;
        }

        .alert-banner-actions {
          display: flex;
          gap: 10px;
          padding: 0 20px 16px 20px;
        }

        .alert-banner-btn {
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .alert-banner-btn-primary {
          background: #16a34a;
          color: white;
        }

        .alert-banner-btn-primary:hover {
          background: #15803d;
        }

        .alert-banner-btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #D1D5DB;
        }

        .alert-banner-btn-secondary:hover {
          background: #F9FAFB;
          border-color: #9CA3AF;
        }

        @media (max-width: 600px) {
          .client-alert-banner {
            margin: 0 16px 16px 16px;
          }

          .alert-banner-body {
            padding: 14px 16px;
          }

          .alert-banner-actions {
            flex-direction: column;
            padding: 0 16px 14px 16px;
          }

          .alert-banner-btn {
            width: 100%;
          }

          .alert-banner-footer {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </>
  )
}
