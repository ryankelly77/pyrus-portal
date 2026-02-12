'use client'

import { useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1e1e1e',
        color: '#888',
        fontSize: '14px',
      }}
    >
      Loading editor...
    </div>
  ),
})

interface TemplateCodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: 'html' | 'plaintext'
  height?: string | number
  readOnly?: boolean
}

export function TemplateCodeEditor({
  value,
  onChange,
  language = 'html',
  height = '400px',
  readOnly = false,
}: TemplateCodeEditorProps) {
  const editorRef = useRef<any>(null)

  const handleEditorDidMount = useCallback((editor: any) => {
    editorRef.current = editor
  }, [])

  const handleChange = useCallback(
    (newValue: string | undefined) => {
      onChange(newValue || '')
    },
    [onChange]
  )

  return (
    <div
      style={{
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden',
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    >
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          readOnly,
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'selection',
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
        }}
      />
    </div>
  )
}

// Simple textarea fallback for plain text
interface SimpleTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}

export function SimpleTextEditor({
  value,
  onChange,
  placeholder,
  rows = 10,
}: SimpleTextEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%',
        padding: '12px',
        fontSize: '13px',
        fontFamily: 'monospace',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        resize: 'vertical',
        minHeight: '150px',
      }}
    />
  )
}
