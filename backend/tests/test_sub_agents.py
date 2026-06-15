import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.sub_agents import ioc_hunter_node, threat_intel_node, blast_radius_node


MOCK_QUERY_PLAN = json.dumps({
    "queries": [
        {
            "step": "Search for extension installs",
            "spl": 'search index=extensions extension_id="codestyle-formatter" earliest=-7d',
            "target_index": "extensions",
        }
    ]
})

MOCK_ANALYSIS = json.dumps({
    "findings": [
        {
            "description": "Found extension on 3 hosts",
            "severity": "high",
            "iocs": [{"type": "domain", "value": "c2.example.com", "source": "query_results"}],
            "mitre_technique": "T1195.002",
        }
    ],
    "new_iocs": [
        {"type": "ip", "value": "10.0.0.99", "source": "discovered_during_investigation"}
    ],
    "reasoning": "Extension found with suspicious C2 callback",
})


def _make_input() -> dict:
    return {
        "iocs": [{"type": "extension_id", "value": "codestyle-formatter", "source": "alert"}],
        "attack_type": "trojanized_extension",
        "investigation_plan": ["Search for extension installs"],
        "alert_raw": "Trojanized extension alert",
    }


def _mock_llm():
    llm = MagicMock()
    llm.ainvoke = AsyncMock(side_effect=[
        AIMessage(content=MOCK_QUERY_PLAN),
        AIMessage(content=MOCK_ANALYSIS),
    ])
    return llm


@pytest.mark.asyncio
async def test_ioc_hunter_returns_sub_agent_result():
    with patch("app.agent.nodes.sub_agents.get_llm", return_value=_mock_llm()), \
         patch("app.agent.nodes.sub_agents.run_splunk_query",
               AsyncMock(return_value='[{"host": "ws-dev-04"}]')):
        result = await ioc_hunter_node(_make_input())

    assert "sub_agent_results" in result
    assert len(result["sub_agent_results"]) == 1
    sr = result["sub_agent_results"][0]
    assert sr["agent_name"] == "ioc_hunter"
    assert len(sr["splunk_queries"]) == 1
    assert len(sr["findings"]) == 1
    assert sr["findings"][0]["severity"] == "high"
    assert len(sr["new_iocs"]) == 1
    assert "raw_analysis" in sr


@pytest.mark.asyncio
async def test_threat_intel_returns_sub_agent_result():
    with patch("app.agent.nodes.sub_agents.get_llm", return_value=_mock_llm()), \
         patch("app.agent.nodes.sub_agents.run_splunk_query",
               AsyncMock(return_value='[{"ioc_type": "domain"}]')):
        result = await threat_intel_node(_make_input())

    assert "sub_agent_results" in result
    sr = result["sub_agent_results"][0]
    assert sr["agent_name"] == "threat_intel"
    assert len(sr["splunk_queries"]) == 1
    assert len(sr["findings"]) == 1


@pytest.mark.asyncio
async def test_blast_radius_returns_sub_agent_result():
    with patch("app.agent.nodes.sub_agents.get_llm", return_value=_mock_llm()), \
         patch("app.agent.nodes.sub_agents.run_splunk_query",
               AsyncMock(return_value='[{"repo": "acme/tools"}]')):
        result = await blast_radius_node(_make_input())

    assert "sub_agent_results" in result
    sr = result["sub_agent_results"][0]
    assert sr["agent_name"] == "blast_radius"
    assert len(sr["splunk_queries"]) == 1


@pytest.mark.asyncio
async def test_sub_agent_handles_mcp_failure_gracefully():
    with patch("app.agent.nodes.sub_agents.get_llm", return_value=_mock_llm()), \
         patch("app.agent.nodes.sub_agents.run_splunk_query",
               AsyncMock(return_value="[]")), \
         patch("app.agent.nodes.sub_agents._get_mcp_tools",
               AsyncMock(return_value={})):
        result = await ioc_hunter_node(_make_input())

    assert "sub_agent_results" in result
    sr = result["sub_agent_results"][0]
    assert sr["agent_name"] == "ioc_hunter"
    assert isinstance(sr["splunk_queries"], list)
