import json
import time
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings
from app.mcp_metrics import mcp_metrics

logger = logging.getLogger("chainguard")

router = APIRouter(prefix="/splunk", tags=["splunk"])


class QueryRequest(BaseModel):
    spl: str


@router.post("/query")
async def run_query(req: QueryRequest):
    if not settings.splunk_mcp_token:
        raise HTTPException(status_code=503, detail="Splunk MCP not configured")

    from app.splunk.mcp_client import create_mcp_client
    client = create_mcp_client()
    tools = await client.get_tools()
    tool_map = {t.name: t for t in tools}

    if "splunk_run_query" not in tool_map:
        raise HTTPException(status_code=503, detail="splunk_run_query tool not available")

    t0 = time.time()
    try:
        result = await tool_map["splunk_run_query"].ainvoke({"query": req.spl})
        latency = (time.time() - t0) * 1000
        mcp_metrics.record("splunk_run_query", latency, True)
        parsed = json.loads(str(result))
        if isinstance(parsed, dict) and "results" in parsed:
            return {"results": parsed["results"], "latency_ms": round(latency, 1)}
        return {"results": parsed if isinstance(parsed, list) else [parsed], "latency_ms": round(latency, 1)}
    except Exception as e:
        latency = (time.time() - t0) * 1000
        mcp_metrics.record("splunk_run_query", latency, False, error=str(e))
        logger.error(f"SPL query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
