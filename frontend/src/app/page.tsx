"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, AlertTriangle, Shield, Eye, Clock, Activity, Search, Zap, Target, Package, GitBranch, MonitorSpeaker } from "lucide-react";
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

const DEMO_SCENARIOS = [
  {
    icon: <Package size={14} />,
    label: "Trojanized Extension",
    color: "var(--red)",
    alert: `SECURITY ALERT: Suspicious VS Code extension "codestyle-formatter" (v2.1.4) detected. Extension was recently updated with obfuscated code that makes outbound connections to c2.styleformat.io:8443. Hash: sha256:a1b2c3d4e5f6. Extension installed on 47 developer workstations via marketplace auto-update. Outbound DNS queries to styleformat.io observed starting 2 hours ago.`,
  },
  {
    icon: <GitBranch size={14} />,
    label: "Compromised CI/CD",
    color: "var(--orange)",
    alert: `INCIDENT REPORT: Unauthorized modification detected in GitHub Actions workflow file (.github/workflows/deploy.yml) in repository acme-corp/payment-service. Changes add a base64-encoded script step that exfiltrates environment variables including AWS_SECRET_ACCESS_KEY and DATABASE_URL to an external endpoint api.buildstats-collector.io. Commit made by bot account "dependabot-helper" with a PAT created 3 days ago.`,
  },
  {
    icon: <Target size={14} />,
    label: "Poisoned Package",
    color: "var(--purple)",
    alert: `NPM ADVISORY: Package "event-streame" (typosquat of event-stream) published 4 hours ago contains a postinstall script that downloads and executes a binary from cdn.npmdelivery.net. The binary harvests SSH keys, AWS credentials, and .env files. 312 downloads detected. Package maintainer account "trusted-dev-2024" was created recently and has no prior history.`,
  },
];

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

  async function handleScenario(alert: string) {
    if (creating) return;
    setCreating(true);
    try {
      const { investigation_id } = await createInvestigation(alert);
      router.push(`/investigate/${investigation_id}`);
    } catch {
      setCreating(false);
    }
  }

  const active = investigations.filter((i) => i.active || i.status === "investigating" || i.status === "detecting");
  const critical = investigations.filter((i) => (i.severity_score || 0) >= 8);
  const pendingActions = investigations.filter((i) => i.status === "awaiting_approval");

  const maxSeverity = investigations.reduce((max, i) => Math.max(max, i.severity_score || 0), 0);
  const threatLevel = maxSeverity >= 8 ? "CRITICAL" : maxSeverity >= 6 ? "HIGH" : maxSeverity >= 4 ? "ELEVATED" : active.length > 0 ? "GUARDED" : "LOW";
  const threatColor = maxSeverity >= 8 ? "var(--red)" : maxSeverity >= 6 ? "var(--orange)" : maxSeverity >= 4 ? "var(--yellow)" : "var(--green)";

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      {/* Hero Header */}
      <div className="scanline-bg panel p-5" style={{ borderColor: threatColor + "40" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${maxSeverity >= 8 ? "glow-critical" : maxSeverity >= 6 ? "glow-high" : ""}`}
                   style={{ background: threatColor + "20", border: `2px solid ${threatColor}` }}>
                <Shield size={24} style={{ color: threatColor }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1.5" style={{ color: threatColor }}>
                {threatLevel}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                Command Center
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Supply chain threat overview and investigation management
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <Activity size={10} className="pulse-dot" style={{ color: "var(--green)" }} />
                  Multi-Agent System Active
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  3 Sub-Agents: IOC Hunter, Threat Intel, Blast Radius
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer hover:brightness-110"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            <Plus size={14} /> New Investigation
          </button>
        </div>
      </div>

      {/* New Investigation Form */}
      {showNewForm && (
        <div className="animate-fade-in space-y-3">
          <form onSubmit={handleCreate} className="panel p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
              Launch Custom Investigation
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

          {/* Quick Launch Scenarios */}
          <div className="panel p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={12} style={{ color: "var(--yellow)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Quick Launch — Demo Scenarios
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {DEMO_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.label}
                  onClick={() => handleScenario(scenario.alert)}
                  disabled={creating}
                  className="scenario-btn disabled:opacity-40"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ color: scenario.color }}>{scenario.icon}</span>
                    <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                      {scenario.label}
                    </span>
                  </div>
                  <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
                    {scenario.alert.slice(0, 120)}...
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3">
        <KPICard icon={<Eye size={16} />} label="Active" value={active.length} accent="var(--green)" />
        <KPICard icon={<AlertTriangle size={16} />} label="Critical" value={critical.length} accent="var(--red)" />
        <KPICard icon={<Shield size={16} />} label="Total" value={investigations.length} accent="var(--blue)" />
        <KPICard icon={<Clock size={16} />} label="Pending" value={pendingActions.length} accent="var(--orange)" />
        <KPICard icon={<MonitorSpeaker size={16} />} label="MCP Calls" value={mcpMetrics?.total_calls || 0} accent="var(--cyan)" />
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
                  {investigations.map((investigation) => {
                    const severity = severityLevel(investigation.severity_score || 0);
                    const severityStyle = SEVERITY_STYLE[severity];
                    return (
                      <tr key={investigation.id} className="cursor-pointer" onClick={() => router.push(`/investigate/${investigation.id}`)}>
                        <td className="font-mono text-[11px]">{investigation.id}</td>
                        <td>
                          <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                            {(investigation.attack_type || "unknown").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>
                          <span className="badge" style={{ color: severityStyle.color, background: severityStyle.bg }}>
                            {investigation.severity_score?.toFixed(1) || "—"}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={investigation.status} active={investigation.active} />
                        </td>
                        <td>
                          <button
                            className="text-[11px] font-medium px-2 py-1 rounded transition-colors"
                            style={{ color: "var(--blue)", background: "var(--blue-dim)" }}
                            onClick={(e) => { e.stopPropagation(); router.push(`/investigate/${investigation.id}`); }}
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

function StatusBadge({ status, active }: { status: string; active: boolean }) {
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
    <span className={`badge ${active ? "pulse-dot" : ""}`} style={{ color: s.color, background: s.bg }}>
      {status === "awaiting_approval" ? "pending" : status}
    </span>
  );
}
