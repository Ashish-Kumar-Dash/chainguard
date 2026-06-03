from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.state import InvestigationState
from app.agent.nodes.detect import detect_node
from app.agent.nodes.investigate import investigate_node
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
    graph.add_node("investigate", investigate_node)
    graph.add_node("increment_loop", increment_loop)
    graph.add_node("assess", assess_node)
    graph.add_node("remediate", remediate_node)

    graph.add_edge(START, "detect")
    graph.add_edge("detect", "investigate")
    graph.add_edge("investigate", "increment_loop")
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
