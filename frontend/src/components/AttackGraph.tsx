"use client";

import { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Position,
} from "@xyflow/react";
import Dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { PropagationGraph, RemediationAction, GraphNode as GNode } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc4e41",
  high: "#f58220",
  medium: "#fbbf24",
  low: "#5c6670",
};

const ENTITY_ICONS: Record<string, string> = {
  attacker: ">>",
  package: "[pkg]",
  endpoint: "[host]",
  pipeline: "[ci]",
  repo: "[repo]",
  secret: "[key]",
};

function autoLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 100 });

  nodes.forEach((node) => g.setNode(node.id, { width: 180, height: 50 }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  Dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return { ...node, position: { x: pos.x - 90, y: pos.y - 25 } };
  });
}

function nodeToFlow(n: GNode): Node {
  return {
    id: n.id,
    position: { x: 0, y: 0 },
    data: { label: `${ENTITY_ICONS[n.entity_type] || "●"} ${n.label}` },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: {
      background: "var(--bg-surface)",
      color: "var(--text-primary)",
      border: `2px solid ${SEVERITY_COLORS[n.severity] || SEVERITY_COLORS.low}`,
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "12px",
      fontFamily: "monospace",
    },
  };
}

function graphToFlow(graph: PropagationGraph, existingNodes: Node[]): { nodes: Node[]; edges: Edge[] } {
  const seenIds = new Set(existingNodes.map((n) => n.id));
  const allFlowNodes = [...existingNodes];

  for (const n of graph.nodes) {
    if (!seenIds.has(n.id)) {
      allFlowNodes.push(nodeToFlow(n));
      seenIds.add(n.id);
    }
  }

  const edges: Edge[] = graph.edges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "var(--border-active)" },
    labelStyle: { fill: "var(--text-muted)", fontSize: 10 },
  }));

  const layoutNodes = autoLayout(allFlowNodes, edges);
  return { nodes: layoutNodes, edges };
}

export function AttackGraph({
  graph,
  discoveredEntities,
  remediationPlan,
  investigationId,
}: {
  graph: PropagationGraph | null;
  discoveredEntities: GNode[];
  remediationPlan: RemediationAction[];
  investigationId: string | null;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    if (discoveredEntities.length > 0) {
      const seenIds = new Set(nodes.map((n) => n.id));
      const newNodes = discoveredEntities
        .filter((e) => !seenIds.has(e.id))
        .map((e) => nodeToFlow(e));
      if (newNodes.length > 0) {
        const allNodes = autoLayout([...nodes, ...newNodes], edges);
        setNodes(allNodes);
      }
    }
  }, [discoveredEntities]);

  useEffect(() => {
    if (graph && graph.nodes.length > 0) {
      const { nodes: flowNodes, edges: flowEdges } = graphToFlow(graph, nodes);
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [graph]);

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2" style={{ color: "var(--text-muted)" }}>⬡</div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Attack graph will appear after the agent discovers entities and connections.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        proOptions={{ hideAttribution: true }}
        style={{ background: "var(--bg-primary)" }}
      >
        <Background color="var(--border-primary)" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
