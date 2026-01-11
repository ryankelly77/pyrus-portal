'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useSearchParams } from 'next/navigation'
import { useClientData } from '@/hooks/useClientData'
import { usePageView } from '@/hooks/usePageView'

type ClientStatus = 'pending' | 'active' | 'inactive' | 'churned'

interface ChecklistItem {
  id: string
  title: string
  description: string | null
  actionType: string | null
  actionUrl: string | null
  actionLabel: string | null
  isCompleted: boolean
  completedAt: string | null
  notes: string | null
  product: {
    id: string
    name: string
    category: string
  }
}

interface OnboardingResponse {
  id: string
  question: string
  answer: string | string[] | null
  questionType: string
  product: {
    id: string
    name: string
    category: string
  }
}

interface VideoChapter {
  id: string
  title: string
  description: string
  videoUrl: string
}

interface OnboardingQuestion {
  id: string
  questionText: string
  questionType: string
  options: string[] | null
  placeholder: string | null
  helpText: string | null
  isRequired: boolean
  section: string | null
  product: {
    id: string
    name: string
    category: string
  }
  response: {
    id: string
    text: string | null
    options: string[] | null
  } | null
}

interface OnboardingFormData {
  questions: OnboardingQuestion[]
  grouped: Record<string, OnboardingQuestion[]>
  hasProducts: boolean
  progress: {
    answered: number
    total: number
    percent: number
  }
}

interface OnboardingData {
  client: {
    id: string
    name: string
    contactName: string | null
    contactEmail: string | null
    startDate: string | null
  }
  checklist: {
    items: ChecklistItem[]
    progress: {
      completed: number
      total: number
      percent: number
    }
  }
  onboardingSummary: Record<string, OnboardingResponse[]>
}

