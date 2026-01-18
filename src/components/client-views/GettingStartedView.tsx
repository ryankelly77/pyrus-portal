'use client'

import { useState, useEffect } from 'react'

interface GettingStartedViewProps {
  clientId: string
  isAdmin?: boolean
  onboardingCompletedAt?: string | null
}

interface OnboardingQuestion {
  id: string
  questionText: string
  questionType: string
  options: string[] | null
  placeholder: string | null
  helpText: string | null
  isRequired: boolean
  section: string
  product: { id: string; name: string; category: string }
  response: { id: string; text: string | null; options: string[] | null } | null
}

interface OnboardingFormData {
  questions: OnboardingQuestion[]
  grouped: Record<string, OnboardingQuestion[]>
  hasProducts: boolean
  progress: { answered: number; total: number; percent: number }
}

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
  product: { id: string; name: string; category: string }
}

interface OnboardingResponse {
  id: string
  question: string
  answer: string | string[] | null
  questionType: string
  product: { id: string; name: string; category: string }
}

interface OnboardingSummary {
  [section: string]: OnboardingResponse[]
}

interface VideoChapter {
  id: string
  title: string
  description: string | null
  videoUrl: string | null
  sortOrder: number
}

type GettingStartedSubtab = 'questions' | 'checklist' | 'onboarding-summary'

