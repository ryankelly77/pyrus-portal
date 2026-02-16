'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { StatusProgressBar, StatusHistoryFeed } from '@/components/content'
import { RichTextEditor } from '@/components/content/RichTextEditor'

interface ContentItem {
  id: string
  title: string
  body: string
  content_type: string | null
  platform: string | null
  status: string
  client_id: string | null
  client_name: string | null
  client_email: string | null
  target_keyword: string | null
  secondary_keywords: string | null
  word_count: number | null
  seo_optimized: boolean | null
  ai_optimized: boolean | null
  urgent: boolean | null
  deadline: string | null
  revision_feedback: string | null
  revision_count: number | null
  review_round: number | null
  status_history: Array<{
    status: string
    changed_at: string
    changed_by_id?: string
    changed_by_name?: string
    note?: string
  }> | null
  published_at: string | null
  published_url: string | null
  featured_image: string | null
  video_url: string | null
  google_doc_url: string | null
  social_platforms: {
    facebook: boolean
    instagram: boolean
    linkedin: boolean
    x: boolean
  } | null
  created_at: string
  updated_at: string
  revisions: Array<{
    id: string
    body: string
    revision_notes: string | null
    created_at: string
    creator_name: string | null
  }>
  comments: Array<{
    id: string
    comment: string
    user_name: string | null
    created_at: string
  }>
}

interface Client {
  id: string
  name: string
  content_approval_mode?: 'full_approval' | 'initial_approval' | 'auto' | null
  approval_threshold?: number | null
}

