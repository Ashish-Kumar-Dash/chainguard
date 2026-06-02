from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings


def get_llm() -> BaseChatModel:
    provider = settings.llm_provider.lower()

    if provider == "groq":
        from langchain_groq import ChatGroq
        return ChatGroq(api_key=settings.llm_api_key, model=settings.llm_model, temperature=0)

    if provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(api_key=settings.llm_api_key, model=settings.llm_model, temperature=0)

    if provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(api_key=settings.llm_api_key, model=settings.llm_model, temperature=0)

    if provider == "ollama":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            base_url=settings.llm_base_url or "http://localhost:11434/v1",
            api_key="ollama",
            model=settings.llm_model,
            temperature=0,
        )

    raise ValueError(f"Unknown LLM provider: {provider}. Use: groq, google, openai, ollama")
