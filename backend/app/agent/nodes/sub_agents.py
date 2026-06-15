import json
import logging
from datetime import datetime, timezone
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm import get_llm
from app.config import settings
from app.agent.prompts import (
    IOC_HUNTER_SYSTEM, THREAT_INTEL_SYSTEM, BLAST_RADIUS_SYSTEM, SUB_AGENT_ANALYZE,
)
from app.agent.parse import extract_json
from app.agent.nodes.investigate import run_splunk_query, extract_entities_from_results, _get_mcp_tools

logger = logging.getLogger("chainguard")

MAX_QUERIES_PER_AGENT = 5


async def _run_sub_agent(agent_name: str, system_prompt: str, domain: str, state: dict) -> dict:
    iocs_text = json.dumps(state["iocs"], default=str)
    plan_text = "\n".join(f"- {step}" for step in state["investigation_plan"])
    indexes = ", ".join(settings.splunk_indexes) or "cicd_events, git_events, threat_intel, extensions, secret_audit"

    llm = get_llm()
    mcp_tools = await _get_mcp_tools()

    plan_response = await llm.ainvoke([
        SystemMessage(content=system_prompt.format(indexes=indexes)),
        HumanMessage(content=f"Attack type: {state['attack_type']}\n\nIOCs:\n{iocs_text}\n\nInvestigation plan:\n{plan_text}"),
    ])

    query_plan = extract_json(plan_response.content)
    planned_queries = query_plan["queries"][:MAX_QUERIES_PER_AGENT]

    query_results = []
    query_summaries = []

    for planned_query in planned_queries:
        spl = planned_query["spl"]
        raw_result = await run_splunk_query(spl, mcp_tools)
        try:
            parsed = json.loads(raw_result)
            if isinstance(parsed, dict) and "results" in parsed:
                results = parsed["results"]
            elif isinstance(parsed, list):
                results = parsed
            else:
                results = [{"raw": raw_result}]
        except (json.JSONDecodeError, TypeError):
            results = [{"raw": raw_result}]

        query_results.append({
            "spl": spl,
            "results": results,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "node": agent_name,
        })
        query_summaries.append(f"Query: {spl}\nResults: {json.dumps(results, default=str)}")

    analysis_response = await llm.ainvoke([
        SystemMessage(content=SUB_AGENT_ANALYZE.format(domain=domain)),
        HumanMessage(content=f"IOCs:\n{iocs_text}\n\nQuery results:\n" + "\n\n".join(query_summaries)),
    ])

    analysis = extract_json(analysis_response.content)
    discovered = extract_entities_from_results(query_results)

    return {
        "agent_name": agent_name,
        "splunk_queries": query_results,
        "findings": analysis.get("findings", []),
        "new_iocs": analysis.get("new_iocs", []),
        "discovered_entities": discovered,
        "raw_analysis": analysis.get("reasoning", "Analysis complete"),
    }


async def ioc_hunter_node(state: dict) -> dict:
    logger.info("[IOC_HUNTER] Starting IOC hunt")
    try:
        result = await _run_sub_agent("ioc_hunter", IOC_HUNTER_SYSTEM, "IOC hunting", state)
    except Exception as e:
        logger.error(f"[IOC_HUNTER] Failed: {e}")
        result = {
            "agent_name": "ioc_hunter",
            "splunk_queries": [], "findings": [], "new_iocs": [],
            "discovered_entities": [], "raw_analysis": f"IOC Hunter failed: {e}",
        }
    return {"sub_agent_results": [result]}


async def threat_intel_node(state: dict) -> dict:
    logger.info("[THREAT_INTEL] Starting threat intel correlation")
    try:
        result = await _run_sub_agent("threat_intel", THREAT_INTEL_SYSTEM, "threat intelligence", state)
    except Exception as e:
        logger.error(f"[THREAT_INTEL] Failed: {e}")
        result = {
            "agent_name": "threat_intel",
            "splunk_queries": [], "findings": [], "new_iocs": [],
            "discovered_entities": [], "raw_analysis": f"Threat Intel failed: {e}",
        }
    return {"sub_agent_results": [result]}


async def blast_radius_node(state: dict) -> dict:
    logger.info("[BLAST_RADIUS] Starting blast radius mapping")
    try:
        result = await _run_sub_agent("blast_radius", BLAST_RADIUS_SYSTEM, "blast radius mapping", state)
    except Exception as e:
        logger.error(f"[BLAST_RADIUS] Failed: {e}")
        result = {
            "agent_name": "blast_radius",
            "splunk_queries": [], "findings": [], "new_iocs": [],
            "discovered_entities": [], "raw_analysis": f"Blast Radius failed: {e}",
        }
    return {"sub_agent_results": [result]}
