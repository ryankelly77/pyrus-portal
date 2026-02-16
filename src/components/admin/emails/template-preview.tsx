'use client'

import { useState, useMemo } from 'react'

interface TemplateVariable {
  key: string
  description: string
  example: string
}

interface TemplatePreviewProps {
  subject: string
  bodyHtml: string
  bodyText: string
  variables: TemplateVariable[]
}

/**
 * Replace variables in a template string with example values
 */
function replaceVariables(
  template: string,
  variables: TemplateVariable[]
): string {
  if (!template) return ''

  const variableMap = new Map(variables.map((v) => [v.key, v.example]))

  // Pattern matches ${varName} or {{varName}}
  const pattern = /\$\{([^}]+)\}|\{\{([^}]+)\}\}/g

  return template.replace(pattern, (match, dollarVar, bracketVar) => {
    const varName = (dollarVar || bracketVar).trim()
    return variableMap.get(varName) ?? match
  })
}

export function TemplatePreview({
  subject,
  bodyHtml,
  bodyText,
  variables,
}: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html')

  const renderedSubject = useMemo(
    () => replaceVariables(subject, variables),
    [subject, variables]
  )

  const renderedHtml = useMemo(
    () => replaceVariables(bodyHtml, variables),
    [bodyHtml, variables]
  )

  const renderedText = useMemo(
    () => replaceVariables(bodyText, variables),
    [bodyText, variables]
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Preview
        </h4>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setViewMode('html')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px 0 0 4px',
              background: viewMode === 'html' ? 'var(--pyrus-brown)' : 'white',
              color: viewMode === 'html' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            HTML
          </button>
          <button
            onClick={() => setViewMode('text')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              background: viewMode === 'text' ? 'var(--pyrus-brown)' : 'white',
              color: viewMode === 'text' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Text
          </button>
        </div>
      </div>

      <div
        style={{
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          resize: 'vertical',
          minHeight: '350px',
          maxHeight: '80vh',
        }}
      >
        {/* Subject line */}
        <div
          style={{
            padding: '12px 16px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>
            Subject:
          </span>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {renderedSubject || '(No subject)'}
          </span>
        </div>

        {/* Body preview */}
        <div
          style={{
            height: 'calc(100% - 45px)',
            overflow: 'auto',
          }}
        >
          {viewMode === 'html' ? (
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    body {
                      margin: 0;
                      padding: 16px;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                      font-size: 14px;
                      line-height: 1.5;
                      color: #333;
                    }
                  </style>
                </head>
                <body>
                  ${renderedHtml}
                </body>
                </html>
              `}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '280px',
                border: 'none',
                background: 'white',
              }}
              title="Email preview"
              sandbox="allow-same-origin"
            />
          ) : (
            <pre
              style={{
                margin: 0,
                padding: '16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: 'var(--text-primary)',
                background: 'white',
                height: '100%',
                boxSizing: 'border-box',
              }}
            >
              {renderedText || '(No plain text version)'}
            </pre>
          )}
        </div>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--text-secondary)' }}>
        Preview uses example values from available variables
      </p>
    </div>
  )
}
