'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

type ActivityType = 'all' | 'task' | 'update' | 'alert' | 'content'

interface ActivityItem {
  id: number
  type: 'task' | 'update' | 'alert' | 'content'
  title: string
  description: string
  time: string
  iconStyle?: { background: string; color: string }
}

const tcClinicalActivities: ActivityItem[] = [
  {
    id: 1,
    type: 'content',
    title: 'Content approved and published',
    description: '"January Services Update" blog post is now live on your website',
    time: 'Today, 3:30 PM',
    iconStyle: { background: 'var(--success-bg)', color: 'var(--success)' }
  },
  {
    id: 2,
    type: 'alert',
    title: 'Keyword reached Page 1!',
    description: '"precision wound care San Antonio" moved to position #7',
    time: 'Today, 2:45 PM'
  },
  {
    id: 3,
    type: 'content',
    title: 'New content ready for review',
    description: '"Q1 2026 Marketing Goals" blog post submitted for your approval',
    time: 'Today, 11:00 AM',
    iconStyle: { background: 'var(--info-bg)', color: 'var(--info)' }
  },
  {
    id: 4,
    type: 'task',
    title: 'Monthly blog post published',
    description: '"5 Signs Your Wound Care Needs a Specialist" is now live',
    time: 'Today, 10:30 AM'
  },
  {
    id: 5,
    type: 'alert',
    title: 'Traffic milestone: 2,500 visitors!',
    description: 'Monthly website traffic exceeded 2,500 unique visitors',
    time: 'Yesterday, 4:30 PM'
  },
  {
    id: 6,
    type: 'update',
    title: 'Google Ads campaign optimized',
    description: 'Adjusted bid strategy based on conversion data',
    time: 'Yesterday, 3:00 PM'
  },
  {
    id: 7,
    type: 'task',
    title: 'Google Business Profile updated',
    description: 'Added new photos and updated business hours',
    time: 'Yesterday, 11:15 AM'
  },
  {
    id: 8,
    type: 'content',
    title: 'Content revision requested',
    description: '"Holiday Promotion Post" needs updates - feedback provided',
    time: 'Dec 31, 2:30 PM',
    iconStyle: { background: 'var(--warning-bg)', color: 'var(--warning)' }
  },
  {
    id: 9,
    type: 'task',
    title: 'Website launched!',
    description: 'tc-clinicalservices.com is now live and indexed by Google',
    time: 'Dec 30, 4:00 PM'
  },
  {
    id: 10,
    type: 'update',
    title: 'Landing page A/B test started',
    description: 'Testing new headline and CTA button variations',
    time: 'Dec 29, 9:30 AM'
  },
  {
    id: 11,
    type: 'alert',
    title: 'New keyword ranking: Top 10!',
    description: '"wound care specialist near me" now ranking #9',
    time: 'Dec 28, 4:00 PM'
  },
  {
    id: 12,
    type: 'task',
    title: 'On-page SEO completed',
    description: '12 pages optimized with meta tags, headers, and schema markup',
    time: 'Dec 28, 2:15 PM'
  },
  {
    id: 13,
    type: 'alert',
    title: 'Lead generation: 10 leads this week!',
    description: 'Google Ads campaign reached first major milestone',
    time: 'Dec 27, 5:00 PM'
  },
  {
    id: 14,
    type: 'task',
    title: 'Conversion tracking installed',
    description: 'Google Analytics 4 and Tag Manager configured',
    time: 'Dec 26, 3:45 PM'
  },
  {
    id: 15,
    type: 'alert',
    title: 'First conversion recorded!',
    description: 'Contact form submission from Google Ads click',
    time: 'Dec 22, 10:15 AM'
  },
  {
    id: 16,
    type: 'update',
    title: 'Keyword research completed',
    description: '47 target keywords identified for wound care niche',
    time: 'Dec 20, 11:00 AM'
  },
  {
    id: 17,
    type: 'task',
    title: 'Google Ads campaign launched',
    description: 'Initial campaign with 15 ad groups now running',
    time: 'Dec 15, 10:00 AM'
  },
  {
    id: 18,
    type: 'update',
    title: 'Website design approved',
    description: 'Final mockups approved, moving to development',
    time: 'Dec 12, 4:30 PM'
  },
  {
    id: 19,
    type: 'task',
    title: 'Onboarding completed!',
    description: 'All setup tasks finished, project officially kicked off',
    time: 'Dec 10, 9:00 AM'
  },
  {
    id: 20,
    type: 'task',
    title: 'Branding assets received',
    description: 'Logo, colors, and brand guidelines added to project',
    time: 'Dec 5, 2:00 PM'
  }
]

