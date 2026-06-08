"use client";

import type { InvestigationPhase } from "@/lib/types";

const NODES: { key: InvestigationPhase; label: string; icon: string }[] = [
  { key: "detecting", label: "DETECT", icon: "D" },
  { key: "investigating", label: "INVESTIGATE", icon: "I" },
  { key: "assessing", label: "ASSESS", icon: "A" },
  { key: "remediating", label: "REMEDIATE", icon: "R" },
  { key: "awaiting_approval", label: "APPROVAL", icon: "!" },
  { key: "complete", label: "COMPLETE", icon: "C" },
];

const PHASE_ORDER = NODES.map((n) => n.key);

export function AgentStateMachine({ phase, isRunning, loopCount }: {
  phase: InvestigationPhase; isRunning: boolean; loopCount: number;
}) {
  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="p-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
        Agent State Machine
      </div>
      <div className="space-y-1">
        {NODES.map((node, i) => {
          const isActive = node.key === phase;
          const isDone = i < currentIdx;

          return (
            <div key={node.key} className="flex items-center gap-2.5">
              {/* Connector line */}
              <div className="flex flex-col items-center w-5">
                {i > 0 && (
                  <div className="w-px h-1.5" style={{ background: isDone ? "var(--green)" : "var(--border-primary)" }} />
                )}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive && isRunning ? "phase-active" : ""}`}
                  style={{
                    background: isActive ? "var(--green)" : isDone ? "var(--green-dim)" : "var(--bg-elevated)",
                    color: isActive ? "#fff" : isDone ? "var(--green)" : "var(--text-muted)",
                    border: isActive ? "none" : `1px solid ${isDone ? "var(--green)" : "var(--border-primary)"}`,
                  }}
                >
                  {isDone ? "✓" : node.icon}
                </div>
                {i < NODES.length - 1 && (
                  <div className="w-px h-1.5" style={{ background: isDone ? "var(--green)" : "var(--border-primary)" }} />
                )}
              </div>
              {/* Label */}
              <span className="text-[11px] font-mono font-medium" style={{
                color: isActive ? "var(--green)" : isDone ? "var(--text-secondary)" : "var(--text-muted)",
              }}>
                {node.label}
              </span>
              {isActive && isRunning && (
                <span className="pulse-dot text-[8px]" style={{ color: "var(--green)" }}>RUNNING</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Loop indicator */}
      {loopCount > 0 && (
        <div className="mt-3 flex items-center gap-2 px-2 py-1.5 rounded"
             style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-primary)" }}>
          <span className="text-[10px] font-mono" style={{ color: "var(--orange)" }}>
            INVESTIGATE loop {loopCount}/3
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="w-2 h-2 rounded-full"
                   style={{ background: n <= loopCount ? "var(--orange)" : "var(--border-primary)" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
