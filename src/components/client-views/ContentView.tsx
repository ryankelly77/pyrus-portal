'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { StatusProgressBar } from '@/components/content'
import { getStatusLabel } from '@/lib/content-workflow-helpers'

interface SubscriptionService {
  id?: string
  name: string
  quantity: number
}

interface ContentProduct {
  id: string
  name: string
  short_description?: string | null
  long_description?: string | null
  category?: string
  monthly_price?: string | null
  onetime_price?: string | null
  supports_quantity?: boolean | null
}

interface Service {
  name: string
  quantity: number
  details?: string
}

interface ContentViewProps {
  clientId: string
  isAdmin?: boolean
  isDemo?: boolean
  onAddToCart?: (itemId: string) => void
  // Admin-specific props for data parity
  subscriptionServices?: SubscriptionService[]
  availableContentProducts?: ContentProduct[]
  onProductClick?: (product: ContentProduct) => void
  onViewContentRequirements?: () => void
  // Aggregated services from product flags
  contentServices?: Service[]
}

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by_id?: string | null
  changed_by_name?: string
  note?: string
}

interface ContentItem {
  id: string
  platform: string
  platformLabel: string
  title: string
  type: string
  preview: string
  timeRemaining?: string | null
  daysAgo?: string | null
  date: string
  scheduledDate?: string | null
  publishedDate?: string | null
  publishedUrl?: string | null
  // New workflow fields
  status: string
  approval_required: boolean
  review_round: number
  status_history: StatusHistoryEntry[]
  status_changed_at: string | null
  urgent: boolean
}

interface ContentStats {
  urgentReviews: number
  pendingApproval: number
  approved: number
  published: number
  total: number
  // New workflow stats
  needsReview?: number
  inProduction?: number
  postedThisMonth?: number
}

interface ContentData {
  urgentReviews: ContentItem[]
  pendingApproval: ContentItem[]
  approved: ContentItem[]
  published: ContentItem[]
}

interface FileItem {
  id: number
  name: string
  type: 'docs' | 'images' | 'video'
  category: string
  date: string
}

type ContentFilter = 'all' | 'needs_review' | 'in_production' | 'posted_this_month'

// Demo files data (Raptor Vending)
const demoFiles: FileItem[] = [
  { id: 1, name: 'Raptor Vending Brand Strategy.pdf', type: 'docs', category: 'Branding Foundation', date: 'Jan 5, 2026' },
  { id: 2, name: 'Micromarket Sales Playbook.pdf', type: 'docs', category: 'Branding Foundation', date: 'Jan 3, 2026' },
  { id: 3, name: 'San Antonio Market Analysis.pdf', type: 'docs', category: 'Branding Foundation', date: 'Dec 28, 2025' },
  { id: 4, name: 'Raptor Brand Guidelines.pdf', type: 'docs', category: 'Branding Foundation', date: 'Dec 20, 2025' },
  { id: 5, name: 'Micromarket Promo Banner.png', type: 'images', category: 'AI Creative', date: 'Jan 8, 2026' },
  { id: 6, name: 'Workplace Dining Solutions.jpg', type: 'images', category: 'AI Creative', date: 'Jan 6, 2026' },
  { id: 7, name: 'Break Room Showcase Video.mp4', type: 'video', category: 'AI Creative', date: 'Dec 15, 2025' },
]


