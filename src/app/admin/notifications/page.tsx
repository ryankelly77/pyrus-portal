'use client'

import { useState, useMemo } from 'react'
import { AdminHeader } from '@/components/layout'

type ActivityType = 'logins' | 'views' | 'actions'

interface Activity {
  id: string
  type: ActivityType
  user: string
  company: string
  description: string
  highlight?: string
  time: string
  date: 'today' | 'yesterday' | 'jan1'
}

const activities: Activity[] = [
  // Today
  {
    id: '1',
    type: 'logins',
    user: 'Jon De La Garza',
    company: 'TC Clinical Services',
    description: 'Logged into the portal',
    time: '2 minutes ago',
    date: 'today',
  },
  {
    id: '2',
    type: 'views',
    user: 'Jon De La Garza',
    company: 'TC Clinical Services',
    description: 'Viewed',
    highlight: 'Results',
    time: '2 minutes ago',
    date: 'today',
  },
  {
    id: '3',
    type: 'actions',
    user: 'Jon De La Garza',
    company: 'TC Clinical Services',
    description: 'Downloaded',
    highlight: 'Monthly Report - December 2025',
    time: '5 minutes ago',
    date: 'today',
  },
  {
    id: '4',
    type: 'views',
    user: 'Mike Johnson',
    company: 'Raptor Vending',
    description: 'Viewed',
    highlight: 'Recommendations',
    time: '23 minutes ago',
    date: 'today',
  },
  {
    id: '5',
    type: 'actions',
    user: 'Mike Johnson',
    company: 'Raptor Vending',
    description: 'Approved',
    highlight: 'SEO Content Package',
    time: '25 minutes ago',
    date: 'today',
  },
  {
    id: '6',
    type: 'logins',
    user: 'Mike Johnson',
    company: 'Raptor Vending',
    description: 'Logged into the portal',
    time: '28 minutes ago',
    date: 'today',
  },
  {
    id: '7',
    type: 'views',
    user: 'Maria Espronceda',
    company: 'Espronceda Law',
    description: 'Viewed',
    highlight: 'Getting Started',
    time: '1 hour ago',
    date: 'today',
  },
  {
    id: '8',
    type: 'logins',
    user: 'Maria Espronceda',
    company: 'Espronceda Law',
    description: 'Logged into the portal',
    time: '1 hour ago',
    date: 'today',
  },
  // Yesterday
  {
    id: '9',
    type: 'views',
    user: 'Sarah Martinez',
    company: 'Raptor Services',
    description: 'Viewed',
    highlight: 'Results',
    time: 'Yesterday at 4:32 PM',
    date: 'yesterday',
  },
  {
    id: '10',
    type: 'actions',
    user: 'Sarah Martinez',
    company: 'Raptor Services',
    description: 'Clicked',
    highlight: 'Pro Dashboard',
    time: 'Yesterday at 4:35 PM',
    date: 'yesterday',
  },
  {
    id: '11',
    type: 'logins',
    user: 'Sarah Martinez',
    company: 'Raptor Services',
    description: 'Logged into the portal',
    time: 'Yesterday at 4:30 PM',
    date: 'yesterday',
  },
  {
    id: '12',
    type: 'views',
    user: 'Jon De La Garza',
    company: 'TC Clinical Services',
    description: 'Viewed',
    highlight: 'Recommendations',
    time: 'Yesterday at 11:15 AM',
    date: 'yesterday',
  },
  {
    id: '13',
    type: 'logins',
    user: 'Jon De La Garza',
    company: 'TC Clinical Services',
    description: 'Logged into the portal',
    time: 'Yesterday at 11:14 AM',
    date: 'yesterday',
  },
  // January 1, 2026
  {
    id: '14',
    type: 'actions',
    user: 'System',
    company: 'Automated',
    description: 'Monthly reports generated for all active clients',
    time: 'Jan 1 at 12:00 AM',
    date: 'jan1',
  },
]

const clients = [
  'TC Clinical Services',
  'Raptor Vending',
  'Raptor Services',
  'Gohfr',
  'Espronceda Law',
  'American Fence & Deck',
]

