'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'
import { RecommendationsView } from '@/components/client-views'

const DEMO_CLIENT_ID = '00000000-0000-0000-0000-000000000001'

export default function RecommendationsPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading: clientLoading } = useClientData(viewingAs)
  usePageView({ page: '/recommendations', pageName: 'Recommendations' })

  const isDemo = viewingAs === DEMO_CLIENT_ID
  const demoState = searchParams.get('demoState')

  // For recommendations, "locked" means pending (prospect), "coming-soon" means recommendation being prepared
  const isPending = isDemo
    ? demoState === 'locked'
    : client.status === 'pending'
  const showComingSoon = isDemo
    ? demoState === 'coming-soon'
    : false // Real clients would see Original Plan if they have a recommendation

  const [mounted, setMounted] = useState(false)

  // Track mount state to prevent SSR/hydration flash
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading state while mounting or fetching data
  if (!mounted || clientLoading) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Recommendations</h1>
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
          <h1>Recommendations</h1>
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
        {/* Coming Soon State for Demo */}
        {showComingSoon ? (
          <div className="coming-soon-placeholder">
            <div className="coming-soon-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </div>
            <h2>Recommendations Coming Soon</h2>
            <p>We&apos;re preparing your personalized marketing proposal. Our team is analyzing your business goals to create tailored service recommendations.</p>
            <div className="coming-soon-timeline">
              <div className="timeline-item">
                <div className="timeline-dot active"></div>
                <span>Account created</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Analyzing your business needs</span>
              </div>
              <div className="timeline-item">
                <div className="timeline-dot pending"></div>
                <span>Proposal ready for review</span>
              </div>
            </div>
          </div>
        ) : (
          /* Active Recommendations - use shared RecommendationsView component */
          <RecommendationsView
            clientId={client.id}
            isDemo={isDemo}
            isPending={isPending}
            demoState={demoState}
            viewingAs={viewingAs}
            onRecommendationChange={() => {
              // Dispatch event to notify sidebar to refresh count
              window.dispatchEvent(new Event('recommendation-changed'))
            }}
          />
        )}
      </div>
    </>
  )
}