// Demo content data with new workflow fields
const demoContentData: ContentData = {
  urgentReviews: [
    {
      id: '1',
      platform: 'website',
      platformLabel: 'Website Content',
      timeRemaining: '23 hours',
      title: 'Why San Antonio Businesses Are Switching to Micromarkets',
      type: 'Blog Post',
      date: 'Jan 8',
      preview: 'Discover why forward-thinking San Antonio companies are replacing traditional vending with 24/7 micromarket solutions...',
      status: 'sent_for_review',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date().toISOString(),
      urgent: true
    },
    {
      id: '2',
      platform: 'gbp',
      platformLabel: 'Google Business Profile',
      timeRemaining: '18 hours',
      title: 'New Micromarket Installation in Stone Oak',
      type: 'Google Post',
      date: 'Jan 10',
      preview: 'Excited to announce our latest micromarket installation! Employees now enjoy fresh food, healthy snacks, and premium coffee 24/7...',
      status: 'client_reviewing',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date().toISOString(),
      urgent: true
    }
  ],
  pendingApproval: [
    {
      id: '3',
      platform: 'website',
      platformLabel: 'Website Content',
      timeRemaining: '4 days',
      title: '5 Ways Micromarkets Boost Employee Productivity',
      type: 'Blog Post',
      date: 'Jan 6',
      preview: 'Research shows that convenient access to healthy food options can improve workplace productivity by up to 25%...',
      status: 'sent_for_review',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date().toISOString(),
      urgent: false
    },
    {
      id: '4',
      platform: 'social',
      platformLabel: 'Social Posts',
      timeRemaining: '5 days',
      title: 'January Social Media Calendar',
      type: '8 Posts',
      date: 'Jan 5',
      preview: 'Your complete January social media package: New Year workplace wellness tips, micromarket features, and employee appreciation content...',
      status: 'sent_for_review',
      approval_required: true,
      review_round: 1,
      status_history: [{ status: 'revisions_requested', changed_at: new Date(Date.now() - 86400000).toISOString(), note: 'Please update the hashtags' }],
      status_changed_at: new Date().toISOString(),
      urgent: false
    },
    {
      id: '5',
      platform: 'ai-creative',
      platformLabel: 'AI Creative',
      timeRemaining: '6 days',
      title: 'Micromarket Feature Graphics Package',
      type: '4 Graphics',
      date: 'Jan 4',
      preview: 'AI-generated visuals showcasing your micromarket amenities: fresh food displays, coffee stations, and convenient checkout...',
      status: 'client_reviewing',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date().toISOString(),
      urgent: false
    }
  ],
  approved: [
    {
      id: '6',
      platform: 'website',
      platformLabel: 'Website Content',
      title: 'The Complete Guide to Workplace Dining Solutions',
      type: 'Blog Post',
      date: 'Jan 3',
      preview: 'Everything San Antonio businesses need to know about modernizing their break room with vending and micromarket options...',
      scheduledDate: 'Jan 12',
      status: 'final_optimization',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date().toISOString(),
      urgent: false
    }
  ],
  published: [
    {
      id: '7',
      platform: 'website',
      platformLabel: 'Website Content',
      title: 'Micromarket vs Traditional Vending: Which Is Right for Your Office?',
      type: 'Blog Post',
      date: 'Dec 28',
      preview: 'Compare the benefits of modern micromarkets against traditional vending machines for your San Antonio workplace...',
      daysAgo: '14 days ago',
      status: 'posted',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      urgent: false
    },
    {
      id: '8',
      platform: 'gbp',
      platformLabel: 'Google Business Profile',
      title: 'Holiday Hours & New Year Services',
      type: 'Google Post',
      date: 'Dec 23',
      preview: 'Happy Holidays from Raptor Vending! Our micromarkets keep running 24/7 so your team always has access to fresh food and drinks...',
      daysAgo: '19 days ago',
      status: 'posted',
      approval_required: true,
      review_round: 0,
      status_history: [],
      status_changed_at: new Date(Date.now() - 19 * 86400000).toISOString(),
      urgent: false
    }
  ]
}

// Platform icon component
function PlatformIcon({ platform }: { platform: string }) {
  switch (platform) {
    case 'website':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    case 'gbp':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      )
    case 'social':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
        </svg>
      )
    case 'ai-creative':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      )
  }
}

// Get contextual CTA for a content item
function getContentCTA(status: string, id: string, isAdmin: boolean): { label: string; href: string; variant: 'primary' | 'warning' | 'ghost' } {
  const basePath = isAdmin ? `/admin/content/${id}` : `/content/review/${id}`
  switch (status) {
    case 'sent_for_review':
      return { label: 'Review Now', href: basePath, variant: 'primary' }
    case 'client_reviewing':
      return { label: 'Continue Review', href: basePath, variant: 'primary' }
    case 'revisions_requested':
      return { label: 'View Feedback', href: basePath, variant: 'warning' }
    case 'posted':
    case 'published':
      return { label: 'View', href: basePath, variant: 'ghost' }
    default:
      return { label: 'View Details', href: basePath, variant: 'ghost' }
  }
}

