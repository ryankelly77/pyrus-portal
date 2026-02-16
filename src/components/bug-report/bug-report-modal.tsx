'use client'

import { useState, useEffect } from 'react'
import { getDiagnosticLogs } from '@/hooks/use-diagnostic-capture'
import './bug-report.css'

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [expectedBehavior, setExpectedBehavior] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Auto-captured info
  const [pageUrl, setPageUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [userAgent, setUserAgent] = useState('')
  const [screenSize, setScreenSize] = useState('')
  const [consoleLogs, setConsoleLogs] = useState('')

  // Capture browser info when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      setPageUrl(window.location.href)
      setPageTitle(document.title)
      setUserAgent(navigator.userAgent)
      setScreenSize(`${window.innerWidth}x${window.innerHeight}`)
      setConsoleLogs(getDiagnosticLogs())
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('')
      setDescription('')
      setStepsToReproduce('')
      setExpectedBehavior('')
      setError(null)
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageUrl,
          pageTitle,
          userAgent,
          screenSize,
          title,
          description,
          stepsToReproduce: stepsToReproduce || undefined,
          expectedBehavior: expectedBehavior || undefined,
          consoleLogs: consoleLogs || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit bug report')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit bug report')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="bug-report-overlay" onClick={onClose}>
      <div className="bug-report-modal" onClick={e => e.stopPropagation()}>
        <div className="bug-report-header">
          <h2>Report a Bug</h2>
          <button className="bug-report-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="bug-report-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>Bug report submitted successfully!</p>
            <p className="bug-report-success-sub">Thank you for helping us improve.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bug-report-form">
            {error && <div className="bug-report-error">{error}</div>}

            <div className="bug-report-field">
              <label htmlFor="bug-title">
                Title <span className="required">*</span>
              </label>
              <input
                id="bug-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Brief summary of the issue"
                required
                maxLength={200}
              />
            </div>

            <div className="bug-report-field">
              <label htmlFor="bug-description">
                What happened? <span className="required">*</span>
              </label>
              <textarea
                id="bug-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the bug in detail"
                required
                rows={4}
              />
            </div>

            <div className="bug-report-field">
              <label htmlFor="bug-steps">Steps to reproduce (optional)</label>
              <textarea
                id="bug-steps"
                value={stepsToReproduce}
                onChange={e => setStepsToReproduce(e.target.value)}
                placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                rows={3}
              />
            </div>

            <div className="bug-report-field">
              <label htmlFor="bug-expected">Expected behavior (optional)</label>
              <textarea
                id="bug-expected"
                value={expectedBehavior}
                onChange={e => setExpectedBehavior(e.target.value)}
                placeholder="What should have happened instead?"
                rows={2}
              />
            </div>

            <details className="bug-report-captured">
              <summary>Auto-captured info</summary>
              <div className="bug-report-captured-content">
                <div className="captured-item">
                  <span className="captured-label">Page:</span>
                  <span className="captured-value">{pageUrl}</span>
                </div>
                <div className="captured-item">
                  <span className="captured-label">Browser:</span>
                  <span className="captured-value">{userAgent.slice(0, 100)}...</span>
                </div>
                <div className="captured-item">
                  <span className="captured-label">Screen:</span>
                  <span className="captured-value">{screenSize}</span>
                </div>
                {consoleLogs && (
                  <div className="captured-item captured-logs">
                    <span className="captured-label">Console errors:</span>
                    <pre className="captured-value">{consoleLogs.slice(0, 500)}{consoleLogs.length > 500 ? '...' : ''}</pre>
                  </div>
                )}
              </div>
            </details>

            <div className="bug-report-actions">
              <button type="button" className="bug-report-cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="bug-report-submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
