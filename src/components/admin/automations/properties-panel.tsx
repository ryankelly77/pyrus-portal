'use client'

import { Node } from 'reactflow'

interface Template {
  slug: string
  name: string
}

interface PropertiesPanelProps {
  selectedNode: Node | null
  onNodeUpdate: (nodeId: string, data: Record<string, any>) => void
  templates: Template[]
}

const panelStyle: React.CSSProperties = {
  width: '280px',
  borderLeft: '1px solid var(--border-color)',
  padding: '20px',
  backgroundColor: 'var(--bg-secondary, #f8fafc)',
  flexShrink: 0,
  overflowY: 'auto',
}

const headingStyle: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--text-primary)',
  marginBottom: '16px',
  fontSize: '14px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--border-color)',
  borderRadius: '6px',
  fontSize: '14px',
  backgroundColor: 'var(--card-bg, white)',
  color: 'var(--text-primary)',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
}

export function PropertiesPanel({
  selectedNode,
  onNodeUpdate,
  templates,
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div style={panelStyle}>
        <h3 style={headingStyle}>Properties</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Select a node to edit its properties.
        </p>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <h3 style={headingStyle}>Properties</h3>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Node: {selectedNode.type}
      </div>

      {selectedNode.type === 'trigger' && (
        <TriggerProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'delay' && (
        <DelayProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'email' && (
        <EmailProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
          templates={templates}
        />
      )}

      {selectedNode.type === 'condition' && (
        <ConditionProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'end' && (
        <EndProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}
    </div>
  )
}

// Trigger Properties
function TriggerProperties({
  data,
  onChange,
}: {
  data: any
  onChange: (data: any) => void
}) {
  const triggerTypes = [
    // Recommendation engagement triggers
    { value: 'recommendation_sent', label: 'Recommendation Sent', group: 'Recommendations' },
    { value: 'recommendation_email_opened', label: 'Recommendation Email Opened', group: 'Recommendations' },
    { value: 'recommendation_email_clicked', label: 'Recommendation Email Clicked', group: 'Recommendations' },
    { value: 'recommendation_viewed', label: 'Recommendation Viewed', group: 'Recommendations' },
    // Client triggers
    { value: 'client_created', label: 'Client Created', group: 'Clients' },
    { value: 'client_login', label: 'Client Logged In', group: 'Clients' },
    // Content triggers
    { value: 'content_approved', label: 'Content Approved', group: 'Content' },
    // Page view triggers
    { value: 'page_view_dashboard', label: 'Viewed Dashboard', group: 'Page Views' },
    { value: 'page_view_results', label: 'Viewed Results', group: 'Page Views' },
    { value: 'page_view_recommendations', label: 'Viewed Recommendations', group: 'Page Views' },
    // Billing triggers
    { value: 'invoice_sent', label: 'Invoice Sent', group: 'Billing' },
    { value: 'payment_received', label: 'Payment Received', group: 'Billing' },
    { value: 'subscription_started', label: 'Subscription Started', group: 'Billing' },
    // Other
    { value: 'manual', label: 'Manual Trigger', group: 'Other' },
  ]

  // Group triggers for display
  const groupedTriggers = triggerTypes.reduce((acc, t) => {
    const group = t.group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(t)
    return acc
  }, {} as Record<string, typeof triggerTypes>)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Trigger Type</label>
        <select
          value={data.triggerType || ''}
          onChange={(e) => onChange({ ...data, triggerType: e.target.value })}
          style={selectStyle}
        >
          <option value="">Select trigger...</option>
          {Object.entries(groupedTriggers).map(([group, triggers]) => (
            <optgroup key={group} label={group}>
              {triggers.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Label (optional)</label>
        <input
          type="text"
          value={data.label || ''}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Trigger"
          style={inputStyle}
        />
      </div>
    </div>
  )
}

// Delay Properties
function DelayProperties({
  data,
  onChange,
}: {
  data: any
  onChange: (data: any) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Delay Days</label>
        <input
          type="number"
          min="0"
          value={data.delayDays || 0}
          onChange={(e) =>
            onChange({ ...data, delayDays: parseInt(e.target.value) || 0 })
          }
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Delay Hours</label>
        <input
          type="number"
          min="0"
          max="23"
          value={data.delayHours || 0}
          onChange={(e) =>
            onChange({ ...data, delayHours: parseInt(e.target.value) || 0 })
          }
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>Delay From</label>
        <select
          value={data.delayFrom || 'previous_step'}
          onChange={(e) => onChange({ ...data, delayFrom: e.target.value })}
          style={selectStyle}
        >
          <option value="previous_step">Previous Step</option>
          <option value="trigger">Trigger Time</option>
        </select>
      </div>
    </div>
  )
}

// Email Properties
function EmailProperties({
  data,
  onChange,
  templates,
}: {
  data: any
  onChange: (data: any) => void
  templates: Template[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Email Template</label>
        <select
          value={data.templateSlug || ''}
          onChange={(e) => {
            const template = templates.find((t) => t.slug === e.target.value)
            onChange({
              ...data,
              templateSlug: e.target.value,
              templateName: template?.name || '',
            })
          }}
          style={selectStyle}
        >
          <option value="">Select template...</option>
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Subject Override (optional)</label>
        <input
          type="text"
          value={data.subjectOverride || ''}
          onChange={(e) => onChange({ ...data, subjectOverride: e.target.value })}
          placeholder="Use template subject"
          style={inputStyle}
        />
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Leave blank to use template's default subject.
        </p>
      </div>
    </div>
  )
}

// Condition Properties
function ConditionProperties({
  data,
  onChange,
}: {
  data: any
  onChange: (data: any) => void
}) {
  // Condition types with clear, descriptive labels
  const conditionTypes = [
    {
      value: 'has_purchased',
      label: 'Has Purchased',
      description: 'Client has made a purchase',
      yesLabel: 'Purchased',
      noLabel: 'Not Purchased'
    },
    {
      value: 'email_opened',
      label: 'Opened Previous Email',
      description: 'Recipient opened the last email in this sequence',
      yesLabel: 'Opened',
      noLabel: 'Not Opened'
    },
    {
      value: 'email_clicked',
      label: 'Clicked Previous Email',
      description: 'Recipient clicked a link in the last email',
      yesLabel: 'Clicked',
      noLabel: 'Not Clicked'
    },
    {
      value: 'recommendation_viewed',
      label: 'Viewed Recommendation',
      description: 'Client has viewed their recommendation page',
      yesLabel: 'Viewed',
      noLabel: 'Not Viewed'
    },
    {
      value: 'is_active_subscriber',
      label: 'Is Active Subscriber',
      description: 'Client has an active subscription',
      yesLabel: 'Active',
      noLabel: 'Not Active'
    },
  ]

  const selectedCondition = conditionTypes.find(c => c.value === data.conditionType)

  const updateCondition = (conditionType: string) => {
    const condition = conditionTypes.find(c => c.value === conditionType)
    onChange({
      ...data,
      conditionType,
      field: conditionType, // Keep for backwards compatibility
      operator: 'is_true', // Simplified - the condition type itself defines what we're checking
      conditionLabel: condition?.label || conditionType,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Check If...</label>
        <select
          value={data.conditionType || data.field || ''}
          onChange={(e) => updateCondition(e.target.value)}
          style={selectStyle}
        >
          <option value="">Select condition...</option>
          {conditionTypes.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {selectedCondition && (
        <>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            {selectedCondition.description}
          </p>

          <div style={{
            backgroundColor: 'var(--card-bg, white)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            padding: '12px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Branch Labels:
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#22c55e',
                  display: 'inline-block'
                }}></span>
                <span style={{ color: '#16a34a', fontWeight: 500 }}>Yes:</span>
                <span>{selectedCondition.yesLabel}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444',
                  display: 'inline-block'
                }}></span>
                <span style={{ color: '#dc2626', fontWeight: 500 }}>No:</span>
                <span>{selectedCondition.noLabel}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// End Properties
function EndProperties({
  data,
  onChange,
}: {
  data: any
  onChange: (data: any) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>End Reason (optional)</label>
        <input
          type="text"
          value={data.reason || ''}
          onChange={(e) => onChange({ ...data, reason: e.target.value })}
          placeholder="e.g., Sequence Complete"
          style={inputStyle}
        />
      </div>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
        The end node marks the completion of this automation branch.
      </p>
    </div>
  )
}
