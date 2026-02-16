'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface ConditionNodeData {
  label?: string;
  conditionLabel?: string;
  field?: string;
  operator?: string;
  value?: string;
}

export function ConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-purple-50 min-w-[160px] ${
        selected ? 'border-purple-500 shadow-lg' : 'border-purple-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-700"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">◆</span>
        <span className="font-medium text-purple-900">Condition</span>
      </div>
      <div className="text-xs text-purple-700 mt-1">
        {data.conditionLabel || 'Set condition...'}
      </div>
      {/* Two outputs: Yes and No */}
      <div className="flex justify-between text-xs mt-3 px-1">
        <span className="text-green-600 font-medium">Yes</span>
        <span className="text-red-600 font-medium">No</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: '25%' }}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-700"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: '75%' }}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-red-700"
      />
    </div>
  );
}
