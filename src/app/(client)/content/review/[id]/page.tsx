'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useClientData } from '@/hooks/useClientData'
import { StatusProgressBar } from '@/components/content'
import { getNextActions, getStatusLabel } from '@/lib/content-workflow-helpers'

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_id?: string | null
  changed_by_name?: string
  note?: string
}

interface ContentDetail {
  id: string
  title: string
  body: string | null
  excerpt: string | null
  content_type: string | null
  platform: string | null
  status: string
  urgent: boolean
  deadline: string | null
  scheduled_date: string | null
  published_at: string | null
  published_url: string | null
  target_keyword: string | null
  secondary_keywords: string | null
  word_count: number | null
  seo_optimized: boolean
  revision_feedback: string | null
  revision_count: number
  created_at: string
  updated_at: string
  client_name: string
  // New workflow fields
  approval_required?: boolean
  review_round?: number
  status_history?: StatusHistoryEntry[]
  status_changed_at?: string
  assigned_to?: string | null
}

export default function ContentReviewPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading: clientLoading } = useClientData(viewingAs)
  const params = useParams()
  const router = useRouter()
  const contentId = params.id as string

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/content/${contentId}`)
        if (!res.ok) {
          throw new Error('Content not found')
        }
        const data = await res.json()
        setContent(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content')
      } finally {
        setLoading(false)
      }
    }
    if (contentId) {
      fetchContent()
    }
  }, [contentId])

  // Handle status transition via the new API
  async function handleTransition(targetStatus: string, requiresNote: boolean = false) {
    if (requiresNote) {
      setShowFeedbackModal(true)
      return
    }

    setIsTransitioning(true)
    setTransitionError(null)

    try {
      const response = await fetch(`/api/content/${contentId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
      }

      // Refresh the page data
      router.refresh()
      // Re-fetch content to update local state
      const res = await fetch(`/api/content/${contentId}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data)
      }
    } catch (err) {
      console.error('Transition failed:', err)
      setTransitionError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setIsTransitioning(false)
    }
  }

  // Handle revision submission
  async function handleRevisionSubmit() {
    if (!feedback.trim()) return

    setIsTransitioning(true)
    setTransitionError(null)

    try {
      const response = await fetch(`/api/content/${contentId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetStatus: 'revisions_requested',
          note: feedback.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit revision request')
      }

      setShowFeedbackModal(false)
      setFeedback('')
      router.refresh()
      // Re-fetch content
      const res = await fetch(`/api/content/${contentId}`)
      if (res.ok) {
        const data = await res.json()
        setContent(data)
      }
    } catch (err) {
      console.error('Revision submit failed:', err)
      setTransitionError(err instanceof Error ? err.message : 'Failed to submit revision')
    } finally {
      setIsTransitioning(false)
    }
  }

  const getPlatformLabel = (platform: string | null) => {
    switch (platform) {
      case 'website': return 'Website Content'
      case 'gbp': return 'Google Business Profile'
      case 'social': return 'Social Posts'
      case 'ai-creative': return 'AI Creative'
      default: return 'Content'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatFullDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  // Extract revision entries from status_history
  const getRevisionHistory = () => {
    if (!content?.status_history) return []
    return content.status_history
      .filter(h => h.status === 'revisions_requested' && h.note)
      .reverse() // Most recent first
  }

  if (loading || clientLoading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Content Review</h1>
          </div>
        </div>
        <div className="client-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="spinner" style={{ width: 40, height: 40 }}></div>
        </div>
      </>
    )
  }

  if (error || !content) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Content Review</h1>
          </div>
          <div className="client-top-header-right">
            <Link href="/settings" className="user-menu-link">
              <div className="user-avatar-small">
                <span>{client.initials}</span>
              </div>
              <span className="user-name">{client.contactName}</span>
            </Link>
          </div>
        </div>
        <div className="client-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>Content Not Found</h2>
          <p>{error || 'The content you are looking for does not exist.'}</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Back to Dashboard
          </Link>
        </div>
      </>
    )
  }

  // Get workflow-aware actions
  const actions = getNextActions(content.status, 'client', content.approval_required ?? true)
  const revisionHistory = getRevisionHistory()
  const clientStatusLabel = getStatusLabel(content.status, 'client')

  // Check if user needs to begin review
  const needsToBeginReview = content.status === 'sent_for_review'
  const isReviewing = content.status === 'client_reviewing'

  return (
    <>
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Content Review</h1>
        </div>
        <div className="client-top-header-right">
          <Link href="/settings" className="user-menu-link">
            <div className="user-avatar-small">
              <span>{client.initials}</span>
            </div>
            <span className="user-name">{client.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/dashboard?tab=content" style={{ color: '#6B7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Back to Content
          </Link>
        </div>

        {/* Error notification */}
        {transitionError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#DC2626' }}>
            {transitionError}
          </div>
        )}

        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <StatusProgressBar
            currentStatus={content.status}
            approvalRequired={content.approval_required ?? true}
            reviewRound={content.review_round ?? 0}
            statusHistory={content.status_history ?? []}
          />
        </div>

        {/* Content Header */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`platform-badge ${content.platform || 'website'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {getPlatformLabel(content.platform)}
                </span>
                <span className="status-badge status-review" style={{ background: '#CCFBF1', color: '#0D9488' }}>
                  {clientStatusLabel}
                </span>
                {content.urgent && (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' }}>
                    Urgent
                  </span>
                )}
                {(content.review_round ?? 0) > 0 && (
                  <span style={{ background: '#FEF3C7', color: '#D97706', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                    Revision Round {content.review_round}
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1F2937', margin: 0 }}>{content.title}</h1>
            </div>

            {/* Begin Review Button - shown when content is sent for review */}
            {needsToBeginReview && (
              <button
                className="btn btn-primary"
                onClick={() => handleTransition('client_reviewing')}
                disabled={isTransitioning}
                style={{ background: '#14B8A6', borderColor: '#14B8A6' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                {isTransitioning ? 'Starting...' : 'Begin Review'}
              </button>
            )}

            {/* Action Buttons - shown during active review */}
            {isReviewing && actions.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {actions.map(action => (
                  <button
                    key={action.action || action.label}
                    className={`btn ${action.variant === 'primary' ? 'btn-primary' : action.variant === 'warning' ? 'btn-outline' : 'btn-secondary'}`}
                    onClick={() => handleTransition(action.action!, action.requiresNote)}
                    disabled={isTransitioning || !action.action}
                    style={action.variant === 'warning' ? { borderColor: '#F59E0B', color: '#D97706' } : undefined}
                  >
                    {action.label === 'Approve' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                    {action.label === 'Request Revisions' && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                    )}
                    {isTransitioning ? 'Processing...' : action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', gap: '2rem', color: '#6B7280', fontSize: '0.875rem', flexWrap: 'wrap' }}>
            {content.content_type && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {content.content_type}
              </span>
            )}
            {content.word_count && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <line x1="17" y1="10" x2="3" y2="10"></line>
                  <line x1="21" y1="6" x2="3" y2="6"></line>
                  <line x1="21" y1="14" x2="3" y2="14"></line>
                  <line x1="17" y1="18" x2="3" y2="18"></line>
                </svg>
                {content.word_count} words
              </span>
            )}
            {content.deadline && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Due: {formatDate(content.deadline)}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Submitted: {formatDate(content.created_at)}
            </span>
            {content.status_changed_at && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                Updated: {formatDate(content.status_changed_at)}
              </span>
            )}
          </div>
        </div>

        {/* Revision History (from status_history) */}
        {revisionHistory.length > 0 && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              Revision History
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {revisionHistory.map((entry, i) => (
                <div key={i} style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ background: '#F59E0B', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600' }}>
                      Round {revisionHistory.length - i}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#92400E' }}>
                      {formatFullDate(entry.changed_at)}
                      {entry.changed_by_name && ` by ${entry.changed_by_name}`}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: '#78350F', fontSize: '0.875rem' }}>{entry.note}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legacy Revision Feedback (fallback for old data) */}
        {content.revision_feedback && !revisionHistory.length && (
          <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: '600', color: '#92400E' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              Revision Requested (Attempt {content.revision_count})
            </div>
            <p style={{ margin: 0, color: '#78350F' }}>{content.revision_feedback}</p>
          </div>
        )}

        {/* SEO Info (if applicable) */}
        {(content.target_keyword || content.seo_optimized) && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.75rem' }}>SEO Information</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              {content.target_keyword && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Target Keyword</span>
                  <p style={{ margin: 0, fontWeight: '500' }}>{content.target_keyword}</p>
                </div>
              )}
              {content.secondary_keywords && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>Secondary Keywords</span>
                  <p style={{ margin: 0, fontWeight: '500' }}>{content.secondary_keywords}</p>
                </div>
              )}
              {content.seo_optimized && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16A34A' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  SEO Optimized
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>Content Preview</h2>

          {content.excerpt && (
            <div style={{ background: '#F3F4F6', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', fontWeight: '500' }}>Excerpt/Summary</span>
              <p style={{ margin: '0.25rem 0 0', fontStyle: 'italic', color: '#4B5563' }}>{content.excerpt}</p>
            </div>
          )}

          <div style={{ fontSize: '1rem', lineHeight: '1.75', color: '#1F2937' }}>
            {content.body ? (
              <div dangerouslySetInnerHTML={{ __html: content.body.replace(/\n/g, '<br/>') }} />
            ) : (
              <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No content body available.</p>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        {isReviewing && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#6B7280' }}>
              Please review the content above and approve or request revisions.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {actions.map(action => (
                <button
                  key={action.action || action.label}
                  className={`btn ${action.variant === 'primary' ? 'btn-primary' : action.variant === 'warning' ? 'btn-outline' : 'btn-secondary'}`}
                  onClick={() => handleTransition(action.action!, action.requiresNote)}
                  disabled={isTransitioning || !action.action}
                  style={action.variant === 'warning' ? { borderColor: '#F59E0B', color: '#D97706' } : undefined}
                >
                  {isTransitioning ? 'Processing...' : action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Begin Review CTA (if sent_for_review) */}
        {needsToBeginReview && (
          <div style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.125rem' }}>Ready for Your Review</h3>
              <p style={{ margin: 0, opacity: 0.9 }}>Click "Begin Review" to let our team know you&apos;re looking at this content.</p>
            </div>
            <button
              className="btn"
              onClick={() => handleTransition('client_reviewing')}
              disabled={isTransitioning}
              style={{ background: 'white', color: '#0D9488', fontWeight: '600' }}
            >
              {isTransitioning ? 'Starting...' : 'Begin Review'}
            </button>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Request Revisions</h3>
            <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
              Please describe what changes you&apos;d like made to this content.
            </p>

            {transitionError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', color: '#DC2626', fontSize: '0.875rem' }}>
                {transitionError}
              </div>
            )}

            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter your feedback here..."
              style={{
                width: '100%',
                minHeight: '120px',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowFeedbackModal(false)
                  setTransitionError(null)
                }}
                disabled={isTransitioning}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleRevisionSubmit}
                disabled={isTransitioning || !feedback.trim()}
                style={{ background: '#F59E0B', borderColor: '#F59E0B', color: 'white' }}
              >
                {isTransitioning ? 'Submitting...' : 'Submit Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
