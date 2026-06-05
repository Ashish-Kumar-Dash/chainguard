"use client";

import { useState } from "react";

export function SPLBlock({ spl, results }: { spl: string; results: Record<string, unknown>[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-2 rounded border border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/50 text-xs font-mono text-gray-400 hover:text-gray-200"
      >
        <span className="truncate">{spl}</span>
        <span className="ml-2 text-gray-500">{results.length} results {isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="p-3 bg-gray-900/50 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
          <pre className="text-gray-300">{JSON.stringify(results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
