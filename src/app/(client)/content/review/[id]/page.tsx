'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ClientHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

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
}

export default function ContentReviewPage() {
  const { user } = useUserProfile()
  const params = useParams()
  const router = useRouter()
  const contentId = params.id as string

  const [content, setContent] = useState<ContentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch(`/api/admin/content/${contentId}`)
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

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })
      if (res.ok) {
        router.push('/dashboard?tab=content')
      }
    } catch (err) {
      console.error('Error approving content:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!feedback.trim()) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', feedback })
      })
      if (res.ok) {
        router.push('/dashboard?tab=content')
      }
    } catch (err) {
      console.error('Error rejecting content:', err)
    } finally {
      setSubmitting(false)
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'pending_review': return 'Pending Review'
      case 'revision': return 'Needs Revision'
      case 'approved': return 'Approved'
      case 'published': return 'Published'
      default: return status
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft'
      case 'pending_review': return 'status-awaiting'
      case 'revision': return 'status-revision'
      case 'approved': return 'status-approved'
      case 'published': return 'status-published'
      default: return ''
    }
  }

  if (loading) {
    return (
      <>
        <ClientHeader
          title="Content Review"
          user={user}
        />
        <div className="client-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <div className="spinner" style={{ width: 40, height: 40 }}></div>
        </div>
      </>
    )
  }

  if (error || !content) {
    return (
      <>
        <ClientHeader
          title="Content Review"
          user={user}
        />
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

  const canApprove = content.status === 'pending_review'
  const isPending = content.status === 'pending_review'

  return (
    <>
      <ClientHeader
        title="Content Review"
        user={user}
      />

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

        {/* Content Header */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span className={`platform-badge ${content.platform || 'website'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}>
                  {getPlatformLabel(content.platform)}
                </span>
                <span className={`status-badge ${getStatusClass(content.status)}`}>
                  {getStatusLabel(content.status)}
                </span>
                {content.urgent && (
                  <span style={{ background: '#FEE2E2', color: '#DC2626', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' }}>
                    Urgent
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1F2937', margin: 0 }}>{content.title}</h1>
            </div>

            {canApprove && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-outline"
                  onClick={() => setShowFeedbackModal(true)}
                  disabled={submitting}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  Request Revision
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleApprove}
                  disabled={submitting}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {submitting ? 'Approving...' : 'Approve Content'}
                </button>
              </div>
            )}
          </div>

          {/* Meta info */}
          <div style={{ display: 'flex', gap: '2rem', color: '#6B7280', fontSize: '0.875rem' }}>
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
                Due: {new Date(content.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              Submitted: {new Date(content.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Revision Feedback (if any) */}
        {content.revision_feedback && (
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

        {/* Bottom Actions (for pending) */}
        {isPending && (
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', marginTop: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ margin: 0, color: '#6B7280' }}>
              Please review the content above and approve or request revisions.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowFeedbackModal(true)}
                disabled={submitting}
              >
                Request Revision
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? 'Approving...' : 'Approve Content'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', maxWidth: '500px', width: '90%' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Request Revision</h3>
            <p style={{ color: '#6B7280', marginBottom: '1rem' }}>
              Please provide feedback about what changes you&apos;d like made to this content.
            </p>
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
                onClick={() => setShowFeedbackModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleReject}
                disabled={submitting || !feedback.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
