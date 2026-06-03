import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.assess import assess_node


MOCK_ASSESSMENT = json.dumps({
    "severity_score": 8.5,
    "blast_radius": {
        "affected_entities": [
            {"entity_type": "endpoint", "identifier": "ws-dev-04", "details": "Extension installed, credentials stolen"},
            {"entity_type": "repo", "identifier": "org/internal-tools", "details": "Backdoored commit pushed"},
            {"entity_type": "secret", "identifier": "DEPLOY_KEY", "details": "Accessed during tainted CI build"},
            {"entity_type": "secret", "identifier": "NPM_TOKEN", "details": "Accessed during tainted CI build"},
            {"entity_type": "pipeline", "identifier": "org/internal-tools/main", "details": "Executed tainted build"},
        ],
        "total_repos": 1,
        "total_endpoints": 1,
        "total_secrets": 2,
        "total_pipelines": 1,
    },
    "attack_timeline": [
        {"timestamp": "2026-06-01T10:00:00Z", "description": "Trojanized extension published", "source_index": "extensions", "severity": "critical"},
        {"timestamp": "2026-06-01T10:05:00Z", "description": "Developer updates extension", "source_index": "extensions", "severity": "high"},
    ],
    "propagation_graph": {
        "nodes": [
            {"id": "ext", "label": "codestyle-formatter v2.1.0", "entity_type": "package", "severity": "critical"},
            {"id": "ws04", "label": "ws-dev-04", "entity_type": "endpoint", "severity": "high"},
            {"id": "repo", "label": "org/internal-tools", "entity_type": "repo", "severity": "high"},
        ],
        "edges": [
            {"source": "ext", "target": "ws04", "label": "Extension auto-updated"},
            {"source": "ws04", "target": "repo", "label": "Stolen credentials used to push"},
        ],
    },
    "summary": "Critical supply chain compromise via trojanized VS Code extension",
})


def _make_state(**overrides) -> dict:
    base = {
        "alert_raw": "Trojanized extension alert",
        "attack_type": "trojanized_extension",
        "iocs": [{"type": "extension_id", "value": "codestyle-formatter", "source": "alert"}],
        "investigation_plan": [],
        "splunk_queries": [
            {"spl": "search index=extensions", "results": [{"host": "ws-dev-04"}], "timestamp": "2026-06-01T10:00:00Z", "node": "investigate"},
        ],
        "findings": [
            {"description": "Extension on 4 hosts", "severity": "high", "evidence": [], "iocs": [], "mitre_technique": "T1195.002"},
        ],
        "new_iocs": [],
        "loop_count": 0,
        "blast_radius": None,
        "severity_score": 0.0,
        "attack_timeline": [],
        "propagation_graph": None,
        "discovered_entities": [
            {"id": "ws-dev-04", "label": "ws-dev-04", "entity_type": "endpoint", "severity": "medium"},
        ],
        "remediation_plan": [],
        "approved_actions": [],
        "rejected_actions": [],
        "status": "assessing",
        "messages": [],
        "reasoning": [],
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_assess_produces_blast_radius():
    state = _make_state()

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_ASSESSMENT))

    with patch("app.agent.nodes.assess.get_llm", return_value=mock_llm):
        result = await assess_node(state)

    assert result["severity_score"] == 8.5
    assert result["blast_radius"]["total_secrets"] == 2
    assert len(result["propagation_graph"]["nodes"]) == 3
    assert len(result["propagation_graph"]["edges"]) == 2
    assert len(result["attack_timeline"]) == 2
    assert result["status"] == "remediating"
    assert "[ASSESS]" in result["reasoning"][0]


@pytest.mark.asyncio
async def test_assess_passes_discovered_entities_to_llm():
    state = _make_state(
        discovered_entities=[
            {"id": "ws-dev-04", "label": "ws-dev-04", "entity_type": "endpoint", "severity": "medium"},
            {"id": "ci-runner-03", "label": "ci-runner-03", "entity_type": "pipeline", "severity": "medium"},
        ],
    )

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_ASSESSMENT))

    with patch("app.agent.nodes.assess.get_llm", return_value=mock_llm):
        await assess_node(state)

    call_args = mock_llm.ainvoke.call_args[0][0]
    human_msg_content = call_args[1].content
    parsed_context = json.loads(human_msg_content)
    assert len(parsed_context["discovered_entities"]) == 2
    assert parsed_context["discovered_entities"][1]["id"] == "ci-runner-03"