export default function AdminNotificationsPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | ActivityType>('all')
  const [clientFilter, setClientFilter] = useState('All Clients')

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (typeFilter !== 'all' && activity.type !== typeFilter) return false
      if (clientFilter !== 'All Clients' && activity.company !== clientFilter) return false
      return true
    })
  }, [typeFilter, clientFilter])

  const todayActivities = filteredActivities.filter((a) => a.date === 'today')
  const yesterdayActivities = filteredActivities.filter((a) => a.date === 'yesterday')
  const jan1Activities = filteredActivities.filter((a) => a.date === 'jan1')

  const getActivityIcon = (type: ActivityType, description: string) => {
    if (type === 'logins') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
          <polyline points="10 17 15 12 10 7"></polyline>
          <line x1="15" y1="12" x2="3" y2="12"></line>
        </svg>
      )
    }
    if (type === 'views') {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      )
    }
    // Actions - different icons based on description
    if (description.includes('Downloaded')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      )
    }
    if (description.includes('Approved')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      )
    }
    if (description.includes('Clicked')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="7 17 17 7"></polyline>
          <polyline points="7 7 17 7 17 17"></polyline>
        </svg>
      )
    }
    if (description.includes('Monthly reports')) {
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    }
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    )
  }

  const getIconClass = (type: ActivityType, description: string) => {
    if (type === 'logins') return 'login'
    if (type === 'views') return 'view'
    if (description.includes('Approved') || description.includes('Clicked')) return 'click'
    return 'action'
  }

  const renderActivityItem = (activity: Activity) => (
    <div key={activity.id} className="activity-item">
      <div className={`activity-icon ${getIconClass(activity.type, activity.description)}`}>
        {getActivityIcon(activity.type, activity.description)}
      </div>
      <div className="activity-content">
        <div className="activity-header">
          <span className="activity-user">{activity.user}</span>
          <span className="activity-company">{activity.company}</span>
        </div>
        <p className="activity-description">
          {activity.highlight ? (
            <>
              {activity.description} <strong>{activity.highlight}</strong>
              {activity.description === 'Viewed' ? ' page' : activity.description === 'Approved' ? ' recommendation' : activity.description === 'Clicked' ? ' link' : ''}
            </>
          ) : (
            activity.description
          )}
        </p>
      </div>
      <div className="activity-time">{activity.time}</div>
    </div>
  )

  return (
    <>
      <AdminHeader
        title="Notifications"
        user={{ name: 'Ryan Kelly', initials: 'RK' }}
        hasNotifications={true}
      />

      <div className="admin-content">
        {/* Page Header */}
        <div className="page-header">
          <div className="page-header-content">
            <p>Activity feed showing client portal interactions</p>
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              Export Activity
            </button>
            <button className="btn btn-secondary">Mark All Read</button>
          </div>
        </div>

        {/* Filters */}
        <div className="notifications-filters">
          <div className="filter-tabs">
            <button
              className={`filter-tab ${typeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTypeFilter('all')}
            >
              All Activity
            </button>
            <button
              className={`filter-tab ${typeFilter === 'logins' ? 'active' : ''}`}
              onClick={() => setTypeFilter('logins')}
            >
              Logins
            </button>
            <button
              className={`filter-tab ${typeFilter === 'views' ? 'active' : ''}`}
              onClick={() => setTypeFilter('views')}
            >
              Page Views
            </button>
            <button
              className={`filter-tab ${typeFilter === 'actions' ? 'active' : ''}`}
              onClick={() => setTypeFilter('actions')}
            >
              Actions
            </button>
          </div>
          <div className="filter-group">
            <select
              className="filter-select"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
            >
              <option>All Clients</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="activity-feed">
          {/* Today */}
          {todayActivities.length > 0 && (
            <div className="activity-date-group">
              <div className="activity-date-header">Today</div>
              {todayActivities.map(renderActivityItem)}
            </div>
          )}

          {/* Yesterday */}
          {yesterdayActivities.length > 0 && (
            <div className="activity-date-group">
              <div className="activity-date-header">Yesterday</div>
              {yesterdayActivities.map(renderActivityItem)}
            </div>
          )}

          {/* January 1, 2026 */}
          {jan1Activities.length > 0 && (
            <div className="activity-date-group">
              <div className="activity-date-header">January 1, 2026</div>
              {jan1Activities.map(renderActivityItem)}
            </div>
          )}

          {/* Empty State */}
          {filteredActivities.length === 0 && (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <h3>No activity found</h3>
              <p>No matching activity for your filters</p>
            </div>
          )}

          {/* Load More */}
          {filteredActivities.length > 0 && (
            <div className="activity-load-more">
              <button className="btn btn-secondary">Load More Activity</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
