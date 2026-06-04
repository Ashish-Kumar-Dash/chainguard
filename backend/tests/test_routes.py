import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.routes.investigate import _active
from app.storage import INVESTIGATIONS_DIR


@pytest.fixture(autouse=True)
def clean_state():
    _active.clear()
    for f in INVESTIGATIONS_DIR.glob("*.json"):
        f.unlink()
    yield
    _active.clear()
    for f in INVESTIGATIONS_DIR.glob("*.json"):
        f.unlink()


def _transport():
    return ASGITransport(app=app)


@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "llm_provider" in data
    assert "llm_model" in data


@pytest.mark.asyncio
async def test_create_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post("/investigate", json={"alert": "Suspicious extension detected"})
    assert resp.status_code == 200
    data = resp.json()
    assert "investigation_id" in data
    assert data["status"] == "created"
    assert len(data["investigation_id"]) == 8


@pytest.mark.asyncio
async def test_create_investigation_missing_alert():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post("/investigate", json={})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_get_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        create_resp = await client.post("/investigate", json={"alert": "Test alert"})
        inv_id = create_resp.json()["investigation_id"]
        resp = await client.get(f"/investigate/{inv_id}")
    assert resp.status_code == 200
    assert resp.json()["alert_raw"] == "Test alert"
    assert resp.json()["status"] == "detecting"


@pytest.mark.asyncio
async def test_get_nonexistent_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.get("/investigate/nonexistent")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_investigations():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        await client.post("/investigate", json={"alert": "Alert 1"})
        await client.post("/investigate", json={"alert": "Alert 2"})
        resp = await client.get("/investigate")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert all(item["active"] is True for item in data)


@pytest.mark.asyncio
async def test_continue_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        create_resp = await client.post("/investigate", json={"alert": "Original alert"})
        inv_id = create_resp.json()["investigation_id"]
        resp = await client.post(
            f"/investigate/{inv_id}/continue",
            json={"message": "Also check lateral movement"},
        )
    assert resp.status_code == 200
    assert resp.json()["status"] == "resumed"
    assert "[Follow-up]" in _active[inv_id]["state"]["alert_raw"]


@pytest.mark.asyncio
async def test_continue_nonexistent_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post(
            "/investigate/nonexistent/continue",
            json={"message": "test"},
        )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_approve_action():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        create_resp = await client.post("/investigate", json={"alert": "Test"})
        inv_id = create_resp.json()["investigation_id"]

    _active[inv_id]["state"]["remediation_plan"] = [
        {"id": "action-001", "description": "Rotate creds", "priority": "critical",
         "category": "rotate_secret", "target": "github_pat", "status": "pending"},
    ]

    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post(f"/investigate/{inv_id}/actions/action-001/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
    assert _active[inv_id]["state"]["remediation_plan"][0]["status"] == "approved"
    assert len(_active[inv_id]["state"]["approved_actions"]) == 1


@pytest.mark.asyncio
async def test_reject_action():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        create_resp = await client.post("/investigate", json={"alert": "Test"})
        inv_id = create_resp.json()["investigation_id"]

    _active[inv_id]["state"]["remediation_plan"] = [
        {"id": "action-002", "description": "Block IP", "priority": "high",
         "category": "block_network", "target": "1.2.3.4", "status": "pending"},
    ]

    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post(f"/investigate/{inv_id}/actions/action-002/reject")
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"
    assert _active[inv_id]["state"]["remediation_plan"][0]["status"] == "rejected"
    assert len(_active[inv_id]["state"]["rejected_actions"]) == 1


@pytest.mark.asyncio
async def test_approve_nonexistent_action():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        create_resp = await client.post("/investigate", json={"alert": "Test"})
        inv_id = create_resp.json()["investigation_id"]
        resp = await client.post(f"/investigate/{inv_id}/actions/fake-id/approve")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_approve_nonexistent_investigation():
    async with AsyncClient(transport=_transport(), base_url="http://test") as client:
        resp = await client.post("/investigate/fake/actions/action-001/approve")
    assert resp.status_code == 404
