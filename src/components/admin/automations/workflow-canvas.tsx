'use client';

import { useCallback, useRef, DragEvent, KeyboardEvent } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { TriggerNode, DelayNode, EmailNode, ConditionNode, EndNode } from './nodes';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  delay: DelayNode,
  email: EmailNode,
  condition: ConditionNode,
  end: EndNode,
};

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  onNodeSelect: (node: Node | null) => void;
  onDrop: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDeleteNode: (nodeId: string) => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onDrop,
  onDragOver,
  onDeleteNode,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
    // Deselect all edges when clicking on pane
    onEdgesChange(
      edges.map((e) => ({ type: 'select' as const, id: e.id, selected: false }))
    );
  }, [onNodeSelect, edges, onEdgesChange]);

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      // Deselect all nodes
      onNodeSelect(null);
      // Select only the clicked edge
      onEdgesChange(
        edges.map((e) => ({
          type: 'select' as const,
          id: e.id,
          selected: e.id === edge.id,
        }))
      );
    },
    [edges, onEdgesChange, onNodeSelect]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Backspace' || event.key === 'Delete') {
        // Delete selected nodes
        const selectedNodes = nodes.filter((n) => n.selected);
        selectedNodes.forEach((node) => {
          onDeleteNode(node.id);
        });

        // Delete selected edges
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedEdges.length > 0) {
          onEdgesChange(
            selectedEdges.map((e) => ({ type: 'remove' as const, id: e.id }))
          );
        }
      }
    },
    [nodes, edges, onDeleteNode, onEdgesChange]
  );

  // Apply selected styling to edges
  const styledEdges = edges.map((edge) => ({
    ...edge,
    style: edge.selected
      ? { stroke: '#ef4444', strokeWidth: 3 }
      : { stroke: '#64748b', strokeWidth: 2 },
  }));

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full"
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        edgesFocusable={true}
        edgesUpdatable={true}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#64748b', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls className="bg-white rounded-lg shadow-md" />
        <MiniMap
          className="bg-white rounded-lg shadow-md"
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger':
                return '#fbbf24';
              case 'delay':
                return '#3b82f6';
              case 'email':
                return '#22c55e';
              case 'condition':
                return '#a855f7';
              case 'end':
                return '#6b7280';
              default:
                return '#94a3b8';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
}
