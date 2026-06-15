import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.investigate import router as investigate_router
from app.routes.metrics import router as metrics_router
from app.routes.splunk import router as splunk_router

logger = logging.getLogger("chainguard")


def _parse_mcp_indexes(raw) -> list[str]:
    # MCP returns index data in various formats — try parsing the whole
    # response first, then fall back to extracting embedded JSON fragments.
    text = str(raw)
    candidates = [text] + text.split("'text': '")
    for candidate in candidates:
        try:
            data = json.loads(candidate.rstrip("'}]"))
            if "results" in data:
                return [entry["title"] for entry in data["results"] if "title" in entry]
        except (json.JSONDecodeError, KeyError):
            continue
    return []


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.splunk_mcp_token:
        try:
            from app.splunk.mcp_client import create_mcp_client
            client = create_mcp_client()
            tools = await client.get_tools()
            for tool in tools:
                if tool.name == "splunk_get_indexes":
                    result = await tool.ainvoke({})
                    indexes = _parse_mcp_indexes(result)
                    if indexes:
                        settings.splunk_indexes = indexes
                        logger.info(f"Discovered Splunk indexes: {indexes}")
        except Exception as e:
            logger.warning(f"Could not discover indexes at startup: {e}")
    yield


app = FastAPI(title="ChainGuard", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigate_router)
app.include_router(metrics_router)
app.include_router(splunk_router)


@app.get("/health")
async def health():
    splunk_ok = False
    mcp_tools_count = 0
    if settings.splunk_mcp_token:
        try:
            from app.splunk.mcp_client import create_mcp_client
            client = create_mcp_client()
            tools = await client.get_tools()
            mcp_tools_count = len(tools)
            splunk_ok = mcp_tools_count > 0
        except Exception:
            pass

    return {
        "status": "ok",
        "llm_provider": settings.llm_provider,
        "llm_model": settings.llm_model,
        "splunk_connected": splunk_ok,
        "mcp_tools_available": mcp_tools_count,
        "splunk_indexes": settings.splunk_indexes,
    }
