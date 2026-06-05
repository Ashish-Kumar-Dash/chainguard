import { TimelineStep } from "./TimelineStep";
import type { StateUpdate, InvestigationState } from "@/lib/types";

export function Timeline({ updates, state }: { updates: StateUpdate[]; state: InvestigationState }) {
  const visibleUpdates = updates.filter((u) => u.node !== "increment_loop");

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Investigation Timeline</h2>
        {state.attack_type && state.attack_type !== "unknown" && (
          <span className="text-xs text-emerald-400 font-mono">{state.attack_type}</span>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {visibleUpdates.length === 0 ? (
          <div className="text-gray-500 text-sm text-center mt-8">
            Timeline will populate as the agent investigates.
          </div>
        ) : (
          visibleUpdates.map((update, i) => (
            <TimelineStep key={i} update={update} index={i} />
          ))
        )}
      </div>
    </div>
  );
}
