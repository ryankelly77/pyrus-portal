'use client';

import { useState, useEffect, useCallback, DragEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from 'reactflow';
import { AdminHeader } from '@/components/layout';
import {
  Toolbox,
  PropertiesPanel,
  WorkflowCanvas,
  flowToAutomation,
  automationToFlow,
  validateWorkflow,
  generateNodeId,
  getDefaultNodeData,
} from '@/components/admin/automations';

interface Template {
  slug: string;
  name: string;
}

interface AutomationData {
  id?: string;
  name: string;
  slug: string;
  description: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  global_stop_conditions: Record<string, any>;
  send_window_start: string;
  send_window_end: string;
  send_window_timezone: string;
  send_on_weekends: boolean;
  is_active: boolean;
  email_automation_steps?: any[];
}

const defaultAutomation: AutomationData = {
  name: '',
  slug: '',
  description: '',
  trigger_type: '',
  trigger_conditions: {},
  global_stop_conditions: {},
  send_window_start: '09:00',
  send_window_end: '17:00',
  send_window_timezone: 'America/Chicago',
  send_on_weekends: false,
  is_active: true,
};

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Trigger', triggerType: '' },
  },
];

const initialEdges: Edge[] = [];

function AutomationEditor() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [automation, setAutomation] = useState<AutomationData>(defaultAutomation);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/admin/email-templates');
        if (res.ok) {
          const data = await res.json();
          setTemplates(
            (data.templates || []).map((t: any) => ({
              slug: t.slug,
              name: t.name,
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
      }
    };
    fetchTemplates();
  }, []);

  // Fetch automation if editing
  useEffect(() => {
    if (isNew) return;

    const fetchAutomation = async () => {
      try {
        const res = await fetch(`/api/admin/automations/${params.id}`);
        if (!res.ok) throw new Error('Automation not found');
        const data = await res.json();

        setAutomation(data.automation);

        // Convert to flow
        const { nodes: flowNodes, edges: flowEdges } = automationToFlow(data.automation);
        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load automation');
      } finally {
        setLoading(false);
      }
    };
    fetchAutomation();
  }, [isNew, params.id, setNodes, setEdges]);

  // Track dirty state
  useEffect(() => {
    if (!loading) {
      setIsDirty(true);
    }
  }, [nodes, edges, automation, loading]);

  // Connect nodes
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Handle drag start from toolbox
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Only allow one trigger node
      if (type === 'trigger' && nodes.some((n) => n.type === 'trigger')) {
        alert('Only one trigger node is allowed');
        return;
      }

      const reactFlowBounds = (event.target as HTMLElement)
        .closest('.react-flow')
        ?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 80,
        y: event.clientY - reactFlowBounds.top - 20,
      };

      const newNode: Node = {
        id: generateNodeId(type),
        type,
        position,
        data: getDefaultNodeData(type),
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes]
  );

  // Handle drag over
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node selection
  const onNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
    if (node) {
      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: n.id === node.id }))
      );
    }
  }, [setNodes]);

  // Handle node update
  const onNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      );
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      );
    },
    [setNodes]
  );

  // Handle node delete
  const onDeleteNode = useCallback(
    (nodeId: string) => {
      // Don't allow deleting trigger if it's the only one
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === 'trigger') {
        alert('Cannot delete the trigger node');
        return;
      }

      // Find incoming and outgoing edges
      const incomingEdges = edges.filter((e) => e.target === nodeId);
      const outgoingEdges = edges.filter((e) => e.source === nodeId);

      // Create new edges to reconnect
      const newEdges: Edge[] = [];
      for (const incoming of incomingEdges) {
        for (const outgoing of outgoingEdges) {
          newEdges.push({
            id: `edge-${incoming.source}-${outgoing.target}`,
            source: incoming.source,
            target: outgoing.target,
            sourceHandle: incoming.sourceHandle,
            targetHandle: outgoing.targetHandle,
            type: 'smoothstep',
            animated: true,
          });
        }
      }

      // Remove node and its edges, add reconnection edges
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => [
        ...eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
        ...newEdges,
      ]);

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null);
      }
    },
    [nodes, edges, selectedNode, setNodes, setEdges]
  );

  // Save automation
  const handleSave = async () => {
    // Validate
    const errors = validateWorkflow(nodes, edges);
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'));
      return;
    }

    if (!automation.name || !automation.slug) {
      alert('Please fill in the name and slug');
      setShowSettings(true);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { automation: flowAutomation, steps } = flowToAutomation(nodes, edges, {
        name: automation.name,
        slug: automation.slug,
        description: automation.description,
        sendWindowStart: automation.send_window_start,
        sendWindowEnd: automation.send_window_end,
        sendWindowTimezone: automation.send_window_timezone,
        sendOnWeekends: automation.send_on_weekends,
        globalStopConditions: automation.global_stop_conditions,
        isActive: automation.is_active,
      });

      const url = isNew
        ? '/api/admin/automations'
        : `/api/admin/automations/${params.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...flowAutomation,
          triggerType: flowAutomation.trigger_type,
          triggerConditions: flowAutomation.trigger_conditions,
          globalStopConditions: flowAutomation.global_stop_conditions,
          sendWindowStart: flowAutomation.send_window_start,
          sendWindowEnd: flowAutomation.send_window_end,
          sendWindowTimezone: flowAutomation.send_window_timezone,
          sendOnWeekends: flowAutomation.send_on_weekends,
          isActive: flowAutomation.is_active,
          steps,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save automation');
      }

      const data = await res.json();
      setIsDirty(false);

      if (isNew) {
        router.push(`/admin/automations/${data.automation.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save automation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/automations"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {isNew ? 'New Automation' : automation.name || 'Edit Automation'}
            </h1>
            {automation.slug && (
              <p className="text-sm text-gray-500">{automation.slug}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-1.5 text-sm rounded-md ${
              isDirty
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-500'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={automation.name}
                onChange={(e) =>
                  setAutomation((a) => ({ ...a, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="My Automation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug *
              </label>
              <input
                type="text"
                value={automation.slug}
                onChange={(e) =>
                  setAutomation((a) => ({
                    ...a,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="my-automation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Send Window
              </label>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={automation.send_window_start}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_window_start: e.target.value }))
                  }
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="time"
                  value={automation.send_window_end}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_window_end: e.target.value }))
                  }
                  className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Options
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={automation.send_on_weekends}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_on_weekends: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                Send on weekends
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <Toolbox onDragStart={onDragStart} />

        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeSelect={onNodeSelect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDeleteNode={onDeleteNode}
        />

        <PropertiesPanel
          selectedNode={selectedNode}
          onNodeUpdate={onNodeUpdate}
          templates={templates}
        />
      </div>
    </div>
  );
}

export default function AutomationEditorPage() {
  return (
    <ReactFlowProvider>
      <AutomationEditor />
    </ReactFlowProvider>
  );
}
