'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useUserProfile } from '@/hooks/useUserProfile'
import { StatusProgressBar } from '@/components/content'

type ContentStatus =
  | 'draft'
  | 'sent_for_review'
  | 'client_reviewing'
  | 'revisions_requested'
  | 'approved'
  | 'internal_review'
  | 'final_optimization'
  | 'image_selection'
  | 'scheduled'
  | 'posted'
  // Legacy statuses for backwards compatibility
  | 'pending_review'
  | 'revision'
  | 'published'

interface ContentItem {
  id: string
  title: string
  client_name: string
  client_id: string
  content_type: string | null
  platform: string | null
  status: ContentStatus
  urgent?: boolean
  excerpt?: string | null
  published_url?: string | null
  created_at: string
  updated_at?: string
  deadline?: string | null
  scheduled_date?: string | null
  published_at?: string | null
  // New workflow fields
  approval_required?: boolean
  review_round?: number
  status_history?: Array<{
    status: string
    changed_at: string
    changed_by_name: string
    note?: string
  }>
  status_changed_at?: string
  assigned_to?: string | null
}

interface ClientOption {
  id: string
  name: string
}

interface Stats {
  // New grouped stats
  active_clients: number
  drafts: number
  in_review: number
  revisions: number
  in_production: number
  posted_this_month: number
  // Legacy stats for backwards compatibility
  pending_review?: number
  revision?: number
  approved?: number
  published?: number
  clients_with_content?: number
}

