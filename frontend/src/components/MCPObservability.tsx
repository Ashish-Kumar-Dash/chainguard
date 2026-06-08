"use client";

import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import type { MCPMetrics } from "@/lib/api";

export function MCPObservability({ metrics }: { metrics: MCPMetrics | null }) {
  if (!metrics || metrics.total_calls === 0) {
    return (
      <div className="panel h-full">
        <div className="panel-header flex items-center gap-2">
          <Activity size={12} />
          MCP Observability
        </div>
        <div className="p-6 text-center">
          <Activity size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            MCP tool call metrics will appear here after investigations run.
          </p>
        </div>
      </div>
    );
  }

  const toolEntries = Object.entries(metrics.tools);

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center gap-2">
        <Activity size={12} />
        MCP Observability
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-3 p-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <MiniStat label="Total Calls" value={metrics.total_calls} color="var(--blue)" />
        <MiniStat label="Success Rate" value={`${metrics.success_rate}%`} color="var(--green)" />
        <MiniStat
          label="Avg Latency"
          value={toolEntries.length > 0
            ? `${Math.round(toolEntries.reduce((s, [, t]) => s + t.avg_latency_ms, 0) / toolEntries.length)}ms`
            : "—"}
          color="var(--orange)"
        />
      </div>

      {/* Tool Breakdown */}
      {toolEntries.length > 0 && (
        <div className="p-3 flex-1 overflow-y-auto space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Tool Performance
          </div>
          {toolEntries.map(([name, stats]) => (
            <div key={name} className="rounded-md p-2.5" style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                  {name}
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {stats.total} calls
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="flex items-center gap-1" style={{ color: "var(--green)" }}>
                  <CheckCircle size={10} /> {stats.success}
                </span>
                {stats.failure > 0 && (
                  <span className="flex items-center gap-1" style={{ color: "var(--red)" }}>
                    <XCircle size={10} /> {stats.failure}
                  </span>
                )}
                <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} /> avg {stats.avg_latency_ms.toFixed(0)}ms
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  p95 {stats.p95_latency_ms.toFixed(0)}ms
                </span>
              </div>
              {/* Latency bar */}
              <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "var(--border-primary)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (stats.avg_latency_ms / 2000) * 100)}%`,
                    background: stats.avg_latency_ms > 1000 ? "var(--red)" : stats.avg_latency_ms > 500 ? "var(--orange)" : "var(--green)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Calls */}
      {metrics.recent.length > 0 && (
        <div className="p-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Recent Calls
          </div>
          <div className="space-y-1 max-h-[120px] overflow-y-auto">
            {metrics.recent.slice(0, 8).map((call, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                {call.success ? (
                  <CheckCircle size={9} style={{ color: "var(--green)" }} />
                ) : (
                  <XCircle size={9} style={{ color: "var(--red)" }} />
                )}
                <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{call.tool}</span>
                <span style={{ color: "var(--text-muted)" }}>{call.latency_ms.toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
      <div className="text-base font-bold font-mono" style={{ color }}>{value}</div>
    </div>
  );
}
