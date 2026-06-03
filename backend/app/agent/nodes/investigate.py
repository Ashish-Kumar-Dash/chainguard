import json
from datetime import datetime, timezone
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm import get_llm
from app.config import settings
from app.agent.prompts import INVESTIGATE_SYSTEM, INVESTIGATE_ANALYZE
from app.state import InvestigationState

MAX_QUERIES = 10


async def run_splunk_query(spl: str, mcp_tools: dict | None = None) -> str:
    if mcp_tools and "splunk_run_query" in mcp_tools:
        tool = mcp_tools["splunk_run_query"]
        result = await tool.ainvoke({"query": spl})
        return str(result)
    return "[]"


def extract_entities_from_results(query_results: list[dict]) -> list[dict]:
    """Extract graph nodes from query results for progressive attack graph building."""
    entities = []
    seen = set()
    for qr in query_results:
        for result in qr.get("results", []):
            for key in ("host", "runner", "repo", "extension_id", "package", "secret_name"):
                val = result.get(key)
                if val and val not in seen:
                    seen.add(val)
                    entity_type = {
                        "host": "endpoint", "runner": "pipeline", "repo": "repo",
                        "extension_id": "package", "package": "package", "secret_name": "secret",
                    }.get(key, "endpoint")
                    entities.append({
                        "id": val, "label": val,
                        "entity_type": entity_type, "severity": "medium",
                    })
    return entities


async def investigate_node(state: InvestigationState, mcp_tools: dict | None = None) -> dict:
    iocs_text = json.dumps(state["iocs"], default=str)
    plan_text = "\n".join(f"- {s}" for s in state["investigation_plan"])
    indexes = ", ".join(settings.splunk_indexes) or "cicd_events, git_events, threat_intel, extensions, secret_audit"

    llm = get_llm()

    plan_response = await llm.ainvoke([
        SystemMessage(content=INVESTIGATE_SYSTEM.format(indexes=indexes)),
        HumanMessage(content=f"IOCs:\n{iocs_text}\n\nInvestigation plan:\n{plan_text}"),
    ])

    query_plan = json.loads(plan_response.content)
    queries = query_plan["queries"][:MAX_QUERIES]

    query_results = []
    all_results_text = []

    for q in queries:
        raw_result = await run_splunk_query(q["spl"], mcp_tools)
        qr = {
            "spl": q["spl"],
            "results": json.loads(raw_result) if raw_result.startswith("[") else [{"raw": raw_result}],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node": "investigate",
        }
        query_results.append(qr)
        all_results_text.append(f"Query: {q['spl']}\nResults: {raw_result}")

    analysis_response = await llm.ainvoke([
        SystemMessage(content=INVESTIGATE_ANALYZE),
        HumanMessage(content=f"IOCs being investigated:\n{iocs_text}\n\nQuery results:\n" + "\n\n".join(all_results_text)),
    ])

    analysis = json.loads(analysis_response.content)
    discovered = extract_entities_from_results(query_results)

    return {
        "splunk_queries": query_results,
        "findings": analysis.get("findings", []),
        "new_iocs": analysis.get("new_iocs", []),
        "discovered_entities": discovered,
        "reasoning": [f"[INVESTIGATE] {analysis.get('reasoning', 'Analysis complete')}"],
        "status": "assessing",
    }