export function GettingStartedView({ clientId, isAdmin = false, onboardingCompletedAt }: GettingStartedViewProps) {
  const [activeSubtab, setActiveSubtab] = useState<GettingStartedSubtab>('questions')

  // Form data for Questions tab
  const [formData, setFormData] = useState<OnboardingFormData | null>(null)
  const [formLoading, setFormLoading] = useState(true)

  // Checklist data
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistLoading, setChecklistLoading] = useState(true)

  // Summary data
  const [summary, setSummary] = useState<OnboardingSummary>({})
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Video chapters
  const [videoChapters, setVideoChapters] = useState<VideoChapter[]>([])
  const [activeVideoChapter, setActiveVideoChapter] = useState<string>('')

  // Admin-only state
  const [syncingChecklist, setSyncingChecklist] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Fetch onboarding form data
  useEffect(() => {
    async function fetchFormData() {
      if (!clientId) return
      setFormLoading(true)
      try {
        const res = await fetch(`/api/client/onboarding-form?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setFormData(data)
        }
      } catch (error) {
        console.error('Failed to fetch onboarding form:', error)
      } finally {
        setFormLoading(false)
      }
    }
    fetchFormData()
  }, [clientId])

  // Fetch checklist and summary data
  useEffect(() => {
    async function fetchOnboardingData() {
      if (!clientId) return
      setChecklistLoading(true)
      setSummaryLoading(true)
      try {
        const res = await fetch(`/api/client/onboarding?clientId=${clientId}`)
        if (res.ok) {
          const data = await res.json()
          setChecklistItems(data.checklist?.items || [])
          setSummary(data.onboardingSummary || {})
        }
      } catch (error) {
        console.error('Failed to fetch onboarding data:', error)
      } finally {
        setChecklistLoading(false)
        setSummaryLoading(false)
      }
    }
    fetchOnboardingData()
  }, [clientId])

  // Fetch video chapters
  useEffect(() => {
    async function fetchVideoChapters() {
      try {
        const res = await fetch('/api/client/video-chapters')
        if (res.ok) {
          const data = await res.json()
          setVideoChapters(data)
          if (data.length > 0) {
            setActiveVideoChapter(data[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch video chapters:', error)
      }
    }
    fetchVideoChapters()
  }, [])

  // Admin: Toggle checklist item
  const handleChecklistToggle = async (itemId: string, currentState: boolean) => {
    if (!isAdmin) return

    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, isCompleted: !currentState }),
      })
      if (res.ok) {
        setChecklistItems(prev =>
          prev.map(item =>
            item.id === itemId
              ? { ...item, isCompleted: !currentState, completedAt: !currentState ? new Date().toISOString() : null }
              : item
          )
        )
      }
    } catch (error) {
      console.error('Failed to toggle checklist item:', error)
    }
  }

  // Admin: Sync checklist
  const handleSyncChecklist = async () => {
    if (!isAdmin) return

    setSyncingChecklist(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/checklist/sync`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setSyncMessage(`Synced: ${data.updated} updated`)
        // Refresh checklist
        const refreshRes = await fetch(`/api/client/onboarding?clientId=${clientId}`)
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          setChecklistItems(refreshData.checklist?.items || [])
        }
        setTimeout(() => setSyncMessage(null), 3000)
      }
    } catch (error) {
      console.error('Failed to sync checklist:', error)
      setSyncMessage('Sync failed')
      setTimeout(() => setSyncMessage(null), 3000)
    } finally {
      setSyncingChecklist(false)
    }
  }

  // Format answer for display
  const formatAnswer = (answer: string | string[] | null): string => {
    if (!answer) return ''
    if (Array.isArray(answer)) return answer.join(', ')
    return answer
  }

  // Calculate checklist progress
  const checklistProgress = checklistItems.length > 0
    ? Math.round((checklistItems.filter(i => i.isCompleted).length / checklistItems.length) * 100)
    : 0

  return (
    <div className="getting-started-view">
      {/* Sub-tabs */}
      <div className="getting-started-subtabs">
        <button
          className={`getting-started-subtab ${activeSubtab === 'questions' ? 'active' : ''}`}
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
          className={`getting-started-subtab ${activeSubtab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('checklist')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Checklist
        </button>
        <button
          className={`getting-started-subtab ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}
          onClick={() => setActiveSubtab('onboarding-summary')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          Summary
        </button>

        {/* Admin-only sync button */}
        {isAdmin && activeSubtab === 'checklist' && (
          <button
            onClick={handleSyncChecklist}
            disabled={syncingChecklist}
            className="getting-started-subtab"
            title="Re-sync checklist with onboarding responses"
            style={{ marginLeft: 'auto', opacity: syncingChecklist ? 0.6 : 1 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {syncMessage || (syncingChecklist ? 'Syncing...' : 'Sync')}
          </button>
        )}
      </div>

      {/* Questions Tab */}
      <div className={`gs-tab-content ${activeSubtab === 'questions' ? 'active' : ''}`}>
        {onboardingCompletedAt ? (
          <div className="onboarding-questions">
            <div className="summary-card">
              <div className="onboarding-complete-banner">
                <div className="complete-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3>Onboarding Complete</h3>
                <p>All onboarding questions have been completed.</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.5rem' }}>
                  Completed on {new Date(onboardingCompletedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveSubtab('onboarding-summary')}
                  style={{ marginTop: '1rem' }}
                >
                  View Summary
                </button>
              </div>
            </div>
          </div>
        ) : formLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ width: 40, height: 40 }}></div>
          </div>
        ) : formData?.hasProducts && formData.questions.length > 0 ? (
          <div className="onboarding-questions">
            {/* Progress Header */}
            <div className="summary-card">
              <div className="summary-card-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#1A1F16' }}>Onboarding Questions</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                      {isAdmin ? 'View and manage client onboarding responses' : 'Help us understand your business better'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isAdmin ? '#885430' : '#324438' }}>
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
              <div key={section} className="summary-card">
                <div className="summary-card-header">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    {section}
                  </h3>
                </div>
                <div className="summary-card-content">
                  {questions.map((q) => (
                    <div key={q.id} className="summary-field">
                      <label>
                        {q.questionText}
                        {q.isRequired && <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>}
                      </label>
                      {q.helpText && <p className="help-text">{q.helpText}</p>}
                      <div className={`answer-box ${q.response ? 'answered' : 'unanswered'}`}>
                        {q.response ? (
                          q.response.text || (q.response.options && q.response.options.join(', ')) || 'Answered'
                        ) : (
                          'Not answered yet'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="onboarding-questions">
            <div className="summary-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ color: '#D1D5DB', marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#374151' }}>No Questions Available</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                {isAdmin ? 'Questions will appear after the client purchases services.' : 'Questions will appear after you purchase services.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Checklist Tab */}
      <div className={`gs-tab-content ${activeSubtab === 'checklist' ? 'active' : ''}`}>
        <div className="onboarding-grid">
          {onboardingCompletedAt ? (
            <div className="checklist-card">
              <div className="onboarding-complete-banner">
                <div className="complete-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3>Onboarding Complete</h3>
                <p>All onboarding tasks have been completed. {isAdmin ? 'The account is ready to go!' : 'Your account is ready to go!'}</p>
                <p style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '0.5rem' }}>
                  Completed on {new Date(onboardingCompletedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveSubtab('onboarding-summary')}
                  style={{ marginTop: '1rem' }}
                >
                  View Summary
                </button>
              </div>
            </div>
          ) : (
            <div className="checklist-card">
              <div className="checklist-header">
                <h3>Onboarding Checklist</h3>
                <p>Complete these steps to get the most from your marketing</p>
                {checklistItems.length > 0 && (
                  <div className="progress-bar-container">
                    <div className="progress-bar-label">
                      <span>Progress</span>
                      <span>{checklistItems.filter(i => i.isCompleted).length} of {checklistItems.length} completed</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${checklistProgress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="checklist-items">
                {checklistLoading ? (
                  <div className="checklist-loading">Loading checklist...</div>
                ) : checklistItems.length === 0 ? (
                  <div className="checklist-empty">
                    <p>No checklist items yet. Items will appear here after purchase.</p>
                  </div>
                ) : (
                  checklistItems.map((item) => (
                    <div
                      key={item.id}
                      className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
                      onClick={isAdmin ? () => handleChecklistToggle(item.id, item.isCompleted) : undefined}
                      style={{ cursor: isAdmin ? 'pointer' : 'default' }}
                    >
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
                            ? `Completed ${new Date(item.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                            : item.description || `From ${item.product.name}`
                          }
                        </div>
                      </div>
                      {!item.isCompleted && item.actionType === 'link' && item.actionUrl && (
                        <div className="checklist-item-action" onClick={(e) => e.stopPropagation()}>
                          <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                            {item.actionLabel || 'Open'}
                          </a>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Video Sidebar */}
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
                        onClick={() => setActiveVideoChapter(chapter.id)}
                        className={`video-chapter-btn ${activeVideoChapter === chapter.id ? 'active' : ''}`}
                      >
                        <span className="chapter-num">{index + 1}</span>
                        <div className="chapter-info">
                          <span className="chapter-title">{chapter.title}</span>
                          <span className="chapter-desc">{chapter.description}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>No videos available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Tab */}
      <div className={`gs-tab-content ${activeSubtab === 'onboarding-summary' ? 'active' : ''}`}>
        <div className="onboarding-summary">
          {summaryLoading ? (
            <div className="summary-card" style={{ padding: '1.5rem' }}>
              <p>Loading onboarding summary...</p>
            </div>
          ) : Object.keys(summary).length > 0 ? (
            Object.entries(summary).map(([section, responses]) => (
              <div key={section} className="summary-card">
                <div className="summary-card-header">
                  <h3>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    {section}
                  </h3>
                </div>
                <div className="summary-card-content">
                  {responses.map((r) => (
                    <div key={r.id} className="summary-field">
                      <label>{r.question}</label>
                      <div className={`answer-box ${r.answer ? 'answered' : 'unanswered'}`}>
                        {r.answer ? (
                          r.questionType === 'url' ? (
                            <a href={formatAnswer(r.answer)} target="_blank" rel="noopener noreferrer">
                              {formatAnswer(r.answer)}
                            </a>
                          ) : (
                            formatAnswer(r.answer)
                          )
                        ) : (
                          'Not answered yet'
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="summary-card" style={{ padding: '3rem', textAlign: 'center' }}>
              <div style={{ color: '#D1D5DB', marginBottom: '1rem' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48" style={{ margin: '0 auto' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="12" y1="18" x2="12" y2="12"></line>
                  <line x1="9" y1="15" x2="15" y2="15"></line>
                </svg>
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#374151' }}>No Onboarding Data Yet</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>
                {isAdmin ? 'The client will complete the onboarding form after checkout.' : 'Complete your onboarding form to see your responses here.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
