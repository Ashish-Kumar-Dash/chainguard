import pytest
import json
from unittest.mock import AsyncMock, patch, MagicMock
from langchain_core.messages import AIMessage
from app.agent.nodes.detect import detect_node


MOCK_DETECT_RESPONSE = json.dumps({
    "attack_type": "trojanized_extension",
    "iocs": [
        {"type": "extension_id", "value": "codestyle-formatter", "source": "alert_input"},
        {"type": "hash", "value": "e3b0c44298fc1c14", "source": "alert_input"},
        {"type": "domain", "value": "c2.styleformat.io", "source": "alert_input"},
    ],
    "investigation_plan": [
        "Search extensions index for codestyle-formatter installs",
        "Search threat_intel for domain c2.styleformat.io",
        "Search extensions index for network callbacks to c2.styleformat.io",
    ],
    "reasoning": "Alert mentions trojanized VS Code extension with C2 callback",
})


def _make_state(alert: str = "", **overrides) -> dict:
    base = {
        "alert_raw": alert,
        "attack_type": "",
        "iocs": [],
        "investigation_plan": [],
        "loop_count": 0,
        "status": "",
        "messages": [],
        "splunk_queries": [],
        "findings": [],
        "new_iocs": [],
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
async def test_detect_extracts_iocs():
    state = _make_state(
        alert="Trojanized VS Code extension codestyle-formatter v2.1.0 detected. "
              "Hash: e3b0c44298fc1c14. C2: c2.styleformat.io"
    )

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=MOCK_DETECT_RESPONSE))

    with patch("app.agent.nodes.detect.get_llm", return_value=mock_llm):
        result = await detect_node(state)

    assert result["attack_type"] == "trojanized_extension"
    assert len(result["iocs"]) == 3
    assert result["iocs"][0]["type"] == "extension_id"
    assert len(result["investigation_plan"]) == 3
    assert result["status"] == "investigating"
    assert len(result["reasoning"]) == 1
    assert "[DETECT]" in result["reasoning"][0]


@pytest.mark.asyncio
async def test_detect_handles_unknown_attack():
    state = _make_state(alert="Something suspicious happened")

    unknown_response = json.dumps({
        "attack_type": "unknown",
        "iocs": [],
        "investigation_plan": ["Broad search across all indexes for anomalies"],
        "reasoning": "Insufficient information to classify",
    })

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=unknown_response))

    with patch("app.agent.nodes.detect.get_llm", return_value=mock_llm):
        result = await detect_node(state)

    assert result["attack_type"] == "unknown"
    assert len(result["investigation_plan"]) >= 1


@pytest.mark.asyncio
async def test_detect_loopback_includes_new_iocs():
    state = _make_state(
        alert="Original alert about extension",
        loop_count=1,
        new_iocs=[
            {"type": "ip", "value": "45.33.22.11", "source": "discovered_during_investigation"},
        ],
    )

    loopback_response = json.dumps({
        "attack_type": "trojanized_extension",
        "iocs": [
            {"type": "ip", "value": "45.33.22.11", "source": "discovered_during_investigation"},
        ],
        "investigation_plan": ["Search for connections to 45.33.22.11"],
        "reasoning": "Re-analysis with newly discovered attacker IP",
    })

    mock_llm = MagicMock()
    mock_llm.ainvoke = AsyncMock(return_value=AIMessage(content=loopback_response))

    with patch("app.agent.nodes.detect.get_llm", return_value=mock_llm):
        result = await detect_node(state)

    assert result["attack_type"] == "trojanized_extension"
    # Verify the prompt included the new IOCs
    call_args = mock_llm.ainvoke.call_args[0][0]
    human_msg = call_args[1].content
    assert "45.33.22.11" in human_msg
    assert "Re-analyzing" in human_msg
