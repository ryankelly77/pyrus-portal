'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface TriggerNodeData {
  label?: string;
  triggerType?: string;
}

const handleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#f59e0b',
  border: '2px solid #b45309',
};

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const triggerLabels: Record<string, string> = {
    proposal_sent: 'Proposal Sent',
    client_created: 'Client Created',
    content_approved: 'Content Approved',
    invoice_sent: 'Invoice Sent',
    manual: 'Manual',
  };

  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #f59e0b' : '2px solid #fcd34d',
    backgroundColor: '#fffbeb',
    minWidth: '160px',
    boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>⚡</span>
        <span style={{ fontWeight: 500, color: '#78350f' }}>{data.label || 'Trigger'}</span>
      </div>
      <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px', textAlign: 'center' }}>
        {data.triggerType ? triggerLabels[data.triggerType] || data.triggerType : 'Select trigger...'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={handleStyle}
      />
    </div>
  );
}
