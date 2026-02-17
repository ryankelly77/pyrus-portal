'use client'

import { useState, useEffect, useCallback, useMemo, DragEvent } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import {
  Toolbox,
  PropertiesPanel,
  WorkflowCanvas,
  flowToAutomation,
  automationToFlow,
  validateWorkflow,
  generateNodeId,
  getDefaultNodeData,
} from '@/components/admin/automations'
import 'reactflow/dist/style.css'

interface Template {
  slug: string
  name: string
}

interface EnrollmentContact {
  email: string
  name: string | null
  type: string | null
  enrolledAt: string
}

interface StepCount {
  count: number
  contacts: EnrollmentContact[]
}

interface EnrollmentData {
  totalActive: number
  stepCounts: Record<number, StepCount>
  steps: Array<{ stepOrder: number; templateSlug: string }>
}

interface AutomationData {
  id?: string
  name: string
  slug: string
  description: string
  trigger_type: string
  trigger_conditions: Record<string, any>
  global_stop_conditions: Record<string, any>
  send_window_start: string
  send_window_end: string
  send_window_timezone: string
  send_on_weekends: boolean
  is_active: boolean
  email_automation_steps?: any[]
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
}

const initialNodes: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: { label: 'Trigger', triggerType: '' },
  },
]

const initialEdges: Edge[] = []

