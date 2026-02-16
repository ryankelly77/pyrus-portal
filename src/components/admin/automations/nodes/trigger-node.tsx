'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface TriggerNodeData {
  label?: string;
  triggerType?: string;
}

export function TriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const triggerLabels: Record<string, string> = {
    proposal_sent: 'Proposal Sent',
    client_created: 'Client Created',
    content_approved: 'Content Approved',
    invoice_sent: 'Invoice Sent',
    manual: 'Manual',
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-amber-50 min-w-[160px] ${
        selected ? 'border-amber-500 shadow-lg' : 'border-amber-300'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">⚡</span>
        <span className="font-medium text-amber-900">{data.label || 'Trigger'}</span>
      </div>
      <div className="text-xs text-amber-700 mt-1">
        {data.triggerType ? triggerLabels[data.triggerType] || data.triggerType : 'Select trigger...'}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-amber-700"
      />
    </div>
  );
}
