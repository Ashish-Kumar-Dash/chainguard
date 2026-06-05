import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.graph import create_agent


DETECT_RESPONSE = json.dumps({
    "attack_type": "trojanized_extension",
    "iocs": [{"type": "extension_id", "value": "codestyle-formatter", "source": "alert"}],
    "investigation_plan": ["Search extensions index"],
    "reasoning": "Extension-based supply chain attack detected",
})

QUERY_PLAN = json.dumps({
    "queries": [{"step": "Search extensions", "spl": "search index=extensions", "target_index": "extensions"}],
})

ANALYSIS = json.dumps({
    "findings": [{"description": "Found malicious extension on 4 hosts", "severity": "high", "iocs": [], "mitre_technique": "T1195.002"}],
    "new_iocs": [],
    "needs_more_investigation": False,
    "reasoning": "Investigation complete",
})

ASSESSMENT = json.dumps({
    "severity_score": 7.5,
    "blast_radius": {
        "affected_entities": [{"entity_type": "endpoint", "identifier": "ws-dev-04", "details": "compromised"}],
        "total_repos": 0,
        "total_endpoints": 1,
        "total_secrets": 0,
        "total_pipelines": 0,
    },
    "attack_timeline": [{"timestamp": "2026-06-01T10:00:00Z", "description": "Extension installed", "source_index": "extensions", "severity": "high"}],
    "propagation_graph": {
        "nodes": [{"id": "n1", "label": "codestyle-formatter", "entity_type": "package", "severity": "critical"}],
        "edges": [],
    },
    "summary": "Trojanized extension compromise",
})

REMEDIATION = json.dumps({
    "actions": [{"id": "a1", "description": "Remove extension", "priority": "critical", "category": "quarantine_endpoint", "target": "codestyle-formatter", "reasoning": "Active threat"}],
    "summary": "Remove and rotate credentials",
})


@pytest.mark.asyncio
async def test_full_investigation_pipeline():
    mock_detect_llm = MagicMock()
    mock_detect_llm.ainvoke = AsyncMock(return_value=AIMessage(content=DETECT_RESPONSE))

    mock_inv_llm = MagicMock()
    mock_inv_llm.ainvoke = AsyncMock(side_effect=[
        AIMessage(content=QUERY_PLAN),
        AIMessage(content=ANALYSIS),
    ])

    mock_assess_llm = MagicMock()
    mock_assess_llm.ainvoke = AsyncMock(return_value=AIMessage(content=ASSESSMENT))

    mock_rem_llm = MagicMock()
    mock_rem_llm.ainvoke = AsyncMock(return_value=AIMessage(content=REMEDIATION))

    with patch("app.agent.nodes.detect.get_llm", return_value=mock_detect_llm), \
         patch("app.agent.nodes.investigate.get_llm", return_value=mock_inv_llm), \
         patch("app.agent.nodes.investigate.run_splunk_query", AsyncMock(return_value="[]")), \
         patch("app.agent.nodes.assess.get_llm", return_value=mock_assess_llm), \
         patch("app.agent.nodes.remediate.get_llm", return_value=mock_rem_llm):

        agent = create_agent()
        initial_state = {
            "alert_raw": "Trojanized VS Code extension codestyle-formatter detected",
            "attack_type": "",
            "iocs": [],
            "investigation_plan": [],
            "splunk_queries": [],
            "findings": [],
            "new_iocs": [],
            "loop_count": 0,
            "blast_radius": None,
            "severity_score": 0.0,
            "attack_timeline": [],
            "propagation_graph": None,
            "discovered_entities": [],
            "remediation_plan": [],
            "approved_actions": [],
            "rejected_actions": [],
            "reasoning": [],
            "status": "detecting",
            "messages": [],
        }

        config = {"configurable": {"thread_id": "e2e-test-001"}}
        result = await agent.ainvoke(initial_state, config)

    assert result["attack_type"] == "trojanized_extension"
    assert result["status"] == "awaiting_approval"
    assert result["severity_score"] == 7.5
    assert len(result["remediation_plan"]) == 1
    assert result["remediation_plan"][0]["id"] == "a1"
    assert result["blast_radius"]["total_endpoints"] == 1
    assert len(result["propagation_graph"]["nodes"]) == 1
    assert len(result["iocs"]) == 1
    assert len(result["findings"]) == 1
    assert len(result["reasoning"]) >= 4
