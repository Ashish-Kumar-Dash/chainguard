"use client";

import { AlertTriangle, Users, Server, Key, GitBranch } from "lucide-react";
import type { Finding, BlastRadius } from "@/lib/types";

export function EvidencePanel({ findings, blastRadius }: {
  findings: Finding[];
  blastRadius: BlastRadius | null;
}) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Blast Radius */}
      {blastRadius && (
        <div className="panel">
          <div className="panel-header">Blast Radius Assessment</div>
          <div className="grid grid-cols-4 gap-3 p-3">
            <BlastStat icon={<GitBranch size={14} />} label="Repos" value={blastRadius.total_repos} color="var(--blue)" />
            <BlastStat icon={<Server size={14} />} label="Endpoints" value={blastRadius.total_endpoints} color="var(--orange)" />
            <BlastStat icon={<Key size={14} />} label="Secrets" value={blastRadius.total_secrets} color="var(--red)" />
            <BlastStat icon={<Users size={14} />} label="Pipelines" value={blastRadius.total_pipelines} color="var(--purple)" />
          </div>
          {blastRadius.affected_entities.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Affected Entities
              </div>
              <div className="space-y-1">
                {blastRadius.affected_entities.map((entity, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] px-2 py-1.5 rounded"
                       style={{ background: "var(--bg-primary)" }}>
                    <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                      {entity.identifier}
                    </span>
                    <span className="badge" style={{ color: "var(--text-muted)", background: "var(--bg-elevated)" }}>
                      {entity.entity_type}
                    </span>
                    <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                      {entity.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Findings */}
      <div className="panel">
        <div className="panel-header flex items-center justify-between">
          <span>Findings</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{findings.length} total</span>
        </div>
        {findings.length === 0 ? (
          <div className="p-6 text-center">
            <AlertTriangle size={20} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              Findings will populate as the agent investigates.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlastStat({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className="text-center py-2">
      <div className="flex justify-center mb-1" style={{ color }}>{icon}</div>
      <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const sevColor = finding.severity === "critical" ? "var(--red)" :
    finding.severity === "high" ? "var(--orange)" :
    finding.severity === "medium" ? "var(--yellow)" : "var(--text-muted)";

  return (
    <div className="rounded-md p-3" style={{
      background: "var(--bg-primary)",
      borderLeft: `3px solid ${sevColor}`,
      border: "1px solid var(--border-primary)",
      borderLeftWidth: "3px",
      borderLeftColor: sevColor,
    }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="badge" style={{
          color: sevColor,
          background: sevColor === "var(--red)" ? "var(--red-dim)" :
            sevColor === "var(--orange)" ? "var(--orange-dim)" :
            sevColor === "var(--yellow)" ? "var(--yellow-dim)" : "var(--bg-elevated)",
        }}>
          {finding.severity}
        </span>
        {finding.mitre_technique && (
          <span className="text-[10px] font-mono" style={{ color: "var(--blue)" }}>
            {finding.mitre_technique}
          </span>
        )}
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {finding.description}
      </p>
      {finding.iocs.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {finding.iocs.map((ioc, j) => (
            <span key={j} className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
              {ioc.type}: {ioc.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
