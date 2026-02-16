import { Node, Edge } from 'reactflow';

interface AutomationMetadata {
  name: string;
  slug: string;
  description?: string;
  sendWindowStart?: string;
  sendWindowEnd?: string;
  sendWindowTimezone?: string;
  sendOnWeekends?: boolean;
  globalStopConditions?: Record<string, any>;
  isActive?: boolean;
}

interface AutomationStep {
  id?: string;
  step_order: number;
  delay_days: number;
  delay_hours: number;
  delay_from: string;
  template_slug: string;
  subject_override?: string;
  send_conditions: Record<string, any>;
  skip_conditions: Record<string, any>;
}

interface Automation {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  trigger_type: string;
  trigger_conditions: Record<string, any>;
  global_stop_conditions: Record<string, any>;
  send_window_start?: string;
  send_window_end?: string;
  send_window_timezone?: string;
  send_on_weekends?: boolean;
  is_active?: boolean;
}

interface FlowResult {
  automation: Automation;
  steps: AutomationStep[];
}

interface NodesEdgesResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Convert visual flow to database format
 */
export function flowToAutomation(
  nodes: Node[],
  edges: Edge[],
  metadata: AutomationMetadata
): FlowResult {
  // Find trigger node
  const triggerNode = nodes.find((n) => n.type === 'trigger');
  if (!triggerNode) {
    throw new Error('Automation must have a trigger node');
  }

  const automation: Automation = {
    name: metadata.name,
    slug: metadata.slug,
    description: metadata.description,
    trigger_type: triggerNode.data.triggerType || 'manual',
    trigger_conditions: triggerNode.data.conditions || {},
    global_stop_conditions: metadata.globalStopConditions || {},
    send_window_start: metadata.sendWindowStart || '09:00',
    send_window_end: metadata.sendWindowEnd || '17:00',
    send_window_timezone: metadata.sendWindowTimezone || 'America/Chicago',
    send_on_weekends: metadata.sendOnWeekends || false,
    is_active: metadata.isActive ?? true,
  };

  // Walk the graph from trigger to build steps
  const steps: AutomationStep[] = [];
  let stepOrder = 1;

  // Build adjacency map
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const sources = adjacency.get(edge.source) || [];
    sources.push(edge.target);
    adjacency.set(edge.source, sources);
  }

  // BFS to walk the graph
  const visited = new Set<string>();
  const queue: string[] = [triggerNode.id];
  let currentDelayDays = 0;
  let currentDelayHours = 0;
  let currentDelayFrom = 'previous_step';

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = nodes.find((n) => n.id === nodeId);
    if (!node) continue;

    // Process delay nodes - accumulate delay for next email
    if (node.type === 'delay') {
      currentDelayDays = node.data.delayDays || 0;
      currentDelayHours = node.data.delayHours || 0;
      currentDelayFrom = node.data.delayFrom || 'previous_step';
    }

    // Process email nodes - create a step
    if (node.type === 'email' && node.data.templateSlug) {
      steps.push({
        step_order: stepOrder++,
        delay_days: currentDelayDays,
        delay_hours: currentDelayHours,
        delay_from: currentDelayFrom,
        template_slug: node.data.templateSlug,
        subject_override: node.data.subjectOverride || undefined,
        send_conditions: node.data.sendConditions || {},
        skip_conditions: node.data.skipConditions || {},
      });

      // Reset delay after adding step
      currentDelayDays = 0;
      currentDelayHours = 0;
    }

    // Process condition nodes - add conditions to next email
    if (node.type === 'condition') {
      // For now, conditions create branching which we'll handle in the queue
      // The "yes" branch continues, "no" branch could go to end
    }

    // Add children to queue
    const children = adjacency.get(nodeId) || [];
    for (const childId of children) {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    }
  }

  return { automation, steps };
}

/**
 * Convert database format to visual flow
 */
