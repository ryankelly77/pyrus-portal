'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AutomationStep {
  stepOrder: number
  delayDays: number
  delayHours: number
}

interface Automation {
  id: string
  name: string
  slug: string
  triggerType: string
  isActive: boolean
  steps: AutomationStep[]
}

interface TemplateAutomationsProps {
  templateSlug: string
}

const triggerLabels: Record<string, string> = {
  proposal_sent: 'Proposal Sent',
  recommendation_sent: 'Recommendation Sent',
  client_created: 'Client Created',
  content_approved: 'Content Approved',
  invoice_sent: 'Invoice Sent',
  manual: 'Manual',
}

function formatDelay(days: number, hours: number): string {
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  return parts.length > 0 ? parts.join(' ') : 'Immediately'
}

export function TemplateAutomations({ templateSlug }: TemplateAutomationsProps) {
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAutomations()
  }, [templateSlug])

  const fetchAutomations = async () => {
    try {
      const res = await fetch(`/api/admin/email-templates/${templateSlug}/automations`)
      if (!res.ok) throw new Error('Failed to fetch automations')
      const data = await res.json()
      setAutomations(data.automations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automations')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        style={{
          padding: '16px',
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Loading automations...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          background: '#FEF2F2',
          borderRadius: '8px',
          border: '1px solid #FECACA',
        }}
      >
        <div style={{ color: '#991B1B', fontSize: '14px' }}>{error}</div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'var(--bg-secondary)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="16"
          height="16"
          style={{ color: 'var(--text-secondary)' }}
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
        </svg>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Used in Automations
        </h4>
        {automations.length > 0 && (
          <span
            style={{
              background: 'var(--pyrus-brown)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '10px',
              marginLeft: 'auto',
            }}
          >
            {automations.length}
          </span>
        )}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {automations.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
            This template is not used in any automations.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {automations.map((automation) => (
              <Link
                key={automation.id}
                href={`/admin/automations/${automation.id}`}
                style={{
                  display: 'block',
                  padding: '10px 12px',
                  background: 'white',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--pyrus-brown)'
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {automation.name}
                  </span>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 500,
                      background: automation.isActive ? '#DEF7EC' : '#FDE8E8',
                      color: automation.isActive ? '#03543F' : '#9B1C1C',
                    }}
                  >
                    {automation.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Trigger: {triggerLabels[automation.triggerType] || automation.triggerType}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {automation.steps.map((step, idx) => (
                    <span key={idx}>
                      {idx > 0 && ' • '}
                      Step {step.stepOrder}: {formatDelay(step.delayDays, step.delayHours)}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
