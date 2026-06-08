"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { InvestigationSummary } from "@/lib/types";

const SUPPLY_CHAIN_TECHNIQUES = [
  { id: "T1195", name: "Supply Chain Compromise", tactic: "Initial Access" },
  { id: "T1195.001", name: "Compromise Dependencies", tactic: "Initial Access" },
  { id: "T1195.002", name: "Compromise Software Supply Chain", tactic: "Initial Access" },
  { id: "T1059", name: "Command & Scripting", tactic: "Execution" },
  { id: "T1059.006", name: "Python", tactic: "Execution" },
  { id: "T1059.007", name: "JavaScript", tactic: "Execution" },
  { id: "T1078", name: "Valid Accounts", tactic: "Persistence" },
  { id: "T1078.004", name: "Cloud Accounts", tactic: "Persistence" },
  { id: "T1552", name: "Unsecured Credentials", tactic: "Credential Access" },
  { id: "T1552.001", name: "Credentials in Files", tactic: "Credential Access" },
  { id: "T1071", name: "Application Layer Protocol", tactic: "C2" },
  { id: "T1105", name: "Ingress Tool Transfer", tactic: "C2" },
  { id: "T1027", name: "Obfuscated Files", tactic: "Defense Evasion" },
  { id: "T1036", name: "Masquerading", tactic: "Defense Evasion" },
  { id: "T1203", name: "Exploitation for Client Execution", tactic: "Execution" },
  { id: "T1543", name: "Create/Modify System Process", tactic: "Persistence" },
  { id: "T1190", name: "Exploit Public-Facing App", tactic: "Initial Access" },
  { id: "T1204", name: "User Execution", tactic: "Execution" },
];

const ATTACK_TYPE_TECHNIQUES: Record<string, string[]> = {
  trojanized_extension: ["T1195", "T1195.001", "T1059.007", "T1027", "T1071", "T1552"],
  poisoned_package: ["T1195", "T1195.002", "T1059.006", "T1036", "T1105", "T1552.001"],
  compromised_ci: ["T1195", "T1078", "T1078.004", "T1059", "T1543", "T1190"],
};

export function MitreHeatmapMini({ investigations }: { investigations: InvestigationSummary[] }) {
  const detectedTechniques = new Set<string>();
  for (const inv of investigations) {
    const techniques = ATTACK_TYPE_TECHNIQUES[inv.attack_type] || [];
    techniques.forEach((t) => detectedTechniques.add(t));
  }

  return (
    <div className="panel">
      <div className="panel-header flex items-center justify-between">
        <span>MITRE ATT&CK Coverage</span>
        <Link href="/mitre" className="flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--blue)" }}>
          View Full Matrix <ArrowRight size={10} />
        </Link>
      </div>
      <div className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {SUPPLY_CHAIN_TECHNIQUES.map((tech) => {
            const detected = detectedTechniques.has(tech.id);
            return (
              <div
                key={tech.id}
                title={`${tech.id}: ${tech.name} (${tech.tactic})`}
                className="rounded px-2 py-1 text-[9px] font-mono cursor-default transition-colors"
                style={{
                  background: detected ? "var(--red-dim)" : "var(--bg-primary)",
                  color: detected ? "var(--red)" : "var(--text-muted)",
                  border: `1px solid ${detected ? "var(--red)" : "var(--border-primary)"}`,
                  opacity: detected ? 1 : 0.5,
                }}
              >
                {tech.id}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: "var(--red)" }} /> Detected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm" style={{ background: "var(--border-primary)" }} /> Not Observed
          </span>
          <span>{detectedTechniques.size}/{SUPPLY_CHAIN_TECHNIQUES.length} techniques covered</span>
        </div>
      </div>
    </div>
  );
}
