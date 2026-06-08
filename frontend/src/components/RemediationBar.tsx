"use client";

import { Shield, CheckCircle, XCircle } from "lucide-react";
import { approveAction, rejectAction } from "@/lib/api";
import type { RemediationAction } from "@/lib/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "var(--red)",
  high: "var(--orange)",
  medium: "var(--yellow)",
  low: "var(--text-muted)",
};

export function RemediationBar({ actions, investigationId, onUpdate }: {
  actions: RemediationAction[];
  investigationId: string;
  onUpdate: () => void;
}) {
  const pending = actions.filter((a) => a.status === "pending");
  const approved = actions.filter((a) => a.status === "approved");
  const rejected = actions.filter((a) => a.status === "rejected");

  async function handleApproveAll() {
    for (const action of pending) {
      await approveAction(investigationId, action.id);
    }
    onUpdate();
  }

  async function handleApprove(actionId: string) {
    await approveAction(investigationId, actionId);
    onUpdate();
  }

  async function handleReject(actionId: string) {
    await rejectAction(investigationId, actionId);
    onUpdate();
  }

  return (
    <div className="shrink-0" style={{ background: "var(--bg-secondary)", borderTop: "1px solid var(--border-primary)" }}>
      {/* Summary bar */}
      <div className="flex items-center justify-between px-5 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <div className="flex items-center gap-3">
          <Shield size={14} style={{ color: "var(--green)" }} />
          <span className="text-[11px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Remediation Plan
          </span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {actions.length} actions — {pending.length} pending, {approved.length} approved, {rejected.length} rejected
          </span>
        </div>
        {pending.length > 0 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium cursor-pointer"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            <CheckCircle size={12} /> Approve All ({pending.length})
          </button>
        )}
      </div>

      {/* Actions grid */}
      <div className="px-5 py-3 flex gap-3 overflow-x-auto">
        {actions.map((action) => (
          <div key={action.id} className="shrink-0 w-[280px] rounded-md p-3"
               style={{
                 background: "var(--bg-surface)",
                 border: "1px solid var(--border-primary)",
                 borderLeftWidth: "3px",
                 borderLeftColor: PRIORITY_COLORS[action.priority] || "var(--text-muted)",
               }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="badge" style={{
                color: PRIORITY_COLORS[action.priority],
                background: `${PRIORITY_COLORS[action.priority]}20`,
              }}>
                {action.priority}
              </span>
              <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{action.category}</span>
            </div>
            <p className="text-[11px] leading-relaxed mb-1.5" style={{ color: "var(--text-primary)" }}>
              {action.description}
            </p>
            <p className="text-[10px] font-mono mb-2" style={{ color: "var(--text-muted)" }}>
              Target: {action.target}
            </p>
            {action.status === "pending" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(action.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium cursor-pointer"
                  style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid var(--green)" }}
                >
                  <CheckCircle size={10} /> Approve
                </button>
                <button
                  onClick={() => handleReject(action.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[10px] font-medium cursor-pointer"
                  style={{ background: "var(--bg-primary)", color: "var(--text-muted)", border: "1px solid var(--border-primary)" }}
                >
                  <XCircle size={10} /> Reject
                </button>
              </div>
            ) : (
              <div className="text-[10px] font-medium" style={{
                color: action.status === "approved" ? "var(--green)" : "var(--red)",
              }}>
                {action.status === "approved" ? "Approved" : "Rejected"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
