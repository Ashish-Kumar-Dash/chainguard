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
        for tool_name, tool_calls in self._by_tool.items():
            successes = [tc for tc in tool_calls if tc.success]
            failures = [tc for tc in tool_calls if not tc.success]
            latencies = [tc.latency_ms for tc in tool_calls]
            tool_stats[tool_name] = {
                "total": len(tool_calls),
                "success": len(successes),
                "failure": len(failures),
                "avg_latency_ms": round(sum(latencies) / len(latencies), 1),
                "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 1) if latencies else 0,
                "last_used": max(tc.timestamp for tc in tool_calls),
            }

        recent_calls = sorted(self.calls, key=lambda tc: tc.timestamp, reverse=True)[:20]
        return {
            "total_calls": len(self.calls),
            "success_rate": round(sum(1 for tc in self.calls if tc.success) / len(self.calls) * 100, 1),
            "tools": tool_stats,
            "recent": [
                {
                    "tool": tc.tool_name,
                    "latency_ms": tc.latency_ms,
                    "success": tc.success,
                    "error": tc.error,
                    "timestamp": tc.timestamp,
                    "investigation_id": tc.investigation_id,
                }
                for tc in recent_calls
            ],
        }


mcp_metrics = MCPMetricsStore()