// Content item component for review sections
function ContentItemCard({
  item,
  variant = 'pending',
  isAdmin = false,
  onQuickApprove,
  onRushPublishing
}: {
  item: ContentItem
  variant?: 'urgent' | 'pending' | 'approved' | 'published'
  isAdmin?: boolean
  onQuickApprove?: (contentId: string) => Promise<void>
  onRushPublishing?: (contentId: string) => Promise<void>
}) {
  const [isApproving, setIsApproving] = useState(false)
  const [isRushing, setIsRushing] = useState(false)
  const cta = getContentCTA(item.status, item.id, isAdmin)
  const clientStatusLabel = getStatusLabel(item.status, 'client')

  return (
    <div className={`content-item ${variant}`}>
      <div className="content-item-header">
        <span className={`platform-badge ${item.platform}`}>
          <PlatformIcon platform={item.platform} />
          {item.platformLabel}
        </span>
        {(variant === 'urgent' || variant === 'pending') && item.timeRemaining && (
          <div className={`time-remaining ${variant === 'urgent' ? 'urgent' : ''}`}>
            <span className="time-label">Time remaining</span>
            <span className="time-value">{item.timeRemaining}</span>
          </div>
        )}
        {variant === 'approved' && (
          <div className="status-approved">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {clientStatusLabel}
          </div>
        )}
        {variant === 'published' && (
          <div className="status-published">
            <span className="published-label">{clientStatusLabel}</span>
            <span className="published-date">{item.daysAgo}</span>
          </div>
        )}
      </div>

      <h4 className="content-title">
        {item.title}
        {item.review_round > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginLeft: '8px',
            padding: '2px 8px',
            background: '#FEF3C7',
            color: '#D97706',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: '600'
          }}>
            R{item.review_round}
          </span>
        )}
      </h4>

      <div className="content-meta">
        <span className="content-type">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          {item.type}
        </span>
        <span className="content-date">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            {variant === 'published' ? (
              <polyline points="20 6 9 17 4 12"></polyline>
            ) : (
              <>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </>
            )}
          </svg>
          {variant === 'published' ? `Published ${item.publishedDate || item.date}` :
           variant === 'approved' ? `Approved ${item.date}` : `Added ${item.date}`}
        </span>
      </div>

      {/* Compact Progress Bar */}
      <div style={{ margin: '12px 0' }}>
        <StatusProgressBar
          currentStatus={item.status}
          approvalRequired={item.approval_required}
          reviewRound={item.review_round}
          compact
        />
      </div>

      <p className="content-preview">{item.preview}</p>

      {variant === 'approved' && item.scheduledDate && (
        <div className="publishing-info">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          Scheduled for publishing on {item.scheduledDate}
        </div>
      )}

      <div className="content-actions">
        {/* Primary CTA based on status */}
        <Link
          href={cta.href}
          className={`btn btn-sm ${cta.variant === 'primary' ? 'btn-primary' : cta.variant === 'warning' ? 'btn-outline' : 'btn-outline'}`}
          style={cta.variant === 'primary' ? { background: '#14B8A6', borderColor: '#14B8A6' } : cta.variant === 'warning' ? { borderColor: '#F59E0B', color: '#D97706' } : undefined}
        >
          {cta.variant === 'primary' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          )}
          {cta.label}
        </Link>

        {/* Secondary actions based on variant */}
        {(variant === 'urgent' || variant === 'pending') && item.status === 'sent_for_review' && onQuickApprove && (
          <button
            className="btn btn-outline btn-sm"
            disabled={isApproving}
            onClick={async (e) => {
              e.preventDefault()
              setIsApproving(true)
              try {
                await onQuickApprove(item.id)
              } finally {
                setIsApproving(false)
              }
            }}
          >
            {isApproving ? (
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ccc', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            {isApproving ? 'Approving...' : 'Quick Approve'}
          </button>
        )}
        {variant === 'approved' && onRushPublishing && (
          <button
            className="btn btn-outline btn-sm"
            disabled={isRushing || item.urgent}
            onClick={async (e) => {
              e.preventDefault()
              setIsRushing(true)
              try {
                await onRushPublishing(item.id)
              } finally {
                setIsRushing(false)
              }
            }}
            style={item.urgent ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {isRushing ? (
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ccc', borderTopColor: '#666', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            )}
            {item.urgent ? 'Marked Urgent' : isRushing ? 'Requesting...' : 'Rush Publishing'}
          </button>
        )}
        {variant === 'published' && item.publishedUrl && (
          <a href={item.publishedUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
            <PlatformIcon platform={item.platform} />
            View Live
          </a>
        )}
      </div>
    </div>
  )
}

// Summary filter bar component
function SummaryFilterBar({
  stats,
  activeFilter,
  onFilterChange
}: {
  stats: ContentStats
  activeFilter: ContentFilter
  onFilterChange: (filter: ContentFilter) => void
}) {
  const needsReview = stats.needsReview ?? stats.pendingApproval
  const inProduction = stats.inProduction ?? stats.approved
  const postedThisMonth = stats.postedThisMonth ?? 0

  return (
    <div className="content-filter-bar" style={{
      display: 'flex',
      gap: '12px',
      marginBottom: '24px',
      flexWrap: 'wrap',
      alignItems: 'center'
    }}>
      <button
        onClick={() => onFilterChange('needs_review')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '9999px',
          border: activeFilter === 'needs_review' ? '2px solid #F59E0B' : '1px solid #E5E7EB',
          background: needsReview > 0 ? '#FEF3C7' : 'white',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.875rem',
          color: needsReview > 0 ? '#92400E' : '#6B7280',
          transition: 'all 0.2s'
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: needsReview > 0 ? '#F59E0B' : '#E5E7EB',
          color: needsReview > 0 ? 'white' : '#6B7280',
          fontWeight: '700',
          fontSize: '0.75rem'
        }}>
          {needsReview}
        </span>
        Needs Your Review
      </button>

      <button
        onClick={() => onFilterChange('in_production')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '9999px',
          border: activeFilter === 'in_production' ? '2px solid #14B8A6' : '1px solid #E5E7EB',
          background: activeFilter === 'in_production' ? '#CCFBF1' : 'white',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.875rem',
          color: '#0D9488',
          transition: 'all 0.2s'
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#14B8A6',
          color: 'white',
          fontWeight: '700',
          fontSize: '0.75rem'
        }}>
          {inProduction}
        </span>
        In Production
      </button>

      <button
        onClick={() => onFilterChange('posted_this_month')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '9999px',
          border: activeFilter === 'posted_this_month' ? '2px solid #22C55E' : '1px solid #E5E7EB',
          background: activeFilter === 'posted_this_month' ? '#DCFCE7' : 'white',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: '0.875rem',
          color: '#16A34A',
          transition: 'all 0.2s'
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: '#22C55E',
          color: 'white',
          fontWeight: '700',
          fontSize: '0.75rem'
        }}>
          {postedThisMonth}
        </span>
        Published This Month
      </button>

      {activeFilter !== 'all' && (
        <button
          onClick={() => onFilterChange('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '9999px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            color: '#6B7280',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Clear Filter
        </button>
      )}
    </div>
  )
}

export function ContentView({
  clientId,
  isAdmin = false,
  isDemo = false,
  onAddToCart,
  subscriptionServices,
  availableContentProducts,
  onProductClick,
  onViewContentRequirements,
  contentServices
}: ContentViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'review' | 'files'>('review')
  const [fileFilter, setFileFilter] = useState<'all' | 'docs' | 'images' | 'video'>('all')
  const [loading, setLoading] = useState(true)
  const [contentStats, setContentStats] = useState<ContentStats | null>(null)
  const [contentData, setContentData] = useState<ContentData | null>(null)
  const [allContent, setAllContent] = useState<ContentItem[]>([])
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')

  // Rush publishing modal state
  const [showRushModal, setShowRushModal] = useState(false)
  const [rushingItem, setRushingItem] = useState<ContentItem | null>(null)
  const [rushReason, setRushReason] = useState('')
  const [isRequestingRush, setIsRequestingRush] = useState(false)
  const [rushSuccess, setRushSuccess] = useState(false)

  // Only show demo files in demo mode, otherwise empty (real files would come from API)
  const files = isDemo ? demoFiles : []
  const filteredFiles = fileFilter === 'all' ? files : files.filter(f => f.type === fileFilter)

  // Fetch content data
  useEffect(() => {
    async function fetchContent() {
      if (isDemo) {
        // Combine all demo content into a flat list
        const allDemoContent = [
          ...demoContentData.urgentReviews,
          ...demoContentData.pendingApproval,
          ...demoContentData.approved,
          ...demoContentData.published
        ]

        // Calculate demo stats
        const needsReviewStatuses = ['sent_for_review', 'client_reviewing', 'pending_review']
        const inProductionStatuses = ['approved', 'internal_review', 'final_optimization', 'image_selection']
        const completedStatuses = ['posted', 'published']

        const now = new Date()
        const postedThisMonth = allDemoContent.filter(c => {
          if (!completedStatuses.includes(c.status)) return false
          const changedAt = new Date(c.status_changed_at || '')
          return changedAt.getMonth() === now.getMonth() && changedAt.getFullYear() === now.getFullYear()
        }).length

        setContentStats({
          urgentReviews: demoContentData.urgentReviews.length,
          pendingApproval: demoContentData.pendingApproval.length + demoContentData.urgentReviews.length,
          approved: demoContentData.approved.length,
          published: demoContentData.published.length,
          total: 8,
          needsReview: allDemoContent.filter(c => needsReviewStatuses.includes(c.status)).length,
          inProduction: allDemoContent.filter(c => inProductionStatuses.includes(c.status)).length,
          postedThisMonth
        })
        setContentData(demoContentData)
        setAllContent(allDemoContent)
        setLoading(false)
        return
      }

      try {
        // Use admin route when isAdmin is true for data parity
        const apiUrl = isAdmin
          ? `/api/admin/clients/${clientId}/content`
          : `/api/client/content?clientId=${clientId}`
        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          setContentStats(data.stats)
          setContentData(data.content)
          setAllContent(data.allContent || [])
        }
      } catch (err) {
        console.error('Error fetching content:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchContent()
  }, [clientId, isDemo, isAdmin])

  // Handle Quick Approve - directly approves content without going through review page
  const handleQuickApprove = useCallback(async (contentId: string) => {
    try {
      // Call the transition API to set status to approved directly
      const response = await fetch(`/api/content/${contentId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus: 'approved' }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to approve content')
      }

      // Refresh the page to get updated data
      router.refresh()

      // Re-fetch content data
      const apiUrl = isAdmin
        ? `/api/admin/clients/${clientId}/content`
        : `/api/client/content?clientId=${clientId}`
      const res = await fetch(apiUrl)
      if (res.ok) {
        const data = await res.json()
        setContentStats(data.stats)
        setContentData(data.content)
        setAllContent(data.allContent || [])
      }
    } catch (err) {
      console.error('Quick approve failed:', err)
      throw err
    }
  }, [clientId, isAdmin, router])

  // Handle Rush Publishing - opens modal to confirm
  const handleRushPublishing = useCallback(async (contentId: string) => {
    // Find the content item to show in modal
    const item = allContent.find(c => c.id === contentId)
    if (item) {
      setRushingItem(item)
      setRushReason('')
      setRushSuccess(false)
      setShowRushModal(true)
    }
  }, [allContent])

  // Submit rush publishing request
  const submitRushRequest = useCallback(async () => {
    if (!rushingItem) return

    setIsRequestingRush(true)
    try {
      const response = await fetch(`/api/content/${rushingItem.id}/rush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rushReason.trim() || undefined }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to request rush publishing')
      }

      setRushSuccess(true)

      // Auto-close after 2 seconds and refresh data
      setTimeout(async () => {
        setShowRushModal(false)
        setRushingItem(null)
        setRushReason('')
        setRushSuccess(false)

        // Refresh the page to get updated data
        router.refresh()

        // Re-fetch content data
        const apiUrl = isAdmin
          ? `/api/admin/clients/${clientId}/content`
          : `/api/client/content?clientId=${clientId}`
        const res = await fetch(apiUrl)
        if (res.ok) {
          const data = await res.json()
          setContentStats(data.stats)
          setContentData(data.content)
          setAllContent(data.allContent || [])
        }
      }, 2000)
    } catch (err) {
      console.error('Rush publishing request failed:', err)
    } finally {
      setIsRequestingRush(false)
    }
  }, [rushingItem, rushReason, clientId, isAdmin, router])

  // Apply content filter
  const getFilteredContent = (items: ContentItem[]): ContentItem[] => {
    const needsReviewStatuses = ['sent_for_review', 'client_reviewing', 'pending_review']
    const inProductionStatuses = ['approved', 'internal_review', 'final_optimization', 'image_selection']
    const completedStatuses = ['posted', 'published']

    switch (contentFilter) {
      case 'needs_review':
        return items.filter(item => needsReviewStatuses.includes(item.status))
      case 'in_production':
        return items.filter(item => inProductionStatuses.includes(item.status))
      case 'posted_this_month': {
        const now = new Date()
        return items.filter(item => {
          if (!completedStatuses.includes(item.status)) return false
          const changedAt = new Date(item.status_changed_at || '')
          return changedAt.getMonth() === now.getMonth() && changedAt.getFullYear() === now.getFullYear()
        })
      }
      default:
        return items
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    )
  }

  // Only use demo data for demo mode, otherwise show empty state
  const displayData = isDemo ? (contentData || demoContentData) : (contentData || {
    urgentReviews: [],
    pendingApproval: [],
    approved: [],
    published: []
  })
  const stats = contentStats || {
    urgentReviews: displayData.urgentReviews.length,
    pendingApproval: displayData.pendingApproval.length,
    approved: displayData.approved.length,
    published: displayData.published.length,
    total: 0,
    needsReview: 0,
    inProduction: 0,
    postedThisMonth: 0
  }

  // Filter content based on active filter
  const filteredUrgent = getFilteredContent(displayData.urgentReviews)
  const filteredPending = getFilteredContent(displayData.pendingApproval)
  const filteredApproved = getFilteredContent(displayData.approved)
  const filteredPublished = getFilteredContent(displayData.published)
  const hasFilteredContent = filteredUrgent.length > 0 || filteredPending.length > 0 || filteredApproved.length > 0 || filteredPublished.length > 0

  return (
    <div className="content-view-container">
      {/* Summary Filter Bar */}
      <SummaryFilterBar
        stats={stats}
        activeFilter={contentFilter}
        onFilterChange={setContentFilter}
      />

      {/* Content Stats */}
      <div className="content-stats">
        <div className={`content-stat-card ${stats.urgentReviews > 0 ? 'urgent' : ''}`}>
          <div className="stat-label">Urgent Reviews</div>
          <div className="stat-value">{stats.urgentReviews}</div>
          <div className="stat-desc">Less than 24 hours</div>
        </div>
        <div className="content-stat-card">
          <div className="stat-label">Pending Approval</div>
          <div className="stat-value">{stats.pendingApproval}</div>
          <div className="stat-desc">Awaiting your review</div>
        </div>
        <div className="content-stat-card">
          <div className="stat-label">In Production</div>
          <div className="stat-value">{stats.inProduction ?? stats.approved}</div>
          <div className="stat-desc">Being prepared</div>
        </div>
        <div className="content-stat-card">
          <div className="stat-label">Published</div>
          <div className="stat-value">{stats.published}</div>
          <div className="stat-desc">Live content</div>
        </div>
      </div>

      {/* Content Actions Bar */}
      <div className="content-actions-bar" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={onViewContentRequirements ? onViewContentRequirements : undefined}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            View Content Requirements
          </button>
          <div className="content-plan-inline">
            <span className="plan-inline-label">Your Plan:</span>
            {contentServices && contentServices.length > 0 ? (
              // Render aggregated services from product flags
              contentServices.map((service, index) => (
                <span key={service.name}>
                  {index > 0 && <span className="plan-inline-divider">+ </span>}
                  <span className="plan-inline-item">
                    ({service.quantity}) {service.name}
                    {service.details && ` (${service.details})`}
                  </span>
                </span>
              ))
            ) : subscriptionServices && subscriptionServices.length > 0 ? (
              // Fallback: Dynamic rendering from subscription data
              (() => {
                const contentProductKeywords = ['content writing', 'blog writing', 'social media', 'content marketing', 'ai creative', 'branding foundation', 'harvest seo', 'harvest']
                const contentItems = subscriptionServices.filter(item => {
                  const name = (item.name || '').toLowerCase()
                  return contentProductKeywords.some(cp => name.includes(cp))
                })
                // Combine items with same name and sum quantities
                const combinedItems: { name: string; totalQty: number }[] = []
                contentItems.forEach(item => {
                  const name = item.name || ''
                  const qty = item.quantity || 1
                  const existing = combinedItems.find(ci => ci.name === name)
                  if (existing) {
                    existing.totalQty += qty
                  } else {
                    combinedItems.push({ name, totalQty: qty })
                  }
                })
                return combinedItems.length > 0 ? (
                  combinedItems.map((item, index) => {
                    const displayName = item.name.toLowerCase().includes('content writing')
                      ? `(${item.totalQty}) ${item.name}`
                      : item.name
                    return (
                      <span key={item.name}>
                        {index > 0 && <span className="plan-inline-divider">+ </span>}
                        <span className="plan-inline-item">{displayName}</span>
                      </span>
                    )
                  })
                ) : (
                  <span className="plan-inline-item">No content services yet</span>
                )
              })()
            ) : (
              // No subscription data available
              <span className="plan-inline-item">No content services yet</span>
            )}
          </div>
        </div>

        {/* Upsell buttons — both roles, different callbacks */}
        {availableContentProducts && availableContentProducts.length > 0 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {availableContentProducts.map(product => {
              const isWriting = product.name.toLowerCase().includes('writing')
              const isCreative = product.name.toLowerCase().includes('creative')
              const isBranding = product.name.toLowerCase().includes('branding')

              const buttonStyle = isWriting
                ? { background: '#7C3AED', borderColor: '#7C3AED', color: 'white' }
                : isCreative
                  ? { background: '#F59E0B', borderColor: '#F59E0B', color: 'white' }
                  : isBranding
                    ? { background: '#0EA5E9', borderColor: '#0EA5E9', color: 'white' }
                    : {}

              return (
                <button
                  key={product.id}
                  className="btn"
                  style={buttonStyle}
                  onClick={() => {
                    if (isAdmin) {
                      onProductClick?.(product)
                    } else {
                      onAddToCart?.(product.id)
                    }
                  }}
                >
                  {isWriting && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                  )}
                  {isCreative && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  )}
                  {isBranding && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                      <path d="M2 17l10 5 10-5"></path>
                      <path d="M2 12l10 5 10-5"></path>
                    </svg>
                  )}
                  {isWriting ? 'Add More Content' : isCreative ? 'Add AI Creative' : isBranding ? 'Add Branding' : 'Add to Plan'}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <div className="results-subtabs">
        <button
          className={`results-subtab ${activeTab === 'review' ? 'active' : ''}`}
          onClick={() => setActiveTab('review')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
          Content Review
          {stats.pendingApproval > 0 && <span className="subtab-badge">{stats.pendingApproval}</span>}
        </button>
        <button
          className={`results-subtab ${activeTab === 'files' ? 'active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          Files
        </button>
      </div>

      {/* Content Review Tab */}
      {activeTab === 'review' && (
        <>
          {/* Show filter active message */}
          {contentFilter !== 'all' && (
            <div style={{
              background: '#F3F4F6',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                Showing: <strong style={{ color: '#1F2937' }}>
                  {contentFilter === 'needs_review' ? 'Content Needing Review' :
                   contentFilter === 'in_production' ? 'Content In Production' :
                   'Published This Month'}
                </strong>
              </span>
              <button
                onClick={() => setContentFilter('all')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6B7280',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  textDecoration: 'underline'
                }}
              >
                Show all content
              </button>
            </div>
          )}

          {/* Urgent Reviews Section */}
          {filteredUrgent.length > 0 && (
            <div className="content-section">
              <div className="content-section-header">
                <h3 className="urgent-title">Urgent Reviews</h3>
              </div>
              <div className="content-list">
                {filteredUrgent.map((item) => (
                  <ContentItemCard key={item.id} item={item} variant="urgent" isAdmin={isAdmin} onQuickApprove={isDemo ? undefined : handleQuickApprove} />
                ))}
              </div>
            </div>
          )}

          {/* Pending Approval Section */}
          {filteredPending.length > 0 && (
            <div className="content-section">
              <div className="content-section-header">
                <h3>Pending Approval</h3>
              </div>
              <div className="content-list">
                {filteredPending.map((item) => (
                  <ContentItemCard key={item.id} item={item} variant="pending" isAdmin={isAdmin} onQuickApprove={isDemo ? undefined : handleQuickApprove} />
                ))}
              </div>
            </div>
          )}

          {/* Approved Section */}
          {filteredApproved.length > 0 && (
            <div className="content-section">
              <div className="content-section-header">
                <h3>In Production</h3>
              </div>
              <div className="content-list">
                {filteredApproved.map((item) => (
                  <ContentItemCard key={item.id} item={item} variant="approved" isAdmin={isAdmin} onRushPublishing={isDemo ? undefined : handleRushPublishing} />
                ))}
              </div>
            </div>
          )}

          {/* Published Section */}
          {filteredPublished.length > 0 && (
            <div className="content-section">
              <div className="content-section-header">
                <h3>Published Content</h3>
              </div>
              <div className="content-list">
                {filteredPublished.map((item) => (
                  <ContentItemCard key={item.id} item={item} variant="published" isAdmin={isAdmin} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasFilteredContent && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
              <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="32" height="32">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>
                {contentFilter !== 'all' ? 'No Content Matches Filter' : isAdmin ? 'Content Coming Soon' : 'No Content Yet'}
              </h3>
              <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto', marginBottom: contentFilter !== 'all' || isAdmin ? '1.5rem' : 0 }}>
                {contentFilter !== 'all'
                  ? 'Try a different filter or view all content.'
                  : isAdmin
                    ? "Your content team is getting started on your first pieces. You'll be notified when content is ready for review."
                    : 'Content will appear here once created. Check back soon!'}
              </p>
              {contentFilter !== 'all' && (
                <button
                  className="btn btn-secondary"
                  onClick={() => setContentFilter('all')}
                >
                  View All Content
                </button>
              )}
              {contentFilter === 'all' && isAdmin && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#DEF7EC', color: '#03543F', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Content service active
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="content-tab-content">
          <div className="files-header">
            <select
              className="file-filter-select"
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value as 'all' | 'docs' | 'images' | 'video')}
            >
              <option value="all">All Files ({files.length})</option>
              <option value="docs">Documents ({files.filter(f => f.type === 'docs').length})</option>
              <option value="images">Images ({files.filter(f => f.type === 'images').length})</option>
              <option value="video">Video ({files.filter(f => f.type === 'video').length})</option>
            </select>
          </div>

          <div className="files-grid">
            {files.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #D1D5DB' }}>
                <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="32" height="32">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '0.5rem' }}>No Files Yet</h3>
                <p style={{ color: '#6B7280', maxWidth: '400px', margin: '0 auto' }}>
                  Brand documents, graphics, and video files will appear here once created.
                </p>
              </div>
            )}
            {filteredFiles.map((file) => (
              <div key={file.id} className="file-card">
                <div className={`file-icon ${file.type === 'docs' ? 'pdf' : file.type === 'images' ? 'image' : 'video'}`}>
                  {file.type === 'docs' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                  {file.type === 'images' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  )}
                  {file.type === 'video' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                    </svg>
                  )}
                </div>
                <div className="file-info">
                  <h4 className="file-name">{file.name}</h4>
                  <div className="file-meta">
                    <span className="file-category">{file.category}</span>
                    <span className="file-date">{file.date}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button className="btn btn-sm btn-outline" title="Download">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                  </button>
                  <button className="btn btn-sm btn-outline" title="View">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rush Publishing Modal */}
      {showRushModal && rushingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={() => {
            if (!isRequestingRush && !rushSuccess) {
              setShowRushModal(false)
              setRushingItem(null)
              setRushReason('')
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: '#FEF3C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="20" height="20">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                  </svg>
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1F2937' }}>Rush Publishing</h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>Request expedited publishing for this content</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isRequestingRush && !rushSuccess) {
                    setShowRushModal(false)
                    setRushingItem(null)
                    setRushReason('')
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: isRequestingRush || rushSuccess ? 'not-allowed' : 'pointer',
                  padding: '0.25rem',
                  color: '#6B7280',
                  opacity: isRequestingRush || rushSuccess ? 0.5 : 1
                }}
                disabled={isRequestingRush || rushSuccess}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem' }}>
              {rushSuccess ? (
                <div style={{
                  textAlign: 'center',
                  padding: '1.5rem 0'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#DEF7EC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="32" height="32">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#059669' }}>Rush Publishing Requested!</h3>
                  <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>
                    Our team has been notified and will prioritize this content.
                  </p>
                </div>
              ) : (
                <>
                  {/* Content Info */}
                  <div style={{
                    background: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', fontWeight: 600, color: '#1F2937' }}>{rushingItem.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                      {rushingItem.scheduledDate ? (
                        <>Currently scheduled: <strong>{rushingItem.scheduledDate}</strong></>
                      ) : (
                        <>Status: <strong>{getStatusLabel(rushingItem.status, 'client')}</strong></>
                      )}
                    </p>
                  </div>

                  {/* Rush Notice */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    background: '#FEF3C7',
                    borderRadius: '8px',
                    padding: '0.875rem 1rem',
                    marginBottom: '1rem'
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="18" height="18" style={{ flexShrink: 0, marginTop: '2px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400E' }}>
                      Rush publishing will move this content to the front of the queue and publish within <strong>24 hours</strong>.
                    </p>
                  </div>

                  {/* Reason Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
                      Reason for rush (optional)
                    </label>
                    <textarea
                      value={rushReason}
                      onChange={(e) => setRushReason(e.target.value)}
                      placeholder="e.g., Time-sensitive promotion, event deadline..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        resize: 'vertical',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!rushSuccess && (
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E5E7EB',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRushModal(false)
                    setRushingItem(null)
                    setRushReason('')
                  }}
                  disabled={isRequestingRush}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={submitRushRequest}
                  disabled={isRequestingRush}
                  style={{
                    background: '#F59E0B',
                    borderColor: '#F59E0B',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {isRequestingRush ? (
                    <>
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Requesting...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      Request Rush
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ContentView
