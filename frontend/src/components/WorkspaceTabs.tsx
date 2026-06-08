"use client";

import { useState } from "react";
import { Network, FileText, Terminal, Clock } from "lucide-react";
import { AttackGraph } from "./AttackGraph";
import { EvidencePanel } from "./EvidencePanel";
import { QueryLog } from "./QueryLog";
import { InvestigationTimeline } from "./InvestigationTimeline";
import type { InvestigationState, StateUpdate } from "@/lib/types";

const TABS = [
  { key: "graph", label: "Attack Graph", icon: Network },
  { key: "evidence", label: "Evidence", icon: FileText },
  { key: "queries", label: "SPL Queries", icon: Terminal },
  { key: "timeline", label: "Timeline", icon: Clock },
] as const;

type TabKey = typeof TABS[number]["key"];

export function WorkspaceTabs({ state, updates, investigationId }: {
  state: InvestigationState;
  updates: StateUpdate[];
  investigationId: string;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("graph");

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="tab-bar px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`tab-item flex items-center gap-1.5 cursor-pointer ${activeTab === tab.key ? "active" : ""}`}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "graph" && (
          <AttackGraph
            graph={state.propagation_graph}
            discoveredEntities={state.discovered_entities || []}
            remediationPlan={[]}
            investigationId={investigationId}
          />
        )}
        {activeTab === "evidence" && (
          <EvidencePanel findings={state.findings} blastRadius={state.blast_radius} />
        )}
        {activeTab === "queries" && (
          <QueryLog queries={state.splunk_queries} />
        )}
        {activeTab === "timeline" && (
          <InvestigationTimeline timeline={state.attack_timeline} updates={updates} />
        )}
      </div>
    </div>
  );
}
