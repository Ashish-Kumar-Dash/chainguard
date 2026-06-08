"use client";

import type { StateUpdate } from "@/lib/types";

const NODE_COLORS: Record<string, string> = {
  detect: "var(--blue)",
  investigate: "var(--orange)",
  assess: "var(--red)",
  remediate: "var(--green)",
};

export function DecisionLog({ updates, reasoning }: {
  updates: StateUpdate[];
  reasoning: string[];
}) {
  const entries = updates
    .filter((u) => u.node !== "increment_loop")
    .flatMap((u) => (u.reasoning || []).map((r) => ({ node: u.node, text: r })));

  if (entries.length === 0 && reasoning.length === 0) {
    return (
      <div className="flex-1 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
          Decision Log
        </div>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Agent reasoning will appear here as the investigation progresses.
        </p>
      </div>
    );
  }

  const allEntries = entries.length > 0 ? entries : reasoning.map((r) => {
    const match = r.match(/^\[(\w+)\]/);
    return { node: match ? match[1].toLowerCase() : "agent", text: r };
  });

  return (
    <div className="flex-1 p-4 overflow-y-auto">
      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
        Decision Log
      </div>
      <div className="space-y-2">
        {allEntries.map((entry, i) => (
          <div key={i} className="text-[11px] leading-relaxed pl-3"
               style={{ borderLeft: `2px solid ${NODE_COLORS[entry.node] || "var(--border-primary)"}` }}>
            <span className="text-[9px] font-mono font-bold uppercase block mb-0.5"
                  style={{ color: NODE_COLORS[entry.node] || "var(--text-muted)" }}>
              {entry.node}
            </span>
            <span style={{ color: "var(--text-secondary)" }}>{entry.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
