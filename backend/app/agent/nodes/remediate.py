import json
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm import get_llm
from app.agent.prompts import REMEDIATE_SYSTEM
from app.agent.parse import extract_json
from app.state import InvestigationState


async def remediate_node(state: InvestigationState) -> dict:
    context = {
        "attack_type": state["attack_type"],
        "severity_score": state["severity_score"],
        "blast_radius": state["blast_radius"],
        "findings": state["findings"],
        "attack_timeline": state["attack_timeline"],
    }

    llm = get_llm()
    response = await llm.ainvoke([
        SystemMessage(content=REMEDIATE_SYSTEM),
        HumanMessage(content=json.dumps(context, default=str)),
    ])

    plan = extract_json(response.content)

    actions = []
    for action in plan["actions"]:
        actions.append({
            "id": action["id"],
            "description": action["description"],
            "priority": action["priority"],
            "category": action["category"],
            "target": action["target"],
            "status": "pending",
        })

    return {
        "remediation_plan": actions,
        "reasoning": [f"[REMEDIATE] {plan.get('summary', 'Remediation plan ready')}"],
        "status": "awaiting_approval",
    }
