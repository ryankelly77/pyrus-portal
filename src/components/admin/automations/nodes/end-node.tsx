'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface EndNodeData {
  label?: string;
  reason?: string;
}

const handleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#6b7280',
  border: '2px solid #374151',
};

export function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #6b7280' : '2px solid #d1d5db',
    backgroundColor: '#f3f4f6',
    minWidth: '120px',
    boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  };

  return (
    <div style={containerStyle}>
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>🛑</span>
        <span style={{ fontWeight: 500, color: '#374151' }}>End</span>
      </div>
      {data.reason && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>{data.reason}</div>
      )}
    </div>
  );
}
