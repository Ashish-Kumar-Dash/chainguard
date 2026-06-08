"use client";

import { useState, useEffect } from "react";
import { Grid3X3, Info, ExternalLink } from "lucide-react";
import { listInvestigations } from "@/lib/api";
import type { InvestigationSummary } from "@/lib/types";

interface Technique {
  id: string;
  name: string;
  description: string;
}

interface Tactic {
  id: string;
  name: string;
  techniques: Technique[];
}

const MITRE_MATRIX: Tactic[] = [
  {
    id: "TA0001",
    name: "Initial Access",
    techniques: [
      { id: "T1195", name: "Supply Chain Compromise", description: "Manipulate products/delivery mechanisms prior to receipt by a final consumer for data/system compromise" },
      { id: "T1195.001", name: "Compromise Dependencies", description: "Manipulate software dependencies and development tools to gain access" },
      { id: "T1195.002", name: "Compromise Software Supply Chain", description: "Manipulate application software prior to receipt by a final consumer" },
      { id: "T1190", name: "Exploit Public-Facing App", description: "Exploit a weakness in an internet-facing host or program" },
    ],
  },
  {
    id: "TA0002",
    name: "Execution",
    techniques: [
      { id: "T1059", name: "Command & Scripting Interpreter", description: "Abuse command and script interpreters to execute commands or scripts" },
      { id: "T1059.006", name: "Python", description: "Abuse Python commands and scripts for execution" },
      { id: "T1059.007", name: "JavaScript", description: "Abuse JavaScript for execution via Node.js or browsers" },
      { id: "T1203", name: "Exploitation for Client Execution", description: "Exploit software vulnerabilities in client applications" },
      { id: "T1204", name: "User Execution", description: "Rely on user interaction to gain execution on a system" },
    ],
  },
  {
    id: "TA0003",
    name: "Persistence",
    techniques: [
      { id: "T1078", name: "Valid Accounts", description: "Obtain and abuse credentials of existing accounts" },
      { id: "T1078.004", name: "Cloud Accounts", description: "Obtain and abuse cloud account credentials" },
      { id: "T1543", name: "Create/Modify System Process", description: "Create or modify system-level processes to repeatedly execute malicious payloads" },
      { id: "T1547", name: "Boot or Logon Autostart", description: "Configure system settings to automatically execute a program during boot or logon" },
    ],
  },
  {
    id: "TA0005",
    name: "Defense Evasion",
    techniques: [
      { id: "T1027", name: "Obfuscated Files/Info", description: "Make an executable or file difficult to discover or analyze" },
      { id: "T1036", name: "Masquerading", description: "Manipulate features of artifacts to make them appear legitimate" },
      { id: "T1070", name: "Indicator Removal", description: "Delete or modify artifacts generated within systems to remove evidence" },
      { id: "T1140", name: "Deobfuscate/Decode", description: "Use obfuscated files or information to hide artifacts" },
    ],
  },
  {
    id: "TA0006",
    name: "Credential Access",
    techniques: [
      { id: "T1552", name: "Unsecured Credentials", description: "Search compromised systems to find insecurely stored credentials" },
      { id: "T1552.001", name: "Credentials in Files", description: "Search local file systems and remote file shares for credentials" },
      { id: "T1528", name: "Steal App Access Token", description: "Steal application access tokens as a means of acquiring credentials" },
    ],
  },
  {
    id: "TA0011",
    name: "Command & Control",
    techniques: [
      { id: "T1071", name: "Application Layer Protocol", description: "Communicate using OSI application layer protocols to avoid detection" },
      { id: "T1105", name: "Ingress Tool Transfer", description: "Transfer tools or other files from an external system" },
      { id: "T1571", name: "Non-Standard Port", description: "Communicate using a protocol and port pairing not normally associated" },
    ],
  },
  {
    id: "TA0010",
    name: "Exfiltration",
    techniques: [
      { id: "T1041", name: "Exfiltration Over C2", description: "Steal data by exfiltrating it over an existing C2 channel" },
      { id: "T1567", name: "Exfiltration Over Web Service", description: "Steal data by exfiltrating it to a cloud storage service" },
    ],
  },
  {
    id: "TA0040",
    name: "Impact",
    techniques: [
      { id: "T1485", name: "Data Destruction", description: "Destroy data and files on specific systems or in large numbers" },
      { id: "T1496", name: "Resource Hijacking", description: "Leverage resources of co-opted systems to complete resource-intensive tasks" },
    ],
  },
];

const ATTACK_TYPE_TECHNIQUES: Record<string, string[]> = {
  trojanized_extension: ["T1195", "T1195.001", "T1059.007", "T1027", "T1071", "T1552", "T1204"],
  poisoned_package: ["T1195", "T1195.002", "T1059.006", "T1036", "T1105", "T1552.001", "T1567"],
  compromised_ci: ["T1195", "T1078", "T1078.004", "T1059", "T1543", "T1190", "T1041", "T1528"],
};

