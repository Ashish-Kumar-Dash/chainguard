import type { InvestigationPhase } from "@/lib/types";

const PHASES: { key: InvestigationPhase; label: string }[] = [
  { key: "detecting", label: "DETECT" },
  { key: "investigating", label: "INVESTIGATE" },
  { key: "assessing", label: "ASSESS" },
  { key: "remediating", label: "REMEDIATE" },
  { key: "awaiting_approval", label: "APPROVAL" },
  { key: "complete", label: "COMPLETE" },
];

const PHASE_ORDER = PHASES.map((p) => p.key);

export function PhaseIndicator({ phase, isRunning }: { phase: InvestigationPhase; isRunning: boolean }) {
  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-gray-900 border-b border-gray-800">
      <span className="text-sm font-bold text-emerald-400 mr-4">ChainGuard</span>
      {PHASES.map((p, i) => {
        const isActive = p.key === phase;
        const isDone = i < currentIdx;
        return (
          <div key={p.key} className="flex items-center gap-2">
            {i > 0 && <div className={`w-8 h-px ${isDone ? "bg-emerald-500" : "bg-gray-700"}`} />}
            <div
              className={`px-3 py-1 rounded text-xs font-mono ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500"
                  : isDone
                  ? "bg-gray-800 text-gray-400"
                  : "bg-gray-900 text-gray-600"
              }`}
            >
              {p.label}
              {isActive && isRunning && <span className="ml-1 animate-pulse">●</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
