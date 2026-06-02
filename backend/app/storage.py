import json
from pathlib import Path
from datetime import datetime, timezone

INVESTIGATIONS_DIR = Path(__file__).parent.parent / "investigations"
INVESTIGATIONS_DIR.mkdir(exist_ok=True)


def save_investigation(investigation_id: str, state: dict) -> None:
    path = INVESTIGATIONS_DIR / f"{investigation_id}.json"
    serializable = _make_serializable(state)
    serializable["_saved_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(serializable, indent=2, default=str))


def load_investigation(investigation_id: str) -> dict | None:
    path = INVESTIGATIONS_DIR / f"{investigation_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text())


def list_investigations() -> list[dict]:
    results = []
    for path in sorted(INVESTIGATIONS_DIR.glob("*.json"), reverse=True):
        data = json.loads(path.read_text())
        results.append({
            "id": path.stem,
            "alert_raw": data.get("alert_raw", "")[:100],
            "status": data.get("status", "unknown"),
            "attack_type": data.get("attack_type", "unknown"),
            "saved_at": data.get("_saved_at", ""),
        })
    return results


def _make_serializable(obj):
    if isinstance(obj, dict):
        return {k: _make_serializable(v) for k, v in obj.items() if not k.startswith("messages")}
    if isinstance(obj, list):
        return [_make_serializable(item) for item in obj]
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    return obj
