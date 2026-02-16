'use client';

import { useEffect, useState } from 'react';
import { Node } from 'reactflow';

interface Template {
  slug: string;
  name: string;
}

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, data: Record<string, any>) => void;
  templates: Template[];
}

export function PropertiesPanel({
  selectedNode,
  onNodeUpdate,
  templates,
}: PropertiesPanelProps) {
  if (!selectedNode) {
    return (
      <div className="w-[300px] border-l border-gray-200 p-4 bg-gray-50 flex-shrink-0">
        <h3 className="font-semibold text-gray-700 mb-4">Properties</h3>
        <p className="text-sm text-gray-500">Select a node to edit its properties.</p>
      </div>
    );
  }

  return (
    <div className="w-[300px] border-l border-gray-200 p-4 bg-gray-50 flex-shrink-0 overflow-y-auto">
      <h3 className="font-semibold text-gray-700 mb-4">Properties</h3>
      <div className="text-xs text-gray-500 mb-4">
        Node: {selectedNode.type}
      </div>

      {selectedNode.type === 'trigger' && (
        <TriggerProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'delay' && (
        <DelayProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'email' && (
        <EmailProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
          templates={templates}
        />
      )}

      {selectedNode.type === 'condition' && (
        <ConditionProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}

      {selectedNode.type === 'end' && (
        <EndProperties
          data={selectedNode.data}
          onChange={(data) => onNodeUpdate(selectedNode.id, data)}
        />
      )}
    </div>
  );
}

// Trigger Properties
function TriggerProperties({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  const triggerTypes = [
    { value: 'proposal_sent', label: 'Proposal Sent' },
    { value: 'client_created', label: 'Client Created' },
    { value: 'content_approved', label: 'Content Approved' },
    { value: 'invoice_sent', label: 'Invoice Sent' },
    { value: 'manual', label: 'Manual Trigger' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trigger Type
        </label>
        <select
          value={data.triggerType || ''}
          onChange={(e) => onChange({ ...data, triggerType: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">Select trigger...</option>
          {triggerTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Label (optional)
        </label>
        <input
          type="text"
          value={data.label || ''}
          onChange={(e) => onChange({ ...data, label: e.target.value })}
          placeholder="Trigger"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
    </div>
  );
}

// Delay Properties
function DelayProperties({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delay Days
        </label>
        <input
          type="number"
          min="0"
          value={data.delayDays || 0}
          onChange={(e) =>
            onChange({ ...data, delayDays: parseInt(e.target.value) || 0 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delay Hours
        </label>
        <input
          type="number"
          min="0"
          max="23"
          value={data.delayHours || 0}
          onChange={(e) =>
            onChange({ ...data, delayHours: parseInt(e.target.value) || 0 })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Delay From
        </label>
        <select
          value={data.delayFrom || 'previous_step'}
          onChange={(e) => onChange({ ...data, delayFrom: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="previous_step">Previous Step</option>
          <option value="trigger">Trigger Time</option>
        </select>
      </div>
    </div>
  );
}

// Email Properties
function EmailProperties({
  data,
  onChange,
  templates,
}: {
  data: any;
  onChange: (data: any) => void;
  templates: Template[];
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email Template
        </label>
        <select
          value={data.templateSlug || ''}
          onChange={(e) => {
            const template = templates.find((t) => t.slug === e.target.value);
            onChange({
              ...data,
              templateSlug: e.target.value,
              templateName: template?.name || '',
            });
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Select template...</option>
          {templates.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subject Override (optional)
        </label>
        <input
          type="text"
          value={data.subjectOverride || ''}
          onChange={(e) => onChange({ ...data, subjectOverride: e.target.value })}
          placeholder="Use template subject"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to use template's default subject.
        </p>
      </div>
    </div>
  );
}

// Condition Properties
function ConditionProperties({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  const fields = [
    { value: 'email_opened', label: 'Email Opened' },
    { value: 'proposal_viewed', label: 'Proposal Viewed' },
    { value: 'deal_status', label: 'Deal Status' },
  ];

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' },
  ];

  const updateConditionLabel = (field: string, operator: string, value: string) => {
    let label = '';
    if (field && operator) {
      const fieldLabel = fields.find((f) => f.value === field)?.label || field;
      if (operator === 'is_true') {
        label = `${fieldLabel} is true`;
      } else if (operator === 'is_false') {
        label = `${fieldLabel} is false`;
      } else if (operator === 'equals') {
        label = `${fieldLabel} = ${value}`;
      } else if (operator === 'not_equals') {
        label = `${fieldLabel} ≠ ${value}`;
      }
    }
    return label;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Field
        </label>
        <select
          value={data.field || ''}
          onChange={(e) => {
            const newData = { ...data, field: e.target.value };
            newData.conditionLabel = updateConditionLabel(
              e.target.value,
              data.operator,
              data.value
            );
            onChange(newData);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Select field...</option>
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Operator
        </label>
        <select
          value={data.operator || ''}
          onChange={(e) => {
            const newData = { ...data, operator: e.target.value };
            newData.conditionLabel = updateConditionLabel(
              data.field,
              e.target.value,
              data.value
            );
            onChange(newData);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">Select operator...</option>
          {operators.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {(data.operator === 'equals' || data.operator === 'not_equals') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Value
          </label>
          <input
            type="text"
            value={data.value || ''}
            onChange={(e) => {
              const newData = { ...data, value: e.target.value };
              newData.conditionLabel = updateConditionLabel(
                data.field,
                data.operator,
                e.target.value
              );
              onChange(newData);
            }}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}
    </div>
  );
}

// End Properties
function EndProperties({
  data,
  onChange,
}: {
  data: any;
  onChange: (data: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          End Reason (optional)
        </label>
        <input
          type="text"
          value={data.reason || ''}
          onChange={(e) => onChange({ ...data, reason: e.target.value })}
          placeholder="e.g., Sequence Complete"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
        />
      </div>
      <p className="text-xs text-gray-500">
        The end node marks the completion of this automation branch.
      </p>
    </div>
  );
}
