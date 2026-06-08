"use client";

import { Clock } from "lucide-react";
import type { TimelineEvent, StateUpdate } from "@/lib/types";

const NODE_COLORS: Record<string, string> = {
  detect: "var(--blue)",
  investigate: "var(--orange)",
  assess: "var(--red)",
  remediate: "var(--green)",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--red)",
  high: "var(--orange)",
  medium: "var(--yellow)",
  low: "var(--text-muted)",
};

export function InvestigationTimeline({ timeline, updates }: {
  timeline: TimelineEvent[];
  updates: StateUpdate[];
}) {
  const agentEvents = updates
    .filter((u) => u.node !== "increment_loop")
    .map((u) => ({
      type: "agent" as const,
      node: u.node,
      status: u.status,
      timestamp: new Date().toISOString(),
    }));

  if (timeline.length === 0 && agentEvents.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Clock size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Timeline events will populate as the investigation progresses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
        Investigation Timeline
      </div>

      {/* Agent phase transitions */}
      {agentEvents.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>Agent Activity</div>
          <div className="space-y-1.5">
            {agentEvents.map((evt, i) => (
              <div key={i} className="flex items-center gap-2.5 pl-3"
                   style={{ borderLeft: `2px solid ${NODE_COLORS[evt.node] || "var(--border-primary)"}` }}>
                <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[evt.node] || "var(--text-muted)" }} />
                <span className="text-[10px] font-mono font-medium" style={{ color: NODE_COLORS[evt.node] }}>
                  {evt.node.toUpperCase()}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  → {evt.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attack timeline events */}
      {timeline.length > 0 && (
        <div>
          <div className="text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>Attack Events</div>
          <div className="space-y-2">
            {timeline.map((evt, i) => (
              <div key={i} className="flex gap-3 pl-3"
                   style={{ borderLeft: `2px solid ${SEVERITY_COLORS[evt.severity] || "var(--border-primary)"}` }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="badge text-[9px]" style={{
                      color: SEVERITY_COLORS[evt.severity],
                      background: `${SEVERITY_COLORS[evt.severity]}20`,
                    }}>
                      {evt.severity}
                    </span>
                    <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                      {evt.source_index}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {evt.description}
                  </p>
                  <span className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>
                    {evt.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
