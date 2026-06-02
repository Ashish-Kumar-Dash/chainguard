from pydantic import BaseModel
from enum import Enum
from datetime import datetime


class AttackType(str, Enum):
    TROJANIZED_EXTENSION = "trojanized_extension"
    POISONED_PACKAGE = "poisoned_package"
    COMPROMISED_CI = "compromised_ci"
    UNKNOWN = "unknown"


class IOCType(str, Enum):
    HASH = "hash"
    DOMAIN = "domain"
    IP = "ip"
    PACKAGE_NAME = "package_name"
    EXTENSION_ID = "extension_id"
    FILE_PATH = "file_path"


class IOC(BaseModel):
    type: IOCType
    value: str
    source: str


class QueryResult(BaseModel):
    spl: str
    results: list[dict]
    timestamp: datetime
    node: str


class Finding(BaseModel):
    description: str
    severity: str
    evidence: list[QueryResult]
    iocs: list[IOC]
    mitre_technique: str | None = None


class AffectedEntity(BaseModel):
    entity_type: str
    identifier: str
    details: str


class BlastRadius(BaseModel):
    affected_entities: list[AffectedEntity]
    total_repos: int
    total_endpoints: int
    total_secrets: int
    total_pipelines: int


class TimelineEvent(BaseModel):
    timestamp: datetime
    description: str
    source_index: str
    severity: str


class GraphNode(BaseModel):
    id: str
    label: str
    entity_type: str
    severity: str


class GraphEdge(BaseModel):
    source: str
    target: str
    label: str


class PropagationGraph(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class ActionPriority(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ActionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"


class RemediationAction(BaseModel):
    id: str
    description: str
    priority: ActionPriority
    category: str
    target: str
    status: ActionStatus = ActionStatus.PENDING


class InvestigationPhase(str, Enum):
    DETECTING = "detecting"
    INVESTIGATING = "investigating"
    ASSESSING = "assessing"
    REMEDIATING = "remediating"
    AWAITING_APPROVAL = "awaiting_approval"
    COMPLETE = "complete"
