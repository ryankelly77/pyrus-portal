'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { TemplateCodeEditor, SimpleTextEditor } from '@/components/admin/emails/template-code-editor'
import { TemplatePreview } from '@/components/admin/emails/template-preview'

interface Category {
  id: string
  slug: string
  name: string
}

interface CloneSourceTemplate {
  name: string
  description: string | null
  recipientType: string
  triggerEvent: string
  triggerDescription: string | null
  subjectTemplate: string
  bodyHtml: string
  bodyText: string | null
  isActive: boolean
  category: { id: string } | null
}

const recipientTypes = [
  { value: 'user', label: 'User' },
  { value: 'client', label: 'Client' },
  { value: 'admin', label: 'Admin' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'any', label: 'Any' },
]

export default function NewEmailTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cloneSlug = searchParams.get('clone')
  const { user, hasNotifications } = useUserProfile()

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [recipientType, setRecipientType] = useState('any')
  const [triggerEvent, setTriggerEvent] = useState('manual')
  const [triggerDescription, setTriggerDescription] = useState('')
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [bodyHtml, setBodyHtml] = useState(defaultHtmlTemplate)
  const [bodyText, setBodyText] = useState('')
  const [isActive, setIsActive] = useState(true)

  // UI state
  const [categories, setCategories] = useState<Category[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'code' | 'rich'>('code')
  const [isLoadingClone, setIsLoadingClone] = useState(!!cloneSlug)
  const [cloneSourceName, setCloneSourceName] = useState<string | null>(null)

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/email-templates')
        if (res.ok) {
          const data = await res.json()
          setCategories(data.categories.map((c: any) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
          })))
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err)
      }
    }
    fetchCategories()
  }, [])

  // Fetch clone source template
  useEffect(() => {
    if (!cloneSlug) return

    async function fetchCloneSource() {
      try {
        const res = await fetch(`/api/admin/email-templates/${cloneSlug}`)
        if (res.ok) {
          const data: CloneSourceTemplate = await res.json()
          setCloneSourceName(data.name)
          setName(`${data.name} (Copy)`)
          setSlug(`${cloneSlug}-copy`)
          setSlugManuallyEdited(true)
          setDescription(data.description || '')
          setCategoryId(data.category?.id || '')
          setRecipientType(data.recipientType || 'any')
          setTriggerEvent(data.triggerEvent || 'manual')
          setTriggerDescription(data.triggerDescription || '')
          setSubjectTemplate(data.subjectTemplate || '')
          setBodyHtml(data.bodyHtml || defaultHtmlTemplate)
          setBodyText(data.bodyText || '')
          setIsActive(data.isActive)
        } else {
          setError('Failed to load source template for cloning')
        }
      } catch (err) {
        console.error('Failed to fetch clone source:', err)
        setError('Failed to load source template for cloning')
      } finally {
        setIsLoadingClone(false)
      }
    }
    fetchCloneSource()
  }, [cloneSlug])

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      setSlug(generatedSlug)
    }
  }, [name, slugManuallyEdited])

  // Validate slug on blur
  const handleSlugBlur = async () => {
    if (!slug) {
      setSlugError(null)
      return
    }

    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugPattern.test(slug)) {
      setSlugError('Slug must be lowercase with hyphens only')
      return
    }

    // Check uniqueness
    try {
      const res = await fetch(`/api/admin/email-templates/${slug}`)
      if (res.ok) {
        setSlugError('This slug is already in use')
      } else if (res.status === 404) {
        setSlugError(null)
      }
    } catch (err) {
      // Ignore network errors during validation
    }
  }

  // Handle slug change
  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    // Auto-format slug
    const formatted = value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
    setSlug(formatted)
    setSlugError(null)
  }

  // Generate plain text from HTML
  const handleGenerateText = () => {
    const text = bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '- ')
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

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!slug.trim()) {
      setError('Slug is required')
      return
    }
    if (slugError) {
      setError(slugError)
      return
    }
    if (!subjectTemplate.trim()) {
      setError('Subject is required')
      return
    }
    if (!bodyHtml.trim()) {
      setError('HTML body is required')
      return
    }

    setIsSaving(true)

    try {
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          categoryId: categoryId || null,
          recipientType,
          triggerEvent: triggerEvent.trim() || 'manual',
          triggerDescription: triggerDescription.trim() || null,
          subjectTemplate: subjectTemplate.trim(),
          bodyHtml,
          bodyText: bodyText.trim() || null,
          availableVariables: [],
          isActive,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create template')
      }

      // Redirect to edit page
      router.push(`/admin/emails/${data.template.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingClone) {
    return (
      <>
        <AdminHeader
          title=""
          user={user}
          hasNotifications={hasNotifications}
          breadcrumb={
            <div className="page-header-with-back">
              <Link href="/admin/emails" className="back-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
                Back to Emails
              </Link>
              <h1 className="page-title-inline">Clone Template</h1>
            </div>
          }
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading template...
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title=""
        user={user}
        hasNotifications={hasNotifications}
        breadcrumb={
          <div className="page-header-with-back">
            <Link href="/admin/emails" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Emails
            </Link>
            <h1 className="page-title-inline">
              {cloneSourceName ? `Clone: ${cloneSourceName}` : 'New Email Template'}
            </h1>
          </div>
        }
      />

      <div className="admin-content">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {/* Left Column - Main Fields */}
            <div style={{ flex: '1 1 58%', minWidth: '400px' }}>
              {/* Basic Info Card */}
              <div className="form-card" style={{ marginBottom: '24px' }}>
                <h3 className="form-card-title">Basic Information</h3>

                <div className="form-group">
                  <label className="form-label">
                    Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Welcome Email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Slug <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${slugError ? 'input-error' : ''}`}
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    onBlur={handleSlugBlur}
                    placeholder="e.g., welcome-email"
                  />
                  {slugError && (
                    <p style={{ color: 'var(--error-color)', fontSize: '12px', marginTop: '4px' }}>
                      {slugError}
                    </p>
                  )}
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    Unique identifier used in code. Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of when this template is used..."
                    rows={2}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Recipient Type</label>
                    <select
                      className="form-select"
                      value={recipientType}
                      onChange={(e) => setRecipientType(e.target.value)}
                    >
                      {recipientTypes.map((rt) => (
                        <option key={rt.value} value={rt.value}>
                          {rt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Trigger Info Card */}
              <div className="form-card" style={{ marginBottom: '24px' }}>
                <h3 className="form-card-title">Trigger Settings</h3>

                <div className="form-group">
                  <label className="form-label">Trigger Event</label>
                  <input
                    type="text"
                    className="form-input"
                    value={triggerEvent}
                    onChange={(e) => setTriggerEvent(e.target.value)}
                    placeholder="e.g., user_signup, order_complete, manual"
                  />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    The event that triggers this email. Use "manual" for templates sent manually.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Trigger Description</label>
                  <input
                    type="text"
                    className="form-input"
                    value={triggerDescription}
                    onChange={(e) => setTriggerDescription(e.target.value)}
                    placeholder="e.g., Sent when a new user signs up"
                  />
                </div>
              </div>

              {/* Email Content Card */}
              <div className="form-card" style={{ marginBottom: '24px' }}>
                <h3 className="form-card-title">Email Content</h3>

                <div className="form-group">
                  <label className="form-label">
                    Subject <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={subjectTemplate}
                    onChange={(e) => setSubjectTemplate(e.target.value)}
                    placeholder="e.g., Welcome to {{company_name}}, {{first_name}}!"
                  />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                    Use {'{{variable_name}}'} for dynamic content.
                  </p>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>
                      HTML Body <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
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
                        type="button"
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
                    height={350}
                  />
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Plain Text Body</label>
                    <button
                      type="button"
                      onClick={handleGenerateText}
                      className="btn btn-sm btn-outline"
                    >
                      Generate from HTML
                    </button>
                  </div>
                  <SimpleTextEditor
                    value={bodyText}
                    onChange={setBodyText}
                    placeholder="Plain text version for email clients that don't support HTML..."
                    rows={6}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  borderRadius: '8px',
                  backgroundColor: '#FDE8E8',
                  color: '#9B1C1C',
                  fontSize: '14px',
                }}>
                  {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href="/admin/emails" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Creating...' : 'Create Template'}
                </button>
              </div>
            </div>

            {/* Right Column - Preview & Settings */}
            <div style={{ flex: '1 1 38%', minWidth: '350px', position: 'sticky', top: '20px', alignSelf: 'flex-start' }}>
              {/* Status Card */}
              <div className="form-card" style={{ marginBottom: '24px' }}>
                <h3 className="form-card-title">Status</h3>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                }}>
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
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </label>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                  Inactive templates won't be sent automatically.
                </p>
              </div>

              {/* Live Preview */}
              <div style={{ marginBottom: '24px' }}>
                <TemplatePreview
                  subject={subjectTemplate}
                  bodyHtml={bodyHtml}
                  bodyText={bodyText}
                  variables={[
                    { key: 'first_name', description: 'Recipient first name', example: 'John' },
                    { key: 'company_name', description: 'Company name', example: 'Acme Inc' },
                    { key: 'current_year', description: 'Current year', example: new Date().getFullYear().toString() },
                    { key: 'logo_url', description: 'Pyrus logo URL', example: '/pyrus-logo.png' },
                  ]}
                />
              </div>

              {/* Help Card */}
              <div className="form-card" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="form-card-title">Variable Syntax</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                  Use double curly braces for dynamic content:
                </p>
                <code style={{
                  display: 'block',
                  padding: '8px 12px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  fontFamily: 'monospace',
                }}>
                  {'{{first_name}}'}, {'{{company_name}}'}, {'{{current_year}}'}
                </code>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '12px' }}>
                  After creating the template, you can add more variables in the edit page.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

const defaultHtmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{subject}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; background-color: #ffffff; border-radius: 12px 12px 0 0; border-bottom: 1px solid #e5e7eb;">
              <img src="https://portal.pyrusdigitalmedia.com/pyrus-logo.png" alt="Pyrus Digital Media" style="height: 36px; width: auto; max-width: 160px;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px; font-size: 24px; font-weight: 600; color: #1A1F16; line-height: 1.3;">Hi {{first_name}},</h1>
              <p style="margin: 0 0 20px; font-size: 16px; color: #5A6358; line-height: 1.6;">Your email content goes here. You can personalize this message for <strong>{{client_name}}</strong>.</p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #5A6358; line-height: 1.6;">Add more paragraphs as needed to communicate your message.</p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center">
                    <a href="{{action_url}}" style="display: inline-block; padding: 16px 32px; background-color: #324438; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">Call to Action</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0; font-size: 14px; color: #8B9088; line-height: 1.6;">Or copy and paste this link into your browser:<br /><a href="{{action_url}}" style="color: #324438; word-break: break-all;">{{action_url}}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #F8FAF8; border-radius: 0 0 12px 12px; border-top: 1px solid #E5E7EB;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #5A6358;">Questions? We're here to help.</p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #324438;"><a href="mailto:support@pyrusdigitalmedia.com" style="color: #324438; text-decoration: none;">support@pyrusdigitalmedia.com</a></p>
              <p style="margin: 0; font-size: 12px; color: #8B9088;">Pyrus Digital Media<br />702 Houston St, Fort Worth, TX 76102<br /><a href="https://pyrusdigitalmedia.com" style="color: #8B9088;">pyrusdigitalmedia.com</a></p>
            </td>
          </tr>
        </table>
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #8B9088;">You're receiving this email because {{email_reason}}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
