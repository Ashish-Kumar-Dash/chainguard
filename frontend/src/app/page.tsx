"use client";

import { useState, useCallback } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { PhaseIndicator } from "@/components/PhaseIndicator";
import { Timeline } from "@/components/Timeline";
import { AttackGraph } from "@/components/AttackGraph";
import { createInvestigation, streamInvestigation } from "@/lib/api";
import type { InvestigationState, StateUpdate, InvestigationPhase } from "@/lib/types";

const EMPTY_STATE: InvestigationState = {
  alert_raw: "",
  attack_type: "unknown",
  iocs: [],
  investigation_plan: [],
  splunk_queries: [],
  findings: [],
  new_iocs: [],
  loop_count: 0,
  blast_radius: null,
  severity_score: 0,
  attack_timeline: [],
  propagation_graph: null,
  discovered_entities: [],
  remediation_plan: [],
  approved_actions: [],
  rejected_actions: [],
  reasoning: [],
  status: "detecting",
};

interface ReasoningMessage {
  role: "agent";
  content: string;
  node: string;
  timestamp: Date;
}

export default function Home() {
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [state, setState] = useState<InvestigationState>(EMPTY_STATE);
  const [phase, setPhase] = useState<InvestigationPhase>("detecting");
  const [nodeUpdates, setNodeUpdates] = useState<StateUpdate[]>([]);
  const [reasoningMessages, setReasoningMessages] = useState<ReasoningMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const startStream = useCallback((id: string) => {
    setIsRunning(true);
    streamInvestigation(
      id,
      (update) => {
        setNodeUpdates((prev) => [...prev, update]);
        if (update.status) setPhase(update.status);
        setState((prev) => ({ ...prev, ...update.update, status: update.status || prev.status }));

        if (update.reasoning?.length) {
          for (const text of update.reasoning) {
            setReasoningMessages((prev) => [
              ...prev,
              { role: "agent", content: text, node: update.node, timestamp: new Date() },
            ]);
          }
        }
      },
      (finalState) => {
        setState(finalState as InvestigationState);
        setIsRunning(false);
      },
    );
  }, []);

  const handleSubmit = useCallback(async (alert: string) => {
    setState({ ...EMPTY_STATE, alert_raw: alert });
    setNodeUpdates([]);
    setReasoningMessages([]);

    const { investigation_id } = await createInvestigation(alert);
    setInvestigationId(investigation_id);
    startStream(investigation_id);
  }, [startStream]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <PhaseIndicator phase={phase} isRunning={isRunning} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-1/3 border-r border-gray-800">
          <ChatPanel
            onSubmit={handleSubmit}
            state={state}
            isRunning={isRunning}
            investigationId={investigationId}
            reasoningMessages={reasoningMessages}
          />
        </div>

        {/* Center: Timeline */}
        <div className="w-1/3 border-r border-gray-800">
          <Timeline updates={nodeUpdates} state={state} />
        </div>

        {/* Right: Attack Graph + Remediation */}
        <div className="w-1/3">
          <AttackGraph
            graph={state.propagation_graph}
            discoveredEntities={state.discovered_entities || []}
            remediationPlan={state.remediation_plan}
            investigationId={investigationId}
          />
        </div>
      </div>
    </div>
  );
}
