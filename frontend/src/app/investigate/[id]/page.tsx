"use client";

import { useState, useCallback, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { getInvestigation, createInvestigation, streamInvestigation } from "@/lib/api";
import type { InvestigationState, StateUpdate, InvestigationPhase } from "@/lib/types";
import { AgentStateMachine } from "@/components/AgentStateMachine";
import { DecisionLog } from "@/components/DecisionLog";
import { WorkspaceTabs } from "@/components/WorkspaceTabs";
import { EntitySidebar } from "@/components/EntitySidebar";
import { RemediationBar } from "@/components/RemediationBar";

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

export default function InvestigationWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<InvestigationState>(EMPTY_STATE);
  const [phase, setPhase] = useState<InvestigationPhase>("detecting");
  const [updates, setUpdates] = useState<StateUpdate[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const startStream = useCallback((invId: string) => {
    setIsRunning(true);
    streamInvestigation(
      invId,
      (update) => {
        setUpdates((prev) => [...prev, update]);
        if (update.status) setPhase(update.status);
        setState((prev) => ({
          ...prev,
          ...update.update,
          status: update.status || prev.status,
        }));
      },
      (finalState) => {
        setState(finalState as InvestigationState);
        setIsRunning(false);
      },
    );
  }, []);

  useEffect(() => {
    getInvestigation(id)
      .then((data) => {
        setState(data);
        setPhase(data.status);
        setLoaded(true);
        if (data.status === "detecting" || data.status === "investigating" || data.status === "assessing" || data.status === "remediating") {
          startStream(id);
        }
      })
      .catch(() => {
        startStream(id);
        setLoaded(true);
      });
  }, [id, startStream]);

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chainguard-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const severityColor = state.severity_score >= 8 ? "var(--red)" :
    state.severity_score >= 6 ? "var(--orange)" :
    state.severity_score >= 4 ? "var(--yellow)" : "var(--green)";

  return (
    <div className="flex flex-col h-screen">
      {/* Header Bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3"
           style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-primary)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="p-1.5 rounded-md hover:bg-white/5 cursor-pointer">
            <ArrowLeft size={16} style={{ color: "var(--text-muted)" }} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                Investigation {id}
              </span>
              {state.attack_type && state.attack_type !== "unknown" && (
                <span className="badge" style={{ color: "var(--orange)", background: "var(--orange-dim)" }}>
                  {state.attack_type.replace(/_/g, " ")}
                </span>
              )}
              {isRunning && (
                <span className="badge pulse-dot" style={{ color: "var(--green)", background: "var(--green-dim)" }}>
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
              <span>Phase: <span style={{ color: "var(--text-secondary)" }}>{phase}</span></span>
              {state.severity_score > 0 && (
                <span>Severity: <span style={{ color: severityColor, fontWeight: 600 }}>{state.severity_score.toFixed(1)}</span></span>
              )}
              <span>Loop: {state.loop_count}/3</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)", color: "var(--text-secondary)" }}>
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Main workspace grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: State Machine + Decision Log */}
        <div className="w-[260px] shrink-0 flex flex-col overflow-y-auto"
             style={{ borderRight: "1px solid var(--border-primary)" }}>
          <AgentStateMachine phase={phase} isRunning={isRunning} loopCount={state.loop_count} />
          <DecisionLog updates={updates} reasoning={state.reasoning} />
        </div>

        {/* Center: Tabbed Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <WorkspaceTabs state={state} updates={updates} investigationId={id} />
        </div>

        {/* Right: Entity Sidebar */}
        <div className="w-[280px] shrink-0 overflow-y-auto"
             style={{ borderLeft: "1px solid var(--border-primary)" }}>
          <EntitySidebar state={state} />
        </div>
      </div>

      {/* Bottom: Remediation Bar */}
      {state.remediation_plan.length > 0 && (
        <RemediationBar
          actions={state.remediation_plan}
          investigationId={id}
          onUpdate={() => getInvestigation(id).then(setState)}
        />
      )}
    </div>
  );
}
