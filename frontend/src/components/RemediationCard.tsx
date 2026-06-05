"use client";

import { approveAction, rejectAction } from "@/lib/api";
import type { RemediationAction } from "@/lib/types";

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-red-500 bg-red-500/10",
  high: "border-amber-500 bg-amber-500/10",
  medium: "border-yellow-500 bg-yellow-500/10",
  low: "border-gray-500 bg-gray-500/10",
};

export function RemediationCard({
  action,
  investigationId,
  onUpdate,
}: {
  action: RemediationAction;
  investigationId: string;
  onUpdate: () => void;
}) {
  const colorClass = PRIORITY_COLORS[action.priority] || PRIORITY_COLORS.low;

  async function handleApprove() {
    await approveAction(investigationId, action.id);
    onUpdate();
  }

  async function handleReject() {
    await rejectAction(investigationId, action.id);
    onUpdate();
  }

  return (
    <div className={`border rounded-lg p-3 mb-2 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-gray-400">{action.priority}</span>
            <span className="text-xs font-mono text-gray-500">{action.category}</span>
          </div>
          <p className="text-sm text-gray-200 mt-1">{action.description}</p>
          <p className="text-xs text-gray-500 mt-1">Target: {action.target}</p>
        </div>
      </div>
      {action.status === "pending" && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleApprove}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 rounded font-medium transition-colors"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      )}
      {action.status === "approved" && (
        <div className="mt-2 text-xs text-emerald-400 font-medium">Approved</div>
      )}
      {action.status === "rejected" && (
        <div className="mt-2 text-xs text-red-400 font-medium">Rejected</div>
      )}
    </div>
  );
}
