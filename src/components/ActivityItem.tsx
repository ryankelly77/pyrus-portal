'use client'

export type ActivityType = 'task' | 'update' | 'alert' | 'content'

export interface ActivityData {
  id: number | string
  type: ActivityType
  title: string
  description: string
  time: string
  iconStyle?: { background: string; color: string }
}

interface ActivityItemProps {
  activity: ActivityData
}

function getActivityIcon(type: ActivityType, iconStyle?: { background: string; color: string }) {
  switch (type) {
    case 'content':
      // Check for revision icon style (warning colors)
      if (iconStyle?.color === 'var(--warning)') {
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
        <div className="activity-icon task" style={iconStyle}>
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

export function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <li className="activity-item" data-type={activity.type}>
      {getActivityIcon(activity.type, activity.iconStyle)}
      <div className="activity-details">
        <div className="activity-title">{activity.title}</div>
        <div className="activity-desc">{activity.description}</div>
      </div>
      <div className="activity-time">{activity.time}</div>
    </li>
  )
}

// Empty state component
export function ActivityEmptyState({ message }: { message: string }) {
  return (
    <li className="activity-item" style={{ justifyContent: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
      {message}
    </li>
  )
}

// Loading state component
export function ActivityLoadingState() {
  return (
    <li className="activity-item" style={{ justifyContent: 'center', padding: '40px' }}>
      <div className="spinner" style={{ width: 24, height: 24 }}></div>
      <span style={{ marginLeft: '12px', color: 'var(--text-secondary)' }}>Loading activities...</span>
    </li>
  )
}
