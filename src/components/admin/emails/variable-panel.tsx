'use client'

import { useState, useMemo } from 'react'
import { GLOBAL_EMAIL_VARIABLES } from '@/lib/email/global-variables'

interface TemplateVariable {
  key: string
  description: string
  example: string
}

interface VariablePanelProps {
  variables: TemplateVariable[]
  onInsert?: (variable: string) => void
}

export function VariablePanel({ variables, onInsert }: VariablePanelProps) {
  const [expandedAll, setExpandedAll] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  // Separate template-specific variables from global ones
  // If a template defines a variable that's also global, show it in template section
  const { templateVariables, globalVariables } = useMemo(() => {
    const templateKeys = new Set(variables.map((v) => v.key))

    // Global variables not overridden by template
    const globals = GLOBAL_EMAIL_VARIABLES.filter((v) => !templateKeys.has(v.key))

    return {
      templateVariables: variables,
      globalVariables: globals,
    }
  }, [variables])

  const allVariables = useMemo(
    () => [...templateVariables, ...globalVariables],
    [templateVariables, globalVariables]
  )

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleExpandAll = () => {
    if (expandedAll) {
      setExpandedKeys(new Set())
    } else {
      setExpandedKeys(new Set(allVariables.map((v) => v.key)))
    }
    setExpandedAll(!expandedAll)
  }

  const handleInsert = (key: string) => {
    const variable = `\${${key}}`

    // Copy to clipboard
    navigator.clipboard.writeText(variable).then(() => {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 1500)
    })

    // Call onInsert callback if provided
    if (onInsert) {
      onInsert(variable)
    }
  }

  const isExpanded = (key: string) => expandedKeys.has(key)

  const renderVariable = (variable: TemplateVariable) => (
    <div
      key={variable.key}
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          background: 'var(--bg-secondary)',
          cursor: 'pointer',
        }}
        onClick={() => toggleExpand(variable.key)}
      >
        <code
          style={{
            fontSize: '13px',
            color: 'var(--pyrus-brown)',
            fontFamily: 'monospace',
            background: 'rgba(139, 90, 43, 0.1)',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          ${'{'}
          {variable.key}
          {'}'}
        </code>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleInsert(variable.key)
            }}
            style={{
              background: copiedKey === variable.key ? 'var(--success-color)' : 'var(--pyrus-brown)',
              color: 'white',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 500,
              minWidth: '50px',
            }}
          >
            {copiedKey === variable.key ? 'Copied!' : 'Insert'}
          </button>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="16"
            height="16"
            style={{
              transform: isExpanded(variable.key) ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              color: 'var(--text-secondary)',
            }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {isExpanded(variable.key) && (
        <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {variable.description}
          </p>
          <div style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Example: </span>
            <code
              style={{
                background: 'var(--bg-secondary)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: 'var(--text-primary)',
              }}
            >
              {variable.example}
            </code>
          </div>
        </div>
      )}
    </div>
  )

  if (templateVariables.length === 0 && globalVariables.length === 0) {
    return (
      <div style={{ padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
        No variables available for this template.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Available Variables
        </h4>
        <button
          onClick={toggleExpandAll}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--pyrus-brown)',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          {expandedAll ? 'Collapse All' : 'Expand All'}
        </button>
      </div>

      {/* Template-Specific Variables */}
      {templateVariables.length > 0 && (
        <div style={{ marginBottom: globalVariables.length > 0 ? '20px' : 0 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
            }}
          >
            Template Variables
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {templateVariables.map(renderVariable)}
          </div>
        </div>
      )}

      {/* Global Variables */}
      {globalVariables.length > 0 && (
        <div>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Global Variables</span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 400,
                color: 'var(--text-tertiary)',
                textTransform: 'none',
                letterSpacing: 'normal',
              }}
            >
              (available on all templates)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {globalVariables.map(renderVariable)}
          </div>
        </div>
      )}
    </div>
  )
}
