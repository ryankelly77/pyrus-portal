'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateCodeEditor, SimpleTextEditor } from './template-code-editor'
import { VariablePanel } from './variable-panel'
import { TemplatePreview } from './template-preview'
import { VersionHistoryModal } from './version-history-modal'
import { TestEmailModal } from './test-email-modal'

interface TemplateVariable {
  key: string
  description: string
  example: string
}

interface EmailTemplate {
  id: string
  slug: string
  name: string
  description: string | null
  triggerEvent: string
  triggerDescription: string | null
  recipientType: string
  subjectTemplate: string
  bodyHtml: string
  bodyText: string | null
  availableVariables: TemplateVariable[]
  isActive: boolean
  isSystem: boolean
  category: {
    id: string
    slug: string
    name: string
  } | null
}

interface EmailTemplateFormProps {
  template: EmailTemplate
  userEmail: string
}

export function EmailTemplateForm({ template, userEmail }: EmailTemplateFormProps) {
  const router = useRouter()

  // Form state
  const [description, setDescription] = useState(template.description || '')
  const [subjectTemplate, setSubjectTemplate] = useState(template.subjectTemplate)
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml)
  const [bodyText, setBodyText] = useState(template.bodyText || '')
  const [isActive, setIsActive] = useState(template.isActive)

  // Track saved values for dirty comparison
  const [savedValues, setSavedValues] = useState({
    description: template.description || '',
    subjectTemplate: template.subjectTemplate,
    bodyHtml: template.bodyHtml,
    bodyText: template.bodyText || '',
    isActive: template.isActive,
  })

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showTestEmail, setShowTestEmail] = useState(false)
  const [editorMode, setEditorMode] = useState<'code' | 'rich'>('code')

  // Track dirty state
  const isDirty = useMemo(() => {
    return (
      description !== savedValues.description ||
      subjectTemplate !== savedValues.subjectTemplate ||
      bodyHtml !== savedValues.bodyHtml ||
      bodyText !== savedValues.bodyText ||
      isActive !== savedValues.isActive
    )
  }, [description, subjectTemplate, bodyHtml, bodyText, isActive, savedValues])

  // Warn on unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Get recipient badge styling
  const getRecipientBadge = (recipientType: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      user: { bg: '#DBEAFE', color: '#1E40AF', label: 'User' },
      client: { bg: '#D1FAE5', color: '#065F46', label: 'Client' },
      admin: { bg: '#FEE2E2', color: '#991B1B', label: 'Admin' },
      prospect: { bg: '#FEF3C7', color: '#92400E', label: 'Prospect' },
      any: { bg: '#E5E7EB', color: '#374151', label: 'Any' },
    }
    return styles[recipientType] || styles.any
  }

  const recipientBadge = getRecipientBadge(template.recipientType)

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/admin/email-templates/${template.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          subjectTemplate,
          bodyHtml,
          bodyText: bodyText || null,
          isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setSaveError(data.error || 'Failed to save template')
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)

      // Update saved values to reset dirty state
      setSavedValues({
        description,
        subjectTemplate,
        bodyHtml,
        bodyText: bodyText || '',
        isActive,
      })
    } catch (err) {
      setSaveError('Failed to save template')
      console.error(err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle restore from version history
  const handleRestore = useCallback((version: any) => {
    setSubjectTemplate(version.subjectTemplate)
    setBodyHtml(version.bodyHtml)
    setBodyText(version.bodyText || '')
  }, [])

  // Generate plain text from HTML
  const handleGenerateText = () => {
    // Simple HTML to text conversion
    const text = bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    setBodyText(text)
  }

  // Handle back navigation
  const handleBack = () => {
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push('/admin/emails')
      }
    } else {
      router.push('/admin/emails')
    }
  }

  return (
    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
      {/* Left Column - Editing */}
      <div style={{ flex: '1 1 58%', minWidth: '400px' }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Email Templates
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: 'var(--text-primary)' }}>
              {template.name}
            </h1>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {template.isSystem && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    background: '#E5E7EB',
                    color: '#374151',
                  }}
                >
                  System
                </span>
              )}
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: isActive ? '#DEF7EC' : '#FDE8E8',
                  color: isActive ? '#03543F' : '#9B1C1C',
                }}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Active toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Active</span>
            <div
              onClick={() => setIsActive(!isActive)}
              style={{
                position: 'relative',
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: isActive ? 'var(--pyrus-brown)' : '#D1D5DB',
                transition: 'background-color 0.2s',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: isActive ? '22px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </label>
        </div>

        {/* Description */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this template..."
            rows={2}
            style={{ resize: 'vertical' }}
          />
        </div>

        {/* Trigger Info */}
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Trigger Info
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '14px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Event:</span>
            <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{template.triggerEvent}</code>

            <span style={{ color: 'var(--text-secondary)' }}>When:</span>
            <span style={{ color: 'var(--text-primary)' }}>{template.triggerDescription || '-'}</span>

            <span style={{ color: 'var(--text-secondary)' }}>Recipient:</span>
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: recipientBadge.bg,
                color: recipientBadge.color,
                width: 'fit-content',
              }}
            >
              {recipientBadge.label}
            </span>
          </div>
        </div>

        {/* Subject Line */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Subject Line</label>
          <input
            type="text"
            className="form-control"
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            placeholder="Email subject..."
            maxLength={500}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', textAlign: 'right' }}>
            {subjectTemplate.length}/500
          </div>
        </div>

        {/* HTML Body */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>HTML Body</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setEditorMode('code')}
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px 0 0 4px',
                  background: editorMode === 'code' ? 'var(--pyrus-brown)' : 'white',
                  color: editorMode === 'code' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Code
              </button>
              <button
                onClick={() => setEditorMode('rich')}
                disabled
                title="Rich text editor coming soon"
                style={{
                  padding: '4px 12px',
                  fontSize: '12px',
                  border: '1px solid var(--border-color)',
                  borderLeft: 'none',
                  borderRadius: '0 4px 4px 0',
                  background: editorMode === 'rich' ? 'var(--pyrus-brown)' : 'white',
                  color: editorMode === 'rich' ? 'white' : 'var(--text-secondary)',
                  cursor: 'not-allowed',
                  fontWeight: 500,
                  opacity: 0.5,
                }}
              >
                Rich
              </button>
            </div>
          </div>
          <TemplateCodeEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            language="html"
            height={400}
          />
        </div>

        {/* Plain Text Body */}
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Plain Text Body</label>
            <button
              onClick={handleGenerateText}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                background: 'white',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Generate from HTML
            </button>
          </div>
          <SimpleTextEditor
            value={bodyText}
            onChange={setBodyText}
            placeholder="Plain text version (optional but recommended for accessibility)..."
            rows={8}
          />
        </div>

        {/* Save Error */}
        {saveError && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              backgroundColor: '#FDE8E8',
              color: '#9B1C1C',
              fontSize: '14px',
            }}
          >
            {saveError}
          </div>
        )}

        {/* Save Success */}
        {saveSuccess && (
          <div
            style={{
              padding: '12px 16px',
              marginBottom: '16px',
              borderRadius: '8px',
              backgroundColor: '#DEF7EC',
              color: '#03543F',
              fontSize: '14px',
            }}
          >
            Template saved successfully!
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={handleBack}
          >
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-outline"
              onClick={() => setShowTestEmail(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M22 2L11 13"></path>
                <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
              </svg>
              Send Test
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Reference & Preview */}
      <div style={{ flex: '1 1 38%', minWidth: '350px' }}>
        {/* Variables Panel */}
        <div style={{ marginBottom: '24px' }}>
          <VariablePanel variables={template.availableVariables || []} />
        </div>

        {/* Preview */}
        <div style={{ marginBottom: '24px' }}>
          <TemplatePreview
            subject={subjectTemplate}
            bodyHtml={bodyHtml}
            bodyText={bodyText}
            variables={template.availableVariables || []}
          />
        </div>

        {/* Version History Button */}
        <button
          onClick={() => setShowVersionHistory(true)}
          style={{
            width: '100%',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          View History
        </button>
      </div>

      {/* Modals */}
      <VersionHistoryModal
        slug={template.slug}
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        onRestore={handleRestore}
      />

      <TestEmailModal
        slug={template.slug}
        variables={template.availableVariables || []}
        defaultEmail={userEmail}
        isOpen={showTestEmail}
        onClose={() => setShowTestEmail(false)}
      />
    </div>
  )
}
