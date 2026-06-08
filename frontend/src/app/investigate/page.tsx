"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter } from "lucide-react";
import { listInvestigations, createInvestigation } from "@/lib/api";
import type { InvestigationSummary } from "@/lib/types";

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  detecting: { color: "var(--blue)", bg: "var(--blue-dim)" },
  investigating: { color: "var(--orange)", bg: "var(--orange-dim)" },
  assessing: { color: "var(--purple)", bg: "var(--purple-dim)" },
  remediating: { color: "var(--yellow)", bg: "var(--yellow-dim)" },
  awaiting_approval: { color: "var(--orange)", bg: "var(--orange-dim)" },
  complete: { color: "var(--green)", bg: "var(--green-dim)" },
};

export default function InvestigationsPage() {
  const router = useRouter();
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newAlert, setNewAlert] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    listInvestigations().then(setInvestigations).catch(() => {});
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

  const filtered = investigations.filter((inv) => {
    if (filter !== "all" && inv.status !== filter) return false;
    if (search && !inv.id.includes(search) && !(inv.attack_type || "").includes(search)) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Investigations</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Manage and review all threat investigations
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold cursor-pointer"
          style={{ background: "var(--green)", color: "#fff" }}
        >
          <Plus size={14} /> New Investigation
        </button>
      </div>

      {/* New Investigation Form */}
      {showNewForm && (
        <form onSubmit={handleCreate} className="panel p-4 mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
            Launch Investigation
          </div>
          <div className="flex gap-3">
            <textarea
              value={newAlert}
              onChange={(e) => setNewAlert(e.target.value)}
              placeholder="Paste a security alert, threat intelligence report, or describe suspicious supply chain activity..."
              rows={3}
              className="flex-1 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-primary)", color: "var(--text-primary)" }}
            />
            <button type="submit" disabled={creating || !newAlert.trim()}
                    className="self-end px-5 py-2 rounded-md text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    style={{ background: "var(--green)", color: "#fff" }}>
              {creating ? "Launching..." : "Investigate"}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md flex-1 max-w-xs"
             style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}>
          <Search size={12} style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or attack type..."
            className="bg-transparent text-[12px] focus:outline-none flex-1"
            style={{ color: "var(--text-primary)" }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={12} style={{ color: "var(--text-muted)" }} />
          {["all", "detecting", "investigating", "assessing", "complete"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-2.5 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors"
              style={{
                background: filter === f ? "var(--green-dim)" : "var(--bg-surface)",
                color: filter === f ? "var(--green)" : "var(--text-muted)",
                border: `1px solid ${filter === f ? "var(--green)" : "var(--border-primary)"}`,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Investigation Cards */}
      {filtered.length === 0 ? (
        <div className="panel p-12 text-center">
          <Search size={28} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {investigations.length === 0 ? "No investigations yet. Launch one to get started." : "No investigations match your filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((inv) => {
            const statusStyle = STATUS_STYLES[inv.status] || STATUS_STYLES.detecting;
            const sevColor = (inv.severity_score || 0) >= 8 ? "var(--red)" :
              (inv.severity_score || 0) >= 6 ? "var(--orange)" :
              (inv.severity_score || 0) >= 4 ? "var(--yellow)" : "var(--text-muted)";
            return (
              <button
                key={inv.id}
                onClick={() => router.push(`/investigate/${inv.id}`)}
                className="panel p-4 text-left cursor-pointer hover:brightness-110 transition-all"
                style={{ borderLeftWidth: "3px", borderLeftColor: sevColor }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                    {inv.id}
                  </span>
                  <span className="badge" style={{ color: statusStyle.color, background: statusStyle.bg }}>
                    {inv.status === "awaiting_approval" ? "pending" : inv.status}
                  </span>
                </div>
                <div className="text-[12px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                  {(inv.attack_type || "unknown").replace(/_/g, " ")}
                </div>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {(inv.severity_score || 0) > 0 && (
                    <span>Severity: <span style={{ color: sevColor, fontWeight: 600 }}>{inv.severity_score?.toFixed(1)}</span></span>
                  )}
                  {inv.active && <span className="pulse-dot" style={{ color: "var(--green)" }}>LIVE</span>}
                </div>
                {inv.alert_raw && (
                  <p className="text-[10px] mt-2 truncate" style={{ color: "var(--text-muted)" }}>
                    {inv.alert_raw}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
