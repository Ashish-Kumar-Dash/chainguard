"use client";

import { useState } from "react";
import { SPLBlock } from "./SPLBlock";
import type { StateUpdate } from "@/lib/types";

const NODE_LABELS: Record<string, string> = {
  detect: "Detection & Classification",
  investigate: "Investigation & Hunting",
  increment_loop: "Loop Check",
  assess: "Impact Assessment",
  remediate: "Remediation Planning",
};

const NODE_COLORS: Record<string, string> = {
  detect: "border-blue-500 bg-blue-500/10",
  investigate: "border-amber-500 bg-amber-500/10",
  increment_loop: "border-gray-500 bg-gray-500/10",
  assess: "border-red-500 bg-red-500/10",
  remediate: "border-emerald-500 bg-emerald-500/10",
};

export function TimelineStep({ update, index }: { update: StateUpdate; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const label = NODE_LABELS[update.node] || update.node;
  const colorClass = NODE_COLORS[update.node] || "border-gray-500 bg-gray-500/10";

  const queries = update.update.splunk_queries || [];
  const findings = update.update.findings || [];
  const iocs = update.update.iocs || [];
  const plan = update.update.investigation_plan || [];

  return (
    <div className="relative pl-8">
      <div className={`absolute left-3 top-3 w-2 h-2 rounded-full ${colorClass.split(" ")[0].replace("border-", "bg-")}`} />
      {index > 0 && <div className="absolute left-[13px] top-0 w-px bg-gray-800" style={{ height: "12px" }} />}
      <div
        className={`border rounded-lg p-3 mb-3 cursor-pointer ${colorClass}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-gray-500">{isExpanded ? "▲" : "▼"}</span>
        </div>

        {!isExpanded && (
          <div className="mt-1 text-xs text-gray-400">
            {iocs.length > 0 && <span>{iocs.length} IOCs extracted · </span>}
            {queries.length > 0 && <span>{queries.length} queries run · </span>}
            {findings.length > 0 && <span>{findings.length} findings</span>}
            {plan.length > 0 && <span>{plan.length} steps planned</span>}
          </div>
        )}

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {iocs.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-1">IOCs Extracted</div>
                {iocs.map((ioc, i) => (
                  <div key={i} className="text-xs font-mono text-gray-300 ml-2">
                    {ioc.type}: {ioc.value}
                  </div>
                ))}
              </div>
            )}
            {plan.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-400 mb-1">Investigation Plan</div>
                {plan.map((step, i) => (
                  <div key={i} className="text-xs text-gray-300 ml-2">
                    {i + 1}. {step}
                  </div>
                ))}
              </div>
            )}
            {queries.map((q, i) => (
              <SPLBlock key={i} spl={q.spl} results={q.results} />
            ))}
            {findings.map((f, i) => (
              <div key={i} className="text-xs p-2 rounded bg-gray-900/50">
                <span className={`font-semibold ${f.severity === "critical" ? "text-red-400" : f.severity === "high" ? "text-amber-400" : "text-gray-300"}`}>
                  [{f.severity.toUpperCase()}]
                </span>{" "}
                <span className="text-gray-300">{f.description}</span>
                {f.mitre_technique && <span className="ml-2 text-gray-500 font-mono">{f.mitre_technique}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
