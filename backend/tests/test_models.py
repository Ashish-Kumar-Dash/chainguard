from datetime import datetime, timezone
from app.models import (
    IOC, IOCType, AttackType, Finding, QueryResult,
    RemediationAction, ActionPriority, ActionStatus,
    BlastRadius, AffectedEntity, PropagationGraph, GraphNode, GraphEdge,
)


def test_ioc_creation(sample_ioc):
    assert sample_ioc.type == IOCType.HASH
    assert sample_ioc.value == "abc123def456"
    assert sample_ioc.source == "alert_input"


def test_ioc_serialization(sample_ioc):
    data = sample_ioc.model_dump()
    rebuilt = IOC(**data)
    assert rebuilt == sample_ioc


def test_finding_contains_evidence(sample_finding):
    assert len(sample_finding.evidence) == 1
    assert sample_finding.evidence[0].results[0]["host"] == "dev-01"
    assert sample_finding.mitre_technique == "T1195.002"


def test_action_default_status(sample_action):
    assert sample_action.status == ActionStatus.PENDING


def test_blast_radius_counts():
    br = BlastRadius(
        affected_entities=[
            AffectedEntity(entity_type="repo", identifier="org/app", details="compromised"),
            AffectedEntity(entity_type="secret", identifier="GH_PAT", details="exposed"),
            AffectedEntity(entity_type="secret", identifier="NPM_TOKEN", details="exposed"),
        ],
        total_repos=1,
        total_endpoints=0,
        total_secrets=2,
        total_pipelines=0,
    )
    assert br.total_secrets == 2
    assert len(br.affected_entities) == 3


def test_propagation_graph_structure():
    graph = PropagationGraph(
        nodes=[
            GraphNode(id="n1", label="evil-pkg", entity_type="package", severity="critical"),
            GraphNode(id="n2", label="ci-runner-01", entity_type="pipeline", severity="high"),
        ],
        edges=[
            GraphEdge(source="n1", target="n2", label="dependency pulled during build"),
        ],
    )
    assert len(graph.nodes) == 2
    assert graph.edges[0].source == "n1"


def test_attack_type_enum():
    assert AttackType.TROJANIZED_EXTENSION == "trojanized_extension"
    assert AttackType.POISONED_PACKAGE == "poisoned_package"
    assert AttackType.COMPROMISED_CI == "compromised_ci"
