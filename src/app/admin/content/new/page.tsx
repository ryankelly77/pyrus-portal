'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'

interface Client {
  id: string
  name: string
  content_approval_mode?: 'full_approval' | 'initial_approval' | 'auto' | null
  approval_threshold?: number | null
}

export default function CreateContentPage() {
  const router = useRouter()
  const { user, hasNotifications } = useUserProfile()
  const [platform, setPlatform] = useState<'website' | 'gbp' | 'social'>('website')
  const [timeline, setTimeline] = useState<'standard' | 'urgent'>('standard')
  const [basecampTask, setBasecampTask] = useState(true)
  const [emailNotification, setEmailNotification] = useState(true)
  const [socialPlatforms, setSocialPlatforms] = useState({
    facebook: true,
    instagram: true,
    linkedin: false,
    x: false,
  })

  // Form state
  const [title, setTitle] = useState('')
  const [bodyContent, setBodyContent] = useState('')
  const [contentType, setContentType] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // SEO fields (for website platform)
  const [targetKeyword, setTargetKeyword] = useState('')
  const [secondaryKeywords, setSecondaryKeywords] = useState('')
  const [wordCountTarget, setWordCountTarget] = useState('')

  // Client state
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [approvedContentCount, setApprovedContentCount] = useState(0)

  // Fetch clients from API
  useEffect(() => {
    const fetchClients = async () => {
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
    }
    fetchClients()
  }, [])

  // Fetch client approval data when selection changes
  const fetchClientApprovalData = useCallback(async (clientIdToFetch: string) => {
    if (!clientIdToFetch) {
      setSelectedClient(null)
      setApprovedContentCount(0)
      return
    }
    try {
      const clientRes = await fetch(`/api/admin/clients/${clientIdToFetch}`)
      if (clientRes.ok) {
        const clientData = await clientRes.json()
        setSelectedClient(clientData)
      }
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
    if (selectedClientId) {
      fetchClientApprovalData(selectedClientId)
    } else {
      setSelectedClient(null)
      setApprovedContentCount(0)
    }
  }, [selectedClientId, fetchClientApprovalData])

  const handleSaveDraft = async () => {
    setError(null)

    if (!selectedClientId) {
      setError('Please select a client')
      return
    }
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: title.trim(),
          bodyContent: bodyContent || null,
          contentType: contentType || null,
          platform,
          urgent: timeline === 'urgent',
          status: 'draft',
          // SEO fields (for website platform)
          targetKeyword: platform === 'website' ? targetKeyword || null : null,
          secondaryKeywords: platform === 'website' ? secondaryKeywords || null : null,
          wordCount: platform === 'website' && wordCountTarget ? parseInt(wordCountTarget) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save draft')
      }

      const content = await res.json()
      router.push(`/admin/content/${content.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmitForReview = async () => {
    setError(null)

    if (!selectedClientId) {
      setError('Please select a client')
      return
    }
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: title.trim(),
          bodyContent: bodyContent || null,
          contentType: contentType || null,
          platform,
          urgent: timeline === 'urgent',
          status: 'sent_for_review',
          // SEO fields (for website platform)
          targetKeyword: platform === 'website' ? targetKeyword || null : null,
          secondaryKeywords: platform === 'website' ? secondaryKeywords || null : null,
          wordCount: platform === 'website' && wordCountTarget ? parseInt(wordCountTarget) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit for review')
      }

      router.push('/admin/content')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit for review')
    } finally {
      setIsSaving(false)
    }
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
            <h1 className="page-title-inline">Create New Content</h1>
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
                Content skips client review — workflow: Draft → Internal Review → Production → Posted
              </div>
            </div>
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
                  placeholder="Enter content title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Content <span className="required">*</span>
                </label>
                <div className="editor-toolbar">
                  <button type="button" className="toolbar-btn" title="Bold"><strong>B</strong></button>
                  <button type="button" className="toolbar-btn" title="Italic"><em>I</em></button>
                  <button type="button" className="toolbar-btn" title="Underline"><u>U</u></button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Heading 2">H2</button>
                  <button type="button" className="toolbar-btn" title="Heading 3">H3</button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Bullet List">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </button>
                  <button type="button" className="toolbar-btn" title="Numbered List">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <line x1="10" y1="6" x2="21" y2="6"></line>
                      <line x1="10" y1="12" x2="21" y2="12"></line>
                      <line x1="10" y1="18" x2="21" y2="18"></line>
                      <path d="M4 6h1v4"></path>
                      <path d="M4 10h2"></path>
                      <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
                    </svg>
                  </button>
                  <div className="toolbar-divider"></div>
                  <button type="button" className="toolbar-btn" title="Link">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </button>
                  <button type="button" className="toolbar-btn" title="Image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </button>
                </div>
                <textarea
                  className="form-textarea content-textarea"
                  rows={16}
                  placeholder="Write your content here..."
                  value={bodyContent}
                  onChange={(e) => setBodyContent(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="content-sidebar-section">
            <div className="form-card">
              <h3 className="form-card-title">Publishing Settings</h3>

              <div className="form-group">
                <label className="form-label">
                  Client <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Select client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Platform <span className="required">*</span>
                </label>
                <div className="platform-options platform-options-3">
                  <button
                    type="button"
                    className={`platform-option ${platform === 'website' ? 'active' : ''}`}
                    onClick={() => { setPlatform('website'); setContentType(''); }}
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
                    onClick={() => { setPlatform('gbp'); setContentType(''); }}
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
                    onClick={() => { setPlatform('social'); setContentType(''); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                    </svg>
                    <span>Social</span>
                  </button>
                </div>
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
                  Content Type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
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
              </div>

              {/* SEO Information - only for website platform */}
              {platform === 'website' && (
                <div className="form-card" style={{ marginTop: '16px', padding: '16px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>
                    SEO Information
                  </h4>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '13px' }}>Target Keyword</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Primary keyword to target..."
                      value={targetKeyword}
                      onChange={(e) => setTargetKeyword(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label" style={{ fontSize: '13px' }}>Secondary Keywords</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Comma-separated secondary keywords..."
                      value={secondaryKeywords}
                      onChange={(e) => setSecondaryKeywords(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <label className="form-label" style={{ fontSize: '13px' }}>Word Count Target</label>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="e.g., 1500"
                      value={wordCountTarget}
                      onChange={(e) => setWordCountTarget(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">
                  Review Timeline <span className="required">*</span>
                </label>
                <div className="timeline-options">
                  <button
                    type="button"
                    className={`timeline-option ${timeline === 'standard' ? 'active' : ''}`}
                    onClick={() => setTimeline('standard')}
                  >
                    <div className="timeline-option-content">
                      <strong>Standard (5 days)</strong>
                      <span>Normal review timeline</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`timeline-option ${timeline === 'urgent' ? 'active' : ''}`}
                    onClick={() => setTimeline('urgent')}
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
            </div>

            <div className="form-card">
              <h3 className="form-card-title">Notifications</h3>

              <div className="notification-options">
                <label className="notification-option">
                  <input
                    type="checkbox"
                    checked={basecampTask}
                    onChange={(e) => setBasecampTask(e.target.checked)}
                  />
                  <div className="notification-option-content">
                    <strong>Create Basecamp Task</strong>
                    <span>Automatically create a task in Basecamp for tracking</span>
                  </div>
                </label>
                <label className="notification-option">
                  <input
                    type="checkbox"
                    checked={emailNotification}
                    onChange={(e) => setEmailNotification(e.target.checked)}
                  />
                  <div className="notification-option-content">
                    <strong>Send Email Notification</strong>
                    <span>Notify client that content is ready for review</span>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                color: '#DC2626',
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}

            <div className="sidebar-actions">
              <button
                className="btn btn-outline btn-block"
                onClick={handleSaveDraft}
                disabled={isSaving}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                className="btn btn-primary btn-block"
                onClick={handleSubmitForReview}
                disabled={isSaving}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                {isSaving ? 'Submitting...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
