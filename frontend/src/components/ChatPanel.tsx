"use client";

import { useState, useRef, useEffect } from "react";
import { continueInvestigation } from "@/lib/api";
import type { InvestigationState } from "@/lib/types";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
  node?: string;
  timestamp: Date;
}

export function ChatPanel({
  onSubmit,
  state,
  isRunning,
  investigationId,
  reasoningMessages,
}: {
  onSubmit: (alert: string) => void;
  state: InvestigationState;
  isRunning: boolean;
  investigationId: string | null;
  reasoningMessages: ChatMessage[];
}) {
  const [input, setInput] = useState("");
  const [userMessages, setUserMessages] = useState<ChatMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const allMessages = [...userMessages, ...reasoningMessages].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const msg: ChatMessage = { role: "user", content: input, timestamp: new Date() };
    setUserMessages((prev) => [...prev, msg]);
    const text = input;
    setInput("");

    if (investigationId && state.status !== "detecting") {
      await continueInvestigation(investigationId, text);
    } else {
      onSubmit(text);
    }
  }

  const placeholder = investigationId && !isRunning
    ? "Ask a follow-up question to continue investigating..."
    : "Paste a security alert, threat intel report, or question...";

  const buttonText = isRunning ? "Running..." : investigationId ? "Follow up" : "Investigate";

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Investigation Chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {allMessages.length === 0 && (
          <div className="text-gray-500 text-sm text-center mt-8">
            Paste a security alert, threat intel report, or ask a question to begin an investigation.
          </div>
        )}
        {allMessages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-emerald-600/20 text-emerald-100"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {msg.node && (
                <span className="text-xs font-mono text-emerald-400 block mb-1">{msg.node}</span>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={isRunning}
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </form>
    </div>
  );
}
