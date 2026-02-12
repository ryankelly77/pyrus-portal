'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, notFound } from 'next/navigation'
import { AdminHeader } from '@/components/layout'
import { useUserProfile } from '@/hooks/useUserProfile'
import { EmailTemplateForm } from '@/components/admin/emails/email-template-form'

interface TemplateVariable {
  key: string
  description: string
  example: string
}

interface TemplateData {
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
    name: string
    slug: string
  } | null
}

export default function EmailTemplateEditPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, profile, hasNotifications } = useUserProfile()

  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/admin/email-templates/${slug}`)
        if (res.status === 404) {
          setError('Template not found')
          return
        }
        if (!res.ok) {
          throw new Error('Failed to fetch template')
        }
        const data = await res.json()
        setTemplate(data)
      } catch (err) {
        console.error('Failed to fetch email template:', err)
        setError('Failed to load email template')
      } finally {
        setIsLoading(false)
      }
    }

    if (slug) {
      fetchTemplate()
    }
  }, [slug])

  if (isLoading) {
    return (
      <>
        <AdminHeader
          title="Edit Email Template"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading template...
          </div>
        </div>
      </>
    )
  }

  if (error || !template) {
    return (
      <>
        <AdminHeader
          title="Edit Email Template"
          user={user}
          hasNotifications={hasNotifications}
        />
        <div className="admin-content">
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: 'var(--error-color)', marginBottom: '16px' }}>
              {error || 'Template not found'}
            </p>
            <button
              className="btn btn-secondary"
              onClick={() => router.push('/admin/emails')}
            >
              Back to Email Templates
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader
        title={`Edit: ${template.name}`}
        user={user}
        hasNotifications={hasNotifications}
      />

      <div className="admin-content">
        {/* Breadcrumbs */}
        <nav style={{ marginBottom: '16px', fontSize: '14px' }}>
          <a href="/admin/emails" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Email Templates
          </a>
          <span style={{ color: 'var(--text-secondary)', margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>{template.name}</span>
        </nav>

        <EmailTemplateForm
          template={template}
          userEmail={profile?.email || ''}
        />
      </div>
    </>
  )
}
