import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.investigate import (
    investigate_supervisor, investigate_merge, run_splunk_query, extract_entities_from_results,
)


MOCK_MERGE_RESPONSE = json.dumps({
    "findings": [
        {
            "description": "Extension codestyle-formatter found on 4 hosts with C2 callback",
            "severity": "high",
            "iocs": [
                {"type": "domain", "value": "c2.styleformat.io", "source": "ioc_hunter"},
                {"type": "ip", "value": "45.33.32.156", "source": "threat_intel"},
            ],
            "mitre_technique": "T1195.002",
        }
    ],
    "new_iocs": [
        {"type": "ip", "value": "45.33.32.156", "source": "discovered_during_investigation"}
    ],
    "reasoning": "Combined analysis from IOC hunting, threat intel, and blast radius mapping confirms supply chain compromise.",
})


def _make_state(**overrides) -> dict:
    base = {
        "alert_raw": "Trojanized extension alert",
        "attack_type": "trojanized_extension",
        "iocs": [{"type": "extension_id", "value": "codestyle-formatter", "source": "alert"}],
        "investigation_plan": ["Search for extension installs", "Check threat intel"],
        "splunk_queries": [],
        "findings": [],
        "new_iocs": [],
        "loop_count": 0,
        "status": "investigating",
        "messages": [],
        "blast_radius": None,
        "severity_score": 0.0,
        "attack_timeline": [],
        "propagation_graph": None,
        "discovered_entities": [],
        "sub_agent_results": [],
        "remediation_plan": [],
        "approved_actions": [],
        "rejected_actions": [],
        "reasoning": [],
    }
    base.update(overrides)
    return base


def test_supervisor_returns_three_send_messages():
    state = _make_state()
    sends = investigate_supervisor(state)

    assert len(sends) == 3
    agent_names = {s.node for s in sends}
    assert agent_names == {"ioc_hunter", "threat_intel", "blast_radius"}

    for s in sends:
        assert "iocs" in s.arg
        assert "attack_type" in s.arg
        assert "investigation_plan" in s.arg
        assert "alert_raw" in s.arg


@pytest.mark.asyncio
async def test_merge_synthesizes_sub_agent_results():
    state = _make_state(
        sub_agent_results=[
            {
                "agent_name": "ioc_hunter",
                "splunk_queries": [{"spl": "search index=extensions", "results": [{"host": "ws-dev-04"}], "timestamp": "2026-06-09T00:00:00Z", "node": "ioc_hunter"}],
                "findings": [{"description": "Found on 4 hosts", "severity": "high", "iocs": [], "mitre_technique": None}],
                "new_iocs": [],
                "discovered_entities": [{"id": "ws-dev-04", "label": "ws-dev-04", "entity_type": "endpoint", "severity": "medium"}],
                "raw_analysis": "Found extension installed on 4 hosts",
            },
            {
                "agent_name": "threat_intel",
                "splunk_queries": [{"spl": "search index=threat_intel", "results": [{"ioc_type": "domain"}], "timestamp": "2026-06-09T00:00:00Z", "node": "threat_intel"}],
                "findings": [{"description": "Known C2 domain", "severity": "critical", "iocs": [], "mitre_technique": "T1071"}],
                "new_iocs": [{"type": "ip", "value": "45.33.32.156", "source": "threat_intel"}],
                "discovered_entities": [],
                "raw_analysis": "C2 domain matches known threat actor",
            },
            {
                "agent_name": "blast_radius",
                "splunk_queries": [{"spl": "search index=cicd_events", "results": [{"runner": "ci-03"}], "timestamp": "2026-06-09T00:00:00Z", "node": "blast_radius"}],
                "findings": [],
                "new_iocs": [],
                "discovered_entities": [{"id": "ci-03", "label": "ci-03", "entity_type": "pipeline", "severity": "medium"}],
                "raw_analysis": "CI runner ci-03 executed compromised pipeline",
            },
        ]
    )

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_MERGE_RESPONSE))

    with patch("app.agent.nodes.investigate.get_llm", return_value=mock_llm):
        result = await investigate_merge(state)

    assert len(result["splunk_queries"]) == 3
    assert len(result["findings"]) >= 1
    assert len(result["discovered_entities"]) == 2
    assert result["status"] == "assessing"
    assert "[INVESTIGATE]" in result["reasoning"][0]


@pytest.mark.asyncio
async def test_merge_handles_empty_sub_agent_results():
    state = _make_state(sub_agent_results=[])

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=json.dumps({
        "findings": [], "new_iocs": [], "reasoning": "No sub-agent data available",
    })))

    with patch("app.agent.nodes.investigate.get_llm", return_value=mock_llm):
        result = await investigate_merge(state)

    assert result["status"] == "assessing"
    assert isinstance(result["splunk_queries"], list)


def test_extract_entities_from_results():
    query_results = [
        {
            "spl": "search index=extensions",
            "results": [
                {"host": "ws-dev-04", "extension_id": "codestyle-formatter"},
                {"host": "ws-dev-07", "extension_id": "codestyle-formatter"},
            ],
        },
        {
            "spl": "search index=cicd_events",
            "results": [
                {"runner": "ci-runner-03", "repo": "acme-corp/internal-tools"},
            ],
        },
    ]
    entities = extract_entities_from_results(query_results)

    ids = {e["id"] for e in entities}
    assert "ws-dev-04" in ids
    assert "ws-dev-07" in ids
    assert "ci-runner-03" in ids
    assert "acme-corp/internal-tools" in ids
    assert "codestyle-formatter" in ids
    assert len(entities) == 5

    types = {e["id"]: e["entity_type"] for e in entities}
    assert types["ws-dev-04"] == "endpoint"
    assert types["ci-runner-03"] == "pipeline"
    assert types["acme-corp/internal-tools"] == "repo"
    assert types["codestyle-formatter"] == "package"