export default function MitrePage() {
  const [investigations, setInvestigations] = useState<InvestigationSummary[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);

  useEffect(() => {
    listInvestigations().then(setInvestigations).catch(() => {});
  }, []);

  const detectedTechniques = new Map<string, string[]>();
  for (const inv of investigations) {
    const techniques = ATTACK_TYPE_TECHNIQUES[inv.attack_type] || [];
    for (const t of techniques) {
      if (!detectedTechniques.has(t)) detectedTechniques.set(t, []);
      detectedTechniques.get(t)!.push(inv.id);
    }
  }

  const totalTechniques = MITRE_MATRIX.reduce((sum, t) => sum + t.techniques.length, 0);
  const coveredCount = detectedTechniques.size;

  return (
    <div className="p-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Grid3X3 size={18} style={{ color: "var(--green)" }} />
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>MITRE ATT&CK Matrix</h1>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            Supply chain attack technique coverage from ChainGuard investigations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Coverage</div>
            <div className="text-lg font-bold font-mono" style={{ color: "var(--green)" }}>
              {coveredCount}/{totalTechniques}
            </div>
          </div>
          <div className="h-8 w-px" style={{ background: "var(--border-primary)" }} />
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: "var(--red)" }} /> Detected
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-primary)" }} /> Not Observed
            </span>
          </div>
        </div>
      </div>

      {/* Matrix Grid */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {MITRE_MATRIX.map((tactic) => (
          <div key={tactic.id} className="shrink-0 w-[180px]">
            {/* Tactic header */}
            <div className="rounded-t-md px-3 py-2 text-center"
                 style={{ background: "var(--bg-elevated)", borderBottom: "2px solid var(--green)" }}>
              <div className="text-[9px] font-mono" style={{ color: "var(--text-muted)" }}>{tactic.id}</div>
              <div className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>{tactic.name}</div>
            </div>
            {/* Techniques */}
            <div className="space-y-1 mt-1">
              {tactic.techniques.map((tech) => {
                const detected = detectedTechniques.has(tech.id);
                const invIds = detectedTechniques.get(tech.id) || [];
                return (
                  <button
                    key={tech.id}
                    onClick={() => setSelectedTechnique(selectedTechnique?.id === tech.id ? null : tech)}
                    className="w-full text-left px-2.5 py-2 rounded transition-all cursor-pointer"
                    style={{
                      background: detected ? "var(--red-dim)" : "var(--bg-surface)",
                      border: `1px solid ${detected ? "var(--red)" : "var(--border-primary)"}`,
                      borderLeftWidth: detected ? "3px" : "1px",
                      borderLeftColor: detected ? "var(--red)" : "var(--border-primary)",
                    }}
                  >
                    <div className="text-[9px] font-mono" style={{ color: detected ? "var(--red)" : "var(--text-muted)" }}>
                      {tech.id}
                    </div>
                    <div className="text-[10px] font-medium leading-snug" style={{
                      color: detected ? "var(--text-primary)" : "var(--text-secondary)",
                    }}>
                      {tech.name}
                    </div>
                    {detected && (
                      <div className="mt-1 text-[8px] font-mono" style={{ color: "var(--red)" }}>
                        {invIds.length} investigation{invIds.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Panel */}
      {selectedTechnique && (
        <div className="mt-4 panel p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono font-bold" style={{
                  color: detectedTechniques.has(selectedTechnique.id) ? "var(--red)" : "var(--text-muted)",
                }}>
                  {selectedTechnique.id}
                </span>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {selectedTechnique.name}
                </h3>
                {detectedTechniques.has(selectedTechnique.id) && (
                  <span className="badge" style={{ color: "var(--red)", background: "var(--red-dim)" }}>DETECTED</span>
                )}
              </div>
              <p className="text-[12px] leading-relaxed max-w-xl" style={{ color: "var(--text-secondary)" }}>
                {selectedTechnique.description}
              </p>
            </div>
            <a
              href={`https://attack.mitre.org/techniques/${selectedTechnique.id.replace(".", "/")}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-medium shrink-0"
              style={{ color: "var(--blue)" }}
            >
              MITRE Reference <ExternalLink size={10} />
            </a>
          </div>
          {detectedTechniques.has(selectedTechnique.id) && (
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border-primary)" }}>
              <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                Linked Investigations
              </div>
              <div className="flex gap-2">
                {detectedTechniques.get(selectedTechnique.id)!.map((invId) => (
                  <a key={invId} href={`/investigate/${invId}`}
                     className="text-[11px] font-mono px-2 py-1 rounded"
                     style={{ background: "var(--bg-primary)", color: "var(--blue)", border: "1px solid var(--border-primary)" }}>
                    {invId}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
