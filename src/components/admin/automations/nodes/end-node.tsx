'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface EndNodeData {
  label?: string;
  reason?: string;
}

export function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-gray-100 min-w-[120px] ${
        selected ? 'border-gray-500 shadow-lg' : 'border-gray-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-gray-700"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">🛑</span>
        <span className="font-medium text-gray-700">End</span>
      </div>
      {data.reason && (
        <div className="text-xs text-gray-500 mt-1">{data.reason}</div>
      )}
    </div>
  );
}
