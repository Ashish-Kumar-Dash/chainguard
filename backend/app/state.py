from typing import TypedDict, Annotated
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from app.models import (
    IOC, QueryResult, Finding, BlastRadius, TimelineEvent,
    PropagationGraph, RemediationAction, GraphNode,
)


def merge_lists(existing: list, new: list) -> list:
    return existing + new


class SubAgentResult(TypedDict):
    agent_name: str
    splunk_queries: list[QueryResult]
    findings: list[Finding]
    new_iocs: list[IOC]
    discovered_entities: list[GraphNode]
    raw_analysis: str


class InvestigationState(TypedDict):
    alert_raw: str
    attack_type: str

    iocs: Annotated[list[IOC], merge_lists]
    investigation_plan: list[str]

    splunk_queries: Annotated[list[QueryResult], merge_lists]
    findings: Annotated[list[Finding], merge_lists]
    new_iocs: list[IOC]
    loop_count: int

    blast_radius: BlastRadius | None
    severity_score: float
    attack_timeline: Annotated[list[TimelineEvent], merge_lists]
    propagation_graph: PropagationGraph | None

    discovered_entities: Annotated[list[GraphNode], merge_lists]
    sub_agent_results: Annotated[list[SubAgentResult], merge_lists]

    remediation_plan: list[RemediationAction]
    approved_actions: Annotated[list[RemediationAction], merge_lists]
    rejected_actions: Annotated[list[RemediationAction], merge_lists]

    reasoning: Annotated[list[str], merge_lists]

    status: str
    messages: Annotated[list[BaseMessage], add_messages]
