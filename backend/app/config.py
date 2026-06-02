from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_provider: str = "groq"
    llm_model: str = "llama-3.3-70b-versatile"
    llm_api_key: str = ""
    llm_base_url: str = ""

    splunk_host: str = "localhost"
    splunk_mcp_port: int = 8089
    splunk_mcp_token: str = ""
    splunk_hec_port: int = 8088
    splunk_hec_token: str = ""
    splunk_verify_ssl: bool = False

    splunk_indexes: list[str] = []

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
