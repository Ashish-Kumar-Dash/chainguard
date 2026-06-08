from fastapi import APIRouter
from app.mcp_metrics import mcp_metrics

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/mcp")
async def get_mcp_metrics():
    return mcp_metrics.summary()
