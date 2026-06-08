"use client";

import { useState } from "react";
import { Terminal, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import type { QueryResult } from "@/lib/types";

export function QueryLog({ queries }: { queries: QueryResult[] }) {
  if (queries.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Terminal size={24} style={{ color: "var(--text-muted)", margin: "0 auto 8px" }} />
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            SPL queries will appear here as the agent investigates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          SPL Query Log
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{queries.length} queries executed</span>
      </div>
      {queries.map((q, i) => (
        <QueryCard key={i} query={q} index={i} />
      ))}
    </div>
  );
}

function QueryCard({ query, index }: { query: QueryResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(query.spl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--border-primary)" }}>
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        style={{ background: "var(--bg-surface)" }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} style={{ color: "var(--text-muted)" }} /> :
                    <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />}
        <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>#{index + 1}</span>
        <span className="text-[11px] font-mono truncate flex-1" style={{ color: "var(--green)" }}>
          {query.spl}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
          {query.results.length} results
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="p-1 rounded hover:bg-white/5 cursor-pointer"
        >
          {copied ? <Check size={12} style={{ color: "var(--green)" }} /> :
                    <Copy size={12} style={{ color: "var(--text-muted)" }} />}
        </button>
      </div>
      {expanded && (
        <div className="px-3 py-2 overflow-x-auto" style={{ background: "var(--bg-primary)" }}>
          {query.results.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>No results returned</p>
          ) : (
            <table className="data-table text-[10px]">
              <thead>
                <tr>
                  {Object.keys(query.results[0]).map((key) => (
                    <th key={key} className="font-mono">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.results.slice(0, 20).map((row, ri) => (
                  <tr key={ri}>
                    {Object.values(row).map((val, ci) => (
                      <td key={ci} className="font-mono" style={{ color: "var(--text-secondary)" }}>
                        {String(val ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {query.results.length > 20 && (
            <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
              Showing 20 of {query.results.length} results
            </p>
          )}
        </div>
      )}
    </div>
  );
}
