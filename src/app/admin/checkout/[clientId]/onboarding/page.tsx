'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface Question {
  id: string
  questionText: string
  questionType: string
  options: string[] | null
  placeholder: string | null
  helpText: string | null
  videoUrl: string | null
  imageUrl: string | null
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

interface GroupedQuestions {
  [section: string]: Question[]
}

export default function OnboardingFormPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const clientId = params.clientId as string
  const tier = searchParams.get('tier') || 'starter'
  const amount = searchParams.get('amount') || '0'

  const [questions, setQuestions] = useState<Question[]>([])
  const [groupedQuestions, setGroupedQuestions] = useState<GroupedQuestions>({})
  const [sections, setSections] = useState<string[]>([])
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, { text?: string; options?: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next')
  const [showSuccessBanner, setShowSuccessBanner] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  // Show success banner only when coming fresh from checkout (cart still exists)
  useEffect(() => {
    const hasCart = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
    const alreadyShown = sessionStorage.getItem(`onboarding_banner_shown_${clientId}`)

    if (hasCart && !alreadyShown) {
      setShowSuccessBanner(true)
      sessionStorage.setItem(`onboarding_banner_shown_${clientId}`, 'true')
    }
  }, [clientId, tier])

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => setShowSuccessBanner(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [showSuccessBanner])

  // Fetch questions for purchased products
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const storedData = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
        let productIds: string[] = []

        if (storedData) {
          const cartItems = JSON.parse(storedData) as Array<{
            id: string
            productId: string
            category?: string
            bundleProducts?: Array<{ id: string }>
          }>
          cartItems.forEach((item) => {
            if (item.category === 'bundle' && item.bundleProducts) {
              item.bundleProducts.forEach((bp) => productIds.push(bp.id))
            } else {
              productIds.push(item.productId)
            }
          })
        }

        const url = productIds.length > 0
          ? `/api/admin/clients/${clientId}/onboarding-form?productIds=${productIds.join(',')}`
          : `/api/admin/clients/${clientId}/onboarding-form`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setQuestions(data.questions || [])
          setGroupedQuestions(data.grouped || {})
          setSections(Object.keys(data.grouped || {}))

          const initialResponses: Record<string, { text?: string; options?: string[] }> = {}
          data.questions?.forEach((q: Question) => {
            if (q.response) {
              initialResponses[q.id] = {
                text: q.response.text || undefined,
                options: q.response.options || undefined,
              }
            }
          })
          setResponses(initialResponses)
        }
      } catch (err) {
        console.error('Failed to fetch questions:', err)
        setError('Failed to load onboarding questions')
      } finally {
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [clientId, tier])

  // Auto-save responses
  const saveResponses = useCallback(async () => {
    if (Object.keys(responses).length === 0) return

    setSaving(true)
    try {
      const formattedResponses = Object.entries(responses).map(([questionId, data]) => ({
        questionId,
        text: data.text,
        options: data.options,
      }))

      const res = await fetch(`/api/admin/clients/${clientId}/onboarding-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses }),
      })

      if (res.ok) {
        setLastSaved(new Date())
      }
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }, [clientId, responses])

  // Auto-save on response changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(responses).length > 0) {
        saveResponses()
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [responses, saveResponses])

  const handleTextChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text: value },
    }))
  }

  const handleSingleOptionChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { text: value },
    }))
  }

  const handleMultiOptionChange = (questionId: string, value: string, checked: boolean) => {
    setResponses(prev => {
      const current = prev[questionId]?.options || []
      const newOptions = checked
        ? [...current, value]
        : current.filter(v => v !== value)
      return {
        ...prev,
        [questionId]: { options: newOptions },
      }
    })
  }

  const currentSection = sections[currentSectionIndex]
  const currentQuestions = groupedQuestions[currentSection] || []
  const isLastSection = currentSectionIndex === sections.length - 1
  const isFirstSection = currentSectionIndex === 0
  const progress = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0

  const goToNextSection = () => {
    if (!isLastSection) {
      setSlideDirection('next')
      setCurrentSectionIndex(prev => prev + 1)
    }
  }

  const goToPrevSection = () => {
    if (!isFirstSection) {
      setSlideDirection('prev')
      setCurrentSectionIndex(prev => prev - 1)
    }
  }

  const handleFinish = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Save any remaining responses
      const formattedResponses = Object.entries(responses).map(([questionId, data]) => ({
        questionId,
        text: data.text,
        options: data.options,
      }))

      const res = await fetch(`/api/admin/clients/${clientId}/onboarding-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: formattedResponses }),
      })

      if (res.ok) {
        // Generate checklist items
        const storedData = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
        if (storedData) {
          const cartItems = JSON.parse(storedData) as Array<{
            id: string
            productId: string
            category?: string
            bundleProducts?: Array<{ id: string }>
          }>
          const productIds: string[] = []
          cartItems.forEach((item) => {
            if (item.category === 'bundle' && item.bundleProducts) {
              item.bundleProducts.forEach((bp) => productIds.push(bp.id))
            } else {
              productIds.push(item.productId)
            }
          })

          if (productIds.length > 0) {
            await fetch(`/api/admin/clients/${clientId}/checklist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productIds }),
            })
          }
        }

        sessionStorage.removeItem(`checkout_${clientId}_${tier}`)
        // Redirect to Getting Started page where they can watch the video and see checklist
        router.push(`/getting-started?viewingAs=${clientId}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save responses')
      }
    } catch (err) {
      console.error('Failed to submit:', err)
      setError('Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    sessionStorage.removeItem(`checkout_${clientId}_${tier}`)
    router.push(`/getting-started?viewingAs=${clientId}`)
  }

  const renderInputField = (question: Question) => {
    const response = responses[question.id]

    switch (question.questionType) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
        return (
          <input
            type={question.questionType === 'url' ? 'url' : question.questionType === 'email' ? 'email' : question.questionType === 'phone' ? 'tel' : 'text'}
            className="form-input"
            placeholder={question.placeholder || ''}
            value={response?.text || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
          />
        )

      case 'textarea':
        return (
          <textarea
            className="form-input"
            placeholder={question.placeholder || ''}
            value={response?.text || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
            rows={4}
          />
        )

      case 'select':
        return (
          <select
            className="form-input"
            value={response?.text || ''}
            onChange={(e) => handleSingleOptionChange(question.id, e.target.value)}
          >
            <option value="">Select an option</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="option-group">
            {question.options?.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`option-btn ${response?.text === opt ? 'selected' : ''}`}
                onClick={() => handleSingleOptionChange(question.id, opt)}
              >
                <span className="option-indicator">
                  {response?.text === opt && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )

      case 'checkbox':
      case 'multiselect':
        return (
          <div className="option-group">
            {question.options?.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`option-btn ${response?.options?.includes(opt) ? 'selected' : ''}`}
                onClick={() => handleMultiOptionChange(question.id, opt, !response?.options?.includes(opt))}
              >
                <span className="option-indicator checkbox">
                  {response?.options?.includes(opt) && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )

      default:
        return (
          <input
            type="text"
            className="form-input"
            placeholder={question.placeholder || ''}
            value={response?.text || ''}
            onChange={(e) => handleTextChange(question.id, e.target.value)}
          />
        )
    }
  }

  if (loading) {
    return (
      <div className="onboarding-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your onboarding form...</p>
        </div>
        <style jsx>{styles}</style>
      </div>
    )
  }

  if (questions.length === 0) {
    router.push(`/admin/checkout/${clientId}/success?tier=${tier}&amount=${amount}`)
    return null
  }

  return (
    <div className="onboarding-page">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="success-banner">
          <div className="success-banner-content">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="success-text">
              <strong>Payment Successful!</strong>
              <span>Complete these questions to help us get started.</span>
            </div>
            <button className="success-dismiss" onClick={() => setShowSuccessBanner(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Progress Header */}
      <div className="progress-header">
        <div className="progress-container">
          <div className="progress-info">
            <span className="progress-text">
              Section {currentSectionIndex + 1} of {sections.length}
            </span>
            {saving ? (
              <span className="save-status saving">Saving...</span>
            ) : lastSaved ? (
              <span className="save-status saved">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Saved
              </span>
            ) : null}
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="form-container">
        <div className={`section-slide ${slideDirection}`} key={currentSection}>
          {/* Section Header */}
          <div className="section-header">
            <h1>{currentSection}</h1>
            <p>Please answer the following questions</p>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {/* Questions */}
          <div className="questions-list">
            {currentQuestions.map((question) => (
              <div key={question.id} className="question-card">
                <div className="question-content">
                  <label className="question-label">
                    {question.questionText}
                    {question.isRequired && <span className="required">*</span>}
                  </label>

                  {question.helpText && (
                    <p className="question-hint">{question.helpText}</p>
                  )}

                  {question.imageUrl && question.imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i) && (
                    <div
                      className="question-image"
                      onClick={() => setLightboxImage(question.imageUrl)}
                    >
                      <img
                        src={question.imageUrl}
                        alt=""
                        onError={(e) => {
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none'
                        }}
                      />
                      <div className="image-zoom-hint">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                          <line x1="11" y1="8" x2="11" y2="14"></line>
                          <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                        Click to enlarge
                      </div>
                    </div>
                  )}

                  {question.videoUrl && (
                    <div className="question-video">
                      <iframe
                        src={question.videoUrl}
                        width="100%"
                        height="200"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {renderInputField(question)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Sticky Footer Navigation */}
      <div className="navigation-footer">
        <div className="navigation-container">
          <div className="nav-left">
            {!isFirstSection && (
              <button type="button" className="nav-btn back" onClick={goToPrevSection}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back
              </button>
            )}
          </div>
          <div className="nav-right">
            <button type="button" className="nav-btn skip" onClick={handleSkip}>
              Skip for now
            </button>
            {isLastSection ? (
              <button
                type="button"
                className="nav-btn primary"
                onClick={handleFinish}
                disabled={submitting}
              >
                {submitting ? 'Finishing...' : 'Finish'}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            ) : (
              <button type="button" className="nav-btn primary" onClick={goToNextSection}>
                Continue
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" onClick={() => setLightboxImage(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <img
            src={lightboxImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style jsx>{styles}</style>
    </div>
  )
}

const styles = `
  .onboarding-page {
    --primary: #324438;
    --primary-hover: #1C2820;
    --primary-light: #4A5C50;
    --text-primary: #1A1F16;
    --text-secondary: #5A6358;
    --border-color: #D4DCD2;
    --bg-primary: #F5F7F6;

    min-height: 100vh;
    background: linear-gradient(135deg, #F5F7F6 0%, #E8EDEA 100%);
    display: flex;
    flex-direction: column;
  }

  .loading-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    color: #6b7280;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #D4DCD2;
    border-top-color: #324438;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Success Banner */
  .success-banner {
    background: linear-gradient(135deg, #166534 0%, #15803d 100%);
    color: white;
    padding: 1rem 2rem;
    animation: slideDown 0.4s ease;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-100%);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .success-banner-content {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .success-icon {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .success-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .success-text strong {
    font-size: 1rem;
    font-weight: 600;
  }

  .success-text span {
    font-size: 0.875rem;
    opacity: 0.9;
  }

  .success-dismiss {
    background: transparent;
    border: none;
    color: white;
    opacity: 0.7;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: opacity 0.2s;
  }

  .success-dismiss:hover {
    opacity: 1;
  }

  /* Progress Header */
  .progress-header {
    background: white;
    border-bottom: 1px solid var(--border-color);
    padding: 1rem 2rem;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .progress-container {
    max-width: 800px;
    margin: 0 auto;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .progress-text {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .save-status {
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .save-status.saving {
    color: var(--text-secondary);
  }

  .save-status.saved {
    color: #16a34a;
  }

  .progress-bar {
    height: 6px;
    background: var(--border-color);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #324438 0%, #4A5C50 100%);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  /* Form Container */
  .form-container {
    flex: 1;
    max-width: 800px;
    width: 100%;
    margin: 0 auto;
    padding: 2rem 2rem 6rem;
    display: flex;
    flex-direction: column;
  }

  /* Section Slide Animation */
  .section-slide {
    flex: 1;
    animation: slideIn 0.4s ease;
  }

  .section-slide.next {
    animation: slideInRight 0.4s ease;
  }

  .section-slide.prev {
    animation: slideInLeft 0.4s ease;
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Section Header */
  .section-header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  .section-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.5rem;
  }

  .section-header p {
    color: var(--text-secondary);
    margin: 0;
  }

  .error-message {
    background: #fef2f2;
    color: #dc2626;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  /* Questions List */
  .questions-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .question-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    display: flex;
    gap: 1rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid var(--border-color);
    transition: box-shadow 0.2s, border-color 0.2s;
  }

  .question-card:focus-within {
    border-color: #4A5C50;
    box-shadow: 0 4px 16px rgba(50, 68, 56, 0.1);
  }

  .question-content {
    flex: 1;
    min-width: 0;
  }

  .question-label {
    display: block;
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
    line-height: 1.5;
  }

  .required {
    color: #dc2626;
    margin-left: 0.25rem;
  }

  .question-hint {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0 0 1rem;
  }

  .question-image {
    margin-bottom: 1rem;
    border-radius: 8px;
    overflow: hidden;
    max-width: 100%;
    cursor: pointer;
    position: relative;
    display: inline-block;
  }

  .question-image:hover {
    opacity: 0.95;
  }

  .question-image img {
    width: 100%;
    max-width: 400px;
    height: auto;
    display: block;
    border-radius: 8px;
    transition: transform 0.2s;
  }

  .question-image:hover img {
    transform: scale(1.02);
  }

  .image-zoom-hint {
    position: absolute;
    bottom: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 0.375rem 0.625rem;
    border-radius: 6px;
    font-size: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }

  .question-image:hover .image-zoom-hint {
    opacity: 1;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    cursor: zoom-out;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .lightbox img {
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 8px;
    cursor: default;
    animation: scaleIn 0.2s ease;
  }

  @keyframes scaleIn {
    from { transform: scale(0.95); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  .lightbox-close {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
  }

  .lightbox-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .question-video {
    margin-bottom: 1rem;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
  }

  .question-video iframe {
    display: block;
    border-radius: 8px;
  }

  /* Form Inputs */
  .form-input {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid var(--border-color);
    border-radius: 10px;
    background: #fafafa;
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
  }

  .form-input:focus {
    outline: none;
    border-color: #4A5C50;
    background: white;
    box-shadow: 0 0 0 4px rgba(50, 68, 56, 0.1);
  }

  .form-input::placeholder {
    color: #9ca3af;
  }

  textarea.form-input {
    resize: vertical;
    min-height: 100px;
  }

  select.form-input {
    cursor: pointer;
  }

  /* Option Buttons (Radio/Checkbox) */
  .option-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .option-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1.25rem;
    border: 2px solid var(--border-color);
    border-radius: 10px;
    background: #fafafa;
    color: var(--text-primary);
    font-size: 0.938rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .option-btn:hover {
    border-color: #4A5C50;
    background: white;
  }

  .option-btn.selected {
    border-color: #324438;
    background: rgba(50, 68, 56, 0.08);
    color: #324438;
  }

  .option-indicator {
    width: 22px;
    height: 22px;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .option-indicator.checkbox {
    border-radius: 6px;
  }

  .option-btn.selected .option-indicator {
    background: #324438;
    border-color: #324438;
  }

  .option-indicator svg {
    color: white;
    width: 14px;
    height: 14px;
  }

  /* Sticky Footer Navigation */
  .navigation-footer {
    position: sticky;
    bottom: 0;
    left: 0;
    right: 0;
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
    padding: 1rem 2rem;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
    z-index: 100;
  }

  .navigation-container {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .nav-left, .nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.875rem 1.5rem;
    border-radius: 10px;
    font-size: 0.938rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .nav-btn.back {
    background: white;
    color: var(--text-secondary);
    border: 2px solid var(--border-color);
  }

  .nav-btn.back:hover {
    border-color: var(--text-secondary);
    color: var(--text-primary);
  }

  .nav-btn.skip {
    background: transparent;
    color: var(--text-secondary);
  }

  .nav-btn.skip:hover {
    color: var(--text-primary);
  }

  .nav-btn.primary {
    background: #324438;
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(50, 68, 56, 0.3);
  }

  .nav-btn.primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(50, 68, 56, 0.4);
    background: #1C2820;
  }

  .nav-btn.primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .form-container {
      padding: 1rem 1rem 5rem;
    }

    .question-card {
      padding: 1.25rem;
    }

    .navigation-footer {
      padding: 0.875rem 1rem;
    }

    .navigation-container {
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .nav-left {
      order: 1;
      flex: 0 0 auto;
    }

    .nav-right {
      order: 2;
      flex: 1;
      justify-content: flex-end;
    }

    .nav-btn {
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
    }

    .nav-btn.skip {
      display: none;
    }
  }
`