export default function ContentViewPage() {
  const { user, hasNotifications } = useUserProfile()
  const params = useParams()
  const router = useRouter()
  const contentId = params.id as string

  const [content, setContent] = useState<ContentItem | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [bodyContent, setBodyContent] = useState('')
  const [platform, setPlatform] = useState<'website' | 'gbp' | 'social'>('website')
  const [contentType, setContentType] = useState('')
  const [clientId, setClientId] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [targetKeyword, setTargetKeyword] = useState('')
  const [secondaryKeywords, setSecondaryKeywords] = useState('')
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [seoOptimized, setSeoOptimized] = useState(false)
  const [aiOptimized, setAiOptimized] = useState(false)

  // Workflow modals
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [rejectFeedback, setRejectFeedback] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')

  // Featured image
  const [featuredImage, setFeaturedImage] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  // Video URL (optional)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  // Google Doc URL
  const [googleDocUrl, setGoogleDocUrl] = useState<string>('')
  // Social platforms (for social content)
  const [socialPlatforms, setSocialPlatforms] = useState({
    facebook: true,
    instagram: true,
    linkedin: false,
    x: false,
  })

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showWordCountWarning, setShowWordCountWarning] = useState(false)

  // Count words in content (strips HTML tags and counts words)
  const countWords = (text: string): number => {
    if (!text) return 0
    // Strip HTML tags
    const strippedText = text.replace(/<[^>]*>/g, ' ')
    // Split by whitespace and filter empty strings
    const words = strippedText.trim().split(/\s+/).filter(word => word.length > 0)
    return words.length
  }

  const actualWordCount = countWords(bodyContent)

  // Clear validation error when fields change
  useEffect(() => {
    setValidationError(null)
  }, [title, bodyContent, clientId, platform, contentType, targetKeyword, secondaryKeywords, wordCount])

  // Client approval settings
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [approvedContentCount, setApprovedContentCount] = useState(0)

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/content/${contentId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch content')
      }
      const data = await res.json()
      setContent(data)

      // Populate form state
      setTitle(data.title || '')
      setBodyContent(data.body || '')
      setPlatform((data.platform as 'website' | 'gbp' | 'social') || 'website')
      setContentType(data.content_type || '')
      setClientId(data.client_id || '')
      setUrgent(data.urgent || false)
      setTargetKeyword(data.target_keyword || '')
      setSecondaryKeywords(data.secondary_keywords || '')
      setWordCount(data.word_count)
      setSeoOptimized(data.seo_optimized || false)
      setAiOptimized(data.ai_optimized || false)
      setFeaturedImage(data.featured_image || null)
      setVideoUrl(data.video_url || null)
      setGoogleDocUrl(data.google_doc_url || '')
      if (data.social_platforms) {
        setSocialPlatforms(data.social_platforms)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [contentId])

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/clients')
      if (res.ok) {
        const data = await res.json()
        // API returns array directly, not wrapped in { clients: [...] }
        setClients(Array.isArray(data) ? data : (data.clients || []))
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }, [])

  // Fetch client approval settings and approved content count when client changes
  const fetchClientApprovalData = useCallback(async (clientIdToFetch: string) => {
    if (!clientIdToFetch) {
      setSelectedClient(null)
      setApprovedContentCount(0)
      return
    }
    try {
      // Fetch client details
      const clientRes = await fetch(`/api/admin/clients/${clientIdToFetch}`)
      if (clientRes.ok) {
        const clientData = await clientRes.json()
        setSelectedClient(clientData)
      }
      // Fetch approved content count
      const statsRes = await fetch(`/api/admin/clients/${clientIdToFetch}/content-stats`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setApprovedContentCount((statsData.approved || 0) + (statsData.posted || 0))
      }
    } catch (err) {
      console.error('Failed to fetch client approval data:', err)
    }
  }, [])

  useEffect(() => {
    fetchContent()
    fetchClients()
  }, [fetchContent, fetchClients])

  // Fetch client approval data when clientId changes
  useEffect(() => {
    if (clientId) {
      fetchClientApprovalData(clientId)
    }
  }, [clientId, fetchClientApprovalData])

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch(`/api/admin/content/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          bodyContent,
          platform,
          contentType,
          clientId: clientId || null,
          urgent,
          targetKeyword: targetKeyword || null,
          secondaryKeywords: secondaryKeywords || null,
          wordCount,
          seoOptimized,
          aiOptimized,
          featuredImage,
          videoUrl,
          googleDocUrl: googleDocUrl || null,
          socialPlatforms: platform === 'social' ? socialPlatforms : null,
        }),
      })
      if (!res.ok) {
        throw new Error('Failed to save')
      }
      const updated = await res.json()
      setContent(prev => prev ? { ...prev, ...updated } : null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleWorkflowAction = async (action: 'submit' | 'approve' | 'reject' | 'publish', extra?: Record<string, string>) => {
    try {
      setActionLoading(action)
      const res = await fetch(`/api/admin/content/${contentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to process action')
      }
      setContent(prev => prev ? { ...prev, ...data.content } : null)

      // Close modals
      setShowRejectModal(false)
      setShowPublishModal(false)
      setRejectFeedback('')
      setPublishedUrl('')
    } catch (err) {
      console.error('Workflow action error:', err)
      alert(err instanceof Error ? err.message : 'Failed to process action')
    } finally {
      setActionLoading(null)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    try {
      setImageUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('contentId', contentId)

      const res = await fetch('/api/admin/content/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await res.json()
      setFeaturedImage(data.url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setImageUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setFeaturedImage(null)
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'draft': return 'status-draft'
      case 'sent_for_review': return 'status-review'
      case 'client_reviewing': return 'status-reviewing'
      case 'revisions_requested': return 'status-revision'
      case 'approved': return 'status-approved'
      case 'internal_review': return 'status-internal'
      case 'final_optimization': return 'status-optimization'
      case 'image_selection': return 'status-images'
      case 'scheduled': return 'status-scheduled'
      case 'posted': return 'status-published'
      // Legacy mappings
      case 'pending_review': return 'status-review'
      case 'revision': return 'status-revision'
      case 'published': return 'status-published'
      default: return ''
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'sent_for_review': return 'Sent for Review'
      case 'client_reviewing': return 'Client Reviewing'
      case 'revisions_requested': return 'Revisions Requested'
      case 'approved': return 'Approved'
      case 'internal_review': return 'Internal Review'
      case 'final_optimization': return 'Final Optimization'
      case 'image_selection': return 'Image Selection'
      case 'scheduled': return 'Scheduled'
      case 'posted': return 'Published'
      // Legacy mappings
      case 'pending_review': return 'Pending Review'
      case 'revision': return 'Needs Revision'
      case 'published': return 'Published'
      default: return status
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Loading..." user={user} hasNotifications={hasNotifications} />
        <div className="admin-content">
          <div className="loading-state">Loading content...</div>
        </div>
      </>
    )
  }

  if (error || !content) {
    return (
      <>
        <AdminHeader title="Error" user={user} hasNotifications={hasNotifications} />
        <div className="admin-content">
          <div className="error-state">
            <p>{error || 'Content not found'}</p>
            <Link href="/admin/content" className="btn btn-primary">
              Back to Content
            </Link>
          </div>
        </div>
      </>
    )
  }

  const isWebsitePlatform = platform === 'website' || content.platform === 'website'

  // Check if a Google Doc URL is valid
  const isValidGoogleDocUrl = (url: string): boolean => {
    if (!url) return false
    return /\/document\/d\/([a-zA-Z0-9_-]+)/.test(url)
  }

  // Check if all required fields are complete
  const validateRequiredFields = (mode: 'save' | 'submit' | 'publish' = 'save') => {
    const missingFields: string[] = []

    // Core required fields
    if (!title?.trim()) missingFields.push('Title')
    // Content can be either body text OR a valid Google Doc URL
    const hasContent = bodyContent?.trim() || isValidGoogleDocUrl(googleDocUrl)
    if (!hasContent) missingFields.push('Content')
    if (!clientId) missingFields.push('Client')
    if (!platform) missingFields.push('Platform')
    if (!contentType) missingFields.push('Content Type')

    // SEO fields (required for website content when submitting or publishing)
    if ((mode === 'submit' || mode === 'publish') && isWebsitePlatform) {
      if (!targetKeyword?.trim()) missingFields.push('Target Keyword')
      if (!secondaryKeywords?.trim()) missingFields.push('Secondary Keywords')
      if (!wordCount || wordCount <= 0) missingFields.push('Content Word Length')
    }

    // Featured image required for ALL platforms when submitting or publishing
    if (mode === 'submit' || mode === 'publish') {
      if (!featuredImage) missingFields.push('Featured Image')
    }

    // Optimization checkboxes (required for website content when publishing)
    if (mode === 'publish' && isWebsitePlatform) {
      if (!seoOptimized) missingFields.push('Optimized for SEO')
      if (!aiOptimized) missingFields.push('Optimized for AI')
    }

    if (missingFields.length > 0) {
      setValidationError(`Please complete before publishing: ${missingFields.join(', ')}`)
      return false
    }

    setValidationError(null)
    return true
  }

  const handleSaveWithValidation = () => {
    if (!validateRequiredFields('save')) {
      return
    }
    handleSave()
  }

  const handleSubmitForReview = () => {
    if (!validateRequiredFields('submit')) {
      return
    }
    handleWorkflowAction('submit')
  }

  const handleOpenPublishModal = () => {
    if (!validateRequiredFields('publish')) {
      return
    }
    // Check word count for website content (skip if using Google Doc - can't count words)
    const usingGoogleDoc = isValidGoogleDocUrl(googleDocUrl)
    if (platform === 'website' && wordCount && wordCount > 0 && actualWordCount < wordCount && !usingGoogleDoc) {
      setShowWordCountWarning(true)
      return
    }
    setShowPublishModal(true)
  }

  const handleConfirmPublishDespiteWordCount = () => {
    setShowWordCountWarning(false)
    setShowPublishModal(true)
  }

  return (
    <>
      <AdminHeader
        title=""
        user={user}
        hasNotifications={hasNotifications}
        breadcrumb={
          <div className="page-header-with-back">
            <Link href="/admin/content" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Content
            </Link>
            <div className="page-title-with-status">
              <h1 className="page-title-inline">{content.title}</h1>
              <span className={`status-badge ${getStatusClass(content.status)}`}>
                {getStatusLabel(content.status)}
              </span>
            </div>
          </div>
        }
      />

      <div className="admin-content">
        {/* Client Approval Progress Bar */}
        {selectedClient?.content_approval_mode === 'initial_approval' && selectedClient.approval_threshold && (
          <div style={{
            background: approvedContentCount >= selectedClient.approval_threshold ? '#ECFDF5' : '#FFFBEB',
            border: `1px solid ${approvedContentCount >= selectedClient.approval_threshold ? '#A7F3D0' : '#FDE68A'}`,
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            {approvedContentCount >= selectedClient.approval_threshold ? (
              <>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#22C55E',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.95rem' }}>
                    Auto-Approval Active for {selectedClient.name}
                  </div>
                  <div style={{ color: '#047857', fontSize: '0.85rem' }}>
                    Threshold reached ({approvedContentCount} pieces approved) — this content will skip client review
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: '#92400E', fontSize: '0.95rem' }}>
                      Initial Approval Mode — {selectedClient.name}
                    </span>
                    <span style={{ fontWeight: 600, color: '#D97706', fontSize: '0.95rem' }}>
                      {approvedContentCount} / {selectedClient.approval_threshold}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: '#FDE68A', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min((approvedContentCount / selectedClient.approval_threshold) * 100, 100)}%`,
                        background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                        borderRadius: '4px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                  <div style={{ color: '#92400E', fontSize: '0.8rem' }}>
                    {selectedClient.approval_threshold - approvedContentCount} more piece{selectedClient.approval_threshold - approvedContentCount !== 1 ? 's' : ''} need client approval before auto-approve activates
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Full Approval Notice */}
        {selectedClient && (selectedClient.content_approval_mode === 'full_approval' || !selectedClient.content_approval_mode) && (
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <polyline points="17 11 19 13 23 9"></polyline>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1E40AF', fontSize: '0.95rem' }}>
                Full Approval Mode — {selectedClient.name}
              </div>
              <div style={{ color: '#3B82F6', fontSize: '0.85rem' }}>
                All content requires client review before publishing
              </div>
            </div>
          </div>
        )}

        {/* Auto-Approve Notice */}
        {selectedClient?.content_approval_mode === 'auto' && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#22C55E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="20" height="20">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#065F46', fontSize: '0.95rem' }}>
                Auto-Approval Enabled for {selectedClient.name}
              </div>
              <div style={{ color: '#047857', fontSize: '0.85rem' }}>
                Content skips client review — workflow: Draft → Internal Review → Production → Published
              </div>
            </div>
          </div>
        )}

        {/* Workflow Progress Dots */}
        {content && (
          <div style={{ marginBottom: '1.5rem' }}>
            <StatusProgressBar
              currentStatus={content.status}
              approvalRequired={selectedClient?.content_approval_mode !== 'auto'}
              reviewRound={content.review_round ?? 0}
            />
          </div>
        )}

        <div className="create-content-layout">
          {/* Main Content Area */}
          <div className="content-editor-section">
            <div className="form-card">
              <h3 className="form-card-title">Content Details</h3>

              <div className="form-group">
                <label className="form-label">
                  Title <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Content <span className="required">*</span>
                </label>
                <RichTextEditor
                  value={bodyContent}
                  onChange={setBodyContent}
                  placeholder="Write your content here... (paste from Google Docs to preserve formatting)"
                  minHeight={400}
                  googleDocUrl={googleDocUrl}
                  onGoogleDocUrlChange={setGoogleDocUrl}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '8px',
                  fontSize: '0.85rem',
                  color: 'var(--text-muted)',
                }}>
                  {isValidGoogleDocUrl(googleDocUrl) ? (
                    <span style={{ color: '#6366F1' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Using linked Google Doc (word count not available)
                    </span>
                  ) : (
                    <span>
                      <strong style={{
                        color: wordCount && actualWordCount < wordCount ? '#DC2626' :
                               wordCount && actualWordCount >= wordCount ? '#059669' : 'inherit'
                      }}>
                        {actualWordCount.toLocaleString()}
                      </strong> words
                      {wordCount && wordCount > 0 && (
                        <span style={{ marginLeft: '8px' }}>
                          / {wordCount.toLocaleString()} target
                          {actualWordCount >= wordCount ? (
                            <span style={{ color: '#059669', marginLeft: '6px' }}>✓</span>
                          ) : (
                            <span style={{ color: '#DC2626', marginLeft: '6px' }}>
                              ({(wordCount - actualWordCount).toLocaleString()} more needed)
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Revision feedback display */}
              {(content.status === 'revisions_requested' || content.status === 'revision') && content.revision_feedback && (
                <div className="form-group">
                  <div className="revision-feedback-box">
                    <h4>Revision Feedback</h4>
                    <p>{content.revision_feedback}</p>
                    {content.revision_count && content.revision_count > 1 && (
                      <span className="revision-count">Revision #{content.revision_count}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SEO Section - For all Website platform content */}
            {isWebsitePlatform && (
              <div className="form-card">
                <h3 className="form-card-title">SEO Information</h3>

                <div className="form-group">
                  <label className="form-label">Target Keyword</label>
                  <input
                    type="text"
                    className="form-input"
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    placeholder="Enter primary keyword..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Secondary Keywords</label>
                  <input
                    type="text"
                    className="form-input"
                    value={secondaryKeywords}
                    onChange={(e) => setSecondaryKeywords(e.target.value)}
                    placeholder="Enter secondary keywords, separated by commas..."
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Content Word Length</label>
                  <input
                    type="number"
                    className="form-input"
                    value={wordCount ?? ''}
                    onChange={(e) => setWordCount(e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="Target word count..."
                  />
                </div>

                <div className="form-group">
                  <div className="seo-checkboxes-row">
                    <label className="seo-checkbox">
                      <input
                        type="checkbox"
                        checked={seoOptimized}
                        onChange={(e) => setSeoOptimized(e.target.checked)}
                      />
                      <span className="seo-checkbox-content">
                        <strong>Optimized for SEO</strong>
                        <span>Content follows SEO best practices</span>
                      </span>
                    </label>
                    <label className="seo-checkbox">
                      <input
                        type="checkbox"
                        checked={aiOptimized}
                        onChange={(e) => setAiOptimized(e.target.checked)}
                      />
                      <span className="seo-checkbox-content">
                        <strong>Optimized for AI</strong>
                        <span>Content optimized for AI search results</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Revision History */}
            {content.revisions && content.revisions.length > 0 && (
              <div className="form-card">
                <h3 className="form-card-title">Revision History</h3>
                <div className="revision-history">
                  {content.revisions.map((rev) => (
                    <div key={rev.id} className="revision-item">
                      <div className="revision-meta">
                        <span className="revision-date">
                          {new Date(rev.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: 'America/Chicago',
                          })} CST
                        </span>
                        {rev.creator_name && <span className="revision-author">by {rev.creator_name}</span>}
                      </div>
                      {rev.revision_notes && <p className="revision-notes">{rev.revision_notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status History */}
            {content.status_history && content.status_history.length > 0 && (
              <div className="form-card">
                <h3 className="form-card-title">Status History</h3>
                <StatusHistoryFeed
                  history={content.status_history}
                  currentStatus={content.status}
                />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="content-sidebar-section">
            <div className="form-card">
              <h3 className="form-card-title">Publishing Settings</h3>

              <div className="form-group">
                <label className="form-label">
                  Client
                </label>
                <select
                  className="form-select"
                  value={clientId}
                  disabled
                  style={{ cursor: 'not-allowed', opacity: 0.7 }}
                >
                  <option value="">Select client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
                <span className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cannot be changed after creation
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Platform
                </label>
                <div className="platform-options platform-options-3" style={{ opacity: 0.7, pointerEvents: 'none' }}>
                  <button
                    type="button"
                    className={`platform-option ${platform === 'website' ? 'active' : ''}`}
                    disabled
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <span>Website</span>
                  </button>
                  <button
                    type="button"
                    className={`platform-option ${platform === 'gbp' ? 'active' : ''}`}
                    disabled
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>GBP</span>
                  </button>
                  <button
                    type="button"
                    className={`platform-option ${platform === 'social' ? 'active' : ''}`}
                    disabled
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                    <span>Social</span>
                  </button>
                </div>
                <span className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cannot be changed after creation
                </span>
              </div>

              {/* Social Platform Selection */}
              {platform === 'social' && (
                <div className="form-group">
                  <label className="form-label">
                    Social Platforms <span className="required">*</span>
                  </label>
                  <div className="social-platform-checkboxes">
                    <label className="social-platform-checkbox" title="Facebook">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.facebook}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, facebook: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon facebook">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="Instagram">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.instagram}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, instagram: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon instagram">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="LinkedIn">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.linkedin}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, linkedin: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon linkedin">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path>
                      </svg>
                    </label>
                    <label className="social-platform-checkbox" title="X">
                      <input
                        type="checkbox"
                        checked={socialPlatforms.x}
                        onChange={(e) => setSocialPlatforms({ ...socialPlatforms, x: e.target.checked })}
                      />
                      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="social-icon x-twitter">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
                      </svg>
                    </label>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Content Type
                </label>
                <select
                  className="form-select"
                  value={contentType}
                  disabled
                  style={{ cursor: 'not-allowed', opacity: 0.7 }}
                >
                  <option value="">Select type...</option>
                  {platform === 'website' && (
                    <>
                      <option value="Blog Post">Blog Post</option>
                      <option value="Service Page">Service Page</option>
                      <option value="Landing Page">Landing Page</option>
                    </>
                  )}
                  {platform === 'gbp' && (
                    <>
                      <option value="Business Update">Business Update</option>
                      <option value="Offer">Offer</option>
                      <option value="Event">Event</option>
                    </>
                  )}
                  {platform === 'social' && (
                    <>
                      <option value="Social Post">Social Post</option>
                      <option value="Story">Story</option>
                      <option value="Reel">Reel / Short Video</option>
                      <option value="Carousel">Carousel</option>
                    </>
                  )}
                </select>
                <span className="form-hint" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Cannot be changed after creation
                </span>
              </div>

              {/* Featured Image Upload */}
              <div className="form-group">
                <label className="form-label">Featured Image</label>
                {featuredImage ? (
                  <div style={{
                    position: 'relative',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}>
                    <img
                      src={featuredImage}
                      alt="Featured"
                      style={{
                        width: '100%',
                        height: '160px',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                      title="Remove image"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px 16px',
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      cursor: imageUploading ? 'wait' : 'pointer',
                      background: 'var(--bg-secondary)',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (!imageUploading) {
                        e.currentTarget.style.borderColor = 'var(--primary)'
                        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-color)'
                      e.currentTarget.style.background = 'var(--bg-secondary)'
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                      style={{ display: 'none' }}
                    />
                    {imageUploading ? (
                      <>
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          width="32"
                          height="32"
                          style={{
                            color: 'var(--text-secondary)',
                            animation: 'spin 1s linear infinite',
                          }}
                        >
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
                        </svg>
                        <span style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          Uploading...
                        </span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32" style={{ color: 'var(--text-secondary)' }}>
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                          <circle cx="8.5" cy="8.5" r="1.5"></circle>
                          <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <span style={{ marginTop: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          Click to upload featured image
                        </span>
                        <span style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                          PNG, JPG, WebP up to 5MB
                        </span>
                      </>
                    )}
                  </label>
                )}
              </div>

              {/* Video URL (Optional) */}
              <div className="form-group">
                <label className="form-label">
                  Video URL <span style={{ color: 'var(--text-tertiary)', fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
                    value={videoUrl || ''}
                    onChange={(e) => setVideoUrl(e.target.value || null)}
                  />
                  {videoUrl && (
                    <div style={{
                      position: 'relative',
                      paddingBottom: '56.25%',
                      height: 0,
                      overflow: 'hidden',
                      borderRadius: '8px',
                      background: '#000',
                    }}>
                      {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                        <iframe
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                          src={`https://www.youtube.com/embed/${videoUrl.includes('youtu.be')
                            ? videoUrl.split('youtu.be/')[1]?.split('?')[0]
                            : videoUrl.split('v=')[1]?.split('&')[0]}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : videoUrl.includes('vimeo.com') ? (
                        <iframe
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            border: 'none',
                          }}
                          src={`https://player.vimeo.com/video/${videoUrl.split('vimeo.com/')[1]?.split('?')[0]}`}
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                          }}
                          src={videoUrl}
                          controls
                        />
                      )}
                    </div>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Supports YouTube, Vimeo, or direct video file URLs
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Timeline</label>
                <div className="timeline-options">
                  <button
                    type="button"
                    className={`timeline-option ${!urgent ? 'active' : ''}`}
                    onClick={() => setUrgent(false)}
                  >
                    <div className="timeline-option-content">
                      <strong>Standard (5 days)</strong>
                      <span>Normal review timeline</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`timeline-option ${urgent ? 'active' : ''}`}
                    onClick={() => setUrgent(true)}
                  >
                    <div className="timeline-option-content">
                      <div className="timeline-option-header">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                        <strong>Urgent (24 hours)</strong>
                      </div>
                      <span>Rush review needed</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Show published info if published */}
              {(content.status === 'posted' || content.status === 'published') && (
                <div style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginTop: '16px',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="20" height="20">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <div>
                      <div style={{ color: 'white', fontWeight: 600, fontSize: '16px' }}>Published</div>
                      <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
                        {content.published_at
                          ? new Date(content.published_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              timeZone: 'America/Chicago',
                            }) + ' CST'
                          : 'Unknown date'}
                      </div>
                    </div>
                  </div>
                  {content.published_url && (
                    <a
                      href={content.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        background: 'white',
                        color: '#059669',
                        padding: '10px 16px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        fontSize: '14px',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                      View Live
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-actions">
              {validationError && (
                <div style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px',
                  fontSize: '13px',
                  color: '#DC2626',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ flexShrink: 0, marginTop: '2px' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <span>{validationError}</span>
                </div>
              )}
              <button
                className="btn btn-outline btn-block"
                onClick={handleSaveWithValidation}
                disabled={saving}
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                      <polyline points="17 21 17 13 7 13 7 21"></polyline>
                      <polyline points="7 3 7 8 15 8"></polyline>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>

              {/* Draft or Revision: Submit for Review */}
              {(content.status === 'draft' || content.status === 'revisions_requested' || content.status === 'revision') && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={handleSubmitForReview}
                  disabled={actionLoading === 'submit'}
                >
                  {actionLoading === 'submit' ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                      Submit for Review
                    </>
                  )}
                </button>
              )}

              {/* Pending Review: Approve or Reject */}
              {(content.status === 'sent_for_review' || content.status === 'client_reviewing' || content.status === 'pending_review') && (
                <>
                  <button
                    className="btn btn-success btn-block"
                    onClick={() => handleWorkflowAction('approve')}
                    disabled={actionLoading === 'approve'}
                  >
                    {actionLoading === 'approve' ? (
                      <>Approving...</>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Approve
                      </>
                    )}
                  </button>
                  <button
                    className="btn btn-warning btn-block"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading === 'reject'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Request Revision
                  </button>
                </>
              )}

              {/* Approved or Production Statuses: Publish */}
              {(content.status === 'approved' || content.status === 'internal_review' || content.status === 'final_optimization' || content.status === 'image_selection') && (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleOpenPublishModal}
                  disabled={actionLoading === 'publish'}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Mark as Published
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Request Revision</h3>
            <p>Provide feedback for the content creator:</p>
            <textarea
              className="form-textarea"
              rows={4}
              value={rejectFeedback}
              onChange={(e) => setRejectFeedback(e.target.value)}
              placeholder="Enter revision feedback..."
              autoFocus
            />
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowRejectModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-warning"
                onClick={() => handleWorkflowAction('reject', { feedback: rejectFeedback })}
                disabled={actionLoading === 'reject'}
              >
                {actionLoading === 'reject' ? 'Sending...' : 'Send for Revision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Word Count Warning Modal */}
      {showWordCountWarning && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowWordCountWarning(false)}
        >
          <div
            style={{
              background: 'var(--bg-primary, white)',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="24" height="24">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', color: '#92400E' }}>Word Count Below Target</h3>
                <p style={{ margin: '0', color: 'var(--text-secondary, #666)', lineHeight: 1.5 }}>
                  This content has <strong>{actualWordCount.toLocaleString()}</strong> words,
                  but the target is <strong>{wordCount?.toLocaleString()}</strong> words.
                  <br />
                  <span style={{ color: '#DC2626' }}>
                    {wordCount && (wordCount - actualWordCount).toLocaleString()} words short of target.
                  </span>
                </p>
              </div>
            </div>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary, #666)', fontSize: '0.9rem' }}>
              Are you sure you want to publish this content below the target word count?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowWordCountWarning(false)}
              >
                Go Back & Edit
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={handleConfirmPublishDespiteWordCount}
              >
                Publish Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowPublishModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-primary, white)',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px 0' }}>Publish Content</h3>
            <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary, #666)' }}>Enter the URL where this content has been published (optional):</p>
            <input
              type="url"
              className="form-input"
              style={{ width: '100%', marginBottom: '16px' }}
              value={publishedUrl}
              onChange={(e) => setPublishedUrl(e.target.value)}
              placeholder="https://example.com/blog/post-slug"
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => setShowPublishModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleWorkflowAction('publish', { publishedUrl })}
                disabled={actionLoading === 'publish'}
              >
                {actionLoading === 'publish' ? 'Publishing...' : 'Mark as Published'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .loading-state,
        .error-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary);
        }
        .error-state p {
          margin-bottom: 20px;
        }
        .revision-feedback-box {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 16px;
        }
        .revision-feedback-box h4 {
          margin: 0 0 8px 0;
          color: #856404;
          font-size: 14px;
        }
        .revision-feedback-box p {
          margin: 0;
          color: #856404;
        }
        .revision-count {
          display: inline-block;
          margin-top: 8px;
          font-size: 12px;
          color: #856404;
          opacity: 0.8;
        }
        .revision-history {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .revision-item {
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: 6px;
          border-left: 3px solid var(--border-color);
        }
        .revision-meta {
          display: flex;
          gap: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .revision-notes {
          margin: 0;
          font-size: 14px;
        }
        .published-info {
          background: var(--bg-secondary);
          padding: 12px;
          border-radius: 6px;
        }
        .published-info p {
          margin: 0 0 8px 0;
        }
        .published-link {
          color: var(--primary);
          text-decoration: none;
        }
        .published-link:hover {
          text-decoration: underline;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--bg-primary);
          padding: 24px;
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .modal-content h3 {
          margin: 0 0 8px 0;
        }
        .modal-content p {
          margin: 0 0 16px 0;
          color: var(--text-secondary);
        }
        .modal-content .form-textarea,
        .modal-content .form-input {
          width: 100%;
          margin-bottom: 16px;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        /* Status badge styles */
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 6px;
          white-space: nowrap;
        }
        .status-badge.status-draft {
          background: #F3F4F6;
          color: #6B7280;
        }
        .status-badge.status-review {
          background: #CCFBF1;
          color: #0D9488;
        }
        .status-badge.status-reviewing {
          background: #DBEAFE;
          color: #2563EB;
        }
        .status-badge.status-revision {
          background: #FEF3C7;
          color: #D97706;
        }
        .status-badge.status-approved {
          background: #D1FAE5;
          color: #059669;
        }
        .status-badge.status-internal {
          background: #CCFBF1;
          color: #0D9488;
        }
        .status-badge.status-optimization {
          background: #F3E8FF;
          color: #9333EA;
        }
        .status-badge.status-images {
          background: #E0E7FF;
          color: #6366F1;
        }
        .status-badge.status-scheduled {
          background: #E0E7FF;
          color: #6366F1;
        }
        .status-badge.status-published {
          background: #D1FAE5;
          color: #059669;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