// Check if a string looks like a UUID
function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export default function GettingStartedPage() {
  const searchParams = useSearchParams()
  const viewingAs = searchParams.get('viewingAs')
  const { client, loading: clientLoading } = useClientData(viewingAs)
  usePageView({ page: '/getting-started', pageName: 'Getting Started' })

  const [activeSubtab, setActiveSubtab] = useState('questions')
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [clientDisplay, setClientDisplay] = useState<{ name: string; initials: string; contactName: string }>({
    name: 'Client',
    initials: 'CL',
    contactName: 'Client User',
  })
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])
  const [activeVideoChapter, setActiveVideoChapter] = useState<string>('')
  const [clientStatus, setClientStatus] = useState<ClientStatus | null>(null)

  // Onboarding form state
  const [formData, setFormData] = useState<OnboardingFormData | null>(null)
  const [formLoading, setFormLoading] = useState(true)
  const [formResponses, setFormResponses] = useState<Record<string, string | string[]>>({})
  const [isSavingForm, setIsSavingForm] = useState(false)
  const [formSaveMessage, setFormSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Update client display and status when hook data loads
  useEffect(() => {
    if (client.id) {
      setClientDisplay({
        name: client.name,
        initials: client.initials,
        contactName: client.contactName,
      })
      setClientStatus(client.status as ClientStatus)
    }
  }, [client])

  // Fetch video chapters
  useEffect(() => {
    async function fetchVideoChapters() {
      try {
        const res = await fetch('/api/client/video-chapters')
        if (res.ok) {
          const data = await res.json()
          const chapters = data.map((c: { id: string; title: string; description: string | null; video_url: string | null }) => ({
            id: c.id,
            title: c.title,
            description: c.description || '',
            videoUrl: c.video_url || ''
          })).filter((c: VideoChapter) => c.videoUrl)
          setVideoChapters(chapters)
          if (chapters.length > 0) {
            setActiveVideoChapter(chapters[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
      }
    }
    fetchVideoChapters()
  }, [])

  // Fetch onboarding data
  useEffect(() => {
    async function fetchData() {
      // Use viewingAs if available, otherwise use the client's own ID
      const clientId = viewingAs || client.id

      if (!clientId || clientLoading) {
        if (!clientLoading) setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/client/onboarding?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setOnboardingData(data)
          // Update display info from API response if available
          if (data.client) {
            const initials = data.client.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
            setClientDisplay({
              name: data.client.name,
              initials,
              contactName: data.client.contactName || data.client.name,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch onboarding data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [viewingAs, client.id, clientLoading])

  // Fetch onboarding form questions
  useEffect(() => {
    async function fetchFormData() {
      const clientId = viewingAs || client.id

      if (!clientId || clientLoading) {
        if (!clientLoading) setFormLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/client/onboarding-form?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setFormData(data)

          // Initialize form responses with existing answers
          const initialResponses: Record<string, string | string[]> = {}
          data.questions?.forEach((q: OnboardingQuestion) => {
            if (q.response) {
              if (q.response.text) {
                initialResponses[q.id] = q.response.text
              } else if (q.response.options) {
                initialResponses[q.id] = q.response.options
              }
            }
          })
          setFormResponses(initialResponses)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding form:', error)
      } finally {
        setFormLoading(false)
      }
    }
    fetchFormData()
  }, [viewingAs, client.id, clientLoading])

  // Handle form input change
  const handleFormChange = (questionId: string, value: string | string[]) => {
    setFormResponses(prev => ({
      ...prev,
      [questionId]: value,
    }))
  }

  // Handle form submission
  const handleSaveForm = async () => {
    const clientId = viewingAs || client.id
    if (!clientId) return

    setIsSavingForm(true)
    setFormSaveMessage(null)

    try {
      // Convert form responses to API format
      const responses = Object.entries(formResponses).map(([questionId, value]) => ({
        questionId,
        text: typeof value === 'string' ? value : undefined,
        options: Array.isArray(value) ? value : undefined,
      }))

      const res = await fetch(`/api/client/onboarding-form?clientId=${clientId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })

      if (res.ok) {
        setFormSaveMessage({ type: 'success', text: 'Your answers have been saved!' })
        // Refresh form data to get updated progress
        const refreshRes = await fetch(`/api/client/onboarding-form?clientId=${clientId}`)
        if (refreshRes.ok) {
          setFormData(await refreshRes.json())
        }
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('Failed to save form:', error)
      setFormSaveMessage({ type: 'error', text: 'Failed to save. Please try again.' })
    } finally {
      setIsSavingForm(false)
      setTimeout(() => setFormSaveMessage(null), 5000)
    }
  }

  const checklist = onboardingData?.checklist
  const summary = onboardingData?.onboardingSummary || {}

  // Format answer for display
  const formatAnswer = (answer: string | string[] | null): string => {
    if (!answer) return ''
    if (Array.isArray(answer)) return answer.join(', ')
    return answer
  }

  // Show loading state while client data is being fetched
  if (clientLoading || clientStatus === null) {
    return (
      <>
        <div className="client-top-header">
          <div className="client-top-header-left">
            <h1>Loading...</h1>
          </div>
        </div>
        <div className="client-content">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
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
          <h1>{clientStatus === 'pending' ? 'Welcome' : 'Getting Started'}</h1>
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
              <span>{clientDisplay.initials}</span>
            </div>
            <span className="user-name">{clientDisplay.contactName}</span>
          </Link>
        </div>
      </div>

      <div className="client-content">
        {/* Pending Client View - Show welcome and recommendation prompt */}
        {clientStatus === 'pending' ? (
          <div className="pending-client-view">
            {/* Welcome Section */}
            <div className="welcome-hero">
              <div className="welcome-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <h2>Welcome to Pyrus, {clientDisplay.contactName}!</h2>
              <p>We&apos;ve prepared a personalized marketing proposal for {clientDisplay.name}. Review your options and choose the plan that fits your goals.</p>
            </div>

            {/* Three Column Action Cards */}
            <div className="pending-action-grid three-col">
              {/* View Recommendation Card */}
              <div className="pending-action-card primary">
                <div className="action-card-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <h3>View Your Proposal</h3>
                <p>We&apos;ve analyzed your business and prepared tailored marketing recommendations with transparent pricing.</p>
                <Link
                  href={viewingAs ? `/recommendations?viewingAs=${viewingAs}` : '/recommendations'}
                  className="btn btn-primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Review Recommendations
                </Link>
              </div>

              {/* Why Choose Pyrus Card */}
              <div className="pending-action-card">
                <div className="action-card-icon secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3>Why Choose Pyrus?</h3>
                <div className="benefits-list">
                  <div className="benefit-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>30-day money-back guarantee</span>
                  </div>
                  <div className="benefit-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Month-to-month, no contracts</span>
                  </div>
                  <div className="benefit-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>AI-powered marketing tools</span>
                  </div>
                  <div className="benefit-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Local business expertise</span>
                  </div>
                </div>
                <div className="tagline-small">Simple. Scalable. Results-driven.</div>
              </div>

              {/* What Happens Next Card */}
              <div className="pending-action-card">
                <div className="action-card-icon secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <h3>What Happens Next?</h3>
                <div className="next-steps-list">
                  <div className="next-step">
                    <span className="step-num">1</span>
                    <span>Review your personalized proposal</span>
                  </div>
                  <div className="next-step">
                    <span className="step-num">2</span>
                    <span>Select a plan that fits your goals</span>
                  </div>
                  <div className="next-step">
                    <span className="step-num">3</span>
                    <span>Complete quick onboarding questions</span>
                  </div>
                  <div className="next-step">
                    <span className="step-num">4</span>
                    <span>We get to work growing your business!</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <>
            {/* Active Client View - Show checklist and onboarding */}
            {/* Getting Started Sub-tabs */}
            <div className="results-subtabs">
              <button
                className={`results-subtab ${activeSubtab === 'questions' ? 'active' : ''}`}
                onClick={() => setActiveSubtab('questions')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Questions
              </button>
              <button
                className={`results-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
                onClick={() => setActiveSubtab('checklist')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Checklist
              </button>
              <button
                className={`results-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
                onClick={() => setActiveSubtab('onboarding-summary')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Summary
              </button>
            </div>

            {/* Checklist Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`} id="checklist">
          <div className="onboarding-grid">
            <div className="checklist-card">
              <div className="checklist-header">
                <h3>Onboarding Checklist</h3>
                <p>Complete these steps to get the most from your marketing</p>
                <div className="progress-bar-container">
                  <div className="progress-bar-label">
                    <span>Progress</span>
                    <span>
                      {loading ? '...' : checklist ? `${checklist.progress.completed} of ${checklist.progress.total} completed` : '0 of 0 completed'}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${checklist?.progress.percent || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="checklist-items">
                {loading ? (
                  <div className="checklist-loading">Loading checklist...</div>
                ) : checklist && checklist.items.length > 0 ? (
                  checklist.items.map((item) => (
                    <div key={item.id} className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}>
                      <div className={`checklist-checkbox ${item.isCompleted ? 'completed' : ''}`}>
                        {item.isCompleted && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <div className="checklist-item-content">
                        <div className="checklist-item-title">{item.title}</div>
                        <div className="checklist-item-desc">
                          {item.isCompleted && item.completedAt
                            ? `Completed ${new Date(item.completedAt).toLocaleDateString()}`
                            : item.description || `Related to ${item.product.name}`}
                        </div>
                      </div>
                      {!item.isCompleted && item.actionType && item.actionUrl && (
                        <div className="checklist-item-action">
                          {item.actionType === 'link' ? (
                            <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                              {item.actionLabel || 'View'}
                            </a>
                          ) : (
                            <button className="btn btn-secondary">
                              {item.actionLabel || 'Complete'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="checklist-empty">
                    <p>No checklist items yet. Complete your onboarding form to see your personalized checklist.</p>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="sidebar-card video-sidebar">
                <h4>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                  </svg>
                  Getting Started Videos
                </h4>
                {videoChapters.length > 0 ? (
                  <>
                    <div className="video-player-wrapper">
                      {(() => {
                        const activeChapter = videoChapters.find(c => c.id === activeVideoChapter)
                        return activeChapter?.videoUrl ? (
                          <iframe
                            src={activeChapter.videoUrl}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                          />
                        ) : null
                      })()}
                    </div>
                    <div className="video-chapter-list">
                      {videoChapters.map((chapter, index) => (
                        <button
                          key={chapter.id}
                          className={`video-chapter-btn ${activeVideoChapter === chapter.id ? 'active' : ''}`}
                          onClick={() => setActiveVideoChapter(chapter.id)}
                        >
                          <span className="chapter-num">{index + 1}</span>
                          <div className="chapter-info">
                            <span className="chapter-title">{chapter.title}</span>
                            <span className="chapter-desc">{chapter.description}</span>
                          </div>
                          {activeVideoChapter === chapter.id && (
                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" className="chapter-playing">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="video-container">
                    <div className="video-placeholder">
                      <div className="video-play-btn">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                      </div>
                    </div>
                    <p className="video-caption">Videos coming soon! Learn how to navigate your portal and get the most from your marketing partnership.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Questions Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'questions' ? 'active' : ''}`} id="questions">
          <div className="onboarding-questions">
            {formLoading ? (
              <div className="questions-loading" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="spinner" style={{ width: 40, height: 40 }}></div>
              </div>
            ) : !formData?.hasProducts || formData.questions.length === 0 ? (
              <div className="questions-card">
                <div className="questions-header">
                  <h3>Onboarding Questions</h3>
                  <p>Help us understand your business better by answering these questions.</p>
                </div>
                <div className="questions-content">
                  <div className="questions-coming-soon">
                    <div className="coming-soon-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                    </div>
                    <h4>No Questions Yet</h4>
                    <p>Once you have active services, personalized onboarding questions will appear here.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Progress Header */}
                <div className="questions-card" style={{ marginBottom: '1.5rem' }}>
                  <div className="questions-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <div>
                        <h3>Onboarding Questions</h3>
                        <p>Help us understand your business better by answering these questions.</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#324438' }}>
                          {formData.progress.percent}%
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {formData.progress.answered} of {formData.progress.total} completed
                        </div>
                      </div>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E5E7EB', borderRadius: '3px', marginTop: '1rem' }}>
                      <div style={{ width: `${formData.progress.percent}%`, height: '100%', background: '#22C55E', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                </div>

                {/* Questions by Section */}
                {Object.entries(formData.grouped).map(([section, questions]) => (
                  <div key={section} className="questions-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="questions-header" style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        {section}
                      </h3>
                    </div>
                    <div className="questions-content" style={{ padding: '1.5rem' }}>
                      {questions.map((q) => (
                        <div key={q.id} className="form-group" style={{ marginBottom: '1.5rem' }}>
                          <label className="form-label" style={{ fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                            {q.questionText}
                            {q.isRequired && <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>}
                          </label>
                          {q.helpText && (
                            <p style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '0.5rem' }}>{q.helpText}</p>
                          )}

                          {/* Text input */}
                          {(q.questionType === 'text' || q.questionType === 'url' || q.questionType === 'email' || q.questionType === 'phone') && (
                            <input
                              type={q.questionType === 'url' ? 'url' : q.questionType === 'email' ? 'email' : q.questionType === 'phone' ? 'tel' : 'text'}
                              className="form-input"
                              placeholder={q.placeholder || ''}
                              value={(formResponses[q.id] as string) || ''}
                              onChange={(e) => handleFormChange(q.id, e.target.value)}
                              style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem' }}
                            />
                          )}

                          {/* Textarea */}
                          {q.questionType === 'textarea' && (
                            <textarea
                              className="form-textarea"
                              placeholder={q.placeholder || ''}
                              value={(formResponses[q.id] as string) || ''}
                              onChange={(e) => handleFormChange(q.id, e.target.value)}
                              rows={4}
                              style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical' }}
                            />
                          )}

                          {/* Select */}
                          {q.questionType === 'select' && q.options && (
                            <select
                              className="form-select"
                              value={(formResponses[q.id] as string) || ''}
                              onChange={(e) => handleFormChange(q.id, e.target.value)}
                              style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', background: 'white' }}
                            >
                              <option value="">Select an option...</option>
                              {(q.options as string[]).map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          )}

                          {/* Radio buttons */}
                          {q.questionType === 'radio' && q.options && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {(q.options as string[]).map((opt) => (
                                <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: formResponses[q.id] === opt ? '#F0FDF4' : 'transparent', border: formResponses[q.id] === opt ? '1px solid #22C55E' : '1px solid transparent' }}>
                                  <input
                                    type="radio"
                                    name={q.id}
                                    value={opt}
                                    checked={formResponses[q.id] === opt}
                                    onChange={(e) => handleFormChange(q.id, e.target.value)}
                                    style={{ accentColor: '#22C55E' }}
                                  />
                                  <span style={{ fontSize: '0.875rem' }}>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Checkboxes (multiselect) */}
                          {(q.questionType === 'checkbox' || q.questionType === 'multiselect') && q.options && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {(q.options as string[]).map((opt) => {
                                const currentValues = (formResponses[q.id] as string[]) || []
                                const isChecked = currentValues.includes(opt)
                                return (
                                  <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem', borderRadius: '6px', background: isChecked ? '#F0FDF4' : 'transparent', border: isChecked ? '1px solid #22C55E' : '1px solid transparent' }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleFormChange(q.id, [...currentValues, opt])
                                        } else {
                                          handleFormChange(q.id, currentValues.filter((v) => v !== opt))
                                        }
                                      }}
                                      style={{ accentColor: '#22C55E' }}
                                    />
                                    <span style={{ fontSize: '0.875rem' }}>{opt}</span>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Save Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
                  {formSaveMessage && (
                    <span style={{
                      fontSize: '0.875rem',
                      color: formSaveMessage.type === 'success' ? '#059669' : '#DC2626',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      {formSaveMessage.type === 'success' ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="15" y1="9" x2="9" y2="15"></line>
                          <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                      )}
                      {formSaveMessage.text}
                    </span>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSaveForm}
                      disabled={isSavingForm}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {isSavingForm ? (
                        <>
                          <span className="spinner" style={{ width: 16, height: 16 }}></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                          </svg>
                          Save Answers
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Onboarding Summary Tab Content */}
        <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`} id="onboarding-summary">
          <div className="onboarding-summary">
            {loading ? (
              <div className="summary-loading">Loading onboarding summary...</div>
            ) : Object.keys(summary).length > 0 ? (
              Object.entries(summary).map(([section, responses]) => (
                <div key={section} className="summary-section">
                  <h3 className="summary-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    {section}
                  </h3>
                  <div className="summary-content">
                    {responses.map((r) => (
                      <div key={r.id} className="summary-field full-width">
                        <label>{r.question}</label>
                        {r.answer ? (
                          r.questionType === 'url' ? (
                            <a href={formatAnswer(r.answer)} target="_blank" rel="noopener noreferrer">
                              {formatAnswer(r.answer)}
                            </a>
                          ) : (
                            <span>{formatAnswer(r.answer)}</span>
                          )
                        ) : (
                          <span className="empty">Not provided</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="summary-empty">
                <div className="summary-empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h3>No Onboarding Data Yet</h3>
                <p>Complete your onboarding form to see your responses here.</p>
              </div>
            )}
          </div>
        </div>
          </>
        )}
      </div>

      <style jsx>{`
        .checklist-loading,
        .summary-loading {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .checklist-empty,
        .summary-empty {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
        }

        .summary-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
        }

        .summary-empty-icon {
          color: #d1d5db;
        }

        /* Questions Tab Styles */
        .onboarding-questions {
          max-width: 800px;
        }

        .questions-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          overflow: hidden;
        }

        .questions-header {
          padding: 1.5rem;
          border-bottom: 1px solid #E5E7EB;
        }

        .questions-header h3 {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1A1F16;
        }

        .questions-header p {
          margin: 0;
          font-size: 0.875rem;
          color: #6B7280;
        }

        .questions-content {
          padding: 2rem;
        }

        .questions-coming-soon {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 2rem;
        }

        .coming-soon-icon {
          color: #D1D5DB;
          margin-bottom: 1rem;
        }

        .questions-coming-soon h4 {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
        }

        .questions-coming-soon p {
          margin: 0;
          font-size: 0.875rem;
          color: #6B7280;
          max-width: 400px;
        }

        .summary-empty h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
        }

        .summary-empty p {
          margin: 0;
          color: #6b7280;
        }

        .summary-content {
          display: grid;
          gap: 1rem;
        }

        .summary-field.full-width {
          grid-column: 1 / -1;
        }

        /* Video Sidebar Styles */
        .video-sidebar h4 {
          margin-bottom: 1rem;
        }

        .video-player-wrapper {
          position: relative;
          padding-top: 56.25%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .video-chapter-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .video-chapter-btn {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: none;
          border: 1px solid transparent;
          border-radius: 8px;
          text-align: left;
          cursor: pointer;
          transition: all 0.15s;
          width: 100%;
        }

        .video-chapter-btn:hover {
          background: #F5F7F6;
        }

        .video-chapter-btn.active {
          background: rgba(50, 68, 56, 0.08);
          border-color: rgba(50, 68, 56, 0.2);
        }

        .chapter-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E8EDEA;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #5A6358;
          flex-shrink: 0;
        }

        .video-chapter-btn.active .chapter-num {
          background: #324438;
          color: white;
        }

        .chapter-info {
          flex: 1;
          min-width: 0;
        }

        .chapter-title {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #1A1F16;
          margin-bottom: 0.125rem;
        }

        .chapter-desc {
          display: block;
          font-size: 0.75rem;
          color: #5A6358;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .chapter-playing {
          color: #324438;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }

        /* Pending Client View Styles */
        .pending-client-view {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .welcome-hero {
          text-align: center;
          padding: 2.5rem 2rem;
          background: linear-gradient(135deg, rgba(50, 68, 56, 0.05) 0%, rgba(50, 68, 56, 0.02) 100%);
          border-radius: 16px;
          border: 1px solid rgba(50, 68, 56, 0.1);
        }

        .welcome-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #324438 0%, #4a6352 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .welcome-hero h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1A1F16;
          margin: 0 0 0.75rem;
        }

        .welcome-hero p {
          font-size: 1rem;
          color: #5A6358;
          margin: 0;
          max-width: 500px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.6;
        }

        .pending-action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .pending-action-grid.three-col {
          grid-template-columns: repeat(3, 1fr);
        }

        @media (max-width: 900px) {
          .pending-action-grid.three-col {
            grid-template-columns: 1fr;
          }
        }

        .pending-action-card {
          background: white;
          border-radius: 12px;
          border: 1px solid #E5E7EB;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pending-action-card.primary {
          border-color: rgba(50, 68, 56, 0.3);
          box-shadow: 0 4px 12px rgba(50, 68, 56, 0.1);
        }

        .action-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #324438 0%, #4a6352 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .action-card-icon svg {
          width: 24px;
          height: 24px;
        }

        .action-card-icon.secondary {
          background: linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%);
        }

        .pending-action-card h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1A1F16;
          margin: 0;
        }

        .pending-action-card p {
          font-size: 0.875rem;
          color: #5A6358;
          margin: 0;
          line-height: 1.5;
        }

        .pending-action-card .btn {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .next-steps-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .benefits-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .benefit-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .benefit-row svg {
          color: #324438;
          flex-shrink: 0;
        }

        .tagline-small {
          margin-top: auto;
          padding-top: 0.75rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #324438;
        }

        .next-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #374151;
        }

        .step-num {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #E8EDEA;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: #5A6358;
          flex-shrink: 0;
        }

      `}</style>

      {/* LeadConnector Chatbot - For all clients on Getting Started/Welcome page */}
      <Script
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id="6879420133ee4bc0c5428d6b"
        strategy="lazyOnload"
      />
    </>
  )
}
