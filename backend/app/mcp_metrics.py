import time
from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class ToolCall:
    tool_name: str
    timestamp: float
    latency_ms: float
    success: bool
    error: str | None = None
    investigation_id: str | None = None


class MCPMetricsStore:
    def __init__(self):
        self.calls: list[ToolCall] = []
        self._by_tool: dict[str, list[ToolCall]] = defaultdict(list)

    def record(self, tool_name: str, latency_ms: float, success: bool,
               error: str | None = None, investigation_id: str | None = None):
        call = ToolCall(
            tool_name=tool_name,
            timestamp=time.time(),
            latency_ms=latency_ms,
            success=success,
            error=error,
            investigation_id=investigation_id,
        )
        self.calls.append(call)
        self._by_tool[tool_name].append(call)

    def summary(self) -> dict:
        if not self.calls:
            return {"total_calls": 0, "tools": {}, "recent": []}

        tool_stats = {}
        for name, calls in self._by_tool.items():
            successes = [c for c in calls if c.success]
            failures = [c for c in calls if not c.success]
            latencies = [c.latency_ms for c in calls]
            tool_stats[name] = {
                "total": len(calls),
                "success": len(successes),
                "failure": len(failures),
                "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
                "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1) if latencies else 0,
                "last_used": max(c.timestamp for c in calls),
            }

        recent = sorted(self.calls, key=lambda c: c.timestamp, reverse=True)[:20]
        return {
            "total_calls": len(self.calls),
            "success_rate": round(sum(1 for c in self.calls if c.success) / len(self.calls) * 100, 1),
            "tools": tool_stats,
            "recent": [
                {
                    "tool": c.tool_name,
                    "latency_ms": c.latency_ms,
                    "success": c.success,
                    "error": c.error,
                    "timestamp": c.timestamp,
                    "investigation_id": c.investigation_id,
                }
                for c in recent
            ],
        }


mcp_metrics = MCPMetricsStore()
