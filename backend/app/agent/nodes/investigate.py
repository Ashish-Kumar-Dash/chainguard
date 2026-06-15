import json
import time
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.types import Send
from app.llm import get_llm
from app.config import settings
from app.agent.prompts import INVESTIGATE_MERGE_SYSTEM
from app.agent.parse import extract_json
from app.state import InvestigationState
from app.mcp_metrics import mcp_metrics

logger = logging.getLogger("chainguard")


async def _get_mcp_tools() -> dict:
    if not settings.splunk_mcp_token:
        return {}
    try:
        from app.splunk.mcp_client import create_mcp_client
        client = create_mcp_client()
        tools = await client.get_tools()
        return {tool.name: tool for tool in tools}
    except Exception as e:
        logger.warning(f"Could not connect to Splunk MCP: {e}")
        return {}


async def run_splunk_query(spl: str, mcp_tools: dict | None = None,
                           investigation_id: str | None = None) -> str:
    if mcp_tools and "splunk_run_query" in mcp_tools:
        query_tool = mcp_tools["splunk_run_query"]
        start_time = time.time()
        try:
            result = await query_tool.ainvoke({"query": spl})
            mcp_metrics.record("splunk_run_query", (time.time() - start_time) * 1000,
                               True, investigation_id=investigation_id)
            return str(result)
        except Exception as e:
            mcp_metrics.record("splunk_run_query", (time.time() - start_time) * 1000,
                               False, error=str(e), investigation_id=investigation_id)
            logger.error(f"MCP query failed: {e}")
            return "[]"
    return "[]"


SPLUNK_FIELD_TO_ENTITY_TYPE = {
    "host": "endpoint",
    "runner": "pipeline",
    "repo": "repo",
    "extension_id": "package",
    "package": "package",
    "secret_name": "secret",
}


def extract_entities_from_results(query_results: list[dict]) -> list[dict]:
    entities = []
    seen = set()
    for query_result in query_results:
        for row in query_result.get("results", []):
            for field_name, entity_type in SPLUNK_FIELD_TO_ENTITY_TYPE.items():
                value = row.get(field_name)
                if value and value not in seen:
                    seen.add(value)
                    entities.append({
                        "id": value, "label": value,
                        "entity_type": entity_type, "severity": "medium",
                    })
    return entities


def investigate_supervisor(state: InvestigationState) -> list[Send]:
    payload = {
        "iocs": state["iocs"],
        "attack_type": state["attack_type"],
        "investigation_plan": state["investigation_plan"],
        "alert_raw": state["alert_raw"],
    }
    return [
        Send("ioc_hunter", payload),
        Send("threat_intel", payload),
        Send("blast_radius", payload),
    ]


async def investigate_merge(state: InvestigationState) -> dict:
    sub_results = state.get("sub_agent_results", [])

    all_queries = []
    all_entities = []
    agent_summaries = []

    for result in sub_results:
        all_queries.extend(result.get("splunk_queries", []))
        all_entities.extend(result.get("discovered_entities", []))
        agent_summaries.append(
            f"## {result['agent_name']}\n"
            f"Findings: {json.dumps(result.get('findings', []), default=str)}\n"
            f"New IOCs: {json.dumps(result.get('new_iocs', []), default=str)}\n"
            f"Analysis: {result.get('raw_analysis', 'No analysis')}"
        )

    llm = get_llm()
    merge_response = await llm.ainvoke([
        SystemMessage(content=INVESTIGATE_MERGE_SYSTEM),
        HumanMessage(content="\n\n".join(agent_summaries) if agent_summaries else "No sub-agent results available."),
    ])

    merged = extract_json(merge_response.content)

    return {
        "splunk_queries": all_queries,
        "findings": merged.get("findings", []),
        "new_iocs": merged.get("new_iocs", []),
        "discovered_entities": all_entities,
        "reasoning": [f"[INVESTIGATE] {merged.get('reasoning', 'Multi-agent investigation complete')}"],
        "status": "assessing",
    }
