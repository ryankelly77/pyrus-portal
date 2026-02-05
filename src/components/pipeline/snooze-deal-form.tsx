'use client'

import { useState } from 'react'

interface SnoozeDealFormProps {
  recommendationId: string
  currentSnooze?: {
    snoozed_until: string
    reason: string | null
  } | null
  onUpdate: () => void
}

const QUICK_OPTIONS = [
  { label: '2 Weeks', days: 14 },
  { label: '30 Days', days: 30 },
  { label: '60 Days', days: 60 },
  { label: '90 Days', days: 90 },
]

function addDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDaysRemaining(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
}

export function SnoozeDealForm({
  recommendationId,
  currentSnooze,
  onUpdate,
}: SnoozeDealFormProps) {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSnoozed = currentSnooze && new Date(currentSnooze.snoozed_until) > new Date()
  const daysRemaining = isSnoozed ? getDaysRemaining(currentSnooze.snoozed_until) : 0

  const handleQuickSelect = (days: number) => {
    setSelectedDate(addDays(days))
  }

  const handleSnooze = async () => {
    if (!selectedDate) {
      setError('Please select a date')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/recommendations/${recommendationId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snoozed_until: new Date(selectedDate).toISOString(),
          reason: reason.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to snooze deal')
      }

      setSelectedDate('')
      setReason('')
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to snooze deal')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSnooze = async () => {
    setCancelling(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/recommendations/${recommendationId}/snooze`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel snooze')
      }

      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel snooze')
    } finally {
      setCancelling(false)
    }
  }

  // Show snoozed state
  if (isSnoozed) {
    return (
      <div className="snooze-banner">
        <div className="snooze-icon">😴</div>
        <div className="snooze-info">
          <div className="snooze-title">
            Deal Snoozed for {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </div>
          <div className="snooze-until">
            Until {formatDate(currentSnooze.snoozed_until)}
          </div>
          {currentSnooze.reason && (
            <div className="snooze-reason">{currentSnooze.reason}</div>
          )}
        </div>
        <button
          className="btn-cancel-snooze"
          onClick={handleCancelSnooze}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Snooze'}
        </button>

        {error && <div className="snooze-error">{error}</div>}

        <style jsx>{`
          .snooze-banner {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            background: #FEF3C7;
            border: 1px solid #FDE68A;
            border-radius: 8px;
          }

          .snooze-icon {
            font-size: 24px;
          }

          .snooze-info {
            flex: 1;
          }

          .snooze-title {
            font-size: 14px;
            font-weight: 600;
            color: #92400E;
          }

          .snooze-until {
            font-size: 12px;
            color: #B45309;
            margin-top: 2px;
          }

          .snooze-reason {
            font-size: 12px;
            color: #78350F;
            margin-top: 4px;
            font-style: italic;
          }

          .btn-cancel-snooze {
            padding: 6px 12px;
            background: white;
            border: 1px solid #FDE68A;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            color: #92400E;
            cursor: pointer;
            transition: all 0.15s ease;
            white-space: nowrap;
          }

          .btn-cancel-snooze:hover:not(:disabled) {
            background: #FEF3C7;
            border-color: #F59E0B;
          }

          .btn-cancel-snooze:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .snooze-error {
            width: 100%;
            margin-top: 8px;
            padding: 8px 12px;
            background: #FEF2F2;
            border: 1px solid #FECACA;
            border-radius: 6px;
            color: #DC2626;
            font-size: 12px;
          }
        `}</style>
      </div>
    )
  }

  // Show snooze form directly
  return (
    <div className="snooze-container">
      <div className="snooze-form">
        <p className="form-description">
          Pause penalty accumulation until a future date. Score will resume from zero penalties when snooze expires.
        </p>

        <div className="quick-select">
          {QUICK_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              type="button"
              className={`quick-btn ${selectedDate === addDays(opt.days) ? 'selected' : ''}`}
              onClick={() => handleQuickSelect(opt.days)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="custom-date">
          <label>Or pick a custom date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="reason-field">
          <label>Reason (optional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this deal pausing?"
            maxLength={200}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button
            type="button"
            className="btn-confirm"
            onClick={handleSnooze}
            disabled={!selectedDate || saving}
          >
            {saving ? 'Snoozing...' : 'Snooze Deal'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .snooze-form {
          padding: 0;
        }

        .form-description {
          font-size: 12px;
          color: #6B7280;
          margin: 0 0 16px 0;
          line-height: 1.5;
        }

        .quick-select {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 16px;
        }

        .quick-btn {
          padding: 8px 4px;
          background: #F3F4F6;
          border: 2px solid transparent;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .quick-btn:hover {
          background: #E5E7EB;
        }

        .quick-btn.selected {
          background: #ECFDF5;
          border-color: #059669;
          color: #059669;
        }

        .custom-date {
          margin-bottom: 12px;
        }

        .custom-date label,
        .reason-field label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
        }

        .custom-date input,
        .reason-field input {
          width: 100%;
          padding: 8px 12px;
          background: #F9FAFB;
          border: 1px solid #D1D5DB;
          border-radius: 6px;
          font-size: 13px;
          color: #111827;
        }

        .custom-date input:focus,
        .reason-field input:focus {
          outline: none;
          border-color: #059669;
          background: white;
        }

        .reason-field {
          margin-bottom: 16px;
        }

        .reason-field input::placeholder {
          color: #9CA3AF;
        }

        .form-error {
          margin-bottom: 12px;
          padding: 8px 12px;
          background: #FEF2F2;
          border: 1px solid #FECACA;
          border-radius: 6px;
          color: #DC2626;
          font-size: 12px;
        }

        .form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .btn-confirm {
          padding: 8px 16px;
          background: #059669;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-confirm:hover:not(:disabled) {
          background: #047857;
        }

        .btn-confirm:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
