from app.agent.graph import should_loop_back, MAX_LOOPS, build_graph, create_agent


def test_loop_back_when_new_iocs_and_under_limit():
    state = {
        "new_iocs": [{"type": "ip", "value": "1.2.3.4", "source": "investigation"}],
        "loop_count": 1,
    }
    assert should_loop_back(state) == "detect"


def test_no_loop_back_when_no_new_iocs():
    state = {"new_iocs": [], "loop_count": 0}
    assert should_loop_back(state) == "assess"


def test_no_loop_back_when_at_max():
    state = {
        "new_iocs": [{"type": "ip", "value": "1.2.3.4", "source": "investigation"}],
        "loop_count": MAX_LOOPS,
    }
    assert should_loop_back(state) == "assess"


def test_no_loop_back_when_over_max():
    state = {
        "new_iocs": [{"type": "ip", "value": "1.2.3.4", "source": "investigation"}],
        "loop_count": MAX_LOOPS + 1,
    }
    assert should_loop_back(state) == "assess"


def test_graph_has_multi_agent_nodes():
    agent = create_agent()
    node_names = list(agent.get_graph().nodes.keys())
    assert "__start__" in node_names
    assert "detect" in node_names
    assert "ioc_hunter" in node_names
    assert "threat_intel" in node_names
    assert "blast_radius" in node_names
    assert "investigate_merge" in node_names
    assert "increment_loop" in node_names
    assert "assess" in node_names
    assert "remediate" in node_names
    assert "__end__" in node_names
    assert "investigate" not in node_names


def test_max_loops_is_three():
    assert MAX_LOOPS == 3
