import httpx
from datetime import datetime, timezone
from app.config import settings


class HECClient:
    def __init__(self):
        self.base_url = f"https://{settings.splunk_host}:{settings.splunk_hec_port}"
        self.headers = {"Authorization": f"Splunk {settings.splunk_hec_token}"}

    async def send_event(self, event: dict, index: str, sourcetype: str) -> bool:
        payload = {
            "event": event,
            "index": index,
            "sourcetype": sourcetype,
            "time": datetime.now(timezone.utc).timestamp(),
        }
        async with httpx.AsyncClient(verify=settings.splunk_verify_ssl) as client:
            resp = await client.post(
                f"{self.base_url}/services/collector/event",
                json=payload,
                headers=self.headers,
            )
            return resp.status_code == 200

    async def send_batch(self, events: list[dict], index: str, sourcetype: str) -> int:
        sent = 0
        async with httpx.AsyncClient(verify=settings.splunk_verify_ssl) as client:
            for event in events:
                payload = {
                    "event": event,
                    "index": index,
                    "sourcetype": sourcetype,
                    "time": event.get("timestamp", datetime.now(timezone.utc).timestamp()),
                }
                resp = await client.post(
                    f"{self.base_url}/services/collector/event",
                    json=payload,
                    headers=self.headers,
                )
                if resp.status_code == 200:
                    sent += 1
        return sent
