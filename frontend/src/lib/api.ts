import type { InvestigationState, InvestigationSummary, StateUpdate } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createInvestigation(alert: string): Promise<{ investigation_id: string }> {
  const res = await fetch(`${API_BASE}/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ alert }),
  });
  if (!res.ok) throw new Error(`Failed to create investigation: ${res.statusText}`);
  return res.json();
}

export async function getInvestigation(id: string): Promise<InvestigationState> {
  const res = await fetch(`${API_BASE}/investigate/${id}`);
  if (!res.ok) throw new Error(`Failed to get investigation: ${res.statusText}`);
  return res.json();
}

export async function listInvestigations(): Promise<InvestigationSummary[]> {
  const res = await fetch(`${API_BASE}/investigate`);
  if (!res.ok) throw new Error(`Failed to list investigations: ${res.statusText}`);
  return res.json();
}

export async function approveAction(investigationId: string, actionId: string) {
  const res = await fetch(`${API_BASE}/investigate/${investigationId}/actions/${actionId}/approve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to approve action: ${res.statusText}`);
  return res.json();
}

export async function rejectAction(investigationId: string, actionId: string) {
  const res = await fetch(`${API_BASE}/investigate/${investigationId}/actions/${actionId}/reject`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to reject action: ${res.statusText}`);
  return res.json();
}

export async function continueInvestigation(investigationId: string, message: string) {
  const res = await fetch(`${API_BASE}/investigate/${investigationId}/continue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Failed to continue investigation: ${res.statusText}`);
  return res.json();
}

export function streamInvestigation(
  id: string,
  onUpdate: (data: StateUpdate) => void,
  onComplete: (data: InvestigationState) => void,
  onError?: (error: Event) => void,
): EventSource {
  const eventSource = new EventSource(`${API_BASE}/investigate/${id}/stream`);

  eventSource.addEventListener("state_update", (event) => {
    onUpdate(JSON.parse(event.data));
  });

  eventSource.addEventListener("investigation_complete", (event) => {
    onComplete(JSON.parse(event.data));
    eventSource.close();
  });

  eventSource.addEventListener("error", (event) => {
    const data = JSON.parse((event as MessageEvent).data || "{}");
    console.error("Investigation error:", data);
    eventSource.close();
    onError?.(event);
  });

  eventSource.onerror = () => {
    eventSource.close();
  };

  return eventSource;
}