export default function AdminContentPage() {
  const { profile, hasNotifications } = useUserProfile()
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [stats, setStats] = useState<Stats>({
    active_clients: 0,
    drafts: 0,
    in_review: 0,
    revisions: 0,
    in_production: 0,
    posted_this_month: 0
  })
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Rush interstitial state
  const [showRushInterstitial, setShowRushInterstitial] = useState(false)
  const [rushItems, setRushItems] = useState<ContentItem[]>([])

  // Add Files modal state
  const [showFilesModal, setShowFilesModal] = useState(false)
  const [fileClientId, setFileClientId] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileType, setFileType] = useState<'docs' | 'images' | 'video'>('docs')
  const [fileCategory, setFileCategory] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadMode, setUploadMode] = useState<'upload' | 'link'>('upload')
  const [isAddingFile, setIsAddingFile] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [fileSuccess, setFileSuccess] = useState(false)

  const isSuperAdmin = profile?.role === 'super_admin'

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!openDropdown) return
    const handleClick = () => setOpenDropdown(null)
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [openDropdown])

  // Fetch content and clients
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch content
        const params = new URLSearchParams()
        if (statusFilter) params.set('status', statusFilter)
        if (clientFilter) params.set('clientId', clientFilter)
        if (platformFilter) params.set('platform', platformFilter)

        const contentRes = await fetch(`/api/admin/content?${params.toString()}`)
        if (contentRes.ok) {
          const data = await contentRes.json()
          const content = data.content || []
          setContentItems(content)
          setStats(data.stats || stats)
        }

        // Fetch clients for filter dropdown
        const clientsRes = await fetch('/api/admin/clients')
        if (clientsRes.ok) {
          const data = await clientsRes.json()
          // API returns array directly, not { clients: [...] }
          const clientsArray = Array.isArray(data) ? data : (data.clients || [])
          setClients(clientsArray.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name
          })))
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [statusFilter, clientFilter, platformFilter])

  // Separate effect to check for rush items once profile is loaded
  useEffect(() => {
    if (!profile?.id || contentItems.length === 0) return

    const urgentItems = contentItems.filter((item: ContentItem) => item.urgent)
    if (urgentItems.length > 0) {
      const dismissedKey = `rush_dismissed_${profile.id}`
      const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[]
      const newRushItems = urgentItems.filter((item: ContentItem) => !dismissed.includes(item.id))

      if (newRushItems.length > 0) {
        setRushItems(newRushItems)
        setShowRushInterstitial(true)
      }
    }
  }, [profile?.id, contentItems])

  const clearFilters = () => {
    setStatusFilter('')
    setClientFilter('')
    setPlatformFilter('')
  }

  // Dismiss rush interstitial and mark items as seen
  const dismissRushInterstitial = () => {
    if (profile?.id && rushItems.length > 0) {
      const dismissedKey = `rush_dismissed_${profile.id}`
      const dismissed = JSON.parse(localStorage.getItem(dismissedKey) || '[]') as string[]
      const newDismissed = Array.from(new Set([...dismissed, ...rushItems.map(item => item.id)]))
      localStorage.setItem(dismissedKey, JSON.stringify(newDismissed))
    }
    setShowRushInterstitial(false)
    setRushItems([])
  }

  // Handle adding a file
  const handleAddFile = async () => {
    if (!fileClientId || !fileCategory) {
      setFileError('Please select a client and category')
      return
    }

    // Validate based on mode
    if (uploadMode === 'upload' && !uploadedFile) {
      setFileError('Please select a file to upload')
      return
    }
    if (uploadMode === 'link' && !fileName) {
      setFileError('Please enter a file name')
      return
    }

    setIsAddingFile(true)
    setFileError(null)

    try {
      let res: Response

      if (uploadMode === 'upload' && uploadedFile) {
        // Upload file
        const formData = new FormData()
        formData.append('file', uploadedFile)
        formData.append('clientId', fileClientId)
        formData.append('category', fileCategory)

        res = await fetch('/api/admin/files/upload', {
          method: 'POST',
          body: formData,
        })
      } else {
        // Add link
        res = await fetch('/api/admin/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: fileClientId,
            name: fileName,
            type: fileType,
            category: fileCategory,
            url: fileUrl || null,
          }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('File add error:', data)
        setFileError(data.error || `Failed to add file (${res.status})`)
        return
      }

      setFileSuccess(true)
      setTimeout(() => {
        setShowFilesModal(false)
        resetFileModal()
      }, 1500)
    } catch (error) {
      console.error('Error adding file:', error)
      setFileError('Failed to add file')
    } finally {
      setIsAddingFile(false)
    }
  }

  const resetFileModal = () => {
    setFileClientId('')
    setFileName('')
    setFileType('docs')
    setFileCategory('')
    setFileUrl('')
    setUploadedFile(null)
    setUploadMode('upload')
    setFileError(null)
    setFileSuccess(false)
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/content/${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        // Remove from local state
        setContentItems((prev) => prev.filter((item) => item.id !== deleteConfirm.id))
        setDeleteConfirm(null)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete content')
      }
    } catch (error) {
      console.error('Error deleting content:', error)
      alert('Failed to delete content')
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusClass = (status: ContentStatus) => {
    // Map to CSS classes for status badges
    const classMap: Record<string, string> = {
      draft: 'status-draft',
      sent_for_review: 'status-review',
      client_reviewing: 'status-reviewing',
      revisions_requested: 'status-revision',
      approved: 'status-approved',
      internal_review: 'status-internal',
      final_optimization: 'status-optimization',
      image_selection: 'status-images',
      scheduled: 'status-scheduled',
      posted: 'status-published',
      // Legacy mappings
      pending_review: 'status-awaiting',
      revision: 'status-revision',
      published: 'status-published'
    }
    return classMap[status] || 'status-draft'
  }

  const getStatusLabel = (status: ContentStatus) => {
    // Use workflow engine labels for new statuses
    const labelMap: Record<string, string> = {
      draft: 'Draft',
      sent_for_review: 'Sent for Review',
      client_reviewing: 'Client Reviewing',
      revisions_requested: 'Revisions Requested',
      approved: 'Approved',
      internal_review: 'Internal Review',
      final_optimization: 'Final Optimization',
      image_selection: 'Image Selection',
      scheduled: 'Scheduled',
      posted: 'Published',
      // Legacy mappings
      pending_review: 'Awaiting Review',
      revision: 'Needs Revision',
      published: 'Published'
    }
    return labelMap[status] || status
  }

  const getContentTypeLabel = (contentType: string | null, platform: string | null) => {
    if (!contentType) {
      // Fallback to platform label if no content type
      const platformLabels: Record<string, string> = {
        website: 'Website',
        gbp: 'Google Business',
        social: 'Social',
        'ai-creative': 'AI Creative',
      }
      return platformLabels[platform || ''] || 'Content'
    }

    const typeLabels: Record<string, string> = {
      // Website content types
      blog: 'Blog Post',
      'blog-post': 'Blog Post',
      'Blog Post': 'Blog Post',
      landing_page: 'Landing Page',
      'landing-page': 'Landing Page',
      'Landing Page': 'Landing Page',
      service_page: 'Service Page',
      'service-page': 'Service Page',
      'Service Page': 'Service Page',
      location_page: 'Location Page',
      'location-page': 'Location Page',
      'Location Page': 'Location Page',
      website: 'Website',
      // GBP content types
      gbp: 'GBP Post',
      gbp_post: 'GBP Post',
      'gbp-post': 'GBP Post',
      'GBP Post': 'GBP Post',
      gbp_update: 'GBP Update',
      'gbp-update': 'GBP Update',
      // Social content types
      social: 'Social Post',
      social_post: 'Social Post',
      'social-post': 'Social Post',
      'Social Post': 'Social Post',
      // AI Creative types
      'ai-creative': 'AI Creative',
      ai_image: 'AI Image',
      'ai-image': 'AI Image',
      ai_video: 'AI Video',
      'ai-video': 'AI Video',
      '4 Graphics Package': '4 Graphics Package',
      // Other/misc
      other: 'Other',
      Other: 'Other',
    }
    return typeLabels[contentType] || contentType
  }

  const getPlatformClass = (platform: string | null, contentType: string | null) => {
    // First check platform
    if (platform) {
      switch (platform) {
        case 'website':
          return 'website'
        case 'gbp':
          return 'gbp'
        case 'social':
          return 'social'
        case 'ai-creative':
          return 'ai-creative'
      }
    }

    // If no platform, infer from content type
    if (contentType) {
      const websiteTypes = ['blog', 'blog-post', 'Blog Post', 'landing_page', 'landing-page', 'Landing Page', 'service_page', 'service-page', 'Service Page', 'location_page', 'location-page', 'Location Page', 'website']
      const gbpTypes = ['gbp', 'gbp_post', 'gbp-post', 'GBP Post', 'gbp_update', 'gbp-update', 'GBP Update']
      const socialTypes = ['social', 'social_post', 'social-post', 'Social Post']
      const aiCreativeTypes = ['ai-creative', 'ai_image', 'ai-image', 'AI Image', 'ai_video', 'ai-video', 'AI Video', '4 Graphics Package']

      if (websiteTypes.includes(contentType)) return 'website'
      if (gbpTypes.includes(contentType)) return 'gbp'
      if (socialTypes.includes(contentType)) return 'social'
      if (aiCreativeTypes.includes(contentType)) return 'ai-creative'
    }

    return 'default-platform'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Determine primary action based on status
  const getPrimaryAction = (item: ContentItem) => {
    switch (item.status) {
      case 'draft':
        return { label: 'Continue', variant: 'primary' as const }
      case 'revisions_requested':
        return { label: 'Revise', variant: 'secondary' as const }
      case 'sent_for_review':
      case 'client_reviewing':
        return { label: 'View', variant: 'secondary' as const }
      case 'approved':
      case 'internal_review':
        return { label: 'Optimize', variant: 'primary' as const }
      case 'final_optimization':
        return { label: 'Select Images', variant: 'primary' as const }
      case 'image_selection':
        return { label: 'Post', variant: 'primary' as const }
      case 'scheduled':
        return { label: 'Mark Published', variant: 'primary' as const }
      case 'posted':
      case 'published':
        return { label: 'View', variant: 'secondary' as const }
      default:
        return { label: 'View', variant: 'secondary' as const }
    }
  }

  return (
    <>
      {/* Action Buttons */}
      <div className="header-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px', marginTop: '-16px' }}>
        <button
          className="btn"
          style={{ background: '#3B82F6', borderColor: '#3B82F6', color: 'white' }}
          onClick={() => {
            resetFileModal()
            setShowFilesModal(true)
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            <line x1="12" y1="11" x2="12" y2="17"></line>
            <line x1="9" y1="14" x2="15" y2="14"></line>
          </svg>
          Add Files
        </button>
        <Link href="/admin/content/new" className="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Content
        </Link>
      </div>

      {/* Stat Cards - 6 cards in a row */}
      <div className="stats-grid stats-grid-6" style={{ marginBottom: '24px' }}>
        {/* Active Clients */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.active_clients}</span>
            <span className="stat-label">Active Clients</span>
          </div>
        </div>

        {/* Drafts */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#F3F4F6', color: '#6B7280' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.drafts}</span>
            <span className="stat-label">Drafts</span>
          </div>
        </div>

        {/* In Review */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#CCFBF1', color: '#0D9488' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.in_review}</span>
            <span className="stat-label">In Review</span>
          </div>
        </div>

        {/* Revisions */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.revisions}</span>
            <span className="stat-label">Revisions</span>
          </div>
        </div>

        {/* In Production */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#E0E7FF', color: '#6366F1' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.in_production}</span>
            <span className="stat-label">In Production</span>
          </div>
        </div>

        {/* Published This Month */}
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#DCFCE7', color: '#16A34A' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.posted_this_month}</span>
            <span className="stat-label">Published This Month</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="content-filters">
        <div className="filter-group">
          <label htmlFor="statusFilter">Status</label>
          <select
            id="statusFilter"
            className="form-control"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <optgroup label="Writing">
              <option value="draft">Draft</option>
            </optgroup>
            <optgroup label="Client Review">
              <option value="in_review">All In Review</option>
              <option value="sent_for_review">Sent for Review</option>
              <option value="client_reviewing">Client Reviewing</option>
              <option value="revisions_requested">Revisions Requested</option>
            </optgroup>
            <optgroup label="Production">
              <option value="in_production">All In Production</option>
              <option value="approved">Approved</option>
              <option value="internal_review">Internal Review</option>
              <option value="final_optimization">Final Optimization</option>
              <option value="image_selection">Image Selection</option>
            </optgroup>
            <optgroup label="Complete">
              <option value="scheduled">Scheduled</option>
              <option value="posted">Published</option>
            </optgroup>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="clientFilter">Client</label>
          <select
            id="clientFilter"
            className="form-control"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="platformFilter">Platform</label>
          <select
            id="platformFilter"
            className="form-control"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="website">Website</option>
            <option value="gbp">Google Business</option>
            <option value="social">Social</option>
            <option value="ai-creative">AI Creative</option>
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state" style={{ textAlign: 'center', padding: '48px' }}>
          <p>Loading content...</p>
        </div>
      )}

      {/* Content Table */}
      {!loading && (
      <div className="content-table-wrapper">
        <table className="content-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Client</th>
              <th>Type</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {contentItems.map((item) => (
              <tr key={item.id} className="content-row" data-status={item.status}>
                <td>
                  <div className="content-title-cell">
                    {item.urgent && (
                      <span className="urgent-indicator" title="Urgent - 24hr deadline">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                        </svg>
                      </span>
                    )}
                    <Link
                      href={`/admin/content/${item.id}`}
                      className="content-title-link"
                    >
                      {item.title}
                    </Link>
                    {(item.review_round ?? 0) > 0 && (
                      <span className="revision-badge" title={`Revision round ${item.review_round}`}>
                        R{item.review_round}
                      </span>
                    )}
                  </div>
                </td>
                <td>{item.client_name}</td>
                <td>
                  <span className={`platform-badge ${getPlatformClass(item.platform, item.content_type)}`}>
                    {getContentTypeLabel(item.content_type, item.platform)}
                  </span>
                </td>
                <td>
                  <StatusProgressBar
                    currentStatus={item.status}
                    approvalRequired={item.approval_required ?? true}
                    reviewRound={item.review_round ?? 0}
                    compact
                  />
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                </td>
                <td>{formatDate(item.status_changed_at || item.created_at)}</td>
                <td>
                  <div className="action-buttons">
                    {(() => {
                      const action = getPrimaryAction(item)
                      return (
                        <Link
                          href={`/admin/content/${item.id}`}
                          className={`btn btn-sm btn-${action.variant}`}
                        >
                          {action.label}
                        </Link>
                      )
                    })()}
                    {/* More actions dropdown */}
                    {(isSuperAdmin || ((item.status === 'posted' || item.status === 'published') && item.published_url)) && (
                      <div className="dropdown-container">
                        <button
                          className="btn btn-sm btn-outline btn-icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenDropdown(openDropdown === item.id ? null : item.id)
                          }}
                          title="More actions"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </button>
                        {openDropdown === item.id && (
                          <div className="dropdown-menu" onClick={() => setOpenDropdown(null)}>
                            {(item.status === 'posted' || item.status === 'published') && item.published_url && (
                              <a
                                href={item.published_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="dropdown-item"
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                  <polyline points="15 3 21 3 21 9"></polyline>
                                  <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                                View Live
                              </a>
                            )}
                            {isSuperAdmin && (
                              <button
                                className="dropdown-item dropdown-item-danger"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setDeleteConfirm({ id: item.id, title: item.title })
                                  setOpenDropdown(null)
                                }}
                              >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                                  <polyline points="3 6 5 6 21 6"></polyline>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* No Results */}
      {!loading && contentItems.length === 0 && (
        <div className="no-results">
          <p>No content found matching your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {contentItems.length > 0 && (
        <div className="table-pagination">
          <span className="pagination-info">Showing 1-{contentItems.length} items</span>
          <div className="pagination-buttons">
            <button className="btn btn-sm btn-secondary" disabled>
              Previous
            </button>
            <button className="btn btn-sm btn-secondary">Next</button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="table-legend">
        <div className="legend-item">
          <span className="urgent-indicator">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </span>
          <span className="legend-text">Urgent - 24 hour deadline</span>
        </div>
        <div className="legend-item">
          <span className="revision-badge">R1</span>
          <span className="legend-text">Revision round indicator</span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
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
          onClick={() => !isDeleting && setDeleteConfirm(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              width: '400px',
              maxWidth: '90vw',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid #E5E7EB',
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: 0 }}>Delete Content</h3>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  borderRadius: '6px',
                }}
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ marginBottom: '16px' }}>
                Are you sure you want to delete this content?
              </p>
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
              }}>
                <strong style={{ color: '#DC2626' }}>{deleteConfirm.title}</strong>
              </div>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                This action cannot be undone. All revisions and comments will also be deleted.
              </p>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 20px',
              borderTop: '1px solid #E5E7EB',
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                style={{
                  background: '#DC2626',
                  border: '1px solid #DC2626',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  opacity: isDeleting ? 0.6 : 1,
                }}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rush Publishing Interstitial */}
      {showRushInterstitial && rushItems.length > 0 && (
        <div style={{
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxWidth: '560px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="24" height="24">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 600, color: '#1F2937' }}>
                  Rush Publishing Request{rushItems.length > 1 ? 's' : ''}
                </h2>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
                  {rushItems.length === 1
                    ? 'A client has requested rush publishing for the following content:'
                    : `${rushItems.length} clients have requested rush publishing:`}
                </p>
              </div>
              <button
                onClick={dismissRushInterstitial}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ padding: '16px 24px', maxHeight: '300px', overflowY: 'auto' }}>
              {rushItems.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    background: index % 2 === 0 ? '#FEF3C7' : '#FFFBEB',
                    borderRadius: '8px',
                    marginBottom: index < rushItems.length - 1 ? '8px' : 0,
                    border: '1px solid #FCD34D'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#92400E' }}>
                      {item.title}
                    </h4>
                    <span style={{
                      background: '#F59E0B',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      RUSH
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#78350F' }}>
                    <span>{item.client_name}</span>
                    <span>•</span>
                    <span>{getContentTypeLabel(item.content_type, item.platform)}</span>
                    <span>•</span>
                    <span>{getStatusLabel(item.status)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              background: '#F9FAFB',
              borderRadius: '0 0 12px 12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" width="18" height="18">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4B5563' }}>
                  Rush content should be prioritized and published within <strong>24 hours</strong>.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={dismissRushInterstitial}
                  style={{
                    background: 'white',
                    border: '1px solid #D1D5DB',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    color: '#374151'
                  }}
                >
                  Got It
                </button>
                <Link
                  href={rushItems.length === 1 ? `/admin/content/${rushItems[0].id}` : '/admin/content?status=urgent'}
                  onClick={dismissRushInterstitial}
                  style={{
                    background: '#F59E0B',
                    border: '1px solid #F59E0B',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    color: 'white',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                  {rushItems.length === 1 ? 'View Content' : 'View Rush Items'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Files Modal */}
      {showFilesModal && (
        <div style={{
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
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#DBEAFE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" width="20" height="20">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Add Files</h2>
              </div>
              <button
                onClick={() => setShowFilesModal(false)}
                disabled={isAddingFile}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  cursor: 'pointer',
                  color: '#6B7280',
                  borderRadius: '6px',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {fileSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#D1FAE5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="32" height="32">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 600, color: '#059669' }}>File Added!</h3>
                  <p style={{ margin: 0, color: '#6B7280' }}>The file has been added to the client.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Client Selector */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Client <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={fileClientId}
                      onChange={(e) => setFileClientId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select a client...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Category */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Category <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select category...</option>
                      <option value="Branding Foundation">Branding Foundation</option>
                      <option value="AI Creative">AI Creative</option>
                      <option value="Content Writing">Content Writing</option>
                      <option value="SEO">SEO</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Upload/Link Toggle */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                      Add File
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setUploadMode('upload')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          border: uploadMode === 'upload' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: uploadMode === 'upload' ? '#EFF6FF' : 'white',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: uploadMode === 'upload' ? '#1D4ED8' : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMode('link')}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          border: uploadMode === 'link' ? '2px solid #3B82F6' : '1px solid #D1D5DB',
                          borderRadius: '8px',
                          background: uploadMode === 'link' ? '#EFF6FF' : 'white',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: uploadMode === 'link' ? '#1D4ED8' : '#6B7280',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Add Link
                      </button>
                    </div>
                  </div>

                  {/* Upload Mode */}
                  {uploadMode === 'upload' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                        Select File <span style={{ color: '#DC2626' }}>*</span>
                      </label>
                      <div
                        style={{
                          border: '2px dashed #D1D5DB',
                          borderRadius: '8px',
                          padding: '24px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: uploadedFile ? '#F0FDF4' : '#F9FAFB',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => document.getElementById('fileUploadInput')?.click()}
                      >
                        <input
                          id="fileUploadInput"
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              setUploadedFile(file)
                            }
                          }}
                        />
                        {uploadedFile ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="20" height="20">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span style={{ color: '#059669', fontWeight: 500 }}>{uploadedFile.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setUploadedFile(null)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#DC2626'
                              }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="32" height="32" style={{ margin: '0 auto 8px' }}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
                              Click to select a file or drag and drop
                            </p>
                            <p style={{ margin: '4px 0 0', color: '#9CA3AF', fontSize: '0.75rem' }}>
                              PDF, DOC, Images, Videos up to 50MB
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Link Mode */}
                  {uploadMode === 'link' && (
                    <>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                          File Name <span style={{ color: '#DC2626' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="e.g., Brand Strategy Document.pdf"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                            Type <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <select
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value as 'docs' | 'images' | 'video')}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '0.875rem'
                            }}
                          >
                            <option value="docs">Document</option>
                            <option value="images">Image</option>
                            <option value="video">Video</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.875rem' }}>
                            Drive/File URL
                          </label>
                          <input
                            type="url"
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            placeholder="https://..."
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Error Message */}
                  {fileError && (
                    <div style={{
                      background: '#FEE2E2',
                      border: '1px solid #EF4444',
                      borderRadius: '8px',
                      padding: '12px',
                      color: '#DC2626',
                      fontSize: '0.875rem'
                    }}>
                      {fileError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!fileSuccess && (
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 20px',
                borderTop: '1px solid #E5E7EB',
              }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowFilesModal(false)}
                  disabled={isAddingFile}
                  style={{ padding: '10px 20px' }}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleAddFile}
                  disabled={isAddingFile}
                  style={{
                    background: '#3B82F6',
                    borderColor: '#3B82F6',
                    color: 'white',
                    padding: '10px 20px'
                  }}
                >
                  {isAddingFile ? (uploadMode === 'upload' ? 'Uploading...' : 'Adding...') : (uploadMode === 'upload' ? 'Upload File' : 'Add File')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .stats-grid-6 {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
        }

        @media (max-width: 1200px) {
          .stats-grid-6 {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 768px) {
          .stats-grid-6 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .revision-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 18px;
          padding: 0 6px;
          font-size: 10px;
          font-weight: 600;
          color: #D97706;
          background: #FEF3C7;
          border-radius: 9px;
          margin-left: 8px;
        }

        .status-badge.status-review {
          background: #CCFBF1;
          color: #0D9488;
        }

        .status-badge.status-reviewing {
          background: #DBEAFE;
          color: #2563EB;
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

        /* Platform/Type badges */
        .platform-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .platform-badge.website {
          background: #DBEAFE;
          color: #1D4ED8;
        }

        .platform-badge.gbp {
          background: #FEF3C7;
          color: #B45309;
        }

        .platform-badge.social {
          background: #F3E8FF;
          color: #7C3AED;
        }

        .platform-badge.ai-creative {
          background: #FCE7F3;
          color: #BE185D;
        }

        .platform-badge.default-platform {
          background: #F3F4F6;
          color: #4B5563;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 24px;
        }

        .table-legend {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
          padding: 12px 16px;
          background: #F9FAFB;
          border-radius: 8px;
          font-size: 13px;
          color: #6B7280;
        }

        .dropdown-container {
          position: relative;
        }

        .dropdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          min-width: 140px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 50;
          overflow: hidden;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 14px;
          border: none;
          background: none;
          text-align: left;
          font-size: 14px;
          color: #374151;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.15s ease;
        }

        .dropdown-item:hover {
          background: #F3F4F6;
        }

        .dropdown-item-danger {
          color: #DC2626;
        }

        .dropdown-item-danger:hover {
          background: #FEF2F2;
        }
      `}</style>
    </>
  )
}
