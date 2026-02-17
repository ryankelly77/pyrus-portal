'use client';

import { Handle, Position, NodeProps } from 'reactflow';
import { EnrollmentBadge, EnrollmentContact } from '../enrollment-badge';

interface EmailNodeData {
  label?: string;
  templateSlug?: string;
  templateName?: string;
  subjectOverride?: string;
  enrollmentCount?: number;
  enrollmentContacts?: EnrollmentContact[];
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
    maxWidth: '200px',
    boxShadow: selected ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#15803d',
    marginTop: '4px',
    maxWidth: '160px',
    textAlign: 'center',
    wordWrap: 'break-word',
    overflowWrap: 'break-word',
    lineHeight: '1.3',
  };

  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      <Handle
        type="target"
        position={Position.Top}
        style={handleStyle}
      />
      {data.enrollmentCount && data.enrollmentCount > 0 && (
        <EnrollmentBadge
          count={data.enrollmentCount}
          contacts={data.enrollmentContacts || []}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>✉️</span>
        <span style={{ fontWeight: 500, color: '#14532d' }}>Send Email</span>
      </div>
      <div style={textStyle}>
        {data.templateName || data.templateSlug || 'Select template...'}
      </div>
      {data.subjectOverride && (
        <div style={{ ...textStyle, color: '#16a34a', marginTop: '2px', fontStyle: 'italic' }}>
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
