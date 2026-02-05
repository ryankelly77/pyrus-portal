'use client'

import { useState } from 'react'

type Direction = 'inbound' | 'outbound'
type Channel = 'email' | 'sms' | 'chat' | 'call' | 'other'

interface CommunicationLogFormProps {
  recommendationId: string
  onSaved?: () => void
  onCancel?: () => void
}

const CHANNEL_OPTIONS: { value: Channel; label: string; icon: string }[] = [
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'sms', label: 'SMS', icon: '💬' },
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'chat', label: 'Chat', icon: '💭' },
  { value: 'other', label: 'Other', icon: '📋' },
]

function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function CommunicationLogForm({
  recommendationId,
  onSaved,
  onCancel,
}: CommunicationLogFormProps) {
  const [direction, setDirection] = useState<Direction>('inbound')
  const [channel, setChannel] = useState<Channel>('email')
  const [contactAt, setContactAt] = useState(formatDateTimeLocal(new Date()))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(
        `/api/admin/recommendations/${recommendationId}/communications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction,
            channel,
            contactAt: new Date(contactAt).toISOString(),
            notes: notes.trim() || undefined,
          }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log communication')
      }

      // Reset form
      setDirection('inbound')
      setChannel('email')
      setContactAt(formatDateTimeLocal(new Date()))
      setNotes('')

      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log communication')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="comm-log-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h4>Log Communication</h4>
        {onCancel && (
          <button type="button" className="btn-close" onClick={onCancel}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="form-fields">
        {/* Direction */}
        <div className="field-group">
          <label className="field-label">Direction</label>
          <div className="direction-toggle">
            <button
              type="button"
              className={`direction-btn ${direction === 'inbound' ? 'selected' : ''}`}
              onClick={() => setDirection('inbound')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              <span>Inbound</span>
              <span className="direction-hint">They contacted us</span>
            </button>
            <button
              type="button"
              className={`direction-btn ${direction === 'outbound' ? 'selected' : ''}`}
              onClick={() => setDirection('outbound')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              <span>Outbound</span>
              <span className="direction-hint">We contacted them</span>
            </button>
          </div>
        </div>

        {/* Channel */}
        <div className="field-group">
          <label className="field-label">Channel</label>
          <div className="channel-options">
            {CHANNEL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`channel-btn ${channel === opt.value ? 'selected' : ''}`}
                onClick={() => setChannel(opt.value)}
              >
                <span className="channel-icon">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Date/Time */}
        <div className="field-group">
          <label className="field-label" htmlFor="contactAt">Date &amp; Time</label>
          <input
            type="datetime-local"
            id="contactAt"
            className="field-input"
            value={contactAt}
            onChange={(e) => setContactAt(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="field-group">
          <label className="field-label" htmlFor="notes">Notes (optional)</label>
          <textarea
            id="notes"
            className="field-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g., Discussed pricing, they want to loop in their partner..."
            rows={2}
          />
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-save" disabled={saving}>
          {saving ? 'Logging...' : 'Log Communication'}
        </button>
      </div>

      <style jsx>{`
        .comm-log-form {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .btn-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #F3F4F6;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.15s ease;
        }

        .btn-close:hover {
          background: #E5E7EB;
          color: #374151;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .direction-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .direction-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px;
          background: #F9FAFB;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .direction-btn:hover {
          background: #F3F4F6;
        }

        .direction-btn.selected {
          border-color: #059669;
          background: #ECFDF5;
        }

        .direction-btn span {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        .direction-hint {
          font-size: 11px !important;
          font-weight: 400 !important;
          color: #6B7280 !important;
        }

        .channel-options {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .channel-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: #F9FAFB;
          border: 2px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .channel-btn:hover {
          background: #F3F4F6;
        }

        .channel-btn.selected {
          border-color: #059669;
          background: #ECFDF5;
        }

        .channel-icon {
          font-size: 14px;
        }

        .field-input,
        .field-textarea {
          padding: 10px 12px;
          font-size: 14px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: white;
          color: #111827;
          transition: border-color 0.15s ease;
        }

        .field-input:focus,
        .field-textarea:focus {
          outline: none;
          border-color: #059669;
          box-shadow: 0 0 0 2px rgba(5, 150, 105, 0.1);
        }

        .field-textarea {
          resize: vertical;
          min-height: 60px;
        }

        .form-error {
          margin-top: 12px;
          padding: 10px 12px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 8px;
          color: #DC2626;
          font-size: 13px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #E5E7EB;
        }

        .btn-cancel {
          padding: 10px 16px;
          background: white;
          color: #374151;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-cancel:hover {
          background: #F9FAFB;
          border-color: #D1D5DB;
        }

        .btn-save {
          padding: 10px 16px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-save:hover:not(:disabled) {
          background: #047857;
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  )
}
