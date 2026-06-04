export type IOCType = "hash" | "domain" | "ip" | "package_name" | "extension_id" | "file_path";
export type AttackType = "trojanized_extension" | "poisoned_package" | "compromised_ci" | "unknown";
export type ActionPriority = "critical" | "high" | "medium" | "low";
export type ActionStatus = "pending" | "approved" | "rejected" | "executed";
export type InvestigationPhase = "detecting" | "investigating" | "assessing" | "remediating" | "awaiting_approval" | "complete";

export interface IOC {
  type: IOCType;
  value: string;
  source: string;
}

export interface QueryResult {
  spl: string;
  results: Record<string, unknown>[];
  timestamp: string;
  node: string;
}

export interface Finding {
  description: string;
  severity: string;
  evidence: QueryResult[];
  iocs: IOC[];
  mitre_technique: string | null;
}

export interface AffectedEntity {
  entity_type: string;
  identifier: string;
  details: string;
}

export interface BlastRadius {
  affected_entities: AffectedEntity[];
  total_repos: number;
  total_endpoints: number;
  total_secrets: number;
  total_pipelines: number;
}

export interface TimelineEvent {
  timestamp: string;
  description: string;
  source_index: string;
  severity: string;
}

export interface GraphNode {
  id: string;
  label: string;
  entity_type: string;
  severity: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface PropagationGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RemediationAction {
  id: string;
  description: string;
  priority: ActionPriority;
  category: string;
  target: string;
  status: ActionStatus;
}

export interface InvestigationState {
  alert_raw: string;
  attack_type: AttackType;
  iocs: IOC[];
  investigation_plan: string[];
  splunk_queries: QueryResult[];
  findings: Finding[];
  new_iocs: IOC[];
  loop_count: number;
  blast_radius: BlastRadius | null;
  severity_score: number;
  attack_timeline: TimelineEvent[];
  propagation_graph: PropagationGraph | null;
  discovered_entities: GraphNode[];
  remediation_plan: RemediationAction[];
  approved_actions: RemediationAction[];
  rejected_actions: RemediationAction[];
  reasoning: string[];
  status: InvestigationPhase;
}

export interface StateUpdate {
  node: string;
  update: Partial<InvestigationState>;
  status: InvestigationPhase;
  reasoning: string[];
}

export interface InvestigationSummary {
  id: string;
  status: InvestigationPhase;
  attack_type: AttackType;
  alert_raw?: string;
  severity_score?: number;
  active: boolean;
}
