'use client'

import { useState, useRef, useEffect } from 'react'

export interface EnrollmentContact {
  email: string
  name: string | null
  type: string | null
  enrolledAt?: string
}

interface EnrollmentBadgeProps {
  count: number
  contacts: EnrollmentContact[]
}

export function EnrollmentBadge({ count, contacts }: EnrollmentBadgeProps) {
  const [showPopover, setShowPopover] = useState(false)
  const badgeRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false)
      }
    }

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPopover])

  if (count === 0) return null

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={badgeRef}
        onClick={(e) => {
          e.stopPropagation()
          setShowPopover(!showPopover)
        }}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => {
          // Small delay to allow moving to popover
          setTimeout(() => {
            if (!popoverRef.current?.matches(':hover')) {
              setShowPopover(false)
            }
          }, 100)
        }}
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          minWidth: '20px',
          height: '20px',
          borderRadius: '10px',
          backgroundColor: '#22c55e',
          color: 'white',
          fontSize: '11px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 5px',
          cursor: 'pointer',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          border: '2px solid white',
          zIndex: 10,
        }}
      >
        {count}
      </div>

      {showPopover && (
        <div
          ref={popoverRef}
          onMouseEnter={() => setShowPopover(true)}
          onMouseLeave={() => setShowPopover(false)}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            border: '1px solid #e5e7eb',
            padding: '12px',
            minWidth: '220px',
            maxWidth: '300px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 100,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '8px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '8px',
          }}>
            {count} Contact{count !== 1 ? 's' : ''} at this step
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {contacts.slice(0, 10).map((contact, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: '12px',
                  color: '#4b5563',
                }}
              >
                <div style={{ fontWeight: 500, color: '#111827' }}>
                  {contact.name || contact.email}
                </div>
                {contact.name && (
                  <div style={{ color: '#6b7280', fontSize: '11px' }}>
                    {contact.email}
                  </div>
                )}
                {contact.type && (
                  <div style={{
                    display: 'inline-block',
                    marginTop: '2px',
                    padding: '1px 6px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: '#6b7280',
                  }}>
                    {contact.type.replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            ))}
            {contacts.length > 10 && (
              <div style={{
                fontSize: '11px',
                color: '#9ca3af',
                fontStyle: 'italic',
              }}>
                +{contacts.length - 10} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
