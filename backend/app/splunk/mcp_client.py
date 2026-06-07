import httpx
from langchain_mcp_adapters.client import MultiServerMCPClient
from app.config import settings


def _insecure_httpx_client(**kwargs):
    kwargs.pop("verify", None)
    return httpx.AsyncClient(verify=False, **kwargs)


def get_mcp_config() -> dict:
    config = {
        "splunk": {
            "transport": "streamable_http",
            "url": f"https://{settings.splunk_host}:{settings.splunk_mcp_port}/services/mcp",
            "headers": {"Authorization": f"Bearer {settings.splunk_mcp_token}"},
        }
    }
    if not settings.splunk_verify_ssl:
        config["splunk"]["httpx_client_factory"] = _insecure_httpx_client
    return config


def create_mcp_client() -> MultiServerMCPClient:
    return MultiServerMCPClient(get_mcp_config())
