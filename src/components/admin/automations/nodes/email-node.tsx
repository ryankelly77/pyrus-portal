'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface EmailNodeData {
  label?: string;
  templateSlug?: string;
  templateName?: string;
  subjectOverride?: string;
}

const handleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#22c55e',
  border: '2px solid #15803d',
};

export function EmailNode({ data, selected }: NodeProps<EmailNodeData>) {
  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #22c55e' : '2px solid #86efac',
    backgroundColor: '#f0fdf4',
    minWidth: '160px',
    boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  };

  const truncateStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#15803d',
    marginTop: '4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '140px',
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>✉️</span>
        <span style={{ fontWeight: 500, color: '#14532d' }}>Send Email</span>
      </div>
      <div style={truncateStyle}>
        {data.templateName || data.templateSlug || 'Select template...'}
      </div>
      {data.subjectOverride && (
        <div style={{ ...truncateStyle, color: '#16a34a', marginTop: '2px', fontStyle: 'italic' }}>
          "{data.subjectOverride}"
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
}
