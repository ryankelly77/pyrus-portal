'use client'

import { DragEvent } from 'react'

interface NodeType {
  type: string
  label: string
  icon: string
  bgColor: string
  borderColor: string
}

const nodeTypes: NodeType[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: '⚡',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: '⏱️',
    bgColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  {
    type: 'email',
    label: 'Send Email',
    icon: '✉️',
    bgColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '◆',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
  },
  {
    type: 'end',
    label: 'End',
    icon: '🛑',
    bgColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
]

interface ToolboxProps {
  onDragStart: (event: DragEvent, nodeType: string) => void
}

export function Toolbox({ onDragStart }: ToolboxProps) {
  return (
    <div style={{
      width: '220px',
      borderRight: '1px solid var(--border-color)',
      padding: '20px',
      backgroundColor: 'var(--bg-secondary, #f8fafc)',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      <h3 style={{
        fontWeight: 600,
        color: 'var(--text-primary)',
        marginBottom: '16px',
        fontSize: '14px',
      }}>Nodes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `2px solid ${node.borderColor}`,
              backgroundColor: node.bgColor,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>{node.icon}</span>
            <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>{node.label}</span>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
      }}>
        <h4 style={{
          fontWeight: 500,
          color: 'var(--text-secondary)',
          fontSize: '12px',
          marginBottom: '8px',
        }}>Tips</h4>
        <ul style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}>
          <li>• Drag nodes to canvas</li>
          <li>• Connect by dragging handles</li>
          <li>• Delete with Backspace</li>
          <li>• Undo: Ctrl+Z</li>
        </ul>
      </div>
    </div>
  )
}
