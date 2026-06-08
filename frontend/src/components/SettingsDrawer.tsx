"use client";

import { X, ExternalLink } from "lucide-react";
import type { HealthStatus } from "@/lib/api";

export function SettingsDrawer({ open, onClose, health }: {
  open: boolean;
  onClose: () => void;
  health: HealthStatus | null;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="ml-auto relative w-[400px] h-full flex flex-col overflow-y-auto"
           style={{ background: "var(--bg-secondary)", borderLeft: "1px solid var(--border-primary)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
             style={{ borderBottom: "1px solid var(--border-primary)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/5 cursor-pointer">
            <X size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* LLM Configuration */}
          <Section title="LLM Configuration">
            <InfoRow label="Provider" value={health?.llm_provider || "Not connected"} />
            <InfoRow label="Model" value={health?.llm_model || "—"} />
            <InfoRow label="Status" value={health ? "Connected" : "Disconnected"}
                     valueColor={health ? "var(--green)" : "var(--red)"} />
          </Section>

          {/* Splunk Configuration */}
          <Section title="Splunk Enterprise">
            <InfoRow label="Connection" value={health?.splunk_connected ? "Connected" : "Disconnected"}
                     valueColor={health?.splunk_connected ? "var(--green)" : "var(--red)"} />
            <InfoRow label="MCP Tools" value={String(health?.mcp_tools_available || 0)} />
            <InfoRow label="Indexes" value={health?.splunk_indexes?.join(", ") || "None discovered"} />
            <a href="http://localhost:8000" target="_blank" rel="noopener noreferrer"
               className="flex items-center gap-1.5 mt-2 text-[11px] font-medium"
               style={{ color: "var(--blue)" }}>
              Open Splunk Web <ExternalLink size={10} />
            </a>
          </Section>

          {/* Agent Configuration */}
          <Section title="Agent Behavior">
            <InfoRow label="Max Investigation Loops" value="3" />
            <InfoRow label="Graph Nodes" value="DETECT → INVESTIGATE → ASSESS → REMEDIATE" />
            <InfoRow label="Checkpointer" value="MemorySaver (in-memory)" />
          </Section>

          {/* About */}
          <Section title="About ChainGuard">
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Autonomous supply chain threat investigation agent powered by LangGraph and Splunk MCP.
              Detects, investigates, assesses, and remediates supply chain attacks using AI-driven
              analysis of your Splunk security data.
            </p>
            <div className="mt-3 text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              v0.1.0 — Splunk Agentic Ops Hackathon 2026
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--text-muted)" }}>
        {title}
      </h3>
      <div className="space-y-2 rounded-md p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}>
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="text-[11px] font-medium font-mono" style={{ color: valueColor || "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}
