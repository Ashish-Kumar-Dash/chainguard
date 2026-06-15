"use client";

import { Search, Shield, Crosshair, CheckCircle, Loader2 } from "lucide-react";
import type { InvestigationPhase } from "@/lib/types";

interface SubAgent {
  key: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const SUB_AGENTS: SubAgent[] = [
  {
    key: "ioc_hunter",
    name: "IOC Hunter",
    icon: <Search size={12} />,
    color: "var(--blue)",
    description: "Hunts for indicator matches across all Splunk indexes",
  },
  {
    key: "threat_intel",
    name: "Threat Intel",
    icon: <Shield size={12} />,
    color: "var(--purple)",
    description: "Correlates with known threats and MITRE ATT&CK",
  },
  {
    key: "blast_radius",
    name: "Blast Radius",
    icon: <Crosshair size={12} />,
    color: "var(--orange)",
    description: "Maps compromise scope across infrastructure",
  },
];

type AgentStatus = "idle" | "running" | "complete";

function getAgentStatus(phase: InvestigationPhase, isRunning: boolean): AgentStatus {
  if (phase === "investigating" && isRunning) return "running";
  if (phase === "assessing" || phase === "remediating" || phase === "complete" || phase === "awaiting_approval") return "complete";
  return "idle";
}

export function SubAgentActivity({ phase, isRunning, queryCount }: {
  phase: InvestigationPhase;
  isRunning: boolean;
  queryCount: number;
}) {
  const agentStatus = getAgentStatus(phase, isRunning);

  return (
    <div className="p-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
        Multi-Agent Investigation
      </div>

      {/* Architecture diagram: Supervisor → Fan-out → Merge */}
      <div className="rounded-md p-3 mb-3" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
        {/* Supervisor */}
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <div className="px-2 py-1 rounded text-[9px] font-mono font-bold"
               style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green)" }}>
            SUPERVISOR
          </div>
        </div>

        {/* Fan-out arrows */}
        <div className="flex items-center justify-center mb-2">
          <div className="flex items-center gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-px h-3" style={{ background: agentStatus !== "idle" ? SUB_AGENTS[i].color : "var(--border-primary)" }} />
                {agentStatus === "running" && (
                  <div className={`w-1 h-1 rounded-full flow-dot flow-dot-delay-${i}`}
                       style={{ background: SUB_AGENTS[i].color }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-agents */}
        <div className="space-y-1.5">
          {SUB_AGENTS.map((agent) => (
            <div key={agent.key} className="flex items-center gap-2 px-2 py-1.5 rounded"
                 style={{
                   background: agentStatus === "running" ? agent.color + "10" : "transparent",
                   border: `1px solid ${agentStatus !== "idle" ? agent.color + "40" : "var(--border-primary)"}`,
                 }}>
              <span style={{ color: agent.color }}>{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono font-semibold" style={{ color: agent.color }}>
                  {agent.name}
                </div>
                <div className="text-[8px] truncate" style={{ color: "var(--text-muted)" }}>
                  {agent.description}
                </div>
              </div>
              <AgentStatusIcon status={agentStatus} color={agent.color} />
            </div>
          ))}
        </div>

        {/* Merge */}
        <div className="flex items-center justify-center mt-2">
          <div className="flex items-center gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-px h-3"
                   style={{ background: agentStatus === "complete" ? SUB_AGENTS[i].color : "var(--border-primary)" }} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center mt-1">
          <div className="px-2 py-1 rounded text-[9px] font-mono font-bold"
               style={{
                 background: agentStatus === "complete" ? "var(--cyan-dim)" : "var(--bg-elevated)",
                 color: agentStatus === "complete" ? "var(--cyan)" : "var(--text-muted)",
                 border: `1px solid ${agentStatus === "complete" ? "var(--cyan)" : "var(--border-primary)"}`,
               }}>
            LLM MERGE
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span>{queryCount} SPL queries executed</span>
        <span className="font-mono" style={{ color: agentStatus === "running" ? "var(--green)" : "var(--text-muted)" }}>
          {agentStatus === "idle" ? "WAITING" : agentStatus === "running" ? "ACTIVE" : "DONE"}
        </span>
      </div>
    </div>
  );
}

function AgentStatusIcon({ status, color }: { status: AgentStatus; color: string }) {
  if (status === "running") {
    return <Loader2 size={10} className="animate-spin" style={{ color }} />;
  }
  if (status === "complete") {
    return <CheckCircle size={10} style={{ color: "var(--green)" }} />;
  }
  return <div className="w-2 h-2 rounded-full" style={{ background: "var(--border-primary)" }} />;
}
