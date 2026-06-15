import uuid
import json
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from app.agent.graph import create_agent
from app.storage import save_investigation, load_investigation, list_investigations, _make_serializable

logger = logging.getLogger("chainguard")

router = APIRouter(prefix="/investigate", tags=["investigate"])

_running_investigations: dict[str, dict] = {}
_stop_requested: set[str] = set()
_agent = create_agent()


class InvestigateRequest(BaseModel):
    alert: str


class ContinueRequest(BaseModel):
    message: str


def _initial_state(alert: str) -> dict:
    return {
        "alert_raw": alert,
        "attack_type": "",
        "iocs": [],
        "investigation_plan": [],
        "splunk_queries": [],
        "findings": [],
        "new_iocs": [],
        "loop_count": 0,
        "blast_radius": None,
        "severity_score": 0.0,
        "attack_timeline": [],
        "propagation_graph": None,
        "discovered_entities": [],
        "sub_agent_results": [],
        "remediation_plan": [],
        "approved_actions": [],
        "rejected_actions": [],
        "reasoning": [],
        "status": "detecting",
        "messages": [],
    }


@router.post("")
async def start_investigation(req: InvestigateRequest):
    investigation_id = str(uuid.uuid4())[:8]
    config = {"configurable": {"thread_id": investigation_id}}

    _running_investigations[investigation_id] = {
        "state": _initial_state(req.alert),
        "config": config,
    }

    return {"investigation_id": investigation_id, "status": "created"}


@router.get("/{investigation_id}/stream")
async def stream_investigation(investigation_id: str):
    if investigation_id not in _running_investigations:
        raise HTTPException(status_code=404, detail="Investigation not found")

    investigation = _running_investigations[investigation_id]

    async def event_generator():
        config = investigation["config"]
        _stop_requested.discard(investigation_id)

        try:
            async for event in _agent.astream(investigation["state"], config, stream_mode="updates"):
                if investigation_id in _stop_requested:
                    investigation["state"]["status"] = "complete"
                    investigation["state"]["reasoning"] = investigation["state"].get("reasoning", []) + ["[SYSTEM] Investigation stopped by user"]
                    save_investigation(investigation_id, investigation["state"])
                    yield {
                        "event": "investigation_complete",
                        "data": json.dumps(_make_serializable(investigation["state"]), default=str),
                    }
                    return

                for node_name, node_output in event.items():
                    reasoning = node_output.get("reasoning", [])
                    yield {
                        "event": "state_update",
                        "data": json.dumps({
                            "node": node_name,
                            "update": _make_serializable(node_output),
                            "status": node_output.get("status", ""),
                            "reasoning": reasoning,
                        }, default=str),
                    }

            snapshot = _agent.get_state(config)
            final_state = dict(snapshot.values)
            investigation["state"] = final_state

            save_investigation(investigation_id, final_state)
            yield {
                "event": "investigation_complete",
                "data": json.dumps(_make_serializable(final_state), default=str),
            }

        except Exception as e:
            logger.exception("Investigation stream error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())


@router.post("/{investigation_id}/stop")
async def stop_investigation(investigation_id: str):
    if investigation_id not in _running_investigations:
        raise HTTPException(status_code=404, detail="Investigation not found")
    _stop_requested.add(investigation_id)
    return {"status": "stopping", "investigation_id": investigation_id}


@router.post("/{investigation_id}/continue")
async def continue_investigation(investigation_id: str, req: ContinueRequest):
    if investigation_id not in _running_investigations:
        saved = load_investigation(investigation_id)
        if not saved:
            raise HTTPException(status_code=404, detail="Investigation not found")
        config = {"configurable": {"thread_id": investigation_id}}
        _running_investigations[investigation_id] = {"state": saved, "config": config}

    investigation = _running_investigations[investigation_id]
    investigation["state"]["alert_raw"] += f"\n\n[Follow-up]: {req.message}"
    investigation["state"]["status"] = "detecting"
    investigation["state"]["loop_count"] = 0
    investigation["state"]["new_iocs"] = []

    return {"status": "resumed", "investigation_id": investigation_id}


@router.get("/{investigation_id}")
async def get_investigation(investigation_id: str):
    if investigation_id in _running_investigations:
        return _make_serializable(_running_investigations[investigation_id]["state"])
    saved = load_investigation(investigation_id)
    if saved:
        return saved
    raise HTTPException(status_code=404, detail="Investigation not found")


@router.get("")
async def list_all_investigations():
    active_summaries = [
        {
            "id": inv_id,
            "status": inv_data["state"].get("status", ""),
            "attack_type": inv_data["state"].get("attack_type", ""),
            "severity_score": inv_data["state"].get("severity_score", 0),
            "alert_raw": inv_data["state"].get("alert_raw", "")[:200],
            "active": True,
        }
        for inv_id, inv_data in _running_investigations.items()
    ]
    saved_summaries = [
        {"active": False, **saved}
        for saved in list_investigations()
        if saved["id"] not in _running_investigations
    ]
    return active_summaries + saved_summaries


@router.post("/{investigation_id}/actions/{action_id}/approve")
async def approve_action(investigation_id: str, action_id: str):
    if investigation_id not in _running_investigations:
        raise HTTPException(status_code=404, detail="Investigation not found")

    state = _running_investigations[investigation_id]["state"]
    for action in state.get("remediation_plan", []):
        if action["id"] == action_id:
            action["status"] = "approved"
            state.setdefault("approved_actions", []).append(action)
            save_investigation(investigation_id, state)
            return {"status": "approved", "action_id": action_id}

    raise HTTPException(status_code=404, detail="Action not found")


@router.post("/{investigation_id}/actions/{action_id}/reject")
async def reject_action(investigation_id: str, action_id: str):
    if investigation_id not in _running_investigations:
        raise HTTPException(status_code=404, detail="Investigation not found")

    state = _running_investigations[investigation_id]["state"]
    for action in state.get("remediation_plan", []):
        if action["id"] == action_id:
            action["status"] = "rejected"
            state.setdefault("rejected_actions", []).append(action)
            save_investigation(investigation_id, state)
            return {"status": "rejected", "action_id": action_id}

    raise HTTPException(status_code=404, detail="Action not found")
