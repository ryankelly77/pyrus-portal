'use client';

import { Handle, Position, NodeProps } from 'reactflow';

interface EmailNodeData {
  label?: string;
  templateSlug?: string;
  templateName?: string;
  subjectOverride?: string;
}

export function EmailNode({ data, selected }: NodeProps<EmailNodeData>) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 bg-green-50 min-w-[160px] ${
        selected ? 'border-green-500 shadow-lg' : 'border-green-300'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-700"
      />
      <div className="flex items-center gap-2">
        <span className="text-lg">✉️</span>
        <span className="font-medium text-green-900">Send Email</span>
      </div>
      <div className="text-xs text-green-700 mt-1 truncate max-w-[140px]">
        {data.templateName || data.templateSlug || 'Select template...'}
      </div>
      {data.subjectOverride && (
        <div className="text-xs text-green-600 mt-0.5 italic truncate max-w-[140px]">
          "{data.subjectOverride}"
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-green-700"
      />
    </div>
  );
}
