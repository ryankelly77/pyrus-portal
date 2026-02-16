'use client';

import { DragEvent } from 'react';

interface NodeType {
  type: string;
  label: string;
  icon: string;
  bgColor: string;
  borderColor: string;
}

const nodeTypes: NodeType[] = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: '⚡',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300 hover:border-amber-400',
  },
  {
    type: 'delay',
    label: 'Delay',
    icon: '⏱️',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300 hover:border-blue-400',
  },
  {
    type: 'email',
    label: 'Send Email',
    icon: '✉️',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300 hover:border-green-400',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '◆',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300 hover:border-purple-400',
  },
  {
    type: 'end',
    label: 'End',
    icon: '🛑',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300 hover:border-gray-400',
  },
];

interface ToolboxProps {
  onDragStart: (event: DragEvent, nodeType: string) => void;
}

export function Toolbox({ onDragStart }: ToolboxProps) {
  return (
    <div className="w-[200px] border-r border-gray-200 p-4 bg-gray-50 flex-shrink-0">
      <h3 className="font-semibold text-gray-700 mb-4">Nodes</h3>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className={`p-3 rounded-lg border-2 ${node.bgColor} ${node.borderColor} cursor-grab active:cursor-grabbing flex items-center gap-2 hover:shadow-md transition-all`}
          >
            <span className="text-lg">{node.icon}</span>
            <span className="font-medium text-sm">{node.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="font-medium text-gray-600 text-sm mb-2">Tips</h4>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Drag nodes to canvas</li>
          <li>• Connect by dragging handles</li>
          <li>• Delete with Backspace</li>
          <li>• Undo: Ctrl+Z</li>
        </ul>
      </div>
    </div>
  );
}
