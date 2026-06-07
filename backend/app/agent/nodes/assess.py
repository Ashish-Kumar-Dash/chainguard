import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm import get_llm
from app.agent.prompts import ASSESS_SYSTEM
from app.agent.parse import extract_json
from app.state import InvestigationState


async def assess_node(state: InvestigationState) -> dict:
    context = {
        "attack_type": state["attack_type"],
        "iocs": state["iocs"],
        "findings": state["findings"],
        "discovered_entities": state.get("discovered_entities", []),
        "queries_run": [
            {"spl": q["spl"], "result_count": len(q["results"])}
            for q in state["splunk_queries"]
        ],
    }

    llm = get_llm()
    response = await llm.ainvoke([
        SystemMessage(content=ASSESS_SYSTEM),
        HumanMessage(content=json.dumps(context, default=str)),
    ])

    assessment = extract_json(response.content)

    return {
        "severity_score": assessment["severity_score"],
        "blast_radius": assessment["blast_radius"],
        "attack_timeline": assessment["attack_timeline"],
        "propagation_graph": assessment["propagation_graph"],
        "reasoning": [f"[ASSESS] {assessment.get('summary', 'Assessment complete')}"],
        "status": "remediating",
    }