const raptorVendingActivities: ActivityItem[] = [
  {
    id: 1,
    type: 'task',
    title: 'Portal account created',
    description: 'Welcome to Pyrus Digital! Your client portal is now active',
    time: 'Today, 10:00 AM',
    iconStyle: { background: 'var(--success-bg)', color: 'var(--success)' }
  },
  {
    id: 2,
    type: 'update',
    title: 'Google Ads campaign launched',
    description: 'Initial campaign targeting "vending machine services" keywords',
    time: 'Yesterday, 2:00 PM'
  },
  {
    id: 3,
    type: 'task',
    title: 'Google Business Profile claimed',
    description: 'Your business is now verified on Google Maps',
    time: 'Dec 28, 11:00 AM'
  },
  {
    id: 4,
    type: 'update',
    title: 'Keyword research completed',
    description: '12 target keywords identified for vending services niche',
    time: 'Dec 20, 3:30 PM'
  },
  {
    id: 5,
    type: 'alert',
    title: 'First lead received!',
    description: 'Contact form submission from Google Ads',
    time: 'Dec 18, 9:15 AM'
  },
  {
    id: 6,
    type: 'task',
    title: 'Conversion tracking installed',
    description: 'Google Analytics 4 configured for lead tracking',
    time: 'Dec 15, 4:00 PM'
  },
  {
    id: 7,
    type: 'task',
    title: 'Onboarding completed!',
    description: 'All initial setup tasks finished',
    time: 'Nov 25, 10:00 AM'
  },
  {
    id: 8,
    type: 'task',
    title: 'Branding assets received',
    description: 'Logo and brand colors added to your project',
    time: 'Nov 20, 2:00 PM'
  }
]

function getActivityIcon(type: string, iconStyle?: { background: string; color: string }) {
  switch (type) {
    case 'content':
      if (iconStyle?.color === 'var(--success)') {
        return (
          <div className="activity-icon content" style={iconStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <polyline points="9 15 11 17 15 13"></polyline>
            </svg>
          </div>
        )
      } else if (iconStyle?.color === 'var(--warning)') {
        return (
          <div className="activity-icon content" style={iconStyle}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="12" y1="9" x2="12.01" y2="9"></line>
            </svg>
          </div>
        )
      } else {
        return (
          <div className="activity-icon content" style={iconStyle || { background: 'var(--info-bg)', color: 'var(--info)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
        )
      }
    case 'alert':
      return (
        <div className="activity-icon alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </div>
      )
    case 'task':
      return (
        <div className="activity-icon task">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4"></polyline>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        </div>
      )
    case 'update':
      return (
        <div className="activity-icon update">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </div>
      )
    default:
      return null
  }
}

export default function ActivityPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading } = useClientData(viewingAs)
  usePageView({ page: '/activity', pageName: 'Activity' })

  const [activeFilter, setActiveFilter] = useState<ActivityType>('all')

  // Check if client is pending (prospect only) or doesn't have activity data yet
  const isPending = client.status === 'pending'
  const showComingSoon = !isPending && !client.access.hasActivity

  // Activity data - will be replaced with real data from API in the future
  const activities = tcClinicalActivities

  const filteredActivities = activities.filter(
    activity => activeFilter === 'all' || activity.type === activeFilter
  )

  // Show loading state while fetching client data
  if (loading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Activity</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="client-top-header">
        <div className="client-top-header-left">
          <h1>Activity</h1>
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
        {/* Pending client placeholder */}
        {isPending ? (
          <div className="locked-page-placeholder">
            <div className="locked-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <h2>Activity Available After Purchase</h2>
            <p>Once you select a plan and become an active client, you&apos;ll see a timeline of all marketing activities, completed tasks, content updates, and milestone alerts here.</p>
            <Link href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'} className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              View Your Proposal
            </Link>
          </div>
        ) : showComingSoon ? (
          <div className="coming-soon-placeholder">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <h2>Activity Coming Soon</h2>
            <p>We&apos;re setting up your activity feed. You&apos;ll see a timeline of all marketing activities, completed tasks, content updates, and milestone alerts here once your campaigns are active.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Account setup complete</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Campaign launch in progress</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Activity tracking activation</span>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* Activity Content */}
        <div className="activity-content">
          <div className="activity-filters">
            <button
              className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Activity
            </button>
            <button
              className={`filter-chip ${activeFilter === 'task' ? 'active' : ''}`}
              onClick={() => setActiveFilter('task')}
            >
              Tasks
            </button>
            <button
              className={`filter-chip ${activeFilter === 'update' ? 'active' : ''}`}
              onClick={() => setActiveFilter('update')}
            >
              Updates
            </button>
            <button
              className={`filter-chip ${activeFilter === 'alert' ? 'active' : ''}`}
              onClick={() => setActiveFilter('alert')}
            >
              Result Alerts
            </button>
            <button
              className={`filter-chip ${activeFilter === 'content' ? 'active' : ''}`}
              onClick={() => setActiveFilter('content')}
            >
              Content
            </button>
          </div>

          <div className="activity-card">
            <ul className="activity-list">
              {filteredActivities.map(activity => (
                <li key={activity.id} className="activity-item" data-type={activity.type}>
                  {getActivityIcon(activity.type, activity.iconStyle)}
                  <div className="activity-details">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-desc">{activity.description}</div>
                  </div>
                  <div className="activity-time">{activity.time}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  )
}
