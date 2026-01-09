'use client'

import { useState, useEffect } from 'react'
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
  const [responses, setResponses] = useState<Record<string, { text?: string; options?: string[] }>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch questions for purchased products
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        // Get the product IDs from session storage (saved during checkout)
        const storedData = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
        let productIds: string[] = []

        if (storedData) {
          const parsed = JSON.parse(storedData)
          productIds = parsed.items?.map((item: { productId: string }) => item.productId).filter(Boolean) || []
        }

        const url = productIds.length > 0
          ? `/api/admin/clients/${clientId}/onboarding-form?productIds=${productIds.join(',')}`
          : `/api/admin/clients/${clientId}/onboarding-form`

        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setQuestions(data.questions || [])
          setGroupedQuestions(data.grouped || {})

          // Initialize responses from existing data
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

  // Handle text input change
  const handleTextChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text: value },
    }))
  }

  // Handle option selection (radio/select)
  const handleSingleOptionChange = (questionId: string, value: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { text: value },
    }))
  }

  // Handle multi-select/checkbox change
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

  // Validate required fields
  const validateResponses = (): boolean => {
    for (const q of questions) {
      if (q.isRequired) {
        const response = responses[q.id]
        if (!response) return false
        if (q.questionType === 'multiselect' || q.questionType === 'checkbox') {
          if (!response.options || response.options.length === 0) return false
        } else {
          if (!response.text) return false
        }
      }
    }
    return true
  }

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateResponses()) {
      setError('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Format responses for API
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
        // Generate checklist items for purchased products
        const storedData = sessionStorage.getItem(`checkout_${clientId}_${tier}`)
        if (storedData) {
          const parsed = JSON.parse(storedData)
          const productIds = parsed.items?.map((item: { productId: string }) => item.productId).filter(Boolean) || []

          if (productIds.length > 0) {
            await fetch(`/api/admin/clients/${clientId}/checklist`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productIds }),
            })
          }
        }

        // Clear session storage
        sessionStorage.removeItem(`checkout_${clientId}_${tier}`)

        // Redirect to success page
        router.push(`/admin/checkout/${clientId}/success?tier=${tier}&amount=${amount}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to save responses')
      }
    } catch (err) {
      console.error('Failed to submit form:', err)
      setError('Failed to submit form')
    } finally {
      setSubmitting(false)
    }
  }

  // Skip onboarding form
  const handleSkip = () => {
    sessionStorage.removeItem(`checkout_${clientId}_${tier}`)
    router.push(`/admin/checkout/${clientId}/success?tier=${tier}&amount=${amount}`)
  }

  // Render the actual input based on question type
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
            required={question.isRequired}
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
            required={question.isRequired}
          />
        )

      case 'select':
        return (
          <select
            className="form-input"
            value={response?.text || ''}
            onChange={(e) => handleSingleOptionChange(question.id, e.target.value)}
            required={question.isRequired}
          >
            <option value="">Select an option</option>
            {question.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )

      case 'radio':
        return (
          <div className="radio-group">
            {question.options?.map((opt) => (
              <label key={opt} className="radio-label">
                <input
                  type="radio"
                  name={question.id}
                  value={opt}
                  checked={response?.text === opt}
                  onChange={(e) => handleSingleOptionChange(question.id, e.target.value)}
                  required={question.isRequired}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        )

      case 'checkbox':
      case 'multiselect':
        return (
          <div className="checkbox-group">
            {question.options?.map((opt) => (
              <label key={opt} className="checkbox-label">
                <input
                  type="checkbox"
                  value={opt}
                  checked={response?.options?.includes(opt) || false}
                  onChange={(e) => handleMultiOptionChange(question.id, opt, e.target.checked)}
                />
                <span>{opt}</span>
              </label>
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
            required={question.isRequired}
          />
        )
    }
  }

  // Render input with optional help media (video and/or image)
  const renderInput = (question: Question) => {
    return (
      <div className="question-input-wrapper">
        {question.videoUrl && (
          <div className="help-video">
            <div className="help-video-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
              <span>Watch this video for help</span>
            </div>
            <div className="video-embed">
              <iframe
                src={question.videoUrl}
                width="100%"
                height="240"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
        {question.imageUrl && (
          <div className="help-image">
            <div className="help-image-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <span>Reference image</span>
            </div>
            <img src={question.imageUrl} alt="Help image" className="help-image-img" />
          </div>
        )}
        {renderInputField(question)}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="onboarding-page">
        <div className="onboarding-container">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    // No questions configured, skip to success
    router.push(`/admin/checkout/${clientId}/success?tier=${tier}&amount=${amount}`)
    return null
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <div className="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="32" height="32">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h1>Payment Successful!</h1>
          <p>Just a few quick questions to help us get started</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {Object.entries(groupedQuestions).map(([section, sectionQuestions]) => (
            <div key={section} className="form-section">
              <h2 className="section-title">{section}</h2>
              {sectionQuestions.map((question) => (
                <div key={question.id} className="form-group">
                  <label>
                    {question.questionText}
                    {question.isRequired && <span className="required">*</span>}
                  </label>
                  {renderInput(question)}
                  {question.helpText && (
                    <span className="form-hint">{question.helpText}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleSkip}
              disabled={submitting}
            >
              Skip for now
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .onboarding-page {
          min-height: 100vh;
          background: var(--bg-primary);
          padding: 2rem;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .onboarding-container {
          max-width: 600px;
          width: 100%;
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .onboarding-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--success-bg);
          color: var(--success-text);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }
        .onboarding-header h1 {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
        }
        .onboarding-header p {
          color: var(--text-secondary);
          margin: 0;
        }
        .error-message {
          background: var(--error-bg);
          color: var(--error-text);
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }
        .form-section {
          margin-bottom: 2rem;
        }
        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border-color);
        }
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
        }
        .required {
          color: var(--error-text);
          margin-left: 0.25rem;
        }
        .form-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 1rem;
        }
        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        textarea.form-input {
          resize: vertical;
          min-height: 100px;
        }
        .form-hint {
          display: block;
          font-size: 0.813rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }
        .radio-group,
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .radio-label,
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          font-weight: normal;
        }
        .radio-label input,
        .checkbox-label input {
          width: 18px;
          height: 18px;
        }
        .form-actions {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }
        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }
        .btn-primary {
          background: var(--primary);
          color: white;
        }
        .btn-primary:hover {
          background: var(--primary-hover);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn-secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }
        .btn-secondary:hover {
          background: var(--bg-tertiary);
        }
        .loading-state {
          text-align: center;
          padding: 3rem;
          color: var(--text-secondary);
        }
        .question-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .help-video {
          background: #F0F9FF;
          border: 1px solid #BAE6FD;
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .help-video-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0369A1;
          font-size: 0.813rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }
        .help-video-label svg {
          flex-shrink: 0;
        }
        .video-embed {
          border-radius: 8px;
          overflow: hidden;
          background: #000;
        }
        .video-embed iframe {
          display: block;
        }
        .help-image {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          border-radius: 8px;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .help-image-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #15803D;
          font-size: 0.813rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
        }
        .help-image-label svg {
          flex-shrink: 0;
        }
        .help-image-img {
          max-width: 100%;
          border-radius: 8px;
          display: block;
        }
      `}</style>
    </div>
  )
}