function AutomationEditor() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === 'new'

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const { screenToFlowPosition } = useReactFlow()
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [automation, setAutomation] = useState<AutomationData>(defaultAutomation)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [showSettings, setShowSettings] = useState(isNew)
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null)

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch('/api/admin/email-templates')
        if (res.ok) {
          const data = await res.json()
          // Extract templates from categories and uncategorized
          const allTemplates: Template[] = []
          if (data.categories) {
            data.categories.forEach((cat: any) => {
              cat.templates?.forEach((t: any) => {
                allTemplates.push({ slug: t.slug, name: t.name })
              })
            })
          }
          if (data.uncategorized) {
            data.uncategorized.forEach((t: any) => {
              allTemplates.push({ slug: t.slug, name: t.name })
            })
          }
          // Fallback for flat templates array
          if (data.templates) {
            data.templates.forEach((t: any) => {
              allTemplates.push({ slug: t.slug, name: t.name })
            })
          }
          setTemplates(allTemplates)
        }
      } catch (err) {
        console.error('Error fetching templates:', err)
      }
    }
    fetchTemplates()
  }, [])

  // Fetch automation if editing
  useEffect(() => {
    if (isNew) return

    const fetchAutomation = async () => {
      try {
        const res = await fetch(`/api/admin/automations/${params.id}`)
        if (!res.ok) throw new Error('Automation not found')
        const data = await res.json()

        setAutomation(data.automation)

        console.log('Loaded automation:', data.automation)
        console.log('flow_definition:', data.automation.flow_definition)

        // Use saved flow definition if available, otherwise reconstruct from steps
        if (data.automation.flow_definition?.nodes && data.automation.flow_definition?.edges) {
          console.log('Using saved flow_definition')
          setNodes(data.automation.flow_definition.nodes)
          setEdges(data.automation.flow_definition.edges)
        } else {
          console.log('Reconstructing from steps (no flow_definition)')
          // Fallback: reconstruct from database steps
          const { nodes: flowNodes, edges: flowEdges } = automationToFlow(data.automation)
          setNodes(flowNodes)
          setEdges(flowEdges)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load automation')
      } finally {
        setLoading(false)
      }
    }
    fetchAutomation()
  }, [isNew, params.id, setNodes, setEdges])

  // Fetch enrollment counts for existing automations
  useEffect(() => {
    if (isNew) return

    const fetchEnrollmentCounts = async () => {
      try {
        const res = await fetch(`/api/admin/automations/${params.id}/enrollment-counts`)
        if (res.ok) {
          const data = await res.json()
          setEnrollmentData(data)
        }
      } catch (err) {
        console.error('Error fetching enrollment counts:', err)
      }
    }

    // Fetch immediately
    fetchEnrollmentCounts()

    // Poll every 30 seconds
    const interval = setInterval(fetchEnrollmentCounts, 30000)
    return () => clearInterval(interval)
  }, [isNew, params.id])

  // Track dirty state
  useEffect(() => {
    if (!loading) {
      setIsDirty(true)
    }
  }, [nodes, edges, automation, loading])

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
      )
    },
    [setEdges]
  )

  // Handle drag start from toolbox
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  // Handle drop on canvas
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()

      const type = event.dataTransfer.getData('application/reactflow')
      if (!type) return

      // Only allow one trigger node
      if (type === 'trigger' && nodes.some((n) => n.type === 'trigger')) {
        alert('Only one trigger node is allowed')
        return
      }

      // Convert screen coordinates to flow coordinates (accounts for zoom/pan)
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      // Offset to center the node on the cursor
      position.x -= 80
      position.y -= 20

      const newNode: Node = {
        id: generateNodeId(type),
        type,
        position,
        data: getDefaultNodeData(type),
      }

      setNodes((nds) => [...nds, newNode])
    },
    [nodes, setNodes, screenToFlowPosition]
  )

  // Handle drag over
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  // Handle node selection
  const onNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node)
    if (node) {
      setNodes((nds) =>
        nds.map((n) => ({ ...n, selected: n.id === node.id }))
      )
    }
  }, [setNodes])

  // Handle node update
  const onNodeUpdate = useCallback(
    (nodeId: string, data: Record<string, any>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
        )
      )
      setSelectedNode((prev) =>
        prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev
      )
    },
    [setNodes]
  )

  // Handle node delete
  const onDeleteNode = useCallback(
    (nodeId: string) => {
      // Don't allow deleting trigger if it's the only one
      const node = nodes.find((n) => n.id === nodeId)
      if (node?.type === 'trigger') {
        alert('Cannot delete the trigger node')
        return
      }

      // Find incoming and outgoing edges
      const incomingEdges = edges.filter((e) => e.target === nodeId)
      const outgoingEdges = edges.filter((e) => e.source === nodeId)

      // Create new edges to reconnect
      const newEdges: Edge[] = []
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
          })
        }
      }

      // Remove node and its edges, add reconnection edges
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => [
        ...eds.filter((e) => e.source !== nodeId && e.target !== nodeId),
        ...newEdges,
      ])

      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    },
    [nodes, edges, selectedNode, setNodes, setEdges]
  )

  // Save automation
  const handleSave = async () => {
    // Validate - strict validation only when automation is active
    const errors = validateWorkflow(nodes, edges, automation.is_active)
    if (errors.length > 0) {
      alert('Validation errors:\n' + errors.join('\n'))
      return
    }

    if (!automation.name || !automation.slug) {
      alert('Please fill in the name and slug')
      setShowSettings(true)
      return
    }

    setSaving(true)
    setError(null)

    try {
      console.log('Saving automation...')
      console.log('Nodes:', nodes.map(n => ({ id: n.id, type: n.type, position: n.position })))
      console.log('Edges:', edges.length)

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
      })

      const url = isNew
        ? '/api/admin/automations'
        : `/api/admin/automations/${params.id}`
      const method = isNew ? 'POST' : 'PATCH'

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
          // Save the full visual layout - create clean copies without internal ReactFlow properties
          flowDefinition: {
            nodes: nodes.map(n => ({
              id: n.id,
              type: n.type,
              position: n.position,
              data: n.data,
            })),
            edges: edges.map(e => ({
              id: e.id,
              source: e.source,
              target: e.target,
              sourceHandle: e.sourceHandle,
              targetHandle: e.targetHandle,
              type: e.type,
              animated: e.animated,
            })),
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save automation')
      }

      const data = await res.json()
      setIsDirty(false)

      if (isNew) {
        router.push(`/admin/automations/${data.automation.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save automation')
    } finally {
      setSaving(false)
    }
  }

  // Enhance nodes with enrollment data
  const nodesWithEnrollment = useMemo(() => {
    if (!enrollmentData) return nodes

    // Build step order mapping: find email nodes in order
    const emailNodes = nodes
      .filter((n) => n.type === 'email')
      .sort((a, b) => a.position.y - b.position.y)

    // Map step_order to node IDs
    const stepToNodeId: Record<number, string> = {}
    emailNodes.forEach((node, index) => {
      stepToNodeId[index + 1] = node.id
    })

    // Find delay nodes that come before each email node
    const delayNodes = nodes.filter((n) => n.type === 'delay')
    const delayToStepOrder: Record<string, number> = {}

    for (const delay of delayNodes) {
      // Find which email node this delay leads to by checking edges
      const outgoingEdge = edges.find((e) => e.source === delay.id)
      if (outgoingEdge) {
        const targetNode = nodes.find((n) => n.id === outgoingEdge.target)
        if (targetNode?.type === 'email') {
          const stepOrder = emailNodes.findIndex((e) => e.id === targetNode.id) + 1
          if (stepOrder > 0) {
            // The delay before step N shows enrollments that completed step N-1
            delayToStepOrder[delay.id] = stepOrder - 1
          }
        }
      }
    }

    return nodes.map((node) => {
      if (node.type === 'trigger') {
        // Trigger shows total active enrollments
        return {
          ...node,
          data: {
            ...node.data,
            enrollmentCount: enrollmentData.totalActive,
            enrollmentContacts: Object.values(enrollmentData.stepCounts)
              .flatMap((sc) => sc.contacts)
              .slice(0, 10),
          },
        }
      }

      if (node.type === 'email') {
        const stepOrder = emailNodes.findIndex((e) => e.id === node.id) + 1
        // Email node shows enrollments that completed the previous step (waiting for this step)
        const previousStep = stepOrder - 1
        const stepCount = enrollmentData.stepCounts[previousStep]
        return {
          ...node,
          data: {
            ...node.data,
            enrollmentCount: stepCount?.count || 0,
            enrollmentContacts: stepCount?.contacts || [],
          },
        }
      }

      if (node.type === 'delay') {
        // Delay shows enrollments waiting for this delay to complete
        const stepOrder = delayToStepOrder[node.id]
        if (stepOrder !== undefined) {
          const stepCount = enrollmentData.stepCounts[stepOrder]
          return {
            ...node,
            data: {
              ...node.data,
              enrollmentCount: stepCount?.count || 0,
              enrollmentContacts: stepCount?.contacts || [],
            },
          }
        }
      }

      return node
    })
  }, [nodes, edges, enrollmentData])

  if (loading) {
    return (
      <div className="automation-editor-loading">
        <div className="spinner"></div>
        <p>Loading automation...</p>
      </div>
    )
  }

  return (
    <div className="automation-editor">
      {/* Header */}
      <div className="automation-editor-header">
        <div className="automation-editor-header-left">
          <div className="page-header-with-back">
            <Link href="/admin/emails?tab=automation" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Back to Automations
            </Link>
            <h1 className="page-title-inline">{isNew ? 'New Automation' : automation.name || 'Edit Automation'}</h1>
          </div>
        </div>
        <div className="automation-editor-header-right">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-outline btn-sm"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            Settings
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn btn-sm ${isDirty ? 'btn-primary' : 'btn-outline'}`}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="automation-editor-error">
          {error}
        </div>
      )}

      {/* Settings panel (collapsible) */}
      {showSettings && (
        <div className="automation-settings-panel">
          <div className="automation-settings-grid">
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={automation.name}
                onChange={(e) =>
                  setAutomation((a) => ({ ...a, name: e.target.value }))
                }
                placeholder="My Automation"
              />
            </div>
            <div className="form-group">
              <label>Slug *</label>
              <input
                type="text"
                value={automation.slug}
                onChange={(e) =>
                  setAutomation((a) => ({
                    ...a,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                placeholder="my-automation"
              />
            </div>
            <div className="form-group">
              <label>Send Window</label>
              <div className="time-inputs">
                <input
                  type="time"
                  value={automation.send_window_start}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_window_start: e.target.value }))
                  }
                />
                <span>to</span>
                <input
                  type="time"
                  value={automation.send_window_end}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_window_end: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-group">
              <label>Options</label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.send_on_weekends}
                  onChange={(e) =>
                    setAutomation((a) => ({ ...a, send_on_weekends: e.target.checked }))
                  }
                />
                Send on weekends
              </label>
            </div>
          </div>

          {/* Exit Conditions */}
          <div className="automation-exit-conditions">
            <label className="exit-conditions-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Automatically exit users from this sequence when:
            </label>
            <div className="exit-conditions-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_purchase || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_purchase: e.target.checked,
                      },
                    }))
                  }
                />
                They make a purchase
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_email_open || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_email_open: e.target.checked,
                      },
                    }))
                  }
                />
                They open any email
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_email_click || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_email_click: e.target.checked,
                      },
                    }))
                  }
                />
                They click a link in any email
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_recommendation_view || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_recommendation_view: e.target.checked,
                      },
                    }))
                  }
                />
                They view their recommendation
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_reply || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_reply: e.target.checked,
                      },
                    }))
                  }
                />
                They reply to any email
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={automation.global_stop_conditions?.on_unsubscribe || false}
                  onChange={(e) =>
                    setAutomation((a) => ({
                      ...a,
                      global_stop_conditions: {
                        ...a.global_stop_conditions,
                        on_unsubscribe: e.target.checked,
                      },
                    }))
                  }
                />
                They unsubscribe
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Main content - Workflow Editor */}
      <div className="automation-editor-content">
        <Toolbox onDragStart={onDragStart} />

        <WorkflowCanvas
          nodes={nodesWithEnrollment}
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

      <style jsx>{`
        .automation-editor {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 60px);
          background: var(--bg-secondary, #f8fafc);
        }

        .automation-editor-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: calc(100vh - 60px);
          gap: 16px;
          color: var(--text-secondary);
        }

        .automation-editor-loading .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-color);
          border-top-color: var(--pyrus-brown);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .automation-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          background: var(--card-bg, white);
          border-bottom: 1px solid var(--border-color);
        }

        .automation-editor-header-left {
          display: flex;
          align-items: center;
        }

        .automation-editor-header-left :global(.page-header-with-back) {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .automation-editor-header-left :global(.back-link) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: var(--pyrus-brown, #885430);
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .automation-editor-header-left :global(.back-link:hover) {
          color: var(--pyrus-brown-dark, #6d4326);
        }

        .automation-editor-header-left :global(.back-link svg) {
          width: 16px;
          height: 16px;
        }

        .automation-editor-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .automation-editor-error {
          padding: 12px 20px;
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
          color: #dc2626;
          font-size: 14px;
        }

        .automation-settings-panel {
          padding: 16px 20px;
          background: var(--card-bg, white);
          border-bottom: 1px solid var(--border-color);
        }

        .automation-settings-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          max-width: 1000px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .form-group input[type="text"],
        .form-group input[type="time"] {
          padding: 8px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          font-size: 14px;
          background: var(--card-bg, white);
          color: var(--text-primary);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--pyrus-brown);
        }

        .time-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .time-inputs input {
          flex: 1;
        }

        .time-inputs span {
          color: var(--text-secondary);
          font-size: 13px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 400 !important;
          cursor: pointer;
        }

        .checkbox-label input {
          width: 16px;
          height: 16px;
        }

        .automation-editor-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .automation-exit-conditions {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid var(--border-color);
        }

        .exit-conditions-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .exit-conditions-label svg {
          color: var(--pyrus-brown);
        }

        .exit-conditions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 24px;
        }

        .exit-conditions-grid .checkbox-label {
          font-size: 13px;
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .automation-settings-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .exit-conditions-grid {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  )
}

export default function AutomationEditorPage() {
  return (
    <ReactFlowProvider>
      <AutomationEditor />
    </ReactFlowProvider>
  )
}
