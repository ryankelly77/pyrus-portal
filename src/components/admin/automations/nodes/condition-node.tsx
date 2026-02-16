'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface ConditionNodeData {
  label?: string;
  conditionLabel?: string;
  field?: string;
  operator?: string;
  value?: string;
}

const targetHandleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#a855f7',
  border: '2px solid #7e22ce',
};

const yesHandleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#22c55e',
  border: '2px solid #15803d',
};

const noHandleStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  backgroundColor: '#ef4444',
  border: '2px solid #b91c1c',
};

export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const containerStyle: React.CSSProperties = {
    padding: '12px 16px',
    borderRadius: '8px',
    border: selected ? '2px solid #a855f7' : '2px solid #d8b4fe',
    backgroundColor: '#faf5ff',
    minWidth: '160px',
    boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  };

  return (
    <div style={containerStyle}>
      <Handle
        type="target"
        position={Position.Top}
        style={targetHandleStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>◆</span>
        <span style={{ fontWeight: 500, color: '#581c87' }}>Condition</span>
      </div>
      <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '4px', textAlign: 'center' }}>
        {data.conditionLabel || 'Set condition...'}
      </div>
      {/* Two outputs: Yes and No */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '12px', padding: '0 4px' }}>
        <span style={{ color: '#16a34a', fontWeight: 500 }}>Yes</span>
        <span style={{ color: '#dc2626', fontWeight: 500 }}>No</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ ...yesHandleStyle, left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ ...noHandleStyle, left: '75%' }}
      />
    </div>
  );
}
