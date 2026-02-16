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
  const fields = [
    { value: 'email_opened', label: 'Email Opened' },
    { value: 'recommendation_viewed', label: 'Recommendation Viewed' },
    { value: 'deal_status', label: 'Deal Status' },
  ]

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' },
  ]

  const updateConditionLabel = (field: string, operator: string, value: string) => {
    let label = ''
    if (field && operator) {
      const fieldLabel = fields.find((f) => f.value === field)?.label || field
      if (operator === 'is_true') {
        label = `${fieldLabel} is true`
      } else if (operator === 'is_false') {
        label = `${fieldLabel} is false`
      } else if (operator === 'equals') {
        label = `${fieldLabel} = ${value}`
      } else if (operator === 'not_equals') {
        label = `${fieldLabel} ≠ ${value}`
      }
    }
    return label
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={labelStyle}>Field</label>
        <select
          value={data.field || ''}
          onChange={(e) => {
            const newData = { ...data, field: e.target.value }
            newData.conditionLabel = updateConditionLabel(
              e.target.value,
              data.operator,
              data.value
            )
            onChange(newData)
          }}
          style={selectStyle}
        >
          <option value="">Select field...</option>
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Operator</label>
        <select
          value={data.operator || ''}
          onChange={(e) => {
            const newData = { ...data, operator: e.target.value }
            newData.conditionLabel = updateConditionLabel(
              data.field,
              e.target.value,
              data.value
            )
            onChange(newData)
          }}
          style={selectStyle}
        >
          <option value="">Select operator...</option>
          {operators.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {(data.operator === 'equals' || data.operator === 'not_equals') && (
        <div>
          <label style={labelStyle}>Value</label>
          <input
            type="text"
            value={data.value || ''}
            onChange={(e) => {
              const newData = { ...data, value: e.target.value }
              newData.conditionLabel = updateConditionLabel(
                data.field,
                data.operator,
                e.target.value
              )
              onChange(newData)
            }}
            placeholder="Enter value..."
            style={inputStyle}
          />
        </div>
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
