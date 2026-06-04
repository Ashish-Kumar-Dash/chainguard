"use client";

import { useState, useCallback } from "react";
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

const PHASES: { key: InvestigationPhase; label: string }[] = [
  { key: "detecting", label: "DETECT" },
  { key: "investigating", label: "INVESTIGATE" },
  { key: "assessing", label: "ASSESS" },
  { key: "remediating", label: "REMEDIATE" },
  { key: "awaiting_approval", label: "APPROVAL" },
  { key: "complete", label: "COMPLETE" },
];

const PHASE_ORDER = PHASES.map((p) => p.key);

export default function Home() {
  const [investigationId, setInvestigationId] = useState<string | null>(null);
  const [state, setState] = useState<InvestigationState>(EMPTY_STATE);
  const [phase, setPhase] = useState<InvestigationPhase>("detecting");
  const [nodeUpdates, setNodeUpdates] = useState<StateUpdate[]>([]);
  const [reasoningMessages, setReasoningMessages] = useState<ReasoningMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [alertInput, setAlertInput] = useState("");

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

  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Phase Indicator */}
      <div className="flex items-center gap-2 px-6 py-3 bg-gray-900 border-b border-gray-800">
        <span className="text-sm font-bold text-emerald-400 mr-4">ChainGuard</span>
        {PHASES.map((p, i) => {
          const isActive = p.key === phase;
          const isDone = i < currentIdx;
          return (
            <div key={p.key} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isDone ? "bg-emerald-500" : "bg-gray-700"}`} />}
              <div
                className={`px-3 py-1 rounded text-xs font-mono ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500"
                    : isDone
                    ? "bg-gray-800 text-gray-400"
                    : "bg-gray-900 text-gray-600"
                }`}
              >
                {p.label}
                {isActive && isRunning && <span className="ml-1 animate-pulse">●</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Chat Panel */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Investigation</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {reasoningMessages.length === 0 && !isRunning && (
              <p className="text-gray-500 text-sm">Submit an alert to begin investigation.</p>
            )}
            {reasoningMessages.map((msg, i) => (
              <div key={i} className="text-sm">
                <span className="text-emerald-400 font-mono text-xs">[{msg.node}]</span>
                <p className="text-gray-300 mt-1">{msg.content}</p>
              </div>
            ))}
            {isRunning && (
              <div className="text-emerald-400 text-sm animate-pulse">Investigating...</div>
            )}
          </div>
          <div className="p-4 border-t border-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (alertInput.trim() && !isRunning) {
                  handleSubmit(alertInput.trim());
                  setAlertInput("");
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={alertInput}
                onChange={(e) => setAlertInput(e.target.value)}
                placeholder="Paste alert or describe threat..."
                disabled={isRunning}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isRunning || !alertInput.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Investigate
              </button>
            </form>
          </div>
        </div>

        {/* Center: Timeline */}
        <div className="w-1/3 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Timeline</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {nodeUpdates.length === 0 ? (
              <p className="text-gray-500 text-sm">Timeline events will appear here.</p>
            ) : (
              <div className="space-y-3">
                {nodeUpdates.map((update, i) => (
                  <div key={i} className="border-l-2 border-emerald-500/30 pl-3">
                    <span className="text-xs font-mono text-emerald-400 uppercase">{update.node}</span>
                    {update.reasoning?.map((r, j) => (
                      <p key={j} className="text-sm text-gray-300 mt-1">{r}</p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Attack Graph */}
        <div className="w-1/3 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Attack Graph</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {!state.propagation_graph && state.discovered_entities.length === 0 ? (
              <p className="text-gray-500 text-sm">Attack graph will render here.</p>
            ) : (
              <div className="space-y-2">
                {state.discovered_entities.map((entity, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      entity.severity === "critical" ? "bg-red-500" :
                      entity.severity === "high" ? "bg-orange-500" :
                      entity.severity === "medium" ? "bg-yellow-500" : "bg-gray-500"
                    }`} />
                    <span className="text-gray-300">{entity.label}</span>
                    <span className="text-gray-500 text-xs">({entity.entity_type})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Remediation Actions */}
          {state.remediation_plan.length > 0 && (
            <div className="border-t border-gray-800 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">Remediation Actions</h3>
              <div className="space-y-2">
                {state.remediation_plan.map((action) => (
                  <div key={action.id} className="bg-gray-800/50 rounded p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-200">{action.description}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        action.priority === "critical" ? "bg-red-500/20 text-red-400" :
                        action.priority === "high" ? "bg-orange-500/20 text-orange-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {action.priority}
                      </span>
                    </div>
                    <span className={`text-xs mt-1 ${
                      action.status === "approved" ? "text-green-400" :
                      action.status === "rejected" ? "text-red-400" :
                      "text-gray-500"
                    }`}>
                      {action.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
