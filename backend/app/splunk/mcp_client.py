from langchain_mcp_adapters.client import MultiServerMCPClient
from app.config import settings


def get_mcp_config() -> dict:
    return {
        "splunk": {
            "transport": "streamable_http",
            "url": f"https://{settings.splunk_host}:{settings.splunk_mcp_port}/services/mcp",
            "headers": {"Authorization": f"Bearer {settings.splunk_mcp_token}"},
        }
    }


def create_mcp_client() -> MultiServerMCPClient:
    return MultiServerMCPClient(get_mcp_config())
