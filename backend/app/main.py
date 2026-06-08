import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes.investigate import router as investigate_router
from app.routes.metrics import router as metrics_router
from app.routes.splunk import router as splunk_router

logger = logging.getLogger("chainguard")


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
                    indexes = [idx.strip() for idx in str(result).split(",") if idx.strip()]
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
