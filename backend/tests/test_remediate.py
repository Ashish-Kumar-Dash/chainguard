import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.remediate import remediate_node


MOCK_REMEDIATION = json.dumps({
    "actions": [
        {
            "id": "action-001",
            "description": "Rotate GitHub PAT for dev-sarah",
            "priority": "critical",
            "category": "rotate_secret",
            "target": "github_pat_dev-sarah",
            "reasoning": "Credential was stolen by trojanized extension",
        },
        {
            "id": "action-002",
            "description": "Uninstall codestyle-formatter from all workstations",
            "priority": "critical",
            "category": "quarantine_endpoint",
            "target": "codestyle-formatter",
            "reasoning": "Extension is actively compromised",
        },
        {
            "id": "action-003",
            "description": "Revoke and rotate DEPLOY_KEY",
            "priority": "high",
            "category": "rotate_secret",
            "target": "DEPLOY_KEY",
            "reasoning": "Accessed during tainted CI build",
        },
    ],
    "summary": "Immediate credential rotation and extension removal required",
})


def _make_state(**overrides) -> dict:
    base = {
        "alert_raw": "Alert",
        "attack_type": "trojanized_extension",
        "iocs": [],
        "investigation_plan": [],
        "splunk_queries": [],
        "findings": [
            {"description": "Extension compromise", "severity": "high", "evidence": [], "iocs": [], "mitre_technique": None},
        ],
        "new_iocs": [],
        "loop_count": 0,
        "blast_radius": {
            "affected_entities": [],
            "total_repos": 1, "total_endpoints": 1,
            "total_secrets": 2, "total_pipelines": 1,
        },
        "severity_score": 8.5,
        "attack_timeline": [],
        "propagation_graph": None,
        "discovered_entities": [],
        "remediation_plan": [],
        "approved_actions": [],
        "rejected_actions": [],
        "status": "remediating",
        "messages": [],
        "reasoning": [],
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_remediate_generates_actions():
    state = _make_state()

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_REMEDIATION))

    with patch("app.agent.nodes.remediate.get_llm", return_value=mock_llm):
        result = await remediate_node(state)

    assert len(result["remediation_plan"]) == 3
    assert result["remediation_plan"][0]["priority"] == "critical"
    assert result["remediation_plan"][0]["id"] == "action-001"
    assert result["status"] == "awaiting_approval"
    assert "[REMEDIATE]" in result["reasoning"][0]


@pytest.mark.asyncio
async def test_remediate_actions_default_to_pending():
    state = _make_state()

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_REMEDIATION))

    with patch("app.agent.nodes.remediate.get_llm", return_value=mock_llm):
        result = await remediate_node(state)

    for action in result["remediation_plan"]:
        assert action["status"] == "pending"


@pytest.mark.asyncio
async def test_remediate_passes_severity_and_blast_radius_to_llm():
    state = _make_state(severity_score=9.2)

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_REMEDIATION))

    with patch("app.agent.nodes.remediate.get_llm", return_value=mock_llm):
        await remediate_node(state)

    call_args = mock_llm.ainvoke.call_args[0][0]
    human_msg = json.loads(call_args[1].content)
    assert human_msg["severity_score"] == 9.2
    assert human_msg["blast_radius"]["total_secrets"] == 2
