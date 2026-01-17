'use client'

import { useState, useEffect } from 'react'
import { ActivityItem, ActivityEmptyState, ActivityLoadingState } from '@/components'
import type { ActivityType as SharedActivityType } from '@/components'

type FilterType = 'all' | 'task' | 'update' | 'alert' | 'content'

interface LocalActivityItem {
  id: number | string
  type: SharedActivityType
  title: string
  description: string
  time: string
  iconStyle?: { background: string; color: string }
}

interface BasecampActivity {
  id: string
  title: string
  todolist?: string
  status: 'active' | 'completed'
  createdAt: string
}

interface ActivityViewProps {
  clientId: string
  isAdmin?: boolean
  isDemo?: boolean
  clientName?: string
}

// Demo activities data
const demoActivities: LocalActivityItem[] = [
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
  }
]

export function ActivityView({ clientId, isAdmin = false, isDemo = false, clientName }: ActivityViewProps) {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<LocalActivityItem[]>([])
  const [basecampActivities, setBasecampActivities] = useState<BasecampActivity[]>([])
  const [hasActivityAccess, setHasActivityAccess] = useState(false)
  const [hasActiveProjects, setHasActiveProjects] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    async function fetchActivityData() {
      if (isDemo) {
        // Use demo data
        setHasActivityAccess(true)
        setHasActiveProjects(true)
        setActivities(demoActivities)
        setLoading(false)
        return
      }

      try {
        if (isAdmin) {
          // Admin view: fetch Basecamp activities
          const res = await fetch(`/api/admin/clients/${clientId}/activities`)
          if (res.ok) {
            const data = await res.json()
            setBasecampActivities(data)
            setHasActivityAccess(data.length > 0)
            setHasActiveProjects(true) // Assume true if we have a client ID
          }
        } else {
          // Client view: fetch from client activity API
          const res = await fetch(`/api/client/activity?clientId=${clientId}`)
          if (res.ok) {
            const data = await res.json()
            setActivities(data)
            setHasActivityAccess(data.length > 0)
            setHasActiveProjects(true)
          }
        }
      } catch (err) {
        console.error('Error fetching activity data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchActivityData()
  }, [clientId, isAdmin, isDemo])

  const filteredActivities = activities.filter(
    activity => activeFilter === 'all' || activity.type === activeFilter
  )

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div className="spinner" style={{ width: 40, height: 40 }}></div>
      </div>
    )
  }

  // Admin view with Basecamp activities
  if (isAdmin && hasActivityAccess && basecampActivities.length > 0) {
    return (
      <>
        <div className="activity-filters">
          <button className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All Tasks</button>
          <button className={`filter-chip ${activeFilter === 'task' ? 'active' : ''}`} onClick={() => setActiveFilter('task')}>Active</button>
          <button className={`filter-chip ${activeFilter === 'update' ? 'active' : ''}`} onClick={() => setActiveFilter('update')}>Completed</button>
        </div>

        <div className="activity-card">
          <ul className="activity-list">
            {basecampActivities
              .filter(activity => {
                if (activeFilter === 'all') return true
                if (activeFilter === 'task') return activity.status === 'active'
                if (activeFilter === 'update') return activity.status === 'completed'
                return true
              })
              .map(activity => (
                <li key={activity.id} className="activity-item" data-type="task">
                  <div className={`activity-icon ${activity.status === 'completed' ? 'task' : 'update'}`}>
                    {activity.status === 'completed' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                      </svg>
                    )}
                  </div>
                  <div className="activity-details">
                    <div className="activity-title">{activity.title || 'Untitled task'}</div>
                    <div className="activity-desc">
                      {activity.todolist && <span style={{ color: 'var(--text-secondary)' }}>{activity.todolist}</span>}
                    </div>
                  </div>
                  <div className="activity-time">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </>
    )
  }

  // Client view with activity list
  if (!isAdmin && (hasActivityAccess || isDemo)) {
    return (
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
            {filteredActivities.length === 0 ? (
              <ActivityEmptyState message={activeFilter === 'all' ? 'No activities yet' : `No ${activeFilter} activities`} />
            ) : (
              filteredActivities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))
            )}
          </ul>
        </div>
      </div>
    )
  }

  // Coming Soon State - has service but no activities yet
  if (hasActiveProjects && !hasActivityAccess) {
    return (
      <div className="coming-soon-placeholder">
        <div className="coming-soon-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <h2>Activity Coming Soon</h2>
        <p>
          {isAdmin
            ? `We're setting up ${clientName || 'this client'}'s activity feed. You'll see a timeline of all marketing activities, completed tasks, content updates, and milestone alerts here once campaigns are active.`
            : "We're setting up your activity feed. You'll see a timeline of all marketing activities, completed tasks, content updates, and milestone alerts here once your campaigns are active."
          }
        </p>
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
    )
  }

  // Admin empty state - no Basecamp activities but has access
  if (isAdmin && hasActivityAccess && basecampActivities.length === 0) {
    return (
      <div className="activity-card">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
          </svg>
          <p style={{ margin: 0 }}>No Basecamp activities yet. Tasks will appear here when webhooks are received.</p>
        </div>
      </div>
    )
  }

  // Upsell/Inactive State - admin only, no service purchased
  if (isAdmin) {
    return (
      <div className="inactive-service-container">
        <div className="inactive-service-card">
          <div className="inactive-service-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <h3>Activity Feed Not Active</h3>
          <p>This client does not currently have any active projects. Start a marketing service to track project activity, tasks, and team updates.</p>

          <div className="inactive-service-actions">
            <button className="btn btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Create Recommendation
            </button>
            <button className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
              View Service Plans
            </button>
          </div>
        </div>

        <div className="inactive-service-info">
          <h4>Active Projects Include:</h4>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Real-time project activity tracking
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Task and milestone updates
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Team communication visibility
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Content approval workflows
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Project timeline overview
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // Client empty state
  return (
    <div className="activity-content">
      <div className="activity-card">
        <ul className="activity-list">
          <ActivityEmptyState message="No activities yet" />
        </ul>
      </div>
    </div>
  )
}
