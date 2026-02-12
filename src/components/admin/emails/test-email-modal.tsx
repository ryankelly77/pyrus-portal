'use client'

import { useState } from 'react'

interface TemplateVariable {
  key: string
  description: string
  example: string
}

interface TestEmailModalProps {
  slug: string
  variables: TemplateVariable[]
  defaultEmail: string
  isOpen: boolean
  onClose: () => void
}

// Role options for admin invite template testing
const ADMIN_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'production_team', label: 'Production Team' },
  { value: 'sales', label: 'Sales' },
]

export function TestEmailModal({
  slug,
  variables,
  defaultEmail,
  isOpen,
  onClose,
}: TestEmailModalProps) {
  const [recipientEmail, setRecipientEmail] = useState(defaultEmail)
  const [testRole, setTestRole] = useState('admin')
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Show role selector only for admin invite template
  const showRoleSelector = slug === 'user-invite-admin'

  const handleSend = async () => {
    setIsSending(true)
    setResult(null)

    try {
      const body: Record<string, string> = { recipientEmail }
      if (showRoleSelector) {
        body.testRole = testRole
      }

      const res = await fetch(`/api/admin/email-templates/${slug}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Failed to send test email' })
        return
      }

      setResult({ success: true, message: data.message || 'Test email sent successfully!' })

      // Close modal after success
      setTimeout(() => {
        onClose()
        setResult(null)
      }, 2000)
    } catch (err) {
      setResult({ success: false, message: 'Failed to send test email' })
      console.error(err)
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay active"
      onClick={handleClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        <div className="modal-header">
          <h2>Send Test Email</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {result && (
            <div
              style={{
                padding: '12px 16px',
                marginBottom: '16px',
                borderRadius: '8px',
                backgroundColor: result.success ? '#DEF7EC' : '#FDE8E8',
                color: result.success ? '#03543F' : '#9B1C1C',
                fontSize: '14px',
              }}
            >
              {result.message}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Recipient Email</label>
            <input
              type="email"
              className="form-control"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="Enter email address"
              disabled={isSending}
            />
          </div>

          {showRoleSelector && (
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Test Role</label>
              <select
                className="form-control"
                value={testRole}
                onChange={(e) => setTestRole(e.target.value)}
                disabled={isSending}
              >
                {ADMIN_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Select a role to preview the dynamic "What You'll Get Access To" section
              </p>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--text-primary)' }}>
              Example Values Used
            </h4>
            <div
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '12px',
                maxHeight: '200px',
                overflow: 'auto',
              }}
            >
              {variables.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No variables in this template
                </p>
              ) : (
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <tbody>
                    {variables.map((v) => (
                      <tr key={v.key}>
                        <td style={{ padding: '4px 8px 4px 0', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          <code style={{ fontFamily: 'monospace' }}>${'{'}
                            {v.key}
                            {'}'}</code>
                        </td>
                        <td style={{ padding: '4px 0', color: 'var(--text-primary)' }}>
                          {v.example}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            The test email subject will be prefixed with [TEST] to distinguish it from real emails.
          </p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose} disabled={isSending}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSend}
            disabled={isSending || !recipientEmail}
          >
            {isSending ? (
              'Sending...'
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                </svg>
                Send Test Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