export function automationToFlow(
  automation: Automation & { email_automation_steps?: AutomationStep[] }
): NodesEdgesResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create trigger node
  const triggerNode: Node = {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 250, y: 50 },
    data: {
      label: 'Trigger',
      triggerType: automation.trigger_type,
      conditions: automation.trigger_conditions,
    },
  };
  nodes.push(triggerNode);

  const steps = automation.email_automation_steps || [];
  let lastNodeId = triggerNode.id;
  let yPosition = 150;

  for (const step of steps.sort((a, b) => a.step_order - b.step_order)) {
    // Add delay node if there's a delay
    if (step.delay_days > 0 || step.delay_hours > 0) {
      const delayNodeId = `delay-${step.step_order}`;
      const delayNode: Node = {
        id: delayNodeId,
        type: 'delay',
        position: { x: 250, y: yPosition },
        data: {
          delayDays: step.delay_days,
          delayHours: step.delay_hours,
          delayFrom: step.delay_from,
        },
      };
      nodes.push(delayNode);

      edges.push({
        id: `edge-${lastNodeId}-${delayNodeId}`,
        source: lastNodeId,
        target: delayNodeId,
        type: 'smoothstep',
        animated: true,
      });

      lastNodeId = delayNodeId;
      yPosition += 100;
    }

    // Add email node
    const emailNodeId = `email-${step.step_order}`;
    const emailNode: Node = {
      id: emailNodeId,
      type: 'email',
      position: { x: 250, y: yPosition },
      data: {
        templateSlug: step.template_slug,
        subjectOverride: step.subject_override,
        sendConditions: step.send_conditions,
        skipConditions: step.skip_conditions,
      },
    };
    nodes.push(emailNode);

    edges.push({
      id: `edge-${lastNodeId}-${emailNodeId}`,
      source: lastNodeId,
      target: emailNodeId,
      type: 'smoothstep',
      animated: true,
    });

    lastNodeId = emailNodeId;
    yPosition += 100;
  }

  // Add end node
  const endNode: Node = {
    id: 'end-1',
    type: 'end',
    position: { x: 250, y: yPosition },
    data: { reason: 'Sequence Complete' },
  };
  nodes.push(endNode);

  edges.push({
    id: `edge-${lastNodeId}-end-1`,
    source: lastNodeId,
    target: 'end-1',
    type: 'smoothstep',
    animated: true,
  });

  return { nodes, edges };
}

/**
 * Validate a workflow before saving
 * @param strict - If true, requires all email nodes to have templates (for activation)
 */
export function validateWorkflow(nodes: Node[], edges: Edge[], strict: boolean = false): string[] {
  const errors: string[] = [];

  // Must have exactly one trigger
  const triggerNodes = nodes.filter((n) => n.type === 'trigger');
  if (triggerNodes.length === 0) {
    errors.push('Automation must have a trigger node');
  } else if (triggerNodes.length > 1) {
    errors.push('Automation can only have one trigger node');
  } else if (!triggerNodes[0].data.triggerType) {
    errors.push('Trigger must have a trigger type selected');
  }

  // Strict validation (for activation): require at least one email with template
  if (strict) {
    const emailNodes = nodes.filter((n) => n.type === 'email');
    if (emailNodes.length === 0) {
      errors.push('Automation must have at least one email action');
    }

    // All email nodes must have template selected
    for (const emailNode of emailNodes) {
      if (!emailNode.data.templateSlug) {
        errors.push(`Email node must have a template selected`);
      }
    }
  }

  // Check that all non-trigger nodes have incoming edges
  for (const node of nodes) {
    if (node.type === 'trigger') continue;
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      errors.push(`Node "${node.type}" is not connected to the workflow`);
    }
  }

  return errors;
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(type: string): string {
  return `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create default data for a node type
 */
export function getDefaultNodeData(type: string): Record<string, any> {
  switch (type) {
    case 'trigger':
      return { label: 'Trigger', triggerType: '' };
    case 'delay':
      return { delayDays: 1, delayHours: 0, delayFrom: 'previous_step' };
    case 'email':
      return { templateSlug: '', subjectOverride: '' };
    case 'condition':
      return { field: '', operator: '', value: '', conditionLabel: '' };
    case 'end':
      return { reason: '' };
    default:
      return {};
  }
}
