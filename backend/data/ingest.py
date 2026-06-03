import httpx


async def ingest_scenario(
    events_by_index: dict[str, list[dict]],
    hec_url: str,
    hec_token: str,
    verify_ssl: bool = False,
) -> dict[str, int]:
    results = {}
    async with httpx.AsyncClient(verify=verify_ssl) as client:
        for index, events in events_by_index.items():
            sent = 0
            for event in events:
                ts = event.pop("timestamp", None)
                payload = {
                    "event": event,
                    "index": index,
                    "sourcetype": f"chainguard:{index}",
                }
                if ts:
                    payload["time"] = ts
                resp = await client.post(
                    f"{hec_url}/services/collector/event",
                    json=payload,
                    headers={"Authorization": f"Splunk {hec_token}"},
                )
                if resp.status_code == 200:
                    sent += 1
            results[index] = sent
    return results
