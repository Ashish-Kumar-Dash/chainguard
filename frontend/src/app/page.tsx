"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, Shield, Eye, Clock, Activity, Search } from "lucide-react";
import { listInvestigations, createInvestigation, getMCPMetrics, type MCPMetrics } from "@/lib/api";
import type { InvestigationSummary } from "@/lib/types";
import { MitreHeatmapMini } from "@/components/MitreHeatmapMini";
import { MCPObservability } from "@/components/MCPObservability";

const SEVERITY_STYLE: Record<string, { color: string; bg: string }> = {
  critical: { color: "var(--red)", bg: "var(--red-dim)" },
  high: { color: "var(--orange)", bg: "var(--orange-dim)" },
  medium: { color: "var(--yellow)", bg: "var(--yellow-dim)" },
  low: { color: "var(--text-secondary)", bg: "var(--bg-elevated)" },
};

function severityLevel(score: number): string {
  if (score >= 8) return "critical";
  if (score >= 6) return "high";
  if (score >= 4) return "medium";
  return "low";
}

export default function CommandCenter() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [mcpMetrics, setMcpMetrics] = useState<MCPMetrics | null>(null);
  const [newAlert, setNewAlert] = useState("");
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const refresh = useCallback(() => {
    listInvestigations().then(setInvestigations).catch(() => {});
    getMCPMetrics().then(setMcpMetrics).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlert.trim() || creating) return;
    setCreating(true);
    try {
      const { investigation_id } = await createInvestigation(newAlert.trim());
      router.push(`/investigate/${investigation_id}`);
    } catch {
      setCreating(false);
    }
  }

  const active = investigations.filter((i) => i.active || i.status === "investigating" || i.status === "detecting");
  const critical = investigations.filter((i) => (i.severity_score || 0) >= 8);
  const pendingActions = investigations.filter((i) => i.status === "awaiting_approval");
  const totalIOCs = investigations.reduce((sum, i) => sum + (i.severity_score || 0 > 0 ? 1 : 0), 0);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Command Center</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Supply chain threat overview and investigation management
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          style={{ background: "var(--green)", color: "#fff" }}
        >
          <Plus size={14} /> New Investigation
        </button>
      </div>

      {/* New Investigation Form */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="panel p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Launch Investigation
          </div>
          <div className="flex gap-3">
            <textarea
              value={newAlert}
              onChange={(e) => setNewAlert(e.target.value)}
              placeholder="Paste a security alert, threat intelligence report, or describe a suspicious supply chain activity..."
              rows={3}
              className="flex-1 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-primary)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="submit"
              disabled={creating || !newAlert.trim()}
              className="self-end px-5 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer"
              style={{ background: "var(--green)", color: "#fff" }}
            >
              {creating ? "Launching..." : "Investigate"}
            </button>
          </div>
        </form>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard icon={<Eye size={16} />} label="Active Investigations" value={active.length} accent="var(--green)" />
        <KPICard icon={<AlertTriangle size={16} />} label="Critical Threats" value={critical.length} accent="var(--red)" />
        <KPICard icon={<Shield size={16} />} label="Investigations Total" value={investigations.length} accent="var(--blue)" />
        <KPICard icon={<Clock size={16} />} label="Pending Actions" value={pendingActions.length} accent="var(--orange)" />
      </div>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left: Investigations Table */}
        <div className="col-span-3 panel">
          <div className="panel-header flex items-center justify-between">
            <span>Recent Investigations</span>
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {investigations.length} total
            </span>
          </div>
          <div className="overflow-x-auto">
            {investigations.length === 0 ? (
              <div className="p-8 text-center">
                <Search size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  No investigations yet. Launch one to get started.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Attack Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {investigations.map((inv) => {
                    const sev = severityLevel(inv.severity_score || 0);
                    const sevStyle = SEVERITY_STYLE[sev];
                    return (
                      <tr key={inv.id} className="cursor-pointer" onClick={() => router.push(`/investigate/${inv.id}`)}>
                        <td className="font-mono text-[11px]">{inv.id}</td>
                        <td>
                          <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {(inv.attack_type || "unknown").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ color: sevStyle.color, background: sevStyle.bg }}>
                            {inv.severity_score?.toFixed(1) || "—"}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={inv.status} />
                        </td>
                        <td>
                          <button
                            className="text-[11px] font-medium px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--blue)", background: "var(--blue-dim)" }}
                            onClick={(e) => { e.stopPropagation(); router.push(`/investigate/${inv.id}`); }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right: MCP Observability */}
        <div className="col-span-2">
          <MCPObservability metrics={mcpMetrics} />
        </div>
      </div>

      {/* Bottom: MITRE Heatmap */}
      <MitreHeatmapMini investigations={investigations} />
    </div>
  );
}

function KPICard({ icon, label, value, accent }: {
  icon: React.ReactNode; label: string; value: number; accent: string;
}) {
  return (
    <div className="kpi-card" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: accent }}>{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { color: string; bg: string }> = {
    detecting: { color: "var(--blue)", bg: "var(--blue-dim)" },
    investigating: { color: "var(--orange)", bg: "var(--orange-dim)" },
    assessing: { color: "var(--purple)", bg: "var(--purple-dim)" },
    remediating: { color: "var(--yellow)", bg: "var(--yellow-dim)" },
    awaiting_approval: { color: "var(--orange)", bg: "var(--orange-dim)" },
    complete: { color: "var(--green)", bg: "var(--green-dim)" },
  };
  const s = styles[status] || styles.detecting;
  return (
    <span className="badge" style={{ color: s.color, background: s.bg }}>
      {status === "awaiting_approval" ? "pending" : status}
    </span>
  );
}
