import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm import get_llm
from app.config import settings
from app.agent.prompts import DETECT_SYSTEM
from app.state import InvestigationState


async def detect_node(state: InvestigationState) -> dict:
    alert = state["alert_raw"]
    loop_count = state.get("loop_count", 0)
    indexes = ", ".join(settings.splunk_indexes) or "cicd_events, git_events, threat_intel, extensions, secret_audit"

    if loop_count > 0 and state.get("new_iocs"):
        new_ioc_text = ", ".join(f"{i['type']}:{i['value']}" for i in state["new_iocs"])
        prompt = f"Re-analyzing with newly discovered IOCs: {new_ioc_text}\n\nOriginal alert: {alert}"
    else:
        prompt = alert

    llm = get_llm()
    response = await llm.ainvoke([
        SystemMessage(content=DETECT_SYSTEM.format(indexes=indexes)),
        HumanMessage(content=prompt),
    ])

    parsed = json.loads(response.content)

    return {
        "attack_type": parsed["attack_type"],
        "iocs": parsed["iocs"],
        "investigation_plan": parsed["investigation_plan"],
        "new_iocs": [],
        "reasoning": [f"[DETECT] {parsed.get('reasoning', 'Classification complete')}"],
        "status": "investigating",
    }
