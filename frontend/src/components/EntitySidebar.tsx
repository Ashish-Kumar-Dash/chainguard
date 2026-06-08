"use client";

import { Tag, Server, Key, GitBranch, Package, Globe, Hash, FileCode } from "lucide-react";
import type { InvestigationState, IOC } from "@/lib/types";

const IOC_ICONS: Record<string, React.ReactNode> = {
  hash: <Hash size={11} />,
  domain: <Globe size={11} />,
  ip: <Server size={11} />,
  package_name: <Package size={11} />,
  extension_id: <FileCode size={11} />,
  file_path: <FileCode size={11} />,
};

const ENTITY_ICONS: Record<string, React.ReactNode> = {
  endpoint: <Server size={11} />,
  pipeline: <GitBranch size={11} />,
  repo: <GitBranch size={11} />,
  package: <Package size={11} />,
  secret: <Key size={11} />,
};

export function EntitySidebar({ state }: { state: InvestigationState }) {
  const allIOCs = [...state.iocs, ...state.new_iocs];
  const uniqueIOCs = allIOCs.filter((ioc, i, arr) =>
    arr.findIndex((a) => a.type === ioc.type && a.value === ioc.value) === i
  );

  return (
    <div className="h-full overflow-y-auto">
      {/* IOCs Section */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Indicators of Compromise
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
            {uniqueIOCs.length}
          </span>
        </div>
        {uniqueIOCs.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>No IOCs extracted yet.</p>
        ) : (
          <div className="space-y-1.5">
            {uniqueIOCs.map((ioc, i) => (
              <IOCRow key={i} ioc={ioc} isNew={state.new_iocs.some((n) => n.type === ioc.type && n.value === ioc.value)} />
            ))}
          </div>
        )}
      </div>

      {/* Discovered Entities */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Discovered Entities
          </div>
          <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
            {state.discovered_entities.length}
          </span>
        </div>
        {state.discovered_entities.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Entities will appear after queries run.</p>
        ) : (
          <div className="space-y-1.5">
            {state.discovered_entities.map((entity, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded"
                   style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  {ENTITY_ICONS[entity.entity_type] || <Tag size={11} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono truncate" style={{ color: "var(--text-primary)" }}>
                    {entity.label}
                  </div>
                  <div className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {entity.entity_type}
                  </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full" style={{
                  background: entity.severity === "critical" ? "var(--red)" :
                    entity.severity === "high" ? "var(--orange)" :
                    entity.severity === "medium" ? "var(--yellow)" : "var(--text-muted)",
                }} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investigation Plan */}
      <div className="p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
          Investigation Plan
        </div>
        {state.investigation_plan.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Plan will appear after detection.</p>
        ) : (
          <div className="space-y-1.5">
            {state.investigation_plan.map((step, i) => (
              <div key={i} className="flex gap-2 text-[11px]">
                <span className="text-[10px] font-mono shrink-0" style={{ color: "var(--green)" }}>{i + 1}.</span>
                <span style={{ color: "var(--text-secondary)" }}>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IOCRow({ ioc, isNew }: { ioc: IOC; isNew: boolean }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded"
         style={{ background: "var(--bg-surface)", border: `1px solid ${isNew ? "var(--orange)" : "var(--border-primary)"}` }}>
      <span style={{ color: isNew ? "var(--orange)" : "var(--text-muted)" }}>
        {IOC_ICONS[ioc.type] || <Tag size={11} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-mono truncate" style={{ color: "var(--text-primary)" }}>
          {ioc.value}
        </div>
        <div className="flex items-center gap-2 text-[9px]" style={{ color: "var(--text-muted)" }}>
          <span>{ioc.type}</span>
          {ioc.source && <span>via {ioc.source}</span>}
        </div>
      </div>
      {isNew && (
        <span className="text-[8px] font-bold px-1 py-0.5 rounded"
              style={{ background: "var(--orange-dim)", color: "var(--orange)" }}>
          NEW
        </span>
      )}
    </div>
  );
}
