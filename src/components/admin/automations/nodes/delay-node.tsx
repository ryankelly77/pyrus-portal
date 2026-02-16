'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface DelayNodeData {
  label?: string;
  delayDays?: number;
  delayHours?: number;
}

const handleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#3b82f6',
  border: '2px solid #1d4ed8',
};

export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const days = data.delayDays || 0;
  const hours = data.delayHours || 0;

  let delayText = '';
  if (days > 0 && hours > 0) {
    delayText = `${days}d ${hours}h`;
  } else if (days > 0) {
    delayText = `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    delayText = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    delayText = 'Set delay...';
  }

  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #3b82f6' : '2px solid #93c5fd',
    backgroundColor: '#eff6ff',
    minWidth: '140px',
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
        <span style={{ fontSize: '18px' }}>⏱️</span>
        <span style={{ fontWeight: 500, color: '#1e3a8a' }}>Wait</span>
      </div>
      <div style={{ fontSize: '12px', color: '#1d4ed8', marginTop: '4px', textAlign: 'center' }}>{delayText}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
}
