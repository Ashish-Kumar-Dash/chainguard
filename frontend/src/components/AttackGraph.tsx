"use client";

import { useCallback, useEffect, useState } from "react";
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
import { RemediationCard } from "./RemediationCard";
import { getInvestigation } from "@/lib/api";
import type { PropagationGraph, RemediationAction, GraphNode as GNode } from "@/lib/types";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#6b7280",
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
      background: "#1f2937",
      color: "#e5e7eb",
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
    style: { stroke: "#4b5563" },
    labelStyle: { fill: "#9ca3af", fontSize: 10 },
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
  const [actions, setActions] = useState<RemediationAction[]>(remediationPlan);

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

  useEffect(() => {
    setActions(remediationPlan);
  }, [remediationPlan]);

  const handleActionUpdate = useCallback(async () => {
    if (!investigationId) return;
    const state = await getInvestigation(investigationId);
    setActions(state.remediation_plan || []);
  }, [investigationId]);

  const hasGraph = nodes.length > 0;
  const hasActions = actions.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">
          {hasActions ? "Attack Graph & Remediation" : "Attack Propagation Graph"}
        </h2>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        {hasGraph ? (
          <div className={hasActions ? "h-1/2" : "flex-1"}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#374151" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        ) : (
          !hasActions && (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
              Attack graph will appear after impact assessment.
            </div>
          )
        )}
        {hasActions && (
          <div className={`${hasGraph ? "h-1/2" : "flex-1"} overflow-y-auto p-4 border-t border-gray-800`}>
            <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase">Remediation Actions</h3>
            {actions.map((action) => (
              <RemediationCard
                key={action.id}
                action={action}
                investigationId={investigationId || ""}
                onUpdate={handleActionUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
