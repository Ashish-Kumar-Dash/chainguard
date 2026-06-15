from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.state import InvestigationState
from app.agent.nodes.detect import detect_node
from app.agent.nodes.investigate import investigate_supervisor, investigate_merge
from app.agent.nodes.sub_agents import ioc_hunter_node, threat_intel_node, blast_radius_node
from app.agent.nodes.assess import assess_node
from app.agent.nodes.remediate import remediate_node

MAX_LOOPS = 3


def increment_loop(state: InvestigationState) -> dict:
    return {"loop_count": state.get("loop_count", 0) + 1}


def should_loop_back(state: dict) -> str:
    has_new_iocs = bool(state.get("new_iocs"))
    under_limit = state.get("loop_count", 0) < MAX_LOOPS
    if has_new_iocs and under_limit:
        return "detect"
    return "assess"


def build_graph() -> StateGraph:
    graph = StateGraph(InvestigationState)

    graph.add_node("detect", detect_node)
    graph.add_node("ioc_hunter", ioc_hunter_node)
    graph.add_node("threat_intel", threat_intel_node)
    graph.add_node("blast_radius", blast_radius_node)
    graph.add_node("investigate_merge", investigate_merge)
    graph.add_node("increment_loop", increment_loop)
    graph.add_node("assess", assess_node)
    graph.add_node("remediate", remediate_node)

    graph.add_edge(START, "detect")
    # investigate_supervisor returns Send() objects — LangGraph requires these
    # from conditional edge functions, not regular nodes.
    graph.add_conditional_edges("detect", investigate_supervisor)

    graph.add_edge("ioc_hunter", "investigate_merge")
    graph.add_edge("threat_intel", "investigate_merge")
    graph.add_edge("blast_radius", "investigate_merge")

    graph.add_edge("investigate_merge", "increment_loop")
    graph.add_conditional_edges(
        "increment_loop",
        should_loop_back,
        {"detect": "detect", "assess": "assess"},
    )
    graph.add_edge("assess", "remediate")
    graph.add_edge("remediate", END)

    return graph


def create_agent():
    graph = build_graph()
    memory = MemorySaver()
    return graph.compile(checkpointer=memory)
