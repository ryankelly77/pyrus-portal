'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface DelayNodeData {
  label?: string;
  delayDays?: number;
  delayHours?: number;
}

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

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-blue-50 min-w-[140px] ${
        selected ? 'border-blue-500 shadow-lg' : 'border-blue-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-700"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">⏱️</span>
        <span className="font-medium text-blue-900">Wait</span>
      </div>
      <div className="text-xs text-blue-700 mt-1">{delayText}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-blue-700"
      />
    </div>
  );
}
