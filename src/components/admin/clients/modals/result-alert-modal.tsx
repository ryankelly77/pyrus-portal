'use client'

import { useState } from 'react'
import { type KeywordRow, type ResultAlertType } from '@/types'

// ============================================================================
// TYPES
// ============================================================================

interface ResultAlertModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  clientEmail: string | null
  onSuccess: (message: string) => void
  onError: (message: string) => void
  onSent: () => void // Called after successful send to refresh communications
}

interface AlertTypeConfig {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
  defaultSubject: string
  placeholder: string
}

// ============================================================================
// ALERT TYPE CONFIGURATIONS
// ============================================================================

const alertTypes: Record<ResultAlertType, AlertTypeConfig> = {
  ranking: {
    label: 'Keyword Ranking',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="11" y1="8" x2="11" y2="14"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
    ),
    color: '#10B981',
    bgColor: '#D1FAE5',
    defaultSubject: 'Your Keywords Are Climbing!',
    placeholder: 'e.g., Your keyword "wound care san antonio" jumped from #24 to #7 this month!',
  },
  traffic: {
    label: 'Traffic Milestone',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    defaultSubject: 'Traffic Milestone Reached!',
    placeholder: 'e.g., Your website just hit 3,000 monthly visitors - up 45% from last month!',
  },
  leads: {
    label: 'Lead Increase',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <line x1="19" y1="8" x2="19" y2="14"></line>
        <line x1="22" y1="11" x2="16" y2="11"></line>
      </svg>
    ),
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    defaultSubject: 'New Lead Alert!',
    placeholder: 'e.g., Great news! You received 12 new leads this week through your Google Ads campaign.',
  },
  milestone: {
    label: 'Campaign Milestone',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <circle cx="12" cy="8" r="7"></circle>
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
      </svg>
    ),
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    defaultSubject: 'Campaign Milestone Achieved!',
    placeholder: 'e.g., Your Google Ads campaign just completed its first 90 days with a 3.2x ROI!',
  },
  other: {
    label: 'Other Update',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    ),
    color: '#DB2777',
    bgColor: '#FDF2F8',
    defaultSubject: 'Marketing Update',
    placeholder: 'Write a custom message about the results you want to share...',
  },
  ai: {
    label: 'AI Alert',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"></path>
        <path d="M20 3v4"></path>
        <path d="M22 5h-4"></path>
        <path d="M4 17v2"></path>
        <path d="M5 18H3"></path>
      </svg>
    ),
    color: '#06B6D4',
    bgColor: '#CFFAFE',
    defaultSubject: 'AI Insights for Your Business',
    placeholder: 'e.g., Our AI analysis identified 3 new keyword opportunities that could increase your traffic by 25%.',
  },
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ResultAlertModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  clientEmail,
  onSuccess,
  onError,
  onSent,
}: ResultAlertModalProps) {
  // Form state
  const [alertType, setAlertType] = useState<ResultAlertType>('ranking')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Optional structured data
  const [keywords, setKeywords] = useState<KeywordRow[]>([{ keyword: '', newPosition: '', prevPosition: '' }])
  const [milestone, setMilestone] = useState('')

  // Helper to update a specific keyword row
  const updateKeywordRow = (index: number, field: keyof KeywordRow, value: string) => {
    setKeywords(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  // Add a new keyword row
  const addKeywordRow = () => {
    setKeywords(prev => [...prev, { keyword: '', newPosition: '', prevPosition: '' }])
  }

  // Remove a keyword row
  const removeKeywordRow = (index: number) => {
    setKeywords(prev => prev.filter((_, i) => i !== index))
  }

  // Reset form
  const resetForm = () => {
    setAlertType('ranking')
    setSubject('')
    setMessage('')
    setKeywords([{ keyword: '', newPosition: '', prevPosition: '' }])
    setMilestone('')
  }

  // Handle close
  const handleClose = () => {
    resetForm()
    onClose()
  }

  // Handle send
  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) return

    setIsSending(true)

    try {
      // Build metadata with optional structured data
      const metadata: Record<string, unknown> = {
        alertType: alertType,
        alertTypeLabel: alertTypes[alertType].label,
      }

      // Add keyword/position data if provided
      const validKeywords = keywords.filter(row => row.keyword.trim())
      if (validKeywords.length > 0) {
        metadata.keywords = validKeywords.map(row => ({
          keyword: row.keyword.trim(),
          newPosition: row.newPosition ? parseInt(row.newPosition) : null,
          previousPosition: row.prevPosition ? parseInt(row.prevPosition) : null,
        }))
        // Store first keyword in legacy format for backward compatibility
        const first = validKeywords[0]
        metadata.keyword = first.keyword.trim()
        if (first.newPosition) {
          metadata.newPosition = parseInt(first.newPosition)
        }
        if (first.prevPosition) {
          metadata.previousPosition = parseInt(first.prevPosition)
        }
      }

      // Add milestone data if provided
      if (milestone.trim()) {
        metadata.milestone = milestone.trim()
      }

      const res = await fetch(`/api/admin/clients/${clientId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'result_alert',
          title: subject,
          subject: subject,
          body: message,
          recipientEmail: clientEmail,
          highlightType: 'success',
          metadata,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send result alert')
      }

      // Success - close modal, reset form, notify parent
      handleClose()
      onSuccess(`Result alert sent to ${clientEmail}`)
      onSent()

    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to send result alert')
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay active" onClick={handleClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="modal-header-icon" style={{ background: alertTypes[alertType].bgColor, color: alertTypes[alertType].color }}>
              {alertTypes[alertType].icon}
            </div>
            <div>
              <h2 className="modal-title">Send Result Alert</h2>
              <p className="modal-subtitle">Share exciting marketing wins with {clientName}</p>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {/* Alert Type Selection */}
          <div className="form-group">
            <label className="form-label">What type of win are you sharing?</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
              {(Object.keys(alertTypes) as Array<ResultAlertType>).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAlertType(type)
                    if (!subject || Object.values(alertTypes).some(t => t.defaultSubject === subject)) {
                      setSubject(alertTypes[type].defaultSubject)
                    }
                    // Clear type-specific fields when switching
                    setKeywords([{ keyword: '', newPosition: '', prevPosition: '' }])
                    setMilestone('')
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 12px',
                    border: alertType === type ? `2px solid ${alertTypes[type].color}` : '2px solid var(--border-color)',
                    borderRadius: '12px',
                    background: alertType === type ? alertTypes[type].bgColor : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ color: alertTypes[type].color }}>
                    {alertTypes[type].icon}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: alertType === type ? 600 : 500,
                    color: alertType === type ? alertTypes[type].color : 'var(--text-secondary)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}>
                    {alertTypes[type].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Recipient</label>
              <input
                type="text"
                className="form-input"
                value={clientEmail || ''}
                disabled
                style={{ background: '#f9fafb' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Subject Line</label>
              <input
                type="text"
                className="form-input"
                placeholder={alertTypes[alertType].defaultSubject}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Keyword Rankings for ranking/traffic alerts */}
          {(alertType === 'ranking' || alertType === 'traffic') && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                  Keyword Rankings (Optional)
                </div>
                <button
                  type="button"
                  onClick={addKeywordRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#166534',
                    background: '#D1FAE5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  Add Keyword
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {keywords.map((row, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>Keyword</label>}
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., wound care san antonio"
                        value={row.keyword}
                        onChange={(e) => updateKeywordRow(index, 'keyword', e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>New Pos.</label>}
                      <input
                        type="number"
                        className="form-input"
                        placeholder="7"
                        value={row.newPosition}
                        onChange={(e) => updateKeywordRow(index, 'newPosition', e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      {index === 0 && <label className="form-label" style={{ fontSize: '11px' }}>Prev Pos.</label>}
                      <input
                        type="number"
                        className="form-input"
                        placeholder="24"
                        value={row.prevPosition}
                        onChange={(e) => updateKeywordRow(index, 'prevPosition', e.target.value)}
                        style={{ fontSize: '13px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKeywordRow(index)}
                      disabled={keywords.length === 1}
                      style={{
                        width: '32px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: '1px solid #E5E7EB',
                        borderRadius: '6px',
                        cursor: keywords.length === 1 ? 'not-allowed' : 'pointer',
                        opacity: keywords.length === 1 ? 0.4 : 1,
                        color: '#6B7280',
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Milestone field for milestone alerts */}
          {alertType === 'milestone' && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400E', marginBottom: '12px' }}>
                Highlight Box (Optional)
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Milestone Achievement</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., 10,000 Monthly Visitors!"
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Highlight field for leads alerts */}
          {alertType === 'leads' && (
            <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginBottom: '12px' }}>
                Highlight Box (Optional)
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Lead Highlight</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., 15 New Leads This Week!"
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Highlight field for other alerts */}
          {alertType === 'other' && (
            <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#9D174D', marginBottom: '12px' }}>
                Highlight Box (Optional)
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>Highlight Text</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Campaign Launch Complete!"
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          {/* Highlight field for AI alerts */}
          {alertType === 'ai' && (
            <div style={{ background: '#ECFEFF', border: '1px solid #A5F3FC', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#0E7490', marginBottom: '12px' }}>
                Highlight Box (Optional)
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '12px' }}>AI Insight</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., 3 New Keyword Opportunities Identified"
                  value={milestone}
                  onChange={(e) => setMilestone(e.target.value)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className="form-textarea"
              placeholder={alertTypes[alertType].placeholder}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Preview Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '8px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email Preview
            </div>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid var(--border-color)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: alertTypes[alertType].bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: alertTypes[alertType].color,
                }}>
                  {alertTypes[alertType].icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                    {subject || alertTypes[alertType].defaultSubject}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    From: Pyrus Digital Media
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {message || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Your message will appear here...</span>}
              </div>

              {/* Preview highlight box */}
              {(keywords.some(row => row.keyword.trim()) || milestone) && (
                <div style={{
                  marginTop: '16px',
                  padding: '14px 16px',
                  background: `linear-gradient(135deg, ${alertTypes[alertType].bgColor} 0%, ${alertTypes[alertType].bgColor}dd 100%)`,
                  borderLeft: `4px solid ${alertTypes[alertType].color}`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: alertTypes[alertType].color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ transform: 'scale(0.75)' }}>
                      {alertTypes[alertType].icon}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {keywords.filter(row => row.keyword.trim()).map((row, idx) => (
                      <div key={idx} style={{ marginBottom: idx < keywords.filter(r => r.keyword.trim()).length - 1 ? '12px' : 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                          &quot;{row.keyword}&quot; — Now Position #{row.newPosition || '?'}
                        </div>
                        {row.prevPosition && row.newPosition && (
                          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Moved from position #{row.prevPosition} to #{row.newPosition} (up {parseInt(row.prevPosition) - parseInt(row.newPosition)} spots!)
                            {parseInt(row.newPosition) <= 10 && ' - First page visibility achieved'}
                          </div>
                        )}
                      </div>
                    ))}
                    {milestone && (
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {milestone}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !message.trim()}
            style={{ background: alertTypes[alertType].color }}
          >
            {isSending ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }}></span>
                Sending...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Send {alertTypes[alertType].label} Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
