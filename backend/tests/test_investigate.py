import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.investigate import investigate_node, extract_entities_from_results


MOCK_QUERY_PLAN = json.dumps({
    "queries": [
        {
            "step": "Search for extension installs",
            "spl": 'search index=extensions extension_id="codestyle-formatter"',
            "target_index": "extensions",
        },
        {
            "step": "Search threat intel for C2 domain",
            "spl": 'search index=threat_intel ioc_value="c2.styleformat.io"',
            "target_index": "threat_intel",
        },
    ]
})

MOCK_ANALYSIS = json.dumps({
    "findings": [
        {
            "description": "Extension codestyle-formatter installed on 4 hosts",
            "severity": "high",
            "iocs": [{"type": "domain", "value": "c2.styleformat.io", "source": "query_results"}],
            "mitre_technique": "T1195.002",
        }
    ],
    "new_iocs": [
        {"type": "ip", "value": "45.33.32.156", "source": "discovered_during_investigation"}
    ],
    "needs_more_investigation": False,
    "reasoning": "Found evidence of extension compromise with C2 callback",
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
        "remediation_plan": [],
        "approved_actions": [],
        "rejected_actions": [],
        "reasoning": [],
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_investigate_runs_queries_and_analyzes():
    state = _make_state()

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=[
        AIMessage(content=MOCK_QUERY_PLAN),
        AIMessage(content=MOCK_ANALYSIS),
    ])

    with patch("app.agent.nodes.investigate.get_llm", return_value=mock_llm), \
         patch("app.agent.nodes.investigate.run_splunk_query",
               AsyncMock(return_value='[{"host": "ws-dev-04", "extension_id": "codestyle-formatter"}]')):
        result = await investigate_node(state)

    assert len(result["splunk_queries"]) == 2
    assert len(result["findings"]) == 1
    assert result["findings"][0]["severity"] == "high"
    assert len(result["new_iocs"]) == 1
    assert result["status"] == "assessing"
    assert "[INVESTIGATE]" in result["reasoning"][0]


@pytest.mark.asyncio
async def test_investigate_caps_queries_at_ten():
    state = _make_state(
        investigation_plan=[f"Step {i}" for i in range(20)],
    )

    many_queries = json.dumps({
        "queries": [
            {"step": f"Step {i}", "spl": f"search index=cicd_events step={i}", "target_index": "cicd_events"}
            for i in range(20)
        ]
    })
    mock_analysis = json.dumps({
        "findings": [], "new_iocs": [],
        "needs_more_investigation": False, "reasoning": "Done",
    })

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(side_effect=[
        AIMessage(content=many_queries),
        AIMessage(content=mock_analysis),
    ])

    with patch("app.agent.nodes.investigate.get_llm", return_value=mock_llm), \
         patch("app.agent.nodes.investigate.run_splunk_query", AsyncMock(return_value="[]")):
        result = await investigate_node(state)

    assert len(result["splunk_queries"]) <= 10


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
